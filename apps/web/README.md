# Etymalia Web

The web client for **Etymalia**, built with **Next.js (App Router)** and **Supabase**, deployed to **Vercel** at `etymalia.jami.studio`.

It is one of two clients of the same Supabase backend (the other is the native Android app). All AI calls go through the Supabase `gemini-proxy` edge function — the web app never holds the Gemini key.

## Vercel setup

- **Root Directory:** `apps/web/`  ← set this in the Vercel project settings
- **Framework Preset:** Next.js (auto-detected)
- **Production Branch:** `main`
- **Env vars:** provided by the official **Supabase ↔ Vercel integration**. The app resolves the URL + client key from any of these names (see `lib/supabase/env.ts`):
  - `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`)
  - `ETYMALIA_STUDIO_USER_IDS` — comma-separated authenticated user IDs allowed to invoke the internal Google smoke route. This is server-only and must not be exposed with a `NEXT_PUBLIC_` prefix.

## Local development

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local   # fill in values
pnpm --filter etymalia-web dev
```

- `GET /` — landing page with a live "Supabase connected" indicator.
- `GET /api/health` — JSON health check that pings Supabase Auth.

## Structure

- `app/` — App Router pages + route handlers
- `lib/supabase/` — SSR/browser clients and env resolution
- `middleware.ts` — refreshes the Supabase auth session per request

