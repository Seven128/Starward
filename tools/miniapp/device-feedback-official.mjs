import { spawn } from "node:child_process";
import { access, lstat, realpath, rm } from "node:fs/promises";
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
        return {
          file: await physicalFile(path.join(directory, "微信开发者工具.exe")),
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

// Official output may contain a QR, project path, account state or service detail.
export function runOfficialProcess(
  file,
  args,
  {
    timeout = 120_000,
    maxBytes = 64 * 1024,
    cwd,
    env,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      ...(cwd ? { cwd } : {}),
      ...(env ? { env: { ...process.env, ...env } } : {}),
    });
    const chunks = [];
    let bytes = 0;
    let failure = null;
    let finished = false;
    const finish = (callback) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      failure = "official_timeout";
      child.kill();
    }, timeout);
    const consume = (chunk, keep) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        failure = "official_output_limit";
        child.kill();
      } else if (keep) chunks.push(chunk);
    };
    child.stdout.on("data", (chunk) => consume(chunk, true));
    child.stderr.on("data", (chunk) => consume(chunk, false));
    child.once("error", () =>
      finish(() => reject(new Error("device_feedback_official_unavailable"))),
    );
    child.once("close", (code) =>
      finish(() => {
        if (failure || code !== 0)
          reject(new Error(`device_feedback_${failure ?? "official_failed"}`));
        else resolve(Buffer.concat(chunks));
      }),
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
    const probe = async (command) => {
      try {
        await this.run(
          this.invocation.file,
          this.args([command, "--help", "--lang", "zh"]),
          this.options({ timeout: 15_000, maxBytes: 32 * 1024 }),
        );
        return "available";
      } catch {
        return "unavailable";
      }
    };
    const automaticUpdate = await probe("auto-preview");
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

  async autoPreview(project, infoOutput, port) {
    const args = [
      "auto-preview", "--project", project, "--info-output", infoOutput, "--lang", "zh",
    ];
    if (port !== undefined) args.push("--port", String(port));
    try {
      await this.run(this.invocation.file, this.args(args), this.options());
    } finally {
      await rm(infoOutput, { force: true });
    }
  }

  async preview(project, qrOutput, infoOutput, port) {
    const args = [
      "preview", "--project", project, "--qr-format", "image",
      "--qr-output", qrOutput, "--info-output", infoOutput, "--lang", "zh",
    ];
    if (port !== undefined) args.push("--port", String(port));
    try {
      await this.run(this.invocation.file, this.args(args), this.options());
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

export async function invokeOfficial(generation, options, injected) {
  const infoOutput = path.join(generation.directory, ".official-preview-info");
  try {
    await (await officialDriver(options, injected)).autoPreview(
      generation.project,
      infoOutput,
      options.port,
    );
    return { disposition: "completed", boundary: null };
  } catch (error) {
    return { disposition: "manual_required", boundary: manualBoundary(error) };
  } finally {
    await rm(infoOutput, { force: true });
  }
}
