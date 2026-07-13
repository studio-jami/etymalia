import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function Home() {
  const configured = isSupabaseConfigured();

  return (
    <main className="wrap">
      <h1 className="brand">
        Entymalia<span className="gradient">.</span>
      </h1>
      <p className="tagline">
        AI-powered brand identity — consistent logos, marketing assets, color
        palettes, and video promos. Web experience coming soon.
      </p>

      <span className="status">
        <span className={`dot ${configured ? "ok" : "warn"}`} />
        {configured
          ? "Supabase connected"
          : "Supabase not configured yet"}
      </span>

      <p className="muted">
        Backend health: <a href="/api/health">/api/health</a>
      </p>
    </main>
  );
}

