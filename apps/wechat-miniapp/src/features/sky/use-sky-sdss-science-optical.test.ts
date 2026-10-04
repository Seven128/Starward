import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { assertSdssScienceOpticalManifest, sdssScienceOpticalPublicationHash, assertPreparedOpticalManifest, preparedOpticalPublicationHash,
  type SdssScienceOpticalManifest, type SdssDisplayOpticalManifest, assertSdssDisplayOpticalManifest, type PreparedOpticalManifest } from "@starward/miniapp-contracts";
import { createSkyArtworkLoader, type SkyArtworkLoadState, type SkyNativeImageAsset } from "./sky-artwork-loader";
import { sdssOpticalLevelForFov, sdssScienceOpticalLevelForFov, skyTargetOpticalLevelForFov } from "./sky-sdss-optical-selection";
import { skyFixedImageStatus } from "./sky-fixed-image-status";
import { skyTargetOpticalIntersectsView } from "./sky-target-optical-visibility";
import { OBSERVATION_FRAME_FORMAT } from "@starward/miniapp-contracts";
import { createSkyViewBasis } from "./sky-view-projection";
import type { SkyTargetOpticalView } from "./sky-target-optical-visibility";
import { createSyntheticPreparedOpticalPublication } from "../../../../../workers/miniapp-api/src/test-fixtures/prepared-optical-publication.ts";
import { createSyntheticSdssSciencePublication } from "../../../../../workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts";
import { createSyntheticSdssDisplayPublication } from "../../../../../workers/miniapp-api/src/test-fixtures/sdss-display-publication.ts";
import { syntheticOpticalPng } from "../../../../../workers/miniapp-api/src/test-fixtures/synthetic-optical-png.ts";

// Complete current Hook module with portable structural metadata by default,
// or the actual writer directory in the bounded development run. React/query
// scheduling and file/decode callbacks are controlled; no native/GPU claim.
const supplied = process.env.CLOUD_SKY_SCIENCE_PUBLICATION_PATH;
const syntheticDirectory = supplied ? undefined : mkdtempSync(join(tmpdir(), "starward-science-hook-"));
const structural = syntheticDirectory ? createSyntheticSdssSciencePublication(syntheticDirectory) : undefined;
const raw = JSON.parse(readFileSync(join(supplied ?? syntheticDirectory!, "manifest.json"), "utf8"));
const actual: SdssScienceOpticalManifest = supplied ? raw : { ...raw, publicationHash: structural!.expectedHash,
  levels: Object.fromEntries(["OVERVIEW", "MEDIUM", "DETAIL"].map(level => [level, { ...raw.levels[level],
    downloadUrl: `/v2/sky/sdss-optical/${structural!.expectedHash}/${raw.levels[level].file}` }])) };
assertSdssScienceOpticalManifest(actual, "M:51", actual.publicationHash);
const replacement = structuredClone(actual);
replacement.publicationId += ".test-replacement";
replacement.publicationHash = sdssScienceOpticalPublicationHash(replacement);
for (const asset of Object.values(replacement.levels))
  asset.downloadUrl = `/v2/sky/sdss-optical/${replacement.publicationHash}/${asset.file}`;
assertSdssScienceOpticalManifest(replacement, "M:51", replacement.publicationHash);

const displaySupplied = process.env.CLOUD_SKY_DISPLAY_PUBLICATION_PATH;
const displayDirectory = displaySupplied ? undefined : mkdtempSync(join(tmpdir(), "starward-display-hook-"));
const displayFixture = displayDirectory ? createSyntheticSdssDisplayPublication(displayDirectory) : undefined;
const displayRaw = JSON.parse(readFileSync(join(displaySupplied ?? displayDirectory!, "manifest.json"), "utf8"));
const displayActual: SdssDisplayOpticalManifest = displaySupplied ? displayRaw : { ...displayRaw,
  publicationHash: displayFixture!.expectedHash,
  levels: Object.fromEntries(["OVERVIEW", "MEDIUM", "DETAIL"].map(level => [level, { ...displayRaw.levels[level],
    downloadUrl: `/v2/sky/sdss-optical/${displayFixture!.expectedHash}/${displayRaw.levels[level].file}` }])) };
assertSdssDisplayOpticalManifest(displayActual, displayActual.objectRef, displayActual.publicationHash);

const preparedSupplied = process.env.CLOUD_SKY_PREPARED_PUBLICATION_PATH;
const preparedDirectory = preparedSupplied ? undefined : mkdtempSync(join(tmpdir(), "starward-prepared-hook-"));
function progressivePreparedFixture(directory: string) {
  const fixture = createSyntheticPreparedOpticalPublication(directory);
  // Progressive recovery needs distinct encoded levels. The transport fixture's
  // identical black PNGs correctly coalesce into one loader job; they cannot
  // exercise independent fine failure with a valid parent. No source admission.
  for (const [index, level] of (["OVERVIEW", "MEDIUM", "DETAIL"] as const).entries()) {
    const bytes = syntheticOpticalPng(index, 0, 0), asset = fixture.value.levels[level];
    writeFileSync(join(directory, asset.file), bytes);
    asset.bytes = bytes.length; asset.sha256 = createHash("sha256").update(bytes).digest("hex");
  }
  return { ...fixture, expectedHash: fixture.save() };
}
const preparedStructural = preparedDirectory ? progressivePreparedFixture(preparedDirectory) : undefined;
const preparedRaw = JSON.parse(readFileSync(join(preparedSupplied ?? preparedDirectory!, "manifest.json"), "utf8"));
const preparedActual: PreparedOpticalManifest = preparedSupplied ? preparedRaw : { ...preparedRaw,
  publicationHash: preparedStructural!.expectedHash,
  levels: Object.fromEntries(["OVERVIEW", "MEDIUM", "DETAIL"].map(level => [level, { ...preparedRaw.levels[level],
    downloadUrl: `/v2/sky/prepared-optical/${preparedStructural!.expectedHash}/${preparedRaw.levels[level].file}` }])) };
assertPreparedOpticalManifest(preparedActual, "M:51", preparedActual.publicationHash);
const preparedReplacement = structuredClone(preparedActual);
preparedReplacement.publicationId += ".test-replacement";
preparedReplacement.publicationHash = preparedOpticalPublicationHash(preparedReplacement);
for (const asset of Object.values(preparedReplacement.levels))
  asset.downloadUrl = `/v2/sky/prepared-optical/${preparedReplacement.publicationHash}/${asset.file}`;
assertPreparedOpticalManifest(preparedReplacement, "M:51", preparedReplacement.publicationHash);

function world(prepared = false, display = false) {
  let metadataCurrent = true, publication: SdssScienceOpticalManifest | SdssDisplayOpticalManifest | PreparedOpticalManifest = display ? displayActual : prepared ? preparedActual : actual, queryData: unknown;
  let state: SkyArtworkLoadState = { images: new Map(), retainedImages: new Map(), failed: false, loading: false };
  let currentHash: string | undefined, owner: ReturnType<typeof createSkyArtworkLoader> | undefined;
  let released = 0, canceled = 0, refetches = 0;
  const queries: any[] = [], starts: any[] = [], metadataCalls: any[] = [], resolutions: any[] = [];
  const resource = () => ({ publication, isCurrent: () => metadataCurrent });
  const compiled = new Map<string, Record<string, any>>();
  const load = (file: string): Record<string, any> => {
    if (compiled.has(file)) return compiled.get(file)!;
    const exports: Record<string, any> = {}; compiled.set(file, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"),
      { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, require(name: string) {
        if (name === "./use-sky-target-optical") return load("./use-sky-target-optical.ts");
      const bindings: Record<string, unknown> = {
        react: { useMemo: (read: () => unknown) => read() },
        "@/hooks/use-resource-query": { useResourceQuery(options: unknown) {
          queries.push(options); return { data: queryData, isError: false, isFetching: queryData === undefined,
            refetch() { refetches++; metadataCurrent = true; queryData = resource(); return Promise.resolve(queryData); } };
        } },
        "@/services/sdss-optical-client": { sdssOpticalImageUrl: (url: string) => url,
          getSdssOpticalManifest() { throw Error("explicit science must not invoke legacy discovery"); } },
        "@/services/sdss-science-optical-resource": { async getSdssCalibratedOpticalResource(...args: unknown[]) {
          metadataCalls.push(args); return resource();
        } },
        "./sky-sdss-optical-selection": { sdssOpticalLevelForFov, skyTargetOpticalLevelForFov },
        "@/services/prepared-optical-client": { preparedOpticalImageUrl: (url: string) => url },
        "@/services/prepared-optical-resource": { async getPreparedOpticalResource(...args: unknown[]) {
          metadataCalls.push(args); return resource();
        } },
        "./sky-fixed-image-status": { skyFixedImageStatus },
        "./sky-target-optical-visibility": { skyTargetOpticalIntersectsView },
        "./use-sky-artwork": { useSkyNativeImages(_canvas: unknown, _revision: number, hash: string | undefined,
          active: boolean, wanted: readonly SkyNativeImageAsset[], resolve: (asset: SkyNativeImageAsset) => unknown) {
          if (!active || currentHash !== hash) {
            owner?.dispose(); owner = undefined; currentHash = hash;
            state = { images: new Map(), retainedImages: new Map(), failed: false, loading: false };
          }
          if (active && hash && !owner) owner = createSkyArtworkLoader({ byteBudget: 2 * 512 * 512 * 4,
            changed(value) { state = value; }, start(asset, ready, fail) {
              const pending = { asset, ready, fail, resolve() { const value = resolve(asset); resolutions.push(value); return value; } };
              starts.push(pending); pending.resolve(); return () => { canceled++; };
            } });
          owner?.update(wanted);
          return { ...state, failedImage: (image: object) => owner?.failed(image), retryImages: () => owner?.retry() ?? false };
        } },
      };
        assert.ok(name in bindings, name); return bindings[name];
      },
    });
    return exports;
  };
  const exports = load(prepared ? "./use-sky-prepared-optical.ts" : "./use-sky-sdss-optical.ts");
  const hook = prepared ? (reference: string, fov: number, canvas: object, revision: number, active: boolean, hash: string, footprint?: SkyTargetOpticalView) =>
    exports.useSkyPreparedOptical(reference, hash, fov, canvas, revision, active, footprint) : exports.useSkySdssOptical;
  const canvas = { createImage() { throw Error("native callback is controlled at the existing loader boundary"); } };
  const read = (fov = .05, hash = publication.publicationHash, reference = publication.objectRef, active = true, footprint?: SkyTargetOpticalView) =>
    hook(reference, fov, canvas, 1, active, hash, footprint);
  const ready = (index: number) => {
    const image = { asset: starts[index].asset.id };
    starts[index].ready({ image, release() { released++; } }); return image;
  };
  return { read, ready, starts, queries, metadataCalls, resolutions,
    accept() { queryData = resource(); }, retireMetadata() { metadataCurrent = false; },
    replace() { publication = prepared ? preparedReplacement : replacement; }, injectForeignKind() { publication = prepared ? actual : preparedActual; }, dispose() { owner?.dispose(); },
    get counts() { return { released, canceled, refetches }; } };
}

test("both exact-source wrappers retire only a certified offscreen family and preserve unknown observer demand", () => {
  const at = "2026-10-03T13:00:00.000Z";
  for (const prepared of [false, true]) {
    const publication = prepared ? preparedActual : actual, w = world(prepared);
    const az = (90 - publication.center.raDeg + 360) % 360;
    const report = { hourly: [{ at }], observationFrames: [{ at, format: OBSERVATION_FRAME_FORMAT,
      observer: { latitude: 0, longitude: 0, elevationM: 0 }, equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1] }] } as any;
    const view = (offset: number, suppliedReport = report): SkyTargetOpticalView => ({ report: suppliedReport, at,
      width: 390, height: 844, view: { basis: createSkyViewBasis(az + offset, 90 + publication.center.decDeg, 0)!, verticalFovDeg: .05 } });
    const read = (footprint: SkyTargetOpticalView) => w.read(.05, publication.publicationHash, "M:51", true, footprint);
    w.accept(); assert.equal(read(view(90)).image, null); assert.equal(w.starts.length, 0);
    read(view(0)); const fine = w.ready(0); w.ready(1); assert.equal(read(view(0)).image, fine);
    assert.equal(read(view(90)).requested, false); assert.equal(w.counts.released, 2);
    read(view(0)); assert.equal(w.starts.length, 4);
    const returned = w.ready(2); w.ready(3);
    assert.equal(read(view(90, { hourly: [{ at }] })).image, returned, "unavailable observer geometry keeps the valid source eligible");
    assert.equal(w.counts.refetches, 0); w.dispose();
  }
});

test("explicit science cold metadata is independent, then exact PNG descriptors supply coarse recovery", async () => {
  const w = world(), cold = w.read();
  assert.equal(cold.publication, undefined); assert.equal(cold.loading, true); assert.equal(w.starts.length, 0);
  assert.equal(w.queries[0].enabled, true);
  assert.deepEqual(Array.from(w.queries[0].queryKey), ["sdss-optical-manifest", "M:51", "sdss-calibrated", actual.publicationHash]);
  const signal = new AbortController().signal; await w.queries[0].queryFn(signal);
  assert.deepEqual(w.metadataCalls, [["M:51", actual.publicationHash, signal]]);
  w.accept(); w.read();
  assert.equal(w.starts.length, 2);
  assert.deepEqual(Array.from(w.starts, entry => entry.asset.id), ["sdss:M:51:DETAIL", "sdss:M:51:MEDIUM"]);
  assert.ok(w.resolutions.every(resolved => resolved.format === "png" && resolved.url.includes(actual.publicationHash)));
  const medium = w.ready(1); w.starts[0].fail();
  const partial = w.read(); assert.equal(partial.image, medium); assert.equal(partial.updateFailed, true);
  assert.strictEqual(partial.renderedAsset, actual.levels.MEDIUM);
  assert.equal(partial.fieldDegrees, actual.levels.MEDIUM.fieldDegrees);
  partial.retry(); assert.equal(w.counts.refetches, 1); assert.equal(w.starts.length, 3);
  const fine = w.ready(2), refined = w.read();
  assert.equal(refined.image, fine); assert.strictEqual(refined.renderedAsset, actual.levels.DETAIL);
  assert.strictEqual(refined.coarser?.image, medium); assert.strictEqual(refined.coarser?.asset, actual.levels.MEDIUM);
  assert.equal(refined.renderedAsset?.sampleAvailability, "joint-area-alpha");
  assert.equal(refined.renderedAsset?.crpixFitsOneBased, 256.5);
  assert.equal(refined.renderedAsset?.masterRgbSha256, refined.coarser?.asset.masterRgbSha256);
  w.dispose(); assert.equal(w.counts.released, 2);
});

test.after(() => {
  for (const directory of [syntheticDirectory, preparedDirectory, displayDirectory]) {
    if (!directory) continue;
    assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
    assert.match(basename(directory), /^starward-(?:science|prepared|display)-hook-/u);
    rmSync(directory, { recursive: true }); // Owned regenerated test fixtures only.
  }
});

test("retired metadata is fenced both at Hook render and at the later native-acquisition resolver", () => {
  const w = world(); w.accept(); w.read();
  w.retireMetadata();
  assert.throws(() => w.starts[0].resolve(), /resource_cancelled/u, "a render/effect gap cannot start a new file epoch from retired metadata");
  const retired = w.read();
  assert.equal(retired.publication, undefined); assert.equal(retired.image, null); assert.equal(retired.failed, true);
  assert.equal(w.counts.canceled, 2);
  w.ready(0); w.ready(1); assert.equal(w.counts.released, 2, "late native completion cannot revive the old epoch");
  retired.retry(); w.read(); assert.equal(w.starts.length, 4, "explicit metadata refresh supplies the new epoch");
  w.dispose();
});

test("new hash and reference transitions reject retained old metadata before images are relabeled", () => {
  const w = world(); w.accept(); w.read(); w.ready(0);
  const changed = w.read(.05, replacement.publicationHash);
  assert.equal(changed.publication, undefined); assert.equal(changed.image, null);
  assert.equal(w.counts.released, 1); assert.equal(w.counts.canceled, 1);
  w.ready(1); assert.equal(w.counts.released, 2);
  w.replace(); w.accept(); const next = w.read();
  assert.equal(next.publication?.publicationHash, replacement.publicationHash); assert.equal(w.starts.length, 4);
  const foreign = w.read(.05, replacement.publicationHash, "M:82");
  assert.equal(foreign.publication, undefined); assert.equal(foreign.image, null);
  for (const invalid of ["", "../outside"]) { w.read(.05, invalid); assert.equal(w.queries.at(-1).enabled, false); }
  w.read(.05, replacement.publicationHash, "HR:7001"); assert.equal(w.queries.at(-1).enabled, false);
  w.read(.05, replacement.publicationHash, "M:51", false); assert.equal(w.queries.at(-1).enabled, false);
  w.dispose();
});

test("science refinement keeps the current angular policy without inventing a photograph-fills-viewport requirement", () => {
  assert.equal(sdssScienceOpticalLevelForFov(.3, actual), "OVERVIEW");
  assert.equal(sdssScienceOpticalLevelForFov(.1, actual), "MEDIUM");
  assert.equal(sdssScienceOpticalLevelForFov(.05, actual), "DETAIL");
  assert.equal(sdssScienceOpticalLevelForFov(.31, actual), null);
  assert.equal(sdssScienceOpticalLevelForFov(Number.NaN, actual), null);
  assert.equal(sdssScienceOpticalLevelForFov(0, actual), null);
  assert.equal(sdssOpticalLevelForFov(.5, "M:81"), "OVERVIEW");
});


test("prepared source uses the same real progressive owner without science or legacy relabelling", async () => {
  const w = world(true), p = preparedActual;
  assert.equal(w.read().publication, undefined);
  assert.deepEqual(Array.from(w.queries[0].queryKey), ["prepared-optical-manifest", "M:51", "prepared-optical-v1", p.publicationHash]);
  const signal = new AbortController().signal; await w.queries[0].queryFn(signal);
  assert.deepEqual(w.metadataCalls, [["M:51", p.publicationHash, signal]]);
  w.accept(); w.read(); assert.equal(w.starts.length, 2);
  assert.deepEqual(Array.from(w.starts, entry => entry.asset.id), ["prepared:M:51:DETAIL", "prepared:M:51:MEDIUM"]);
  assert(w.resolutions.every(row => row.format === "png" && row.url.includes("/prepared-optical/")));
  const medium = w.ready(1); w.starts[0].fail(); const fallback = w.read();
  assert.strictEqual(fallback.image, medium); assert.strictEqual(fallback.renderedAsset, p.levels.MEDIUM);
  assert.equal(fallback.updateFailed, true); fallback.retry(); const fine = w.ready(2), ready = w.read();
  assert.strictEqual(ready.image, fine); assert.strictEqual(ready.coarser?.image, medium);
  assert.strictEqual(ready.renderedAsset, p.levels.DETAIL); assert.strictEqual(ready.coarser?.asset, p.levels.MEDIUM);
  assert.equal(ready.publication?.imageVersion, "prepared-optical-v1");
  assert.equal(ready.renderedAsset?.displayAlpha, "geometric-source-area");
  assert.equal(ready.renderedAsset?.scientificAvailability, "UNKNOWN");
  assert.equal(ready.renderedAsset?.masterRgbaSha256, ready.coarser?.asset.masterRgbaSha256);
  w.dispose(); assert.equal(w.counts.released, 2);
});

test("prepared metadata retirement and hash/ref/source-kind transitions cannot revive or relabel native pixels", () => {
  const w = world(true); w.accept(); w.read(); w.retireMetadata();
  assert.throws(() => w.starts[0].resolve(), /prepared_optical_resource_cancelled/u);
  assert.equal(w.read().publication, undefined); assert.equal(w.counts.canceled, 2);
  w.ready(0); w.ready(1); assert.equal(w.counts.released, 2);
  w.read().retry(); w.read(); w.ready(2);
  const changed = w.read(.05, preparedReplacement.publicationHash);
  assert.equal(changed.publication, undefined); assert.equal(changed.image, null);
  w.ready(3); w.replace(); w.accept(); assert.equal(w.read().publication?.publicationHash, preparedReplacement.publicationHash);
  w.read(.05, preparedReplacement.publicationHash, "M:82"); assert.equal(w.read(.05, preparedReplacement.publicationHash, "M:82").image, null);
  for (const hash of ["", "../outside"]) { w.read(.05, hash); assert.equal(w.queries.at(-1).enabled, false); }
  w.injectForeignKind(); w.accept(); const foreign = w.read(.05, actual.publicationHash);
  assert.equal(foreign.publication, undefined, "matching ref/hash cannot turn a science version into a prepared source");
  assert.equal(foreign.image, null); w.dispose();
});


test("display uses the existing progressive owner with exact estimate descriptors, parent recovery and retirement", async () => {
  const w = world(false, true), p = displayActual, cold = w.read();
  assert.equal(cold.publication, undefined); assert.equal(w.starts.length, 0);
  assert.deepEqual(Array.from(w.queries[0].queryKey), ["sdss-optical-manifest", p.objectRef, "sdss-calibrated", p.publicationHash]);
  await w.queries[0].queryFn(new AbortController().signal); w.accept();w.read();
  assert.equal(w.starts.length, 2); const parent = w.ready(1);w.starts[0].fail();
  const fallback = w.read(); assert.strictEqual(fallback.image, parent);
  assert.strictEqual(fallback.renderedAsset, p.levels.MEDIUM); assert.equal(fallback.updateFailed, true);
  assert.strictEqual(fallback.publication, p); assert.equal(fallback.publication.imageVersion, "sdss-display-optical-v1");
  assert.equal("scienceMean" in fallback.renderedAsset, false); assert.equal("displayEstimateMean" in fallback.renderedAsset, true);
  fallback.retry();w.read(); const fine = w.ready(2), refined = w.read();
  assert.strictEqual(refined.image, fine);assert.strictEqual(refined.coarser.image, parent);
  assert.strictEqual(refined.coarser.asset, p.levels.MEDIUM);assert.strictEqual(refined.renderedAsset, p.levels.DETAIL);
  w.retireMetadata();assert.throws(() => w.starts[2].resolve(), /resource_cancelled/u);
  const retired = w.read();assert.equal(retired.image, null);assert.equal(retired.publication, undefined);
  w.dispose();assert.equal(w.counts.released, 2);
});
