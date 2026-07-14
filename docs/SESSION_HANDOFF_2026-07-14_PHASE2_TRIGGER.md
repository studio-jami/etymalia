# Etymalia — Phase 2 Trigger.dev Deployment & Verification Handoff

> **Historical record (July 14, 2026):** This handoff contains deployment assertions that were not independently revalidated in the current audit. Use [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) for the active status; the required terminal run, Storage, and asset-row verification remains the release gate.

**Date:** July 14, 2026
**Status:** Trigger.dev production deployment is configured and live. The social-kit worker has been exercised against production and its packaging/runtime defects were corrected. A deterministic DTCG palette was seeded for the only available production brand; the final successful render/storage verification remains the next command.

## What was implemented

### Phase 2 social-kit job

- Added deterministic social-kit rendering with **Satori** and **resvg**:
  - 12 assets: X avatar/header, LinkedIn profile/cover, Instagram profile/post, YouTube avatar/banner, Facebook cover, GitHub avatar, Discord avatar, and Open Graph image.
  - Assets are rendered as SVG and PNG from the existing brand identity and DTCG tokens.
- Added `generate-full-kit` Trigger.dev task in `apps/web/trigger/full-kit.ts`.
  - Payload is only `workspaceId` and `brandId`.
  - The worker loads the brand and tokens server-side through Supabase service-role credentials.
  - It writes social PNGs to the private `etymalia` bucket under `workspace/{workspaceId}/brand/{brandId}/social/`.
  - It registers generated assets in `public.assets` using the existing `(brand_id, storage_path)` conflict key.
  - The task has three attempts and a five-minute duration.
- Added the brand-page `Generate full social kit` action and status feedback.

### Trigger.dev production configuration

- Installed and authenticated the Trigger.dev CLI globally as `james@jami.studio`.
- Resolved the canonical Trigger project reference:
  - `proj_wcurzuyxcrbsvfaxoymh` — **Etymalia**, Jami Studio.
- Added `apps/web/trigger.config.ts` with:
  - canonical project ref;
  - worker max duration/retries;
  - `syncEnvVars`, syncing **only** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from ignored root `.env` during deployment;
  - external native/runtime packages: `@resvg/resvg-js` and `ws`;
  - official `additionalFiles` packaging for the task-owned Inter font.
- Added `@trigger.dev/sdk`, `@trigger.dev/build`, `dotenv`, `ws`, and corresponding type dependencies to `apps/web`.
- Added `TRIGGER_SECRET_KEY` to Vercel Production through the existing authenticated account flow. It must remain the raw production key—no surrounding quotes.
- Updated `turbo.json` so Vercel’s server-side build environment is explicitly declared to Turbo, including `TRIGGER_SECRET_KEY` and existing server secrets.

## Production deployments

### Trigger.dev

Latest successful worker deployment:

- **Version:** `20260714.6`
- **Deployment:** `8jedq18c`
- **Task detected:** `generate-full-kit`

Prior live failures were diagnosed and corrected:

1. Incorrect display-name project configuration → replaced with canonical project ref.
2. Root `.env` was not present in Trigger build-extension context → explicitly loaded locally before `syncEnvVars` uploads the two scoped secrets.
3. Windows resvg binary was bundled for the Linux worker → externalized `@resvg/resvg-js` so Trigger installs the correct Linux binary.
4. Trigger Node 21 worker has no native `WebSocket`; Supabase initializes Realtime during client construction → added `ws` and installs it on `globalThis` in the isolated worker.
5. Shared renderer’s source-relative Inter-font read was invalid after task rebundling → changed the worker to load a task-owned packaged font at `trigger/fonts/inter-latin-400-normal.woff` and pass its bytes explicitly into the renderer.

### Vercel

- Vercel project is `studio-jami/etymalia`, Root Directory `apps/web`.
- Recent production deployments are Ready.
- `TRIGGER_SECRET_KEY` is now present in Production.
- The Turbo warning for undeclared Vercel build variables was fixed in source by declaring all used server-side variables in the build task environment.

## Live verification performed

Passed:

- `pnpm -r run typecheck` (before latest focused package changes) passed.
- `pnpm --filter @etymalia/asset-forge run typecheck` passed after renderer changes.
- `pnpm --filter etymalia-web run typecheck` passed after Trigger configuration changes.
- `pnpm --filter etymalia-web run build` passed repeatedly after all web configuration changes.
- Social renderer direct runtime contract passed: all 12 assets produced valid SVG and non-empty PNG bytes.
- Trigger production environment lists both synchronized Supabase secrets (values hidden).
- Trigger production deploys successfully build and detect the task.
- Trigger run trace and span-detail APIs were verified through the authenticated Trigger MCP protocol; this is the required path for detailed worker exceptions when `runs.retrieve()` reports only `TASK_RUN_UNCAUGHT_EXCEPTION`.

Production worker runs were triggered using the actual production brand and Trigger production credential. The initial runs exposed the worker configuration issues listed above. Once the worker reached business validation, it correctly stopped with:

```text
A valid DTCG palette is required before a full kit can be generated.
```

The database inspection showed no `brand_tokens` row for the available production brand. A deterministic palette was then generated with `@etymalia/tokens` and upserted into `public.brand_tokens` for that brand. This is the current valid state for the final run.

## Immediate next steps — execute in order

1. Trigger a fresh production run with a new idempotency key for the existing tokenized brand.
2. Poll it with `runs.poll()` and require `COMPLETED`.
3. Verify exactly 12 files below the brand’s `social/` Storage prefix.
4. Verify exactly 12 corresponding `public.assets` rows with `kind = 'social'`.
5. Exercise the Vercel server action from the deployed brand UI to verify that Vercel’s `TRIGGER_SECRET_KEY` queues the same task, rather than only the direct production SDK invocation.
6. Update this handoff with the completed run ID, storage count, and asset-row count after those checks pass.

## Security and account notes

- No secret value was committed or printed. Trigger and Vercel secret operations used authenticated APIs/CLI and stdin/in-memory transfer only.
- Sentry and PostHog remain absent: no account/configuration/package/source integration existed at audit time.
- GitHub Dependabot’s graph had cleared the alerts introduced by the briefly added Trigger CLI dependency. Five older alerts remained in GitHub’s asynchronous dependency graph despite absent vulnerable local lockfile ranges; they were not dismissed without a completed GitHub rescan.
- Supabase remote migrations remain in sync with local migrations.

## Relevant commits pushed

- `bf3a086` Add Phase 2 social kit jobs
- `cd993cf` Remove vulnerable Trigger CLI
- `53442df` Document dependency graph refresh
- `4a9b3f8` Configure Trigger deployment secrets
- `879014e` Use canonical Trigger project ref
- `932e6cf` Fix Trigger Linux build inputs
- `e22ca57` Load Trigger deployment secrets locally
- `8f5080d` Declare Vercel build environment
- `422cdfb` Support Supabase in Trigger workers
- `c19f394` Externalize Trigger worker transport
- `fc9aae3` Bundle fonts for Trigger rendering
- `b9aa48c` Revert "Embed social rendering font"
- `310ea39` Load social font from task assets

The handoff is intentionally explicit about the remaining final live verification; do not mark Phase 2 social-kit generation fully verified until the next task completes and both Storage and database counts are confirmed.
