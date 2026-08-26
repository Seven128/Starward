import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptPath = "infrastructure/deployment/harden-ssh-after-key.sh";
const source = await readFile(scriptPath, "utf8");
const stagingWorkflow = await readFile(".github/workflows/backend-staging.yml", "utf8");
const productionWorkflow = await readFile(".github/workflows/backend-production.yml", "utf8");

test("SSH hardening is an explicit root-only post-key operation", () => {
  assert.match(source, /confirm-starward-ssh-hardening/u);
  assert.match(source, /deploy_user.*starward-deploy/u);
  assert.match(source, /ssh_hardening_root_required/u);
  assert.match(source, /authorized_keys.*-s/u);
  assert.match(source, /ssh-keygen -l -f/u);

  const keyValidation = source.indexOf("ssh-keygen -l -f");
  const configInstall = source.indexOf('install -m 0644 -o root -g root "$temporary"');
  assert.ok(keyValidation >= 0 && keyValidation < configInstall);
});

test("SSH hardening selects public-key-only access and forbids direct root login", () => {
  assert.match(source, /00-starward-hardening\.conf/u);
  assert.match(source, /PubkeyAuthentication yes/u);
  assert.match(source, /AuthenticationMethods publickey/u);
  assert.match(source, /PasswordAuthentication no/u);
  assert.match(source, /KbdInteractiveAuthentication no/u);
  assert.match(source, /PermitRootLogin no/u);
});

test("SSH hardening validates syntax and effective policy before reload", () => {
  const syntaxCheck = source.indexOf('"$sshd_binary" -t');
  const effectiveCheck = source.indexOf('"$sshd_binary" -T');
  const reload = source.indexOf("systemctl reload ssh.service");

  assert.ok(syntaxCheck >= 0 && syntaxCheck < effectiveCheck);
  assert.ok(effectiveCheck >= 0 && effectiveCheck < reload);
  assert.match(source, /rollback_config/u);
  assert.match(source, /ssh_hardening_effective_policy_mismatch/u);
  assert.match(source, /user=root,host=localhost/u);
  assert.match(source, /ssh_hardening_root_effective_policy_mismatch/u);
  assert.match(source, /ssh_hardening_reload_failed/u);
  assert.match(source, /systemctl restart ssh\.service/u);
});

test("release workflows cannot invoke host SSH hardening", () => {
  assert.doesNotMatch(stagingWorkflow, /harden-ssh-after-key/u);
  assert.doesNotMatch(productionWorkflow, /harden-ssh-after-key/u);
});
