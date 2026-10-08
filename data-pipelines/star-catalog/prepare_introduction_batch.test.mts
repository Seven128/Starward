import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadBsc5pStarCatalog } from "../../packages/astronomy-core/src/bsc5p-catalog.ts";
import { prepareIntroductionInputs, collectCachedIntroductionInputs, prepareCachedIntroductionInputs } from "./prepare_introduction_batch.mts";
import { qualifiedBscReferences, enrichChineseAliasPublication } from "./enrich_wikidata_chinese_aliases.mjs";

const fixture = JSON.parse(await readFile(new URL("../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/chinese-vindemiatrix-text-inspection-2026-10-07.json", import.meta.url), "utf8"));
const root = new URL("../../", import.meta.url);
const catalog = loadBsc5pStarCatalog("bsc5p-bright-stars.v3");
const sourceBytes = new Map<string, Buffer>();
for (const pin of [fixture.terms, ...fixture.rows.map((row: any) => row.source), ...fixture.entities.map((row: any) => row.source)])
  sourceBytes.set(pin.path, await readFile(new URL(pin.path, root)));
const read = async (pin: { path: string }) => sourceBytes.get(pin.path)!;
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("one batch re-reads real fixed text and exact catalog identities without publishing prose", async () => {
  const result = await prepareIntroductionInputs(fixture, catalog, read);
  assert.deepEqual(result.exceptions, []);
  assert.deepEqual(result.candidates.map(row => row.reference).sort(), ["HR:1829", "HR:4932", "HR:8502"]);
  for (const row of result.candidates) {
    const original = fixture.rows.find((input: any) => input.sourceUrl === row.article.sourceUrl);
    assert.deepEqual(row.sourceParagraphs, original.paragraphs);
    assert.equal(row.article.revision, original.revision);
    assert.equal(row.entity.id, original.entityId);
    assert.equal(row.state, "TEXT_REVIEW_REQUIRED");
    assert.match(row.sourceTimeMeaning, /mtime.*not.*HTTP/u);
    const star = catalog.rows.find(star => star.sourceId === row.reference)!;
    assert.deepEqual(row.identity, { hr: star.hr, hd: star.hd, hip: star.hip });
  }
  assert.equal(result.newProseEdition, false); assert.equal(result.translatedProse, 0);
});

test("one corrupt source is isolated while valid independent rows remain", async () => {
  const invalid = structuredClone(fixture);
  invalid.rows[0].source.sha256 = "0".repeat(64);
  const result = await prepareIntroductionInputs(invalid, catalog, read);
  assert.equal(result.status, "PARTIAL_INPUTS_PREPARED");
  assert.equal(result.exceptions.length, 1);
  assert.match(result.exceptions[0]!.reason, /source_pin_mismatch/u);
  assert.deepEqual(result.candidates.map(row => row.reference).sort(), ["HR:1829", "HR:8502"]);
});

test("article URL, revision, entity and real infobox identity cannot silently join another object", async () => {
  for (const mutate of [
    (input: any) => { input.rows[0].sourceUrl = input.rows[0].sourceUrl.replace("oldid=", "oldid=1&extra="); },
    (input: any) => { input.rows[0].revision = "1"; input.rows[0].sourceUrl = input.rows[0].sourceUrl.replace(/oldid=\d+/u, "oldid=1"); },
    (input: any) => { input.rows[0].entityId = input.entities[1].id; },
  ]) {
    const invalid = structuredClone(fixture); mutate(invalid);
    const result = await prepareIntroductionInputs(invalid, catalog, read);
    assert.equal(result.candidates.length, 2); assert.equal(result.exceptions.length, 1);
  }
  const changed = structuredClone(fixture), original = sourceBytes.get(changed.rows[0].source.path)!;
  assert(original.toString("utf8").includes("113226"));
  const wrong = Buffer.from(original.toString("utf8").replaceAll("113226", "113227"));
  changed.rows[0].source.bytes = wrong.length; changed.rows[0].source.sha256 = hash(wrong);
  const result = await prepareIntroductionInputs(changed, catalog,
    async pin => pin.path === changed.rows[0].source.path ? wrong : read(pin));
  assert.equal(result.candidates.length, 2);
  assert.match(result.exceptions[0]!.reason, /article_catalog_identity_mismatch/u);
});

test("qualified HR ambiguity and shared terms failure remain failed", async () => {
  const entity = JSON.parse(sourceBytes.get(fixture.entities[0].source.path)!.toString("utf8")).entities[fixture.entities[0].id];
  const qualified = entity.claims.P528.find((claim: any) => claim.qualifiers?.P972?.some((q: any) => q.datavalue?.value?.id === "Q499138"));
  assert(qualified); const conflicting = structuredClone(qualified); conflicting.mainsnak.datavalue.value = "HR 1829";
  entity.claims.P528.push(conflicting);
  assert.equal(qualifiedBscReferences(entity).size, 2);
  const changed = structuredClone(fixture), wrong = Buffer.from(JSON.stringify({ entities: { [entity.id]: entity } }));
  changed.entities[0].source.bytes = wrong.length; changed.entities[0].source.sha256 = hash(wrong);
  const result = await prepareIntroductionInputs(changed, catalog,
    async pin => pin.path === changed.entities[0].source.path ? wrong : read(pin));
  assert.equal(result.candidates.length, 2); assert.match(result.exceptions[0]!.reason, /qualified_hr_ambiguous/u);
  const badTerms = structuredClone(fixture); badTerms.terms.sha256 = "0".repeat(64);
  await assert.rejects(prepareIntroductionInputs(badTerms, catalog, read), /source_pin_mismatch/u);
  const duplicated = structuredClone(fixture);
  duplicated.rows.push({ ...duplicated.rows[0], key: "second-source-for-same-object" });
  const duplicateResult = await prepareIntroductionInputs(duplicated, catalog, read);
  assert.equal(duplicateResult.candidates.length, 2);
  assert.equal(duplicateResult.exceptions.length, 2);
  assert(duplicateResult.exceptions.every(row => row.reason.includes("duplicate_object_sources")));
});

test("shared exact-HR lookup reproduces the entire currently admitted CC0 alias publication", async () => {
  const base = await readFile(new URL("workers/miniapp-api/assets/celestial-names-v2/chinese-bright-star-aliases.v2.json", root));
  const manifest = JSON.parse(await readFile(new URL("workers/miniapp-api/assets/celestial-names-v2/publication.json", root), "utf8"));
  const entity = await readFile(new URL(".codex/work-items/cloud-sky-native-2026-09-22/evidence/wikidata-Q12975-2026-09-30.json", root));
  const adopted = await readFile(new URL("workers/miniapp-api/assets/celestial-names-v3/chinese-bright-star-aliases.v3.json", root));
  const provenance = await readFile(new URL("workers/miniapp-api/assets/celestial-names-v3/source-provenance.json", root));
  const currentManifest = JSON.parse(await readFile(new URL("workers/miniapp-api/assets/celestial-names-v3/publication.json", root), "utf8"));
  const result = enrichChineseAliasPublication(base, manifest, entity, currentManifest.sourceProvenance.entity.retrievedAt);
  assert(result.assetBytes.equals(adopted));
  assert(result.provenanceBytes.equals(provenance));
  assert.deepEqual(result.manifest, currentManifest);
});

test("cached metadata deduplicates immutable sources without following history and retains admitted prose independently", async () => {
  const collection = await collectCachedIntroductionInputs(fixture, [
    { path: "first-receipt", value: fixture }, { path: "same-cached-data", value: fixture },
  ], read);
  assert.equal(collection.inspection.rows.length, 3); assert.equal(collection.duplicates, 3);
  assert.equal(collection.historyLinksFollowed, 0); assert.deepEqual(collection.exceptions, []);
  const result = await prepareIntroductionInputs(collection.inspection, catalog, read);
  assert.equal(result.candidates.length, 3); assert.deepEqual(result.exceptions, []);
  const newInputFailure = structuredClone(fixture); newInputFailure.rows[0].source.sha256 = "0".repeat(64);
  const retained = await prepareIntroductionInputs(newInputFailure, catalog, read, new Set(["HR:4932"]));
  assert.equal(retained.candidates.length, 2); assert.deepEqual(retained.exceptions, []);
  assert.equal(retained.retainedExisting[0]!.reference, "HR:4932");
  assert.match(retained.retainedExisting[0]!.meaning, /new article is not.*qualified/u);
});

test("a real publisher redirect retains fixed revision, actual title, entity and exact catalog identity", async () => {
  const redirected = JSON.parse(await readFile(new URL(".codex/work-items/cloud-sky-native-2026-09-22/evidence/chinese-alpheratz-text-inspection-2026-10-07.json", root), "utf8"));
  const row = redirected.rows.find((row: any) => row.title === "Alpheratz");
  assert(row); assert.equal(new URL(row.sourceUrl).searchParams.get("title"), "Alpha_Andromedae");
  const input = { ...fixture, rows: [row], entities: redirected.entities };
  const actualRead = async (pin: { path: string }) => readFile(new URL(pin.path, root));
  const result = await prepareIntroductionInputs(input, catalog, actualRead);
  assert.deepEqual(result.exceptions, []); assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]!.reference, "HR:15");
  assert.deepEqual(result.candidates[0]!.sourceParagraphs, row.paragraphs);
  const wrongRevision = structuredClone(input); wrongRevision.rows[0].revision = "1";
  wrongRevision.rows[0].sourceUrl = wrongRevision.rows[0].sourceUrl.replace(/oldid=\d+/u, "oldid=1");
  const rejected = await prepareIntroductionInputs(wrongRevision, catalog, actualRead);
  assert.equal(rejected.candidates.length, 0); assert.match(rejected.exceptions[0]!.reason, /article_binding_mismatch/u);
});

test("missing legacy metadata is recovered from pinned producer configuration, without guessing identities", async () => {
  const missing = structuredClone(fixture); delete missing.rows[0].entityId;
  const result = await collectCachedIntroductionInputs(fixture, [{ path: "legacy-data", value: missing }], read);
  assert.equal(result.recoveredBindings.length, 1);
  assert.equal(result.inspection.rows[0]!.entityId, fixture.rows[0].entityId);
  assert.equal(missing.rows[0].entityId, undefined);
  const corrupted = structuredClone(missing); corrupted.rows[0].source.sha256 = "0".repeat(64);
  const rejected = await collectCachedIntroductionInputs(fixture, [{ path: "bad-legacy-data", value: corrupted }], read);
  assert.equal(rejected.recoveredBindings.length, 0); assert.equal(rejected.inspection.rows.length, 2);
  assert.match(rejected.exceptions[0]!.reason, /source_pin_mismatch/u);
});

test("a real system/component cache conflict stays partial without discarding independent admitted prose", async () => {
  const arkab = JSON.parse(await readFile(new URL(".codex/work-items/cloud-sky-native-2026-09-22/evidence/chinese-arkab-text-inspection-2026-10-07.json", root), "utf8"));
  const actualRead = async (pin: { path: string }) => readFile(new URL(pin.path, root));
  const collection = await collectCachedIntroductionInputs(fixture, [{ path: "arkab-cache", value: arkab }], actualRead);
  assert.equal(collection.inspection.rows.length, 1);
  assert.equal(collection.exceptions.length, 1);
  assert.equal(collection.exceptions[0]!.title, "Beta1 Sagittarii");
  assert.equal(collection.recoveredBindings.find(row => row.title === "Beta1 Sagittarii")!.entityId, "Q66477133");
  assert(!arkab.entities.some((row: any) => row.id === "Q66477133"));
  const result = await prepareCachedIntroductionInputs(collection, catalog, actualRead, new Set(["HR:7343"]));
  assert.equal(result.status, "PARTIAL_INPUTS_PREPARED");
  assert.equal(result.candidates.length, 0);
  assert.equal(result.retainedExisting.length, 1);
  assert.equal(result.retainedExisting[0]!.reference, "HR:7343");
  const onlyConflict = { ...arkab, rows: [arkab.rows[0]] };
  const unsupported = await collectCachedIntroductionInputs(fixture, [{ path: "only-conflict", value: onlyConflict }], actualRead);
  const empty = await prepareCachedIntroductionInputs(unsupported, catalog, actualRead);
  assert.equal(empty.status, "PARTIAL_INPUTS_PREPARED");
  assert.equal(empty.candidates.length, 0); assert.equal(empty.retainedExisting.length, 0);
  assert.equal(empty.collection.exceptions.length, 1);
  assert.equal(arkab.rows[0].entityId, undefined);
});

test("a license label alone cannot qualify a different license link or an unrelated terms source", async () => {
  const changed = structuredClone(fixture), original = sourceBytes.get(changed.rows[0].source.path)!;
  const licensePath = "/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License";
  assert(original.toString("utf8").includes(licensePath));
  const wrong = Buffer.from(original.toString("utf8").replaceAll(licensePath, "/wiki/Different_license"));
  changed.rows[0].source.bytes = wrong.length; changed.rows[0].source.sha256 = hash(wrong);
  const result = await prepareIntroductionInputs(changed, catalog,
    async pin => pin.path === changed.rows[0].source.path ? wrong : read(pin));
  assert.equal(result.candidates.length, 2);
  assert.match(result.exceptions[0]!.reason, /article_license_missing/u);
  const wrongTerms = { ...fixture, termsUrl: "https://example.invalid/terms" };
  await assert.rejects(prepareIntroductionInputs(wrongTerms, catalog, read), /terms_invalid/u);
});
