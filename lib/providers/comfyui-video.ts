import type { VideoGenerationInput, VideoProviderAdapter } from "./video";

const REQUEST_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_MS = 300_000;

function baseUrl() {
  const value = process.env.COMFYUI_URL?.trim();
  if (!value) throw new Error("COMFYUI_URL is not configured.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("COMFYUI_URL must use HTTP or HTTPS.");
  return url.toString().replace(/\/$/, "");
}

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function replacePlaceholders(value: unknown, input: VideoGenerationInput): unknown {
  if (typeof value === "string") {
    return value
      .replaceAll("{{PROMPT}}", input.prompt)
      .replaceAll("{{DURATION}}", String(input.duration ?? ""))
      .replaceAll("{{WIDTH}}", String(input.width ?? ""))
      .replaceAll("{{HEIGHT}}", String(input.height ?? ""))
      .replaceAll("{{FPS}}", String(input.fps ?? ""));
  }
  if (Array.isArray(value)) return value.map((item) => replacePlaceholders(item, input));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replacePlaceholders(item, input)]));
  }
  return value;
}

function mediaReference(value: unknown): { filename: string; subfolder: string; type: string } | null {
  const videoExtensions = /\.(mp4|webm|mov|mkv|avi|gif|webp)$/i;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.filename === "string" && videoExtensions.test(record.filename)) {
      return {
        filename: record.filename,
        subfolder: typeof record.subfolder === "string" ? record.subfolder : "",
        type: typeof record.type === "string" ? record.type : "output",
      };
    }
    for (const nested of Object.values(record)) {
      const found = mediaReference(nested);
      if (found) return found;
    }
  } else if (Array.isArray(value)) {
    for (const nested of value) {
      const found = mediaReference(nested);
      if (found) return found;
    }
  }
  return null;
}

async function waitForVideo(promptId: string): Promise<{ filename: string; subfolder: string; type: string }> {
  const start = Date.now();
  const url = baseUrl();
  while (Date.now() - start < MAX_POLL_MS) {
    const response = await fetchWithTimeout(`${url}/history/${encodeURIComponent(promptId)}`);
    if (response.ok) {
      const history = await response.json();
      const found = mediaReference(history);
      if (found) return found;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("ComfyUI video generation timed out.");
}

export const comfyuiVideoProvider: VideoProviderAdapter = {
  async generate(input) {
    const workflowText = process.env.COMFYUI_VIDEO_WORKFLOW;
    if (!workflowText) throw new Error("COMFYUI_VIDEO_WORKFLOW is not configured.");

    let workflow: unknown;
    try {
      workflow = JSON.parse(workflowText);
    } catch {
      throw new Error("COMFYUI_VIDEO_WORKFLOW must be valid JSON.");
    }

    const promptPayload = replacePlaceholders(workflow, input);
    const response = await fetchWithTimeout(`${baseUrl()}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptPayload }),
    });
    if (!response.ok) throw new Error(`ComfyUI rejected the video workflow (${response.status}).`);

    const data = await response.json();
    const promptId = typeof data?.prompt_id === "string" ? data.prompt_id : "";
    if (!promptId) throw new Error("ComfyUI did not return a prompt id.");

    const media = await waitForVideo(promptId);
    const params = new URLSearchParams({
      filename: media.filename,
      subfolder: media.subfolder,
      type: media.type,
    });
    const output = await fetchWithTimeout(`${baseUrl()}/view?${params.toString()}`, undefined, 60_000);
    if (!output.ok) throw new Error("ComfyUI video output could not be downloaded.");
    return output.blob();
  },
};
