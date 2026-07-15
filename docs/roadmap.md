# Etymalia Roadmap

**Audited baseline:** July 14, 2026

**Current source of truth:** [`CURRENT_STATUS.md`](./CURRENT_STATUS.md)

Etymalia is a web-first professional brand-identity platform. The Android application is a legacy prototype and is intentionally outside this roadmap.

## Non-negotiable end shape

- AI credentials never reach a browser or Android APK.
- Every AI request is authenticated, authorized, validated, rate/usage limited, observable, and attributable.
- Brand tokens are the source of truth; all rendered deliverables derive deterministically from them.
- Long-running media work is durable, idempotent, observable, and reflected in both the UI and the export package.
- Guided build accelerates users without constraining them: every stage must also support direct editing, selective generation, comparison, and individual or collection export.
- Claims of deployment, availability, and vendor support are evidence-bound—not inferred from source configuration.

## Current baseline

| Area | Status |
| --- | --- |
| Monorepo, Supabase workspace schema/RLS, Google AI adapters | Implemented in source. |
| Vault-backed Google credential store | Implemented server-side only; no user-facing BYOK flow. |
| Phase 1 web: names, palette, SVG identity, SVG favicon, ZIP export | Implemented; historical live verification exists but was not re-run in this audit. |
| Phase 2 social renderer and Trigger task | Trigger Cloud production version `20260714.7` is deployed; the durable task now emits social, identity, and favicon artifacts with RLS-scoped lifecycle records. A post-deployment successful task run still needs artifact-count verification. Persisted assets have previews/downloads and authenticated ZIP export support. |
| Android Compose / Room client | Legacy prototype; outside the web product roadmap. |
| Phase 3 and Phase 4 product capabilities | Not implemented, except the Phase 4 membership schema/RLS foundation. |

## 0. Release integrity — do first

See [`GENERATION_SYSTEM.md`](./GENERATION_SYSTEM.md) for the portable request/job/asset/export contracts and runner decision criteria.

### Web delivery proof

1. Diagnose why accepted production run `run_cmrlas9yz992t0poanewtq6yi` remains `QUEUED` without a `generation_jobs` record after deployed Trigger version `20260714.7`.
2. Re-run only after the queue/worker condition is resolved; verify terminal status, expected stored artifact count, and matching `assets` rows.
3. Confirm the workspace gallery/listing and ZIP-export path against the verified production output.

### Verification foundation


- Add web unit/integration tests for the deterministic engines, server actions, export route, and Trigger task boundaries.
- Select monitoring and analytics vendors before adding integrations; do not claim Sentry or PostHog coverage while neither is configured.

## 1. Web Phase 2 — complete the full kit

- Reference import with explicit MIME/size limits, private Storage paths, deletion, and palette/vibe extraction—plus manual application of extracted suggestions.
- Selective and collection generation controls for identity, favicons, social assets, and exports; complete-kit generation remains a convenience composition.
- Real raster derivatives: PNG/ICO and a standards-complete favicon package.
- Prototype the brand guide in Typst and React-PDF, assess output/operations/accessibility, and record one chosen renderer.
- Include social assets, guide, and raster identity derivatives in the export manifest and ZIP.

## 2. Etymaria name engine

- Maintain the current 270-entry curated corpus with named ownership, licensing/provenance, review standards, and versioned releases.
- Add CMUdict pronounceability and optional server-side AI polish only with structured, validated outputs.
- Add Postgres + pgvector semantic retrieval only after the extension, schema, embeddings, RLS behavior, and refresh process are implemented and tested.
- Keep RDAP as the first availability signal; add social/SEO signals only after provider and terms-of-service review.

## 3. Web Phase 3 — deliverable depth and monetization

- Email signature, digital business card/QR/vCard, letterhead, and templates gallery.
- Product-ready BYOK setup/execution, secure deletion/rotation, and entitlement-aware UX.
- Stripe Billing only once plans, limits, tax/merchant responsibilities, webhook lifecycle, and managed-credit economics are defined.
- Registrar buy-through/affiliate integration only after selecting a compliant partner.

## 4. Web Phase 4 — collaboration and scale

- Member invitations, membership/role management, and audit trail on the existing workspace schema.
- Brand-audit feedback loop, premium templates, and documented public export API.
- Capacity, cost, privacy, retention, incident response, and observability runbooks before scaling user media workloads.



## Planned tooling versus implementation

The master plan lists potential tools such as Vercel AI Gateway, OpenAI/xAI/fal providers, Style Dictionary, Uppy, Typst, React-PDF, Stripe, MJML, QR tooling, and vectorization libraries. None is a current implementation merely because it appears in that plan. Add a dependency and verified code path before promoting a proposal to the implemented architecture.
