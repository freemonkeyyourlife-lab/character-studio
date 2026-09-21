"use client";

import { useMemo, useState } from "react";

type Message = { role: "system" | "user" | "assistant"; content: string };

export default function ArtanisIntegrationPage() {
  const [instruction, setInstruction] = useState("");
  const [messagesText, setMessagesText] = useState("");
  const [mode, setMode] = useState<"prompt" | "image" | "video">("prompt");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const messages = useMemo<Message[]>(() => {
    try {
      const parsed = JSON.parse(messagesText || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [messagesText]);

  const build = async () => {
    setError("");
    setResult("");
    try {
      const response = await fetch("/api/integrations/artanis/context", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-artanis-integration-secret": "browser-disabled" },
        body: JSON.stringify({ instruction, messages, mode }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Integration endpoint is protected for server-to-server use.");
      setResult(data?.prompt || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build context.");
    }
  };

  return (
    <main className="shell">
      <header className="header">
        <div>
          <div className="eyebrow">CHARACTER STUDIO · INTEGRATIONS</div>
          <h1>Artanis / Triania Bridge</h1>
          <p>Server-to-server bridge for turning live chat context into image or video generation context. The integration secret stays on the server.</p>
        </div>
        <div className="headerActions"><a className="secondary smallButton" href="/">Characters</a><a className="secondary smallButton" href="/video">Video Studio</a></div>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Context preview</h2>
          <label>Instruction<textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="What should be created from the conversation?" maxLength={8000} /></label>
          <label>Chat messages as JSON<textarea value={messagesText} onChange={(e) => setMessagesText(e.target.value)} placeholder='[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]' /></label>
          <label>Output mode<select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="prompt">Prompt only</option><option value="image">Image</option><option value="video">Video</option></select></label>
          <button className="primary" onClick={() => void build()}>Test protected bridge</button>
          {error && <div className="error">{error}</div>}
        </div>
        <div className="card">
          <h2>Integration contract</h2>
          <p>Base44 should call the protected endpoints server-to-server with <code>x-artanis-integration-secret</code>.</p>
          <ul>
            <li><code>POST /api/integrations/artanis/context</code> → normalized prompt/context</li>
            <li><code>POST /api/integrations/artanis/image</code> → generated image bytes</li>
            <li><code>POST /api/integrations/artanis/video</code> → generated video bytes</li>
            <li><code>GET /api/integrations/artanis/health</code> → integration capabilities</li>
          </ul>
          <p>Only assets explicitly marked <code>consentGranted: true</code> are accepted by the context layer. Voice generation is reserved as a separate adapter and is not falsely reported as implemented yet.</p>
          {result && <div className="promptBox"><small>Prompt preview</small>{result}</div>}
        </div>
      </section>
    </main>
  );
}
