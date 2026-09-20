import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "character-assets";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Cloud storage is not configured." }, { status: 503 });

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (claimsError || !userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload." }, { status: 400 });
  }

  const file = form.get("file");
  const requestedFolderValue = form.get("folder");
  const requestedFolder = typeof requestedFolderValue === "string" ? requestedFolderValue : "uploads";
  if (requestedFolder.length > 100) {
    return NextResponse.json({ error: "Upload folder is too long." }, { status: 400 });
  }
  const folder = requestedFolder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "uploads";

  if (!(file instanceof File)) return NextResponse.json({ error: "File is required." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only PNG, JPEG and WebP images are supported." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 8 MB or smaller." }, { status: 400 });

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = userId + "/" + folder + "/" + crypto.randomUUID() + "." + extension;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (signedError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: signedError.message }, { status: 500 });
  }

  return NextResponse.json({ path, signedUrl: signed.signedUrl }, {
    headers: { "Cache-Control": "no-store" },
  });
}
