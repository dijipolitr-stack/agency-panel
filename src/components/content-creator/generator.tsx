"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Sparkles, Wand2, Copy, Check, Loader2, Image as ImageIcon, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Card, CardBody, CardLabel } from "@/components/ui/card";
import { ContentStatusBadge } from "@/components/ui/badge";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/ai/models";
import { cn, relativeTime } from "@/lib/utils";

interface ProjectOption {
  id: string;
  title: string;
}

interface ContentItemRow {
  id: string;
  type: "image" | "video";
  prompt: string;
  asset_url: string | null;
  thumbnail_url: string | null;
  status: "pending" | "generating" | "ready" | "failed";
  model: string | null;
  created_at: string;
  project_id: string;
}

interface GeneratorProps {
  clientId: string;
  brandVoice: string | null;
  brandKeywords: string[];
  projects: ProjectOption[];
  initialContent: ContentItemRow[];
  defaultProjectId?: string;
}

export function ContentGenerator({
  clientId,
  brandVoice,
  brandKeywords,
  projects,
  initialContent,
  defaultProjectId,
}: GeneratorProps) {
  const [type, setType] = useState<"image" | "video">("image");
  const [modelId, setModelId] = useState(IMAGE_MODELS[0].id);
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [items, setItems] = useState<ContentItemRow[]>(initialContent);
  const [, startTransition] = useTransition();

  const models = type === "image" ? IMAGE_MODELS : VIDEO_MODELS;
  const selectedModel = models.find((m) => m.id === modelId) ?? models[0];

  function handleTypeChange(t: "image" | "video") {
    setType(t);
    setModelId(t === "image" ? IMAGE_MODELS[0].id : VIDEO_MODELS[0].id);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      setError("Pick a project first.");
      return;
    }
    if (prompt.trim().length < 4) {
      setError("Prompt is too short.");
      return;
    }
    setError(null);
    setIsGenerating(true);

    try {
      const res = await fetch(`/api/ai/generate-${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, modelId, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      // Prepend new item
      setItems((prev) => [data.item, ...prev]);
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <header className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral">⊹ Atelier</div>
        <h2 className="font-display text-4xl tracking-tightest mt-1">
          Create <span className="font-display-italic text-coral">visuals</span>
        </h2>
        <p className="text-ink-300 text-sm mt-1">
          Brief the model. We&rsquo;ll keep everything tied to a project so it&rsquo;s easy to schedule.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
        {/* Left — generator form */}
        <Card className="lg:sticky lg:top-20 self-start">
          <CardBody>
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Type toggle */}
              <div>
                <CardLabel className="mb-2">Type</CardLabel>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange("image")}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm transition-all",
                      type === "image"
                        ? "bg-coral/10 border-coral/40 text-coral"
                        : "border-ink-600 text-ink-300 hover:border-ink-400",
                    )}
                  >
                    <ImageIcon size={14} /> Image
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("video")}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm transition-all",
                      type === "video"
                        ? "bg-coral/10 border-coral/40 text-coral"
                        : "border-ink-600 text-ink-300 hover:border-ink-400",
                    )}
                  >
                    <Film size={14} /> Video
                  </button>
                </div>
              </div>

              {/* Model */}
              <Field label="Model" htmlFor="model" hint={selectedModel.description}>
                <Select id="model" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.costHint}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Project */}
              <Field label="Project" htmlFor="project" hint="Where this content belongs.">
                {projects.length > 0 ? (
                  <Select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </Select>
                ) : (
                  <Input value="No projects — create one in Kanban first" disabled />
                )}
              </Field>

              {/* Prompt */}
              <Field
                label="Brief"
                htmlFor="prompt"
                hint={
                  brandVoice
                    ? `Brand voice: ${brandVoice}. Be specific about mood, lighting, composition.`
                    : "Be specific about mood, lighting, composition."
                }
              >
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  placeholder={
                    type === "image"
                      ? "A minimalist hero shot of the product on warm cream marble, soft window light from the left, gentle shadow, editorial style, shot on medium format film..."
                      : "A slow 5-second push-in on the product, golden hour light, dust motes drifting, cinematic anamorphic lens..."
                  }
                  required
                />
              </Field>

              {brandKeywords.length > 0 && (
                <div className="text-xs text-ink-400">
                  <CardLabel className="mb-1.5">Brand keywords (steers captions)</CardLabel>
                  <div className="flex gap-1 flex-wrap">
                    {brandKeywords.map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full bg-ink-700 border border-ink-600 text-[11px]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-400 border border-red-900/50 bg-red-950/30 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isGenerating || !projectId} className="w-full" size="lg">
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate
                  </>
                )}
              </Button>

              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500 pt-2 text-center">
                ⊹ Generations save to the project automatically
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Right — gallery */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-xl tracking-tight">Recent generations</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardBody className="py-16 text-center">
                <div className="font-display italic text-ink-300 text-lg">
                  Nothing here yet.
                </div>
                <div className="text-xs text-ink-400 mt-1">Brief the model on the left to begin.</div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((item) => (
                <ContentTile key={item.id} item={item} clientId={clientId} brandVoice={brandVoice} brandKeywords={brandKeywords} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentTile({
  item,
  brandVoice,
  brandKeywords,
}: {
  item: ContentItemRow;
  clientId: string;
  brandVoice: string | null;
  brandKeywords: string[];
}) {
  const [caption, setCaption] = useState<{ text: string; tags: string[] } | null>(null);
  const [loadingCaption, setLoadingCaption] = useState<"instagram" | "tiktok" | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateCaption(platform: "instagram" | "tiktok") {
    setLoadingCaption(platform);
    try {
      const res = await fetch("/api/ai/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentItemId: item.id,
          platform,
          brandVoice,
          brandKeywords,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCaption({ text: data.caption, tags: data.hashtags });
      }
    } finally {
      setLoadingCaption(null);
    }
  }

  function copyCaption() {
    if (!caption) return;
    const text = `${caption.text}\n\n${caption.tags.join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-ink-700 overflow-hidden">
        {item.asset_url ? (
          item.type === "image" ? (
            <Image
              src={item.asset_url}
              alt={item.prompt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <video
              src={item.asset_url}
              poster={item.thumbnail_url ?? undefined}
              controls
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="absolute inset-0 shimmer" />
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <ContentStatusBadge status={item.status} />
          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-ink-900/70 backdrop-blur text-ink-100 border border-ink-600">
            {item.type}
          </span>
        </div>
      </div>

      <CardBody className="space-y-3 flex-1 flex flex-col">
        <p className="text-xs text-ink-200 line-clamp-2 leading-relaxed flex-1">{item.prompt}</p>

        <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">
          {item.model?.split("/")[1] ?? "—"} · {relativeTime(item.created_at)}
        </div>

        {!caption && (
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateCaption("instagram")}
              disabled={loadingCaption !== null}
            >
              {loadingCaption === "instagram" ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              IG caption
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateCaption("tiktok")}
              disabled={loadingCaption !== null}
            >
              {loadingCaption === "tiktok" ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              TikTok caption
            </Button>
          </div>
        )}

        {caption && (
          <div className="space-y-2 p-3 rounded-md bg-ink-800 border border-ink-600">
            <p className="text-xs text-ink-100 leading-relaxed">{caption.text}</p>
            <div className="flex gap-1 flex-wrap">
              {caption.tags.map((t, i) => (
                <span key={i} className="text-[10px] text-coral-300">{t}</span>
              ))}
            </div>
            <button
              onClick={copyCaption}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-400 hover:text-coral transition-colors"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? "Copied" : "Copy caption + tags"}
            </button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
