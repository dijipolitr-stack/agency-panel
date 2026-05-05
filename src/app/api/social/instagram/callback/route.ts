import { NextResponse, type NextRequest } from "next/server";
import { exchangeOAuthCode } from "@/lib/social/instagram";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("ig_oauth_state")?.value;

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=ig_oauth_missing", env.appUrl));
  }
  if (state !== cookieState) {
    return NextResponse.redirect(new URL("/dashboard?error=ig_oauth_state", env.appUrl));
  }

  // clientId is the first segment of state
  const clientId = state.split(".")[0];

  try {
    const redirectUri = `${env.appUrl}/api/social/instagram/callback`;
    const result = await exchangeOAuthCode(code, redirectUri);

    const supabase = await createClient();
    // Upsert account
    const { error } = await supabase
      .from("social_accounts")
      .upsert({
        client_id: clientId,
        platform: "instagram",
        account_name: result.accountName,
        account_id: result.accountId,
        access_token: result.accessToken,
        refresh_token: result.refreshToken ?? null,
        token_expires_at: result.expiresAt?.toISOString() ?? null,
        metadata: result.metadata ?? {},
      }, { onConflict: "client_id,platform,account_id" });

    if (error) {
      return NextResponse.redirect(
        new URL(`/clients/${clientId}/social?error=${encodeURIComponent(error.message)}`, env.appUrl),
      );
    }

    const res = NextResponse.redirect(new URL(`/clients/${clientId}/social?connected=instagram`, env.appUrl));
    res.cookies.delete("ig_oauth_state");
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth failed";
    return NextResponse.redirect(
      new URL(`/clients/${clientId}/social?error=${encodeURIComponent(message)}`, env.appUrl),
    );
  }
}
