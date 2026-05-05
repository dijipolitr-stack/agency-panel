import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(env.supabase.url, env.supabase.anonKey);
}
