import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const configured = isSupabaseConfigured();

  let email: string | null = null;
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  }

  return (
    <main className="wrap">
      <h1 className="brand">
        Entymalia<span className="gradient">.</span>
      </h1>
      <p className="tagline">
        AI-powered brand identity — consistent logos, marketing assets, color
        palettes, and video promos. Web experience coming soon.
      </p>

      {configured ? (
        <AuthButton email={email} />
      ) : (
        <span className="status">
          <span className="dot warn" />
          Supabase not configured yet
        </span>
      )}

      <p className="muted">
        Backend health: <a href="/api/health">/api/health</a>
      </p>
    </main>
  );
}

