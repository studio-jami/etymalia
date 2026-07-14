# Etymalia — Phase 1 MVP Session Handoff

**Date:** July 14, 2026
**Status:** Phase 1 (Name → Colors → Logo → Export) is implemented end-to-end in
code and validated by typecheck, production build, and per-package runtime
tests. Live verification (deploy + authenticated run against Supabase) remains.

## What was built

The Phase 1 vertical slice makes a newly created brand a real, workable object:
brief → names → palette/tokens → identity → downloadable kit.

### Shared packages (all typecheck + runtime-verified)

- **`@etymalia/name-engine`** — the signature Etymaria capability.
  - `scripts/build-corpus.mjs` parses the curated seed CSV
    (`docs/references/etymology-table/…`, clean UTF-8) into
    `src/corpus.json` (**270 entries**, PIE + 13 language layers, semantic
    fields, drift notes, tone, syllables, hand-picked candidates). Committed;
    no runtime CSV parser needed.
  - Deterministic blend + score engine: semantic keyword matching → root
    harvesting with provenance → five strategies (curated · affixation ·
    portmanteau · compound · truncation across language families) → composite
    score (meaning fit × pronounceability × brevity × distinctiveness). Same
    brief always yields the same ranked set.
- **`@etymalia/tokens`** — OKLCH palette generation via **culori**, gamut-clamped
  to sRGB, with **WCAG-AA contrast verified and enforced** (ink/paper body text,
  button-label readability on primary/accent). Serializes to a DTCG document
  (the `brand_tokens` source of truth) plus CSS custom properties.
- **`@etymalia/availability`** — **RDAP** domain adapter (free, keyless,
  standardized). Never throws; unreachable/rate-limited registries yield
  `status: "unknown"`. Social/SEO deliberately out of scope.
- **`@etymalia/asset-forge`** — deterministic SVG logo synthesis: monogram icon,
  wordmark, and lockup, each in full-colour and single-colour (`currentColor`)
  variants, plus an SVG favicon.
- **`@etymalia/exporters`** — brand-kit `.zip` via **fflate** with a manifest,
  README, and organized folder tree (`logo/`, `favicon/`, `tokens/`, `names/`,
  `palette/`).

### Web app (`apps/web`)

- **Brand route** `app/workspace/[workspaceId]/brand/[brandId]/page.tsx` — status,
  brief, selected name, palette, and identity/export, all RLS-scoped via the new
  `lib/brand/load.ts` loader. Brands in the workspace list now link here, and
  creating a brand redirects straight into it.
- **Server actions** (`actions.ts`): `saveBrief`, `generateNames`, `useName`,
  `toggleShortlist`, `checkDomain` (RDAP), `generateBrandPalette`.
- **Export route** `export/route.ts` — regenerates the kit deterministically from
  stored brand + tokens and streams the `.zip` as a download.
- `lib/brand/brief.ts` (brief parse/serialize, no zod) and `lib/brand/identity.ts`
  (tokens → identity + web manifest + `<head>` snippet).
- Global, token-based styling added to `app/globals.css` (no page-local systems).

## Data model usage (already-applied migration)

- `brands.brief` (JSONB) ← brief intake.
- `name_candidates` ← generated candidates (`term`, `provenance`, `scores`,
  `availability_json`, `is_shortlisted`).
- `brand_tokens.dtcg_json` ← DTCG palette (upsert on unique `brand_id`).

No schema changes were required; the July 14 workspace migration already models
everything Phase 1 needs.

## Validation performed

```sh
pnpm -r run typecheck        # all 8 workspace projects pass
pnpm --filter etymalia-web run build   # succeeds; new routes present
git --no-pager diff --check  # clean (only a benign LF/CRLF note on the lockfile)
```

Per-package runtime checks (compiled to CJS and executed):
- name engine produced meaningful, provenance-backed names across three briefs;
- palette passed all WCAG contrast pairings across five seeds;
- exporter produced a valid `PK` zip with the correct tree;
- asset-forge produced valid SVGs with working `currentColor` mono variants.

## Deliberate scope boundaries

- **Raster derivation (PNG/ICO) is deferred** to the Phase 2 durable-jobs asset
  pipeline (master plan §8). Phase 1 ships a resolution-independent SVG-first
  identity + SVG favicon + manifest + `<head>` snippet — fully valid in evergreen
  browsers. No fragile native rasterizer was introduced.
- No AI credentials are required for naming or palette generation (deterministic).
  AI polish over the candidate set is a Track C follow-up.
- No new provider execution paths, no OpenAI/xAI, no Vercel AI Gateway.

## Remaining verification (unchanged from prior handoffs, needs live access)

1. Set the Vercel project Root Directory to `apps/web/` and deploy.
2. Sign in as the allowlisted Studio user; run `GET /api/ai/smoke`.
3. Exercise the new brand flow end-to-end against live Supabase (create brand →
   brief → generate names → generate palette → download kit).

## Working-tree note

This session did not commit or push (awaiting confirmation). The tree is clean
and complete; a suggested commit subject is:

> Implement Phase 1 MVP: brand route, naming, palette, identity, export
