"use client";

import { useState } from "react";

type GenerateResponse = {
  id: string;
  previewUrl: string;
  theme: string;
  extractedSources: { source: string; title: string | null }[];
};

type DeployResponse = {
  provider: "netlify";
  url: string;
};

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

type ChatEditResponse = {
  assistantReply: string;
  previewUrl: string;
  theme: string;
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
  const [urls, setUrls] = useState("https://github.com/vercel\nhttps://www.youtube.com/@vercel");
  const [objective, setObjective] = useState("Lead generation and personal credibility");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatWorking, setChatWorking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setWorking(true);
    setError(null);
    setGenerated(null);
    setDeployUrl(null);

    try {
      const pdfBase64 = pdfFile ? await readPdfAsBase64(pdfFile) : undefined;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: urls.split("\n").map((v) => v.trim()).filter(Boolean),
          objective,
          pdfBase64,
        }),
      });

      const json = (await response.json()) as GenerateResponse & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Generation failed");
      }

      setGenerated(json);
      setPreviewSrc(json.previewUrl);
      setChatMessages([
        {
          role: "model",
          text: "Site generated. Tell me what to change and I will update it live.",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown generation error");
    } finally {
      setWorking(false);
    }
  }

  async function handleDeploy(): Promise<void> {
    if (!generated) return;

    setDeploying(true);
    setError(null);

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: generated.id }),
      });

      const json = (await response.json()) as DeployResponse & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Deploy failed");
      }

      setDeployUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown deploy error");
    } finally {
      setDeploying(false);
    }
  }

  async function handleChatEdit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!generated || !chatInput.trim()) return;

    const userTurn: ChatMessage = { role: "user", text: chatInput.trim() };
    const history = [...chatMessages];
    setChatMessages((prev) => [...prev, userTurn]);
    setChatInput("");
    setChatWorking(true);
    setError(null);

    try {
      const response = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: generated.id,
          message: userTurn.text,
          history,
        }),
      });

      const json = (await response.json()) as ChatEditResponse & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Chat edit failed");
      }

      setGenerated({
        ...generated,
        theme: json.theme,
      });
      setPreviewSrc(json.previewUrl);
      setChatMessages((prev) => [...prev, { role: "model", text: json.assistantReply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown chat edit error");
    } finally {
      setChatWorking(false);
    }
  }

  return (
    <div className="shell">
      <section className="panel">
        <h2>Input Sources</h2>
        <form onSubmit={handleGenerate} className="stack">
          <label>
            Profile URLs (one per line)
            <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={7} />
          </label>

          <label>
            Optional PDF (resume, portfolio)
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
          </label>

          <label>
            Website goal
            <input value={objective} onChange={(e) => setObjective(e.target.value)} />
          </label>

          <button type="submit" disabled={working}>
            {working ? "Generating..." : "Generate Website"}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        {generated ? (
          <div className="result">
            <h3>Generated</h3>
            <p>
              Theme: <strong>{generated.theme}</strong>
            </p>
            <p>
              Sources: {generated.extractedSources.map((s) => `${s.source}${s.title ? ` (${s.title})` : ""}`).join(", ") || "none"}
            </p>
            <a href={previewSrc || generated.previewUrl} target="_blank" rel="noreferrer">
              Open full preview
            </a>

            <button type="button" onClick={handleDeploy} disabled={deploying}>
              {deploying ? "Deploying..." : "One-Click Deploy (Netlify)"}
            </button>

            {deployUrl ? (
              <p>
                Live URL:{" "}
                <a href={deployUrl} target="_blank" rel="noreferrer">
                  {deployUrl}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        {generated ? (
          <div className="chat-box">
            <h3>Vibe Edit Chat</h3>
            <div className="chat-log">
              {chatMessages.map((turn, idx) => (
                <p key={`${turn.role}-${idx}`} className={`chat-turn ${turn.role}`}>
                  <strong>{turn.role === "user" ? "You" : "Builder"}:</strong> {turn.text}
                </p>
              ))}
            </div>
            <form onSubmit={handleChatEdit} className="chat-form">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Example: make this more minimal, change to cinematic theme, shorten hero copy"
              />
              <button type="submit" disabled={chatWorking || !chatInput.trim()}>
                {chatWorking ? "Applying..." : "Apply Edit"}
              </button>
            </form>
          </div>
        ) : null}
      </section>

      <section className="panel preview">
        {generated ? (
          <iframe title="Generated preview" src={previewSrc || generated.previewUrl} />
        ) : (
          <div className="placeholder">Preview appears here after generation.</div>
        )}
      </section>
    </div>
  );
}
