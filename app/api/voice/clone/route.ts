import { NextResponse } from "next/server";
import { requireConfiguredAuth } from "@/lib/auth";
import { cloneVoiceWithElevenLabs } from "@/lib/providers/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_FILES = 8;
const MAX_NAME = 120;

export async function POST(request: Request) {
  try {
    await requireConfiguredAuth();

    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const consentGranted = String(form.get("consentGranted") || "").toLowerCase() === "true";
    const consentSubject = String(form.get("consentSubject") || "").trim();

    if (!consentGranted) {
      return NextResponse.json({ error: "Explicit voice-cloning consent is required." }, { status: 400 });
    }
    if (!name || name.length > MAX_NAME) {
      return NextResponse.json({ error: "Voice name is required and must be 120 characters or fewer." }, { status: 400 });
    }
    if (!consentSubject || consentSubject.length > 200) {
      return NextResponse.json({ error: "Consent subject is required." }, { status: 400 });
    }

    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (!files.length || files.length > MAX_FILES) {
      return NextResponse.json({ error: `Upload 1 to ${MAX_FILES} audio samples.` }, { status: 400 });
    }

    let total = 0;
    for (const file of files) {
      total += file.size;
      if (!file.type.startsWith("audio/")) {
        return NextResponse.json({ error: "Only audio files are accepted." }, { status: 400 });
      }
    }
    if (total > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: "Voice sample uploads are limited to 32 MB total." }, { status: 400 });
    }

    const result = await cloneVoiceWithElevenLabs(name, files, description || undefined);
    return NextResponse.json({
      ok: true,
      provider: "elevenlabs",
      voiceId: result.voiceId,
      requiresVerification: result.requiresVerification,
      consent: {
        granted: true,
        subject: consentSubject,
        recordedAt: new Date().toISOString(),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice cloning failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
