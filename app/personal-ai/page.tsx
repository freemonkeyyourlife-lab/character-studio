"use client";

import { useEffect, useMemo, useState } from "react";

type Example = { id: string; incoming: string; answer: string; createdAt: string };
type Profile = { name: string; tone: string; rules: string; examples: Example[]; updatedAt: string };

const KEY = "character-studio-personal-ai-v1";
const empty = (): Profile => ({ name: "Meine Personal AI", tone: "", rules: "", examples: [], updatedAt: new Date().toISOString() });

export default function PersonalAIPage() {
  const [profile, setProfile] = useState<Profile>(empty);
  const [incoming, setIncoming] = useState("");
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: Profile) => {
    const value = { ...next, updatedAt: new Date().toISOString() };
    setProfile(value);
    localStorage.setItem(KEY, JSON.stringify(value));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const addExample = () => {
    if (!incoming.trim() || !answer.trim()) return;
    persist({ ...profile, examples: [{ id: crypto.randomUUID(), incoming: incoming.trim(), answer: answer.trim(), createdAt: new Date().toISOString() }, ...profile.examples].slice(0, 500) });
    setIncoming(""); setAnswer("");
  };

  const remove = (id: string) => persist({ ...profile, examples: profile.examples.filter((item) => item.id !== id) });

  const exportProfile = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "personal-ai-profile.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const count = useMemo(() => profile.examples.length, [profile.examples]);

  return <main className="shell">
    <header className="header"><div><div className="eyebrow">CHARACTER STUDIO · PERSONAL AI</div><h1>Trainiere deinen Antwortstil</h1><p>Gib echte Beispiele ein: Was wurde dir geschrieben – und wie würdest du antworten? Das Profil bleibt vorerst lokal in diesem Browser.</p></div><div className="headerActions"><a className="secondary smallButton" href="/">Characters</a><span className="status">{count} Beispiele</span></div></header>

    <section className="grid">
      <div className="card">
        <h2>Dein Stilprofil</h2>
        <label>Name<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} onBlur={() => persist(profile)} maxLength={120} /></label>
        <label>Ton & Stil<textarea value={profile.tone} onChange={(e) => setProfile({ ...profile, tone: e.target.value })} onBlur={() => persist(profile)} placeholder="z. B. direkt, herzlich, kurze Sätze, trockener Humor …" maxLength={4000} /></label>
        <label>Feste Regeln<textarea value={profile.rules} onChange={(e) => setProfile({ ...profile, rules: e.target.value })} onBlur={() => persist(profile)} placeholder="z. B. keine Floskeln; bei Unsicherheit nachfragen …" maxLength={6000} /></label>
        <button className="secondary" onClick={exportProfile}>Profil als JSON sichern</button>
        {saved && <div className="saved">Gespeichert.</div>}
      </div>

      <div className="card">
        <h2>Neues Trainingsbeispiel</h2>
        <label>Nachricht an dich<textarea value={incoming} onChange={(e) => setIncoming(e.target.value)} placeholder="Was schreibt die andere Person?" maxLength={8000} /></label>
        <label>So würdest du antworten<textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Schreibe deine echte Antwort in deinem Stil." maxLength={8000} /></label>
        <button className="primary" onClick={addExample} disabled={!incoming.trim() || !answer.trim()}>Beispiel lernen</button>
        <p className="vaultHint">Tipp: echte, unterschiedliche Situationen sind hilfreicher als viele fast identische Beispiele.</p>
      </div>
    </section>

    <section className="vault card">
      <div className="previewTop"><div><h2>Trainingssammlung</h2><p className="vaultHint">Diese Beispiele werden später als Stilgedächtnis für den Chatbot verwendet.</p></div><span>{count}</span></div>
      {count === 0 ? <div className="emptyVault">Noch keine Beispiele. Du kannst sofort oben anfangen.</div> :
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>{profile.examples.map((item) => <div className="providerBox" key={item.id}><div style={{display:"block"}}><strong>Nachricht</strong><p>{item.incoming}</p><strong>Deine Antwort</strong><p>{item.answer}</p></div><button className="secondary smallButton" onClick={() => remove(item.id)}>Löschen</button></div>)}</div>}
    </section>
  </main>;
}
