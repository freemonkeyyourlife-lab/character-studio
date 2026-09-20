import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (claimsError || !userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const generations = await Promise.all((rows || []).map(async (item) => {
    const signed = await supabase.storage
      .from("character-assets")
      .createSignedUrl(item.image_url, 3600);

    return {
      id: item.id,
      characterId: item.character_id,
      name: item.name,
      prompt: item.prompt,
      imagePath: item.image_url,
      imageUrl: signed.data?.signedUrl || "",
      createdAt: item.created_at,
    };
  }));

  return NextResponse.json({ generations }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (claimsError || !userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: {
    id?: string;
    characterId?: string;
    name?: string;
    prompt?: string;
    imagePath?: string;
  };
  try {
    body = (await request.json()) as {
      id?: string;
      characterId?: string;
      name?: string;
      prompt?: string;
      imagePath?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  if (
    typeof body.id !== "string" ||
    typeof body.characterId !== "string" ||
    typeof body.prompt !== "string" ||
    typeof body.imagePath !== "string" ||
    !body.id.trim() ||
    !body.characterId.trim() ||
    !body.prompt.trim() ||
    !body.imagePath.trim()
  ) {
    return NextResponse.json({ error: "Generation data is incomplete." }, { status: 400 });
  }

  if (body.name !== undefined && typeof body.name !== "string") {
    return NextResponse.json({ error: "Generation name must be a string." }, { status: 400 });
  }

  if (body.name && body.name.length > 120) {
    return NextResponse.json({ error: "Generation name is limited to 120 characters." }, { status: 400 });
  }

  if (body.prompt.length > 4000) {
    return NextResponse.json({ error: "Prompt is limited to 4000 characters." }, { status: 400 });
  }

  if (!UUID_RE.test(body.id) || !UUID_RE.test(body.characterId)) {
    return NextResponse.json({ error: "Generation identifiers must be valid UUIDs." }, { status: 400 });
  }

  if (body.imagePath.length > 500) {
    return NextResponse.json({ error: "Generation image path is too long." }, { status: 400 });
  }

  if (!body.imagePath.startsWith(userId + "/")) {
    return NextResponse.json({ error: "Generation image does not belong to this account." }, { status: 403 });
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id")
    .eq("id", body.characterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!character) return NextResponse.json({ error: "Character not found." }, { status: 404 });

  const { data: existing } = await supabase
    .from("generations")
    .select("id, image_url, user_id, character_id")
    .eq("id", body.id)
    .maybeSingle();

  if (existing && (existing.user_id !== userId || existing.character_id !== body.characterId)) {
    return NextResponse.json({ error: "Generation id already belongs to another account or character." }, { status: 409 });
  }

  const { data: row, error } = await supabase
    .from("generations")
    .upsert({
      id: body.id,
      user_id: userId,
      character_id: body.characterId,
      name: body.name || "Unnamed character",
      prompt: body.prompt,
      image_url: body.imagePath,
    }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const signed = await supabase.storage.from("character-assets").createSignedUrl(row.image_url, 3600);

  return NextResponse.json({
    generation: {
      id: row.id,
      characterId: row.character_id,
      name: row.name,
      prompt: row.prompt,
      imagePath: row.image_url,
      imageUrl: signed.data?.signedUrl || "",
      createdAt: row.created_at,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
