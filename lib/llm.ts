import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import type { ProfileSummary, SitePlan } from "./types";

const sitePlanSchema = z.object({
  brandName: z.string().min(2),
  tagLine: z.string().min(6),
  heroBlurb: z.string().min(20),
  cta: z.string().min(3),
  sections: z
    .array(
      z.object({
        id: z.string().min(2),
        title: z.string().min(2),
        body: z.string().min(8),
      }),
    )
    .min(3)
    .max(8),
});

function fallbackPlan(profile: ProfileSummary, objective: string): SitePlan {
  const highlights = profile.highlights.length
    ? profile.highlights
    : ["Built across multiple digital platforms", "Fast-moving creator-operator mindset", "Execution-first approach"];

  return {
    brandName: profile.name,
    tagLine: profile.headline,
    heroBlurb: `${profile.bio} This website is generated from live source data with a ${objective || "high-conversion"} angle.`,
    cta: "Contact / Collaborate",
    sections: [
      {
        id: "about",
        title: "About",
        body: profile.bio,
      },
      {
        id: "impact",
        title: "Impact Highlights",
        body: highlights.slice(0, 4).join(" | "),
      },
      {
        id: "skills",
        title: "Skills",
        body: profile.skills.slice(0, 12).join(", ") || "Product strategy, creative direction, engineering delivery",
      },
      {
        id: "reach",
        title: "Where To Find Me",
        body: profile.links.join(" | "),
      },
    ],
  };
}

export async function generateSitePlan(profile: ProfileSummary, objective: string): Promise<SitePlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackPlan(profile, objective);
  }

  const client = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";

  try {
    const response = await client.models.generateContent({
      model,
      contents: JSON.stringify({ objective, profile }),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          additionalProperties: false,
          required: ["brandName", "tagLine", "heroBlurb", "cta", "sections"],
          properties: {
            brandName: { type: "string" },
            tagLine: { type: "string" },
            heroBlurb: { type: "string" },
            cta: { type: "string" },
            sections: {
              type: "array",
              minItems: 3,
              maxItems: 8,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "title", "body"],
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  body: { type: "string" },
                },
              },
            },
          },
        },
        systemInstruction:
          "You are a senior creative director. Return strict JSON only. Transform user profile data into an unconventional but credible personal/brand website plan.",
      },
    });

    const json = response.text || "";
    const parsed = JSON.parse(json);
    return sitePlanSchema.parse(parsed);
  } catch {
    return fallbackPlan(profile, objective);
  }
}
