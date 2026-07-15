# Etymalia — Session Summary & Next Handoff

**Date:** July 14, 2026
**Status:** Phase 0 foundations materially advanced; database migration and live provider invocation remain intentionally unapplied/uninvoked.

## What was completed

### Product and UI foundation

- Reviewed the supplied UI sketches and saved a full UX proposal in `docs/references/ui-design/terra-proposal/`.
- Established the approved design direction:
  - dark theme by default; persisted light override;
  - compact, editorial, professional visual treatment;
  - global semantic styling only—no page-local design systems;
  - Quick Build and Directed Build converge on one brand workspace and source of truth.
- Added a sharper visual reference: `docs/references/ui-design/terra-proposal/04-professional-workspace-restyle.svg`.
- Implemented the initial web global token system, theme toggle, and professional landing shell.

### Monorepo migration

- Migrated the Next.js web app from `web/` to `apps/web/`.
- Added the root pnpm/Turborepo workspace:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `turbo.json`
  - `pnpm-lock.yaml`
- Created shared package boundaries:
  - `@etymalia/ai`
  - `@etymalia/tokens`
  - `@etymalia/name-engine`
  - `@etymalia/availability`
  - `@etymalia/asset-forge`
  - `@etymalia/exporters`
- Moved the global theme CSS source into `packages/tokens/src/theme.css`; `apps/web/app/globals.css` imports it.
- Updated `.gitignore` for root JavaScript artifacts: `node_modules/`, `.next/`, `.turbo/`.
- Updated web setup documentation to use `apps/web/`; Vercel’s project Root Directory must be changed to `apps/web/` before deployment.

### Workspace/brand database model

- Added forward-only migration:
  - `supabase/migrations/20260714110000_add_workspace_brand_schema.sql`
- It is additive and leaves the legacy Android-oriented `brand_profiles` / `generated_assets` tables untouched.
- New data model:
  - `workspaces`, `memberships`, `brands`, `brand_tokens`, `name_candidates`, `brand_references`, `assets`, `exports`
- Added owner-membership bootstrap trigger, membership role helpers, workspace-scoped RLS, authenticated Data API grants, indexes, updated-at triggers, and Storage policies for:

  ```text
  workspace/{workspaceId}/brand/{brandId}/...
  ```

### Google/Vertex AI foundation

- Implemented `@etymalia/ai` using the Vercel AI SDK as an abstraction layer.
- Concrete initial providers are **Google AI Studio** and **Vertex** only.
- No Vercel AI Gateway, OpenAI, or xAI execution path was added.
- Added server-only Studio credential resolution:
  - Gemini API key from `GEMINI_API_KEY`
  - Vertex service-account JSON path from `GOOGLE_SA_JSON_KEY_PATH`
- Added allowlisted Node-runtime smoke route:
  - `GET /api/ai/smoke`
  - requires Supabase authentication;
  - requires the user ID to appear in server-only `ETYMALIA_STUDIO_USER_IDS`;
  - returns schema-validated structured brand-direction JSON;
  - does not expose or log secrets.

### Live provider model catalog — important correction

The initial implementation briefly contained a static model map copied from planning notes. That was removed and replaced.

- `packages/ai/src/index.ts` now contains **no hardcoded model IDs**.
- Gemini model discovery uses the provider API directly:

  ```text
  GET https://generativelanguage.googleapis.com/v1beta/models
  ```

- Vertex discovery uses the authenticated Google publisher-model catalog path.
- The live catalog paginates and caches provider results for five minutes.
- It retains provider-returned model metadata: ID, display name, version, token limits, supported actions, thinking capability, and discovery timestamp.
- `AiPort` requests provider capabilities rather than a logical/vendor model ID. It selects automatically from current provider-returned candidates.
- The stale hardcoded `MODEL_REGISTRY` in `docs/research/ai-credential-resolver.sketch.ts` was removed and replaced with the live-catalog contract.

## Validation completed

Passed:

```sh
pnpm --filter @etymalia/ai run typecheck
pnpm run build
git diff --check
```

The final build includes:

```text
/api/ai/smoke
/api/health
/auth/callback
/
```

No live AI request was made, and the new Supabase migration was not applied.

## Required next actions

1. **Configure the internal smoke allowlist**
   - Set `ETYMALIA_STUDIO_USER_IDS` to the internal authenticated Supabase user UUID(s).
   - Do not expose this value with a `NEXT_PUBLIC_` prefix.

2. **Verify live Google discovery and generation**
   - Authenticate as an allowlisted Studio user.
   - Invoke `GET /api/ai/smoke`.
   - Confirm the live Gemini model-list request and structured generation succeed.
   - Inspect only safe route output/error metadata; never print credentials.

3. **Validate and apply the database migration deliberately**
   - Local Supabase database validation is currently blocked because Docker is not installed.
   - Review `20260714110000_add_workspace_brand_schema.sql` before applying it to the linked project.
   - Do not edit existing applied migrations.

4. **Update Vercel configuration**
   - Change the Vercel project Root Directory from `web/` to `apps/web/`.

5. **Continue Phase 0 in order**
   - Implement the production credential store backed by Supabase Vault.
   - Bind workspace bootstrap / brand library UI to the new workspace model after the migration is applied.
   - Do not add OpenAI/xAI runtime execution or Vercel AI Gateway work before their planned provider phase.

## Working-tree note

This session intentionally did not commit or push.

The working tree also contains pre-existing reference-material changes, including deletions of legacy files under `docs/references/` and untracked `docs/references/etymology-table/` / `docs/references/ui-design/` directories. Do not remove or revert those changes without confirming their ownership and intent.

## Suggested next-session prompt

> Continue Etymalia Phase 0 from `docs/SESSION_SUMMARY_2026-07-14.md`. Read `agents.md`, `docs/research/webapp_master_plan.md`, `docs/HANDOFF.md`, and the session summary first. Preserve the live provider model catalog: do not reintroduce static model IDs or a hardcoded model registry. First validate the allowlisted Google smoke route, then review/apply the additive workspace migration, then bind workspace bootstrap and the brand library to real data. Keep all AI credentials server-side and do not deploy or invoke providers without the documented allowlist and verification steps.
