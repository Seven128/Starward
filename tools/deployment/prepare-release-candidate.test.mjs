import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { prepareReleaseCandidate } from "./prepare-release-candidate.mjs";
import {
  createReleaseEnvironmentFixture,
  releaseImageDigest,
  releaseRevision,
} from "./test-support.mjs";
import { validateReleaseEnvironment } from "./validate-release-environment.mjs";

async function withFixture(assertion) {
  const fixture = await createReleaseEnvironmentFixture();
  try {
    await assertion(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function input(fixture, overrides = {}) {
  return {
    baseDeployEnvPath: fixture.baseDeployPath,
    outputPath: path.join(fixture.root, "candidate", "deploy.env"),
    imageReference: `registry.example/starward@${releaseImageDigest}`,
    revision: releaseRevision,
    releasedAt: "2026-08-26T10:00:00.000Z",
    ...overrides,
  };
}

test("one immutable candidate descriptor validates and can be retried idempotently", async () => {
  await withFixture(async (fixture) => {
    const selected = input(fixture);
    const created = await prepareReleaseCandidate(selected);
    const reused = await prepareReleaseCandidate(selected);
    assert.equal(created.disposition, "created");
    assert.equal(reused.disposition, "reused");
    assert.equal(created.imageDigest, releaseImageDigest);
    const validation = await validateReleaseEnvironment({ deployEnvPath: created.outputPath });
    assert.equal(validation.revision, releaseRevision);
    assert.equal(validation.imageDigest, releaseImageDigest);
    assert.equal(validation.releasedAt, selected.releasedAt);
  });
});

test("a stable base descriptor cannot smuggle candidate identity", async () => {
  await withFixture(async (fixture) => {
    await writeFile(fixture.baseDeployPath, `${await readFile(fixture.baseDeployPath, "utf8")}STARWARD_RELEASE_REVISION=${releaseRevision}\n`);
    await assert.rejects(
      () => prepareReleaseCandidate(input(fixture)),
      /release_candidate_base_identity_forbidden:STARWARD_RELEASE_REVISION/u,
    );
  });
});

test("a different candidate cannot overwrite an existing descriptor", async () => {
  await withFixture(async (fixture) => {
    const selected = input(fixture);
    await prepareReleaseCandidate(selected);
    await assert.rejects(
      () => prepareReleaseCandidate({ ...selected, revision: "c".repeat(40) }),
      /release_candidate_output_exists:outputPath/u,
    );
  });
});

test("mutable tags and mismatched digest text are never accepted as candidates", async () => {
  await withFixture(async (fixture) => {
    await assert.rejects(
      () => prepareReleaseCandidate(input(fixture, { imageReference: "registry.example/starward:latest" })),
      /release_environment_mutable_image:STARWARD_IMAGE_REF/u,
    );
  });
});
