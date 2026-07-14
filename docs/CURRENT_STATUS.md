# Etymalia — Current Repository Status

**Audited:** July 14, 2026  
**Scope:** checked-in source, package manifests, local build/test output, local CLI status, and Git history.  
**Authority:** This is the current implementation status. Dated handoffs under `docs/` are historical evidence, not current operational truth.

## Executive state

Etymalia is a dual-surface brand-identity product:

- **Web:** a Next.js 15 / React 19 workspace app with Supabase Auth and a deterministic Phase 1 brand-generation flow.
- **Android:** a native Compose / Room prototype that routes AI requests to a Supabase Edge Function, but does not yet have Supabase user authentication or a production-safe AI authorization model.

The web build and all TypeScript typechecks pass locally. Android production code compiles, but the Android unit-test task was initially blocked by obsolete template tests; those tests have been repaired and must be rerun after this audit change.

## Verified implementation

### Web platform — Phase 0 foundations

- pnpm + Turborepo workspace with `apps/web` and the six planned packages.
- Supabase workspace, membership, brand, token, name-candidate, reference, asset, and export schema migrations with RLS and private `etymalia` Storage policies.
- Google AI Studio and Vertex adapters, restricted internal smoke-route infrastructure, and a Vault-backed server-side Google credential store.
- Supabase-authenticated workspace bootstrap and draft-brand creation.

**Important boundary:** the Vault store is infrastructure only. There is no browser settings flow or execution path for production BYOK credentials.

### Web platform — Phase 1 MVP

- Brief persistence in `brands.brief`.
- Deterministic Etymaria naming from the bundled 270-entry curated corpus, including provenance and scoring; candidates persist to `name_candidates`.
- On-demand `.com` RDAP lookup.
- OKLCH palette generation, WCAG contrast checks, and DTCG token persistence.
- Deterministic SVG identity direction with `currentColor` monochrome variants.
- SVG favicon, web manifest/head snippet, and ZIP export containing the generated identity, DTCG tokens, shortlisted names, and manifest.

A July 14 handoff records live Supabase verification of this flow. This audit verified the implementation and the local build, but did not re-run authenticated production writes or RDAP requests.

### Web platform — Phase 2 partial slice

- Satori + Resvg social renderer with 12 social deliverables.
- `generate-full-kit` Trigger.dev task that loads a brand/tokens server-side, renders PNGs, writes private Storage objects, and upserts `assets` records.
- UI action to queue the task only after a DTCG palette exists.

The repository contains conflicting historical claims about whether the Trigger worker was deployed. The current code proves the task is configured; this audit could not authenticate the Trigger CLI or run the production job. Generated social assets are not yet displayed in the web UI or included in ZIP exports.

### Android application

- Kotlin, Jetpack Compose Material 3, Navigation Compose, Room, coroutines, `StateFlow`, Retrofit, and manual dependency injection.
- Local profiles and generated-asset gallery.
- Requests for logo, image, palette, audit, and video initiation are sent to the Supabase `gemini-proxy` Edge Function.
- As of this audit, Android build configuration exposes only `SUPABASE_URL` and `SUPABASE_ANON_KEY`; provider and service credentials are no longer emitted into `BuildConfig`.

## Release blockers and material gaps

### Must resolve before Android AI is production-ready

1. **Authorization and abuse controls:** Android has no Supabase sign-in/session and sends only the public anon key. The current `gemini-proxy` accepts caller-selected model, action, and payload without server-side allowlists, schema validation, per-user authorization, or rate limits. Do not treat it as a production AI gateway.
2. **Proxy contract hardening:** require authenticated users, authorize supported operations on the server, validate bounded inputs, apply rate/usage limits, and return safe errors. Then make Android send the user access token rather than a public-key bearer token.
3. **Video truthfulness:** the Android flow saves an operation name and currently fabricates a simulated operation on API failure. It does not poll, retrieve, store, play, or export a completed video.
4. **Data handling:** reference images and generated images are Base64 blobs in Room; Android backup rules currently do not exclude them. Define retention/backup behavior and move large media to managed files or Storage before broad usage.

### Must resolve before Phase 2 can be called delivered

1. Authenticate the intended Trigger.dev account and verify the configured project.
2. Deploy or confirm the deployed `generate-full-kit` task with its two runtime Supabase secrets.
3. Run an authenticated production job and verify completion plus exactly 12 Storage objects and matching `assets` rows.
4. Surface generated assets in the workspace and include them in export packages.
5. Implement reference import and complete the Typst vs React-PDF guide-renderer evaluation.

### Quality work already visible in source

- Android UI text is predominantly hardcoded; localization has not started.
- Android uses a destructive Room migration fallback despite the documented data-preservation requirement.
- Android export/share is not implemented.
- Android image rendering still decodes Base64 content directly; a managed image-loading/storage strategy is needed before large-media usage.
- Unused Coil and legacy Firebase/Google Services catalog entries were removed in this audit.
- Web has no committed automated unit, integration, or browser tests.

## Roadmap from the real baseline

### Next: secure and finish what exists

1. Harden and authenticate the Android AI path; remove the simulated video-success behavior.
2. Prove the Trigger social job end-to-end, then render/list/export its generated assets.
3. Add focused automated tests around web generation, export, task input/output, Android repository behavior, and the proxy contract.
4. Establish error monitoring and product analytics only after selecting and configuring the intended vendors.

### Phase 2 completion

- Reference upload/import with bounded file validation and extraction.
- Brand-guide renderer prototypes (Typst and React-PDF), quality comparison, and one documented selection.
- Real raster identity derivatives (PNG/ICO) and complete favicon output.

### Phase 3

- Email signature, digital business card / QR / vCard, letterhead, and templates gallery.
- Production BYOK settings/execution flow, then Stripe entitlements only when a managed-credit product is defined.
- Social/SEO availability and registrar integrations only after vendor and terms-of-service review.

### Phase 4

- Workspace-member management UI and invitations.
- Brand-audit feedback loop, premium templates, and a documented external export API.
- Semantic corpus retrieval with Postgres + pgvector only after a migration, embedding design, and corpus-governance plan exist.

## Validation performed in this audit

| Command | Result |
| --- | --- |
| `pnpm check` | Passed: all seven TypeScript typechecks and the optimized Next.js production build. |
| `./gradlew :app:testDebugUnitTest` (before test repair) | Failed because stale template screenshot references did not compile. Production Kotlin compiled first. |
| `supabase status` | Not available locally: Docker Desktop Linux engine was not running. This does not establish remote migration state. |
| `pnpm exec trigger whoami` | Timed out without an authenticated result; Trigger deployment state is therefore unverified in this audit. |
| Editor diagnostics (before changes) | No diagnostics reported by the editor integration. |

## Documentation policy

- `README.md`, `docs/roadmap.md`, and this file describe current code truth.
- `docs/research/webapp_master_plan.md` is a forward architecture plan; it must label proposed tooling as proposed until a dependency and implementation exist.
- `docs/SESSION_*` and `.changelog/*` documents are historical records. They must not be used as a current deployment-status source without revalidation.
