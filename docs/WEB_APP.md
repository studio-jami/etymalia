# Evolving into a Web App

Currently, this project is a native Android application built with Kotlin and Jetpack Compose. If you want to make Entymalia available on the web in an "ideal world" scenario, here is how you would accomplish it in 2026.

## 1. Compose Multiplatform
Because you are already using **Jetpack Compose**, the easiest path to the web is **Compose Multiplatform (CMP)** by JetBrains. CMP allows you to share your UI and business logic across Android, iOS, Desktop, and Web (via WebAssembly/Wasm or JS).

### What it would take:
1. **Refactor Gradle**: Convert the Android project to a Kotlin Multiplatform project.
2. **Abstract Android-specifics**: Room Database (which you currently use) now has experimental support for Kotlin Multiplatform, but you might need to use `SQLDelight` or ensure your Room setup is CMP compatible.
3. **Network**: The Gemini API calls use Retrofit (which is Java/Android specific). You would swap Retrofit out for **Ktor**, a multiplatform networking library.
4. **Compile to Wasm**: You add a `wasmJs` target to your `build.gradle.kts`. This will compile your Kotlin Compose code directly into a highly performant WebAssembly bundle that runs in the browser.

## 2. Separate Web Frontend (React/Next.js)
If you prefer a traditional web stack:
- You would need to build a **Backend** (Node.js, Go, or Kotlin Ktor) that handles the Gemini API calls.
- Build a separate frontend using React/Next.js (or similar).
- **Pros**: Better SEO for the actual app, traditional web dev ecosystem.
- **Cons**: You have to rewrite the UI entirely from scratch in HTML/CSS/JS instead of reusing your Jetpack Compose code.

## Recommendation
Since you already have a working Compose UI, converting to **Compose Multiplatform (Wasm)** is the most efficient path forward. It lets you maintain a single Kotlin codebase for both your Android app and your Web app.