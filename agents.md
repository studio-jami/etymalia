# Agent instructions

## Project identity

Etymalia is a web-first brand-identity workspace. The Next.js application lives in `apps/web`; shared product logic lives in `packages`; Supabase migrations and functions live in `supabase`.

Read [`docs/README.md`](./docs/README.md) before changing product or architecture documentation. Treat [`docs/product.md`](./docs/product.md) as current source-backed scope, [`docs/plan.md`](./docs/plan.md) as the canonical active work plan, and [`docs/roadmap.md`](./docs/roadmap.md) as the long-range product arc.

## Architecture constraints

- Supabase provides Auth, Postgres/RLS, private Storage, and product ledgers. Do not add Firebase.
- Keep provider, service-role, OAuth, and runner credentials server-side. Never expose them through `NEXT_PUBLIC_` variables, browser storage, logs, exports, or source.
- Keep product behavior independent of a runner or provider SDK. See [`docs/architecture/generation-contract.md`](./docs/architecture/generation-contract.md).
- Preserve one shared brand state for guided and direct workflows.
- Do not treat a queue acknowledgement as completed durable work.
- Do not add Cloudflare, OpenAI, xAI, AWS, or GCP integrations without the corresponding delivery-plan work item and verified account/configuration boundary.

## Engineering practice

- Run focused checks for changed code, then `pnpm check` when feasible.
- Do not rewrite applied Supabase migrations. Add forward migrations for schema changes.
- Do not commit secrets, local environment files, or generated local artifacts.
- Keep documentation claims evidence-bound; label remote-only assertions as requiring remote verification.
- Commit only when explicitly requested.
