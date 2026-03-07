import * as cheerio from "cheerio";
import type { ProfileSummary, SourceFact } from "./types";
import { githubUserFromUrl, sourceFromUrl } from "./url-utils";

async function safeJson(url: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function safeText(url: string, init?: RequestInit): Promise<string | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function ogFromHtml(html: string): { title?: string; description?: string } {
  const $ = cheerio.load(html);
  const title = $("meta[property='og:title']").attr("content") || $("title").text() || undefined;
  const description =
    $("meta[property='og:description']").attr("content") ||
    $("meta[name='description']").attr("content") ||
    undefined;

  return {
    title: title?.trim(),
    description: description?.trim(),
  };
}

async function extractGithub(url: string): Promise<SourceFact | null> {
  const user = githubUserFromUrl(url);
  if (!user) return null;

  const baseHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "zero-friction-generator",
  };

  const [userJson, reposJson] = await Promise.all([
    safeJson(`https://api.github.com/users/${user}`, { headers: baseHeaders }),
    safeJson(`https://api.github.com/users/${user}/repos?per_page=6&sort=updated`, { headers: baseHeaders }),
  ]);

  const u = userJson as { name?: string; bio?: string; location?: string; public_repos?: number } | null;
  const repos = Array.isArray(reposJson) ? reposJson : [];

  return {
    source: "github",
    title: u?.name || user,
    description: u?.bio,
    url,
    data: {
      location: u?.location,
      publicRepos: u?.public_repos,
      topRepos: repos
        .slice(0, 5)
        .map((r) => (r as { name?: string; stargazers_count?: number }).name)
        .filter(Boolean),
    },
  };
}

async function extractYoutube(url: string): Promise<SourceFact | null> {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const data = (await safeJson(endpoint)) as { title?: string; author_name?: string } | null;

  if (!data) return null;

  return {
    source: "youtube",
    title: data.author_name || "YouTube",
    description: data.title,
    url,
    data,
  };
}

async function extractGeneric(url: string, source: string): Promise<SourceFact | null> {
  const html = await safeText(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 zero-friction-generator",
    },
  });

  if (!html) return null;
  const og = ogFromHtml(html);

  if (!og.title && !og.description) return null;

  return {
    source,
    title: og.title,
    description: og.description,
    url,
  };
}

export async function extractFacts(urls: string[]): Promise<SourceFact[]> {
  const tasks = urls.map(async (url): Promise<SourceFact | null> => {
    const source = sourceFromUrl(url);

    if (source === "github") return extractGithub(url);
    if (source === "youtube") return extractYoutube(url);

    return extractGeneric(url, source);
  });

  const results = await Promise.all(tasks);
  return results.filter((fact): fact is SourceFact => Boolean(fact));
}

function dedupeWords(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase().trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(value.trim());
  }

  return out;
}

export function summarizeProfile(facts: SourceFact[], urls: string[], pdfText: string): ProfileSummary {
  const name =
    facts.find((f) => f.source === "github")?.title ||
    facts.find((f) => f.title)?.title ||
    "Your Brand";

  const headline =
    facts.find((f) => f.source === "github")?.description ||
    "Builder, creator, and operator";

  const textBlob = [
    ...facts.map((f) => f.description || ""),
    pdfText,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = textBlob
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const bio = sentences.slice(0, 3).join(" ") || "Generated profile from connected sources.";

  const highlights = dedupeWords(
    [
      ...facts.map((f) => f.title || ""),
      ...sentences.slice(0, 6),
    ].filter(Boolean),
  ).slice(0, 8);

  const skillCandidates = textBlob.match(/[A-Za-z][A-Za-z+.#-]{2,}/g) || [];
  const skills = dedupeWords(skillCandidates)
    .filter((word) => word.length <= 24)
    .slice(0, 14);

  return {
    name,
    headline,
    bio,
    links: urls,
    location: (facts.find((f) => f.source === "github")?.data?.location as string | undefined) || undefined,
    highlights,
    skills,
    facts,
  };
}
