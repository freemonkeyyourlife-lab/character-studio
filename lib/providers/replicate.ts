import Replicate from "replicate";
import type { ImageEditInput, ImageGenerationInput, ImageProviderAdapter } from "./types";

function client() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured.");
  return new Replicate({ auth: token });
}

async function outputToBlob(output: unknown): Promise<Blob> {
  const value = Array.isArray(output) ? output[0] : output;
  if (typeof value === "string") {
    const response = await fetch(value);
    if (!response.ok) throw new Error("Replicate returned an unreadable image.");
    return response.blob();
  }
  if (value && typeof value === "object" && "url" in value && typeof (value as { url?: unknown }).url === "string") {
    const response = await fetch((value as { url: string }).url);
    if (!response.ok) throw new Error("Replicate returned an unreadable image.");
    return response.blob();
  }
  if (value instanceof Blob) return value;
  throw new Error("Replicate returned an unsupported image format.");
}

export const replicateProvider: ImageProviderAdapter = {
  async generate({ prompt, model }) {
    const selected = model || process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell";
    const output = await client().run(selected, { input: { prompt } });
    return outputToBlob(output);
  },
  async edit({ prompt, model, image }) {
    const selected = model || process.env.REPLICATE_EDIT_MODEL;
    if (!selected) throw new Error("REPLICATE_EDIT_MODEL is not configured.");
    const output = await client().run(selected, { input: { prompt, image } });
    return outputToBlob(output);
  },
};
