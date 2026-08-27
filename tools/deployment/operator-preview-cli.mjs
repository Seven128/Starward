import { operatePreview } from "./operator-preview.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

try {
  const result = await operatePreview({
    deployEnvPath: option("--deploy-env"),
    operation: option("--operation") ?? "check",
    operator: option("--operator") ?? process.env.GITHUB_ACTOR,
  });
  console.log(JSON.stringify(result));
  if (result.receipt.status !== "succeeded") process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({
    status: "failed",
    code: /^[a-z][a-z0-9_:-]*$/u.test(error.message ?? "") ? error.message : "operator_preview_failed",
  }));
  process.exitCode = 1;
}
