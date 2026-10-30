import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CLOUD_NATIVE_STEPS, CLOUD_SAMPLING_POLICY } from "@starward/miniapp-contracts";

const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

/** Small explicit synthetic publication, never a product/provider fallback. */
export async function createCloudPublicationFixture(options: { runAt?: string } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-cloud-publication-"));
  const runAt = options.runAt ?? "2026-10-27T00:00:00Z";
  const atStep = (hours: number) => new Date(Date.parse(runAt) + hours * 3_600_000).toISOString().replace(".000Z", "Z");
  const grid = { crs: "WGS84", layout: "row-major-north-to-south", registration: "grid-point-centres", width: 2, height: 2,
    west: 113, north: 23, longitudeStep: 0.1, latitudeStep: -0.1, unit: "fraction", valueType: "float32-le", maskType: "uint8", validMaskValue: 1 };
  const frames = [];
  for (const stepHours of CLOUD_NATIVE_STEPS.filter(step => step <= 264)) {
    const bytes = Buffer.alloc(16), value = stepHours === 0 ? 0 : stepHours === 3 ? 1 : 0.5;
    for (let i = 0; i < 4; i++) bytes.writeFloatLE(value, i * 4);
    const mask = Buffer.from([1, 1, 1, 1]), identity = hash(bytes), file = `tcc-${identity}`;
    await writeFile(path.join(directory, `${file}.f32`), bytes);
    await writeFile(path.join(directory, `${file}.mask`), mask);
    frames.push({ stepHours, validAt: atStep(stepHours),
      values: { file: `${file}.f32`, bytes: 16, sha256: hash(bytes) }, mask: { file: `${file}.mask`, bytes: 4, sha256: hash(mask) },
      source: { sha256: hash(`synthetic-native-${runAt}-${stepHours}`), bytes: 32, retrievedAt: atStep(18),
        metadata: { centre: "ecmf", class: "od", stream: "oper", dataType: "fc", edition: 2, typeOfGeneratingProcess: 2,
          shortName: "tcc", paramId: 164, units: "(0 - 1)", step: stepHours } }, validSamples: 4, missingSamples: 0 });
  }
  const contentSha256 = hash(`synthetic-numeric-test-only-${runAt}`), manifest = {
    schemaVersion: "starward-ecmwf-tcc-batch-v1", methodVersion: "ifs-0p1-tcc-native-f32-mask-v1", processorSha256: hash("test-publisher"),
    publicationId: `ecmwf-tcc:${contentSha256}`, contentSha256, runAt, grid, frames, samplingPolicy: CLOUD_SAMPLING_POLICY,
    coverage: { validFrom: runAt, validTo: atStep(264), qualifiedAt: atStep(18), requestedHorizonHours: 240,
      supports240HoursUntil: atStep(24), endpointInclusive: true },
    source: { provider: "ECMWF", model: "IFS", stream: "oper", type: "fc", parameter: "tcc", resolutionDegrees: 0.1,
      license: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", url: "https://www.ecmwf.int/en/forecasts/datasets/open-data",
      attribution: "ECMWF (synthetic test only)", modifications: ["test fixture"] } };
  const encoded = JSON.stringify(manifest);
  await writeFile(path.join(directory, "manifest.json"), encoded);
  return { directory, manifest, manifestSha256: hash(encoded), async dispose() {
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert(path.basename(target).startsWith("starward-cloud-publication-"));
    await rm(target, { recursive: true, force: true });
  } };
}
