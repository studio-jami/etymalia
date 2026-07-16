# Etymalia roadmap

This is the end-to-end product shape. The [delivery plan](./plan.md) is the authoritative order and evidence for active work; nothing in this document implies a capability is implemented or remotely verified.

## Product end state

Etymalia is a web-first identity workstation: a persistent creative surface where a person or team can move freely between strategy, naming, visual direction, logo exploration, system design, production assets, and delivery. Guided creation is an optional accelerator—not a funnel. Every meaningful choice is editable, versioned, comparable, saveable, and exportable from one shared brand state.

### The workstation

| Surface | End-state capability |
| --- | --- |
| Brand strategy | Rich brief, audience, positioning, personality sliders, creative principles, reference notes, and era/cultural direction. |
| Naming studio | Etymology-led roots and provenance, eras/language layers, combinations, exclusions, pronounceability and length controls, saved lists, comparisons, domain checks, and manually authored candidates. |
| Creative direction | Multiple named directions per brand, each with a snapshot of brief, references, naming choice, tokens, typography, logo recipe, and generation lineage. |
| Identity lab | Editable logo concepts, marks, lockups, type pairings, spacing, colorways, backgrounds, and usage tests; users can branch, refine, compare, approve, or discard directions without losing history. |
| Design system | Semantic colors, typography, spacing, radii, imagery, and voice tokens; direct token editing with contrast and usage feedback; quick color swaps and coherent palette exploration. |
| Asset studio | First-class requests for an individual asset, a collection, a selected set, or a complete kit; reference-aware generation, variants, version lineage, job status, retry, cancellation, and partial-result preservation. |
| Library and delivery | Private source assets, drafts, approvals, exports, exact manifests, brand guide, templates, shareable review, and downloadable kits. |

## Non-negotiable product principles

- One brand state supports direct work, guided work, and durable generation. A generation never silently overwrites a chosen direction.
- Every mutation is attributable and recoverable through immutable direction/version snapshots. Drafting is cheap; approval is explicit.
- User choices are first-class inputs: names, roots, combinations, eras, colors, typography, mark structure, references, and requested outputs.
- Deterministic systems handle repeatable design mechanics (tokens, contrast, layout, derivatives, exports). Provider-backed systems are interchangeable creative collaborators behind the portable generation contract.
- Supabase remains the source of truth for Auth, Postgres/RLS, private Storage, directions, assets, jobs, and exports. Browser clients never receive provider, service-role, OAuth, or runner credentials.
- Completion means durable work and delivery, not an enqueue acknowledgement.

## Delivery arc

### 1. Studio foundation — shared state, directions, and creative controls

Replace the linear flow with an editable workstation shell. Add a forward-only data model for named directions and immutable snapshots; preserve the current brand as the initial direction. Expand the brief and naming controls; support manual names and root/era/combination constraints. Add direct semantic-token editing, palette exploration, contrast feedback, and a non-destructive selected direction.

**Acceptance:** an editor can create, rename, switch, duplicate, and restore a draft direction; change a name or palette without losing another direction; and reload the workspace with the same selected state.

### 2. Identity lab — logo recipes and visual-system refinement

Represent deterministic logo construction as an editable recipe rather than a one-shot SVG. Ship mark, lockup, type, spacing, colorway, and background controls with live previews, usage simulations, and versioned variants. Add typography and expanded design tokens. Provider-backed logo/image exploration may supplement—not replace—the editable recipe.

**Acceptance:** an editor can produce and compare multiple identity directions, adjust a chosen mark and colorway, preserve versions, and create production-safe vector/raster derivatives from the selected recipe.

### 3. Durable creative production — selective, reference-aware assets

Make the Cloudflare-backed runner the production path for single assets, collections, custom selections, and complete kits. Add image-reference upload with explicit validation, retention, deletion, and extraction suggestions. Preserve all successful siblings on partial failure; provide observable status, retry, cancel, and lineage.

**Acceptance:** an authenticated production user can request, observe, retry/cancel, privately preview, and export individual assets, a selected collection, and a complete kit through Cloudflare. Only then retire Trigger from product enqueue paths.

### 4. Brand system delivery — guides, templates, and exact exports

Create a durable brand guide with approved strategy, naming rationale, tokens, logo rules, typography, asset usage, and version provenance. Add stationery/templates, selected exports, persisted manifests, and exact artifact lineage.

**Acceptance:** a reviewer can see what was approved; an editor can export an exact selected set with IDs, versions, paths, and generator metadata; exports remain available only to authorized members.

### 5. Collaboration and commercial product

Add invitations, roles, review/approval states, comments, audit events, organization-level controls, provider connections/BYOK, server-enforced entitlements, billing operations, and a public export API only after the internal contract is stable.

### 6. Advanced media and scale

Add providers and dedicated compute only when a concrete workload warrants them (for example, complex vectorization, document extraction, video, or high-volume rendering). Each workload must document input/output, cost, latency, cancellation, residency, and why the Cloudflare envelope is insufficient while preserving the same product contract.

## Platform boundaries

| Concern | Direction |
| --- | --- |
| Product truth | Supabase Auth, Postgres/RLS, private Storage, direction/version, job, asset, and export ledgers. |
| Durable control plane | Cloudflare Workflows and Queues behind the portable runner port. |
| Deterministic rendering | Cloudflare Containers, privately invoked through durable execution. |
| Provider-backed creation | Capability-based provider ports; personal connections and BYOK remain server-side. |
| Transitional runner | Trigger.dev is transitional; do not add new product features directly to it. |
| Heavy compute | AWS/GCP only after a documented workload exceeds the Cloudflare capability/cost envelope. |

## Production gate for creative generation

Do not describe durable creative production as production-verified until an authenticated user can create and preserve multiple directions; request an asset, a collection, and a complete kit; observe real job state; retry or cancel safely; access only authorized private artifacts; and export the exact selected results with a manifest.
