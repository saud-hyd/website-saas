# Zero-Friction URL-to-Website Generator (OSS)

Open-source resume/profile-to-website builder.

This project converts profile URLs (GitHub, YouTube, Google Maps, and general websites) plus optional PDF uploads into a generated site, supports chat-based copy/layout edits, and offers one-click Netlify deployment.

## What it does

- Accepts multiple profile URLs and an optional PDF file
- Extracts profile facts from sources
- Synthesizes a profile summary
- Uses Gemini (`@google/genai`) for structured site planning
- Supports "vibe" chat edits after generation
- Renders a bold themed static website
- Saves generated artifacts under `generated/<site-id>`
- Deploys generated output to Netlify in one click

## Stack

- Next.js App Router (TypeScript)
- Server-side extraction via `fetch` + `cheerio`
- PDF extraction via `pdf-parse`
- AI generation/editing via Gemini API
- Netlify deploy upload via zip API

## Setup

1. Install dependencies

```bash
npm install
```

2. Copy env file and configure

```bash
cp .env.example .env.local
```

Required env vars:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, default `gemini-3.1-pro-preview`)
- `NETLIFY_AUTH_TOKEN` (for deploy button)
- `NETLIFY_SITE_ID` (for deploy button)

3. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## API routes

- `POST /api/generate`
  - Body: `urls: string[]`, `pdfBase64?: string`, `objective?: string`
- `POST /api/chat-edit`
  - Body: `id: string`, `message: string`, `history?: { role: "user" | "model"; text: string }[]`
- `POST /api/deploy`
  - Body: `id: string`
- `GET /render/<id>`
  - Serves generated static HTML

## Notes

- LinkedIn ingestion is intentionally not included in this OSS version.
- Some websites may block scraping; extraction is best-effort.
- GitHub API use may hit rate limits without authentication.