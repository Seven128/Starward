import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadBsc5pBrightStarCatalog, loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { loadChineseStarAliases, loadChineseStarAliasesForBase, parseChineseStarAliasPublication } from "./chinese-star-alias-publication.ts";

const directory = new URL("../assets/celestial-names/", import.meta.url);
const bytes = readFileSync(new URL("chinese-bright-star-aliases.v1.json", directory));
const manifest = JSON.parse(readFileSync(new URL("publication.json", directory), "utf8"));
const base = loadBsc5pBrightStarCatalog();

test("fixed CC0 Chinese aliases are hash-bound to BSC identities", () => {
  const publication = loadChineseStarAliases();
  assert.equal(publication.rowCount, 3149);
  assert.deepEqual(publication.aliasesFor("HR:3994"), ["张宿二", "張宿二"]);
  assert.deepEqual(publication.aliasesFor("HR:166"), [], "an ambiguous HR mapping must be excluded");
  assert.deepEqual(publication.aliasesFor("HR:4825"), [], "an ambiguous HR mapping must be excluded");
  assert.equal(publication.source.license, "CC0 1.0");
  assert.throws(() => parseChineseStarAliasPublication(Buffer.from(`${bytes} `), manifest, base),
    /chinese_star_alias_manifest_invalid/);
  assert.throws(() => parseChineseStarAliasPublication(bytes,
    { ...manifest, license: "unknown" }, base), /chinese_star_alias_manifest_invalid/);
  const alteredBase = { ...base, catalogHash: "a".repeat(64) };
  assert.throws(() => parseChineseStarAliasPublication(bytes, manifest, alteredBase),
    /chinese_star_alias_pack_invalid/);
});

test("revised CC0 aliases keep every HR label while binding only to BSC v3", () => {
  const revisedDirectory = new URL("../assets/celestial-names-v2/", import.meta.url);
  const revisedBytes = readFileSync(new URL("chinese-bright-star-aliases.v2.json", revisedDirectory));
  const revisedManifest = JSON.parse(readFileSync(new URL("publication.json", revisedDirectory), "utf8"));
  const revised = parseChineseStarAliasPublication(revisedBytes, revisedManifest, loadBsc5pStarCatalog("bsc5p-bright-stars.v3"));
  const old = loadChineseStarAliases();
  assert.equal(revised.rowCount, old.rowCount);
  assert.notEqual(revised.catalogHash, old.catalogHash);
  assert.deepEqual(revised.aliasesFor("HR:3994"), ["张宿二", "張宿二"]);
  const previousRows = JSON.parse(bytes.toString("utf8")).rows as { reference: string }[];
  for (const row of previousRows) assert.deepEqual(revised.aliasesFor(row.reference), old.aliasesFor(row.reference));
  assert.throws(() => parseChineseStarAliasPublication(revisedBytes, revisedManifest, base),
    /chinese_star_alias_manifest_invalid|chinese_star_alias_pack_invalid/);
  assert.equal(parseChineseStarAliasPublication(revisedBytes, revisedManifest,
    loadBsc5pStarCatalog("bsc5p-bright-stars.v3")).catalogHash, revised.catalogHash);
});

test("common-name enrichment preserves all other HR aliases and binds both source snapshots", () => {
  const publication = loadChineseStarAliasesForBase("bsc5p-bright-stars.v3");
  const directory = new URL("../assets/celestial-names-v3/", import.meta.url);
  const currentBytes = readFileSync(new URL("chinese-bright-star-aliases.v3.json", directory));
  const currentManifest = JSON.parse(readFileSync(new URL("publication.json", directory), "utf8"));
  const provenanceBytes = readFileSync(new URL("source-provenance.json", directory));
  const previousDirectory = new URL("../assets/celestial-names-v2/", import.meta.url);
  const previousBytes = readFileSync(new URL("chinese-bright-star-aliases.v2.json", previousDirectory));
  const previousPack = JSON.parse(previousBytes.toString("utf8"));
  assert.equal(publication.catalogVersion, "wikidata-bsc5p-chinese-aliases.v3");
  assert.deepEqual(publication.aliasesFor("HR:7557"), ["河鼓二", "牛郎星", "天鹰座α"]);
  for (const row of previousPack.rows) {
    if (row.reference !== "HR:7557") assert.deepEqual(publication.aliasesFor(row.reference), row.aliases);
  }
  const sha = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
  assert.equal(currentManifest.sourceSha256, sha(provenanceBytes));
  assert.equal(currentManifest.sourceProvenance.previousPublication.assetSha256, sha(previousBytes));
  assert.equal(currentManifest.sourceProvenance.previousPublication.sourceSha256, previousPack.sourceSha256);
  assert.equal(currentManifest.sourceProvenance.entity.sourceSha256,
    "2fc6aba4cbbd7b9b7aabfcac59a330477967a156962d4ae0df71cba146e670df");
  assert.equal(currentManifest.sourceProvenance.entity.wikidataItem, "Q12975");
  assert.equal(currentManifest.sourceProvenance.entity.reference, "HR:7557");
  assert.equal(publication.source.retrievedAt, currentManifest.sourceProvenance.entity.retrievedAt);
  assert.ok(publication.source.limitations.some(value => value.includes(previousPack.sourceRetrievedAt)));
  assert.deepEqual(loadChineseStarAliases().aliasesFor("HR:7557"), ["河鼓二"]);
  assert.throws(() => parseChineseStarAliasPublication(currentBytes, currentManifest, base),
    /chinese_star_alias_manifest_invalid/);
  assert.throws(() => parseChineseStarAliasPublication(currentBytes,
    { ...currentManifest, sourceProvenance: { ...currentManifest.sourceProvenance, entity: {} } },
    loadBsc5pStarCatalog("bsc5p-bright-stars.v3")), /chinese_star_alias_provenance_invalid/);
});
