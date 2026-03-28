import { generateInputSchema, runGeneratePipeline, type GenerationStep } from "@/lib/generate-pipeline";

export const dynamic = "force-dynamic";

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        const raw = await req.json();
        const input = generateInputSchema.parse(raw);

        const onStep = (step: GenerationStep) => send("status", step);
        const { site, facts, warnings } = await runGeneratePipeline(input, onStep);

        send("complete", {
          id: site.id,
          previewUrl: `/render/${site.id}`,
          publishedUrl: null,
          theme: site.theme.name,
          status: site.status,
          warnings,
          extractedSources: facts.map((f) => ({ source: f.source, title: f.title || null })),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generation failed";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
