"use client";

import { useState, useTransition } from "react";
import { Loader2, Plug, Unplug, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardLabel } from "@/components/ui/card";
import { formatDateTime, cn } from "@/lib/utils";
import type { SocialPlatform } from "@/types/database";

interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  account_name: string;
  connected_at: string;
  token_expires_at: string | null;
  metadata: Record<string, unknown>;
}

interface SocialConnectProps {
  clientId: string;
  accounts: SocialAccount[];
  instagramLive: boolean;
  tiktokLive: boolean;
}

export function SocialConnect({ clientId, accounts, instagramLive, tiktokLive }: SocialConnectProps) {
  const [, startTransition] = useTransition();
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const igAccount = accounts.find((a) => a.platform === "instagram");
  const ttAccount = accounts.find((a) => a.platform === "tiktok");

  function startConnect(platform: SocialPlatform) {
    window.location.href = `/api/social/${platform}/connect?clientId=${clientId}`;
  }

  async function disconnect(accountId: string) {
    if (!confirm("Disconnect this account? Scheduled posts using it will fail.")) return;
    setDisconnectingId(accountId);
    try {
      const res = await fetch(`/api/social/publish?accountId=${accountId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        startTransition(() => {
          window.location.reload();
        });
      }
    } finally {
      setDisconnectingId(null);
    }
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <header className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral">⊹ Connections</div>
        <h2 className="font-display text-4xl tracking-tightest mt-1">
          Social <span className="font-display-italic text-coral">accounts</span>
        </h2>
        <p className="text-ink-300 text-sm mt-1">
          Connect this brand&rsquo;s Instagram &amp; TikTok so you can publish from the panel.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <PlatformCard
          platform="instagram"
          label="Instagram"
          subtitle="Reels &amp; feed posts via Graph API"
          live={instagramLive}
          account={igAccount}
          onConnect={() => startConnect("instagram")}
          onDisconnect={(id) => disconnect(id)}
          disconnecting={disconnectingId === igAccount?.id}
          info="Requires an Instagram Business or Creator account linked to a Facebook Page."
        />
        <PlatformCard
          platform="tiktok"
          label="TikTok"
          subtitle="Direct video &amp; photo posts"
          live={tiktokLive}
          account={ttAccount}
          onConnect={() => startConnect("tiktok")}
          onDisconnect={(id) => disconnect(id)}
          disconnecting={disconnectingId === ttAccount?.id}
          info="Requires TikTok app review for direct posting on accounts other than the developer's."
        />
      </div>

      <div className="mt-8 text-xs text-ink-400 leading-relaxed max-w-2xl">
        <CardLabel className="mb-2">Note on tokens</CardLabel>
        Access tokens are stored in your Supabase database, scoped per client by RLS policies.
        For production, encrypt them at rest using Supabase Vault or a similar mechanism.
        Long-lived Instagram tokens last ~60 days; TikTok tokens are typically 24 hours and need
        refresh — both flows can be wired into a refresh cron.
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  label,
  subtitle,
  live,
  account,
  onConnect,
  onDisconnect,
  disconnecting,
  info,
}: {
  platform: SocialPlatform;
  label: string;
  subtitle: string;
  live: boolean;
  account: SocialAccount | undefined;
  onConnect: () => void;
  onDisconnect: (id: string) => void;
  disconnecting: boolean;
  info: string;
}) {
  const connected = !!account;
  return (
    <Card className={cn(connected && "border-sage-500/30 bg-sage-500/5")}>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-display text-2xl tracking-tight text-ink-50">{label}</h3>
            <p className="text-xs text-ink-300" dangerouslySetInnerHTML={{ __html: subtitle }} />
          </div>
          <PlatformGlyph platform={platform} />
        </div>

        {connected && account ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-ink-800/60 border border-sage-500/20">
              <CheckCircle2 size={14} className="text-sage-400" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-50 truncate">{account.account_name}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                  Connected {formatDateTime(account.connected_at)}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onDisconnect(account.id)}
              disabled={disconnecting}
            >
              {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <Unplug size={12} />}
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-ink-400 leading-relaxed">{info}</p>
            <div className="flex items-center gap-2">
              <Button onClick={onConnect} className="flex-1">
                <Plug size={14} />
                Connect {label}
              </Button>
            </div>
            {!live && (
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Mock mode — set {platform === "instagram" ? "INSTAGRAM_APP_ID/SECRET" : "TIKTOK_CLIENT_KEY/SECRET"} for live
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PlatformGlyph({ platform }: { platform: SocialPlatform }) {
  if (platform === "instagram") {
    return (
      <div className="w-10 h-10 rounded-md flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #FFDC80, #FCAF45, #F77737, #F56040, #FD1D1D, #E1306C, #C13584, #833AB4, #5851DB, #405DE6)" }}>
        <span className="text-white text-lg">◌</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-md bg-ink flex items-center justify-center border border-ink-600">
      <span className="font-display text-xl text-coral">♪</span>
    </div>
  );
}
