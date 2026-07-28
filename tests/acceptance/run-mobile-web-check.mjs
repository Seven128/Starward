import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMobileWebSession } from "./mobile-web-session.mjs";

const acceptanceRoot = path.dirname(fileURLToPath(import.meta.url));
const forwarded = process.argv.slice(2);
const isolated = forwarded.includes("--isolated");
const playwrightArguments = forwarded.filter((value) => value !== "--isolated");

if (forwarded.includes("--help")) {
  process.stdout.write([
    "Usage: node run-mobile-web-check.mjs [Playwright arguments]",
    "",
    "Start the reusable server first with:",
    "  npm run dev:acceptance:mobile",
    "",
    "The default server is http://127.0.0.1:4173; override it with",
    "STARWARD_ACCEPTANCE_BASE_URL. This command never starts a fallback server.",
    "Pass --isolated to use the ordinary Playwright-owned server lifecycle instead.",
    "",
  ].join("\n"));
  process.exit(0);
}

const baseUrl = process.env.STARWARD_ACCEPTANCE_BASE_URL ?? "http://127.0.0.1:4173";
if (!isolated) await validateMobileWebSession({ baseUrl });

const requireFromAcceptance = createRequire(path.join(acceptanceRoot, "package.json"));
const playwrightCli = requireFromAcceptance.resolve("@playwright/test/cli");
const argv = [
  playwrightCli,
  "test",
  "ui/starward.spec.mjs",
  "--config",
  "playwright.config.mjs",
  ...playwrightArguments,
];
const child = spawn(process.execPath, argv, {
  cwd: acceptanceRoot,
  env: isolated ? process.env : { ...process.env, STARWARD_ACCEPTANCE_BASE_URL: baseUrl },
  shell: false,
  windowsHide: true,
  stdio: "inherit",
});
const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code) => resolve(code ?? 1));
});
process.exit(exitCode);
