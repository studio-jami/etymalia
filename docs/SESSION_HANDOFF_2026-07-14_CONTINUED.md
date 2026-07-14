# Etymalia — Continued Session Handoff

> **Historical record (July 14, 2026):** This document predates later Vercel and Phase 1 handoffs and contains superseded deployment configuration. Use [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) for active status.

**Date:** July 14, 2026
**Status:** Phase 0 workspace, Vault credential, and initial brand-library foundations are complete locally and applied to the linked Supabase project.

## Completed in this continuation

### Supabase

Applied and confirmed in remote migration history:

- `20260714110000_add_workspace_brand_schema.sql`
  - Adds workspace, membership, brand, token, candidate, reference, asset, and export data model with RLS and Storage policies.
- `20260714120000_add_user_ai_credentials.sql`
  - Adds a user-scoped Google BYOK metadata table.
  - Stores key material exclusively in Supabase Vault.
  - Exposes no credential table or decrypting RPC to authenticated browser/Data API clients.
  - Restricts credential write and decrypt RPCs to `service_role` for server-only use.

The Supabase CLI emitted a non-fatal `pg-delta` migration-cache certificate warning after both successful pushes. The remote migration history confirmed both migrations as applied.

### Studio smoke configuration

- Resolved the unique Supabase user for `james@jami.studio` through the Admin API.
- Added that user to server-only `ETYMALIA_STUDIO_USER_IDS` in root `.env` and ignored `apps/web/.env.local`.
- The value is never public, committed, or exposed in route output.

### Web app

- Added `apps/web/lib/supabase/admin.ts`: a server-only service-role Supabase client.
- Added `apps/web/lib/ai/prod-credential-store.ts`:
  - resolves Google production BYOK credentials only through the service-role Vault RPC;
  - provides authenticated server-side persistence without logging or browser-side decryption.
- Added `/workspace` backed by the applied workspace schema:
  - authenticated users see their RLS-scoped workspace and brand library;
  - users without a workspace receive an explicit bootstrap form;
  - users can create a workspace and create draft brands in each workspace;
  - the landing action now leads to this workspace rather than the prior dead-end anchor.

## Validation

Passed:

```sh
pnpm --filter etymalia-web run typecheck
pnpm --filter @etymalia/ai run typecheck
pnpm --filter etymalia-web run build
git diff --check
pnpm exec supabase db push --linked --dry-run
```

The final build includes `/workspace` alongside `/`, `/api/ai/smoke`, `/api/health`, and `/auth/callback`.

## Still required for live smoke verification

1. Set the existing Vercel project’s Root Directory from `web/` to `apps/web/` in the dashboard, then deploy the current branch.
2. Sign in at the deployed site as `james@jami.studio`, then request `GET /api/ai/smoke`.

Vercel project `studio-jami/etymalia` is now linked locally and Production `ETYMALIA_STUDIO_USER_IDS` has been set as a sensitive variable. The Vercel CLI's project inspection confirms the remaining stale Root Directory is `web/`. Its API subcommand rejects valid endpoint paths in this installed CLI version, and the browser dashboard requires a separate Vercel login, so the root setting was deliberately not guessed or modified through an unsupported path.

## Scope guardrails retained

- No static AI model IDs or hardcoded model registry were added.
- No OpenAI/xAI provider execution, Vercel AI Gateway execution, or client-side AI credential path was added.
- No provider request was made in this session.
