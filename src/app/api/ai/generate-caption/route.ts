import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateCaption } from "@/lib/ai/captions";

const schema = z.object({
  contentItemId: z.string().uuid().optional(),
  productDescription: z.string().optional(),
  platform: z.enum(["instagram", "tiktok"]),
  brandVoice: z.string().nullable().optional(),
  brandKeywords: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Resolve product description from content_items if not supplied.
  let productDescription = parsed.data.productDescription;
  let voice = parsed.data.brandVoice ?? undefined;
  let keywords = parsed.data.brandKeywords;

  if (parsed.data.contentItemId) {
    const { data: item } = await supabase
      .from("content_items")
      .select("prompt, projects!inner(client_id, clients!inner(brand_voice, brand_keywords))")
      .eq("id", parsed.data.contentItemId)
      .single();
    if (item) {
      productDescription = productDescription ?? item.prompt;
      const c = (item.projects as { clients?: { brand_voice?: string | null; brand_keywords?: string[] } } | null)?.clients;
      voice = voice ?? c?.brand_voice ?? undefined;
      keywords = keywords ?? c?.brand_keywords ?? [];
    }
  }

  if (!productDescription) {
    return NextResponse.json({ error: "Missing product description" }, { status: 400 });
  }

  try {
    const result = await generateCaption({
      productDescription,
      brandVoice: voice,
      brandKeywords: keywords,
      platform: parsed.data.platform,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Caption generation failed" },
      { status: 500 },
    );
  }
}
