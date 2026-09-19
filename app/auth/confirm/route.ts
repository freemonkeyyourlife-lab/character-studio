import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "email";
  if (!tokenHash) return NextResponse.redirect(new URL("/auth", request.url));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/auth", request.url));
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "recovery" | "invite" | "email_change" });
  if (error) return NextResponse.redirect(new URL("/auth?error=confirmation", request.url));
  return NextResponse.redirect(new URL("/", request.url));
}
