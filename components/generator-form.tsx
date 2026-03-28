"use client";

import { useState } from "react";

type SiteStatus = "draft" | "published";

type GenerateResponse = {
  id: string;
  previewUrl: string;
  publishedUrl: string | null;
  status: SiteStatus;
  theme: string;
  warnings?: string[];
  extractedSources: { source: string; title: string | null }[];
};

type PublishResponse = {
  id: string;
  previewUrl: string;
  publishedUrl: string;
  status: SiteStatus;
  publishedAt: string | null;
};

type BuildStep = {
  step: string;
  message: string;
  progress: number;
};

function readPdfAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",").pop() || "" : result;
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Failed to read PDF file"));
    reader.readAsDataURL(file);
  });
}

export function GeneratorForm() {
  const presets = [
    "Portfolio for hiring managers",
    "Founder site for inbound leads",
    "Consultant profile for enterprise clients",
    "Productized service landing page",
  ];
  const [objective, setObjective] = useState("Lead generation and personal credibility");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [working, setWorking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!pdfFile) {
      setError("Resume PDF is required.");
      return;
    }
    setWorking(true);
    setError(null);
    setGenerated(null);
    setLiveUrl(null);
    setBuildProgress(0);
    setBuildSteps([]);

    try {
      const pdfBase64 = pdfFile ? await readPdfAsBase64(pdfFile) : undefined;
      const response = await fetch("/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          pdfBase64,
        }),
      });
      if (!response.ok || !response.body) {
        const fallback = (await response.json()) as { error?: string };
        throw new Error(fallback.error || "Generation failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      const applyEvent = (raw: string): void => {
        const lines = raw.split("\n");
        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const dataText = dataLines.join("\n");
        if (!dataText) return;
        const payload = JSON.parse(dataText) as Record<string, unknown>;

        if (eventName === "status") {
          const step = payload as unknown as BuildStep;
          setBuildProgress(step.progress || 0);
          setBuildSteps((prev) => [...prev, step]);
          return;
        }

        if (eventName === "complete") {
          const result = payload as unknown as GenerateResponse;
          setBuildProgress(100);
          setGenerated(result);
          setPreviewSrc(result.previewUrl);
          setLiveUrl(result.publishedUrl);
          return;
        }

        if (eventName === "error") {
          const message = String(payload.message || "Generation failed");
          throw new Error(message);
        }
      };

      const nextBoundary = (value: string): { index: number; delimiterLength: number } | null => {
        const unix = value.indexOf("\n\n");
        const windows = value.indexOf("\r\n\r\n");

        if (unix === -1 && windows === -1) return null;
        if (unix === -1) return { index: windows, delimiterLength: 4 };
        if (windows === -1) return { index: unix, delimiterLength: 2 };

        if (unix < windows) {
          return { index: unix, delimiterLength: 2 };
        }

        return { index: windows, delimiterLength: 4 };
      };

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        let boundary = nextBoundary(buffer);
        while (boundary) {
          const rawEvent = buffer.slice(0, boundary.index).trim();
          buffer = buffer.slice(boundary.index + boundary.delimiterLength);
          if (rawEvent) {
            applyEvent(rawEvent);
          }
          boundary = nextBoundary(buffer);
        }
      }

      if (buffer.trim()) {
        applyEvent(buffer.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown generation error");
    } finally {
      setWorking(false);
    }
  }

  async function handlePublish(): Promise<void> {
    if (!generated) return;

    setPublishing(true);
    setError(null);

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: generated.id }),
      });

      const json = (await response.json()) as PublishResponse & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Publish failed");
      }

      setGenerated({
        ...generated,
        status: json.status,
        publishedUrl: json.publishedUrl,
      });
      setPreviewSrc(json.previewUrl);
      setLiveUrl(json.publishedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown publish error");
    } finally {
      setPublishing(false);
    }
  }

  const latestStep = buildSteps.length ? buildSteps[buildSteps.length - 1] : null;

  return (
    <div className="builder-shell">
      <section className="builder-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Builder Console</p>
            <h2>Generate a real website from your resume</h2>
            <p className="muted">
              Upload a PDF. Gemini turns resume data into a modern web presence with sections, case studies, and live preview.
            </p>
          </div>
          <div className="panel-badge">Gemini Powered</div>
        </div>

        <form onSubmit={handleGenerate} className="stack">
          <div
            className={`dropzone ${dragActive ? "active" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              const file = event.dataTransfer.files?.[0];
              if (file) {
                setPdfFile(file);
              }
            }}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
            <div>
              <p className="drop-title">{pdfFile ? pdfFile.name : "Drop resume PDF here"}</p>
              <p className="drop-sub">Or click to upload. PDF only.</p>
            </div>
          </div>

          <div className="preset-block">
            <p className="label">Website goal</p>
            <div className="preset-grid">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset ${objective === preset ? "active" : ""}`}
                  onClick={() => setObjective(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>

          <button type="submit" className="cta" disabled={working}>
            {working ? "Building Website..." : "Generate Website"}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        <div className="progress-card">
          <div className="progress-head">
            <h3>Build Progress</h3>
            <span className="progress-pill">{buildProgress}%</span>
          </div>
          <div className="progress-bar">
            <div style={{ width: `${buildProgress}%` }} />
          </div>
          <div className="progress-log">
            {(working ? buildSteps : buildSteps.slice(-4)).map((step, idx) => (
              <div key={`${step.step}-${idx}`} className="progress-item">
                <span>{step.step}</span>
                <span>{step.message}</span>
              </div>
            ))}
            {!buildSteps.length ? <p className="muted">Waiting for a resume to start the build.</p> : null}
          </div>
        </div>

        {generated ? (
          <div className="result-card">
            <div>
              <h3>Draft Ready</h3>
              <p className="muted">Theme: {generated.theme}</p>
              <p className="muted">
                Status: {generated.status === "published" ? "Published" : "Draft (not live yet)"}
              </p>
            </div>
            <div className="result-actions">
              <a className="link-pill" href={previewSrc || generated.previewUrl} target="_blank" rel="noreferrer">
                Open preview tab
              </a>
              {generated.status !== "published" ? (
                <button type="button" onClick={handlePublish} disabled={publishing}>
                  {publishing ? "Publishing..." : "Publish Website"}
                </button>
              ) : null}
            </div>
            {liveUrl ? (
              <p className="muted">
                Live URL:{" "}
                <a href={liveUrl} target="_blank" rel="noreferrer">
                  {liveUrl}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="preview-panel">
        <div className="preview-head">
          <div>
            <p className="eyebrow">Live Preview</p>
            <h3>Your website appears here</h3>
          </div>
          <div className="preview-status">
            <span className={`status-dot ${working ? "pulse" : "idle"}`} />
            <span>{working ? "Generating" : generated ? "Ready" : "Idle"}</span>
          </div>
        </div>
        <div className="preview-frame">
          {generated ? (
            <iframe title="Generated preview" src={previewSrc || generated.previewUrl} />
          ) : working ? (
            <div className="placeholder">
              Building website... {latestStep ? `${latestStep.step}: ${latestStep.message}` : "starting pipeline"}
            </div>
          ) : (
            <div className="placeholder">Preview appears here after generation.</div>
          )}
        </div>
      </section>
    </div>
  );
}
