import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { SDSS_OPTICAL_LEVELS, SDSS_OPTICAL_PUBLICATIONS, assertSdssOpticalPublication,
  sdssOpticalPublicationHash, type SdssOpticalReference, type SdssOpticalPublishedAsset } from "./sdss-optical-publication.ts";
import { assertSdssScienceOpticalManifest, assertSdssScienceOpticalPublication,
  sdssScienceOpticalPublicationHash, type SdssScienceOpticalPublication, type SdssEncodedScienceOpticalPublication,
  type SdssScienceMeanOpticalPublication, type SdssScienceOpticalManifest } from "./sdss-science-optical-publication.ts";

const hash = "1".repeat(64), content = { bytes: 128, sha256: hash };
/** Structural fixture only. Actual science/RGB/alpha reproduction is verified
 * at the offline writer with complete cached arrays and encoded images. */
function fixture(): SdssEncodedScienceOpticalPublication {
  const old = JSON.parse(readFileSync(new URL("../../../workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json", import.meta.url), "utf8"));
  const fieldDegrees = .22755555555555557;
  const recipe = { method: "Astropy make_lupton_rgb", version: "8.0.1", rgbBands: ["i", "r", "g"], intervalMinimum: 0,
    scope: "one complete coherent science master before any level crop", availableSciencePixels: 4194304, totalMasterPixels: 4194304,
    scienceCorrection: "NONE; calibrated samples/eligibility unchanged",
    displayClipping: "nonpositive intensity/negative channels clip only in display; never science absence",
    kind: "fixed", stretchClass: "LuptonAsinhStretch", stretch: 5, Q: 8, requestedParameters: { stretch: 5, Q: 8 }, statisticalFit: null };
  return { schemaVersion: "sdss-dr17-science-optical-publication-v2", imageVersion: "science-optical-v2", publicationId: "synthetic-admission-test-v2",
    objectRef: "M:51", center: old.center, orientation: "north-up/east-left", source: old.source,
    processing: { runtimeNetwork: "forbidden", modification: "Synthetic structural fixture; no science claim", coverage: "UNKNOWN" },
    master: { pixels: 2048, fieldDegrees, astrometry: "source-primary-linear-TAN-approximation", scientificValidity: "UNKNOWN", unit: "nanomaggies/pixel",
      sourceFrames: (["g", "r", "i"] as const).map(band => ({ ...content, admissionReceipt: content, primaryHeaderSha256: hash,
        identity: { rerun: "301", run: 1, camcol: 1, field: 1, band },
        sourceUrl: `https://data.sdss.org/sas/dr17/eboss/photoObj/frames/301/1/1/frame-${band}-000001-1-0001.fits.bz2` })),
      science: { g: content, r: content, i: content }, jointAvailability: { ...content, availablePixels: 4194304 }, rgb: content,
      transfer: { recipe, validation: "WHOLE_MASTER_REPRODUCED" } },
    levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map((level, index) => {
      const extent = 2048 / 2 ** index, start = (2048 - extent) / 2;
      return [level, { ...content, file: `M-51-${level.toLowerCase()}.png`, format: "png", pixels: 512,
        fieldDegrees: Math.atan(Math.tan(fieldDegrees * Math.PI / 360) * extent / 2048) * 360 / Math.PI,
        crpixFitsOneBased: 256.5, sampleAvailability: "joint-area-alpha", masterRgbSha256: hash, masterAvailabilitySha256: hash,
        masterCrop: { boundsXYExclusive: [start, start, start + extent, start + extent], boxFactor: extent / 512 } }];
    })) as SdssEncodedScienceOpticalPublication["levels"] };
}
function envelope(publication: SdssScienceOpticalPublication): SdssScienceOpticalManifest {
  const publicationHash = sdssScienceOpticalPublicationHash(publication);
  return { ...publication, publicationHash, levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level => [level, { ...publication.levels[level],
    downloadUrl: `/v2/sky/sdss-optical/${publicationHash}/${publication.levels[level].file}` }])) } as SdssScienceOpticalManifest;
}

function signedFixture(): SdssScienceMeanOpticalPublication {
  const old = fixture();
  return { ...old, schemaVersion: "sdss-dr17-science-optical-publication-v3", imageVersion: "science-optical-v3",
    pyramid: { method: "signed-coherent-science-mean-before-fixed-lupton-v1", validation: "SIGNED_LEVELS_REPRODUCED",
      statisticalFitCalls: 0, scienceCorrection: "NONE", rgbMasterRole: "REFERENCE_ONLY",
      unknownSamples: "excluded-from-mean-and-divisor", displayAlpha: "rounded-coherent-sample-area-independent-of-brightness" },
    levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level => {
      const { masterRgbSha256: _oldParent, ...asset } = old.levels[level];
      return [level, { ...asset, masterScienceSha256: { g: hash, r: hash, i: hash },
        scienceMean: { unit: "mean source nanomaggies/native-pixel", availablePixels: 512 ** 2, emptyPixels: 0, partialPixels: 0,
          availableMasterSamples: 512 ** 2 * asset.masterCrop.boxFactor ** 2,
          perBand: { g: { availableNegativeMeans: 12, availableZeroMeans: 3 },
            r: { availableNegativeMeans: 2, availableZeroMeans: 10 }, i: { availableNegativeMeans: 8, availableZeroMeans: 0 } } } }];
    })) as SdssScienceMeanOpticalPublication["levels"] };
}

test("signed v3 binds science parents, source means and no crop fit while v2 remains encoded", () => {
  const p = signedFixture(), manifest = envelope(p);
  assertSdssScienceOpticalManifest(manifest, "M:51", manifest.publicationHash);
  assert.notEqual(sdssScienceOpticalPublicationHash(p), sdssScienceOpticalPublicationHash(fixture()));
  const changed = structuredClone(p); changed.master.rgb = { ...changed.master.rgb, sha256: "2".repeat(64) };
  assertSdssScienceOpticalPublication(changed, "M:51"); // Reference RGB is not the coarse parent.
  assert.notEqual(sdssScienceOpticalPublicationHash(changed), manifest.publicationHash);
  const mutations: Array<(p: any) => void> = [
    p => { p.imageVersion = "science-optical-v2"; }, p => { p.schemaVersion = "sdss-dr17-science-optical-publication-v2"; },
    p => { p.pyramid.method = "encoded-rgb-box"; }, p => { p.pyramid.statisticalFitCalls = 3; },
    p => { p.pyramid.rgbMasterRole = "LEVEL_PARENT"; }, p => { p.pyramid.scienceCorrection = "sky-fit"; },
    p => { p.pyramid.unknownSamples = "zero-filled"; }, p => { delete p.pyramid; },
    p => { p.levels.OVERVIEW.masterRgbSha256 = hash; }, p => { p.levels.DETAIL.masterScienceSha256.g = "2".repeat(64); },
    p => { p.levels.MEDIUM.scienceMean.unit = "nanomaggies/coarse-pixel"; },
    p => { p.levels.OVERVIEW.scienceMean.availableMasterSamples--; },
    p => { p.levels.DETAIL.scienceMean.partialPixels = 1; },
    p => { p.levels.MEDIUM.scienceMean.emptyPixels++; },
    p => { p.levels.MEDIUM.scienceMean.perBand.g.availableNegativeMeans = 512 ** 2; },
  ];
  for (const mutate of mutations) { const bad = structuredClone(p); mutate(bad);
    assert.throws(() => assertSdssScienceOpticalPublication(bad, "M:51", sdssScienceOpticalPublicationHash(bad))); }
  const mixed: any = fixture(); mixed.pyramid = p.pyramid;
  assert.throws(() => assertSdssScienceOpticalPublication(mixed, "M:51"));
  const partial = signedFixture(); partial.levels.MEDIUM.scienceMean.partialPixels = 1;
  partial.levels.MEDIUM.scienceMean.availableMasterSamples -= 3;
  assertSdssScienceOpticalPublication(partial, "M:51");
});

test("optical hash binds source, science, receipt, transfer and crop independently of wire envelopes", () => {
  const publication = fixture(), manifest = envelope(publication), pinned = manifest.publicationHash;
  assertSdssScienceOpticalManifest(manifest, "M:51", pinned);
  assert.equal(sdssScienceOpticalPublicationHash(publication), sdssScienceOpticalPublicationHash(manifest));
  assert.equal(sdssScienceOpticalPublicationHash({ ...publication, levels: { DETAIL: publication.levels.DETAIL,
    OVERVIEW: publication.levels.OVERVIEW, MEDIUM: publication.levels.MEDIUM } }), pinned);
  for (const change of [
    (p: SdssScienceOpticalPublication) => { p.source.credit += " changed"; },
    (p: SdssScienceOpticalPublication) => { p.master.sourceFrames[0]!.admissionReceipt = { ...content, sha256: "2".repeat(64) }; },
    (p: SdssScienceOpticalPublication) => { p.master.science.g = { ...content, sha256: "2".repeat(64) }; },
    (p: SdssScienceOpticalPublication) => { p.master.transfer.recipe.stretch = 6; p.master.transfer.recipe.requestedParameters = { stretch: 6, Q: 8 }; },
  ]) { const changed = structuredClone(publication); change(changed); assert.notEqual(sdssScienceOpticalPublicationHash(changed), pinned);
    assert.throws(() => assertSdssScienceOpticalPublication(changed, "M:51", pinned)); }
  const redirected = structuredClone(manifest); redirected.levels.DETAIL.downloadUrl = "/some-other-image.png";
  assert.equal(sdssScienceOpticalPublicationHash(redirected), pinned);
  assert.throws(() => assertSdssScienceOpticalManifest(redirected, "M:51", pinned));
  assert.throws(() => assertSdssScienceOpticalManifest(manifest, "M:51", "3".repeat(64)), "unrelated W3 hash must not pin optical content");
});

test("fresh hashes cannot admit invalid shared recipes or mixed availability/geometry/source contracts", () => {
  const changes: Array<(p: any) => void> = [
    p => { p.master.transfer.recipe.stretch = -1; }, p => { p.master.transfer.recipe.Q = "bad"; },
    p => { delete p.master.transfer.recipe.version; }, p => { p.master.transfer.recipe.requestedParameters.Q = 0; },
    p => { p.master.transfer.recipe.availableSciencePixels--; }, p => { p.master.transfer.recipe.scienceCorrection = "subtract estimated sky"; },
    p => { p.master.transfer.recipe.statisticalFit = {}; }, p => { delete p.source.credit; },
    p => { p.source.landingUrl = "http://example.invalid/"; }, p => { p.master.sourceFrames[0].identity.rerun = 301; },
    p => { p.master.sourceFrames.pop(); }, p => { p.master.sourceFrames[1] = structuredClone(p.master.sourceFrames[0]); },
    p => { p.levels.MEDIUM.fieldDegrees = p.master.fieldDegrees / 2; }, p => { p.levels.DETAIL.crpixFitsOneBased = 256; },
    p => { p.levels.DETAIL.sampleAvailability = "brightness-alpha"; }, p => { p.levels.DETAIL.masterRgbSha256 = "2".repeat(64); },
    p => { p.levels.DETAIL.masterCrop.boundsXYExclusive[0]++; }, p => { p.levels.DETAIL.file = "../M-51-detail.png"; },
  ];
  for (const change of changes) { const p = fixture(); change(p); const fresh = sdssScienceOpticalPublicationHash(p);
    assert.throws(() => assertSdssScienceOpticalPublication(p, "M:51", fresh)); }
  const smallQ = fixture(); smallQ.master.transfer.recipe.requestedParameters = { stretch: 5, Q: 1e-20 };
  smallQ.master.transfer.recipe.Q = .1; assertSdssScienceOpticalPublication(smallQ, "M:51");
});

test("whole-master fit requires coherent counts, actual deterministic samples and one library fit", () => {
  const p = fixture(), recipe = p.master.transfer.recipe;
  recipe.kind = "whole-master-zscale"; recipe.stretchClass = "LuptonAsinhZscaleStretch"; recipe.requestedParameters = { Q: 8 };
  recipe.statisticalFit = { method: "Astropy ZScaleInterval through LuptonAsinhZscaleStretch",
    scope: "all coherent master samples; never individual crop/level", intensity: "float64 arithmetic mean of i/r/g; no pedestal or background subtraction",
    excludedIncoherentPixels: 0, finiteIntensitySamples: 4194304, negativeIntensitySamples: 12, zeroIntensitySamples: 3,
    nSamples: 1000, contrast: .25, maxReject: .5, minNpixels: 5, krej: 2.5, maxIterations: 5,
    deterministicRasterStride: 4194, actualStatisticalSamples: 1000, actualSampleNegativeCount: 1, actualSampleZeroCount: 0,
    sampleFloat64Sha256: hash, sampleRasterIndicesInt64Sha256: hash, libraryFitCalls: 1, derivedStretch: "library z2 - z1, not a fitted black level" };
  assertSdssScienceOpticalPublication(p, "M:51");
  for (const [key, bad] of [["scope", "individual DETAIL crop"], ["libraryFitCalls", 3], ["finiteIntensitySamples", 512 ** 2],
    ["deterministicRasterStride", 1], ["actualSampleNegativeCount", 13], ["sampleFloat64Sha256", "missing"]] as const) {
    const changed = structuredClone(p); (changed.master.transfer.recipe.statisticalFit as Record<string, unknown>)[key] = bad;
    assert.throws(() => assertSdssScienceOpticalPublication(changed, "M:51", sdssScienceOpticalPublicationHash(changed)));
  }
});

test("the shared wire validator does not require a browser URL global", () => {
  const manifest = envelope(fixture()), descriptor = Object.getOwnPropertyDescriptor(globalThis, "URL")!;
  Reflect.deleteProperty(globalThis, "URL");
  try { assertSdssScienceOpticalManifest(manifest, "M:51", manifest.publicationHash); }
  finally { Object.defineProperty(globalThis, "URL", descriptor); }
});

test("existing six immutable JPEG offers retain actual old publication and asset bytes; v1/v2 stay distinct", () => {
  for (const reference of Object.keys(SDSS_OPTICAL_PUBLICATIONS) as SdssOpticalReference[]) {
    const directory = new URL(`../../../workers/miniapp-api/assets/deep-sky/sdss-m${reference.slice(2)}/`, import.meta.url);
    const publication: unknown = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));
    assertSdssOpticalPublication(publication, reference);
    assert.equal(sdssOpticalPublicationHash(publication), SDSS_OPTICAL_PUBLICATIONS[reference].publicationHash);
    for (const level of SDSS_OPTICAL_LEVELS) { const a: SdssOpticalPublishedAsset = publication.levels[level], bytes = readFileSync(new URL(a.file, directory));
      assert.equal(bytes.length, a.bytes); assert.equal(bytesToHex(sha256(bytes)), a.sha256); }
    assert.throws(() => assertSdssScienceOpticalPublication(publication, reference));
  }
  assert.throws(() => assertSdssOpticalPublication(fixture(), "M:51"));
});
