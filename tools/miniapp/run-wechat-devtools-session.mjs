import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import automator from "miniprogram-automator";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
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
if (![
  "global-conformance",
  "map-discovery",
  "spot-detail",
  "spot-night",
  "my-library",
  "profile-content",
  "platform-operations",
  "complete-demo",
].includes(acceptanceScope))
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
  const resolved = path.resolve(root, ...relative.replaceAll("\\", "/").split("/"));
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

async function prepareWechatProjectIdentity(candidateSha256) {
  const privateConfigPath = path.join(
    sourceProjectPath,
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
    `${normalizeWindowsPath(root)}\0${candidateSha256}`,
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
      restoration_required: true,
    },
  };
}

async function restoreWechatProjectIdentity(session) {
  if (!session)
    return {
      status: "not_required",
      restored_original: false,
    };
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
    };
  if (!alreadyRestored) {
    if (session.originalBytes)
      await writeFile(session.privateConfigPath, session.originalBytes);
    else await rm(session.privateConfigPath, { force: true });
  }
  const restoredBytes = await readOptionalFile(session.privateConfigPath);
  const restoredSha256 = restoredBytes ? sha256(restoredBytes) : null;
  return {
    status: restoredSha256 === originalSha256 ? "passed" : "failed",
    restored_original: restoredSha256 === originalSha256,
    original_exists: session.originalBytes !== null,
    original_sha256: originalSha256,
    restored_sha256: restoredSha256,
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
    commandLines = JSON.parse(String(observation.stdout ?? "[]").trim() || "[]");
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

async function waitForWechatProjectBinding(projectPath, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  const expected = normalizeWindowsPath(projectPath);
  let lastObservation = { processCount: 0, projects: [] };
  while (Date.now() < deadline) {
    lastObservation = observeWechatWatcherProjects();
    if (
      lastObservation.processCount === 1 &&
      lastObservation.projects.length === 1 &&
      lastObservation.projects[0] === expected
    )
      return {
        status: "passed",
        observer: "Win32_Process wxfilewatcher_x64.exe command line",
        expected_project_root: "apps/wechat-miniapp",
        expected_project_path_sha256: sha256(expected),
        observed_process_count: 1,
        observed_project_path_sha256: sha256(lastObservation.projects[0]),
      };
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `wechat_devtools_project_binding_mismatch:${sha256(
      canonical({
        expected_sha256: sha256(expected),
        observed_process_count: lastObservation.processCount,
        observed_project_path_sha256s: lastObservation.projects.map(sha256),
      }),
    )}`,
  );
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
    if (response.ok) throw new Error(`formal_session_port_already_in_use:${url}`);
  } catch (error) {
    if (String(error?.message ?? error).startsWith("formal_session_port_already_in_use"))
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
    ["-e", devtoolsCliBootstrap, devtoolsCliEntry, ...args],
    {
    cwd: path.dirname(devtoolsExecutable),
    env: {
      ...process.env,
      // Match the official cli.bat contract: the executable runs from the
      // installed tool directory while its `cwd` environment binding names the
      // caller workspace. The requested project is independently bound below
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
  throw new Error(`wechat_devtools_ports_did_not_stably_close:${ports.join(",")}`);
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
      return { status: "passed", event_count: observedCount, quiet_window_ms: quietWindowMs };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("native_runtime_events_did_not_quiesce");
}

function quitWechatDevtools(projectPath) {
  const quit = spawnSync(
    devtoolsExecutable,
    ["-e", devtoolsCliBootstrap, devtoolsCliEntry, "quit"],
    {
    cwd: path.dirname(devtoolsExecutable),
    env: {
      ...process.env,
      cwd: root,
      ELECTRON: "",
      ELECTRON_RUN_AS_NODE: "1",
    },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
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
  projectPath,
  ports,
  timeoutMs = 60_000,
) {
  const attempts = [];
  const budgets = [Math.min(15_000, timeoutMs), Math.max(0, timeoutMs - 15_000)];
  for (let index = 0; index < budgets.length; index += 1) {
    const quit = quitWechatDevtools(projectPath);
    const attempt = {
      attempt: index + 1,
      quit_status: quit.status,
      exit_code: quit.exit_code,
      diagnostic_sha256: quit.diagnostic_sha256,
      ports_status: "pending",
    };
    attempts.push(attempt);
    if (quit.status === "passed" && budgets[index] > 0) {
      try {
        await waitForPortsStablyClosed(ports, budgets[index]);
        attempt.ports_status = "passed";
        return {
          status: "passed",
          attempt_count: attempts.length,
          attempts,
        };
      } catch (error) {
        attempt.ports_status = "failed";
        attempt.ports_diagnostic_sha256 = sha256(
          String(error?.message ?? error),
        );
      }
    } else attempt.ports_status = "not_checked";
  }
  throw new Error(
    `wechat_devtools_shutdown_failed:${sha256(canonical(attempts))}`,
  );
}

async function startWechatAutomation(projectPath, automationPort) {
  await quitWechatDevtoolsAndWait(
    projectPath,
    [23977, automationPort],
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
    return {
      automationPort,
      cliProcess,
      projectPathBinding,
      launchDiagnostic: () => sha256(launchOutput.join("")),
    };
  } catch (error) {
    if (cliProcess.exitCode === null) stopProcessTree(cliProcess.pid);
    throw error;
  }
}

async function connectWechatAutomation(launch) {
  return waitForAutomationConnection(launch.automationPort, 90_000);
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
      failures.push(`mini_program_close:${sha256(String(error?.message ?? error))}`);
    }
  }
  if (devtoolsLaunch?.cliProcess?.exitCode === null)
    stopProcessTree(devtoolsLaunch.cliProcess.pid);
  try {
    await quitWechatDevtoolsAndWait(
      projectPath,
      [automationPort, 23977].filter(Boolean),
      60_000,
    );
  } catch (error) {
    failures.push(`devtools_shutdown:${sha256(String(error?.message ?? error))}`);
  }
  if (apiProcess) stopProcessTree(apiProcess.pid);
  if (apiPort) {
    try {
      await waitForPortClosed(apiPort, 15_000);
    } catch (error) {
      failures.push(`api_port:${apiPort}:${sha256(String(error?.message ?? error))}`);
    }
  }
  return {
    status: failures.length === 0 ? "passed" : "failed",
    failure_count: failures.length,
    failure_kinds: failures.map((failure) => failure.split(":", 1)[0]),
    failures_sha256: failures.length > 0 ? sha256(canonical(failures)) : null,
  };
}

async function waitForSelector(page, selector, minimum = 1, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const elements = await page.$$(selector).catch(() => []);
    if (elements.length >= minimum) return elements;
    await page.waitFor(250);
  }
  throw new Error(`native_selector_timeout:${page.path}:${selector}:${minimum}`);
}

async function waitForElementClass(page, selector, className, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const element = await page.$(selector).catch(() => null);
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
    ".mode-grid .chip",
    3,
  );
  const controlText = await modeButtons[0].text().catch(() => "");
  setRuntimePhase("setup-day-control-tap");
  await modeButtons[0].tap();
  setRuntimePhase("setup-day-control-theme-readback");
  const rootClasses = await waitForElementClass(
    settingsPage,
    ".my-page",
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
  const elements = await page.$$(definition.selector);
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
        page
          .$$(definition.selector)
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
    const rootElement = await page.$(rootSelector).catch(() => null);
    latestWxml = rootElement ? await rootElement.wxml().catch(() => "") : "";
    if (latestWxml.length > 0 && latestWxml.includes(fragment) === expectedPresence)
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
    const controls = await page.$$(probe.recoverySelector).catch(() => []);
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
  const rootElement = await page.$(definition.root);
  const rootWxml = rootElement ? await rootElement.outerWxml().catch(() => "") : "";
  const rootClass = rootElement
    ? String(await rootElement.attribute("class").catch(() => ""))
    : "";
  const rootClasses = [...new Set(rootClass.split(/\s+/u).filter(Boolean))].sort();
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
      { selector: ".map-banner", minimum: 1, styles: ["min-height"] },
      { selector: ".search-box", minimum: 1, styles: ["min-height", "border-radius"] },
      { selector: ".quick-filter", minimum: 4, styles: ["min-height", "border-radius"] },
      { selector: ".map-floating-tools .soft-button", minimum: 4, styles: ["min-height"] },
      { selector: ".selected-card-wrap .spot-card", minimum: 1, styles: ["border-radius"] },
      { selector: ".selected-card-wrap .spot-card__datum", minimum: 3, styles: ["min-height"] },
      { selector: ".selected-card-wrap .spot-card__facilities .status-tag", minimum: 4, styles: ["min-height"] },
      { selector: ".selected-card-wrap .spot-card__route-row", minimum: 1, styles: ["display"] },
      { selector: ".selected-card-wrap .spot-card__actions .soft-button", minimum: 2, styles: ["min-height"] },
    ],
  },
  {
    order: 2,
    key: "formal-spot-detail",
    url: "/spot/detail/index?spotId=spot%3Asz-astronomical-observatory",
    root: ".spot-detail",
    rootClasses: ["spot-detail", "theme-day"],
    selectors: [
      { selector: ".segment-tab", minimum: 4, styles: ["min-height"] },
      { selector: ".media-card", minimum: 1, styles: ["width", "border-radius"] },
      { selector: ".decision-card", minimum: 1, styles: ["border-radius"] },
      { selector: ".detail-actions .soft-button", minimum: 3, styles: ["min-height"] },
    ],
  },
  {
    order: 9,
    key: "spot-night",
    url: "/spot/sky/index?spotId=spot%3Asz-astronomical-observatory",
    root: ".sky-page",
    rootClasses: ["sky-page", "theme-night"],
    selectors: [
      { selector: ".sky-subnav__tab", minimum: 4, styles: ["min-height"] },
      { selector: ".sky-decision", minimum: 1, styles: ["background-color", "box-shadow"] },
      { selector: ".metric-grid", minimum: 1, styles: ["border-radius"] },
      { selector: ".sky-actions .soft-button--primary", minimum: 1, styles: ["min-height"] },
    ],
  },
  {
    order: 10,
    key: "simplified-sky-map",
    url: "/sky/map/index?spotId=spot%3Asz-astronomical-observatory",
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
    url: "/sky/observe/index?spotId=spot%3Asz-astronomical-observatory",
    root: ".observe-page",
    rootClasses: ["observe-page", "theme-observation"],
    selectors: [
      { selector: ".observe-decision", minimum: 1, styles: ["background-color", "border-color"] },
      { selector: ".observe-grid", minimum: 1, styles: ["display"] },
      { selector: ".observe-actions .soft-button--primary", minimum: 1, styles: ["min-height"] },
    ],
  },
  {
    order: 3,
    key: "my-home",
    url: "/pages/my/index",
    root: ".my-page",
    rootClasses: ["my-page", "theme-day"],
    selectors: [
      { selector: ".my-tab", minimum: 4, styles: ["min-height"] },
      { selector: ".profile-card", minimum: 1, styles: ["border-radius"] },
      { selector: ".entry-card", minimum: 4, styles: ["min-height"] },
      { selector: ".demo-boundary", minimum: 1, styles: ["border-radius"] },
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
      { selector: ".field", minimum: 4, styles: ["min-height", "border-radius"] },
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
    root: ".my-page",
    rootClasses: ["my-page", "theme-day"],
    selectors: [
      { selector: ".my-tab", minimum: 4, styles: ["min-height"] },
      { selector: ".settings-card", minimum: 4, styles: ["border-radius"] },
      { selector: ".mode-grid .chip", minimum: 3, styles: ["min-height"] },
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
    recoveryLabel: "重新计算",
    recoverySelector: ".status-panel__recovery",
    recoveryText: "重新计算",
  },
  "my-home": {
    expectedFragment: "服务端资料暂未刷新",
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
  const faultScreenshot = path.join(
    runRoot,
    `fault-${definition.key}.png`,
  );
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
    fault_screenshot: path.relative(root, faultScreenshot).replaceAll("\\", "/"),
    recovery_control_selector: probe.recoverySelector,
    recovery_control_index: recoveryControl.index,
    recovery_control_label: probe.recoveryLabel,
    recovery_control_observed_label_sha256: sha256(
      recoveryControl.controlText,
    ),
    recovery_observed: recoveryObserved,
    recovery_observation_sha256: sha256(recoveredWxml),
    recovery_screenshot: path
      .relative(root, recoveryScreenshot)
      .replaceAll("\\", "/"),
  };
}

async function main() {
  const runId = `wechat-devtools-${new Date().toISOString().replaceAll(/[:.]/gu, "-")}-${randomUUID().slice(0, 8)}`;
  const runRoot = path.join(root, "artifacts", "miniapp", "native", "runs", runId);
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
      EventEmitter.prototype.removeListener.call(program, "exception", onException);
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
        await readFile(path.join(root, "node_modules", "miniprogram-automator", "package.json"), "utf8"),
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
        "candidate and generated-bundle before/after fingerprints plus exact private-config restoration",
      identity: { status: "pending" },
      path_bindings: [],
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
          base_library_version: toolInfo.SDKVersion,
        });
        result.project_session.path_bindings.push({
          stage,
          ...attemptLaunch.projectPathBinding,
        });
        return {
          launch: attemptLaunch,
          program: attemptProgram,
          detachRuntimeObservers: attemptDetachRuntimeObservers,
          toolInfo,
        };
      } catch (error) {
        const attemptRecord = {
          stage,
          attempt,
          status: "failed",
          diagnostic_sha256: sha256(String(error?.message ?? error)),
          diagnostic_excerpt: safeRuntimeExcerpt(error),
          cleanup_status: "pending",
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
            [23977, automationPort],
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
    result.build = await buildCurrentCandidate(apiPort);
    apiProcess = await startApi(apiPort);
    projectIdentitySession = await prepareWechatProjectIdentity(before.sha256);
    result.project_session.identity = projectIdentitySession.evidence;
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
    const setupRuntimeQuiescence = await waitForRuntimeEventQuiescence(
      runtimeEvents,
    );
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
    result.setup.evidence_reset = await resetThroughAcceptanceControl(miniProgram);
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
    const selectedJourneyKeys = journeyKeysByScope[acceptanceScope];
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
        faultResult.runtime_quiescence = await waitForRuntimeEventQuiescence(
          runtimeEvents,
        );
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
    const evidenceRuntimeQuiescence = await waitForRuntimeEventQuiescence(
      runtimeEvents,
    );
    detachRuntimeObservers();
    detachRuntimeObservers = undefined;
    const after = await candidateSnapshot();
    result.request_diagnostics = await miniProgram
      .callWxMethod("getStorageSync", requestDiagnosticStorageKey)
      .catch(() => []);
    const bundleAfter = await directorySnapshot(
      repositoryPath("apps/wechat-miniapp/dist/weapp"),
    );
    result.candidate_after = after;
    result.bundle_after = bundleAfter;
    const exceptions = runtimeEvents.filter((entry) => entry.kind === "exception");
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
    const journeysPassed = result.journeys.every((journey) => journey.status === "passed");
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
    result.candidate_after = await candidateSnapshot().catch(() => null);
    result.bundle_after = await directorySnapshot(
      repositoryPath("apps/wechat-miniapp/dist/weapp"),
    ).catch(() => null);
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
      failure_count: (result.cleanup.failure_count ?? 0) + 1,
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
