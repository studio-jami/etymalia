import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const configured = isSupabaseConfigured();

  let email: string | null = null;
  let avatarUrl: string | null = null;
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
    avatarUrl = typeof data.user?.user_metadata.avatar_url === "string"
      ? data.user.user_metadata.avatar_url
      : null;
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="wordmark" href="/" aria-label="Etymalia home">
          etymalia
        </a>
        <div className="header-actions">
          <ThemeToggle />
          {configured ? <AuthButton avatarUrl={avatarUrl} email={email} /> : null}
        </div>
      </header>

      <section className="landing-grid" aria-labelledby="home-title">
        <div className="landing-intro">
          <p className="eyebrow">ETymology-led brand identity</p>
          <h1 id="home-title">Start with meaning. Leave with a system.</h1>
          <p className="lede">
            Etymalia turns a concise brief and reference into a considered brand
            direction—then gives you control over each name, token, mark, and
            deliverable.
          </p>

          <div className="landing-actions">
            {configured ? (
              <a className="button button--primary" href="/workspace">
                              Open your workspace
                            </a>
            ) : (
              <span className="status status--warning">
                <span className="status__dot" />
                Supabase configuration is required to begin
              </span>
            )}
            <a className="text-link" href="/api/health">
              Service health
            </a>
          </div>
        </div>

        <aside className="direction-card" aria-label="Product direction">
          <p className="eyebrow">THE PRODUCT PROMISE</p>
          <dl className="direction-list">
            <div>
              <dt>01 / Discover</dt>
              <dd>Meaningful names with real provenance.</dd>
            </div>
            <div>
              <dt>02 / Direct</dt>
              <dd>Reference-led generation with explicit controls.</dd>
            </div>
            <div>
              <dt>03 / Deliver</dt>
              <dd>A validated, export-ready brand kit.</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="content-section" id="build-paths" aria-labelledby="build-paths-title">
        <div className="section-heading">
          <p className="eyebrow">ONE WORKSPACE, TWO WAYS TO WORK</p>
          <h2 id="build-paths-title">Automatic when you need momentum. Manual when detail matters.</h2>
        </div>
        <div className="path-grid">
          <article className="path-card">
            <p className="path-card__number">01</p>
            <h3>Quick build</h3>
            <p>Describe the business, add a reference, and review a first direction without committing to a black box.</p>
            <span className="path-card__status">Planned first vertical slice</span>
          </article>
          <article className="path-card">
            <p className="path-card__number">02</p>
            <h3>Directed build</h3>
            <p>Move through brief, naming, identity, assets, guide, and export with every intermediate decision visible.</p>
            <span className="path-card__status">Same brand source of truth</span>
          </article>
        </div>
      </section>
    </main>
  );
}
