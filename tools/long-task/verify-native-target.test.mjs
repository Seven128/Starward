import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  androidBuildInputFingerprint,
  androidCmakeStagingRoot,
  androidPersistentCacheRoot,
  androidGradleArguments,
  androidJavaScriptRootTypecheckArguments,
  androidAppReadyTestId,
  androidUiEvidenceTimeoutMs,
  isAndroidBuildInputFile,
  isTransientAndroidUiDumpError,
  normalizeAndroidBuildInputContent,
  readAndroidBuildCache,
  writeAndroidBuildCache,
} from "./verify-native-target.mjs";

test("Android CMake staging is stable per repository and ABI", () => {
  const first = androidCmakeStagingRoot("x86_64", "C:/Temp", "C:/Dev/Starward");
  const second = androidCmakeStagingRoot("x86_64", "C:/Temp", "C:/Dev/Starward");
  const otherAbi = androidCmakeStagingRoot("arm64-v8a", "C:/Temp", "C:/Dev/Starward");

  assert.equal(first, second);
  assert.notEqual(first, otherAbi);
  assert.equal(path.basename(first), "x86_64");
});

test("Android APK cache is stable per repository and ABI", () => {
  const first = androidPersistentCacheRoot("x86_64", "C:/Temp", "C:/Dev/Starward");
  const second = androidPersistentCacheRoot("x86_64", "C:/Temp", "C:/Dev/Starward");
  const otherRepository = androidPersistentCacheRoot("x86_64", "C:/Temp", "C:/Dev/Other");

  assert.equal(first, second);
  assert.notEqual(first, otherRepository);
  assert.equal(path.basename(first), "x86_64");
});

test("Android Gradle plan assembles one ABI and keeps bounded daemon reuse", () => {
  const argv = androidGradleArguments("x86_64");

  assert.equal(argv[0], ":app:assembleRelease");
  assert.ok(argv.includes("-PreactNativeArchitectures=x86_64"));
  assert.ok(argv.includes("--daemon"));
  assert.ok(argv.includes("-Dorg.gradle.daemon.idletimeout=600000"));
  assert.ok(!argv.includes(":app:installRelease"));
  assert.ok(!argv.includes("--no-daemon"));
});

test("Android build helpers reject unsupported ABIs", () => {
  assert.throws(() => androidCmakeStagingRoot("all"), /android_device_abi_unsupported/u);
  assert.throws(() => androidGradleArguments("all"), /android_device_abi_unsupported/u);
});

test("Android JavaScript root preflight checks imports before Gradle", () => {
  const argv = androidJavaScriptRootTypecheckArguments("apps/mobile/index.js");
  assert.ok(argv.includes("--allowJs"));
  assert.ok(argv.includes("--checkJs"));
  assert.equal(argv.at(-1), "apps/mobile/index.js");
});

test("Android native evidence allows a bounded cold provider load", () => {
  assert.equal(androidAppReadyTestId, "primary-tab-map");
  assert.equal(androidUiEvidenceTimeoutMs, 60_000);
});

test("Android UI evidence retries only transient UIAutomator root failures", () => {
  assert.equal(isTransientAndroidUiDumpError(new Error("adb_failed:1:ERROR: null root node returned by UiTestAutomationBridge.")), true);
  assert.equal(isTransientAndroidUiDumpError(new Error("adb_failed:1:could not get idle state.")), true);
  assert.equal(isTransientAndroidUiDumpError(new Error("adb_failed:1:device offline")), false);
});

test("Android build input fingerprint is deterministic and ABI-sensitive", async () => {
  const first = await androidBuildInputFingerprint("x86_64");
  const second = await androidBuildInputFingerprint("x86_64");
  const otherAbi = await androidBuildInputFingerprint("arm64-v8a");

  assert.match(first, /^[a-f0-9]{64}$/u);
  assert.equal(first, second);
  assert.notEqual(first, otherAbi);
});

test("Android APK fingerprint ignores test-only source files", () => {
  assert.equal(isAndroidBuildInputFile("apps/mobile/src/features/tonight/TonightScreen.tsx"), true);
  assert.equal(isAndroidBuildInputFile("apps/mobile/src/features/tonight/TonightScreen.test.tsx"), false);
  assert.equal(isAndroidBuildInputFile("apps/mobile/src/features/tonight/__tests__/screen.tsx"), false);
  assert.equal(isAndroidBuildInputFile("apps/mobile/android/app/src/main/AndroidManifest.xml"), false);
  assert.equal(isAndroidBuildInputFile("apps/mobile/expo-env.d.ts"), false);
  assert.equal(isAndroidBuildInputFile("apps/mobile/android/app/build/output.apk"), false);
});

test("Android APK fingerprint normalizes text line endings across Harness sandboxes", () => {
  const lf = normalizeAndroidBuildInputContent("apps/mobile/src/App.tsx", Buffer.from("one\ntwo\n"));
  const crlf = normalizeAndroidBuildInputContent("apps/mobile/src/App.tsx", Buffer.from("one\r\ntwo\r\n"));
  assert.deepEqual(lf, crlf);

  const binary = Buffer.from([0x0d, 0x0a, 0x00, 0xff]);
  assert.equal(normalizeAndroidBuildInputContent("apps/mobile/assets/icon.png", binary), binary);
});

test("Android build cache requires matching input and APK hashes", async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), "starward-native-cache-test-"));
  const cacheRoot = path.join(testRoot, "cache");
  const sourceApkPath = path.join(testRoot, "source-app-release.apk");
  const inputSha256 = "1".repeat(64);
  const cachedApkPath = path.join(cacheRoot, inputSha256, "app-release.apk");
  try {
    await mkdir(path.dirname(sourceApkPath), { recursive: true });
    await writeFile(sourceApkPath, "release-one");
    const apkSha256 = createHash("sha256").update("release-one").digest("hex");
    await writeAndroidBuildCache(cacheRoot, { androidAbi: "x86_64", apkSha256, inputSha256, sourceApkPath });

    const hit = await readAndroidBuildCache(cacheRoot, "x86_64", inputSha256);
    assert.equal(hit?.mode, "verified-cache-hit");
    assert.equal(hit?.apkSha256, apkSha256);
    assert.equal(hit?.apkPath, cachedApkPath);
    assert.equal(await readAndroidBuildCache(cacheRoot, "arm64-v8a", inputSha256), null);

    await writeFile(cachedApkPath, "tampered-release");
    assert.equal(await readAndroidBuildCache(cacheRoot, "x86_64", inputSha256), null);
  } finally {
    await rm(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("Android build cache keeps distinct valid inputs without overwriting", async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), "starward-native-multi-cache-test-"));
  const cacheRoot = path.join(testRoot, "cache");
  try {
    for (const [inputSha256, contents] of [["1".repeat(64), "release-one"], ["2".repeat(64), "release-two"]]) {
      const sourceApkPath = path.join(testRoot, `${inputSha256[0]}.apk`);
      await writeFile(sourceApkPath, contents);
      await writeAndroidBuildCache(cacheRoot, {
        androidAbi: "x86_64",
        apkSha256: createHash("sha256").update(contents).digest("hex"),
        inputSha256,
        sourceApkPath,
      });
    }
    assert.equal((await readAndroidBuildCache(cacheRoot, "x86_64", "1".repeat(64)))?.mode, "verified-cache-hit");
    assert.equal((await readAndroidBuildCache(cacheRoot, "x86_64", "2".repeat(64)))?.mode, "verified-cache-hit");
  } finally {
    await rm(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
