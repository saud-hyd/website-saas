import { z } from "zod";
import { deployToNetlify, folderToZipBuffer } from "@/lib/deploy";
import { generatedSiteDir } from "@/lib/storage";

const bodySchema = z.object({
  id: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = bodySchema.parse(await request.json());
    const zip = await folderToZipBuffer(generatedSiteDir(payload.id));
    const deploy = await deployToNetlify(zip);

    return Response.json({ provider: "netlify", url: deploy.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deploy failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
