import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { opticalPublicationReference, assertSdssOpticalManifest, assertSdssScienceOpticalManifest, sdssOpticalPublication,
  sdssScienceOpticalPublicationHash, type SdssOpticalLevel, type SdssOpticalManifest,
  type SdssScienceOpticalManifest } from "@starward/miniapp-contracts";
import { createSyntheticSdssSciencePublication } from "../../../../../workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts";
import type { SkyArtworkLevelsContribution, SkyArtworkLevelsDraw } from "./sky-artwork-level-composition";
import { registerSkyNativeImageLifetime, skyNativeImageIsCurrent } from "./sky-artwork-loader";
import { skySdssOpticalFrame, skyPreparedOpticalFrame } from "./sky-sdss-optical-frame";
import { completeLegacySkyOptical, completeScienceSkyOptical, completePreparedSkyOptical, liveSkyOpticalCompletion,
  sameSkyOpticalCompletion, sameSkyOpticalInput } from "./sky-sdss-optical-completion";

import * as exactIdentity from "./sky-target-optical-identity";
import { preparedOpticalTestPublication } from "./sky-prepared-optical-test-support";
const preparedFixture = preparedOpticalTestPublication("completion"), prepared = preparedFixture.publication;

// Portable admission fixture by default; the bounded run supplies the existing
// real writer directory. Neither input adopts imagery or executes native/GPU.
const supplied = process.env.CLOUD_SKY_SCIENCE_PUBLICATION_PATH;
const generated = supplied ? undefined : mkdtempSync(join(tmpdir(), "starward-science-completion-"));
const structural = generated ? createSyntheticSdssSciencePublication(generated) : undefined;
const raw = JSON.parse(readFileSync(join(supplied ?? generated!, "manifest.json"), "utf8"));
const admitted: SdssScienceOpticalManifest = supplied ? raw : { ...raw, publicationHash: structural!.expectedHash,
  levels: Object.fromEntries(Object.entries(raw.levels).map(([level, asset]) => [level, { ...(asset as object),
    downloadUrl: `/v2/sky/sdss-optical/${structural!.expectedHash}/${(asset as any).file}` }])) };
assertSdssScienceOpticalManifest(admitted, "M:51", admitted.publicationHash);
const freeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const publication = freeze(admitted);
const replacement = structuredClone(publication);
replacement.publicationId += ".completion-replacement";
replacement.publicationHash = sdssScienceOpticalPublicationHash(replacement);
Object.values(replacement.levels).forEach(asset => {
  asset.downloadUrl = `/v2/sky/sdss-optical/${replacement.publicationHash}/${asset.file}`;
});
assertSdssScienceOpticalManifest(replacement, "M:51", replacement.publicationHash); freeze(replacement);

const old = JSON.parse(readFileSync(new URL("../../../../../workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json",
  import.meta.url), "utf8"));
const oldHash = sdssOpticalPublication("M:51")!.publicationHash;
const legacyPublication: SdssOpticalManifest = { ...old, publicationHash: oldHash,
  levels: Object.fromEntries(Object.entries(old.levels).map(([level, asset]) => [level, { ...(asset as object),
    downloadUrl: `/v2/sky/sdss-optical/${oldHash}/${(asset as any).file}` }])) };
assertSdssOpticalManifest(legacyPublication, "M:51");

const retirements: Array<() => void> = [];
function world(level: SdssOpticalLevel = "DETAIL", parentLevel: SdssOpticalLevel | null = "MEDIUM") {
  const image = {}, parent = {};
  const retireFine = registerSkyNativeImageLifetime(image, () => true);
  const retireCoarse = registerSkyNativeImageLifetime(parent, () => true);
  retirements.push(retireFine, retireCoarse);
  const frame = skySdssOpticalFrame({ publication, image, renderedLevel: level, renderedAsset: publication.levels[level],
    coarser: parentLevel ? { image: parent, level: parentLevel, asset: publication.levels[parentLevel] } : null });
  assert(frame && "sciencePublication" in frame);
  return { frame, image, parent, retireFine, retireCoarse };
}
const draw: SkyArtworkLevelsDraw = { submitted: true, finePrepared: true, coarsePrepared: true };
const receipt = (changes: Partial<SkyArtworkLevelsContribution> = {}): SkyArtworkLevelsContribution => ({
  completed: true, qualification: { fine: "has", coarse: "has", any: "has" },
  finePhoto: "positive", coarsePhoto: "positive", ...changes,
});

test("actual positive fine and coarse keep all exact fields and an immutable receipt snapshot", () => {
  const w = world(), borrowed = receipt(), completed = completeScienceSkyOptical(w.frame, draw, borrowed);
  assert(completed);
  assert.strictEqual(completed.sciencePublication, publication);
  assert.equal(completed.reference, publication.objectRef); assert.equal(completed.publicationHash, publication.publicationHash);
  assert.deepEqual(completed.participatingFields.map(field => [field.slot, field.image, field.level, field.asset]),
    [["fine", w.image, "DETAIL", publication.levels.DETAIL], ["coarse", w.parent, "MEDIUM", publication.levels.MEDIUM]]);
  assert(Object.isFrozen(completed)); assert(Object.isFrozen(completed.participatingFields));
  completed.participatingFields.forEach(field => assert(Object.isFrozen(field)));
  assert(Object.isFrozen(completed.receipt)); assert(Object.isFrozen(completed.receipt.qualification));
  (borrowed as any).finePhoto = "unknown"; (borrowed.qualification as any).fine = "empty";
  assert.equal(completed.receipt.finePhoto, "positive"); assert.equal(completed.receipt.qualification.fine, "has");
  assert.throws(() => { (completed.participatingFields as any).push({}); }, TypeError);
  assert.throws(() => { (completed.participatingFields[0] as any).level = "OVERVIEW"; }, TypeError);
});

test("actual fallback primary and unprepared fine never become the requested finer field", () => {
  const medium = world("MEDIUM", "OVERVIEW");
  const retained = completeScienceSkyOptical(medium.frame, draw, receipt()); assert(retained);
  assert.deepEqual(retained.participatingFields.map(field => [field.slot, field.level, field.asset]),
    [["fine", "MEDIUM", publication.levels.MEDIUM], ["coarse", "OVERVIEW", publication.levels.OVERVIEW]]);
  const w = world();
  const coarse = completeScienceSkyOptical(w.frame, { ...draw, finePrepared: false }, receipt({ finePhoto: "unknown",
    qualification: { fine: "empty", coarse: "has", any: "has" } })); assert(coarse);
  assert.equal(coarse.participatingFields.length, 1); assert.equal(coarse.participatingFields[0]!.slot, "coarse");
  assert.strictEqual(coarse.participatingFields[0]!.asset, publication.levels.MEDIUM);
});

test("unfinished, unsubmitted, foreign ready descriptors and unprepared positive receipts are rejected", () => {
  const w = world(), parent = w.frame.coarser!;
  for (const frame of [{ ...w.frame, asset: { ...w.frame.asset } },
    { ...w.frame, reference: "M:63" }, { ...w.frame, publicationHash: replacement.publicationHash },
    { ...w.frame, coarser: { ...parent, asset: { ...parent.asset } } },
    { ...w.frame, fieldDegrees: w.frame.fieldDegrees + .001 }])
    assert.equal(completeScienceSkyOptical(frame, draw, receipt()), null);
  assert.equal(completeScienceSkyOptical(w.frame, draw, receipt({ completed: false })), null);
  assert.equal(completeScienceSkyOptical(w.frame, { ...draw, submitted: false }, receipt()), null);
  assert.equal(completeScienceSkyOptical(w.frame, { ...draw, finePrepared: false }, receipt()), null);
  assert.equal(completeScienceSkyOptical(w.frame, { ...draw, coarsePrepared: false }, receipt()), null);
  assert.equal(completeScienceSkyOptical({ ...w.frame, coarser: null }, draw, receipt()), null);
  for (const qualification of [{ fine: "empty", coarse: "has", any: "has" },
    { fine: "has", coarse: "empty", any: "has" }, { fine: "has", coarse: "has", any: "empty" }] as const)
    assert.equal(completeScienceSkyOptical(w.frame, draw, receipt({ qualification })), null,
      "positive photo cannot coexist with an explicit empty selected slot/whole group");
});

test("valid black and unknown photo preserve observation without manufacturing live photo credit", () => {
  const w = world();
  const black = completeScienceSkyOptical(w.frame, draw, receipt({ finePhoto: "unknown", coarsePhoto: "unknown",
    qualification: { fine: "has", coarse: "empty", any: "has" } })); assert(black);
  assert.equal(black.receipt.qualification.any, "has"); assert.equal(black.participatingFields.length, 0);
  assert.equal(liveSkyOpticalCompletion(black), null);
  const unknown = completeScienceSkyOptical(w.frame, draw, receipt({ finePhoto: "unknown", coarsePhoto: "unknown",
    qualification: { fine: "unknown", coarse: "unknown", any: "unknown" } })); assert(unknown);
  assert.equal(unknown.receipt.qualification.any, "unknown"); assert.equal(liveSkyOpticalCompletion(unknown), null);
  assert.equal(sameSkyOpticalCompletion(black, unknown), false, "unknown is not eligible black or empty");
  const uncertainQualification = completeScienceSkyOptical(w.frame, draw, receipt({
    qualification: { fine: "unknown", coarse: "unknown", any: "unknown" } })); assert(uncertainQualification);
  assert.equal(uncertainQualification.participatingFields.length, 2,
    "UNKNOWN alone cannot invalidate independently positive photo evidence or be rewritten as EMPTY");
});

test("native retirement narrows independent live fields while latest metadata cannot relabel completion", () => {
  const w = world(), completed = completeScienceSkyOptical(w.frame, draw, receipt()); assert(completed);
  assert.strictEqual(liveSkyOpticalCompletion(completed), completed);
  const newer = skySdssOpticalFrame({ publication: replacement, image: w.image, renderedLevel: "DETAIL",
    renderedAsset: replacement.levels.DETAIL,
    coarser: { image: w.parent, level: "MEDIUM", asset: replacement.levels.MEDIUM } }); assert(newer);
  assert.equal(sameSkyOpticalInput(w.frame, newer), false);
  w.retireFine();
  const live = liveSkyOpticalCompletion(completed); assert(live && live.kind === "science");
  assert.equal(live.participatingFields.length, 1); assert.equal(live.participatingFields[0]!.slot, "coarse");
  assert.strictEqual(live.participatingFields[0]!.image, w.parent);
  assert.strictEqual(live.participatingFields[0]!.asset, publication.levels.MEDIUM);
  assert.strictEqual(live.sciencePublication, publication); assert.equal(live.publicationHash, publication.publicationHash);
  assert.equal(completed.participatingFields.length, 2, "historical immutable observation is unchanged");
  assert.equal(sameSkyOpticalCompletion(completed, live), false);
  const afterRetire = completeScienceSkyOptical(w.frame, draw, receipt()); assert(afterRetire);
  assert.equal(afterRetire.participatingFields.length, 1, "retirement is also checked at construction");
  w.retireCoarse(); assert.equal(liveSkyOpticalCompletion(completed), null);
});

test("legacy completion keeps actual selected parent and original identity with no science reinterpretation", () => {
  const w = world();
  const frame = skySdssOpticalFrame({ publication: legacyPublication, image: w.image, renderedLevel: "DETAIL",
    renderedAsset: legacyPublication.levels.DETAIL, coarser: { image: w.parent, level: "MEDIUM",
      asset: legacyPublication.levels.MEDIUM } }); assert(frame);
  const actual = completeLegacySkyOptical(frame, w.parent); assert(actual);
  assert.equal(actual.kind, "legacy"); assert.equal(actual.field.level, "MEDIUM");
  assert.strictEqual(actual.field.image, w.parent); assert.equal(actual.publicationHash, oldHash);
  assert(Object.isFrozen(actual)); assert(Object.isFrozen(actual.field));
  assert.equal(completeLegacySkyOptical(frame, {}), null);
  assert.equal(completeLegacySkyOptical(w.frame, w.image), null);
  assert.equal(completeScienceSkyOptical(frame, draw, receipt()), null);
  w.retireFine(); assert.strictEqual(liveSkyOpticalCompletion(actual), actual);
  w.retireCoarse(); assert.equal(liveSkyOpticalCompletion(actual), null);
});

test("input and completion equality include exact assets, publication and every participating slot/receipt value", () => {
  const w = world(), a = completeScienceSkyOptical(w.frame, draw, receipt()), b = completeScienceSkyOptical(w.frame, draw, receipt());
  assert(a && b); assert.equal(sameSkyOpticalCompletion(a, b), true);
  assert.equal(sameSkyOpticalInput(w.frame, { ...w.frame, coarser: { ...w.frame.coarser! } }), true);
  const parent = w.frame.coarser!;
  for (const changed of [{ ...w.frame, sciencePublication: { ...publication } }, { ...w.frame, asset: { ...w.frame.asset } },
    { ...w.frame, coarser: { ...parent, asset: { ...parent.asset } } }, { ...w.frame, coarser: null },
    { ...w.frame, coarser: { ...parent, image: {} } }, { ...w.frame, coarser: { ...parent, fieldDegrees: .3 } }])
    assert.equal(sameSkyOpticalInput(w.frame, changed), false);
  const legacy = { image: w.image, reference: w.frame.reference, publicationHash: w.frame.publicationHash,
    fieldDegrees: w.frame.fieldDegrees, level: w.frame.level, coarser: parent };
  assert.equal(sameSkyOpticalInput(w.frame, legacy), false);
  for (const changed of [{ ...b, participatingFields: b.participatingFields.slice(1) },
    { ...b, participatingFields: [...b.participatingFields].reverse() }, { ...b, sciencePublication: { ...publication } },
    { ...b, receipt: { ...b.receipt, qualification: { ...b.receipt.qualification, coarse: "empty" as const } } },
    { ...b, receipt: { ...b.receipt, qualification: { ...b.receipt.qualification, fine: "unknown" as const } } },
    { ...b, receipt: { ...b.receipt, qualification: { ...b.receipt.qualification, any: "unknown" as const } } },
    { ...b, receipt: { ...b.receipt, finePhoto: "unknown" as const } },
    { ...b, receipt: { ...b.receipt, coarsePhoto: "unknown" as const } },
    { ...b, participatingFields: [{ ...b.participatingFields[0]!, asset: { ...b.participatingFields[0]!.asset } }, b.participatingFields[1]!] }])
    assert.equal(sameSkyOpticalCompletion(a, changed), false);
  assert.equal(sameSkyOpticalInput(null, undefined), true); assert.equal(sameSkyOpticalCompletion(null, undefined), true);
  assert.equal(sameSkyOpticalInput(w.frame, null), false); assert.equal(sameSkyOpticalCompletion(a, null), false);
});

test("bounded in-memory mutants demonstrate the foreign-asset and native-retirement regression oracles", () => {
  const text = readFileSync(new URL("./sky-sdss-optical-completion.ts", import.meta.url), "utf8");
  const identityText = readFileSync(new URL("./sky-target-optical-identity.ts", import.meta.url), "utf8");
  const compile = (source: string, identity = exactIdentity) => {
    const exports = {} as typeof import("./sky-sdss-optical-completion");
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports,
      require(name: string) {
        if (name === "./sky-artwork-loader") return { skyNativeImageIsCurrent };
        assert.equal(name, "./sky-target-optical-identity"); return identity;
      } });
    return exports;
  };
  const mutate = (from: string, to: string) => {
    assert.equal(text.split(from).length, 2, "mutation must bind exactly one real production expression");
    return compile(text.replace(from, to));
  };
  const w = world(), foreign = { ...w.frame, asset: { ...w.frame.asset } };
  assert.equal(completeScienceSkyOptical(foreign, draw, receipt()), null);
  const expression = "field.asset === publication.levels[field.level] &&";
  assert.equal(identityText.split(expression).length, 2);
  const mutatedIdentity = {} as typeof exactIdentity;
  vm.runInNewContext(ts.transpileModule(identityText.replace(expression, "true &&"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
      exports: mutatedIdentity,
      require(name: string) {
        assert.equal(name, "@starward/miniapp-contracts");
        return { opticalPublicationReference };
      },
    });
  const foreignMutant = compile(text, mutatedIdentity);
  assert.notEqual(foreignMutant.completeScienceSkyOptical(foreign, draw, receipt()), null,
    "the exact foreign descriptor rejection would fail with the identity guard removed");
  const completed = completeScienceSkyOptical(w.frame, draw, receipt()); assert(completed); w.retireFine();
  const actual = liveSkyOpticalCompletion(completed); assert(actual && actual.kind === "science");
  assert.equal(actual.participatingFields.length, 1);
  const staleMutant = mutate("completion.participatingFields.filter(field => skyNativeImageIsCurrent(field.image))",
    "completion.participatingFields.slice()");
  const wrong = staleMutant.liveSkyOpticalCompletion(completed); assert(wrong && wrong.kind === "science");
  assert.equal(wrong.participatingFields.length, 2, "the live coarse-only oracle rejects a retained retired fine field");
});

function preparedWorld(level: SdssOpticalLevel = "DETAIL", parentLevel: SdssOpticalLevel | null = "MEDIUM") {
  const image = {}, parent = {};
  const retireFine = registerSkyNativeImageLifetime(image, () => true), retireCoarse = registerSkyNativeImageLifetime(parent, () => true);
  retirements.push(retireFine, retireCoarse);
  const frame = skyPreparedOpticalFrame({ publication: prepared, image, renderedLevel: level, renderedAsset: prepared.levels[level],
    coarser: parentLevel ? { image: parent, level: parentLevel, asset: prepared.levels[parentLevel] } : null });
  assert(frame); return { frame, image, parent, retireFine, retireCoarse };
}

test("Prepared completion retains its own source and actual fallback descriptors without science or JPEG credit", () => {
  const w = preparedWorld("MEDIUM", "OVERVIEW"), borrowed = receipt();
  const completed = completePreparedSkyOptical(w.frame, draw, borrowed); assert(completed);
  assert.equal(completed.kind, "prepared"); assert.strictEqual(completed.preparedPublication, prepared);
  assert.equal(completed.preparedPublication.master.scientificAvailability, "UNKNOWN");
  assert.equal(completed.preparedPublication.source.credit, prepared.source.credit);
  assert.deepEqual(completed.participatingFields.map(field => [field.slot, field.level, field.asset]),
    [["fine", "MEDIUM", prepared.levels.MEDIUM], ["coarse", "OVERVIEW", prepared.levels.OVERVIEW]]);
  (borrowed as any).finePhoto = "unknown";
  assert.equal(completed.receipt.finePhoto, "positive"); assert(Object.isFrozen(completed.receipt));
  assert.equal(completeScienceSkyOptical(w.frame, draw, receipt()), null);
  assert.equal(completeLegacySkyOptical(w.frame, w.image), null);
  assert.equal(completePreparedSkyOptical(world().frame, draw, receipt()), null);
  w.retireFine(); const live = liveSkyOpticalCompletion(completed); assert(live?.kind === "prepared");
  assert.deepEqual(live.participatingFields.map(field => field.slot), ["coarse"]);
  assert.strictEqual(live.preparedPublication, prepared); assert.strictEqual(live.participatingFields[0]!.image, w.parent);
  assert.equal(completed.participatingFields.length, 2); w.retireCoarse(); assert.equal(liveSkyOpticalCompletion(completed), null);
});

test("Prepared exact identity, expected preparation and positive participation stay separate from geometric coverage", () => {
  const w = preparedWorld(), parent = w.frame.coarser!;
  for (const frame of [{ ...w.frame, asset: { ...w.frame.asset } }, { ...w.frame, reference: "M:63" },
    { ...w.frame, publicationHash: publication.publicationHash }, { ...w.frame, coarser: { ...parent, asset: { ...parent.asset } } },
    { ...w.frame, preparedPublication: { ...prepared, imageVersion: "science-optical-v2" } },
    { ...w.frame, sciencePublication: publication }])
    assert.equal(completePreparedSkyOptical(frame as any, draw, receipt()), null);
  assert.equal(completePreparedSkyOptical(w.frame, { ...draw, finePrepared: false }, receipt()), null);
  assert.equal(completePreparedSkyOptical(w.frame, draw, receipt({ completed: false })), null);
  assert.equal(completePreparedSkyOptical(w.frame, draw, receipt({ qualification: { fine: "empty", coarse: "has", any: "has" } })), null);
  const zero = completePreparedSkyOptical(w.frame, draw, receipt({ finePhoto: "unknown", coarsePhoto: "unknown" })); assert(zero);
  assert.equal(liveSkyOpticalCompletion(zero), null, "geometric support is neither a positive photo nor current credit");
  const after = completePreparedSkyOptical(w.frame, draw, receipt()); assert(after);
  assert.equal(sameSkyOpticalCompletion(after, completePreparedSkyOptical(w.frame, draw, receipt())), true);
  assert.equal(sameSkyOpticalCompletion(after, { ...after, preparedPublication: { ...prepared } }), false);
  assert.equal(sameSkyOpticalInput(w.frame, { ...w.frame }), true);
  assert.equal(sameSkyOpticalInput(w.frame, { ...w.frame, preparedPublication: { ...prepared } }), false);
  assert.equal(sameSkyOpticalInput(w.frame, { ...w.frame, coarser: { ...parent, image: {} } }), false);
  const forgedScience = { ...w.frame, sciencePublication: publication }; delete (forgedScience as any).preparedPublication;
  assert.equal(sameSkyOpticalInput(w.frame, forgedScience as any), false, "identical handles/hash do not change source kind");
});

test.after(() => {
  retirements.forEach(retire => retire());
  preparedFixture.cleanup();
  if (!generated) return;
  assert.equal(dirname(realpathSync(generated)), realpathSync(tmpdir()));
  assert.match(basename(generated), /^starward-science-completion-/u);
  rmSync(generated, { recursive: true }); // Verified owned, regeneratable fixture only.
});
