import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import type { GeneratedSite } from "./types";

const generatedRoot = path.join(process.cwd(), "generated");

function normalizeSite(raw: GeneratedSite): GeneratedSite {
  return {
    ...raw,
    updatedAt: raw.updatedAt || raw.createdAt,
    status: raw.status || "draft",
    publishedAt: raw.publishedAt ?? null,
  };
}

export async function saveSite(site: GeneratedSite): Promise<void> {
  const dir = path.join(generatedRoot, site.id);
  await mkdir(dir, { recursive: true });

  await Promise.all([
    writeFile(path.join(dir, "index.html"), site.html, "utf8"),
    writeFile(path.join(dir, "site.json"), JSON.stringify(site, null, 2), "utf8"),
  ]);
}

export async function loadSite(id: string): Promise<GeneratedSite | null> {
  try {
    const json = await readFile(path.join(generatedRoot, id, "site.json"), "utf8");
    return normalizeSite(JSON.parse(json) as GeneratedSite);
  } catch {
    return null;
  }
}

export async function loadSiteHtml(id: string): Promise<string | null> {
  try {
    return await readFile(path.join(generatedRoot, id, "index.html"), "utf8");
  } catch {
    return null;
  }
}

export async function loadPublishedSiteHtml(id: string): Promise<string | null> {
  const site = await loadSite(id);
  if (!site || site.status !== "published") {
    return null;
  }

  return site.html;
}
