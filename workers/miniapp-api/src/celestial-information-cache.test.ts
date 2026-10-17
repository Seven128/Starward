import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION } from "@starward/miniapp-contracts";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { MiniappController } from "./controller.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { publishedBodyIntroduction } from "./celestial-object-introductions.ts";

// Observe retained entries at the real owner, without exposing cache internals
// as a new product API or interpreting entry count as physical memory.
const retained = (service: CelestialObjectInformationService) =>
  (service as unknown as { cache: Map<string, unknown> }).cache;

test("controller-compatible irrelevant image selections cannot multiply one planet's cache", () => {
  const service = createTestMiniappService(), controller = new MiniappController(service);
  const first = controller.celestialObject("PLANET%3AMERCURY", "zh-CN", "bsc5p-bright-stars.v3");
  for (let index = 0; index < 257; index++) {
    const response = controller.celestialObject("PLANET%3AMERCURY", "zh-CN", index % 2 ? "bsc5p-bright-stars.v2" : "bsc5p-bright-stars.v3",
      index % 2 ? "coverage-v2" : undefined, DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION, index.toString(16).padStart(64, "0"));
    assert.deepEqual(response.data, first.data);
    assert.equal(response.etag, first.etag);
  }
  assert.equal(retained(service.celestialObjects).size, 1);
  assert.throws(() => controller.celestialObject("PLANET%3AMERCURY", "zh-CN", undefined, undefined, undefined, "invalid"));
  assert.throws(() => controller.celestialObject("PLANET%3AMERCURY", "zh-CN", undefined, undefined, undefined, undefined, "a".repeat(64)));
});

for (const reference of ["SOLAR:SUN", "SOLAR:MOON", "PLANET:MERCURY", "SAO:1", "M:31"]) {
  test(`${reference} shares the existing bounded cache and cannot retain a 257th entry`, () => {
    const service = new CelestialObjectInformationService();
    const stars = loadBsc5pStarCatalog("bsc5p-bright-stars.v3").rows.slice(0, 256);
    for (const star of stars) assert.equal(service.get(star.sourceId, "zh-CN", "bsc5p-bright-stars.v3").dataState, "FRESH");
    assert.equal(retained(service).size, 256);
    const oldest = [...retained(service).keys()][0]!;
    const value = service.get(reference, "zh-CN", "bsc5p-bright-stars.v3", reference === "SOLAR:MOON" ? "coverage-v2" : undefined);
    assert.equal(value.data.reference, reference);
    assert.equal(retained(service).size, 256);
    assert.equal(retained(service).has(oldest), false, "oldest entry retires at the common write boundary");
    (value.data.aliases as string[]).push("consumer-local annotation");
    assert(!service.get(reference, "zh-CN", "bsc5p-bright-stars.v3", reference === "SOLAR:MOON" ? "coverage-v2" : undefined).data.aliases.includes("consumer-local annotation"));
  });
}

test("star catalog and lunar coverage are semantic versions; unrelated selectors are ignored compatibly", () => {
  const service = new CelestialObjectInformationService();
  service.get("HR:7001", "zh-CN", "bsc5p-bright-stars.v2");
  service.get("HR:7001", "zh-CN", "bsc5p-bright-stars.v3");
  assert.equal(retained(service).size, 2);
  service.get("HR:7001", "zh-CN", "bsc5p-bright-stars.v3", "coverage-v2", { publicationHash: "a".repeat(64) });
  assert.equal(retained(service).size, 2);
  const oldMoon = service.get("SOLAR:MOON");
  const newMoon = service.get("SOLAR:MOON", "zh-CN", "bsc5p-bright-stars.v3", "coverage-v2");
  assert.notDeepEqual(oldMoon.data.limitations, newMoon.data.limitations);
  assert.equal(retained(service).size, 4);
  assert.deepEqual(service.get("SOLAR:MOON", "zh-CN", "bsc5p-bright-stars.v2", "coverage-v2").data, newMoon.data);
  assert.equal(retained(service).size, 4);
});

test("partial body prose is not cached and recovers through the same owner", () => {
  let unavailable = true;
  const service = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, undefined,
    reference => { if (unavailable) throw Error("controlled publication failure"); return publishedBodyIntroduction(reference); });
  for (const reference of ["SOLAR:SUN", "SOLAR:MOON", "PLANET:MERCURY"]) assert.equal(service.get(reference).dataState, "PARTIAL");
  assert.equal(retained(service).size, 0);
  unavailable = false;
  for (const reference of ["SOLAR:SUN", "SOLAR:MOON", "PLANET:MERCURY"]) assert.equal(service.get(reference).dataState, "FRESH");
  assert.equal(retained(service).size, 3);
});

test("extended deep-sky identities reach the same selected-publication boundary", () => {
  const service = createTestMiniappService(), controller = new MiniappController(service);
  const response = controller.celestialObject("NGC%3A253", "zh-CN", "bsc5p-bright-stars.v3", undefined, undefined, undefined, "a".repeat(64));
  assert.equal(response.data.reference, "NGC:253");
  assert.equal(response.dataState, "PARTIAL", "missing selected metadata stays missing, without borrowing current credit");
  assert(response.warnings.includes("sdss_optical_publication_unavailable"));
  assert(!response.data.sources.some(source => source.id.startsWith("optical-imagery:")));
});
