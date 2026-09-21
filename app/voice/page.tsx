"use client";

import { useEffect, useState } from "react";

type VoiceProfile = {
  id: string;
  provider_voice_id: string;
  name: string;
  consent_subject: string;
  consent_revoked_at: string | null;
  consent_expires_at: string | null;
};

export default function VoiceStudioPage() {
  const [name, setName] = useState("My Voice Clone");
  const [subject, setSubject] = useState("me");
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [profileId, setProfileId] = useState("");
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [text, setText] = useState("Hallo! Dies ist ein Test meiner geklonten Stimme.");
  const [audioUrl, setAudioUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function loadProfiles() {
    const response = await fetch("/api/voice/profiles", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const next = Array.isArray(data.profiles) ? data.profiles : [];
    setProfiles(next);
    if (!profileId && next[0]) setProfileId(next[0].id);
  }

  useEffect(() => { void loadProfiles(); }, []);

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
      setProfileId(data.profile?.id || "");
      await loadProfiles();
      setStatus(data.requiresVerification
        ? "Voice-Profil erstellt; der Anbieter verlangt noch eine Verifizierung."
        : "Voice-Profil erstellt und sicher deinem Account zugeordnet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Klonen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function synthesize() {
    if (!profileId) return setStatus("Erst ein Voice-Profil auswählen oder erstellen.");
    setBusy(true);
    setStatus("Audio wird erzeugt …");
    try {
      const response = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceProfileId: profileId, text, consentGranted: consent }),
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

  async function revoke() {
    if (!profileId) return;
    setBusy(true);
    try {
      const response = await fetch("/api/voice/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, revoke: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Widerruf fehlgeschlagen.");
      await loadProfiles();
      setStatus("Voice-Consent widerrufen. Das Profil bleibt zur Nachvollziehbarkeit erhalten.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Widerruf fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const selected = profiles.find((profile) => profile.id === profileId);
  const selectedActive = Boolean(selected && !selected.consent_revoked_at &&
    (!selected.consent_expires_at || Date.parse(selected.consent_expires_at) > Date.now()));

  return (
    <main className="pageShell">
      <section className="hero">
        <div>
          <p className="eyebrow">VOICE STUDIO</p>
          <h1>Stimmenkloner</h1>
          <p className="muted">Sprachproben hochladen, ein dauerhaftes Voice-Profil anlegen und Text mit einer eigenen, aktiven Stimme sprechen lassen.</p>
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
      </section>

      <section className="panel stack">
        <h2>2. Voice-Profil</h2>
        {profiles.length ? (
          <>
            <label>Gespeicherte Stimme
              <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}{profile.consent_revoked_at ? " · widerrufen" : ""}
                  </option>
                ))}
              </select>
            </label>
            {selected && <p className="muted">Voice-ID: <code>{selected.provider_voice_id}</code> · Consent: {selected.consent_subject}</p>}
            <button className="secondary" disabled={busy || !selectedActive} onClick={revoke}>Consent widerrufen</button>
          </>
        ) : <p className="muted">Noch kein gespeichertes Voice-Profil.</p>}
      </section>

      <section className="panel stack">
        <h2>3. Stimme verwenden</h2>
        <label>Text<textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={12000} rows={7} /></label>
        <button className="primary" disabled={busy || !selectedActive || !consent} onClick={synthesize}>Audio erzeugen</button>
        {audioUrl && <audio controls src={audioUrl} />}
        {status && <p className="muted">{status}</p>}
      </section>

      <section className="panel">
        <p className="muted">Instant Voice Cloning ist ein Anbieter-Feature. Professional Voice Cloning ist ein separater, verifizierter Prozess. Character Studio speichert standardmäßig keine hochgeladenen Sprachproben; gespeichert wird nur die Provider-Voice-ID plus Consent-Metadaten.</p>
      </section>
    </main>
  );
}
