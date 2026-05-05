import { NextResponse, type NextRequest } from "next/server";
import { getOAuthStartUrl } from "@/lib/social/tiktok";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const state = `${clientId}.${crypto.randomUUID()}`;
  const redirectUri = `${env.appUrl}/api/social/tiktok/callback`;
  const { url } = getOAuthStartUrl(redirectUri, state);

  const res = NextResponse.redirect(url);
  res.cookies.set("tt_oauth_state", state, {
    httpOnly: true,
    secure: env.appUrl.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
