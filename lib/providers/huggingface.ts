import { InferenceClient } from "@huggingface/inference";

const DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell";
const EDIT_MODEL = "black-forest-labs/FLUX.1-Kontext-dev";

function client() {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN is not configured.");
  return new InferenceClient(token);
}

export async function generateWithHuggingFace(prompt: string, model?: string) {
  return client().textToImage({
    model: model || process.env.HF_IMAGE_MODEL || DEFAULT_MODEL,
    provider: "auto",
    inputs: prompt,
  });
}

export async function editWithHuggingFace(image: Blob, prompt: string, model?: string) {
  return client().imageTextToImage({
    model: model || process.env.HF_EDIT_MODEL || EDIT_MODEL,
    provider: "auto",
    inputs: { image, prompt },
  });
}
