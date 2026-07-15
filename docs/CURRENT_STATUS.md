# Etymalia — Current State

**Canonical state for the product and operations.**

Use this document for what is true now. Use [`roadmap.md`](./roadmap.md) for what comes next and [`GENERATION_SYSTEM.md`](./GENERATION_SYSTEM.md) for the production creation/job/export contract. Dated handoffs and changelog entries are historical records only.

## Product

Etymalia is a web-first brand-identity platform built with Next.js, Supabase, Trigger.dev, and shared deterministic generation packages. Cloudflare Workflows + Queues are the selected next durable-work control plane; Trigger.dev remains transitional until that migration is complete. The Android application is a legacy prototype and is not a constraint on the web product roadmap.

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

### Next personal generation lane

OpenAI OAuth and xAI/Grok OAuth are the first provider integrations to implement. They are for the personal-generation experience: the provider account does the model/media work, while Etymalia handles creative controls, durable lifecycle, artifacts, comparison, and export. Cloudflare is the SaaS orchestration layer around those provider calls, not a replacement for them.

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
| Trigger.dev worker | Transitional implementation; production version `20260714.7` is deployed, but no further product work is planned on it. |
| Cloudflare durable work | Selected as the primary production control plane. Workflows + Queues will replace Trigger for product jobs; implementation is the immediate foundation task. |
| Full-kit execution | Trigger verification run remains queued. It is not a release dependency for the Cloudflare migration path. |
| Vercel | Web deployment configuration exists. Current deployed web revision is not asserted here. |

## Release state

### Ready

- Deterministic web Phase 1 workflow.
- Full-kit source, remote schema, and persisted asset viewing, downloads, and ZIP packaging once a job completes.

### Not ready

- Cloudflare-backed full-kit delivery is not production-verified until a Cloudflare job executes and its artifacts are confirmed.
- Reference import, brand guide, templates/stationery, production BYOK settings, billing, invitations, brand-audit loop, and public export API are not implemented.
- Social/SEO availability and registrar integrations are not implemented.

## Immediate operating gate

Implement and verify one completed Cloudflare-backed full-kit run with:

1. a completed `generation_jobs` record;
2. the expected private Storage objects;
3. matching `assets` records;
4. visible workspace previews/downloads; and
5. the same artifacts in the authenticated ZIP export.

Only then may full-kit generation be described as production-verified.
