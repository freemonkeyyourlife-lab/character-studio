export type ArtanisChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ArtanisCharacterContext = {
  id?: string;
  name?: string;
  age?: string;
  appearance?: string;
  personality?: string;
  referenceImageUrl?: string;
};

export type ArtanisAssetContext = {
  id?: string;
  type: "image" | "video" | "audio" | "document";
  url?: string;
  label?: string;
  consentGranted?: boolean;
  consentScope?: string[];
};

export type ArtanisContextRequest = {
  instruction?: string;
  messages?: ArtanisChatMessage[];
  character?: ArtanisCharacterContext;
  assets?: ArtanisAssetContext[];
  mode?: "prompt" | "image" | "video";
  imageProvider?: string;
  imageModel?: string;
  videoProvider?: string;
  videoModel?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
};

export type ArtanisPromptResult = {
  prompt: string;
  negativePrompt: string;
  contextSummary: string;
  character?: ArtanisCharacterContext;
  assets: ArtanisAssetContext[];
  mode: "prompt" | "image" | "video";
};

const MAX_MESSAGES = 80;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_ASSETS = 20;
const MAX_ASSET_URL = 2_000;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanMessages(messages: unknown): ArtanisChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-MAX_MESSAGES).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const role = (item as { role?: unknown }).role;
    if (role !== "system" && role !== "user" && role !== "assistant") return [];
    const content = clean((item as { content?: unknown }).content, MAX_MESSAGE_CHARS);
    return content ? [{ role, content }] : [];
  });
}

function cleanAssets(assets: unknown): ArtanisAssetContext[] {
  if (!Array.isArray(assets)) return [];
  return assets.slice(0, MAX_ASSETS).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const type = (item as { type?: unknown }).type;
    if (type !== "image" && type !== "video" && type !== "audio" && type !== "document") return [];
    const consentGranted = (item as { consentGranted?: unknown }).consentGranted === true;
    if (!consentGranted) return [];
    const scopes = Array.isArray((item as { consentScope?: unknown }).consentScope)
      ? ((item as { consentScope?: unknown }).consentScope as unknown[]).filter((scope): scope is string => typeof scope === "string").slice(0, 20)
      : [];
    const url = clean((item as { url?: unknown }).url, MAX_ASSET_URL);
    const label = clean((item as { label?: unknown }).label, 160);
    return [{ id: clean((item as { id?: unknown }).id, 120) || undefined, type, url: url || undefined, label: label || undefined, consentGranted, consentScope: scopes }];
  });
}

export function normalizeArtanisContext(input: ArtanisContextRequest): ArtanisContextRequest {
  const character = input.character && typeof input.character === "object"
    ? {
        id: clean(input.character.id, 120) || undefined,
        name: clean(input.character.name, 120) || undefined,
        age: clean(input.character.age, 40) || undefined,
        appearance: clean(input.character.appearance, 4_000) || undefined,
        personality: clean(input.character.personality, 4_000) || undefined,
        referenceImageUrl: clean(input.character.referenceImageUrl, MAX_ASSET_URL) || undefined,
      }
    : undefined;

  return {
    instruction: clean(input.instruction, 8_000) || undefined,
    messages: cleanMessages(input.messages),
    character,
    assets: cleanAssets(input.assets),
    mode: input.mode === "image" || input.mode === "video" ? input.mode : "prompt",
    imageProvider: clean(input.imageProvider, 120) || undefined,
    imageModel: clean(input.imageModel, 200) || undefined,
    videoProvider: clean(input.videoProvider, 120) || undefined,
    videoModel: clean(input.videoModel, 200) || undefined,
    duration: typeof input.duration === "number" ? input.duration : undefined,
    width: typeof input.width === "number" ? input.width : undefined,
    height: typeof input.height === "number" ? input.height : undefined,
    fps: typeof input.fps === "number" ? input.fps : undefined,
  };
}

export function buildArtanisPrompt(input: ArtanisContextRequest): ArtanisPromptResult {
  const context = normalizeArtanisContext(input);
  const recent = (context.messages || []).slice(-24);
  const conversation = recent.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n");
  const character = context.character;
  const characterBlock = character
    ? [
        character.name ? `Character: ${character.name}` : "",
        character.age ? `Age: ${character.age}` : "",
        character.appearance ? `Appearance: ${character.appearance}` : "",
        character.personality ? `Personality: ${character.personality}` : "",
      ].filter(Boolean).join("\n")
    : "";

  const prompt = [
    context.instruction ? `USER DIRECTIVE:\n${context.instruction}` : "",
    characterBlock ? `CHARACTER CONTEXT:\n${characterBlock}` : "",
    conversation ? `CHAT CONTEXT:\n${conversation}` : "",
    "Translate the supplied context into a coherent visual generation brief. Preserve concrete details from the conversation and character definition. Do not invent private facts that are not present in the supplied context.",
  ].filter(Boolean).join("\n\n");

  const consentedAssets = context.assets || [];
  const assetLines = consentedAssets.map((asset) => [
    asset.type.toUpperCase(),
    asset.label || asset.id || "reference",
    asset.url ? asset.url : "",
    asset.consentScope?.length ? `scope=${asset.consentScope.join(",")}` : "",
  ].filter(Boolean).join(" | "));

  return {
    prompt,
    negativePrompt: "Do not invent identity, personal facts, consent, or source material. Avoid altering the requested character identity unless explicitly instructed.",
    contextSummary: [
      character?.name ? `character=${character.name}` : "",
      `messages=${recent.length}`,
      `consentedAssets=${consentedAssets.length}`,
    ].filter(Boolean).join(" · ") + (assetLines.length ? `\nReferences:\n${assetLines.join("\n")}` : ""),
    character,
    assets: consentedAssets,
    mode: context.mode || "prompt",
  };
}
