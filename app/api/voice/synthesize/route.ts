import { NextResponse } from "next/server";
import { requireConfiguredAuth } from "@/lib/auth";
import { synthesizeWithElevenLabs } from "@/lib/providers/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 120;
const MAX_TEXT = 12_000;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireConfiguredAuth();
    const body = (await request.json()) as {
      voiceId?: unknown;
      text?: unknown;
      modelId?: unknown;
      consentGranted?: unknown;
    };

    const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const consentGranted = body.consentGranted === true;

    if (!consentGranted) {
      return NextResponse.json({ error: "Explicit voice-use consent is required." }, { status: 400 });
    }
    if (!voiceId || voiceId.length > 200) {
      return NextResponse.json({ error: "A valid ElevenLabs voice ID is required." }, { status: 400 });
    }
    if (!text || text.length > MAX_TEXT) {
      return NextResponse.json({ error: "Text is required and must be 12,000 characters or fewer." }, { status: 400 });
    }

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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice synthesis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
