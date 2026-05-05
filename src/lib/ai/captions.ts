import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

export interface CaptionRequest {
  /** What's in the image/video. */
  productDescription: string;
  /** Brand voice cues (e.g. "playful, witty, gen-z"). */
  brandVoice?: string;
  /** Brand keywords to weave in (sparingly). */
  brandKeywords?: string[];
  /** Target platform — caption length differs. */
  platform: "instagram" | "tiktok";
}

export interface CaptionResult {
  caption: string;
  hashtags: string[];
  mocked: boolean;
}

export async function generateCaption(req: CaptionRequest): Promise<CaptionResult> {
  if (!env.anthropic.isLive) {
    return mockCaption(req);
  }

  const client = new Anthropic({ apiKey: env.anthropic.apiKey! });

  const lengthHint =
    req.platform === "instagram"
      ? "1–3 sentences, friendly and scroll-stopping"
      : "1–2 short punchy sentences plus a hook";

  const system = `You write social media captions for a marketing agency. You write in the brand's voice, never use emoji unless the voice calls for it, and avoid hashtag stuffing in the caption body. Output STRICT JSON, no preamble.`;

  const user = `Write a ${req.platform} caption for the following content.

Content: ${req.productDescription}
Brand voice: ${req.brandVoice ?? "professional, warm"}
Brand keywords (use 0–2 only if natural): ${(req.brandKeywords ?? []).join(", ") || "none"}
Length: ${lengthHint}

Return JSON of the form:
{"caption": "<text>", "hashtags": ["#tag1", "#tag2", ... up to 8 tags, all lowercase, no spaces]}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 600,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const json = extractJson(text);
  if (!json) {
    return mockCaption(req);
  }

  return {
    caption: typeof json.caption === "string" ? json.caption : "",
    hashtags: Array.isArray(json.hashtags) ? json.hashtags.map(String) : [],
    mocked: false,
  };
}

function extractJson(text: string): { caption?: unknown; hashtags?: unknown } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function mockCaption(req: CaptionRequest): CaptionResult {
  const tone = (req.brandVoice ?? "warm").split(",")[0].trim();
  const baseTags = ["#brand", "#newdrop", "#design", "#aesthetic", "#lifestyle", "#mood"];
  const kw = (req.brandKeywords ?? []).map((k) => `#${k.toLowerCase().replace(/\s+/g, "")}`);
  const captions: Record<typeof req.platform, string> = {
    instagram: `Built for the way you move. ${req.productDescription}. ${tone} energy, every detail considered.`,
    tiktok: `POV: you finally found it. ${req.productDescription} — and it hits different.`,
  };
  return {
    caption: captions[req.platform],
    hashtags: [...kw, ...baseTags].slice(0, 8),
    mocked: true,
  };
}
