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
import automator from "miniprogram-automator";

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
const acceptanceScope = cliArgs.get("--scope") ?? "complete-demo";
const acceptanceMode = cliArgs.get("--mode") ?? "success";
const acceptanceProfile = cliArgs.get("--profile") ?? "v2";
if (
  ![
    "global-conformance",
    "map-discovery",
    "spot-detail",
    "spot-night",
    "my-library",
    "profile-content",
    "platform-operations",
    "complete-demo",
  ].includes(acceptanceScope)
)
  throw new Error(`unknown_native_acceptance_scope:${acceptanceScope}`);
if (!["success", "degradation"].includes(acceptanceMode))
  throw new Error(`unknown_native_acceptance_mode:${acceptanceMode}`);
const cliPath = "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat";
const devtoolsExecutable =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\微信开发者工具.exe";
const devtoolsCliEntry =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\resources\\app.asar.unpacked\\js\\common\\cli\\index.js";
const devtoolsCliBootstrap =
  "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";
const sourceProjectPath = path.join(root, "apps", "wechat-miniapp");
const canonicalWorkspaceRoot = path.resolve("C:\\Dev\\Starward");
const wechatFinalGateTempRoot = path.resolve("C:\\Dev\\.starward-tmp");
const wechatProcessTemp = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "Temp")
  : null;
const appStateStorageKey = "starward.wechat-miniapp.state.v1";
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
const wechatAutomationPort = 9420;
const wechatIdeHttpPort = 23977;
const wechatAcceptanceSdkVersion = "3.17.1";
const devtoolsPortStableWindowMs = 5_000;
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
  "tests/acceptance/miniapp",
  "project_context/development-workflow.md",
  "project_context/areas/main/verification/acceptance-runtime.md",
  "project_context/areas/main/implementation-index.md",
  "tools/miniapp/generate-mode-icons.mjs",
  "tools/miniapp/generate-semantic-assets.mjs",
  "tools/miniapp/selected-design-bindings.json",
  "tools/miniapp/verify-selected-design-bindings.mjs",
  "tools/miniapp/start-h5-acceptance.mjs",
  "tools/miniapp/apply-ty-context-harness-compatibility.mjs",
  "tools/miniapp/invoke-wechat-long-task-proof.ps1",
  "tools/miniapp/run-wechat-devtools-session.mjs",
  "tools/miniapp/workflow-conformance.test.mjs",
  "tools/miniapp/verify-miniapp-target.mjs",
  "tools/miniapp/verification-spec.json",
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
  const projectName = `starward-final-${sha256(
    `${normalizeWindowsPath(projectPath)}\0${candidateSha256}`,
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
  if (!alreadyRestored && currentSha256 !== appliedSha256)
    return {
      status: "failed",
      reason: "private_config_ownership_lost",
      current_sha256: currentSha256,
      applied_sha256: appliedSha256,
      original_sha256: originalSha256,
      public_config: publicConfig,
    };
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

async function buildCurrentCandidate(apiPort) {
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
        MINIAPP_API_BASE: `http://127.0.0.1:${apiPort}/v1`,
        MINIAPP_ACCEPTANCE_DIAGNOSTICS: "1",
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

async function startApi(apiPort) {
  const readiness = `http://127.0.0.1:${apiPort}/v1/capabilities`;
  await assertPortFree(readiness);
  const child = spawn(
    process.execPath,
    [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "src/main.ts"],
    {
      cwd: path.join(root, "workers", "miniapp-api"),
      env: { ...process.env, MINIAPP_API_PORT: String(apiPort) },
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
  try {
    await waitForHttp(readiness, 30_000);
  } catch (error) {
    stopProcessTree(child.pid);
    throw new Error(`${error.message}:${sha256(output.join(""))}`);
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
  while (Date.now() < deadline) {
    try {
      const pages = await miniProgram.pageStack();
      if (pages.length > 0) return pages.at(-1);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `wechat_initial_page_timeout:${sha256(String(lastError?.message ?? lastError ?? "empty_page_stack"))}`,
  );
}

async function enableRuntimeLog(program, timeoutMs = 30_000) {
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
  ["[data-od-id='default-formal-markers']", "#spot-map"],
  ["[data-od-id='map-search-summary']", ".map-finder-trigger"],
  ["[data-od-id='map-analysis-time-bar']", ".map-conditions-bar"],
  ["[data-od-id='map-observing-conditions-icon']", ".map-conditions-bar"],
  ["[data-od-id='map-permission-state']", ".map-floating-tools .soft-button"],
  ["[data-od-id='spot-finder-sheet']", ".finder-panel"],
  ["[data-od-id='spot-finder-search-input']", ".finder-input"],
  ["[data-od-id='spot-finder-search-icon']", ".finder-search-icon"],
  ["[data-od-id='spot-finder-result-scroll']", ".finder-results"],
  ["[data-od-id='spot-finder-wanted-section']", ".finder-partition"],
  ["[data-od-id='spot-finder-other-section']", ".finder-partition"],
  ["[data-od-id='spot-finder-city-heading']", ".finder-city-heading"],
  ["[data-od-id='spot-finder-section-chevron']", ".finder-partition__toggle"],
  [
    "[data-od-id='spot-finder-filter-disclosure'] .soft-button",
    ".finder-field-row .soft-button",
  ],
  ["[data-od-id='spot-finder-filter-overlay']", ".filter-sheet"],
  ["[data-od-id='spot-finder-filter-first-level']", ".filter-sheet__tier"],
  ["[data-od-id='spot-finder-filter-advanced']", ".filter-sheet__tier"],
  ["[data-od-id='spot-finder-filter-choice']", ".filter-option"],
  [
    "[data-od-id='spot-finder-filter-revert'] .soft-button",
    ".filter-sheet__header .soft-button",
  ],
  ["[data-od-id='spot-finder-filter-revert']", ".filter-sheet__header"],
  [
    "[data-od-id='spot-finder-filter-commit']",
    ".filter-sheet__footer .soft-button--primary",
  ],
  ["[data-od-id='map-analysis-focus-panel']", ".conditions-panel"],
  ["[data-od-id='map-analysis-time-scrubber']", ".conditions-time__slider"],
  ["[data-od-id='map-analysis-time-value']", ".conditions-time__value"],
  ["[data-od-id='map-analysis-layer-choice']", ".conditions-overlay-option"],
  ["[data-od-id='map-analysis-close']", ".conditions-panel__actions .soft-button"],
  ["[data-od-id='selected-card-star']", ".conditions-overlay-option__star"],
  [
    "[data-od-id='my-settings-action'] .soft-button",
    ".custom-nav__side--right .soft-button",
  ],
  ["[data-od-id='observation-mode-entry'] .chip", ".observation-setting .chip"],
]);

async function queryElements(page, selector) {
  const nativeSelector = nativeSelectorAliases.get(selector);
  if (nativeSelector) return page.$$(nativeSelector);
  const odSelector = /^\[data-od-id=(["'])([-\w.:]+)\1\](?:\s+(.+))?$/u.exec(
    selector,
  );
  if (!odSelector) return page.$$(selector);
  const roots = await page.getElementsByXpath(
    `//*[@data-od-id=${JSON.stringify(odSelector[2])}]`,
  );
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
    await page.waitFor(250);
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
    await page.waitFor(250);
  }
  throw new Error(`native_class_timeout:${page.path}:${selector}:${className}`);
}

async function activateDayModeThroughProductionControl(
  miniProgram,
  setRuntimePhase = () => {},
) {
  setRuntimePhase("setup-day-control-route");
  const settingsPage = await retryIdempotentAutomatorOperation(
    "setup-day-control-route",
    () => miniProgram.reLaunch("/content/settings/index"),
  );
  if (!settingsPage) throw new Error("native_setup_settings_route_unavailable");
  const modeButtons = await waitForSelector(
    settingsPage,
    ".settings-choice-grid .chip",
    2,
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
  const neutralPage = await retryIdempotentAutomatorOperation(
    "acceptance-reset-route",
    () => miniProgram.reLaunch("/pages/auth/index"),
  );
  if (!neutralPage) throw new Error("native_reset_route_unavailable");
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
    observations.push({
      text_sha256: sha256(text),
      text_length: text.length,
      size,
      styles,
    });
  }
  return {
    selector: definition.selector,
    native_selector:
      nativeSelectorAliases.get(definition.selector) ?? definition.selector,
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
    await page.waitFor(250);
  }
  return false;
}

async function waitForSelectorAbsent(page, selector, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const elements = await queryElements(page, selector).catch(() => []);
    if (elements.length === 0) return true;
    await page.waitFor(250);
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
    if (step.tap) {
      const controls = await waitForSelector(
        page,
        step.tap,
        step.minimum ?? 1,
        step.timeoutMs ?? 20_000,
      );
      const control = controls[step.index ?? 0];
      if (!control)
        throw new Error(
          `native_interaction_control_missing:${definition.key}:${step.key}`,
        );
      await control.tap();
    }
    if (step.waitFor?.length) {
      const ready = await waitForSelectorSet(
        page,
        step.waitFor,
        step.timeoutMs ?? 20_000,
      );
      if (!ready)
        throw new Error(
          `native_interaction_wait_timeout:${definition.key}:${step.key}`,
        );
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
    for (const selector of step.inspect ?? []) {
      const observation = await inspectSelector(page, selector);
      stepObservations.push(observation);
      if (observation.count < selector.minimum)
        throw new Error(
          `native_interaction_selector_timeout:${definition.key}:${step.key}:${selector.selector}:${selector.minimum}`,
        );
    }
    observations.push({ key: step.key, selectors: stepObservations });
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
  while (Date.now() < deadline) {
    const rootElement = await queryElement(page, rootSelector).catch(
      () => null,
    );
    latestWxml = rootElement ? await rootElement.wxml().catch(() => "") : "";
    if (
      latestWxml.length > 0 &&
      latestWxml.includes(fragment) === expectedPresence
    )
      return latestWxml;
    await page.waitFor(250);
  }
  throw new Error(
    `native_root_fragment_timeout:${page.path}:${rootSelector}:${expectedPresence}`,
  );
}

async function waitForRecoveryControl(page, probe, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const controls = await queryElements(page, probe.recoverySelector).catch(
      () => [],
    );
    for (let index = 0; index < controls.length; index += 1) {
      const control = controls[index];
      const controlText = await control.text().catch(() => "");
      if (controlText.trim() === probe.recoveryText)
        return { control, index, controlText };
    }
    await page.waitFor(250);
  }
  throw new Error(
    `native_recovery_control_missing:${page.path}:${sha256(probe.recoveryLabel)}`,
  );
}

async function captureJourney(miniProgram, runRoot, definition) {
  const page = await retryIdempotentAutomatorOperation(
    `journey-route:${definition.key}`,
    () => miniProgram.reLaunch(definition.url),
  );
  if (!page) throw new Error(`native_route_unavailable:${definition.url}`);
  await waitForSelector(page, definition.root, 1);
  await page.waitFor(definition.settleMs ?? 1_000);
  await waitForSelectorSet(page, definition.selectors);
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
  const interactions = await captureJourneyInteractions(
    page,
    miniProgram,
    runRoot,
    definition,
  );
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
    ...(interactions ? { interactions } : {}),
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
          { selector: "[data-od-id='spot-finder-city-heading']", minimum: 1 },
          {
            selector: "[data-od-id='spot-finder-section-chevron']",
            minimum: 2,
          },
        ],
      },
      {
        key: "finder-filter-open",
        tap: "[data-od-id='spot-finder-filter-disclosure'] .soft-button",
        waitFor: [
          { selector: "[data-od-id='spot-finder-filter-overlay']", minimum: 1 },
          {
            selector: "[data-od-id='spot-finder-filter-first-level']",
            minimum: 1,
          },
          {
            selector: "[data-od-id='spot-finder-filter-advanced']",
            minimum: 1,
          },
          { selector: "[data-od-id='spot-finder-filter-choice']", minimum: 18 },
        ],
        inspect: [
          { selector: "[data-od-id='spot-finder-filter-choice']", minimum: 18 },
          { selector: "[data-od-id='spot-finder-filter-revert']", minimum: 1 },
          { selector: "[data-od-id='spot-finder-filter-commit']", minimum: 1 },
        ],
      },
      {
        key: "finder-filter-revert",
        tap: "[data-od-id='spot-finder-filter-revert'] .soft-button",
        waitFor: [
          { selector: "[data-od-id='spot-finder-result-scroll']", minimum: 1 },
        ],
        waitForAbsent: ["[data-od-id='spot-finder-filter-overlay']"],
      },
      {
        key: "finder-close",
        tap: "[data-od-id='map-search-summary']",
        waitForAbsent: ["[data-od-id='spot-finder-search-input']"],
      },
      {
        key: "conditions-open",
        tap: "[data-od-id='map-analysis-time-bar']",
        waitFor: [
          { selector: "[data-od-id='map-analysis-focus-panel']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-time-scrubber']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-time-value']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-layer-choice']", minimum: 4 },
        ],
        inspect: [
          { selector: "[data-od-id='map-analysis-close']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-time-scrubber']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-time-value']", minimum: 1 },
          { selector: "[data-od-id='map-analysis-layer-choice']", minimum: 4 },
        ],
      },
      {
        key: "conditions-light-preview",
        tap: "[data-od-id='map-analysis-layer-choice']",
        index: 1,
        waitFor: [
          { selector: "[data-od-id='selected-card-star']", minimum: 1 },
        ],
      },
      {
        key: "conditions-commit",
        tap: ".conditions-panel__actions .soft-button--primary",
        waitForAbsent: ["[data-od-id='map-analysis-time-scrubber']"],
      },
    ],
  },
  {
    order: 2,
    key: "formal-spot-detail",
    url: "/spot/detail/index?spotId=spot%3Asz-astronomical-observatory",
    root: ".spot-detail",
    rootClasses: ["spot-detail", "theme-day"],
    selectors: [
      { selector: ".segment-tab", minimum: 3, styles: ["min-height"] },
      {
        selector: ".media-card",
        minimum: 1,
        styles: ["width", "border-radius"],
      },
      { selector: ".decision-card", minimum: 1, styles: ["border-radius"] },
      { selector: ".spot-night-entry", minimum: 1, styles: ["min-height"] },
      { selector: ".quiet-route-action", minimum: 1, styles: ["min-height"] },
    ],
  },
  {
    order: 9,
    key: "spot-night",
    url: "/spot/sky/index?spotId=spot%3Asz-astronomical-observatory&date=2026-08-06&selectedAt=2026-08-06T20%3A00%3A00%2B08%3A00&timezone=Asia%2FShanghai&dataRevision=demo-insufficient%3Aspot%3Asz-astronomical-observatory%3A2026-08-06",
    root: ".sky-page",
    rootClasses: ["sky-page", "theme-night"],
    selectors: [
      { selector: ".sky-tabs__item", minimum: 3, styles: ["min-height"] },
      {
        selector: ".sky-decision",
        minimum: 1,
        styles: ["background-color", "box-shadow"],
      },
      { selector: ".sky-summary-grid", minimum: 1, styles: ["display"] },
      { selector: ".time-card", minimum: 1, styles: ["border-radius"] },
      {
        selector: ".sky-actions .soft-button",
        minimum: 3,
        styles: ["min-height"],
      },
    ],
  },
  {
    order: 10,
    key: "simplified-sky-map",
    url: "/sky/map/index?spotId=spot%3Asz-astronomical-observatory&date=2026-08-06&selectedAt=2026-08-06T20%3A00%3A00%2B08%3A00&timezone=Asia%2FShanghai&dataRevision=demo-insufficient%3Aspot%3Asz-astronomical-observatory%3A2026-08-06",
    root: ".sky-map-page",
    rootClasses: ["sky-map-page", "theme-night"],
    selectors: [
      { selector: ".sky-subnav__tab", minimum: 4, styles: ["min-height"] },
      { selector: ".sky-canvas", minimum: 1, styles: ["width", "height"] },
      { selector: ".accessible-sky", minimum: 1, styles: ["border-radius"] },
    ],
  },
  {
    order: 11,
    key: "observation-mode",
    url: "/sky/observe/index?spotId=spot%3Asz-astronomical-observatory&date=2026-08-06&selectedAt=2026-08-06T20%3A00%3A00%2B08%3A00&timezone=Asia%2FShanghai&dataRevision=demo-insufficient%3Aspot%3Asz-astronomical-observatory%3A2026-08-06",
    root: ".observe-page",
    rootClasses: ["observe-page", "theme-observation"],
    selectors: [
      {
        selector: ".observe-decision",
        minimum: 1,
        styles: ["background-color", "border-color"],
      },
      { selector: ".observe-grid", minimum: 1, styles: ["display"] },
      {
        selector: ".observe-actions .soft-button--primary",
        minimum: 1,
        styles: ["min-height"],
      },
    ],
  },
  {
    order: 3,
    key: "my-home",
    url: "/pages/my/index",
    root: ".my-page",
    rootClasses: ["my-page", "theme-day"],
    selectors: [
      { selector: ".profile-summary", minimum: 1, styles: ["border-radius"] },
      { selector: ".account-row", minimum: 4, styles: ["min-height"] },
      {
        selector: "[data-od-id='my-settings-action'] .soft-button",
        minimum: 1,
        styles: ["min-height"],
      },
    ],
  },
  {
    order: 4,
    key: "favorites",
    url: "/content/favorite/list/index",
    root: ".my-page",
    rootClasses: ["my-page", "theme-day"],
    selectors: [
      { selector: ".my-tab", minimum: 4, styles: ["min-height"] },
      { selector: ".library-header", minimum: 1, styles: ["min-height"] },
    ],
  },
  {
    order: 5,
    key: "plan-editor",
    url: "/content/plan/detail/index",
    root: ".plan-editor",
    rootClasses: ["plan-editor", "theme-day"],
    selectors: [
      { selector: ".plan-form", minimum: 1, styles: ["width"] },
      {
        selector: ".field",
        minimum: 4,
        styles: ["min-height", "border-radius"],
      },
      { selector: ".soft-button--primary", minimum: 1, styles: ["min-height"] },
    ],
  },
  {
    order: 6,
    key: "profile-links",
    url: "/content/profile/links/index",
    root: ".links-page",
    rootClasses: ["links-page", "theme-day"],
    selectors: [
      { selector: ".link-form", minimum: 1, styles: ["border-radius"] },
      { selector: ".field", minimum: 3, styles: ["min-height"] },
      { selector: ".soft-button--primary", minimum: 1, styles: ["min-height"] },
    ],
  },
  {
    order: 7,
    key: "own-post-import",
    url: "/content/import/index",
    root: ".import-page",
    rootClasses: ["import-page", "theme-day"],
    selectors: [
      { selector: ".stage-step", minimum: 5, styles: ["min-height"] },
      { selector: ".import-form", minimum: 1, styles: ["border-radius"] },
      { selector: ".field", minimum: 2, styles: ["min-height"] },
    ],
  },
  {
    order: 8,
    key: "settings",
    url: "/content/settings/index",
    root: ".settings-page",
    rootClasses: ["settings-page", "theme-day"],
    selectors: [
      { selector: ".settings-card", minimum: 4, styles: ["border-radius"] },
      {
        selector: ".settings-choice-grid .chip",
        minimum: 2,
        styles: ["min-height"],
      },
      {
        selector: "[data-od-id='observation-mode-entry'] .chip",
        minimum: 1,
        styles: ["min-height"],
      },
    ],
  },
];

const journeyKeysByScope = {
  "global-conformance": ["map-cold-start-location-fallback"],
  "map-discovery": ["map-cold-start-location-fallback"],
  "spot-detail": ["formal-spot-detail"],
  "spot-night": ["spot-night", "simplified-sky-map", "observation-mode"],
  "my-library": ["my-home", "favorites", "plan-editor", "settings"],
  "profile-content": ["my-home", "profile-links", "own-post-import"],
  "platform-operations": ["map-cold-start-location-fallback", "settings"],
  "complete-demo": journeys.map((journey) => journey.key),
};

const faultJourneysByScope = {
  "global-conformance": ["map-cold-start-location-fallback"],
  "map-discovery": ["map-cold-start-location-fallback"],
  "spot-detail": ["formal-spot-detail"],
  "spot-night": ["spot-night"],
  "my-library": ["my-home"],
  "profile-content": ["profile-links"],
  "platform-operations": ["map-cold-start-location-fallback"],
  "complete-demo": [
    "map-cold-start-location-fallback",
    "formal-spot-detail",
    "spot-night",
    "my-home",
    "profile-links",
  ],
};

const faultProbeByJourney = {
  "map-cold-start-location-fallback": {
    expectedFragment: "本地 BFF 不可用",
    recoveryLabel: "刷新当前区域",
    recoverySelector: ".map-refresh-control",
    recoveryText: "↻",
  },
  "formal-spot-detail": {
    expectedFragment: "本地 BFF 不可用",
    recoveryLabel: "重试概览",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重试概览",
  },
  "spot-night": {
    expectedFragment: "天文 BFF 未运行",
    recoveryLabel: "重试夜空",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重试夜空",
  },
  "my-home": {
    expectedFragment: "账户资料暂未刷新",
    recoveryLabel: "重试同步",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重试同步",
  },
  "profile-links": {
    expectedFragment: "服务端链接暂不可回读",
    recoveryLabel: "重试回读",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重试回读",
  },
};

async function captureFaultAndRecovery({
  miniProgram,
  runRoot,
  definition,
  restartApi,
}) {
  const probe = faultProbeByJourney[definition.key];
  if (!probe) throw new Error(`native_fault_probe_missing:${definition.key}`);
  const page = await retryIdempotentAutomatorOperation(
    `fault-route:${definition.key}`,
    () => miniProgram.reLaunch(definition.url),
  );
  if (!page) throw new Error(`native_fault_page_missing:${definition.key}`);
  const faultWxml = await waitForRootFragment(
    page,
    definition.root,
    probe.expectedFragment,
    true,
  );
  const faultObserved = true;
  const faultScreenshot = path.join(runRoot, `fault-${definition.key}.png`);
  await retryIdempotentAutomatorOperation(
    `fault-screenshot:${definition.key}`,
    () => miniProgram.screenshot({ path: faultScreenshot }),
  );

  await restartApi();
  const recoveryControl = await waitForRecoveryControl(page, probe);
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
  let projectIdentitySession;
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
    request_diagnostics: [],
    runtime_events: runtimeEvents,
    runner_faults: runnerFaults,
    startup_attempts: startupAttempts,
    limitations: [
      "This evidence is a local current-candidate WeChat DevTools simulator session, not preview, upload, review, device, or release evidence.",
      "External provider capabilities that are unavailable remain gated and are not upgraded into live facts by this session.",
    ],
  };
  const openObservedSession = async (stage) => {
    const attemptLimit = 2;
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
        await waitForInitialPage(attemptProgram, 60_000);
        startupAttempts.push({
          stage,
          attempt,
          status: "passed",
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
    result.build = await buildCurrentCandidate(apiPort);
    apiProcess = await startApi(apiPort);
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
    }));
    const selectedJourneyKeys = journeyKeysByScope[acceptanceScope].filter(
      (key) =>
        acceptanceProfile !== "v2-1-1" ||
        !["favorites", "simplified-sky-map", "observation-mode"].includes(key),
    );
    const selectedJourneys = journeys
      .filter((journey) => selectedJourneyKeys.includes(journey.key))
      .sort((left, right) => left.order - right.order);
    if (acceptanceMode === "degradation") {
      // Establish the evidence session and its canonical neutral state while
      // the BFF is healthy. Only then open the named fault window, so a cold
      // start request can never be silently counted as an accepted fault.
      runtimePhase = "fault-injection";
      stopProcessTree(apiProcess.pid);
      await waitForPortClosed(apiPort, 15_000);
      apiProcess = undefined;
      const faultKeys = faultJourneysByScope[acceptanceScope];
      const faultResults = [];
      result.setup.degradation_probe_resets = [];
      for (let index = 0; index < faultKeys.length; index += 1) {
        const faultJourney = journeys.find(
          (journey) => journey.key === faultKeys[index],
        );
        if (!faultJourney)
          throw new Error(
            `native_fault_journey_missing:${acceptanceScope}:${faultKeys[index]}`,
          );
        runtimePhase = `fault-injection:${faultJourney.key}`;
        if (index > 0) {
          stopProcessTree(apiProcess.pid);
          await waitForPortClosed(apiPort, 15_000);
          apiProcess = undefined;
        }
        const faultResult = await captureFaultAndRecovery({
          miniProgram,
          runRoot,
          definition: faultJourney,
          restartApi: async () => {
            apiProcess = await startApi(apiPort);
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
        if (index < faultKeys.length - 1) {
          runtimePhase = "acceptance-reset";
          result.setup.degradation_probe_resets.push(
            await resetBetweenFaultProbes(miniProgram),
          );
          runtimePhase = "probe-ready";
        }
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
      runtimePhase = "evidence-map-cold-start";
      const mapPage = await miniProgram.reLaunch("/pages/map/index");
      if (!mapPage) throw new Error("native_map_cold_start_failed");
      await mapPage.waitFor(800);
      for (const journey of selectedJourneys) {
        runtimePhase = `evidence-journey:${journey.key}`;
        result.journeys.push(
          await captureJourney(miniProgram, runRoot, journey),
        );
      }
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
    const unexpectedConsoleErrors = consoleErrors.filter(
      (entry) => !expectedFaultConsoleErrors.includes(entry),
    );
    result.runtime_observation = {
      exception_count: exceptions.length,
      expected_fault_console_error_count: expectedFaultConsoleErrors.length,
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
  result.cleanup = {
    ...nativeCleanup,
    project_identity_restore: projectIdentityRestore,
  };
  result.project_session.identity = {
    ...result.project_session.identity,
    restoration_status: projectIdentityRestore.status,
  };
  if (projectIdentityRestore.status === "failed") {
    result.cleanup = {
      ...result.cleanup,
      status: "failed",
      failure_count:
        (result.cleanup.failure_count ?? 0) +
        Number(projectIdentityRestore.status === "failed"),
      failures_sha256: sha256(
        canonical({
          native: result.cleanup.failures_sha256,
          project_identity_restore: projectIdentityRestore,
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
