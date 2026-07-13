import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// Browser-side Supabase client (Client Components).
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

