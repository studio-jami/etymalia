// Central resolver for Supabase connection values.
//
// The official Supabase <> Vercel integration injects `NEXT_PUBLIC_SUPABASE_URL`
// and (historically) `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Newer Supabase projects use
// a "publishable" key. We accept any of these so the app works regardless of which
// naming the integration provides, and fall back to server-only vars if needed.

export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    ""
  );
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ""
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

