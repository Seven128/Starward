import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { assertSdssScienceOpticalManifest, assertPreparedOpticalManifest, type PreparedOpticalManifest, type SdssScienceOpticalManifest,
  type SdssOpticalManifest } from "@starward/miniapp-contracts";
import { createSyntheticSdssSciencePublication } from "../../../../../workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts";
import { createSyntheticPreparedOpticalPublication } from "../../../../../workers/miniapp-api/src/test-fixtures/prepared-optical-publication.ts";
import { skyPreparedOpticalFrame, skyTargetOpticalFrame, skySdssOpticalFrame } from "./sky-sdss-optical-frame";

const supplied = process.env.CLOUD_SKY_SCIENCE_PUBLICATION_PATH;
const generated = supplied ? undefined : mkdtempSync(join(tmpdir(), "starward-science-frame-"));
const structural = generated ? createSyntheticSdssSciencePublication(generated) : undefined;
const raw = JSON.parse(readFileSync(join(supplied ?? generated!, "manifest.json"), "utf8"));
const publication: SdssScienceOpticalManifest = supplied ? raw : { ...raw, publicationHash: structural!.expectedHash,
  levels: Object.fromEntries(Object.entries(raw.levels).map(([level, asset]) => [level, { ...(asset as object),
    downloadUrl: `/v2/sky/sdss-optical/${structural!.expectedHash}/${(asset as any).file}` }])) };
assertSdssScienceOpticalManifest(publication, "M:51", publication.publicationHash);
const preparedSupplied = process.env.CLOUD_SKY_PREPARED_PUBLICATION_PATH;
const preparedGenerated = preparedSupplied ? undefined : mkdtempSync(join(tmpdir(), "starward-prepared-frame-"));
const preparedStructural = preparedGenerated ? createSyntheticPreparedOpticalPublication(preparedGenerated) : undefined;
const preparedRaw = JSON.parse(readFileSync(join(preparedSupplied ?? preparedGenerated!, "manifest.json"), "utf8"));
const prepared: PreparedOpticalManifest = preparedSupplied ? preparedRaw : { ...preparedRaw,
  publicationHash: preparedStructural!.expectedHash,
  levels: Object.fromEntries(Object.entries(preparedRaw.levels).map(([level, asset]) => [level, { ...(asset as object),
    downloadUrl: `/v2/sky/prepared-optical/${preparedStructural!.expectedHash}/${(asset as any).file}` }])) };
assertPreparedOpticalManifest(prepared, "M:51", prepared.publicationHash);
const image = {}, parent = {};
const loaded = { publication, image, renderedLevel: "DETAIL" as const, renderedAsset: publication.levels.DETAIL,
  coarser: { image: parent, level: "MEDIUM" as const, asset: publication.levels.MEDIUM } };

test("queued science frame retains each real descriptor and common immutable scientific mother", () => {
  const frame = skySdssOpticalFrame(loaded);
  assert(frame && "sciencePublication" in frame);
  assert.strictEqual(frame.sciencePublication, publication);
  assert.strictEqual(frame.asset, publication.levels.DETAIL);
  assert.strictEqual(frame.coarser?.asset, publication.levels.MEDIUM);
  assert.strictEqual(frame.coarser?.image, parent);
  assert.equal(frame.fieldDegrees, publication.levels.DETAIL.fieldDegrees);
  assert.equal(frame.coarser?.fieldDegrees, publication.levels.MEDIUM.fieldDegrees);
  assert.equal(frame.asset.crpixFitsOneBased, 256.5);
  assert.equal(frame.asset.sampleAvailability, "joint-area-alpha");
  if ("masterRgbSha256" in frame.asset) {
    assert(frame.coarser && "masterRgbSha256" in frame.coarser.asset);
    assert.equal(frame.asset.masterRgbSha256, frame.coarser.asset.masterRgbSha256);
  } else {
    assert(frame.coarser && "masterScienceSha256" in frame.coarser.asset);
    assert.deepEqual(frame.asset.masterScienceSha256, frame.coarser.asset.masterScienceSha256);
  }
  assert.equal(frame.asset.masterAvailabilitySha256, frame.coarser?.asset.masterAvailabilitySha256);
  assert(Object.isFrozen(frame)); assert(Object.isFrozen(frame.coarser));
  assert.throws(() => { (frame as any).publicationHash = "foreign"; }, TypeError);
  const coarseOnly = skySdssOpticalFrame({ ...loaded, image: parent, renderedLevel: "MEDIUM",
    renderedAsset: publication.levels.MEDIUM, coarser: null });
  assert(coarseOnly && "sciencePublication" in coarseOnly);
  assert.strictEqual(coarseOnly.asset, publication.levels.MEDIUM);
  assert.equal(coarseOnly.level, "MEDIUM"); assert.equal(coarseOnly.coarser, null);
});

test("foreign and requested descriptors cannot relabel a ready native field", () => {
  for (const change of [{ image: null }, { renderedLevel: null }, { publication: undefined },
    { renderedAsset: publication.levels.MEDIUM }, { renderedAsset: { ...publication.levels.DETAIL } }])
    assert.equal(skySdssOpticalFrame({ ...loaded, ...change }), null);
  for (const coarser of [{ ...loaded.coarser, asset: { ...publication.levels.MEDIUM } },
    { ...loaded.coarser, image }, { ...loaded.coarser, level: "DETAIL" as const, asset: publication.levels.DETAIL }]) {
    const frame = skySdssOpticalFrame({ ...loaded, coarser });
    assert(frame && "sciencePublication" in frame); assert.equal(frame.coarser, null);
    assert.strictEqual(frame.asset, publication.levels.DETAIL, "an independent bad parent does not erase the valid finer field");
  }
});

test("legacy handoff keeps exact admitted JPEG fields without science availability semantics", () => {
  // Structural already-admitted caller, not a transport or source-quality fixture.
  const legacy = { objectRef: "M:51", publicationHash: "a".repeat(64),
    levels: { DETAIL: { fieldDegrees: .0568888889 }, MEDIUM: { fieldDegrees: .1137777778 } } } as SdssOpticalManifest;
  const frame = skySdssOpticalFrame({ ...loaded, publication: legacy, renderedAsset: legacy.levels.DETAIL,
    coarser: { image: parent, level: "MEDIUM", asset: legacy.levels.MEDIUM } });
  assert(frame); assert(!("sciencePublication" in frame)); assert(!("asset" in frame));
  assert.deepEqual(frame, { image, level: "DETAIL", fieldDegrees: legacy.levels.DETAIL.fieldDegrees,
    reference: "M:51", publicationHash: legacy.publicationHash,
    coarser: { image: parent, level: "MEDIUM", fieldDegrees: legacy.levels.MEDIUM.fieldDegrees } });
});

test("actual page hands science and Prepared envelopes to its queued frame, respecting page mode", () => {
  const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "canvasLifecycle.request") {
      const argument = node.arguments[0];
      assert(argument && ts.isObjectLiteralExpression(argument));
      const property = argument.properties.find((item): item is ts.PropertyAssignment =>
        ts.isPropertyAssignment(item) && item.name.getText(source) === "sdssOpticalImage");
      assert(property); expression = property.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert(expression);
  const read = (mode: string, canvasData: object | undefined, sdssOptical = loaded) => vm.runInNewContext(ts.transpileModule(
    `(${expression!.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { skySdssOpticalFrame, skyTargetOpticalFrame, sdssOptical, mode, canvasData });
  const frame = read("NIGHT", {}); assert.strictEqual(frame.sciencePublication, publication);
  assert.strictEqual(frame.asset, publication.levels.DETAIL); assert.strictEqual(frame.coarser.asset, publication.levels.MEDIUM);
  assert.equal(read("OBSERVATION", {}), null); assert.equal(read("NIGHT", undefined), null);
  const preparedLoaded = { ...loaded, publication: prepared, renderedAsset: prepared.levels.DETAIL,
    coarser: { image: parent, level: "MEDIUM" as const, asset: prepared.levels.MEDIUM } };
  const preparedFrame = read("NIGHT", {}, preparedLoaded as any);
  assert(preparedFrame, "the actual page must retain a ready Prepared image instead of rejecting it as foreign SDSS");
  assert.strictEqual(preparedFrame.preparedPublication, prepared);
  assert.strictEqual(preparedFrame.asset, prepared.levels.DETAIL);
  assert.strictEqual(preparedFrame.coarser.asset, prepared.levels.MEDIUM);
  assert.equal(read("OBSERVATION", {}, preparedLoaded as any), null);
  assert.equal(read("NIGHT", undefined, preparedLoaded as any), null);
});

test("actual page grants Prepared Scene only its current frame and Canvas generation", () => {
  const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "drawSkyScene") expression = node.arguments[37];
    ts.forEachChild(node, visit);
  };
  visit(source); assert(expression);
  const image = skyPreparedOpticalFrame({ ...loaded, publication: prepared, renderedAsset: prepared.levels.DETAIL,
    coarser: { image: parent, level: "MEDIUM", asset: prepared.levels.MEDIUM } });
  assert(image);
  const surface = {};
  const read = (sdssOpticalImage: unknown, generation = 1) => vm.runInNewContext(ts.transpileModule(
    `(${expression!.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { context: surface, frame: { sdssOpticalImage, nativeImageGeneration: generation }, canvasGenerationRef: { current: 1 } });
  const port = read(image);
  assert(port, "a ready Prepared queued frame requires the Prepared Scene port");
  assert.strictEqual(port.surface, surface); assert.equal(port.reference, image.reference);
  assert.equal(port.publicationHash, image.publicationHash);
  assert.equal(read(image, 2), undefined); assert.equal(read(null), undefined);
  assert.equal(read(skySdssOpticalFrame(loaded)), undefined, "calibrated images cannot borrow the Prepared Scene port");
});

test.after(() => {
  for (const directory of [generated, preparedGenerated]) {
    if (!directory) continue;
    assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
    assert.match(basename(directory), /^starward-(?:science|prepared)-frame-/u);
    rmSync(directory, { recursive: true }); // Owned regeneratable fixtures only.
  }
});


test("prepared ready frames retain original source/geometry without becoming science or legacy", () => {
  const data = { ...loaded, publication: prepared, renderedAsset: prepared.levels.DETAIL,
    coarser: { image: parent, level: "MEDIUM" as const, asset: prepared.levels.MEDIUM } };
  const frame = skyPreparedOpticalFrame(data);
  assert(frame); assert.strictEqual(frame.preparedPublication, prepared);
  assert.strictEqual(frame.asset, prepared.levels.DETAIL); assert.strictEqual(frame.coarser?.asset, prepared.levels.MEDIUM);
  assert.equal(frame.asset.displayAlpha, "geometric-source-area"); assert.equal(frame.asset.scientificAvailability, "UNKNOWN");
  assert.equal(frame.preparedPublication.source.credit, prepared.source.credit);
  assert.equal(frame.preparedPublication.source.nominalAvm.accuracy, "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM");
  assert.equal("sciencePublication" in frame, false); assert(Object.isFrozen(frame)); assert(Object.isFrozen(frame.coarser));
  assert.equal(skySdssOpticalFrame(data as any), null, "an untyped foreign prepared field cannot enter the legacy/science consumer");
  assert.equal(skyPreparedOpticalFrame(loaded as any), null);
  assert.equal(skyPreparedOpticalFrame({ ...data, renderedAsset: { ...prepared.levels.DETAIL } }), null);
  const independent = skyPreparedOpticalFrame({ ...data, coarser: { ...data.coarser, asset: { ...prepared.levels.MEDIUM } } });
  assert(independent); assert.equal(independent.coarser, null);
  const actualMedium = skyPreparedOpticalFrame({ ...data, image: parent, renderedLevel: "MEDIUM",
    renderedAsset: prepared.levels.MEDIUM, coarser: null });
  assert(actualMedium); assert.strictEqual(actualMedium.asset, prepared.levels.MEDIUM); assert.equal(actualMedium.level, "MEDIUM");
  assert.equal(skyTargetOpticalFrame({ ...data, publication: { ...prepared, imageVersion: "foreign-v1" } as any }), null);
});
