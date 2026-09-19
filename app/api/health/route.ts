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

  const cloud = {
    supabase: configured(process.env.NEXT_PUBLIC_SUPABASE_URL) && configured(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  };

  return NextResponse.json(
    {
      ok: true,
      service: "character-studio",
      providers,
      cloud,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
