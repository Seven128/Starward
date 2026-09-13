import { appendFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeploymentConnection } from "./deployment-connection.mjs";

// Step env contains only the already masked packet. Register every scalar mask
// before exporting it for subsequent steps, whose env headers Actions prints.
export function loadActionsConnection(env, emit = line => process.stdout.write(`${line}\n`), append = appendFileSync) {
  if (env.GITHUB_ACTIONS !== "true" || !env.GITHUB_ENV || !isAbsolute(env.GITHUB_ENV))
    throw new Error("deployment_connection_requires_actions");
  const connection = parseDeploymentConnection(env.SSH_CONNECTION ?? "");
  for (const value of Object.values(connection)) emit(`::add-mask::${value}`);
  append(env.GITHUB_ENV, Object.entries(connection).map(([name, value]) => `${name}=${value}\n`).join(""), { encoding: "utf8", mode: 0o600 });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { loadActionsConnection(process.env); }
  catch { console.error("deployment_connection_load_failed"); process.exitCode = 1; }
}
