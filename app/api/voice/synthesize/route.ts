import { NextResponse } from "next/server";
import { requireConfiguredAuth } from "@/lib/auth";
import { synthesizeWithElevenLabs } from "@/lib/providers/elevenlabs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;
const MAX_TEXT = 12_000;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const userId = await requireConfiguredAuth();
    if (!userId) return NextResponse.json({ error: "Cloud authentication is not configured." }, { status: 503 });
    const body = (await request.json()) as {
      voiceId?: unknown;
      voiceProfileId?: unknown;
      text?: unknown;
      modelId?: unknown;
      consentGranted?: unknown;
    };

    const requestedVoiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
    const voiceProfileId = typeof body.voiceProfileId === "string" ? body.voiceProfileId.trim() : "";
    let voiceId = requestedVoiceId;
    if (voiceProfileId) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return NextResponse.json({ error: "Cloud storage is not configured." }, { status: 503 });
      const { data: profile, error: profileError } = await supabase
        .from("voice_profiles")
        .select("provider,provider_voice_id,consent_revoked_at,consent_expires_at")
        .eq("id", voiceProfileId)
        .eq("user_id", userId)
        .maybeSingle();
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
      if (!profile || profile.provider !== "elevenlabs") return NextResponse.json({ error: "Voice profile not found." }, { status: 404 });
      if (profile.consent_revoked_at) return NextResponse.json({ error: "Voice consent has been revoked." }, { status: 403 });
      if (profile.consent_expires_at && Date.parse(profile.consent_expires_at) <= Date.now()) {
        return NextResponse.json({ error: "Voice consent has expired." }, { status: 403 });
      }
      voiceId = profile.provider_voice_id;
    }
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
