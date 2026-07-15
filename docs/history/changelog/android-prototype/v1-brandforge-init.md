# Changelog

## [BrandForge Core System Setup] - 2026-07-12

### Added
- **Room Database Engine (`BrandDatabase`)**: Established local tables for storing multi-brand kits (`BrandProfile`) and generated media assets (`GeneratedAsset`) offline-first.
- **Direct REST API Clients (`GeminiApi`)**: Configured high-performance, asynchronous Retrofit service using OkHttp and Moshi parser to communicate with Gemini and Veo AI endpoints.
- **SVG Vector Rendering Engine (`SvgWebView`)**: Solved native SVG parsing limitations on Android by building an embedded off-screen Chromium WebView with transparent drawing layers, yielding perfect vectors for logo design previews.
- **AI-Assisted Palette generator**: Integrated interactive prompts using `gemini-3.5-flash` to generate brand-vibe-conforming color palettes directly from company descriptions.
- **Social Branding Suite Bundle**: Automated 1-click bundle generation of custom Square Favicons, Instagram profile pictures, X/Twitter layouts, and LinkedIn graphics matching the brand guidelines.
- **Veo Video Studio**: Added cinematic motion generation supporting text-to-video and photo-to-video animations using the latest `veo-3.1-fast-generate-preview` architecture.
- **Gemini Alignment Auditor**: Built deep multi-modal auditing using `gemini-3.1-pro-preview` which inspects user-uploaded visual creatives for palette, style, and identity alignment.
- **M3 UI Foundations**: Applied rich Material 3 themes, dynamic colors, Edge-to-Edge safe drew configurations, gesture notches, and a premium luxury dark mode theme.
