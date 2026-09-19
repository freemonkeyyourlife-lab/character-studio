import { NextResponse } from "next/server";
import { canUseModel, getProvider } from "@/lib/character";
import { editWithHuggingFace, generateWithHuggingFace } from "@/lib/providers/huggingface";
import { replicateProvider } from "@/lib/providers/replicate";
import { falProvider } from "@/lib/providers/fal";
import { comfyuiProvider } from "@/lib/providers/comfyui";

export const runtime = "nodejs";

async function generate(provider: string, prompt: string, model?: string) {
  if (!getProvider(provider)) throw new Error("Unknown image provider.");
  if (!model || !canUseModel(provider, model, "text-to-image")) throw new Error("Selected model does not support text-to-image generation.");
  if (provider === "huggingface") return generateWithHuggingFace(prompt, model);
  if (provider === "replicate") return replicateProvider.generate({ prompt, model });
  if (provider === "fal") return falProvider.generate({ prompt, model });
  if (provider === "comfyui") return comfyuiProvider.generate({ prompt, model });
  throw new Error("Provider is not connected.");
}

async function edit(provider: string, image: Blob, prompt: string, model?: string) {
  if (!getProvider(provider)) throw new Error("Unknown image provider.");
  if (!model || !canUseModel(provider, model, "image-edit")) throw new Error("Selected model does not support reference editing.");
  if (provider === "huggingface") return editWithHuggingFace(image, prompt, model);
  if (provider === "replicate" && replicateProvider.edit) return replicateProvider.edit({ image, prompt, model });
  if (provider === "fal" && falProvider.edit) return falProvider.edit({ image, prompt, model });
  if (provider === "comfyui" && comfyuiProvider.edit) return comfyuiProvider.edit({ image, prompt, model });
  throw new Error("Reference editing is not available for this provider.");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const prompt = String(form.get("prompt") || "").trim();
      const model = String(form.get("model") || "").trim();
      const provider = String(form.get("provider") || "huggingface");
      const file = form.get("reference");

      if (!prompt || !(file instanceof File)) {
        return NextResponse.json({ error: "Prompt and reference image are required." }, { status: 400 });
      }

      if (prompt.length > 4000) {
        return NextResponse.json({ error: "Prompt is limited to 4000 characters." }, { status: 400 });
      }

      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: "Reference image must be 8 MB or smaller." }, { status: 400 });
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        return NextResponse.json({ error: "Reference image must be PNG, JPEG or WebP." }, { status: 400 });
      }

      const image = await edit(provider, file, prompt, model || undefined);
      const bytes = Buffer.from(await image.arrayBuffer());
      return new Response(bytes, {
        status: 200,
        headers: { "Content-Type": image.type || "image/png", "Cache-Control": "no-store" },
      });
    }

    const body = (await request.json()) as { prompt?: string; provider?: string; model?: string };
    if (!body.prompt?.trim()) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    if (body.prompt.trim().length > 4000) {
      return NextResponse.json({ error: "Prompt is limited to 4000 characters." }, { status: 400 });
    }

    const image = await generate(body.provider || "huggingface", body.prompt.trim(), body.model);
    const bytes = Buffer.from(await image.arrayBuffer());
    return new Response(bytes, {
      status: 200,
      headers: { "Content-Type": image.type || "image/png", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
