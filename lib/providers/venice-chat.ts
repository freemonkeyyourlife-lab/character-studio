export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function completeVeniceChat(messages: ChatMessage[]) {
  const key = process.env.VENICE_API_KEY;
  const model = process.env.VENICE_CHAT_MODEL;
  if (!key || !model) throw new Error("Venice chat is not configured.");

  const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, max_completion_tokens: 1200 }),
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Chat provider failed (${response.status}).`);
  const data = await response.json() as { choices?: { message?: { content?: unknown } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Chat provider returned no text.");
  return content.trim().slice(0, 12000);
}
