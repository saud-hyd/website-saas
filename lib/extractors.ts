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
        .map((r) => (r as { name?: string }).name)
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

function normalizeLine(line: string): string {
  return line
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2022\u2023\u25e6\u2043\u2219]/g, " | ")
    .replace(/\s*\|\s*/g, " | ")
    .replace(/[^\u0020-\u007e\u00a0-\u024f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanInlineArtifacts(line: string): string {
  return line
    .replace(/^\|+\s*/g, "")
    .replace(/\s*\|+\s*/g, " | ")
    .replace(/\b(19|20)\d{2}\s*(?:-|–|to)\s*(?:present|(19|20)\d{2})\b/gi, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+\|\s+/g, " | ")
    .trim()
    .replace(/^[|,\-:\s]+|[|,\-:\s]+$/g, "");
}

function toLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);
}

function normalizeHeader(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSection(line: string): string | null {
  const header = normalizeHeader(line);
  if (!header) return null;

  if (["summary", "professional summary", "about", "profile", "objective"].includes(header)) {
    return "summary";
  }
  if (header.includes("experience") || ["employment", "work history"].includes(header)) {
    return "experience";
  }
  if (header.includes("project")) {
    return "projects";
  }
  if (header.includes("education")) {
    return "education";
  }
  if (header.includes("skill")) {
    return "skills";
  }
  if (header.includes("certification")) {
    return "certifications";
  }
  if (header.includes("award")) {
    return "awards";
  }

  return null;
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0];
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?\d[\d().\-\s]{8,}\d)/);
  return match?.[0]?.trim();
}

function looksLikeContactLine(line: string): boolean {
  return /@|mailto:|https?:\/\/|tel:|\+?\d[\d().\-\s]{7,}/i.test(line);
}

function looksLikeLocationLine(line: string): boolean {
  return /(berlin|germany|remote|india|europe|usa|united states|london|dubai|riyadh|canada|france|amsterdam)/i.test(line);
}

function looksLikeRoleLine(line: string): boolean {
  return /(engineer|developer|architect|designer|manager|consultant|specialist|founder|operator)/i.test(line);
}

function parseResumeSections(pdfText: string): Record<string, string[]> {
  const lines = toLines(pdfText);
  const sections: Record<string, string[]> = { top: [] };
  let current = "top";

  for (const line of lines) {
    const section = detectSection(line);
    if (section) {
      current = section;
      if (!sections[current]) {
        sections[current] = [];
      }
      continue;
    }

    if (!sections[current]) {
      sections[current] = [];
    }
    sections[current].push(line);
  }

  return sections;
}

function extractResumeName(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 5)) {
    if (line.length < 2 || line.length > 60) continue;
    if (line.includes("@")) continue;
    if (/\d/.test(line)) continue;
    if (detectSection(line)) continue;
    return line;
  }
  return undefined;
}

function extractResumeHeadline(topLines: string[]): string | undefined {
  for (const line of topLines.slice(1, 8)) {
    if (line.length < 6 || line.length > 90) continue;
    if (line.includes("@")) continue;
    if (/^\+?\d/.test(line)) continue;
    if (looksLikeContactLine(line)) continue;
    if (looksLikeLocationLine(line) && !looksLikeRoleLine(line)) continue;
    if (detectSection(line)) continue;
    return cleanInlineArtifacts(line);
  }
  return undefined;
}

function splitSkillTokens(value: string): string[] {
  const normalized = value.includes(":") ? value.split(":").slice(1).join(":") : value;

  return normalized
    .split(/[,|/;\u2022\u00b7]/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.length <= 32);
}

function extractSkills(sections: Record<string, string[]>, pdfText: string): string[] {
  const skillLines = [...(sections.skills || [])];
  if (skillLines.length) {
    return dedupeWords(skillLines.flatMap(splitSkillTokens)).slice(0, 18);
  }

  // Fallback: keep only known technical terms from resume text.
  const keywordRegex =
    /\b(JavaScript|TypeScript|Python|Java|Go|Rust|React|Next\.js|Node\.js|PostgreSQL|MySQL|MongoDB|Redis|Docker|Kubernetes|AWS|GCP|Azure|GraphQL|REST|CI\/CD|Git|Figma|Tailwind|HTML|CSS|SQL|Supabase|Vercel)\b/gi;
  const found = pdfText.match(keywordRegex) || [];
  return dedupeWords(found).slice(0, 18);
}

function extractHighlights(sections: Record<string, string[]>, facts: SourceFact[]): string[] {
  const sourceLines = [...(sections.experience || []), ...(sections.projects || [])];
  const actionOrMetric = sourceLines
    .filter((line) => line.length > 18)
    .filter((line) => /\d|%|\$|led|built|shipped|launched|increased|reduced|improved|developed|created/i.test(line))
    .filter((line) => !looksLikeContactLine(line))
    .map(cleanInlineArtifacts)
    .filter((line) => line.length > 18)
    .slice(0, 10);
  const bullets = sourceLines
    .filter((line) => line.length > 18 && !looksLikeContactLine(line))
    .map(cleanInlineArtifacts)
    .filter((line) => line.length > 18)
    .slice(0, 10);

  const factLines = facts.flatMap((fact) => {
    const out: string[] = [];
    if (fact.title) out.push(fact.title);
    if (fact.description) out.push(fact.description);

    if (fact.source === "github") {
      const publicRepos = fact.data?.publicRepos;
      const topRepos = fact.data?.topRepos;

      if (typeof publicRepos === "number") {
        out.push(`Maintains ${publicRepos} public repositories`);
      }

      if (Array.isArray(topRepos) && topRepos.length) {
        out.push(`Recent repos: ${topRepos.slice(0, 4).join(", ")}`);
      }
    }

    return out;
  });

  return dedupeWords([...actionOrMetric, ...bullets, ...factLines]).slice(0, 8);
}

function trimIncompleteEnding(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return compact;

  if (/\b(to|and|or|for|with)$/i.test(compact)) {
    return compact.replace(/\b(to|and|or|for|with)$/i, "").trim();
  }

  return compact;
}

function extractBio(
  sections: Record<string, string[]>,
  topLines: string[],
  headline: string,
  facts: SourceFact[],
): string {
  const summaryLines = [...(sections.summary || [])];
  if (summaryLines.length) {
    return trimIncompleteEnding(summaryLines.map(cleanInlineArtifacts).slice(0, 3).join(" "));
  }

  const candidate = topLines
    .filter((line) => line !== headline)
    .filter((line) => line.length > 24 && !line.includes("@"))
    .filter((line) => !looksLikeContactLine(line))
    .filter((line) => !looksLikeLocationLine(line))
    .slice(0, 3);
  if (candidate.length) {
    return trimIncompleteEnding(candidate.map(cleanInlineArtifacts).join(" "));
  }

  const experienceLines = [...(sections.experience || []), ...(sections.projects || [])]
    .map(cleanInlineArtifacts)
    .filter((line) => line.length > 28)
    .filter((line) => !looksLikeContactLine(line))
    .slice(0, 3);
  if (experienceLines.length) {
    return trimIncompleteEnding(experienceLines.join(" "));
  }

  const factDescriptions = facts.map((fact) => fact.description || "").filter(Boolean).slice(0, 2);
  if (factDescriptions.length) {
    return trimIncompleteEnding(factDescriptions.join(" "));
  }

  return "Professional profile generated from uploaded resume and public links.";
}

function cleanLocation(value: string): string {
  const beforeContact = value.split("|")[0] || value;
  return beforeContact
    .replace(/[^A-Za-z0-9,.\-() ]/g, " ")
    .replace(/\+?\d[\d().\-\s]{7,}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
}

export function summarizeProfile(facts: SourceFact[], urls: string[], pdfText: string): ProfileSummary {
  const sections = parseResumeSections(pdfText);
  const topLines = sections.top || [];
  const resumeName = extractResumeName(topLines);
  const name =
    (resumeName ? cleanInlineArtifacts(resumeName) : "") ||
    facts.find((f) => f.source === "github")?.title ||
    facts.find((f) => f.title)?.title ||
    "Your Brand";

  const headline =
    extractResumeHeadline(topLines) ||
    facts.find((f) => f.source === "github")?.description ||
    "Builder, creator, and operator";

  const bio = extractBio(sections, topLines, headline, facts);
  const highlights = extractHighlights(sections, facts);
  const skills = extractSkills(sections, pdfText);
  const locationLineRaw = topLines.find((line) => /(,|\bremote\b|\busa\b|\beurope\b|\bindia\b|\bgermany\b)/i.test(line));
  const locationLine = locationLineRaw ? cleanLocation(locationLineRaw) : undefined;
  const email = extractEmail(pdfText);
  const phone = extractPhone(pdfText);
  const contactLinks = dedupeWords([email ? `mailto:${email}` : "", phone ? `tel:${phone.replace(/\s+/g, "")}` : ""]);

  return {
    name,
    headline,
    bio,
    links: dedupeWords([...urls, ...contactLinks]),
    location:
      locationLine ||
      (facts.find((f) => f.source === "github")?.data?.location as string | undefined) ||
      undefined,
    highlights,
    skills,
    facts,
  };
}
