import type { ImageEditInput, ImageGenerationInput, ImageProviderAdapter } from "./types";

const baseUrl = () => (process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(/\/$/, "");

async function prompt(workflow: unknown) {
  const response = await fetch(baseUrl() + "/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: "character-studio" }),
  });
  if (!response.ok) throw new Error("ComfyUI rejected the workflow.");
  return response.json() as Promise<{ prompt_id: string }>;
}

async function waitForImage(promptId: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await fetch(baseUrl() + "/history/" + encodeURIComponent(promptId), { cache: "no-store" });
    if (response.ok) {
      const history = await response.json() as Record<string, { outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }> }>;
      const entry = history[promptId];
      const images = entry?.outputs ? Object.values(entry.outputs).flatMap((node) => node.images || []) : [];
      const image = images[0];
      if (image) {
        const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder, type: image.type });
        const result = await fetch(baseUrl() + "/view?" + query.toString());
        if (!result.ok) throw new Error("ComfyUI generated an unreadable image.");
        return result.blob();
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("ComfyUI generation timed out.");
}

function workflow(promptText: string, checkpoint: string) {
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: promptText, clip: ["1", 1] } },
    "3": { class_type: "EmptyLatentImage", inputs: { width: 768, height: 1024, batch_size: 1 } },
    "4": { class_type: "KSampler", inputs: { seed: Math.floor(Math.random() * 2147483647), steps: 20, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 1, model: ["1", 0], positive: ["2", 0], negative: ["5", 0], latent_image: ["3", 0] } },
    "5": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["1", 1] } },
    "6": { class_type: "VAEDecode", inputs: { samples: ["4", 0], vae: ["1", 2] } },
    "7": { class_type: "SaveImage", inputs: { filename_prefix: "character-studio", images: ["6", 0] } }
  };
}

export const comfyuiProvider: ImageProviderAdapter = {
  async generate({ prompt: promptText }: ImageGenerationInput) {
    const checkpoint = process.env.COMFYUI_CHECKPOINT;
    if (!checkpoint) throw new Error("COMFYUI_CHECKPOINT is not configured.");
    const queued = await prompt(workflow(promptText, checkpoint));
    return waitForImage(queued.prompt_id);
  },
  async edit(_input: ImageEditInput) {
    throw new Error("ComfyUI reference editing requires a dedicated workflow and is not enabled yet.");
  },
};
