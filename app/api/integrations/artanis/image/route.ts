import { NextResponse } from "next/server";
import { buildArtanisPrompt, normalizeArtanisContext, type ArtanisContextRequest } from "@/lib/integrations/artanis";
import { getProvider } from "@/lib/character";
import { generateWithHuggingFace } from "@/lib/providers/huggingface";
import { replicateProvider } from "@/lib/providers/replicate";
import { falProvider } from "@/lib/providers/fal";
import { comfyuiProvider } from "@/lib/providers/comfyui";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

function authorized(request: Request) {
  const expected = process.env.ARTANIS_INTEGRATION_SECRET?.trim();
  return Boolean(expected && request.headers.get("x-artanis-integration-secret") === expected);
}

function adapter(provider: string) {
  if (!getProvider(provider)) throw new Error("Unknown image provider.");
  if (provider === "huggingface") return { generate: ({ prompt, model }: { prompt: string; model?: string }) => generateWithHuggingFace(prompt, model) };
  if (provider === "replicate") return replicateProvider;
  if (provider === "fal") return falProvider;
  if (provider === "comfyui") return comfyuiProvider;
  throw new Error("Image provider is not connected.");
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized Artanis integration request." }, { status: 401 });

  let body: ArtanisContextRequest;
  try {
    body = (await request.json()) as ArtanisContextRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const context = normalizeArtanisContext({ ...body, mode: "image" });
  const result = buildArtanisPrompt(context);
  const provider = context.imageProvider || "huggingface";
  const model = context.imageModel;
  try {
    const blob = await adapter(provider).generate({ prompt: result.prompt, model });
    const bytes = Buffer.from(await blob.arrayBuffer());
    if (bytes.length > MAX_OUTPUT_BYTES) throw new Error("Image output exceeds 16 MB.");
    return new Response(bytes, {
      headers: {
        "Content-Type": blob.type || "image/png",
        "Cache-Control": "no-store",
        "X-Artanis-Prompt-Summary": encodeURIComponent(result.contextSummary.slice(0, 500)),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Artanis image generation failed." }, { status: 500 });
  }
}
