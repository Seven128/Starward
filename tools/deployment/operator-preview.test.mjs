import assert from "node:assert/strict";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createReleaseEnvironmentFixture, releaseRevision, releaseImageDigest } from "./test-support.mjs";
import { validateOperatorPreviewEnvironment, validateReleaseEnvironment } from "./validate-release-environment.mjs";
import { validateStagingQualification } from "./promote-release-candidate.mjs";
import { operatePreview } from "./operator-preview.mjs";
import { checkPreviewCompose, checkPreviewReadiness } from "./operator-preview-checks.mjs";
import { readEnvironmentFile } from "./env-file.mjs";
import { composeInvocation } from "./compose-runtime.mjs";
import { createPromotionRequest } from "./promotion-request.mjs";

const token = "p".repeat(43);
async function fixture(t, overrides = {}) {
  const result = await createReleaseEnvironmentFixture({
    api: { MINIAPP_AUTH_MODE: "LOCAL_TEST", MINIAPP_ACCEPTANCE_MODE: "1", MINIAPP_CORS_ORIGINS: "https://192.0.2.8" },
    deploy: { STARWARD_API_DOMAIN: "192.0.2.8", STARWARD_OPERATOR_PREVIEW_TOKEN: token },
    ...overrides,
  });
  await chmod(path.join(result.root, "backup.key"), 0o600);
  t.after(() => rm(result.root, { recursive: true, force: true }));
  return result;
}

function configuration(deploy) {
  const identity = Object.fromEntries(["STARWARD_ENVIRONMENT", "STARWARD_RELEASE_REVISION", "STARWARD_IMAGE_DIGEST", "STARWARD_RELEASED_AT"].map((key) => [key, deploy[key]]));
  return {
    name: "starward-staging",
    services: {
      ...Object.fromEntries(["api", "worker", "migrate"].map((name) => [name, { image: deploy.STARWARD_IMAGE_REF, environment: identity }])),
      caddy: {
        ports: [{ published: "443", target: 443, protocol: "tcp" }],
        environment: { STARWARD_OPERATOR_PREVIEW_TOKEN: token, STARWARD_API_DOMAIN: "192.0.2.8" },
        volumes: [{ source: "/release/Caddyfile.operator-preview", target: "/etc/caddy/Caddyfile", read_only: true }],
      },
      postgres: { volumes: [{ type: "volume", source: "postgres-data", target: "/var/lib/postgresql/data" }] },
      redis: { volumes: [{ type: "volume", source: "redis-data", target: "/data" }] },
    },
    volumes: Object.fromEntries(["postgres-data", "redis-data"].map((name) => [name, { name: `starward-staging_${name}` }])),
  };
}
const rows = ["api", "worker", "caddy", "postgres", "redis"].map((Service) => ({
  Service, State: "running", Health: "healthy",
  Publishers: Service === "caddy" ? [{ PublishedPort: 443, TargetPort: 443, Protocol: "tcp" }] : [],
}));

async function dependencies(t) {
  const f = await fixture(t);
  const deploy = await readEnvironmentFile(f.deployPath);
  const calls = [];
  const execute = ({ step, args }) => {
    calls.push({ step, args });
    let value = "";
    if (step === "preview-compose-config") value = JSON.stringify(configuration(deploy));
    if (step === "preview-container-state") value = JSON.stringify(rows);
    if (step === "preview-image-revision") value = releaseRevision;
    return { stdout: Buffer.from(value), stderr: Buffer.alloc(0) };
  };
  const backup = async () => { calls.push({ step: "backup" }); return { manifestPath: "/private/backup.json" }; };
  const readiness = async () => { calls.push({ step: "readiness" }); return { ready: true }; };
  return { f, deploy, calls, execute, backup, readiness };
}

test("IP local-test validation is separate from formal release validation", async (t) => {
  const f = await fixture(t);
  assert.equal((await validateOperatorPreviewEnvironment({ deployEnvPath: f.deployPath })).schemaVersion, "starward-operator-preview-validation-v1");
  await assert.rejects(validateReleaseEnvironment({ deployEnvPath: f.deployPath }), /release_preview_token_forbidden/u);
  const production = await fixture(t, { environment: "production" });
  await assert.rejects(validateOperatorPreviewEnvironment({ deployEnvPath: production.deployPath }), /staging_required/u);
});

test("preview retains fixture, session, provider and database protections", async (t) => {
  for (const [key, value] of [["MINIAPP_DEVELOPMENT_FIXTURE_MODE", "1"], ["MINIAPP_SESSION_SECRET", "short"], ["MINIAPP_WEATHER_PROVIDER", "SAMPLE_DATA"], ["MINIAPP_STORAGE_MODE", "MEMORY"]]) {
    const f = await fixture(t, { api: { MINIAPP_AUTH_MODE: "LOCAL_TEST", MINIAPP_ACCEPTANCE_MODE: "1", MINIAPP_CORS_ORIGINS: "https://192.0.2.8", [key]: value } });
    await assert.rejects(validateOperatorPreviewEnvironment({ deployEnvPath: f.deployPath }));
  }
});

test("preview preserves API runtime HTTPS-only CORS including loopback rejection", async (t) => {
  for (const origin of ["http://127.0.0.1:8787", "http://localhost:8787", "http://192.0.2.8", "https://other.invalid"]) {
    const bad = await fixture(t, { api: { MINIAPP_AUTH_MODE: "LOCAL_TEST", MINIAPP_ACCEPTANCE_MODE: "1", MINIAPP_CORS_ORIGINS: `https://192.0.2.8,${origin}` } });
    await assert.rejects(validateOperatorPreviewEnvironment({ deployEnvPath: bad.deployPath }), /CORS_ORIGINS/u);
  }
});

test("both Compose files are required and unsafe ports or different volumes fail", async (t) => {
  const { f, deploy } = await dependencies(t);
  const validation = await validateOperatorPreviewEnvironment({ deployEnvPath: f.deployPath });
  const config = configuration(deploy);
  checkPreviewCompose(config, validation, deploy);
  config.services.api.ports = [{ published: "8787", target: 8787 }];
  assert.throws(() => checkPreviewCompose(config, validation, deploy), /port_exposure/u);
  delete config.services.api.ports;
  config.volumes["postgres-data"].name = "other_database";
  assert.throws(() => checkPreviewCompose(config, validation, deploy), /data_volume_mismatch/u);
  const invocation = composeInvocation({ composePath: path.resolve("base.yml"), overlayPaths: [path.resolve("preview.yml")], deployEnvPath: f.deployPath, args: ["ps"] });
  assert.equal(invocation.args.filter((arg) => arg === "-f").length, 2);
});

test("deploy serially pulls, drains, backs up, migrates and checks without touching data services", async (t) => {
  const d = await dependencies(t);
  const result = await operatePreview({ ...d, deployEnvPath: d.f.deployPath, operation: "deploy", operator: "test" });
  assert.equal(result.receipt.status, "succeeded");
  assert.equal(result.receipt.productionQualified, false);
  const steps = d.calls.map((call) => call.step);
  assert.ok(steps.indexOf("preview-image-pull") < steps.indexOf("preview-stop-writers"));
  assert.ok(steps.indexOf("preview-stop-writers") < steps.indexOf("backup"));
  assert.ok(steps.indexOf("backup") < steps.indexOf("preview-migration"));
  assert.ok(steps.indexOf("preview-start-writers") < steps.indexOf("preview-start-edge"));
  for (const call of d.calls.filter((call) => call.args?.includes("up"))) {
    assert.ok(call.args.includes("--no-deps"));
    assert.ok(!call.args.includes("postgres") && !call.args.includes("redis"));
  }
  assert.ok(!JSON.stringify(result).includes(token));
  await assert.rejects(validateStagingQualification({ receiptPath: result.receiptPath, revision: releaseRevision, imageDigest: releaseImageDigest }), /staging_receipt_invalid/u);
  const pointer = JSON.parse(await readFile(path.join(d.f.receiptDirectory, "operator-preview-current.json"), "utf8"));
  assert.equal(pointer.receiptPath, result.receiptPath);
});

test("pull failure leaves writers alone; backup failure stops and never migrates", async (t) => {
  for (const failedStep of ["preview-image-pull", "backup"]) {
    const d = await dependencies(t);
    const result = await operatePreview({ ...d, deployEnvPath: d.f.deployPath, operation: "deploy", operator: "test",
      execute: (call) => { if (call.step === failedStep) throw new Error("deployment_failed"); return d.execute(call); },
      backup: async () => { if (failedStep === "backup") throw new Error("credential=" + token); return d.backup(); },
    });
    assert.equal(result.receipt.status, "failed");
    assert.ok(!d.calls.some((call) => call.step === "preview-migration"));
    assert.equal(result.receipt.writersStopped, failedStep === "backup");
    assert.ok(!JSON.stringify(result).includes(token));
    await assert.rejects(readFile(path.join(d.f.receiptDirectory, "operator-preview-current.json")));
  }
});

test("existing lock rejects all runtime calls", async (t) => {
  const d = await dependencies(t);
  await mkdir(d.f.receiptDirectory);
  await writeFile(path.join(d.f.receiptDirectory, "operator-preview.lock"), "occupied");
  await assert.rejects(operatePreview({ ...d, deployEnvPath: d.f.deployPath, operation: "deploy", operator: "test" }), /locked/u);
  assert.equal(d.calls.length, 0);
});

test("pointer publication failure is explicit and keeps the completed receipt", async (t) => {
  const d = await dependencies(t);
  await mkdir(path.join(d.f.receiptDirectory, "operator-preview-current.json"), { recursive: true });
  const result = await operatePreview({ ...d, deployEnvPath: d.f.deployPath, operation: "deploy", operator: "test" });
  assert.equal(result.receipt.status, "failed");
  assert.equal(result.receipt.failedStep, "publish-current-pointer");
  assert.equal(result.receipt.writersStopped, false);
  assert.equal(JSON.parse(await readFile(result.receiptPath, "utf8")).status, "failed");
  await assert.rejects(readFile(path.join(d.f.receiptDirectory, "operator-preview.lock")));
});

test("readiness checks denial and exact release using only the private CA", async () => {
  const calls = [];
  const input = { run: () => ({ stdout: Buffer.from("local-ca") }), validation: { domain: "192.0.2.8", revision: releaseRevision, imageDigest: releaseImageDigest }, deploy: { STARWARD_OPERATOR_PREVIEW_TOKEN: token } };
  const request = async (args) => {
    calls.push(args);
    return args.token ? { status: 200, body: JSON.stringify({ ready: true, release: { environment: "staging", revision: releaseRevision, imageDigest: releaseImageDigest } }) } : { status: 404 };
  };
  const result = await checkPreviewReadiness({ ...input, request });
  assert.equal(result.publicTrustVerified, false);
  assert.equal(calls[0].token, undefined);
  assert.equal(calls[1].ca.toString(), "local-ca");
  await assert.rejects(checkPreviewReadiness({ ...input, request: async () => ({ status: 200 }) }), /not_denied/u);
  await assert.rejects(checkPreviewReadiness({ ...input, request: async (args) => args.token ? { status: 200, body: '{"ready":true}' } : { status: 404 } }), /identity_mismatch/u);
});

test("preview request is typed and cannot carry production qualification", async (t) => {
  const f = await fixture(t);
  const input = { outputPath: path.join(f.root, "request.json"), lane: "operator-preview", baseDeployEnvPath: f.baseDeployPath, candidateOutputPath: path.join(f.root, "candidate.env"), imageReference: `registry.example/starward@${releaseImageDigest}`, revision: releaseRevision, releasedAt: new Date().toISOString(), operator: "test", stagingReceiptPath: null, confirmProductionDigest: null };
  assert.equal((await createPromotionRequest(input)).request.schemaVersion, "starward-operator-preview-request-v1");
  await assert.rejects(createPromotionRequest({ ...input, confirmProductionDigest: releaseImageDigest }), /qualification_forbidden/u);
});
