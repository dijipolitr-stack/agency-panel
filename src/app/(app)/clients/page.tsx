import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, industry, logo_url, brand_colors, created_at, projects(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="px-8 py-10 max-w-7xl">
      <header className="flex items-end justify-between mb-10">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral mb-2">⊹ Roster</div>
          <h1 className="font-display text-5xl tracking-tightest">All <span className="font-display-italic text-coral">clients</span></h1>
          <p className="text-ink-300 mt-2">Every brand you manage, in one place.</p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus size={16} />
            New client
          </Button>
        </Link>
      </header>

      {clients && clients.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const colors = (c.brand_colors as string[]) ?? [];
            const projectCount = (c.projects as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <Link key={c.id} href={`/clients/${c.id}`}>
                <Card className="h-full hover:border-coral/30 group cursor-pointer">
                  <CardBody className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {c.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.logo_url} alt="" className="w-12 h-12 rounded-md object-cover bg-ink-700" />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-gradient-to-br from-ink-600 to-ink-700 flex items-center justify-center">
                            <span className="font-display text-xl text-ink-200">
                              {c.name[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-display text-lg text-ink-50 tracking-tight">{c.name}</div>
                          {c.industry && (
                            <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400">{c.industry}</div>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight size={16} className="text-ink-500 group-hover:text-coral transition-colors" />
                    </div>

                    {colors.length > 0 && (
                      <div className="flex gap-1">
                        {colors.slice(0, 5).map((col, i) => (
                          <div key={i} className="w-5 h-5 rounded border border-ink-600" style={{ background: col }} />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-400 pt-2 border-t border-ink-700">
                      <span>{projectCount} project{projectCount === 1 ? "" : "s"}</span>
                      <span>Added {formatDate(c.created_at)}</span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardBody className="py-16 text-center space-y-4">
            <div className="font-display text-3xl italic text-ink-300">
              Your roster is empty.
            </div>
            <p className="text-ink-400 max-w-md mx-auto">
              Start by adding your first client. You&rsquo;ll set up brand identity,
              connect their socials, and brief AI generations from there.
            </p>
            <Link href="/clients/new" className="inline-block pt-2">
              <Button size="lg">
                <Plus size={16} />
                Add first client
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
