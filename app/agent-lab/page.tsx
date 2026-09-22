"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function AgentLab() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    const value = input.trim();
    if (!value || busy) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "chat", context: { messages: next, memory: [] } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Planning failed.");
      setPlan(JSON.stringify(data.plan, null, 2));
      setMessages((current) => [...current, { role: "assistant", content: "Workflow planned. Execution providers are shown below." }]);
    } catch (error) {
      setPlan(error instanceof Error ? error.message : "Planning failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="pageShell">
    <section className="hero"><div><p className="eyebrow">AGENT LAB</p><h1>Multi-Turn Workflow Lab</h1><p className="muted">Conversation context, provider routing and agent steps in one test surface.</p></div><a className="secondary smallButton" href="/">Zurück</a></section>
    <section className="panel stack">
      <h2>Conversation</h2>
      {messages.length === 0 && <p className="muted">Start a multi-message conversation. Each turn is carried into the next workflow plan.</p>}
      {messages.map((message, index) => <div key={index}><strong>{message.role === "user" ? "You" : "Agent"}:</strong> {message.content}</div>)}
      <textarea rows={5} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Describe the next task or continue the conversation..." />
      <button className="primary" disabled={busy || !input.trim()} onClick={() => void run()}>{busy ? "Planning…" : "Plan next turn"}</button>
    </section>
    {plan && <section className="panel stack"><h2>Agent workflow</h2><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{plan}</pre></section>}
  </main>;
}
