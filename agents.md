# AI Agent Instructions

If you are an AI assistant or Agent (like GitHub Copilot, Gemini, or Claude) modifying this project, please adhere to the following guidelines:

## Project Identity
- The official product name is **Etymalia**. The GitHub repo and Supabase project use this name.
- Android application ID / namespace: `studio.jami.etymalia`.
- The web app lives in `apps/web` and targets `etymalia.jami.studio` on Vercel. Its current evidence-bound delivery status is in `docs/CURRENT_STATUS.md`.

## Architecture Constraints
1. **Jetpack Compose Only**: All new UI must be written in declarative Jetpack Compose. Do not use XML layouts for new screens.
2. **Material 3**: Use `androidx.compose.material3` for all UI components. Do not mix with Material 2 (`androidx.compose.material`).
3. **Coroutines & Flow**: Use Kotlin Coroutines and `StateFlow` for state management in the ViewModel. Avoid `LiveData`.
4. **Room Database**: Local persistence uses Room. Any schema changes require a migration.
5. **Manual DI (no Hilt)**: Dependency injection is currently manual (`BrandViewModelFactory`, repository constructed in `MainActivity`). **Do not add Hilt/Dagger** — it was removed because it was incompatible with AGP 9 and provided no benefit at this size. Revisit only if the app grows into multiple modules.

## Backend: Supabase (NOT Firebase)
- The backend is **Supabase**: Auth + Postgres + Storage + Edge Functions. **Do not add Firebase, `google-services`, Firestore, or Firebase Auth** — Firebase was fully removed. Any Firebase reference in older docs is obsolete.
- The Android app talks to Supabase using public `BuildConfig.SUPABASE_URL` and `BuildConfig.SUPABASE_ANON_KEY`, explicitly read from `.env` by `app/build.gradle.kts`. No other `.env` values may enter the APK.

## Working with Gemini APIs
- The app does **not** call Gemini directly and must **never** hold the Gemini key. Android calls the Supabase Edge Function **`gemini-proxy`** (`supabase/functions/gemini-proxy/index.ts`) through Retrofit at `POST {SUPABASE_URL}/functions/v1/gemini-proxy` (see `GeminiApi.kt` / `RetrofitClient`).
- The `GEMINI_API_KEY` belongs only in a Supabase function secret. Android BuildConfig may contain only the public Supabase URL and anon/publishable key.
- Do not add AI operations until the proxy has authenticated-user authorization, a server-side operation/model allowlist, bounded request validation, and rate/usage controls. The current Android proxy path is a release blocker documented in `docs/CURRENT_STATUS.md`.

## Secrets
- **Never** hardcode keys in source. Local secrets live in `.env` (git-ignored). Android emits only its explicit public Supabase client configuration into `BuildConfig`; all private credentials stay server-side.
- Deploy/manage the Edge Function with the Supabase CLI (`supabase functions deploy gemini-proxy`); the project is linked to ref `kvtvmuxxgjhwsjtehkny`.

## Testing
- Add Unit Tests in `app/src/test/`.
- UI Tests should use Compose UI Test framework in `app/src/androidTest/`.
- We use **Roborazzi** for snapshot testing. Ensure any UI changes update the Roborazzi snapshots if requested.

## Agent Execution Standard
- **Do not offload routine investigation to the user.** When a command or integration is blocked, inspect local configuration, installed tooling, service APIs, logs, and documented alternatives; make multiple evidence-driven attempts before requesting user input.
- **Initiate interactive authorization flows yourself.** Only ask the user to complete the unavoidable browser/account confirmation after the flow is active, then resume verification immediately.
- **Do not mistake a first command failure for a hard blocker.** Diagnose the failure, pursue supported upstream paths, and document any truly external prerequisite precisely.

## Version Control & Session Hygiene
- **Every session MUST end with a proper commit AND push** to the remote (`Jami-Studio/main`). Do not stop at a local commit.
- **Never leave dirty files** — the working tree must be clean at end of session (`git status` shows nothing to commit). Stage and commit all intended changes; do not abandon uncommitted work.
- Never commit secrets — `.env`, `debug.keystore`, and `docs/internal/` are git-ignored; keep it that way. Verify no credentials are staged before committing.
- Write clear, descriptive commit messages summarizing the change set.
