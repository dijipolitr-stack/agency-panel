import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/kanban/board";

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, description, status, position, due_date, updated_at")
    .eq("client_id", clientId)
    .order("position", { ascending: true });

  return <KanbanBoard clientId={clientId} initialProjects={projects ?? []} />;
}
