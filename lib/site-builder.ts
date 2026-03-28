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

function shortenLabel(label: string): string {
  const words = label.split(/\s+/).filter(Boolean);
  return words.length > 3 ? `${words.slice(0, 3).join(" ")}...` : label;
}

function formatLinkLabel(link: string): string {
  if (link.startsWith("mailto:")) return "Email";
  if (link.startsWith("tel:")) return "Call";
  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

export function renderSiteHtml(site: GeneratedSite): string {
  const { profile, plan, theme } = site;
  const primarySectionId = plan.sections[0]?.id ? `#${plan.sections[0].id}` : "#";
  const primaryCtaHref = profile.links.length ? "#contact" : primarySectionId;
  const navLinks = [
    `<a href="#top">Home</a>`,
    `<a href="#services">Services</a>`,
    `<a href="#projects">Projects</a>`,
    ...plan.sections.map((section) => `<a href="#${escapeHtml(section.id)}">${escapeHtml(shortenLabel(section.title))}</a>`),
    profile.links.length ? `<a href="#contact">Contact</a>` : "",
  ]
    .filter(Boolean)
    .join("");
  const highlightChips = plan.highlights.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("");
  const statCards = plan.stats
    .map(
      (stat) => `
        <div class="stat">
          <div class="stat-value">${escapeHtml(stat.value)}</div>
          <div class="stat-label">${escapeHtml(stat.label)}</div>
        </div>
      `,
    )
    .join("");
  const locationMeta = profile.location ? `<span class="meta-pill">${escapeHtml(profile.location)}</span>` : "";
  const proofStrip = plan.highlights
    .slice(0, 3)
    .map((item) => `<div class="proof-item">${escapeHtml(item)}</div>`)
    .join("");
  const serviceCards = plan.services
    .map(
      (service) => `
      <div class="service-card">
        <div class="service-icon">${escapeHtml(service.title.slice(0, 1))}</div>
        <h3>${escapeHtml(service.title)}</h3>
        <p>${escapeHtml(service.description)}</p>
      </div>
    `,
    )
    .join("");
  const projectCards = plan.projects
    .map(
      (project, index) => `
      <article class="project-card">
        <div class="project-index">0${index + 1}</div>
        <div class="project-head">
          <h3>${escapeHtml(project.name)}</h3>
          <div class="project-tags">${project.stack
            .map((tag) => `<span>${escapeHtml(tag)}</span>`)
            .join("")}</div>
        </div>
        <p>${escapeHtml(project.summary)}</p>
        <ul class="project-outcomes">${project.outcomes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    `,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(plan.brandName)} | ${escapeHtml(plan.tagLine)}</title>
  <style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;600;700&display=swap');
${theme.css}
:root { --accent: var(--accent, #22c55e); --accent-2: var(--accent-2, #14b8a6); --muted: var(--muted, #9ca3af); --card: rgba(255,255,255,0.08); }
.page::before { content: ""; position: fixed; inset: 0; background: radial-gradient(circle at 12% 8%, rgba(34,211,238,0.12), transparent 40%), radial-gradient(circle at 85% 18%, rgba(34,197,94,0.18), transparent 45%), radial-gradient(circle at 40% 80%, rgba(248,113,113,0.16), transparent 40%); pointer-events: none; z-index: 0; }
.page::after { content: ""; position: fixed; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 48px 48px; opacity: 0.4; pointer-events: none; z-index: 0; }
.page { position: relative; z-index: 1; }
.hero { display: grid; gap: 24px; padding: 34px; border-radius: 28px; border: 1px solid rgba(255,255,255,0.15); background: linear-gradient(130deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03)); box-shadow: 0 32px 80px rgba(0,0,0,0.32); }
.hero .kicker { text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem; color: var(--accent); margin: 0 0 10px; font-weight: 700; }
.hero .lead { font-size: 1.08rem; max-width: 62ch; opacity: 0.92; line-height: 1.7; }
.hero h1 { margin: 0; font-size: clamp(2.4rem, 5vw, 4.6rem); line-height: 0.95; }
.hero-grid { display: grid; gap: 22px; grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.9fr); align-items: stretch; }
.hero-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.meta-pill { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); font-size: 0.82rem; font-weight: 600; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px; font-weight: 700; text-decoration: none; border: 1px solid transparent; }
.btn.primary { background: linear-gradient(120deg, var(--accent), var(--accent-2)); color: #08110c; }
.btn.ghost { border-color: rgba(255,255,255,0.2); color: inherit; background: transparent; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.chip { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.18); font-size: 0.82rem; font-weight: 600; }
.hero-aside { display: grid; gap: 14px; align-content: space-between; }
.stats { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-top: 8px; }
.stat { padding: 16px; border-radius: 18px; background: linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.18); }
.stat-value { font-size: 1.4rem; font-weight: 800; }
.stat-label { color: var(--muted); font-size: 0.85rem; margin-top: 4px; }
.proof-strip { display: grid; gap: 10px; }
.proof-item { padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); font-weight: 600; line-height: 1.5; }
.grid { display: grid; gap: 16px; margin-top: 24px; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 28px; }
.section-head h2 { margin: 0; font-size: clamp(1.6rem, 3.2vw, 2.4rem); }
.section-head p { margin: 0; color: var(--muted); max-width: 60ch; }
.services { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 16px; }
.service-card { padding: 22px; border-radius: 22px; background: linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.18); display: grid; gap: 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }
.service-card h3 { margin: 0; font-size: 1.15rem; }
.service-card p { margin: 0; color: var(--muted); }
.service-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; font-weight: 800; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.2); }
.projects { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top: 18px; }
.project-card { padding: 22px; border-radius: 24px; background: linear-gradient(180deg, rgba(0,0,0,0.28), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.12); display: grid; gap: 12px; position: relative; overflow: hidden; }
.project-index { position: absolute; right: 16px; top: 14px; font-size: 3rem; font-weight: 800; opacity: 0.08; letter-spacing: -0.06em; }
.project-head { display: grid; gap: 10px; padding-right: 48px; }
.project-card h3 { margin: 0; font-size: 1.2rem; }
.project-card p { margin: 0; color: var(--muted); }
.project-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.project-tags span { font-size: 0.75rem; padding: 4px 8px; border-radius: 999px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); }
.project-outcomes { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
.section { margin-top: 22px; padding: 22px; border-radius: 18px; background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.12); }
.section { transition: transform .2s ease, box-shadow .2s ease; }
.section:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(0,0,0,0.25); }
.section h3 { margin-top: 0; font-size: 1.35rem; }
.section p { margin: 0; opacity: 0.9; }
.bullets { margin: 12px 0 0; padding-left: 18px; display: grid; gap: 6px; }
.bullet-pill { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.1); font-size: 0.85rem; font-weight: 600; }
.pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.contact { margin-top: 28px; padding: 18px; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.2); display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.contact a { text-decoration: none; color: inherit; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.08); font-weight: 700; }
.progress { position: fixed; top: 0; left: 0; height: 4px; width: var(--progress, 0%); background: #00d1ff; z-index: 50; transition: width 120ms linear; }
.nav { position: sticky; top: 8px; z-index: 20; display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 18px; backdrop-filter: blur(6px); }
.nav a { text-decoration: none; font-weight: 700; border: 1px solid rgba(255,255,255,0.22); padding: 7px 11px; border-radius: 999px; background: rgba(0,0,0,0.16); color: inherit; }
.orbs { pointer-events: none; position: fixed; inset: 0; overflow: hidden; z-index: 0; }
.orb { position: absolute; border-radius: 50%; filter: blur(38px); opacity: 0.34; animation: float 12s ease-in-out infinite; }
.orb.a { width: 280px; height: 280px; background: #22d3ee; left: -40px; top: 15%; }
.orb.b { width: 260px; height: 260px; background: #fb7185; right: -50px; top: 45%; animation-delay: 2.5s; }
.orb.c { width: 220px; height: 220px; background: #a78bfa; left: 35%; bottom: -70px; animation-delay: 5s; }
.page { position: relative; z-index: 1; }
.reveal { opacity: 0; transform: translateY(14px) scale(0.985); transition: opacity .55s ease, transform .55s ease; }
.reveal.visible { opacity: 1; transform: translateY(0) scale(1); }
.card { transform-style: preserve-3d; will-change: transform; transition: transform .12s ease-out; }
@keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-18px) } }
@media (max-width: 980px) {
  .hero-grid { grid-template-columns: 1fr; }
  .nav { position: static; }
  .section-head { flex-direction: column; align-items: flex-start; }
}
  </style>
</head>
<body class="${theme.bodyClass}">
  <div class="progress"></div>
  <div class="orbs"><div class="orb a"></div><div class="orb b"></div><div class="orb c"></div></div>
  <main class="page" id="top">
    <nav class="nav">${navLinks}</nav>
    <section class="hero reveal">
      <div class="hero-grid">
        <div>
          <p class="kicker">${escapeHtml(plan.tagLine)}</p>
          <h1>${escapeHtml(plan.brandName)}</h1>
          <p class="lead">${escapeHtml(plan.heroBlurb)}</p>
          <div class="hero-meta">${locationMeta}</div>
          <div class="actions">
            <a class="btn primary" href="${escapeHtml(primaryCtaHref)}">${escapeHtml(plan.ctaPrimary)}</a>
            <a class="btn ghost" href="${escapeHtml(primarySectionId)}">${escapeHtml(plan.ctaSecondary)}</a>
          </div>
          <div class="chips">${highlightChips}</div>
        </div>
        <div class="hero-aside">
          <div class="stats">
            ${statCards}
          </div>
          <div class="proof-strip">
            ${proofStrip}
          </div>
        </div>
      </div>
    </section>

    <section class="section-head reveal" id="services">
      <div>
        <h2>Services</h2>
        <p>Clear, outcome-driven services designed to ship modern AI and web products fast.</p>
      </div>
    </section>
    <section class="services reveal">
      ${serviceCards}
    </section>

    <section class="section-head reveal" id="projects">
      <div>
        <h2>Selected Projects</h2>
        <p>Recent work that shows how I translate resume experience into real shipped outcomes.</p>
      </div>
    </section>
    <section class="projects reveal">
      ${projectCards}
    </section>

    <section class="grid">
      ${plan.sections
        .map((section) => {
          const bullets = section.bullets || [];
          const isSkillSection = /skill|stack|tool|tech/i.test(section.id) || /skill|stack|tool|tech/i.test(section.title);
          const bulletMarkup = bullets.length
            ? isSkillSection
              ? `<div class="pill-row">${bullets
                  .map((item) => `<span class="bullet-pill">${escapeHtml(item)}</span>`)
                  .join("")}</div>`
              : `<ul class="bullets">${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
            : "";

          return `
      <article class="section reveal" id="${escapeHtml(section.id)}">
        <h3>${escapeHtml(section.title)}</h3>
        <p>${escapeHtml(section.body)}</p>
        ${bulletMarkup}
      </article>`;
        })
        .join("\n")}
    </section>

    ${
      profile.links.length
        ? `<section class="contact reveal" id="contact">
      ${profile.links
        .map(
          (link) =>
            `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(formatLinkLabel(link))}</a>`,
        )
        .join("\n")}
    </section>`
        : ""
    }
  </main>
  <script>
    const onScroll = () => {
      const doc = document.documentElement;
      const total = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const progress = Math.min(100, (doc.scrollTop / total) * 100);
      document.body.style.setProperty('--progress', progress + '%');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      }
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    document.querySelectorAll('.section').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = 'perspective(700px) rotateX(' + (-y * 5) + 'deg) rotateY(' + (x * 7) + 'deg)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
      });
    });
  </script>
</body>
</html>`;
}

export function buildSite(profile: ProfileSummary, plan: SitePlan): GeneratedSite {
  const theme = chooseTheme(`${plan.brandName}-${plan.tagLine}`);
  const id = randomUUID();

  const site: GeneratedSite = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "draft",
    publishedAt: null,
    profile,
    plan,
    theme,
    html: "",
  };

  site.html = renderSiteHtml(site);
  return site;
}
