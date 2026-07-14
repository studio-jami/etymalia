# Etymalia Web Platform — Product & Engineering Master Plan

**Status:** Forward architecture plan — not an implementation inventory
**Date:** July 2026

> **Implementation boundary:** Current verified implementation and release blockers are maintained in [`docs/CURRENT_STATUS.md`](../CURRENT_STATUS.md). A library, vendor, OAuth flow, or deployment described below is a proposal unless it is present in package manifests and source and has an explicit verification record. Current AI runtime support is Google AI Studio and Vertex only; Vercel AI Gateway, OpenAI, xAI, fal, and OAuth-linked provider execution are not implemented.
**Owners:** James / Etymalia
**Scope:** The `etymalia.jami.studio` web app — a professional-grade, payment-gated brand generator, including the resurrection of the original **Etymaria** name engine.

> How to read this doc: §1–3 are the *why/what*. §4–14 are the *how* (architecture + chosen open-source tooling per capability). §15 is the **build-vs-buy decision table** (the "don't handroll" contract). §16 is the phased roadmap. §17 lists decisions still owed.

---

## 1. Vision & Positioning

Build the tool a founder or brand designer opens on day zero and leaves with a **complete, drop-in brand system** — names, logos, colors, type, favicons, social kits, a guideline book, and stationery — that looks like a $20k agency deliverable.

We are explicitly benchmarking against the best payment-gated products in this space (Looka, Brandmark, Canva Brand Kit, Turbologo, Namelix + Brandmark's owners, Durable, Recraft). Our differentiators:

1. **Etymology-driven naming** (Etymaria) — names with *meaning and provenance*, not Markov noise. This is our moat; nobody does real etymology at depth.
2. **Deliverable completeness** — we don't stop at a logo PNG. We ship the *whole* package, correctly formatted, standards-compliant, ready to drop in.
3. **BYOK-first economics** — users bring their own AI keys (near-zero marginal cost to us) with a subscription tier layered on top later.
4. **Provider-agnostic AI** — Google today, but behind an adapter so OpenAI / xAI (Grok) / fal / Vercel AI Gateway are config changes, not rewrites.

---

## 2. First Principles & Design Tenets

- **SVG is the single source of truth.** Every logo/mark is authored or vectorized to clean SVG once; *every* other format (PNG@Nx, PDF, ICO, WebP, social crops) is a deterministic derivation. Never generate the same asset twice by hand.
- **Tokens, not pixels.** Color, type, spacing, radius live as **design tokens** (W3C DTCG format). Every rendered artifact reads from the token set, so a palette change re-flows the entire kit.
- **Deterministic pipelines around non-deterministic AI.** AI proposes (names, raster concepts, copy); deterministic code disposes (vectorization, resizing, packaging, validation). Reproducibility and correctness live in the deterministic half.
- **Reuse > reduce > recycle.** Every capability below maps to a mature OSS library or an industry standard. We write *glue and taste*, not primitives. See §15.
- **Ports & adapters (hexagonal).** AI, domain-availability, social-availability, storage, and billing are all *ports* with swappable adapters. No feature code imports a vendor SDK directly.
- **Simple elegance.** A capability ships only when its output is *drop-in correct*. A half-correct favicon set is worse than none.

---

## 3. Product Scope — the 12 Pillars

| # | Pillar | One-line outcome |
|---|--------|------------------|
| 1 | BYOK → Subscription | User supplies keys now; managed billing later, same UX. |
| 2 | AI provider adapter | Google default; OpenAI/Grok/fal/Vercel Gateway swappable. |
| 3 | Multiple brands/projects | Workspaces → brands → assets, multi-tenant with RLS. |
| 4 | Reference import | Photos, video, docs → analyzed for palette/type/vibe. |
| 5 | Export packages | One-click `.zip` of the entire, organized brand kit. |
| 6 | Logo system | All variants (color/mono/BonW/WonB/transparent) × all lockups (horizontal/vertical/icon/wordmark) × all formats. |
| 7 | Favicons | Full device/size/manifest set, standards-compliant. |
| 8 | Social kits | Avatars, covers, OG images per platform spec. |
| 9 | Brand Guide Book | Professional PDF guidelines + asset index. |
| 10 | Templates & examples | Curated starting points and showcases. |
| 11 | Additionals | Email signature, letterhead, digital business card + branded QR/vCard. |
| 12 | "Best of the best" | Quality bar: every output is agency-grade and correct. |

---

## 4. System Architecture (overview)

```
                         ┌─────────────────────────────────────────┐
                         │        Next.js 15 (App Router)           │
   Browser  ───────────► │  React 19 · shadcn/ui · Tailwind v4      │
                         │  Editor · Gallery · Billing · BYOK vault  │
                         └───────────────┬──────────────────────────┘
                                         │ RSC / Route Handlers / Server Actions
                         ┌───────────────▼──────────────────────────┐
          ┌──────────────┤   Application core (ports & adapters)     ├───────────────┐
          │              └───────────────┬──────────────────────────┘               │
          ▼                              ▼                                            ▼
 ┌──────────────────┐        ┌────────────────────────┐              ┌───────────────────────────┐
 │  AI PORT         │        │  ASSET FORGE (jobs)     │              │  DATA (Supabase Postgres) │
 │  Vercel AI SDK   │        │  Trigger.dev workflows  │              │  workspaces/brands/assets │
 │  + AI Gateway    │        │  vtracer·resvg·satori   │              │  RLS · Vault (BYOK keys)  │
 │  google/openai/  │        │  favicons·Typst·SVGO    │              │  Storage (S3-compatible)  │
 │  xai/fal         │        │  → zip exporter         │              └───────────────────────────┘
 └──────────────────┘        └────────────────────────┘
          ▲                              ▲
          │                              │
 ┌────────┴─────────┐        ┌───────────┴────────────┐
 │ NAME ENGINE PORT │        │ AVAILABILITY PORTS      │
 │ Etymaria         │        │ RDAP (domains)          │
 │ Wiktextract data │        │ Domainr / registrar API │
 │ Datamuse         │        │ social-handle adapters  │
 └──────────────────┘        └────────────────────────┘
```

**Deployment:** Vercel (web + serverless/edge route handlers) · Supabase (Postgres, Auth, Storage, Vault, Edge Functions) · Trigger.dev (durable background jobs for long AI/media pipelines). All secrets server-side per `AGENTS.md`.

---

## 5. The AI Provider Adapter (Pillar 2)

**Chosen standard: the [Vercel AI SDK](https://sdk.vercel.ai) (`ai`) + [Vercel AI Gateway](https://vercel.com/docs/ai-gateway).** This is the single most important "don't handroll" decision — it *is* the adapter you described, already built, and you're already on Vercel.

- **Unified interface:** `generateText`, `streamText`, `generateObject` (structured output via Zod), `generateImage`. Swapping providers is a one-line model change.
- **Providers as packages:** `@ai-sdk/google` (default), `@ai-sdk/openai`, `@ai-sdk/xai` (Grok), `@ai-sdk/fal` (image/video), plus the **AI Gateway** for unified routing, key management, spend limits, and failover across all of them.
- **Provider registry:** wrap in `createProviderRegistry({...})` so feature code references logical model IDs (`brand:fast-text`, `brand:vector-concept`, `brand:vision`) and never a vendor string.
- **BYOK path:** for user-supplied keys, instantiate a per-request provider with the user's key (pulled from Supabase Vault, §11); for managed/subscription users, route through the Gateway with *our* key.
- **Structured brand output:** all AI that produces brand data returns a **Zod-validated object** (`generateObject`) — palette, name candidates, guideline copy — never free-form text we then regex.

> Android no longer packages or checks `GEMINI_API_KEY`; it calls the Edge Function using public Supabase client configuration. The web app must never hold provider keys client-side; server routes may use only server-side credential resolvers. The Android proxy still needs authenticated-user authorization and abuse controls before production release.

---

## 5.1 Provider Credentials, Auth & the Two Lanes

Provider (which model vendor) and **credential source** (whose account pays) are **orthogonal**. The AI port resolves them separately: feature code asks for a logical model; a **credential resolver** decides which key/account fulfills it.

### Credential modes (proposed; validate before implementation)
| Mode | Intended approach | Current state |
|------|-------------------|---------------|
| **OAuth-linked account** | Use only a documented provider OAuth program with explicit third-party API entitlement, PKCE, token storage/rotation, revocation, and terms approval. | Not implemented; do not infer API rights from consumer chat subscriptions or OIDC discovery. |
| **BYOK API key** | Store user key material in Supabase Vault and decrypt only in server runtime. | Google storage/resolution infrastructure exists; no user-facing configuration or execution flow exists. |
| **Pooled / managed** | Server-held provider credentials with explicit entitlements, spend limits, and metering. | Studio smoke infrastructure exists for Google; managed production offering is not implemented. |

Any future OpenAI, xAI, fal, Gateway, or Google OAuth implementation must be based on current official provider documentation and an explicit entitlement/terms review at the time of implementation. OAuth discovery alone is not evidence that a third-party product may use a token for API inference.

### Concrete credential matrix (our actual setup)
| Provider | Auth we use | Notes |
|----------|-------------|-------|
| **Google** | **API key** (primary) | AI Studio post-pay key (Pro sub) **and** Vertex SA key — both do text/image/video. Free daily + Pro + Vertex cover us. Google OAuth kept but not load-bearing. |
| **OpenAI** | **OAuth only** | Codex-style (`auth.openai.com`). No API-key lane — we won't fund API credits. |
| **xAI (Grok)** | **OAuth only** | In-app OAuth login **direct to `auth.x.ai`** (`api:access`). No API-key lane, no proxy. |

The port models this as: Google → `apiKey` / `serviceAccount` sources; OpenAI + xAI → `oauth` sources (refresh + attach as Bearer). Concrete TS contract sketched in [`ai-credential-resolver.sketch.ts`](./ai-credential-resolver.sketch.ts) — a discriminated-union `CredentialSource` → `CredentialResolver` (handles refresh / SA token minting) → `buildProvider` (maps to the AI SDK). An OAuth access token simply *is* the `apiKey` for the OpenAI/xAI AI-SDK adapters.

### The two lanes (same port, different resolver)
| | **Studio lane (internal)** | **Prod lane (users)** |
|--|---------------------------|------------------------|
| Credentials | Pooled — **Vertex credits** now; add OpenAI/xAI API top-ups as funded | **BYOK** (Vault) or **charge-through** (our keys, Stripe-metered); optional OAuth-Google |
| Models | All premium / bleeding-edge | Gated by plan |
| Limits | High | Per-tier |
| COGS | Ours | ~Zero (BYOK) or passed through |

They deliberately need **not** be feature-equal. Studio can run models the prod tier gates.

### Vercel AI Gateway — supported, not targeted
Default path is **provider-direct SDKs** (`@ai-sdk/google|openai|xai|fal`). The Gateway is an **optional adapter** for unified billing/observability/failover. Caveat: even with BYOK routed *through* the Gateway, Vercel may still require a funded balance for some image/video providers (e.g. fal) — a reason not to make it the primary path. Swapping in the Gateway is a one-line change in the AI SDK, so we lose nothing by keeping it optional.

---

## 6. Etymaria Name Engine (resurrection — Pillar 1's moat)

**Goal:** thousands of etymology roots across hundreds of semantic domains → blended, meaningful, on-brand names → live availability + ranking signal.

### 6.1 Data sources (all open / standards-based)
| Need | Source | Notes |
|------|--------|-------|
| Machine-readable etymology | **Wiktextract / kaikki.org** JSON dumps | Tatu Ylönen's parse of all Wiktionary; includes etymology, roots, senses, translations. This is the goldmine — download, don't scrape. |
| Word associations / rhyme / "means-like" | **Datamuse API** | Free, no key; `rel_*`, `ml=`, `sl=` queries for semantic + phonetic neighbors. |
| Lexical relations | **WordNet** (Princeton) / Open English WordNet | Synonyms, hypernyms for semantic expansion. |
| Phonetics / syllables | **CMUdict** | Syllable counts, pronounceability scoring. |
| Roots (cross-linguistic) | **Our curated seed corpus** — bundled as 270 entries in `packages/name-engine/src/corpus.json` | The proprietary curation layer = the moat (see below). |

**The moat is the curated corpus, not the raw etymology.** Wiktionary/Wiktextract have the raw data; anyone can get it. What's defensible is our seed spreadsheet's editorial layer: **281 rows spanning PIE → Proto-Germanic → Old English → Old Norse → Middle English → Classical/Medieval Latin → Ancient Greek → Old French → Sanskrit → Arabic → Persian/Avestan → Hebrew/Aramaic → Celtic**, each tagged with **semantic field, meaning-drift notes, tone/register, syllable count, and hand-picked brand candidates** — plus the **blending engine** that recombines roots *across* language families into novel names with provenance. That editorial+algorithmic corpus, versioned and grown over time, is the durable advantage.

> **Data status:** the bundled 270-entry corpus is the current deterministic runtime source. Postgres/pgvector hosting and any expanded import pipeline are future work; validate source encoding, licensing, provenance, and editorial review before import.


### 6.2 Generation pipeline
1. **Intake:** user keywords + brand attributes (industry, tone, length, syllables).
2. **Semantic expansion:** Datamuse + WordNet → related concepts; map concepts → etymological roots via our curated index.
3. **Blending strategies (deterministic + AI-assisted):** portmanteau, affixation (Greek/Latin prefixes/suffixes), compounding, phonetic mutation, truncation. Score each candidate for pronounceability (CMUdict), length, and root-meaning coherence.
4. **AI polish:** `generateObject` pass to rank/label candidates with a meaning blurb + provenance ("from Latin *lumen* 'light' + *-aria*").
5. **Availability enrichment (async, see §6.3).**
6. **Rank:** composite score = meaning fit × pronounceability × availability × brevity.

### 6.3 Availability & ranking (ports with adapters)
| Signal | Primary | Fallback / notes |
|--------|---------|------------------|
| **Domain availability** | **RDAP** (IANA's WHOIS successor — free, standardized JSON, mandated for gTLDs) | Query per TLD; cache aggressively. |
| **Domain search + suggest + pricing** | **Domainr API** | Or a registrar reseller API (Namecheap, Cloudflare Registrar, Porkbun) for buy-through + pricing. |
| **Social handle availability** | **Adapter per platform** | ⚠️ *Hard problem.* No compliant universal API. Use official APIs where they exist; heuristic HEAD checks elsewhere with strict ToS review + rate limiting. Treat as best-effort, clearly labeled. |
| **SEO / keyword difficulty / ranking** | **DataForSEO** or Ahrefs/SEMrush API (paid) | Free proxy signals: Google Autocomplete volume, result counts. Gate richer data behind subscription. |

> **Legal/ToS gate (decision owed, §17):** social scraping and some SEO sources have ToS constraints. The adapter design lets us ship domains (clean, RDAP-based) first and add social/SEO behind flags once provider choices are cleared.

---

## 7. Brand Data Model & Multi-Tenancy (Pillar 3)

Postgres (Supabase) with **Row-Level Security** on every table.

```
workspaces (id, owner_id, name, plan)          -- billing boundary
 └─ memberships (workspace_id, user_id, role)   -- future team support
 └─ brands (id, workspace_id, name, status)     -- a "project"
     ├─ brand_tokens (brand_id, dtcg_json)       -- colors/type/spacing (source of truth)
     ├─ name_candidates (brand_id, term, provenance, scores, availability_json)
     ├─ references (brand_id, storage_path, kind, extracted_json)  -- imported media
     ├─ assets (brand_id, kind, variant, lockup, format, storage_path, meta)
     └─ exports (brand_id, storage_path, manifest_json, created_at)
```

- **RLS pattern:** access via `workspace_id → membership(user_id = auth.uid())`. One policy family, reused everywhere.
- **Storage:** Supabase Storage (S3-compatible; current private bucket `etymalia`). Path convention `workspace/{id}/brand/{id}/{asset}`.
- **Tokens table** holds DTCG JSON so the whole kit is regenerable from one row.

---

## 8. Asset Generation Pipeline — the heart (Pillars 5–9, 11)

Everything below runs as **Trigger.dev** durable jobs (§10) so long pipelines survive timeouts and report progress.

### 8.1 Design tokens & color system
- **[Style Dictionary v4](https://styledictionary.com)** (Amazon, OSS) — transforms one **DTCG** token set into CSS vars, JSON, Tailwind theme, Android XML, iOS — *reuse across web + the Android app*.
- **Color engine:** **[culori](https://culorijs.org)** and/or **[colorjs.io](https://colorjs.io)** (authored by CSS WG editors) — OKLCH-based palette generation, harmonies, and **WCAG 2.2 / APCA contrast** validation so generated palettes are *guaranteed accessible*.
- **Palette extraction from references:** **[node-vibrant](https://github.com/Vibrant-Colors/node-vibrant)** — pull dominant/accent colors from uploaded imagery.

### 8.2 Logo system (Pillar 6)
1. **Concept generation:** AI raster concepts via `@ai-sdk/fal` (FLUX) or Google Imagen, *or* direct SVG synthesis for simple marks.
2. **Vectorization:** **[vtracer](https://github.com/visioncortex/vtracer)** (VisionCortex, Rust — color raster → clean SVG; wasm/node bindings) for full-color; **[potrace](https://potrace.sourceforge.net)** for crisp monochrome marks.
3. **Cleanup:** **[SVGO](https://github.com/svg/svgo)** — optimize/normalize; enforce `currentColor` so mono/inverted variants are free.
4. **Variant matrix (deterministic):** main / corporate / black-on-white / white-on-black / transparent × horizontal / vertical / icon-only / wordmark — generated by SVG transforms, not re-prompting.
5. **Format derivation:** **[@resvg/resvg-js](https://github.com/yisibl/resvg-js)** (Rust — highest-fidelity SVG→PNG@1x/2x/3x, WebP via sharp); PDF via `svg-to-pdfkit`; source SVG shipped as-is.

### 8.3 Favicons (Pillar 7)
- **[favicons](https://github.com/itgalaxy/favicons)** (npm, OSS) — one call → every size, `apple-touch-icon`, **maskable** PWA icons, `manifest.webmanifest`, `browserconfig.xml`, and the exact `<head>` HTML. Standards-complete, drop-in.

### 8.4 Social kits (Pillar 8)
- **[satori](https://github.com/vercel/satori)** (Vercel, OSS — JSX/HTML+CSS → SVG) + **resvg** → PNG. Same engine behind `@vercel/og`. Compose avatars, covers, OG cards from templates + tokens.
- Maintain a **platform spec table** (X, LinkedIn, Instagram, YouTube, Facebook, TikTok, GitHub, Discord) with exact avatar/cover/OG dimensions and safe areas; **sharp** for final crops.

### 8.5 Brand Guide Book (Pillar 9)
- **Recommendation: [Typst](https://typst.app)** (OSS typesetting, wasm-compilable via `typst.ts`) for magazine-grade output — superb typography, fast, template-driven from brand tokens.
- **Alternative:** `@react-pdf/renderer` for tighter React integration if we want in-app live preview parity. (Decision owed, §17.)
- Content: logo usage, clear-space, color specs (HEX/RGB/CMYK/OKLCH), type scale, do/don'ts, imagery, applied examples — all bound to the token set.

### 8.6 Additionals (Pillar 11)
- **Email signature:** **[MJML](https://mjml.io)** (Mailjet, OSS) → bulletproof responsive HTML.
- **Branded QR:** **[qr-code-styling](https://github.com/kozakdenys/qr-code-styling)** — logo-embedded, on-brand QR.
- **Digital business card:** web page + downloadable **vCard (.vcf)** + QR.
- **Letterhead:** Typst/PDF template + editable DOCX (via `docx` npm) for hand-off.

### 8.7 Export packaging (Pillar 5)
- **[fflate](https://github.com/101arrowz/fflate)** (fast, tiny) or `archiver` (streaming) → a single organized `.zip` with a `manifest.json`, folder tree (`/logo`, `/favicon`, `/social`, `/guide`, `/stationery`), and a README. The zip *is* the product.

---

## 9. Media Import & Processing (Pillar 4)

- **Upload UX:** **[Uppy](https://uppy.io)** with **tus** resumable protocol → Supabase Storage (S3-compatible target). Handles large video/doc uploads, progress, retries.
- **Image processing:** **[sharp](https://sharp.pixelplumbing.com)** (libvips) for resize/convert/crop server-side; or Supabase image transforms for on-the-fly.
- **Extraction:** palette (node-vibrant), dominant type/vibe (AI vision via the AI port), document text (for tone) — results cached to `references.extracted_json`.

---

## 10. Background Jobs & Orchestration

AI + media pipelines exceed serverless request budgets and need retries/progress.

- **Decision: Trigger.dev v3** is the orchestration end-shape now. **Start on Trigger.dev Cloud** (dev tier — already keyed, zero ops) for Phase 0–2; the *same task code* runs unchanged on a **self-hosted** instance, which we adopt when it pays off: **cost at scale**, **payload data-residency/privacy** (user uploads), or **private-network access**. No lock-in either direction (migration = re-point API URL + key).
- Keep job payloads small — pass **Supabase storage references**, not raw blobs — so sensitive bytes stay out of the runner and Cloud stays viable longer.
- Supabase Queues (`pgmq`) remain available for trivial, single-step jobs; orchestration lives in Trigger.dev.

---

## 11. Monetization: BYOK now, Subscription later (Pillar 1)

- **BYOK key storage:** **Supabase Vault** (pgsodium-backed) — user provider keys encrypted at rest, decrypted server-side only at call time. Keys **never** touch the client or logs.
- **Subscription:** **Stripe Billing** — Checkout + Customer Portal + webhooks → Supabase (`workspaces.plan`, entitlements). Keep entitlements as simple flags/limits enforced in the app core; avoid a heavy entitlement platform until needed.
- **Metering (later):** if we resell managed AI, meter through the AI Gateway's spend controls + Stripe usage-based prices.
- **The economic wedge:** BYOK = near-zero COGS, so the free/cheap tier is genuinely sustainable and the subscription sells *convenience + managed keys + premium templates + higher limits*, not raw access.

---

## 12. Frontend App Architecture

- **Framework:** Next.js 15 App Router + React 19 (already in place).
- **UI kit:** **[shadcn/ui](https://ui.shadcn.com)** (Radix primitives + **Tailwind v4**) — own the components, accessible by default, no vendor lock. Industry standard for exactly this kind of pro tool.
- **State/data:** Server Components + Server Actions for mutations; **TanStack Query** for client cache where interactive; **Zod** shared schemas end-to-end.
- **Editor surface:** brand dashboard → per-brand workspace with live token editing that re-renders previews (satori previews client-side, full renders as jobs).
- **Auth:** Supabase Auth (Google — now working ✅), `@supabase/ssr` already wired.

---

## 13. Security & Privacy

- All provider keys server-side only (Vault); enforce via lint rule + code review — no vendor SDK in client bundles.
- RLS on every table; storage policies scoped by workspace.
- RDAP over WHOIS (structured, rate-limit friendly). Respect registrar/social ToS; feature-flag anything legally gray.
- Signed URLs for exports; expire on rotation.
- PII: reference uploads may contain faces/docs — document retention + deletion; support hard-delete per brand.

---

## 14. Repo & Shared Packages

Adopt a **[Turborepo](https://turbo.build/repo)** (pnpm workspaces) monorepo so web + future surfaces share code:

```
/apps
  /web                 -- Next.js app (exists)
/packages
  @etymalia/tokens     -- DTCG tokens + Style Dictionary config (shared w/ Android)
  @etymalia/ai         -- AI SDK provider registry + Zod schemas (the adapter)
  @etymalia/name-engine-- Etymaria: data loaders, blending, scoring
  @etymalia/availability-- RDAP/Domainr/social/SEO adapters
  @etymalia/asset-forge -- vtracer/resvg/satori/favicons/Typst pipelines
  @etymalia/exporters   -- zip + manifest
```

Keeps `AGENTS.md`'s manual-DI / no-Hilt ethos: composition over frameworks, small focused packages.

---

## 15. Build-vs-Buy — the "Don't Handroll" Contract

| Capability | Chosen OSS / standard | Why not handroll |
|-----------|----------------------|------------------|
| AI provider abstraction | **Vercel AI SDK + AI Gateway** | It *is* the adapter; provider swap = 1 line. |
| Structured AI output | **Zod + `generateObject`** | Validated data, no fragile parsing. |
| Etymology data | **Wiktextract/kaikki.org** | Millions of curated entries; scraping is folly. |
| Word association | **Datamuse** | Free, phonetic + semantic, battle-tested. |
| Domain availability | **RDAP** (+ Domainr) | IANA standard; free structured JSON. |
| Design tokens | **Style Dictionary + DTCG** | Cross-platform export, W3C-aligned. |
| Color science / contrast | **culori / colorjs.io** | OKLCH + APCA/WCAG done correctly. |
| Palette extraction | **node-vibrant** | Proven dominant-color extraction. |
| Raster→vector | **vtracer** (+ potrace) | State-of-the-art OSS vectorizer. |
| SVG optimize | **SVGO** | The standard. |
| SVG→PNG/WebP | **resvg-js / sharp** | Highest fidelity, fast (Rust/libvips). |
| Templated raster (social/OG) | **satori** | Same engine as `@vercel/og`. |
| Favicons | **favicons** | Complete standards-compliant set in one call. |
| Guide book PDF | **Typst** (or react-pdf) | Agency-grade typography. |
| Email HTML | **MJML** | Bulletproof responsive email. |
| Branded QR | **qr-code-styling** | Logo-embedded QR, styled. |
| Uploads | **Uppy + tus** | Resumable large-file uploads. |
| Background jobs | **Trigger.dev** (or pgmq) | Durable multi-step pipelines. |
| Key storage (BYOK) | **Supabase Vault** | Encrypted at rest, server-only. |
| Billing | **Stripe Billing** | Industry standard. |
| UI components | **shadcn/ui + Radix + Tailwind v4** | Accessible, own-your-code. |
| Monorepo | **Turborepo + pnpm** | Shared packages, fast builds. |

**We build only:** the etymology curation/blending/scoring layer, the taste-driven templates, the orchestration glue, and the UX. That's the defensible 20%.

---

## 16. Phased Roadmap

### Phase 0 — Foundations (1–2 wks)
- Turborepo migration of `/web`; scaffold shared packages skeletons.
- `@etymalia/ai` provider registry (Google default + Gateway) with Zod schemas.
- Data model + RLS (workspaces/brands/assets/tokens); Vault for BYOK keys.
- BYOK settings UI; server route that proxies AI with user key.

### Phase 1 — MVP: Name → Colors → Logo → Export (3–5 wks)
- **Etymaria v1:** keyword intake → blended candidates + provenance → **RDAP domain availability** (defer social/SEO). This alone is a differentiated, shippable product.
- Palette generation (culori/OKLCH, contrast-checked) + token set.
- Single logo concept → vtracer → SVG → variant matrix → PNG/SVG.
- **Favicons** full set + **zip export** with manifest.
- One brand per user to start; then unlock multiple.

### Phase 2 — Full Kit (4–6 wks)
- Social kits (satori) across platform spec table.
- Brand Guide Book (Typst) bound to tokens.
- Reference import (Uppy) + palette/vibe extraction.
- Trigger.dev orchestration for full-kit generation with progress.

### Phase 3 — Deliverable Depth + Monetization (4–6 wks)
- Additionals: email signature (MJML), digital business card + QR + vCard, letterhead.
- Templates & examples gallery.
- **Stripe subscription** tiers layered over BYOK; managed-key tier via Gateway.
- Social-handle + SEO availability behind flags (post-ToS review).

### Phase 4 — Polish & Scale
- Multi-member workspaces; brand audit loop (vision model scoring drift); premium templates; API for programmatic export.

---

## 17. Decisions Log

### ✅ Locked (July 2026)
1. **Guide book renderer:** prototype **both** Typst *and* react-pdf in Phase 2, then choose.
2. **Job runner:** **Trigger.dev** as orchestration end-shape — start on Cloud (dev tier, already keyed), self-host later if cost/privacy/scale justify it; identical code either way (§10).
3. **Social/SEO availability:** domains ship first (RDAP, clean); social-handle + SEO are ToS-gated and data-provider-paid, so they land later behind adapters + flags (§6.3).
4. **Registrar strategy:** pursue **buy-through + affiliate** (Porkbun/Namecheap/Cloudflare reseller/affiliate programs) alongside Domainr for search.
5. **Etymaria data hosting:** **Postgres + pgvector** for semantic search over the corpus.
6. **Moat:** the curated cross-linguistic corpus + blending engine (not raw etymology) — see §6.1.
7. **AI credentials:** three-mode resolver (**OAuth-linked / BYOK key / pooled**) across Google, OpenAI, xAI, with two lanes (Studio vs Prod); provider-direct SDKs default, Gateway optional (§5.1). OAuth-to-API verified live for all three (July 2026).

### ⏳ Still open
- **Guide-book winner** — decide after the Phase 2 prototype bake-off.
- **OAuth-API entitlements** — confirm per-provider what the account/subscription-backed OAuth tokens actually permit (models, rate limits, image/video) vs raw API billing. xAI publishes `api:access`; OpenAI's are undocumented — validate empirically.
- **Social/SEO providers** — which specific sources are ToS-clear and worth paying for (revisit before Phase 3).
- **Registrar partner selection** — which reseller/affiliate program(s) to integrate first.
- **Corpus governance** — who owns/curates the growing etymology corpus and its versioning cadence.
- **Corpus refresh** — cadence for re-syncing Wiktextract-derived expansions on top of the curated seed.

---

## 18. Doc Alignment (resolved July 2026)

The following docs were rewritten to match reality (Supabase + Next.js) and this plan:
- `docs/roadmap.md` — removed Firebase/Firestore/Hilt/CMP; re-sequenced into Android / Web / Etymaria tracks aligned to the phases here.
- `docs/WEB_APP.md` — reframed from "Compose Multiplatform/Wasm port" to the actual **Next.js 15 + Supabase on Vercel** decision, with a "why not CMP" rationale.
- `docs/AUDIT.md` — corrected tech-debt items (manual DI is deliberate; backend is Supabase, not Firebase).
- `README.md` — reframed as a platform (Android + web + Etymaria); fixed doc links.

The current implementation source of truth is [`docs/CURRENT_STATUS.md`](../CURRENT_STATUS.md). This document remains the forward architecture and vendor-evaluation plan.

---

## 19. Tooling Index (quick reference)

AI: `ai` (Vercel AI SDK), `@ai-sdk/{google,openai,xai,fal}`, Vercel AI Gateway · Names: Wiktextract/kaikki.org, Datamuse, WordNet, CMUdict · Domains: RDAP, Domainr · Tokens: Style Dictionary (DTCG) · Color: culori, colorjs.io, node-vibrant · Vector: vtracer, potrace, SVGO · Raster: resvg-js, sharp, satori · Favicons: favicons · PDF: Typst / @react-pdf/renderer · Email: MJML · QR: qr-code-styling · Uploads: Uppy+tus · Jobs: Trigger.dev / pgmq · Keys: Supabase Vault · Billing: Stripe · UI: shadcn/ui, Radix, Tailwind v4 · Repo: Turborepo, pnpm · Validation: Zod.

