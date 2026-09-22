export type ConversationMessage = { role: "system" | "user" | "assistant" | "tool"; content: string };

export type ConversationContext = {
  character?: { name?: string; age?: string; appearance?: string; personality?: string };
  topic?: string;
  story?: string;
  scenario?: string;
  sceneState?: string;
  memory?: string[];
  messages: ConversationMessage[];
};

const clean = (value?: string) => value?.trim() || "";

export function buildMultiTurnPrompt(context: ConversationContext) {
  const sections = [
    context.character ? ["CHARACTER", clean(context.character.name), clean(context.character.age) && `Age: ${clean(context.character.age)}`, clean(context.character.appearance) && `Appearance: ${clean(context.character.appearance)}`, clean(context.character.personality) && `Personality: ${clean(context.character.personality)}`].filter(Boolean).join("\n") : "",
    context.topic ? `TOPIC\n${clean(context.topic)}` : "",
    context.story ? `STORY\n${clean(context.story)}` : "",
    context.scenario ? `SCENARIO\n${clean(context.scenario)}` : "",
    context.sceneState ? `CURRENT STATE\n${clean(context.sceneState)}` : "",
    context.memory?.length ? `RELEVANT MEMORY\n${context.memory.slice(-20).map((item) => `- ${item}`).join("\n")}` : "",
    `RECENT CONVERSATION\n${context.messages.slice(-40).map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n")}`,
  ].filter(Boolean);
  return sections.join("\n\n");
}
