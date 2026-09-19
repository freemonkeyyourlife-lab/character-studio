import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  const generations = await Promise.all((rows || []).map(async (item) => ({
    id: item.id,
    characterId: item.character_id,
    name: item.name,
    prompt: item.prompt,
    imagePath: item.image_url,
    imageUrl: (await supabase.storage.from("character-assets").createSignedUrl(item.image_url, 3600)).data?.signedUrl || "",
    createdAt: item.created_at,
  })));

  return NextResponse.json({ generations });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (claimsError || !userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = (await request.json()) as {
    id?: string;
    characterId?: string;
    name?: string;
    prompt?: string;
    imagePath?: string;
  };

  if (!body.id || !body.characterId || !body.prompt || !body.imagePath) {
    return NextResponse.json({ error: "Generation data is incomplete." }, { status: 400 });
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id")
    .eq("id", body.characterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!character) return NextResponse.json({ error: "Character not found." }, { status: 404 });

  const { data: row, error } = await supabase
    .from("generations")
    .insert({
      id: body.id,
      user_id: userId,
      character_id: body.characterId,
      name: body.name || "Unnamed character",
      prompt: body.prompt,
      image_url: body.imagePath,
    })
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
  });
}
