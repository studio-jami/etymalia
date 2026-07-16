import Link from "next/link";
import { redirect } from "next/navigation";
import { createBrand, createWorkspace } from "./actions";
import { AuthButton } from "@/components/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { billingPlans } from "@/lib/billing/stripe";
import { BillingControls } from "@/components/billing-controls";

type Workspace = {
  id: string;
  name: string;
  plan: string;
};

type Brand = {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
};

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/");

  const [{ data: workspaceData, error: workspaceError }, { data: brandData, error: brandError }, { data: creditRows, error: creditError }, { data: billingCustomer, error: billingError }, { data: billingSubscription, error: subscriptionError }] = await Promise.all([
    supabase.from("workspaces").select("id, name, plan").order("updated_at", { ascending: false }),
    supabase.from("brands").select("id, workspace_id, name, status").order("updated_at", { ascending: false }),
    supabase.from("credit_ledger").select("amount"),
    supabase.from("billing_customers").select("user_id").eq("user_id", auth.user.id).maybeSingle(),
    supabase.from("billing_subscriptions").select("plan_key, status").in("status", ["active", "trialing"]).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (workspaceError || brandError || creditError || billingError || subscriptionError) {
    throw new Error("Unable to load your workspace library.");
  }

  const workspaces = (workspaceData ?? []) as Workspace[];
  const brands = (brandData ?? []) as Brand[];
  const entitlementPlan = typeof billingSubscription?.plan_key === "string" ? billingSubscription.plan_key : null;
  const { error } = await searchParams;

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="wordmark" href="/">etymalia</Link>
        <div className="header-actions">
          <ThemeToggle />
          <AuthButton
            avatarUrl={typeof auth.user.user_metadata.avatar_url === "string" ? auth.user.user_metadata.avatar_url : null}
            email={auth.user.email ?? null}
          />
        </div>
      </header>

      <section className="workspace-heading" aria-labelledby="workspace-title">
        <p className="eyebrow">Your brand library</p>
        <h1 id="workspace-title">Build a system, one brand at a time.</h1>
        <p className="lede">Quick Build and Directed Build will both save into the same workspace and brand source of truth.</p>
      </section>

      {error ? <p className="status status--warning">We could not save that change. Please try again.</p> : null}

      <p className="status">{(creditRows ?? []).reduce((total, row) => total + (row.amount as number), 0)} generation credits available</p>
      <BillingControls plans={billingPlans()} hasBillingAccount={Boolean(billingCustomer)} />

      {workspaces.length === 0 ? (
        <section className="workspace-empty" aria-labelledby="workspace-bootstrap-title">
          <p className="eyebrow">First step</p>
          <h2 id="workspace-bootstrap-title">Name your workspace.</h2>
          <p>It is your private home for brands now and collaborators later.</p>
          <form action={createWorkspace} className="inline-form">
            <label htmlFor="workspace-name">Workspace name</label>
            <input id="workspace-name" name="name" maxLength={120} required placeholder="Your studio" />
            <button className="button button--primary" type="submit">Create workspace</button>
          </form>
        </section>
      ) : (
        <section className="workspace-list" aria-label="Workspaces">
          {workspaces.map((workspace) => {
            const workspaceBrands = brands.filter((brand) => brand.workspace_id === workspace.id);
            return (
              <article className="workspace-card" key={workspace.id}>
                <div className="workspace-card__heading">
                  <div>
                    <p className="eyebrow">{entitlementPlan ?? workspace.plan} plan</p>
                    <h2>{workspace.name}</h2>
                  </div>
                  <span className="workspace-card__count">{workspaceBrands.length} brands</span>
                </div>
                {workspaceBrands.length ? (
                  <ul className="brand-list">
                    {workspaceBrands.map((brand) => (
                      <li key={brand.id}>
                        <Link href={`/workspace/${workspace.id}/brand/${brand.id}`} className="brand-list__link">
                          <strong>{brand.name}</strong>
                          <span>{brand.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="workspace-card__empty">No brands yet. Start with a concise brief.</p>}
                <form action={createBrand} className="inline-form">
                  <input name="workspaceId" type="hidden" value={workspace.id} />
                  <label htmlFor={`brand-${workspace.id}`}>New brand name</label>
                  <input id={`brand-${workspace.id}`} name="name" maxLength={160} required placeholder="A new direction" />
                  <button className="button button--primary" type="submit">Create brand</button>
                </form>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
