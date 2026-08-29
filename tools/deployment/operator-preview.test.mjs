import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { releaseRevision, releaseImageDigest } from "./test-support.mjs";
import { validateOperatorPreviewEnvironment, validateReleaseEnvironment } from "./validate-release-environment.mjs";
import { validateStagingQualification } from "./promote-release-candidate.mjs";
import { operatePreview } from "./operator-preview.mjs";
import { checkPreviewCompose, checkPreviewReadiness } from "./operator-preview-checks.mjs";
import { readEnvironmentFile } from "./env-file.mjs";
import { composeInvocation } from "./compose-runtime.mjs";
import { createPromotionRequest } from "./promotion-request.mjs";

import { token, fixture, configuration, rows, dependencies } from "./operator-preview-test-support.mjs";
import { certificateLifetime, publicIpTlsOptions, waitForPublicIpCertificate } from "./operator-preview-tls.mjs";

test("public IP certificate checks preserve trust, IP identity and renewal headroom", () => {
  const options = publicIpTlsOptions("192.0.2.8");
  assert.equal(options.rejectUnauthorized, true);
  assert.equal(options.servername, "");
  assert.ok(options.ca.length > 1);
  assert.ok(options.checkServerIdentity("ignored", { subjectaltname: "IP Address:192.0.2.9" }));
  assert.equal(options.checkServerIdentity("ignored", { subjectaltname: "IP Address:192.0.2.8" }), undefined);
  const now = Date.parse("2026-08-29T00:00:00Z");
  const valid = { valid_from: "2026-08-28T00:00:00Z", valid_to: "2026-09-03T00:00:00Z" };
  assert.equal(certificateLifetime(valid, now).expiresAt, "2026-09-03T00:00:00.000Z");
  for (const certificate of [{}, { ...valid, valid_to: "2026-08-29T23:00:00Z" }, { ...valid, valid_from: "2026-08-30T00:00:00Z" }])
    assert.throws(() => certificateLifetime(certificate, now), /invalid_or_expiring/u);
});

test("certificate acquisition has bounded retry and never accepts an expiring certificate", async () => {
  let time = 0;
  let attempts = 0;
  const options = { ip: "192.0.2.8", now: () => time, sleep: async (ms) => { time += ms; }, timeoutMs: 4_000 };
  assert.equal(await waitForPublicIpCertificate({ ...options, probe: async () => {
    if (++attempts < 2) throw new Error("operator_preview_public_certificate_unavailable");
    return "verified";
  } }), "verified");
  await assert.rejects(waitForPublicIpCertificate({ ...options, probe: async () => { throw new Error("operator_preview_public_certificate_unavailable"); } }), /unavailable/u);
  const before = time;
  await assert.rejects(waitForPublicIpCertificate({ ...options, probe: async () => { throw new Error("operator_preview_certificate_invalid_or_expiring"); } }), /expiring/u);
  assert.equal(time, before);
});

test("certificate failure cannot publish a ready pointer or downgrade trust", async (t) => {
  const d = await dependencies(t);
  const result = await operatePreview({ ...d, deployEnvPath: d.f.deployPath, operation: "deploy", operator: "test",
    certificate: async () => { throw new Error("operator_preview_certificate_invalid_or_expiring"); },
  });
  assert.equal(result.receipt.status, "failed");
  assert.equal(result.receipt.failedStep, "public-ip-certificate");
  assert.ok(d.calls.some((call) => call.step === "preview-failure-stop"));
  assert.ok(!d.calls.some((call) => call.step === "readiness"));
  await assert.rejects(readFile(path.join(d.f.receiptDirectory, "operator-preview-current.json")));
});

test("IP local-test validation is separate from formal release validation", async (t) => {
  const f = await fixture(t);
  assert.equal((await validateOperatorPreviewEnvironment({ deployEnvPath: f.deployPath })).schemaVersion, "starward-operator-preview-validation-v1");
  await assert.rejects(validateReleaseEnvironment({ deployEnvPath: f.deployPath }), /release_preview_token_forbidden/u);
  const production = await fixture(t, { environment: "production" });
  await assert.rejects(validateOperatorPreviewEnvironment({ deployEnvPath: production.deployPath }), /staging_required/u);
});

test("backup maintenance shares the preview lock and prunes before backup health failures", async (t) => {
  const d = await dependencies(t);
  const result = await operatePreview({ ...d, deployEnvPath: d.f.deployPath, operation: "maintain-backups", operator: "test",
    maintenance: async ({ apply }) => { assert.equal(apply, true); d.calls.push({ step: "prune" }); return { removed: 1, backupDue: true }; },
    execute: (call) => {
      if (call.step === "preview-container-state") throw new Error("database_unavailable");
      return d.execute(call);
    },
  });
  assert.equal(result.receipt.status, "failed");
  assert.equal(result.receipt.retention.removed, 1);
  assert.equal(result.receipt.failedStep, "existing-data-services");
  assert.ok(d.calls.some((call) => call.step === "prune"));
  assert.ok(!d.calls.some((call) => call.step === "backup"));
  await writeFile(path.join(d.f.receiptDirectory, "operator-preview.lock"), "occupied");
  await assert.rejects(operatePreview({ ...d, deployEnvPath: d.f.deployPath, operation: "maintain-backups", operator: "test" }), /locked/u);
});

test("inspection never creates a backup; maintenance skips fresh backups", async (t) => {
  for (const operation of ["inspect-backups", "maintain-backups"]) {
    const d = await dependencies(t);
    const result = await operatePreview({ ...d, deployEnvPath: d.f.deployPath, operation, operator: "test",
      maintenance: async ({ apply }) => { assert.equal(apply, operation === "maintain-backups"); return { backupDue: false }; },
    });
    assert.equal(result.receipt.status, "succeeded");
    assert.ok(!d.calls.some((call) => ["backup", "preview-container-state", "preview-stop-writers"].includes(call.step)));
  }
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

test("readiness checks denial and exact release without a private CA", async () => {
  const calls = [];
  const input = { run: () => ({ stdout: Buffer.from("local-ca") }), validation: { domain: "192.0.2.8", revision: releaseRevision, imageDigest: releaseImageDigest }, deploy: { STARWARD_OPERATOR_PREVIEW_TOKEN: token } };
  const request = async (args) => {
    calls.push(args);
    if (!args.token) return { status: 404 };
    if (args.path === "/v2/observation-contexts/resolve")
      return {
        status: 201,
        body: JSON.stringify({
          data: {
            contextId: "ctx:00000000-0000-4000-8000-000000000001",
            weatherView: { primaryPolicy: "QWEATHER" },
          },
        }),
      };
    if (args.path?.startsWith("/v2/map/scene?"))
      return {
        status: 200,
        body: JSON.stringify({
          dataState: "FRESH",
          data: { spots: [{ spotId: "spot:provider-smoke" }] },
          sources: [
            {
              kind: "THIRD_PARTY_FORECAST",
              provider: "和风天气",
              state: "FRESH",
            },
            {
              kind: "PRODUCT_CALCULATION",
              provider: "Astronomy Engine",
              state: "FRESH",
            },
          ],
        }),
      };
    return { status: 200, body: JSON.stringify({ ready: true, release: { environment: "staging", revision: releaseRevision, imageDigest: releaseImageDigest } }) };
  };
  const result = await checkPreviewReadiness({ ...input, request });
  assert.equal(result.publicTrustVerified, true);
  assert.equal(result.providerSmoke.evidenceScope, "PRODUCT_MAP_SCENE");
  assert.equal(result.providerSmoke.weather.provider, "和风天气");
  assert.equal(result.providerSmoke.astronomy.provider, "Astronomy Engine");
  assert.equal(calls[0].token, undefined);
  assert.ok(calls.every((call) => call.ca === undefined));
  assert.equal(calls[2].method, "POST");
  assert.match(calls[3].path, /^\/v2\/map\/scene\?/u);
  await assert.rejects(checkPreviewReadiness({ ...input, request: async () => ({ status: 200 }) }), /not_denied/u);
  await assert.rejects(checkPreviewReadiness({ ...input, request: async (args) => args.token ? { status: 200, body: '{"ready":true}' } : { status: 404 } }), /identity_mismatch/u);
  await assert.rejects(
    checkPreviewReadiness({
      ...input,
      request: async (args) => {
        const response = await request(args);
        if (args.path?.startsWith("/v2/map/scene?"))
          return {
            ...response,
            body: JSON.stringify({
              dataState: "PARTIAL",
              data: { spots: [{ spotId: "spot:provider-smoke" }] },
              sources: [
                {
                  kind: "THIRD_PARTY_FORECAST",
                  provider: "Open-Meteo",
                  state: "FRESH",
                },
                {
                  kind: "PRODUCT_CALCULATION",
                  provider: "Astronomy Engine",
                  state: "FRESH",
                },
              ],
            }),
          };
        return response;
      },
    }),
    /qweather_evidence_missing/u,
  );
  await assert.rejects(
    checkPreviewReadiness({
      ...input,
      request: async (args) => {
        if (!args.token) return { status: 404 };
        if (args.path === "/v2/observation-contexts/resolve")
          return {
            status: 500,
            body: JSON.stringify({
              code: "PROVIDER_UNAVAILABLE",
              message: "must-not-be-projected",
              requestId: "must-not-be-projected",
            }),
          };
        return request(args);
      },
    }),
    (error) => {
      assert.equal(
        error.message,
        "operator_preview_provider_context_http_500_provider_unavailable",
      );
      assert.doesNotMatch(error.message, /must-not-be-projected/u);
      return true;
    },
  );
});

test("empty formal population uses an isolated, explicit provider simulation", async () => {
  const runtimeCalls = [];
  const run = (call) => {
    runtimeCalls.push(call);
    if (call.step === "preview-local-ca")
      return { stdout: Buffer.from("local-ca") };
    if (call.step === "preview-provider-simulation")
      return {
        stdout: Buffer.from(JSON.stringify({
          status: "passed",
          evidenceScope: "ISOLATED_TEST_SIMULATION",
          productPopulation: "FORMAL_POPULATION_MISSING",
          hourlyCount: 24,
          weather: { provider: "和风天气", state: "FRESH" },
          astronomy: { provider: "Astronomy Engine", state: "FRESH" },
        })),
      };
    throw new Error("unexpected_runtime_call");
  };
  const request = async (args) => {
    if (!args.token) return { status: 404 };
    if (args.path === "/v2/observation-contexts/resolve")
      return {
        status: 201,
        body: JSON.stringify({
          data: {
            contextId: "ctx:00000000-0000-4000-8000-000000000001",
            weatherView: { primaryPolicy: "QWEATHER" },
          },
        }),
      };
    if (args.path?.startsWith("/v2/map/scene?"))
      return {
        status: 200,
        body: JSON.stringify({
          dataState: "PARTIAL",
          data: { spots: [] },
          sources: [],
        }),
      };
    return {
      status: 200,
      body: JSON.stringify({
        ready: true,
        release: {
          environment: "staging",
          revision: releaseRevision,
          imageDigest: releaseImageDigest,
        },
      }),
    };
  };
  const result = await checkPreviewReadiness({
    run,
    validation: {
      domain: "192.0.2.8",
      revision: releaseRevision,
      imageDigest: releaseImageDigest,
    },
    deploy: { STARWARD_OPERATOR_PREVIEW_TOKEN: token },
    request,
  });
  assert.equal(result.providerSmoke.evidenceScope, "ISOLATED_TEST_SIMULATION");
  assert.equal(result.providerSmoke.productPopulation, "FORMAL_POPULATION_MISSING");
  assert.equal(result.providerSmoke.fixtureEvidence, true);
  const simulation = runtimeCalls.find(
    (call) => call.step === "preview-provider-simulation",
  );
  assert.ok(simulation.args.includes("--input-type=module"));
  assert.match(simulation.input.toString("utf8"), /TEST_PUBLISHED_SPOT/u);
  assert.doesNotMatch(simulation.input.toString("utf8"), /DATABASE_URL|INSERT INTO/iu);
});

test("preview request is typed and cannot carry production qualification", async (t) => {
  const f = await fixture(t);
  const input = { outputPath: path.join(f.root, "request.json"), lane: "operator-preview", baseDeployEnvPath: f.baseDeployPath, candidateOutputPath: path.join(f.root, "candidate.env"), imageReference: `registry.example/starward@${releaseImageDigest}`, revision: releaseRevision, releasedAt: new Date().toISOString(), operator: "test", stagingReceiptPath: null, confirmProductionDigest: null };
  assert.equal((await createPromotionRequest(input)).request.schemaVersion, "starward-operator-preview-request-v1");
  await assert.rejects(createPromotionRequest({ ...input, confirmProductionDigest: releaseImageDigest }), /qualification_forbidden/u);
});
