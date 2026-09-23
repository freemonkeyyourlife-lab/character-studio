import { NextResponse } from "next/server";
import { imageProviders } from "@/lib/character";
import { providerAvailability } from "@/lib/providers/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const providers = providerAvailability(process.env).map((provider) => ({
    ...provider,
    models: imageProviders.find((imageProvider) => imageProvider.id === provider.id)?.models || [],
  }));
  return NextResponse.json({ providers }, { headers: { "Cache-Control": "no-store" } });
}
