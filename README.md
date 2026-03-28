# Resume-to-Website Builder

Open-source website builder focused on resume PDFs.

This project converts resume PDFs into a generated interactive website and uses a draft-to-publish workflow inside a single Vercel-hosted Next.js app.

## What it does

- Accepts a resume PDF upload
- Extracts profile facts from the resume
- Builds structured website copy using Gemini
- Generates modern interactive drafts with in-page animations and interactions
- Lets users test drafts first, then publish explicitly
- Stores artifacts under `generated/<site-id>`

## Stack

- Next.js App Router (TypeScript)
- `cheerio` for metadata extraction
- `pdf-parse` for resume text extraction
- Gemini API (`@google/genai`) for generation and chat edits

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

```bash
cp .env.example .env.local
```

Required:

- `GEMINI_API_KEY`
Optional:
- `GEMINI_MODEL` (default: `gemini-3.1-pro-preview`)

3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API routes

- `POST /api/generate`
  - Body: `pdfBase64?: string`, `objective?: string`
  - Creates a draft site and returns a preview URL
- `POST /api/publish`
  - Body: `id: string`
  - Promotes draft to published
- `GET /render/<id>`
  - Serves draft preview HTML
- `GET /site/<id>`
  - Serves published live HTML only

## Notes

- Gemini API key is required for generation.
