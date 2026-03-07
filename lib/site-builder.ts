import { randomUUID } from "crypto";
import type { GeneratedSite, ProfileSummary, SitePlan } from "./types";
import { chooseTheme } from "./themes";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderSiteHtml(site: GeneratedSite): string {
  const { profile, plan, theme } = site;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(plan.brandName)} | ${escapeHtml(plan.tagLine)}</title>
  <style>${theme.css}</style>
</head>
<body class="${theme.bodyClass}">
  <main class="page">
    <section class="hero">
      <div class="badge">${escapeHtml(plan.tagLine)}</div>
      <h1>${escapeHtml(plan.brandName)}</h1>
      <p>${escapeHtml(plan.heroBlurb)}</p>
      <p><strong>${escapeHtml(plan.cta)}</strong></p>
    </section>

    <section class="grid">
      ${plan.sections
        .map(
          (section) => `
      <article class="card" id="${escapeHtml(section.id)}">
        <h3>${escapeHtml(section.title)}</h3>
        <p>${escapeHtml(section.body)}</p>
      </article>`,
        )
        .join("\n")}
    </section>

    <section class="links">
      ${profile.links
        .map((link) => `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a>`)
        .join("\n")}
    </section>
  </main>
</body>
</html>`;
}

export function buildSite(profile: ProfileSummary, plan: SitePlan): GeneratedSite {
  const theme = chooseTheme(`${plan.brandName}-${plan.tagLine}`);
  const id = randomUUID();

  const site: GeneratedSite = {
    id,
    createdAt: new Date().toISOString(),
    profile,
    plan,
    theme,
    html: "",
  };

  site.html = renderSiteHtml(site);
  return site;
}