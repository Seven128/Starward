import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createPromotionRequest, runPromotionRequest } from "./promotion-request.mjs";
import {
  createReleaseEnvironmentFixture,
  releaseImageDigest,
  releaseRevision,
} from "./test-support.mjs";

async function withFixture(assertion) {
  const fixture = await createReleaseEnvironmentFixture();
  try {
    await assertion(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function requestInput(fixture, overrides = {}) {
  return {
    outputPath: path.join(fixture.root, "request.json"),
    baseDeployEnvPath: fixture.baseDeployPath,
    candidateOutputPath: path.join(fixture.root, "candidate", "deploy.env"),
    imageReference: `registry.example/starward@${releaseImageDigest}`,
    revision: releaseRevision,
    releasedAt: "2026-08-26T10:00:00.000Z",
    operator: "ci:staging",
    stagingReceiptPath: null,
    confirmProductionDigest: null,
    ...overrides,
  };
}

test("promotion requests are exact, non-secret and idempotent", async () => {
  await withFixture(async (fixture) => {
    const selected = requestInput(fixture);
    const created = await createPromotionRequest(selected);
    const reused = await createPromotionRequest(selected);
    assert.equal(created.disposition, "created");
    assert.equal(reused.disposition, "reused");
    const text = await readFile(created.outputPath, "utf8");
    assert.doesNotMatch(text, /password|secret|private.key/iu);
  });
});

test("request runner passes only the closed request fields to promotion", async () => {
  await withFixture(async (fixture) => {
    const created = await createPromotionRequest(requestInput(fixture));
    let received = null;
    const result = await runPromotionRequest({
      requestPath: created.outputPath,
      async promote(input) {
        received = input;
        return { status: "succeeded", receiptPath: path.join(fixture.root, "receipt.json") };
      },
    });
    assert.equal(result.status, "succeeded");
    assert.equal(received.revision, releaseRevision);
    assert.equal(received.imageReference, `registry.example/starward@${releaseImageDigest}`);
    assert.equal(Object.keys(received).length, 8);
  });
});

test("unknown request fields fail closed before promotion", async () => {
  await withFixture(async (fixture) => {
    const selected = requestInput(fixture);
    const created = await createPromotionRequest(selected);
    const request = JSON.parse(await readFile(created.outputPath, "utf8"));
    request.untrustedCommand = "skip-backup";
    await writeFile(created.outputPath, `${JSON.stringify(request)}\n`);
    let called = false;
    await assert.rejects(
      () => runPromotionRequest({ requestPath: created.outputPath, promote: async () => { called = true; } }),
      /release_request_fields_invalid/u,
    );
    assert.equal(called, false);
  });
});

test("operator preview failure exposes only receipt-owned diagnostic identifiers", async () => {
  await withFixture(async (fixture) => {
    const created = await createPromotionRequest({
      ...requestInput(fixture),
      lane: "operator-preview",
    });
    await assert.rejects(
      () =>
        runPromotionRequest({
          requestPath: created.outputPath,
          preview: async () => ({
            receipt: {
              status: "failed",
              failedStep: "guarded-ip-readiness",
              errorCode: "operator_preview_qweather_evidence_missing",
            },
          }),
        }),
      /operator_preview_deployment_failed:guarded-ip-readiness:operator_preview_qweather_evidence_missing/u,
    );
  });
});

test("operator preview failure redacts non-identifier receipt diagnostics", async () => {
  await withFixture(async (fixture) => {
    const created = await createPromotionRequest({
      ...requestInput(fixture),
      lane: "operator-preview",
    });
    await assert.rejects(
      () =>
        runPromotionRequest({
          requestPath: created.outputPath,
          preview: async () => ({
            receipt: {
              status: "failed",
              failedStep: "token=do-not-emit",
              errorCode: "credential=do-not-emit",
            },
          }),
        }),
      (error) => {
        assert.equal(
          error.message,
          "operator_preview_deployment_failed:unknown-step:operator_preview_unexpected_failure",
        );
        assert.doesNotMatch(error.message, /do-not-emit/u);
        return true;
      },
    );
  });
});
