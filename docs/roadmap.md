# Etymalia Roadmap

**Audited baseline:** July 14, 2026

**Current source of truth:** [`CURRENT_STATUS.md`](./CURRENT_STATUS.md)

Etymalia is becoming a professional brand-identity platform. The web app is the primary product track; Android remains a separate native client and must meet its own security and reliability release bar.

## Non-negotiable end shape

- AI credentials never reach a browser or Android APK.
- Every AI request is authenticated, authorized, validated, rate/usage limited, observable, and attributable.
- Brand tokens are the source of truth; all rendered deliverables derive deterministically from them.
- Long-running media work is durable, idempotent, observable, and reflected in both the UI and the export package.
- Claims of deployment, availability, and vendor support are evidence-bound—not inferred from source configuration.

## Current baseline

| Area | Status |
| --- | --- |
| Monorepo, Supabase workspace schema/RLS, Google AI adapters | Implemented in source. |
| Vault-backed Google credential store | Implemented server-side only; no user-facing BYOK flow. |
| Phase 1 web: names, palette, SVG identity, SVG favicon, ZIP export | Implemented; historical live verification exists but was not re-run in this audit. |
| Phase 2 social renderer and Trigger task | Implemented in source; deployment/run completion is unverified in this audit. Assets are not yet surfaced or exported. |
| Android Compose / Room client | Implemented as a prototype; AI proxy authentication and hardening are release blockers. |
| Phase 3 and Phase 4 product capabilities | Not implemented, except the Phase 4 membership schema/RLS foundation. |

## 0. Release integrity — do first

### Android AI gateway

1. Implement Supabase authentication/session handling in Android.
2. Make the Edge Function require authenticated users; authorize a fixed server-side operation/model allowlist.
3. Validate request shape and media bounds; enforce rate/usage limits and safe error mapping.
4. Remove fabricated video-success behavior and implement real operation polling, retrieval, storage, playback, and export—or remove video from the product until it is real.
5. Define backup/retention policy for generated and reference media; avoid storing unbounded Base64 blobs in Room.

### Web delivery proof

1. Authenticate the intended Trigger.dev account and verify the configured project.
2. Deploy/confirm `generate-full-kit` with scoped Supabase runtime credentials.
3. Run a real job for an authenticated brand with valid DTCG tokens.
4. Verify its terminal status, 12 private Storage files, and 12 `assets` rows.
5. Add workspace gallery/listing and ZIP-export support for generated social assets.

### Verification foundation

- Repair and run Android unit/snapshot tests; add repository and proxy-contract coverage.
- Add web unit/integration tests for the deterministic engines, server actions, export route, and Trigger task boundaries.
- Select monitoring and analytics vendors before adding integrations; do not claim Sentry or PostHog coverage while neither is configured.

## 1. Web Phase 2 — complete the full kit

- Reference import with explicit MIME/size limits, private Storage paths, deletion, and palette/vibe extraction.
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

## Android quality track

- Move user-visible strings to resources and add accessibility semantics.
- Replace destructive Room migration fallback with explicit migrations and schema export.
- Implement native share/export for only genuinely generated assets.
- Remove unused dependencies and legacy Firebase catalog entries.

## Planned tooling versus implementation

The master plan lists potential tools such as Vercel AI Gateway, OpenAI/xAI/fal providers, Style Dictionary, Uppy, Typst, React-PDF, Stripe, MJML, QR tooling, and vectorization libraries. None is a current implementation merely because it appears in that plan. Add a dependency and verified code path before promoting a proposal to the implemented architecture.
