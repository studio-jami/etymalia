# Entymalia

Entymalia is an AI-powered brand identity application built with native Android, Jetpack Compose, and Google's Gemini/Veo APIs. Generate consistent logos, marketing assets, color palettes, and video promos directly from your device.

## Prerequisites

- [Android Studio](https://developer.android.com/studio) (July 2026 or later recommended)
- A valid Gemini API Key.

## Run Locally

1. Open Android Studio.
2. Select **Open** and choose the directory containing this project (`brand-design`).
3. Allow Android Studio to complete Gradle sync.
4. Create a file named `.env` in the root of the project directory. Add your API key:
   ```env
   GEMINI_API_KEY=YOUR_API_KEY_HERE
   ```
5. Click the green **Run** button (Play icon) in the Android Studio toolbar to deploy the app to an emulator or physical device.

## Documentation

Comprehensive guides are available in the `docs/` folder:

- **[Project Audit](./docs/AUDIT.md)**: Current state and technical architecture.
- **[App Signing & Local Installation](./docs/APP_SIGNING.md)**: How to export the app without a developer account.
- **[Web App Conversion](./docs/WEB_APP.md)**: Path to making Entymalia a web-app (Compose Multiplatform).
- **[Roadmap](./docs/ROADMAP.md)**: Planned features and improvements.
- **[IDE Guide](./docs/IDE_GUIDE.md)**: Android Studio vs VS Code workflows.
- **[Performance & Defender Exclusions](./docs/DEFENDER_EXCLUSIONS.md)**: Speeding up build times on Windows.

## Marketing Page
A static web landing page stub has been placed in `marketing-page/`. It is optimized for Vercel deployment.