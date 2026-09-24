"use client";

import { useEffect, useRef, useState } from "react";

type Model = { id: string; name: string; capabilities: string[] };
type Provider = { id: string; name: string; configured: boolean; models: Model[] };
type Result = { id: string; name: string; model: string; seconds: number; imageUrl?: string; error?: string; rating?: number };

export default function ProviderTestCenter() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [reference, setReference] = useState<File | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currentUrls = useRef<string[]>([]);
  const currentController = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/providers", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Provider konnten nicht geladen werden.");
      const data = await response.json();
      if (active) setProviders(data.providers || []);
    }).catch((cause) => { if (active) setError(cause.message); });
    return () => {
      active = false;
      currentController.current?.abort();
      currentUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const capability = reference ? "image-edit" : "text-to-image";
  const eligible = providers.filter((provider) => provider.configured && provider.models.some((model) => model.capabilities.includes(capability)));
  const chosen = eligible.filter((provider) => selected.includes(provider.id));
  const rated = results.filter((result) => result.imageUrl && result.rating);
  const topRating = Math.max(0, ...rated.map((result) => result.rating || 0));
  const favorites = rated.filter((result) => result.rating === topRating);

  async function compare() {
    if (busy || !prompt.trim() || !chosen.length) return;
    currentUrls.current.forEach((url) => URL.revokeObjectURL(url));
    currentUrls.current = [];
    setResults([]);
    setError("");
    setBusy(true);
    const controller = new AbortController();
    currentController.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 125_000);
    try {
      const next = await Promise.all(chosen.map(async (provider): Promise<Result> => {
        const model = provider.models.find((item) => item.capabilities.includes(capability))!;
        const start = performance.now();
        try {
          const init: RequestInit = reference ? (() => {
            const form = new FormData();
            form.set("prompt", prompt.trim());
            form.set("provider", provider.id);
            form.set("model", model.id);
            form.set("reference", reference);
            return { method: "POST", body: form, signal: controller.signal };
          })() : {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt.trim(), provider: provider.id, model: model.id }), signal: controller.signal,
          };
          const response = await fetch("/api/generate", init);
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error || `HTTP ${response.status}`);
          }
          const blob = await response.blob();
          if (controller.signal.aborted) throw new Error("Vergleich abgebrochen.");
          const url = URL.createObjectURL(blob);
          currentUrls.current.push(url);
          return { id: provider.id, name: provider.name, model: model.name, seconds: Math.round((performance.now() - start) / 100) / 10, imageUrl: url };
        } catch (cause) {
          return { id: provider.id, name: provider.name, model: model.name, seconds: Math.round((performance.now() - start) / 100) / 10,
            error: cause instanceof Error ? cause.message : "Generierung fehlgeschlagen." };
        }
      }));
      if (!controller.signal.aborted) setResults(next);
    } finally {
      window.clearTimeout(timer);
      currentController.current = null;
      setBusy(false);
    }
  }

  return <main className="pageShell">
    <section className="hero"><div><p className="eyebrow">PROVIDER TEST CENTER</p><h1>Engines vergleichen</h1>
      <p className="muted">Derselbe Prompt und dieselbe Referenz für alle ausgewählten Bildmodelle.</p></div>
      <a className="secondary smallButton" href="/">Zurück</a></section>
    <section className="panel stack">
      <label>Prompt<textarea rows={4} maxLength={4000} value={prompt} disabled={busy} onChange={(event) => setPrompt(event.target.value)} /></label>
      <label>Referenzbild (optional, PNG/JPEG/WebP, max. 8 MB)
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => {
          const file = event.target.files?.[0] || null;
          if (file && (file.size > 8 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
            setError("Bitte ein PNG-, JPEG- oder WebP-Bild bis 8 MB wählen."); setReference(null); return;
          }
          currentUrls.current.forEach((url) => URL.revokeObjectURL(url));
          currentUrls.current = [];
          setReference(file); setSelected([]); setResults([]); setError("");
        }} />
      </label>
      <p className="muted">{capability === "image-edit" ? "Referenzbearbeitung" : "Text zu Bild"} · Konfigurierte Provider auswählen:</p>
      {eligible.length === 0 && <p role="status">Für diesen Modus ist derzeit kein Bildprovider konfiguriert.</p>}
      {eligible.map((provider) => <label key={provider.id}>
        <input type="checkbox" checked={selected.includes(provider.id)} disabled={busy} onChange={(event) =>
          setSelected((ids) => event.target.checked ? [...ids, provider.id] : ids.filter((id) => id !== provider.id))} /> {provider.name} · {provider.models.find((model) => model.capabilities.includes(capability))?.name}
      </label>)}
      <p className="muted">Jeder gewählte Provider wird einmal aufgerufen und kann Kosten verursachen. Kein automatischer Fallback im Vergleich.</p>
      <button className="primary" disabled={busy || !prompt.trim() || !chosen.length} onClick={() => void compare()}>
        {busy ? "Vergleich läuft…" : `Vergleich starten (${chosen.length} Aufrufe)`}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
    {results.length > 0 && <section className="providerResults" aria-label="Vergleichsergebnisse">
      <div className="panel">
        <h2>Deine Bewertung</h2>
        <p className="muted">Bewerte die Bildqualität mit 1 bis 5. Die Bewertung bleibt nur während dieser Sitzung erhalten.</p>
        {favorites.length > 0 && <p>Am besten bewertet: {favorites.map((result) => result.name).join(", ")} ({topRating}/5)</p>}
      </div>
      {results.map((result) => <article className="panel" key={result.id}>
        <h2>{result.name}</h2><p className="muted">{result.model} · {result.seconds} s</p>
        {result.imageUrl && <img src={result.imageUrl} alt={`Ergebnis von ${result.name}`} />}
        {result.imageUrl && <label>Bildqualität für {result.name}
          <select value={result.rating || ""} onChange={(event) => setResults((current) => current.map((item) =>
            item.id === result.id ? { ...item, rating: event.target.value ? Number(event.target.value) : undefined } : item))}>
            <option value="">Noch nicht bewertet</option>
            {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} von 5</option>)}
          </select>
        </label>}
        {result.error && <p role="alert">{result.error}</p>}
      </article>)}
    </section>}
  </main>;
}
