# Etymalia Web

The web client for **Etymalia** is a Next.js App Router application backed by Supabase and targeted at `etymalia.jami.studio` on Vercel.

It is distinct from the Android client. Web server routes use the `@etymalia/ai` Google AI Studio/Vertex adapters directly on the server; Android uses the Supabase `gemini-proxy` Edge Function. Neither client may receive provider credentials.

For current delivery status and deployment verification boundaries, read [`docs/CURRENT_STATUS.md`](../../docs/CURRENT_STATUS.md).

## Vercel setup

- **Root Directory:** `apps/web/`
- **Framework Preset:** Next.js
- **Production branch:** `main`
- **Public Supabase variables:** see `lib/supabase/env.ts` for supported names:
  - `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`)
- **Server-only variables:** never prefix these with `NEXT_PUBLIC_`:
  - `ETYMALIA_STUDIO_USER_IDS` for the restricted internal AI smoke route
  - provider, Supabase service-role, and Trigger credentials only where their server/runtime code requires them

## Local development

```sh
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter etymalia-web dev
```

Populate only the values required by the path you are running. Do not copy deployment secrets into browser-visible variables.

## Useful routes

- `GET /` — landing page.
- `GET /api/health` — Supabase Auth health check.
- `GET /workspace` — authenticated workspace bootstrap/library.
- `GET /api/ai/smoke` — internal, allowlisted server-side Google AI smoke route; not a public product endpoint.

## Structure

- `app/` — App Router pages, route handlers, and server actions.
- `lib/supabase/` — SSR/browser clients and environment resolution.
- `lib/ai/` — server-side Studio and production credential-store boundaries.
- `trigger/` — durable task definitions.
- `middleware.ts` — refreshes the Supabase auth session per request.
