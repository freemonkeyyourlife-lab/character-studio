"use client";

import { useState } from "react";

export default function VoiceStudioPage() {
  const [name, setName] = useState("My Voice Clone");
  const [subject, setSubject] = useState("me");
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [voiceId, setVoiceId] = useState("");
  const [text, setText] = useState("Hallo! Dies ist ein Test meiner geklonten Stimme.");
  const [audioUrl, setAudioUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function clone() {
    if (!files?.length) return setStatus("Bitte mindestens eine Sprachprobe auswählen.");
    setBusy(true);
    setStatus("Stimmprobe wird verarbeitet …");
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("consentSubject", subject);
      form.append("consentGranted", String(consent));
      for (const file of Array.from(files)) form.append("files", file);
      const response = await fetch("/api/voice/clone", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Klonen fehlgeschlagen.");
      setVoiceId(data.voiceId);
      setStatus(data.requiresVerification
        ? "Voice-ID erstellt; der Anbieter verlangt noch eine Verifizierung."
        : "Voice-ID erstellt.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Klonen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function synthesize() {
    if (!voiceId) return setStatus("Erst eine Voice-ID erstellen.");
    setBusy(true);
    setStatus("Audio wird erzeugt …");
    try {
      const response = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, text, consentGranted: consent }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Sprachausgabe fehlgeschlagen.");
      }
      const blob = await response.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(blob));
      setStatus("Audio bereit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sprachausgabe fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pageShell">
      <section className="hero">
        <div>
          <p className="eyebrow">VOICE STUDIO</p>
          <h1>Stimmenkloner</h1>
          <p className="muted">
            Sprachproben hochladen, eine Voice-ID erzeugen und anschließend Text mit dieser Stimme sprechen lassen.
          </p>
        </div>
        <a className="secondary smallButton" href="/">Zurück</a>
      </section>

      <section className="panel stack">
        <h2>1. Stimme klonen</h2>
        <label>Bezeichnung<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></label>
        <label>Stimmeninhaber / Consent-Subjekt<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} /></label>
        <label>Sprachproben<input type="file" accept="audio/*" multiple onChange={(e) => setFiles(e.target.files)} /></label>
        <label className="checkRow">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Ich bestätige, dass die Stimme mit ausdrücklicher Erlaubnis des Stimmeninhabers verwendet werden darf.
        </label>
        <button className="primary" disabled={busy || !consent} onClick={clone}>Stimme klonen</button>
        {voiceId && <p className="muted">Voice-ID: <code>{voiceId}</code></p>}
      </section>

      <section className="panel stack">
        <h2>2. Stimme verwenden</h2>
        <label>Text<textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={12000} rows={7} /></label>
        <button className="primary" disabled={busy || !voiceId || !consent} onClick={synthesize}>Audio erzeugen</button>
        {audioUrl && <audio controls src={audioUrl} />}
        {status && <p className="muted">{status}</p>}
      </section>

      <section className="panel">
        <p className="muted">
          Für Instant Voice Cloning empfiehlt ElevenLabs etwa 1–2 Minuten sauberes Audiomaterial. Professional Voice Cloning
          ist ein separater, verifizierter Prozess und kann nicht einfach durch diese UI für fremde Stimmen aktiviert werden.
        </p>
      </section>
    </main>
  );
}
