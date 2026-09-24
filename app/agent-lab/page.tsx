"use client";

import { useEffect, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Session = { id: string; title: string };
type Character = { id: string; name: string };
type Memory = { id: string; content: string };

export default function AgentLab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterId, setCharacterId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryInput, setMemoryInput] = useState("");
  const [memoryBusy, setMemoryBusy] = useState(false);

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

  useEffect(() => {
    setMemories([]);
    if (!characterId) return;
    let active = true;
    void fetch(`/api/agent/memories?characterId=${encodeURIComponent(characterId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Memories could not be loaded.");
        if (active) setMemories(data.memories || []);
      }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [characterId]);

  async function saveMemory() {
    if (!characterId || !memoryInput.trim() || memoryBusy) return;
    setMemoryBusy(true); setError("");
    try {
      const response = await fetch("/api/agent/memories", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, content: memoryInput.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Memory could not be saved.");
      setMemories((current) => [data.memory, ...current]); setMemoryInput("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Saving failed."); }
    finally { setMemoryBusy(false); }
  }

  async function deleteMemory(id: string) {
    if (memoryBusy) return;
    setMemoryBusy(true); setError("");
    try {
      const response = await fetch(`/api/agent/memories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Memory could not be deleted.");
      setMemories((current) => current.filter((item) => item.id !== id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Deleting failed."); }
    finally { setMemoryBusy(false); }
  }

  async function openSession(id: string) {
    if (busy || memoryBusy) return;
    setError("");
    if (!id) { setSessionId(""); setMessages([]); setCharacterId(""); setMemories([]); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/agent/conversations?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Conversation could not be loaded.");
      setMessages(data.messages || []);
      setSessionId(id);
      setMemories([]);
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
        <select value={sessionId} disabled={busy || memoryBusy} onChange={(event) => void openSession(event.target.value)}>
          <option value="">Neues Gespräch</option>
          {sessions.map((session) => <option key={session.id} value={session.id}>{session.title || "Unbenannt"}</option>)}
        </select>
      </label>
      {!sessionId && <label>Charakter (optional)
        <select value={characterId} disabled={busy || memoryBusy} onChange={(event) => { setCharacterId(event.target.value); setMemories([]); }}>
          <option value="">Ohne Charakter</option>
          {characters.map((character) => <option key={character.id} value={character.id}>{character.name || "Unbenannt"}</option>)}
        </select>
      </label>}
      {characterId && <div className="stack">
        <h2>Charakter-Erinnerungen</h2>
        <p className="muted">Manuell gespeicherte Fakten. Die letzten zwölf werden beim nächsten Chat als Kontext geladen.</p>
        {memories.map((memory) => <div key={memory.id}><span>{memory.content}</span>{" "}<button className="secondary smallButton" disabled={memoryBusy} onClick={() => void deleteMemory(memory.id)} aria-label="Erinnerung löschen">Löschen</button></div>)}
        <label>Neue Erinnerung<textarea rows={2} maxLength={1000} value={memoryInput} onChange={(event) => setMemoryInput(event.target.value)} placeholder="Was soll sich dieser Charakter merken?" /></label>
        <button className="secondary smallButton" disabled={memoryBusy || !memoryInput.trim()} onClick={() => void saveMemory()}>Erinnerung speichern</button>
      </div>}
      {messages.length === 0 && <p className="muted">Schreibe die erste Nachricht. Frühere Gespräche kannst du oben wieder öffnen.</p>}
      {messages.map((message, index) => <div key={index}><strong>{message.role === "user" ? "Du" : "Agent"}:</strong> {message.content}</div>)}
      <textarea rows={5} maxLength={4000} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Schreibe deine nächste Nachricht…" />
      <button className="primary" disabled={busy || !input.trim()} onClick={() => void send()}>{busy ? "Bitte warten…" : "Senden"}</button>
      {error && <p role="alert">{error}</p>}
    </section>
  </main>;
}
