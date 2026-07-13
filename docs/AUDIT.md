# Project Audit: Entymalia

**Date**: July 2026
**Target SDK**: 36
**Min SDK**: 24

## Architecture Overview
Entymalia is an Android application built natively using Jetpack Compose and Kotlin. It follows the standard modern Android architecture recommended by Google:
- **UI Layer**: Jetpack Compose (`BrandNavigation`, `BrandListScreen`, `BrandDetailScreen`, `AddBrandScreen`).
- **State Management**: `ViewModel` (`BrandViewModel`) managing state via `StateFlow` and Coroutines.
- **Data Layer**: 
  - **Local Persistence**: Room Database (`BrandDatabase`, `BrandDao`) to store user-created brand profiles and generated assets.
  - **Network / API**: Retrofit for interacting with Gemini APIs (using models like `gemini-3.1-pro-preview`, `gemini-3-pro-image-preview`, `veo-3.1-fast-generate-preview`).

## Current Features
1. **Brand Profiles**: Create and manage local brand profiles (name, industry, description).
2. **AI Asset Generation**:
   - SVG Logos
   - Marketing Images
   - Branding Icons Bundle (Favicons, Social Avatars)
   - Video Promos (Veo 3.1)
   - Brand Color Palettes
3. **Gallery**: Local storage and retrieval of generated assets using Room.
4. **Brand Audit**: AI-driven evaluation of brand consistency based on uploaded imagery.

## Technical Debt & Areas for Improvement
- **Hardcoded Strings**: UI components have hardcoded text; should be moved to `strings.xml` for localization.
- **Dependency Injection**: Currently relying on manual DI (`BrandViewModelFactory`). Adopting **Hilt** would clean up DI code.
- **Error Handling**: Basic error surfacing in the ViewModel. Could benefit from a unified `Result` or `UiState` wrapper class.
- **Security**: The Gemini API key is currently passed directly. In a production setting, this logic should reside on a backend (e.g., Firebase Cloud Functions) to prevent API key extraction from the client app.

## Dependencies Audit
- Compose BOM and Material 3 are up-to-date.
- Firebase integration is present but partially commented out.
- Navigation Compose is set up nicely.
- Coil used for async image loading.
- KSP used for Room compilation.