# Etymalia

Etymalia is a brand-identity platform with two product surfaces:

- a native Android app (Kotlin + Jetpack Compose) for local brand profiles and AI-assisted asset workflows; and
- a web app (Next.js + Supabase) that is building the Etymaria etymology-driven brand generator.

The web product is the primary roadmap track. Its Phase 1 deterministic flow—names, palette, SVG identity, and ZIP export—is implemented. Phase 2 social-kit orchestration is present in source but requires final authenticated deployment/run verification before it can be called operational. See the [current audited status](./docs/CURRENT_STATUS.md).

## Security model

Provider credentials belong on the server only. The Android build includes only the public `SUPABASE_URL` and `SUPABASE_ANON_KEY` configuration; it does not package values from `.env` indiscriminately. The Android AI gateway still requires authentication, authorization, validation, and rate limiting before production release—see the release blockers in [`docs/CURRENT_STATUS.md`](./docs/CURRENT_STATUS.md).

## Local development

### Web

```sh
pnpm install
pnpm check
```

For local interactive web work, follow [`apps/web/README.md`](./apps/web/README.md) to configure `apps/web/.env.local`.

### Android

1. Open this repository (`etymaria`) in Android Studio.
2. Configure only the public Supabase settings needed by the Android client in the ignored root `.env`:

   ```env
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=<public-anon-or-publishable-key>
   ```

3. Run the `app` configuration on an emulator or device.

Do not put Gemini, Supabase service-role, database, OAuth, Vercel, Trigger, or other private credentials in Android configuration. The app currently requires a production-safe authenticated proxy before its AI actions should be released.

## Documentation

- **[Current audited status](./docs/CURRENT_STATUS.md)** — implementation truth, blockers, validation, and ordered next work.
- **[Roadmap](./docs/roadmap.md)** — concise phase plan aligned to the audited baseline.
- **[Web platform](./docs/WEB_APP.md)** — web architecture and local deployment configuration.
- **[Web platform master plan](./docs/research/webapp_master_plan.md)** — forward architecture proposals; not an implementation inventory.
- **[Android audit](./docs/AUDIT.md)** — Android architecture and quality/security gaps.
- **[App signing](./docs/APP_SIGNING.md)** and **[IDE guide](./docs/IDE_GUIDE.md)**.

Dated `SESSION_*` handoffs and `.changelog/` entries are historical records. Verify their claims against current code and `docs/CURRENT_STATUS.md` before acting on them.
