import { z } from "zod";
import { generateInputSchema, runGeneratePipeline } from "@/lib/generate-pipeline";

const inputSchema = generateInputSchema;

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.json();
    const input = inputSchema.parse(raw);

    const { site, facts, warnings } = await runGeneratePipeline(input);

    return Response.json({
      id: site.id,
      previewUrl: `/render/${site.id}`,
      publishedUrl: null,
      theme: site.theme.name,
      status: site.status,
      warnings,
      extractedSources: facts.map((f) => ({ source: f.source, title: f.title || null })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
