import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, userId: null };

  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) return { supabase, userId: null };

  return { supabase, userId };
}

export async function GET() {
  const { supabase, userId } = await getAuthenticatedClient();
  if (!supabase) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const characters = await Promise.all((data || []).map(async (item) => {
    let referenceImage: string | undefined;
    if (item.reference_image_url) {
      const signed = await supabase.storage
        .from("character-assets")
        .createSignedUrl(item.reference_image_url, 3600);
      referenceImage = signed.data?.signedUrl;
    }

    return {
      id: item.id,
      name: item.name,
      age: item.age,
      appearance: item.appearance,
      personality: item.personality,
      referenceImage,
      referenceImagePath: item.reference_image_url || undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }));

  return NextResponse.json({ characters });
}

export async function POST(request: Request) {
  const { supabase, userId } = await getAuthenticatedClient();
  if (!supabase) return NextResponse.json({ error: "Cloud persistence is not configured." }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    age?: string;
    appearance?: string;
    personality?: string;
    referenceImagePath?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "Character id is required." }, { status: 400 });

  const requestedPath = body.referenceImagePath || null;
  if (requestedPath && !requestedPath.startsWith(userId + "/")) {
    return NextResponse.json({ error: "Reference image does not belong to this account." }, { status: 403 });
  }

  const payload = {
    id: body.id,
    user_id: userId,
    name: body.name || "",
    age: body.age || "",
    appearance: body.appearance || "",
    personality: body.personality || "",
    reference_image_url: requestedPath,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("characters")
    .select("id, user_id")
    .eq("id", body.id)
    .maybeSingle();

  if (existing && existing.user_id !== userId) {
    return NextResponse.json({ error: "Character id already belongs to another account." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("characters")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    character: {
      id: data.id,
      name: data.name,
      age: data.age,
      appearance: data.appearance,
      personality: data.personality,
      referenceImagePath: data.reference_image_url || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}
