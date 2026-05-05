import * as React from "react";
import { cn } from "@/lib/utils";
import type { ProjectStatus, PostStatus, ContentStatus } from "@/types/database";

type Tone = "neutral" | "coral" | "sage" | "amber" | "blue" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-700 text-ink-200 border-ink-600",
  coral: "bg-coral/15 text-coral-300 border-coral/30",
  sage: "bg-sage-500/15 text-sage-400 border-sage-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  red: "bg-red-500/15 text-red-300 border-red-500/30",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-[10px] font-mono uppercase tracking-[0.15em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const projectStatusTone: Record<ProjectStatus, Tone> = {
  idea: "neutral",
  production: "amber",
  review: "blue",
  scheduled: "coral",
  published: "sage",
  archived: "neutral",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={projectStatusTone[status]}>{status}</Badge>;
}

const postStatusTone: Record<PostStatus, Tone> = {
  draft: "neutral",
  scheduled: "coral",
  publishing: "amber",
  published: "sage",
  failed: "red",
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return <Badge tone={postStatusTone[status]}>{status}</Badge>;
}

const contentStatusTone: Record<ContentStatus, Tone> = {
  pending: "neutral",
  generating: "amber",
  ready: "sage",
  failed: "red",
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return <Badge tone={contentStatusTone[status]}>{status}</Badge>;
}
