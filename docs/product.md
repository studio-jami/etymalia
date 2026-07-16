# Product

## Current product statement

Etymalia is a web-first brand-identity workspace. Authenticated users create brands inside workspaces, capture a brief, explore etymology-driven names, generate a contrast-checked palette and deterministic identity assets, and export a brand kit.

The product is designed around one shared brand state: guided creation helps users start, while direct controls let them choose, edit, regenerate, compare, and export deliberately. The user remains the creative director.

## Implemented in source

- Google OAuth sign-in support through Supabase.
- Workspace, membership, and brand records protected by Supabase RLS.
- Brand brief capture: description, industry, audience, keywords, and tone.
- Deterministic Etymaria name candidates with provenance, scoring, shortlists, and on-demand `.com` RDAP checks.
- Naming-studio controls for language eras, construction strategies, result volume, syllable limits, and manually added candidates; generated candidates retain their root provenance.
- Deterministic OKLCH palette generation, direct semantic-color editing, DTCG token-version persistence, and contrast checks.
- Named creative-direction snapshots: an editor can save the current brief, names, and tokens as a draft, then restore a saved direction through an authorization-checked transaction. Migration `20260716100000_add_brand_directions.sql` is applied remotely; deployed-workspace verification remains pending.
- Editable deterministic identity recipes: mark shape, wordmark voice, and tracking are persisted on the shared brand and drive live SVG identity previews. Migration `20260716110000_add_identity_recipe.sql` is applied remotely; deployed-workspace verification remains pending.
- The Cloudflare-backed production full-kit path is live: a server-only enqueue adapter calls an authenticated Worker `/enqueue` boundary with only job ID/idempotency key. On 2026-07-16, production job `2c46411d-33cd-4afe-a3a7-202607161200` completed with Cloudflare runner lineage and 45 matching private asset/storage records.
- Deterministic SVG lockup, wordmark, icon, and monochrome identity variants.
- Authenticated ZIP export of deterministic assets, with persisted generated artifacts included when available; exports fail closed when a selected persisted artifact is unavailable.
- A request-first generation ledger with source-version snapshot, idempotency key, runner metadata, and authorized job-state read model.
- Persisted asset previews and signed downloads for completed worker artifacts.
- Stripe Checkout and Stripe's hosted customer portal routes, with promotion-code entry enabled at Checkout.
- A Supabase-backed billing projection: Stripe customer/subscription state, idempotent webhook-event records, and an append-only credit ledger. Full-kit requests atomically reserve one credit and refund it if runner enqueueing fails.
- An isolated Cloudflare staging Worker, Queue, dead-letter queue, and Workflow foundation. It accepts only bounded job references in its harmless proof path and does not access product data.

## Implemented source path, not operationally verified

A Trigger-backed `generate-full-kit` task exists behind a runner-neutral adapter. Accepted requests create an authorized ledger record before enqueueing; the runner receives only the job ID and idempotency key. When it executes, the task is designed to persist social PNGs, identity derivatives, favicon artifacts, asset metadata, and a generation-job lifecycle record.

Source alone does not prove that a remote Trigger deployment is current, that a queued run completed, or that its artifacts are visible in a deployed workspace. Treat those as **requires remote verification**.

## Billing configuration boundary

The live Stripe webhook endpoint is `https://etymalia.jami.studio/api/stripe/webhook`; it verifies Stripe signatures before projecting events to Supabase. The live catalog has Personal ($30 monthly / $300 yearly), Entrepreneur ($60 / $600), and Business ($90 / $900) subscriptions. They allocate 3/6/9 full-kit credits per month, or 36/72/108 on annual payment. The annual promotion codes `ETYMALIA-PERSONAL-YEARLY`, `ETYMALIA-ENTREPRENEUR-YEARLY`, and `ETYMALIA-BUSINESS-YEARLY` are each restricted to their separate annual product, apply a one-time 100% discount, and permit one redemption. Price IDs and credit allocations are server-only production environment variables.

## Not implemented

- A Cloudflare-backed product runner: no Worker secret bindings, Supabase job integration, compute adapter, or application enqueue adapter is implemented.
- Selective asset/collection generation, retry, cancellation, or comparison UI.
- Reference upload, extraction, retention, and deletion workflow.
- Customer-facing provider OAuth, BYOK settings, or provider-backed generation.
- Persisted export records and manifests.
- Brand guide PDF, stationery/templates, invitations, public export API, registrar operations, and social/SEO availability.

## Release boundary

The deterministic brief-to-name-to-palette-to-identity-to-ZIP workflow is the currently implemented product slice. Generation requests are authorized for owners/editors only and appear in the job ledger before enqueueing. Durable full-kit generation is not production-verified until an authenticated run has a completed job record, matching private Storage objects and asset records, authorized workspace delivery, and ZIP inclusion.

## External state

Remote verification on 2026-07-16 confirmed that migrations through `20260716130000` are applied, including `brand_directions`, `activate_brand_direction(uuid)`, and the identity-recipe column; deployed-workspace verification remains pending. The signed Stripe webhook route is deployed to the live URL and returned a successful signature-verified smoke response. Supabase Auth now uses and allows `https://etymalia.jami.studio`, and successful Google OAuth returns to `/workspace`. The Cloudflare-backed production full-kit path is verified with 45 private assets; Trigger remains transitional fallback only. The isolated Cloudflare staging foundation evidence is in the [delivery plan](./plan.md).
