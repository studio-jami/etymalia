# Microsoft Defender Exclusions

Windows Defender real-time protection can significantly slow down Gradle builds and Android Studio indexing because it scans the thousands of tiny intermediate files created during compilation.

To drastically improve build speeds on Windows, you should add the following directories to the Microsoft Defender Allowlist.

## Required Exclusions

1. **Android Studio IDE**: `C:\Program Files\Android\Android Studio`
2. **Your Project Directory**: The folder containing this project (for this checkout: `C:\Users\james\orgs\oss\etymaria`)
3. **Gradle Cache**: `C:\Users\YourUsername\.gradle`
4. **Android SDK**: `C:\Users\YourUsername\AppData\Local\Android\Sdk`

## Step-by-Step Instructions (Windows 11)

1. Press the **Windows Key** and type **Windows Security**.
2. Open the **Windows Security** app.
3. Click on **Virus & threat protection**.
4. Under the "Virus & threat protection settings" section, click **Manage settings**.
5. Scroll down to the "Exclusions" section and click **Add or remove exclusions**. (You will need Administrator privileges).
6. Click the **+ Add an exclusion** button and select **Folder**.
7. Browse to and select each of the four directories listed above.

Once added, restart Android Studio. You should notice a massive improvement in Gradle Sync and Build times.