import { NextResponse } from "next/server";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

// Lightweight health check: confirms env is wired and the Supabase Auth service
// is reachable, without requiring any tables or authentication.
export async function GET() {
  const configured = isSupabaseConfigured();
  let supabase: { configured: boolean; reachable: boolean; status: number | null } =
    { configured, reachable: false, status: null };

  if (configured) {
    try {
      const res = await fetch(`${getSupabaseUrl()}/auth/v1/health`, {
        headers: { apikey: getSupabaseAnonKey() },
        cache: "no-store",
      });
      supabase = { configured, reachable: res.ok, status: res.status };
    } catch {
      supabase = { configured, reachable: false, status: null };
    }
  }

  return NextResponse.json({
    app: "etymalia-web",
    status: "ok",
    supabase,
    time: new Date().toISOString(),
  });
}

