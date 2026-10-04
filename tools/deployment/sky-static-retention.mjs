import path from "node:path";
import { pathToFileURL } from "node:url";
import { readEnvironmentFile } from "./env-file.mjs";
import { validateOperatorPreviewEnvironment, validateReleaseEnvironment } from "./validate-release-environment.mjs";
import { inspectSkyStaticRetention } from "./sky-static-release.mjs";

/** Existing descriptor/environment validation and runtime-aware retained store
 * inspection only. It does not invoke release/preview operations or receipts. */
export async function inspectConfiguredSkyRetention({ deployEnvPath, lane, execute }) {
  if (!path.isAbsolute(deployEnvPath ?? "") || !["operator-preview", "release"].includes(lane))
    throw new Error("sky_static_retention_arguments_invalid");
  const validation = await (lane === "operator-preview" ? validateOperatorPreviewEnvironment : validateReleaseEnvironment)({ deployEnvPath });
  const deploy = await readEnvironmentFile(deployEnvPath);
  const report = await inspectSkyStaticRetention({ validation, deploy, observeRuntime: true, observeReceipts: true, execute });
  return report ?? { schemaVersion: "starward-sky-static-retention-review-v1", status: "STATIC_STORE_NOT_CONFIGURED",
    runtime: null, referenceCompleteness: "UNVERIFIED", meaning: "Configuration has no selected store; no runtime mount/receipt inventory inspected." };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== "--env" || args[2] !== "--lane") throw new Error("sky_static_retention_arguments_invalid");
    const result = await inspectConfiguredSkyRetention({ deployEnvPath: args[1], lane: args[3] });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const code = /^[a-z][a-z0-9_-]*(?::[A-Za-z0-9_.-]+)*$/.test(error.message ?? "") ? error.message : "sky_static_retention_inspection_failed";
    console.error(JSON.stringify({ status: "failed", code, meaning: "Failed observation is not absent/empty references and authorizes no cleanup." }));
    process.exitCode = 1;
  }
}
