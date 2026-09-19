import { NextResponse } from "next/server";
import { editWithHuggingFace, generateWithHuggingFace } from "@/lib/providers/huggingface";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const prompt = String(form.get("prompt") || "").trim();
      const model = String(form.get("model") || "").trim();
      const file = form.get("reference");

      if (!prompt || !(file instanceof File)) {
        return NextResponse.json({ error: "Prompt and reference image are required." }, { status: 400 });
      }

      const image = await editWithHuggingFace(file, prompt);
      const bytes = Buffer.from(await image.arrayBuffer());
      return new Response(bytes, { status: 200, headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
    }

    const body = (await request.json()) as { prompt?: string; provider?: string; model?: string };
    if (!body.prompt?.trim()) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    if (body.provider !== "huggingface") return NextResponse.json({ error: "Provider is not connected yet." }, { status: 400 });

    const image = await generateWithHuggingFace(body.prompt.trim(), body.model);
    const bytes = Buffer.from(await image.arrayBuffer());
    return new Response(bytes, { status: 200, headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
