import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";
import {
  applicableControlStates,
  assertExactContractPopulation,
  assertExactRuntimeFieldWitnesses,
  assertExactRuntimeProfileWitnesses,
  assertScenarioTrace,
  assertStateTrace,
  designWitnessCorroboration,
  parseDesignFieldWitnessLog,
  parseStructuredEvidenceValue,
} from "./design-contract-proof.mjs";
import {
  assertCompleteNativeDesignPopulation,
  createNativeDesignPlan,
  NativeVerificationCheckpointStore,
  nativeCheckpointReuseAllowed,
  nativeVerificationFingerprint,
  partitionNativeDesignUnits,
} from "./native-verification-session.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "../..");
const contracts = JSON.parse(await readFile(path.join(repositoryRoot, "tests/acceptance/native/contracts.json"), "utf8"));
const androidAbis = /^(?:armeabi-v7a|arm64-v8a|x86|x86_64)$/u;
const androidCacheSchema = "starward-android-build-cache-v1";
const androidUiEvidenceTimeoutMs = 60_000;
const androidAppReadyTestId = "primary-tab-map";
const mobilePageTargetEntry = "docs/design-targets/mobile-product-pages-v2/index.html";
const mobileControlTargetEntry = "docs/design-targets/mobile-controls-v3/index.html";
const mobileControlContractPath = "docs/design-targets/mobile-controls-v3/implementation-contract.json";
const mobileProductionMediaManifestPath = "apps/mobile/src/assets/production-media-manifest.json";
const nativeExactVisualThreshold = 0.035;
const nativeConstraintVisualThreshold = 0.07;
const nativeExactMismatchThreshold = 0.12;
const nativeConstraintMismatchThreshold = 0.22;
const nativeExactEdgeThreshold = 0.05;
const nativeConstraintEdgeThreshold = 0.09;
const nativeSettledMotionThreshold = 0.035;
const nativeVisibleMotionThreshold = 0.004;
const nativePageGeometryTolerancePx = 3;
const nativeControlRatioTolerance = 0.04;
const nativeDesignEvidenceLogMarker = "STARWARD_DESIGN_FIELD";
const nativeDesignModes = Object.freeze(["planning", "night", "red-light"]);
const androidDesignLogCapacityReady = new Set();
const androidArtifactPromises = new Map();
let androidPreflightPromise = null;
let javaRuntimeIdentityPromise = null;
let resolvedJavaHomePromise = null;
const nativeObserverMetrics = {
  adb_calls: 0,
  checkpoint_hits: 0,
  checkpoint_writes: 0,
  cold_starts: 0,
  log_reads: 0,
  screenshots: 0,
  ui_dumps: 0,
  ui_wait_retries: 0,
};
const androidSdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? null;
const androidAdbExecutable = androidSdkRoot
  ? path.join(androidSdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
  : "adb";

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

function booleanOption(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  throw new Error(`boolean_argument_invalid:${value}`);
}

function commaOption(value) {
  if (value === undefined || value === "all") return "all";
  const values = String(value).split(",").map((entry) => entry.trim()).filter(Boolean);
  if (!values.length || new Set(values).size !== values.length) {
    throw new Error(`comma_argument_invalid:${value}`);
  }
  return values;
}

function canonicalEvidenceJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalEvidenceJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalEvidenceJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  if (Buffer.isBuffer(value)) return createHash("sha256").update(value).digest("hex");
  const payload = typeof value === "string" ? value : canonicalEvidenceJson(value);
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
      rows,
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
        rows: rows.filter((row) => row.verification_methods.includes(method)),
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
    for (const [key, method] of [
      ["dr-mobile-native-device", "native_device"],
      ["dr-root-cold-start-journey", "root_cold_start"],
      ["dr-shared-context-consistency", "shared_context"],
    ]) {
      plan.push({
        key,
        observation: `design.${outcome}.${key}.passed`,
        capabilities: ["interaction_trace", "target_runtime"],
        method,
        target: null,
      });
    }
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
    let timedOut = false;
    const timeout = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? setTimeout(() => {
        timedOut = true;
        child.kill();
      }, options.timeoutMs)
      : null;
    child.stdout.on("data", (chunk) => {
      stdout.push(Buffer.from(chunk));
      if (options.echo) process.stderr.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr.push(Buffer.from(chunk));
      if (options.echo) process.stderr.write(chunk);
    });
    child.once("error", (error) => {
      if (timeout) clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      if (timeout) clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`${options.label ?? command}_timeout:${options.timeoutMs}`));
        return;
      }
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

async function resolvedJavaHome() {
  if (!resolvedJavaHomePromise) {
    resolvedJavaHomePromise = (async () => {
      const candidates = [
        process.env.JAVA_HOME,
        process.platform === "win32"
          ? path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Android/Android Studio/jbr")
          : null,
        process.platform === "darwin" ? "/Applications/Android Studio.app/Contents/jbr/Contents/Home" : null,
      ].filter(Boolean);
      for (const candidate of candidates) {
        try {
          await access(path.join(candidate, "bin", process.platform === "win32" ? "java.exe" : "java"));
          return candidate;
        } catch { /* try the next deterministic local JDK */ }
      }
      return null;
    })();
  }
  return resolvedJavaHomePromise;
}

async function javaRuntimeIdentity() {
  if (!javaRuntimeIdentityPromise) {
    javaRuntimeIdentityPromise = (async () => {
      const javaHome = await resolvedJavaHome();
      const executable = javaHome
        ? path.join(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java")
        : "java";
      try {
        const result = await spawnCapture(executable, ["-version"], { label: "java-version" });
        return `${result.stdout}\n${result.stderr}`.trim();
      } catch (error) {
        if (error?.code === "ENOENT") return "java-unavailable";
        throw error;
      }
    })();
  }
  return javaRuntimeIdentityPromise;
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
  nativeObserverMetrics.adb_calls += 1;
  const prefix = serial ? ["-s", serial] : [];
  return spawnCapture(androidAdbExecutable, [...prefix, ...argv], { ...options, label: options?.label ?? "adb" });
}

function xmlAttributes(node) {
  const values = {};
  for (const match of node.matchAll(/([\w-]+)=(["'])(.*?)\2/gu)) values[match[1]] = match[3]
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
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

function parseNodeBounds(attributes) {
  const match = /^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/u.exec(attributes?.bounds ?? "");
  if (!match) throw new Error("native_node_bounds_missing");
  const [left, top, right, bottom] = match.slice(1).map(Number);
  if (right <= left || bottom <= top) throw new Error("native_node_bounds_invalid");
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function androidVerticalScrollGesture(xml, viewport) {
  const candidates = [];
  for (const match of xml.matchAll(/<node\b[^>]*>/gu)) {
    const attributes = xmlAttributes(match[0]);
    if (attributes.scrollable !== "true") continue;
    try {
      const bounds = parseNodeBounds(attributes);
      const left = Math.max(0, bounds.left);
      const top = Math.max(0, bounds.top);
      const right = Math.min(viewport.width, bounds.right);
      const bottom = Math.min(viewport.height, bounds.bottom);
      if (right <= left || bottom - top < 80) continue;
      candidates.push({
        area: (right - left) * (bottom - top),
        bottom,
        left,
        right,
        top,
      });
    } catch {
      // Ignore malformed or clipped accessibility nodes; another observed
      // production scroll owner must provide the gesture boundary.
    }
  }
  const owner = candidates.sort((left, right) => right.area - left.area)[0];
  if (!owner) throw new Error("native_scroll_container_missing");
  const height = owner.bottom - owner.top;
  return {
    fromX: Math.max(1, Math.round((owner.left + owner.right) / 2)),
    fromY: Math.max(owner.top + 2, Math.round(owner.top + height * 0.78)),
    toX: Math.max(1, Math.round((owner.left + owner.right) / 2)),
    toY: Math.max(owner.top + 1, Math.round(owner.top + height * 0.28)),
  };
}

function nodeCenter(attributes) {
  const bounds = parseNodeBounds(attributes);
  return [Math.round((bounds.left + bounds.right) / 2), Math.round((bounds.top + bounds.bottom) / 2)];
}

function parseAndroidUiAutomatorDump(output) {
  const text = String(output ?? "");
  const documentStart = Math.min(
    ...[text.indexOf("<?xml"), text.indexOf("<hierarchy")]
      .filter((index) => index >= 0),
  );
  const closingTag = "</hierarchy>";
  const documentEnd = text.lastIndexOf(closingTag);
  if (!Number.isFinite(documentStart) || documentEnd < documentStart) {
    throw new Error("android_uiautomator_dump_xml_missing");
  }
  return text.slice(documentStart, documentEnd + closingTag.length);
}

async function androidDump(serial) {
  nativeObserverMetrics.ui_dumps += 1;
  const result = await adb(
    serial,
    ["exec-out", "uiautomator", "dump", "/dev/tty"],
    { label: "android-uiautomator-dump", timeoutMs: 15_000 },
  );
  return parseAndroidUiAutomatorDump(result.stdout);
}

function isTransientAndroidUiDumpError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("null root node returned by UiTestAutomationBridge")
    || message.includes("could not get idle state")
    || message === "android_uiautomator_dump_xml_missing"
    || message.includes("adb_failed:4294967295:")
    || message.startsWith("android-uiautomator-dump_timeout:");
}

async function retryTransientAndroidUiDumpOperation(
  operation,
  {
    timeoutMs = androidUiEvidenceTimeoutMs,
    now = Date.now,
    wait = delay,
  } = {},
) {
  const deadline = now() + timeoutMs;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientAndroidUiDumpError(error) || now() >= deadline) throw error;
      await wait(Math.min(500, Math.max(0, deadline - now())));
    }
  }
}

async function androidStableDump(serial, timeoutMs = androidUiEvidenceTimeoutMs) {
  return retryTransientAndroidUiDumpOperation(
    () => androidDump(serial),
    { timeoutMs },
  );
}

async function androidWaitForNodes(serial, testIds, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastMissing = testIds[0];
  while (Date.now() < deadline) {
    try {
      const xml = await androidDump(serial);
      const systemUiRecovery = transientAndroidSystemUiRecoveryTap(xml);
      if (systemUiRecovery) {
        nativeObserverMetrics.ui_wait_retries += 1;
        await adb(serial, [
          "shell",
          "input",
          "tap",
          String(systemUiRecovery.x),
          String(systemUiRecovery.y),
        ]);
        await delay(500);
        continue;
      }
      return {
        xml,
        nodes: Object.fromEntries(testIds.map((testId) => [testId, findUiNode(xml, testId)])),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isTransientAndroidUiDumpError(error)) {
        nativeObserverMetrics.ui_wait_retries += 1;
        await delay(500);
        continue;
      }
      if (!message.startsWith("native_test_id_missing:")) throw error;
      lastMissing = message.slice("native_test_id_missing:".length);
      nativeObserverMetrics.ui_wait_retries += 1;
      await delay(500);
    }
  }
  throw new Error(`native_test_id_timeout:${lastMissing}`);
}

function transientAndroidSystemUiRecoveryTap(xml) {
  const title = maybeFindUiNode(xml, "android:id/alertTitle");
  if (!title || nodeValue(title, "android:id/alertTitle") !== "System UI isn't responding") return null;
  const waitAction = maybeFindUiNode(xml, "android:id/aerr_wait");
  if (!waitAction || nodeValue(waitAction, "android:id/aerr_wait") !== "Wait") return null;
  const [x, y] = nodeCenter(waitAction);
  return { x, y };
}

async function collectAndroidControlNodes(serial, testIds) {
  const found = new Map();
  let lastXml = "";
  for (let pass = 0; pass < 16 && found.size < testIds.length; pass += 1) {
    lastXml = await androidStableDump(serial);
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
  try {
    const bounds = parseNodeBounds(node);
    return bounds.width >= minimumPx && bounds.height >= minimumPx;
  } catch {
    return false;
  }
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
  nativeObserverMetrics.screenshots += 1;
  return retryTransientAndroidScreenshotOperation(async () => {
    const result = await adb(serial, ["exec-out", "screencap", "-p"], { label: "android-screenshot" });
    if (result.stdoutBuffer.length < 1024 || result.stdoutBuffer[0] !== 0x89 || result.stdoutBuffer[1] !== 0x50) {
      throw new Error("android_screenshot_invalid");
    }
    return result.stdoutBuffer;
  });
}

function isTransientAndroidScreenshotError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("android-screenshot_failed:4294967295:")
    || message.startsWith("android-screenshot_timeout:");
}

async function retryTransientAndroidScreenshotOperation(
  operation,
  {
    timeoutMs = androidUiEvidenceTimeoutMs,
    now = Date.now,
    wait = delay,
  } = {},
) {
  const deadline = now() + timeoutMs;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientAndroidScreenshotError(error) || now() >= deadline) throw error;
      await wait(Math.min(500, Math.max(0, deadline - now())));
    }
  }
}

function parseAndroidLogBufferBytes(output, bufferName = "main") {
  const escaped = bufferName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(
    `(?:^|\\n)${escaped}:\\s+ring buffer is\\s+([\\d.]+)\\s+([KMG])i?B`,
    "iu",
  ).exec(String(output ?? ""));
  if (!match) throw new Error(`native_design_log_buffer_unreadable:${bufferName}`);
  const value = Number(match[1]);
  const multiplier = { K: 1024, M: 1024 ** 2, G: 1024 ** 3 }[match[2].toUpperCase()];
  if (!Number.isFinite(value) || !multiplier) throw new Error(`native_design_log_buffer_unreadable:${bufferName}`);
  return Math.floor(value * multiplier);
}

async function ensureAndroidDesignEvidenceLogCapacity(serial) {
  if (androidDesignLogCapacityReady.has(serial)) return;
  await adb(serial, ["logcat", "-b", "main", "-G", "8M"], {
    allowFailure: true,
    label: "android-design-log-capacity",
  });
  const report = await adb(serial, ["logcat", "-b", "main", "-g"], {
    label: "android-design-log-capacity-readback",
  });
  if (parseAndroidLogBufferBytes(report.stdout, "main") < 4 * 1024 * 1024) {
    throw new Error("native_design_log_buffer_too_small");
  }
  androidDesignLogCapacityReady.add(serial);
}

export function androidDesignEvidenceResetCommands(appId) {
  if (typeof appId !== "string" || !appId.trim()) throw new Error("android_app_id_required");
  return [
    ["shell", "am", "force-stop", appId],
    ["logcat", "-b", "main", "-c"],
  ];
}

async function clearAndroidDesignEvidenceLog(serial, appId) {
  await ensureAndroidDesignEvidenceLogCapacity(serial);
  await adb(serial, androidDesignEvidenceResetCommands(appId)[1]);
}

async function resetAndroidDesignEvidenceLog(serial, appId) {
  const [stopCommand, clearCommand] = androidDesignEvidenceResetCommands(appId);
  await adb(serial, stopCommand);
  await ensureAndroidDesignEvidenceLogCapacity(serial);
  await adb(serial, clearCommand);
}

async function readAndroidDesignEvidenceLog(serial) {
  nativeObserverMetrics.log_reads += 1;
  const result = await adb(serial, ["logcat", "-b", "main", "-d", "-v", "raw"]);
  if (!result.stdout.includes(nativeDesignEvidenceLogMarker)) {
    throw new Error("native_design_runtime_witness_log_missing");
  }
  const records = parseDesignFieldWitnessLog(result.stdout);
  if (!records.length) throw new Error("native_design_runtime_witness_empty");
  return records;
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

async function startAndroidProductionJourney(serial, appId, definition, mode = null, designEvidence = null) {
  nativeObserverMetrics.cold_starts += 1;
  await adb(serial, ["shell", "am", "force-stop", appId]);
  const startArguments = ["shell", "am", "start", "-W", "-n", `${appId}/.MainActivity`];
  if (designEvidence) {
    for (const [key, value] of Object.entries({
      starwardDesignCondition: designEvidence.condition_key,
      starwardDesignControl: designEvidence.control_id,
      starwardDesignEvidenceSession: designEvidence.session_id,
      starwardDesignMode: designEvidence.mode,
      starwardDesignOutcome: designEvidence.outcome,
      starwardDesignSample: designEvidence.sample_id,
    })) {
      if (!value) throw new Error(`native_design_evidence_context_missing:${key}`);
      startArguments.push("--es", key, String(value));
    }
  }
  await adb(serial, startArguments);
  await androidWaitForNodes(serial, [androidAppReadyTestId], androidUiEvidenceTimeoutMs);
  if (mode) {
    const modeJourney = contracts.design_mode_journeys?.[mode];
    if (!Array.isArray(modeJourney) || !modeJourney.length) throw new Error(`native_design_mode_journey_missing:${mode}`);
    for (const actionId of modeJourney) {
      await tapAndroidNode(serial, actionId);
      await delay(250);
    }
  }
  if (!Array.isArray(definition.root_journey) || !definition.root_journey.length) {
    throw new Error(`native_root_journey_missing:${options.outcome}`);
  }
  for (const actionId of definition.root_journey) {
    await tapAndroidNode(serial, actionId);
    await delay(250);
  }
  if (!definition.screen_test_id) throw new Error(`native_screen_test_id_missing:${options.outcome}`);
  const ready = await androidWaitForNodes(serial, [definition.screen_test_id], androidUiEvidenceTimeoutMs);
  return ready;
}

export function androidDesignContextBroadcastCommand(appId, designEvidence) {
  if (!appId || !designEvidence || typeof designEvidence !== "object") {
    throw new Error("native_design_context_invalid");
  }
  const fields = {
    conditionKey: designEvidence.condition_key,
    controlId: designEvidence.control_id,
    sessionId: designEvidence.session_id,
    mode: designEvidence.mode,
    outcome: designEvidence.outcome,
    sampleId: designEvidence.sample_id,
  };
  const command = [
    "shell",
    "am",
    "broadcast",
    "-a",
    `${appId}.DESIGN_CONTEXT`,
    "-p",
    appId,
  ];
  for (const [key, value] of Object.entries(fields)) {
    if (!value) throw new Error(`native_design_evidence_context_missing:${key}`);
    command.push("--es", key, String(value));
  }
  return command;
}

async function activateAndroidDesignEvidenceContext(serial, appId, designEvidence) {
  await adb(serial, androidDesignContextBroadcastCommand(appId, designEvidence));
  const testId = nativeDesignContextTestId(designEvidence.sample_id);
  const ready = await androidWaitForNodes(serial, [testId], androidUiEvidenceTimeoutMs);
  const trace = parseStructuredEvidenceValue(
    ready.nodes[testId]["content-desc"]
      || semanticNodeValue(ready.nodes[testId], testId),
    "starward-design-context-ready-v1",
  );
  const expected = {
    condition_key: designEvidence.condition_key,
    control_id: designEvidence.control_id,
    mode: designEvidence.mode,
    outcome: designEvidence.outcome,
    sample_id: designEvidence.sample_id,
    session_id: designEvidence.session_id,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (trace[key] !== value) {
      throw new Error(`native_design_context_attribution_mismatch:${key}`);
    }
  }
  return ready;
}

async function resetAndroidProductionSurface(serial, appId, definition) {
  if (!definition.route || !definition.screen_test_id) {
    throw new Error(`native_production_surface_reset_contract_missing:${options.outcome}`);
  }
  await androidOpenRoute(serial, appId, definition.route);
  return androidWaitForNodes(
    serial,
    [definition.screen_test_id],
    androidUiEvidenceTimeoutMs,
  );
}

async function findAndroidNodeByScrolling(serial, testId, viewport, initialXml = null) {
  for (let pass = 0; pass < 24; pass += 1) {
    const xml = pass === 0 && initialXml ? initialXml : await androidStableDump(serial);
    const node = maybeFindUiNode(xml, testId);
    if (node && hasMinimumVisibleBounds(node)) return { node, xml, pass };
    const gesture = androidVerticalScrollGesture(xml, viewport);
    await adb(serial, [
      "shell",
      "input",
      "swipe",
      String(gesture.fromX),
      String(gesture.fromY),
      String(gesture.toX),
      String(gesture.toY),
      "420",
    ]);
    await delay(220);
  }
  throw new Error(`native_design_control_not_reachable_from_root:${testId}`);
}

function stableControlIdForNode(node, stableControlIds) {
  const resource = node["resource-id"] ?? "";
  const description = node["content-desc"] ?? "";
  return stableControlIds.find((controlId) =>
    resource === controlId
    || resource.endsWith(`/${controlId}`)
    || description === controlId
    || description.startsWith(`${controlId}:`)) ?? null;
}

export function classifyPageControlScope(controlId, expectedControlIds, allowedExternalControlIds) {
  if (expectedControlIds.includes(controlId)) return "owned";
  if (allowedExternalControlIds.includes(controlId)) return "allowed-external";
  return "scope-escape";
}

function validatePageControlLayerOrder(controlComposition, observed) {
  const expectedControlIds = controlComposition.map((entry) => entry.stableControlId);
  const fixedControlIds = controlComposition
    .filter((entry) => /\bfixed\b/iu.test(entry.layer))
    .map((entry) => entry.stableControlId);
  const fixed = new Set(fixedControlIds);
  const expectedContent = expectedControlIds.filter((controlId) => !fixed.has(controlId));
  const observedFixed = observed.filter((controlId) => fixed.has(controlId));
  const observedContent = observed.filter((controlId) => !fixed.has(controlId));
  if (JSON.stringify(observedFixed) !== JSON.stringify(fixedControlIds)
    || JSON.stringify(observedContent) !== JSON.stringify(expectedContent)) {
    throw new Error(`native_page_control_order_mismatch:${observed.join(",")}`);
  }
  return expectedControlIds;
}

async function collectAndroidPageControlOrder(
  serial,
  viewport,
  controlComposition,
  allControlIds,
  allowedExternalControlIds,
  diagnostic,
  initialXml = null,
) {
  const expectedControlIds = controlComposition.map((entry) => entry.stableControlId);
  const fixedControlIds = controlComposition
    .filter((entry) => /\bfixed\b/iu.test(entry.layer))
    .map((entry) => entry.stableControlId);
  const observed = [];
  const seen = new Set();
  const expected = new Set(expectedControlIds);
  const diagnostics = [];
  let previousXmlHash = null;
  if (fixedControlIds.length) {
    await androidWaitForNodes(serial, fixedControlIds, androidUiEvidenceTimeoutMs);
  }
  for (let pass = 0; pass < 24 && seen.size < expected.size; pass += 1) {
    const xml = pass === 0 && initialXml ? initialXml : await androidStableDump(serial);
    for (const controlId of fixedControlIds) {
      const node = maybeFindUiNode(xml, controlId);
      if (!node || !hasMinimumVisibleBounds(node)) {
        throw new Error(`native_page_fixed_control_not_persistent:${controlId}`);
      }
    }
    for (const match of xml.matchAll(/<node\b[^>]*>/gu)) {
      const controlId = stableControlIdForNode(xmlAttributes(match[0]), allControlIds);
      if (!controlId || seen.has(controlId)) continue;
      const scope = classifyPageControlScope(
        controlId,
        expectedControlIds,
        allowedExternalControlIds,
      );
      if (scope === "allowed-external") continue;
      if (scope === "scope-escape") {
        if (!diagnostic) throw new Error(`native_page_scope_escape_control:${controlId}`);
        diagnostics.push(`native_page_scope_escape_control:${controlId}`);
        continue;
      }
      seen.add(controlId);
      observed.push(controlId);
    }
    if (seen.size === expected.size) break;
    const currentXmlHash = hash(xml);
    if (currentXmlHash === previousXmlHash) break;
    previousXmlHash = currentXmlHash;
    const gesture = androidVerticalScrollGesture(xml, viewport);
    await adb(serial, [
      "shell",
      "input",
      "swipe",
      String(gesture.fromX),
      String(gesture.fromY),
      String(gesture.toX),
      String(gesture.toY),
      "420",
    ]);
    await delay(220);
  }
  const missing = expectedControlIds.filter((controlId) => !seen.has(controlId));
  if (missing.length) {
    const failure = `native_page_control_order_population_missing:${missing.join(",")}`;
    if (!diagnostic) throw new Error(failure);
    diagnostics.push(failure);
  }
  try {
    validatePageControlLayerOrder(controlComposition, observed);
  } catch (error) {
    if (!diagnostic) throw error;
    diagnostics.push(stableFailureCode(error));
  }
  return {
    diagnostics: [...new Set(diagnostics)],
    expectedControlOrder: expectedControlIds,
    observedControlOrder: observed,
  };
}

function controlInteractionKind(control) {
  const trigger = control?.interactionStateMachine?.trigger ?? "";
  const gesture = control?.motion?.gestureFollow === true
    || /拖|滑|平移|缩放|捏合|旋转|scrub|drag|pan|pinch|swipe/iu.test(trigger);
  return gesture ? "direct_manipulation" : "press";
}

async function exerciseAndroidControl(serial, node, kind) {
  const bounds = parseNodeBounds(node);
  const centerX = Math.round((bounds.left + bounds.right) / 2);
  const centerY = Math.round((bounds.top + bounds.bottom) / 2);
  const beforePng = await androidScreenshot(serial);
  await adb(serial, ["shell", "input", "motionevent", "DOWN", String(centerX), String(centerY)]);
  await delay(120);
  const pressedPng = await androidScreenshot(serial);
  await adb(serial, ["shell", "input", "motionevent", "UP", String(centerX), String(centerY)]);
  if (kind === "direct_manipulation") {
    const startX = Math.round(bounds.left + bounds.width * 0.25);
    const endX = Math.round(bounds.left + bounds.width * 0.75);
    await adb(serial, ["shell", "input", "swipe", String(startX), String(centerY), String(endX), String(centerY), "620"]);
    await delay(80);
    await adb(serial, ["shell", "input", "swipe", String(endX), String(centerY), String(startX), String(centerY), "260"]);
  } else {
    await adb(serial, ["shell", "input", "tap", String(centerX), String(centerY)]);
  }
  await delay(180);
  const actionPng = await androidScreenshot(serial);
  const actionXml = await androidStableDump(serial);
  await delay(650);
  const settledPng = await androidScreenshot(serial);
  return { actionPng, actionXml, beforePng, bounds, kind, pressedPng, settledPng };
}

function parseAndroidSetting(value) {
  const normalized = String(value ?? "").trim();
  return normalized && normalized !== "null" ? normalized : null;
}

async function readAndroidDisplayState(serial) {
  const [size, density, fontScale, animator, transition, windowAnimation, autoRotation, rotation, power] = await Promise.all([
    adb(serial, ["shell", "wm", "size"]),
    adb(serial, ["shell", "wm", "density"]),
    adb(serial, ["shell", "settings", "get", "system", "font_scale"]),
    adb(serial, ["shell", "settings", "get", "global", "animator_duration_scale"]),
    adb(serial, ["shell", "settings", "get", "global", "transition_animation_scale"]),
    adb(serial, ["shell", "settings", "get", "global", "window_animation_scale"]),
    adb(serial, ["shell", "settings", "get", "system", "accelerometer_rotation"]),
    adb(serial, ["shell", "settings", "get", "system", "user_rotation"]),
    adb(serial, ["shell", "cmd", "power", "get-mode"], { allowFailure: true }),
  ]);
  const sizeOverride = /Override size:\s*(\d+x\d+)/iu.exec(size.stdout)?.[1] ?? null;
  const densityOverride = /Override density:\s*(\d+)/iu.exec(density.stdout)?.[1] ?? null;
  return {
    animator: parseAndroidSetting(animator.stdout),
    autoRotation: parseAndroidSetting(autoRotation.stdout),
    densityOverride,
    fontScale: parseAndroidSetting(fontScale.stdout),
    powerMode: /1/u.test(power.stdout) ? "1" : "0",
    rotation: parseAndroidSetting(rotation.stdout),
    sizeOverride,
    transition: parseAndroidSetting(transition.stdout),
    windowAnimation: parseAndroidSetting(windowAnimation.stdout),
  };
}

async function restoreAndroidSetting(serial, namespace, key, value) {
  if (value === null) await adb(serial, ["shell", "settings", "delete", namespace, key], { allowFailure: true });
  else await adb(serial, ["shell", "settings", "put", namespace, key, value], { allowFailure: true });
}

async function restoreAndroidDisplayState(serial, state) {
  await adb(serial, ["shell", "wm", "size", state.sizeOverride ?? "reset"], { allowFailure: true });
  await adb(serial, ["shell", "wm", "density", state.densityOverride ?? "reset"], { allowFailure: true });
  await restoreAndroidSetting(serial, "system", "font_scale", state.fontScale);
  await restoreAndroidSetting(serial, "global", "animator_duration_scale", state.animator);
  await restoreAndroidSetting(serial, "global", "transition_animation_scale", state.transition);
  await restoreAndroidSetting(serial, "global", "window_animation_scale", state.windowAnimation);
  await restoreAndroidSetting(serial, "system", "accelerometer_rotation", state.autoRotation);
  await restoreAndroidSetting(serial, "system", "user_rotation", state.rotation);
  await adb(serial, ["shell", "cmd", "power", "set-mode", state.powerMode], { allowFailure: true });
}

function androidNaturalViewport(width, height) {
  return width > height
    ? { height: width, rotation: "1", width: height }
    : { height, rotation: "0", width };
}

async function configureAndroidDesignCondition(serial, condition) {
  const width = Number(condition?.viewport?.width);
  const height = Number(condition?.viewport?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 320) {
    throw new Error(`native_design_viewport_invalid:${condition?.key ?? "unknown"}`);
  }
  const natural = androidNaturalViewport(width, height);
  await adb(serial, ["shell", "wm", "size", `${natural.width}x${natural.height}`]);
  await adb(serial, ["shell", "wm", "density", "160"]);
  await restoreAndroidSetting(serial, "system", "font_scale", "1.0");
  const scale = condition.motion === "reduced" ? "0" : "1";
  await restoreAndroidSetting(serial, "global", "animator_duration_scale", scale);
  await restoreAndroidSetting(serial, "global", "transition_animation_scale", scale);
  await restoreAndroidSetting(serial, "global", "window_animation_scale", scale);
  await restoreAndroidSetting(serial, "system", "accelerometer_rotation", "0");
  await restoreAndroidSetting(serial, "system", "user_rotation", natural.rotation);
  await adb(serial, ["shell", "cmd", "power", "set-mode", "0"], { allowFailure: true });
  await delay(500);
  const applied = pngDimensions(await androidScreenshot(serial));
  if (applied.width !== width || applied.height !== height) {
    throw new Error(
      `native_design_viewport_not_applied:${condition?.key ?? "unknown"}:${width}x${height}:${applied.width}x${applied.height}`,
    );
  }
}

function validatePrimaryNavigationState(destination, value) {
  const state = parseStructuredEvidenceValue(value, "starward-tab-restoration-state-v1");
  if (state.tab_id !== destination.tab_id
    || state.root_route !== destination.route
    || state.active_route !== destination.nested_route
    || state.nested_route !== destination.nested_route
    || state.owner_type !== destination.owner_type
    || state.stack_depth < 2
    || state.production_route !== true
    || state.shared_root_scroll_owner !== false
    || !state.owner_id
    || !state.screen_instance_id
    || !state.owner_state_sha256
    || !Number.isInteger(state.owner_state_revision)
    || state.owner_state_revision < 1) {
    throw new Error(`primary_navigation_state_invalid:${destination.tab_id}`);
  }
  return state;
}

async function verifyPrimaryNavigation(serial, appId) {
  const destinations = contracts.primary_navigation;
  if (!Array.isArray(destinations) || destinations.length !== 5
    || destinations.some((destination) => !destination.nested_ready_test_id)
    || JSON.stringify(destinations.map((entry) => entry.route)) !== JSON.stringify([
      "/tonight",
      "/map",
      "/trips",
      "/sky",
      "/me",
    ])) {
    throw new Error("primary_navigation_contract_invalid");
  }
  const states = new Map();
  const screenshots = new Map();
  for (const destination of destinations) {
    await tapAndroidNode(serial, destination.tab_id);
    await androidWaitForNodes(serial, [destination.root_screen_test_id], androidUiEvidenceTimeoutMs);
    await tapAndroidNode(serial, destination.nested_action_test_id);
    await androidWaitForNodes(
      serial,
      [destination.nested_screen_test_id, destination.nested_ready_test_id],
      androidUiEvidenceTimeoutMs,
    );
    await adb(serial, ["shell", "input", "swipe", ...destination.gesture.map(String)]);
    await delay(350);
    const ready = await androidWaitForNodes(
      serial,
      [destination.nested_screen_test_id, destination.nested_ready_test_id, destination.state_test_id],
      androidUiEvidenceTimeoutMs,
    );
    states.set(
      destination.tab_id,
      validatePrimaryNavigationState(
        destination,
        semanticNodeValue(ready.nodes[destination.state_test_id], destination.state_test_id),
      ),
    );
    screenshots.set(destination.tab_id, await androidScreenshot(serial));
  }
  for (const destination of destinations) {
    await tapAndroidNode(serial, destination.tab_id);
    const ready = await androidWaitForNodes(
      serial,
      [destination.nested_screen_test_id, destination.nested_ready_test_id, destination.state_test_id],
      androidUiEvidenceTimeoutMs,
    );
    await delay(350);
    const restoredState = validatePrimaryNavigationState(
      destination,
      semanticNodeValue(ready.nodes[destination.state_test_id], destination.state_test_id),
    );
    const initialState = states.get(destination.tab_id);
    if (!initialState
      || restoredState.owner_id !== initialState.owner_id
      || restoredState.screen_instance_id !== initialState.screen_instance_id
      || restoredState.owner_state_sha256 !== initialState.owner_state_sha256
      || restoredState.owner_state_revision !== initialState.owner_state_revision) {
      throw new Error(`primary_navigation_owner_state_not_restored:${destination.tab_id}`);
    }
    const restored = await androidScreenshot(serial);
    if (normalizedPngDifference(screenshots.get(destination.tab_id), restored) > nativeExactVisualThreshold) {
      throw new Error(`primary_navigation_state_not_restored:${destination.tab_id}`);
    }
    await adb(serial, ["shell", "input", "keyevent", "KEYCODE_BACK"]);
    await androidWaitForNodes(serial, [destination.root_screen_test_id], androidUiEvidenceTimeoutMs);
  }
  const ownerIds = [...states.values()].map((state) => state.owner_id);
  const instanceIds = [...states.values()].map((state) => state.screen_instance_id);
  if (new Set(ownerIds).size !== 5 || new Set(instanceIds).size !== 5) {
    throw new Error("primary_navigation_independent_owner_identity_missing");
  }
  for (const destination of destinations) {
    await adb(serial, ["shell", "am", "force-stop", appId]);
    await androidOpenRoute(serial, appId, destination.nested_route);
    const ready = await androidWaitForNodes(
      serial,
      [destination.nested_screen_test_id, destination.nested_ready_test_id, destination.state_test_id],
      androidUiEvidenceTimeoutMs,
    );
    validatePrimaryNavigationState(
      destination,
      semanticNodeValue(ready.nodes[destination.state_test_id], destination.state_test_id),
    );
    await adb(serial, ["shell", "input", "keyevent", "KEYCODE_BACK"]);
    await androidWaitForNodes(serial, [destination.root_screen_test_id], androidUiEvidenceTimeoutMs);
  }
}

function semanticNodeValue(attributes, testId) {
  const raw = String(attributes?.text || attributes?.["content-desc"] || "").trim();
  const value = raw.startsWith(`${testId}:`) ? raw.slice(testId.length + 1).trim() : raw;
  if (!value || value === testId) throw new Error(`native_semantic_value_missing:${testId}`);
  return value;
}

function parseGfxinfoFrameDurations(output) {
  const durations = [];
  let columns = null;
  let inProfile = false;
  for (const rawLine of String(output ?? "").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "---PROFILEDATA---") {
      inProfile = !inProfile;
      columns = null;
      continue;
    }
    if (!inProfile || !line) continue;
    if (line.startsWith("Flags,")) {
      columns = line.split(",");
      continue;
    }
    if (!columns || !/^\d+(?:,\d+)+$/u.test(line)) continue;
    const values = line.split(",").map(Number);
    const flagsIndex = columns.indexOf("Flags");
    const intendedIndex = columns.indexOf("IntendedVsync");
    const completedIndex = columns.indexOf("FrameCompleted");
    if (intendedIndex < 0 || completedIndex < 0 || values.some((value) => !Number.isFinite(value))) continue;
    if (flagsIndex >= 0 && values[flagsIndex] !== 0) continue;
    const durationMs = (values[completedIndex] - values[intendedIndex]) / 1_000_000;
    if (durationMs > 0 && durationMs < 10_000) durations.push(durationMs);
  }
  return durations;
}

function percentile(values, ratio) {
  if (!values.length) throw new Error("native_performance_frames_missing");
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

async function verifyAllRootJourneys(serial, appId) {
  const journeys = [];
  for (const [outcome, definition] of Object.entries(contracts.outcomes)) {
    if (!definition.screen_test_id || !definition.root_journey?.length
      || !definition.action_test_id || !definition.evidence_test_ids?.length) {
      throw new Error(`native_complete_root_journey_contract_missing:${outcome}`);
    }
    await startAndroidProductionJourney(serial, appId, definition);
    const before = await androidScreenshot(serial);
    await tapAndroidNode(serial, definition.action_test_id);
    const ready = await androidWaitForNodes(serial, definition.evidence_test_ids, androidUiEvidenceTimeoutMs);
    const after = await androidScreenshot(serial);
    if (normalizedPngDifference(before, after) < nativeVisibleMotionThreshold) {
      throw new Error(`native_root_journey_result_unobserved:${outcome}`);
    }
    const evidence = Object.fromEntries(definition.evidence_test_ids.map((testId) => [
      testId,
      hash(semanticNodeValue(ready.nodes[testId], testId)),
    ]));
    journeys.push({
      outcome,
      action_test_id: definition.action_test_id,
      evidence_hash: hash(evidence),
      result_render_sha256: hash(after),
      root_journey: [...definition.root_journey],
      screen_test_id: definition.screen_test_id,
    });
  }
  if (journeys.length !== Object.keys(contracts.outcomes).length) {
    throw new Error("native_complete_root_journey_population_mismatch");
  }
  return journeys;
}

async function verifySharedDecisionContext(serial, appId) {
  const testIds = contracts.shared_context_test_ids;
  const journeys = contracts.shared_context_journeys;
  if (!Array.isArray(testIds) || testIds.length !== 3 || !Array.isArray(journeys) || journeys.length !== 6) {
    throw new Error("native_shared_context_contract_incomplete");
  }
  const observed = [];
  for (const journey of journeys) {
    await startAndroidProductionJourney(serial, appId, journey);
    if (journey.ready_test_id) await androidWaitForNodes(serial, [journey.ready_test_id], androidUiEvidenceTimeoutMs);
    const ready = await androidWaitForNodes(serial, testIds, androidUiEvidenceTimeoutMs);
    const values = Object.fromEntries(testIds.map((testId) => [
      testId,
      semanticNodeValue(ready.nodes[testId], testId),
    ]));
    observed.push({
      surface_ref: journey.surface_ref,
      state_hash: hash(values),
      values,
    });
  }
  const expected = observed[0]?.state_hash;
  if (!expected || observed.some((entry) => entry.state_hash !== expected)) {
    throw new Error("native_shared_decision_context_mismatch");
  }
  return observed.map((entry) => ({
    surface_ref: entry.surface_ref,
    state_hash: entry.state_hash,
  }));
}

function nativeTestIdKey(value, errorCode) {
  const key = String(value).normalize("NFKC").toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  if (!key) throw new Error(errorCode);
  return key;
}

function nativeScenarioTestId(scenarioId, role) {
  const key = nativeTestIdKey(scenarioId, "native_acceptance_scenario_id_invalid");
  return `acceptance-${key}-${role}`;
}

export function nativeDesignContextTestId(sampleId) {
  return `design-context-${nativeTestIdKey(sampleId, "native_design_context_id_invalid")}-ready`;
}

function nativeScenarioEvidenceKey(entry) {
  return [
    entry.condition_key,
    entry.mode,
    entry.control_id,
    entry.scenario_id,
  ].join("\u001f");
}

function nativeExpectedScenarioPopulation(controlIds, contract, conditions, modes = nativeDesignModes) {
  const keys = [];
  for (const condition of conditions) {
    for (const mode of modes) {
      for (const controlId of controlIds) {
        const scenarios = contract.controls?.[controlId]?.acceptanceScenarios;
        if (!Array.isArray(scenarios) || ![2, 4].includes(scenarios.length)) {
          throw new Error(`native_control_acceptance_scenarios_incomplete:${controlId}`);
        }
        for (const scenario of scenarios) {
          keys.push(nativeScenarioEvidenceKey({
            condition_key: condition.key,
            control_id: controlId,
            mode,
            scenario_id: scenario.id,
          }));
        }
      }
    }
  }
  if (new Set(keys).size !== keys.length) throw new Error("native_acceptance_scenario_identity_duplicate");
  return keys;
}

function nativeStateTestId(controlId, stateKey) {
  const key = nativeTestIdKey(
    `${controlId}-${stateKey}`,
    "native_design_state_id_invalid",
  );
  return `design-state-${key}-result`;
}

function nativeStateContextTestId(controlId, stateKey) {
  const key = nativeTestIdKey(
    `${controlId}-${stateKey}`,
    "native_design_state_context_id_invalid",
  );
  return `design-state-context-${key}-ready`;
}

function assertAndroidDesignStateContext(node, testId, designEvidence, stateKey) {
  const trace = parseStructuredEvidenceValue(
    node["content-desc"] || semanticNodeValue(node, testId),
    "starward-design-state-context-ready-v1",
  );
  const expected = {
    condition_key: designEvidence.condition_key,
    control_id: designEvidence.control_id,
    mode: designEvidence.mode,
    outcome: designEvidence.outcome,
    sample_id: designEvidence.sample_id,
    session_id: designEvidence.session_id,
    state: stateKey,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (trace[key] !== value) {
      throw new Error(`native_design_state_context_attribution_mismatch:${key}`);
    }
  }
}

async function exerciseNativeControlStates(
  serial,
  appId,
  controlId,
  contract,
  designEvidence,
) {
  const observed = [];
  let defaultCrop = null;
  let defaultNode = null;
  const states = applicableControlStates("mobile", contract).sort(([left], [right]) => {
    if (left === "default") return -1;
    if (right === "default") return 1;
    return left.localeCompare(right);
  });
  for (const [stateKey] of states) {
    const resultId = nativeStateTestId(controlId, stateKey);
    await adb(serial, [
      "shell",
      "am",
      "broadcast",
      "-a",
      `${appId}.DESIGN_STATE`,
      "-p",
      appId,
      "--es",
      "controlId",
      controlId,
      "--es",
      "state",
      stateKey,
    ]);
    const stateContextId = nativeStateContextTestId(controlId, stateKey);
    const ready = await androidWaitForNodes(
      serial,
      [controlId, stateContextId],
      androidUiEvidenceTimeoutMs,
    );
    assertAndroidDesignStateContext(
      ready.nodes[stateContextId],
      stateContextId,
      designEvidence,
      stateKey,
    );
    const resultNode = maybeFindUiNode(ready.xml, resultId);
    if (!resultNode) throw new Error(`native_design_state_carrier_missing:${resultId}`);
    const screenshot = await androidScreenshot(serial);
    const currentNode = ready.nodes[controlId];
    const currentCrop = cropPng(screenshot, parseNodeBounds(currentNode));
    const traceValue = semanticNodeValue(resultNode, resultId);
    const trace = parseStructuredEvidenceValue(traceValue, "starward-design-state-trace-v1");
    const directObservation = {
      production_root: true,
      semantic_present: Boolean(semanticNodeValue(currentNode, controlId)),
      visual_present: currentCrop.length > 1_024,
      semantic_changed: stateKey === "default" ? false : hash(currentNode) !== hash(defaultNode),
      semantic_stable: stateKey === "default" ? true : hash(currentNode) === hash(defaultNode),
      visual_changed: stateKey === "default"
        ? false
        : normalizedPngDifference(defaultCrop, currentCrop) >= nativeVisibleMotionThreshold,
      visual_stable: stateKey === "default"
        ? true
        : normalizedPngDifference(defaultCrop, currentCrop) < nativeVisibleMotionThreshold,
    };
    assertStateTrace({
      control: contract,
      controlId,
      observed: directObservation,
      profile: "mobile",
      stateKey,
      trace,
    });
    if (stateKey === "default") {
      defaultCrop = currentCrop;
      defaultNode = currentNode;
    } else {
      if (!defaultCrop || !defaultNode) throw new Error(`native_design_default_state_missing:${controlId}`);
    }
    observed.push({
      result_sha256: hash(traceValue),
      state: stateKey,
      trace_sha256: hash(trace),
    });
  }
  await adb(serial, [
    "shell",
    "am",
    "broadcast",
    "-a",
    `${appId}.DESIGN_STATE`,
    "-p",
    appId,
    "--es",
    "controlId",
    controlId,
    "--es",
    "state",
    "default",
  ]);
  const recoveredStateContextId = nativeStateContextTestId(controlId, "default");
  const recovered = await androidWaitForNodes(
    serial,
    [controlId, recoveredStateContextId],
    androidUiEvidenceTimeoutMs,
  );
  assertAndroidDesignStateContext(
    recovered.nodes[recoveredStateContextId],
    recoveredStateContextId,
    designEvidence,
    "default",
  );
  const recoveredResultId = nativeStateTestId(controlId, "default");
  if (!maybeFindUiNode(recovered.xml, recoveredResultId)) {
    throw new Error(`native_design_state_carrier_missing:${recoveredResultId}`);
  }
  const recoveredPng = await androidScreenshot(serial);
  const recoveredNode = recovered.nodes[controlId];
  const recoveredCrop = cropPng(recoveredPng, parseNodeBounds(recoveredNode));
  if (!defaultCrop || !defaultNode
    || normalizedPngDifference(defaultCrop, recoveredCrop) > nativeSettledMotionThreshold
    || hash(defaultNode) !== hash(recoveredNode)) {
    throw new Error(`native_design_state_exit_recovery_mismatch:${controlId}`);
  }
  if (observed.length !== states.length) {
    throw new Error(`native_design_state_population_mismatch:${controlId}`);
  }
  return {
    evidence: observed,
    recovered: {
      node: recoveredNode,
      xml: recovered.xml,
    },
  };
}

async function exerciseNativeAcceptanceScenario(
  serial,
  condition,
  mode,
  controlId,
  scenario,
  surface,
) {
  const contract = mobileControlContract.controls[controlId];
  if (!contract) throw new Error(`native_control_contract_missing:${controlId}`);
  const controlBefore = await findAndroidNodeByScrolling(
    serial,
    controlId,
    condition.viewport,
    surface.xml,
  );
  const actionId = nativeScenarioTestId(scenario.id, "action");
  const resultId = nativeScenarioTestId(scenario.id, "result");
  const actionNode = maybeFindUiNode(controlBefore.xml, actionId);
  if (!actionNode || !hasMinimumVisibleBounds(actionNode)) {
    throw new Error(`native_acceptance_scenario_carrier_missing:${actionId}`);
  }
  validateAndroidControlSemantics(new Map([[actionId, actionNode]]));
  const before = await androidScreenshot(serial);
  const [actionX, actionY] = nodeCenter(actionNode);
  await adb(serial, ["shell", "input", "tap", String(actionX), String(actionY)]);
  const result = await androidWaitForNodes(serial, [resultId], androidUiEvidenceTimeoutMs);
  const after = await androidScreenshot(serial);
  if (normalizedPngDifference(before, after) < nativeVisibleMotionThreshold) {
    throw new Error(`native_acceptance_scenario_state_unobserved:${scenario.id}`);
  }
  const resultValue = semanticNodeValue(result.nodes[resultId], resultId);
  const trace = parseStructuredEvidenceValue(resultValue, "starward-design-scenario-trace-v1");
  const afterControl = maybeFindUiNode(result.xml, controlId);
  assertScenarioTrace({
    control: contract,
    controlId,
    observed: {
      production_root: true,
      semantic_observed: Boolean(afterControl)
        && hash({
          control: controlBefore.node,
          result: maybeFindUiNode(controlBefore.xml, resultId),
        }) !== hash({
          control: afterControl,
          result: result.nodes[resultId],
        }),
      visual_observed: normalizedPngDifference(before, after) >= nativeVisibleMotionThreshold,
    },
    profile: "mobile",
    scenario,
    trace,
  });
  return {
    action_test_id: actionId,
    condition_key: condition.key,
    control_id: controlId,
    mode,
    result_sha256: hash(resultValue),
    scenario_id: scenario.id,
    trace_sha256: hash(trace),
  };
}

function parseAndroidMemoryKb(output) {
  const match = /^MemTotal:\s+(\d+)\s+kB$/imu.exec(String(output ?? ""));
  if (!match) throw new Error("native_device_memory_unreadable");
  return Number(match[1]);
}

function parseAndroidStorageKb(output) {
  const lines = String(output ?? "").trim().split(/\r?\n/u);
  for (const line of lines.slice(1)) {
    const columns = line.trim().split(/\s+/u);
    const total = Number(columns[1]);
    if (Number.isFinite(total) && total > 0) return total;
  }
  throw new Error("native_device_storage_unreadable");
}

function parseAndroidRefreshRate(output) {
  const values = [...String(output ?? "").matchAll(
    /(?:refreshRate|fps|peakRefreshRate|renderFrameRate)[=: ]+(\d+(?:\.\d+)?)/giu,
  )].map((match) => Number(match[1])).filter(Number.isFinite);
  if (!values.length) throw new Error("native_device_refresh_rate_unreadable");
  return Math.max(...values);
}

async function readAndroidPermissionGranted(serial, appId, permission) {
  const result = await adb(serial, ["shell", "dumpsys", "package", appId]);
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`${escaped}: granted=true`, "u").test(result.stdout);
}

async function readAndroidAppOpMode(serial, appId, operation) {
  const result = await adb(serial, ["shell", "cmd", "appops", "get", appId, operation], { allowFailure: true });
  return new RegExp(`${operation}:\\s*(allow|deny|ignore|default|foreground)`, "iu").exec(result.stdout)?.[1]?.toLowerCase()
    ?? "default";
}

async function readAndroidVibratorState(serial) {
  const manager = await adb(serial, ["shell", "dumpsys", "vibrator_manager"], { allowFailure: true });
  const legacy = await adb(serial, ["shell", "dumpsys", "vibrator"], { allowFailure: true });
  const value = `${manager.stdout}\n${manager.stderr}\n${legacy.stdout}\n${legacy.stderr}`.trim();
  if (!value || /Can't find service|not found/iu.test(value)) throw new Error("native_vibrator_evidence_unavailable");
  return value;
}

async function exerciseRepresentativeGesture(serial, node, horizontal) {
  const bounds = parseNodeBounds(node);
  const centerX = Math.round((bounds.left + bounds.right) / 2);
  const centerY = Math.round((bounds.top + bounds.bottom) / 2);
  const lowX = Math.round(bounds.left + bounds.width * 0.25);
  const highX = Math.round(bounds.left + bounds.width * 0.75);
  const lowY = Math.round(bounds.top + bounds.height * 0.25);
  const highY = Math.round(bounds.top + bounds.height * 0.75);
  const before = await androidScreenshot(serial);
  await adb(serial, ["shell", "input", "motionevent", "DOWN", String(centerX), String(centerY)]);
  await adb(serial, ["shell", "input", "motionevent", "MOVE", String(horizontal ? highX : centerX), String(horizontal ? centerY : lowY)]);
  await delay(180);
  const followed = await androidScreenshot(serial);
  await adb(serial, ["shell", "input", "motionevent", "MOVE", String(horizontal ? lowX : centerX), String(horizontal ? centerY : highY)]);
  await adb(serial, ["shell", "input", "motionevent", "UP", String(horizontal ? lowX : centerX), String(horizontal ? centerY : highY)]);
  await delay(80);
  await adb(serial, ["shell", "input", "motionevent", "DOWN", String(horizontal ? lowX : centerX), String(horizontal ? centerY : highY)]);
  await adb(serial, ["shell", "input", "motionevent", "MOVE", String(horizontal ? highX : centerX), String(horizontal ? centerY : lowY)]);
  await adb(serial, ["shell", "input", "motionevent", "UP", String(horizontal ? highX : centerX), String(horizontal ? centerY : lowY)]);
  await delay(500);
  const settled = await androidScreenshot(serial);
  if (normalizedPngDifference(before, followed) < nativeVisibleMotionThreshold) {
    throw new Error("native_representative_gesture_not_tracking");
  }
  if (normalizedPngDifference(followed, settled) < nativeVisibleMotionThreshold) {
    throw new Error("native_representative_gesture_not_interruptible");
  }
  return {
    before_sha256: hash(before),
    followed_sha256: hash(followed),
    settled_sha256: hash(settled),
  };
}

async function verifyRepresentativeAndroidDevice(serial, appId) {
  const definition = contracts.native_device_evidence;
  if (!definition?.representative_control_ids?.length || !definition?.gesture_control_ids?.length) {
    throw new Error("native_device_evidence_contract_missing");
  }
  const [qemu, sdk, model, memory, storage, display, sensors, camera, packageInfo] = await Promise.all([
    adb(serial, ["shell", "getprop", "ro.kernel.qemu"]),
    adb(serial, ["shell", "getprop", "ro.build.version.sdk"]),
    adb(serial, ["shell", "getprop", "ro.product.model"]),
    adb(serial, ["shell", "cat", "/proc/meminfo"]),
    adb(serial, ["shell", "df", "-k", "/data"]),
    adb(serial, ["shell", "dumpsys", "display"]),
    adb(serial, ["shell", "dumpsys", "sensorservice"]),
    adb(serial, ["shell", "dumpsys", "media.camera"]),
    adb(serial, ["shell", "dumpsys", "package", appId]),
  ]);
  if (qemu.stdout.trim() === "1") throw new Error("native_representative_device_is_emulator");
  const sdkLevel = Number(sdk.stdout.trim());
  const memoryKb = parseAndroidMemoryKb(memory.stdout);
  const storageKb = parseAndroidStorageKb(storage.stdout);
  const refreshRate = parseAndroidRefreshRate(display.stdout);
  if (!Number.isInteger(sdkLevel) || sdkLevel < 29) throw new Error("native_representative_device_android_below_10");
  if (memoryKb < 3_500_000) throw new Error("native_representative_device_memory_below_4gb_profile");
  if (storageKb < 58_000_000) throw new Error("native_representative_device_storage_below_64gb_profile");
  if (refreshRate < 59) throw new Error("native_representative_device_refresh_below_60hz");
  for (const capability of ["accelerometer", "gyroscope", "magnet"]) {
    if (!sensors.stdout.toLowerCase().includes(capability)) throw new Error(`native_sensor_capability_missing:${capability}`);
  }
  if (!/(?:camera devices|camera id|device version)/iu.test(camera.stdout)) {
    throw new Error("native_camera_capability_missing");
  }
  const uid = /userId=(\d+)/u.exec(packageInfo.stdout)?.[1];
  if (!uid) throw new Error("native_application_uid_missing");

  const originalHaptic = parseAndroidSetting((await adb(
    serial,
    ["shell", "settings", "get", "system", "haptic_feedback_enabled"],
  )).stdout);
  const originalCameraGranted = await readAndroidPermissionGranted(serial, appId, "android.permission.CAMERA");
  const originalCameraAppOp = await readAndroidAppOpMode(serial, appId, "CAMERA");
  const controlEvidence = [];
  const initialVibrator = await readAndroidVibratorState(serial);
  await adb(serial, ["shell", "settings", "put", "system", "haptic_feedback_enabled", "1"]);
  await adb(serial, ["shell", "dumpsys", "gfxinfo", appId, "reset"], { allowFailure: true });
  try {
    for (const controlId of definition.representative_control_ids) {
      const contract = mobileControlContract.controls[controlId];
      const owner = contract?.identity?.outcome;
      const journey = contracts.outcomes[owner];
      if (!contract || !journey) throw new Error(`native_device_control_owner_missing:${controlId}`);
      await startAndroidProductionJourney(serial, appId, journey);
      const found = await findAndroidNodeByScrolling(serial, controlId, { width: 390, height: 844 });
      validateAndroidControlSemantics(new Map([[controlId, found.node]]));
      let interaction;
      if (controlId === "ar-mode-toggle") {
        interaction = { capability_flow: "camera-denial-and-recovery-below" };
      } else if (definition.gesture_control_ids.includes(controlId)) {
        const horizontal = /marker|timeline|scrubber/iu.test(controlId);
        interaction = await exerciseRepresentativeGesture(serial, found.node, horizontal);
        const alternativeId = `${controlId}-accessible-alternative`;
        const alternative = await androidWaitForNodes(serial, [alternativeId], androidUiEvidenceTimeoutMs);
        validateAndroidControlSemantics(new Map([[alternativeId, alternative.nodes[alternativeId]]]));
      } else {
        const before = await androidScreenshot(serial);
        await tapAndroidNode(serial, controlId);
        await delay(350);
        const after = await androidScreenshot(serial);
        if (normalizedPngDifference(before, after) < nativeVisibleMotionThreshold) {
          throw new Error(`native_device_control_interaction_unobserved:${controlId}`);
        }
        interaction = { before_sha256: hash(before), settled_sha256: hash(after) };
      }
      controlEvidence.push({ control_id: controlId, interaction });
    }

    await startAndroidProductionJourney(serial, appId, contracts.outcomes["sky-orientation-ar"]);
    await tapAndroidNode(serial, "orientation-follow-toggle");
    const orientation = await androidWaitForNodes(serial, definition.orientation_status_test_ids, androidUiEvidenceTimeoutMs);
    const orientationValues = Object.fromEntries(definition.orientation_status_test_ids.map((testId) => [
      testId,
      semanticNodeValue(orientation.nodes[testId], testId),
    ]));
    const activeSensors = (await adb(serial, ["shell", "dumpsys", "sensorservice"])).stdout;
    if (!activeSensors.includes(appId) && !new RegExp(`\\b${uid}\\b`, "u").test(activeSensors)) {
      throw new Error("native_sensor_subscription_not_observed");
    }

    await adb(serial, ["shell", "am", "force-stop", appId]);
    await adb(serial, ["shell", "pm", "grant", appId, "android.permission.CAMERA"]);
    await adb(serial, ["shell", "cmd", "appops", "set", appId, "CAMERA", "deny"]);
    await startAndroidProductionJourney(serial, appId, contracts.outcomes["sky-orientation-ar"]);
    await tapAndroidNode(serial, "ar-mode-toggle");
    const denied = await androidWaitForNodes(serial, definition.ar_denied_test_ids, androidUiEvidenceTimeoutMs);
    const deniedValues = Object.fromEntries(definition.ar_denied_test_ids.map((testId) => [
      testId,
      semanticNodeValue(denied.nodes[testId], testId),
    ]));
    if (!/denied|拒绝|未授权|manual|手动|unavailable|不可用/iu.test(Object.values(deniedValues).join(" "))) {
      throw new Error("native_ar_permission_denial_not_observed");
    }

    await adb(serial, ["shell", "am", "force-stop", appId]);
    await adb(serial, ["shell", "cmd", "appops", "set", appId, "CAMERA", "allow"]);
    await startAndroidProductionJourney(serial, appId, contracts.outcomes["sky-orientation-ar"]);
    await tapAndroidNode(serial, "ar-mode-toggle");
    const available = await androidWaitForNodes(serial, definition.ar_available_test_ids, androidUiEvidenceTimeoutMs);
    const availableValues = Object.fromEntries(definition.ar_available_test_ids.map((testId) => [
      testId,
      semanticNodeValue(available.nodes[testId], testId),
    ]));
    const availableText = Object.values(availableValues).join(" ");
    if (!/granted|authorized|允许|已授权/iu.test(availableText)) {
      throw new Error("native_ar_permission_recovery_not_observed");
    }
    if (!/unsupported|not supported|不支持|降级|manual|手动/iu.test(availableText)) {
      await androidWaitForNodes(serial, ["ar-camera-preview"], androidUiEvidenceTimeoutMs);
      const cameraActive = (await adb(serial, ["shell", "dumpsys", "media.camera"])).stdout;
      if (!cameraActive.includes(appId) && !new RegExp(`\\b${uid}\\b`, "u").test(cameraActive)) {
        throw new Error("native_ar_camera_session_not_observed");
      }
    }

    const finalVibrator = await readAndroidVibratorState(serial);
    if (hash(initialVibrator) === hash(finalVibrator)
      || (!finalVibrator.includes(appId) && !new RegExp(`\\b${uid}\\b`, "u").test(finalVibrator))) {
      throw new Error("native_application_haptic_not_observed");
    }
    const gfxinfo = await adb(serial, ["shell", "dumpsys", "gfxinfo", appId, "framestats"]);
    const frameDurations = parseGfxinfoFrameDurations(gfxinfo.stdout);
    if (frameDurations.length < 30) throw new Error("native_performance_sample_too_small");
    const p50Ms = percentile(frameDurations, 0.5);
    const p95Ms = percentile(frameDurations, 0.95);
    const maximumMs = Math.max(...frameDurations);
    if (p50Ms > 16.8 || p95Ms > 33.4 || maximumMs > 700) {
      throw new Error("native_frame_pacing_requirement_failed");
    }
    return {
      ar_available_state_hash: hash(availableValues),
      ar_denied_state_hash: hash(deniedValues),
      controls: controlEvidence,
      device: {
        android_api: sdkLevel,
        memory_kb: memoryKb,
        model: model.stdout.trim(),
        refresh_rate_hz: refreshRate,
        storage_kb: storageKb,
      },
      frame_pacing: {
        frame_count: frameDurations.length,
        maximum_ms: maximumMs,
        p50_ms: p50Ms,
        p95_ms: p95Ms,
      },
      orientation_state_hash: hash(orientationValues),
    };
  } finally {
    await restoreAndroidSetting(serial, "system", "haptic_feedback_enabled", originalHaptic);
    await adb(serial, ["shell", "am", "force-stop", appId], { allowFailure: true });
    await adb(
      serial,
      ["shell", "cmd", "appops", "set", appId, "CAMERA", originalCameraAppOp],
      { allowFailure: true },
    );
    await adb(
      serial,
      ["shell", "pm", originalCameraGranted ? "grant" : "revoke", appId, "android.permission.CAMERA"],
      { allowFailure: true },
    );
  }
}

async function captureNativeSpecial(callback) {
  try {
    return { diagnostic: null, evidence: await callback(), passed: true };
  } catch (error) {
    return { diagnostic: stableFailureCode(error), evidence: null, passed: false };
  }
}

async function availableAndroidSerials() {
  const output = (await spawnCapture(androidAdbExecutable, ["devices"], { label: "adb-devices" })).stdout;
  return output.split(/\r?\n/u).slice(1)
    .map((line) => line.trim().split(/\s+/u))
    .filter((row) => row[0] && row[1] === "device")
    .map((row) => row[0]);
}

export function selectAndroidSerials(availableSerialsValue, requestedRaw, { allowMultiple = true } = {}) {
  const available = [...new Set(availableSerialsValue)].sort();
  let requested;
  if (requestedRaw === "auto") {
    requested = available.filter((serial) => serial.startsWith("emulator-"));
    if (!requested.length && available.length === 1) requested = [...available];
    if (!allowMultiple) requested = requested.slice(0, 1);
  } else if (requestedRaw) {
    requested = commaOption(requestedRaw);
  } else {
    requested = available.length === 1 ? [...available] : [];
  }
  if (!requested.length) {
    throw new Error(
      allowMultiple
        ? `android_design_serials_required:${available.length}`
        : `exactly_one_android_device_required:${available.length}`,
    );
  }
  const missing = requested.filter((serial) => !available.includes(serial));
  if (missing.length) throw new Error(`requested_android_device_unavailable:${missing.join(",")}`);
  if (!allowMultiple && requested.length !== 1) {
    throw new Error(`exactly_one_android_device_required:${requested.length}`);
  }
  return requested;
}

async function chooseAndroidSerials({ allowMultiple = true } = {}) {
  const available = await availableAndroidSerials();
  const requestedRaw = options?.["android-serials"]
    ?? process.env.STARWARD_ANDROID_SERIALS
    ?? process.env.STARWARD_ANDROID_SERIAL;
  return selectAndroidSerials(available, requestedRaw, { allowMultiple });
}

async function chooseAndroidSerial() {
  return (await chooseAndroidSerials({ allowMultiple: false }))[0];
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

async function ensureAndroidPreflight(gradleEnvironment) {
  if (!androidPreflightPromise) {
    androidPreflightPromise = (async () => {
      await access(path.resolve(repositoryRoot, options["root-entrypoint"]));
      const requireFromRepository = createRequire(path.join(repositoryRoot, "package.json"));
      const typeScriptCli = requireFromRepository.resolve("typescript/bin/tsc");
      process.stderr.write("STARWARD_ANDROID_PREFLIGHT:typecheck\n");
      await spawnCapture(process.execPath, [
        typeScriptCli,
        "--project",
        "apps/mobile/tsconfig.json",
        "--noEmit",
        "--pretty",
        "false",
      ], {
        cwd: repositoryRoot,
        env: gradleEnvironment,
        label: "android-typescript-preflight",
        echo: true,
      });
      process.stderr.write("STARWARD_ANDROID_PREFLIGHT:javascript-root-imports\n");
      await spawnCapture(process.execPath, [
        typeScriptCli,
        ...androidJavaScriptRootTypecheckArguments(options["root-entrypoint"]),
      ], {
        cwd: repositoryRoot,
        env: gradleEnvironment,
        label: "android-javascript-root-preflight",
        echo: true,
      });
    })().catch((error) => {
      androidPreflightPromise = null;
      throw error;
    });
  }
  return androidPreflightPromise;
}

async function prepareAndroidArtifact(androidAbi, gradleEnvironment) {
  if (androidArtifactPromises.has(androidAbi)) return androidArtifactPromises.get(androidAbi);
  const promise = (async () => {
    const androidRoot = path.join(repositoryRoot, "apps/mobile/android");
    const cacheIdentityRoot = await stableRepositoryRoot();
    const gradleWrapper = path.join(androidRoot, process.platform === "win32" ? "gradlew.bat" : "gradlew");
    if (!androidAbis.test(androidAbi)) throw new Error("android_device_abi_unsupported");
    const gradleArguments = androidGradleArguments(androidAbi);
    const requireFromRepository = createRequire(path.join(repositoryRoot, "package.json"));
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
      artifact = await writeAndroidBuildCache(cacheRoot, {
        androidAbi,
        apkSha256,
        inputSha256,
        sourceApkPath,
      });
    }
    return {
      ...artifact,
      androidAbi,
      buildMs: Date.now() - buildStartedAt,
      cacheRoot,
      stagingRoot: androidCmakeStagingRoot(androidAbi, tmpdir(), cacheIdentityRoot),
    };
  })().catch((error) => {
    androidArtifactPromises.delete(androidAbi);
    throw error;
  });
  androidArtifactPromises.set(androidAbi, promise);
  return promise;
}

export function parseAndroidInstalledApkPath(output) {
  const paths = String(output ?? "").split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("package:"))
    .map((line) => line.slice("package:".length));
  const baseApk = paths.find((entry) => entry.endsWith("/base.apk")) ?? null;
  if (!baseApk
    || path.posix.normalize(baseApk) !== baseApk
    || !/^\/data\/app\/[A-Za-z0-9._~+=/-]+\/base\.apk$/u.test(baseApk)) {
    return null;
  }
  return baseApk;
}

export function parseAndroidSha256sum(output) {
  return /^([a-f0-9]{64})\s+\S+$/imu.exec(String(output ?? "").trim())?.[1] ?? null;
}

async function androidInstalledApkSha256(serial, appId) {
  const installed = await adb(serial, ["shell", "pm", "path", appId], { allowFailure: true });
  if (installed.code !== 0) return null;
  const baseApk = parseAndroidInstalledApkPath(installed.stdout);
  if (!baseApk) return null;
  const digest = await adb(serial, ["shell", "sha256sum", baseApk], { allowFailure: true });
  if (digest.code !== 0) return null;
  return parseAndroidSha256sum(digest.stdout);
}

async function installAndroidApp(serial) {
  const androidAbi = (await adb(serial, ["shell", "getprop", "ro.product.cpu.abi"])).stdout.trim();
  if (!androidAbis.test(androidAbi)) throw new Error("android_device_abi_unsupported");
  const javaHome = await resolvedJavaHome();
  const gradleEnvironment = {
    ...process.env,
    ...(javaHome ? { JAVA_HOME: javaHome } : {}),
    NODE_ENV: process.env.NODE_ENV ?? "production",
  };
  await ensureAndroidPreflight(gradleEnvironment);
  const artifact = await prepareAndroidArtifact(androidAbi, gradleEnvironment);
  const installStartedAt = Date.now();
  const installedBefore = await androidInstalledApkSha256(serial, contracts.app_id);
  let installMode = "verified-device-cache-hit";
  if (installedBefore !== artifact.apkSha256) {
    installMode = "installed";
    await adb(serial, ["install", "-r", artifact.apkPath], { label: "android-install-release-apk" });
    const installedAfter = await androidInstalledApkSha256(serial, contracts.app_id);
    if (installedAfter !== artifact.apkSha256) throw new Error("android_release_install_hash_mismatch");
  }
  process.stderr.write(`STARWARD_ANDROID_BUILD:${JSON.stringify({
    abi: androidAbi,
    apk_sha256: artifact.apkSha256,
    build_ms: artifact.buildMs,
    cache_mode: artifact.mode,
    input_sha256: artifact.inputSha256,
    install_mode: installMode,
    install_ms: Date.now() - installStartedAt,
    cache_root: artifact.cacheRoot,
    serial,
    staging_root: artifact.stagingRoot,
  })}\n`);
  return artifact;
}

async function runAndroid(caseDefinition) {
  const serial = await chooseAndroidSerial();
  const appId = contracts.app_id;
  const artifact = await installAndroidApp(serial);
  await adb(serial, ["shell", "am", "force-stop", appId]);
  await adb(serial, ["shell", "am", "start", "-W", "-n", `${appId}/.MainActivity`]);
  await androidWaitForNodes(serial, [androidAppReadyTestId], androidUiEvidenceTimeoutMs);
  if (options.outcome === "mobile-shell-and-preferences" && options["design-handoff"]) {
    await verifyPrimaryNavigation(serial, appId);
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

async function readMobileSourceCorpus() {
  const files = [];
  await collectBuildInputFiles(path.join(repositoryRoot, "apps/mobile/src"), files);
  const sourceFiles = files.filter((file) => /\.(?:[cm]?[jt]sx?)$/iu.test(file));
  const entries = await Promise.all(sourceFiles.map(async (file) => ({
    file: path.relative(repositoryRoot, file).replaceAll("\\", "/"),
    text: await readFile(file, "utf8"),
  })));
  return entries;
}

function iosSharedControlCarrier(controlId, sourceCorpus) {
  const escaped = controlId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const literalTestId = new RegExp(
    `testID\\s*=\\s*(?:["']${escaped}["']|\\{\\s*["']${escaped}["']\\s*\\})`,
    "u",
  );
  const candidates = sourceCorpus.filter((entry) =>
    /\.(?:jsx|tsx)$/iu.test(entry.file)
    && !/(?:^|\/)(?:__tests__|test|tests)(?:\/|$)|\.(?:spec|test)\.[jt]sx?$/iu.test(entry.file)
    && !/(?:design|contract|registry|binding|evidence)[^/]*\.[jt]sx?$/iu.test(entry.file)
    && literalTestId.test(entry.text));
  if (candidates.length !== 1) {
    throw new Error(`ios_semantic_production_control_carrier_ambiguous:${controlId}:${candidates.length}`);
  }
  const carrier = candidates[0];
  const occurrence = carrier.text.search(literalTestId);
  const localSource = carrier.text.slice(Math.max(0, occurrence - 1_200), occurrence + controlId.length + 1_200);
  if (/Platform\.OS\s*===\s*["']android["']|Platform\.select\s*\(\s*\{[^}]*android\s*:/su.test(localSource)
    || /\.android\.[jt]sx?$/iu.test(carrier.file)) {
    throw new Error(`ios_semantic_android_only_control:${controlId}`);
  }
  if (!/<[A-Z][A-Za-z0-9.]*\b|React\.createElement\s*\(/u.test(carrier.text)) {
    throw new Error(`ios_semantic_production_jsx_missing:${controlId}`);
  }
  return carrier.file;
}

async function exportIosProductionBundle(controlIds, carrierFiles) {
  const exportRoot = await mkdtemp(path.join(tmpdir(), "starward-ios-export-"));
  try {
    const requireFromMobile = createRequire(path.join(repositoryRoot, "apps/mobile/package.json"));
    const expoCli = requireFromMobile.resolve("expo/bin/cli");
    await spawnCapture(process.execPath, [
      expoCli,
      "export",
      "--platform",
      "ios",
      "--output-dir",
      exportRoot,
      "--no-bytecode",
      "--source-maps",
      "external",
      "--clear",
    ], {
      cwd: path.join(repositoryRoot, "apps/mobile"),
      env: {
        ...process.env,
        CI: "1",
        EXPO_NO_TELEMETRY: "1",
        NODE_ENV: "production",
      },
      label: "ios-production-bundle",
      echo: true,
    });
    const exportedFiles = [];
    await collectBuildInputFiles(exportRoot, exportedFiles);
    const javascriptFiles = exportedFiles.filter((file) => /\.(?:js|bundle)$/iu.test(file));
    const sourceMapFiles = exportedFiles.filter((file) => /\.map$/iu.test(file));
    if (!javascriptFiles.length || !sourceMapFiles.length) throw new Error("ios_production_bundle_artifacts_missing");
    const javascript = Buffer.concat(await Promise.all(javascriptFiles.map((file) => readFile(file))));
    for (const controlId of controlIds) {
      if (!javascript.includes(Buffer.from(controlId))) {
        throw new Error(`ios_production_bundle_control_missing:${controlId}`);
      }
    }
    if (!javascript.includes(Buffer.from("starward-design-section-witness-v1"))
      || !javascript.includes(Buffer.from("starward-design-profile-section-witness-v1"))) {
      throw new Error("ios_production_bundle_design_binding_missing");
    }
    const mappedSources = new Set();
    for (const file of sourceMapFiles) {
      const sourceMap = JSON.parse(await readFile(file, "utf8"));
      for (const source of sourceMap.sources ?? []) {
        mappedSources.add(String(source).replaceAll("\\", "/"));
      }
    }
    const missingCarriers = carrierFiles.filter((file) => {
      const fromMobile = path.relative(path.join(repositoryRoot, "apps/mobile"), path.join(repositoryRoot, file))
        .replaceAll("\\", "/");
      return ![...mappedSources].some((source) => source.endsWith(fromMobile) || source.endsWith(file));
    });
    if (missingCarriers.length) {
      throw new Error(`ios_production_bundle_carrier_unreachable:${missingCarriers.join(",")}`);
    }
    return {
      bundle_sha256: hash(javascript),
      carrier_files: carrierFiles,
      exported_file_count: exportedFiles.length,
      source_map_count: sourceMapFiles.length,
    };
  } finally {
    await rm(exportRoot, { force: true, recursive: true });
  }
}

async function verifyIosSharedSemantics(controlIds) {
  const [appConfigContent, packageJson, projectFile, podfile, sourceCorpus] = await Promise.all([
    readFile(path.join(repositoryRoot, "apps/mobile/app.json"), "utf8"),
    readFile(path.join(repositoryRoot, "apps/mobile/package.json"), "utf8"),
    readFile(path.join(repositoryRoot, "apps/mobile/ios/app.xcodeproj/project.pbxproj"), "utf8"),
    readFile(path.join(repositoryRoot, "apps/mobile/ios/Podfile"), "utf8"),
    readMobileSourceCorpus(),
  ]);
  const appConfig = JSON.parse(appConfigContent);
  const ios = appConfig?.expo?.ios;
  if (!ios?.bundleIdentifier || !ios?.deploymentTarget || ios.supportsTablet !== false) {
    throw new Error("ios_semantic_app_config_missing");
  }
  if (!/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?app\.starward\.mobile"?;/u.test(projectFile)
    || !podfile.includes("platform :ios")) {
    throw new Error("ios_semantic_native_project_configuration_missing");
  }
  for (const dependency of ["react-native-gesture-handler", "react-native-reanimated", "expo-haptics"]) {
    if (!packageJson.includes(`"${dependency}"`)) throw new Error(`ios_semantic_dependency_missing:${dependency}`);
  }
  const carrierFiles = [...new Set(controlIds.map((controlId) => iosSharedControlCarrier(controlId, sourceCorpus)))].sort();
  const exactBindingSources = sourceCorpus.filter((entry) =>
    entry.text.includes("mobile-controls-v3/implementation-contract.json")
    && entry.text.includes("starward-design-section-witness-v1")
    && entry.text.includes("starward-design-profile-section-witness-v1"));
  if (exactBindingSources.length !== 1 || /\.android\.[jt]sx?$/iu.test(exactBindingSources[0].file)) {
    throw new Error(`ios_semantic_exact_design_binding_invalid:${exactBindingSources.length}`);
  }
  const allControlIds = Object.keys(mobileControlContract.controls).sort();
  const buildSemantic = options.outcome === "mobile-shell-and-preferences"
    ? await exportIosProductionBundle(
      allControlIds,
      [...new Set(allControlIds.map((controlId) => iosSharedControlCarrier(controlId, sourceCorpus)))].sort(),
    )
    : null;
  return {
    build_semantic: buildSemantic,
    bundle_identifier: ios.bundleIdentifier,
    carrier_files: carrierFiles,
    condition_keys: designConditions.filter((condition) => condition.key.startsWith("mobile-ios-semantic-")).map((condition) => condition.key),
    controls: controlIds,
    deployment_target: ios.deploymentTarget,
    exact_binding_source: exactBindingSources[0].file,
    live_runtime_verified: false,
  };
}

async function loadProductionMediaManifest() {
  try {
    const content = await readFile(path.join(repositoryRoot, mobileProductionMediaManifestPath), "utf8");
    const manifest = JSON.parse(content);
    if (manifest?.schema_version !== "starward-production-media-v1" || !Array.isArray(manifest.assets)) {
      throw new Error("native_production_media_manifest_invalid");
    }
    const seen = new Set();
    const assets = [];
    for (const entry of manifest.assets) {
      if (!entry?.stable_control_id || !entry.identifier || !entry.path || !entry.sha256 || seen.has(entry.identifier)) {
        throw new Error("native_production_media_identity_invalid");
      }
      seen.add(entry.identifier);
      if (entry.status !== "production"
        || !entry.license
        || !entry.source
        || !entry.place_id
        || !entry.captured_at
        || !entry.processing_status
        || entry.privacy?.exif_removed !== true
        || /placeholder|unverified|unknown|ai-generated|synthetic/iu.test(`${entry.license} ${entry.source}`)) {
        throw new Error(`native_production_media_provenance_incomplete:${entry.identifier}`);
      }
      const relative = String(entry.path).replaceAll("\\", "/");
      if (path.posix.isAbsolute(relative) || relative.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
        throw new Error(`native_production_media_path_invalid:${entry.identifier}`);
      }
      const absolute = path.resolve(repositoryRoot, ...relative.split("/"));
      if (!absolute.toLowerCase().startsWith(`${repositoryRoot.toLowerCase()}${path.sep}`)) {
        throw new Error(`native_production_media_path_escape:${entry.identifier}`);
      }
      const bytes = await readFile(absolute);
      if (hash(bytes) !== entry.sha256) throw new Error(`native_production_media_digest_mismatch:${entry.identifier}`);
      assets.push({
        identifier: entry.identifier,
        path: relative,
        sha256: entry.sha256,
        stable_control_id: entry.stable_control_id,
      });
    }
    return { assets, manifest_sha256: hash(content) };
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("native_production_media_manifest_missing");
    throw error;
  }
}

async function collectFingerprintFiles(target, files) {
  const targetStat = await stat(target);
  if (targetStat.isFile()) {
    files.push(target);
    return;
  }
  if (!targetStat.isDirectory()) return;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    await collectFingerprintFiles(path.join(target, entry.name), files);
  }
}

async function fingerprintRepositoryPaths(relativePaths) {
  const files = [];
  for (const relativePath of relativePaths) {
    await collectFingerprintFiles(path.resolve(repositoryRoot, relativePath), files);
  }
  const entries = [];
  for (const file of [...new Set(files.map((entry) => path.normalize(entry)))].sort()) {
    entries.push({
      path: path.relative(repositoryRoot, file).replaceAll("\\", "/"),
      sha256: await fileSha256(file),
    });
  }
  return { entries, sha256: hash(entries) };
}

async function androidDeviceIdentity(serial, artifact) {
  const [buildFingerprint, model, sdk] = await Promise.all([
    adb(serial, ["shell", "getprop", "ro.build.fingerprint"]),
    adb(serial, ["shell", "getprop", "ro.product.model"]),
    adb(serial, ["shell", "getprop", "ro.build.version.sdk"]),
  ]);
  return {
    android_abi: artifact.androidAbi,
    apk_sha256: artifact.apkSha256,
    build_fingerprint: buildFingerprint.stdout.trim(),
    input_sha256: artifact.inputSha256,
    model: model.stdout.trim(),
    sdk: sdk.stdout.trim(),
    serial,
  };
}

function memoryCheckpointStore(identity) {
  const fragments = new Map();
  return {
    identitySha256: nativeVerificationFingerprint(identity),
    root: null,
    async keys() {
      return [...fragments.keys()].sort();
    },
    async read(key) {
      return fragments.has(key)
        ? { attribution: fragments.get(key).attribution, value: fragments.get(key).value }
        : null;
    },
    async write(key, value, attribution) {
      fragments.set(key, { attribution, value });
    },
  };
}

async function readNativeCheckpoint(store, key) {
  const fragment = await store.read(key);
  if (fragment) nativeObserverMetrics.checkpoint_hits += 1;
  return fragment?.value ?? null;
}

async function writeNativeCheckpoint(store, key, value, attribution) {
  await store.write(key, value, attribution);
  nativeObserverMetrics.checkpoint_writes += 1;
}

function androidDesignProgress(details) {
  process.stderr.write(`STARWARD_ANDROID_DESIGN_PROGRESS:${JSON.stringify(details)}\n`);
}

async function createAndroidDesignCheckpoint({
  artifactsBySerial,
  designExecutionPlan,
  deviceIdentities,
  diagnostic,
}) {
  const designInputs = await fingerprintRepositoryPaths([
    "DESIGN.md",
    options["design-handoff"],
    "docs/design-targets/mobile-product-pages-v2",
    "docs/design-targets/mobile-controls-v3",
  ]);
  const verifierInputs = await fingerprintRepositoryPaths([
    "tests/acceptance/native/contracts.json",
    "tools/long-task/design-contract-proof.mjs",
    "tools/long-task/native-verification-session.mjs",
    "tools/long-task/verify-native-target.mjs",
  ]);
  const identity = {
    artifacts: [...artifactsBySerial.entries()].map(([serial, artifact]) => ({
      android_abi: artifact.androidAbi,
      apk_sha256: artifact.apkSha256,
      input_sha256: artifact.inputSha256,
      serial,
    })).sort((left, right) => left.serial.localeCompare(right.serial)),
    assertion_key: options["assertion-key"],
    authority_identity: options["authority-identity"] ?? null,
    design_inputs_sha256: designInputs.sha256,
    device_identities: [...deviceIdentities].sort((left, right) => left.serial.localeCompare(right.serial)),
    diagnostic,
    observation: options.observation,
    outcome: options.outcome,
    root_entrypoint: options["root-entrypoint"],
    selection: {
      conditions: designExecutionPlan.conditionKeys,
      controls: designExecutionPlan.controlIds,
      modes: designExecutionPlan.modeKeys,
    },
    target_ref: options["target-ref"],
    verifier_inputs_sha256: verifierInputs.sha256,
  };
  const identitySha256 = nativeVerificationFingerprint(identity);
  const resume = booleanOption(options.resume, false);
  const executionScope = options["execution-scope"] ?? (diagnostic ? "diagnostic" : "stage-candidate");
  const reuse = nativeCheckpointReuseAllowed({ executionScope, resume });
  if (resume && !options["authority-identity"]) {
    throw new Error("native_verification_resume_authority_identity_required");
  }
  if (!diagnostic && !resume) {
    return {
      designInputs,
      identity,
      identitySha256,
      persistent: false,
      store: memoryCheckpointStore(identity),
      verifierInputs,
    };
  }
  const defaultRoot = path.join(
    repositoryRoot,
    "artifacts/verification/native-diagnostics/checkpoints",
    options.outcome,
    resume ? identitySha256 : `${identitySha256}-${Date.now()}-${process.pid}`,
  );
  const checkpointRoot = path.resolve(options["checkpoint-root"] ?? defaultRoot);
  if (checkpointRoot === repositoryRoot) throw new Error("native_verification_checkpoint_root_too_broad");
  const store = new NativeVerificationCheckpointStore({
    identity,
    root: checkpointRoot,
  });
  await store.initialize({ reuse });
  return {
    designInputs,
    identity,
    identitySha256,
    persistent: true,
    store,
    verifierInputs,
  };
}

function nativeFragmentAttribution({ artifact, condition, controlId = null, mode, scenarioId = null, serial }) {
  return {
    apk_sha256: artifact.apkSha256,
    condition_key: condition.key,
    control_id: controlId,
    input_sha256: artifact.inputSha256,
    mode,
    outcome: options.outcome,
    scenario_id: scenarioId,
    serial,
  };
}

async function runAndroidDesignUnit({
  appId,
  artifact,
  assembly,
  caseDefinition,
  checkpoint,
  designSessionId,
  diagnostic,
  serial,
  unit,
}) {
  const { condition, mode } = unit;
  await configureAndroidDesignCondition(serial, condition);
  androidDesignProgress({
    condition: condition.key,
    mode,
    phase: "unit-start",
    serial,
    unit: unit.key,
  });

  let pageEvidence = await readNativeCheckpoint(
    checkpoint.store,
    unit.pageFragmentKey,
  );
  const cachedControlEvidence = new Map(
    await Promise.all(unit.controlFragments.map(async ({ controlId, fragmentKey }) => [
      fragmentKey,
      await readNativeCheckpoint(checkpoint.store, fragmentKey),
    ])),
  );
  const cachedScenarioEvidence = new Map(
    await Promise.all(unit.scenarios.map(async ({ fragmentKey, scenario }) => [
      fragmentKey,
      await readNativeCheckpoint(checkpoint.store, fragmentKey),
    ])),
  );
  const firstMissingControlId =
    unit.controlFragments.find(({ fragmentKey }) => !cachedControlEvidence.get(fragmentKey))?.controlId
    ?? unit.scenarios.find(({ fragmentKey }) => !cachedScenarioEvidence.get(fragmentKey))?.controlId
    ?? unit.controlIds[0];
  const runtimeRequired = !pageEvidence
    || [...cachedControlEvidence.values()].some((value) => !value)
    || [...cachedScenarioEvidence.values()].some((value) => !value);
  let productionSurface = null;
  if (runtimeRequired) {
    if (!firstMissingControlId) {
      throw new Error(`native_design_unit_control_context_missing:${unit.key}`);
    }
    await resetAndroidDesignEvidenceLog(serial, appId);
    productionSurface = await startAndroidProductionJourney(
      serial,
      appId,
      caseDefinition,
      mode,
      {
        condition_key: condition.key,
        control_id: firstMissingControlId,
        mode,
        outcome: options.outcome,
        sample_id: `${condition.key}-${mode}-unit-prelude`,
        session_id: designSessionId,
      },
    );
  }

  if (!pageEvidence) {
    if (!productionSurface) {
      throw new Error(`native_design_unit_production_surface_missing:${unit.key}`);
    }
    const screenPng = await androidScreenshot(serial);
    const pageControlObservation = await collectAndroidPageControlOrder(
      serial,
      condition.viewport,
      assembly.controlComposition,
      Object.keys(mobileControlContract.controls),
      Object.entries(mobileControlContract.controls)
        .filter(([, control]) => control?.identity?.routeScreen === "global")
        .map(([controlId]) => controlId),
      diagnostic,
      productionSurface.xml,
    );
    pageEvidence = {
      conformanceDiagnostics: pageControlObservation.diagnostics,
      controlOrder: pageControlObservation.observedControlOrder,
      expectedControlOrder: pageControlObservation.expectedControlOrder,
      screenBounds: parseNodeBounds(
        productionSurface.nodes[caseDefinition.screen_test_id],
      ),
      screenPng,
      screenXml: productionSurface.xml,
      serial,
    };
    await writeNativeCheckpoint(
      checkpoint.store,
      unit.pageFragmentKey,
      pageEvidence,
      nativeFragmentAttribution({ artifact, condition, mode, serial }),
    );
  }

  const controlsEvidence = new Map();
  for (const { controlId, fragmentKey } of unit.controlFragments) {
    let evidence = cachedControlEvidence.get(fragmentKey);
    if (!evidence) {
      const sampleId = `${condition.key}-${mode}-${controlId}`;
      androidDesignProgress({
        condition: condition.key,
        control_id: controlId,
        mode,
        phase: "control-start",
        sample_id: sampleId,
        serial,
      });
      const designEvidence = {
        condition_key: condition.key,
        control_id: controlId,
        mode,
        outcome: options.outcome,
        sample_id: sampleId,
        session_id: designSessionId,
      };
      await clearAndroidDesignEvidenceLog(serial, appId);
      await activateAndroidDesignEvidenceContext(
        serial,
        appId,
        designEvidence,
      );
      const surface = await resetAndroidProductionSurface(
        serial,
        appId,
        caseDefinition,
      );
      const contract = mobileControlContract.controls[controlId];
      if (!contract) throw new Error(`native_control_contract_missing:${controlId}`);
      const found = await findAndroidNodeByScrolling(
        serial,
        controlId,
        condition.viewport,
        surface.xml,
      );
      validateAndroidControlSemantics(new Map([[controlId, found.node]]));
      const runtimeWitnesses = await readAndroidDesignEvidenceLog(serial);
      const conformanceDiagnostics = [];
      let stateRun;
      try {
        stateRun = await exerciseNativeControlStates(
          serial,
          appId,
          controlId,
          contract,
          designEvidence,
        );
      } catch (error) {
        if (!diagnostic) throw error;
        conformanceDiagnostics.push(stableFailureCode(error));
        stateRun = {
          evidence: [],
          recovered: {
            node: found.node,
            xml: found.xml,
          },
        };
      }
      const interaction = await exerciseAndroidControl(
        serial,
        stateRun.recovered.node,
        controlInteractionKind(contract),
      );
      evidence = {
        ...interaction,
        afterNode: maybeFindUiNode(interaction.actionXml, controlId),
        beforeNode: stateRun.recovered.node,
        beforeXml: stateRun.recovered.xml,
        conformanceDiagnostics,
        controlId,
        runtimeWitnesses,
        sampleId,
        scrollPass: found.pass,
        serial,
        stateEvidence: stateRun.evidence,
        pressedCrop: cropPng(interaction.pressedPng, interaction.bounds),
        actualCrop: cropPng(interaction.beforePng, interaction.bounds),
        actionCrop: cropPng(interaction.actionPng, interaction.bounds),
        settledCrop: cropPng(interaction.settledPng, interaction.bounds),
      };
      await writeNativeCheckpoint(
        checkpoint.store,
        fragmentKey,
        evidence,
        nativeFragmentAttribution({ artifact, condition, controlId, mode, serial }),
      );
      androidDesignProgress({
        condition: condition.key,
        control_id: controlId,
        mode,
        phase: "control-complete",
        sample_id: sampleId,
        serial,
      });
    }
    controlsEvidence.set(controlId, {
      ...evidence,
      contract: mobileControlContract.controls[controlId],
    });
  }

  const scenarioEvidence = [];
  for (const { controlId, fragmentKey, scenario } of unit.scenarios) {
    let evidence = cachedScenarioEvidence.get(fragmentKey);
    if (!evidence) {
      androidDesignProgress({
        condition: condition.key,
        control_id: controlId,
        mode,
        phase: "scenario-start",
        scenario_id: scenario.id,
        serial,
      });
      const designEvidence = {
        condition_key: condition.key,
        control_id: controlId,
        mode,
        outcome: options.outcome,
        sample_id: `${condition.key}-${mode}-${scenario.id}`,
        session_id: designSessionId,
      };
      try {
        await activateAndroidDesignEvidenceContext(
          serial,
          appId,
          designEvidence,
        );
        const surface = await resetAndroidProductionSurface(
          serial,
          appId,
          caseDefinition,
        );
        evidence = {
          ...(await exerciseNativeAcceptanceScenario(
            serial,
            condition,
            mode,
            controlId,
            scenario,
            surface,
          )),
          diagnostic: null,
          passed: true,
        };
      } catch (error) {
        if (!diagnostic) throw error;
        evidence = {
          condition_key: condition.key,
          control_id: controlId,
          diagnostic: stableFailureCode(error),
          mode,
          passed: false,
          scenario_id: scenario.id,
        };
      }
      await writeNativeCheckpoint(
        checkpoint.store,
        fragmentKey,
        evidence,
        nativeFragmentAttribution({
          artifact,
          condition,
          controlId,
          mode,
          scenarioId: scenario.id,
          serial,
        }),
      );
      androidDesignProgress({
        condition: condition.key,
        control_id: controlId,
        mode,
        phase: "scenario-complete",
        scenario_id: scenario.id,
        serial,
      });
    }
    scenarioEvidence.push(evidence);
  }

  androidDesignProgress({
    condition: condition.key,
    mode,
    phase: "unit-complete",
    serial,
    unit: unit.key,
  });
  return {
    conditionRun: {
      condition,
      conformanceDiagnostics: pageEvidence.conformanceDiagnostics ?? [],
      controlOrder: pageEvidence.controlOrder,
      controls: controlsEvidence,
      expectedControlOrder: pageEvidence.expectedControlOrder ?? pageEvidence.controlOrder,
      mode,
      screenPng: pageEvidence.screenPng,
      screenBounds: pageEvidence.screenBounds,
      screenXml: pageEvidence.screenXml,
      serial: pageEvidence.serial,
      viewport: {
        height: Number(condition.viewport.height),
        width: Number(condition.viewport.width),
      },
    },
    scenarioEvidence,
    unitIndex: unit.index,
  };
}

async function runAndroidDesign(caseDefinition) {
  const diagnostic = booleanOption(options.diagnostic, false);
  const appId = contracts.app_id;
  const androidConditions = designConditions.filter((condition) => condition.key.startsWith("mobile-android-"));
  const expectedConditionKeys = new Set(designPlan.flatMap((entry) => entry.target?.condition_refs ?? []));
  const availableConditionKeys = new Set(designConditions.map((condition) => condition.key));
  const missingConditions = [...expectedConditionKeys].filter((key) => !availableConditionKeys.has(key));
  if (missingConditions.length) throw new Error(`native_design_conditions_missing:${missingConditions.join(",")}`);
  if (!androidConditions.length) throw new Error("native_android_design_conditions_missing");

  const designExecutionPlan = createNativeDesignPlan({
    conditions: androidConditions,
    contract: mobileControlContract,
    controlIds: designControlIds,
    diagnostic,
    selection: {
      conditions: commaOption(options.condition),
      controls: commaOption(options.control),
      modes: commaOption(options.mode),
    },
  });
  const assembly = mobileControlContract.pageAssemblyContracts.find(
    (entry) => entry.outcome === options.outcome,
  );
  if (!assembly) throw new Error(`native_page_assembly_contract_missing:${options.outcome}`);
  const expectedControlOrder = assembly.controlComposition.map((entry) => entry.stableControlId);
  const foreignSelectedControls = designExecutionPlan.controlIds.filter(
    (controlId) => !expectedControlOrder.includes(controlId),
  );
  if (foreignSelectedControls.length) {
    throw new Error(`native_page_assembly_scope_escape:${foreignSelectedControls.join(",")}`);
  }
  if (!diagnostic
    && JSON.stringify([...designControlIds].sort()) !== JSON.stringify([...expectedControlOrder].sort())) {
    throw new Error(`native_page_assembly_control_population_mismatch:${options.outcome}`);
  }

  const serials = await chooseAndroidSerials();
  const maxWorkers = Number(options["max-workers"] ?? process.env.STARWARD_ANDROID_MAX_WORKERS ?? 1);
  const shards = partitionNativeDesignUnits(designExecutionPlan.units, serials, maxWorkers);
  const activeSerials = shards.map((shard) => shard.serial);
  const artifactsBySerial = new Map(await Promise.all(activeSerials.map(async (serial) => [
    serial,
    await installAndroidApp(serial),
  ])));
  const deviceIdentities = await Promise.all(
    activeSerials.map((serial) => androidDeviceIdentity(serial, artifactsBySerial.get(serial))),
  );
  const checkpoint = await createAndroidDesignCheckpoint({
    artifactsBySerial,
    designExecutionPlan,
    deviceIdentities,
    diagnostic,
  });
  const firstArtifact = artifactsBySerial.get(activeSerials[0]);
  const designSessionId = checkpoint.persistent
    ? `android-design-${checkpoint.identitySha256.slice(0, 24)}`
    : `android-design-${firstArtifact.inputSha256.slice(0, 8)}-${firstArtifact.apkSha256.slice(0, 8)}-${hash({
      serials: activeSerials,
      startedAt,
    }).slice(0, 8)}`;
  const originalDisplayStates = new Map(
    await Promise.all(activeSerials.map(async (serial) => [
      serial,
      await readAndroidDisplayState(serial),
    ])),
  );
  const conditionRuns = [];
  const scenarioEvidence = [];
  const productionMediaResult = await captureNativeSpecial(loadProductionMediaManifest);
  const specialResults = {};
  let primaryNavigationPassed = options.outcome !== "mobile-shell-and-preferences";
  try {
    if (!primaryNavigationPassed && !diagnostic) {
      const primarySerial = activeSerials[0];
      const primaryCondition = designExecutionPlan.units[0].condition;
      await configureAndroidDesignCondition(primarySerial, primaryCondition);
      androidDesignProgress({
          condition: primaryCondition.key,
          phase: "primary-navigation-start",
          serial: primarySerial,
      });
      await adb(primarySerial, ["shell", "am", "force-stop", appId]);
      await adb(primarySerial, ["shell", "am", "start", "-W", "-n", `${appId}/.MainActivity`]);
      await androidWaitForNodes(primarySerial, [androidAppReadyTestId], androidUiEvidenceTimeoutMs);
      await verifyPrimaryNavigation(primarySerial, appId);
      primaryNavigationPassed = true;
      androidDesignProgress({
          condition: primaryCondition.key,
          phase: "primary-navigation-complete",
          serial: primarySerial,
      });
    }

    const workerResults = await Promise.allSettled(shards.map(async (shard) => {
      const results = [];
      for (const unit of shard.units) {
        results.push(await runAndroidDesignUnit({
          appId,
          artifact: artifactsBySerial.get(shard.serial),
          assembly,
          caseDefinition,
          checkpoint,
          designSessionId,
          diagnostic,
          serial: shard.serial,
          unit,
        }));
      }
      return results;
    }));
    const workerFailure = workerResults.find((result) => result.status === "rejected");
    if (workerFailure) throw workerFailure.reason;
    const orderedUnitResults = workerResults
      .flatMap((result) => result.value)
      .sort((left, right) => left.unitIndex - right.unitIndex);
    for (const result of orderedUnitResults) {
      conditionRuns.push(result.conditionRun);
      scenarioEvidence.push(...result.scenarioEvidence);
    }

    if (options.outcome === "mobile-shell-and-preferences" && !diagnostic) {
      const primarySerial = activeSerials[0];
      specialResults.root_cold_start = await captureNativeSpecial(
        () => verifyAllRootJourneys(primarySerial, appId),
      );
      specialResults.shared_context = await captureNativeSpecial(
        () => verifySharedDecisionContext(primarySerial, appId),
      );
      specialResults.native_device = await captureNativeSpecial(
        () => verifyRepresentativeAndroidDevice(primarySerial, appId),
      );
    }
  } finally {
    const restoreResults = await Promise.allSettled(activeSerials.map(
      (serial) => restoreAndroidDisplayState(serial, originalDisplayStates.get(serial)),
    ));
    const restoreFailure = restoreResults.find((result) => result.status === "rejected");
    if (restoreFailure) throw restoreFailure.reason;
  }
  const completedFragments = await checkpoint.store.keys();
  const population = assertCompleteNativeDesignPopulation(
    designExecutionPlan,
    completedFragments,
  );
  const iosSemantic = diagnostic
    ? { deferred: true, reason: "diagnostic-only Android repair execution" }
    : await verifyIosSharedSemantics(designControlIds);
  const first = conditionRuns[0];
  if (!first) throw new Error("native_design_condition_run_missing");
  const expectedScenarioPopulation = designExecutionPlan.units.flatMap((unit) =>
    unit.scenarios.map(({ controlId, scenario }) => nativeScenarioEvidenceKey({
      condition_key: unit.conditionKey,
      control_id: controlId,
      mode: unit.mode,
      scenario_id: scenario.id,
    })));
  const observedScenarioPopulation = scenarioEvidence.map(nativeScenarioEvidenceKey);
  if (scenarioEvidence.length !== expectedScenarioPopulation.length
    || new Set(observedScenarioPopulation).size !== expectedScenarioPopulation.length
    || expectedScenarioPopulation.some((key) => !observedScenarioPopulation.includes(key))) {
    throw new Error(
      `native_acceptance_scenario_condition_population_mismatch:${scenarioEvidence.length}:${expectedScenarioPopulation.length}`,
    );
  }
  return {
    androidAbi: firstArtifact.androidAbi,
    checkpoint: {
      identitySha256: checkpoint.identitySha256,
      persistent: checkpoint.persistent,
      population,
      root: checkpoint.store.root,
    },
    coldStart: true,
    conditionRuns,
    controlNodes: new Map([...first.controls].map(([key, value]) => [key, value.beforeNode])),
    designExecutionPlan,
    diagnostic,
    devices: deviceIdentities,
    iosSemantic,
    observerMetrics: { ...nativeObserverMetrics },
    outcomeXml: first.screenXml,
    primaryNavigationPassed,
    productionMediaResult,
    screenshotPng: first.screenPng,
    scenarioResult: {
      evidence: scenarioEvidence,
      passed: scenarioEvidence.every((entry) => entry.passed !== false),
    },
    settledScreenshotPng: first.screenPng,
    serial: activeSerials[0],
    serials: activeSerials,
    sessionId: designSessionId,
    shards: shards.map((shard) => ({
      serial: shard.serial,
      unit_keys: shard.units.map((unit) => unit.key),
    })),
    specialResults,
    surfaceValues: [],
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

function resizePngImage(source, width, height) {
  const target = new (png())({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y + 0.5) * source.height / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x + 0.5) * source.width / width));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      source.data.copy(target.data, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
  return target;
}

function comparisonDimensions(left, right) {
  const maximumWidth = 720;
  const maximumHeight = 1280;
  const width = Math.max(1, Math.min(maximumWidth, Math.max(left.width, right.width)));
  const height = Math.max(1, Math.min(maximumHeight, Math.max(left.height, right.height)));
  return { width, height };
}

function pngDifferenceMetrics(leftBuffer, rightBuffer) {
  const decodedLeft = png().sync.read(leftBuffer);
  const decodedRight = png().sync.read(rightBuffer);
  const dimensions = comparisonDimensions(decodedLeft, decodedRight);
  const left = resizePngImage(decodedLeft, dimensions.width, dimensions.height);
  const right = resizePngImage(decodedRight, dimensions.width, dimensions.height);
  let delta = 0;
  let mismatched = 0;
  let edgeDelta = 0;
  const pixelCount = dimensions.width * dimensions.height;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const index = pixel * 4;
    const red = Math.abs(left.data[index] - right.data[index]);
    const green = Math.abs(left.data[index + 1] - right.data[index + 1]);
    const blue = Math.abs(left.data[index + 2] - right.data[index + 2]);
    delta += red + green + blue;
    if (Math.max(red, green, blue) >= 32) mismatched += 1;
    if (pixel >= dimensions.width) {
      const above = index - dimensions.width * 4;
      const leftEdge = Math.abs(left.data[index] - left.data[above])
        + Math.abs(left.data[index + 1] - left.data[above + 1])
        + Math.abs(left.data[index + 2] - left.data[above + 2]);
      const rightEdge = Math.abs(right.data[index] - right.data[above])
        + Math.abs(right.data[index + 1] - right.data[above + 1])
        + Math.abs(right.data[index + 2] - right.data[above + 2]);
      edgeDelta += Math.abs(leftEdge - rightEdge);
    }
  }
  return {
    edge_difference: edgeDelta / (Math.max(1, pixelCount - dimensions.width) * 3 * 255),
    mismatch_ratio: mismatched / pixelCount,
    normalized_difference: delta / (pixelCount * 3 * 255),
    compared_height: dimensions.height,
    compared_width: dimensions.width,
  };
}

function normalizedPngDifference(leftBuffer, rightBuffer) {
  return pngDifferenceMetrics(leftBuffer, rightBuffer).normalized_difference;
}

function cropPng(buffer, requestedBounds) {
  const source = png().sync.read(buffer);
  const left = Math.max(0, Math.min(source.width - 1, Math.floor(requestedBounds.left)));
  const top = Math.max(0, Math.min(source.height - 1, Math.floor(requestedBounds.top)));
  const right = Math.max(left + 1, Math.min(source.width, Math.ceil(requestedBounds.right)));
  const bottom = Math.max(top + 1, Math.min(source.height, Math.ceil(requestedBounds.bottom)));
  const target = new (png())({ width: right - left, height: bottom - top });
  for (let y = top; y < bottom; y += 1) {
    const sourceStart = (y * source.width + left) * 4;
    const targetStart = ((y - top) * target.width) * 4;
    source.data.copy(target.data, targetStart, sourceStart, sourceStart + target.width * 4);
  }
  return png().sync.write(target);
}

function containPng(buffer, width = 320, height = 240) {
  const source = png().sync.read(buffer);
  const scale = Math.min(width / source.width, height / source.height);
  const renderedWidth = Math.max(1, Math.round(source.width * scale));
  const renderedHeight = Math.max(1, Math.round(source.height * scale));
  const resized = resizePngImage(source, renderedWidth, renderedHeight);
  const target = new (png())({ width, height, fill: true });
  target.data.fill(31);
  for (let alpha = 3; alpha < target.data.length; alpha += 4) target.data[alpha] = 255;
  const offsetX = Math.floor((width - renderedWidth) / 2);
  const offsetY = Math.floor((height - renderedHeight) / 2);
  for (let y = 0; y < renderedHeight; y += 1) {
    const sourceStart = y * renderedWidth * 4;
    const targetStart = ((y + offsetY) * width + offsetX) * 4;
    resized.data.copy(target.data, targetStart, sourceStart, sourceStart + renderedWidth * 4);
  }
  return target;
}

function pngMontage(buffers, columns = 3) {
  if (!buffers.length) throw new Error("native_design_montage_empty");
  const cellWidth = 320;
  const cellHeight = 240;
  const rows = Math.ceil(buffers.length / columns);
  const target = new (png())({ width: cellWidth * columns, height: cellHeight * rows, fill: true });
  target.data.fill(31);
  for (let alpha = 3; alpha < target.data.length; alpha += 4) target.data[alpha] = 255;
  buffers.forEach((buffer, index) => {
    const cell = containPng(buffer, cellWidth, cellHeight);
    const column = index % columns;
    const row = Math.floor(index / columns);
    for (let y = 0; y < cellHeight; y += 1) {
      const sourceStart = y * cellWidth * 4;
      const targetStart = ((row * cellHeight + y) * target.width + column * cellWidth) * 4;
      cell.data.copy(target.data, targetStart, sourceStart, sourceStart + cellWidth * 4);
    }
  });
  return png().sync.write(target);
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

function pngDominantBuckets(buffer, limit = 12) {
  const image = png().sync.read(buffer);
  const counts = new Map();
  const step = Math.max(1, Math.floor((image.width * image.height) / 40_000));
  for (let pixel = 0; pixel < image.width * image.height; pixel += step) {
    const index = pixel * 4;
    if (image.data[index + 3] < 128) continue;
    const key = `${image.data[index] >> 4}:${image.data[index + 1] >> 4}:${image.data[index + 2] >> 4}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit).map(([key]) => key);
}

function paletteOverlap(leftBuffer, rightBuffer) {
  const left = new Set(pngDominantBuckets(leftBuffer));
  const right = new Set(pngDominantBuckets(rightBuffer));
  const intersection = [...left].filter((key) => right.has(key)).length;
  return intersection / Math.max(1, new Set([...left, ...right]).size);
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

const referenceMode = (mode) => mode === "red-light" ? "red" : mode === "planning" ? "plan" : mode;

async function configureFrozenPageReference(page, outcome, run) {
  await page.goto(
    pathToFileURL(path.join(repositoryRoot, mobilePageTargetEntry)).href,
    { waitUntil: "domcontentloaded" },
  );
  await page.evaluate(({ mode, selectedOutcome }) => {
    const outcomeControl = Array.from(document.querySelectorAll("[data-outcome-id]"))
      .find((element) => element.getAttribute("data-outcome-id") === selectedOutcome);
    const modeControl = Array.from(document.querySelectorAll("[data-mode]"))
      .find((element) => element.getAttribute("data-mode") === mode);
    if (!(outcomeControl instanceof HTMLElement)) {
      throw new Error(`native_reference_outcome_control_missing:${selectedOutcome}`);
    }
    if (!(modeControl instanceof HTMLElement)) {
      throw new Error(`native_reference_mode_control_missing:${mode}`);
    }
    outcomeControl.click();
    modeControl.click();
  }, { mode: referenceMode(run.mode), selectedOutcome: outcome });
  await page.addStyleTag({ content: `
    *,*::before,*::after{animation:none!important;caret-color:transparent!important;transition:none!important}
    .device{width:${run.viewport.width}px!important;height:${run.viewport.height}px!important;max-width:none!important}
    .screen{width:100%!important;height:100%!important}
  ` });
}

async function captureBrowserViewport(page) {
  const session = await page.context().newCDPSession(page);
  try {
    const result = await session.send("Page.captureScreenshot", {
      captureBeyondViewport: false,
      format: "png",
      fromSurface: true,
    });
    return Buffer.from(result.data, "base64");
  } finally {
    await session.detach();
  }
}

async function captureBrowserLocator(page, locator, label) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error(`native_reference_bounds_missing:${label}`);
  const screenshot = await captureBrowserViewport(page);
  const dimensions = pngDimensions(screenshot);
  const scaleX = dimensions.width / viewport.width;
  const scaleY = dimensions.height / viewport.height;
  return {
    box,
    png: cropPng(screenshot, {
      bottom: (box.y + box.height) * scaleY,
      left: box.x * scaleX,
      right: (box.x + box.width) * scaleX,
      top: box.y * scaleY,
    }),
  };
}

async function capturePageConstraintReference(browser, outcome, run) {
  const page = await browser.newPage({
    viewport: run.viewport,
    locale: "zh-CN",
    reducedMotion: run.condition.motion === "reduced" ? "reduce" : "no-preference",
  });
  try {
    await configureFrozenPageReference(page, outcome, run);
    const screen = page.locator("#screen.screen").first();
    await screen.waitFor({ state: "visible" });
    const capture = await captureBrowserLocator(page, screen, `${outcome}:page`);
    const controlOrder = await screen.evaluate((root, ids) => {
      const expected = new Set(ids);
      return [...new Set([...root.querySelectorAll("[data-control]")]
        .map((node) => node.getAttribute("data-control"))
        .filter((id) => expected.has(id)))];
    }, designControlIds);
    const controls = await screen.evaluate((root, ids) => Object.fromEntries(ids.flatMap((controlId) => {
      const node = root.querySelector(`[data-control="${CSS.escape(controlId)}"]`);
      if (!node) return [];
      const box = node.getBoundingClientRect();
      const rootBox = root.getBoundingClientRect();
      return [[controlId, {
        height: box.height,
        width: box.width,
        x: box.x - rootBox.x + root.scrollLeft,
        y: box.y - rootBox.y + root.scrollTop,
      }]];
    })), designControlIds);
    return {
      controls,
      controlOrder,
      png: capture.png,
      screenBox: capture.box,
    };
  } finally {
    await page.close();
  }
}

async function captureControlExactReferences(browser, outcome, run) {
  const page = await browser.newPage({
    viewport: run.viewport,
    locale: "zh-CN",
    reducedMotion: run.condition.motion === "reduced" ? "reduce" : "no-preference",
  });
  try {
    await configureFrozenPageReference(page, outcome, run);
    const values = new Map();
    for (const controlId of designControlIds) {
      const locator = page.locator(
        `[data-outcome=${JSON.stringify(outcome)}][data-control=${JSON.stringify(controlId)}]`,
      ).first();
      await locator.waitFor({ state: "visible" });
      const capture = await captureBrowserLocator(page, locator, `${outcome}:${controlId}`);
      values.set(controlId, {
        box: capture.box,
        png: capture.png,
        text: (await locator.innerText()).trim(),
      });
    }
    return values;
  } finally {
    await page.close();
  }
}

async function materializeDesignArtifacts(runtime, plan, outcome) {
  const byTarget = new Map();
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  const pageSamples = [];
  const controlSamples = [];
  try {
    for (const run of runtime.conditionRuns) {
      const pageReference = await capturePageConstraintReference(browser, outcome, run);
      pageSamples.push({
        actualPng: run.screenPng,
        comparisonPng: pageReference.png,
        condition: run.condition,
        controlOrder: run.controlOrder,
        controls: run.controls,
        mode: run.mode,
        referenceControls: pageReference.controls,
        referenceControlOrder: pageReference.controlOrder,
        referenceScreenBox: pageReference.screenBox,
        screenBounds: run.screenBounds,
        viewport: run.viewport,
      });
      const references = await captureControlExactReferences(browser, outcome, run);
      for (const [controlId, control] of run.controls) {
        const reference = references.get(controlId);
        if (!reference) throw new Error(`native_control_reference_missing:${controlId}`);
        controlSamples.push({
          actualBounds: control.bounds,
          actualNode: control.beforeNode,
          actualPng: control.actualCrop,
          actionPng: control.actionCrop,
          afterNode: control.afterNode,
          beforeXml: control.beforeXml,
          comparisonBounds: reference.box,
          comparisonPng: reference.png,
          condition: run.condition,
          contract: control.contract,
          controlId,
          interactionKind: control.kind,
          mode: run.mode,
          pressedPng: control.pressedCrop,
          referenceText: reference.text,
          runtimeWitnesses: control.runtimeWitnesses,
          sampleId: control.sampleId,
          scrollPass: control.scrollPass,
          stateEvidence: control.stateEvidence,
          settledPng: control.settledCrop,
          viewport: run.viewport,
        });
      }
    }
    for (const target of [...new Map(plan.filter((item) => item.target).map((item) => [item.target.key, item.target])).values()]) {
      const paths = designArtifactPaths(outcome, target.key);
      await mkdir(paths.directory, { recursive: true });
      const samples = target.key.startsWith("mobile-page-constraint-") ? pageSamples : controlSamples;
      const actualPng = pngMontage(samples.map((sample) => sample.actualPng));
      const comparisonPng = pngMontage(samples.map((sample) => sample.comparisonPng));
      await writeFile(path.join(repositoryRoot, ...paths.actualRelative.split("/")), actualPng);
      await writeFile(path.join(repositoryRoot, ...paths.comparisonRelative.split("/")), comparisonPng);
      byTarget.set(target.key, {
        target,
        actualPath: paths.actualRelative,
        comparisonPath: paths.comparisonRelative,
        actualPng,
        comparisonPng,
        samples,
      });
    }
  } finally {
    await browser.close();
  }
  return byTarget;
}

const normalizedWords = (value) => new Set(String(value ?? "")
  .normalize("NFKC")
  .toLowerCase()
  .split(/[^\p{L}\p{N}]+/u)
  .filter((word) => word.length >= 2));

function wordOverlap(left, right) {
  const leftWords = normalizedWords(left);
  const rightWords = normalizedWords(right);
  if (!leftWords.size || !rightWords.size) return 0;
  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  return intersection / Math.min(leftWords.size, rightWords.size);
}

function semanticNodeChanged(sample) {
  if (!sample.afterNode) return true;
  const keys = ["checked", "content-desc", "enabled", "selected", "text"];
  return keys.some((key) => String(sample.actualNode?.[key] ?? "") !== String(sample.afterNode?.[key] ?? ""));
}

function validateDesignCoverage(entry, runtime, artifact) {
  if (!entry.rows?.length && entry.method !== "conformance") {
    throw new Error(`native_design_method_rows_missing:${entry.target.key}:${entry.method}`);
  }
  const expectedConditions = [...new Set(entry.target.condition_refs)].sort();
  const actualConditions = [...new Set([
    ...runtime.conditionRuns.map((run) => run.condition.key),
    ...runtime.iosSemantic.condition_keys,
  ])].sort();
  if (JSON.stringify(actualConditions) !== JSON.stringify(expectedConditions)) {
    throw new Error(`native_design_condition_coverage_mismatch:${entry.target.key}`);
  }
  for (const row of entry.rows ?? []) {
    if (!row.source_item_refs?.length || !row.condition_refs?.length || !row.evidence_refs?.length) {
      throw new Error(`native_design_row_attribution_incomplete:${row.key}`);
    }
    if (entry.method !== "conformance" && !row.verification_methods.includes(entry.method)) {
      throw new Error(`native_design_row_method_mismatch:${row.key}:${entry.method}`);
    }
  }
  if (!artifact.samples.length) throw new Error(`native_design_samples_missing:${entry.target.key}`);
}

function validateNativeVisual(artifact) {
  const threshold = artifact.target.interpretation === "exact_target"
    ? nativeExactVisualThreshold
    : nativeConstraintVisualThreshold;
  const mismatchThreshold = artifact.target.interpretation === "exact_target"
    ? nativeExactMismatchThreshold
    : nativeConstraintMismatchThreshold;
  const edgeThreshold = artifact.target.interpretation === "exact_target"
    ? nativeExactEdgeThreshold
    : nativeConstraintEdgeThreshold;
  for (const sample of artifact.samples) {
    const metrics = pngDifferenceMetrics(sample.actualPng, sample.comparisonPng);
    if (metrics.normalized_difference > threshold
      || metrics.mismatch_ratio > mismatchThreshold
      || metrics.edge_difference > edgeThreshold) {
      throw new Error(`native_visual_difference_exceeded:${artifact.target.key}:${sample.condition.key}:${sample.mode}:${sample.controlId ?? "page"}`);
    }
  }
}

function validateNativeGeometry(artifact) {
  for (const sample of artifact.samples) {
    if (sample.controlId) {
      const actualRatio = sample.actualBounds.width / sample.actualBounds.height;
      const comparisonRatio = sample.comparisonBounds.width / sample.comparisonBounds.height;
      if (Math.abs(Math.log(actualRatio / comparisonRatio)) > nativeControlRatioTolerance) {
        throw new Error(`native_control_geometry_mismatch:${sample.controlId}:${sample.condition.key}:${sample.mode}`);
      }
      if (sample.actualBounds.width < 44 || sample.actualBounds.height < 44) {
        throw new Error(`native_control_touch_target_too_small:${sample.controlId}`);
      }
      continue;
    }
    const actualSize = pngDimensions(sample.actualPng);
    if (actualSize.width !== sample.viewport.width || actualSize.height !== sample.viewport.height) {
      throw new Error(`native_page_viewport_mismatch:${sample.condition.key}:${actualSize.width}x${actualSize.height}`);
    }
    const expectedOrder = mobileControlContract.pageAssemblyContracts
      .find((entry) => entry.outcome === options.outcome)?.controlComposition
      ?.map((entry) => entry.stableControlId);
    if (!expectedOrder
      || JSON.stringify(sample.controlOrder) !== JSON.stringify(expectedOrder)
      || JSON.stringify(sample.referenceControlOrder) !== JSON.stringify(expectedOrder)) {
      throw new Error(`native_page_control_order_mismatch:${options.outcome}:${sample.condition.key}:${sample.mode}`);
    }
    for (const controlId of designControlIds) {
      if (!sample.referenceControls[controlId]) throw new Error(`native_page_reference_control_geometry_missing:${controlId}`);
      const control = sample.controls.get(controlId);
      if (!control) throw new Error(`native_page_actual_control_geometry_missing:${controlId}`);
      if (!sample.screenBounds) throw new Error(`native_page_screen_bounds_missing:${sample.condition.key}:${sample.mode}`);
      const scaleX = sample.screenBounds.width / sample.referenceScreenBox.width;
      const scaleY = sample.screenBounds.height / sample.referenceScreenBox.height;
      const actualRect = [
        control.bounds.left - sample.screenBounds.left,
        control.bounds.top - sample.screenBounds.top,
        control.bounds.width,
        control.bounds.height,
      ];
      const reference = sample.referenceControls[controlId];
      const referenceRect = [
        reference.x * scaleX,
        reference.y * scaleY,
        reference.width * scaleX,
        reference.height * scaleY,
      ];
      if (actualRect.some((value, index) =>
        Math.abs(value - referenceRect[index]) > nativePageGeometryTolerancePx)) {
        throw new Error(`native_page_control_geometry_mismatch:${controlId}:${sample.condition.key}:${sample.mode}`);
      }
    }
  }
}

function validateNativeAccessibility(artifact) {
  const samples = artifact.samples.filter((sample) => sample.controlId);
  const nodes = new Map(samples.map((sample) => [sample.controlId, sample.actualNode]));
  validateAndroidControlSemantics(nodes);
  for (const sample of samples) {
    const expectedRole = sample.contract?.accessibility?.reactNative?.role;
    if (!expectedRole) throw new Error(`native_control_accessibility_contract_missing:${sample.controlId}`);
    const node = sample.actualNode;
    if (["button", "tab", "switch", "radio", "checkbox"].includes(expectedRole)
      && node.clickable !== "true" && node.focusable !== "true" && node.checkable !== "true") {
      throw new Error(`native_control_accessibility_role_unobservable:${sample.controlId}:${expectedRole}`);
    }
    const label = sample.contract?.accessibility?.reactNative?.name;
    const semanticName = (node["content-desc"] || node.text || "").trim();
    if (label && !semanticName.includes(label)) {
      throw new Error(`native_control_accessible_name_mismatch:${sample.controlId}`);
    }
  }
}

function validateNativeContent(artifact) {
  for (const sample of artifact.samples.filter((value) => value.controlId)) {
    const expectedLabel = sample.contract?.contentLocalization?.label;
    const semanticName = (sample.actualNode?.["content-desc"] || sample.actualNode?.text || "").trim();
    if (!expectedLabel || !semanticName.includes(expectedLabel)) {
      throw new Error(`native_control_content_mismatch:${sample.controlId}`);
    }
    if (wordOverlap(semanticName, sample.referenceText) < 0.6) {
      throw new Error(`native_control_reference_content_mismatch:${sample.controlId}`);
    }
  }
}

function validateNativeScenarioEvidence(runtime) {
  if (runtime.scenarioResult?.passed !== true || !Array.isArray(runtime.scenarioResult.evidence)) {
    throw new Error(runtime.scenarioResult?.diagnostic ?? "native_acceptance_scenario_evidence_missing");
  }
  const androidConditions = designConditions.filter((condition) => condition.key.startsWith("mobile-android-"));
  const expected = nativeExpectedScenarioPopulation(
    designControlIds,
    mobileControlContract,
    androidConditions,
  );
  const observed = new Set(runtime.scenarioResult.evidence.map(nativeScenarioEvidenceKey));
  const missing = expected.filter((key) => !observed.has(key));
  if (missing.length) throw new Error(`native_acceptance_scenario_missing:${missing[0]}`);
  if (observed.size !== expected.length || runtime.scenarioResult.evidence.length !== expected.length) {
    throw new Error(`native_acceptance_scenario_condition_population_mismatch:${observed.size}:${expected.length}`);
  }
}

function validateNativeComponentState(artifact, runtime) {
  validateNativeScenarioEvidence(runtime);
  for (const sample of artifact.samples.filter((value) => value.controlId)) {
    const expectedStates = applicableControlStates("mobile", sample.contract).map(([state]) => state).sort();
    const observedStates = (sample.stateEvidence ?? []).map((entry) => entry.state).sort();
    if (JSON.stringify(observedStates) !== JSON.stringify(expectedStates)) {
      throw new Error(`native_control_state_population_incomplete:${sample.controlId}:${sample.condition.key}:${sample.mode}`);
    }
    const scenarios = sample.contract?.acceptanceScenarios ?? [];
    if (![2, 4].includes(scenarios.length) || !scenarios.some((scenario) => scenario.id.endsWith(".acceptance.success"))
      || !scenarios.some((scenario) => scenario.id.endsWith(".acceptance.failure-recovery"))
      || (scenarios.length === 4 && (!scenarios.some((scenario) => scenario.id.endsWith(".acceptance.block"))
        || !scenarios.some((scenario) => scenario.id.endsWith(".acceptance.error"))))) {
      throw new Error(`native_control_acceptance_scenarios_incomplete:${sample.controlId}`);
    }
    const pressedDifference = normalizedPngDifference(sample.actualPng, sample.pressedPng);
    const actionDifference = normalizedPngDifference(sample.actualPng, sample.actionPng);
    if (pressedDifference < nativeVisibleMotionThreshold) throw new Error(`native_pressed_state_not_visible:${sample.controlId}`);
    if (actionDifference < nativeVisibleMotionThreshold && !semanticNodeChanged(sample)) {
      throw new Error(`native_component_state_did_not_change:${sample.controlId}`);
    }
  }
}

function validateNativeInteraction(artifact, caseDefinition, runtime) {
  validateNativeScenarioEvidence(runtime);
  if (!caseDefinition.root_journey?.length || !caseDefinition.screen_test_id) {
    throw new Error(`native_root_journey_contract_incomplete:${options.outcome}`);
  }
  const seen = new Set();
  for (const sample of artifact.samples.filter((value) => value.controlId)) {
    seen.add(sample.controlId);
    const actionDifference = normalizedPngDifference(sample.actualPng, sample.actionPng);
    if (actionDifference < nativeVisibleMotionThreshold && !semanticNodeChanged(sample)) {
      throw new Error(`native_control_interaction_unobserved:${sample.controlId}`);
    }
    if (sample.interactionKind === "direct_manipulation" && actionDifference < 0.01) {
      throw new Error(`native_direct_manipulation_unobserved:${sample.controlId}`);
    }
  }
  const missing = designControlIds.filter((controlId) => !seen.has(controlId));
  if (missing.length) throw new Error(`native_bound_control_interaction_missing:${missing.join(",")}`);
}

function validateNativeMotion(artifact) {
  for (const sample of artifact.samples.filter((value) => value.controlId)) {
    const pressedDifference = normalizedPngDifference(sample.actualPng, sample.pressedPng);
    const settledDifference = normalizedPngDifference(sample.actionPng, sample.settledPng);
    if (pressedDifference < nativeVisibleMotionThreshold) throw new Error(`native_motion_timeline_missing:${sample.controlId}`);
    if (settledDifference > nativeSettledMotionThreshold) throw new Error(`native_motion_did_not_settle:${sample.controlId}`);
    if (sample.condition.motion === "reduced" && settledDifference > 0.012) {
      throw new Error(`native_reduced_motion_not_replaced:${sample.controlId}`);
    }
  }
}

function validateNativeResponsive(artifact) {
  const expectedAndroidConditions = designConditions.filter((condition) => condition.key.startsWith("mobile-android-")).map((condition) => condition.key).sort();
  const actualConditions = [...new Set(artifact.samples.map((sample) => sample.condition.key))].sort();
  if (JSON.stringify(actualConditions) !== JSON.stringify(expectedAndroidConditions)) {
    throw new Error(`native_responsive_conditions_incomplete:${artifact.target.key}`);
  }
  const modesByCondition = new Map();
  for (const sample of artifact.samples) {
    const modes = modesByCondition.get(sample.condition.key) ?? new Set();
    modes.add(sample.mode);
    modesByCondition.set(sample.condition.key, modes);
    if (sample.controlId) {
      const bounds = sample.actualBounds;
      if (bounds.left < 0 || bounds.right > sample.viewport.width || bounds.top < 0 || bounds.bottom > sample.viewport.height) {
        throw new Error(`native_control_outside_viewport:${sample.controlId}:${sample.condition.key}:${sample.mode}`);
      }
    }
  }
  for (const [condition, modes] of modesByCondition) {
    if (JSON.stringify([...modes].sort()) !== JSON.stringify(["night", "planning", "red-light"])) {
      throw new Error(`native_mode_coverage_incomplete:${condition}`);
    }
  }
}

function validateNativeInputMethod(artifact) {
  for (const sample of artifact.samples.filter((value) => value.controlId)) {
    const node = sample.actualNode;
    if (node.clickable !== "true" && node.focusable !== "true" && node.scrollable !== "true" && node.checkable !== "true") {
      throw new Error(`native_control_input_method_missing:${sample.controlId}`);
    }
    if (!sample.contract?.accessibility?.nonGestureAlternative) {
      throw new Error(`native_control_non_gesture_alternative_missing:${sample.controlId}`);
    }
  }
}

function validateNativeDesignToken(artifact) {
  for (const sample of artifact.samples) {
    if (pngColorBuckets(sample.actualPng) < 12) throw new Error(`native_render_token_diversity_missing:${sample.controlId ?? artifact.target.key}`);
    if (paletteOverlap(sample.actualPng, sample.comparisonPng) < 0.72) {
      throw new Error(`native_design_token_palette_mismatch:${sample.controlId ?? artifact.target.key}:${sample.condition.key}:${sample.mode}`);
    }
  }
}

function validateNativeAssets(artifact, runtime) {
  for (const sample of artifact.samples.filter((value) => value.controlId)) {
    const assets = sample.contract?.assets;
    if (!assets) throw new Error(`native_control_asset_contract_missing:${sample.controlId}`);
    const unresolved = [assets.icon, assets.illustrationMedia]
      .filter((value) => value && value.notApplicable !== true)
      .filter((value) => value.replacementRequired === true || value.status === "placeholder" || !value.reuseLicenseStatus && !value.license);
    if (!unresolved.length) continue;
    if (runtime.productionMediaResult?.passed !== true) {
      throw new Error(runtime.productionMediaResult?.diagnostic ?? "native_production_media_manifest_missing");
    }
    const records = runtime.productionMediaResult.evidence.assets.filter(
      (entry) => entry.stable_control_id === sample.controlId,
    );
    if (records.length < unresolved.length) throw new Error(`native_production_media_population_missing:${sample.controlId}`);
    const evidenceId = `${sample.controlId}-asset-identities`;
    const node = maybeFindUiNode(sample.beforeXml, evidenceId);
    if (!node) throw new Error(`native_production_media_runtime_binding_missing:${sample.controlId}`);
    const visibleIdentities = semanticNodeValue(node, evidenceId);
    if (records.some((entry) => !visibleIdentities.includes(entry.identifier))) {
      throw new Error(`native_production_media_runtime_identity_mismatch:${sample.controlId}`);
    }
  }
}

function validateNativeExactFieldWitnesses(artifact, method, runtime) {
  if (artifact.target.interpretation !== "exact_target") return;
  const samples = artifact.samples.filter((sample) => sample.controlId);
  if (!samples.length) throw new Error(`native_exact_target_samples_missing:${artifact.target.key}`);
  for (const sample of samples) {
    assertExactRuntimeFieldWitnesses({
      condition_key: sample.condition.key,
      control: sample.contract,
      control_id: sample.controlId,
      corroboration: designWitnessCorroboration(method),
      method,
      mode: sample.mode,
      outcome: options.outcome,
      profile: "mobile",
      records: sample.runtimeWitnesses ?? [],
      sample_id: sample.sampleId,
      session_id: runtime.sessionId,
    });
    assertExactRuntimeProfileWitnesses({
      condition_key: sample.condition.key,
      contract: mobileControlContract,
      corroboration: designWitnessCorroboration(method),
      method,
      mode: sample.mode,
      outcome: options.outcome,
      profile: "mobile",
      records: sample.runtimeWitnesses ?? [],
      sample_id: sample.sampleId,
      session_id: runtime.sessionId,
    });
  }
}

function validateDesignMethod(entry, runtime, artifact, caseDefinition) {
  validateDesignCoverage(entry, runtime, artifact);
  const methods = entry.method === "conformance"
    ? [...new Set((entry.rows ?? []).flatMap((row) => row.verification_methods))].sort()
    : [entry.method];
  for (const method of methods) {
    if (method === "visual_pixel") validateNativeVisual(artifact);
    else if (method === "layout_geometry") validateNativeGeometry(artifact);
    else if (method === "accessibility_semantics") validateNativeAccessibility(artifact);
    else if (method === "content") validateNativeContent(artifact);
    else if (method === "component_state") validateNativeComponentState(artifact, runtime);
    else if (method === "interaction_trace") validateNativeInteraction(artifact, caseDefinition, runtime);
    else if (method === "motion_timeline") validateNativeMotion(artifact);
    else if (method === "responsive_reflow") validateNativeResponsive(artifact);
    else if (method === "input_method") validateNativeInputMethod(artifact);
    else if (method === "design_token") validateNativeDesignToken(artifact);
    else if (method === "asset_integrity") validateNativeAssets(artifact, runtime);
    else throw new Error(`native_design_method_unsupported:${method}`);
    validateNativeExactFieldWitnesses(artifact, method, runtime);
  }
}

async function writeDesignMethodArtifact(outcome, entry, artifact, runtime, passed, diagnostic = null) {
  if (!entry.target) return;
  const paths = designArtifactPaths(outcome, entry.target.key);
  const output = path.join(paths.directory, `${entry.target.key}-${entry.method}-evidence.json`);
  const sampleMetrics = artifact.samples.map((sample) => ({
    condition_key: sample.condition.key,
    control_id: sample.controlId ?? null,
    mode: sample.mode,
    pixel: pngDifferenceMetrics(sample.actualPng, sample.comparisonPng),
    runtime_witness_count: sample.runtimeWitnesses?.length ?? 0,
    state_trace_count: sample.stateEvidence?.length ?? 0,
  }));
  await writeFile(output, `${JSON.stringify({
    schema_version: "starward-native-design-method-evidence-v2",
    outcome,
    assertion_key: entry.key,
    method: entry.method,
    target: entry.target.key,
    controls: designControlIds,
    condition_keys: entry.target.condition_refs,
    coverage_row_keys: (entry.rows ?? []).map((row) => row.key),
    session_id: runtime.sessionId,
    passed,
    diagnostic,
    actual_sha256: hash(artifact.actualPng),
    comparison_sha256: hash(artifact.comparisonPng),
    exact_contract_accounting: entry.target.interpretation === "exact_target" ? {
      controls: mobileContractPopulation.controlCount,
      control_fields: mobileContractPopulation.controlFieldCount,
      profile_fields: mobileContractPopulation.rootFieldCount,
      runtime_fields: mobileContractPopulation.runtimeFieldCount,
      total_fields: mobileContractPopulation.fieldCount,
    } : null,
    normalized_pixel_difference: normalizedPngDifference(artifact.actualPng, artifact.comparisonPng),
    samples: sampleMetrics,
    acceptance_scenarios: runtime.scenarioResult?.passed === true
      ? {
        count: runtime.scenarioResult.evidence.length,
        population_sha256: hash(runtime.scenarioResult.evidence),
      }
      : {
        count: 0,
        diagnostic: runtime.scenarioResult?.diagnostic ?? "native_acceptance_scenario_evidence_missing",
      },
    ios_semantic: runtime.iosSemantic,
  }, null, 2)}\n`, "utf8");
}

async function writeNativeSpecialArtifact(outcome, entry, runtime, result) {
  const relativeDirectory = `artifacts/verification/design-conformance/${outcome}`;
  const relativePath = `${relativeDirectory}/${entry.key}-evidence.json`;
  await mkdir(path.join(repositoryRoot, ...relativeDirectory.split("/")), { recursive: true });
  await writeFile(path.join(repositoryRoot, ...relativePath.split("/")), `${JSON.stringify({
    schema_version: "starward-native-special-evidence-v1",
    outcome,
    assertion_key: entry.key,
    method: entry.method,
    session_id: runtime.sessionId,
    passed: result?.passed === true,
    diagnostic: result?.diagnostic ?? null,
    evidence: result?.evidence ?? null,
    ios_live_runtime_verified: false,
  }, null, 2)}\n`, "utf8");
}

async function buildDesignResult(runtime, caseDefinition) {
  if (options["assertion-key"] !== designPlan[0]?.key || options.observation !== designPlan[0]?.observation) {
    throw new Error("native_design_contract_identity_mismatch");
  }
  const artifacts = await materializeDesignArtifacts(runtime, designPlan, options.outcome);
  const observations = {};
  const evidenceRecords = [];
  const diagnostics = [];
  const results = new Map();
  const orderedEntries = [
    ...designPlan.filter((entry) => entry.method !== "conformance" && entry.method !== "navigation"),
    ...designPlan.filter((entry) => entry.method === "conformance"),
    ...designPlan.filter((entry) => entry.method === "navigation"),
  ];
  for (const entry of orderedEntries) {
    const artifact = entry.target ? artifacts.get(entry.target.key) : null;
    let passed = true;
    let diagnostic = null;
    if (entry.target) {
      try {
        validateDesignMethod(entry, runtime, artifact, caseDefinition);
        if (entry.method === "conformance") {
          const dependent = designPlan.filter((candidate) =>
            candidate.target?.key === entry.target.key
            && candidate.method !== "conformance"
            && candidate.method !== "navigation");
          if (dependent.some((candidate) => results.get(candidate.key) !== true)) {
            throw new Error(`native_design_method_dependency_failed:${entry.target.key}`);
          }
        }
      } catch (error) {
        passed = false;
        diagnostic = stableFailureCode(error);
        diagnostics.push(`native_design_assertion_failed:${entry.key}:${diagnostic}`);
      }
      await writeDesignMethodArtifact(options.outcome, entry, artifact, runtime, passed, diagnostic);
    } else if (entry.method === "navigation") {
      passed = runtime.primaryNavigationPassed === true;
      if (!passed) {
        diagnostic = "primary_navigation_not_verified";
        diagnostics.push(`native_design_assertion_failed:${entry.key}:${diagnostic}`);
      }
    } else {
      const special = runtime.specialResults?.[entry.method];
      passed = special?.passed === true;
      diagnostic = passed ? null : special?.diagnostic ?? `native_special_evidence_missing:${entry.method}`;
      if (!passed) diagnostics.push(`native_design_assertion_failed:${entry.key}:${diagnostic}`);
      await writeNativeSpecialArtifact(options.outcome, entry, runtime, special);
    }
    results.set(entry.key, passed);
    observations[entry.observation] = passed;
    if (!passed) continue;
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
    diagnostics,
  };
}

async function buildNativeDiagnosticResult(runtime) {
  const defaultRoot = path.join(
    repositoryRoot,
    "artifacts/verification/native-diagnostics",
    options.outcome,
    runtime.checkpoint.identitySha256,
  );
  const outputRoot = path.resolve(options["diagnostic-output"] ?? defaultRoot);
  const outputRelative = path.relative(repositoryRoot, outputRoot);
  if (!outputRelative
    || path.isAbsolute(outputRelative)
    || outputRelative.startsWith(`..${path.sep}`)
    || outputRelative === "..") {
    throw new Error("native_diagnostic_output_outside_repository");
  }
  await mkdir(outputRoot, { recursive: true });
  const conformanceIssues = [];
  const samples = [];
  for (const run of runtime.conditionRuns) {
    const prefix = `${run.condition.key}-${run.mode}`;
    const screenPath = path.join(outputRoot, `${prefix}-screen.png`);
    await writeFile(screenPath, run.screenPng);
    samples.push({
      condition_key: run.condition.key,
      kind: "page",
      mode: run.mode,
      path: path.relative(repositoryRoot, screenPath).replaceAll("\\", "/"),
      serial: run.serial,
    });
    for (const diagnostic of run.conformanceDiagnostics ?? []) {
      conformanceIssues.push({
        condition_key: run.condition.key,
        diagnostic,
        kind: "page-assembly",
        mode: run.mode,
      });
    }
    for (const [controlId, control] of run.controls) {
      for (const diagnostic of control.conformanceDiagnostics ?? []) {
        conformanceIssues.push({
          condition_key: run.condition.key,
          control_id: controlId,
          diagnostic,
          kind: "control-state",
          mode: run.mode,
        });
      }
      for (const [state, buffer] of [
        ["actual", control.actualCrop],
        ["pressed", control.pressedCrop],
        ["action", control.actionCrop],
        ["settled", control.settledCrop],
      ]) {
        const samplePath = path.join(outputRoot, `${prefix}-${controlId}-${state}.png`);
        await writeFile(samplePath, buffer);
        samples.push({
          condition_key: run.condition.key,
          control_id: controlId,
          kind: state,
          mode: run.mode,
          path: path.relative(repositoryRoot, samplePath).replaceAll("\\", "/"),
          serial: control.serial,
        });
      }
    }
  }
  for (const scenario of runtime.scenarioResult.evidence) {
    if (scenario.passed !== false) continue;
    conformanceIssues.push({
      condition_key: scenario.condition_key,
      control_id: scenario.control_id,
      diagnostic: scenario.diagnostic,
      kind: "acceptance-scenario",
      mode: scenario.mode,
      scenario_id: scenario.scenario_id,
    });
  }
  const report = {
    schema_version: "starward-native-design-diagnostic-v1",
    authority: "diagnostic-only",
    formal_acceptance: false,
    target_runtime: "android-native",
    outcome: options.outcome,
    target_ref: options["target-ref"],
    session_id: runtime.sessionId,
    selection: {
      conditions: runtime.designExecutionPlan.conditionKeys,
      controls: runtime.designExecutionPlan.controlIds,
      modes: runtime.designExecutionPlan.modeKeys,
    },
    checkpoint: runtime.checkpoint,
    devices: runtime.devices,
    observer_metrics: runtime.observerMetrics,
    shards: runtime.shards,
    samples,
    conformance_issues: conformanceIssues,
    conformance_status: conformanceIssues.length ? "failed" : "passed",
    scenario_count: runtime.scenarioResult.evidence.length,
    scenario_passed_count: runtime.scenarioResult.evidence.filter(
      (entry) => entry.passed !== false,
    ).length,
    selected_design_inputs: [
      options["design-handoff"],
      mobilePageTargetEntry,
      mobileControlTargetEntry,
      mobileControlContractPath,
    ],
  };
  const reportPath = path.join(outputRoot, "report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return {
    schema_version: "starward-native-design-diagnostic-v1",
    authority: "diagnostic-only",
    execution_status: "completed",
    formal_acceptance: false,
    native_runtime: true,
    checkpoint: runtime.checkpoint,
    conformance_status: report.conformance_status,
    observer_metrics: runtime.observerMetrics,
    report_path: path.relative(repositoryRoot, reportPath).replaceAll("\\", "/"),
    selection: report.selection,
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
let designConditions = [];
let mobileControlContract = null;
let mobileContractPopulation = null;

function stableFailureCode(error) {
  const value = error instanceof Error ? error.message : String(error);
  const [head, ...tail] = value.split(":");
  if (!/^[A-Za-z0-9_-]+$/u.test(head)) return "native_target_check_failed";
  const attributable = [head];
  for (const segment of tail) {
    if (!/^[A-Za-z0-9_.-]{2,160}$/u.test(segment)) break;
    attributable.push(segment);
  }
  return attributable.join(":");
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
    designConditions = designHandoff.conditions ?? [];
    mobileControlContract = JSON.parse(await readFile(path.join(repositoryRoot, mobileControlContractPath), "utf8"));
    if (!designControlIds.length) throw new Error(`native_design_controls_missing:${options.outcome}`);
    if (!designConditions.length) throw new Error("native_design_conditions_missing");
    if (!mobileControlContract?.controls || Array.isArray(mobileControlContract.controls)) {
      throw new Error("native_control_contract_invalid");
    }
    mobileContractPopulation = assertExactContractPopulation("mobile", mobileControlContract);
    const missingContractControls = designControlIds.filter((controlId) => !mobileControlContract.controls[controlId]);
    if (missingContractControls.length) {
      throw new Error(`native_control_contract_population_missing:${missingContractControls.join(",")}`);
    }
  }
  if (options.conformance === "design-authority" || options["design-handoff"]) {
    await spawnCapture(process.execPath, [path.join(repositoryRoot, "tools/verify-design-targets.mjs")], {
      cwd: repositoryRoot,
      label: "design-authority-conformance",
    });
  }

  if (options.platform === "ios" && process.platform !== "darwin") return runRemoteIos();
  const runtime = options.platform === "android"
    ? options["design-handoff"]
      ? await runAndroidDesign(caseDefinition)
      : await runAndroid(caseDefinition)
    : await runIosLocal(caseDefinition);
  if (!runtime.diagnostic) {
    for (const opsSurface of (caseDefinition.cross_surfaces ?? []).filter((surface) => surface.ops_route)) {
      runtime.surfaceValues.push(await readOpsSurface(opsSurface));
    }
  }
  return options["design-handoff"]
    ? runtime.diagnostic
      ? await buildNativeDiagnosticResult(runtime)
      : await buildDesignResult(runtime, caseDefinition)
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
    if (options?.diagnostic === "true" || options?.diagnostic === "1") {
      process.stdout.write(`${JSON.stringify({
        schema_version: "starward-native-design-diagnostic-v1",
        authority: "diagnostic-only",
        execution_status: "failed",
        formal_acceptance: false,
        native_runtime: true,
        diagnostics,
      })}\n`);
      return;
    }
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
  androidNaturalViewport,
  androidVerticalScrollGesture,
  androidBuildInputFingerprint,
  androidAdbExecutable,
  androidCmakeStagingRoot,
  androidPersistentCacheRoot,
  androidGradleArguments,
  androidJavaScriptRootTypecheckArguments,
  androidAppReadyTestId,
  androidUiEvidenceTimeoutMs,
  controlInteractionKind,
  hasMinimumVisibleBounds,
  isAndroidBuildInputFile,
  isTransientAndroidScreenshotError,
  isTransientAndroidUiDumpError,
  retryTransientAndroidScreenshotOperation,
  retryTransientAndroidUiDumpOperation,
  iosSharedControlCarrier,
  nativeScenarioTestId,
  nativeStateContextTestId,
  nativeExpectedScenarioPopulation,
  nativeScenarioEvidenceKey,
  normalizeAndroidBuildInputContent,
  parseGfxinfoFrameDurations,
  parseAndroidLogBufferBytes,
  parseAndroidUiAutomatorDump,
  parseNodeBounds,
  pngDifferenceMetrics,
  readAndroidBuildCache,
  stableRepositoryRoot,
  hash as stableEvidenceHash,
  semanticNodeValue,
  transientAndroidSystemUiRecoveryTap,
  validatePageControlLayerOrder,
  validatePrimaryNavigationState,
  writeDesignFailureArtifact,
  writeAndroidBuildCache,
  xmlAttributes,
};
