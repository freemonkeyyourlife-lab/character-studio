import { NextResponse } from "next/server";
import { buildArtanisPrompt, normalizeArtanisContext, type ArtanisContextRequest } from "@/lib/integrations/artanis";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.ARTANIS_INTEGRATION_SECRET?.trim();
  if (!expected) return false;
  return request.headers.get("x-artanis-integration-secret") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Artanis integration is not configured or authorized." }, { status: 401 });
  }

  let body: ArtanisContextRequest;
  try {
    body = (await request.json()) as ArtanisContextRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const normalized = normalizeArtanisContext(body);
  const result = buildArtanisPrompt(normalized);

  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
