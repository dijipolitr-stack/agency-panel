/**
 * Instagram Graph API integration.
 *
 * Real flow (Instagram Business / Creator account required):
 *   1. User connects via Facebook Login → we receive a long-lived
 *      Page access token.
 *   2. We resolve the Instagram Business Account ID from the connected
 *      Facebook Page.
 *   3. To publish: create a media container (POST /{ig-user-id}/media),
 *      then publish it (POST /{ig-user-id}/media_publish).
 *
 * Docs: https://developers.facebook.com/docs/instagram-api
 */

import { env } from "@/lib/env";
import type {
  OAuthCallbackResult,
  OAuthStartResult,
  PublishRequest,
  PublishResult,
} from "@/lib/social/types";

const GRAPH = "https://graph.facebook.com/v21.0";
const FB_OAUTH = "https://www.facebook.com/v21.0/dialog/oauth";

// ---------- OAuth ----------

export function getOAuthStartUrl(redirectUri: string, state: string): OAuthStartResult {
  if (!env.instagram.isLive) {
    // Mock: return a URL that lands directly on our callback with a fake code.
    const mockUrl = new URL("/api/social/instagram/callback", env.appUrl);
    mockUrl.searchParams.set("code", "mock_ig_code");
    mockUrl.searchParams.set("state", state);
    return { url: mockUrl.toString(), state };
  }

  const url = new URL(FB_OAUTH);
  url.searchParams.set("client_id", env.instagram.appId!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set(
    "scope",
    [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ].join(","),
  );
  url.searchParams.set("response_type", "code");
  return { url: url.toString(), state };
}

export async function exchangeOAuthCode(
  code: string,
  redirectUri: string,
): Promise<OAuthCallbackResult> {
  if (!env.instagram.isLive) {
    return {
      accessToken: "mock_ig_long_lived_token",
      accountId: "mock_ig_business_id",
      accountName: "@mock_brand",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      metadata: { mocked: true },
    };
  }

  // 1. Short-lived token
  const tokenRes = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
    client_id: env.instagram.appId!,
    client_secret: env.instagram.appSecret!,
    redirect_uri: redirectUri,
    code,
  }));
  if (!tokenRes.ok) throw new Error(`IG token exchange failed: ${await tokenRes.text()}`);
  const { access_token: shortToken } = (await tokenRes.json()) as { access_token: string };

  // 2. Long-lived token
  const longRes = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: env.instagram.appId!,
    client_secret: env.instagram.appSecret!,
    fb_exchange_token: shortToken,
  }));
  if (!longRes.ok) throw new Error(`IG long-lived exchange failed: ${await longRes.text()}`);
  const { access_token: longToken, expires_in } = (await longRes.json()) as {
    access_token: string;
    expires_in: number;
  };

  // 3. Find the user's Pages and the IG Business Account on the first page
  const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${longToken}`);
  if (!pagesRes.ok) throw new Error(`IG pages lookup failed: ${await pagesRes.text()}`);
  const pages = (await pagesRes.json()) as { data: Array<{ id: string; access_token: string; name: string }> };
  if (!pages.data?.length) throw new Error("No Facebook Pages found for this account");
  const page = pages.data[0];

  const igRes = await fetch(
    `${GRAPH}/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`,
  );
  if (!igRes.ok) throw new Error(`IG business account lookup failed: ${await igRes.text()}`);
  const igJson = (await igRes.json()) as {
    instagram_business_account?: { id: string; username: string };
  };
  if (!igJson.instagram_business_account) {
    throw new Error("No Instagram Business Account linked to the selected Facebook Page");
  }

  return {
    accessToken: page.access_token, // page-scoped token used for IG publishing
    accountId: igJson.instagram_business_account.id,
    accountName: `@${igJson.instagram_business_account.username}`,
    expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
    metadata: { pageId: page.id, pageName: page.name },
  };
}

// ---------- Publishing ----------

export async function publishToInstagram(req: PublishRequest): Promise<PublishResult> {
  if (!env.instagram.isLive) {
    return {
      platformPostId: `mock_ig_${Date.now()}`,
      platformPostUrl: "https://instagram.com/p/MOCK",
      mocked: true,
    };
  }

  const params: Record<string, string> = {
    access_token: req.accessToken,
    caption: req.caption,
  };
  if (req.mediaType === "image") {
    params.image_url = req.mediaUrl;
  } else {
    params.media_type = "REELS";
    params.video_url = req.mediaUrl;
  }

  // 1. Create container
  const createRes = await fetch(
    `${GRAPH}/${req.accountId}/media`,
    { method: "POST", body: new URLSearchParams(params) },
  );
  if (!createRes.ok) throw new Error(`IG container create failed: ${await createRes.text()}`);
  const { id: creationId } = (await createRes.json()) as { id: string };

  // 2. For video, poll the container until status = FINISHED
  if (req.mediaType === "video") {
    await waitForContainerReady(creationId, req.accessToken);
  }

  // 3. Publish
  const publishRes = await fetch(
    `${GRAPH}/${req.accountId}/media_publish?` +
      new URLSearchParams({ creation_id: creationId, access_token: req.accessToken }),
    { method: "POST" },
  );
  if (!publishRes.ok) throw new Error(`IG publish failed: ${await publishRes.text()}`);
  const { id: postId } = (await publishRes.json()) as { id: string };

  return {
    platformPostId: postId,
    platformPostUrl: `https://www.instagram.com/p/${postId}`,
    mocked: false,
  };
}

async function waitForContainerReady(
  creationId: string,
  accessToken: string,
  maxAttempts = 30,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(
      `${GRAPH}/${creationId}?fields=status_code&access_token=${accessToken}`,
    );
    if (!res.ok) throw new Error(`IG status check failed: ${await res.text()}`);
    const { status_code } = (await res.json()) as { status_code: string };
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`IG container ${status_code}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("IG container did not finish processing in time");
}
