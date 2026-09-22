import { NextResponse } from "next/server";
import { requireConfiguredAuth } from "@/lib/auth";
import { cloneVoiceWithElevenLabs } from "@/lib/providers/elevenlabs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_FILES = 8;
const MAX_NAME = 120;\nconst UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const userId = await requireConfiguredAuth();
    if (!userId) return NextResponse.json({ error: "Cloud authentication is not configured." }, { status: 503 });

    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const consentGranted = String(form.get("consentGranted") || "").toLowerCase() === "true";
    const consentSubject = String(form.get("consentSubject") || "").trim();\n    const characterId = String(form.get("characterId") || "").trim();

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
    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: "Cloud storage is not configured." }, { status: 503 });

    const { data: profile, error: profileError } = await supabase.from("voice_profiles").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      character_id: characterId || null,\n      provider: "elevenlabs",
      provider_voice_id: result.voiceId,
      name,
      consent_subject: consentSubject,
      consent_scopes: ["voice-cloning", "voice-synthesis"],
    }).select("id,character_id,provider_voice_id,name,consent_subject,consent_granted_at,consent_expires_at,consent_revoked_at,consent_scopes").single();

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      provider: "elevenlabs",
      voiceId: result.voiceId,
      profile,
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
