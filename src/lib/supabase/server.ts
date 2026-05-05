import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Standard server client — RLS enforced as the signed-in user.
 * Use this in Server Components and Server Actions.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies — handled by middleware.
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS. Use ONLY in trusted server contexts
 * (cron jobs, webhook handlers, admin operations). Never expose to the
 * client and never use in user-facing flows where RLS should apply.
 */
export function createServiceRoleClient() {
  if (!env.supabase.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service operations");
  }
  return createServiceClient<Database>(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
