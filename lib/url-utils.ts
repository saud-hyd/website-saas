export function normalizeUrls(rawUrls: string[]): string[] {
  const out = new Set<string>();

  for (const raw of rawUrls) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      if (url.hostname.toLowerCase().includes("linkedin.com")) {
        continue;
      }
      url.hash = "";
      out.add(url.toString());
    } catch {
      // Ignore malformed inputs and continue processing valid ones.
    }
  }

  return [...out];
}

export function sourceFromUrl(url: string): string {
  const host = new URL(url).hostname.toLowerCase();

  if (host.includes("github.com")) return "github";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("google.") && host.includes("maps")) return "google_maps";

  return "website";
}

export function githubUserFromUrl(url: string): string | null {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  if (parts.length < 1) return null;
  if (["orgs", "topics", "collections", "features"].includes(parts[0])) return null;
  return parts[0];
}
