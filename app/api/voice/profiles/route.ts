import { NextResponse } from "next/server";
import { requireConfiguredAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Consent expiry must be an ISO date string.");
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error("Consent expiry must be a valid date.");
  return new Date(time).toISOString();
}

export async function GET() {
  try {
    const userId = await requireConfiguredAuth();
    if (!userId) return NextResponse.json({ error: "Cloud authentication is not configured." }, { status: 503 });
    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ profiles: [] }, { headers: { "Cache-Control": "no-store" } });

    const { data, error } = await supabase
      .from("voice_profiles")
      .select("id,character_id,provider,provider_voice_id,name,consent_subject,consent_granted_at,consent_expires_at,consent_revoked_at,consent_scopes,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profiles: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Voice profiles could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireConfiguredAuth();
    if (!userId) return NextResponse.json({ error: "Cloud authentication is not configured." }, { status: 503 });
    const body = await request.json();
    const providerVoiceId = typeof body.providerVoiceId === "string" ? body.providerVoiceId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const consentSubject = typeof body.consentSubject === "string" ? body.consentSubject.trim() : "";
    const characterId = body.characterId == null || body.characterId === "" ? null : String(body.characterId);
    const provider = typeof body.provider === "string" && body.provider.trim() ? body.provider.trim() : "elevenlabs";
    const scopes = Array.isArray(body.consentScopes)
      ? body.consentScopes.filter((value: unknown): value is string => typeof value === "string").slice(0, 20)
      : ["voice-synthesis", "voice-cloning"];
    const expiresAt = validDate(body.consentExpiresAt);

    if (!providerVoiceId || providerVoiceId.length > 200) return NextResponse.json({ error: "A valid provider voice ID is required." }, { status: 400 });
    if (!name || name.length > 120) return NextResponse.json({ error: "Voice name is required and must be 120 characters or fewer." }, { status: 400 });
    if (!consentSubject || consentSubject.length > 200) return NextResponse.json({ error: "Consent subject is required." }, { status: 400 });
    if (characterId && !UUID_RE.test(characterId)) return NextResponse.json({ error: "characterId must be a valid UUID." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: "Cloud storage is not configured." }, { status: 503 });

    if (characterId) {
      const { data: character, error: characterError } = await supabase
        .from("characters").select("id").eq("id", characterId).eq("user_id", userId).maybeSingle();
      if (characterError) return NextResponse.json({ error: characterError.message }, { status: 500 });
      if (!character) return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    const id = crypto.randomUUID();
    const { data, error } = await supabase.from("voice_profiles").insert({
      id, user_id: userId, character_id: characterId, provider, provider_voice_id: providerVoiceId,
      name, consent_subject: consentSubject, consent_expires_at: expiresAt, consent_scopes: scopes,
    }).select("id,character_id,provider,provider_voice_id,name,consent_subject,consent_granted_at,consent_expires_at,consent_revoked_at,consent_scopes,created_at,updated_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Voice profile could not be created." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireConfiguredAuth();
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "A valid profile id is required." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: "Cloud storage is not configured." }, { status: 503 });

    const updates: Record<string, unknown> = {};
    if (body.revoke === true) updates.consent_revoked_at = new Date().toISOString();
    if (body.revoke === false) updates.consent_revoked_at = null;
    if (typeof body.consentExpiresAt === "string" || body.consentExpiresAt === null) updates.consent_expires_at = validDate(body.consentExpiresAt);
    if (typeof body.characterId === "string" && UUID_RE.test(body.characterId)) updates.character_id = body.characterId;
    if (!Object.keys(updates).length) return NextResponse.json({ error: "No supported changes supplied." }, { status: 400 });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("voice_profiles")
      .update(updates).eq("id", id).eq("user_id", userId)
      .select("id,character_id,provider,provider_voice_id,name,consent_subject,consent_granted_at,consent_expires_at,consent_revoked_at,consent_scopes,created_at,updated_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Voice profile could not be updated." }, { status: 500 });
  }
}
