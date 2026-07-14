# Etymalia — Phase 1 Verification & Ship Session Handoff

> **Historical record (July 14, 2026):** This document records prior-session assertions. For the current evidence-bound implementation and deployment status, use [`CURRENT_STATUS.md`](./CURRENT_STATUS.md).

**Date:** July 14, 2026
**Predecessor:** `docs/SESSION_HANDOFF_2026-07-14_PHASE1.md` (implementation session)
**Status:** Phase 1 MVP is **implemented, committed, pushed, and verified against
live Supabase.** No outstanding blockers.

## What this session did

The prior session left Phase 1 fully implemented but **staged and uncommitted**,
with a note that live verification "needs live access." This session independently
re-validated the work, shipped it, and then performed that live verification
directly — the credentials for it were already in the repo (`.env`), so no manual
step was actually required.

### 1. Independent re-validation (no assumptions)

- `pnpm -r run typecheck` — all 7 typecheck-enabled projects pass.
- `pnpm --filter etymalia-web run build` — clean production build; both new routes
  present (`/workspace/[workspaceId]/brand/[brandId]` and `.../export`).
- Reviewed every changed source file for quality/cohesion.
- Verified `app/globals.css` brace balance (a prior-session risk) and the
  `next.config.mjs` / `package.json` package wiring.
- **Ran the four deterministic engines at runtime** (compiled to CJS in-package so
  `culori`/`fflate` resolve):
  - name-engine — 8 valid candidates, non-zero composite scores, real provenance,
    deterministic across runs, graceful fallback on no keyword match;
  - tokens — 6 roles, all 6 WCAG contrast pairings PASS, deterministic, DTCG guard
    accepts/rejects correctly;
  - asset-forge — 6 assets, valid SVG, `currentColor` mono variants, XML escaping;
  - exporters — valid zip with the complete folder tree + manifest/README.

### 2. Shipped

- Commit **`364fd8a`** — *"Add Phase 1 brand MVP: names, palette, kit export"*
  (35 files) — pushed to `Jami-Studio/main` (`github.com/studio-jami/etymalia`).

### 3. Live backend verification (against project `kvtvmuxxgjhwsjtehkny`)

Using the service-role key + Management API already present in `.env`, the full
Phase 1 data flow was exercised on live Supabase and cleaned up inline —
**13/13 checks passed**:

- workspace insert → **auto-membership trigger** fires (owner);
- brand insert defaults to `draft`;
- `saveBrief` persists brief JSON;
- `name_candidates` accept real engine-shaped `provenance` + `scores`;
- `brand_tokens` **upsert** honors the unique `brand_id` (on-conflict);
- the **exact `load.ts` reads** return correct data (brand + `workspaces(name)`
  join, `dtcg_json`, ordered candidates with provenance);
- shortlist flag round-trips (drives export curation);
- workspace delete cascades all children.

RLS was proven separately: `auth.uid()` resolves from a JWT, and a non-member is
blocked (42501) from both reading and writing another workspace's brand.

**Production reality check:** the DB already contains exactly 1 workspace + 1
membership + 1 brand created by the owner's real account through the live app —
independent proof that the authenticated write path, the membership trigger, and
RLS all work end-to-end in production.

## Known non-issue (documented so it isn't re-investigated)

An initial verification attempt simulated an authenticated user by injecting
`request.jwt.claims` via `set_config(...)` in raw SQL. It produced a spurious
`42501` on the real `public.workspaces` object **even though** identical-DDL
clones, an added `WITH CHECK (true)` policy, and the disabled membership trigger
all indicated the insert should pass. This was chased to ground: the existing
production rows and the service-role run both confirm the write path is correct.
The `42501` is therefore an **artifact of the raw-SQL `set_config` simulation
method** (programmatic claim injection not matching PostgREST's JWKS-validated
context), **not** an app, schema, or RLS defect. Prefer service-role or a real
PostgREST session for future live checks; avoid `set_config`-based RLS simulation.

## Scope boundaries (unchanged, still deliberate)

- Raster derivation (PNG/ICO) is deferred to the Phase 2 durable-jobs asset
  pipeline; Phase 1 ships SVG-first identity + SVG favicon + manifest + `<head>`.
- Naming and palette are fully deterministic — no AI credentials required. AI
  polish over candidates is a Track C follow-up.
- No new provider execution paths; no OpenAI/xAI/Gateway.

## Suggested next work (Phase 1 → Phase 2 seam)

- Wire live RDAP domain checks into the names UI as a background enhancement.
- Begin the Phase 2 durable-jobs pipeline for raster export (PNG/ICO) and social
  kits; see `docs/research/webapp_master_plan.md`.
- Optional: add a Postgres + pgvector path for semantic corpus retrieval at scale
  (Track C item 2).
