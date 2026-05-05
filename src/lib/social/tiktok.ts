/**
 * TikTok Content Posting API integration.
 *
 * Real flow:
 *   1. OAuth via tiktokapis.com → access_token, refresh_token, open_id.
 *   2. To publish a video: POST /v2/post/publish/video/init/ with the
 *      source = PULL_FROM_URL pointing at our hosted asset, then poll
 *      /v2/post/publish/status/fetch/ until publication completes.
 *   3. Photos go through the photo init endpoint similarly.
 *
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 *
 * Note: TikTok requires the app to be approved for the relevant scopes.
 * Until then, "direct post" only works for the developer's own account.
 */

import { env } from "@/lib/env";
import type {
  OAuthCallbackResult,
  OAuthStartResult,
  PublishRequest,
  PublishResult,
} from "@/lib/social/types";

const TT_OAUTH_AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize/";
const TT_OAUTH_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const TT_API = "https://open.tiktokapis.com/v2";

// ---------- OAuth ----------

export function getOAuthStartUrl(redirectUri: string, state: string): OAuthStartResult {
  if (!env.tiktok.isLive) {
    const mockUrl = new URL("/api/social/tiktok/callback", env.appUrl);
    mockUrl.searchParams.set("code", "mock_tt_code");
    mockUrl.searchParams.set("state", state);
    return { url: mockUrl.toString(), state };
  }

  const url = new URL(TT_OAUTH_AUTHORIZE);
  url.searchParams.set("client_key", env.tiktok.clientKey!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    ["user.info.basic", "video.publish", "video.upload"].join(","),
  );
  return { url: url.toString(), state };
}

export async function exchangeOAuthCode(
  code: string,
  redirectUri: string,
): Promise<OAuthCallbackResult> {
  if (!env.tiktok.isLive) {
    return {
      accessToken: "mock_tt_token",
      refreshToken: "mock_tt_refresh",
      accountId: "mock_open_id",
      accountName: "@mock_brand_tt",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: { mocked: true },
    };
  }

  const tokenRes = await fetch(TT_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: env.tiktok.clientKey!,
      client_secret: env.tiktok.clientSecret!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) throw new Error(`TikTok token exchange failed: ${await tokenRes.text()}`);
  const tok = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    open_id: string;
  };

  // Look up display name
  const userRes = await fetch(`${TT_API}/user/info/?fields=open_id,display_name,username`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const userJson = (await userRes.json()) as { data?: { user?: { display_name?: string; username?: string } } };
  const username = userJson.data?.user?.username ?? userJson.data?.user?.display_name ?? "tiktok_user";

  return {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
    accountId: tok.open_id,
    accountName: `@${username}`,
    expiresAt: new Date(Date.now() + tok.expires_in * 1000),
  };
}

// ---------- Publishing ----------

export async function publishToTikTok(req: PublishRequest): Promise<PublishResult> {
  if (!env.tiktok.isLive) {
    return {
      platformPostId: `mock_tt_${Date.now()}`,
      platformPostUrl: "https://tiktok.com/@mock/video/MOCK",
      mocked: true,
    };
  }

  const isVideo = req.mediaType === "video";
  const initEndpoint = isVideo
    ? `${TT_API}/post/publish/video/init/`
    : `${TT_API}/post/publish/content/init/`;

  const initBody = isVideo
    ? {
        post_info: {
          title: req.caption.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: req.mediaUrl,
        },
      }
    : {
        post_info: {
          title: req.caption.slice(0, 150),
          description: req.caption,
          privacy_level: "PUBLIC_TO_EVERYONE",
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_images: [req.mediaUrl],
          photo_cover_index: 0,
        },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      };

  const initRes = await fetch(initEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${req.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(initBody),
  });
  if (!initRes.ok) throw new Error(`TikTok publish init failed: ${await initRes.text()}`);
  const initJson = (await initRes.json()) as {
    data?: { publish_id?: string };
    error?: { code?: string; message?: string };
  };
  const publishId = initJson.data?.publish_id;
  if (!publishId) {
    throw new Error(`TikTok publish init: ${initJson.error?.message ?? "unknown error"}`);
  }

  const finalStatus = await pollPublishStatus(publishId, req.accessToken);

  return {
    platformPostId: publishId,
    platformPostUrl: finalStatus.publishedUrl,
    mocked: false,
  };
}

async function pollPublishStatus(
  publishId: string,
  accessToken: string,
  maxAttempts = 60,
): Promise<{ publishedUrl?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${TT_API}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const json = (await res.json()) as {
      data?: { status?: string; publicaly_available_post_id?: string[]; uploaded_bytes?: number };
      error?: { message?: string };
    };
    const status = json.data?.status;
    if (status === "PUBLISH_COMPLETE") {
      const id = json.data?.publicaly_available_post_id?.[0];
      return { publishedUrl: id ? `https://www.tiktok.com/video/${id}` : undefined };
    }
    if (status === "FAILED") {
      throw new Error(`TikTok publish failed: ${json.error?.message ?? "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("TikTok publish did not complete in time");
}
