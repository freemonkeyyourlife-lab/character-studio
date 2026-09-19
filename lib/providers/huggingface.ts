import { InferenceClient } from "@huggingface/inference";

const DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell";

export async function generateWithHuggingFace(prompt: string) {
  const token = process.env.HF_TOKEN;

  if (!token) {
    throw new Error("HF_TOKEN is not configured.");
  }

  const client = new InferenceClient(token);
  const image = await client.textToImage({
    model: process.env.HF_IMAGE_MODEL || DEFAULT_MODEL,
    provider: "auto",
    inputs: prompt,
  });

  return image;
}
