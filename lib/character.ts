export type Character = {
  id: string;
  name: string;
  age: string;
  appearance: string;
  personality: string;
  referenceImage?: string;
  referenceImagePath?: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelCapability = "text-to-image" | "image-edit";

export type ModelDefinition = {
  id: string;
  name: string;
  capabilities: ModelCapability[];
};

export type ImageProvider = {
  id: string;
  name: string;
  status: "ready" | "planned";
  description: string;
  models: ModelDefinition[];
};

export const imageProviders: ImageProvider[] = [
  {
    id: "huggingface",
    name: "Hugging Face",
    status: "ready",
    description: "Inference Providers with FLUX models.",
    models: [
      { id: "black-forest-labs/FLUX.1-schnell", name: "FLUX.1 schnell", capabilities: ["text-to-image"] },
      { id: "black-forest-labs/FLUX.1-Kontext-dev", name: "FLUX.1 Kontext dev", capabilities: ["image-edit"] },
    ],
  },
  {
    id: "replicate",
    name: "Replicate",
    status: "ready",
    description: "Hosted model API adapter. Requires REPLICATE_API_TOKEN.",
    models: [
      { id: "black-forest-labs/flux-schnell", name: "FLUX schnell", capabilities: ["text-to-image"] },
    ],
  },
  {
    id: "fal",
    name: "fal",
    status: "ready",
    description: "Hosted generative media adapter. Requires FAL_KEY.",
    models: [
      { id: "fal-ai/flux/schnell", name: "FLUX schnell", capabilities: ["text-to-image"] },
    ],
  },
  {
    id: "comfyui",
    name: "ComfyUI",
    status: "planned",
    description: "Local or self-hosted workflow backend.",
    models: [],
  },
];

export function getProvider(providerId: string) {
  return imageProviders.find((provider) => provider.id === providerId);
}

export function getModel(providerId: string, modelId?: string) {
  const provider = getProvider(providerId);
  return provider?.models.find((model) => model.id === modelId);
}

export function canUseModel(providerId: string, modelId: string, capability: ModelCapability) {
  return Boolean(getModel(providerId, modelId)?.capabilities.includes(capability));
}
