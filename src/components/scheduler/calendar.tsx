"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Send, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Card, CardBody, CardLabel } from "@/components/ui/card";
import { PostStatusBadge } from "@/components/ui/badge";
import { formatDateTime, relativeTime, cn } from "@/lib/utils";
import type { PostStatus, SocialPlatform } from "@/types/database";

interface ContentOption {
  id: string;
  type: "image" | "video";
  asset_url: string | null;
  thumbnail_url: string | null;
  prompt: string;
  project_title: string;
}

interface SocialOption {
  id: string;
  platform: SocialPlatform;
  account_name: string;
}

interface PostRow {
  id: string;
  caption: string | null;
  hashtags: string[];
  status: PostStatus;
  scheduled_for: string | null;
  posted_at: string | null;
  platform_post_url: string | null;
  error_message: string | null;
  social_account: { platform: SocialPlatform; account_name: string } | null;
  content_item: { thumbnail_url: string | null; asset_url: string | null; type: "image" | "video" } | null;
}

interface SchedulerProps {
  clientId: string;
  contentOptions: ContentOption[];
  socialAccounts: SocialOption[];
  posts: PostRow[];
}

export function Scheduler({ clientId, contentOptions, socialAccounts, posts: initialPosts }: SchedulerProps) {
  const [posts, setPosts] = useState<PostRow[]>(initialPosts);
  const [contentId, setContentId] = useState(contentOptions[0]?.id ?? "");
  const [accountId, setAccountId] = useState(socialAccounts[0]?.id ?? "");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const selected = contentOptions.find((c) => c.id === contentId);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!contentId || !accountId) {
      setError("Pick content and an account.");
      return;
    }

    setSubmitting(true);
    try {
      const tags = hashtags
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          contentItemId: contentId,
          socialAccountId: accountId,
          caption,
          hashtags: tags,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Schedule failed");

      // Refresh posts list
      const refreshed = await fetch(`/api/social/publish?clientId=${clientId}`);
      const r = await refreshed.json();
      if (refreshed.ok) setPosts(r.posts);

      setCaption("");
      setHashtags("");
      setScheduledFor("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function publishNow(postId: string) {
    setPublishingId(postId);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", postId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");

      const refreshed = await fetch(`/api/social/publish?clientId=${clientId}`);
      const r = await refreshed.json();
      if (refreshed.ok) setPosts(r.posts);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishingId(null);
    }
  }

  // Group by day for the calendar view
  const grouped = groupByDay(posts.filter((p) => p.scheduled_for));

  return (
    <div className="px-8 py-8 max-w-7xl">
      <header className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral">⊹ Calendar</div>
        <h2 className="font-display text-4xl tracking-tightest mt-1">
          Schedule &amp; <span className="font-display-italic text-coral">publish</span>
        </h2>
        <p className="text-ink-300 text-sm mt-1">
          Pair generated content with a connected account, write the caption, set the time.
        </p>
      </header>

      {socialAccounts.length === 0 || contentOptions.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-coral mx-auto" />
            <p className="font-display text-xl italic text-ink-200">
              {socialAccounts.length === 0
                ? "Connect a social account first."
                : "Generate some content first."}
            </p>
            <p className="text-sm text-ink-400">
              {socialAccounts.length === 0 ? (
                <Link href={`/clients/${clientId}/social`} className="text-coral underline">
                  Open connections →
                </Link>
              ) : (
                <Link href={`/clients/${clientId}/content`} className="text-coral underline">
                  Open creator →
                </Link>
              )}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
          {/* Schedule form */}
          <Card className="lg:sticky lg:top-20 self-start">
            <CardBody>
              <form onSubmit={handleSchedule} className="space-y-5">
                <Field label="Content" htmlFor="content">
                  <Select id="content" value={contentId} onChange={(e) => setContentId(e.target.value)}>
                    {contentOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.project_title} — {c.type} · {c.prompt.slice(0, 50)}
                      </option>
                    ))}
                  </Select>
                </Field>

                {selected && selected.thumbnail_url && (
                  <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-md overflow-hidden bg-ink-700">
                    <Image
                      src={selected.thumbnail_url}
                      alt=""
                      fill
                      sizes="200px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}

                <Field label="Account" htmlFor="account">
                  <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    {socialAccounts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.account_name} ({s.platform})
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Caption" htmlFor="caption">
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={4}
                    placeholder="Write your caption or paste one from the creator..."
                  />
                </Field>

                <Field
                  label="Hashtags"
                  htmlFor="hashtags"
                  hint="Separated by spaces or commas. # is optional."
                >
                  <Input
                    id="hashtags"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="craft slowcoffee newdrop"
                  />
                </Field>

                <Field
                  label="When"
                  htmlFor="scheduledFor"
                  hint="Leave empty to save as draft. Set a time to schedule."
                >
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                </Field>

                {error && (
                  <div className="text-xs text-red-400 border border-red-900/50 bg-red-950/30 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={submitting} className="w-full" size="lg">
                  {submitting ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving...</>
                  ) : scheduledFor ? (
                    <><Calendar size={14} /> Schedule</>
                  ) : (
                    <><Send size={14} /> Save as draft</>
                  )}
                </Button>
              </form>
            </CardBody>
          </Card>

          {/* Posts feed */}
          <div className="space-y-6">
            <PostsSection title="Scheduled" posts={Object.entries(grouped)} publishNow={publishNow} publishingId={publishingId} />
            <DraftsSection posts={posts.filter((p) => p.status === "draft")} publishNow={publishNow} publishingId={publishingId} />
            <HistorySection posts={posts.filter((p) => p.status === "published" || p.status === "failed")} />
          </div>
        </div>
      )}
    </div>
  );
}

function groupByDay(posts: PostRow[]): Record<string, PostRow[]> {
  const out: Record<string, PostRow[]> = {};
  for (const p of posts) {
    if (!p.scheduled_for) continue;
    const key = new Date(p.scheduled_for).toDateString();
    (out[key] ??= []).push(p);
  }
  // Sort each day's posts by time
  for (const day of Object.keys(out)) {
    out[day].sort(
      (a, b) =>
        new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime(),
    );
  }
  return out;
}

function PostsSection({
  title,
  posts,
  publishNow,
  publishingId,
}: {
  title: string;
  posts: [string, PostRow[]][];
  publishNow: (id: string) => void;
  publishingId: string | null;
}) {
  if (posts.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-xl tracking-tight">{title}</h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
          {posts.reduce((a, [, ps]) => a + ps.length, 0)} posts
        </span>
      </div>
      {posts.map(([day, ps]) => (
        <div key={day} className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-coral pl-1">
            {new Date(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          {ps.map((p) => (
            <PostCard key={p.id} post={p} publishNow={publishNow} publishing={publishingId === p.id} />
          ))}
        </div>
      ))}
    </section>
  );
}

function DraftsSection({
  posts,
  publishNow,
  publishingId,
}: {
  posts: PostRow[];
  publishNow: (id: string) => void;
  publishingId: string | null;
}) {
  if (posts.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-xl tracking-tight">Drafts</h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">{posts.length}</span>
      </div>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} publishNow={publishNow} publishing={publishingId === p.id} />
      ))}
    </section>
  );
}

function HistorySection({ posts }: { posts: PostRow[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-xl tracking-tight">History</h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">{posts.length}</span>
      </div>
      {posts.slice(0, 10).map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </section>
  );
}

function PostCard({
  post,
  publishNow,
  publishing,
}: {
  post: PostRow;
  publishNow?: (id: string) => void;
  publishing?: boolean;
}) {
  const ci = post.content_item;
  const sa = post.social_account;
  return (
    <div className="flex gap-3 p-3 rounded-md bg-ink-700/30 border border-ink-600 hover:border-ink-400 transition-colors">
      <div className="relative w-16 h-16 rounded bg-ink-700 overflow-hidden shrink-0">
        {ci?.thumbnail_url || ci?.asset_url ? (
          <Image
            src={ci.thumbnail_url ?? ci.asset_url ?? ""}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-100 truncate">{sa?.account_name}</span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-ink-400">
            {sa?.platform}
          </span>
          <PostStatusBadge status={post.status} />
        </div>
        {post.caption && (
          <p className="text-xs text-ink-200 line-clamp-2 mt-1 leading-relaxed">{post.caption}</p>
        )}
        <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mt-1.5 flex items-center gap-2">
          <Clock size={10} />
          {post.posted_at
            ? `Posted ${relativeTime(post.posted_at)}`
            : post.scheduled_for
            ? formatDateTime(post.scheduled_for)
            : "Draft"}
          {post.platform_post_url && (
            <a
              href={post.platform_post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-coral hover:underline ml-auto flex items-center gap-1"
            >
              View <ExternalLink size={9} />
            </a>
          )}
        </div>
        {post.error_message && (
          <div className="text-[10px] text-red-400 mt-1 italic">{post.error_message}</div>
        )}
      </div>
      {(post.status === "draft" || post.status === "scheduled" || post.status === "failed") && publishNow && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => publishNow(post.id)}
          disabled={publishing}
          className={cn("self-start")}
        >
          {publishing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {publishing ? "Posting" : "Post now"}
        </Button>
      )}
    </div>
  );
}
