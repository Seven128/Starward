import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeScript, sanitizeRuntimeReport } from "./runtime-diagnostics.mjs";

const preflight = readFileSync(new URL("../../infrastructure/deployment/host-preflight.sh", import.meta.url), "utf8");
const failureCodes = new Set([...`${preflight}\n${runtimeScript}`.matchAll(/(?:host_preflight|runtime_diagnostic)_[a-z0-9_]+/gu)].map(([code]) => code));
const connectionKeys = ["SSH_HOST", "SSH_PORT", "SSH_USER", "REMOTE_INBOX", "REMOTE_RELEASE_ROOT", "REMOTE_CANDIDATE_ROOT", "REMOTE_BASE_DEPLOY_ENV"];

// Only these repository-owned read-only programs may run. No arbitrary command,
// remote file, container environment export, credential export or deployment.
export function diagnoseHost(env, execute = spawnSync, temporaryRoot = tmpdir()) {
  const invalid = { status: "failed", code: "diagnostic_configuration_invalid" };
  const mode = env.DIAGNOSTIC_MODE ?? "host";
  if (!["host", "runtime"].includes(mode)) return invalid;
  try {
    const connection = JSON.parse(env.SSH_CONNECTION ?? "");
    if (!connection || Array.isArray(connection) || typeof connection !== "object" ||
        connectionKeys.some((name) => typeof connection[name] !== "string")) return invalid;
    env = { ...env, ...Object.fromEntries(connectionKeys.map((name) => [name, connection[name]])) };
  } catch { return invalid; }
  if (!/^[A-Za-z0-9][A-Za-z0-9.-]*$/u.test(env.SSH_HOST ?? "") ||
      !/^[A-Za-z0-9_][A-Za-z0-9._-]*$/u.test(env.SSH_USER ?? "") ||
      !/^\d{1,5}$/u.test(env.SSH_PORT ?? "") || Number(env.SSH_PORT) < 1 || Number(env.SSH_PORT) > 65535 ||
      !env.SSH_PRIVATE_KEY || !env.SSH_KNOWN_HOSTS) return invalid;
  const paths = connectionKeys.slice(3).map((key) => env[key]);
  if (paths.some((value) => !/^\/[A-Za-z0-9._/-]+$/u.test(value ?? "") || value.split("/").includes(".."))) return invalid;
  let directory;
  try {
    directory = mkdtempSync(join(temporaryRoot, "starward-diagnostic-"));
    const key = join(directory, "key");
    const knownHosts = join(directory, "known_hosts");
    writeFileSync(key, `${env.SSH_PRIVATE_KEY.trimEnd()}\n`, { mode: 0o600 });
    writeFileSync(knownHosts, `${env.SSH_KNOWN_HOSTS.trimEnd()}\n`, { mode: 0o600 });
    const childEnv = { ...env };
    for (const name of [...connectionKeys, "SSH_CONNECTION", "SSH_PRIVATE_KEY", "SSH_KNOWN_HOSTS"]) delete childEnv[name];
    const result = execute("ssh", [
      "-i", key, "-F", "/dev/null", "-o", "GlobalKnownHostsFile=/dev/null", "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=yes",
      "-o", `UserKnownHostsFile=${knownHosts}`, "-o", "BatchMode=yes",
      "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=10", "-o", "ServerAliveCountMax=2",
      "-p", env.SSH_PORT, `${env.SSH_USER}@${env.SSH_HOST}`,
      `sh -s -- ${paths.map((value) => `'${value}'`).join(" ")}`,
    ], { input: mode === "runtime" ? runtimeScript : preflight, encoding: "utf8", timeout: 60_000, maxBuffer: 64 * 1024, env: childEnv, windowsHide: true });
    if (result.error || result.signal) return { status: "failed", code: "diagnostic_transport_interrupted" };
    if (result.status !== 0) {
      const code = String(result.stderr ?? "").trim().split(":")[0];
      return { status: "failed", code: result.status === 65 && failureCodes.has(code) ? code : "diagnostic_ssh_failed" };
    }
    const report = JSON.parse(result.stdout);
    if (mode === "runtime") return sanitizeRuntimeReport(report);
    if (report.status !== "ready" || report.os !== "ubuntu-24.04" || report.architecture !== "x86_64" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(report.checkedAt) ||
        !["cpu", "memoryKiB", "availableDiskKiB"].every((name) => Number.isSafeInteger(report[name]) && report[name] > 0) ||
        !["node", "docker", "compose"].every((name) => typeof report[name] === "string" && /^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.]+)?$/u.test(report[name]))) {
      return { status: "failed", code: "diagnostic_response_invalid" };
    }
    return Object.fromEntries(["status", "checkedAt", "os", "architecture", "cpu", "memoryKiB", "availableDiskKiB", "node", "docker", "compose"].map((name) => [name, report[name]]));
  } catch {
    return { status: "failed", code: "diagnostic_execution_failed" };
  } finally {
    // This directory is freshly allocated by this invocation, contains only its
    // ephemeral SSH inputs, and is never accepted from remote output or arguments.
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
}

export function diagnosticSucceeded(report) {
  return report.status === "ready" || (report.status === "observed" && report.runtimeEnvironment === "staging" && report.configState === "ready" && report.databaseState === "ready" && report.healthStatus === 200);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = diagnoseHost(process.env);
  console.log(JSON.stringify(report));
  process.exitCode = diagnosticSucceeded(report) ? 0 : 1;
}
