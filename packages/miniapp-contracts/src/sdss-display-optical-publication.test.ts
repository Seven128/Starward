import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSyntheticSdssDisplayPublication } from "../../../workers/miniapp-api/src/test-fixtures/sdss-display-publication.ts";
import { assertSdssScienceOpticalPublication } from "./sdss-science-optical-publication.ts";
import { assertPreparedOpticalPublication } from "./prepared-optical-publication.ts";
import { OPTICAL_IMAGE_LEVELS } from "./optical-publication-content.ts";
import { assertSdssDisplayOpticalPublication, assertSdssDisplayOpticalManifest,
  sdssDisplayOpticalPublicationHash, type SdssDisplayOpticalPublication,
  type SdssDisplayOpticalManifest } from "./sdss-display-optical-publication.ts";

function fixture(): SdssDisplayOpticalPublication {
  const prefix = resolve(tmpdir()), path = mkdtempSync(join(prefix, "starward-display-contract-"));
  assert.equal(resolve(path).startsWith(prefix + (process.platform === "win32" ? "\\" : "/")), true);
  try { return JSON.parse(JSON.stringify(createSyntheticSdssDisplayPublication(path).value)); }
  finally { rmSync(path, { recursive: true, force: true }); }
}

function envelope(p: SdssDisplayOpticalPublication): SdssDisplayOpticalManifest {
  const publicationHash = sdssDisplayOpticalPublicationHash(p);
  return { ...p, publicationHash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level, { ...p.levels[level],
    downloadUrl: `/v2/sky/sdss-optical/${publicationHash}/${p.levels[level].file}` }])) } as SdssDisplayOpticalManifest;
}

test("display estimates retain original science identity and a distinct bound output/receipt policy", () => {
  const p = fixture(), manifest = envelope(p);
  assertSdssDisplayOpticalManifest(manifest, "M:51", manifest.publicationHash);
  assert.throws(() => assertSdssScienceOpticalPublication(p, "M:51"));
  assert.throws(() => assertPreparedOpticalPublication(p, "M:51"));
  for (const change of [
    (p: any) => { p.display.executionReceipt.sha256 = "3".repeat(64); },
    (p: any) => { p.display.implementation["sdss_noise_display_provenance.py"].sha256 = "4".repeat(64); },
    (p: any) => { p.master.sourceFrames[0].admissionReceipt.sha256 = "5".repeat(64); },
    (p: any) => { p.processing.modification += " changed source meaning"; },
  ]) {
    const changed = structuredClone(p); change(changed);
    assertSdssDisplayOpticalPublication(changed, "M:51");
    assert.notEqual(sdssDisplayOpticalPublicationHash(changed), manifest.publicationHash);
    assert.throws(() => assertSdssDisplayOpticalPublication(changed, "M:51", manifest.publicationHash));
  }
});

test("fresh hashes cannot disguise science means, dropped covariance/source, fitting, coverage or adoption", () => {
  const p = fixture();
  const cases: Array<(p: any) => void> = [
    p => { p.imageVersion = "science-optical-v3"; }, p => { p.schemaVersion = "sdss-dr17-science-optical-publication-v3"; },
    p => { p.display.estimateRole = "NEW_MEASUREMENTS"; }, p => { p.display.noiseModel = p.display.previousNoiseModel; },
    p => { delete p.display.executionReceipt; }, p => { delete p.display.implementation["sdss_noise_display_provenance.py"]; },
    p => { p.display.policy.variance = "independent-target-pixel-variance"; }, p => { p.display.policy.supply = "same-run"; },
    p => { p.display.policy.unknown = "filled"; }, p => { p.display.policy.realSourceHaloPixels = 0; },
    p => { p.display.counts.changedEstimatePixels = 101; }, p => { p.display.counts.radiusCounts["0"]++; },
    p => { p.display.qualityAdopted = true; }, p => { p.display.sourceScienceCorrection = "second-sky-subtraction"; },
    p => { p.pyramid.statisticalFitCalls = 1; }, p => { p.pyramid.rgbMasterRole = "LEVEL_PARENT"; },
    p => { p.levels.MEDIUM.masterDisplayEstimatesSha256.g = "7".repeat(64); },
    p => { p.levels.DETAIL.scienceMean = p.levels.DETAIL.displayEstimateMean; },
    p => { p.levels.OVERVIEW.displayEstimateMean.unit = "mean source nanomaggies/native-pixel"; },
    p => { p.levels.OVERVIEW.displayEstimateMean.availableMasterSamples--; },
    p => { p.levels.DETAIL.displayEstimateMean.partialPixels = 1; },
    p => { p.master.sourceFrames[0].identity.band = "r"; },
    p => { p.source.license = "UNKNOWN"; }, p => { p.master.transfer.recipe.stretch = 999; },
    p => { p.levels.MEDIUM.masterCrop.boundsXYExclusive[0]++; },
  ];
  for (const change of cases) {
    const changed = structuredClone(p);change(changed);
    assert.throws(() => assertSdssDisplayOpticalPublication(changed, "M:51", sdssDisplayOpticalPublicationHash(changed)));
  }
  const changed: any = envelope(p);changed.levels.DETAIL.downloadUrl = "/unbound";
  assert.throws(() => assertSdssDisplayOpticalManifest(changed, "M:51", changed.publicationHash));
});
