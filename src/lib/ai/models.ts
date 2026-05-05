/**
 * kie.ai model catalog. Each entry tells the generator three things:
 *   - which POST endpoint to hit
 *   - which GET endpoint to poll for status
 *   - how to build the request body from a single prompt string
 *
 * The cost hints are credit-tier indicators only (kie.ai uses a credit
 * system; see https://kie.ai/pricing). Add or remove models freely.
 */

export interface ModelOption {
  id: string;
  /** Vendor identifier for display (e.g. "google/veo-3-1-fast"). */
  slug: string;
  label: string;
  description: string;
  type: "image" | "video";
  /** UI hint about cost — relative ("low/mid/high") since kie.ai is credit-based. */
  costHint: string;
  /** kie.ai POST endpoint that creates the task. */
  generateEndpoint: string;
  /** kie.ai GET endpoint that returns task status + result URLs. */
  statusEndpoint: string;
  /** Build request body from a single user prompt. */
  buildBody: (prompt: string) => Record<string, unknown>;
}

// =========================================================================
// IMAGE MODELS
// =========================================================================

export const IMAGE_MODELS: ModelOption[] = [
  {
    id: "4o-image",
    slug: "openai/gpt-4o-image",
    label: "GPT-4o Image",
    description: "Best for ad copy with text inside the image. Strong typography.",
    type: "image",
    costHint: "mid · ~$0.04",
    generateEndpoint: "/api/v1/gpt4o-image/generate",
    statusEndpoint: "/api/v1/gpt4o-image/record-info",
    buildBody: (prompt) => ({
      prompt,
      size: "1:1",
      isEnhance: false,
    }),
  },
  {
    id: "nano-banana",
    slug: "google/nano-banana",
    label: "Nano Banana",
    description: "Fast Google model. Great consistency, photorealistic.",
    type: "image",
    costHint: "low · ~$0.02",
    generateEndpoint: "/api/v1/jobs/createTask",
    statusEndpoint: "/api/v1/jobs/recordInfo",
    buildBody: (prompt) => ({
      model: "google/nano-banana",
      input: { prompt, output_format: "png", image_size: "1:1" },
    }),
  },
  {
    id: "flux-kontext-pro",
    slug: "black-forest-labs/flux-kontext-pro",
    label: "Flux Kontext Pro",
    description: "Editorial fidelity. Strong subject consistency across shots.",
    type: "image",
    costHint: "mid",
    generateEndpoint: "/api/v1/flux/kontext/generate",
    statusEndpoint: "/api/v1/flux/kontext/record-info",
    buildBody: (prompt) => ({
      prompt,
      aspectRatio: "1:1",
      model: "flux-kontext-pro",
      enableTranslation: true,
      outputFormat: "png",
    }),
  },
  {
    id: "seedream-4",
    slug: "bytedance/seedream-4",
    label: "Seedream 4.0",
    description: "Bytedance text-to-image. Vivid, balanced compositions.",
    type: "image",
    costHint: "low",
    generateEndpoint: "/api/v1/jobs/createTask",
    statusEndpoint: "/api/v1/jobs/recordInfo",
    buildBody: (prompt) => ({
      model: "bytedance/seedream-v4-text-to-image",
      input: { prompt, image_size: "1024x1024" },
    }),
  },
  {
    id: "imagen4",
    slug: "google/imagen-4",
    label: "Imagen 4",
    description: "Google's flagship image model. High realism, broad style range.",
    type: "image",
    costHint: "mid",
    generateEndpoint: "/api/v1/jobs/createTask",
    statusEndpoint: "/api/v1/jobs/recordInfo",
    buildBody: (prompt) => ({
      model: "google/imagen4",
      input: { prompt, aspect_ratio: "1:1" },
    }),
  },
  {
    id: "ideogram-v3",
    slug: "ideogram/v3-text-to-image",
    label: "Ideogram V3",
    description: "Best-in-class for text rendering inside the image.",
    type: "image",
    costHint: "mid",
    generateEndpoint: "/api/v1/jobs/createTask",
    statusEndpoint: "/api/v1/jobs/recordInfo",
    buildBody: (prompt) => ({
      model: "ideogram/v3-text-to-image",
      input: { prompt, aspect_ratio: "1:1", style_type: "AUTO" },
    }),
  },
];

// =========================================================================
// VIDEO MODELS
// =========================================================================

export const VIDEO_MODELS: ModelOption[] = [
  {
    id: "veo-3-fast",
    slug: "google/veo-3-1-fast",
    label: "Veo 3.1 Fast",
    description: "Google Veo 3.1 with native audio. 9:16 vertical. Cost-efficient.",
    type: "video",
    costHint: "high",
    generateEndpoint: "/api/v1/veo/generate",
    statusEndpoint: "/api/v1/veo/record-info",
    buildBody: (prompt) => ({
      prompt,
      model: "veo3_fast",
      aspect_ratio: "9:16",
      enableTranslation: true,
      generationType: "TEXT_2_VIDEO",
    }),
  },
  {
    id: "veo-3-quality",
    slug: "google/veo-3-1",
    label: "Veo 3.1 Quality",
    description: "Flagship quality with sound. Cinematic motion. Slower & pricier.",
    type: "video",
    costHint: "very high",
    generateEndpoint: "/api/v1/veo/generate",
    statusEndpoint: "/api/v1/veo/record-info",
    buildBody: (prompt) => ({
      prompt,
      model: "veo3",
      aspect_ratio: "9:16",
      enableTranslation: true,
      generationType: "TEXT_2_VIDEO",
    }),
  },
  {
    id: "kling-3",
    slug: "kling/v3",
    label: "Kling 3.0",
    description: "Smooth motion, strong product close-ups. 5s clips.",
    type: "video",
    costHint: "mid",
    generateEndpoint: "/api/v1/jobs/createTask",
    statusEndpoint: "/api/v1/jobs/recordInfo",
    buildBody: (prompt) => ({
      model: "kling/kling-3-0",
      input: { prompt, duration: 5, aspect_ratio: "9:16" },
    }),
  },
  {
    id: "seedance-2",
    slug: "bytedance/seedance-2",
    label: "Seedance 2.0",
    description: "Bytedance's fast video model. Vivid colours, dance-worthy.",
    type: "video",
    costHint: "mid",
    generateEndpoint: "/api/v1/jobs/createTask",
    statusEndpoint: "/api/v1/jobs/recordInfo",
    buildBody: (prompt) => ({
      model: "bytedance/seedance-2",
      input: { prompt, aspect_ratio: "9:16", duration: 5 },
    }),
  },
  {
    id: "hailuo-pro",
    slug: "hailuo/02-pro-text-to-video",
    label: "Hailuo Pro",
    description: "Minimax Hailuo. Excellent motion, good prompt adherence.",
    type: "video",
    costHint: "mid",
    generateEndpoint: "/api/v1/jobs/createTask",
    statusEndpoint: "/api/v1/jobs/recordInfo",
    buildBody: (prompt) => ({
      model: "hailuo/02-text-to-video-pro",
      input: { prompt, duration: 6, resolution: "768p" },
    }),
  },
  {
    id: "sora-2",
    slug: "openai/sora-2",
    label: "Sora 2",
    description: "OpenAI Sora 2 text-to-video. Strong storytelling.",
    type: "video",
    costHint: "high",
    generateEndpoint: "/api/v1/jobs/createTask",
    statusEndpoint: "/api/v1/jobs/recordInfo",
    buildBody: (prompt) => ({
      model: "sora2/sora-2-text-to-video",
      input: { prompt, aspect_ratio: "9:16" },
    }),
  },
];

export function getModelById(id: string): ModelOption | undefined {
  return [...IMAGE_MODELS, ...VIDEO_MODELS].find((m) => m.id === id);
}
