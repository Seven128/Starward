import { spawn, execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { canonicalDirectory, samePath } from "./device-feedback-paths.mjs";
import { resolveOfficialCli } from "./device-feedback-official.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registry = path.join(root, "artifacts/miniapp/development-observer");
const hash = value => createHash("sha256").update(value).digest("hex");
const runFile = promisify(execFile);
export const observerFail = code => { throw new Error("development_observer_" + code); };
export function validAutomationPort(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 65535) observerFail("valid_automation_port_required");
  return number;
}
export function developmentOptions(argv) {
  const result = { apiPort: 8787, automationPort: null, noOpen: false, memory: false };
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (value === "--api-port" || value === "--automation-port") {
      const port = validAutomationPort(argv[++i]);
      result[value === "--api-port" ? "apiPort" : "automationPort"] = port;
    } else if (value === "--no-open") result.noOpen = true;
    else if (value === "--memory") result.memory = true;
    else observerFail("unknown_development_option");
  }
  if (result.automationPort !== null && (result.noOpen || result.automationPort === result.apiPort)) observerFail("automation_port_conflict");
  return result;
}
export function canListen(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}
export function observerReceiptPath(projectPath) {
  return path.join(registry, hash(path.resolve(projectPath).toLowerCase()).slice(0, 24) + ".json");
}
async function projectIdentity(projectPath) {
  const physical = await canonicalDirectory(projectPath);
  const publicConfig = await readFile(path.join(physical, "project.config.json"));
  const config = JSON.parse(publicConfig);
  if (config.compileType !== "miniprogram" || typeof config.miniprogramRoot !== "string") observerFail("project_config_invalid");
  const bundle = await realpath(path.resolve(physical, config.miniprogramRoot));
  if (!samePath(bundle, physical) && !bundle.toLowerCase().startsWith((physical + path.sep).toLowerCase())) observerFail("bundle_outside_project");
  return { projectPath: physical, configSha256: hash(publicConfig) };
}

// Only PID/start identities and project-binding booleans leave this subprocess.
// Command lines are inspected locally and never printed or persisted.
const inspectScript = String.raw`
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$rows=@(Get-CimInstance Win32_Process)
$byId=@{}; foreach($row in $rows){$byId[[int]$row.ProcessId]=$row}
function Identity($row){if($null -eq $row){return $null}; return @{pid=[int]$row.ProcessId;startedAt=$row.CreationDate.ToUniversalTime().ToString('o')}}
$owner=$byId[[int]$env:STARWARD_OBSERVER_OWNER]
function WithinTool($value){return $value -and ($value.Equals($env:STARWARD_OBSERVER_TOOL_ROOT,[StringComparison]::OrdinalIgnoreCase) -or $value.StartsWith($env:STARWARD_OBSERVER_TOOL_ROOT.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase))}
$connections=@(Get-NetTCPConnection -LocalPort ([int]$env:STARWARD_OBSERVER_PORT) -State Listen -ErrorAction SilentlyContinue)
$listenerIds=@($connections | Select-Object -ExpandProperty OwningProcess -Unique)
$listener=$null; $listenerInTool=$false; $scopeProcesses=@{}; $internalPath=$null
if($listenerIds.Count -eq 1){
  $listener=$byId[[int]$listenerIds[0]]
  $listenerInTool=[bool](WithinTool $listener.ExecutablePath)
  if($listener.CommandLine -match '(?:"--user-data-dir=([^"]+)"|--user-data-dir="([^"]+)"|--user-data-dir=([^\s"]+)|--user-data-dir\s+"([^"]+)"|--user-data-dir\s+([^\s"]+))'){
    $observerProfile=$null; foreach($group in 1..5){if($Matches[$group]){$observerProfile=$Matches[$group];break}}
    if($observerProfile -and [IO.Path]::IsPathRooted($observerProfile)){$internalPath=[IO.Path]::GetFullPath([IO.Path]::Combine($observerProfile,'WeappLocalData'))}
  }
  foreach($row in $rows){
    if($row.Name -ne 'wxfilewatcher_x64.exe'){continue}
    $ancestor=$row; $seen=@{}
    while($null -ne $ancestor -and -not $seen.ContainsKey([int]$ancestor.ProcessId)){
      $seen[[int]$ancestor.ProcessId]=$true
      if(-not $scopeProcesses.ContainsKey([int]$ancestor.ProcessId)){$scopeProcesses[[int]$ancestor.ProcessId]=@{pid=[int]$ancestor.ProcessId;parentPid=[int]$ancestor.ParentProcessId}}
      $ancestor=$byId[[int]$ancestor.ParentProcessId]
    }
    if($row.CommandLine -match 'wxfilewatcher_x64\.exe"?\s+(?:"([^"]+)"|([^"\r\n]+))$'){
      $value=if($Matches[1]){$Matches[1]}else{$Matches[2]}; $value=$value.Trim().TrimEnd('\')
      $scopeProcesses[[int]$row.ProcessId].watcherPath=$value
    }else{$scopeProcesses[[int]$row.ProcessId].watcherPath=$null}
  }
}
ConvertTo-Json -Compress -Depth 4 @{owner=(Identity $owner);listener=(Identity $listener);listenerInTool=$listenerInTool;processes=@($scopeProcesses.Values);internalPath=$internalPath}
`;
export function classifyDevelopmentWatchers(watcherPaths, projectPath, internalPaths) {
  let candidateCount = 0, internalCount = 0, unknownCount = 0;
  for (const value of watcherPaths) {
    if (typeof value !== "string") { unknownCount++; continue; }
    const normalized = path.resolve(value);
    if (samePath(normalized, path.resolve(projectPath))) candidateCount++;
    else if (internalPaths.some(internal => samePath(normalized, internal))) internalCount++;
    else unknownCount++;
  }
  return { candidateCount, internalCount, unknownCount, bound: candidateCount > 0 && unknownCount === 0 };
}
export function classifyDevelopmentWatcherTree(processes, listenerPid, projectPath, internalPaths) {
  const byId = new Map(processes.map(row => [row.pid, row]));
  const paths = [];
  for (const row of processes) {
    if (!Object.hasOwn(row, "watcherPath")) continue;
    let ancestor = row;
    const seen = new Set();
    while (ancestor && !seen.has(ancestor.pid)) {
      seen.add(ancestor.pid);
      if (ancestor.pid === listenerPid) { paths.push(row.watcherPath); break; }
      ancestor = byId.get(ancestor.parentPid);
    }
  }
  return classifyDevelopmentWatchers(paths, projectPath, internalPaths);
}
export async function inspectDevelopmentHost({ port, ownerPid, projectPath, toolRoot }) {
  if (process.platform !== "win32") observerFail("host_inspection_requires_windows");
  try {
    const { stdout } = await runFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", inspectScript], {
      timeout: 8000, maxBuffer: 64 * 1024, windowsHide: true,
      env: { ...process.env, STARWARD_OBSERVER_PORT: String(port), STARWARD_OBSERVER_OWNER: String(ownerPid),
        STARWARD_OBSERVER_PROJECT: projectPath, STARWARD_OBSERVER_TOOL_ROOT: toolRoot },
    });
    const observation = JSON.parse(stdout.trim());
    const internals = [];
    // Derive exactly one internal directory from this listener renderer's
    // actual profile argument. Do not trust all profiles or an AppData prefix.
    if (observation.internalPath && path.isAbsolute(observation.internalPath) && path.basename(observation.internalPath) === "WeappLocalData") {
      const internal = path.resolve(observation.internalPath);
      const info = await stat(internal).catch(() => null);
      if (info?.isDirectory()) {
        if (!samePath(await realpath(internal), internal)) observerFail("internal_watcher_path_redirected");
        internals.push(internal);
      }
    }
    // A different window's renderer is not this port's project. If the port is
    // on a global main process its whole subtree must still be unambiguous.
    const classification = classifyDevelopmentWatcherTree(observation.processes ?? [], observation.listener?.pid, projectPath, internals);
    return { owner: observation.owner, listener: observation.listener,
      projectBound: observation.listenerInTool && classification.bound,
      watcherCounts: { candidate: classification.candidateCount, internal: classification.internalCount, unknown: classification.unknownCount } };
  } catch (error) {
    if (/^development_observer_[a-z_]+$/u.test(error?.message ?? "")) throw error;
    observerFail("host_identity_unavailable");
  }
}
const sameProcess = (left, right) => left && right && left.pid === right.pid && typeof left.startedAt === "string" && left.startedAt === right.startedAt;

export async function validateObserverReceipt(projectPath, port, { inspect = inspectDevelopmentHost, resolveCli = resolveOfficialCli, receiptFile = observerReceiptPath(projectPath) } = {}) {
  let receipt;
  try { receipt = JSON.parse(await readFile(receiptFile, "utf8")); } catch { observerFail("owned_session_receipt_required"); }
  const identity = await projectIdentity(projectPath);
  if (receipt.schema !== 1 || receipt.phase !== "ready" || !receipt.id || !samePath(receipt.projectPath, identity.projectPath) ||
    receipt.port !== validAutomationPort(port) || receipt.configSha256 !== identity.configSha256 || !path.isAbsolute(receipt.toolRoot ?? "")) observerFail("session_identity_changed");
  const invocation = await resolveCli();
  if (!samePath(path.dirname(invocation.file), receipt.toolRoot)) observerFail("official_tool_identity_changed");
  const actual = await inspect({ port: receipt.port, ownerPid: receipt.owner?.pid, projectPath: identity.projectPath, toolRoot: receipt.toolRoot });
  if (!sameProcess(receipt.owner, actual.owner) || !sameProcess(receipt.listener, actual.listener) || !actual.projectBound) observerFail("session_owner_or_project_changed");
  return { ...receipt, receiptFile };
}

/** Opt-in warm-session launch; never quits/reloads another IDE or claims a live port. */
export async function startDevelopmentAutomation(projectPath, port, options = {}) {
  const checkCancellation = () => { if (options.signal?.aborted) observerFail("launch_cancelled"); };
  checkCancellation();
  const startupTimeout = options.timeoutMs ?? 30_000;
  if (!Number.isInteger(startupTimeout) || startupTimeout < 1 || startupTimeout > 60_000) observerFail("startup_timeout_out_of_bounds");
  port = validAutomationPort(port);
  const identity = await projectIdentity(projectPath);
  const inspect = options.inspect ?? inspectDevelopmentHost;
  const free = options.canListen ?? canListen;
  if (!(await free(port))) observerFail("automation_port_in_use");
  const invocation = await (options.resolveCli ?? resolveOfficialCli)();
  const toolRoot = path.dirname(invocation.file);
  const receiptFile = options.receiptFile ?? observerReceiptPath(identity.projectPath);
  await mkdir(path.dirname(receiptFile), { recursive: true });
  let old;
  try { old = JSON.parse(await readFile(receiptFile, "utf8")); } catch {}
  if (old?.owner) {
    const actual = await inspect({ port, ownerPid: old.owner.pid, projectPath, toolRoot });
    if (sameProcess(old.owner, actual.owner)) observerFail("development_owner_still_running");
    await rm(receiptFile, { force: true });
  }
  const before = await inspect({ port, ownerPid: process.pid, projectPath, toolRoot });
  if (!before.owner || before.listener) observerFail("automation_owner_or_port_unavailable");
  const receipt = { schema: 1, phase: "starting", id: randomUUID(), ...identity, port, toolRoot, owner: before.owner };
  checkCancellation();
  await writeFile(receiptFile, JSON.stringify(receipt), { flag: "wx", mode: 0o600 });
  let child, stopping = false;
  const cleanup = async () => {
    stopping = true;
    options.signal?.removeEventListener("abort", cancelled);
    // Only our short-lived CLI process, never the IDE process or an existing window.
    if (child && child.exitCode === null) { try { child.kill(); } catch {} }
    try {
      const current = JSON.parse(await readFile(receiptFile, "utf8"));
      if (current.id === receipt.id) await rm(receiptFile, { force: true });
    } catch {}
  };
  const cancelled = () => { void cleanup(); };
  options.signal?.addEventListener("abort", cancelled, { once: true });
  try {
    checkCancellation();
    child = (options.spawn ?? spawn)(invocation.file, [...invocation.prefix, "auto", "--project", identity.projectPath, "--auto-port", String(port), "--trust-project"], {
      cwd: invocation.cwd ?? root, env: { ...process.env, ...invocation.env }, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    });
    let failed = false, outputBytes = 0;
    child.once("error", () => { failed = true; });
    const consume = chunk => { outputBytes += chunk.length; if (outputBytes > 64 * 1024) { failed = true; child.kill(); } };
    child.stdout.on("data", consume); child.stderr.on("data", consume);
    options.onStarted?.(cleanup);
    const deadline = Date.now() + startupTimeout;
    while (!stopping && Date.now() < deadline) {
      if (failed || (child.exitCode !== null && child.exitCode !== 0)) observerFail("official_auto_failed");
      const actual = await inspect({ port, ownerPid: process.pid, projectPath, toolRoot });
      if (stopping || Date.now() >= deadline) break;
      if (actual.listener && actual.projectBound && sameProcess(receipt.owner, actual.owner)) {
        receipt.phase = "ready"; receipt.listener = actual.listener;
        await writeFile(receiptFile, JSON.stringify(receipt), { mode: 0o600 });
        if (stopping) { await cleanup(); observerFail("launch_cancelled"); }
        return { receiptFile, port, cleanup };
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    observerFail(stopping ? "launch_cancelled" : "automation_binding_timeout");
  } catch (error) { await cleanup(); throw error; }
}
