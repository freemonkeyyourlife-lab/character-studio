import { NextResponse } from "next/server";
import { buildArtanisPrompt, normalizeArtanisContext, type ArtanisContextRequest } from "@/lib/integrations/artanis";
import { getVideoProvider } from "@/lib/video";
import { replicateVideoProvider } from "@/lib/providers/replicate-video";
import { falVideoProvider } from "@/lib/providers/fal-video";
import { comfyuiVideoProvider } from "@/lib/providers/comfyui-video";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_OUTPUT_BYTES = 128 * 1024 * 1024;

function authorized(request: Request) {
  const expected = process.env.ARTANIS_INTEGRATION_SECRET?.trim();
  return Boolean(expected && request.headers.get("x-artanis-integration-secret") === expected);
}

function adapter(provider: string) {
  if (!getVideoProvider(provider)) throw new Error("Unknown video provider.");
  if (provider === "replicate") return replicateVideoProvider;
  if (provider === "fal") return falVideoProvider;
  if (provider === "comfyui") return comfyuiVideoProvider;
  throw new Error("Video provider is not connected.");
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized Artanis integration request." }, { status: 401 });

  let body: ArtanisContextRequest;
  try {
    body = (await request.json()) as ArtanisContextRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const context = normalizeArtanisContext({ ...body, mode: "video" });
  const result = buildArtanisPrompt(context);
  const provider = context.videoProvider || "comfyui";

  try {
    const blob = await adapter(provider).generate({
      prompt: result.prompt,
      model: context.videoModel,
      duration: context.duration,
      width: context.width,
      height: context.height,
      fps: context.fps,
    });
    const bytes = Buffer.from(await blob.arrayBuffer());
    if (bytes.length > MAX_OUTPUT_BYTES) throw new Error("Video output exceeds 128 MB.");
    return new Response(bytes, {
      headers: {
        "Content-Type": blob.type || "video/mp4",
        "Cache-Control": "no-store",
        "X-Artanis-Prompt-Summary": encodeURIComponent(result.contextSummary.slice(0, 500)),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Artanis video generation failed." }, { status: 500 });
  }
}
