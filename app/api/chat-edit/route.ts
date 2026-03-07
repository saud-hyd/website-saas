import { z } from "zod";
import { applyChatEdit } from "@/lib/chat-editor";
import { renderSiteHtml } from "@/lib/site-builder";
import { loadSite, saveSite } from "@/lib/storage";
import { getThemeById } from "@/lib/themes";
import type { ChatTurn } from "@/lib/types";

const bodySchema = z.object({
  id: z.string().uuid(),
  message: z.string().min(2).max(5000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().min(1).max(5000),
      }),
    )
    .max(40)
    .default([]),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = bodySchema.parse(await request.json());
    const site = await loadSite(body.id);

    if (!site) {
      return Response.json({ error: "Site not found." }, { status: 404 });
    }

    const history = body.history as ChatTurn[];
    const edit = await applyChatEdit(site, body.message, history);
    const theme = edit.themeId ? getThemeById(edit.themeId) || site.theme : site.theme;
    const updated = {
      ...site,
      plan: edit.plan,
      theme,
    };
    updated.html = renderSiteHtml(updated);

    await saveSite(updated);

    return Response.json({
      assistantReply: edit.assistantReply,
      previewUrl: `/render/${updated.id}?v=${Date.now()}`,
      theme: updated.theme.name,
      plan: updated.plan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat edit error";
    return Response.json({ error: message }, { status: 500 });
  }
}
