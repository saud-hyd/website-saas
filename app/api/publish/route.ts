import { z } from "zod";
import { loadSite, saveSite } from "@/lib/storage";

const bodySchema = z.object({
  id: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = bodySchema.parse(await request.json());
    const site = await loadSite(body.id);

    if (!site) {
      return Response.json({ error: "Site not found." }, { status: 404 });
    }

    const published = {
      ...site,
      status: "published" as const,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveSite(published);

    return Response.json({
      id: published.id,
      status: published.status,
      previewUrl: `/render/${published.id}?v=${Date.now()}`,
      publishedUrl: `/site/${published.id}`,
      publishedAt: published.publishedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    return Response.json({ error: message }, { status: 500 });
  }
}