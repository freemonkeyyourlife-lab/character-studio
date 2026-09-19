import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "character-studio",
    generation: process.env.HF_TOKEN ? "configured" : "missing-token",
  });
}
