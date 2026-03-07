import type { ThemePreset } from "./types";

export const THEMES: ThemePreset[] = [
  {
    id: "neo-brutal",
    name: "Neo Brutal Blast",
    bodyClass: "theme-neo-brutal",
    css: `
:root { --bg: #ffe166; --ink: #111; --a: #f94144; --b: #277da1; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Space Grotesk", "Segoe UI", sans-serif; background: radial-gradient(circle at 20% 0%, #fff, var(--bg)); color: var(--ink); }
.page { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }
.hero { border: 4px solid var(--ink); background: #fff; box-shadow: 10px 10px 0 var(--ink); padding: 28px; transform: rotate(-1deg); }
.hero h1 { margin: 0; font-size: clamp(2.2rem, 5vw, 4rem); line-height: 0.95; }
.hero p { font-size: 1.1rem; max-width: 72ch; }
.badge { display: inline-block; border: 3px solid var(--ink); background: var(--a); color: #fff; padding: 6px 12px; font-weight: 700; margin-bottom: 14px; }
.grid { margin-top: 28px; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.card { border: 3px solid var(--ink); background: #fff; padding: 18px; box-shadow: 8px 8px 0 var(--b); }
.card h3 { margin-top: 0; }
.links { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 10px; }
.links a { text-decoration: none; border: 2px solid var(--ink); background: var(--b); color: #fff; padding: 8px 12px; font-weight: 700; }
`,
  },
  {
    id: "cinema-gradient",
    name: "Cinema Gradient Riot",
    bodyClass: "theme-cinema-gradient",
    css: `
:root { --bg1: #0f1020; --bg2: #2a0845; --bg3: #6441a5; --ink: #f5f5f5; --accent: #ff784f; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Sora", "Segoe UI", sans-serif; color: var(--ink); background: linear-gradient(120deg, var(--bg1), var(--bg2), var(--bg3)); min-height: 100vh; }
.page { max-width: 1200px; margin: 0 auto; padding: 52px 24px 90px; }
.hero { position: relative; overflow: hidden; border-radius: 20px; padding: 36px; background: rgba(255,255,255,0.08); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.25); }
.hero::after { content: ""; position: absolute; right: -80px; top: -120px; width: 280px; height: 280px; background: var(--accent); border-radius: 50%; filter: blur(70px); }
.hero h1 { margin: 0; font-size: clamp(2rem, 5vw, 4.2rem); line-height: 1; }
.hero p { max-width: 72ch; opacity: 0.92; }
.badge { display: inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.18); margin-bottom: 14px; font-weight: 700; }
.grid { margin-top: 24px; display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.card { background: rgba(0,0,0,0.28); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; padding: 20px; }
.card h3 { margin-top: 0; }
.links { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; }
.links a { text-decoration: none; color: #101010; background: #fff; border-radius: 999px; padding: 8px 14px; font-weight: 700; }
`,
  },
  {
    id: "editorial-collage",
    name: "Editorial Collage",
    bodyClass: "theme-editorial",
    css: `
:root { --paper: #f8f3e8; --ink: #1f1f1f; --muted: #635f56; --accent: #c43b2f; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Fraunces", Georgia, serif; color: var(--ink); background: repeating-linear-gradient(0deg, #f3eee3, #f3eee3 30px, #f8f3e8 30px, #f8f3e8 60px); }
.page { max-width: 1000px; margin: 0 auto; padding: 44px 24px 84px; }
.hero { border-left: 8px solid var(--accent); background: rgba(255,255,255,0.68); padding: 26px 22px; }
.hero h1 { margin: 0; font-size: clamp(2.3rem, 5vw, 4.2rem); line-height: 0.98; }
.hero p { color: var(--muted); max-width: 70ch; }
.badge { display: inline-block; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.82rem; font-weight: 800; color: var(--accent); margin-bottom: 12px; }
.grid { margin-top: 28px; columns: 2 300px; column-gap: 18px; }
.card { break-inside: avoid; margin: 0 0 16px; border: 1px solid #d0c7b7; background: rgba(255,255,255,0.72); padding: 14px 16px; }
.card h3 { margin: 0 0 8px; font-size: 1.45rem; }
.links { margin-top: 22px; display: flex; flex-wrap: wrap; gap: 12px; }
.links a { color: var(--accent); text-underline-offset: 4px; font-weight: 700; }
`,
  },
];

export function chooseTheme(seed: string): ThemePreset {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return THEMES[Math.abs(hash) % THEMES.length];
}

export function getThemeById(id: string): ThemePreset | null {
  return THEMES.find((theme) => theme.id === id) || null;
}
