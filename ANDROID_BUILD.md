# Gamebowy — Android (Capacitor) Build Guide

This wraps the live site `https://www.gamebowy.xyz` into a native Android shell using Capacitor.

## Prerequisites (on your local machine)
- Node.js 20+, Java 17, Android Studio (with Android SDK / Platform Tools)
- `ANDROID_HOME` env var set

## 1. Install Capacitor
```bash
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android @capacitor/splash-screen @capacitor/status-bar
```

## 2. Create the web dir (Capacitor needs one even when loading a remote URL)
```bash
mkdir -p www && echo "<!doctype html><meta http-equiv='refresh' content='0;url=https://www.gamebowy.xyz'>" > www/index.html
```

## 3. Add the Android platform
```bash
npx cap add android
npx cap sync android
```

## 4. App icon & splash (recommended: `@capacitor/assets`)
Drop a 1024×1024 `icon.png` and a 2732×2732 `splash.png` into an `assets/` folder, then:
```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --android
```

## 5. Fullscreen / immersive mode
Edit `android/app/src/main/AndroidManifest.xml` — set the activity theme:
```xml
<activity
  android:name=".MainActivity"
  android:theme="@style/AppTheme.NoActionBarLaunch"
  android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
  android:launchMode="singleTask"
  android:screenOrientation="portrait"
  android:exported="true">
```

In `android/app/src/main/java/.../MainActivity.java` (after `super.onCreate`), enable immersive sticky mode:
```java
WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
WindowInsetsControllerCompat ctrl = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
ctrl.hide(WindowInsetsCompat.Type.systemBars());
ctrl.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
```

## 6. Mobile performance tweaks
In `android/app/src/main/res/xml/config.xml` (created by Capacitor) ensure hardware acceleration is on (default). Also in your site (already deployed), make sure:
- `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`
- Touch targets ≥ 44px, `touch-action: manipulation`
- Avoid 300ms tap delay (viewport meta above handles it)

## 7. Build the APK / AAB
```bash
npx cap open android      # opens Android Studio
# In Android Studio: Build > Build Bundle(s)/APK(s) > Build APK(s)
# or via CLI:
cd android && ./gradlew assembleRelease
```

The signed release APK ends up in `android/app/build/outputs/apk/release/`.

## Notes
- `capacitor.config.json` already points `server.url` at the live site, so any deploy to gamebowy.xyz updates the app instantly — no rebuild needed for content changes.
- For Play Store you must sign the AAB; see https://developer.android.com/studio/publish/app-signing.
