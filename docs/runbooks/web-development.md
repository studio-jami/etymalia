# Web development

## Prerequisites

- Node.js 22 or later.
- pnpm 10.33.2.
- A Supabase project for authenticated workspace flows.

## Local setup

```sh
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter etymalia-web dev
```

Populate only values needed by the path under test. Never prefix private provider, service-role, OAuth, or runner credentials with `NEXT_PUBLIC_`.

The supported public Supabase names are resolved by [`apps/web/lib/supabase/env.ts`](../../apps/web/lib/supabase/env.ts):

- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or `SUPABASE_ANON_KEY`

The internal AI smoke route additionally requires server-side allowlisting and credentials. It is not a product endpoint.

## Validation

```sh
pnpm check
pnpm test
```

`/api/health` checks the configured Supabase Auth endpoint only. It is not evidence that database migrations, Storage policies, OAuth, Trigger, or durable generation are ready.

## Deployment boundary

The app has Vercel configuration in `apps/web/vercel.json`; deployment state is external to this repository. Before calling a deployment ready, verify the intended project, environment variables, Supabase migration state, private `etymalia` bucket, auth provider configuration, and any enabled runner integration.

## Remote migration record

On 2026-07-15, the linked remote database was checked before applying `20260715090000_remove_legacy_android_schema.sql`: legacy `brand_profiles` and `generated_assets` each contained 0 rows. The migration then retired both tables safely.

The same remote application included `20260715100000_add_generation_foundation.sql` and `20260715110000_harden_workspace_mutations.sql`. Remote verification confirmed the private `etymalia` bucket, generation lifecycle constraints, metadata-path integrity triggers, and workspace-owner membership trigger.

For future destructive migrations, first inspect and explicitly archive or migrate data that must be retained. Verify every migration against the remote database before enabling a dependent product path.

## Accepted account-level advisory

As of 2026-07-15, `supabase db advisors --linked --type all --level warn` reports only that **Supabase Auth leaked-password protection is disabled**. It is a paid option and explicitly out of scope for this project, so the warning is accepted. This account-level setting cannot be applied by a SQL migration.
