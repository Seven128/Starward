import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { CelestialObjectSearchService, type CelestialSearchProvider } from "./celestial-object-search.ts";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";

const service = new CelestialObjectSearchService();
test("simplified, traditional and mixed input find the supplied Chinese alias without rewriting identity or information", () => {
  const details = new CelestialObjectInformationService();
  for (const query of ["参宿四", "參宿四"]) {
    const response = service.search(query, 20, "bsc5p-bright-stars.v3");
    const hit = response.data.results.find(row => row.reference === "HR:2061");
    assert.ok(hit, query);
    assert.equal(hit.matchedAlias, "參宿四", "show the original publication alias, not a generated name");
    const information = details.get(hit.reference, "zh-CN", "bsc5p-bright-stars.v3").data;
    assert.deepEqual(hit.aliases, information.aliases);
    assert.equal(information.aliases.includes("参宿四"), false);
    assert.match(information.introduction!, /参宿四.*红超巨星/u);
    assert.equal(information.contentState, "READY");
    assert(information.sources.some(source => source.provider === "Wikipedia contributors" && source.license === "CC-BY-SA-4.0"));
  }
  const original = service.search("積水", 50, "bsc5p-bright-stars.v3").data.results;
  assert.deepEqual(service.search("积水", 50, "bsc5p-bright-stars.v3").data.results, original);
  assert.ok(original.some(row => row.reference === "HR:2793") && original.some(row => row.reference === "HR:1261"));
  assert.equal(service.search("獵户座大星雲", 20, "bsc5p-bright-stars.v3").data.results[0]?.reference, "M:42");
  assert.deepEqual(service.search("ＨＲ　００２０６１", 20, "bsc5p-bright-stars.v3").data.results.map(row => row.reference), ["HR:2061"]);
});

test("Chinese search-key collisions retain each source alias and separate catalogue identity", () => {
  const collision = new CelestialObjectSearchService([{ id: "distinct", load() {
    return { catalogVersion: "test", catalogHash: "a".repeat(64), rowCount: 2, sources: [], entries: [
      { reference: "HR:1", displayName: "First", kind: "STAR", aliases: ["臺", "HR 1"] },
      { reference: "HR:2", displayName: "Second", kind: "STAR", aliases: ["台", "HR 2"] },
    ] };
  } }]);
  const results = collision.search("台").data.results;
  assert.deepEqual(results.map(row => [row.reference, row.matchedAlias]), [["HR:1", "臺"], ["HR:2", "台"]]);
  assert.deepEqual(collision.search("HR 1").data.results.map(row => row.reference), ["HR:1"]);
});

test("Altair aliases resolve exact identity independently of whether prose is available", () => {
  const details = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, () => null);
  for (const query of ["牛郎星", "天鹰座α", "河鼓二", "Altair"]) {
    const response = service.search(query, 20, "bsc5p-bright-stars.v3");
    const hit = response.data.results[0];
    assert.equal(hit?.reference, "HR:7557", query);
    assert.equal(hit?.matchedAlias, query);
    const detail = details.get("HR:7557", "zh-CN", "bsc5p-bright-stars.v3");
    assert.deepEqual(detail.data.aliases, hit.aliases);
    assert.equal(detail.data.contentState, "BASIC_ONLY", "an alias does not add a reviewed introduction");
    assert.ok(detail.sources.some(source => source.provider === "Wikidata contributors" && source.license === "CC0 1.0"));
  }
  assert.deepEqual(service.search("牛郎星").data.results, [], "the original BSC v2 publication remains unchanged");
});

test("Acrux is discoverable only through the v3 catalog and keeps revised SAO and Chinese sources", () => {
  const old = service.search("Acrux");
  const revised = service.search("Acrux", 20, "bsc5p-bright-stars.v3");
  assert.equal(old.data.results.some(row => row.reference === "HR:4730"), false);
  assert.equal(revised.data.results[0]?.reference, "HR:4730");
  assert.equal(revised.data.results[0]?.displayName, "Acrux");
  assert.ok(revised.data.catalogs.some(row => row.catalogVersion === "bsc5p-bright-stars.v3"));
  assert.ok(revised.data.catalogs.some(row => row.catalogVersion.includes("sao") && row.catalogVersion.endsWith("v2")));
  assert.ok(revised.data.catalogs.some(row => row.catalogVersion === "wikidata-bsc5p-chinese-aliases.v3"));
});
test("real catalogue names, Chinese aliases and normalized identifiers resolve the same component", () => {
  for (const query of ["Sirius", "sIrIuS", "天狼星", "HR:2491", "ＨＲ　００２４９１"]) {
    const response = service.search(query);
    assert.equal(response.dataState, "FRESH");
    assert.equal(response.data.results[0]?.reference, "HR:2491", query);
    assert.equal(response.data.catalogs.length, 5);
    assert.deepEqual(response.data.unavailableCatalogs, []);
    assert.equal(response.data.catalogs.find(c => c.catalogVersion.includes("sao"))?.rowCount, 246280);
  }
  for (const query of ["M31", "NGC 0224", "仙女座星系"]) {
    assert.equal(service.search(query).data.results[0]?.reference, "M:31", query);
  }
  assert.deepEqual(service.search("HR 424").data.results.map(row => row.reference), ["HR:424"],
    "an exact catalogue number must not expand to HR 4240/4241/etc");
});

test("fixed CC0 Chinese labels join only exact HR identities and remain attributable in details", () => {
  const details = new CelestialObjectInformationService();
  for (const [query, reference] of [["张宿二", "HR:3994"], ["心宿一", "HR:6084"], ["參宿四", "HR:2061"]]) {
    const response = service.search(query);
    assert.equal(response.data.results[0]?.reference, reference, query);
    assert.equal(response.data.results[0]?.matchedAlias, query);
    assert.ok(response.sources.some(source => source.provider === "Wikidata contributors"));
    const detail = details.get(reference);
    assert.ok(detail.data.aliases.includes(query));
    assert.deepEqual(detail.data.aliases, response.data.results[0]?.aliases);
    assert.ok(detail.sources.some(source => source.license === "CC0 1.0"));
  }
  const sharedLabel = service.search("積水").data.results.map(row => row.reference);
  assert.ok(sharedLabel.includes("HR:2793") && sharedLabel.includes("HR:1261"),
    "a shared name must not collapse distinct catalogue stars");
});

test("seven planet identities search by Chinese and English names and preserve details", () => {
  const details = new CelestialObjectInformationService();
  for (const [query, reference] of [["金星", "PLANET:VENUS"], ["Mercury", "PLANET:MERCURY"],
    ["火星", "PLANET:MARS"], ["Jupiter", "PLANET:JUPITER"], ["土星", "PLANET:SATURN"],
    ["Uranus", "PLANET:URANUS"], ["海王星", "PLANET:NEPTUNE"]]) {
    const hit = service.search(query).data.results.find(row => row.reference === reference);
    assert.equal(hit?.kind, "PLANET", query);
    const information = details.get(reference).data;
    assert.equal(information.kind, "PLANET");
    assert.deepEqual(information.aliases, hit.aliases);
    assert.equal(information.contentState, "READY");
    assert.equal(information.facts.some(fact => fact.label.includes("方位")), false);
  }
});

test("shared HD aliases preserve distinct SAO components and details use the same alias owner", () => {
  const response = service.search("HD207929", 50);
  const results = response.data.results;
  assert.ok(results.some(row => row.reference === "SAO:3607"));
  assert.ok(results.some(row => row.reference === "SAO:3608"));
  const details = new CelestialObjectInformationService();
  for (const hit of results) assert.deepEqual(hit.aliases, details.get(hit.reference).data.aliases);
  assert.equal(service.search("SAO 3607").data.results[0]?.reference, "SAO:3607");
  assert.deepEqual(service.search("SAO 1").data.results.map(row => row.reference), ["SAO:1"],
    "an exact SAO number must not expand to similarly prefixed rows");
  assert.deepEqual(service.search("HD 0").data.results, [],
    "rows with no HD identifier must not match zero");
  assert.ok(service.search("HD 215319").data.results.some(row => row.reference === "SAO:3769"),
    "a joint HD record remains findable by its second identifier");
  assert.deepEqual(service.search("不存在的天体xyz").data.results, []);
});

test("results are bounded, detached from indexes and never carry invented observing coordinates", () => {
  const result = service.search("a", 3);
  assert.equal(result.data.results.length, 3);
  assert.equal(result.data.truncated, true);
  const original = service.search("天狼星");
  original.data.results[0]!.displayName = "mutated";
  (original.data.results[0]!.aliases as string[]).push("fake alias");
  const next = service.search("天狼星");
  assert.equal(next.data.results[0]!.displayName, "Sirius");
  assert.equal(next.data.results[0]!.aliases.includes("fake alias"), false);
  assert.equal("altitudeDeg" in next.data.results[0]!, false);
  for (const [query, limit] of [["", 20], ["::", 20], ["x".repeat(81), 20], ["Sirius\u0000", 20], ["Sirius", 0], ["Sirius", 51], ["Sirius", NaN]] as const)
    assert.throws(() => service.search(query, limit), /celestial_search_query_invalid/);
});

test("missing or incomplete publications cannot masquerade as an empty successful search", () => {
  const unavailable = new CelestialObjectSearchService([{ id: "missing", load() { throw Error("missing"); } }]);
  assert.equal(unavailable.search("Vega").dataState, "UNAVAILABLE");
  const incomplete = new CelestialObjectSearchService([{ id: "incomplete", load() {
    return { catalogVersion: "test", catalogHash: "a".repeat(64), rowCount: 10, sources: [], entries: [] };
  } }]);
  const result = incomplete.search("Vega");
  assert.equal(result.dataState, "UNAVAILABLE");
  assert.deepEqual(result.data.unavailableCatalogs, ["incomplete"]);
});

test("one unavailable publication preserves other results and a later query recovers it", () => {
  let unavailable = true;
  const provider = (id: string): CelestialSearchProvider => ({ id, load() {
    if (id === "second" && unavailable) throw Error("private provider failure");
    return { catalogVersion: id, catalogHash: "a".repeat(64), rowCount: 1, sources: [],
      entries: [{ reference: id === "first" ? "HR:1" : "HR:2", displayName: "Known star", kind: "STAR", aliases: ["Known"] }] };
  } });
  const partial = new CelestialObjectSearchService([provider("first"), provider("second")]);
  const before = partial.search("Known");
  assert.equal(before.dataState, "PARTIAL");
  assert.deepEqual(before.data.results.map(row => row.reference), ["HR:1"]);
  assert.deepEqual(before.data.unavailableCatalogs, ["second"]);
  assert.doesNotMatch(JSON.stringify(before), /private provider failure/);
  unavailable = false;
  const after = partial.search("Known");
  assert.equal(after.dataState, "FRESH");
  assert.deepEqual(after.data.results.map(row => row.reference), ["HR:1", "HR:2"]);
});

test("public HTTP search and selected detail retain the same real identity; invalid input is rejected", async () => {
  const details = new CelestialObjectInformationService();
  @Module({ controllers: [MiniappController], providers: [{ provide: MiniappService,
    useValue: { celestialSearch: service, getCelestialObject: (reference: string, locale: string, version: "bsc5p-bright-stars.v2" | "bsc5p-bright-stars.v3") => details.get(reference, locale, version) } }] })
  class SearchTestModule {}
  const app = await NestFactory.create(SearchTestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const response = await fetch(`${base}/v2/celestial-objects?q=${encodeURIComponent("织女星")}`);
    assert.equal(response.status, 200);
    const search = await response.json();
    assert.equal(search.data.results[0].reference, "HR:7001");
    const selected = await fetch(`${base}/v2/celestial-objects/${encodeURIComponent(search.data.results[0].reference)}`);
    assert.equal(selected.status, 200);
    const detail = await selected.json();
    assert.equal(detail.data.reference, "HR:7001");
    assert.equal(detail.data.displayName, "Vega");
    assert.deepEqual(detail.data.aliases, search.data.results[0].aliases);
    const chineseResponse = await fetch(`${base}/v2/celestial-objects?q=${encodeURIComponent("张宿二")}`);
    assert.equal(chineseResponse.status, 200);
    const chineseSearch = await chineseResponse.json();
    assert.equal(chineseSearch.data.results[0].reference, "HR:3994");
    const chineseDetailResponse = await fetch(`${base}/v2/celestial-objects/HR%3A3994`);
    assert.equal(chineseDetailResponse.status, 200);
    const chineseDetail = await chineseDetailResponse.json();
    assert.ok(chineseDetail.data.aliases.includes("张宿二"));
    assert.ok(chineseDetail.sources.some((source: { license?: string }) => source.license === "CC0 1.0"));
    const revisedSearch = await fetch(`${base}/v2/celestial-objects?q=Acrux&catalogVersion=bsc5p-bright-stars.v3`);
    assert.equal(revisedSearch.status, 200);
    assert.equal((await revisedSearch.json()).data.results[0].reference, "HR:4730");
    const revisedDetail = await fetch(`${base}/v2/celestial-objects/HR%3A4730?catalogVersion=bsc5p-bright-stars.v3`);
    assert.equal(revisedDetail.status, 200);
    assert.equal((await revisedDetail.json()).data.displayName, "Acrux");
    assert.equal((await fetch(`${base}/v2/celestial-objects/HR%3A4730`)).status, 200);
    assert.equal((await fetch(`${base}/v2/celestial-objects?q=Acrux&catalogVersion=invalid`)).status, 400);
    assert.equal((await fetch(`${base}/v2/celestial-objects/HR%3A4730?catalogVersion=invalid`)).status, 400);
    assert.equal((await fetch(`${base}/v2/celestial-objects?q=x&limit=1000`)).status, 400);
    assert.equal((await fetch(`${base}/v2/celestial-objects`)).status, 400);
  } finally { await app.close(); }
});


test("adopted Chinese deep aliases match both spelling forms and the same information identity", () => {
 const details=new CelestialObjectInformationService();
 for(const [query, reference]of [["蟹状星云","M:1"],["蟹狀星雲","M:1"],["玉夫座星系","NGC:253"],["銀元星系","NGC:253"]]) {
  const result=service.search(query,20,"bsc5p-bright-stars.v3",undefined,"opengc-deep-sky.v20260501-extended-v1");
  const hit=result.data.results.find(r=>r.reference===reference)!;assert(hit,query);
  assert.deepEqual(hit.aliases,details.get(reference).data.aliases);
  assert(result.sources.some(s=>s.provider==="Wikipedia contributors"));
 }
 assert.deepEqual(service.search("玉夫座星系").data.results,[],"old catalogue boundary is preserved");
});


test("one unavailable Chinese deep row preserves independent search results and retries the partial index", async () => {
 const {publishedDeepSkyIntroduction}=await import("./celestial-object-introductions.ts");
 let unavailable=true;const partial=new CelestialObjectSearchService(undefined,row=>{if(unavailable&&row.objectRef==="M:1")throw Error("unavailable");return publishedDeepSkyIntroduction(row);});
 const version="opengc-deep-sky.v20260501-extended-v1";
 const before=partial.search("玉夫座星系",20,"bsc5p-bright-stars.v3",undefined,version);
 assert.equal(before.dataState,"PARTIAL");assert(before.data.results.some(r=>r.reference==="NGC:253"));assert(before.data.unavailableCatalogs.includes("Chinese-deep-prose-zh"));
 assert(partial.search("M1",20,"bsc5p-bright-stars.v3",undefined,version).data.results.some(r=>r.reference==="M:1"));
 assert(!partial.search("蟹状星云",20,"bsc5p-bright-stars.v3",undefined,version).data.results.some(r=>r.reference==="M:1"));
 unavailable=false;const after=partial.search("蟹状星云",20,"bsc5p-bright-stars.v3",undefined,version);
 assert.equal(after.dataState,"FRESH");assert(after.data.results.some(r=>r.reference==="M:1"));assert.deepEqual(after.data.unavailableCatalogs,[]);
});

test("search ETag changes when licensed source metadata changes while results stay identical", async () => {
 const {publishedDeepSkyIntroduction}=await import("./celestial-object-introductions.ts");
 const first=new CelestialObjectSearchService().search("M1");
 const second=new CelestialObjectSearchService(undefined,row=>{const p=publishedDeepSkyIntroduction(row);return p?{...p,source:{...p.source,retrievedAt:"2026-10-07T00:00:00Z"}}:null;}).search("M1");
 assert.deepEqual(first.data,second.data);assert.notEqual(first.etag,second.etag);
});
