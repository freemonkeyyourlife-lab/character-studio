import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const redirectTo = new URL("/?confirmed=1", request.url);

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/auth?error=confirmation", request.url));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/auth?error=configuration", request.url));
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(new URL("/auth?error=confirmation", request.url));
  }

  return NextResponse.redirect(redirectTo);
}
