import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (claimsError || !userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await context.params;

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id, reference_image_url")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (characterError) return NextResponse.json({ error: characterError.message }, { status: 500 });
  if (!character) return NextResponse.json({ error: "Character not found." }, { status: 404 });

  const { data: generations, error: generationsError } = await supabase
    .from("generations")
    .select("image_url")
    .eq("character_id", id)
    .eq("user_id", userId);

  if (generationsError) return NextResponse.json({ error: generationsError.message }, { status: 500 });

  const paths = [
    character.reference_image_url,
    ...(generations || []).map((item) => item.image_url),
  ].filter((path): path is string => typeof path === "string" && path.length > 0);

  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (paths.length) {
    const { error: storageError } = await supabase.storage.from("character-assets").remove(paths);
    if (storageError) {
      return NextResponse.json({
        ok: true,
        warning: "Character deleted, but some stored images could not be removed.",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
