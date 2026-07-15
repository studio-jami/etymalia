# Etymalia roadmap

This document preserves the product arc and end-state direction. For the authoritative work currently being done, use the [delivery plan](./plan.md).

## Product end state

Etymalia is a web-first professional brand workspace with one shared brand state. A user can begin with guided creation or work directly, then deliberately choose, edit, compare, generate, retain, and export individual deliverables, named collections, custom selections, or a complete brand kit.

The end state preserves these decisions:

| Concern | Direction |
| --- | --- |
| Product interaction | Guided build accelerates creation; direct creative control remains first-class. |
| Product truth | Supabase Auth, Postgres/RLS, private Storage, job, asset, and export ledgers. |
| SaaS durable work | Cloudflare Workflows and Queues after the portable runner boundary exists. |
| Deterministic renderer | Cloudflare Containers, invoked privately through the durable control plane. It runs the Node-compatible full-kit renderer while Supabase remains product truth. |
| Current runner | Trigger.dev is transitional; add no new product features directly to it. |
| Personal generation | OpenAI OAuth and xAI/Grok OAuth are the first planned provider integrations. |
| Heavy compute | AWS is reserved for a later workload that demonstrably exceeds the Cloudflare Container envelope. |
| Vertex media | GCP is reserved for selected Vertex capabilities after account eligibility is verified. |
| Local infrastructure | No local Docker requirement. |

## Current release boundary

The implemented slice is deterministic brief-to-name-to-palette-to-identity-to-ZIP. The source also contains a transitional Trigger full-kit task, but its completed production execution is not verified in this repository. See [Product](./product.md).

## Milestone 0 — Portable generation foundation

**Goal:** separate product behavior from Trigger and provider SDKs before adding more generation features.

Deliver:

- A typed generation request and runner port.
- A Cloudflare worker package with staged configuration, Workflow and Queue bindings, generated types, and isolated tests.
- A privately invoked Cloudflare Container renderer for the Node-compatible deterministic full-kit workload; its image is built in CI so local development does not require Docker.
- A provider port based on logical capabilities rather than provider/model strings in feature code.
- Server-side authorization, idempotency, and safe error mapping.
- An operational runbook covering deploy, dry-run, logs, Workflow inspection, queue state, and dead-letter replay.

Do not proceed until the intended Cloudflare account/project, environments, and secret boundary are confirmed.

## Milestone 1 — Personal provider connections

**Goal:** establish secure OpenAI and xAI/Grok personal-generation connections before provider-backed media work.

Deliver OAuth authorization-code plus PKCE flows, encrypted server-side token lifecycle, connection-state UI, capability mapping, and one bounded text capability per provider. Do not enable media until scopes, terms, entitlements, limits, cancellation, and error handling are verified.

## Milestone 2 — Selective durable generation

**Goal:** replace full-kit-only interaction with durable single-asset, collection, custom-selection, and complete-kit creation.

Deliver independent artifact steps, queue priorities, job status, safe retry/cancellation behavior, and workspace controls. Verify that all successful artifacts have private Storage objects, ledger records, lineage, and authorized previews/downloads; partial failure must preserve successful siblings.

Only after this works in production may Trigger leave application enqueue paths. Preserve historical artifacts and job records, confirm no active work depends on Trigger, revoke runner-specific credentials, and remove Trigger in one clean change.

## Milestone 3 — Reference direction

**Goal:** accept human visual direction without allowing automation to overwrite taste.

Start with image-only upload and explicit MIME, size, count, pixel, retention, preview, and deletion rules. Persist reference lineage, run extraction durably, and present suggestions for explicit apply/ignore/compare actions. Do not add document or video input until its processing and deletion behavior is defined.

## Milestone 4 — Guide and export completion

**Goal:** make all persisted artifacts deliverable through individual, collection, custom, and complete-kit exports.

Evaluate guide renderers against visual quality, deployment compatibility, performance, accessibility, and maintainability. Persist guide PDFs with lineage. Add export selection and manifests that identify exact artifact IDs, paths, versions, and generator metadata.

## Milestone 5 — Commercial and collaborative product

**Goal:** add depth only after the generation and export foundation is production-proven.

In order: provider settings/BYOK, persisted templates and stationery, invitations and audit events, server-enforced entitlements, billing after commercial responsibilities are defined, then a public export API after the internal contract is stable.

## Milestone 6 — Heavy media and scale

**Goal:** use dedicated compute only for clearly justified workloads such as video transcode, large vectorization, document extraction, or batch rendering.

Before adding a workload, document its inputs, outputs, latency, cost, cancellation, residency, volume, and why it does not fit the Cloudflare capability/cost envelope. Every compute adapter must preserve the same request, job, asset, and export contract.

## Acceptance gate for production generation

Do not describe durable generation as production-verified until an authenticated user can create an asset, collection, and complete kit; observe real job state; access only authorized private artifacts; export the selected results; and recover a failed job without losing successful sibling assets.
