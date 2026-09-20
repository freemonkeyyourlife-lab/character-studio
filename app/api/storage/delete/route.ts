import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Cloud storage is not configured." }, { status: 503 });

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (claimsError || !userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: { path?: string };
  try {
    body = (await request.json()) as { path?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path.trim() : "";
  if (!path) return NextResponse.json({ error: "Storage path is required." }, { status: 400 });
  if (path.length > 500) return NextResponse.json({ error: "Storage path is too long." }, { status: 400 });
  if (!path.startsWith(userId + "/")) {
    return NextResponse.json({ error: "Storage path does not belong to this account." }, { status: 403 });
  }

  const { error } = await supabase.storage.from("character-assets").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
