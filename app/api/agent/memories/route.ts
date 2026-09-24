import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authenticated() {
  const db = await createSupabaseServerClient();
  if (!db) return { db: null, userId: null };
  const { data, error } = await db.auth.getClaims();
  return { db, userId: error ? null : (typeof data?.claims?.sub === "string" ? data.claims.sub : null) };
}

export async function GET(request: Request) {
  const { db, userId } = await authenticated();
  if (!db) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const characterId = new URL(request.url).searchParams.get("characterId");
  if (!characterId || !UUID.test(characterId)) return NextResponse.json({ error: "Invalid character id." }, { status: 400 });
  const { data, error } = await db.from("character_memories").select("id,content,updated_at")
    .eq("user_id", userId).eq("character_id", characterId).order("updated_at", { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: "Could not load memories." }, { status: 500 })
    : NextResponse.json({ memories: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { db, userId } = await authenticated();
  if (!db) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { characterId?: unknown; content?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.characterId !== "string" || !UUID.test(body.characterId))
    return NextResponse.json({ error: "Invalid character id." }, { status: 400 });
  if (typeof body.content !== "string" || !body.content.trim() || body.content.trim().length > 1000)
    return NextResponse.json({ error: "Memory must contain 1–1000 characters." }, { status: 400 });
  const { data: character, error: ownerError } = await db.from("characters").select("id")
    .eq("id", body.characterId).eq("user_id", userId).maybeSingle();
  if (ownerError || !character) return NextResponse.json({ error: "Character not found." }, { status: 404 });
  const { count, error: countError } = await db.from("character_memories").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("character_id", character.id);
  if (countError) return NextResponse.json({ error: "Could not check memories." }, { status: 500 });
  if ((count ?? 0) >= 100) return NextResponse.json({ error: "This character has reached the 100-memory limit." }, { status: 409 });
  const { data, error } = await db.from("character_memories")
    .insert({ user_id: userId, character_id: character.id, content: body.content.trim() })
    .select("id,content,updated_at").single();
  return error ? NextResponse.json({ error: "Could not save memory." }, { status: 500 })
    : NextResponse.json({ memory: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const { db, userId } = await authenticated();
  if (!db) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !UUID.test(id)) return NextResponse.json({ error: "Invalid memory id." }, { status: 400 });
  const { data, error } = await db.from("character_memories").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not delete memory." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
  return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
}
