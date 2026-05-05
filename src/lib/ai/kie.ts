/**
 * kie.ai integration.
 *
 * kie.ai is async-first: every generation endpoint returns a `taskId`,
 * then we poll a `record-info` endpoint until the task completes.
 *
 * kie.ai uses two response conventions:
 *   - /veo/, /gpt4o-image/, /flux/  → numeric `successFlag` (0/1/2/3),
 *     URLs nested inside `data.response.resultUrls`.
 *   - /jobs/recordInfo (unified)    → string `state` ("success"/"fail"/...),
 *     URLs in `data.resultJson` as a JSON-encoded STRING.
 * This file handles both transparently.
 *
 * The catalog in `models.ts` declares each model's endpoint and how to
 * shape the request body — this file knows nothing model-specific. That
 * keeps the rest of the app provider-agnostic: the API route just calls
 * `generateAsset({ modelId, prompt })` regardless of vendor.
 *
 * Falls back to deterministic mocks when KIE_API_KEY is unset.
 *
 * Docs: https://docs.kie.ai
 */

import { env } from "@/lib/env";
import { getModelById, type ModelOption } from "@/lib/ai/models";

const KIE_BASE = "https://api.kie.ai";

export interface GenerationRequest {
  modelId: string;
  prompt: string;
  /** Optional overrides merged into the model's default body. */
  inputOverrides?: Record<string, unknown>;
}

export interface GenerationResult {
  url: string;
  thumbnailUrl?: string;
  modelSlug: string;
  /** True when this came from the local mock provider, not kie.ai. */
  mocked: boolean;
}

interface KieCreateResponse {
  code: number;
  msg?: string;
  data?: { taskId?: string };
}

interface KieRecordInfo {
  code: number;
  msg?: string;
  data?: {
    taskId?: string;
    /** Used by /veo/, /gpt4o-image/, /flux/ endpoints. 0=processing, 1=success, 2/3=failed. */
    successFlag?: 0 | 1 | 2 | 3;
    /** Used by the unified /jobs/recordInfo endpoint. */
    state?: "waiting" | "queuing" | "generating" | "success" | "fail";
    errorCode?: string | null;
    errorMessage?: string | null;
    failCode?: string | null;
    failMsg?: string | null;
    /** /jobs/recordInfo wraps the result list as a JSON-encoded STRING. */
    resultJson?: string;
    /** Older endpoints inline a richer response object. */
    response?: {
      resultUrls?: string[];
      originUrls?: string[];
      fullResultUrls?: string[];
      resolution?: string;
    };
    resultUrls?: string[];
    response_data?: { resultUrls?: string[] };
  };
}

export async function generateAsset(req: GenerationRequest): Promise<GenerationResult> {
  const model = getModelById(req.modelId);
  if (!model) throw new Error(`Unknown model: ${req.modelId}`);

  if (!env.kie.isLive) {
    return mockGeneration(model, req.prompt);
  }

  const body = { ...model.buildBody(req.prompt), ...req.inputOverrides };
  const taskId = await createTask(model.generateEndpoint, body);
  const url = await pollForResult(model.statusEndpoint, taskId, model.type);

  return {
    url,
    thumbnailUrl: model.type === "image" ? url : undefined,
    modelSlug: model.slug,
    mocked: false,
  };
}

async function createTask(path: string, body: unknown): Promise<string> {
  const res = await fetch(`${KIE_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.kie.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`kie.ai create task failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as KieCreateResponse;
  if (json.code !== 200 || !json.data?.taskId) {
    throw new Error(`kie.ai error: ${json.msg ?? "no taskId returned"}`);
  }
  return json.data.taskId;
}

async function pollForResult(
  path: string,
  taskId: string,
  type: "image" | "video",
  // Image jobs usually finish in ~30s, video in 2-5 min, but Veo 3.1 / Sora 2
  // can take much longer on their first warm-up. Cap generously.
  maxAttempts: number = type === "image" ? 100 : 240, // ~5 min image, ~12 min video
  intervalMs: number = 3000,
): Promise<string> {
  let lastStatus: string | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(`${KIE_BASE}${path}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${env.kie.apiKey}` },
    });
    if (!res.ok) {
      // Transient errors are common during long video jobs — retry quietly.
      if (res.status >= 500) continue;
      throw new Error(`kie.ai poll failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as KieRecordInfo;
    const data = json.data;
    if (!data) continue;

    // kie.ai uses two different status conventions depending on endpoint:
    //   /veo/, /gpt4o-image/, /flux/  → numeric `successFlag`
    //   /jobs/recordInfo (unified)    → string `state`
    const isSuccess = data.successFlag === 1 || data.state === "success";
    const isFailure =
      data.successFlag === 2 || data.successFlag === 3 || data.state === "fail";
    lastStatus = data.state ?? (data.successFlag !== undefined ? `flag=${data.successFlag}` : undefined);

    if (isSuccess) {
      const url = extractUrl(data);
      if (!url) {
        throw new Error(
          `kie.ai task ${taskId} succeeded but no URL was found. Raw response: ${JSON.stringify(data).slice(0, 500)}`,
        );
      }
      return url;
    }

    if (isFailure) {
      const reason =
        data.errorMessage ||
        data.failMsg ||
        data.errorCode ||
        data.failCode ||
        "unknown";
      throw new Error(`kie.ai task failed: ${reason}`);
    }
    // Otherwise still generating (waiting / queuing / generating / flag=0)
  }
  const elapsedMin = Math.round((maxAttempts * intervalMs) / 60000);
  throw new Error(
    `kie.ai task ${taskId} did not complete within ${elapsedMin} minutes ` +
      `(last status: ${lastStatus ?? "unknown"}). The task may still finish on kie.ai's ` +
      `side — check https://kie.ai/logs and try again with a simpler prompt or different model.`,
  );
}

function extractUrl(data: NonNullable<KieRecordInfo["data"]>): string | null {
  // The unified /jobs/recordInfo endpoint encodes the result as a JSON string.
  if (typeof data.resultJson === "string" && data.resultJson.length > 0) {
    try {
      const parsed = JSON.parse(data.resultJson) as {
        resultUrls?: string[];
        originUrls?: string[];
      };
      const url = parsed.resultUrls?.[0] ?? parsed.originUrls?.[0];
      if (typeof url === "string" && url.length > 0) return url;
    } catch {
      // fall through to other shapes
    }
  }

  // Veo / GPT-4o image / Flux Kontext shapes — URLs nested inside `response`.
  const candidates = [
    data.response?.resultUrls?.[0],
    data.response?.fullResultUrls?.[0],
    data.response?.originUrls?.[0],
    data.resultUrls?.[0],
    data.response_data?.resultUrls?.[0],
  ];
  return candidates.find((u): u is string => typeof u === "string" && u.length > 0) ?? null;
}

/** Deterministic mock — Picsum for images, public sample for video. */
function mockGeneration(model: ModelOption, prompt: string): GenerationResult {
  const seed = hash(prompt + model.id);
  if (model.type === "image") {
    const url = `https://picsum.photos/seed/${seed}/1024/1024`;
    return { url, thumbnailUrl: url, modelSlug: model.slug, mocked: true };
  }
  const samples = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  ];
  const url = samples[seed % samples.length];
  const thumbnailUrl = `https://picsum.photos/seed/${seed}/720/1280`;
  return { url, thumbnailUrl, modelSlug: model.slug, mocked: true };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
