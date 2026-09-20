import Replicate from "replicate";
import type { ImageEditInput, ImageGenerationInput, ImageProviderAdapter } from "./types";
import { fetchImageBlob } from "./http";

type ReplicateModel = `${string}/${string}` | `${string}/${string}:${string}`;

function client() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured.");
  return new Replicate({ auth: token });
}

async function outputToBlob(output: unknown): Promise<Blob> {
  const value = Array.isArray(output) ? output[0] : output;
  if (typeof value === "string") return fetchImageBlob(value, "Replicate");
  if (value && typeof value === "object" && "url" in value && typeof (value as { url?: unknown }).url === "string") {
    return fetchImageBlob((value as { url: string }).url, "Replicate");
  }
  if (value instanceof Blob) return value;
  throw new Error("Replicate returned an unsupported image format.");
}

export const replicateProvider: ImageProviderAdapter = {
  async generate({ prompt, model }: ImageGenerationInput) {
    const selected = (model || process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell") as ReplicateModel;
    const output = await client().run(selected, { input: { prompt } });
    return outputToBlob(output);
  },
  async edit({ prompt, model, image }: ImageEditInput) {
    const selected = (model || process.env.REPLICATE_EDIT_MODEL || "black-forest-labs/flux-redux-schnell") as ReplicateModel;
    const input = selected === "black-forest-labs/flux-redux-schnell"
      ? { redux_image: image, aspect_ratio: "1:1", num_outputs: 1, output_format: "webp", output_quality: 80, num_inference_steps: 4 }
      : { prompt, image };
    const output = await client().run(selected, { input });
    return outputToBlob(output);
  },
};
