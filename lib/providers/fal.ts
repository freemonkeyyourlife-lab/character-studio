import { fal } from "@fal-ai/client";
import type { ImageEditInput, ImageGenerationInput, ImageProviderAdapter } from "./types";
import { fetchImageBlob } from "./http";

function configure() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not configured.");
  fal.config({ credentials: key });
}

export const falProvider: ImageProviderAdapter = {
  async generate({ prompt, model }) {
    configure();
    const endpoint = model || process.env.FAL_IMAGE_MODEL || "fal-ai/flux/schnell";
    const input = endpoint === "fal-ai/flux/schnell"
      ? { prompt, image_size: "portrait_16_9" }
      : { prompt };
    const result = await fal.subscribe(endpoint, { input });
    const image = result.data?.images?.[0];
    if (!image?.url) throw new Error("fal did not return an image.");
    return fetchImageBlob(image.url, "fal");
  },
  async edit({ prompt, model, image }) {
    configure();
    const endpoint = model || process.env.FAL_EDIT_MODEL || "fal-ai/flux/dev/image-to-image";
    const imageUrl = await fal.storage.upload(image);
    const result = await fal.subscribe(endpoint, { input: { prompt, image_url: imageUrl } });
    const output = result.data?.images?.[0];
    if (!output?.url) throw new Error("fal did not return an edited image.");
    return fetchImageBlob(output.url, "fal");
  },
};
