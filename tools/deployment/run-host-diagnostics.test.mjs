import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { diagnoseHost } from "./run-host-diagnostics.mjs";

const env = {
  SSH_HOST: "host.example.invalid", SSH_PORT: "22", SSH_USER: "operator",
  REMOTE_INBOX: "/srv/inbox", REMOTE_RELEASE_ROOT: "/srv/releases",
  REMOTE_CANDIDATE_ROOT: "/srv/candidates", REMOTE_BASE_DEPLOY_ENV: "/srv/private/base.env",
  SSH_PRIVATE_KEY: "test-private-key-never-report", SSH_KNOWN_HOSTS: "test-host-trust-never-report",
};
const ready = { status: "ready", checkedAt: "2026-09-13T16:00:00Z", os: "ubuntu-24.04", architecture: "x86_64", cpu: 4, memoryKiB: 4000000, availableDiskKiB: 11000000, node: "24.16.0", docker: "29.5.3", compose: "v2.40.3" };
const protectedEnv = (values = env) => ({
  SSH_CONNECTION: JSON.stringify(Object.fromEntries(Object.entries(values).filter(([name]) => !["SSH_PRIVATE_KEY", "SSH_KNOWN_HOSTS"].includes(name)))),
  SSH_PRIVATE_KEY: values.SSH_PRIVATE_KEY,
  SSH_KNOWN_HOSTS: values.SSH_KNOWN_HOSTS,
});

test("diagnostics sends only the existing preflight with pinned trust and cleans ephemeral credentials", () => {
  let keyPath;
  const actual = diagnoseHost(protectedEnv(), (command, args, options) => {
    assert.equal(command, "ssh");
    keyPath = args[1];
    assert.equal(readFileSync(keyPath, "utf8"), `${env.SSH_PRIVATE_KEY}\n`);
    assert.equal(readFileSync(join(dirname(keyPath), "known_hosts"), "utf8"), `${env.SSH_KNOWN_HOSTS}\n`);
    if (process.platform !== "win32") assert.equal(statSync(keyPath).mode & 0o777, 0o600);
    for (const option of ["IdentitiesOnly=yes", "StrictHostKeyChecking=yes", "BatchMode=yes", "ConnectTimeout=10"]) assert.ok(args.includes(option));
    assert.equal(args.at(-1), "sh -s -- '/srv/inbox' '/srv/releases' '/srv/candidates' '/srv/private/base.env'");
    assert.equal(options.input, readFileSync("infrastructure/deployment/host-preflight.sh", "utf8"));
    assert.equal(options.env.SSH_PRIVATE_KEY, undefined);
    assert.equal(options.env.SSH_KNOWN_HOSTS, undefined);
    assert.equal(options.env.SSH_HOST, undefined);
    assert.equal(options.env.SSH_CONNECTION, undefined);
    assert.equal(options.timeout, 60000);
    assert.ok(args.includes("GlobalKnownHostsFile=/dev/null"));
    assert.equal(args[args.indexOf("-F") + 1], "/dev/null");
    return { status: 0, stdout: JSON.stringify({ ...ready, unwanted: env.SSH_PRIVATE_KEY }) };
  });
  assert.deepEqual(actual, ready);
  assert.equal(existsSync(dirname(keyPath)), false);
});

test("invalid connection inputs are rejected before files or SSH exist", () => {
  const root = mkdtempSync(join(tmpdir(), "starward-diagnostic-test-"));
  try {
    for (const patch of [
      { SSH_HOST: "-oProxyCommand=bad" }, { SSH_USER: "operator;echo bad" },
      { SSH_PORT: "0" }, { SSH_PORT: "65536" }, { SSH_PRIVATE_KEY: "" },
      { SSH_KNOWN_HOSTS: "" }, { REMOTE_INBOX: "/srv/'$(bad)'" },
      { REMOTE_INBOX: "/srv/../private" }, { REMOTE_BASE_DEPLOY_ENV: "relative" },
    ]) assert.deepEqual(diagnoseHost(protectedEnv({ ...env, ...patch }), () => assert.fail("must not invoke SSH"), root), { status: "failed", code: "diagnostic_configuration_invalid" });
    for (const SSH_CONNECTION of [undefined, "bad JSON", "null", "[]", "{}"])
      assert.deepEqual(diagnoseHost({ ...protectedEnv(), SSH_CONNECTION }, () => assert.fail("must not invoke SSH"), root), { status: "failed", code: "diagnostic_configuration_invalid" });
    assert.deepEqual(readdirSync(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("failure reports never expose SSH errors, remote paths, credentials or unsolicited stdout", () => {
  for (const [result, code] of [
    [{ status: 65, stderr: `host_preflight_directory_invalid:${env.REMOTE_INBOX}`, stdout: env.SSH_PRIVATE_KEY }, "host_preflight_directory_invalid"],
    [{ status: 65, stderr: "host_preflight_memory_below_3584_mib" }, "host_preflight_memory_below_3584_mib"],
    [{ status: 65, stderr: "host_preflight_disk_below_10_gib" }, "host_preflight_disk_below_10_gib"],
    [{ status: 255, stderr: `${env.SSH_USER}@${env.SSH_HOST}: ${env.SSH_PRIVATE_KEY}` }, "diagnostic_ssh_failed"],
    [{ status: 65, stderr: "host_preflight_invented:private" }, "diagnostic_ssh_failed"],
    [{ status: null, error: new Error(env.SSH_PRIVATE_KEY) }, "diagnostic_transport_interrupted"],
    [{ status: 0, stdout: env.SSH_PRIVATE_KEY }, "diagnostic_execution_failed"],
    [{ status: 0, stdout: JSON.stringify({ ...ready, docker: env.SSH_PRIVATE_KEY }) }, "diagnostic_response_invalid"],
    [{ status: 0, stdout: JSON.stringify({ ...ready, cpu: env.SSH_PRIVATE_KEY }) }, "diagnostic_response_invalid"],
  ]) {
    let directory;
    const report = diagnoseHost(protectedEnv(), (_command, args) => { directory = dirname(args[1]); return result; });
    assert.deepEqual(report, { status: "failed", code });
    assert.equal(existsSync(directory), false);
  }
  let directory;
  assert.deepEqual(diagnoseHost(protectedEnv(), (_command, args) => {
    directory = dirname(args[1]); throw new Error(env.SSH_PRIVATE_KEY);
  }), { status: "failed", code: "diagnostic_execution_failed" });
  assert.equal(existsSync(directory), false);
});
