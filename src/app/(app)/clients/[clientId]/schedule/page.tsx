import { createClient } from "@/lib/supabase/server";
import { Scheduler } from "@/components/scheduler/calendar";
import type { PostStatus, SocialPlatform } from "@/types/database";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [{ data: contentRows }, { data: socials }, { data: postRows }] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, type, asset_url, thumbnail_url, prompt, projects!inner(title, client_id)")
      .eq("status", "ready")
      .eq("projects.client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("social_accounts")
      .select("id, platform, account_name")
      .eq("client_id", clientId)
      .order("connected_at", { ascending: false }),
    supabase
      .from("posts")
      .select(`
        id, caption, hashtags, status, scheduled_for, posted_at, platform_post_url, error_message,
        social_account:social_accounts!inner(platform, account_name, client_id),
        content_item:content_items(thumbnail_url, asset_url, type)
      `)
      .eq("social_account.client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const contentOptions = (contentRows ?? []).map((c) => {
    const proj = c.projects as { title?: string } | null;
    return {
      id: c.id,
      type: c.type,
      asset_url: c.asset_url,
      thumbnail_url: c.thumbnail_url,
      prompt: c.prompt,
      project_title: proj?.title ?? "—",
    };
  });

  const posts = (postRows ?? []).map((p) => {
    const sa = p.social_account as { platform: SocialPlatform; account_name: string } | null;
    const ci = p.content_item as { thumbnail_url: string | null; asset_url: string | null; type: "image" | "video" } | null;
    return {
      id: p.id,
      caption: p.caption,
      hashtags: (p.hashtags as string[]) ?? [],
      status: p.status as PostStatus,
      scheduled_for: p.scheduled_for,
      posted_at: p.posted_at,
      platform_post_url: p.platform_post_url,
      error_message: p.error_message,
      social_account: sa,
      content_item: ci,
    };
  });

  return (
    <Scheduler
      clientId={clientId}
      contentOptions={contentOptions}
      socialAccounts={(socials ?? []).map((s) => ({ id: s.id, platform: s.platform, account_name: s.account_name }))}
      posts={posts}
    />
  );
}
