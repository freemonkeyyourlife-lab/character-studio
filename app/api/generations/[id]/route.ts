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
  const { data: generation, error: lookupError } = await supabase
    .from("generations")
    .select("id, image_url")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!generation) return NextResponse.json({ error: "Generation not found." }, { status: 404 });

  const { error } = await supabase
    .from("generations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (generation.image_url) {
    const { error: storageError } = await supabase.storage
      .from("character-assets")
      .remove([generation.image_url]);

    if (storageError) {
      return NextResponse.json({
        ok: true,
        warning: "Generation deleted, but its stored image could not be removed.",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
