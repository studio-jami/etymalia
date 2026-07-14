import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("Missing required server environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }
  return key;
}

/**
 * Service-role access is reserved for server-only operations such as Vault
 * credential resolution. Never import this module into a Client Component.
 */
export function createAdminClient() {
  const url = getSupabaseUrl();
  if (!url) {
    throw new Error("Missing required server environment variable: SUPABASE_URL");
  }

  return createClient(url, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
