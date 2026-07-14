# Etymalia — Phase 2 Implementation Status

**Date:** July 14, 2026
**Status:** Phase 2 social-kit and durable-job foundation is implemented and locally verified. It is **not deployed** because the Trigger.dev deployment account is not authenticated on this machine. This is an explicit external blocker, not a code workaround.

## Implemented

- Added the documented rendering stack to `@etymalia/asset-forge`:
  - `satori` produces deterministic SVG social artwork.
  - `@resvg/resvg-js` derives deterministic PNGs from those SVGs.
  - A committed Inter font is embedded for consistent server-side rendering.
- Added the platform-spec matrix for 12 deliverables:
  - X avatar/header
  - LinkedIn profile/cover
  - Instagram profile/post
  - YouTube avatar/banner
  - Facebook cover
  - GitHub and Discord avatars
  - Web Open Graph image
- Added the `generate-full-kit` Trigger.dev task. It accepts only workspace and brand IDs, reloads all brand data server-side with the Supabase service role, renders the social kit, uploads to the private `etymalia` bucket under the established workspace/brand path, and upserts corresponding `assets` metadata.
- Added the brand-workspace action and UI control to enqueue that durable task only after an RLS-visible DTCG palette exists.
- Added `apps/web/trigger.config.ts` with a five-minute job duration and three-attempt retry policy.
- Added the official Trigger.dev CLI as a root development dependency.

## Verification completed

- `pnpm --filter @etymalia/asset-forge run typecheck` — passed.
- `pnpm --filter etymalia-web run typecheck` — passed.
- `pnpm --filter etymalia-web run build` — passed.
- Direct runtime render with an independent sample brand — passed:
  - 12 social assets generated;
  - SVG output begins with a valid `<svg>` document;
  - PNG output is non-empty (the first asset was 6,077 bytes).
- `pnpm exec trigger --help` — confirmed the installed official CLI and supported deployment commands.
- `git diff --check` — must be rerun immediately before commit after this status document is added.

## External-service audit

### Confirmed healthy

- **GitHub:** CLI authenticated as `JamiStudio`; `main` tracks `Jami-Studio/main`.
- **Vercel:** project `jami-studio/etymalia` is linked; Root Directory is `apps/web`; latest production deployment was Ready at audit time. Three earlier failed deployments remain in historical records, but the current deployment is healthy.
- **Supabase:** linked Etymalia project is reachable; all four local migrations exactly match remote history.

### Explicit blockers / absent services

- **Trigger.dev:** `pnpm exec trigger whoami` reports that the default profile is not logged in. A `TRIGGER_SECRET_KEY` exists in local `.env`, but it is a task invocation credential and cannot authenticate CLI deployment. The task has not been deployed and its required `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` have not been configured in Trigger Cloud.
- **Sentry:** no account configuration, environment variables, package dependency, or source integration exists. No Sentry issue can be audited or settled from this repository.
- **PostHog:** no account configuration, environment variables, package dependency, or source integration exists. No PostHog issue can be audited or settled from this repository.
- **Local Supabase:** `supabase status` cannot inspect local Docker services because the local database container is absent. This does not affect the independently verified linked remote migration history.

## Required completion sequence

1. Authenticate the intended Trigger.dev Cloud account (`pnpm exec trigger login`) and confirm its project reference.
2. Deploy from `apps/web` using `trigger.config.ts`.
3. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Trigger Cloud runtime secrets; do not put values in source control.
4. Enqueue `generate-full-kit` from an authenticated production brand with a DTCG palette, then verify all 12 objects and `assets` rows through the live Supabase project.
5. Decide whether Sentry and PostHog should be adopted. If so, provide/create the intended account projects and keys, then implement and validate their integrations. They cannot truthfully be marked settled while absent.
6. Continue the remaining Phase 2 pillars—reference import and the Typst/react-pdf guide-renderer bake-off—after the deployed social job has been verified.
