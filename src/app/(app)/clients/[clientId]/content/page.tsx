import { createClient } from "@/lib/supabase/server";
import { ContentGenerator } from "@/components/content-creator/generator";

export default async function ContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ project?: string }>;
}) {
  const { clientId } = await params;
  const { project } = await searchParams;
  const supabase = await createClient();

  const [{ data: client }, { data: projects }, { data: items }] = await Promise.all([
    supabase
      .from("clients")
      .select("brand_voice, brand_keywords")
      .eq("id", clientId)
      .single(),
    supabase
      .from("projects")
      .select("id, title")
      .eq("client_id", clientId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("content_items")
      .select("id, type, prompt, asset_url, thumbnail_url, status, model, created_at, project_id, projects!inner(client_id)")
      .eq("projects.client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  return (
    <ContentGenerator
      clientId={clientId}
      brandVoice={client?.brand_voice ?? null}
      brandKeywords={(client?.brand_keywords as string[]) ?? []}
      projects={projects ?? []}
      defaultProjectId={project}
      initialContent={(items ?? []).map((i) => ({
        id: i.id,
        type: i.type,
        prompt: i.prompt,
        asset_url: i.asset_url,
        thumbnail_url: i.thumbnail_url,
        status: i.status,
        model: i.model,
        created_at: i.created_at,
        project_id: i.project_id,
      }))}
    />
  );
}
