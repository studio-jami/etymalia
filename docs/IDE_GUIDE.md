# Android Studio vs. VS Code for Entymalia

Because you are working on a native Android application built with Kotlin, Jetpack Compose, and Gradle, **Android Studio** (built on IntelliJ IDEA) is the officially supported and recommended IDE.

## What you CAN do in Android Studio (that you can't easily do in VS Code)
1. **Visual Compose Previews**: Android Studio allows you to see live previews of your `@Composable` UI functions right next to the code without deploying to a device.
2. **Advanced Profiling**: Use the Android Profiler to track memory leaks, CPU usage, and network calls (especially useful for heavy image/video generation).
3. **Emulator Management**: Built-in AVD (Android Virtual Device) Manager to easily create and run Android emulators.
4. **Gradle Sync & Build Variants**: Seamless switching between `debug` and `release` builds, and one-click Gradle synchronization.
5. **App Bundles / Signing**: Native UI tools for generating signed `.aab` or `.apk` files.

## What you CAN do in VS Code
You *can* open this directory in VS Code, but it is primarily useful for:
1. **Editing non-Android files**: Like this markdown documentation, or the `marketing-page/` HTML/JS files.
2. **Writing Kotlin with limitations**: There are Kotlin extensions for VS Code, but you will lack proper auto-completion for Android SDKs, Jetpack Compose, and automatic Gradle resolution.

## Summary
For developing the `marketing-page`, VS Code is excellent. For modifying *anything* inside the `app/` directory (Kotlin, Compose, XML, Gradle), you should **always use Android Studio**.