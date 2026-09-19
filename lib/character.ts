export type Character = {
  name: string;
  age: string;
  appearance: string;
  personality: string;
};

export type ImageProvider = {
  id: string;
  name: string;
  status: "ready" | "planned";
  description: string;
};

export const imageProviders: ImageProvider[] = [
  {
    id: "huggingface",
    name: "Hugging Face · FLUX",
    status: "ready",
    description: "FLUX.1-schnell through Hugging Face Inference Providers.",
  },
  { id: "flux", name: "FLUX direct", status: "planned", description: "Direct FLUX provider adapter." },
  { id: "sdxl", name: "SDXL", status: "planned", description: "Flexible image generation adapter." }
];
