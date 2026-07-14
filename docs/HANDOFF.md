en a file it prompts me to sync # Etymalia — Session Handoff & Phase 0 Kickoff

*Prepared July 2026. Public-safe (no secrets). Secrets live in git-ignored `.env`; internal notes in git-ignored `docs/internal/`.*

---

## 📋 Paste-this Kickoff Prompt (for a fresh session)

> We're starting **Phase 0** of the Etymalia web platform. Read these first, in order:
> 1. `AGENTS.md` (hard constraints)
> 2. `docs/research/webapp_master_plan.md` (the canonical plan — esp. §5, §5.1, §7, §10, §16)
> 3. `docs/research/ai-credential-resolver.sketch.ts` (the AI credential design to promote to real code)
> 4. `docs/roadmap.md` (track/phase view)
>
> **Goal of Phase 0 (Foundations):** stand up the monorepo and the AI + data spine so feature work can begin. Deliver, in order:
1. ✅ **Turborepo + pnpm workspaces**: migrated the existing Next.js 15 app to `apps/web`; created package skeletons for `@etymalia/{ai,tokens,name-engine,availability,asset-forge,exporters}`.
2. ✅ **`@etymalia/ai` (Google/Vertex slice):** implemented a cached live provider-model catalog sourced from the Gemini and Vertex model-list APIs, Google API-key/Vertex-service-account credential contracts, `CredentialResolver`, `buildProvider()`, `AiPort`, and Zod schemas. No model ID is maintained in source. The Vercel AI SDK is the abstraction; concrete initial providers are Google AI Studio and Vertex. OpenAI/xAI OAuth resolution remains deliberately deferred.
3. ✅ **Studio `CredentialStore`:** `apps/web/lib/ai/studio-credential-store.ts` reads only the server-side Gemini key and Vertex service-account path at runtime. Prod-lane (Supabase Vault) remains the next credential-store task.
4. ✅ **Data model + RLS**: added `20260714110000_add_workspace_brand_schema.sql` for `workspaces / memberships / brands / brand_tokens / name_candidates / brand_references / assets / exports`, membership RLS, and scoped Storage policies. **New migration file — never edit applied ones.**
5. **Smoke test (implemented, pending live invocation):** `GET /api/ai/smoke` calls `brand:fast-text` through the Studio lane and returns structured JSON. It requires an authenticated user ID included in server-only `ETYMALIA_STUDIO_USER_IDS`; configure that allowlist before the live Google verification. OpenAI/xAI remain out of scope until their ordered provider phase.
6. Generate `apps/web/.env.local` from root `.env` for local dev.
>
> Respect all constraints in `AGENTS.md`. Ask me before introducing any new paid dependency. Work in small, verifiable steps.

---

## 🧭 Where we are (state at handoff)

**Product:** Etymalia — a professional-grade, payment-gated **brand generator** (web + existing Android app), whose signature is the resurrected **Etymaria** etymology-driven name engine. Web home: `etymalia.jami.studio` (Next.js + Supabase on Vercel).

**Done this session:**
- ✅ **Google OAuth sign-in fixed** (web) — root cause was the Android client sitting in Supabase's primary Google Client ID slot; corrected via Management API. Web sign-in works.
- ✅ **Canonical rename** `Entymalia → Etymalia` across the whole repo (43 files + Android package dirs + `applicationId studio.jami.etymalia`). Storage bucket is `etymalia`.
- ✅ **Docs aligned & de-staled** — removed Firebase/Hilt/Compose-Multiplatform; `roadmap.md`, `WEB_APP.md`, `AUDIT.md`, `README.md` now reflect reality.
- ✅ **Master plan written** — `docs/research/webapp_master_plan.md` (architecture, OSS tooling per capability, two lanes, phasing, decisions log).
- ✅ **AI credential design** — three-mode resolver (OAuth / API key / Vertex SA), two lanes (Studio internal vs Prod users), sketched in `ai-credential-resolver.sketch.ts`.
- ✅ **Provider OAuth verified live** — OpenAI (`auth.openai.com`) and xAI (`auth.x.ai`, scope `api:access`) both run public-client PKCE OAuth; subscription-backed OAuth-to-API is real.
- ✅ **Credentials loaded** — Google (Vertex SA + AI Studio key) + OpenAI & xAI OAuth refresh tokens adopted from `~/.codex` and `~/.grok` into `.env`.

**In progress:** Phase 0. The pnpm/Turborepo monorepo, shared package skeletons, global web token foundation, and additive workspace/brand migration are complete. Next is the real `@etymalia/ai` provider/credential port, followed by workspace bootstrap and brand-library data binding.

---

## 🔒 Hard constraints (from `AGENTS.md` + decisions)
- **Backend = Supabase** (Auth/Postgres/Storage/Edge/Vault). **No Firebase.**
- **Web = Next.js 15 + React 19 on Vercel.** Not Compose Multiplatform.
- **Android = Jetpack Compose + Material 3**, manual DI (**no Hilt/Dagger**).
- **AI never client-side.** Provider-direct `@ai-sdk/*` by default; **Vercel AI Gateway optional, not target**.
- **AI credentials:** Google = API key (AI Studio Pro + Vertex SA); **OpenAI + xAI = OAuth only** (no API-key lane; in-app OAuth, no proxy).
- **Two lanes:** Studio (our pooled creds) vs Prod (user BYOK/charge-through). Same port, different resolver. Need not be feature-equal.
- **Jobs = Trigger.dev**, start on Cloud (dev key present), self-host later if justified. Pass storage refs in payloads, not blobs.
- **Etymaria corpus** → Postgres + pgvector; re-export the source CSV to clean UTF-8 first (Greek/diacritics are mangled). Seed: `docs/references/etymology_brand_table…` (281 rows, cross-linguistic). This curation is the moat.
- **Reuse > handroll** — every capability maps to an OSS lib (see master plan §15).

---

## 🔑 Credentials & tooling status
- **Loaded in `.env`:** Supabase (full), `GOOGLE_SA_JSON_KEY_PATH` (Vertex), `GEMINI_API_KEY` (AI Studio Pro), `GOOGLE_WEB/ANDROID_CLIENT_*`, `XAI_OAUTH_*`, `OPENAI_OAUTH_*` (+ `OPENAI_OAUTH_ACCOUNT_ID`), `TRIGGER_SECRET_KEY` (Cloud dev), Vercel/GitHub.
- **`.env` is git-ignored**; `.env.example` documents the shape. Internal account map: `docs/internal/PROVIDER_ACCOUNTS.md` (git-ignored).
- **Tooling present:** Node v22, pnpm 10, npm, git. **Docker missing** (only needed if self-hosting Trigger.dev — not now).
- **Caveat:** OpenAI/xAI refresh tokens are *shared with the Codex/Grok CLIs* and rotate on use. Fine for dev; register Etymalia's own OAuth clients for production.

## ⚠️ Gotchas for the next session
- This machine's terminal sometimes swallows/echoes long multi-line PowerShell — prefer short commands or write-to-file-then-read.
- **Never edit applied Supabase migrations** (`supabase/migrations/*` already applied) — always add new ones.
- `web/.env.local` does not exist yet (Vercel injects in prod) — create it for local dev.
- Android has a leftover `BuildConfig.GEMINI_API_KEY` guard in `BrandViewModel.generateBrandColorPalette()` — remove (Track A), don't extend.

op