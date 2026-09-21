import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireConfiguredAuth() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) {
    throw new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return userId;
}
