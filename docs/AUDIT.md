# Android Application Audit — Etymalia

**Audited:** July 14, 2026

**Target SDK:** 36

**Min SDK:** 24

**Status:** native prototype; not ready to release AI workflows until the gateway/authentication blockers below are resolved.

## Confirmed architecture

- **UI:** Kotlin, Jetpack Compose, Material 3, and Navigation Compose.
- **State:** `BrandViewModel`, coroutines, and `StateFlow`.
- **Persistence:** Room (`BrandDatabase`, `BrandDao`, `BrandProfile`, `GeneratedAsset`).
- **Composition:** manual construction in `MainActivity` and `BrandViewModelFactory`; Hilt/Dagger are intentionally absent.
- **Network:** Retrofit posts to Supabase `functions/v1/gemini-proxy`.
- **Configuration:** Android `BuildConfig` now contains only public `SUPABASE_URL` and `SUPABASE_ANON_KEY`; private `.env` values are not automatically embedded in the APK.

## Implemented user flows

- Create, edit, list, and delete local brand profiles.
- Store SVG text, generated-image Base64 data, and video-operation metadata in Room.
- Request logo, image, palette, consistency-audit, and video-generation initiation through the Edge Function.
- Copy SVG text to the clipboard.

## Do not overstate these flows

- **Video is not an end-to-end feature.** The app initiates a request and stores an operation-like name. It does not poll completion, retrieve media, persist playable video, or provide video export. Failure currently returns a simulated operation identifier; this must be removed before release.
- **The branding-icons bundle is not a real transformed asset bundle.** The app reuses one generated image with different metadata; it does not derive ICO/PNG sizes or platform-safe crops.
- **Current image rendering decodes Base64 content directly.** The unused Coil dependency was removed in this audit; a managed image-loading strategy remains future work.
- **Android does not implement Supabase Auth, Postgres, or Storage clients.** It uses local Room plus the Edge Function endpoint.

## Release blockers

### 1. AI proxy security

The Edge Function currently accepts caller-supplied `model`, `action`, and `payload`, with permissive CORS and no code-level allowlist, payload validation, per-user authorization, or rate limiting. Android supplies the public anon key rather than a user session.

Before release:

1. add Android Supabase authentication and propagate the user access token;
2. require a verified user in the Edge Function;
3. replace caller-controlled model/action selection with a server-side operation allowlist;
4. validate and bound request/media payloads;
5. enforce rate/usage limits and structured safe errors; and
6. monitor usage and failures.

### 2. Local media and backups

Room stores user reference images and generated images as Base64 strings. Android backup configuration does not exclude this data. Decide retention/backup behavior, impose upload limits, and move larger media to managed files or private Storage before broad use.

### 3. Data preservation

The Room database has `exportSchema = false` and uses a destructive migration fallback. This conflicts with the project requirement that schema changes include migrations. Export schemas and add explicit migrations before shipping data that users rely on.

## Quality backlog

- Externalize hardcoded user-facing strings into resources.
- Introduce operation-scoped state/events so independent generation errors and loading states cannot collide.
- Validate SVG and input media before rendering/sending; preserve true selected MIME type and bound size.
- Add native share/export with `FileProvider` for actual rendered assets.
- Add DAO, repository, view-model, and Compose UI tests. The prior screenshot test used deleted template symbols and has been repaired during this audit; rerun the Gradle test task after the change.
- Keep unused Android dependencies and catalog aliases out of the build; unused Coil and legacy Firebase/Google Services entries were removed in this audit.

## Validation record

Before the test repair, `./gradlew :app:testDebugUnitTest` compiled production Kotlin but failed compiling obsolete test references (`MyApplicationTheme`, `Greeting`). The web `pnpm check` passed separately. See [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) for the complete audit record.
