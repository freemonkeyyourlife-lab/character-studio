import { NextResponse } from "next/server";
import { canUseModel, getProvider } from "@/lib/character";
import { editWithHuggingFace, generateWithHuggingFace } from "@/lib/providers/huggingface";
import { replicateProvider } from "@/lib/providers/replicate";
import { falProvider } from "@/lib/providers/fal";
import { comfyuiProvider } from "@/lib/providers/comfyui";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

async function requireConfiguredAuth() {
  const supabase = await import("@/lib/supabase/server").then((module) => module.createSupabaseServerClient());
  if (!supabase) return;

  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) {
    throw new Response(JSON.stringify({ error: "Authentication required for image generation." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function toBlob(value: Blob | string): Promise<Blob> {
  if (value instanceof Blob) return value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(value, { signal: controller.signal });
    if (!response.ok) throw new Error("Image provider returned an unreadable image.");
    return response.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Image provider download timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

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

function selectionError(provider: string, model: string | undefined, capability: "text-to-image" | "image-edit") {
  if (!getProvider(provider)) return "Unknown image provider.";
  if (!model) return capability === "image-edit" ? "Model is required for reference editing." : "Model is required.";
  if (!canUseModel(provider, model, capability)) {
    return capability === "image-edit"
      ? "Selected model does not support reference editing."
      : "Selected model does not support text-to-image generation.";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    await requireConfiguredAuth();
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return NextResponse.json({ error: "Invalid multipart request." }, { status: 400 });
      }
      const promptValue = form.get("prompt");
      const modelValue = form.get("model");
      const providerValue = form.get("provider");
      const prompt = typeof promptValue === "string" ? promptValue.trim() : "";
      const model = typeof modelValue === "string" ? modelValue.trim() : "";
      const provider = typeof providerValue === "string" ? providerValue.trim() || "huggingface" : "huggingface";
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

      const selection = selectionError(provider, model, "image-edit");
      if (selection) return NextResponse.json({ error: selection }, { status: 400 });

      const image = await toBlob(await edit(provider, file, prompt, model));
      const bytes = Buffer.from(await image.arrayBuffer());
    if (bytes.length > MAX_OUTPUT_BYTES) throw new Error("Image provider returned an image larger than 16 MB.");
      if (bytes.length > MAX_OUTPUT_BYTES) throw new Error("Image provider returned an image larger than 16 MB.");
      return new Response(bytes, {
        status: 200,
        headers: { "Content-Type": image.type || "image/png", "Cache-Control": "no-store" },
      });
    }

    let body: { prompt?: string; provider?: string; model?: string };
    try {
      body = (await request.json()) as { prompt?: string; provider?: string; model?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    const provider = typeof body.provider === "string" ? body.provider.trim() || "huggingface" : "huggingface";
    const model = typeof body.model === "string" ? body.model.trim() : "";

    if (prompt.length > 4000) {
      return NextResponse.json({ error: "Prompt is limited to 4000 characters." }, { status: 400 });
    }

    const selection = selectionError(provider, model, "text-to-image");
    if (selection) return NextResponse.json({ error: selection }, { status: 400 });

    const image = await toBlob(await generate(provider, prompt, model));
    const bytes = Buffer.from(await image.arrayBuffer());
    return new Response(bytes, {
      status: 200,
      headers: { "Content-Type": image.type || "image/png", "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
