import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptPath = "infrastructure/deployment/provision-internal-secrets.sh";
const source = await readFile(scriptPath, "utf8");
const stagingWorkflow = await readFile(".github/workflows/backend-staging.yml", "utf8");
const productionWorkflow = await readFile(".github/workflows/backend-production.yml", "utf8");

test("internal secret provisioning is explicit, root-only and environment bounded", () => {
  assert.match(source, /confirm-starward-internal-secret-provisioning/u);
  assert.match(source, /staging\|production/u);
  assert.match(source, /deploy_group.*starward-deploy/u);
  assert.match(source, /internal_secret_root_required/u);
  assert.match(source, /config_root="\/etc\/starward\/\$environment"/u);
  assert.match(source, /root:\$deploy_group:750/u);
});

test("internal secret provisioning refuses overwrite before generation", () => {
  const targetCheck = source.indexOf("internal_secret_target_exists");
  const firstGeneration = source.indexOf("openssl rand -hex 32");

  assert.ok(targetCheck >= 0 && targetCheck < firstGeneration);
  assert.match(source, /\[ ! -e "\$target" \] && \[ ! -L "\$target" \]/u);
  assert.match(source, /created_files/u);
  assert.match(source, /if \[ "\$success" -ne 1 \]/u);
});

test("internal secret provisioning keeps private material root-write and deploy-read", () => {
  assert.match(source, /chmod 0640 "\$temporary\/\$name"/u);
  assert.match(source, /chmod 0644 "\$temporary\/qweather-public\.pem"/u);
  assert.match(source, /openssl genpkey -algorithm ED25519/u);
  assert.match(source, /internal_secret_qweather_keypair_mismatch/u);
  assert.match(source, /MINIAPP_QUEUE_NAME=starward-%s-outbox/u);
  assert.match(source, /"environment".*"qweatherPublicSha256"/u);
  const statusOutput = source.slice(source.lastIndexOf("printf '{\"status\""));
  assert.doesNotMatch(statusOutput, /postgres_password|redis_password|backup_key|qweather-private/u);
});

test("internal secret provisioning is manual and never invoked by release workflows", () => {
  assert.doesNotMatch(stagingWorkflow, /provision-internal-secrets/u);
  assert.doesNotMatch(productionWorkflow, /provision-internal-secrets/u);
});
