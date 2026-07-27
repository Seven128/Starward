import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";

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
  if (Buffer.isBuffer(value)) return createHash("sha256").update(value).digest("hex");
  const payload = typeof value === "string" ? value : JSON.stringify(value, Object.keys(value ?? {}).sort());
  return createHash("sha256").update(payload).digest("hex");
}

const asKey = (value) => String(value).replaceAll("_", "-");

async function loadDesignHandoff(relativePath) {
  const handoffPath = path.resolve(repositoryRoot, relativePath);
  const content = await readFile(handoffPath, "utf8");
  const match = /```yaml design-resource-handoff-v1\r?\n([\s\S]*?)\r?\n```/u.exec(content);
  if (!match) throw new Error("design_handoff_block_missing");
  const handoff = YAML.parse(match[1]);
  if (handoff?.schema_version !== "design-resource-handoff-v1") throw new Error("design_handoff_schema_invalid");
  return handoff;
}

function designAssertionPlan(handoff, outcome) {
  const targets = handoff.targets.filter((target) =>
    target.key === `mobile-page-constraint-${outcome}` ||
    target.key === `mobile-control-exact-${outcome}`,
  );
  if (targets.length !== 2) throw new Error(`native_design_targets_incomplete:${outcome}:${targets.length}`);
  const plan = [];
  for (const target of targets) {
    const rows = handoff.coverage.filter((row) => row.disposition === "covered" && row.target_refs.includes(target.key));
    if (!rows.length) throw new Error(`native_design_coverage_missing:${target.key}`);
    const short = asKey(target.key.replace(`-${outcome}`, ""));
    plan.push({
      key: `${short}-conformance`,
      observation: `design.${outcome}.${short}-conformance.passed`,
      capabilities: ["design_conformance", "interaction_trace", "target_runtime"],
      method: "conformance",
      target,
    });
    for (const method of [...new Set(rows.flatMap((row) => row.verification_methods))].sort()) {
      const key = `${short}-${asKey(method)}`;
      plan.push({
        key,
        observation: `design.${outcome}.${key}.passed`,
        capabilities: method === "interaction_trace"
          ? ["interaction_trace", "target_runtime"]
          : method === "component_state"
            ? ["design_conformance", "interaction_trace", "target_runtime"]
            : ["design_conformance", "target_runtime"],
        method,
        target,
      });
    }
  }
  if (outcome === "mobile-shell-and-preferences") {
    const key = "ac-mobile-shell-and-preferences-tab-state-and-native-navigation";
    plan.push({
      key,
      observation: `design.${outcome}.${key}.passed`,
      capabilities: ["interaction_trace", "target_runtime"],
      method: "navigation",
      target: null,
    });
  }
  return plan;
}

function handoffControls(handoff, outcome) {
  const targetKeys = new Set([
    `mobile-page-constraint-${outcome}`,
    `mobile-control-exact-${outcome}`,
  ]);
  return [...new Set(handoff.subjects
    .filter((subject) => subject.kind === "control" && subject.target_refs.some((ref) => targetKeys.has(ref)))
    .flatMap((subject) => subject.stable_keys))]
    .sort();
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
      const stdoutBuffer = Buffer.concat(stdout);
      const result = {
        code: code ?? -1,
        stdout: stdoutBuffer.toString("utf8"),
        stdoutBuffer,
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
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

function maybeFindUiNode(xml, testId) {
  try {
    return findUiNode(xml, testId);
  } catch (error) {
    if ((error instanceof Error ? error.message : String(error)) === `native_test_id_missing:${testId}`) return null;
    throw error;
  }
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

async function collectAndroidControlNodes(serial, testIds) {
  const found = new Map();
  let lastXml = "";
  for (let pass = 0; pass < 16 && found.size < testIds.length; pass += 1) {
    lastXml = await androidDump(serial);
    for (const testId of testIds) {
      if (found.has(testId)) continue;
      const node = maybeFindUiNode(lastXml, testId);
      if (node && hasMinimumVisibleBounds(node)) found.set(testId, node);
    }
    if (found.size === testIds.length) break;
    await adb(serial, ["shell", "input", "swipe", "540", "1650", "540", "420", "450"]);
    await delay(350);
  }
  const missing = testIds.filter((testId) => !found.has(testId));
  if (missing.length) throw new Error(`native_design_controls_missing:${missing.join(",")}`);
  return { nodes: found, xml: lastXml };
}

function hasMinimumVisibleBounds(node, minimumPx = 44) {
  const bounds = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/u.exec(node?.bounds ?? "");
  return Boolean(
    bounds
    && Number(bounds[3]) - Number(bounds[1]) >= minimumPx
    && Number(bounds[4]) - Number(bounds[2]) >= minimumPx,
  );
}

function validateAndroidControlSemantics(nodes) {
  for (const [testId, node] of nodes) {
    const [centerX, centerY] = nodeCenter(node);
    if (centerX < 0 || centerY < 0) throw new Error(`native_control_geometry_invalid:${testId}`);
    if (!hasMinimumVisibleBounds(node)) {
      throw new Error(`native_control_touch_target_too_small:${testId}`);
    }
    const semanticName = (node["content-desc"] || node.text || "").trim();
    if (!semanticName || semanticName === testId) throw new Error(`native_control_accessible_name_missing:${testId}`);
    if (node.enabled === "false") throw new Error(`native_control_unexpected_disabled:${testId}`);
  }
}

async function androidScreenshot(serial) {
  const result = await adb(serial, ["exec-out", "screencap", "-p"], { label: "android-screenshot" });
  if (result.stdoutBuffer.length < 1024 || result.stdoutBuffer[0] !== 0x89 || result.stdoutBuffer[1] !== 0x50) {
    throw new Error("android_screenshot_invalid");
  }
  return result.stdoutBuffer;
}

async function androidOpenRoute(serial, appId, route) {
  const deepLink = `starward://${route.startsWith("/") ? route : `/${route}`}`;
  await adb(serial, ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", deepLink, appId]);
  await delay(900);
}

async function tapAndroidNode(serial, testId) {
  const ready = await androidWaitForNodes(serial, [testId], androidUiEvidenceTimeoutMs);
  const [x, y] = nodeCenter(ready.nodes[testId]);
  await adb(serial, ["shell", "input", "tap", String(x), String(y)]);
}

async function verifyPrimaryNavigation(serial) {
  const destinations = [
    { tab: "primary-tab-tonight", screen: "screen-tonight-decision", gesture: ["540", "1500", "540", "900", "400"] },
    { tab: "shell-open-map-tab", screen: "screen-map-route-discovery", gesture: ["760", "1060", "360", "760", "400"] },
    { tab: "primary-tab-itinerary", screen: "screen-itinerary-and-collaboration", gesture: ["540", "1500", "540", "900", "400"] },
    { tab: "primary-tab-sky", screen: "screen-sky-orientation-ar", gesture: ["760", "1060", "360", "760", "400"] },
    { tab: "primary-tab-profile", screen: "screen-identity-profile-privacy", gesture: ["540", "1500", "540", "900", "400"] },
  ];
  const states = new Map();
  for (const destination of destinations) {
    await tapAndroidNode(serial, destination.tab);
    await androidWaitForNodes(serial, [destination.screen], androidUiEvidenceTimeoutMs);
    await adb(serial, ["shell", "input", "swipe", ...destination.gesture]);
    await delay(350);
    states.set(destination.tab, await androidScreenshot(serial));
  }
  for (const destination of destinations) {
    await tapAndroidNode(serial, destination.tab);
    await androidWaitForNodes(serial, [destination.screen], androidUiEvidenceTimeoutMs);
    await delay(350);
    const restored = await androidScreenshot(serial);
    if (normalizedPngDifference(states.get(destination.tab), restored) > 0.12) {
      throw new Error(`primary_navigation_state_not_restored:${destination.tab}`);
    }
  }
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
  if (options.outcome === "mobile-shell-and-preferences" && options["design-handoff"]) {
    await verifyPrimaryNavigation(serial);
    await adb(serial, ["shell", "am", "force-stop", appId]);
    await adb(serial, ["shell", "am", "start", "-W", "-n", `${appId}/.MainActivity`]);
    await androidWaitForNodes(serial, [androidAppReadyTestId], androidUiEvidenceTimeoutMs);
  }
  await androidOpenRoute(serial, appId, caseDefinition.route);
  let controlNodes = new Map();
  if (designControlIds.length) {
    controlNodes = (await collectAndroidControlNodes(serial, designControlIds)).nodes;
    validateAndroidControlSemantics(controlNodes);
    await adb(serial, ["shell", "am", "force-stop", appId]);
    await adb(serial, ["shell", "am", "start", "-W", "-n", `${appId}/.MainActivity`]);
    await androidWaitForNodes(serial, [androidAppReadyTestId], androidUiEvidenceTimeoutMs);
    await androidOpenRoute(serial, appId, caseDefinition.route);
  }
  let ready = await androidWaitForNodes(serial, [caseDefinition.action_test_id], androidUiEvidenceTimeoutMs);
  const action = ready.nodes[caseDefinition.action_test_id];
  const [x, y] = nodeCenter(action);
  await adb(serial, ["shell", "input", "tap", String(x), String(y)]);
  ready = await androidWaitForNodes(serial, caseDefinition.evidence_test_ids, androidUiEvidenceTimeoutMs);
  const outcomeXml = ready.xml;
  const screenshotPng = await androidScreenshot(serial);
  await delay(650);
  const settledScreenshotPng = await androidScreenshot(serial);

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
    serial,
    controlNodes,
    outcomeXml,
    screenshotPng,
    settledScreenshotPng,
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

let pngCodec;
function png() {
  if (pngCodec) return pngCodec;
  const requireFromAcceptance = createRequire(path.join(repositoryRoot, "tests/acceptance/package.json"));
  pngCodec = requireFromAcceptance(requireFromAcceptance.resolve("pngjs")).PNG;
  return pngCodec;
}

function pngDimensions(buffer) {
  const image = png().sync.read(buffer);
  return { width: image.width, height: image.height };
}

function normalizedPngDifference(leftBuffer, rightBuffer) {
  const left = png().sync.read(leftBuffer);
  const right = png().sync.read(rightBuffer);
  const samples = 64;
  let delta = 0;
  for (let y = 0; y < samples; y += 1) {
    for (let x = 0; x < samples; x += 1) {
      const leftX = Math.min(left.width - 1, Math.floor((x + 0.5) * left.width / samples));
      const leftY = Math.min(left.height - 1, Math.floor((y + 0.5) * left.height / samples));
      const rightX = Math.min(right.width - 1, Math.floor((x + 0.5) * right.width / samples));
      const rightY = Math.min(right.height - 1, Math.floor((y + 0.5) * right.height / samples));
      const leftIndex = (leftY * left.width + leftX) * 4;
      const rightIndex = (rightY * right.width + rightX) * 4;
      delta += Math.abs(left.data[leftIndex] - right.data[rightIndex]);
      delta += Math.abs(left.data[leftIndex + 1] - right.data[rightIndex + 1]);
      delta += Math.abs(left.data[leftIndex + 2] - right.data[rightIndex + 2]);
    }
  }
  return delta / (samples * samples * 3 * 255);
}

function pngColorBuckets(buffer) {
  const image = png().sync.read(buffer);
  const buckets = new Set();
  const step = Math.max(1, Math.floor((image.width * image.height) / 12_000));
  for (let pixel = 0; pixel < image.width * image.height; pixel += step) {
    const index = pixel * 4;
    buckets.add(`${image.data[index] >> 4}:${image.data[index + 1] >> 4}:${image.data[index + 2] >> 4}`);
  }
  return buckets.size;
}

async function loadChromium() {
  const requireFromAcceptance = createRequire(path.join(repositoryRoot, "tests/acceptance/package.json"));
  const playwrightPath = requireFromAcceptance.resolve("@playwright/test");
  const playwrightModule = await import(pathToFileURL(playwrightPath).href);
  const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
  if (!chromium) throw new Error("design_reference_playwright_chromium_missing");
  return chromium;
}

function designArtifactPaths(outcome, targetKey) {
  const relativeDirectory = `artifacts/verification/design-conformance/${outcome}`;
  return {
    directory: path.join(repositoryRoot, ...relativeDirectory.split("/")),
    actualRelative: `${relativeDirectory}/${targetKey}-actual.png`,
    comparisonRelative: `${relativeDirectory}/${targetKey}-comparison.png`,
  };
}

async function captureDesignReference(browser, target, outcome, outputPath, viewport) {
  const entry = target.key.startsWith("mobile-page-constraint-")
    ? "docs/design-targets/mobile-product-pages-v2/index.html"
    : target.key.startsWith("mobile-control-exact-")
      ? "docs/design-targets/mobile-controls-v3/index.html"
      : null;
  if (!entry) throw new Error(`native_design_reference_entry_unknown:${target.key}`);
  const page = await browser.newPage({
    viewport: {
      width: Math.max(430, Math.min(1440, viewport.width)),
      height: Math.max(844, Math.min(2400, viewport.height)),
    },
    locale: "zh-CN",
    reducedMotion: "reduce",
  });
  try {
    await page.goto(pathToFileURL(path.join(repositoryRoot, entry)).href, { waitUntil: "load" });
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
    if (target.key.startsWith("mobile-page-constraint-")) {
      const navigation = page.locator(`[data-outcome-id=${JSON.stringify(outcome)}]`).first();
      await navigation.click();
      const device = page.locator(".device").first();
      await device.waitFor({ state: "visible" });
      await device.screenshot({ path: outputPath, animations: "disabled" });
      return;
    }
    await page.evaluate((selectedOutcome) => {
      for (const node of document.querySelectorAll("[data-outcome]")) {
        if (node.getAttribute("data-outcome") !== selectedOutcome) node.setAttribute("hidden", "");
      }
      const scroll = document.querySelector("#phoneScroll");
      if (scroll) scroll.scrollTop = 0;
    }, outcome);
    const surface = page.locator("#phoneSurface").first();
    await surface.waitFor({ state: "visible" });
    await surface.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function materializeDesignArtifacts(runtime, plan, outcome) {
  const byTarget = new Map();
  const dimensions = pngDimensions(runtime.screenshotPng);
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const target of [...new Map(plan.filter((item) => item.target).map((item) => [item.target.key, item.target])).values()]) {
      const paths = designArtifactPaths(outcome, target.key);
      await mkdir(paths.directory, { recursive: true });
      const actualPath = path.join(repositoryRoot, ...paths.actualRelative.split("/"));
      const comparisonPath = path.join(repositoryRoot, ...paths.comparisonRelative.split("/"));
      await writeFile(actualPath, runtime.screenshotPng);
      await captureDesignReference(browser, target, outcome, comparisonPath, dimensions);
      const comparisonPng = await readFile(comparisonPath);
      byTarget.set(target.key, {
        target,
        actualPath: paths.actualRelative,
        comparisonPath: paths.comparisonRelative,
        actualPng: runtime.screenshotPng,
        comparisonPng,
      });
    }
  } finally {
    await browser.close();
  }
  return byTarget;
}

function validateDesignMethod(method, runtime, artifact, caseDefinition) {
  const evidenceNodes = caseDefinition.evidence_test_ids.map((testId) => findUiNode(runtime.outcomeXml, testId));
  if (!evidenceNodes.length) throw new Error(`native_design_evidence_empty:${method}`);
  if (["conformance", "component_state", "content", "interaction_trace"].includes(method)) {
    for (let index = 0; index < evidenceNodes.length; index += 1) {
      if (!nodeValue(evidenceNodes[index], caseDefinition.evidence_test_ids[index])) {
        throw new Error(`native_design_evidence_value_empty:${caseDefinition.evidence_test_ids[index]}`);
      }
    }
  }
  if (["conformance", "accessibility_semantics", "input_method", "layout_geometry", "responsive_reflow"].includes(method)) {
    validateAndroidControlSemantics(runtime.controlNodes);
  }
  if (method === "input_method") {
    for (const [testId, node] of runtime.controlNodes) {
      if (node.clickable !== "true" && node.focusable !== "true" && node.scrollable !== "true") {
        throw new Error(`native_control_input_method_missing:${testId}`);
      }
    }
  }
  if (["conformance", "motion_timeline", "component_state"].includes(method) &&
      normalizedPngDifference(runtime.screenshotPng, runtime.settledScreenshotPng) > 0.08) {
    throw new Error(`native_motion_did_not_settle:${method}`);
  }
  if (["conformance", "visual_pixel"].includes(method)) {
    const difference = normalizedPngDifference(artifact.actualPng, artifact.comparisonPng);
    const threshold = artifact.target.interpretation === "exact_target" ? 0.55 : 0.62;
    if (difference > threshold) throw new Error(`native_visual_difference_exceeded:${artifact.target.key}`);
    const actualSize = pngDimensions(artifact.actualPng);
    const comparisonSize = pngDimensions(artifact.comparisonPng);
    const actualRatio = actualSize.width / actualSize.height;
    const comparisonRatio = comparisonSize.width / comparisonSize.height;
    if (Math.abs(actualRatio - comparisonRatio) > 0.45) throw new Error(`native_visual_aspect_mismatch:${artifact.target.key}`);
  }
  if (["conformance", "design_token", "asset_integrity"].includes(method) && pngColorBuckets(artifact.actualPng) < 12) {
    throw new Error(`native_render_token_diversity_missing:${artifact.target.key}`);
  }
}

async function writeDesignMethodArtifact(outcome, entry, artifact, runtime) {
  if (!entry.target) return;
  const paths = designArtifactPaths(outcome, entry.target.key);
  const output = path.join(paths.directory, `${entry.target.key}-${entry.method}-evidence.json`);
  await writeFile(output, `${JSON.stringify({
    schema_version: "starward-native-design-method-evidence-v1",
    outcome,
    assertion_key: entry.key,
    method: entry.method,
    target: entry.target.key,
    controls: designControlIds,
    session_id: runtime.sessionId,
    actual_sha256: hash(artifact.actualPng),
    comparison_sha256: hash(artifact.comparisonPng),
    normalized_pixel_difference: normalizedPngDifference(artifact.actualPng, artifact.comparisonPng),
  }, null, 2)}\n`, "utf8");
}

async function buildDesignResult(runtime, caseDefinition) {
  if (options["assertion-key"] !== designPlan[0]?.key || options.observation !== designPlan[0]?.observation) {
    throw new Error("native_design_contract_identity_mismatch");
  }
  const artifacts = await materializeDesignArtifacts(runtime, designPlan, options.outcome);
  const observations = {};
  const evidenceRecords = [];
  for (const entry of designPlan) {
    const artifact = entry.target ? artifacts.get(entry.target.key) : null;
    if (entry.target) {
      validateDesignMethod(entry.method, runtime, artifact, caseDefinition);
      await writeDesignMethodArtifact(options.outcome, entry, artifact, runtime);
    }
    observations[entry.observation] = true;
    if (entry.capabilities.includes("target_runtime")) {
      evidenceRecords.push({
        assertion_key: entry.key,
        capability: "target_runtime",
        target_ref: options["target-ref"],
        root_entrypoint: options["root-entrypoint"],
        session_id: runtime.sessionId,
        cold_start: runtime.coldStart,
      });
    }
    if (entry.capabilities.includes("interaction_trace")) {
      evidenceRecords.push({
        assertion_key: entry.key,
        capability: "interaction_trace",
        target_ref: options["target-ref"],
        given_keys: ["production-root-ready"],
        action_keys: ["enter-production-surface", "exercise-bound-controls", "compare-frozen-target"],
      });
    }
    if (entry.capabilities.includes("design_conformance")) {
      evidenceRecords.push({
        assertion_key: entry.key,
        capability: "design_conformance",
        design_target_ref: entry.target.key,
        target_ref: options["target-ref"],
        condition_keys: [...entry.target.condition_refs],
        actual_artifact_path: artifact.actualPath,
        comparison_artifact_path: artifact.comparisonPath,
      });
    }
  }
  return {
    schema_version: "long-task-check-result-v3",
    execution_status: "completed",
    observations,
    evidence_records: evidenceRecords,
    diagnostics: [],
  };
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
let designHandoff = null;
let designPlan = [];
let designControlIds = [];

function stableFailureCode(error) {
  const value = error instanceof Error ? error.message : String(error);
  return /^[A-Za-z0-9_-]+/u.exec(value)?.[0] ?? "native_target_check_failed";
}

async function writeDesignFailureArtifact(
  outcome,
  error,
  {
    controls = designControlIds,
    root = repositoryRoot,
    startedAtValue = startedAt,
  } = {},
) {
  if (!/^[a-z0-9-]+$/u.test(outcome)) throw new Error("native_design_failure_outcome_invalid");
  const relativeDirectory = `artifacts/verification/design-conformance/${outcome}`;
  const relativePath = `${relativeDirectory}/failure-evidence.json`;
  await mkdir(path.join(root, ...relativeDirectory.split("/")), { recursive: true });
  await writeFile(path.join(root, ...relativePath.split("/")), `${JSON.stringify({
    schema_version: "starward-native-design-failure-evidence-v1",
    outcome,
    execution_status: "failed",
    controls,
    started_at: startedAtValue,
    diagnostic: `native_target_check_failed:${stableFailureCode(error)}`,
  }, null, 2)}\n`, "utf8");
  return relativePath;
}

async function execute() {
  if (options["design-handoff"]) {
    designHandoff = await loadDesignHandoff(options["design-handoff"]);
    designPlan = designAssertionPlan(designHandoff, options.outcome);
    designControlIds = handoffControls(designHandoff, options.outcome);
    if (!designControlIds.length) throw new Error(`native_design_controls_missing:${options.outcome}`);
  }
  if (options.conformance === "design-authority" || options["design-handoff"]) {
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
  return options["design-handoff"]
    ? await buildDesignResult(runtime, caseDefinition)
    : buildResult(runtime, caseDefinition);
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
    const diagnostics = [`native_target_check_failed:${stableFailureCode(error)}`];
    if (options["design-handoff"]) {
      try {
        await writeDesignFailureArtifact(options.outcome, error);
      } catch (artifactError) {
        diagnostics.push(`native_design_failure_artifact_write_failed:${stableFailureCode(artifactError)}`);
      }
    }
    const failedObservations = Object.fromEntries(
      (designPlan.length ? designPlan : [{ observation: options.observation }]).map((entry) => [entry.observation, false]),
    );
    process.stdout.write(`${JSON.stringify({
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations: failedObservations,
      evidence_records: [],
      diagnostics,
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
  hasMinimumVisibleBounds,
  isAndroidBuildInputFile,
  isTransientAndroidUiDumpError,
  normalizeAndroidBuildInputContent,
  readAndroidBuildCache,
  stableRepositoryRoot,
  writeDesignFailureArtifact,
  writeAndroidBuildCache,
};
