import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import type { ProfileSummary, SitePlan } from "./types";

const sitePlanSchema = z.object({
  brandName: z.string().min(2),
  tagLine: z.string().min(6),
  heroBlurb: z.string().min(20),
  ctaPrimary: z.string().min(3),
  ctaSecondary: z.string().min(3),
  highlights: z.array(z.string().min(6)).min(3).max(6),
  stats: z
    .array(
      z.object({
        label: z.string().min(3),
        value: z.string().min(1),
      }),
    )
    .min(2)
    .max(4),
  services: z
    .array(
      z.object({
        title: z.string().min(3),
        description: z.string().min(12),
      }),
    )
    .min(3)
    .max(5),
  projects: z
    .array(
      z.object({
        name: z.string().min(3),
        summary: z.string().min(16),
        outcomes: z.array(z.string().min(6)).min(2).max(5),
        stack: z.array(z.string().min(2)).min(3).max(8),
      }),
    )
    .min(2)
    .max(4),
  sections: z
    .array(
      z.object({
        id: z.string().min(2),
        title: z.string().min(2),
        body: z.string().min(8),
        bullets: z.array(z.string().min(6)).min(2).max(6).optional(),
      }),
    )
    .min(4)
    .max(8),
});

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeLabel(value: string): string {
  const normalized = compact(value);
  const map: Array<[RegExp, string]> = [
    [/^about me$/i, "Studio"],
    [/^about$/i, "Studio"],
    [/^my approach$/i, "Approach"],
    [/engineering approach/i, "Approach"],
    [/technology ecosystem/i, "Stack"],
    [/power of agentic workflows/i, "Systems"],
    [/professional summary/i, "Overview"],
    [/skills/i, "Capabilities"],
  ];

  for (const [pattern, replacement] of map) {
    if (pattern.test(normalized)) return replacement;
  }

  return normalized;
}

function sanitizePlan(plan: SitePlan): SitePlan {
  return {
    ...plan,
    brandName: compact(plan.brandName),
    tagLine: compact(plan.tagLine),
    heroBlurb: compact(plan.heroBlurb),
    ctaPrimary: compact(plan.ctaPrimary || "Start a conversation"),
    ctaSecondary: compact(plan.ctaSecondary || "View the work"),
    highlights: plan.highlights.map(compact).filter(Boolean).slice(0, 6),
    stats: plan.stats.map((stat) => ({
      label: sanitizeLabel(stat.label),
      value: compact(stat.value),
    })),
    services: plan.services.map((service) => ({
      title: sanitizeLabel(service.title),
      description: compact(service.description),
    })),
    projects: plan.projects.map((project) => ({
      name: compact(project.name),
      summary: compact(project.summary),
      outcomes: project.outcomes.map(compact).filter(Boolean).slice(0, 5),
      stack: project.stack.map(compact).filter(Boolean).slice(0, 8),
    })),
    sections: plan.sections.map((section) => ({
      ...section,
      id: compact(section.id).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: sanitizeLabel(section.title),
      body: compact(section.body),
      bullets: section.bullets?.map(compact).filter(Boolean).slice(0, 6),
    })),
  };
}

export async function generateSitePlan(profile: ProfileSummary, objective: string): Promise<SitePlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to generate a website.");
  }

  const client = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";
  const forbidden = [
    "resume",
    "curriculum vitae",
    "cv",
    "work experience",
    "employment",
    "education",
    "skills",
    "professional summary",
    "about me",
  ];

  const collectPlanText = (plan: SitePlan): string => {
    const sectionText = plan.sections
      .map((section) => [section.id, section.title, section.body, ...(section.bullets || [])].join(" "))
      .join(" ");
    const serviceText = plan.services.map((service) => `${service.title} ${service.description}`).join(" ");
    const projectText = plan.projects
      .map((project) => `${project.name} ${project.summary} ${project.outcomes.join(" ")} ${project.stack.join(" ")}`)
      .join(" ");
    const statText = plan.stats.map((stat) => `${stat.label} ${stat.value}`).join(" ");
    const highlightText = plan.highlights.join(" ");
    return [
      plan.brandName,
      plan.tagLine,
      plan.heroBlurb,
      plan.ctaPrimary,
      plan.ctaSecondary,
      sectionText,
      serviceText,
      projectText,
      statText,
      highlightText,
    ].join(" ");
  };

  const hasForbidden = (plan: SitePlan): boolean => {
    const text = collectPlanText(plan).toLowerCase();
    return forbidden.some((term) => text.includes(term));
  };

  const schemaConfig = {
    responseMimeType: "application/json",
    responseJsonSchema: {
      type: "object",
      additionalProperties: false,
      required: [
        "brandName",
        "tagLine",
        "heroBlurb",
        "ctaPrimary",
        "ctaSecondary",
        "highlights",
        "stats",
        "services",
        "projects",
        "sections",
      ],
      properties: {
        brandName: { type: "string" },
        tagLine: { type: "string" },
        heroBlurb: { type: "string" },
        ctaPrimary: { type: "string" },
        ctaSecondary: { type: "string" },
        highlights: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string" },
        },
        stats: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "value"],
            properties: {
              label: { type: "string" },
              value: { type: "string" },
            },
          },
        },
        services: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "description"],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
            },
          },
        },
        projects: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "summary", "outcomes", "stack"],
            properties: {
              name: { type: "string" },
              summary: { type: "string" },
              outcomes: {
                type: "array",
                minItems: 2,
                maxItems: 5,
                items: { type: "string" },
              },
              stack: {
                type: "array",
                minItems: 3,
                maxItems: 8,
                items: { type: "string" },
              },
            },
          },
        },
        sections: {
          type: "array",
          minItems: 4,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "title", "body"],
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              body: { type: "string" },
              bullets: {
                type: "array",
                minItems: 2,
                maxItems: 6,
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
  } as const;

  const instructions = [
    "You are a senior creative director. Return strict JSON only. Turn the resume profile into a modern, polished personal website. Use confident, concise language. Avoid resume formatting or raw extraction. Provide value, outcomes, and clarity. Include services (3-5), projects/case studies (2-4) with outcomes and stack, highlights (3-6), stats (2-4 with plausible labels). Use 4-8 sections for about, approach, and additional context. No fabricated metrics.",
    "Regenerate. Output MUST read like a modern website, not a resume. Do not use the words resume, CV, curriculum vitae, work experience, employment, education, skills, or professional summary. Use website section titles like Services, Projects, Approach, Insights, or Offerings. Keep it product/brand tone.",
  ];

  for (let attempt = 0; attempt < instructions.length; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: JSON.stringify({ objective, profile }),
        config: {
          ...schemaConfig,
          systemInstruction: instructions[attempt],
        },
      });

      const json = response.text || "";
      const parsed = JSON.parse(json);
      const plan = sanitizePlan(sitePlanSchema.parse(parsed));
      if (hasForbidden(plan)) {
        if (attempt === instructions.length - 1) {
          throw new Error("Gemini returned resume-style language.");
        }
        continue;
      }
      return plan;
    } catch (error) {
      if (attempt === instructions.length - 1) {
        const message = error instanceof Error ? error.message : "Gemini request failed";
        throw new Error(message);
      }
    }
  }

  throw new Error("Gemini request failed.");
}
