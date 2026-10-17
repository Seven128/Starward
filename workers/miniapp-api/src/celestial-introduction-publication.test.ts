import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { deepSkyRowByReference } from "@starward/astronomy-core/deep-sky-catalog";
import { parseChineseIntroductionPublication, parseChineseIntroductionIndex,
  createChineseIntroductionLookup, publishedStarIntroduction, publishedBodyIntroduction, publishedDeepSkyIntroduction } from "./celestial-object-introductions.ts";
import { CHINESE_INTRODUCTION_PUBLICATION } from "./celestial-object-introductions.ts";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { CelestialObjectSearchService } from "./celestial-object-search.ts";

const asset = (file: string) => readFileSync(new URL(`../assets/${file}`, import.meta.url));
const packBytes = asset(CHINESE_INTRODUCTION_PUBLICATION.file);
const indexBytes = asset("celestial-object-introductions.index.json");
const pack = JSON.parse(packBytes.toString("utf8"));
const encode = (value: unknown) => Buffer.from(JSON.stringify(value));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("derived admission covers every existing body, deep-sky and stellar row without changing facts or prose", () => {
  const index = parseChineseIntroductionIndex(indexBytes), rows = parseChineseIntroductionPublication(packBytes);
  assert.equal(rows.size, 536);
  const retainedBytes = asset("celestial-object-introductions.zh-cn.v78.json");
  assert.equal(hash(retainedBytes), "98162694394a909b6905244ccc41d85f9f703e7a18175eee759f2fe02b549fe3");
  const retained = parseChineseIntroductionPublication(retainedBytes, hash(retainedBytes));
  assert.equal(retained.size, 529);
  for (const [reference, row] of retained) assert.deepEqual(rows.get(reference), row, reference);
  assert.deepEqual([...index], [...rows.keys()].sort());
  for (const [reference, row] of rows) {
    if (reference.startsWith("HR:")) {
      for (const version of ["bsc5p-bright-stars.v2", "bsc5p-bright-stars.v3"] as const) {
        const catalogRow = loadBsc5pStarCatalog(version).rows.find(star => star.sourceId === reference)!;
        assert(catalogRow, `${version}: ${reference}`);
        const actual = publishedStarIntroduction(catalogRow);
        assert.equal(actual?.introduction, row.introduction, reference);
        assert.deepEqual(actual?.source, row.source, reference);
        assert.throws(() => publishedStarIntroduction({ ...catalogRow, hd: "999999" }), /identity_mismatch/u);
      }
    } else if (reference.startsWith("M:") || reference.startsWith("NGC:")) {
      const catalogRow = deepSkyRowByReference(reference)!;
      assert(catalogRow, reference);
      const actual = publishedDeepSkyIntroduction(catalogRow);
      assert.equal(actual?.introduction, row.introduction, reference);
      assert.deepEqual(actual?.source, row.source, reference);
    } else {
      const actual = publishedBodyIntroduction(reference);
      assert.equal(actual?.introduction, row.introduction, reference);
      assert.deepEqual(actual?.source, row.source, reference);
    }
  }
  assert.equal(publishedStarIntroduction(loadBsc5pStarCatalog("bsc5p-bright-stars.v3").rows.find(row => row.sourceId === "HR:3207")!), null);
});

test("hash, membership and publication binding reject corrupted or conflicting indices", () => {
  assert.throws(() => parseChineseIntroductionIndex(Buffer.concat([indexBytes, Buffer.from(" ")])), /index_hash_mismatch/u);
  const original = JSON.parse(indexBytes.toString("utf8"));
  const mutations = [
    (row: any) => { row.publication.sha256 = "0".repeat(64); },
    (row: any) => { row.publication.file = "../../another.json"; },
    (row: any) => { row.publication.bytes--; },
    (row: any) => { row.references.push(row.references[0]); },
    (row: any) => { row.references.reverse(); },
    (row: any) => { row.references[0] = "HR:0"; },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(original); mutate(candidate);
    const bytes = encode(candidate);
    assert.throws(() => parseChineseIntroductionIndex(bytes, hash(bytes)), /index_invalid/u);
  }
});

test("the actual lazy lookup retries failed reads and hashes, preserves unknown identities and clones cached results", () => {
  let indexReads = 0, publicationReads = 0, badIndex = true, badPublication = true;
  const lookup = createChineseIntroductionLookup(
    () => { publicationReads++; if (badPublication) return Buffer.concat([packBytes, Buffer.from(" ")]); return packBytes; },
    () => { indexReads++; if (badIndex) throw Error("index_read_unavailable"); return indexBytes; },
  );
  assert.throws(() => lookup("HR:7557"), /index_read_unavailable/u);
  assert.equal(publicationReads, 0);
  badIndex = false;
  assert.equal(lookup("HR:3207"), null); // Existing absent prose does not read a failed publication.
  assert.equal(indexReads, 2); assert.equal(publicationReads, 0);
  assert.throws(() => lookup("HR:7557"), /publication_hash_mismatch/u);
  badPublication = false;
  const recovered = lookup("HR:7557")!;
  assert.equal(recovered.introduction, pack.rows.find((row: any) => row.reference === "HR:7557").introduction);
  recovered.introduction = "mutated caller";
  Reflect.set(recovered.source.attribution!.statements, 0, "mutated caller");
  const next = lookup("HR:7557")!;
  assert.notEqual(next.introduction, recovered.introduction);
  assert.notEqual(next.source.attribution!.statements[0], recovered.source.attribution!.statements[0]);
  assert.equal(indexReads, 2); assert.equal(publicationReads, 2);
});

test("legacy editions retain their exact translation and missing-HIP boundaries", () => {
  for (const version of [2, 6, 7, 24, 25, 72, 73]) {
    const bytes = asset(`celestial-object-introductions.zh-cn.v${version}.json`);
    assert(parseChineseIntroductionPublication(bytes, hash(bytes)).size > 0, `legacy ${version}`);
  }
  for (const edition of ["1", String(Number(CHINESE_INTRODUCTION_PUBLICATION.version.split(".v")[1]) + 1), "02", "25junk"]) {
    const value = { ...pack, version: `starward-celestial-introductions.zh-cn.v${edition}` };
    const bytes = encode(value);
    assert.throws(() => parseChineseIntroductionPublication(bytes, hash(bytes)), /publication_invalid/u);
  }
  const translated = pack.rows.find((row: any) => row.sourceLanguage === "en");
  const missingHip = pack.rows.find((row: any) => row.identity && "hr" in row.identity && row.identity.hip === null);
  assert(translated && missingHip);
  for (const [row, before, admitted] of [[translated, 24, 25], [missingHip, 6, 7]] as const) {
    const candidate = { ...pack, rows: [row] };
    const oldBytes = encode({ ...candidate, version: `starward-celestial-introductions.zh-cn.v${before}` });
    assert.throws(() => parseChineseIntroductionPublication(oldBytes, hash(oldBytes)), /row_invalid/u);
    const currentBytes = encode({ ...candidate, version: `starward-celestial-introductions.zh-cn.v${admitted}` });
    assert.equal(parseChineseIntroductionPublication(currentBytes, hash(currentBytes)).size, 1);
  }
});

test("reviewed batch reaches shared search and information, preserves facts and recovers failed prose", () => {
  const batches = [
    { file: "content-reviewed-translations-2026-10-11-r2.json", size: 46 },
    { file: "content-reviewed-recovery-2026-10-11-draft.json", size: 224 },
    { file: "content-reviewed-components-2026-10-11.json", size: 5 },
    { file: "content-reviewed-system-identifiers-2026-10-11.json", size: 2 },
  ].map(({ file, size }) => {
    const declaration = JSON.parse(readFileSync(new URL("../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/" + file, import.meta.url), "utf8"));
    const preflight = JSON.parse(readFileSync(new URL("../../../" + declaration.preflight.path, import.meta.url), "utf8"));
    assert.equal(declaration.rows.length, size); assert.equal(preflight.candidates.length, size);
    return { declaration, preflight };
  });
  const reviewedRows = batches.flatMap(batch => batch.declaration.rows);
  const actualSources = new Map<string, string>(batches.flatMap(batch =>
    batch.preflight.candidates.map((row: any) => [row.reference, row.actualHttpRetrievedAt] as [string, string])));
  const expected: { reference: string; query: string; meaning: RegExp | string; retrievedAt: string | null; hd?: string }[] = [
    { reference: "HR:5359", query: "室女座λ", meaning: /双星.*金属线A型.*名称专指.*A分量/u, retrievedAt: null },
    { reference: "HR:4932", query: "太微左垣四", meaning: /G型巨星.*黄色/u, retrievedAt: null },
    { reference: "HR:1829", query: "天兔座β", meaning: /亮巨星.*物理双星.*不确定性/u, retrievedAt: null },
    { reference: "HR:8502", query: "杜鹃座α", meaning: /光谱双星.*K型巨星.*不确定性/u, retrievedAt: null },
    ...reviewedRows.map((row: any) => ({ reference: row.reference, query: row.aliases[0], meaning: row.introduction,
      retrievedAt: actualSources.get(row.reference)!, hd: row.identity.hd })),
  ];
  const search = new CelestialObjectSearchService(), details = new CelestialObjectInformationService();
  const basic = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, () => null);
  for (const { reference, query, meaning, retrievedAt, hd } of expected) {
    for (const version of ["bsc5p-bright-stars.v2", "bsc5p-bright-stars.v3"] as const) {
      const hit = search.search(query, 50, version).data.results.find(row => row.reference === reference);
      assert(hit, query);
      const current = details.get(reference, "zh-CN", version), old = basic.get(reference, "zh-CN", version);
      assert.equal(current.data.contentState, "READY");
      if (typeof meaning === "string") assert.equal(current.data.introduction, meaning, reference);
      else assert.match(current.data.introduction!, meaning);
      assert.deepEqual(current.data.facts, old.data.facts); assert.deepEqual(current.data.aliases, hit.aliases);
      assert(old.data.aliases.every(alias => current.data.aliases.includes(alias)));
      assert.notEqual(current.data.contentRevision, old.data.contentRevision);
      const source = current.sources.find(row => row.provider === "Wikipedia contributors")!;
      assert(source?.sourceUrl.includes("oldid=")); assert.equal(source.license, "CC-BY-SA-4.0");
      assert.equal(source.retrievedAt, retrievedAt); assert.equal(source.confidence, null);
      assert(source.attribution!.statements.some(statement => statement.includes(source.licenseUrl)));
      if (retrievedAt) assert(!source.limitations.some(value => /mtime|取回时刻保持未记录/u.test(value)));
      if (hd) assert(search.search(`HD ${hd}`, 50, version).data.results.some(row => row.reference === reference));
      assert.deepEqual(current.sources.filter(row => row.provider !== "Wikipedia contributors"), old.sources);
    }
  }
  // Prose-read recovery is shared; one new batch member exercises this mechanism.
  const reference = "HR:7116";
  let unavailable = true;
  const recovering = new CelestialObjectInformationService(undefined, undefined, undefined, undefined,
    row => { if (unavailable && row.sourceId === reference) throw Error("fixed_prose_unavailable"); return publishedStarIntroduction(row); });
  const failed = recovering.get(reference, "zh-CN", "bsc5p-bright-stars.v3");
  assert.equal(failed.dataState, "PARTIAL"); assert.equal(failed.data.contentState, "BASIC_ONLY");
  assert.equal(failed.data.introduction, null); assert(failed.warnings.includes("celestial_introduction_publication_unavailable"));
  unavailable = false;
  const recovered = recovering.get(reference, "zh-CN", "bsc5p-bright-stars.v3");
  assert.equal(recovered.dataState, "FRESH"); assert.equal(recovered.data.contentState, "READY");
  assert.deepEqual(recovered.data.facts, failed.data.facts);
  assert(failed.data.aliases.every(alias => recovered.data.aliases.includes(alias)));
  assert.notEqual(recovered.data.contentRevision, failed.data.contentRevision);
  assert.equal(recovering.get("HR:3207", "zh-CN", "bsc5p-bright-stars.v3").data.contentState, "BASIC_ONLY");
});
