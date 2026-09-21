import { NextResponse } from "next/server";
import { normalizeArtanisContext, buildArtanisPrompt } from "@/lib/integrations/artanis";
import { synthesizeWithElevenLabs } from "@/lib/providers/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 120;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

function authorized(request: Request) {
  const configured = process.env.ARTANIS_INTEGRATION_SECRET;
  return Boolean(configured && request.headers.get("x-artanis-integration-secret") === configured);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
    if (!voiceId) return NextResponse.json({ error: "voiceId is required." }, { status: 400 });
    if (body.consentGranted !== true) return NextResponse.json({ error: "Explicit voice-use consent is required." }, { status: 400 });

    const context = normalizeArtanisContext({ ...body, mode: "prompt" });
    const prompt = buildArtanisPrompt(context);
    const text = typeof body.text === "string" && body.text.trim()
      ? body.text.trim()
      : prompt.contextSummary;

    const blob = await synthesizeWithElevenLabs({
      voiceId,
      text,
      modelId: typeof body.modelId === "string" ? body.modelId : undefined,
    });

    if (blob.size > MAX_OUTPUT_BYTES) {
      return NextResponse.json({ error: "Generated audio is too large." }, { status: 502 });
    }

    return new NextResponse(blob, {
      headers: {
        "Content-Type": blob.type || "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Character-Studio-Context": encodeURIComponent(prompt.contextSummary.slice(0, 1000)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artanis voice generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
