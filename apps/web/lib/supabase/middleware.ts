import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

// Refreshes the Supabase auth session on every request and keeps cookies in sync.
// This is the Supabase-recommended baseline; auth flows added later rely on it.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If env isn't wired yet (e.g. very first deploy), don't crash — just pass through.
  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the user to trigger token refresh when needed.
  await supabase.auth.getUser();

  return response;
}



