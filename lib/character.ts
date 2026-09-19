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

export type ImageProvider = {
  id: string;
  name: string;
  status: "ready" | "planned";
  description: string;
  models: { id: string; name: string; kind: "text-to-image" | "image-edit" }[];
};

export const imageProviders: ImageProvider[] = [
  {
    id: "huggingface",
    name: "Hugging Face",
    status: "ready",
    description: "Inference Providers with FLUX models.",
    models: [
      { id: "black-forest-labs/FLUX.1-schnell", name: "FLUX.1 schnell", kind: "text-to-image" },
      { id: "black-forest-labs/FLUX.1-Kontext-dev", name: "FLUX.1 Kontext dev", kind: "image-edit" },
    ],
  },
  {
    id: "replicate",
    name: "Replicate",
    status: "ready",
    description: "Hosted model API adapter. Requires REPLICATE_API_TOKEN.",
    models: [
      { id: "black-forest-labs/flux-schnell", name: "FLUX schnell", kind: "text-to-image" },
    ],
  },
  {
    id: "fal",
    name: "fal",
    status: "ready",
    description: "Hosted generative media adapter. Requires FAL_KEY.",
    models: [
      { id: "fal-ai/flux/schnell", name: "FLUX schnell", kind: "text-to-image" },
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
