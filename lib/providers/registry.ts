export type ProviderCapability =
  | "chat" | "multi-turn" | "structured-output" | "tools"
  | "text-to-image" | "image-edit" | "reference-image" | "character-consistency"
  | "text-to-video" | "image-to-video" | "reference-to-video"
  | "tts" | "voice-cloning" | "embeddings" | "async-jobs";

export type ProviderDefinition = {
  id: string;
  name: string;
  kind: "hosted" | "local";
  status: "connected" | "configurable" | "research";
  capabilities: ProviderCapability[];
  env?: string[];
  notes: string;
};

export const providerRegistry: ProviderDefinition[] = [
  { id: "huggingface", name: "Hugging Face", kind: "hosted", status: "connected", capabilities: ["text-to-image","image-edit","reference-image"], env: ["HF_TOKEN"], notes: "Existing image adapter." },
  { id: "replicate", name: "Replicate", kind: "hosted", status: "connected", capabilities: ["text-to-image","image-edit","reference-image","text-to-video","image-to-video","async-jobs"], env: ["REPLICATE_API_TOKEN"], notes: "Existing image/video adapter." },
  { id: "fal", name: "fal", kind: "hosted", status: "connected", capabilities: ["text-to-image","image-edit","reference-image","text-to-video","image-to-video","async-jobs"], env: ["FAL_KEY"], notes: "Existing media adapter." },
  { id: "comfyui", name: "ComfyUI", kind: "local", status: "connected", capabilities: ["text-to-image","text-to-video","image-to-video","async-jobs"], env: ["COMFYUI_URL","COMFYUI_CHECKPOINT"], notes: "Image generation needs a configured checkpoint; reference editing needs a separate workflow." },
  { id: "elevenlabs", name: "ElevenLabs", kind: "hosted", status: "connected", capabilities: ["tts","voice-cloning"], env: ["ELEVENLABS_API_KEY"], notes: "Existing consent-aware voice adapter." },
  { id: "venice", name: "Venice", kind: "hosted", status: "connected", capabilities: ["chat","multi-turn"], env: ["VENICE_API_KEY","VENICE_CHAT_MODEL"], notes: "Chat adapter; other capabilities require separate adapters and verification." },
  { id: "seaart", name: "SeaArt", kind: "hosted", status: "research", capabilities: ["text-to-image","image-edit","reference-image","text-to-video","image-to-video","reference-to-video","character-consistency","async-jobs"], notes: "MCP/CLI and media workflow integration candidate." },
  { id: "secret-desires", name: "Secret Desires", kind: "hosted", status: "research", capabilities: ["chat","multi-turn","text-to-image","text-to-video","tts"], notes: "Developer access requires approval/credentials." },
];

export function providersFor(capabilities: ProviderCapability[]) {
  return providerRegistry.filter((provider) => capabilities.every((capability) => provider.capabilities.includes(capability)));
}

// `connected` means an adapter exists, not that this deployment has credentials.
export function providerAvailability(environment: Record<string, string | undefined>) {
  return providerRegistry.map(({ env = [], ...provider }) => ({
    ...provider,
    configured: provider.status === "connected" && env.every((key) => Boolean(environment[key]?.trim())),
    missingConfiguration: provider.status === "research" ? [] : env.filter((key) => !environment[key]?.trim()),
  }));
}
