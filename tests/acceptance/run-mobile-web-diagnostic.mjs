import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMobileWebSession } from "./mobile-web-session.mjs";

const acceptanceRoot = path.dirname(fileURLToPath(import.meta.url));
const values = process.argv.slice(2);
const isolated = values.includes("--isolated");

if (values.includes("--help")) {
  process.stdout.write([
    "Usage: node run-mobile-web-diagnostic.mjs --outcome <key> [options]",
    "",
    "Options:",
    "  --control <key[,key]|all>        default: all controls owned by the Outcome",
    "  --mode <planning,night,red-light|all>  default: planning",
    "  --condition <key[,key]|all>       default: mobile-android-390-full",
    "  --output <repository-relative path>",
    "  --isolated                       own a temporary API + Expo Web session",
    "",
    "Without --isolated, start npm run dev:acceptance:mobile first.",
    "Outputs are diagnostic-only and cannot satisfy Android or Long-Task evidence.",
    "",
  ].join("\n"));
  process.exit(0);
}

const allowed = new Set(["outcome", "control", "mode", "condition", "output"]);
const options = {};
for (let index = 0; index < values.length; index += 1) {
  const value = values[index];
  if (value === "--isolated") continue;
  if (!value.startsWith("--")) throw new Error(`mobile_web_diagnostic_argument_invalid:${value}`);
  const key = value.slice(2);
  if (!allowed.has(key)) throw new Error(`mobile_web_diagnostic_argument_unknown:${key}`);
  const next = values[index + 1];
  if (!next || next.startsWith("--")) throw new Error(`mobile_web_diagnostic_argument_missing:${key}`);
  options[key] = next;
  index += 1;
}
if (!options.outcome) throw new Error("mobile_web_diagnostic_argument_missing:outcome");

const baseUrl = process.env.STARWARD_ACCEPTANCE_BASE_URL ?? "http://127.0.0.1:4173";
if (!isolated) await validateMobileWebSession({ baseUrl });

const requireFromAcceptance = createRequire(path.join(acceptanceRoot, "package.json"));
const playwrightCli = requireFromAcceptance.resolve("@playwright/test/cli");
const childEnvironment = {
  ...process.env,
  STARWARD_WEB_DIAGNOSTIC_OUTCOME: options.outcome,
  STARWARD_WEB_DIAGNOSTIC_CONTROL: options.control ?? "all",
  STARWARD_WEB_DIAGNOSTIC_MODE: options.mode ?? "planning",
  STARWARD_WEB_DIAGNOSTIC_CONDITION: options.condition ?? "mobile-android-390-full",
};
const progressFile = path.join(acceptanceRoot, "test-results", "mobile-design-diagnostic-progress.jsonl");
await mkdir(path.dirname(progressFile), { recursive: true });
await writeFile(progressFile, "", "utf8");
childEnvironment.STARWARD_WEB_DIAGNOSTIC_PROGRESS_FILE = progressFile;
process.stdout.write(`STARWARD_MOBILE_WEB_DIAGNOSTIC_PROGRESS_FILE:${progressFile}\n`);
if (options.output) childEnvironment.STARWARD_WEB_DIAGNOSTIC_OUTPUT = options.output;
if (isolated) delete childEnvironment.STARWARD_ACCEPTANCE_BASE_URL;
else childEnvironment.STARWARD_ACCEPTANCE_BASE_URL = baseUrl;

const child = spawn(process.execPath, [
  playwrightCli,
  "test",
  "ui/mobile-design-diagnostic.spec.mjs",
  "--config",
  "playwright.mobile-design.config.mjs",
  "--reporter",
  "line",
], {
  cwd: acceptanceRoot,
  env: childEnvironment,
  shell: false,
  windowsHide: true,
  stdio: "inherit",
});
const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code) => resolve(code ?? 1));
});
process.exit(exitCode);
