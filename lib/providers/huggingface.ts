import { InferenceClient } from "@huggingface/inference";

const DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell";
const EDIT_MODEL = "black-forest-labs/FLUX.1-Kontext-dev";

function client() {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN is not configured.");
  return new InferenceClient(token);
}

async function toBlob(value: Blob | string): Promise<Blob> {
  if (value instanceof Blob) return value;
  const response = await fetch(value);
  if (!response.ok) throw new Error("Hugging Face returned an unreadable image.");
  return response.blob();
}

export async function generateWithHuggingFace(prompt: string, model?: string): Promise<Blob> {
  return toBlob(client().textToImage({
    model: model || process.env.HF_IMAGE_MODEL || DEFAULT_MODEL,
    provider: "auto",
    inputs: prompt,
  }));
}

export async function editWithHuggingFace(image: Blob, prompt: string, model?: string): Promise<Blob> {
  return client().imageTextToImage({
    model: model || process.env.HF_EDIT_MODEL || EDIT_MODEL,
    provider: "auto",
    inputs: image,
    parameters: { prompt },
  });
}
