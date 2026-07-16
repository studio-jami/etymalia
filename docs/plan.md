# Delivery plan

**Status:** active — the Cloudflare staging full-kit path and the transitional production full-kit path are verified. Production Cloudflare verification remains an operational gate; in parallel, local product work is now focused on the workstation foundation: non-destructive creative directions, expanded naming, editable design tokens, and identity refinement. Supabase remains the product source of truth.

This is the canonical plan for work currently being done or prepared next. Update it when a work item changes state. It is not a product-status report: use [Product](./product.md) for source-backed truth and [Roadmap](./roadmap.md) for the full product arc.

## Operating rules

- Work in the order below unless this document is deliberately changed.
- A checkbox is complete only when its stated evidence exists.
- Do not represent a remote service as configured or operational without remote verification.
- Keep the request, job, asset, and export contract portable; do not couple product behavior directly to a runner or provider SDK.
- Do not add new product work to the transitional Trigger implementation.

## Current delivery package

### Portable generation foundation

**Objective:** establish a portable generation boundary and the Cloudflare control-plane foundation without changing product truth in Supabase.

**Why this is first:** the current application enqueues a Trigger full-kit task directly, and no Cloudflare Worker, Queue, Workflow, or runner adapter exists in source. Selective generation, provider-backed work, and job UX depend on this boundary.

### Entry criteria

- [x] Confirm the intended Cloudflare account and environment names: account `jami-studio` (`c294df364db8742bc02db57c046043ef`); Worker `etymalia-generation-staging`; Queue `etymalia-generation-staging`; Workflow `etymalia-full-kit-staging`. Production names are committed but not deployed: Worker `etymalia-generation-production`, Queue `etymalia-generation-production`, Workflow `etymalia-full-kit-production`.
- [x] Confirm the secret-management boundary: the deployed staging Worker has no secret bindings; source, `wrangler` configuration, queue payloads, browser state, and recorded evidence contain no Supabase service credential.
- [x] Confirm the first harmless staging request and durable-state evidence: Workflow instance `-0803cbbe58d1de5c616e45185c7b61f4b7651d6f0dcae00523cf37f1e3348fb4` completed on 2026-07-15 with test job ID `00000000-0000-4000-8000-000000000001`. Its sole `accept generation job` step returned the ID and timestamp; the Worker does not connect to Supabase or mutate product data.

Do not deploy production resources or make Cloudflare the active runner until the Cloudflare full-kit adapter and its staging proof are complete.

### Work items

#### 1. Define portable contracts

- [x] Define the typed `GenerationRequest` contract from the [generation contract](./architecture/generation-contract.md): workspace, brand, requested artifacts, source versions, priority, and idempotency key.
- [x] Define a runner port for enqueueing, retrieving state, cancellation/supersession hooks, and lifecycle updates.
- [x] Define a provider port using logical capabilities rather than provider/model strings in page or feature code.
- [x] Add a fake runner and contract tests for bounded requests and idempotent enqueueing without a live runner.

**Done when:** application code has one runner entry point and the same request fixture can run against a fake runner.

#### 2. Establish the Cloudflare package

- [x] Add a dedicated Worker package with committed `wrangler` configuration and explicit staging/production environments.
- [x] Define Workflow and Queue bindings for the first full-kit workload and a dead-letter route/replay procedure.
- [x] Generate and verify Worker binding types in local validation.
- [x] Add isolated Worker tests that do not require a live Cloudflare account.
- [x] Write a [runbook](./runbooks/cloudflare-generation.md) for deploy, dry-run, log tailing, Workflow inspection, queue inspection, and dead-letter replay.

**Done:** staging dry-run, type checks, and isolated tests passed. Staging Worker version `59da3331-1cee-4aa3-9a04-493f617e20fc` is deployed with its Queue, DLQ, and Workflow bindings. The recorded harmless Workflow instance completed successfully without accessing or changing Supabase product data.

#### 3. Make the job ledger request-first

- [x] Review `generation_jobs` against the portable request contract.
- [x] Add and remotely apply forward migrations for request, runner, idempotency, input-version, priority, Storage, and lifecycle-integrity fields.
- [x] Create the authorized ledger record before enqueueing so accepted work is observable even if a runner has not started.
- [x] Keep browser clients read-only for job lifecycle records and enforce owner/editor authorization before accepting mutations or generation.

**Done when:** authorized workspace members can observe an accepted request and its state transitions, while browser clients cannot fabricate or mutate lifecycle state.

#### 4. Isolate the Trigger adapter

- [x] Move the existing Trigger enqueue call behind the runner port.
- [x] Keep the current task as a transitional adapter only.
- [x] Confirm that export, asset, and page code do not import the Trigger SDK directly.

**Done:** the page action uses the runner port; Trigger SDK use is isolated to the adapter and Trigger task.

#### 5. Implement the Cloudflare full-kit adapter

- [x] Keep the Queue and Workflow payload contract to a job reference and idempotency key only; never raw media or secrets.
- [x] Extract the deterministic 45-artifact full-kit renderer into `@etymalia/asset-forge/full-kit`, with Trigger reduced to a lifecycle and persistence adapter. Use the package-local Inter font as the only renderer font source.
- [x] Add a private, one-instance Cloudflare Container binding with SSH disabled, a Docker-free local-development configuration, and a CI-only image-build workflow. The initial image exposes only internal health behavior and cannot mutate product data.
- [x] Create the GitHub `staging` environment for the renderer image workflow (ID `18221788608`).
- [x] Run the image-publish workflow and record the resulting staging image evidence before deploying the Container-enabled Worker. GitHub Actions run `29456382123` published `etymalia-generation-renderer:staging`; staging Worker version `706c226c-0da3-4659-9e79-a4b5a634f2f0` created the private one-instance Container application. The GitHub `staging` environment has its `CLOUDFLARE_API_TOKEN` secret (configured 2026-07-15); the short-lived token is scoped only to `Workers Containers: Edit` for the `jami-studio` account and expires after 90 days.
- [x] Prove the private Container execution path before granting it product credentials: Workflow instance `be279998-458c-4cf0-b01a-a05ceab047fe` completed on 2026-07-15 against the staging Container. Its `verify renderer health` step started the named private Container and received `{ "service": "etymalia-generation-renderer", "status": "ok" }`; no Supabase credential or product data was involved.
- [x] Provision staging-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` Worker secrets through Wrangler's secret interface. Both bindings were verified by name only on 2026-07-15; their values are not recorded or available to browser clients.
- [ ] Reload authorized, versioned inputs from Supabase inside durable execution, using the staging-only secret bindings. Do not add those values to source, configuration, queue payloads, logs, or browser state.
- [x] Decide and document the rendering compute boundary: Cloudflare Containers will run the Node-compatible deterministic full-kit renderer behind a private Worker binding. AWS remains reserved for a future workload that demonstrably exceeds this envelope. Preserve the existing job, asset, and export contract.
- [x] Persist artifacts and lineage incrementally so successful siblings survive partial failures. Verified on 2026-07-16: staging job `6cec40a6-87e5-40bd-943e-6cf9e45dbd06` completed with 45 private Storage objects and 45 matching `assets` records.
- [x] Record safe failure state, retry eligibility, and terminal lifecycle state in `generation_jobs`. The verified staging job attached runner `cloudflare:staging-full-kit-20260715-05`, reached `completed`, recorded `completed_at`, and cleared error fields. Earlier controlled failures retained artifacts and recorded the safe generic user-facing error state.
- [x] Add observable retry and dead-letter behavior. The staging Workflow retried controlled Container failures with recorded step evidence; Queue and DLQ bindings remain deployed. Production-level queue replay evidence remains part of the production gate.

**Done when:** a Cloudflare-backed full-kit request has a complete auditable lifecycle and preserves successful artifacts after a sibling failure.

#### Out-of-scope account option

Supabase Auth leaked-password protection is a paid option for this project and is explicitly out of scope. Its advisor warning is accepted; it does not block the delivery plan.

#### 6. Verify the production path

- [x] Run one authenticated production full-kit request through Cloudflare. Job `2c46411d-33cd-4afe-a3a7-202607161200` was accepted by the authenticated production Worker endpoint on 2026-07-16.
- [x] Verify the completed `generation_jobs` record. It reached `completed` with runner `cloudflare` and durable runner ID `cloudflare:cloudflare-proof:2c46411d-33cd-4afe-a3a7-202607161200`.
- [x] Verify expected private Storage objects and matching `assets` records. The target brand has 45 private Storage objects and 45 asset records.
- [ ] Verify authorized workspace previews/downloads.
- [ ] Verify the same artifacts appear in the authenticated ZIP export.
- [ ] Verify a non-member cannot access jobs, assets, Storage objects, or exports.

**Done when:** all six checks have recorded evidence. Only then may Cloudflare-backed full-kit generation be described as production-verified.

## Next delivery packages

### Workstation foundation — active local build

**Objective:** turn the linear brief-to-kit route into a real creative workstation with persistent user choice. This package deliberately does not add product work to Trigger, and it does not wait for provider-backed media work.

1. **Creative directions and drafts**
   - [x] Add forward-only storage for named directions and immutable snapshots. Migration `20260716100000_add_brand_directions.sql` stores the brief, token document/version, and candidate board; it was applied and verified remotely on 2026-07-16.
   - [x] Let editors rename, duplicate, archive, and restore directions without overwriting another direction. Source controls are implemented; deployed-workspace verification remains pending.
   - [x] Let editors save and reopen a direction, restoring its captured brief, token system, and name board atomically through an authorization-checked RPC. The schema/function are remotely verified; deployed-workstation verification remains pending.
   - [x] Show saved directions and the active direction in the workspace.
2. **Naming studio**
   - [x] Add naming controls for eras/language layers, strategies, syllable preference, and result count. The source-backed implementation constrains selected language layers, filters construction strategy, and retains generated provenance.
   - [ ] Add root-combination and exclusion controls, named lists, and comparison views.
   - [x] Support manually authored candidates alongside selected names and availability checks while retaining provenance for generated names. Named lists and comparison remain pending.
3. **Editable design system**
   - [x] Add direct semantic-token editing and palette exploration around user-selected color anchors.
   - [x] Run contrast feedback on every saved palette and retain incremented token versions. Direction snapshots/restoration remain pending.
4. **Identity refinement**
   - [x] Define an editable deterministic logo recipe for mark shape, wordmark voice, letter spacing, and horizontal/stacked lockup, persisted on the shared brand and reflected in live SVG previews. Migration `20260716110000_add_identity_recipe.sql` is applied remotely. Colorways and background simulations remain pending.
   - [ ] Save/refine/compare identity variants as direction state, then connect them to selective durable asset generation.

**Initial local evidence:** roadmap and delivery plan now treat a persistent, non-destructive identity workstation as the product target. Source implements expanded constrained naming, manually added candidates, direct semantic palette editing with versioned DTCG/contrast data, and direction save/reopen backed by a forward migration. Focused package tests, web type checking, and a production Next.js build pass; deployed-workstation verification remains a separate evidence gate.

These packages follow the workstation foundation and the Cloudflare production gate; their product direction and constraints remain in the [roadmap](./roadmap.md).

1. **Identity lab** — editable logo recipes, typography, mark/lockup/colorway controls, live usage previews, direction comparison, and durable variants.
2. **Selective durable generation and reference direction** — asset, collection, custom-selection, and complete-kit controls with real job status, retry, cancellation, lineage, and image-only reference workflow.
3. **Guide and export completion** — guide PDF, templates, persisted export records, selection UI, approvals, and exact manifests.
4. **Collaboration and commercial product** — invitations, audit/review, personal provider connections/BYOK, entitlements, billing operations, then public API.
5. **Heavy media and scale** — dedicated compute only after a workload meets the roadmap entry criteria.

### Commercial billing foundation

- [x] Add server-side Stripe Checkout with dashboard-managed promotion-code entry and Stripe's hosted customer portal.
- [x] Project signed Checkout/subscription/invoice events into Supabase and use an append-only, idempotent credit ledger for generation authorization.
- [x] Remotely apply the entitlement migration and deploy the signed production webhook endpoint `https://etymalia.jami.studio/api/stripe/webhook`.
- [x] Create the three Etymalia recurring Prices, set their credit allocations, and create the requested package-specific promotion codes. Personal is $30 monthly/$300 yearly with 3/36 credits; Entrepreneur is $60/$600 with 6/72; Business is $90/$900 with 9/108. Each annual-only 100%-off code permits one redemption.
- [x] Complete a live coupon Checkout and verify subscription projection, credit allocation, portal access, one credit debit, and the resulting full-kit lifecycle as an authenticated user. On 2026-07-16, the Business annual promotion completed with $0 due today, provisioned 108 credits, and a full-kit job completed with 45 private assets in the authenticated workspace. A paid-card renewal remains a future billing-operation check, not a prerequisite for this zero-cost launch path.

## Trigger retirement gate

Do not remove Trigger until selective Cloudflare-backed generation passes production verification. Then preserve historical records and artifacts, confirm no active run depends on Trigger, revoke runner-specific credentials, remove Trigger configuration and dependencies in one clean change, and update [Product](./product.md), this plan, and the [roadmap](./roadmap.md) together.

## Change log

| Date | Change |
| --- | --- |
| 2026-07-15 | Created as the canonical active execution plan after consolidating the prior handoffs and proposals. |
| 2026-07-15 | Implemented the local portable request/runner boundary, request-first job ledger, editor authorization, job read model, atomic name replacement, strict persisted-asset export, and migration hardening. |
| 2026-07-15 | Added the provider-neutral personal-generation port, authenticated credential-resolution guard, and Cloudflare preflight/recovery runbook. |
| 2026-07-15 | Authenticated the `jami-studio` Cloudflare account; created and deployed the isolated staging Worker, Queue, DLQ, and Workflow; and recorded a completed harmless Workflow instance. No production resource or product-data integration was deployed. |
| 2026-07-15 | Verified the linked Supabase legacy Android tables were empty; applied all three forward migrations remotely; and verified the retired tables, private Storage bucket, generation lifecycle constraints, and integrity triggers. |
| 2026-07-15 | Applied and verified database hardening migrations: restricted trigger and credential `SECURITY DEFINER` functions, moved recursive RLS helpers to the private schema, removed the public role RPC dependency, and resolved all database advisor findings except Supabase Auth's paid, out-of-scope leaked-password option. |
| 2026-07-15 | Confirmed the staging Worker has no secret bindings. Documented the Cloudflare product-adapter gate: provision secrets through Wrangler and make the Node-dependent full-kit rendering compute boundary explicit before porting it. |
| 2026-07-15 | Selected Cloudflare Containers as the private deterministic-renderer platform. Cloudflare Workers Paid is active; local Docker remains out of scope, so container images will be built and pushed from CI. AWS credits are retained for future workloads that need them. |
| 2026-07-15 | Added the Container-enabled Worker configuration, private `RendererContainer` binding, minimal internal health image, generated bindings, and GitHub Actions image-publish workflow. Staging deployment remains blocked until CI publishes the referenced image. |
| 2026-07-15 | Created the GitHub `staging` environment and extracted a tested 45-artifact shared full-kit renderer. Trigger now uses it only as a lifecycle/persistence adapter; removed the redundant Trigger-local font and fixed SVG font escaping and nearest-pixel raster aspect-ratio validation. |
| 2026-07-15 | Added the staging image-publish secret as a 90-day, `Workers Containers: Edit`-only Cloudflare account token. Verified only the GitHub secret name; its value is not recorded. Image publication, Container-enabled Worker deployment, and all product-data integration remain pending. |
| 2026-07-15 | GitHub Actions run `29456382123` published the staging renderer image. Deployed staging Worker version `706c226c-0da3-4659-9e79-a4b5a634f2f0` created the one-instance private Container application. A later staging Workflow instance `be279998-458c-4cf0-b01a-a05ceab047fe` completed its internal Container health step successfully; no Supabase credentials or product data were used. |
| 2026-07-15 | Provisioned staging-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Cloudflare Worker secret bindings through Wrangler. Verified binding names only. The Worker does not yet consume them; authorized data loading and product persistence remain separately gated adapter work. |
| 2026-07-16 | Completed the real staging Cloudflare full-kit proof. Workflow `806e7443-236c-4060-b1a9-379908aa583a` completed successfully after dispatching the private Container. Job `6cec40a6-87e5-40bd-943e-6cf9e45dbd06` completed with Cloudflare runner lineage, 45 private Storage objects, 45 matching `assets` records, and no terminal error. |
| 2026-07-16 | Added and remotely applied the Stripe/Supabase entitlement ledger and its concurrency correction. Deployed Checkout, portal, and signature-verified webhook routes to `etymalia.jami.studio`; provisioned Stripe endpoint `we_1TtjMbLHeqO273z7796jn5xM` with lifecycle and payment events, and verified a signed production webhook smoke request. Product/Price/coupon terms remain an explicit commercial decision. |
| 2026-07-16 | Created and deployed the live Etymalia Stripe catalog and six server-only Price bindings: Personal ($30/$300), Entrepreneur ($60/$600), and Business ($90/$900). Annual plans receive twelve months of credits up front and have one-redemption, annual-product-scoped 100%-off promotion codes. |
| 2026-07-16 | Corrected production authentication routing: added the custom domain to Supabase Auth's redirect allow-list, set it as the site URL, and sent successful Google sign-ins directly to `/workspace`. Existing authenticated users remain valid; no user reset is needed. |
| 2026-07-16 | Repaired the production generation acceptance path after live customer verification exposed that PostgREST cannot target the prior partial idempotency index with `on_conflict`. The forward migration replaces it with an equivalent nullable unique constraint. |
| 2026-07-16 | Completed the live Business annual coupon verification: Checkout accepted the one-time 100%-off code, the subscription projected 108 credits and portal access, and authenticated full-kit generation completed with 45 private assets. Fixed the Trigger production task bundle by explicitly including its Inter font and passing it to the portable renderer; Trigger deployment `20260716.2` is now verified for the transitional live path. |
| 2026-07-16 | Reframed the roadmap around a full identity workstation and began the studio foundation in source: constrained era/strategy-aware naming exploration, manually added name candidates, and direct semantic token editing with versioned DTCG contrast reports. Focused package tests and web type checks passed; deployment verification is still pending. |
| 2026-07-16 | Added and remotely applied the forward-only creative-direction migration and workspace surface. `brand_directions` and `activate_brand_direction(uuid)` were queried successfully in the linked database. Saved directions snapshot and atomically restore a brand's brief, name board, and token system through an RLS-authorized RPC; deployed-workstation verification remains pending. |
| 2026-07-16 | Verified the workstation increment with focused name-engine/token tests, web type checking, and a successful optimized Next.js production build. |
| 2026-07-16 | Added and remotely applied the identity-recipe migration. The identity lab now persists mark shape, wordmark voice, and letter spacing and feeds them into deterministic SVG previews; asset-forge tests and web type checks pass. |
| 2026-07-16 | Added the server-only Cloudflare enqueue adapter and authenticated Worker enqueue endpoint. The bounded payload contains only job ID and idempotency key; worker and web type checks pass. Production endpoint/secret binding configuration and an authenticated run remain required before activation. |
FINIsH THE PLAN _ COMPLETELY _ 100% CONNECTED AND VERFIFIED - NO MORE EXCUSES - YOU HAVE FULL ACCESS AND EVERYTHING YOU NEED - Out OF MY CHAt _ DO NOT COME BACK TO CHAT UNTIL EVERY SINGLE ITEM PLUS HAS BEEN FULLY COMPLETED AND VERIFIED
FIX ISSUES FINISH PLAN NOW
