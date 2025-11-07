# Native iOS setup for Expo projects

Expo managed projects do not include the native `ios/` directory (and thus no `Podfile`) until you generate it yourself. If you try to run `pod install` immediately after cloning the repo you will see an error such as:

```
[!] No `Podfile` found in the project directory.
```

To work on the native iOS project or to install CocoaPods, follow the steps below:

## Quick checklist

1. Install JS dependencies so the Expo CLI is available:
   ```bash
   npm install
   ```
2. (First time only) Ensure you have the Apple tooling:
   ```bash
   # Install CocoaPods if you do not already have it
   sudo gem install cocoapods
   # optional but recommended: keep pods up to date
   pod repo update
   ```
3. Generate the native iOS project (creates `ios/` + `Podfile`).
4. Install pods from inside the `ios/` directory.

The detailed steps are outlined below.

1. **Generate the native iOS project**
   ```bash
   npx expo prebuild --platform ios
   # or equivalently
   npx expo run:ios --no-bundle
   ```
   This command creates the `ios/` folder with a `Podfile` tailored to the Expo SDK version in `package.json`.

2. **Install pods**
   After the `ios/` directory exists, change into it and run CocoaPods:
   ```bash
   cd ios
   pod install
   ```

3. **Re-run when dependencies change**
   Whenever you add a package that includes native code, run `npx expo prebuild` again (or `npx expo prebuild --clean` for a fresh rebuild) so the native project stays in sync before running `pod install`.

4. **Run the iOS app**
   ```bash
   # from the project root after pods have installed
   npx expo run:ios
   ```
   The command will build the native workspace and launch the simulator. Use `--device` to target a connected device.

If you prefer to keep the project in the managed workflow and avoid committing native files, skip running `pod install` entirely and use `expo run:ios` or `expo start` for development.

## Troubleshooting common errors

### `ConfigError: The expected package.json path .../ios/package.json does not exist`

This error means the Expo CLI looked for a `package.json` inside an existing `ios/` directory but did not find one. It usually happens when:

* the command is executed from inside the `ios/` folder instead of the project root, or
* a stale/partially generated `ios/` directory was left over from a previous attempt.

To fix it:

1. **Return to the project root** – run `pwd` and make sure you are in the folder that contains `package.json`.
2. **Remove any leftover native folders** – from the project root run:
   ```bash
   rm -rf ios android
   ```
3. Run `npx expo prebuild --platform ios` again. Expo will regenerate `ios/` with the correct contents, after which `cd ios && pod install` will succeed.

If the error persists, confirm that `npm install` (or `pnpm install`/`yarn install`) has finished successfully so that `npx expo` can locate the Expo CLI binaries from `node_modules/`.

### `pod install` still fails after generating `ios/`

* Make sure you changed into the `ios/` folder before running `pod install` (`pwd` should end with `/ios`).
* If CocoaPods reports version conflicts, run `pod repo update` and re-run the install.
* When all else fails, reset the derived data by removing `ios/Pods` and `ios/Podfile.lock`, then run `pod install` again.
