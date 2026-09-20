import { NextResponse } from "next/server";

export const runtime = "nodejs";

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

export async function GET() {
  const providers = {
    huggingface: configured(process.env.HF_TOKEN),
    replicate: configured(process.env.REPLICATE_API_TOKEN),
    fal: configured(process.env.FAL_KEY),
    comfyui: configured(process.env.COMFYUI_URL) && configured(process.env.COMFYUI_CHECKPOINT),
  };

  const videoProviders = {
    replicate: configured(process.env.REPLICATE_API_TOKEN) && configured(process.env.REPLICATE_VIDEO_MODEL),
    fal: configured(process.env.FAL_KEY) && configured(process.env.FAL_VIDEO_MODEL),
    comfyui: configured(process.env.COMFYUI_URL) && configured(process.env.COMFYUI_VIDEO_WORKFLOW),
  };

  const cloud = {
    supabase: configured(process.env.NEXT_PUBLIC_SUPABASE_URL) && configured(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  };

  return NextResponse.json(
    {
      ok: true,
      service: "character-studio",
      providers,
      videoProviders,
      cloud,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
