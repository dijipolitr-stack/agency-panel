/**
 * Centralised env access. Each external integration exposes an `isLive`
 * flag that the rest of the app uses to decide whether to call the real
 * API or fall back to the realistic mock implementation.
 */

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  appUrl: read("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",

  supabase: {
    url: read("NEXT_PUBLIC_SUPABASE_URL") ?? "",
    anonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? "",
    serviceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  },

  kie: {
    apiKey: read("KIE_API_KEY"),
    get isLive() { return Boolean(this.apiKey); },
  },

  anthropic: {
    apiKey: read("ANTHROPIC_API_KEY"),
    get isLive() { return Boolean(this.apiKey); },
  },

  instagram: {
    appId: read("INSTAGRAM_APP_ID"),
    appSecret: read("INSTAGRAM_APP_SECRET"),
    get isLive() { return Boolean(this.appId && this.appSecret); },
  },

  tiktok: {
    clientKey: read("TIKTOK_CLIENT_KEY"),
    clientSecret: read("TIKTOK_CLIENT_SECRET"),
    get isLive() { return Boolean(this.clientKey && this.clientSecret); },
  },

  cron: {
    secret: read("CRON_SECRET") ?? "dev-secret",
  },
};
