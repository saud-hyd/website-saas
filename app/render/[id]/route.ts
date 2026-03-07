import { loadSiteHtml } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props): Promise<Response> {
  const { id } = await params;
  const html = await loadSiteHtml(id);

  if (!html) {
    return Response.json({ error: "Site not found" }, { status: 404 });
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}