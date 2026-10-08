import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { deepSkyRowByReference } from "@starward/astronomy-core/deep-sky-catalog";
import { parseChineseIntroductionPublication, parseChineseIntroductionIndex,
  createChineseIntroductionLookup, publishedStarIntroduction, publishedBodyIntroduction, publishedDeepSkyIntroduction } from "./celestial-object-introductions.ts";

const asset = (file: string) => readFileSync(new URL(`../assets/${file}`, import.meta.url));
const packBytes = asset("celestial-object-introductions.zh-cn.v72.json");
const indexBytes = asset("celestial-object-introductions.index.json");
const pack = JSON.parse(packBytes.toString("utf8"));
const encode = (value: unknown) => Buffer.from(JSON.stringify(value));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("derived admission covers every existing body, deep-sky and stellar row without changing facts or prose", () => {
  const index = parseChineseIntroductionIndex(indexBytes), rows = parseChineseIntroductionPublication(packBytes);
  assert.equal(rows.size, 247);
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
  assert.equal(publishedStarIntroduction(loadBsc5pStarCatalog("bsc5p-bright-stars.v3").rows.find(row => row.sourceId === "HR:4932")!), null);
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
  assert.equal(lookup("HR:4932"), null); // Existing absent prose does not read a failed publication.
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
  for (const version of [2, 6, 7, 24, 25, 72]) {
    const bytes = asset(`celestial-object-introductions.zh-cn.v${version}.json`);
    assert(parseChineseIntroductionPublication(bytes, hash(bytes)).size > 0, `legacy ${version}`);
  }
  for (const edition of ["1", "73", "02", "25junk"]) {
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
