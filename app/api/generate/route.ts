import { NextResponse } from "next/server";
import { generateWithHuggingFace } from "@/lib/providers/huggingface";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { prompt?: string; provider?: string };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    if (body.provider !== "huggingface") {
      return NextResponse.json({ error: "Provider is not connected yet." }, { status: 400 });
    }

    const image = await generateWithHuggingFace(body.prompt.trim());
    const bytes = Buffer.from(await image.arrayBuffer());

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
