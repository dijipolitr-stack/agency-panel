import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateAsset } from "@/lib/ai/kie";
import { getModelById } from "@/lib/ai/models";

const schema = z.object({
  projectId: z.string().uuid(),
  modelId: z.string(),
  prompt: z.string().min(4).max(2000),
});

export const maxDuration = 300; // up to 5 min for video

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const model = getModelById(parsed.data.modelId);
  if (!model || model.type !== "video") {
    return NextResponse.json({ error: "Pick a video model" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: pending, error: insertErr } = await supabase
    .from("content_items")
    .insert({
      project_id: parsed.data.projectId,
      type: "video",
      prompt: parsed.data.prompt,
      model: model.slug,
      status: "generating",
    })
    .select("*")
    .single();
  if (insertErr || !pending) {
    return NextResponse.json({ error: insertErr?.message ?? "Could not save" }, { status: 500 });
  }

  try {
    const result = await generateAsset({
      modelId: parsed.data.modelId,
      prompt: parsed.data.prompt,
    });

    const { data: updated } = await supabase
      .from("content_items")
      .update({
        status: "ready",
        asset_url: result.url,
        thumbnail_url: result.thumbnailUrl ?? null,
        generation_params: { mocked: result.mocked },
      })
      .eq("id", pending.id)
      .select("*")
      .single();

    return NextResponse.json({ item: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    await supabase
      .from("content_items")
      .update({ status: "failed", error_message: message })
      .eq("id", pending.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
