import { loadPublishedSiteHtml } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props): Promise<Response> {
  const { id } = await params;
  const html = await loadPublishedSiteHtml(id);

  if (!html) {
    return Response.json({ error: "Published site not found" }, { status: 404 });
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}