import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");

function resolveRepositorySubdirectory(value, label) {
  const resolved = path.resolve(repositoryRoot, value);
  const relative = path.relative(repositoryRoot, resolved);
  if (!relative || path.isAbsolute(relative) || relative.startsWith(`..${path.sep}`) || relative === "..") {
    throw new Error(`native_diagnostic_${label}_outside_repository`);
  }
  return resolved;
}

function parseDiagnosticArgs(values) {
  const allowed = new Set([
    "checkpoint-root",
    "condition",
    "control",
    "max-workers",
    "mode",
    "outcome",
    "output",
    "resume",
    "serials",
  ]);
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--help") {
      options.help = true;
      continue;
    }
    if (!value.startsWith("--")) throw new Error(`native_diagnostic_argument_invalid:${value}`);
    const key = value.slice(2);
    if (!allowed.has(key)) throw new Error(`native_diagnostic_argument_unknown:${key}`);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`native_diagnostic_argument_missing:${key}`);
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function spawnCapture(command, argv, { cwd = repositoryRoot, inherit = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, {
      cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    if (!inherit) {
      child.stdout.on("data", (chunk) => stdout.push(chunk));
      child.stderr.on("data", (chunk) => stderr.push(chunk));
    }
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({
        code: code ?? 1,
        stderr: Buffer.concat(stderr).toString("utf8"),
        stdout: Buffer.concat(stdout).toString("utf8"),
      });
    });
  });
}

async function activeAuthorityIdentity() {
  const result = await spawnCapture("git", [
    "config",
    "--get-regexp",
    "^ty-context\\.longTask\\.",
  ]);
  if (result.code !== 0) throw new Error("native_diagnostic_active_authority_missing");
  const records = result.stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (records.length !== 1) {
    throw new Error(`native_diagnostic_active_authority_ambiguous:${records.length}`);
  }
  const value = records[0].split(/\s+/u).slice(1).join(" ");
  const [taskId, revision, identity] = value.split("|");
  if (!taskId || !/^\d+$/u.test(revision ?? "") || !/^[a-f0-9]{64}$/u.test(identity ?? "")) {
    throw new Error("native_diagnostic_active_authority_invalid");
  }
  return { identity, revision: Number(revision), taskId };
}

async function main(values = process.argv.slice(2)) {
  const options = parseDiagnosticArgs(values);
  if (options.help) {
    process.stdout.write([
      "Usage: npm run dev:inspect:mobile:native -- --outcome <key> [options]",
      "",
      "Options:",
      "  --control <key[,key]|all>       default: all Outcome controls",
      "  --mode <planning,night,red-light|all>  default: planning",
      "  --condition <key[,key]|all>      default: mobile-android-390-full",
      "  --serials <serial[,serial]|auto> default: STARWARD_ANDROID_SERIAL(S) or auto",
      "  --max-workers <n>                default: 1",
      "  --resume <true|false>             default: true; exact Authority/candidate only",
      "  --checkpoint-root <path>          optional explicit checkpoint directory",
      "  --output <path>                   optional diagnostic artifact directory",
      "",
      "This command is diagnostic-only and cannot produce Long-Task acceptance.",
      "",
    ].join("\n"));
    return 0;
  }
  if (!options.outcome || !/^[a-z0-9-]+$/u.test(options.outcome)) {
    throw new Error("native_diagnostic_outcome_required");
  }
  const authority = await activeAuthorityIdentity();
  const runnerArguments = [
    path.join(scriptDirectory, "verify-native-target.mjs"),
    "--platform", "android",
    "--outcome", options.outcome,
    "--target-ref", "mobile-android-native",
    "--root-entrypoint", "apps/mobile/index.js",
    "--assertion-key", "mobile-page-constraint-conformance",
    "--observation", `design.${options.outcome}.mobile-page-constraint-conformance.passed`,
    "--design-handoff", "docs/design-resources/starward-residual-implementation-handoff.md",
    "--diagnostic", "true",
    "--execution-scope", "diagnostic",
    "--authority-identity", authority.identity,
    "--condition", options.condition ?? "mobile-android-390-full",
    "--control", options.control ?? "all",
    "--mode", options.mode ?? "planning",
    "--android-serials", options.serials ?? process.env.STARWARD_ANDROID_SERIALS
      ?? process.env.STARWARD_ANDROID_SERIAL
      ?? "auto",
    "--max-workers", options["max-workers"] ?? "1",
    "--resume", options.resume ?? "true",
  ];
  if (options["checkpoint-root"]) {
    runnerArguments.push(
      "--checkpoint-root",
      resolveRepositorySubdirectory(options["checkpoint-root"], "checkpoint_root"),
    );
  }
  if (options.output) {
    runnerArguments.push(
      "--diagnostic-output",
      resolveRepositorySubdirectory(options.output, "output"),
    );
  }
  process.stderr.write(`STARWARD_NATIVE_DIAGNOSTIC_AUTHORITY:${JSON.stringify({
    identity: authority.identity,
    revision: authority.revision,
    task_id: authority.taskId,
  })}\n`);
  const child = spawn(process.execPath, runnerArguments, {
    cwd: repositoryRoot,
    env: process.env,
    shell: false,
    windowsHide: true,
    stdio: "inherit",
  });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath && path.normalize(invokedPath).toLowerCase() === path.normalize(modulePath).toLowerCase()) {
  process.exitCode = await main();
}

export {
  activeAuthorityIdentity,
  main,
  parseDiagnosticArgs,
  resolveRepositorySubdirectory,
};
