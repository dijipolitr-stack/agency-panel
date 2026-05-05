import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publishToInstagram } from "@/lib/social/instagram";
import { publishToTikTok } from "@/lib/social/tiktok";
import type { PublishRequest, PublishResult } from "@/lib/social/types";
import type { SocialPlatform } from "@/types/database";

const scheduleSchema = z.object({
  action: z.literal("schedule"),
  contentItemId: z.string().uuid(),
  socialAccountId: z.string().uuid(),
  caption: z.string().max(2200).optional().default(""),
  hashtags: z.array(z.string()).optional().default([]),
  scheduledFor: z.string().datetime().nullable().optional(),
});

const publishSchema = z.object({
  action: z.literal("publish"),
  postId: z.string().uuid(),
});

const bodySchema = z.union([scheduleSchema, publishSchema]);

// ---------- POST: schedule or publish ----------
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // ----- Schedule -----
  if (parsed.data.action === "schedule") {
    const { contentItemId, socialAccountId, caption, hashtags, scheduledFor } = parsed.data;
    const { data, error } = await supabase
      .from("posts")
      .insert({
        content_item_id: contentItemId,
        social_account_id: socialAccountId,
        caption: caption || null,
        hashtags,
        scheduled_for: scheduledFor ?? null,
        status: scheduledFor ? "scheduled" : "draft",
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  // ----- Publish now -----
  const { postId } = parsed.data;

  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select(`
      id, caption, hashtags, status,
      content_item:content_items!inner(id, type, asset_url),
      social_account:social_accounts!inner(id, platform, account_id, access_token)
    `)
    .eq("id", postId)
    .single();
  if (postErr || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const ci = post.content_item as { type: "image" | "video"; asset_url: string | null } | null;
  const sa = post.social_account as { platform: SocialPlatform; account_id: string; access_token: string } | null;
  if (!ci?.asset_url || !sa) {
    return NextResponse.json({ error: "Missing media or account" }, { status: 400 });
  }

  await supabase.from("posts").update({ status: "publishing" }).eq("id", postId);

  const fullCaption = [post.caption, ((post.hashtags as string[]) ?? []).join(" ")]
    .filter(Boolean)
    .join("\n\n");

  const publishReq: PublishRequest = {
    accessToken: sa.access_token,
    accountId: sa.account_id,
    mediaUrl: ci.asset_url,
    mediaType: ci.type,
    caption: fullCaption,
  };

  let result: PublishResult;
  try {
    result =
      sa.platform === "instagram"
        ? await publishToInstagram(publishReq)
        : await publishToTikTok(publishReq);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Publish failed";
    await supabase
      .from("posts")
      .update({ status: "failed", error_message: message })
      .eq("id", postId);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await supabase
    .from("posts")
    .update({
      status: "published",
      posted_at: new Date().toISOString(),
      platform_post_id: result.platformPostId,
      platform_post_url: result.platformPostUrl ?? null,
      error_message: null,
    })
    .eq("id", postId);

  return NextResponse.json({ ok: true, result });
}

// ---------- GET: list posts for a client ----------
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, caption, hashtags, status, scheduled_for, posted_at, platform_post_url, error_message,
      social_account:social_accounts!inner(platform, account_name, client_id),
      content_item:content_items(thumbnail_url, asset_url, type)
    `)
    .eq("social_account.client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

// ---------- DELETE: disconnect a social account ----------
export async function DELETE(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { error } = await supabase.from("social_accounts").delete().eq("id", accountId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
