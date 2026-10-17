import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { EXTENDED_DEEP_SKY_CATALOG_VERSION, CURRENT_DEEP_SKY_CATALOG_VERSION } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { loadDeepSkyCatalog } from "@starward/astronomy-core/deep-sky-catalog";
import { CelestialObjectSearchService } from "./celestial-object-search.ts";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { celestialObjectPosition } from "./celestial-object-position.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("non-Messier search is explicit and cannot poison the old provider index", () => {
  const service = new CelestialObjectSearchService();
  const read = (version?: string) => service.search("NGC253", 20, "bsc5p-bright-stars.v3", undefined, version);
  assert.deepEqual(read().data.results, []);
  const extended = read(EXTENDED_DEEP_SKY_CATALOG_VERSION);
  assert(extended.data.results.some(row => row.reference === "NGC:253" && row.displayName === "NGC 253"));
  assert(extended.data.catalogs.some(row => row.catalogVersion === EXTENDED_DEEP_SKY_CATALOG_VERSION && row.rowCount === 52));
  assert(extended.sources.some(source => source.license === "CC-BY-SA-4.0"));
  assert.deepEqual(read().data.results, []);
  assert.throws(() => read("auto-latest"), /deep_sky_catalog_version_invalid/u);
  const information = new CelestialObjectInformationService().get("NGC:253");
  assert.equal(information.data.reference, "NGC:253"); assert.equal(information.data.displayName, "NGC 253");
  assert.match(information.data.introduction!, /玉夫座星系/u);
  assert(information.data.sources.some(source => source.license === "CC-BY-SA-4.0"));
  assert(information.data.aliases.includes("Silver Coin"));
  assert(information.data.aliases.every(alias => !alias.includes("M null")));
  assert.throws(() => new CelestialObjectInformationService().get("REGION:virgo"), /reference_invalid/u);
});

test("same report service keeps catalog-specific geometry/cache/position and old default generations", async () => {
  const service = createTestMiniappService();
  const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
    localDate: "2026-10-05", selectedAt: "2026-10-05T13:20:00.000Z" })).data;
  const old = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId, undefined, "bsc5p-bright-stars.v3");
  const extended = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId, undefined,
    "bsc5p-bright-stars.v3", EXTENDED_DEEP_SKY_CATALOG_VERSION);
  assert.equal(old.data.skyScene.deepSky?.catalog?.entries.length, 51);
  const catalog = extended.data.skyScene.deepSky?.catalog;
  assert(catalog); assert.equal(catalog.catalogVersion, EXTENDED_DEEP_SKY_CATALOG_VERSION);
  assert.equal(catalog.catalogHash, loadDeepSkyCatalog(EXTENDED_DEEP_SKY_CATALOG_VERSION).catalogHash);
  assert(catalog.entries.some(row => row.objectRef === "NGC:253" && row.displayName === "NGC 253"));
  assert.notEqual(old.data.context.dataRevision, extended.data.context.dataRevision);
  const at = extended.data.hourly[0]!.at;
  const position = celestialObjectPosition("NGC:253", at, extended);
  assert(position.data.position); assert.equal(position.data.position.catalogHash, catalog.catalogHash);
  assert.throws(() => celestialObjectPosition("NGC:253", at, old), /celestial_object_not_found/u);
  const again = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId, undefined, "bsc5p-bright-stars.v3");
  assert.equal(again.data.skyScene.deepSky?.catalog?.catalogHash, old.data.skyScene.deepSky?.catalog?.catalogHash);
  assert.equal(again.data.context.dataRevision, old.data.context.dataRevision);
});

test("a whole image-source batch shares search, facts and report positions while older indexes stay isolated", async () => {
  const references = ["NGC:246", "NGC:300", "NGC:1232", "NGC:2359", "NGC:6744", "NGC:7293"];
  const search = new CelestialObjectSearchService(), information = new CelestialObjectInformationService();
  const service = createTestMiniappService();
  const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
    localDate: "2026-10-09", selectedAt: "2026-10-09T13:20:00.000Z" })).data;
  const report = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId, undefined,
    "bsc5p-bright-stars.v3", CURRENT_DEEP_SKY_CATALOG_VERSION);
  const catalog = report.data.skyScene.deepSky!.catalog;
  assert(catalog);
  assert.equal(catalog.entries.length, 58);
  for (const reference of references) {
    const query = reference.replace(":", "");
    const current = search.search(query, 20, "bsc5p-bright-stars.v3", undefined, CURRENT_DEEP_SKY_CATALOG_VERSION);
    assert(current.data.results.some(row => row.reference === reference), reference);
    assert.equal(information.get(reference).data.reference, reference);
    const position = celestialObjectPosition(reference, report.data.hourly[0]!.at, report).data.position;
    assert(position, reference); assert.equal(position.catalogHash, catalog.catalogHash);
    for (const version of [undefined, EXTENDED_DEEP_SKY_CATALOG_VERSION])
      assert(!search.search(query, 20, "bsc5p-bright-stars.v3", undefined, version).data.results.some(row => row.reference === reference));
  }
});
