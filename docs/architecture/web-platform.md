# Web platform architecture

## Current implementation

The web application lives in [`apps/web`](../../apps/web) and uses Next.js App Router, React, TypeScript, and the root pnpm/Turborepo workspace. Shared packages provide AI contracts, naming, availability, tokens, deterministic asset generation, and ZIP packaging.

Supabase is the product system of record:

- Auth provides the user session.
- Postgres and RLS hold workspaces, memberships, brands, tokens, candidates, assets, exports, and generation jobs.
- Private Storage holds persisted generated artifacts.
- Signed URLs provide authorized preview and download access.

The web app supports Google OAuth in source. Whether the provider is enabled in a deployed Supabase project requires remote verification.

## Service boundaries

| Concern | Boundary |
| --- | --- |
| Browser | Public Supabase configuration and authenticated UI only. No provider or service-role secrets. |
| Next.js server actions/routes | Authorization, mutations, export assembly, and narrow internal integrations. |
| Shared packages | Deterministic, testable naming, token, identity, raster, favicon, social, and export logic. |
| Supabase | Auth, RLS-protected product records, private storage, and artifact/job ledgers. |
| Cloudflare | Queue and Workflow control plane plus the planned private Container renderer for deterministic Node-compatible full-kit work. |
| Trigger.dev | Current transitional full-kit task implementation; do not add product work here. |

## Current routes

- `/` — landing page and sign-in entry point.
- `/workspace` — authenticated workspace and brand library.
- `/workspace/[workspaceId]/brand/[brandId]` — brief, name, palette, identity, asset, and export workflow.
- `/api/health` — Supabase Auth health check only.
- `/api/ai/smoke` — restricted internal Google AI smoke route; not a customer feature.

## Required external configuration

Local web configuration belongs in `apps/web/.env.local`. See the [web development runbook](../runbooks/web-development.md). The application requires public Supabase values for browser sessions; server-only integrations require their own private credentials at the runtime that uses them.

The private Supabase Storage bucket named `etymalia` is used by the asset loader, export route, and current Trigger task. Remote verification on 2026-07-15 confirmed that it exists and is private. The future Cloudflare Container renderer will write through the same asset and Storage contract; it will not introduce R2 or a second product database.

## Removed surface

The native Android application, Gradle project, and Android-only Supabase Edge Function were removed from this repository. The retained database migration history is followed by a forward cleanup migration for the obsolete Android compatibility tables. If `gemini-proxy` was previously deployed, remove that remote Edge Function separately: deleting its source does not undeploy it. Historical source claims remain under [`../history/`](../history/README.md).
