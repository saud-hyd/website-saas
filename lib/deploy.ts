import path from "path";
import { readdir, readFile } from "fs/promises";

export async function folderToZipBuffer(folderPath: string): Promise<Buffer> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  async function walk(currentPath: string, relative = ""): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const abs = path.join(currentPath, entry.name);
      const rel = relative ? `${relative}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walk(abs, rel);
      } else {
        const file = await readFile(abs);
        zip.file(rel, file);
      }
    }
  }

  await walk(folderPath);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function deployToNetlify(zipBuffer: Buffer): Promise<{ url: string }> {
  const authToken = process.env.NETLIFY_AUTH_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!authToken || !siteId) {
    throw new Error("NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID must be configured.");
  }

  const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/zip",
    },
    body: new Uint8Array(zipBuffer),
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`Netlify deploy failed (${response.status}): ${reason}`);
  }

  const payload = (await response.json()) as { ssl_url?: string; deploy_ssl_url?: string; url?: string };
  return {
    url: payload.ssl_url || payload.deploy_ssl_url || payload.url || "",
  };
}
