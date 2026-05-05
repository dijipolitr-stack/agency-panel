/**
 * Scheduled-publish cron endpoint.
 *
 * Configure your cron platform (e.g. Vercel Cron, GitHub Actions, EasyCron)
 * to hit this URL every 5 minutes with header:
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Vercel Cron config (vercel.json):
 *   { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "*\/5 * * * *" }] }
 *
 * Uses the service-role Supabase client to bypass RLS — only ever called
 * server-side and authorised via the bearer secret.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { publishToInstagram } from "@/lib/social/instagram";
import { publishToTikTok } from "@/lib/social/tiktok";
import { env } from "@/lib/env";
import type { PublishRequest, PublishResult } from "@/lib/social/types";
import type { SocialPlatform } from "@/types/database";

export const maxDuration = 300; // up to 5 min

export async function GET(req: NextRequest) {
  // Authenticate the cron caller
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${env.cron.secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  // Pull due posts
  const { data: due, error } = await supabase
    .from("posts")
    .select(`
      id, caption, hashtags,
      content_item:content_items!inner(type, asset_url),
      social_account:social_accounts!inner(platform, account_id, access_token)
    `)
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const post of due) {
    const ci = post.content_item as { type: "image" | "video"; asset_url: string | null } | null;
    const sa = post.social_account as
      | { platform: SocialPlatform; account_id: string; access_token: string }
      | null;
    if (!ci?.asset_url || !sa) {
      results.push({ id: post.id, ok: false, error: "Missing media or account" });
      await supabase
        .from("posts")
        .update({ status: "failed", error_message: "Missing media or account" })
        .eq("id", post.id);
      continue;
    }

    await supabase.from("posts").update({ status: "publishing" }).eq("id", post.id);

    const fullCaption = [
      post.caption,
      ((post.hashtags as string[]) ?? []).join(" "),
    ].filter(Boolean).join("\n\n");

    const req: PublishRequest = {
      accessToken: sa.access_token,
      accountId: sa.account_id,
      mediaUrl: ci.asset_url,
      mediaType: ci.type,
      caption: fullCaption,
    };

    try {
      const result: PublishResult =
        sa.platform === "instagram"
          ? await publishToInstagram(req)
          : await publishToTikTok(req);

      await supabase
        .from("posts")
        .update({
          status: "published",
          posted_at: new Date().toISOString(),
          platform_post_id: result.platformPostId,
          platform_post_url: result.platformPostUrl ?? null,
          error_message: null,
        })
        .eq("id", post.id);

      results.push({ id: post.id, ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Publish failed";
      await supabase
        .from("posts")
        .update({ status: "failed", error_message: message })
        .eq("id", post.id);
      results.push({ id: post.id, ok: false, error: message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
