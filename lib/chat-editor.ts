import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import type { ChatTurn, GeneratedSite, SitePlan } from "./types";
import { THEMES } from "./themes";

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

const editSchema = z.object({
  assistantReply: z.string().min(2),
  plan: sitePlanSchema,
  themeId: z.string().optional(),
});

export async function applyChatEdit(
  site: GeneratedSite,
  userMessage: string,
  history: ChatTurn[],
): Promise<{ assistantReply: string; plan: SitePlan; themeId?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for chat edits.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";

  const chat = ai.chats.create({
    model,
    history: history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["assistantReply", "plan"],
        properties: {
          assistantReply: { type: "string" },
          themeId: {
            type: "string",
            enum: THEMES.map((theme) => theme.id),
          },
          plan: {
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
        },
      },
      systemInstruction:
        "You are a website builder editor. Apply the user's change request to the current site plan. Keep factual claims grounded in the provided profile and sources. Return strict JSON only.",
    },
  });

  const response = await chat.sendMessage({
    message: JSON.stringify({
      userMessage,
      site: {
        plan: site.plan,
        profile: site.profile,
        themeId: site.theme.id,
      },
      availableThemes: THEMES.map((theme) => ({
        id: theme.id,
        name: theme.name,
      })),
      constraints: [
        "Do not invent direct achievements not present in profile/facts.",
        "Keep the output coherent and production-ready.",
      ],
    }),
  });

  const parsed = JSON.parse(response.text || "");
  const out = editSchema.parse(parsed);

  return {
    assistantReply: out.assistantReply,
    plan: out.plan,
    themeId: out.themeId,
  };
}
