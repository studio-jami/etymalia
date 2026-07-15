# Etymalia — Current State

**Canonical state for the product and operations.**

Use this document for what is true now. Use [`roadmap.md`](./roadmap.md) for what comes next and [`GENERATION_SYSTEM.md`](./GENERATION_SYSTEM.md) for the production creation/job/export contract. Dated handoffs and changelog entries are historical records only.

## Product

Etymalia is a web-first brand-identity platform built with Next.js, Supabase, Trigger.dev, and shared deterministic generation packages. The Android application is a legacy prototype and is not a constraint on the web product roadmap.

## Web product

### Available now

- Authenticated workspaces, brands, and role-based Supabase RLS.
- Brand brief capture.
- Deterministic Etymaria naming from the curated 270-entry corpus, with provenance, scoring, shortlisting, and `.com` RDAP checks.
- Deterministic OKLCH palette generation with DTCG tokens and WCAG contrast checks.
- Deterministic SVG identity system: lockup, wordmark, icon, and monochrome variants.
- Authenticated brand-kit ZIP export.
- Workspace support for viewing and downloading persisted generated assets through short-lived signed URLs.
- Shared package tests for AI contracts, name generation, availability, tokens, identity generation, rasterization, favicons, social rendering, and ZIP packaging.

### Generated full kit

The deployed `generate-full-kit` task generates and persists:

- 12 social-platform PNG assets.
- SVG identity variants.
- PNG identity derivatives at 1×, 2×, and 3×.
- SVG, PNG, Apple Touch, Android Chrome, ICO, and web-manifest favicon artifacts.
- Asset metadata and durable job lifecycle records.

Completed artifacts appear in the workspace and are included in its authenticated ZIP export.

## Operational state

| System | Current state |
| --- | --- |
| Web build and package tests | Passing locally. |
| Supabase schema | Current migrations are applied to the linked remote project. |
| Storage | Private `etymalia` bucket with workspace/brand-scoped access policies. |
| Trigger.dev account | Authenticated as `james@jami.studio`. |
| Trigger.dev worker | Production version `20260714.7` is deployed with `generate-full-kit`. |
| Full-kit execution | A production verification run is accepted but currently remains queued; no worker lifecycle record or generated artifacts exist for that run yet. |
| Vercel | Web deployment configuration exists. Current deployed web revision is not asserted here. |

## Release state

### Ready

- Deterministic web Phase 1 workflow.
- Full-kit source, remote schema, and Trigger deployment.
- Persisted asset viewing, downloads, and ZIP packaging once a full-kit job completes.

### Not ready

- Full-kit delivery cannot be called production-verified until the accepted Trigger run executes and its artifacts are confirmed.
- Reference import, brand guide, templates/stationery, production BYOK settings, billing, invitations, brand-audit loop, and public export API are not implemented.
- Social/SEO availability and registrar integrations are not implemented.

## Immediate operating gate

Resolve the Trigger Cloud queue condition for the accepted full-kit run. Then verify one completed production run has:

1. a completed `generation_jobs` record;
2. the expected private Storage objects;
3. matching `assets` records;
4. visible workspace previews/downloads; and
5. the same artifacts in the authenticated ZIP export.

Only then may full-kit generation be described as production-verified.
