# Etymalia on the Web

**Decision (July 2026): the web app is a standalone [Next.js 15](https://nextjs.org) (App Router) + React 19 application, backed by Supabase, deployed to Vercel at `etymalia.jami.studio`.**

It is **not** a port of the Android Compose UI. The web product is a *different, larger* product — a full brand-generator platform — so it gets a purpose-built web frontend rather than a shared-UI compile target.

> Full architecture, tooling, and phasing: [`docs/research/webapp_master_plan.md`](./research/webapp_master_plan.md).

## Current state
- `apps/web/` — Next.js 15, React 19, TypeScript, `@supabase/ssr`, managed by the root pnpm/Turborepo workspace. Google OAuth sign-in is live.
- Supabase provides Auth, Postgres, Storage, and Edge Functions.
- Deployed on Vercel.

## Why not Compose Multiplatform / Wasm?
It was considered (share the Kotlin Compose UI to the browser via Wasm), and **rejected** for this product:
- The web app's scope (naming engine, asset pipelines, editor, billing, exports) far exceeds the Android app's UI — there is little UI to actually reuse.
- The web ecosystem for this work (AI SDK, satori, resvg, vtracer, Style Dictionary, shadcn/ui) is JS/TS-native and best consumed from a JS/TS app.
- SEO, sharing, and a conventional web toolchain matter for a public product.

The Android app remains native Kotlin/Compose; the two share **concepts and design tokens**, not a UI runtime.

## What the two surfaces share
- **Design tokens** (Style Dictionary / DTCG) exported to both web and Android.
- The **Supabase** backend (Auth, data, storage).
- The **AI provider port** contract (provider- and credential-agnostic).
