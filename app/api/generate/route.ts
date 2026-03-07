import { z } from "zod";
import { extractFacts, summarizeProfile } from "@/lib/extractors";
import { generateSitePlan } from "@/lib/llm";
import { extractTextFromBase64Pdf } from "@/lib/pdf-utils";
import { buildSite } from "@/lib/site-builder";
import { saveSite } from "@/lib/storage";
import { normalizeUrls } from "@/lib/url-utils";

const inputSchema = z.object({
  urls: z.array(z.string()).default([]),
  pdfBase64: z.string().optional(),
  objective: z.string().max(400).default("high-conversion"),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.json();
    const input = inputSchema.parse(raw);

    const urls = normalizeUrls(input.urls);
    if (!urls.length && !input.pdfBase64) {
      return Response.json(
        { error: "Provide at least one URL or one PDF." },
        { status: 400 },
      );
    }

    const [facts, pdfText] = await Promise.all([
      extractFacts(urls),
      input.pdfBase64 ? extractTextFromBase64Pdf(input.pdfBase64) : Promise.resolve(""),
    ]);

    const profile = summarizeProfile(facts, urls, pdfText);
    const plan = await generateSitePlan(profile, input.objective || "high-conversion");
    const site = buildSite(profile, plan);
    await saveSite(site);

    return Response.json({
      id: site.id,
      previewUrl: `/render/${site.id}`,
      theme: site.theme.name,
      extractedSources: facts.map((f) => ({ source: f.source, title: f.title || null })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
