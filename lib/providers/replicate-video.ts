import Replicate from "replicate";
import { fetchMediaBlob } from "./http";
import type { VideoGenerationInput, VideoProviderAdapter } from "./video";

function client() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured.");
  return new Replicate({ auth: token });
}

async function outputToBlob(output: unknown): Promise<Blob> {
  const value = Array.isArray(output) ? output[0] : output;
  if (typeof value === "string") return fetchMediaBlob(value, "Replicate");
  if (value && typeof value === "object" && "url" in value && typeof (value as { url?: unknown }).url === "string") {
    return fetchMediaBlob((value as { url: string }).url, "Replicate");
  }
  throw new Error("Replicate returned an unsupported video format.");
}

export const replicateVideoProvider: VideoProviderAdapter = {
  async generate({ prompt, model, duration, width, height, fps }: VideoGenerationInput) {
    const selected = model && model !== "configured"
      ? model
      : process.env.REPLICATE_VIDEO_MODEL;
    if (!selected) throw new Error("REPLICATE_VIDEO_MODEL is not configured.");

    const input: Record<string, unknown> = { prompt };
    if (duration) input.duration = duration;
    if (width) input.width = width;
    if (height) input.height = height;
    if (fps) input.fps = fps;

    return outputToBlob(await client().run(selected as `${string}/${string}:${string}`, { input }));
  },
};
