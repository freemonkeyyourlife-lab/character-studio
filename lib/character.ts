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
  { id: "flux", name: "FLUX", status: "planned", description: "Photorealistic image generation adapter." },
  { id: "sdxl", name: "SDXL", status: "planned", description: "Flexible image generation adapter." }
];
