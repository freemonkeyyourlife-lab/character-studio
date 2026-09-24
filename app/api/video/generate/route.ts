import { NextResponse } from "next/server";
import { getVideoProvider } from "@/lib/video";
import { replicateVideoProvider } from "@/lib/providers/replicate-video";
import { falVideoProvider } from "@/lib/providers/fal-video";
import { comfyuiVideoProvider } from "@/lib/providers/comfyui-video";
import { selectAutomaticVideoRoutes } from "@/lib/providers/video-router";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_OUTPUT_BYTES = 128 * 1024 * 1024;

async function requireConfiguredAuth() {
  const supabase = await import("@/lib/supabase/server").then((module) => module.createSupabaseServerClient());
  if (!supabase) return;

  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) {
    throw new Response(JSON.stringify({ error: "Authentication required for video generation." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function adapter(provider: string) {
  if (!getVideoProvider(provider)) throw new Error("Unknown video provider.");
  if (provider === "replicate") return replicateVideoProvider;
  if (provider === "fal") return falVideoProvider;
  if (provider === "comfyui") return comfyuiVideoProvider;
  throw new Error("Video provider is not connected.");
}

function optionalNumber(value: unknown, min: number, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Numeric option must be between ${min} and ${max}.`);
  }
  return Math.round(value);
}

export async function POST(request: Request) {
  try {
    await requireConfiguredAuth();

    let body: {
      prompt?: string;
      provider?: string;
      model?: string;
      duration?: unknown;
      width?: unknown;
      height?: unknown;
      fps?: unknown;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const provider = typeof body.provider === "string" ? body.provider.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";

    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    if (prompt.length > 8000) return NextResponse.json({ error: "Prompt is limited to 8000 characters." }, { status: 400 });
    if (provider !== "auto" && (!provider || !getVideoProvider(provider))) return NextResponse.json({ error: "Unknown video provider." }, { status: 400 });

    const duration = optionalNumber(body.duration, 1, 3600);
    const width = optionalNumber(body.width, 256, 4096);
    const height = optionalNumber(body.height, 256, 4096);
    const fps = optionalNumber(body.fps, 1, 120);

    const routes = provider === "auto"
      ? selectAutomaticVideoRoutes(process.env)
      : [{ provider, model: model || "configured" }];
    if (!routes.length) return NextResponse.json({ error: "No video provider is configured." }, { status: 503 });
    let video: Blob | undefined;
    let usedProvider = "";
    const failures: string[] = [];
    for (const route of routes) {
      try {
        video = await adapter(route.provider).generate({ prompt, model: route.model, duration, width, height, fps });
        usedProvider = route.provider;
        break;
      } catch (error) {
        failures.push(`${route.provider}: ${error instanceof Error ? error.message : "generation failed"}`);
      }
    }
    if (!video) return NextResponse.json({ error: failures.join("; ") }, { status: 502 });
    const bytes = Buffer.from(await video.arrayBuffer());
    if (bytes.length > MAX_OUTPUT_BYTES) throw new Error("Video provider returned a video larger than 128 MB.");

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": video.type || "video/mp4",
        "Cache-Control": "no-store",
        "X-Video-Provider": usedProvider,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Video generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
