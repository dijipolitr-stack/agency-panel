import Link from "next/link";
import { ArrowUpRight, Sparkles, KanbanSquare, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectStatusBadge, PostStatusBadge } from "@/components/ui/badge";
import { formatDateTime, relativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }, { data: posts }] = await Promise.all([
    supabase.from("clients").select("id, name, created_at").order("created_at", { ascending: false }),
    supabase.from("projects").select("id, title, status, client_id, updated_at, clients(name)").order("updated_at", { ascending: false }).limit(8),
    supabase.from("posts").select("id, status, scheduled_for, posted_at, content_items(thumbnail_url, projects(title, clients(name)))").order("created_at", { ascending: false }).limit(6),
  ]);

  const stats = {
    clients: clients?.length ?? 0,
    activeProjects: projects?.filter((p) => p.status !== "archived" && p.status !== "published").length ?? 0,
    scheduled: posts?.filter((p) => p.status === "scheduled").length ?? 0,
    published: posts?.filter((p) => p.status === "published").length ?? 0,
  };

  return (
    <div className="px-8 py-10 max-w-7xl">
      {/* Editorial header */}
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral">⊹ Today</div>
          <div className="h-px flex-1 max-w-24 bg-ink-600" />
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-400">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest leading-[0.95] mb-4">
          The <span className="font-display-italic text-coral">control</span> room.
        </h1>
        <p className="text-ink-300 text-lg max-w-2xl leading-relaxed">
          Every brand, every brief, every post — under one roof. Pick a client below or
          start something new.
        </p>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
        <StatCard label="Clients" value={stats.clients} />
        <StatCard label="Active projects" value={stats.activeProjects} accent />
        <StatCard label="Scheduled" value={stats.scheduled} />
        <StatCard label="Published" value={stats.published} />
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left — recent activity */}
        <div className="lg:col-span-2 space-y-6">
          <SectionHeader title="Recent projects" hint="Latest 8 across all clients" />
          {projects && projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((p) => {
                const clientName = (p.clients as { name?: string } | null)?.name ?? "—";
                return (
                  <Link
                    key={p.id}
                    href={`/clients/${p.client_id}/kanban`}
                    className="flex items-center gap-4 p-4 rounded-md bg-ink-700/30 hover:bg-ink-700/60 border border-ink-600 hover:border-ink-400 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-base text-ink-50 truncate">{p.title}</div>
                      <div className="text-xs text-ink-400 font-mono uppercase tracking-wider mt-0.5">
                        {clientName} · {relativeTime(p.updated_at)}
                      </div>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                    <ArrowUpRight size={16} className="text-ink-400 group-hover:text-coral transition-colors" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No projects yet" hint="Create a client and add your first brief." />
          )}
        </div>

        {/* Right — quick actions + posts */}
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-3">
              <CardLabel>Quick start</CardLabel>
              <div className="space-y-2">
                <QuickAction href="/clients/new" icon={<Sparkles size={14} />} label="New client" />
                {clients && clients[0] && (
                  <>
                    <QuickAction
                      href={`/clients/${clients[0].id}/content`}
                      icon={<Sparkles size={14} />}
                      label="Generate content"
                    />
                    <QuickAction
                      href={`/clients/${clients[0].id}/kanban`}
                      icon={<KanbanSquare size={14} />}
                      label="Open kanban"
                    />
                    <QuickAction
                      href={`/clients/${clients[0].id}/schedule`}
                      icon={<Calendar size={14} />}
                      label="Schedule posts"
                    />
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          <SectionHeader title="Latest posts" />
          {posts && posts.length > 0 ? (
            <div className="space-y-2">
              {posts.map((post) => {
                const ci = post.content_items as { thumbnail_url?: string; projects?: { title?: string; clients?: { name?: string } } } | null;
                const proj = ci?.projects;
                return (
                  <div key={post.id} className="flex items-center gap-3 p-3 rounded-md bg-ink-700/30 border border-ink-600">
                    {ci?.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ci.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover bg-ink-700" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-ink-700" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ink-50 truncate">{proj?.title ?? "—"}</div>
                      <div className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">
                        {post.scheduled_for ? formatDateTime(post.scheduled_for) : (post.posted_at ? formatDateTime(post.posted_at) : "draft")}
                      </div>
                    </div>
                    <PostStatusBadge status={post.status} />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No posts yet" hint="Generate content, then schedule it." compact />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`p-5 rounded-md border ${accent ? "border-coral/30 bg-coral/5" : "border-ink-600 bg-ink-700/30"}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 mb-2">{label}</div>
      <div className={`font-display text-4xl tracking-tightest ${accent ? "text-coral" : "text-ink-50"}`}>
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="font-display text-2xl tracking-tight text-ink-50">{title}</h2>
      <div className="h-px flex-1 bg-ink-700" />
      {hint && <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">{hint}</span>}
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-ink-700/40 hover:bg-coral/10 border border-ink-600 hover:border-coral/30 text-sm text-ink-200 hover:text-coral transition-all group"
    >
      <span className="text-coral">{icon}</span>
      <span className="flex-1">{label}</span>
      <ArrowUpRight size={12} className="text-ink-400 group-hover:text-coral" />
    </Link>
  );
}

function EmptyState({ title, hint, compact }: { title: string; hint?: string; compact?: boolean }) {
  return (
    <Card>
      <CardBody className={compact ? "py-6 text-center" : "py-10 text-center"}>
        <div className="font-display text-lg italic text-ink-300">{title}</div>
        {hint && <div className="text-xs text-ink-400 mt-1">{hint}</div>}
      </CardBody>
    </Card>
  );
}
