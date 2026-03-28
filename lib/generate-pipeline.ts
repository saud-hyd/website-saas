import { z } from "zod";
import { summarizeProfile } from "@/lib/extractors";
import { generateSitePlan } from "@/lib/llm";
import { extractTextFromBase64Pdf } from "@/lib/pdf-utils";
import { buildSite } from "@/lib/site-builder";
import { saveSite } from "@/lib/storage";
import type { GeneratedSite, SourceFact } from "./types";

export const generateInputSchema = z.object({
  pdfBase64: z.string().min(20, "Resume PDF is required."),
  objective: z.string().max(400).default("high-conversion"),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;

export type GenerationStep = {
  step:
    | "validating"
    | "extracting"
    | "profiling"
    | "planning"
    | "rendering"
    | "saving"
    | "done";
  message: string;
  progress: number;
};

export type GeneratePipelineResult = {
  site: GeneratedSite;
  facts: SourceFact[];
  warnings: string[];
};

export async function runGeneratePipeline(
  input: GenerateInput,
  onStep?: (step: GenerationStep) => void,
): Promise<GeneratePipelineResult> {
  onStep?.({
    step: "validating",
    message: "Validating inputs",
    progress: 8,
  });

  const warnings: string[] = [];

  if (!input.pdfBase64) {
    throw new Error("Resume PDF is required.");
  }

  onStep?.({
    step: "extracting",
    message: "Extracting resume and source data",
    progress: 28,
  });

  const [facts, pdfText] = await Promise.all([
    Promise.resolve([] as SourceFact[]),
    extractTextFromBase64Pdf(input.pdfBase64),
  ]);

  onStep?.({
    step: "profiling",
    message: "Building profile model",
    progress: 48,
  });

  const profile = summarizeProfile(facts, [], pdfText);

  onStep?.({
    step: "planning",
    message: "Designing website copy and sections",
    progress: 68,
  });

  const plan = await generateSitePlan(profile, input.objective || "high-conversion");

  onStep?.({
    step: "rendering",
    message: "Rendering interactive website",
    progress: 84,
  });

  const site = buildSite(profile, plan);

  onStep?.({
    step: "saving",
    message: "Saving draft",
    progress: 94,
  });

  await saveSite(site);

  onStep?.({
    step: "done",
    message: "Draft ready",
    progress: 100,
  });

  return {
    site,
    facts,
    warnings,
  };
}
