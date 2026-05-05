import Link from "next/link";
import { Sparkles, KanbanSquare, Calendar, Settings, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { ProjectStatus } from "@/types/database";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: socials }, { data: projects }, { data: posts }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("social_accounts").select("id, platform, account_name").eq("client_id", clientId),
    supabase.from("projects").select("id, title, status, updated_at, due_date").eq("client_id", clientId).order("updated_at", { ascending: false }).limit(8),
    supabase.from("posts").select("id, status, scheduled_for, content_items!inner(project_id, projects!inner(client_id))").eq("content_items.projects.client_id", clientId).limit(20),
  ]);

  if (!client) return null;

  const colors = (client.brand_colors as string[]) ?? [];
  const keywords = (client.brand_keywords as string[]) ?? [];

  const statusCounts: Record<ProjectStatus, number> = {
    idea: 0, production: 0, review: 0, scheduled: 0, published: 0, archived: 0,
  };
  for (const p of projects ?? []) statusCounts[p.status]++;

  return (
    <div className="px-8 py-10 max-w-7xl">
      {/* Brand profile + actions */}
      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-400 mb-2">Brand profile</div>
            {client.brand_voice ? (
              <p className="font-display text-2xl italic text-ink-100 leading-snug">
                &ldquo;{client.brand_voice}&rdquo;
              </p>
            ) : (
              <p className="text-ink-400 italic">No brand voice set yet.</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <CardLabel>Industry</CardLabel>
              <div className="text-ink-100">{client.industry ?? "—"}</div>
            </div>
            <div className="space-y-2">
              <CardLabel>Added</CardLabel>
              <div className="text-ink-100">{formatDate(client.created_at)}</div>
            </div>
            {colors.length > 0 && (
              <div className="space-y-2">
                <CardLabel>Brand colors</CardLabel>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs font-mono text-ink-200">
                      <div className="w-5 h-5 rounded border border-ink-600" style={{ background: c }} />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {keywords.length > 0 && (
              <div className="space-y-2">
                <CardLabel>Keywords</CardLabel>
                <div className="flex gap-1.5 flex-wrap">
                  {keywords.map((k, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-ink-700 border border-ink-600 text-ink-200">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {client.notes && (
            <Card>
              <CardBody>
                <CardLabel className="mb-2">Internal notes</CardLabel>
                <p className="text-sm text-ink-200 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right column — quick actions and connections */}
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3">
              <CardLabel>Jump in</CardLabel>
              <Link href={`/clients/${clientId}/content`}>
                <Button className="w-full" size="lg">
                  <Sparkles size={16} />
                  Generate content
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/clients/${clientId}/kanban`}>
                  <Button variant="outline" className="w-full">
                    <KanbanSquare size={14} />
                    Kanban
                  </Button>
                </Link>
                <Link href={`/clients/${clientId}/schedule`}>
                  <Button variant="outline" className="w-full">
                    <Calendar size={14} />
                    Schedule
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <CardLabel>Social connections</CardLabel>
                <Link href={`/clients/${clientId}/social`} className="text-[10px] font-mono text-coral uppercase tracking-wider">
                  manage →
                </Link>
              </div>
              {socials && socials.length > 0 ? (
                <div className="space-y-1.5">
                  {socials.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                      <span className="text-ink-100">{s.account_name}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400 ml-auto">{s.platform}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Link
                  href={`/clients/${clientId}/social`}
                  className="block text-sm text-ink-400 italic py-2 hover:text-coral transition-colors"
                >
                  No accounts connected. <span className="not-italic underline">Connect →</span>
                </Link>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Projects + status snapshot */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral">⊹ Pipeline</div>
            <h2 className="font-display text-3xl tracking-tightest mt-1">Projects</h2>
          </div>
          <Link href={`/clients/${clientId}/kanban`}>
            <Button variant="outline">
              <Plus size={14} />
              Open kanban
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(Object.keys(statusCounts) as ProjectStatus[]).map((s) => (
            <div key={s} className="px-3 py-2.5 rounded-md bg-ink-700/30 border border-ink-600">
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400">{s}</div>
              <div className="font-display text-2xl text-ink-50">{statusCounts[s]}</div>
            </div>
          ))}
        </div>

        {projects && projects.length > 0 ? (
          <div className="space-y-2 mt-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/clients/${clientId}/kanban`}
                className="flex items-center gap-3 p-3 rounded-md bg-ink-700/30 hover:bg-ink-700/60 border border-ink-600 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-ink-50 truncate">{p.title}</div>
                  <div className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">
                    Updated {formatDate(p.updated_at)}{p.due_date ? ` · due ${formatDate(p.due_date)}` : ""}
                  </div>
                </div>
                <ProjectStatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardBody className="py-10 text-center">
              <p className="font-display text-xl italic text-ink-300">No projects yet.</p>
              <p className="text-sm text-ink-400 mt-1">Open the kanban and add your first brief.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
