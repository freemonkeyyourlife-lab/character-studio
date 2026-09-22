import { buildMultiTurnPrompt, type ConversationContext } from "@/lib/agents/context";
import { providersFor, type ProviderCapability } from "@/lib/providers/registry";

export type AgentTask = "chat" | "image" | "video" | "voice";

const needs: Record<AgentTask, ProviderCapability[]> = {
  chat: ["chat", "multi-turn"],
  image: ["text-to-image"],
  video: ["text-to-video"],
  voice: ["tts"],
};

export function planAgentTask(task: AgentTask, context: ConversationContext) {
  const candidates = providersFor(needs[task]);
  return {
    task,
    prompt: buildMultiTurnPrompt(context),
    requiredCapabilities: needs[task],
    providers: candidates.map(({ id, name, status }) => ({ id, name, status })),
    steps: [
      "assemble-context",
      "select-provider",
      `execute-${task}`,
      "validate-result",
      "persist-state",
    ],
  };
}
