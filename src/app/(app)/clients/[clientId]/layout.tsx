import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientNav } from "@/components/nav/topbar";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-8 py-5 border-b border-ink-700 bg-ink-800/40">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral">⊹ Client</div>
        <h1 className="font-display text-3xl tracking-tightest mt-1">{client.name}</h1>
      </div>
      <ClientNav clientId={clientId} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
