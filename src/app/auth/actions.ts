"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type AuthState = { error?: string } | undefined;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Please enter a valid email and a password (6+ chars)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const schema = credsSchema.extend({
    agencyName: z.string().min(2),
  });
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    agencyName: formData.get("agencyName"),
  });
  if (!parsed.success) {
    return { error: "Please fill all fields. Password must be 6+ characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Sign up failed unexpectedly." };

  // Create the agency for this user immediately so the dashboard works on first login.
  const slug = slugify(parsed.data.agencyName) + "-" + data.user.id.slice(0, 6);
  const { error: agencyError } = await supabase.from("agencies").insert({
    name: parsed.data.agencyName,
    slug,
    owner_id: data.user.id,
  });
  if (agencyError) return { error: `Agency creation failed: ${agencyError.message}` };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
