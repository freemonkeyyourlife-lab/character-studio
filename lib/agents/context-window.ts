import type { ChatMessage } from "@/lib/providers/venice-chat";

// Preserve the latest complete turns while bounding payload size for chat models.
export function selectRecentHistory(
  messages: ChatMessage[],
  maxMessages = 40,
  maxCharacters = 16_000,
): ChatMessage[] {
  const selected: ChatMessage[] = [];
  let used = 0;
  for (let index = messages.length - 1; index >= 0 && selected.length < maxMessages; index--) {
    const message = messages[index];
    if (message.role !== "user" && message.role !== "assistant") continue;
    const length = message.content.length;
    if (used + length > maxCharacters) break;
    selected.push(message);
    used += length;
  }
  return selected.reverse();
}
