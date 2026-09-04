import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Redis from "ioredis";
import automator from "miniprogram-automator";
import pg from "pg";
import { tsImport } from "tsx/esm/api";
import { dockerComposeInvocation } from "./docker-compose-runtime.mjs";
import { knownWechatToolchainConsoleErrorId } from "./runtime-event-policy.mjs";

const { Client } = pg;

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const cliArgs = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--") || value === undefined)
    throw new Error(`invalid_native_acceptance_argument:${key ?? "missing"}`);
  cliArgs.set(key, value);
}
const acceptanceScope = cliArgs.get("--scope") ?? "current-candidate";
const acceptanceMode = cliArgs.get("--mode") ?? "success";
const platformSimulation = acceptanceScope === "platform-simulation";
const acceptanceDevice = cliArgs.get("--device") ?? null;
const acceptanceTextSize = cliArgs.has("--text-size")
  ? Number(cliArgs.get("--text-size"))
  : null;
if (
  ![
    "map-experience",
    "full-sky",
    "my-profile-settings",
    "contribution",
    "platform-simulation",
    "current-candidate",
  ].includes(acceptanceScope)
)
  throw new Error(`unknown_native_acceptance_scope:${acceptanceScope}`);
if (!["success", "degradation"].includes(acceptanceMode))
  throw new Error(`unknown_native_acceptance_mode:${acceptanceMode}`);
if (platformSimulation && acceptanceMode !== "success")
  throw new Error("platform_simulation_requires_success_mode");
if (
  acceptanceTextSize !== null &&
  ![15, 16, 17, 19, 23, 26].includes(acceptanceTextSize)
)
  throw new Error(`unknown_native_acceptance_text_size:${acceptanceTextSize}`);
const cliPath = "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat";
const devtoolsExecutable =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\微信开发者工具.exe";
const devtoolsCliEntry =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\resources\\app.asar.unpacked\\js\\common\\cli\\index.js";
const devtoolsCliBootstrap =
  "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";
const sourceProjectPath = path.join(root, "apps", "wechat-miniapp");
const installationStorageKey = "starward.wechat-miniapp.installation.current";
const canonicalWorkspaceRoot = path.resolve("E:\\Dev\\Starward");
const wechatFinalGateTempRoot = path.resolve("E:\\Dev\\.starward-tmp");
const wechatProcessTemp = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "Temp")
  : null;
const appStateStorageKey = "starward.wechat-miniapp.state.current";
const requestDiagnosticStorageKey =
  "starward.acceptance.request-diagnostics.v1";
const acceptanceBootstrapState = JSON.parse(
  await readFile(
    path.join(
      root,
      "apps",
      "wechat-miniapp",
      "src",
      "state",
      "acceptance-bootstrap.json",
    ),
    "utf8",
  ),
);
const nightChinaImportCorpus = JSON.parse(
  await readFile(
    path.join(
      root,
      "tools",
      "miniapp",
      "fixtures",
      "nightchina-import-cases.json",
    ),
    "utf8",
  ),
);
if (
  nightChinaImportCorpus.schemaVersion !==
    "starward-nightchina-import-cases-v1" ||
  !Array.isArray(nightChinaImportCorpus.cases) ||
  nightChinaImportCorpus.cases.length !== 10
)
  throw new Error("nightchina_import_corpus_invalid");
const nightChinaCatalogAssociationCase = nightChinaImportCorpus.cases.find(
  (item) => item.expectedAssociation.kind === "existing_formal_spot",
);
if (
  !nightChinaCatalogAssociationCase?.expectedAssociation.spotId ||
  !nightChinaCatalogAssociationCase.expectedAssociation.spotName
)
  throw new Error("nightchina_formal_association_case_missing");
const { TEST_SPOTS: catalogSpots } = await tsImport(
  new URL("../../packages/miniapp-contracts/src/catalog.ts", import.meta.url).href,
  import.meta.url,
);
const nightChinaCatalogSpot = catalogSpots.find(
  (spot) =>
    spot.spotId ===
    nightChinaCatalogAssociationCase.expectedAssociation.spotId,
);
if (
  !nightChinaCatalogSpot ||
  nightChinaCatalogSpot.name !==
    nightChinaCatalogAssociationCase.expectedAssociation.spotName
)
  throw new Error("nightchina_formal_association_catalog_mismatch");
const wechatAutomationPort = 9420;
const wechatIdeHttpPort = 23977;
const wechatAcceptanceSdkVersion = "3.17.1";
const devtoolsPortStableWindowMs = 5_000;
const nativeAcceptanceBaseEnvironment = Object.freeze({
  MINIAPP_RELEASE_PROFILE: "LOCAL",
  MINIAPP_STORAGE_MODE: "postgres",
  MINIAPP_AUTH_MODE: "LOCAL_TEST",
  MINIAPP_ACCEPTANCE_DIAGNOSTICS: "1",
  MINIAPP_MEDIA_STORAGE_MODE: "LOCAL_FILESYSTEM",
  MINIAPP_AUTO_MIGRATE: "1",
});
const nativeComposePath = path.join(
  root,
  "infra",
  "miniapp",
  "docker-compose.yml",
);
const nativePostgresAdminUrl =
  "postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/starward_miniapp";
const nativeRedisUrl = "redis://127.0.0.1:56379";
const currentEvidencePath = path.join(
  root,
  "artifacts",
  "miniapp",
  "native",
  "wechat-devtools-session.json",
);
const candidateRoots = [
  "DESIGN.md",
  "package.json",
  "package-lock.json",
  "apps/wechat-miniapp/package.json",
  "apps/wechat-miniapp/project.config.json",
  "apps/wechat-miniapp/config",
  "apps/wechat-miniapp/src",
  "packages/miniapp-contracts/package.json",
  "packages/miniapp-contracts/src",
  "workers/miniapp-api/package.json",
  "workers/miniapp-api/src",
  "project_context/development-workflow.md",
  "project_context/areas/main/verification/acceptance-runtime.md",
  "project_context/areas/main/implementation-index.md",
  "tools/miniapp/generate-mode-icons.mjs",
  "tools/miniapp/generate-semantic-assets.mjs",
  "tools/miniapp/selected-design-bindings.json",
  "tools/miniapp/verify-selected-design-bindings.mjs",
  "tools/miniapp/run-wechat-devtools-session.mjs",
  "tools/miniapp/runtime-event-policy.mjs",
  "tools/miniapp/workflow-conformance.test.mjs",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function runtimeEventJson(value) {
  const seen = new WeakSet();
  return JSON.stringify(value ?? null, (_key, entry) => {
    if (typeof entry === "bigint") return entry.toString();
    if (!entry || typeof entry !== "object") return entry;
    const errorLike =
      entry instanceof Error ||
      Object.prototype.toString.call(entry) === "[object Error]" ||
      (typeof entry.name === "string" &&
        typeof entry.message === "string" &&
        Object.keys(entry).length === 0);
    if (errorLike)
      return {
        name: String(entry.name || "Error"),
        message: String(entry.message || entry),
        ...(entry.code === undefined ? {} : { code: String(entry.code) }),
        stack_sha256: sha256(String(entry.stack ?? "")),
      };
    if (seen.has(entry)) return "[circular]";
    seen.add(entry);
    return entry;
  });
}

function safeRuntimeExcerpt(value) {
  return runtimeEventJson(value)
    .replace(
      /("(?:authorization|cookie|token|secret|password|openid|session_key|appid)"\s*:\s*)"[^"]*"/giu,
      '$1"[redacted]"',
    )
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/giu, "Bearer [redacted]")
    .replace(/https?:\/\/[^\s"']+/giu, "[url]")
    .slice(0, 800);
}

function safeToolDiagnosticExcerpt(value) {
  const scrubbed = String(value ?? "")
    .replace(
      /((?:authorization|cookie|token|secret|password|openid|session_key|appid)\s*[=:]\s*)[^\s,;]+/giu,
      "$1[redacted]",
    )
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/giu, "Bearer [redacted]")
    .replace(/\bwx[a-z0-9]{16}\b/giu, "[appid]")
    .replace(/[A-Za-z]:\\[^\r\n"'<>]*/gu, "[path]");
  return safeRuntimeExcerpt(scrubbed);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

async function applyWechatSimulatorPreferences(deviceName, textSize) {
  if (!deviceName && textSize === null)
    return {
      files: [],
      evidence: { status: "not_required" },
    };
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData)
    throw new Error("wechat_simulator_preferences_localappdata_missing");
  const userDataRoot = path.join(localAppData, "微信开发者工具", "User Data");
  const profiles = await readdir(userDataRoot, { withFileTypes: true });
  const originals = [];
  const applied = [];
  try {
    for (const profile of profiles) {
      if (!profile.isDirectory()) continue;
      const localDataRoot = path.join(
        userDataRoot,
        profile.name,
        "WeappLocalData",
      );
      let entries;
      try {
        entries = await readdir(localDataRoot, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (
          !entry.isFile() ||
          !entry.name.startsWith("localstorage_") ||
          !entry.name.endsWith(".json")
        )
          continue;
        const file = path.join(localDataRoot, entry.name);
        const original = await readFile(file, "utf8");
        let data;
        try {
          data = JSON.parse(original);
        } catch {
          continue;
        }
        if (!data?.deviceInfo || !Array.isArray(data?.device?.list)) continue;
        const selectedDeviceIndex = deviceName
          ? data.device.list.findIndex((item) => item?.name === deviceName)
          : -1;
        const selectedDevice =
          selectedDeviceIndex >= 0
            ? data.device.list[selectedDeviceIndex]
            : null;
        if (deviceName && !selectedDevice) continue;
        const next = structuredClone(data);
        if (selectedDevice) {
          next.device.current = selectedDeviceIndex;
          next.deviceInfo = structuredClone(selectedDevice.info);
        }
        if (textSize !== null) {
          const allowedTextSizes = next?.textSize?.list?.map(
            (item) => item.size,
          );
          if (!allowedTextSizes?.includes(textSize))
            throw new Error(
              `wechat_simulator_text_size_not_supported:${textSize}`,
            );
          next.textSize.current = textSize;
        }
        const nextBytes = JSON.stringify(next);
        originals.push({ file, bytes: original });
        await writeFile(file, nextBytes, "utf8");
        applied.push({
          original_sha256: sha256(original),
          applied_sha256: sha256(nextBytes),
          model: next.deviceInfo.model,
          screen_width: next.deviceInfo.screenWidth,
          screen_height: next.deviceInfo.screenHeight,
          text_size: next.textSize.current,
        });
      }
    }
    if (applied.length === 0)
      throw new Error("wechat_simulator_preferences_carrier_missing");
    return {
      files: originals,
      evidence: {
        status: "applied",
        carrier_count: applied.length,
        requested_device: deviceName,
        requested_text_size: textSize,
        carriers_sha256: sha256(canonical(applied)),
        observed_preferences: [
          ...new Map(
            applied.map((item) => [
              canonical({
                model: item.model,
                screen_width: item.screen_width,
                screen_height: item.screen_height,
                text_size: item.text_size,
              }),
              {
                model: item.model,
                screen_width: item.screen_width,
                screen_height: item.screen_height,
                text_size: item.text_size,
              },
            ]),
          ).values(),
        ],
      },
    };
  } catch (error) {
    for (const entry of originals.reverse())
      await writeFile(entry.file, entry.bytes, "utf8").catch(() => {});
    throw error;
  }
}

async function restoreWechatSimulatorPreferences(session) {
  if (!session || session.files.length === 0) return { status: "not_required" };
  const restored = [];
  for (const entry of session.files) {
    await writeFile(entry.file, entry.bytes, "utf8");
    const bytes = await readFile(entry.file, "utf8");
    restored.push({
      expected_sha256: sha256(entry.bytes),
      restored_sha256: sha256(bytes),
      exact: bytes === entry.bytes,
    });
  }
  return {
    status: restored.every((entry) => entry.exact) ? "passed" : "failed",
    carrier_count: restored.length,
    carriers_sha256: sha256(canonical(restored)),
  };
}

function repositoryPath(relative) {
  const resolved = path.resolve(
    root,
    ...relative.replaceAll("\\", "/").split("/"),
  );
  const normalizedRoot = root.toLowerCase();
  const normalized = resolved.toLowerCase();
  if (
    normalized !== normalizedRoot &&
    !normalized.startsWith(`${normalizedRoot}${path.sep}`)
  )
    throw new Error(`path_outside_repository:${relative}`);
  return resolved;
}

async function listFiles(relative) {
  const absolute = repositoryPath(relative);
  const info = await stat(absolute).catch(() => null);
  if (!info) return [];
  if (info.isFile()) return [relative.replaceAll("\\", "/")];
  const rows = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const next = path.join(directory, entry.name);
      const repoRelative = path.relative(root, next).replaceAll("\\", "/");
      if (
        repoRelative.includes("/node_modules/") ||
        repoRelative.includes("/dist/") ||
        repoRelative.includes("/test-results/") ||
        repoRelative.endsWith("/authority/delivery-carrier.json")
      )
        continue;
      if (entry.isDirectory()) await visit(next);
      else if (entry.isFile()) rows.push(repoRelative);
    }
  }
  await visit(absolute);
  return rows;
}

async function candidateSnapshot() {
  const files = [];
  for (const candidateRoot of candidateRoots)
    files.push(...(await listFiles(candidateRoot)));
  const hashes = {};
  for (const file of [...new Set(files)].sort())
    hashes[file] = sha256(await readFile(repositoryPath(file)));
  return { files: hashes, sha256: sha256(canonical(hashes)) };
}

async function directorySnapshot(directory) {
  const files = {};
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile())
        files[path.relative(directory, absolute).replaceAll("\\", "/")] =
          sha256(await readFile(absolute));
    }
  }
  await visit(directory);
  return {
    file_count: Object.keys(files).length,
    files_sha256: sha256(canonical(files)),
  };
}

async function writeJson(absolute, value) {
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readOptionalFile(absolute) {
  try {
    return await readFile(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function normalizeWindowsPath(value) {
  return path
    .resolve(value)
    .replace(/^\\\\\?\\/u, "")
    .replaceAll("/", "\\")
    .replace(/\\+$/u, "")
    .toLowerCase();
}

function isPathWithin(base, candidate) {
  return candidate === base || candidate.startsWith(`${base}\\`);
}

async function verifyWechatSnapshotLocation() {
  if (process.platform !== "win32")
    throw new Error("wechat_snapshot_location_requires_windows");
  const requestedRoot = normalizeWindowsPath(root);
  const physicalRoot = normalizeWindowsPath(await realpath(root));
  if (requestedRoot !== physicalRoot)
    throw new Error("wechat_snapshot_location_must_be_physical");
  const canonicalRoot = normalizeWindowsPath(canonicalWorkspaceRoot);
  const finalGateTempRoot = normalizeWindowsPath(wechatFinalGateTempRoot);
  const canonical = requestedRoot === canonicalRoot;
  if (!canonical) {
    const temp = process.env.TEMP
      ? normalizeWindowsPath(process.env.TEMP)
      : null;
    const tmp = process.env.TMP ? normalizeWindowsPath(process.env.TMP) : null;
    if (
      !temp ||
      temp !== tmp ||
      !isPathWithin(finalGateTempRoot, temp) ||
      path.dirname(temp) !== finalGateTempRoot ||
      !/^run-[0-9a-f]{12}$/u.test(path.basename(temp))
    )
      throw new Error("wechat_snapshot_temp_environment_mismatch");
    const physicalTemp = normalizeWindowsPath(await realpath(process.env.TEMP));
    if (physicalTemp !== temp)
      throw new Error("wechat_snapshot_temp_root_must_be_physical");
    if (!isPathWithin(temp, requestedRoot))
      throw new Error("wechat_snapshot_location_outside_supported_root");
    const relative = path.relative(process.env.TEMP, root);
    const firstSegment = relative.split(/[\\/]/u)[0];
    if (!firstSegment?.startsWith("ty-context-"))
      throw new Error("wechat_snapshot_not_harness_owned");
  }
  return {
    status: "passed",
    mode: canonical ? "canonical_workspace" : "isolated_harness_snapshot",
    direct_physical_path: true,
    root_path_sha256: sha256(requestedRoot),
    physical_path_sha256: sha256(physicalRoot),
    final_gate_temp_root_sha256: sha256(finalGateTempRoot),
  };
}

async function verifyWechatProcessEnvironment() {
  if (!wechatProcessTemp)
    throw new Error("wechat_process_temp_environment_missing");
  const info = await stat(wechatProcessTemp).catch(() => null);
  if (!info?.isDirectory())
    throw new Error("wechat_process_temp_environment_not_directory");
  const requested = normalizeWindowsPath(wechatProcessTemp);
  const physical = normalizeWindowsPath(await realpath(wechatProcessTemp));
  if (requested !== physical)
    throw new Error("wechat_process_temp_environment_must_be_physical");
  if (isPathWithin(normalizeWindowsPath(wechatFinalGateTempRoot), physical))
    throw new Error(
      "wechat_process_temp_must_be_outside_harness_snapshot_root",
    );
  return {
    status: "passed",
    kind: "system user temporary directory isolated from Harness snapshots",
    path_sha256: sha256(physical),
  };
}

function wechatToolEnvironment() {
  return {
    ...process.env,
    ...(wechatProcessTemp
      ? { TEMP: wechatProcessTemp, TMP: wechatProcessTemp }
      : {}),
  };
}

async function prepareWechatProjectIdentity(candidateSha256, projectPath) {
  const publicConfigPath = path.join(projectPath, "project.config.json");
  const originalPublicBytes = await readFile(publicConfigPath);
  let originalPublicConfig;
  try {
    originalPublicConfig = JSON.parse(originalPublicBytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      `wechat_public_project_config_invalid:${sha256(String(error?.message ?? error))}`,
    );
  }
  if (
    !originalPublicConfig ||
    Array.isArray(originalPublicConfig) ||
    typeof originalPublicConfig !== "object"
  )
    throw new Error("wechat_public_project_config_not_object");
  const privateConfigPath = path.join(
    projectPath,
    "project.private.config.json",
  );
  const originalBytes = await readOptionalFile(privateConfigPath);
  let original = {};
  if (originalBytes) {
    try {
      original = JSON.parse(originalBytes.toString("utf8"));
    } catch (error) {
      throw new Error(
        `wechat_private_project_config_invalid:${sha256(String(error?.message ?? error))}`,
      );
    }
    if (!original || Array.isArray(original) || typeof original !== "object")
      throw new Error("wechat_private_project_config_not_object");
  }
  // DevTools trust is a machine-local property of a physical project, not of
  // one source revision. A candidate-derived name creates a new untrusted
  // project after every verifier edit and can suppress subpackage navigation
  // before automator observes any product journey. Candidate identity remains
  // independently bound by the before/after source and bundle fingerprints.
  const projectName = `starward-native-validation-${sha256(
    `${normalizeWindowsPath(projectPath)}\0${String(originalPublicConfig.appid ?? "")}`,
  ).slice(0, 16)}`;
  const appliedBytes = Buffer.from(
    `${JSON.stringify(
      {
        ...original,
        projectname: projectName,
        libVersion: wechatAcceptanceSdkVersion,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(privateConfigPath, appliedBytes);
  const readback = await readFile(privateConfigPath);
  if (sha256(readback) !== sha256(appliedBytes))
    throw new Error("wechat_private_project_config_write_mismatch");
  return {
    publicConfigPath,
    originalPublicBytes,
    originalPublicCanonical: canonical(originalPublicConfig),
    privateConfigPath,
    originalBytes,
    appliedBytes,
    evidence: {
      status: "prepared",
      path: "apps/wechat-miniapp/project.private.config.json",
      scope: "machine-local formal-session override",
      project_name_sha256: sha256(projectName),
      base_library_version: wechatAcceptanceSdkVersion,
      original_exists: originalBytes !== null,
      original_sha256: originalBytes ? sha256(originalBytes) : null,
      applied_sha256: sha256(appliedBytes),
      public_config_original_sha256: sha256(originalPublicBytes),
      restoration_required: true,
    },
  };
}

async function restoreWechatPublicProjectConfig(session) {
  if (!session)
    return {
      status: "not_required",
      restored_original: false,
    };
  const currentBytes = await readFile(session.publicConfigPath);
  const currentSha256 = sha256(currentBytes);
  const originalSha256 = sha256(session.originalPublicBytes);
  let formattingNormalizationDetected = false;
  if (currentSha256 !== originalSha256) {
    let currentConfig;
    try {
      currentConfig = JSON.parse(currentBytes.toString("utf8"));
    } catch (error) {
      return {
        status: "failed",
        reason: "public_config_current_bytes_invalid",
        diagnostic_sha256: sha256(String(error?.message ?? error)),
        current_sha256: currentSha256,
        original_sha256: originalSha256,
      };
    }
    if (canonical(currentConfig) !== session.originalPublicCanonical)
      return {
        status: "failed",
        reason: "public_config_semantic_ownership_lost",
        current_sha256: currentSha256,
        original_sha256: originalSha256,
      };
    formattingNormalizationDetected = true;
    await writeFile(session.publicConfigPath, session.originalPublicBytes);
  }
  const restoredBytes = await readFile(session.publicConfigPath);
  const restoredSha256 = sha256(restoredBytes);
  return {
    status: restoredSha256 === originalSha256 ? "passed" : "failed",
    restored_original: restoredSha256 === originalSha256,
    formatting_normalization_detected: formattingNormalizationDetected,
    original_sha256: originalSha256,
    restored_sha256: restoredSha256,
  };
}

async function restoreWechatProjectIdentity(session) {
  if (!session)
    return {
      status: "not_required",
      restored_original: false,
    };
  const publicConfig = await restoreWechatPublicProjectConfig(session).catch(
    (error) => ({
      status: "failed",
      reason: "public_config_restore_exception",
      diagnostic_sha256: sha256(String(error?.message ?? error)),
    }),
  );
  const currentBytes = await readOptionalFile(session.privateConfigPath);
  const currentSha256 = currentBytes ? sha256(currentBytes) : null;
  const originalSha256 = session.originalBytes
    ? sha256(session.originalBytes)
    : null;
  const appliedSha256 = sha256(session.appliedBytes);
  const alreadyRestored = currentSha256 === originalSha256;
  let formattingNormalizationDetected = false;
  if (!alreadyRestored && currentSha256 !== appliedSha256) {
    let currentConfig;
    let appliedConfig;
    try {
      currentConfig = JSON.parse(currentBytes?.toString("utf8") ?? "null");
      appliedConfig = JSON.parse(session.appliedBytes.toString("utf8"));
    } catch (error) {
      return {
        status: "failed",
        reason: "private_config_current_bytes_invalid",
        diagnostic_sha256: sha256(String(error?.message ?? error)),
        current_sha256: currentSha256,
        applied_sha256: appliedSha256,
        original_sha256: originalSha256,
        public_config: publicConfig,
      };
    }
    if (canonical(currentConfig) !== canonical(appliedConfig))
      return {
        status: "failed",
        reason: "private_config_semantic_ownership_lost",
        current_sha256: currentSha256,
        applied_sha256: appliedSha256,
        original_sha256: originalSha256,
        public_config: publicConfig,
      };
    formattingNormalizationDetected = true;
  }
  if (!alreadyRestored) {
    if (session.originalBytes)
      await writeFile(session.privateConfigPath, session.originalBytes);
    else await rm(session.privateConfigPath, { force: true });
  }
  const restoredBytes = await readOptionalFile(session.privateConfigPath);
  const restoredSha256 = restoredBytes ? sha256(restoredBytes) : null;
  const privateRestored = restoredSha256 === originalSha256;
  return {
    status:
      privateRestored && publicConfig.status === "passed" ? "passed" : "failed",
    restored_original: privateRestored,
    formatting_normalization_detected: formattingNormalizationDetected,
    original_exists: session.originalBytes !== null,
    original_sha256: originalSha256,
    restored_sha256: restoredSha256,
    public_config: publicConfig,
  };
}

function watcherProjectPath(commandLine) {
  const match = String(commandLine ?? "").match(
    /wxfilewatcher_x64\.exe"?\s+(?:"([^"]+)"|(.+))$/iu,
  );
  return match ? String(match[1] ?? match[2]).trim() : null;
}

function observeWechatWatcherProjects() {
  const observation = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; $rows=@(Get-CimInstance Win32_Process -Filter \"Name='wxfilewatcher_x64.exe'\" | ForEach-Object { $_.CommandLine }); ConvertTo-Json -Compress -InputObject $rows",
    ],
    {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (observation.status !== 0)
    throw new Error(
      `wechat_watcher_observation_failed:${observation.status}:${sha256(
        `${observation.stdout ?? ""}\n${observation.stderr ?? ""}\n${observation.error?.message ?? ""}`,
      )}`,
    );
  let commandLines;
  try {
    commandLines = JSON.parse(
      String(observation.stdout ?? "[]").trim() || "[]",
    );
  } catch (error) {
    throw new Error(
      `wechat_watcher_observation_invalid:${sha256(String(error?.message ?? error))}`,
    );
  }
  if (!Array.isArray(commandLines)) commandLines = [commandLines];
  const projects = commandLines
    .map(watcherProjectPath)
    .filter(Boolean)
    .map(normalizeWindowsPath);
  return {
    processCount: commandLines.length,
    projects,
  };
}

function observeWechatIdeInstances() {
  const observation = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; $rows=@(Get-CimInstance Win32_Process -Filter \"Name='微信开发者工具.exe'\" | Where-Object { $_.CommandLine -match '(?:^|\\s)--cli(?:\\s|$)' } | Select-Object ProcessId,CommandLine); ConvertTo-Json -Compress -InputObject $rows",
    ],
    {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (observation.status !== 0)
    throw new Error(
      `wechat_ide_observation_failed:${observation.status}:${sha256(
        `${observation.stdout ?? ""}\n${observation.stderr ?? ""}\n${observation.error?.message ?? ""}`,
      )}`,
    );
  let commandLines;
  try {
    commandLines = JSON.parse(
      String(observation.stdout ?? "[]").trim() || "[]",
    );
  } catch (error) {
    throw new Error(
      `wechat_ide_observation_invalid:${sha256(String(error?.message ?? error))}`,
    );
  }
  if (!Array.isArray(commandLines)) commandLines = [commandLines];
  const rows = commandLines.map((row) => ({
    pid: Number(row?.ProcessId),
    commandLine: String(row?.CommandLine ?? ""),
  }));
  if (rows.some((row) => !Number.isInteger(row.pid) || row.pid <= 0))
    throw new Error(
      `wechat_ide_process_identity_invalid:${sha256(canonical(commandLines))}`,
    );
  const callbackPortReadings = rows.map(({ commandLine }) => {
    const match = /--remote-port(?:=|\s+)["']?(\d{2,5})/iu.exec(
      String(commandLine ?? ""),
    );
    return match ? Number(match[1]) : null;
  });
  const callbackPorts = callbackPortReadings.filter(Number.isInteger);
  const ideHttpPorts = rows
    .map(({ commandLine }) => {
      const match = /--ide-http-port(?:=|\s+)["']?(\d{2,5})/iu.exec(
        commandLine,
      );
      return match ? Number(match[1]) : null;
    })
    .filter(Number.isInteger);
  return {
    processCount: rows.length,
    processIds: rows.map((row) => row.pid),
    unreadableCallbackPortCount:
      callbackPortReadings.length - callbackPorts.length,
    callbackPorts: [...new Set(callbackPorts)].sort(
      (left, right) => left - right,
    ),
    ideHttpPorts: [...new Set(ideHttpPorts)].sort(
      (left, right) => left - right,
    ),
  };
}

function forceStopWechatIdeInstances(observation) {
  const processIds = [...new Set(observation.processIds ?? [])].sort(
    (left, right) => left - right,
  );
  const failures = [];
  for (const processId of processIds) {
    const stopped = spawnSync(
      "taskkill.exe",
      ["/PID", String(processId), "/T", "/F"],
      {
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
      },
    );
    if (stopped.status !== 0)
      failures.push({
        process_id: processId,
        process_id_sha256: sha256(String(processId)),
        status: stopped.status,
        diagnostic_sha256: sha256(
          `${stopped.stdout ?? ""}\n${stopped.stderr ?? ""}\n${stopped.error?.message ?? ""}`,
        ),
      });
  }
  let naturallyExitedDuringStopCount = 0;
  if (failures.length > 0) {
    const remaining = new Set(observeWechatIdeInstances().processIds);
    const materialFailures = failures.filter((failure) =>
      remaining.has(failure.process_id),
    );
    naturallyExitedDuringStopCount = failures.length - materialFailures.length;
    if (materialFailures.length > 0)
      throw new Error(
        `wechat_ide_process_tree_stop_failed:${sha256(
          canonical(
            materialFailures.map(
              ({ process_id: _processId, ...failure }) => failure,
            ),
          ),
        )}`,
      );
  }
  return {
    status: "passed",
    stopped_root_count: processIds.length,
    stopped_process_ids_sha256: sha256(canonical(processIds)),
    naturally_exited_during_stop_count: naturallyExitedDuringStopCount,
  };
}

async function waitForWechatProjectBinding(projectPath, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  const expected = normalizeWindowsPath(projectPath);
  let lastObservation = { processCount: 0, projects: [] };
  while (Date.now() < deadline) {
    lastObservation = observeWechatWatcherProjects();
    const everyWatcherTargetsCandidate =
      lastObservation.processCount > 0 &&
      lastObservation.projects.length === lastObservation.processCount &&
      lastObservation.projects.every((project) => project === expected);
    if (everyWatcherTargetsCandidate)
      return {
        status: "passed",
        observer: "Win32_Process wxfilewatcher_x64.exe command line",
        expected_project_root: "apps/wechat-miniapp",
        expected_project_path_sha256: sha256(expected),
        observed_process_count: lastObservation.processCount,
        observed_project_path_sha256s: lastObservation.projects.map(sha256),
        observed_path_mode: "direct_physical_candidate",
      };
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const diagnostic = {
    expected_project_path_sha256: sha256(expected),
    observed_process_count: lastObservation.processCount,
    parsed_project_count: lastObservation.projects.length,
    observed_project_path_sha256s: lastObservation.projects.map(sha256),
    every_watcher_targets_candidate:
      lastObservation.processCount > 0 &&
      lastObservation.projects.length === lastObservation.processCount &&
      lastObservation.projects.every((project) => project === expected),
  };
  const error = new Error(
    `wechat_devtools_project_binding_mismatch:${sha256(canonical(diagnostic))}`,
  );
  error.projectPathBinding = diagnostic;
  throw error;
}

async function refreshWechatProjectConfig(projectPath, delayMs = 3_000) {
  const normalizedProject = normalizeWindowsPath(projectPath);
  const normalizedRoot = normalizeWindowsPath(root);
  if (!isPathWithin(normalizedRoot, normalizedProject))
    throw new Error("wechat_project_config_refresh_outside_candidate");
  const configPath = path.join(projectPath, "project.config.json");
  const configInfo = await stat(configPath).catch(() => null);
  if (!configInfo?.isFile())
    throw new Error("wechat_project_config_refresh_source_missing");
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const before = await readFile(configPath);
  const beforeSha256 = sha256(before);
  await writeFile(configPath, before);
  const after = await readFile(configPath);
  const afterSha256 = sha256(after);
  if (!before.equals(after) || beforeSha256 !== afterSha256)
    throw new Error("wechat_project_config_refresh_changed_candidate_bytes");
  return {
    status: "passed",
    method: "same-bytes project.config.json rewrite after watcher binding",
    purpose:
      "trigger the WeChat DevTools supported dynamic project-config reload for a newly materialized physical snapshot",
    delay_after_watcher_binding_ms: delayMs,
    content_unchanged: true,
    content_sha256: beforeSha256,
    byte_length: before.length,
  };
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`service_start_timeout:${url}`);
}

async function assertPortFree(url) {
  try {
    const response = await fetch(url);
    if (response.ok)
      throw new Error(`formal_session_port_already_in_use:${url}`);
  } catch (error) {
    if (
      String(error?.message ?? error).startsWith(
        "formal_session_port_already_in_use",
      )
    )
      throw error;
  }
}

async function availableLoopbackPort() {
  const server = createServer();
  server.unref();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("native_acceptance_port_unavailable");
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

function runNativeCompose(args) {
  const invocation = dockerComposeInvocation([
    "-f",
    nativeComposePath,
    ...args,
  ]);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(
      `native_infrastructure_compose_failed:${result.status}:${sha256(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)}`,
    );
}

async function prepareNativeInfrastructure(runId) {
  runNativeCompose(["up", "-d", "--wait"]);
  const suffix = sha256(runId).slice(0, 16);
  const databaseName = `starward_native_${suffix}`;
  if (!/^starward_native_[a-f0-9]{16}$/u.test(databaseName))
    throw new Error("native_database_name_invalid");
  const admin = new Client({ connectionString: nativePostgresAdminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const redis = new Redis(nativeRedisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectionName: `starward-native-${suffix}`,
  });
  await redis.connect();
  const databaseUrl = `postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/${databaseName}`;
  const cachePrefix = `starward:miniapp:native:${suffix}:`;
  const adminToken = randomUUID();
  const environment = Object.freeze({
    ...nativeAcceptanceBaseEnvironment,
    DATABASE_URL: databaseUrl,
    REDIS_URL: nativeRedisUrl,
    MINIAPP_CACHE_PREFIX: cachePrefix,
    MINIAPP_QUEUE_NAME: `starward-miniapp-native-${suffix}`,
    MINIAPP_ADMIN_TOKEN: adminToken,
    MINIAPP_ADMIN_RBAC: JSON.stringify({
      "admin:native-acceptance": ["OWNER"],
    }),
    MINIAPP_SESSION_SECRET: `native-acceptance-${suffix}-session-secret-current`,
  });
  return {
    databaseName,
    databaseUrl,
    cachePrefix,
    adminToken,
    admin,
    redis,
    environment,
  };
}

async function cleanupNativeInfrastructure(infrastructure) {
  if (!infrastructure) return { status: "passed", disposition: "not_started" };
  const failures = [];
  try {
    let cursor = "0";
    do {
      const [next, keys] = await infrastructure.redis.scan(
        cursor,
        "MATCH",
        `${infrastructure.cachePrefix}*`,
        "COUNT",
        200,
      );
      cursor = next;
      if (keys.length) await infrastructure.redis.del(...keys);
    } while (cursor !== "0");
  } catch (error) {
    failures.push(`redis:${String(error?.message ?? error)}`);
  }
  await infrastructure.redis.quit().catch((error) => {
    failures.push(`redis-close:${String(error?.message ?? error)}`);
  });
  try {
    await infrastructure.admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [infrastructure.databaseName],
    );
    await infrastructure.admin.query(
      `DROP DATABASE IF EXISTS "${infrastructure.databaseName}"`,
    );
  } catch (error) {
    failures.push(`postgres:${String(error?.message ?? error)}`);
  }
  await infrastructure.admin.end().catch((error) => {
    failures.push(`postgres-close:${String(error?.message ?? error)}`);
  });
  return failures.length
    ? {
        status: "failed",
        failure_count: failures.length,
        failures_sha256: sha256(failures.join("\n")),
      }
    : {
        status: "passed",
        database_dropped: true,
        redis_namespace_removed: true,
      };
}

async function adminRequest(base, infrastructure, pathname, options = {}) {
  const response = await fetch(base + pathname, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-admin-token": infrastructure.adminToken,
      "x-admin-actor": "admin:native-acceptance",
      ...(options.idempotencyKey
        ? { "idempotency-key": options.idempotencyKey }
        : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      `native_admin_request_failed:${response.status}:${pathname}:${sha256(JSON.stringify(payload))}`,
    );
  return payload?.data;
}

async function productionUserRequest(base, pathname, options = {}) {
  const response = await fetch(base + pathname, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.accessToken
        ? { authorization: `Bearer ${options.accessToken}` }
        : {}),
      ...(options.idempotencyKey
        ? { "idempotency-key": options.idempotencyKey }
        : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      `native_user_request_failed:${response.status}:${pathname}:${sha256(JSON.stringify(payload))}`,
    );
  return payload?.data;
}

async function prepareNativePendingUpload({
  miniProgram,
  apiPort,
  spotId,
  runId,
}) {
  const myPage = await switchTabAndWait(
    miniProgram,
    "upload-recovery-identity-entry",
    "/pages/my/index",
    "pages/my/index",
  );
  if (!myPage) throw new Error("native_upload_recovery_identity_entry_failed");
  const currentMyPage = myPage;
  await waitForSelector(currentMyPage, ".my-page", 1);
  await waitForSelector(currentMyPage, ".routine-entry--contribution", 1);
  const installationIdentity = await miniProgram
    .callWxMethod("getStorageSync", installationStorageKey)
    .catch(() => "");
  if (
    typeof installationIdentity !== "string" ||
    !installationIdentity.startsWith("local:") ||
    installationIdentity.length < 22
  )
    throw new Error("native_upload_recovery_installation_identity_missing");

  const base = `http://127.0.0.1:${apiPort}`;
  const suffix = sha256(`${runId}:${installationIdentity}`).slice(0, 12);
  const session = await productionUserRequest(base, "/v2/auth/wechat/login", {
    method: "POST",
    body: JSON.stringify({ code: installationIdentity }),
  });
  if (!session?.accessToken || !session?.userId)
    throw new Error("native_upload_recovery_session_missing");
  const draft = await productionUserRequest(base, "/v2/me/contributions", {
    method: "POST",
    accessToken: session.accessToken,
    idempotencyKey: `native-recovery-draft-${suffix}`,
    body: JSON.stringify({
      kind: "FIELD_REPORT",
      spotId,
      candidateLocation: null,
      observedAt: new Date().toISOString(),
      topics: ["NIGHT_SAFETY"],
      detail:
        "当前隔离原生验收通过正式投稿 API 保存的中断上传草稿；只验证恢复、身份隔离与提交门禁。",
      rightsConfirmed: true,
      preciseLocationConsent: false,
    }),
  });
  if (!draft?.submissionId || !Number.isInteger(draft?.revision))
    throw new Error("native_upload_recovery_draft_missing");
  const pending = await productionUserRequest(
    base,
    `/v2/me/contributions/${encodeURIComponent(draft.submissionId)}/media-uploads`,
    {
      method: "POST",
      accessToken: session.accessToken,
      idempotencyKey: `native-recovery-upload-${suffix}`,
      body: JSON.stringify({
        originalName: "interrupted-field-evidence.png",
        mimeType: "image/png",
        byteSize: 2048,
        expectedRevision: draft.revision,
      }),
    },
  );
  const pendingMedia = pending?.media?.find((item) => item.state === "PENDING");
  if (!pendingMedia?.uploadId)
    throw new Error("native_upload_recovery_pending_state_missing");

  const neutralPage = await retryIdempotentAutomatorOperation(
    "upload-recovery-cache-reset-route",
    () => miniProgram.reLaunch("/pages/auth/index"),
  );
  if (!neutralPage)
    throw new Error("native_upload_recovery_cache_reset_route_failed");
  await waitForSelector(
    await waitForCurrentPagePath(miniProgram, "pages/auth/index"),
    ".permission-page",
    1,
  );
  const reset = await miniProgram.evaluate(function () {
    return (
      globalThis.__STARWARD_MINIAPP_ACCEPTANCE__?.resetNetwork?.() ?? {
        status: "missing",
      }
    );
  });
  if (reset?.status !== "passed")
    throw new Error("native_upload_recovery_cache_reset_failed");
  return {
    status: "passed",
    preparation: "production_user_http_api",
    storage: "run-unique PostgreSQL/PostGIS",
    state: "PENDING",
    submission_id_sha256: sha256(draft.submissionId),
    upload_id_sha256: sha256(pendingMedia.uploadId),
    user_id_sha256: sha256(session.userId),
    fixture_injection: false,
    component_state_injection: false,
  };
}

async function prepareNativeFormalSpot(apiPort, infrastructure, runId) {
  const base = `http://127.0.0.1:${apiPort}`;
  const suffix = sha256(runId).slice(0, 12);
  const spotId = nightChinaCatalogSpot.spotId;
  const verifiedAt = new Date().toISOString();
  const identitySource = nightChinaCatalogSpot.source;
  const acceptanceSource = {
    id: `source:native-acceptance-${suffix}`,
    kind: "OFFICIAL_VERIFICATION",
    provider: "Starward 隔离原生验收",
    title: "当前候选正式点组件生产链路核验记录",
    sourceUrl: "",
    license: "Project-owned automated acceptance record",
    licenseUrl: "",
    publishedAt: verifiedAt,
    retrievedAt: verifiedAt,
    validFrom: verifiedAt,
    validTo: null,
    state: "FRESH",
    confidence: 1,
    precision:
      "只证明当前运行的数据门禁、持久化和交互；地点身份与坐标由独立 OSM Source 承担，本记录不陈述现实场地条件",
    limitations: [
      "运行结束即销毁的隔离验收记录",
      "设施、路线、光环境和安全字段仅为组件状态覆盖，不得用于现实出行判断",
    ],
  };
  await adminRequest(base, infrastructure, "/v2/admin/spots", {
    method: "POST",
    body: JSON.stringify({
      spotId,
      name: nightChinaCatalogSpot.name,
      region: nightChinaCatalogSpot.region,
      address: nightChinaCatalogSpot.address,
      timezone: nightChinaCatalogSpot.timezone,
      latitude: nightChinaCatalogSpot.wgs84.latitude,
      longitude: nightChinaCatalogSpot.wgs84.longitude,
      altitudeM: nightChinaCatalogSpot.altitudeM,
      visibilityPolicy: nightChinaCatalogSpot.visibilityPolicy,
      source: identitySource,
      reason:
        "以当前目录的真实 OSM 地点身份建立本次运行唯一、可销毁且不可进入生产发布的组件验收记录",
    }),
  });
  const facilityTypes = [
    "PARKING",
    "TOILET",
    "PLATFORM",
    "CHARGING",
    "CAMPING",
    "ROAD",
    "WALKING",
    "SIGNAL",
  ];
  const facilities = facilityTypes.map((type) => ({
    type,
    status: ["PARKING", "PLATFORM", "ROAD", "SIGNAL"].includes(type)
      ? "AVAILABLE"
      : "UNAVAILABLE",
    summary: ["PARKING", "PLATFORM", "ROAD", "SIGNAL"].includes(type)
      ? "本次验收记录为可用"
      : "本次验收记录为不可用",
    detail: `由当前运行的管理员生产接口写入并由 PostgreSQL 回读：${type}`,
    distanceM: type === "PARKING" ? 80 : null,
    openingHours: null,
    usageCondition: "只用于隔离验收，不构成现实出行依据",
    verifiedAt,
    confidence: 1,
    source: acceptanceSource,
  }));
  const claims = [
    "SPOT_COORDINATE",
    "ACCESS_LAST_ROAD",
    "ACCESS_PARKING",
    "ACCESS_OPENNESS",
    "ACCESS_LEGAL_ENTRY",
    "SAFETY_NIGHT",
    "HORIZON_PROFILE",
  ];
  await adminRequest(
    base,
    infrastructure,
    `/v2/admin/spots/${encodeURIComponent(spotId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        reason: "补齐本次隔离运行的完整度字段并触发服务端重新评估",
        lastVerifiedAt: verifiedAt,
        lightPollution: {
          levelAtMost: 4,
          productBand: "LOW",
          radiance: {
            median: 0.8,
            p10: 0.5,
            p90: 1.2,
            unit: "nW/cm²/sr",
          },
          minimumCloudFreeObservations: 12,
          calibratedSkyClass: false,
          label: "隔离验收低光带",
          method: "当前运行生产接口的确定性边界核验",
          datasetVersion: `native-acceptance-${suffix}`,
          dataDate: verifiedAt.slice(0, 10),
          precision: "不外推为现实地点或 Bortle/SQM",
          state: "ESTIMATED",
          source: acceptanceSource,
        },
        obstructionPercent: 20,
        clearDirections: ["ALL"],
        accessTags: ["DRIVE_TO", "NO_HIKE"],
        facilities,
        route: {
          kind: "STRAIGHT_LINE_ONLY",
          originLabel: "验收地图中心",
          distanceKm: null,
          driveMinutes: null,
          walkingMinutes: null,
          lastRoad: "两车道硬化道路；本次运行只验证信息闭环",
          parkingGuidance: "在标记区域内停车并保持通道；只用于隔离验收",
          state: "FRESH",
          source: acceptanceSource,
        },
        accessAndSafety: {
          openness: "OPEN",
          legalAccess: "PERMITTED",
          nightSafety: "CAUTION",
          explicitDanger: false,
          restrictions: ["不得把本记录用于现实出行判断"],
          guidance: ["本次运行结束后数据库和媒体根目录均被销毁"],
        },
        siteMediaState: "NO_SITE_MEDIA_VERIFIED",
        evidence: claims.map((claim, index) => ({
          evidenceId: `evidence:${suffix}:${index + 1}`,
          subjectType:
            claim === "SPOT_COORDINATE"
              ? "SPOT"
              : claim === "SAFETY_NIGHT"
                ? "SAFETY"
                : claim === "HORIZON_PROFILE"
                  ? "HORIZON"
                  : "ACCESS",
          subjectId: spotId,
          claim,
          state: "CONFIRMED",
          sourceType: "OPERATOR",
          sourceId: acceptanceSource.id,
          mediaIds: [],
          observedAt: verifiedAt,
          verifiedAt,
          validTo: null,
          confidence: 1,
        })),
        dataDisclosure: [identitySource, acceptanceSource],
      }),
    },
  );
  const dashboard = await adminRequest(
    base,
    infrastructure,
    "/v2/admin/dashboard",
  );
  const candidate = dashboard.spots.find((spot) => spot.spot_id === spotId);
  if (!candidate || candidate.publication_assessment?.complete !== true)
    throw new Error("native_formal_spot_assessment_incomplete");
  const assessment = await adminRequest(
    base,
    infrastructure,
    `/v2/admin/spots/${encodeURIComponent(spotId)}/publication-assessments`,
    {
      method: "POST",
      idempotencyKey: `native-assess-${suffix}`,
      body: JSON.stringify({
        reason: "确认本次隔离验收记录满足当前发布门",
        expectedRevision: Number(candidate.version),
      }),
    },
  );
  const assessmentDigest =
    assessment?.assessmentDigest ?? assessment?.readback?.assessmentDigest;
  if (!assessmentDigest)
    throw new Error("native_formal_spot_assessment_digest_missing");
  await adminRequest(
    base,
    infrastructure,
    `/v2/admin/spots/${encodeURIComponent(spotId)}/publish`,
    {
      method: "POST",
      idempotencyKey: `native-publish-${suffix}`,
      body: JSON.stringify({
        reason: "发布本次运行隔离记录以验证正式点只读链路",
        expectedRevision: Number(candidate.version),
        assessmentDigest,
      }),
    },
  );
  const readback = await adminRequest(
    base,
    infrastructure,
    "/v2/admin/dashboard",
  );
  const published = readback.spots.find((spot) => spot.spot_id === spotId);
  if (!published || published.status !== "PUBLISHED")
    throw new Error("native_formal_spot_publish_readback_failed");
  return {
    spotId,
    status: published.status,
    revision: Number(published.version),
    identitySourceId: identitySource.id,
    acceptanceSourceId: acceptanceSource.id,
  };
}

async function buildCurrentCandidate(apiPort, runtimeEnvironment) {
  const generatedRoot = repositoryPath("apps/wechat-miniapp/dist/weapp");
  await rm(generatedRoot, { force: true, recursive: true });
  const npmCli = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  const startedAt = Date.now();
  const build = spawnSync(
    process.execPath,
    [npmCli, "run", "build:weapp", "--workspace", "@starward/wechat-miniapp"],
    {
      cwd: root,
      env: {
        ...process.env,
        ...runtimeEnvironment,
        MINIAPP_API_BASE: `http://127.0.0.1:${apiPort}`,
      },
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    },
  );
  const diagnostic = `${build.stdout ?? ""}\n${build.stderr ?? ""}\n${build.error?.message ?? ""}`;
  if (build.status !== 0)
    throw new Error(
      `current_candidate_weapp_build_failed:${build.status}:${sha256(diagnostic)}`,
    );
  const bundle = await directorySnapshot(generatedRoot);
  return {
    status: "passed",
    clean_generated_root: "apps/wechat-miniapp/dist/weapp",
    command: "npm run build:weapp --workspace @starward/wechat-miniapp",
    duration_ms: Date.now() - startedAt,
    diagnostic_sha256: sha256(diagnostic),
    bundle,
  };
}

async function startApi(apiPort, mediaRoot, runtimeEnvironment) {
  const readiness = `http://127.0.0.1:${apiPort}/v2/capabilities`;
  await assertPortFree(readiness);
  const child = spawn(
    process.execPath,
    [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "src/main.ts"],
    {
      cwd: path.join(root, "workers", "miniapp-api"),
      env: {
        ...process.env,
        ...runtimeEnvironment,
        MINIAPP_API_PORT: String(apiPort),
        MINIAPP_MEDIA_STORAGE_ROOT: mediaRoot,
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const output = [];
  const remember = (chunk) => {
    output.push(String(chunk));
    if (output.length > 40) output.shift();
  };
  child.stdout.on("data", remember);
  child.stderr.on("data", remember);
  let exitListener;
  const exitedBeforeReady = new Promise((_, reject) => {
    exitListener = (code, signal) =>
      reject(
        new Error(
          `miniapp_api_exited_before_ready:${code ?? "null"}:${signal ?? "none"}`,
        ),
      );
    child.once("exit", exitListener);
  });
  try {
    await Promise.race([waitForHttp(readiness, 30_000), exitedBeforeReady]);
  } catch (error) {
    stopProcessTree(child.pid);
    throw new Error(`${error.message}:${sha256(output.join(""))}`);
  } finally {
    if (exitListener) child.off("exit", exitListener);
  }
  return child;
}

function runWechatCli(projectPath, args, options = {}) {
  return spawn(
    devtoolsExecutable,
    [
      "-e",
      devtoolsCliBootstrap,
      devtoolsCliEntry,
      ...args,
      "--port",
      String(wechatIdeHttpPort),
    ],
    {
      cwd: path.dirname(devtoolsExecutable),
      env: {
        ...wechatToolEnvironment(),
        // Match the official cli.bat contract: the executable runs from the
        // installed tool directory while its `cwd` environment binding names
        // the caller workspace. The requested project is independently bound
        // through a unique private identity and the actual file-watcher path.
        cwd: root,
        ELECTRON: "",
        ELECTRON_RUN_AS_NODE: "1",
      },
      windowsHide: true,
      stdio: options.stdio ?? "pipe",
    },
  );
}

async function waitForAutomationConnection(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(
    `wechat_automation_connection_timeout:${sha256(String(lastError?.message ?? lastError ?? ""))}`,
  );
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (connected) => {
      socket.destroy();
      resolve(connected);
    };
    socket.setTimeout(750, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function waitForPortClosed(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await canConnect(port))) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`wechat_devtools_port_did_not_close:${port}`);
}

async function waitForPortsStablyClosed(
  ports,
  timeoutMs,
  stableWindowMs = devtoolsPortStableWindowMs,
) {
  const deadline = Date.now() + timeoutMs;
  let closedSince = null;
  while (Date.now() < deadline) {
    const open = await Promise.all(ports.map((port) => canConnect(port)));
    if (open.every((entry) => !entry)) {
      closedSince ??= Date.now();
      if (Date.now() - closedSince >= stableWindowMs) return;
    } else {
      closedSince = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `wechat_devtools_ports_did_not_stably_close:${ports.join(",")}`,
  );
}

async function waitForWechatWatchersClosed(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastObservation = { processCount: 0, projects: [] };
  while (Date.now() < deadline) {
    lastObservation = observeWechatWatcherProjects();
    if (lastObservation.processCount === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `wechat_devtools_watchers_did_not_close:${sha256(
      canonical({
        observed_process_count: lastObservation.processCount,
        observed_project_path_sha256s: lastObservation.projects.map(sha256),
      }),
    )}`,
  );
}

async function waitForWechatIdeClosed(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastObservation = {
    processCount: 0,
    processIds: [],
    unreadableCallbackPortCount: 0,
    callbackPorts: [],
    ideHttpPorts: [],
  };
  while (Date.now() < deadline) {
    lastObservation = observeWechatIdeInstances();
    if (lastObservation.processCount === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `wechat_devtools_ide_did_not_close:${sha256(
      canonical({
        observed_process_count: lastObservation.processCount,
        observed_process_ids_sha256: sha256(
          canonical(lastObservation.processIds),
        ),
        unreadable_callback_port_count:
          lastObservation.unreadableCallbackPortCount,
        observed_callback_ports: lastObservation.callbackPorts,
        observed_ide_http_ports: lastObservation.ideHttpPorts,
      }),
    )}`,
  );
}

async function waitForInitialPage(miniProgram, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  let rootActivation = null;
  while (Date.now() < deadline) {
    try {
      const pages = await miniProgram.pageStack();
      if (pages.length > 0)
        return {
          page: pages.at(-1),
          activation:
            rootActivation ?? {
              status: "not_required",
              method: "existing_connected_page_stack",
              evidence_role: "automation_protocol_bootstrap_only",
            },
        };
      if (!rootActivation) {
        // The installed official miniprogram-automator protocol can connect to
        // Tool.getInfo before the simulator has activated a first page. Its
        // documented launch flow uses reLaunch to activate that page. This is
        // only the protocol bootstrap: the acceptance reset and real-entry
        // journeys below still establish the deterministic cold-start state.
        rootActivation = {
          status: "requested",
          method: "official_automator_relaunch_production_root_after_empty_stack",
          root: "pages/map/index",
          evidence_role: "automation_protocol_bootstrap_only",
        };
        const activated = await retryIdempotentAutomatorOperation(
          "initial-production-root-activation",
          () => miniProgram.reLaunch("/pages/map/index"),
        );
        if (!activated)
          throw new Error("wechat_initial_root_activation_unavailable");
        rootActivation.status = "completed";
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `wechat_initial_page_timeout:${sha256(String(lastError?.message ?? lastError ?? "empty_page_stack"))}`,
  );
}

async function enableRuntimeLog(program, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      await program.send("App.enableLog");
      return;
    } catch (error) {
      lastError = error;
      if (
        !/timeout waiting for automator response/iu.test(
          String(error?.message ?? error),
        )
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(
    `wechat_runtime_log_enable_timeout:${sha256(String(lastError?.message ?? lastError ?? ""))}`,
  );
}

function isAutomatorResponseTimeout(error) {
  return /timeout waiting for automator response/iu.test(
    String(error?.message ?? error),
  );
}

async function retryIdempotentAutomatorOperation(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isAutomatorResponseTimeout(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(
    `wechat_idempotent_automator_operation_unreachable:${label}:${sha256(
      String(lastError?.message ?? lastError ?? ""),
    )}`,
  );
}

async function waitForRuntimeEventQuiescence(
  runtimeEvents,
  quietWindowMs = 750,
  timeoutMs = 5_000,
) {
  const deadline = Date.now() + timeoutMs;
  let observedCount = runtimeEvents.length;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    if (runtimeEvents.length !== observedCount) {
      observedCount = runtimeEvents.length;
      quietSince = Date.now();
    }
    if (Date.now() - quietSince >= quietWindowMs)
      return {
        status: "passed",
        event_count: observedCount,
        quiet_window_ms: quietWindowMs,
      };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("native_runtime_events_did_not_quiesce");
}

function quitWechatDevtools() {
  const quit = spawnSync(
    devtoolsExecutable,
    [
      "-e",
      devtoolsCliBootstrap,
      devtoolsCliEntry,
      "quit",
      "--port",
      String(wechatIdeHttpPort),
    ],
    {
      cwd: path.dirname(devtoolsExecutable),
      env: {
        ...wechatToolEnvironment(),
        cwd: root,
        ELECTRON: "",
        ELECTRON_RUN_AS_NODE: "1",
      },
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout: 15_000,
      windowsHide: true,
    },
  );
  const quitDiagnostic = `${quit.stdout ?? ""}\n${quit.stderr ?? ""}\n${quit.error?.message ?? ""}`;
  return {
    status: quit.status === 0 ? "passed" : "failed",
    exit_code: quit.status,
    diagnostic_sha256: sha256(quitDiagnostic),
  };
}

async function quitWechatDevtoolsAndWait(
  _projectPath,
  ports,
  timeoutMs = 60_000,
) {
  const attempts = [];
  const firstBudget = Math.min(30_000, timeoutMs);
  const budgets = [firstBudget, Math.max(0, timeoutMs - firstBudget)];
  const declaredPorts = [
    ...new Set(
      [...ports, wechatIdeHttpPort].filter(
        (port) => Number.isInteger(port) && port > 0,
      ),
    ),
  ];
  for (let index = 0; index < budgets.length; index += 1) {
    const ideBefore = observeWechatIdeInstances();
    const ideServiceLiveBefore = await canConnect(wechatIdeHttpPort);
    let action;
    try {
      if (index === 0 && ideServiceLiveBefore) {
        const quit = quitWechatDevtools();
        action = {
          kind: "official_cli_quit",
          status: quit.status,
          exit_code: quit.exit_code,
          diagnostic_sha256: quit.diagnostic_sha256,
        };
      } else if (ideBefore.processCount > 0) {
        action = {
          kind: "force_exact_root_process_trees",
          ...forceStopWechatIdeInstances(ideBefore),
        };
      } else if (ideServiceLiveBefore) {
        const quit = quitWechatDevtools();
        action = {
          kind: "official_cli_quit_retry_without_observed_root",
          status: quit.status,
          exit_code: quit.exit_code,
          diagnostic_sha256: quit.diagnostic_sha256,
        };
      } else {
        action = {
          kind: "not_required",
          status: "passed",
        };
      }
    } catch (error) {
      action = {
        kind: index === 0 ? "official_or_forced_shutdown" : "forced_shutdown",
        status: "failed",
        diagnostic_sha256: sha256(String(error?.message ?? error)),
      };
    }
    const ideAfterAction = observeWechatIdeInstances();
    const observedPorts = [
      ...new Set([
        ...declaredPorts,
        ...ideBefore.callbackPorts,
        ...ideBefore.ideHttpPorts,
        ...ideAfterAction.callbackPorts,
        ...ideAfterAction.ideHttpPorts,
      ]),
    ];
    const attempt = {
      attempt: index + 1,
      action,
      ide_service_live_before: ideServiceLiveBefore,
      observed_ide_process_count: ideBefore.processCount,
      observed_ide_process_ids_sha256: sha256(canonical(ideBefore.processIds)),
      unreadable_callback_port_count: ideBefore.unreadableCallbackPortCount,
      observed_callback_ports: ideBefore.callbackPorts,
      observed_ide_http_ports: ideBefore.ideHttpPorts,
      observed_ports: observedPorts,
      ports_status: "pending",
      watchers_status: "pending",
      ide_status: "pending",
    };
    attempts.push(attempt);
    if (budgets[index] > 0) {
      try {
        await waitForPortsStablyClosed(observedPorts, budgets[index]);
        attempt.ports_status = "passed";
        await waitForWechatWatchersClosed(Math.min(10_000, budgets[index]));
        attempt.watchers_status = "passed";
        await waitForWechatIdeClosed(Math.min(10_000, budgets[index]));
        attempt.ide_status = "passed";
        return {
          status: "passed",
          closure_authority:
            "stable closure of declared/observed IDE and callback ports, all wxfilewatcher processes, and exact WeChat DevTools --cli root processes",
          attempt_count: attempts.length,
          attempts,
        };
      } catch (error) {
        if (attempt.ports_status !== "passed") {
          attempt.ports_status = "failed";
          attempt.ports_diagnostic_sha256 = sha256(
            String(error?.message ?? error),
          );
        } else if (attempt.watchers_status !== "passed") {
          attempt.watchers_status = "failed";
          attempt.watchers_diagnostic_sha256 = sha256(
            String(error?.message ?? error),
          );
        } else {
          attempt.ide_status = "failed";
          attempt.ide_diagnostic_sha256 = sha256(
            String(error?.message ?? error),
          );
        }
      }
    } else {
      attempt.ports_status = "not_checked";
      attempt.watchers_status = "not_checked";
      attempt.ide_status = "not_checked";
    }
  }
  throw new Error(
    `wechat_devtools_shutdown_failed:${sha256(canonical(attempts))}`,
  );
}

async function startWechatAutomation(projectPath, automationPort) {
  await quitWechatDevtoolsAndWait(
    projectPath,
    [wechatIdeHttpPort, automationPort],
    60_000,
  );
  const launchOutput = [];
  const cliProcess = runWechatCli(projectPath, [
    "auto",
    "--project",
    projectPath,
    "--auto-port",
    String(automationPort),
    "--trust-project",
  ]);
  const remember = (chunk) => {
    launchOutput.push(String(chunk));
    if (launchOutput.length > 100) launchOutput.shift();
  };
  cliProcess.stdout.on("data", remember);
  cliProcess.stderr.on("data", remember);
  try {
    const projectPathBinding = await waitForWechatProjectBinding(
      projectPath,
      30_000,
    );
    const projectConfigRefresh = await refreshWechatProjectConfig(projectPath);
    return {
      automationPort,
      cliProcess,
      projectPathBinding,
      projectConfigRefresh,
      launchDiagnostic: () => sha256(launchOutput.join("")),
      launchDiagnosticExcerpt: () =>
        safeToolDiagnosticExcerpt(launchOutput.join("")),
    };
  } catch (error) {
    if (cliProcess.exitCode === null) stopProcessTree(cliProcess.pid);
    throw error;
  }
}

async function connectWechatAutomation(launch) {
  return waitForAutomationConnection(launch.automationPort, 90_000);
}

async function registerWechatSnapshotProject({
  projectPath,
  automationPort,
  snapshotLocation,
}) {
  if (snapshotLocation.mode === "canonical_workspace")
    return {
      status: "passed",
      mode: "not_required_for_canonical_workspace",
      reason:
        "the canonical workspace already has a durable WeChat DevTools project registration",
    };
  if (snapshotLocation.mode !== "isolated_harness_snapshot")
    throw new Error("wechat_snapshot_registration_mode_unsupported");
  let launch;
  let program;
  let registrationError;
  let toolInfo;
  let clientDisconnect = { status: "not_started" };
  let cleanup;
  try {
    launch = await startWechatAutomation(projectPath, automationPort);
    program = await connectWechatAutomation(launch);
    toolInfo = await program.send("Tool.getInfo");
    if (toolInfo.SDKVersion !== wechatAcceptanceSdkVersion)
      throw new Error(
        `wechat_snapshot_registration_base_library_mismatch:${sha256(
          String(toolInfo.SDKVersion ?? "missing"),
        )}`,
      );
  } catch (error) {
    registrationError = error;
  } finally {
    if (program) {
      try {
        await program.close();
        clientDisconnect = {
          status: "passed",
          method: "automator App.exit plus Tool.close and connection dispose",
        };
      } catch (error) {
        try {
          program.disconnect();
        } catch {}
        clientDisconnect = {
          status: "failed",
          diagnostic_sha256: sha256(String(error?.message ?? error)),
        };
      }
    }
    if (launch?.cliProcess?.exitCode === null)
      stopProcessTree(launch.cliProcess.pid);
    cleanup = await quitWechatDevtoolsAndWait(
      projectPath,
      [automationPort, wechatIdeHttpPort],
      60_000,
    ).catch((error) => ({
      status: "failed",
      diagnostic_sha256: sha256(String(error?.message ?? error)),
    }));
  }
  if (cleanup.status !== "passed")
    throw new Error(
      `wechat_snapshot_registration_cleanup_failed:${cleanup.diagnostic_sha256}`,
    );
  if (clientDisconnect.status !== "passed")
    throw new Error(
      `wechat_snapshot_registration_project_close_failed:${clientDisconnect.diagnostic_sha256}`,
    );
  if (registrationError) throw registrationError;
  return {
    status: "passed",
    mode: "isolated_snapshot_project_registration",
    scope:
      "tool project/config identity only; no product journey or acceptance claim",
    project_path_binding: launch.projectPathBinding,
    project_config_refresh: launch.projectConfigRefresh,
    devtools_version: toolInfo.version,
    base_library_version: toolInfo.SDKVersion,
    client_disconnect: clientDisconnect,
    cleanup,
  };
}

function stopProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

async function teardownNativeSession({
  miniProgram,
  devtoolsLaunch,
  apiProcess,
  apiPort,
  automationPort,
  projectPath,
}) {
  const failures = [];
  if (miniProgram) {
    try {
      await miniProgram.close();
    } catch (error) {
      try {
        miniProgram.disconnect();
      } catch {}
      failures.push(
        `mini_program_close:${sha256(String(error?.message ?? error))}`,
      );
    }
  }
  if (devtoolsLaunch?.cliProcess?.exitCode === null)
    stopProcessTree(devtoolsLaunch.cliProcess.pid);
  try {
    await quitWechatDevtoolsAndWait(
      projectPath,
      [automationPort, wechatIdeHttpPort].filter(Boolean),
      60_000,
    );
  } catch (error) {
    failures.push(
      `devtools_shutdown:${sha256(String(error?.message ?? error))}`,
    );
  }
  if (apiProcess) stopProcessTree(apiProcess.pid);
  if (apiPort) {
    try {
      await waitForPortClosed(apiPort, 15_000);
    } catch (error) {
      failures.push(
        `api_port:${apiPort}:${sha256(String(error?.message ?? error))}`,
      );
    }
  }
  return {
    status: failures.length === 0 ? "passed" : "failed",
    failure_count: failures.length,
    failure_kinds: failures.map((failure) => failure.split(":", 1)[0]),
    failures_sha256: failures.length > 0 ? sha256(canonical(failures)) : null,
  };
}

const nativeSelectorAliases = new Map([
  ["[data-control~='map-marker-panel-coordinator']", ".map-stage"],
  ["[data-control~='map-search-entry']", ".map-search-entry"],
  ["[data-control~='map-location-control']", ".map-tool--location"],
  ["[data-control~='map-analysis-focus-layer']", ".map-analysis-trigger"],
  ["[data-control~='sky-map-canvas']", ".map-map-canvas-marker"],
  ["[data-control~='map-layer-selector']", ".map-layer-sheet"],
  ["[data-control~='map-time-control']", ".map-time-ruler"],
  ["[data-control~='map-spot-information-panel']", ".spot-panel"],
  ["[data-control~='map-spot-panel-handle']", ".spot-panel__handle"],
  ["[data-control~='map-spot-panel-section-nav']", ".spot-panel__section-rail"],
  ["[data-control~='map-spot-panel-action-bar']", ".spot-panel__action-bar"],
  ["[data-control~='spot-route-summary']", ".spot-panel__block--route"],
  ["[data-control~='spot-facility-evidence']", ".spot-panel__block--facility"],
  ["[data-control~='spot-favorite-action']", ".spot-panel__action--favorite"],
  ["[data-control~='spot-share-action']", ".spot-panel__action--share"],
  ["[data-control~='spot-cloud-stargazing-action']", ".spot-panel__action--cloud"],
  ["[data-control~='spot-contribution-entry']", ".spot-panel__text-action--contribution"],
  ["[data-control~='sky-professional-matrix']", ".spot-panel__block--professional-matrix"],
  ["[data-control~='sky-target-list']", ".spot-panel__block--target-list"],
  ["[data-control~='sky-time-scrubber']", ".map-time-ruler"],
  ["[data-control~='spot-search-shell']", ".spot-search-shell"],
  ["[data-control~='spot-search-field']", ".spot-search-field"],
  ["[data-control~='spot-search-query-overlay']", ".spot-search-query-overlay"],
  ["[data-control~='spot-search-filter-group']", ".spot-search-filter-group"],
  ["[data-control~='spot-search-filter-choice']", ".spot-search-filter-choice"],
  ["[data-control~='spot-search-result-list']", ".spot-search-result-list"],
  ["[data-control~='spot-search-result-card']", ".spot-search-result-card"],
  ["[data-od-id='notification-feedback']", ".notification__copy"],
  ["[data-od-id='sky-orientation-route']", ".sky-orientation-page"],
  ["[data-od-id='sky-orientation-canvas']", ".sky-orientation-canvas"],
  ["[data-od-id='sky-orientation-sensor']", ".sky-orientation-sensor"],
  [
    "[data-od-id='sky-orientation-time-ruler']",
    ".sky-orientation-time-ruler",
  ],
  [
    "[data-od-id='sky-orientation-object-list-toggle']",
    ".sky-orientation-object-toggle button",
  ],
  [
    "[data-od-id='sky-orientation-back'] .sky-orientation-back",
    ".sky-orientation-back",
  ],
  ["[data-od-id='default-formal-markers']", "#spot-map"],
  ["[data-od-id='map-search-summary']", ".map-finder-trigger"],
  ["[data-od-id='map-analysis-time-bar']", ".map-conditions-bar"],
  ["[data-od-id='map-observing-conditions-icon']", ".map-conditions-bar"],
  ["[data-od-id='map-permission-state']", ".map-floating-tools .soft-button"],
  ["[data-od-id='spot-finder-sheet']", ".finder-panel"],
  ["[data-od-id='spot-finder-search-input']", ".map-finder-trigger__input"],
  ["[data-od-id='spot-finder-search-icon']", ".map-finder-trigger__icon"],
  ["[data-od-id='spot-finder-result-scroll']", ".finder-results"],
  ["[data-od-id='spot-finder-wanted-section']", ".finder-partition"],
  ["[data-od-id='spot-finder-other-section']", ".finder-partition"],
  ["[data-od-id='spot-finder-city-heading']", ".finder-city-heading"],
  ["[data-od-id='spot-finder-section-chevron']", ".finder-partition__toggle"],
  ["[data-od-id='spot-finder-filter-disclosure']", ".finder-filter-toggle"],
  ["[data-od-id='spot-finder-filter-overlay']", ".filter-sheet"],
  ["[data-od-id='spot-finder-filter-scroll']", ".filter-sheet__scroll"],
  ["[data-od-id='spot-finder-filter-first-level']", ".filter-sheet__tier"],
  ["[data-od-id='spot-finder-filter-advanced']", ".filter-sheet__tier"],
  ["[data-od-id='spot-finder-filter-choice']", ".filter-option"],
  ["[data-od-id='spot-finder-filter-revert']", ".dirty-action--revert"],
  ["[data-od-id='spot-finder-filter-commit']", ".dirty-action--commit"],
  ["[data-od-id='map-analysis-focus-panel']", ".conditions-panel"],
  ["[data-od-id='map-analysis-time-scrubber']", ".conditions-time__slider"],
  ["[data-od-id='map-analysis-time-value']", ".conditions-time__value"],
  ["[data-od-id='map-analysis-layer-choice']", ".conditions-overlay-option"],
  ["[data-od-id='map-analysis-close']", ".conditions-panel__close"],
  ["[data-od-id='source-lift-map-dock']", ".source-lift-map-dock"],
  ["[data-od-id='sky-target-list']", ".sky-targets"],
  ["[data-od-id='sky-orientation-scene']", ".sky-scene"],
  ["[data-od-id='sky-orientation-control']", ".orientation-control"],
  [
    "[data-od-id='sky-orientation-object-list']",
    ".sky-orientation-object-list",
  ],
  ["[data-od-id='selected-card-star']", ".selected-card-star"],
  ["[data-od-id='my-contribution-entry']", ".routine-entry--contribution"],
  ["[data-od-id='my-profile-links-entry']", ".routine-entry--profile-links"],
  ["[data-od-id='my-import-entry']", ".routine-entry--import"],
  ["[data-od-id='my-plan-entry']", ".routine-entry--plan"],
  ["[data-od-id='my-settings-entry']", ".routine-entry--settings"],
  ["[data-od-id='display-mode-switcher']", { selector: ".settings-section", index: 0 }],
  ["[data-od-id='profile-link-editor']", ".profile-links-editor"],
  ["[data-od-id='profile-link-open-copy']", ".profile-links-list"],
  ["[data-od-id='import-source-rights']", ".import-source-card"],
  ["[data-od-id='import-platform-other']", { selector: ".import-platform-grid .chip", index: 3 }],
  ["[data-od-id='import-source-url']", ".import-source-card input"],
  ["[data-od-id='import-rights-confirmation']", ".import-source-card switch"],
  ["[data-od-id='import-create-draft'] .soft-button", ".import-source-card .soft-button--primary"],
  ["[data-od-id='import-new-draft'] .soft-button", ".import-selected-draft .soft-button"],
  ["[data-od-id='import-draft-editor']", ".import-draft-card"],
  ["[data-od-id='import-spot-association']", ".import-association-card"],
  ["[data-od-id='import-preview-submit']", ".import-preview-card"],
  ["[data-od-id='import-title']", { selector: ".import-draft-card input", index: 0 }],
  ["[data-od-id='import-body']", ".import-body-field"],
  ["[data-od-id='import-source-note']", { selector: ".import-draft-card input", index: 1 }],
  ["[data-od-id='import-enter-edit-draft'] .soft-button", ".import-draft-card .soft-button--primary"],
  ["[data-od-id='import-association-formal']", { selector: ".import-association-option", index: 0 }],
  ["[data-od-id='import-association-proposal']", { selector: ".import-association-option", index: 1 }],
  ["[data-od-id='import-formal-spot-id']", ".import-association-card input"],
  ["[data-od-id='import-save-association'] .soft-button", ".import-preview-card .soft-button--primary"],
  ["[data-od-id='import-open-preview'] .soft-button", ".import-preview-card .soft-button--primary"],
  ["[data-od-id='import-submit-review'] .soft-button", ".import-preview-card .soft-button--primary"],
  ["[data-od-id='import-preview-submit'] .status-panel--ready", ".import-preview-card .status-panel--ready"],
  ["[data-od-id='plan-editor-form']", ".plan-editor-form"],
  ["[data-od-id='plan-summary']", ".plan-hero"],
  ["[data-od-id='plan-preparation']", ".plan-checklist"],
  ["[data-od-id='plan-route-nodes']", ".plan-route"],
  ["[data-od-id='spot-contribution-entry']", ".contribution-link"],
  ["[data-od-id='contribution-spot-context']", ".contribution-context"],
  [
    "[data-od-id='contribution-location-consent']",
    ".contribution-location-card",
  ],
  [
    "[data-od-id='contribution-kind-control'] .contribution-kind-choice",
    ".contribution-kind-choice",
  ],
  [
    "[data-od-id='contribution-topic-control'] .chip",
    ".contribution-topic-grid .chip",
  ],
  [
    "[data-od-id='contribution-submit'] .soft-button",
    ".contribution-actions .soft-button",
  ],
  [
    "[data-od-id='contribution-submit'] .soft-button--primary",
    ".contribution-actions .soft-button--primary",
  ],
  ["[data-od-id='contribution-status-list']", ".contribution-history"],
  [
    "[data-od-id='contribution-candidate-name']",
    ".contribution-candidate-name",
  ],
  [
    "[data-od-id='contribution-candidate-region']",
    ".contribution-candidate-region",
  ],
  [
    "[data-od-id='contribution-candidate-latitude']",
    ".contribution-candidate-latitude",
  ],
  [
    "[data-od-id='contribution-candidate-longitude']",
    ".contribution-candidate-longitude",
  ],
  [
    "[data-od-id='contribution-coordinate-consent']",
    ".contribution-coordinate-consent",
  ],
  ["[data-od-id='contribution-detail']", ".contribution-textarea"],
  ["[data-od-id='contribution-media-upload']", ".contribution-media-card"],
  ["[data-od-id='contribution-media-rights']", ".contribution-media-rights"],
  [
    "[data-od-id='my-settings-action'] .soft-button",
    ".custom-nav__side--right .soft-button",
  ],
]);

async function queryElements(page, selector) {
  const nativeSelector = nativeSelectorAliases.get(selector);
  if (typeof nativeSelector === "string") return page.$$(nativeSelector);
  if (nativeSelector) {
    const elements = await page.$$(nativeSelector.selector);
    const selected = elements[nativeSelector.index];
    return selected ? [selected] : [];
  }
  const controlTokenSelector = /^\[data-control~=(["'])([-\w.:]+)\1\]$/u.exec(
    selector,
  );
  if (controlTokenSelector) {
    const token = controlTokenSelector[2];
    const exact = await page.getElementsByXpath(
      `//*[@data-control=${JSON.stringify(token)}]`,
    );
    if (exact.length > 0) return exact;
    const candidates = await page.getElementsByXpath("//*[@data-control]");
    const values = await Promise.all(
      candidates.map((element) =>
        element.attribute("data-control").catch(() => ""),
      ),
    );
    return candidates.filter((_, index) =>
      String(values[index]).split(/\s+/u).includes(token),
    );
  }
  const odSelector = /^\[data-od-id=(["'])([-\w.:]+)\1\](?:\s+(.+))?$/u.exec(
    selector,
  );
  if (!odSelector) return page.$$(selector);
  let roots = await page.getElementsByXpath(
    `//*[@data-od-id=${JSON.stringify(odSelector[2])}]`,
  );
  if (roots.length === 0) {
    const controlCandidates = await page.getElementsByXpath("//*[@data-control]");
    const controlValues = await Promise.all(
      controlCandidates.map((element) =>
        element.attribute("data-control").catch(() => ""),
      ),
    );
    roots = controlCandidates.filter((_, index) =>
      String(controlValues[index]).split(/\s+/u).includes(odSelector[2]),
    );
  }
  const descendantSelector = odSelector[3];
  if (!descendantSelector) return roots;
  const descendants = await Promise.all(
    roots.map((element) => element.$$(descendantSelector)),
  );
  return descendants.flat();
}

async function queryElement(page, selector) {
  const elements = await queryElements(page, selector);
  return elements[0] ?? null;
}

async function nativeDiagnosticStage(label, operation) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(
      `native_stage_failed:${label}:${String(error?.message ?? error)}`,
      { cause: error },
    );
  }
}

async function waitForSelector(
  page,
  selector,
  minimum = 1,
  timeoutMs = 20_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const elements = await queryElements(page, selector).catch(() => []);
    if (elements.length >= minimum) return elements;
    // A just-pushed subpackage page can temporarily report itself as not yet
    // topmost. Do not ask that stale page handle to own the retry clock.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `native_selector_timeout:${page.path}:${selector}:${minimum}`,
  );
}

async function waitForElementClass(
  page,
  selector,
  className,
  timeoutMs = 10_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const element = await queryElement(page, selector).catch(() => null);
    const classes = element
      ? String(await element.attribute("class").catch(() => ""))
          .split(/\s+/u)
          .filter(Boolean)
      : [];
    if (classes.includes(className)) return [...new Set(classes)].sort();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`native_class_timeout:${page.path}:${selector}:${className}`);
}

async function activateDayModeThroughProductionControl(
  miniProgram,
  setRuntimePhase = () => {},
) {
  setRuntimePhase("setup-day-control-route");
  const switchedMyPage = await switchTabAndWait(
    miniProgram,
    "setup-day-control-my-tab",
    "/pages/my/index",
    "pages/my/index",
  );
  if (!switchedMyPage) throw new Error("native_setup_my_route_unavailable");
  const myPage = switchedMyPage;
  await waitForSelector(myPage, ".my-page", 1);
  const settingsPage = await tapIntoPage(
    miniProgram,
    myPage,
    "[data-od-id='my-settings-action'] .soft-button",
    "content/settings/index",
  );
  const modeButtons = await waitForSelector(
    settingsPage,
    ".settings-choice-grid .chip",
    3,
  );
  const controlText = await modeButtons[0].text().catch(() => "");
  setRuntimePhase("setup-day-control-tap");
  await modeButtons[0].tap();
  setRuntimePhase("setup-day-control-theme-readback");
  const rootClasses = await waitForElementClass(
    settingsPage,
    ".settings-page",
    "theme-day",
  );
  return {
    status: "passed",
    route: "content/settings/index",
    control_text_sha256: sha256(controlText),
    control_text_length: controlText.length,
    observed_root_classes: rootClasses,
    my_tab_disposition: "canonical MY state established in evidence session",
  };
}

async function resetThroughAcceptanceControl(miniProgram) {
  // Resetting QueryClient while a network-backed page is still mounted makes
  // WeChat report the cancelled RequestTask promises as opaque console errors.
  // Always move to the production, network-free permission page first so every
  // setup, evidence and degradation reset has the same stable lifecycle owner.
  const requestedNeutralPage = await retryIdempotentAutomatorOperation(
    "acceptance-reset-route",
    () => miniProgram.reLaunch("/pages/auth/index"),
  );
  if (!requestedNeutralPage) throw new Error("native_reset_route_unavailable");
  const neutralPage = await waitForCurrentPagePath(
    miniProgram,
    "pages/auth/index",
  );
  await waitForSelector(neutralPage, ".permission-page", 1);
  const reset = await miniProgram.evaluate(function () {
    const control = globalThis.__STARWARD_MINIAPP_ACCEPTANCE__;
    return control?.reset?.() ?? { status: "missing" };
  });
  if (reset?.status !== "passed")
    throw new Error("native_acceptance_reset_control_unavailable");
  if (canonical(reset.snapshot) !== canonical(acceptanceBootstrapState))
    throw new Error("native_acceptance_reset_snapshot_mismatch");
  const rootClasses = await waitForElementClass(
    neutralPage,
    ".permission-page",
    "theme-day",
  );
  return {
    status: "passed",
    cancelled_request_count: reset.cancelledRequests,
    snapshot_sha256: sha256(canonical(reset.snapshot)),
    neutral_route: "pages/auth/index",
    root_classes: rootClasses,
  };
}

async function resetBetweenFaultProbes(miniProgram) {
  // The settings route owns the same network-backed MyLibraryPage as the
  // my-home fault probe. Clearing QueryClient while that observer is mounted
  // can race the next reLaunch and makes the harness manufacture a failure.
  // The permission route is production code, DAY-themed, and intentionally
  // network-free, so it is the stable neutral owner for an acceptance reset.
  return resetThroughAcceptanceControl(miniProgram);
}

function parseStoredProductState(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function verifyPreparedContextContinuity(
  miniProgram,
  preparedUrl,
  timeoutMs = 5_000,
) {
  const route = new URL(preparedUrl, "https://acceptance.invalid");
  const routeRequiresContextId = route.searchParams.has("contextId");
  const expectedContextId = route.searchParams.get("contextId");
  const expectedSpotId = route.searchParams.get("spotId") ?? "";
  const deadline = Date.now() + timeoutMs;
  let latestMemoryContext = null;
  let latestStoredContext = null;
  while (Date.now() < deadline) {
    const memoryContext = await miniProgram
      .evaluate(function () {
        const control = globalThis.__STARWARD_MINIAPP_ACCEPTANCE__;
        return control?.inspectContext?.() ?? null;
      })
      .catch(() => null);
    latestMemoryContext = memoryContext;
    const stored = parseStoredProductState(
      await miniProgram
        .callWxMethod("getStorageSync", appStateStorageKey)
        .catch(() => null),
    );
    const context = stored?.observationContext;
    latestStoredContext = context
      ? {
          kind: String(context.location?.kind ?? "unknown"),
          privacy: String(context.privacyClass ?? "unknown"),
          contextIdSha256: sha256(String(context.contextId ?? "")),
          spotIdSha256: sha256(String(context.location?.spotId ?? "")),
        }
      : null;
    const memoryMatches =
      (!routeRequiresContextId || memoryContext?.contextId === expectedContextId) &&
      memoryContext?.locationKind === "FORMAL_SPOT" &&
      memoryContext?.spotId === expectedSpotId;
    const contextIdsMatch = routeRequiresContextId
      ? context?.contextId === expectedContextId
      : Boolean(memoryContext?.contextId) &&
        context?.contextId === memoryContext.contextId;
    const storedMatches =
      contextIdsMatch &&
      context?.location?.kind === "FORMAL_SPOT" &&
      context.location.spotId === expectedSpotId;
    const privacyDispositionValid =
      memoryContext?.privacyClass === "PUBLIC_REFERENCE"
        ? storedMatches
        : memoryContext?.privacyClass === "SESSION_PRECISE"
          ? context === null || context === undefined
          : false;
    if (memoryMatches && privacyDispositionValid)
      return {
        status: "passed",
        context_id_sha256: sha256(String(memoryContext.contextId ?? "")),
        spot_id_sha256: sha256(expectedSpotId),
        context_fingerprint_sha256: sha256(
          String(memoryContext.contextFingerprint ?? ""),
        ),
        privacy_class: memoryContext.privacyClass,
        persistence_disposition: storedMatches
          ? "persisted_public_reference"
          : "excluded_session_precise",
      };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `native_prepared_context_discontinuity:${routeRequiresContextId ? sha256(String(expectedContextId)) : "route-context-not-required"}:${sha256(expectedSpotId)}:memory-${latestMemoryContext ? `${latestMemoryContext.locationKind}:${latestMemoryContext.privacyClass}:${sha256(String(latestMemoryContext.contextId ?? ""))}:${sha256(String(latestMemoryContext.spotId ?? ""))}` : "none"}:stored-${latestStoredContext ? `${latestStoredContext.kind}:${latestStoredContext.privacy}:${latestStoredContext.contextIdSha256}:${latestStoredContext.spotIdSha256}` : "none"}`,
  );
}

async function resetNetworkCacheForPreparedFault(miniProgram, preparedUrl) {
  const requestedNeutralPage = await retryIdempotentAutomatorOperation(
    "acceptance-network-reset-route",
    () => miniProgram.reLaunch("/pages/auth/index"),
  );
  if (!requestedNeutralPage)
    throw new Error("native_network_reset_route_unavailable");
  const neutralPage = await waitForCurrentPagePath(
    miniProgram,
    "pages/auth/index",
  );
  await waitForSelector(neutralPage, ".permission-page", 1);
  const reset = await miniProgram.evaluate(function () {
    const control = globalThis.__STARWARD_MINIAPP_ACCEPTANCE__;
    return control?.resetNetwork?.() ?? { status: "missing" };
  });
  if (reset?.status !== "passed")
    throw new Error("native_acceptance_network_reset_unavailable");
  const persistedContext = await verifyPreparedContextContinuity(
    miniProgram,
    preparedUrl,
  );
  return {
    status: "passed",
    cancelled_request_count: reset.cancelledRequests,
    preserved_product_context: persistedContext,
    neutral_route: "pages/auth/index",
  };
}

async function inspectSelector(page, definition) {
  const elements = await waitForSelector(
    page,
    definition.selector,
    definition.minimum,
  );
  const observations = [];
  for (const element of elements.slice(0, definition.capture ?? 4)) {
    const text = await element.text().catch(() => "");
    const size = await element.size().catch(() => null);
    const styles = {};
    for (const property of definition.styles ?? [])
      styles[property] = await element.style(property).catch(() => null);
    const attributes = {};
    for (const attribute of definition.attributes ?? [])
      attributes[attribute] = await element
        .attribute(attribute)
        .catch(() => null);
    observations.push({
      text_sha256: sha256(text),
      text_length: text.length,
      size,
      styles,
      ...(Object.keys(attributes).length ? { attributes } : {}),
    });
  }
  return {
    selector: definition.selector,
    native_selector: (() => {
      const alias = nativeSelectorAliases.get(definition.selector);
      return typeof alias === "string"
        ? alias
        : alias
          ? `${alias.selector}::${alias.index}`
          : definition.selector;
    })(),
    expected_minimum: definition.minimum,
    count: elements.length,
    passed: elements.length >= definition.minimum,
    observations,
  };
}

async function waitForSelectorSet(page, definitions, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const counts = await Promise.all(
      definitions.map((definition) =>
        queryElements(page, definition.selector)
          .then((elements) => elements.length)
          .catch(() => 0),
      ),
    );
    if (counts.every((count, index) => count >= definitions[index].minimum))
      return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function waitForSelectorAbsent(page, selector, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const elements = await queryElements(page, selector).catch(() => []);
    if (elements.length === 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function captureJourneyInteractions(
  page,
  miniProgram,
  runRoot,
  definition,
) {
  const steps = definition.interactions ?? [];
  if (steps.length === 0) return null;
  const observations = [];
  for (const step of steps) {
    const stepObservations = [];
    let actionPerformed = false;
    let watchedBefore = [];
    if (step.waitForFormalContextSpotId) {
      const context = await waitForFormalObservationContext(
        miniProgram,
        step.timeoutMs ?? 20_000,
      );
      if (context.spotId !== step.waitForFormalContextSpotId)
        throw new Error(
          `native_interaction_formal_context_mismatch:${definition.key}:${step.key}:${sha256(step.waitForFormalContextSpotId)}:${sha256(context.spotId)}`,
        );
      stepObservations.push({
        formal_context_ready: true,
        expected_spot_id_sha256: sha256(step.waitForFormalContextSpotId),
        observed_spot_id_sha256: sha256(context.spotId),
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (step.expectChanged?.length) {
      watchedBefore = await Promise.all(
        step.expectChanged.map(async (watch) => {
          const elements = await waitForSelector(
            page,
            watch.selector,
            watch.minimum ?? 1,
            step.timeoutMs ?? 20_000,
          );
          const element = elements[watch.index ?? 0];
          if (!element)
            throw new Error(
              `native_interaction_watch_missing:${definition.key}:${step.key}:${watch.selector}`,
            );
          const value =
            watch.kind === "attribute"
              ? await element.attribute(watch.name)
              : await element.text();
          return { watch, before_sha256: sha256(canonical(value ?? null)) };
        }),
      );
    }
    if (step.scroll) {
      const scroller = (
        await waitForSelector(
          page,
          step.scroll.container,
          1,
          step.timeoutMs ?? 20_000,
        )
      )[0];
      const target = (
        await waitForSelector(
          page,
          step.scroll.target,
          1,
          step.timeoutMs ?? 20_000,
        )
      )[step.scroll.index ?? 0];
      if (!scroller || typeof scroller.scrollTo !== "function" || !target)
        throw new Error(
          `native_interaction_scroll_unsupported:${definition.key}:${step.key}`,
        );
      const targetOffset = await target.offset().catch(() => null);
      const scrollerOffset = await scroller.offset().catch(() => null);
      const currentScrollTop = Number(
        await scroller.property("scrollTop").catch(() => 0),
      );
      const targetTop = Number(targetOffset?.top ?? targetOffset?.y);
      const scrollerTop = Number(scrollerOffset?.top ?? scrollerOffset?.y);
      if (!Number.isFinite(targetTop) || !Number.isFinite(scrollerTop))
        throw new Error(
          `native_interaction_scroll_target_unavailable:${definition.key}:${step.key}`,
        );
      const scrollTop = Math.max(
        0,
        currentScrollTop +
          targetTop -
          scrollerTop -
          (step.scroll.topInset ?? 24),
      );
      await scroller.scrollTo(0, scrollTop);
      await new Promise((resolve) =>
        setTimeout(resolve, step.scroll.settleMs ?? 500),
      );
      stepObservations.push({
        scroll_container: step.scroll.container,
        scroll_target: step.scroll.target,
        scroll_top: scrollTop,
      });
    }
    if (step.input) {
      const controls = await waitForSelector(
        page,
        step.input,
        step.minimum ?? 1,
        step.timeoutMs ?? 20_000,
      );
      const control = controls[step.index ?? 0];
      if (!control)
        throw new Error(
          `native_interaction_input_missing:${definition.key}:${step.key}`,
        );
      if (typeof control.input !== "function")
        throw new Error(
          `native_interaction_input_unsupported:${definition.key}:${step.key}`,
        );
      await control.input(step.value ?? "");
      actionPerformed = true;
    }
    if (step.tap) {
      const controls = await waitForSelector(
        page,
        step.tap,
        step.minimum ?? 1,
        step.timeoutMs ?? 20_000,
      );
      let controlIndex = step.index ?? 0;
      if (step.textIncludes) {
        const controlTexts = await Promise.all(
          controls.map((candidate) => candidate.text().catch(() => "")),
        );
        controlIndex = controlTexts.findIndex((value) =>
          value.includes(step.textIncludes),
        );
        if (controlIndex < 0)
          throw new Error(
            `native_interaction_text_control_missing:${definition.key}:${step.key}:${sha256(step.textIncludes)}`,
          );
        stepObservations.push({
          selected_control_text_sha256: sha256(controlTexts[controlIndex]),
          selected_control_text_match_sha256: sha256(step.textIncludes),
        });
      }
      const control = controls[controlIndex];
      if (!control)
        throw new Error(
          `native_interaction_control_missing:${definition.key}:${step.key}`,
        );
      await control.tap();
      actionPerformed = true;
    }
    if (step.trigger) {
      const controls = await waitForSelector(
        page,
        step.trigger.selector,
        step.minimum ?? 1,
        step.timeoutMs ?? 20_000,
      );
      const control = controls[step.index ?? 0];
      if (!control)
        throw new Error(
          `native_interaction_trigger_missing:${definition.key}:${step.key}`,
        );
      let triggerDetail = step.trigger.detail ?? {};
      if (step.trigger.differentNumericValue === true) {
        const [currentRaw, minimumRaw, maximumRaw] = await Promise.all([
          control.property("value"),
          control.property("min"),
          control.property("max"),
        ]);
        const current = Number(currentRaw);
        const minimum = Number(minimumRaw);
        const maximum = Number(maximumRaw);
        if (
          !Number.isFinite(current) ||
          !Number.isFinite(minimum) ||
          !Number.isFinite(maximum) ||
          minimum >= maximum
        )
          throw new Error(
            `native_interaction_numeric_bounds_unavailable:${definition.key}:${step.key}`,
          );
        const value = current === maximum ? minimum : maximum;
        triggerDetail = { ...triggerDetail, value };
        stepObservations.push({
          numeric_trigger_current: current,
          numeric_trigger_value: value,
          numeric_trigger_minimum: minimum,
          numeric_trigger_maximum: maximum,
        });
      }
      await control.trigger(step.trigger.event, triggerDetail);
      actionPerformed = true;
    }
    if (step.expectedPath) {
      try {
        page = await waitForCurrentPagePath(
          miniProgram,
          step.expectedPath,
          step.timeoutMs ?? 20_000,
        );
      } catch (error) {
        // A few DevTools builds acknowledge Element.tap before Taro's
        // delegated event bridge is attached. Re-trigger the same rendered
        // production control once while the source page is still topmost;
        // never open the destination route directly from the runner.
        if (
          !String(error?.message ?? error).startsWith(
            "native_formal_entry_timeout:",
          )
        )
          throw error;
        const currentPage = await miniProgram.currentPage().catch(() => null);
        if (currentPage?.path !== page.path) throw error;
        const freshControls = await waitForSelector(
          currentPage,
          step.tap,
          step.minimum ?? 1,
          step.timeoutMs ?? 20_000,
        );
        let freshControlIndex = step.index ?? 0;
        if (step.textIncludes) {
          const freshTexts = await Promise.all(
            freshControls.map((candidate) => candidate.text().catch(() => "")),
          );
          freshControlIndex = freshTexts.findIndex((value) =>
            value.includes(step.textIncludes),
          );
        }
        const freshControl = freshControls[freshControlIndex];
        if (!freshControl)
          throw new Error(
            `native_interaction_control_missing:${definition.key}:${step.key}:retry`,
          );
        await freshControl.trigger("tap");
        page = await waitForCurrentPagePath(
          miniProgram,
          step.expectedPath,
          step.timeoutMs ?? 20_000,
        );
      }
      stepObservations.push({
        expected_page_path: step.expectedPath,
        observed_page_path: page.path,
      });
    }
    // Mini Program component events update React state asynchronously. Keep the
    // native journey paced like a real user so the next control never observes
    // the previous input's pre-event state.
    if (actionPerformed)
      await new Promise((resolve) => setTimeout(resolve, step.settleMs ?? 350));
    for (const before of watchedBefore) {
      const elements = await waitForSelector(
        page,
        before.watch.selector,
        before.watch.minimum ?? 1,
        step.timeoutMs ?? 20_000,
      );
      const element = elements[before.watch.index ?? 0];
      const value =
        before.watch.kind === "attribute"
          ? await element.attribute(before.watch.name)
          : await element.text();
      const afterSha256 = sha256(canonical(value ?? null));
      if (afterSha256 === before.before_sha256)
        throw new Error(
          `native_interaction_expected_change_missing:${definition.key}:${step.key}:${before.watch.selector}:${before.watch.kind}:${before.watch.name ?? "text"}`,
        );
      stepObservations.push({
        selector: before.watch.selector,
        observed_change: true,
        before_sha256: before.before_sha256,
        after_sha256: afterSha256,
      });
    }
    if (step.waitFor?.length) {
      const ready = await waitForSelectorSet(
        page,
        step.waitFor,
        step.timeoutMs ?? 20_000,
      );
      if (!ready) {
        const finalCounts = await Promise.all(
          step.waitFor.map((definition) =>
            queryElements(page, definition.selector)
              .then((elements) => elements.length)
              .catch(() => 0),
          ),
        );
        const missing = step.waitFor
          .map((definition, index) => ({
            selector: definition.selector,
            count: finalCounts[index],
            minimum: definition.minimum,
          }))
          .filter((item) => item.count < item.minimum);
        throw new Error(
          `native_interaction_wait_timeout:${definition.key}:${step.key}:${sha256(canonical(missing))}:${missing.map((item) => `${item.selector}=${item.count}/${item.minimum}`).join(",")}`,
        );
      }
    }
    if (step.waitForAbsent?.length) {
      for (const selector of step.waitForAbsent) {
        const absent = await waitForSelectorAbsent(
          page,
          selector,
          step.timeoutMs ?? 20_000,
        );
        if (!absent)
          throw new Error(
            `native_interaction_absent_timeout:${definition.key}:${step.key}:${selector}`,
          );
      }
    }
    for (const expectation of step.expectText ?? []) {
      const elements = await waitForSelector(
        page,
        expectation.selector,
        expectation.minimum ?? 1,
        step.timeoutMs ?? 20_000,
      );
      const element = elements[expectation.index ?? 0];
      const observedText = String(await element?.text().catch(() => ""));
      if (!observedText.includes(expectation.fragment))
        throw new Error(
          `native_interaction_expected_text_missing:${definition.key}:${step.key}:${expectation.selector}:${sha256(expectation.fragment)}:${sha256(observedText)}`,
        );
      stepObservations.push({
        selector: expectation.selector,
        observed_text_sha256: sha256(observedText),
        expected_fragment_sha256: sha256(expectation.fragment),
        expected_text_observed: true,
      });
    }
    for (const selector of step.inspect ?? []) {
      const observation = await inspectSelector(page, selector);
      stepObservations.push(observation);
      if (observation.count < selector.minimum)
        throw new Error(
          `native_interaction_selector_timeout:${definition.key}:${step.key}:${selector.selector}:${selector.minimum}`,
        );
    }
    let stepScreenshot = null;
    if (step.screenshot === true) {
      const safeStepKey = step.key.replace(/[^a-z0-9_-]/giu, "-");
      const stepScreenshotName = `${definition.order.toString().padStart(2, "0")}-${definition.key}-${safeStepKey}.png`;
      const stepScreenshotAbsolute = path.join(runRoot, stepScreenshotName);
      await retryIdempotentAutomatorOperation(
        `journey-interaction-step-screenshot:${definition.key}:${step.key}`,
        () => miniProgram.screenshot({ path: stepScreenshotAbsolute }),
      );
      stepScreenshot = path
        .relative(root, stepScreenshotAbsolute)
        .replaceAll("\\", "/");
    }
    observations.push({
      key: step.key,
      selectors: stepObservations,
      ...(stepScreenshot ? { screenshot: stepScreenshot } : {}),
    });
  }
  const screenshotName = `${definition.order.toString().padStart(2, "0")}-${definition.key}-interactions.png`;
  const screenshotAbsolute = path.join(runRoot, screenshotName);
  if (definition.interactionsScreenshot !== false)
    await retryIdempotentAutomatorOperation(
      `journey-interactions-screenshot:${definition.key}`,
      () => miniProgram.screenshot({ path: screenshotAbsolute }),
    );
  return {
    status: "passed",
    steps: observations,
    ...(definition.interactionsScreenshot === false
      ? {}
      : {
          screenshot: path
            .relative(root, screenshotAbsolute)
            .replaceAll("\\", "/"),
        }),
  };
}

async function waitForRootFragment(
  page,
  rootSelector,
  fragment,
  expectedPresence,
  timeoutMs = 15_000,
) {
  const deadline = Date.now() + timeoutMs;
  let latestWxml = "";
  let rootObserved = false;
  while (Date.now() < deadline) {
    const rootElement = await queryElement(page, rootSelector).catch(
      () => null,
    );
    rootObserved ||= Boolean(rootElement);
    latestWxml = rootElement ? await rootElement.wxml().catch(() => "") : "";
    if (
      latestWxml.length > 0 &&
      latestWxml.includes(fragment) === expectedPresence
    )
      return latestWxml;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `native_root_fragment_timeout:${page.path}:${rootSelector}:${expectedPresence}:${rootObserved ? "root-observed" : "root-missing"}:${latestWxml.length}:${sha256(latestWxml)}`,
  );
}

async function waitForRecoveryControl(page, probe, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let latestControlCount = 0;
  let latestLabelHashes = [];
  while (Date.now() < deadline) {
    const controls = await queryElements(page, probe.recoverySelector).catch(
      () => [],
    );
    latestControlCount = controls.length;
    latestLabelHashes = [];
    for (let index = 0; index < controls.length; index += 1) {
      const control = controls[index];
      const controlText = await control.text().catch(() => "");
      const ariaLabel = String(
        (await control.attribute("aria-label").catch(() => "")) ||
          (await control.attribute("ariaLabel").catch(() => "")),
      );
      const observedLabel = controlText.trim() || ariaLabel.trim();
      latestLabelHashes.push(sha256(observedLabel));
      if (observedLabel === probe.recoveryText)
        return { control, index, controlText: observedLabel };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `native_recovery_control_missing:${page.path}:${sha256(probe.recoveryLabel)}:${latestControlCount}:${sha256(canonical(latestLabelHashes))}`,
  );
}

async function currentPageUrl(miniProgram, page, requiredQueryKeys = []) {
  const liveRoute = await miniProgram
    .evaluate(function () {
      const stack =
        typeof getCurrentPages === "function" ? getCurrentPages() : [];
      const current = stack[stack.length - 1];
      return current
        ? {
            path: current.route ?? current.__route__ ?? "",
            query: current.options ?? {},
          }
        : null;
    })
    .catch(() => null);
  const routePath = liveRoute?.path || page.path;
  if (routePath !== page.path)
    throw new Error(`native_prepared_route_mismatch:${page.path}:${routePath}`);
  const routeQuery = {
    ...(page.query ?? {}),
    ...(liveRoute?.query ?? {}),
  };
  for (const key of requiredQueryKeys)
    if (
      routeQuery[key] === undefined ||
      routeQuery[key] === null ||
      routeQuery[key] === ""
    )
      throw new Error(
        `native_prepared_route_parameter_missing:${page.path}:${key}`,
      );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(routeQuery).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (value !== undefined && value !== null) {
      const serializedValue = String(value);
      let normalizedValue = serializedValue;
      try {
        normalizedValue = decodeURIComponent(serializedValue);
      } catch {
        // Preserve malformed input so the production route can fail closed.
      }
      query.set(key, normalizedValue);
    }
  }
  const serialized = query.toString();
  return `/${routePath}${serialized ? `?${serialized}` : ""}`;
}

async function waitForCurrentPagePath(
  miniProgram,
  expectedPath,
  timeoutMs = 20_000,
) {
  const normalized = expectedPath.replace(/^\//u, "");
  const deadline = Date.now() + timeoutMs;
  let stableMatches = 0;
  let stablePage = null;
  while (Date.now() < deadline) {
    const page = await miniProgram.currentPage().catch(() => null);
    if (page?.path === normalized) {
      stableMatches += 1;
      stablePage = page;
      // DevTools can expose the destination path one render tick before the
      // pushed page becomes the top queryable page. Three consecutive reads
      // bind the returned handle to the settled production navigation.
      if (stableMatches >= 3) return stablePage;
    } else {
      stableMatches = 0;
      stablePage = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`native_formal_entry_timeout:${normalized}`);
}

async function switchTabAndWait(
  miniProgram,
  label,
  url,
  expectedPath,
  attemptLimit = 3,
) {
  let lastError;
  for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
    try {
      const requestedPage = await retryIdempotentAutomatorOperation(
        `${label}:attempt-${attempt}`,
        () => miniProgram.switchTab(url),
      );
      if (!requestedPage)
        throw new Error(`native_switch_tab_unavailable:${label}:${attempt}`);
      return await waitForCurrentPagePath(miniProgram, expectedPath, 12_000);
    } catch (error) {
      lastError = error;
      if (
        attempt === attemptLimit ||
        !String(error?.message ?? error).startsWith(
          "native_formal_entry_timeout:",
        )
      )
        throw error;
    }
  }
  throw new Error(
    `native_switch_tab_unreachable:${label}:${sha256(
      String(lastError?.message ?? lastError ?? ""),
    )}`,
  );
}

async function tapIntoPage(miniProgram, page, selector, expectedPath) {
  const controls = await waitForSelector(page, selector, 1);
  // A tab switch resolves before the DevTools simulator has always finished
  // attaching Taro's delegated event bridge. Pace this like a user arriving on
  // the page before pressing the next visible control.
  await new Promise((resolve) => setTimeout(resolve, 750));
  await controls[0].tap();
  try {
    // First entry into a subpackage can spend several seconds compiling and
    // mounting. A short timeout would dispatch the fallback against the source
    // page after the destination had already started becoming topmost.
    return await waitForCurrentPagePath(miniProgram, expectedPath, 20_000);
  } catch (error) {
    if (
      !String(error?.message ?? error).startsWith(
        "native_formal_entry_timeout:",
      )
    ) {
      throw error;
    }
    // Some WeChat DevTools builds acknowledge the physical Element.tap call
    // without forwarding its native tap event through Taro's delegated event
    // bridge. Re-dispatch the same production control event before treating the
    // route as unavailable; this still exercises the rendered control and its
    // production onClick owner rather than opening the destination directly.
    const currentPage = await miniProgram.currentPage().catch(() => null);
    if (currentPage?.path !== page.path)
      throw new Error(
        `native_formal_entry_unsettled:${expectedPath}:${currentPage?.path ?? "unknown"}`,
      );
    const freshControls = await waitForSelector(currentPage, selector, 1);
    await freshControls[0].trigger("tap");
    return waitForCurrentPagePath(miniProgram, expectedPath);
  }
}

async function ensureSavedPlanThroughProductionUi(miniProgram, page) {
  let activePage = page;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const summary = await queryElements(
      activePage,
      "[data-od-id='plan-summary']",
    ).catch(() => []);
    if (summary.length > 0) return activePage;
    const emptyActions = await queryElements(
      activePage,
      ".plan-empty .soft-button--primary",
    ).catch(() => []);
    if (emptyActions.length > 0) {
      await emptyActions[0].tap();
      activePage = await waitForCurrentPagePath(
        miniProgram,
        "content/plan/detail/index",
      );
      const formOpened = await waitForSelectorSet(
        activePage,
        [{ selector: "[data-od-id='plan-editor-form']", minimum: 1 }],
        3_000,
      );
      if (!formOpened) {
        const freshEmptyActions = await queryElements(
          activePage,
          ".plan-empty .soft-button--primary",
        ).catch(() => []);
        if (freshEmptyActions.length > 0)
          await freshEmptyActions[0].trigger("tap");
      }
      activePage = await waitForCurrentPagePath(
        miniProgram,
        "content/plan/detail/index",
      );
      await waitForSelector(activePage, "[data-od-id='plan-editor-form']", 1);
      await waitForSelector(activePage, ".plan-editor-form .field", 4);
      const saveActions = await waitForSelector(
        activePage,
        ".plan-editor-form__actions .soft-button--primary",
        1,
      );
      // The acceptance identity begins empty. Create its plan through the same
      // production form and API owner a real user uses; never seed a default
      // plan into product state or bypass revision/idempotency behavior.
      await saveActions[0].tap();
      activePage = await waitForCurrentPagePath(
        miniProgram,
        "content/plan/detail/index",
      );
      await waitForSelector(activePage, "[data-od-id='plan-summary']", 1);
      await new Promise((resolve) => setTimeout(resolve, 750));
      return activePage;
    }
    activePage = await miniProgram.currentPage().catch(() => activePage);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("native_plan_detail_preparation_timeout");
}

async function setDisplayModeThroughProductionUi(miniProgram, mode) {
  const mapPage = await retryIdempotentAutomatorOperation(
    `display-mode-${mode.toLowerCase()}-map-entry`,
    () => miniProgram.reLaunch("/pages/map/index"),
  );
  if (!mapPage) throw new Error(`native_display_mode_map_unavailable:${mode}`);
  await waitForCurrentPagePath(miniProgram, "pages/map/index");
  const myPage = await switchTabAndWait(
    miniProgram,
    `display-mode-${mode.toLowerCase()}-my-entry`,
    "/pages/my/index",
    "pages/my/index",
  );
  const settingsPage = await tapIntoPage(
    miniProgram,
    myPage,
    "[data-od-id='my-settings-action'] .soft-button",
    "content/settings/index",
  );
  const choices = await waitForSelector(
    settingsPage,
    ".settings-choice-grid .chip",
    2,
  );
  const target = choices[mode === "NIGHT" ? 1 : 0];
  const pressed = String(
    await target.attribute("aria-pressed").catch(() => "false"),
  );
  if (pressed !== "true") {
    await target.tap();
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  await waitForSelector(
    settingsPage,
    `.settings-page.theme-${mode === "NIGHT" ? "night" : "day"}`,
    1,
  );
}

async function selectFormalSpotThroughFinder(miniProgram, mapPage) {
  const existingPanel = await queryElements(
    mapPage,
    "[data-control~='map-spot-information-panel']",
  ).catch(() => []);
  if (existingPanel.length > 0) return mapPage;

  let searchPage;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    searchPage = await tapIntoPage(
      miniProgram,
      mapPage,
      "[data-control~='map-search-entry']",
      "spot/search/index",
    );
    await waitForSelector(
      searchPage,
      "[data-control~='spot-search-result-list']",
      1,
    );
    try {
      await waitForSelector(
        searchPage,
        "[data-control~='spot-search-result-card']",
        1,
        12_000,
      );
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      await retryIdempotentAutomatorOperation(
        "formal-finder-relaunch-after-empty-result",
        () => miniProgram.reLaunch("/pages/map/index"),
      );
      mapPage = await waitForCurrentPagePath(miniProgram, "pages/map/index");
      await waitForSelector(mapPage, ".map-page", 1);
    }
  }
  if (!searchPage) throw new Error("native_formal_finder_page_unavailable");
  const returnedMap = await nativeDiagnosticStage("search-result-select", () =>
    tapIntoPage(
      miniProgram,
      searchPage,
      "[data-control~='spot-search-result-card']",
      "pages/map/index",
    ),
  );
  await waitForSelector(returnedMap, "[data-control~='map-spot-information-panel']", 1);
  return returnedMap;
}

async function waitForFormalObservationContext(
  miniProgram,
  timeoutMs = 10_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const context = await miniProgram
      .evaluate(function () {
        return (
          globalThis.__STARWARD_MINIAPP_ACCEPTANCE__?.inspectContext?.() ?? null
        );
      })
      .catch(() => null);
    if (
      context?.locationKind === "FORMAL_SPOT" &&
      context?.spotId &&
      context?.routeOriginContextId
    )
      return context;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("native_formal_plan_context_timeout");
}

async function waitForMapPointObservationContext(miniProgram) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const context = await miniProgram
      .evaluate(function () {
        return (
          globalThis.__STARWARD_MINIAPP_ACCEPTANCE__?.inspectContext?.() ?? null
        );
      })
      .catch(() => null);
    if (context?.locationKind === "MAP_POINT") return context;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("native_plan_map_point_context_timeout");
}

async function waitForSyncedReminderPreferences(
  miniProgram,
  minimumRevision,
  timeoutMs = 12_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const preferences = await miniProgram
      .evaluate(function () {
        return (
          globalThis.__STARWARD_MINIAPP_ACCEPTANCE__?.inspectPreferences?.() ??
          null
        );
      })
      .catch(() => null);
    if (
      preferences &&
      preferences.revision >= minimumRevision &&
      preferences.dirty === false &&
      preferences.departureConditionReminder === true &&
      preferences.contributionStatusReminder === true
    )
      return preferences;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("native_settings_reminder_readback_timeout");
}

async function enterCurrentJourney(miniProgram, definition) {
  const flow = definition.entryFlow ?? "map";
  const requestedMapPage = await retryIdempotentAutomatorOperation(
    `journey-formal-entry:${definition.key}:map`,
    () => miniProgram.reLaunch("/pages/map/index"),
  );
  if (!requestedMapPage)
    throw new Error(`native_formal_map_entry_unavailable:${definition.key}`);
  let mapPage = await waitForCurrentPagePath(miniProgram, "pages/map/index");
  await waitForSelector(mapPage, ".map-page", 1);
  if (flow === "map") return mapPage;

  if (
    flow === "map-to-my" ||
    flow === "map-to-my-plan" ||
    flow === "map-to-my-settings" ||
    flow === "map-to-my-profile-links" ||
    flow === "map-to-my-import" ||
    flow === "map-to-my-contribution"
  ) {
    if (flow === "map-to-my-plan") {
      // A prior formal-detail/night journey may legitimately leave the shared
      // observation context bound to that formal spot. Re-launching Map must
      // preserve it; requiring an intermediate MAP_POINT would replace valid
      // product state solely for the runner. Finder selection remains the
      // production owner when no formal callout is already selected.
      await nativeDiagnosticStage("plan-formal-spot-select", () =>
        selectFormalSpotThroughFinder(miniProgram, mapPage),
      );
      await nativeDiagnosticStage("plan-formal-context-ready", () =>
        waitForFormalObservationContext(miniProgram),
      );
    }
    const requestedMyPage = await switchTabAndWait(
      miniProgram,
      `journey-formal-entry:${definition.key}:my-tab`,
      "/pages/my/index",
      "pages/my/index",
    );
    if (!requestedMyPage)
      throw new Error(`native_formal_my_entry_unavailable:${definition.key}`);
    const myPage = requestedMyPage;
    await waitForSelector(myPage, ".my-page", 1);
    if (flow === "map-to-my") return myPage;
    const child = {
      "map-to-my-plan": {
        selector: "[data-od-id='my-plan-entry']",
        path: "content/plan/detail/index",
      },
      "map-to-my-settings": {
        selector: "[data-od-id='my-settings-action'] .soft-button",
        path: "content/settings/index",
      },
      "map-to-my-contribution": {
        selector: "[data-od-id='my-contribution-entry']",
        path: "content/contribution/index",
      },
      "map-to-my-profile-links": {
        selector: "[data-od-id='my-profile-links-entry']",
        path: "content/profile/links/index",
      },
      "map-to-my-import": {
        selector: "[data-od-id='my-import-entry']",
        path: "content/import/index",
      },
    }[flow];
    if (!child) throw new Error(`unknown_native_my_flow:${flow}`);
    const childPage = await tapIntoPage(
      miniProgram,
      myPage,
      child.selector,
      child.path,
    );
    return flow === "map-to-my-plan"
      ? ensureSavedPlanThroughProductionUi(miniProgram, childPage)
      : childPage;
  }

  if (flow === "map-to-sky" || flow === "map-to-spot-contribution") {
    mapPage = await nativeDiagnosticStage("formal-spot-select", () =>
      selectFormalSpotThroughFinder(miniProgram, mapPage),
    );
    await waitForFormalObservationContext(miniProgram);
    return tapIntoPage(
      miniProgram,
      mapPage,
      flow === "map-to-sky"
        ? "[data-control~='spot-cloud-stargazing-action']"
        : "[data-control~='spot-contribution-entry']",
      flow === "map-to-sky"
        ? "sky/detail/index"
        : "content/contribution/index",
    );
  }

  throw new Error(`unknown_native_formal_entry_flow:${flow}`);
}

async function captureJourneyViewports(page, miniProgram, runRoot, definition) {
  const captures = [];
  for (const capture of definition.viewportCaptures ?? []) {
    const scroller = (await waitForSelector(page, capture.scroll, 1))[0];
    if (typeof scroller.scrollTo !== "function")
      throw new Error(
        `native_viewport_scroller_unsupported:${definition.key}:${capture.key}`,
      );
    let scrollTop = Number(capture.scrollTop);
    if (!Number.isFinite(scrollTop)) {
      const target = (await waitForSelector(page, capture.target, 1))[0];
      const targetOffset = await target.offset().catch(() => null);
      const scrollerOffset = await scroller.offset().catch(() => null);
      const currentScrollTop = Number(
        await scroller.property("scrollTop").catch(() => 0),
      );
      const targetTop = Number(targetOffset?.top ?? targetOffset?.y);
      const scrollerTop = Number(scrollerOffset?.top ?? scrollerOffset?.y);
      scrollTop =
        Number.isFinite(targetTop) && Number.isFinite(scrollerTop)
          ? Math.max(
              0,
              currentScrollTop +
                targetTop -
                scrollerTop -
                (capture.topInset ?? 16),
            )
          : capture.fallbackScrollTop;
    }
    if (!Number.isFinite(scrollTop))
      throw new Error(
        `native_viewport_scroll_target_unavailable:${definition.key}:${capture.key}`,
      );
    await scroller.scrollTo(0, scrollTop);
    await new Promise((resolve) =>
      setTimeout(resolve, capture.settleMs ?? 600),
    );
    const captureSelectors = [];
    for (const selector of capture.selectors ?? [])
      captureSelectors.push(await inspectSelector(page, selector));
    const screenshotName = `${definition.order.toString().padStart(2, "0")}-${definition.key}-${capture.key}.png`;
    const screenshotAbsolute = path.join(runRoot, screenshotName);
    await retryIdempotentAutomatorOperation(
      `journey-viewport-screenshot:${definition.key}:${capture.key}`,
      () => miniProgram.screenshot({ path: screenshotAbsolute }),
    );
    captures.push({
      key: capture.key,
      target: capture.target,
      scroll_top: scrollTop,
      selectors: captureSelectors,
      screenshot: path.relative(root, screenshotAbsolute).replaceAll("\\", "/"),
    });
  }
  for (const scrollSelector of [
    ...new Set(
      (definition.viewportCaptures ?? []).map((entry) => entry.scroll),
    ),
  ]) {
    const scroller = await queryElement(page, scrollSelector);
    if (typeof scroller?.scrollTo === "function") await scroller.scrollTo(0, 0);
  }
  return captures;
}

async function captureJourney(miniProgram, runRoot, definition) {
  if (definition.key === "plan-editor") {
    // Isolate the journey before opening the network-backed map. This reset
    // never seeds domain data; production map bootstrap must create the route
    // origin, and placing the reset here avoids cancelling a just-mounted map.
    await nativeDiagnosticStage("plan-client-state-reset", () =>
      resetThroughAcceptanceControl(miniProgram),
    );
  }
  if (definition.key === "sky-orientation") {
    await nativeDiagnosticStage("sky-orientation-night-mode", () =>
      setDisplayModeThroughProductionUi(miniProgram, "NIGHT"),
    );
  } else if (definition.key === "my-home") {
    await nativeDiagnosticStage("supporting-day-mode", () =>
      setDisplayModeThroughProductionUi(miniProgram, "DAY"),
    );
  }
  let page = await nativeDiagnosticStage(
    `journey-entry-${definition.key}`,
    () => enterCurrentJourney(miniProgram, definition),
  );
  if (definition.key === "my-home") {
    // My must be proven against a plan created from a formal spot context in
    // this same evidence session. A map-point context cannot legally create a
    // plan, and relying on a plan left in the database by an older run would
    // make this journey order-dependent and could hide a production failure.
    await nativeDiagnosticStage("my-plan-production-create", () =>
      enterCurrentJourney(miniProgram, {
        key: "my-home-plan-precondition",
        entryFlow: "map-to-my-plan",
      }),
    );
    page = await switchTabAndWait(
      miniProgram,
      "my-plan-return-to-my",
      "/pages/my/index",
      "pages/my/index",
    );
  }
  await waitForSelector(page, definition.root, 1);
  if (definition.importFixture) {
    const newDraftControls = await queryElements(
      page,
      "[data-od-id='import-new-draft'] .soft-button",
    ).catch(() => []);
    if (newDraftControls[0]) {
      await newDraftControls[0].tap();
      await waitForSelector(page, "[data-od-id='import-source-url']", 1);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  await new Promise((resolve) =>
    setTimeout(resolve, definition.settleMs ?? 1_000),
  );
  await waitForSelectorSet(page, definition.selectors);
  if (definition.key === "plan-editor") {
    const checklistRows = await waitForSelector(
      page,
      ".plan-checklist__row",
      5,
    );
    for (const row of checklistRows.slice(0, 3)) {
      const rowClass = String(await row.attribute("class").catch(() => ""));
      if (!rowClass.includes("plan-checklist__row--done")) await row.tap();
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    await waitForSelector(page, ".plan-checklist__row--done", 3);
  }
  const selectors = [];
  for (const selector of definition.selectors)
    selectors.push(await inspectSelector(page, selector));
  const rootElement = await queryElement(page, definition.root);
  const rootWxml = rootElement
    ? await rootElement.outerWxml().catch(() => "")
    : "";
  const rootClass = rootElement
    ? String(await rootElement.attribute("class").catch(() => ""))
    : "";
  const rootClasses = [
    ...new Set(rootClass.split(/\s+/u).filter(Boolean)),
  ].sort();
  const expectedRootClasses = definition.rootClasses ?? [];
  const missingRootClasses = expectedRootClasses.filter(
    (className) => !rootClasses.includes(className),
  );
  const rootStyles = {
    "background-color": rootElement
      ? await rootElement.style("background-color").catch(() => null)
      : null,
  };
  const screenshotName = `${definition.order.toString().padStart(2, "0")}-${definition.key}.png`;
  const screenshotAbsolute = path.join(runRoot, screenshotName);
  await retryIdempotentAutomatorOperation(
    `journey-screenshot:${definition.key}`,
    () => miniProgram.screenshot({ path: screenshotAbsolute }),
  );
  const viewportCaptures = await captureJourneyViewports(
    page,
    miniProgram,
    runRoot,
    definition,
  );
  let settingsPreferenceReadback = null;
  if (definition.key === "settings") {
    const before = await miniProgram.evaluate(function () {
      return globalThis.__STARWARD_MINIAPP_ACCEPTANCE__?.inspectPreferences?.();
    });
    const reminderControls = await Promise.all([
      waitForSelector(page, "#departure-condition-reminder", 1),
      waitForSelector(page, "#contribution-status-reminder", 1),
    ]);
    await reminderControls[0][0].tap();
    await reminderControls[1][0].tap();
    settingsPreferenceReadback = await waitForSyncedReminderPreferences(
      miniProgram,
      Number(before?.revision ?? 0) + 1,
    );
  }
  const interactions = await captureJourneyInteractions(
    page,
    miniProgram,
    runRoot,
    definition,
  );
  let expectedSelectedSpotReadback = null;
  if (definition.expectedSelectedSpotId) {
    const context = await waitForFormalObservationContext(miniProgram);
    if (context.spotId !== definition.expectedSelectedSpotId)
      throw new Error(
        `nightchina_formal_spot_readback_mismatch:${sha256(definition.expectedSelectedSpotId)}:${sha256(context.spotId)}`,
      );
    expectedSelectedSpotReadback = {
      expected_spot_id_sha256: sha256(definition.expectedSelectedSpotId),
      observed_spot_id_sha256: sha256(context.spotId),
      matched: true,
    };
  }
  return {
    key: definition.key,
    status:
      missingRootClasses.length === 0 &&
      selectors.every((entry) => entry.passed)
        ? "passed"
        : "failed",
    entry: definition.url.replace(/^\//u, ""),
    observed_page_path: page.path,
    root_selector: definition.root,
    expected_root_classes: expectedRootClasses,
    root_classes: rootClasses,
    missing_root_classes: missingRootClasses,
    root_styles: rootStyles,
    root_wxml_sha256: sha256(rootWxml),
    root_wxml_length: rootWxml.length,
    selectors,
    screenshot: path.relative(root, screenshotAbsolute).replaceAll("\\", "/"),
    viewport_captures: viewportCaptures,
    ...(settingsPreferenceReadback
      ? { settings_preference_readback: settingsPreferenceReadback }
      : {}),
    ...(interactions ? { interactions } : {}),
    ...(expectedSelectedSpotReadback
      ? { expected_selected_spot_readback: expectedSelectedSpotReadback }
      : {}),
    injected_fixture: definition.injectedFixture ?? null,
  };
}

const journeys = [
  {
    order: 1,
    key: "map-cold-start-location-fallback",
    url: "/pages/map/index",
    root: ".map-page",
    rootClasses: ["map-page", "theme-day", "location-default-region"],
    settleMs: 1_500,
    selectors: [
      { selector: ".native-map", minimum: 1, styles: ["width", "height"] },
      {
        selector: "[data-od-id='default-formal-markers']",
        minimum: 1,
        styles: ["width", "height"],
      },
      {
        selector: ".map-finder-trigger",
        minimum: 1,
        styles: ["min-height", "border-radius"],
      },
      {
        selector: "[data-od-id='map-search-summary']",
        minimum: 1,
        styles: ["min-height", "border-radius"],
      },
      {
        selector: ".map-conditions-bar",
        minimum: 1,
        styles: ["min-height", "border-radius"],
      },
      {
        selector: "[data-od-id='map-analysis-time-bar']",
        minimum: 1,
        styles: ["min-height", "border-radius"],
      },
      { selector: "[data-od-id='map-observing-conditions-icon']", minimum: 1 },
      { selector: "[data-od-id='map-permission-state']", minimum: 1 },
      {
        selector: ".map-floating-tools .soft-button",
        minimum: 2,
        styles: ["min-height"],
      },
    ],
    interactions: [
      {
        key: "finder-open",
        screenshot: true,
        tap: "[data-od-id='map-search-summary']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-sheet']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-search-input']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-search-icon']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-result-scroll']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-wanted-section']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-other-section']", minimum: 1 },
        ],
        inspect: [
          { selector: "[data-od-id='spot-finder-search-input']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-search-icon']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-result-scroll']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-wanted-section']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-other-section']", minimum: 1 },
          {
            selector: "[data-od-id='spot-finder-section-chevron']",
            minimum: 2,
          },
        ],
      },
      {
        key: "finder-filter-open",
        screenshot: true,
        tap: "[data-od-id='spot-finder-filter-disclosure']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-filter-overlay']", minimum: 1 },
          {
            selector: "[data-od-id='spot-finder-filter-advanced']",
            minimum: 1,
          },
          { selector: "[data-od-id='spot-finder-filter-choice']", minimum: 8 },
        ],
        inspect: [
          {
            selector: "[data-od-id='spot-finder-filter-scroll']",
            minimum: 1,
            attributes: ["enhanced", "show-scrollbar"],
          },
          { selector: "[data-od-id='spot-finder-filter-choice']", minimum: 8 },
        ],
      },
      {
        key: "finder-filter-edit-revert",
        screenshot: true,
        tap: "[data-od-id='spot-finder-filter-choice']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-filter-revert']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-filter-commit']", minimum: 1 },
        ],
      },
      {
        key: "finder-filter-revert",
        screenshot: true,
        tap: "[data-od-id='spot-finder-filter-revert']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-filter-overlay']", minimum: 1 },
        ],
        waitForAbsent: [
          "[data-od-id='spot-finder-filter-revert']",
          "[data-od-id='spot-finder-filter-commit']",
        ],
      },
      {
        key: "finder-filter-edit-commit",
        tap: "[data-od-id='spot-finder-filter-choice']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-filter-revert']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-filter-commit']", minimum: 1 },
        ],
      },
      {
        key: "finder-filter-commit",
        screenshot: true,
        tap: "[data-od-id='spot-finder-filter-commit']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-result-scroll']", minimum: 1 },
        ],
        waitForAbsent: [
          "[data-od-id='spot-finder-filter-overlay']",
          "[data-od-id='spot-finder-filter-revert']",
          "[data-od-id='spot-finder-filter-commit']",
        ],
      },
      {
        key: "finder-filter-clear-open",
        tap: "[data-od-id='spot-finder-filter-disclosure']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-filter-overlay']", minimum: 1 },
        ],
      },
      {
        key: "finder-filter-clear-edit",
        tap: "[data-od-id='spot-finder-filter-choice']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-filter-commit']", minimum: 1 },
        ],
      },
      {
        key: "finder-filter-clear-commit",
        tap: "[data-od-id='spot-finder-filter-commit']",
        waitFor: [
          { selector: "[data-od-id='spot-finder-result-scroll']", minimum: 1 },
          { selector: ".spot-card__result-main", minimum: 1 },
        ],
        waitForAbsent: ["[data-od-id='spot-finder-filter-overlay']"],
        settleMs: 1_000,
      },
      {
        key: "finder-result-select",
        screenshot: true,
        tap: ".spot-card__result-main",
        waitFor: [{ selector: ".spot-card__callout-main", minimum: 1 }],
        waitForAbsent: ["[data-od-id='spot-finder-sheet']"],
      },
      {
        key: "conditions-open",
        screenshot: true,
        tap: "[data-od-id='map-analysis-time-bar']",
        waitFor: [
          { selector: "[data-od-id='map-analysis-focus-panel']", minimum: 1 },
          { selector: "[data-od-id='source-lift-map-dock']", minimum: 1 },
          { selector: "#spot-map", minimum: 1 },
          { selector: "[data-od-id='map-analysis-time-scrubber']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-time-value']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-layer-choice']", minimum: 4 },
        ],
        inspect: [
          { selector: "[data-od-id='map-analysis-close']", minimum: 1 },
          { selector: "[data-od-id='source-lift-map-dock']", minimum: 1 },
          { selector: "#spot-map", minimum: 1 },
          { selector: "[data-od-id='map-analysis-time-scrubber']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-time-value']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-layer-choice']", minimum: 4 },
        ],
      },
      {
        key: "conditions-cloud-layer",
        screenshot: true,
        tap: "[data-od-id='map-analysis-layer-choice']",
        index: 2,
        waitFor: [
          { selector: "[data-od-id='selected-card-star']", minimum: 1 },
        ],
        settleMs: 1_500,
      },
      {
        key: "conditions-time-preview",
        screenshot: true,
        trigger: {
          selector: "[data-od-id='map-analysis-time-scrubber']",
          event: "changing",
          differentNumericValue: true,
        },
        expectChanged: [
          { selector: "[data-od-id='map-analysis-time-value']", kind: "text" },
        ],
      },
      {
        key: "conditions-time-commit",
        trigger: {
          selector: "[data-od-id='map-analysis-time-scrubber']",
          event: "change",
          differentNumericValue: true,
        },
        settleMs: 1_500,
      },
      {
        key: "conditions-light-static",
        screenshot: true,
        tap: "[data-od-id='map-analysis-layer-choice']",
        index: 1,
        waitFor: [
          { selector: "[data-od-id='selected-card-star']", minimum: 1 },
        ],
        settleMs: 1_500,
      },
      {
        key: "conditions-close",
        screenshot: true,
        tap: "[data-od-id='map-analysis-close']",
        waitForAbsent: ["[data-od-id='map-analysis-time-scrubber']"],
      },
    ],
  },
  {
    order: 2,
    key: "sky-orientation",
    url: "/sky/detail/index",
    entryFlow: "map-to-sky",
    requiresPreparedContext: true,
    preparedRouteParams: [
      "spotId",
      "contextId",
      "date",
      "selectedAt",
      "timezone",
      "dataRevision",
    ],
    root: ".sky-orientation-page",
    rootClasses: ["sky-orientation-page"],
    selectors: [
      {
        selector: "[data-od-id='sky-orientation-canvas']",
        minimum: 1,
        styles: ["display", "width", "height"],
      },
      {
        selector: "[data-od-id='sky-orientation-sensor']",
        minimum: 1,
        styles: ["display"],
      },
      {
        selector: "[data-od-id='sky-orientation-time-ruler']",
        minimum: 1,
        styles: ["display", "width"],
      },
      {
        selector: "[data-od-id='sky-orientation-object-list-toggle']",
        minimum: 1,
        styles: ["min-height"],
      },
    ],
    interactions: [
      {
        key: "orientation-object-list-open",
        screenshot: true,
        tap: "[data-od-id='sky-orientation-object-list-toggle']",
        waitFor: [
          {
            selector: "[data-od-id='sky-orientation-object-list']",
            minimum: 1,
          },
        ],
      },
    ],
  },
  {
    order: 3,
    key: "sky-supporting-data",
    url: "/sky/detail/index",
    entryFlow: "map-to-sky",
    requiresPreparedContext: true,
    preparedRouteParams: [
      "spotId",
      "contextId",
      "date",
      "selectedAt",
      "timezone",
      "dataRevision",
    ],
    root: ".sky-page",
    rootClasses: ["sky-page", "theme-night"],
    selectors: [
      {
        selector: ".sky-mobile-header",
        minimum: 1,
        styles: ["padding-top", "min-height"],
      },
      {
        selector: ".sky-decision",
        minimum: 1,
        styles: ["background-color", "box-shadow"],
      },
      {
        selector: ".sky-summary-stack--astronomy",
        minimum: 1,
        styles: ["display"],
      },
      { selector: ".time-card", minimum: 1, styles: ["border-radius"] },
      { selector: ".sky-scene", minimum: 1, styles: ["width", "height"] },
      {
        selector: "[data-od-id='sky-target-list']",
        minimum: 1,
        styles: ["display"],
      },
      {
        selector: ".sky-actions .soft-button",
        minimum: 3,
        styles: ["min-height"],
      },
    ],
    viewportCaptures: [
      {
        key: "canvas-controls",
        scroll: ".sky-page__scroll",
        target: ".sky-scene",
        fallbackScrollTop: 860,
      },
    ],
    interactions: [
      {
        key: "orientation-open",
        screenshot: true,
        tap: ".sky-actions .soft-button",
        index: 0,
        expectedPath: "sky/detail/index",
        // Keep the newly attached subpackage WebView alive through its routeDone
        // lifecycle before the next user navigation replaces it. The DevTools
        // simulator otherwise reports a missing webview even though the page is
        // already queryable, which is a real navigation-lifecycle race rather
        // than an acceptable console warning.
        settleMs: 1_500,
        waitFor: [
          { selector: "[data-od-id='sky-orientation-scene']", minimum: 1 },
          { selector: "[data-od-id='sky-orientation-control']", minimum: 1 },
          {
            selector: "[data-od-id='sky-orientation-object-list']",
            minimum: 1,
          },
          { selector: ".orientation-actions", minimum: 1 },
        ],
      },
      {
        key: "professional-matrix-open",
        screenshot: true,
        tap: ".sky-actions .soft-button",
        index: 0,
        expectedPath: "sky/detail/index",
        settleMs: 1_500,
        waitFor: [
          { selector: ".professional-card", minimum: 1 },
          { selector: ".professional-table", minimum: 1 },
          { selector: ".professional-matrix-row", minimum: 16 },
          {
            selector: ".professional-matrix-row__cell",
            minimum: 32,
          },
          { selector: ".professional-table-indicator", minimum: 1 },
        ],
        inspect: [
          {
            selector: ".professional-table",
            minimum: 1,
            attributes: ["scroll-x", "enhanced", "show-scrollbar"],
          },
          {
            selector: ".professional-matrix-row",
            minimum: 16,
            capture: 16,
          },
          {
            selector: ".professional-matrix-row__label",
            minimum: 16,
            styles: ["width", "white-space", "position", "left"],
            capture: 16,
          },
          {
            selector: ".professional-matrix-row__cell",
            minimum: 32,
            styles: ["width", "white-space", "text-align"],
            capture: 8,
          },
        ],
      },
    ],
  },
  {
    order: 4,
    key: "my-home",
    url: "/pages/my/index",
    entryFlow: "map-to-my",
    root: ".my-page",
    rootClasses: ["my-page", "theme-day"],
    selectors: [
      { selector: ".profile-summary", minimum: 1, styles: ["border-radius"] },
      {
        selector: ".routine-entry-list .routine-entry",
        minimum: 3,
        styles: ["min-height"],
      },
      {
        selector: "[data-od-id='my-settings-action'] .soft-button",
        minimum: 1,
        styles: ["min-height"],
      },
    ],
  },
  {
    order: 5,
    key: "profile-links",
    url: "/content/profile/links/index",
    entryFlow: "map-to-my-profile-links",
    root: ".profile-links-page",
    rootClasses: ["profile-links-page"],
    selectors: [
      {
        selector: "[data-od-id='profile-link-editor']",
        minimum: 1,
        styles: ["display"],
      },
      {
        selector: "[data-od-id='profile-link-open-copy']",
        minimum: 1,
        styles: ["display"],
      },
    ],
  },
  {
    order: 6,
    key: "own-post-import",
    url: "/content/import/index",
    entryFlow: "map-to-my-import",
    root: ".import-page",
    rootClasses: ["import-page"],
    selectors: [
      {
        selector: "[data-od-id='import-source-rights']",
        minimum: 1,
        styles: ["display"],
      },
    ],
  },
  {
    order: 7,
    key: "new-place-contribution",
    url: "/content/contribution/index",
    entryFlow: "map-to-my-contribution",
    root: ".contribution-page",
    rootClasses: ["contribution-page", "theme-day"],
    selectors: [
      {
        selector:
          "[data-od-id='contribution-kind-control'] .contribution-kind-choice",
        minimum: 1,
        styles: ["min-height"],
      },
    ],
    interactions: [
      {
        key: "candidate-form-ready",
        screenshot: true,
        waitFor: [
          {
            selector: "[data-od-id='contribution-location-consent']",
            minimum: 1,
          },
          {
            selector: "[data-od-id='contribution-topic-control'] .chip",
            minimum: 9,
          },
          { selector: "[data-od-id='contribution-media-upload']", minimum: 1 },
          { selector: "[data-od-id='contribution-media-rights']", minimum: 1 },
          { selector: ".contribution-actions .soft-button", minimum: 2 },
        ],
      },
      {
        key: "candidate-name",
        input: "[data-od-id='contribution-candidate-name']",
        value: "集成验收候选地点",
      },
      {
        key: "candidate-region",
        input: "[data-od-id='contribution-candidate-region']",
        value: "深圳周边",
      },
      {
        key: "candidate-latitude",
        input: "[data-od-id='contribution-candidate-latitude']",
        value: "22.543210",
      },
      {
        key: "candidate-longitude",
        input: "[data-od-id='contribution-candidate-longitude']",
        value: "114.057860",
      },
      {
        key: "candidate-detail",
        input: "[data-od-id='contribution-detail']",
        value:
          "这是原生验收建立的新增地点建议，只验证草稿、提交和身份回读，不作为真实地点事实。",
      },
      {
        key: "candidate-coordinate-consent",
        tap: "[data-od-id='contribution-coordinate-consent']",
      },
      {
        key: "candidate-submit",
        screenshot: true,
        tap: ".contribution-actions .soft-button--primary",
        waitFor: [
          { selector: ".contribution-history__row", minimum: 1 },
          { selector: "[data-od-id='contribution-status-list']", minimum: 1 },
        ],
        inspect: [{ selector: ".contribution-history__row", minimum: 1 }],
      },
    ],
  },
  {
    order: 6,
    key: "formal-spot-contribution",
    url: "/content/contribution/index",
    entryFlow: "map-to-spot-contribution",
    requiresPreparedContext: true,
    preparedRouteParams: ["spotId"],
    root: ".contribution-page",
    rootClasses: ["contribution-page", "theme-day"],
    selectors: [
      { selector: "[data-od-id='contribution-spot-context']", minimum: 1 },
      {
        selector:
          "[data-od-id='contribution-kind-control'] .contribution-kind-choice",
        minimum: 2,
        styles: ["min-height"],
      },
    ],
    interactions: [
      {
        key: "field-report-form-ready",
        screenshot: true,
        waitFor: [
          {
            selector: "[data-od-id='contribution-topic-control'] .chip",
            minimum: 9,
          },
          { selector: "[data-od-id='contribution-media-upload']", minimum: 1 },
          { selector: "[data-od-id='contribution-media-rights']", minimum: 1 },
          { selector: ".contribution-actions .soft-button", minimum: 2 },
        ],
      },
      {
        key: "field-report-detail",
        input: "[data-od-id='contribution-detail']",
        value:
          "这是原生验收建立的正式点现场反馈，只验证人工审核链路，不直接改变地图或今晚结论。",
      },
      {
        key: "field-report-submit",
        screenshot: true,
        tap: ".contribution-actions .soft-button--primary",
        waitFor: [
          { selector: ".contribution-history__row", minimum: 1 },
          { selector: "[data-od-id='contribution-status-list']", minimum: 1 },
        ],
        inspect: [{ selector: ".contribution-history__row", minimum: 1 }],
      },
    ],
  },
  {
    order: 7,
    key: "plan-editor",
    url: "/content/plan/detail/index",
    entryFlow: "map-to-my-plan",
    root: ".plan-editor",
    rootClasses: ["plan-editor", "theme-day"],
    selectors: [
      {
        selector: "[data-od-id='plan-summary']",
        minimum: 1,
        styles: ["width"],
      },
      {
        selector: "[data-od-id='plan-preparation']",
        minimum: 1,
        styles: ["border-radius"],
      },
      { selector: "[data-od-id='plan-route-nodes']", minimum: 1 },
      { selector: ".plan-route__node", minimum: 3 },
      {
        selector: ".plan-actions .soft-button",
        minimum: 2,
        styles: ["min-height"],
      },
    ],
  },
  {
    order: 8,
    key: "settings",
    url: "/content/settings/index",
    entryFlow: "map-to-my-settings",
    root: ".settings-page",
    rootClasses: ["settings-page", "theme-day"],
    selectors: [
      { selector: ".settings-card", minimum: 1, styles: ["border-radius"] },
      { selector: "#settings-permissions", minimum: 1 },
      { selector: "#nearby-location-preference", minimum: 1 },
      { selector: "#settings-reminders", minimum: 1 },
      { selector: "#departure-condition-reminder", minimum: 1 },
      { selector: "#contribution-status-reminder", minimum: 1 },
      {
        selector: "[data-od-id='display-mode-switcher']",
        minimum: 1,
        styles: ["min-height"],
      },
    ],
    viewportCaptures: [
      {
        key: "data-actions",
        scroll: ".settings-page__scroll",
        target: "#settings-data-actions",
        topInset: 16,
        fallbackScrollTop: 920,
        selectors: [{ selector: "#settings-data-actions", minimum: 1 }],
      },
      {
        key: "preferences",
        scroll: ".settings-page__scroll",
        target: "#settings-form",
        topInset: 16,
        fallbackScrollTop: 1_260,
        selectors: [
          { selector: "#settings-form", minimum: 1 },
          {
            selector: ".settings-choice-grid .chip",
            minimum: 2,
            styles: ["min-height"],
          },
        ],
      },
    ],
  },
  {
    order: 9,
    key: "upload-recovery",
    url: "/content/contribution/index",
    entryFlow: "map-to-spot-contribution",
    requiresPreparedContext: true,
    preparedRouteParams: ["spotId"],
    root: ".contribution-page",
    rootClasses: ["contribution-page", "theme-day"],
    selectors: [
      { selector: "[data-od-id='contribution-spot-context']", minimum: 1 },
      {
        selector:
          "[data-od-id='contribution-kind-control'] .contribution-kind-choice",
        minimum: 2,
      },
    ],
    interactions: [
      {
        key: "recovery-history-ready",
        waitFor: [
          { selector: "[data-od-id='contribution-status-list']", minimum: 1 },
          { selector: ".contribution-history__item .soft-button", minimum: 1 },
        ],
      },
      {
        key: "recovery-draft-resume",
        screenshot: true,
        scroll: {
          container: ".contribution-page__scroll",
          target: ".contribution-history__item .soft-button",
          topInset: 520,
        },
        tap: ".contribution-history__item .soft-button",
        waitFor: [
          { selector: "[data-od-id='contribution-media-upload']", minimum: 1 },
          { selector: ".contribution-media-row", minimum: 1 },
        ],
      },
      {
        key: "recovery-inline-state-ready",
        screenshot: true,
        waitFor: [
          { selector: "[data-od-id='contribution-media-upload']", minimum: 1 },
          { selector: ".contribution-media-row", minimum: 1 },
          { selector: ".contribution-media-row .soft-button", minimum: 1 },
          { selector: ".contribution-actions .soft-button--disabled", minimum: 1 },
        ],
        inspect: [
          {
            selector: ".contribution-media-row",
            minimum: 1,
          },
          { selector: ".contribution-media-row .soft-button", minimum: 1 },
          {
            selector: ".contribution-actions .soft-button--disabled",
            minimum: 1,
          },
        ],
      },
    ],
  },
];

function nightChinaImportInteractions(item) {
  const associationSteps =
    item.expectedAssociation.kind === "existing_formal_spot"
      ? [
          {
            key: "choose-formal-association",
            tap: "[data-od-id='import-association-formal']",
            waitFor: [
              { selector: "[data-od-id='import-formal-spot-id']", minimum: 1 },
            ],
          },
          {
            key: "enter-formal-spot-id",
            input: "[data-od-id='import-formal-spot-id']",
            value: item.expectedAssociation.spotId,
          },
        ]
      : [
          {
            key: "choose-proposal-association",
            tap: "[data-od-id='import-association-proposal']",
          },
        ];
  return [
    {
      key: "choose-other-source",
      tap: "[data-od-id='import-platform-other']",
    },
    {
      key: "enter-source-url",
      input: "[data-od-id='import-source-url']",
      value: item.sourceUrl,
    },
    {
      key: "confirm-owned-test-input-rights",
      tap: "[data-od-id='import-rights-confirmation']",
    },
    {
      key: "create-real-import-draft",
      screenshot: true,
      tap: "[data-od-id='import-create-draft'] .soft-button",
      settleMs: 750,
      waitFor: [
        { selector: "[data-od-id='import-draft-editor']", minimum: 1 },
        { selector: "[data-od-id='import-spot-association']", minimum: 1 },
        { selector: "[data-od-id='import-preview-submit']", minimum: 1 },
      ],
    },
    {
      key: "enter-owned-paraphrase-title",
      input: "[data-od-id='import-title']",
      value: item.title,
    },
    {
      key: "enter-owned-paraphrase-body",
      input: "[data-od-id='import-body']",
      value: item.importText,
    },
    {
      key: "enter-traceable-source-note",
      input: "[data-od-id='import-source-note']",
      value: `${item.reportedLocation} · ${item.reportedCaptureDate} · 来源照片权利未确认且未复用`,
    },
    {
      key: "enter-edit-stage",
      tap: "[data-od-id='import-enter-edit-draft'] .soft-button",
      settleMs: 650,
    },
    ...associationSteps,
    {
      key: "save-association-stage",
      tap: "[data-od-id='import-save-association'] .soft-button",
      settleMs: 750,
      waitFor: [
        { selector: "[data-od-id='import-open-preview'] .soft-button", minimum: 1 },
      ],
    },
    {
      key: "open-import-preview",
      screenshot: true,
      tap: "[data-od-id='import-open-preview'] .soft-button",
      settleMs: 750,
      waitFor: [
        { selector: "[data-od-id='import-submit-review'] .soft-button", minimum: 1 },
      ],
    },
    {
      key: "submit-manual-review-boundary",
      screenshot: true,
      tap: "[data-od-id='import-submit-review'] .soft-button",
      settleMs: 750,
      waitFor: [
        { selector: "[data-od-id='import-preview-submit'] .status-panel--ready", minimum: 1 },
      ],
      expectText: [
        {
          selector: "[data-od-id='import-preview-submit'] .status-panel--ready",
          fragment: "正式地点创建仍由后续审核/发布流程决定",
        },
      ],
    },
  ];
}

const orderedNightChinaImportCases = [
  ...nightChinaImportCorpus.cases.filter(
    (item) => item.expectedAssociation.kind !== "existing_formal_spot",
  ),
  ...nightChinaImportCorpus.cases.filter(
    (item) => item.expectedAssociation.kind === "existing_formal_spot",
  ),
];
const nightChinaImportJourneyKeys = orderedNightChinaImportCases.map(
  (item) => `nightchina-import-${item.key}`,
);
journeys.push(
  ...orderedNightChinaImportCases.map((item, index) => ({
    order: 20 + index,
    key: nightChinaImportJourneyKeys[index],
    url: "/content/import/index",
    entryFlow: "map-to-my-import",
    root: ".import-page",
    rootClasses: ["import-page"],
    selectors: [
      { selector: "[data-od-id='import-source-rights']", minimum: 1 },
    ],
    importFixture: true,
    injectedFixture: {
      schema_version: nightChinaImportCorpus.schemaVersion,
      case_key: item.key,
      source_url_sha256: sha256(item.sourceUrl),
      region_bucket: item.regionBucket,
      rights_disposition: item.rightsDisposition,
      expected_association_kind: item.expectedAssociation.kind,
    },
    interactions: nightChinaImportInteractions(item),
  })),
);

const nightChinaFormalCase = nightChinaCatalogAssociationCase;
const NIGHTCHINA_POST_IMPORT_SPOT_JOURNEY =
  "nightchina-post-import-formal-spot-panel";
journeys.push({
  order: 30,
  key: NIGHTCHINA_POST_IMPORT_SPOT_JOURNEY,
  url: "/pages/map/index",
  root: ".map-page",
  rootClasses: ["map-page", "theme-day"],
  selectors: [
    { selector: "[data-control~='map-search-entry']", minimum: 1 },
    { selector: "[data-control~='map-marker-panel-coordinator']", minimum: 1 },
  ],
  expectedSelectedSpotId: nightChinaFormalCase.expectedAssociation.spotId,
  injectedFixture: {
    schema_version: nightChinaImportCorpus.schemaVersion,
    case_key: nightChinaFormalCase.key,
    expected_formal_spot_id_sha256: sha256(
      nightChinaFormalCase.expectedAssociation.spotId,
    ),
    component_checks: nightChinaFormalCase.postImportSpotComponentChecks,
  },
  interactions: [
    {
      key: "return-to-map-search",
      tap: "[data-control~='map-search-entry']",
      expectedPath: "spot/search/index",
      waitFor: [
        { selector: "[data-control~='spot-search-result-card']", minimum: 1 },
      ],
    },
    {
      key: "search-associated-formal-spot",
      input: ".spot-search-field__input",
      value: nightChinaFormalCase.expectedAssociation.spotName,
      settleMs: 1_000,
      waitFor: [
        { selector: ".spot-search-suggestion", minimum: 1 },
      ],
    },
    {
      key: "open-associated-formal-spot-panel",
      screenshot: true,
      tap: ".spot-search-suggestion",
      textIncludes: nightChinaFormalCase.expectedAssociation.spotName,
      expectedPath: "pages/map/index",
      settleMs: 1_000,
      waitFor: [
        { selector: "[data-control~='map-spot-information-panel']", minimum: 1 },
        { selector: "[data-control~='spot-route-summary']", minimum: 1 },
        { selector: "[data-control~='spot-facility-evidence']", minimum: 1 },
      ],
    },
    {
      key: "expand-panel-large",
      tap: ".spot-panel__extent-button",
      index: 2,
      minimum: 3,
      expectChanged: [
        {
          selector: "[data-control~='map-spot-information-panel']",
          kind: "attribute",
          name: "class",
        },
      ],
      inspect: [
        { selector: "[data-control~='spot-route-summary']", minimum: 1 },
        { selector: "[data-control~='spot-facility-evidence']", minimum: 1 },
      ],
    },
    {
      key: "favorite-associated-spot",
      tap: "[data-control~='spot-favorite-action']",
      // The favorite owner performs an optimistic transition and then
      // reconciles the complete server relation. Pace the inverse action after
      // that reconciliation so this journey represents two completed user
      // operations instead of manufacturing an overlapping-mutation race.
      settleMs: 1_000,
      expectChanged: [
        {
          selector: "[data-control~='spot-favorite-action']",
          kind: "attribute",
          name: "class",
        },
      ],
    },
    {
      key: "restore-associated-spot-favorite",
      tap: "[data-control~='spot-favorite-action']",
      settleMs: 1_000,
      expectChanged: [
        {
          selector: "[data-control~='spot-favorite-action']",
          kind: "attribute",
          name: "class",
        },
      ],
    },
    {
      key: "exercise-system-share-boundary",
      tap: "[data-control~='spot-share-action']",
      settleMs: 500,
      waitFor: [
        { selector: "[data-od-id='notification-feedback']", minimum: 1 },
      ],
    },
    {
      key: "inspect-astronomy-section",
      tap: ".spot-panel__section-tab",
      index: 1,
      minimum: 2,
      waitFor: [
        { selector: "[data-control~='sky-professional-matrix']", minimum: 1 },
        { selector: "[data-control~='sky-target-list']", minimum: 1 },
      ],
    },
    {
      key: "enter-associated-spot-sky",
      waitForFormalContextSpotId:
        nightChinaFormalCase.expectedAssociation.spotId,
      tap: "[data-control~='spot-cloud-stargazing-action']",
      expectedPath: "sky/detail/index",
      waitFor: [
        { selector: "[data-od-id='sky-orientation-route']", minimum: 1 },
      ],
    },
    {
      key: "return-from-associated-spot-sky",
      tap: "[data-od-id='sky-orientation-back'] .sky-orientation-back",
      expectedPath: "pages/map/index",
      waitFor: [
        { selector: "[data-control~='map-spot-information-panel']", minimum: 1 },
      ],
    },
    {
      key: "restore-overview-section",
      tap: ".spot-panel__section-tab",
      index: 0,
      minimum: 2,
      waitFor: [
        { selector: "[data-control~='spot-contribution-entry']", minimum: 1 },
      ],
    },
    {
      key: "enter-associated-spot-contribution",
      screenshot: true,
      tap: "[data-control~='spot-contribution-entry']",
      expectedPath: "content/contribution/index",
      waitFor: [
        { selector: "[data-od-id='contribution-spot-context']", minimum: 1 },
      ],
    },
  ],
});

// Field Signal I21 keeps search as a real route and returns a selected formal
// spot to the same map before opening the information panel. Override the
// legacy in-page finder choreography with the current production route graph;
// the capture/comparison machinery remains shared and unchanged.
const currentMapJourney = journeys.find(
  (journey) => journey.key === "map-cold-start-location-fallback",
);
if (!currentMapJourney)
  throw new Error("field_signal_i21_map_journey_owner_missing");
currentMapJourney.selectors = [
  { selector: ".native-map", minimum: 1, styles: ["width", "height"] },
  {
    selector: "[data-control~='map-marker-panel-coordinator']",
    minimum: 1,
  },
  { selector: "[data-control~='map-search-entry']", minimum: 1 },
  { selector: "[data-control~='map-location-control']", minimum: 1 },
  { selector: "[data-control~='map-analysis-focus-layer']", minimum: 1 },
  { selector: "[data-control~='sky-map-canvas']", minimum: 1 },
];
currentMapJourney.interactions = [
  {
    key: "search-route-open",
    screenshot: true,
    tap: "[data-control~='map-search-entry']",
    expectedPath: "spot/search/index",
    waitFor: [
      { selector: ".spot-search-page", minimum: 1 },
      { selector: "[data-control~='spot-search-shell']", minimum: 1 },
      { selector: "[data-control~='spot-search-field']", minimum: 1 },
      { selector: "[data-control~='spot-search-filter-group']", minimum: 1 },
      { selector: "[data-control~='spot-search-filter-choice']", minimum: 1 },
      { selector: "[data-control~='spot-search-result-list']", minimum: 1 },
    ],
    inspect: [
      { selector: "[data-control~='spot-search-query-overlay']", minimum: 1 },
      { selector: "[data-control~='spot-search-filter-choice']", minimum: 1 },
    ],
  },
  {
    key: "formal-spot-query",
    screenshot: true,
    input: ".spot-search-field__input",
    value: nightChinaCatalogSpot.name,
    settleMs: 1_000,
    waitFor: [
      { selector: "[data-control~='spot-search-result-card']", minimum: 1 },
    ],
    inspect: [
      { selector: "[data-control~='spot-search-result-card']", minimum: 1 },
    ],
  },
  {
    key: "formal-spot-select",
    screenshot: true,
    tap: "[data-control~='spot-search-result-card']",
    expectedPath: "pages/map/index",
    settleMs: 1_000,
    waitFor: [
      { selector: "[data-control~='map-spot-information-panel']", minimum: 1 },
      { selector: "[data-control~='map-spot-panel-handle']", minimum: 1 },
      { selector: "[data-control~='map-spot-panel-section-nav']", minimum: 1 },
      { selector: "[data-control~='map-spot-panel-action-bar']", minimum: 1 },
      { selector: "[data-control~='spot-favorite-action']", minimum: 1 },
      { selector: "[data-control~='spot-share-action']", minimum: 1 },
      { selector: "[data-control~='spot-cloud-stargazing-action']", minimum: 1 },
    ],
  },
  {
    key: "spot-panel-astronomy-section",
    screenshot: true,
    tap: ".spot-panel__section-tab",
    index: 1,
    minimum: 2,
    waitFor: [
      { selector: "[data-control~='sky-professional-matrix']", minimum: 1 },
      { selector: "[data-control~='sky-target-list']", minimum: 1 },
      { selector: "[data-control~='sky-time-scrubber']", minimum: 1 },
    ],
  },
  {
    key: "spot-panel-close",
    tap: ".spot-panel__extent-button--close",
    waitForAbsent: ["[data-control~='map-spot-information-panel']"],
  },
  {
    key: "analysis-layer-open",
    screenshot: true,
    tap: "[data-control~='map-analysis-focus-layer']",
    waitFor: [
      { selector: "[data-control~='map-layer-selector']", minimum: 1 },
      { selector: ".map-layer-sheet__choice", minimum: 3 },
      { selector: "[data-control~='map-time-control']", minimum: 1 },
    ],
  },
  {
    key: "analysis-layer-change",
    screenshot: true,
    tap: ".map-layer-sheet__choice",
    index: 1,
    minimum: 3,
    waitFor: [{ selector: ".map-layer-sheet__choice--active", minimum: 1 }],
  },
];

if (platformSimulation) {
  const mapJourney = journeys.find(
    (journey) => journey.key === "map-cold-start-location-fallback",
  );
  const skyJourney = journeys.find(
    (journey) => journey.key === "sky-orientation",
  );
  if (!mapJourney || !skyJourney)
    throw new Error("platform_simulation_journey_owner_missing");
  mapJourney.interactions = [
    {
      key: "platform-simulated-location",
      screenshot: true,
      tap: "[data-control~='map-location-control']",
      settleMs: 1_500,
      waitFor: [{ selector: ".map-page.location-granted", minimum: 1 }],
      inspect: [
        { selector: ".map-page.location-granted", minimum: 1 },
        { selector: ".sr-live", minimum: 1 },
      ],
    },
  ];
  skyJourney.interactions = [
    {
      key: "platform-simulated-orientation-state",
      screenshot: true,
      tap: ".sky-orientation-object-toggle__button",
      settleMs: 900,
      waitFor: [
        { selector: "[data-od-id='sky-orientation-sensor']", minimum: 1 },
        { selector: "[data-od-id='sky-orientation-object-list']", minimum: 1 },
      ],
      inspect: [
        { selector: "[data-od-id='sky-orientation-sensor']", minimum: 1 },
        { selector: "[data-od-id='sky-orientation-canvas']", minimum: 1 },
      ],
    },
  ];
}

const journeyKeysByScope = {
  "map-experience": [
    "map-cold-start-location-fallback",
    NIGHTCHINA_POST_IMPORT_SPOT_JOURNEY,
  ],
  "full-sky": ["sky-orientation"],
  "my-profile-settings": [
    "my-home",
    "plan-editor",
    "settings",
    "profile-links",
    "own-post-import",
    ...nightChinaImportJourneyKeys,
    NIGHTCHINA_POST_IMPORT_SPOT_JOURNEY,
  ],
  contribution: [
    "new-place-contribution",
    "formal-spot-contribution",
    "upload-recovery",
  ],
  "platform-simulation": [
    "map-cold-start-location-fallback",
    "sky-orientation",
  ],
  "current-candidate": [
    "map-cold-start-location-fallback",
    "sky-orientation",
    "my-home",
    "plan-editor",
    "settings",
    "profile-links",
    "own-post-import",
    ...nightChinaImportJourneyKeys,
    NIGHTCHINA_POST_IMPORT_SPOT_JOURNEY,
    "new-place-contribution",
    "formal-spot-contribution",
    "upload-recovery",
  ],
};

const faultJourneysByScope = {
  "map-experience": ["map-cold-start-location-fallback"],
  "full-sky": ["sky-orientation"],
  "my-profile-settings": ["my-home"],
  contribution: ["formal-spot-contribution"],
  "current-candidate": [
    "map-cold-start-location-fallback",
    "sky-orientation",
    "my-home",
    "formal-spot-contribution",
  ],
};

const faultProbeByJourney = {
  "map-cold-start-location-fallback": {
    expectedFragment: "网络连接失败",
    faultTimeoutMs: 35_000,
    recoveryLabel: "重试",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重试",
  },
  "sky-orientation": {
    expectedFragment: "天空计算请求失败",
    faultTimeoutMs: 35_000,
    recoveryLabel: "重试天空",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重试天空",
  },
  "my-home": {
    expectedFragment: "账户资料暂未刷新",
    faultTimeoutMs: 35_000,
    recoveryLabel: "重试同步",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重试同步",
  },
  "formal-spot-contribution": {
    expectedFragment: "暂时无法回读提交状态",
    faultTimeoutMs: 35_000,
    recoveryLabel: "重试回读",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重试回读",
  },
};

async function installPlatformSimulationMocks(miniProgram) {
  const methods = ["getLocation"];
  const installed = [];
  try {
    await miniProgram.mockWxMethod("getLocation", function (options) {
      const result = {
        errMsg: "getLocation:ok",
        latitude: 31.2304,
        longitude: 121.4737,
        accuracy: 12,
        horizontalAccuracy: 12,
        verticalAccuracy: 12,
      };
      if (options && typeof options.success === "function")
        options.success(result);
      if (options && typeof options.complete === "function")
        options.complete(result);
      return result;
    });
    installed.push("getLocation");
    const compassPatch = await miniProgram.evaluate(function () {
      const platform = globalThis.wx;
      if (!platform) return { status: "unavailable", reason: "wx_missing" };
      const key = "__STARWARD_PLATFORM_SIMULATION_COMPASS__";
      if (globalThis[key])
        return { status: "unavailable", reason: "owner_already_present" };
      const state = {
        originals: {
          onCompassChange: platform.onCompassChange,
          offCompassChange: platform.offCompassChange,
          startCompass: platform.startCompass,
          stopCompass: platform.stopCompass,
        },
        listener: null,
        timers: [],
      };
      const onCompassChange = function (listener) {
        state.listener = listener;
        state.timers.push(
          setTimeout(function () {
            if (state.listener === listener && typeof listener === "function")
              listener({ direction: 42, accuracy: "high" });
          }, 100),
        );
        state.timers.push(
          setTimeout(function () {
            if (state.listener === listener && typeof listener === "function")
              listener({ direction: 137, accuracy: "high" });
          }, 500),
        );
      };
      const offCompassChange = function (listener) {
        if (!listener || state.listener === listener) state.listener = null;
        state.timers.forEach(clearTimeout);
        state.timers = [];
      };
      const settle = function (name, options) {
        const result = { errMsg: name + ":ok" };
        if (options && typeof options.success === "function")
          options.success(result);
        if (options && typeof options.complete === "function")
          options.complete(result);
        return result;
      };
      const startCompass = function (options) {
        return settle("startCompass", options);
      };
      const stopCompass = function (options) {
        state.listener = null;
        state.timers.forEach(clearTimeout);
        state.timers = [];
        return settle("stopCompass", options);
      };
      globalThis[key] = state;
      platform.onCompassChange = onCompassChange;
      platform.offCompassChange = offCompassChange;
      platform.startCompass = startCompass;
      platform.stopCompass = stopCompass;
      const installed =
        platform.onCompassChange === onCompassChange &&
        platform.offCompassChange === offCompassChange &&
        platform.startCompass === startCompass &&
        platform.stopCompass === stopCompass;
      if (!installed) {
        platform.onCompassChange = state.originals.onCompassChange;
        platform.offCompassChange = state.originals.offCompassChange;
        platform.startCompass = state.originals.startCompass;
        platform.stopCompass = state.originals.stopCompass;
        delete globalThis[key];
      }
      return {
        status: installed ? "installed" : "unavailable",
        reason: installed ? null : "wx_methods_not_replaceable",
      };
    });
    if (compassPatch?.status !== "installed")
      throw new Error(
        `platform_simulation_compass_patch_unavailable:${compassPatch?.reason ?? "unknown"}`,
      );
  } catch (error) {
    for (const method of installed.reverse())
      await miniProgram.restoreWxMethod(method).catch(() => undefined);
    throw error;
  }
  return {
    status: "installed",
    kind: "test-only fixed WeChat API simulation",
    location_fixture: "GCJ02:shanghai-public-test-coordinate",
    compass_sequence_degrees: [42, 137],
    methods: ["mockWxMethod:getLocation", "appThreadPatch:compassLifecycle"],
  };
}

async function restorePlatformSimulationMocks(miniProgram) {
  const compassRestoration = await miniProgram.evaluate(function () {
    const platform = globalThis.wx;
    const key = "__STARWARD_PLATFORM_SIMULATION_COMPASS__";
    const state = globalThis[key];
    if (!platform || !state) return false;
    state.listener = null;
    state.timers.forEach(clearTimeout);
    platform.onCompassChange = state.originals.onCompassChange;
    platform.offCompassChange = state.originals.offCompassChange;
    platform.startCompass = state.originals.startCompass;
    platform.stopCompass = state.originals.stopCompass;
    delete globalThis[key];
    return true;
  });
  await miniProgram.restoreWxMethod("getLocation");
  if (!compassRestoration)
    throw new Error("platform_simulation_compass_restore_missing");
  return {
    status: "passed",
    restored_methods: [
      "appThreadPatch:compassLifecycle",
      "mockWxMethod:getLocation",
    ],
  };
}

async function captureFaultAndRecovery({
  miniProgram,
  runRoot,
  definition,
  preparedUrl,
  restartApi,
}) {
  const probe = faultProbeByJourney[definition.key];
  if (!probe) throw new Error(`native_fault_probe_missing:${definition.key}`);
  const page = preparedUrl
    ? await retryIdempotentAutomatorOperation(
        `fault-route:${definition.key}`,
        () => miniProgram.reLaunch(preparedUrl),
      )
    : await enterCurrentJourney(miniProgram, definition);
  if (!page) throw new Error(`native_fault_page_missing:${definition.key}`);
  const faultWxml = await waitForRootFragment(
    page,
    definition.root,
    probe.expectedFragment,
    true,
    probe.faultTimeoutMs,
  );
  const faultObserved = true;
  const faultScreenshot = path.join(runRoot, `fault-${definition.key}.png`);
  await retryIdempotentAutomatorOperation(
    `fault-screenshot:${definition.key}`,
    () => miniProgram.screenshot({ path: faultScreenshot }),
  );

  const recoveryControl = await waitForRecoveryControl(page, probe);
  await restartApi();
  await recoveryControl.control.tap();
  const recoveredWxml = await waitForRootFragment(
    page,
    definition.root,
    probe.expectedFragment,
    false,
  );
  const recoveryObserved = true;
  const recoveryScreenshot = path.join(
    runRoot,
    `recovered-${definition.key}.png`,
  );
  await retryIdempotentAutomatorOperation(
    `recovery-screenshot:${definition.key}`,
    () => miniProgram.screenshot({ path: recoveryScreenshot }),
  );
  return {
    status: faultObserved && recoveryObserved ? "passed" : "failed",
    kind: "bff_process_unavailable_then_restarted",
    journey_key: definition.key,
    fault_observed: faultObserved,
    fault_observation_sha256: sha256(faultWxml),
    fault_screenshot: path
      .relative(root, faultScreenshot)
      .replaceAll("\\", "/"),
    recovery_control_selector: probe.recoverySelector,
    recovery_control_index: recoveryControl.index,
    recovery_control_label: probe.recoveryLabel,
    recovery_control_observed_label_sha256: sha256(recoveryControl.controlText),
    recovery_observed: recoveryObserved,
    recovery_observation_sha256: sha256(recoveredWxml),
    recovery_screenshot: path
      .relative(root, recoveryScreenshot)
      .replaceAll("\\", "/"),
  };
}

async function main() {
  const runId = `wechat-devtools-${new Date().toISOString().replaceAll(/[:.]/gu, "-")}-${randomUUID().slice(0, 8)}`;
  const runRoot = path.join(
    root,
    "artifacts",
    "miniapp",
    "native",
    "runs",
    runId,
  );
  await mkdir(runRoot, { recursive: true });
  const privateMediaRoot = path.join(runRoot, "private-media");
  const startedAt = new Date().toISOString();
  await writeJson(currentEvidencePath, {
    schema_version: "wechat-devtools-native-session-v2",
    status: "collecting",
    run_id: runId,
    started_at: startedAt,
  });
  const before = await candidateSnapshot();
  let apiProcess;
  let devtoolsLaunch;
  let miniProgram;
  let detachRuntimeObservers;
  let apiPort;
  let automationPort;
  let infrastructure;
  let productionDataPreparation;
  let projectIdentitySession;
  let simulatorPreferenceSession;
  let devtoolsToolInfo;
  let capturedError;
  const runtimeStartedAt = Date.now();
  const runtimeEvents = [];
  const runnerFaults = [];
  const startupAttempts = [];
  let runtimePhase = "setup";
  const attachRuntimeObservers = async (program) => {
    await enableRuntimeLog(program);
    const onConsole = (event) => {
      const rendered = runtimeEventJson(event);
      const level = String(
        event?.level ?? event?.type ?? event?.method ?? "unknown",
      ).toLowerCase();
      runtimeEvents.push({
        kind: "console",
        phase: runtimePhase,
        offset_ms: Date.now() - runtimeStartedAt,
        level,
        payload_sha256: sha256(rendered),
        payload_length: rendered.length,
        ...(level === "error" || level === "assert"
          ? { safe_excerpt: safeRuntimeExcerpt(event) }
          : {}),
      });
    };
    const onException = (event) => {
      const rendered = runtimeEventJson(event);
      runtimeEvents.push({
        kind: "exception",
        phase: runtimePhase,
        offset_ms: Date.now() - runtimeStartedAt,
        payload_sha256: sha256(rendered),
        payload_length: rendered.length,
        safe_excerpt: safeRuntimeExcerpt(event),
      });
    };
    EventEmitter.prototype.on.call(program, "console", onConsole);
    EventEmitter.prototype.on.call(program, "exception", onException);
    return () => {
      EventEmitter.prototype.removeListener.call(program, "console", onConsole);
      EventEmitter.prototype.removeListener.call(
        program,
        "exception",
        onException,
      );
    };
  };
  const captureUnhandledRejection = (reason) => {
    runnerFaults.push({
      kind: "unhandled_rejection",
      message_sha256: sha256(String(reason?.message ?? reason)),
      stack_sha256: sha256(String(reason?.stack ?? "")),
    });
  };
  process.on("unhandledRejection", captureUnhandledRejection);
  const result = {
    schema_version: "wechat-devtools-native-session-v2",
    status: "failed",
    run_id: runId,
    session_id: runId,
    started_at: startedAt,
    finished_at: null,
    project_root: "apps/wechat-miniapp/project.config.json",
    target: "WeChat DevTools native Mini Program simulator automation",
    cold_start: true,
    scope: acceptanceScope,
    mode: acceptanceMode,
    release_action: "none",
    toolchain: {
      automator_version: JSON.parse(
        await readFile(
          path.join(
            root,
            "node_modules",
            "miniprogram-automator",
            "package.json",
          ),
          "utf8",
        ),
      ).version,
      cli_sha256: sha256(await readFile(cliPath)),
    },
    simulator_preferences: { status: "pending" },
    candidate_before: before,
    candidate_after: null,
    build: null,
    bundle_after: null,
    project_session: {
      status: "pending",
      kind: "exclusive current-candidate WeChat DevTools project session",
      mutation_guard:
        "candidate and generated-bundle before/after fingerprints plus direct physical snapshot-path, same-byte public-config refresh, semantic-equivalence-guarded exact public-config restoration, and exact private-config restoration",
      snapshot_location: { status: "pending" },
      snapshot_registration: { status: "pending" },
      preparation_shutdown: { status: "pending" },
      evidence_shutdown: { status: "pending" },
      public_config_restoration: { status: "pending" },
      identity: { status: "pending" },
      path_bindings: [],
      project_config_refreshes: [],
    },
    setup: null,
    runtime: null,
    cleanup: null,
    journeys: [],
    fault_injection: null,
    platform_simulation: platformSimulation
      ? {
          status: "pending",
          evidence_class: "supplemental test-only diagnostic",
          establishes_real_platform_behavior: false,
        }
      : null,
    request_diagnostics: [],
    runtime_events: runtimeEvents,
    runner_faults: runnerFaults,
    startup_attempts: startupAttempts,
    limitations: [
      "This evidence is a local current-candidate WeChat DevTools simulator session, not preview, upload, review, device, or release evidence.",
      "External provider capabilities that are unavailable remain gated and are not upgraded into live facts by this session.",
    ],
    durable_runtime: { status: "pending" },
  };
  const openObservedSession = async (stage) => {
    const attemptLimit = 3;
    for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
      let attemptLaunch;
      let attemptProgram;
      let attemptDetachRuntimeObservers;
      try {
        attemptLaunch = await startWechatAutomation(
          sourceProjectPath,
          automationPort,
        );
        attemptProgram = await connectWechatAutomation(attemptLaunch);
        const toolInfo = await attemptProgram.send("Tool.getInfo");
        if (toolInfo.SDKVersion !== wechatAcceptanceSdkVersion)
          throw new Error(
            `wechat_base_library_mismatch:${sha256(
              String(toolInfo.SDKVersion ?? "missing"),
            )}`,
          );
        attemptDetachRuntimeObservers =
          await attachRuntimeObservers(attemptProgram);
        const initialPage = await waitForInitialPage(attemptProgram, 60_000);
        startupAttempts.push({
          stage,
          attempt,
          status: "passed",
          initial_page_activation: initialPage.activation,
          project_path_binding: attemptLaunch.projectPathBinding,
          project_config_refresh: attemptLaunch.projectConfigRefresh,
          base_library_version: toolInfo.SDKVersion,
        });
        result.project_session.path_bindings.push({
          stage,
          ...attemptLaunch.projectPathBinding,
        });
        result.project_session.project_config_refreshes.push({
          stage,
          ...attemptLaunch.projectConfigRefresh,
        });
        return {
          launch: attemptLaunch,
          program: attemptProgram,
          detachRuntimeObservers: attemptDetachRuntimeObservers,
          toolInfo,
        };
      } catch (error) {
        const failedPathBinding =
          error?.projectPathBinding ?? attemptLaunch?.projectPathBinding;
        const ideAtFailure = observeWechatIdeInstances();
        const watchersAtFailure = observeWechatWatcherProjects();
        const attemptRecord = {
          stage,
          attempt,
          status: "failed",
          diagnostic_sha256: sha256(String(error?.message ?? error)),
          diagnostic_excerpt: safeRuntimeExcerpt(error),
          cli_exit_code: attemptLaunch?.cliProcess?.exitCode ?? null,
          cli_launch_diagnostic_sha256:
            attemptLaunch?.launchDiagnostic?.() ?? null,
          cli_launch_diagnostic_excerpt:
            attemptLaunch?.launchDiagnosticExcerpt?.() ?? null,
          project_config_refresh: attemptLaunch?.projectConfigRefresh ?? null,
          failure_observation: {
            automation_port_live: await canConnect(automationPort),
            ide_http_port_live: await canConnect(wechatIdeHttpPort),
            ide_root_process_count: ideAtFailure.processCount,
            unreadable_callback_port_count:
              ideAtFailure.unreadableCallbackPortCount,
            observed_callback_ports: ideAtFailure.callbackPorts,
            observed_ide_http_ports: ideAtFailure.ideHttpPorts,
            watcher_process_count: watchersAtFailure.processCount,
            watcher_project_path_sha256s:
              watchersAtFailure.projects.map(sha256),
          },
          cleanup_status: "pending",
          ...(failedPathBinding
            ? { project_path_binding: failedPathBinding }
            : {}),
        };
        startupAttempts.push(attemptRecord);
        attemptDetachRuntimeObservers?.();
        if (attemptProgram) {
          try {
            await attemptProgram.close();
          } catch {
            try {
              attemptProgram.disconnect();
            } catch {}
          }
        }
        if (attemptLaunch?.cliProcess?.exitCode === null)
          stopProcessTree(attemptLaunch.cliProcess.pid);
        try {
          await quitWechatDevtoolsAndWait(
            sourceProjectPath,
            [wechatIdeHttpPort, automationPort],
            60_000,
          );
          attemptRecord.cleanup_status = "passed";
        } catch {
          attemptRecord.cleanup_status = "failed";
        }
        if (attempt === attemptLimit)
          throw new Error(
            `wechat_observed_session_start_failed:${stage}:${attemptRecord.diagnostic_sha256}`,
          );
      }
    }
    throw new Error(`wechat_observed_session_start_unreachable:${stage}`);
  };
  try {
    runtimePhase = "durable-infrastructure";
    infrastructure = await prepareNativeInfrastructure(runId);
    result.durable_runtime = {
      status: "passed",
      storage: "run-unique PostgreSQL/PostGIS",
      cache: "run-unique Redis namespace",
      media: "run-unique private filesystem root",
      fixture_mode: false,
      memory_test_mode: false,
    };
    apiPort = await availableLoopbackPort();
    automationPort = wechatAutomationPort;
    while (apiPort === automationPort) apiPort = await availableLoopbackPort();
    result.toolchain.automation_port = automationPort;
    result.toolchain.api_port = apiPort;
    result.project_session.snapshot_location =
      await verifyWechatSnapshotLocation();
    result.toolchain.process_environment =
      await verifyWechatProcessEnvironment();
    result.project_session.preparation_shutdown =
      await quitWechatDevtoolsAndWait(
        sourceProjectPath,
        [wechatIdeHttpPort, automationPort],
        60_000,
      );
    simulatorPreferenceSession = await applyWechatSimulatorPreferences(
      acceptanceDevice,
      acceptanceTextSize,
    );
    result.simulator_preferences = simulatorPreferenceSession.evidence;
    result.build = await buildCurrentCandidate(
      apiPort,
      infrastructure.environment,
    );
    apiProcess = await startApi(
      apiPort,
      privateMediaRoot,
      infrastructure.environment,
    );
    runtimePhase = "production-data-preparation";
    productionDataPreparation = {
      formal_spot: await prepareNativeFormalSpot(
        apiPort,
        infrastructure,
        runId,
      ),
      upload_recovery: null,
    };
    projectIdentitySession = await prepareWechatProjectIdentity(
      before.sha256,
      sourceProjectPath,
    );
    result.project_session.identity = projectIdentitySession.evidence;
    runtimePhase = "snapshot-project-registration";
    result.project_session.snapshot_registration =
      await registerWechatSnapshotProject({
        projectPath: sourceProjectPath,
        automationPort,
        snapshotLocation: result.project_session.snapshot_location,
      });
    runtimePhase = "setup-startup";
    ({
      launch: devtoolsLaunch,
      program: miniProgram,
      detachRuntimeObservers,
      toolInfo: devtoolsToolInfo,
    } = await openObservedSession("setup"));
    result.toolchain.devtools_version = devtoolsToolInfo.version;
    result.toolchain.base_library_version = devtoolsToolInfo.SDKVersion;
    runtimePhase = "setup-reset-before-control";
    const setupReset = await resetThroughAcceptanceControl(miniProgram);
    runtimePhase = "setup-diagnostics-clear";
    await miniProgram.callWxMethod(
      "setStorageSync",
      requestDiagnosticStorageKey,
      [],
    );
    runtimePhase = "setup-day-control";
    const setupDayControl = await activateDayModeThroughProductionControl(
      miniProgram,
      (phase) => {
        runtimePhase = phase;
      },
    );
    const setupRequestDiagnostics = await miniProgram
      .callWxMethod("getStorageSync", requestDiagnosticStorageKey)
      .catch(() => []);
    const setupRuntimeQuiescence =
      await waitForRuntimeEventQuiescence(runtimeEvents);
    detachRuntimeObservers();
    detachRuntimeObservers = undefined;
    runtimePhase = "setup-close";
    await miniProgram.close();
    miniProgram = undefined;
    if (devtoolsLaunch.cliProcess.exitCode === null)
      stopProcessTree(devtoolsLaunch.cliProcess.pid);
    result.setup = {
      status: "passed",
      purpose: "deterministic default-state cold start",
      storage_scope: [appStateStorageKey],
      storage_action: "replace with canonical empty DAY-mode acceptance state",
      seed_sha256: sha256(canonical(acceptanceBootstrapState)),
      reset_control: {
        before_production_control: setupReset,
      },
      production_control: "content/settings display-mode DAY control",
      cold_start_location_permission_action: "none",
      setup_live_control: setupDayControl,
      setup_request_diagnostics: setupRequestDiagnostics,
      preclose_runtime_quiescence: setupRuntimeQuiescence,
      post_control_state_disposition: "discarded with the closed setup session",
      evidence_session: false,
      production_data_preparation: productionDataPreparation,
    };
    runtimePhase = "evidence-startup";
    const setupToolIdentity = sha256(canonical(devtoolsToolInfo));
    ({
      launch: devtoolsLaunch,
      program: miniProgram,
      detachRuntimeObservers,
      toolInfo: devtoolsToolInfo,
    } = await openObservedSession("evidence"));
    if (sha256(canonical(devtoolsToolInfo)) !== setupToolIdentity)
      throw new Error("wechat_tool_identity_changed_between_session_stages");
    runtimePhase = "evidence-reset-before-control";
    result.setup.evidence_reset =
      await resetThroughAcceptanceControl(miniProgram);
    result.setup.evidence_live_control = {
      status: "passed",
      route: result.setup.evidence_reset.neutral_route,
      observed_root_classes: result.setup.evidence_reset.root_classes,
      persisted_day_seed: true,
      active_my_tab: "MY",
      production_control_proven_in_setup: true,
    };
    runtimePhase = "evidence-diagnostics-clear";
    await miniProgram.callWxMethod(
      "setStorageSync",
      requestDiagnosticStorageKey,
      [],
    );
    result.toolchain.cli_launch_diagnostic_sha256 =
      devtoolsLaunch.launchDiagnostic();
    result.runtime = await miniProgram.systemInfo().then((info) => ({
      brand: info.brand,
      model: info.model,
      system: info.system,
      platform: info.platform,
      pixel_ratio: info.pixelRatio,
      screen: { width: info.screenWidth, height: info.screenHeight },
      window: { width: info.windowWidth, height: info.windowHeight },
      language: info.language,
      sdk_version: info.SDKVersion,
      orientation: info.deviceOrientation,
      font_size_setting: info.fontSizeSetting ?? null,
    }));
    if (acceptanceDevice && result.runtime.model !== acceptanceDevice)
      throw new Error(
        `wechat_simulator_device_mismatch:${sha256(
          canonical({
            expected: acceptanceDevice,
            actual: result.runtime.model,
          }),
        )}`,
      );
    if (
      acceptanceTextSize !== null &&
      Number(result.runtime.font_size_setting) !== acceptanceTextSize
    )
      throw new Error(
        `wechat_simulator_text_size_mismatch:${sha256(
          canonical({
            expected: acceptanceTextSize,
            actual: result.runtime.font_size_setting,
          }),
        )}`,
      );
    const selectedJourneyKeys = journeyKeysByScope[acceptanceScope];
    const selectedJourneys = journeys
      .filter((journey) => selectedJourneyKeys.includes(journey.key))
      .sort((left, right) =>
        platformSimulation
          ? right.order - left.order
          : left.order - right.order,
      );
    if (platformSimulation) {
      runtimePhase = "platform-simulation-install";
      result.platform_simulation = {
        ...result.platform_simulation,
        ...(await installPlatformSimulationMocks(miniProgram)),
      };
      result.limitations.push(
        "The platform-simulation scope uses fixed test-only location and compass API mocks; it does not establish real user location, permission, map tiles, provider traffic, physical sensor behavior, or device orientation behavior.",
      );
    }
    if (acceptanceMode === "degradation") {
      // Establish the evidence session and its canonical neutral state while
      // the BFF is healthy. Only then open the named fault window, so a cold
      // start request can never be silently counted as an accepted fault.
      const faultKeys = faultJourneysByScope[acceptanceScope];
      const faultResults = [];
      result.setup.degradation_probe_resets = [];
      result.setup.degradation_prepared_context_cache_resets = [];
      for (let index = 0; index < faultKeys.length; index += 1) {
        const faultJourney = journeys.find(
          (journey) => journey.key === faultKeys[index],
        );
        if (!faultJourney)
          throw new Error(
            `native_fault_journey_missing:${acceptanceScope}:${faultKeys[index]}`,
          );
        if (index > 0) {
          runtimePhase = "acceptance-reset";
          result.setup.degradation_probe_resets.push(
            await resetBetweenFaultProbes(miniProgram),
          );
        }
        runtimePhase = `fault-preparation:${faultJourney.key}`;
        let preparedUrl = null;
        let preparedRuntimeQuiescence = null;
        if (faultJourney.requiresPreparedContext) {
          const preparedPage = await enterCurrentJourney(
            miniProgram,
            faultJourney,
          );
          await waitForSelector(preparedPage, faultJourney.root, 1);
          await waitForSelectorSet(preparedPage, faultJourney.selectors);
          await new Promise((resolve) =>
            setTimeout(resolve, faultJourney.settleMs ?? 1_000),
          );
          preparedRuntimeQuiescence =
            await waitForRuntimeEventQuiescence(runtimeEvents);
          preparedUrl = await currentPageUrl(
            miniProgram,
            preparedPage,
            faultJourney.preparedRouteParams,
          );
        }
        if (preparedUrl) {
          runtimePhase = `fault-cache-reset:${faultJourney.key}`;
          const persistedContext = await verifyPreparedContextContinuity(
            miniProgram,
            preparedUrl,
          );
          result.setup.degradation_prepared_context_cache_resets.push({
            journey_key: faultJourney.key,
            prepared_route_sha256: sha256(preparedUrl),
            required_query_keys: faultJourney.preparedRouteParams,
            pre_fault_runtime_quiescence: preparedRuntimeQuiescence,
            prepared_persisted_context: persistedContext,
            ...(await resetNetworkCacheForPreparedFault(
              miniProgram,
              preparedUrl,
            )),
          });
        }
        runtimePhase = `fault-injection:${faultJourney.key}`;
        stopProcessTree(apiProcess.pid);
        await waitForPortClosed(apiPort, 15_000);
        apiProcess = undefined;
        const faultResult = await captureFaultAndRecovery({
          miniProgram,
          runRoot,
          definition: faultJourney,
          preparedUrl,
          restartApi: async () => {
            apiProcess = await startApi(
              apiPort,
              privateMediaRoot,
              infrastructure.environment,
            );
          },
        });
        runtimePhase = `recovery-drain:${faultJourney.key}`;
        faultResult.runtime_quiescence =
          await waitForRuntimeEventQuiescence(runtimeEvents);
        faultResults.push(faultResult);
        runtimePhase = "post-recovery";
        result.journeys.push(
          await captureJourney(miniProgram, runRoot, faultJourney),
        );
      }
      result.fault_injection =
        faultResults.length === 1
          ? faultResults[0]
          : {
              status: faultResults.every((probe) => probe.status === "passed")
                ? "passed"
                : "failed",
              kind: "bff_process_unavailable_then_restarted_matrix",
              probe_count: faultResults.length,
              probes: faultResults,
            };
    } else {
      for (const journey of selectedJourneys) {
        if (journey.key === "upload-recovery") {
          runtimePhase = "production-upload-recovery-preparation";
          productionDataPreparation.upload_recovery =
            await prepareNativePendingUpload({
              miniProgram,
              apiPort,
              spotId: productionDataPreparation.formal_spot.spotId,
              runId,
            });
        }
        runtimePhase = `evidence-journey:${journey.key}`;
        result.journeys.push(
          await captureJourney(miniProgram, runRoot, journey),
        );
      }
    }
    if (platformSimulation) {
      runtimePhase = "platform-simulation-restore";
      result.platform_simulation = {
        ...result.platform_simulation,
        restoration: await restorePlatformSimulationMocks(miniProgram),
        status: "passed",
      };
    }
    runtimePhase = "evidence-final-drain";
    const evidenceRuntimeQuiescence =
      await waitForRuntimeEventQuiescence(runtimeEvents);
    detachRuntimeObservers();
    detachRuntimeObservers = undefined;
    result.request_diagnostics = await miniProgram
      .callWxMethod("getStorageSync", requestDiagnosticStorageKey)
      .catch(() => []);
    runtimePhase = "evidence-close";
    await miniProgram.close();
    miniProgram = undefined;
    if (devtoolsLaunch.cliProcess.exitCode === null)
      stopProcessTree(devtoolsLaunch.cliProcess.pid);
    result.project_session.evidence_shutdown = await quitWechatDevtoolsAndWait(
      sourceProjectPath,
      [wechatIdeHttpPort, automationPort],
      60_000,
    );
    devtoolsLaunch = undefined;
    runtimePhase = "public-config-restoration";
    result.project_session.public_config_restoration =
      await restoreWechatPublicProjectConfig(projectIdentitySession);
    if (result.project_session.public_config_restoration.status !== "passed")
      throw new Error(
        `wechat_public_project_config_restore_failed:${sha256(
          canonical(result.project_session.public_config_restoration),
        )}`,
      );
    const after = await candidateSnapshot();
    const bundleAfter = await directorySnapshot(
      repositoryPath("apps/wechat-miniapp/dist/weapp"),
    );
    result.candidate_after = after;
    result.bundle_after = bundleAfter;
    const exceptions = runtimeEvents.filter(
      (entry) => entry.kind === "exception",
    );
    const consoleErrors = runtimeEvents.filter(
      (entry) =>
        entry.kind === "console" && ["error", "assert"].includes(entry.level),
    );
    const expectedFaultConsoleErrors = consoleErrors.filter(
      (entry) =>
        acceptanceMode === "degradation" &&
        (entry.phase.startsWith("fault-injection") ||
          entry.phase.startsWith("recovery-drain")),
    );
    const knownToolchainConsoleErrors = consoleErrors.filter(
      (entry) =>
        !expectedFaultConsoleErrors.includes(entry) &&
        knownWechatToolchainConsoleErrorId(entry) !== null,
    );
    const unexpectedConsoleErrors = consoleErrors.filter(
      (entry) =>
        !expectedFaultConsoleErrors.includes(entry) &&
        !knownToolchainConsoleErrors.includes(entry),
    );
    result.runtime_observation = {
      exception_count: exceptions.length,
      expected_fault_console_error_count: expectedFaultConsoleErrors.length,
      known_toolchain_console_error_count: knownToolchainConsoleErrors.length,
      known_toolchain_console_errors: knownToolchainConsoleErrors.map(
        (entry) => ({
          id: knownWechatToolchainConsoleErrorId(entry),
          phase: entry.phase,
          offset_ms: entry.offset_ms,
          payload_sha256: entry.payload_sha256,
          payload_length: entry.payload_length,
        }),
      ),
      unexpected_console_error_count: unexpectedConsoleErrors.length,
      final_quiescence: evidenceRuntimeQuiescence,
    };
    const journeysPassed = result.journeys.every(
      (journey) => journey.status === "passed",
    );
    result.status =
      journeysPassed &&
      (acceptanceMode === "success" ||
        result.fault_injection?.status === "passed") &&
      exceptions.length === 0 &&
      unexpectedConsoleErrors.length === 0 &&
      before.sha256 === after.sha256 &&
      result.build.bundle.files_sha256 === bundleAfter.files_sha256
        ? "passed"
        : "failed";
    result.project_session.status = result.status;
  } catch (error) {
    capturedError = error;
    detachRuntimeObservers?.();
    detachRuntimeObservers = undefined;
    result.error = {
      message: String(error?.message ?? error),
      phase: runtimePhase,
      stack_sha256: sha256(String(error?.stack ?? "")),
    };
    result.project_session.status = "failed";
  }
  const nativeCleanup = await teardownNativeSession({
    miniProgram,
    devtoolsLaunch,
    apiProcess,
    apiPort,
    automationPort,
    projectPath: sourceProjectPath,
  }).catch((error) => ({
    status: "failed",
    failure_count: 1,
    failures_sha256: sha256(String(error?.message ?? error)),
  }));
  const projectIdentityRestore = await restoreWechatProjectIdentity(
    projectIdentitySession,
  ).catch((error) => ({
    status: "failed",
    reason: "private_config_restore_exception",
    diagnostic_sha256: sha256(String(error?.message ?? error)),
  }));
  const mediaStoreCleanup = await rm(privateMediaRoot, {
    force: true,
    recursive: true,
  })
    .then(() => ({ status: "passed" }))
    .catch((error) => ({
      status: "failed",
      diagnostic_sha256: sha256(String(error?.message ?? error)),
    }));
  const durableRuntimeCleanup = await cleanupNativeInfrastructure(
    infrastructure,
  ).catch((error) => ({
    status: "failed",
    failure_count: 1,
    failures_sha256: sha256(String(error?.message ?? error)),
  }));
  const simulatorPreferenceRestore = await restoreWechatSimulatorPreferences(
    simulatorPreferenceSession,
  ).catch((error) => ({
    status: "failed",
    diagnostic_sha256: sha256(String(error?.message ?? error)),
  }));
  result.cleanup = {
    ...nativeCleanup,
    project_identity_restore: projectIdentityRestore,
    media_store_cleanup: mediaStoreCleanup,
    durable_runtime_cleanup: durableRuntimeCleanup,
    simulator_preference_restore: simulatorPreferenceRestore,
  };
  result.project_session.identity = {
    ...result.project_session.identity,
    restoration_status: projectIdentityRestore.status,
  };
  if (
    projectIdentityRestore.status === "failed" ||
    mediaStoreCleanup.status === "failed" ||
    durableRuntimeCleanup.status === "failed" ||
    simulatorPreferenceRestore.status === "failed"
  ) {
    result.cleanup = {
      ...result.cleanup,
      status: "failed",
      failure_count:
        (result.cleanup.failure_count ?? 0) +
        Number(projectIdentityRestore.status === "failed") +
        Number(mediaStoreCleanup.status === "failed") +
        Number(durableRuntimeCleanup.status === "failed") +
        Number(simulatorPreferenceRestore.status === "failed"),
      failures_sha256: sha256(
        canonical({
          native: result.cleanup.failures_sha256,
          project_identity_restore: projectIdentityRestore,
          media_store_cleanup: mediaStoreCleanup,
          durable_runtime_cleanup: durableRuntimeCleanup,
          simulator_preference_restore: simulatorPreferenceRestore,
        }),
      ),
    };
  }
  if (result.cleanup.status !== "passed") {
    result.status = "failed";
    result.project_session.status = "failed";
    result.error ??= {
      message: `native_session_teardown_failed:${result.cleanup.failures_sha256}`,
      stack_sha256: null,
    };
  }
  if (runnerFaults.length > 0) {
    result.status = "failed";
    result.error ??= {
      message: `native_runner_unhandled_rejection:${sha256(canonical(runnerFaults))}`,
      stack_sha256: null,
    };
  }
  result.candidate_after ??= await candidateSnapshot().catch(() => null);
  result.bundle_after ??= await directorySnapshot(
    repositoryPath("apps/wechat-miniapp/dist/weapp"),
  ).catch(() => null);
  result.finished_at = new Date().toISOString();
  const runEvidencePath = path.join(runRoot, "session.json");
  await writeJson(runEvidencePath, result);
  await writeJson(currentEvidencePath, result);
  process.off("unhandledRejection", captureUnhandledRejection);
  process.stdout.write(
    `${JSON.stringify({
      status: result.status,
      run_id: runId,
      evidence: path.relative(root, runEvidencePath).replaceAll("\\", "/"),
      candidate_sha256: result.candidate_after?.sha256 ?? null,
      journey_count: result.journeys.length,
      scope: acceptanceScope,
      mode: acceptanceMode,
      fault_injection_status: result.fault_injection?.status ?? null,
      cleanup_status: result.cleanup.status,
    })}\n`,
  );
  if (capturedError) throw capturedError;
  if (result.status !== "passed") process.exitCode = 1;
}

await main();
