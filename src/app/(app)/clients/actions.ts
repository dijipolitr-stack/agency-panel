"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const clientSchema = z.object({
  name: z.string().min(1).max(120),
  industry: z.string().max(60).optional().or(z.literal("")),
  brand_voice: z.string().max(280).optional().or(z.literal("")),
  brand_colors: z.string().optional().or(z.literal("")), // comma-separated
  brand_keywords: z.string().optional().or(z.literal("")),
  logo_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type ClientActionState = { error?: string } | undefined;

export async function createClientAction(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the form — name is required." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Resolve current agency
  const { data: agencies } = await supabase
    .from("agencies").select("id").eq("owner_id", user.id).limit(1);
  const agency = agencies?.[0];
  if (!agency) return { error: "No agency found." };

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      agency_id: agency.id,
      name: parsed.data.name,
      industry: parsed.data.industry || null,
      brand_voice: parsed.data.brand_voice || null,
      brand_colors: parsed.data.brand_colors
        ? parsed.data.brand_colors.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      brand_keywords: parsed.data.brand_keywords
        ? parsed.data.brand_keywords.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      logo_url: parsed.data.logo_url || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect(`/clients/${created.id}`);
}

const projectSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["idea", "production", "review", "scheduled", "published", "archived"]).default("idea"),
});

export async function createProjectAction(formData: FormData): Promise<{ id?: string; error?: string }> {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id: parsed.data.client_id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: parsed.data.status,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/clients/${parsed.data.client_id}/kanban`);
  return { id: data.id };
}

export async function updateProjectStatusAction(
  projectId: string,
  status: "idea" | "production" | "review" | "scheduled" | "published" | "archived",
  position: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status, position })
    .eq("id", projectId);
  if (error) return { error: error.message };
  return {};
}
