import { createClient } from "@/lib/supabase/server";
import { SocialConnect } from "@/components/clients/social-connect";
import { env } from "@/lib/env";

export default async function SocialPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, account_name, connected_at, token_expires_at, metadata")
    .eq("client_id", clientId)
    .order("connected_at", { ascending: false });

  return (
    <SocialConnect
      clientId={clientId}
      accounts={(accounts ?? []).map((a) => ({
        ...a,
        metadata: (a.metadata as Record<string, unknown>) ?? {},
      }))}
      instagramLive={env.instagram.isLive}
      tiktokLive={env.tiktok.isLive}
    />
  );
}
