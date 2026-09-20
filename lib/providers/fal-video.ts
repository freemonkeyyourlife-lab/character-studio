import { fal } from "@fal-ai/client";
import { fetchMediaBlob } from "./http";
import type { VideoGenerationInput, VideoProviderAdapter } from "./video";

function configure() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not configured.");
  fal.config({ credentials: key });
}

function findVideoUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if ("url" in value && typeof (value as { url?: unknown }).url === "string") return (value as { url: string }).url;
  if ("video" in value) {
    const nested = findVideoUrl((value as { video?: unknown }).video);
    if (nested) return nested;
  }
  if ("videos" in value && Array.isArray((value as { videos?: unknown }).videos)) {
    for (const item of (value as { videos: unknown[] }).videos) {
      const nested = findVideoUrl(item);
      if (nested) return nested;
    }
  }
  return null;
}

export const falVideoProvider: VideoProviderAdapter = {
  async generate({ prompt, model, duration, width, height, fps }: VideoGenerationInput) {
    configure();
    const endpoint = model && model !== "configured" ? model : process.env.FAL_VIDEO_MODEL;
    if (!endpoint) throw new Error("FAL_VIDEO_MODEL is not configured.");

    const input: Record<string, unknown> = { prompt };
    if (duration) input.duration = duration;
    if (width) input.width = width;
    if (height) input.height = height;
    if (fps) input.fps = fps;

    const result = await fal.subscribe(endpoint, { input });
    const url = findVideoUrl(result.data);
    if (!url) throw new Error("fal did not return a video.");
    return fetchMediaBlob(url, "fal");
  },
};
