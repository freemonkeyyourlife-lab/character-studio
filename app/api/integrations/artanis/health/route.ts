import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const configured = Boolean(process.env.ARTANIS_INTEGRATION_SECRET?.trim());
  const supplied = request.headers.get("x-artanis-integration-secret");
  const authorized = configured && supplied === process.env.ARTANIS_INTEGRATION_SECRET?.trim();

  return NextResponse.json(
    {
      ok: true,
      integration: "artanis",
      configured,
      authorized,
      capabilities: {
        contextToPrompt: true,
        imageGeneration: true,
        videoGeneration: true,
        voiceGeneration: false,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
