"use client";

import { useEffect, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Session = { id: string; title: string };
type Character = { id: string; name: string };

export default function AgentLab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterId, setCharacterId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSessions() {
    const response = await fetch("/api/agent/conversations", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Conversations could not be loaded.");
    setSessions(data.conversations || []);
  }

  useEffect(() => {
    void loadSessions().catch((cause) => setError(cause.message));
    void fetch("/api/characters", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setCharacters((await response.json()).characters || []);
    }).catch(() => {});
  }, []);

  async function openSession(id: string) {
    if (busy) return;
    setError("");
    if (!id) { setSessionId(""); setMessages([]); setCharacterId(""); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/agent/conversations?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Conversation could not be loaded.");
      setMessages(data.messages || []);
      setSessionId(id);
      setCharacterId(data.conversation.character_id || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Loading failed."); }
    finally { setBusy(false); }
  }

  async function send() {
    const value = input.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/agent/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: sessionId || undefined, characterId: sessionId ? undefined : characterId || undefined, message: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat failed.");
      setMessages((current) => [...current, { role: "user", content: value }, { role: "assistant", content: data.answer }]);
      setSessionId(data.conversationId);
      setInput("");
      await loadSessions();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chat failed."); }
    finally { setBusy(false); }
  }

  return <main className="pageShell">
    <section className="hero"><div><p className="eyebrow">AGENT LAB</p><h1>Multi-Message Chat</h1><p className="muted">Gespräche werden gespeichert. Der Server lädt die letzten Nachrichten für jede neue Antwort.</p></div><a className="secondary smallButton" href="/">Zurück</a></section>
    <section className="panel stack">
      <label>Gespräch
        <select value={sessionId} disabled={busy} onChange={(event) => void openSession(event.target.value)}>
          <option value="">Neues Gespräch</option>
          {sessions.map((session) => <option key={session.id} value={session.id}>{session.title || "Unbenannt"}</option>)}
        </select>
      </label>
      {!sessionId && <label>Charakter (optional)
        <select value={characterId} disabled={busy} onChange={(event) => setCharacterId(event.target.value)}>
          <option value="">Ohne Charakter</option>
          {characters.map((character) => <option key={character.id} value={character.id}>{character.name || "Unbenannt"}</option>)}
        </select>
      </label>}
      {messages.length === 0 && <p className="muted">Schreibe die erste Nachricht. Frühere Gespräche kannst du oben wieder öffnen.</p>}
      {messages.map((message, index) => <div key={index}><strong>{message.role === "user" ? "Du" : "Agent"}:</strong> {message.content}</div>)}
      <textarea rows={5} maxLength={4000} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Schreibe deine nächste Nachricht…" />
      <button className="primary" disabled={busy || !input.trim()} onClick={() => void send()}>{busy ? "Bitte warten…" : "Senden"}</button>
      {error && <p role="alert">{error}</p>}
    </section>
  </main>;
}
