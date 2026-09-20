import { InferenceClient } from "@huggingface/inference";
import { fetchImageBlob } from "./http";

const DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell";
const EDIT_MODEL = "black-forest-labs/FLUX.1-Kontext-dev";

function client() {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN is not configured.");
  return new InferenceClient(token);
}

async function toBlob(value: Blob | string): Promise<Blob> {
  if (value instanceof Blob) return value;
  return fetchImageBlob(value, "Hugging Face");
}

export async function generateWithHuggingFace(prompt: string, model?: string): Promise<Blob> {
  return toBlob(await client().textToImage({
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
