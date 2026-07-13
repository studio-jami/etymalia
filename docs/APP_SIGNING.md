# App Signing & Local Installation

To install and use an Android app locally on your physical device, you **do not** need to pay for a Google Play Developer subscription.

## How Android App Signing Works
Android requires all APKs (Android Packages) to be digitally signed with a certificate before they can be installed. This ensures the integrity of the application.

1. **Debug Keystore**: When you click "Run" in Android Studio, it automatically generates a temporary `debug.keystore`. It builds an APK, signs it with this debug key, and pushes it to your device over a USB or Wi-Fi connection.
2. **Release Keystore**: When you are ready to publish an app to the Google Play Store, you generate a secure release keystore. 

## Installing Locally (Sideloading)
Since you just want to use the app yourself locally:

### Option 1: Direct from Android Studio (Recommended)
1. Enable **Developer Options** on your Android phone (Tap "Build Number" 7 times in Settings > About Phone).
2. Enable **USB Debugging** or **Wireless Debugging**.
3. Connect your phone to your computer.
4. Select your device from the target dropdown in Android Studio and click the **Run** button.

### Option 2: Build and Transfer the APK
If you want to send the app to a friend without publishing it:
1. In Android Studio, go to the top menu: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. Wait for the build to finish. A popup will appear in the bottom right; click **locate** to open the folder containing `app-debug.apk`.
3. Transfer this `app-debug.apk` file to your phone (via Google Drive, Email, or USB).
4. On your phone, open the APK file. You may be prompted to allow "Install from unknown sources" for your file manager. Accept it and install.