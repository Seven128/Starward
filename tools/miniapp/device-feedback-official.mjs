import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, lstat, open, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { errorCode } from "./device-feedback-command.mjs";
import {
  feedbackFail as fail,
  samePath,
} from "./device-feedback-paths.mjs";

const defaultCli =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat";
const electronCliBootstrap =
  "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";

async function physicalFile(value) {
  if (!value || !path.isAbsolute(value)) fail("official_cli_absolute_path_required");
  let canonical;
  try {
    canonical = await realpath(value);
    if ((await lstat(value)).isSymbolicLink()) fail("official_cli_symlink");
  } catch (error) {
    if (String(error?.message ?? error).startsWith("device_feedback_")) throw error;
    fail("official_cli_unavailable");
  }
  if (!samePath(path.resolve(value), canonical)) fail("official_cli_physical_path_required");
  return canonical;
}

export async function resolveOfficialCli(explicit, environment = process.env) {
  const selected = explicit || environment.STARWARD_WECHAT_DEVTOOLS_CLI;
  // An explicit installation is authoritative: do not silently switch to a
  // different, possibly retired copy when that installation is unavailable.
  const candidates = selected ? [selected] : [
    ...(environment.PATH ?? environment.Path ?? "").split(path.delimiter)
      .filter(Boolean).map(directory => path.join(directory, "cli.bat")),
    environment["ProgramFiles(x86)"] &&
      path.join(environment["ProgramFiles(x86)"], "Tencent", "微信web开发者工具", "cli.bat"),
    environment.ProgramFiles &&
      path.join(environment.ProgramFiles, "Tencent", "微信web开发者工具", "cli.bat"),
    defaultCli,
  ].filter(Boolean);
  for (const candidate of [...new Set(candidates)]) {
    try {
      const cli = await physicalFile(path.resolve(candidate));
      if (cli.split(/[\\/]/u).some(segment => segment.toLowerCase() === "package.nw"))
        fail("official_cli_unavailable");
      // Explicit .exe/.js entries must not bypass retirement of the NW runtime.
      const legacyRuntime = await access(path.join(path.dirname(cli), "code", "package.nw", "package.json"))
        .then(() => true, error => {
          if (error.code === "ENOENT") return false;
          throw error;
        });
      if (legacyRuntime) fail("official_cli_unavailable");
      if (path.extname(cli).toLowerCase() === ".bat") {
        const directory = path.dirname(cli);
        const executable = await physicalFile(path.join(directory, "微信开发者工具.exe"));
        const skillEntry = path.join(directory, "resources", "app.asar.unpacked", "js", "common", "cli", "skill-index.js");
        const hasSkillEntry = await access(skillEntry).then(() => true, error => {
          if (error.code === "ENOENT") return false;
          throw error;
        });
        return {
          file: executable,
          prefix: [
            "-e",
            electronCliBootstrap,
            await physicalFile(
              path.join(
                directory,
                "resources",
                "app.asar.unpacked",
                "js",
                "common",
                "cli",
                "index.js",
              ),
            ),
          ],
          cwd: directory,
          env: {
            cwd: process.cwd(),
            ELECTRON: "",
            ELECTRON_RUN_AS_NODE: "1",
          },
          ...(hasSkillEntry ? {
            autoPreviewInvocation: {
              file: executable,
              prefix: [
                "-e",
                "const e=process.argv[1],a=process.argv.slice(2);process.argv=[process.execPath,e,'--electron'].concat(a);require(e)",
                await physicalFile(skillEntry), "-c", "Codex",
              ],
              cwd: directory,
              env: { cwd: process.cwd(), ELECTRON: executable, ELECTRON_RUN_AS_NODE: "1" },
            },
          } : {}),
        };
      }
      if (path.extname(cli).toLowerCase() === ".js")
        return { file: process.execPath, prefix: [cli] };
      if (path.extname(cli).toLowerCase() === ".exe")
        return { file: cli, prefix: [] };
    } catch {}
  }
  fail("official_cli_unavailable");
}

const processDiagnostic = Symbol("officialProcessDiagnostic");

function withProcessDiagnostic(value, diagnostic) {
  if (diagnostic) Object.defineProperty(value, processDiagnostic, { value: diagnostic });
  return value;
}

function diagnosticOptions(directory) {
  return directory ? {
    diagnosticPath: path.join(directory, `.official-process-${randomUUID()}.json`),
  } : {};
}

// Raw official output may contain a QR, project path, account state or service
// detail. Keep it only in the owning generation's private diagnostic, never in
// an Error message or the public result. Successful callers still receive stdout.
export async function runOfficialProcess(
  file,
  args,
  {
    timeout = 120_000,
    maxBytes = 64 * 1024,
    cwd,
    env,
    diagnosticPath,
  } = {},
) {
  let diagnosticFile;
  if (diagnosticPath) {
    try {
      diagnosticFile = await open(diagnosticPath, "wx", 0o600);
    } catch {
      // This guard runs before spawn; it cannot hide an invoked mutation.
      fail("official_diagnostic_unavailable");
    }
  }
  const startedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const stdoutChunks = [], stderrChunks = [];
    let bytes = 0;
    let retainedBytes = 0;
    let failure = null;
    let finished = false;
    let timer;
    const finish = async (code, signal, processError) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks);
      const stderr = Buffer.concat(stderrChunks);
      const codeName = processError ?? (failure || code !== 0
        ? `device_feedback_${failure ?? "official_failed"}` : null);
      let diagnostic;
      if (diagnosticFile) {
        diagnostic = { path: diagnosticPath, retained: false, exitCode: code,
          errorCode: codeName };
        try {
          await diagnosticFile.writeFile(`${JSON.stringify({
            schema: "starward-miniapp-official-process-diagnostic-v1",
            startedAt, completedAt: new Date().toISOString(),
            exitCode: code, signal, errorCode: codeName,
            maxBytes, observedBytes: bytes, retainedBytes,
            truncated: bytes > retainedBytes,
            encoding: "base64", stdout: stdout.toString("base64"), stderr: stderr.toString("base64"),
          }, null, 2)}\n`);
          diagnostic.retained = true;
        } catch {
          diagnostic.retentionError = "device_feedback_official_diagnostic_write_failed";
        } finally {
          await diagnosticFile.close().catch(() => {
            diagnostic.retained = false;
            diagnostic.retentionError = "device_feedback_official_diagnostic_write_failed";
          });
        }
      }
      if (codeName) reject(withProcessDiagnostic(new Error(codeName), diagnostic));
      else resolve(withProcessDiagnostic(stdout, diagnostic));
    };
    let child;
    try {
      child = spawn(file, args, {
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        ...(cwd ? { cwd } : {}),
        ...(env ? { env: { ...process.env, ...env } } : {}),
      });
    } catch {
      void finish(null, null, "device_feedback_official_unavailable");
      return;
    }
    timer = setTimeout(() => {
      failure ??= "official_timeout";
      child.kill();
    }, timeout);
    const consume = (chunk, chunks) => {
      bytes += chunk.length;
      const available = Math.max(0, maxBytes - retainedBytes);
      const retained = chunk.subarray(0, available);
      if (retained.length) {
        chunks.push(retained);
        retainedBytes += retained.length;
      }
      if (bytes > maxBytes) {
        failure ??= "official_output_limit";
        child.kill();
      }
    };
    child.stdout.on("data", (chunk) => consume(chunk, stdoutChunks));
    child.stderr.on("data", (chunk) => consume(chunk, stderrChunks));
    child.once("error", () =>
      void finish(null, null, "device_feedback_official_unavailable"),
    );
    child.once("close", (code, signal) =>
      void finish(code, signal),
    );
  });
}

export function parseOfficialLoginState(output) {
  const lines = Buffer.isBuffer(output)
    ? output.toString("utf8").split(/\r?\n/u)
    : String(output ?? "").split(/\r?\n/u);
  for (const line of lines.toReversed()) {
    try {
      const parsed = JSON.parse(line.trim());
      if (parsed?.login === true) return "ready";
      if (parsed?.login === false) return "required";
    } catch {}
  }
  return "unknown";
}

export class OfficialWechatDevtools {
  constructor(invocation, run = runOfficialProcess) {
    this.invocation = invocation;
    this.run = run;
  }

  args(values) {
    return [...this.invocation.prefix, ...values];
  }

  options(overrides = {}) {
    return {
      ...overrides,
      ...(this.invocation.cwd ? { cwd: this.invocation.cwd } : {}),
      ...(this.invocation.env ? { env: this.invocation.env } : {}),
    };
  }

  async doctor() {
    const probe = async (command, invocation = this.invocation) => {
      try {
        await this.run(
          invocation.file,
          [...invocation.prefix, command, "--help",
            ...(invocation === this.invocation ? ["--lang", "zh"] : [])],
          { timeout: 15_000, maxBytes: 32 * 1024,
            ...(invocation.cwd ? { cwd: invocation.cwd } : {}),
            ...(invocation.env ? { env: invocation.env } : {}) },
        );
        return "available";
      } catch {
        return "unavailable";
      }
    };
    const automaticUpdate = this.invocation.autoPreviewInvocation
      ? await probe("auto_preview", this.invocation.autoPreviewInvocation)
      : await probe("auto-preview");
    const ordinaryPreview = await probe("preview");
    if (automaticUpdate === "unavailable" && ordinaryPreview === "unavailable")
      throw new Error("device_feedback_official_unavailable");
    let login = "unknown";
    try {
      const output = await this.run(
        this.invocation.file,
        this.args(["islogin", "--lang", "zh"]),
        this.options({ timeout: 15_000, maxBytes: 4 * 1024 }),
      );
      login = parseOfficialLoginState(output);
    } catch {}
    return { officialTool: "available", automaticUpdate, ordinaryPreview, login };
  }

  async autoPreview(project, infoOutput, port, diagnosticDirectory) {
    if (this.invocation.autoPreviewInvocation) {
      // The current official skill returns a business result/task handle.
      // Its legacy auto-preview CLI only prints spinner text on success.
      // Never fall back or replay after a current-tool call has started.
      if (port !== undefined) fail("official_skill_port_not_supported");
      const invocation = this.invocation.autoPreviewInvocation;
      return this.run(invocation.file, [...invocation.prefix, "auto_preview", "--project", project], {
        cwd: invocation.cwd, env: invocation.env,
        // The observed successful official upload can exceed two minutes
        // (135.7s including COS retries). Retain a bounded receipt window.
        timeout: 360_000,
        ...diagnosticOptions(diagnosticDirectory),
      });
    }
    const args = [
      "auto-preview", "--project", project, "--info-output", infoOutput, "--lang", "zh",
    ];
    if (port !== undefined) args.push("--port", String(port));
    try {
      return await this.run(this.invocation.file, this.args(args),
        this.options({ timeout: 360_000, ...diagnosticOptions(diagnosticDirectory) }));
    } finally {
      await rm(infoOutput, { force: true });
    }
  }

  async preview(project, qrOutput, infoOutput, port, diagnosticDirectory) {
    const args = [
      "preview", "--project", project, "--qr-format", "image",
      "--qr-output", qrOutput, "--info-output", infoOutput, "--lang", "zh",
    ];
    if (port !== undefined) args.push("--port", String(port));
    try {
      return await this.run(this.invocation.file, this.args(args),
        this.options(diagnosticOptions(diagnosticDirectory)));
    } finally {
      await rm(infoOutput, { force: true });
    }
  }
}

export async function officialDriver(options, injected) {
  if (injected) return injected;
  return new OfficialWechatDevtools(await resolveOfficialCli(options.cli));
}

export function manualBoundary(error) {
  const code = errorCode(error);
  if (code.endsWith("_timeout")) return "timeout";
  if (code.endsWith("_unavailable")) return "unavailable";
  if (code.endsWith("_output_limit")) return "bounded_output";
  return "failed";
}

const resultSchema = "starward-miniapp-official-preview-result-v1";
const resultStatuses = new Set(["pending", "success", "failed", "cancelled", "expired"]);

function boundedIdentifier(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength &&
    /^[a-zA-Z0-9_-]+$/u.test(value) ? value : null;
}

function structuredResult(output) {
  if (Buffer.isBuffer(output) || typeof output === "string") {
    const text = String(output).trim();
    if (!text || text.length > 64 * 1024) return null;
    // The legacy CLI may print progress around a JSON result. Exit zero,
    // spinner text and package-size information are not a preview result.
    for (const candidate of [text, text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
      ...text.split(/\r?\n/u).toReversed()]) {
      try {
        const value = JSON.parse(candidate);
        if (value && typeof value === "object" && !Array.isArray(value)) return value;
      } catch {}
    }
    return null;
  }
  return output && typeof output === "object" && !Array.isArray(output) ? output : null;
}

export function classifyOfficialPreviewResult(output, tool = "auto_preview", { requireStatus = false } = {}) {
  let value = structuredResult(output);
  let failedEnvelope = false;
  // Only unwrap documented transport containers; ok:true is not business success.
  for (let depth = 0; value && depth < 4; depth += 1) {
    if (value.ok === false || value.isError === true) {
      failedEnvelope = true;
      break;
    }
    if (value.structuredContent !== undefined) {
      value = structuredResult(value.structuredContent);
    } else if (value.ok === true && (value.result !== undefined || value.data !== undefined)) {
      value = structuredResult(value.result ?? value.data);
    } else break;
  }
  const statusSupplied = value !== null && Object.hasOwn(value, "status");
  const suppliedStatus = typeof value?.status === "string" ? value.status.toLowerCase() : null;
  const success = typeof value?.success === "boolean" ? value.success : null;
  const result = {
    schema: resultSchema,
    tool,
    status: "unknown",
    success,
    taskId: boundedIdentifier(value?.taskId, 256),
    taskType: boundedIdentifier(value?.taskType, 64),
  };
  let disposition = "unknown";
  let boundary = output === undefined || output === null ? "result_missing" : "result_unrecognized";
  if (failedEnvelope) {
    // A transport/tool error does not establish cancellation of the remote effect.
    disposition = "error";
    boundary = "failed";
  } else if (suppliedStatus === "pending") {
    result.status = "pending";
    disposition = result.taskId ? "pending" : "unknown";
    boundary = result.taskId ? null : "pending_handle_missing";
  } else if (suppliedStatus && resultStatuses.has(suppliedStatus)) {
    if (suppliedStatus === "success" && success === false) {
      boundary = "result_conflict";
    } else {
      result.status = suppliedStatus;
      disposition = suppliedStatus === "success" ? "completed" : suppliedStatus;
      boundary = null;
    }
  } else if (statusSupplied) {
    boundary = "result_status_unrecognized";
  } else if (!requireStatus && success !== null && !result.taskId) {
    result.status = success ? "success" : "failed";
    disposition = success ? "completed" : "failed";
    boundary = null;
  }
  if (result.taskType === "auth" && result.status === "success") {
    disposition = "authorization_ready";
    boundary = "authorization_completed_preview_not_invoked";
  }
  return { disposition, boundary, result,
    ...(output?.[processDiagnostic] ? { diagnostic: output[processDiagnostic] } : {}) };
}

export function officialPreviewError(error, tool = "auto_preview", { notInvoked = false } = {}) {
  notInvoked ||= errorCode(error) === "device_feedback_official_diagnostic_unavailable";
  const official = classifyOfficialPreviewResult(undefined, tool);
  if (notInvoked) official.result.status = "not_invoked";
  return {
    ...official,
    disposition: notInvoked ? "manual_required" : "error",
    boundary: manualBoundary(error),
    ...(error?.[processDiagnostic] ? { diagnostic: error[processDiagnostic] } : {}),
  };
}

export function normalizedOfficialState(official) {
  if (official?.result?.schema === resultSchema) {
    if (official.result.taskType === "auth" && official.result.status === "success")
      return { ...official, disposition: "authorization_ready", boundary: "authorization_completed_preview_not_invoked" };
    if (official.disposition === "completed" && official.result.status !== "success")
      return { ...official, disposition: "unknown", boundary: "result_conflict" };
    return official;
  }
  if (["not_invoked", "invalidated", "qr_ready", "operator_confirmed"].includes(official?.disposition))
    return official;
  // Old completed only meant that a callback resolved. Do not upgrade historical
  // gen26 (or a process interrupted while invoking) into terminal success.
  return {
    ...classifyOfficialPreviewResult(undefined),
    boundary: "legacy_result_unretained",
  };
}

export function assertOfficialOutcomeResolved(official) {
  const current = normalizedOfficialState(official);
  if (current.disposition === "pending") fail("official_pending_no_replay");
  if (["unknown", "error", "invoking"].includes(current.disposition))
    fail("official_outcome_unknown_no_replay");
  return current;
}

export async function invokeOfficial(generation, options, injected) {
  const infoOutput = path.join(generation.directory, ".official-preview-info");
  let driver;
  try {
    driver = await officialDriver(options, injected);
  } catch (error) {
    return officialPreviewError(error, "auto_preview", { notInvoked: true });
  }
  try {
    const result = await driver.autoPreview(
      generation.project,
      infoOutput,
      options.port,
      generation.directory,
    );
    return classifyOfficialPreviewResult(result);
  } catch (error) {
    return officialPreviewError(error, "auto_preview", {
      // This exact driver guard runs before launching the official process.
      // All failures after invocation retain the unresolved/no-replay state.
      notInvoked: errorCode(error) === "device_feedback_official_skill_port_not_supported",
    });
  } finally {
    await rm(infoOutput, { force: true });
  }
}
