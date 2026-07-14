# Etymalia Roadmap

*Updated July 2026*

Etymalia is evolving from a native Android brand-asset app into a **professional-grade brand generator platform** (web + Android), with the resurrected **Etymaria** etymology name engine as its signature capability.

> The web platform's full architecture and tooling choices live in
> [`docs/research/webapp_master_plan.md`](./research/webapp_master_plan.md).
> This roadmap is the high-level sequencing view.

## Guiding constraints (see `AGENTS.md`)
- Backend is **Supabase** (Auth + Postgres + Storage + Edge Functions). No Firebase.
- AI never called from clients — routed via server (Edge Function `gemini-proxy` on Android; server route handlers / provider-direct SDKs on web).
- Android UI is **Jetpack Compose + Material 3**; DI is **manual by design** (no Hilt/Dagger).
- Web is **Next.js 15 + React 19 on Vercel**, not Compose Multiplatform.

---

## Track A — Android app (stabilize)
1. **Remove leftover key guard**: `BrandViewModel.generateBrandColorPalette()` still references `BuildConfig.GEMINI_API_KEY`; it already routes through `gemini-proxy` — delete the guard.
2. **UiState/UiEvent**: adopt an MVI-style `UiState`/`UiEvent` wrapper for clean error, rate-limit, and loading handling.
3. **Externalize strings**: move hardcoded UI text into `strings.xml`.
4. **Native share/export**: `Intent.ACTION_SEND` for SVG/MP4 export.

## Track B — Web platform (build) — *primary focus*

### UI system decision (July 2026)
- **Dark is the default theme; light is a first-class semantic theme override.** Theme selection must persist per user/browser.
- **Global styling only:** colors, typography, spacing, borders, radii, elevation, focus states, and responsive behavior are expressed as reusable tokens and shared primitives. Do not introduce page-local visual systems or one-off styling.
- **Visual direction:** compact, editorial, and professional—hairline separation, restrained radii, controlled type scale, and muted accents. See `docs/references/ui-design/terra-proposal/`.
- **Workspace model:** one brand workspace supports both Quick Build (reference + brief to first direction) and Directed Build (step-by-step). They share the same brief, tokens, assets, and export source of truth.

Phased per the master plan:

- **Phase 0 — Foundations:** ✅ Turborepo + pnpm workspace and package skeletons (`apps/web`, `@etymalia/{ai,tokens,name-engine,availability,asset-forge,exporters}`); ✅ additive workspace/brand schema + membership RLS migration; ✅ Google AI Studio/Vertex provider port, Studio credential store, and allowlisted Node-runtime smoke route. Next: configure a Studio user ID and verify the live Google smoke call; then add the Vault-backed production credential store.
- **Phase 1 — MVP:** Etymaria naming (keyword → blended candidates + provenance → **RDAP** domain availability) · OKLCH palette (contrast-checked) · one logo → vectorize → variant matrix · favicons · **zip export**.
- **Phase 2 — Full kit:** social kits (satori) · brand guide book (**prototype Typst *and* react-pdf**) · reference import (Uppy) · **Trigger.dev** orchestration for full-kit generation.
- **Phase 3 — Deliverable depth + monetization:** email signature (MJML) · digital business card + branded QR + vCard · letterhead · templates gallery · **Stripe** subscription over BYOK · social/SEO availability behind flags · registrar **buy-through + affiliate**.
- **Phase 4 — Scale:** multi-member workspaces · brand-audit loop · premium templates · export API.

## Track C — Etymaria name engine (signature moat)
1. **Re-export the source corpus** (`docs/references/etymology_brand_table…`) to clean UTF-8 — current CSV has mangled Greek/diacritics.
2. Load into **Postgres + pgvector** (roots, semantic fields, cross-linguistic layers, drift notes, tone, syllables, candidates).
3. Blending engine (portmanteau/affixation/compounding across language families) + scoring (meaning fit × pronounceability × availability × brevity).
4. Grow the curated corpus beyond the initial 281 rows — the editorial layer is the defensible asset.

---

## Two deliberate lanes (internal vs prod)
Same AI port, different credential resolver — see master plan §5.1 and §11:
- **Studio lane (internal):** our pooled credits (Vertex now), all premium models, high limits.
- **Prod lane (users):** BYOK (zero COGS) or charge-through (Stripe-metered); optional OAuth-Google.

They need not be feature-equal.
