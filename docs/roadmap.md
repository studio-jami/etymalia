# Entymalia Roadmap

*July 2026*

## Phase 1: Stability & Security (Near Term)
1. **Move Secrets to Backend**: Currently, the Gemini API key is stored in the app (`BuildConfig.GEMINI_API_KEY`). This is a security risk for production. Move API calls to Firebase Cloud Functions or a custom Ktor backend.
2. **Dependency Injection**: Migrate manual `ViewModelProvider.Factory` implementations to **Hilt** for cleaner Architecture.
3. **Robust Error Handling**: Implement an MVI-style `UiState` and `UiEvent` pattern to gracefully handle API errors, rate limits, and network issues.

## Phase 2: Feature Expansion (Mid Term)
1. **Cloud Sync**: Utilize the commented-out Firebase Firestore dependencies to allow users to sync their brand profiles across devices.
2. **Auth Integration**: Enable Firebase Authentication (Google Sign-In) to gate features and associate brands with user accounts.
3. **Advanced Video Controls**: Expose more Veo 3.1 parameters in the `generateVideo` function (e.g., camera motion, duration, mood).
4. **Export Options**: Add native Android Share intents (`Intent.ACTION_SEND`) so users can export SVGs and MP4s directly to Slack, Drive, or Email.

## Phase 3: Platform Expansion (Long Term)
1. **Compose Multiplatform (Web)**: Compile the existing Compose UI to WebAssembly (Wasm) to provide a seamless browser-based experience without rewriting the UI.
2. **iOS Support**: Add a Kotlin Multiplatform target for iOS using Compose for iOS. 
3. **Pro Subscription Model**: Integrate Google Play Billing to offer premium features (like 4K video rendering or bulk icon generation).