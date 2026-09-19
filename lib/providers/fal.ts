import { fal } from "@fal-ai/client";
import type { ImageEditInput, ImageGenerationInput, ImageProviderAdapter } from "./types";

function configure() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not configured.");
  fal.config({ credentials: key });
}

async function imageUrlToBlob(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("fal returned an unreadable image.");
  return response.blob();
}

export const falProvider: ImageProviderAdapter = {
  async generate({ prompt, model }) {
    configure();
    const endpoint = model || process.env.FAL_IMAGE_MODEL || "fal-ai/flux/schnell";
    const result = await fal.subscribe(endpoint, { input: { prompt } });
    const image = result.data?.images?.[0];
    if (!image?.url) throw new Error("fal did not return an image.");
    return imageUrlToBlob(image.url);
  },
  async edit({ prompt, model, image }) {
    configure();
    const endpoint = model || process.env.FAL_EDIT_MODEL || "fal-ai/flux/dev/image-to-image";
    const imageUrl = await fal.storage.upload(image);
    const result = await fal.subscribe(endpoint, { input: { prompt, image_url: imageUrl } });
    const output = result.data?.images?.[0];
    if (!output?.url) throw new Error("fal did not return an edited image.");
    return imageUrlToBlob(output.url);
  },
};
