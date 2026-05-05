export interface PublishRequest {
  accessToken: string;
  /** Platform-specific account/business id. */
  accountId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
}

export interface PublishResult {
  platformPostId: string;
  platformPostUrl?: string;
  mocked: boolean;
}

export interface OAuthStartResult {
  url: string;
  state: string;
}

export interface OAuthCallbackResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountId: string;
  accountName: string;
  metadata?: Record<string, unknown>;
}
