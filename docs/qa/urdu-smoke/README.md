# T0.6 Urdu Nastaliq smoke test

Owner: A14 (with A01). Condition of D-001. Reference phone: Infinix Note 40 (D-027); small-screen
and large-font checks on emulator profile E-MIN (docs/qa/device-matrix.md §1.1).
Requirement IDs: I18N-001, I18N-002, I18N-003, I18N-004, I18N-006, I18N-007, I18N-008, A11Y-001,
A11Y-002, A11Y-004. Blueprint: BP §37, §38, §78.

## Overall result: **PENDING-DEVICE** (run 1, 2026-10-23)

There are **no screenshots yet**, and this is **not a PASS**. On the A14 machine:

- `adb devices` listed no device. No phone was connected over USB.
- The Android SDK has no `emulator` package and no system images, so no emulator could run.
- A debug APK could not be built. Gradle 9.4.1 started, but the React Native Gradle plugin needs
  a **Java 17** toolchain. Only Android Studio's JDK 25 is installed, and Gradle's automatic JDK
  download (foojay) failed. The SDK also lacks platform 37, build-tools 37.0.0 and NDK
  27.1.12297006. Gradle can download these on a machine with a faster network.

What did work is the JavaScript side: the Metro/Hermes bundle builds (`expo export`, 628 modules),
`expo prebuild` embeds the font in `android/app/src/main/assets/fonts/NotoNastaliqUrdu-Regular.ttf`,
and the unit tests pass.

**Rule (IMPL §6 T0.6, test-strategy):** only a run on the physical reference phone counts for
D-001. Emulator screenshots support the E-MIN items only. **If any item C1–C9 FAILs on the phone,
A00 reopens D-001.**

## What is on the screen

Path: placeholder home → blue button **"Open Urdu display test / اردو ڈسپلے ٹیسٹ کھولیں"**
(`urdu-smoke-open`). The button appears only in development builds. The screen opens in Urdu.

- Toolbar: back button with arrow, title, and language toggle (`English` ↔ `اردو`).
- Nastaliq paragraph with diacritic marks (zer, zabar, pesh) and letters that go low (ے ں ی) or
  high (ک گ ل ٹ).
- Mixed label `کام کرو — AC service`, PKR amount `Rs 1,234,567`, and digits `0123456789`.
- Text input with an Urdu placeholder.
- "Open bottom sheet" button, then a 30-row FlatList. Tapping a row opens the bottom sheet for
  that row.
- Bottom sheet built with React Native's `Modal`: handle, title, Close button and body text.

Code: `apps/customer/src/dev/urdu-smoke/`. Tokens: `packages/ui/src/`. Strings:
`packages/i18n/src/dev/smoke-messages.ts` (dev-only catalog, not in release bundles).

## Checklist

Status values: PASS / FAIL / PENDING-DEVICE. Evidence is a screenshot file name in this folder
(`<run>/<name>.png`) plus a note.

| #   | Check                                                                                                                                                                 | Where                          | Status         | Evidence                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| C1  | Urdu shows in **Nastaliq** style (slanted, stacked letters), not a plain Naskh fallback, everywhere: paragraph, title, buttons, rows, sheet, input                     | Infinix Note 40                | PENDING-DEVICE | Font embedded by prebuild (file present in `android/app/src/main/assets/fonts/`); not yet seen on a screen        |
| C2  | **No clipped marks**: dots and zer/zabar/pesh above and below are fully visible, and the low tails of ے ں ی are not cut, including in buttons and the one-line input | Infinix Note 40                | PENDING-DEVICE | Line height = font line box (2.5 × size), checked by a unit test against the font file; device check still needed |
| C3  | **Line height** is readable: lines do not touch or overlap. Owner opinion: too much space or OK?                                                                      | Infinix Note 40                | PENDING-DEVICE | —                                                                                                                  |
| C4  | **RTL layout**: Urdu text is right-aligned. In the toolbar the back button is on the right and the language button on the left. Row text is right, row arrow left     | Infinix Note 40                | PENDING-DEVICE | Mirroring rules unit-tested (`mirroring`, model.spec.ts)                                                           |
| C5  | **Icons/arrows mirrored**: in Urdu the back arrow points right and the row arrows point left; in English the opposite                                                | Infinix Note 40                | PENDING-DEVICE | `iconScaleX` unit-tested                                                                                           |
| C6  | **Mixed text order**: `کام کرو — AC service` shows the Urdu at the right, then the dash, then `AC service` at the left. The English words are not reversed             | Infinix Note 40                | PENDING-DEVICE | String order unit-tested; rendering is a device check                                                              |
| C7  | **Numerals**: `Rs 1,234,567` and `0123456789` read left-to-right as one piece, at the left end of the Urdu sentence, with no stray characters or boxes                 | Infinix Note 40                | PENDING-DEVICE | Bidi isolates unit-tested; boxes would mean the font lacks U+2066/2069 handling                                    |
| C8  | **Text input**: with the Gboard Urdu keyboard, typing starts at the right, the cursor is visible and moves correctly, marks are not cut, and backspace works          | Infinix Note 40                | PENDING-DEVICE | Manual (Maestro cannot type Urdu on Android)                                                                       |
| C9  | **Bottom sheet RTL**: it opens from the bottom; in Urdu the title is right and Close is left; Android Back and tapping the dark area both close it                    | Infinix Note 40                | PENDING-DEVICE | —                                                                                                                  |
| C10 | **Language switch** en ↔ ur takes effect at once in both directions, with no restart (I18N-002)                                                                       | Infinix Note 40                | PENDING-DEVICE | State-driven; model rebuild unit-tested                                                                            |
| C11 | **Smooth scroll**: flicking through the 30 rows quickly shows no blank rows or visible stutter                                                                       | Infinix Note 40                | PENDING-DEVICE | —                                                                                                                  |
| C12 | **Small screen + largest font** (E-MIN: 320 dp wide, font size at maximum): repeat C2, C3, C4 and C9; nothing is cut or overlapping                                   | Emulator E-MIN                 | PENDING-DEVICE | No emulator on the A14 machine                                                                                     |
| C13 | **Tap targets and labels**: every button is at least a fingertip in size (48 dp); TalkBack reads a label for back, toggle, close, rows and input                     | Infinix Note 40                | PENDING-DEVICE | `minHeight/minWidth = 48` in code; labels from i18n                                                                |
| C14 | (Optional) Phone **system language set to Urdu**: the layout is not mirrored twice (English must still read left-to-right)                                             | Infinix Note 40                | PENDING-DEVICE | Logic unit-tested (`globalIsRtl = true` cases)                                                                     |
| C15 | No new Android permission for the font or the screen                                                                                                                  | CI                             | **PASS**       | `pnpm run guards` → "Forbidden-permission guard passed"; prebuild manifest unchanged                               |
| C16 | Automated: all smoke strings exist in en + ur, RTL rules, font metrics, contrast, PKR format                                                                         | CI                             | **PASS**       | 32 tests in i18n (11), ui (11), customer (10); see the T-0.6 handoff                                               |
| C17 | Text contrast ≥ 4.5:1, border ≥ 3:1                                                                                                                                   | CI                             | **PASS**       | `packages/ui/src/index.spec.ts`                                                                                    |

Screenshots to capture, saved in `docs/qa/urdu-smoke/run-<date>-<device>/`:
`ur-01-top.png`, `ur-02-input-urdu.png` (Urdu typed), `ur-03-list.png`, `ur-04-sheet.png`,
`en-01-top.png`, `en-02-sheet.png`, and `emin-ur-01-top.png` / `emin-ur-04-sheet.png` on E-MIN.
From the PC: `adb exec-out screencap -p > docs/qa/urdu-smoke/run-<date>-<device>/ur-01-top.png`.
Automated flow (needs Maestro installed): `maestro test apps/customer/.maestro/urdu-smoke.yaml`.

### Maestro and the dev launcher (decide on the first device run)

`apps/customer/.maestro/urdu-smoke.yaml` starts with `launchApp`. Only a **development build**
contains the smoke screen, and in a development build `launchApp` may stop at the
**expo-dev-client launcher** (the server picker) instead of the app. If that happens,
`tapOn: urdu-smoke-open` fails.

On the first device run, check which screen appears. If it is the launcher, replace `launchApp`
with a deep link that opens the app straight from Metro. The prebuild manifest registers the
scheme `exp+kaamkaro-customer`:

```yaml
- launchApp:
    clearState: true
- openLink: exp+kaamkaro-customer://expo-development-client/?url=http%3A%2F%2F<PC-IP>%3A8081
```

On an emulator, use `10.0.2.2` as the PC address, or run `adb reverse tcp:8081 tcp:8081` and use
`localhost`. Record the working variant in the run log. This is still open: nobody has run
the flow yet.

## Instructions for the owner (simple English; A00 translates to Roman Urdu)

### Before you start (one time, on the PC)

1. The build needs **Java 17**. Install "Eclipse Temurin JDK 17" (free) from adoptium.net and
   choose the Windows x64 `.msi` file. Keep the default options.
2. Open **Android Studio**. Go to **More Actions → SDK Manager → SDK Tools**. Tick **NDK (Side by
   side)**, **CMake** and **Android Emulator**, then press **OK**. Wait for the downloads to finish.
3. Open **Git Bash** in the project folder (`Kaam_karo`) and paste these lines. Change `17.0.x`
   to the folder name you see in `C:\Program Files\Eclipse Adoptium\`.

   ```
   export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.x-hotspot"
   export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
   export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
   pnpm install
   ```

   You need these `export` lines again every time you open a new Git Bash window.

### A. On your own phone (Infinix Note 40) with a USB cable

1. On the phone, open **Settings → My phone** (or **About phone**). Tap **Build number** 7 times.
   You will see "You are now a developer".
2. Go to **Settings → System → Developer options**. Turn on **USB debugging**. If you also see
   **Install via USB**, turn that on too.
3. Connect the phone to the PC with a USB cable. If the phone asks, choose **File transfer**.
4. The phone asks **"Allow USB debugging?"**. Tick **Always allow from this computer** and press
   **Allow**.
5. In Git Bash, type `adb devices`. You must see one line that ends with the word `device`. If it
   says `unauthorized`, look at the phone and press Allow.
6. Type these two commands:

   ```
   pnpm --filter @kaamkaro/customer prebuild
   pnpm --filter @kaamkaro/customer android
   ```

   The first build is slow (15–60 minutes; it downloads a lot). When it finishes, the app opens on
   the phone by itself. Keep the Git Bash window open: it runs "Metro", which sends the app code
   to the phone.
7. In the app, tap the blue button **"اردو ڈسپلے ٹیسٹ کھولیں"**.
8. Go through checklist items C1–C11, C13 and C14. For Urdu typing (C8), add the Urdu keyboard
   first: **Settings → System → Languages & input → Gboard → Languages → Add keyboard → Urdu**.
9. Take screenshots with **Power + Volume down** and send them to A00. Or ask A00 to run the
   `adb exec-out screencap` command above.

### B. Install the APK file, then connect over Wi-Fi

Use this when the phone cannot stay connected by cable.

1. Do "Before you start" and steps A1–A6 once on any PC that has a phone or emulator attached. The
   APK file is created at
   `apps/customer/android/app/build/outputs/apk/debug/app-debug.apk`.
2. Copy `app-debug.apk` to the phone and tap it. If the phone asks, allow **Install unknown apps**
   for your file manager.
3. Connect the PC and the phone to the **same Wi-Fi**.
4. On the PC, run `pnpm --filter @kaamkaro/customer start`. If Windows Firewall asks, press
   **Allow** (private network).
5. Open the **Kaam Karo** app on the phone. It shows the development screen. Scan the QR code from
   the PC window, or type the address shown there (for example `http://192.168.1.5:8081`).
6. Continue from step A7.

### C. On an Android Studio emulator (for E-MIN, the small screen)

1. In Android Studio, open **More Actions → Virtual Device Manager → + (Create device)**.
2. Press **New Hardware Profile**. Name it `E-MIN`. Set the screen size to **4.0 inch** and the
   resolution to **480 × 800**; this gives a 320 dp wide screen. Press **Finish**.
3. Select `E-MIN` and press **Next**. Choose a system image (**API 35, x86_64, Google APIs**) and
   press the download arrow. Then press **Next → Finish**.
4. Press **▶ (Play)** to start the emulator. Wait until you see the home screen.
5. In Git Bash, `adb devices` shows `emulator-5554  device`. Then run the commands from step A6.
6. On the emulator, open **Settings → Display → Font size** and move the slider to the
   **largest** size. Then check item C12 and take the `emin-…` screenshots.

## Run log

| Run | Date       | Device / profile | Android | Result         | Notes                                                                    |
| --- | ---------- | ---------------- | ------- | -------------- | ------------------------------------------------------------------------ |
| 1   | 2026-10-23 | none available   | —       | PENDING-DEVICE | No device, no emulator, no JDK 17 (Gradle build stopped); JS bundle OK |
