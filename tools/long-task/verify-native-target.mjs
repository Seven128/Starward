import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "../..");
const contracts = JSON.parse(await readFile(path.join(repositoryRoot, "tests/acceptance/native/contracts.json"), "utf8"));
const androidAbis = /^(?:armeabi-v7a|arm64-v8a|x86|x86_64)$/u;
const androidCacheSchema = "starward-android-build-cache-v1";
const androidUiEvidenceTimeoutMs = 60_000;
const androidAppReadyTestId = "primary-tab-map";

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`invalid_argument:${key ?? "missing"}`);
    result[key.slice(2)] = value;
  }
  return result;
}

function hash(value) {
  const payload = typeof value === "string" ? value : JSON.stringify(value, Object.keys(value ?? {}).sort());
  return createHash("sha256").update(payload).digest("hex");
}

function androidCmakeStagingRoot(androidAbi, temporaryRoot = tmpdir(), root = repositoryRoot) {
  if (!androidAbis.test(androidAbi)) throw new Error("android_device_abi_unsupported");
  return path.join(temporaryRoot, "starward-cxx-cache", hash(path.resolve(root)).slice(0, 16), androidAbi);
}

function androidPersistentCacheRoot(androidAbi, temporaryRoot = tmpdir(), root = repositoryRoot) {
  if (!androidAbis.test(androidAbi)) throw new Error("android_device_abi_unsupported");
  return path.join(temporaryRoot, "starward-android-build-cache", hash(path.resolve(root)).slice(0, 16), androidAbi);
}

async function stableRepositoryRoot(root = repositoryRoot) {
  const dependencyAnchors = [
    ["node_modules", ".."],
    ["tests/acceptance/node_modules", "../../.."],
    ["tools/long-task/node_modules", "../../.."],
    ["apps/mobile/node_modules", "../../.."],
  ];
  for (const [relativeAnchor, relativeRoot] of dependencyAnchors) {
    try {
      const dependencyRoot = await realpath(path.join(root, relativeAnchor));
      const candidate = path.resolve(dependencyRoot, relativeRoot);
      await access(path.join(candidate, "package.json"));
      return candidate;
    } catch { /* try the next linked dependency root */ }
  }
  return root;
}

function androidGradleArguments(androidAbi) {
  if (!androidAbis.test(androidAbi)) throw new Error("android_device_abi_unsupported");
  return [
    ":app:assembleRelease",
    `-PreactNativeArchitectures=${androidAbi}`,
    "--daemon",
    "--console=plain",
    "-Dorg.gradle.daemon.idletimeout=600000",
  ];
}

function androidJavaScriptRootTypecheckArguments(rootEntrypoint) {
  return [
    "--noEmit",
    "--allowJs",
    "--checkJs",
    "--jsx", "react-jsx",
    "--moduleResolution", "bundler",
    "--module", "esnext",
    "--target", "es2022",
    "--skipLibCheck",
    rootEntrypoint,
  ];
}

function spawnCapture(command, argv, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, {
      cwd: options.cwd ?? repositoryRoot,
      env: options.env ?? process.env,
      shell: false,
      windowsHide: true,
      stdio: options.stdin === "pipe" ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    });
    if (options.stdin === "pipe") options.onChild?.(child);
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => {
      stdout.push(Buffer.from(chunk));
      if (options.echo) process.stderr.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr.push(Buffer.from(chunk));
      if (options.echo) process.stderr.write(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      const result = { code: code ?? -1, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") };
      if (result.code === 0 || options.allowFailure) resolve(result);
      else reject(new Error(`${options.label ?? command}_failed:${result.code}:${result.stderr.slice(-1200)}`));
    });
  });
}

const androidBuildExcludedSegments = new Set([
  ".cxx",
  ".expo",
  ".gradle",
  "Pods",
  "build",
  "coverage",
  "dist-web",
  "node_modules",
  "test-results",
]);
const androidTextBuildInputExtensions = new Set([
  ".cjs", ".css", ".gradle", ".html", ".js", ".json", ".jsx", ".md", ".mjs",
  ".properties", ".toml", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);

function isAndroidBuildInputFile(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  const name = path.posix.basename(normalized);
  return !normalized.split("/").some((segment) => androidBuildExcludedSegments.has(segment))
    && !/(?:^|\/)apps\/mobile\/android(?:\/|$)/u.test(normalized)
    && normalized !== "apps/mobile/expo-env.d.ts"
    && !normalized.includes("/__tests__/")
    && !/\.(?:spec|test)\.[cm]?[jt]sx?$/u.test(name);
}

function normalizeAndroidBuildInputContent(filePath, content) {
  const extension = path.extname(filePath).toLowerCase();
  if (!androidTextBuildInputExtensions.has(extension)) return content;
  return Buffer.from(content.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
}

async function collectBuildInputFiles(targetPath, files) {
  let targetStat;
  try {
    targetStat = await stat(targetPath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (targetStat.isFile()) {
    if (isAndroidBuildInputFile(targetPath)) files.push(targetPath);
    return;
  }
  if (!targetStat.isDirectory()) return;
  const entries = await readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink() || androidBuildExcludedSegments.has(entry.name)) continue;
    await collectBuildInputFiles(path.join(targetPath, entry.name), files);
  }
}

async function javaRuntimeIdentity() {
  const executable = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java")
    : "java";
  try {
    const result = await spawnCapture(executable, ["-version"], { label: "java-version" });
    return `${result.stdout}\n${result.stderr}`.trim();
  } catch (error) {
    if (error?.code === "ENOENT") return "java-unavailable";
    throw error;
  }
}

async function androidBuildInputFingerprint(androidAbi) {
  if (!androidAbis.test(androidAbi)) throw new Error("android_device_abi_unsupported");
  const files = [];
  const roots = [
    "apps/mobile",
    "packages/contracts/src",
    "packages/domain/src",
    "packages/ui-system/src",
    "package.json",
    "package-lock.json",
    "patches",
  ];
  for (const relativePath of roots) await collectBuildInputFiles(path.join(repositoryRoot, relativePath), files);
  const digest = createHash("sha256");
  for (const filePath of files.sort((left, right) => left.localeCompare(right))) {
    const relativePath = path.relative(repositoryRoot, filePath).replaceAll("\\", "/");
    if (relativePath.startsWith("apps/mobile/ios/")) continue;
    digest.update(relativePath);
    digest.update("\0");
    digest.update(normalizeAndroidBuildInputContent(filePath, await readFile(filePath)));
    digest.update("\0");
  }
  const publicExpoEnvironment = Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => key.startsWith("EXPO_PUBLIC_"))
    .sort(([left], [right]) => left.localeCompare(right)));
  digest.update(JSON.stringify({
    androidAbi,
    androidHome: process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? "",
    javaHome: process.env.JAVA_HOME ?? "",
    javaRuntime: await javaRuntimeIdentity(),
    node: process.version,
    nodeEnv: process.env.NODE_ENV ?? "production",
    platform: `${process.platform}-${process.arch}`,
    publicExpoEnvironment,
  }));
  return digest.digest("hex");
}

function androidGradleOutputPaths(androidRoot) {
  const outputRoot = path.join(androidRoot, "app", "build", "outputs", "apk", "release");
  return {
    apkPath: path.join(outputRoot, "app-release.apk"),
  };
}

function androidBuildCachePaths(cacheRoot, inputSha256) {
  const entryRoot = inputSha256 ? path.join(cacheRoot, inputSha256) : cacheRoot;
  return {
    apkPath: path.join(entryRoot, "app-release.apk"),
    manifestPath: path.join(entryRoot, "manifest.json"),
  };
}

async function fileSha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function readAndroidBuildCache(cacheRoot, androidAbi, inputSha256) {
  const candidates = [
    androidBuildCachePaths(cacheRoot, inputSha256),
    androidBuildCachePaths(cacheRoot),
  ];
  for (const { apkPath, manifestPath } of candidates) {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (manifest.schema_version !== androidCacheSchema
        || manifest.android_abi !== androidAbi
        || manifest.input_sha256 !== inputSha256
        || manifest.apk_sha256 !== await fileSha256(apkPath)) continue;
      return { apkPath, apkSha256: manifest.apk_sha256, inputSha256, mode: "verified-cache-hit" };
    } catch (error) {
      if (error?.code === "ENOENT" || error instanceof SyntaxError) continue;
      throw error;
    }
  }
  return null;
}

async function writeAndroidBuildCache(cacheRoot, value) {
  const { apkPath, manifestPath } = androidBuildCachePaths(cacheRoot, value.inputSha256);
  await mkdir(path.dirname(apkPath), { recursive: true });
  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryApkPath = `${apkPath}.${nonce}.tmp`;
  const temporaryManifestPath = `${manifestPath}.${nonce}.tmp`;
  try {
    await copyFile(value.sourceApkPath, temporaryApkPath);
    if (await fileSha256(temporaryApkPath) !== value.apkSha256) throw new Error("android_cached_apk_copy_mismatch");
    await writeFile(temporaryManifestPath, `${JSON.stringify({
      schema_version: androidCacheSchema,
      android_abi: value.androidAbi,
      input_sha256: value.inputSha256,
      apk_sha256: value.apkSha256,
    })}\n`, "utf8");
    await rename(temporaryApkPath, apkPath);
    await rename(temporaryManifestPath, manifestPath);
  } finally {
    await rm(temporaryApkPath, { force: true });
    await rm(temporaryManifestPath, { force: true });
  }
  return { apkPath, apkSha256: value.apkSha256, inputSha256: value.inputSha256, mode: "gradle-build" };
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const shellQuote = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;

async function adb(serial, argv, options) {
  const prefix = serial ? ["-s", serial] : [];
  return spawnCapture("adb", [...prefix, ...argv], { ...options, label: options?.label ?? "adb" });
}

function xmlAttributes(node) {
  const values = {};
  for (const match of node.matchAll(/([\w-]+)="([^"]*)"/gu)) values[match[1]] = match[2]
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  return values;
}

function findUiNode(xml, testId) {
  for (const match of xml.matchAll(/<node\b[^>]*>/gu)) {
    const attributes = xmlAttributes(match[0]);
    const resource = attributes["resource-id"] ?? "";
    const description = attributes["content-desc"] ?? "";
    if (resource === testId || resource.endsWith(`/${testId}`) || description === testId || description.startsWith(`${testId}:`)) return attributes;
  }
  throw new Error(`native_test_id_missing:${testId}`);
}

function nodeValue(attributes, testId) {
  const raw = attributes.text || attributes["content-desc"] || attributes["resource-id"] || "";
  return raw.startsWith(`${testId}:`) ? raw.slice(testId.length + 1).trim() : raw.trim();
}

function nodeCenter(attributes) {
  const match = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/u.exec(attributes.bounds ?? "");
  if (!match) throw new Error("native_node_bounds_missing");
  return [Math.round((Number(match[1]) + Number(match[3])) / 2), Math.round((Number(match[2]) + Number(match[4])) / 2)];
}

async function androidDump(serial) {
  await adb(serial, ["shell", "uiautomator", "dump", "/sdcard/starward-acceptance.xml"]);
  return (await adb(serial, ["exec-out", "cat", "/sdcard/starward-acceptance.xml"])).stdout;
}

function isTransientAndroidUiDumpError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("null root node returned by UiTestAutomationBridge")
    || message.includes("could not get idle state");
}

async function androidWaitForNodes(serial, testIds, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastMissing = testIds[0];
  while (Date.now() < deadline) {
    try {
      const xml = await androidDump(serial);
      return {
        xml,
        nodes: Object.fromEntries(testIds.map((testId) => [testId, findUiNode(xml, testId)])),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isTransientAndroidUiDumpError(error)) {
        await delay(500);
        continue;
      }
      if (!message.startsWith("native_test_id_missing:")) throw error;
      lastMissing = message.slice("native_test_id_missing:".length);
      await delay(500);
    }
  }
  throw new Error(`native_test_id_timeout:${lastMissing}`);
}

async function androidOpenRoute(serial, appId, route) {
  const deepLink = `starward://${route.startsWith("/") ? route : `/${route}`}`;
  await adb(serial, ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", deepLink, appId]);
  await delay(900);
}

async function chooseAndroidSerial() {
  const requested = process.env.STARWARD_ANDROID_SERIAL;
  const output = (await spawnCapture("adb", ["devices"], { label: "adb-devices" })).stdout;
  const available = output.split(/\r?\n/u).slice(1).map((line) => line.trim().split(/\s+/u)).filter((row) => row[0] && row[1] === "device").map((row) => row[0]);
  if (requested && !available.includes(requested)) throw new Error("requested_android_device_unavailable");
  if (requested) return requested;
  if (available.length !== 1) throw new Error(`exactly_one_android_device_required:${available.length}`);
  return available[0];
}

async function withAndroidCmakeStaging(androidRoot, androidAbi, stableRoot, callback) {
  const buildGradlePath = path.join(androidRoot, "app/build.gradle");
  const original = await readFile(buildGradlePath, "utf8");
  const stagingRoot = androidCmakeStagingRoot(androidAbi, tmpdir(), stableRoot);
  await mkdir(stagingRoot, { recursive: true });
  const stagingPath = stagingRoot.replaceAll("\\", "/");
  const anchor = "android {";
  if (!original.includes(anchor)) throw new Error("android_gradle_block_missing");
  const configured = original.replace(anchor, `${anchor}\n    externalNativeBuild {\n        cmake {\n            buildStagingDirectory \"${stagingPath}\"\n        }\n    }`);
  await writeFile(buildGradlePath, configured, "utf8");
  try {
    return await callback();
  } finally {
    await writeFile(buildGradlePath, original, "utf8");
  }
}

async function installAndroidApp(serial) {
  const androidRoot = path.join(repositoryRoot, "apps/mobile/android");
  const cacheIdentityRoot = await stableRepositoryRoot();
  const gradleWrapper = path.join(androidRoot, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  const androidAbi = (await adb(serial, ["shell", "getprop", "ro.product.cpu.abi"])).stdout.trim();
  if (!androidAbis.test(androidAbi)) throw new Error("android_device_abi_unsupported");
  const gradleArguments = androidGradleArguments(androidAbi);
  const gradleEnvironment = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
  };
  await access(path.resolve(repositoryRoot, options["root-entrypoint"]));
  const requireFromRepository = createRequire(path.join(repositoryRoot, "package.json"));
  const typeScriptCli = requireFromRepository.resolve("typescript/bin/tsc");
  process.stderr.write("STARWARD_ANDROID_PREFLIGHT:typecheck\n");
  await spawnCapture(process.execPath, [typeScriptCli, "--project", "apps/mobile/tsconfig.json", "--noEmit", "--pretty", "false"], {
    cwd: repositoryRoot,
    env: gradleEnvironment,
    label: "android-typescript-preflight",
    echo: true,
  });
  process.stderr.write("STARWARD_ANDROID_PREFLIGHT:javascript-root-imports\n");
  await spawnCapture(process.execPath, [typeScriptCli, ...androidJavaScriptRootTypecheckArguments(options["root-entrypoint"])], {
    cwd: repositoryRoot,
    env: gradleEnvironment,
    label: "android-javascript-root-preflight",
    echo: true,
  });
  const inputSha256 = await androidBuildInputFingerprint(androidAbi);
  const cacheRoot = androidPersistentCacheRoot(androidAbi, tmpdir(), cacheIdentityRoot);
  const cached = await readAndroidBuildCache(cacheRoot, androidAbi, inputSha256);
  const buildStartedAt = Date.now();
  let artifact = cached;
  if (!artifact) {
    try {
      await access(gradleWrapper);
    } catch {
      const expoCli = requireFromRepository.resolve("expo/bin/cli");
      await spawnCapture(process.execPath, [expoCli, "prebuild", "--platform", "android", "--no-install"], {
        cwd: path.join(repositoryRoot, "apps/mobile"),
        env: gradleEnvironment,
        label: "android-expo-prebuild",
      });
    }
    await withAndroidCmakeStaging(androidRoot, androidAbi, cacheIdentityRoot, async () => {
      if (process.platform === "win32") {
        const commandInterpreter = process.env.ComSpec ?? "cmd.exe";
        await spawnCapture(commandInterpreter, ["/d", "/c", "gradlew.bat", ...gradleArguments], {
          cwd: androidRoot,
          env: gradleEnvironment,
          label: "android-assemble-release",
          echo: true,
        });
        return;
      }
      await spawnCapture("./gradlew", gradleArguments, {
        cwd: androidRoot,
        env: gradleEnvironment,
        label: "android-assemble-release",
        echo: true,
      });
    });
    const afterBuildInputSha256 = await androidBuildInputFingerprint(androidAbi);
    if (afterBuildInputSha256 !== inputSha256) throw new Error("android_build_inputs_changed_during_build");
    const { apkPath: sourceApkPath } = androidGradleOutputPaths(androidRoot);
    const apkSha256 = await fileSha256(sourceApkPath);
    artifact = await writeAndroidBuildCache(cacheRoot, { androidAbi, apkSha256, inputSha256, sourceApkPath });
  }
  const installStartedAt = Date.now();
  await adb(serial, ["install", "-r", artifact.apkPath], { label: "android-install-release-apk" });
  const installed = await adb(serial, ["shell", "pm", "path", contracts.app_id], { allowFailure: true });
  if (installed.code !== 0 || !installed.stdout.includes("package:")) throw new Error("android_release_install_unverified");
  process.stderr.write(`STARWARD_ANDROID_BUILD:${JSON.stringify({
    abi: androidAbi,
    apk_sha256: artifact.apkSha256,
    build_ms: installStartedAt - buildStartedAt,
    cache_mode: artifact.mode,
    input_sha256: artifact.inputSha256,
    install_ms: Date.now() - installStartedAt,
    cache_root: cacheRoot,
    staging_root: androidCmakeStagingRoot(androidAbi, tmpdir(), cacheIdentityRoot),
  })}\n`);
  return { ...artifact, androidAbi };
}

async function runAndroid(caseDefinition) {
  const serial = await chooseAndroidSerial();
  const appId = contracts.app_id;
  const artifact = await installAndroidApp(serial);
  await adb(serial, ["shell", "am", "force-stop", appId]);
  await adb(serial, ["shell", "am", "start", "-W", "-n", `${appId}/.MainActivity`]);
  await androidWaitForNodes(serial, [androidAppReadyTestId], androidUiEvidenceTimeoutMs);
  await androidOpenRoute(serial, appId, caseDefinition.route);
  let ready = await androidWaitForNodes(serial, [caseDefinition.action_test_id], androidUiEvidenceTimeoutMs);
  const action = ready.nodes[caseDefinition.action_test_id];
  const [x, y] = nodeCenter(action);
  await adb(serial, ["shell", "input", "tap", String(x), String(y)]);
  ready = await androidWaitForNodes(serial, caseDefinition.evidence_test_ids, androidUiEvidenceTimeoutMs);

  const surfaceValues = [];
  for (const surface of caseDefinition.cross_surfaces ?? []) {
    if (surface.ops_route) continue;
    await androidOpenRoute(serial, appId, surface.route);
    const surfaceReady = await androidWaitForNodes(serial, [surface.test_id]);
    const value = nodeValue(surfaceReady.nodes[surface.test_id], surface.test_id);
    if (!value) throw new Error(`native_context_value_empty:${surface.surface_ref}`);
    surfaceValues.push({ surface_ref: surface.surface_ref, value, target_ref: options["target-ref"] });
  }
  return {
    sessionId: `android-${artifact.inputSha256.slice(0, 8)}-${artifact.apkSha256.slice(0, 8)}-${hash({ serial, startedAt }).slice(0, 8)}`,
    coldStart: true,
    surfaceValues,
  };
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("ops_cross_surface_port_unavailable");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function readOpsSurface(surface) {
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.join(repositoryRoot, "tests/acceptance/start-ops-web.mjs"), "--port", String(port)], {
    cwd: path.join(repositoryRoot, "tests/acceptance"),
    env: { ...process.env, STARWARD_OPS_ACCEPTANCE_RUN_PORT: String(port) },
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.pipe(process.stderr);
  server.stderr.pipe(process.stderr);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      if (server.exitCode !== null) throw new Error(`ops_cross_surface_server_exited:${server.exitCode}`);
      try {
        const response = await fetch(baseUrl);
        if (response.ok) { ready = true; break; }
      } catch { /* bounded startup retry */ }
      await delay(500);
    }
    if (!ready) throw new Error("ops_cross_surface_server_not_ready");
    const requireFromAcceptance = createRequire(path.join(repositoryRoot, "tests/acceptance/package.json"));
    const playwrightPath = requireFromAcceptance.resolve("@playwright/test");
    const playwrightModule = await import(pathToFileURL(playwrightPath).href);
    const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
    if (!chromium) throw new Error("ops_cross_surface_playwright_chromium_missing");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
      await page.goto(new URL(surface.ops_route, baseUrl).href, { waitUntil: "networkidle" });
      const locator = page.locator(`[data-testid=${JSON.stringify(surface.test_id)}]`);
      await locator.waitFor({ state: "visible" });
      const value = ((await locator.getAttribute("data-context-revision")) ?? (await locator.textContent()) ?? "").trim();
      if (!value) throw new Error(`ops_context_value_empty:${surface.surface_ref}`);
      return { surface_ref: surface.surface_ref, value, target_ref: surface.target_ref };
    } finally {
      await browser.close();
    }
  } finally {
    if (!server.killed) server.kill();
  }
}

async function runIosLocal(caseDefinition) {
  if (process.platform !== "darwin") throw new Error("ios_local_requires_macos");
  const simulatorId = await chooseIosSimulator();
  const casePayload = JSON.stringify({
    ...caseDefinition,
    target_ref: options["target-ref"],
  });
  const result = await spawnCapture("xcodebuild", [
    "-workspace", "apps/mobile/ios/app.xcworkspace",
    "-scheme", "app",
    "-destination", `platform=iOS Simulator,id=${simulatorId}`,
    "test",
  ], {
    cwd: repositoryRoot,
    env: { ...process.env, STARWARD_ACCEPTANCE_CASE_JSON: casePayload },
    label: "ios-xcuitest",
  });
  process.stderr.write(result.stderr);
  const marker = result.stdout.split(/\r?\n/u).findLast((line) => line.includes("STARWARD_NATIVE_EVIDENCE:"));
  if (!marker) throw new Error("ios_native_evidence_marker_missing");
  const payload = JSON.parse(marker.slice(marker.indexOf("STARWARD_NATIVE_EVIDENCE:") + "STARWARD_NATIVE_EVIDENCE:".length));
  if (payload.cold_start !== true || !payload.session_id || !Array.isArray(payload.surface_values)) throw new Error("ios_native_evidence_invalid");
  return {
    sessionId: payload.session_id,
    coldStart: true,
    surfaceValues: payload.surface_values.map((item) => ({ ...item, target_ref: options["target-ref"] })),
  };
}

async function chooseIosSimulator() {
  const requested = process.env.STARWARD_IOS_SIMULATOR;
  const listed = await spawnCapture("xcrun", ["simctl", "list", "devices", "available", "--json"], { label: "ios-simulator-list" });
  const payload = JSON.parse(listed.stdout);
  const runtimes = Object.entries(payload.devices ?? {}).filter(([runtime]) => runtime.includes(".iOS-")).sort(([left], [right]) => right.localeCompare(left, undefined, { numeric: true }));
  const devices = runtimes.flatMap(([, values]) => values).filter((device) => device?.isAvailable !== false && String(device?.name ?? "").startsWith("iPhone "));
  const selected = requested
    ? devices.find((device) => device.udid === requested || device.name === requested)
    : devices.find((device) => device.state === "Booted") ?? devices[0];
  if (!selected?.udid) throw new Error(requested ? "requested_ios_simulator_unavailable" : "ios_simulator_unavailable");
  return selected.udid;
}

async function runRemoteIos() {
  const host = process.env.STARWARD_IOS_REMOTE_HOST;
  if (!host) throw new Error("ios_remote_host_missing");
  const created = await spawnCapture("ssh", [host, "mktemp -d /tmp/starward-native-XXXXXX"], { label: "ios-remote-mktemp" });
  const remoteRoot = created.stdout.trim();
  if (!/^\/tmp\/starward-native-[A-Za-z0-9._-]+$/u.test(remoteRoot)) throw new Error("ios_remote_temp_path_invalid");
  try {
    await new Promise((resolve, reject) => {
      const tar = spawn("tar", ["-cf", "-", "--exclude=.git", "--exclude=node_modules", "--exclude=tmp", "--exclude=.expo", "--exclude=dist-web", "."], {
        cwd: repositoryRoot,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const remote = spawn("ssh", [host, `tar -xf - -C ${shellQuote(remoteRoot)}`], { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      tar.stdout.pipe(remote.stdin);
      tar.stderr.pipe(process.stderr);
      remote.stderr.pipe(process.stderr);
      let tarCode = null;
      let remoteCode = null;
      const finish = () => {
        if (tarCode === null || remoteCode === null) return;
        if (tarCode === 0 && remoteCode === 0) resolve();
        else reject(new Error(`ios_remote_transfer_failed:${tarCode}:${remoteCode}`));
      };
      tar.once("error", reject);
      remote.once("error", reject);
      tar.once("close", (code) => { tarCode = code ?? -1; finish(); });
      remote.once("close", (code) => { remoteCode = code ?? -1; finish(); });
    });
    const forwarded = process.argv.slice(2).flatMap((value, index, values) => value === "ios" && values[index - 1] === "--platform" ? ["ios-local"] : [value]);
    const remoteCommand = [
      `cd ${shellQuote(remoteRoot)}`,
      "npm ci --ignore-scripts 1>&2",
      "npx pod-install apps/mobile/ios 1>&2",
      `node tools/long-task/verify-native-target.mjs ${forwarded.map(shellQuote).join(" ")}`,
    ].join(" && ");
    const result = await spawnCapture("ssh", [host, remoteCommand], { label: "ios-remote-native-check" });
    process.stderr.write(result.stderr);
    const line = result.stdout.split(/\r?\n/u).findLast((candidate) => candidate.trim().startsWith("{"));
    if (!line) throw new Error("ios_remote_result_missing");
    return JSON.parse(line);
  } finally {
    await spawnCapture("ssh", [host, `rm -rf -- ${shellQuote(remoteRoot)}`], { allowFailure: true, label: "ios-remote-cleanup" });
  }
}

function buildResult(runtime, caseDefinition) {
  const assertionKey = options["assertion-key"];
  const evidenceRecords = [{
    assertion_key: assertionKey,
    capability: "target_runtime",
    target_ref: options["target-ref"],
    root_entrypoint: options["root-entrypoint"],
    session_id: runtime.sessionId,
    cold_start: runtime.coldStart,
  }];
  if ((caseDefinition.cross_surfaces ?? []).length) {
    if (runtime.surfaceValues.length !== caseDefinition.cross_surfaces.length) throw new Error("cross_surface_evidence_incomplete");
    evidenceRecords.push({
      assertion_key: assertionKey,
      capability: "cross_surface_consistency",
      surfaces: runtime.surfaceValues.map((item) => ({
        surface_ref: item.surface_ref,
        target_ref: item.target_ref,
        state_sha256: hash(item.value),
      })),
    });
  }
  return {
    schema_version: "long-task-check-result-v3",
    execution_status: "completed",
    observations: { [options.observation]: true },
    evidence_records: evidenceRecords,
    diagnostics: [],
  };
}

let options;
let caseDefinition;
let startedAt;

function stableFailureCode(error) {
  const value = error instanceof Error ? error.message : String(error);
  return /^[A-Za-z0-9_-]+/u.exec(value)?.[0] ?? "native_target_check_failed";
}

async function execute() {
  if (options.conformance === "design-authority") {
    await spawnCapture(process.execPath, [path.join(repositoryRoot, "tools/verify-design-targets.mjs")], {
      cwd: repositoryRoot,
      label: "design-authority-conformance",
    });
  }

  if (options.platform === "ios" && process.platform !== "darwin") return runRemoteIos();
  const runtime = options.platform === "android"
    ? await runAndroid(caseDefinition)
    : await runIosLocal(caseDefinition);
  for (const opsSurface of (caseDefinition.cross_surfaces ?? []).filter((surface) => surface.ops_route)) runtime.surfaceValues.push(await readOpsSurface(opsSurface));
  return buildResult(runtime, caseDefinition);
}

async function main(argv = process.argv.slice(2)) {
  options = parseArgs(argv);
  const required = ["platform", "outcome", "target-ref", "root-entrypoint", "assertion-key", "observation"];
  for (const key of required) if (!options[key]) throw new Error(`required_argument_missing:${key}`);
  caseDefinition = contracts.outcomes[options.outcome];
  if (!caseDefinition) throw new Error(`native_contract_missing:${options.outcome}`);
  startedAt = new Date().toISOString();
  try {
    process.stdout.write(`${JSON.stringify(await execute())}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations: { [options.observation]: false },
      evidence_records: [],
      diagnostics: [`native_target_check_failed:${stableFailureCode(error)}`],
    })}\n`);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath && path.normalize(invokedPath).toLowerCase() === path.normalize(modulePath).toLowerCase()) await main();

export {
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
  stableRepositoryRoot,
  writeAndroidBuildCache,
};
