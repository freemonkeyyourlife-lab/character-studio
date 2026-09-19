import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "character-studio",
    providers: {
      huggingface: Boolean(process.env.HF_TOKEN),
      replicate: Boolean(process.env.REPLICATE_API_TOKEN),
      fal: Boolean(process.env.FAL_KEY),
      comfyui: Boolean(process.env.COMFYUI_URL && process.env.COMFYUI_CHECKPOINT),
    },
    cloud: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    },
  });
}
