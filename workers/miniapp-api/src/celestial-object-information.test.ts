import assert from "node:assert/strict";
import test from "node:test";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { publishedStarIntroduction, publishedBodyIntroduction, publishedDeepSkyIntroduction, parseChineseIntroductionPublication } from "./celestial-object-introductions.ts";
import { readFileSync } from "node:fs";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { CelestialObjectSearchService } from "./celestial-object-search.ts";

for (const [reference, query, traditional, meaning, notice] of [
  ["HR:1457", "毕宿五", "畢宿五", /红巨星.*亮度.*缓慢/u, /引用需要清理/u],
  ["HR:1708", "五车二", "五車二", /两对双星.*Aa和Ab.*正式名称专指Aa/u, /系统背景.*四个分量/u],
  ["HR:6134", "心宿二", "心宿二", /红超巨星.*蓝色主序伴星.*第二颗星/u, /半规则与慢不规则/u],
] as const) test(`named BSC prose ${reference} preserves catalogue identity, independent facts and Chinese discovery`, () => {
  const service = new CelestialObjectInformationService(), basic = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, () => null);
  const search = new CelestialObjectSearchService();
  for (const version of ["bsc5p-bright-stars.v2", "bsc5p-bright-stars.v3"] as const) {
    const response = service.get(reference, "zh-CN", version), prior = basic.get(reference, "zh-CN", version);
    assert.equal(response.data.contentState, "READY"); assert.match(response.data.introduction!, meaning);
    assert.deepEqual(response.data.facts, prior.data.facts); assert.deepEqual(response.data.aliases, prior.data.aliases);
    assert.deepEqual(response.sources.filter(s => s.provider !== "Wikipedia contributors"), prior.sources);
    assert.notEqual(response.data.contentRevision, prior.data.contentRevision);
    const prose = response.sources.find(s => s.provider === "Wikipedia contributors")!;
    assert.equal(prose.license, "CC-BY-SA-4.0"); assert.equal(prose.confidence, null);
    assert(prose.sourceUrl?.includes("oldid=")); assert(prose.attribution?.statements.some(s => s.includes(prose.licenseUrl!)));
    assert(prose.limitations.some(s => notice.test(s))); assert(!/\d+光年|当前可见|最近的/u.test(response.data.introduction!));
  }
  for (const queryText of [query, traditional]) assert(search.search(queryText, 20, "bsc5p-bright-stars.v3").data.results.some(r => r.reference === reference));
  const row = loadBsc5pStarCatalog("bsc5p-bright-stars.v3").rows.find(r => r.sourceId === reference)!;
  for (const key of ["hr", "hd", "hip"] as const) assert.throws(() => publishedStarIntroduction({ ...row, [key]: "999999" }), /identity_mismatch/u);
});

test("three-star pinned prose read failures remain partial and recover without caching missing text", () => {
  for (const reference of ["HR:1457", "HR:1708", "HR:6134"]) {
    let failed = true; const details = new CelestialObjectInformationService(undefined, undefined, undefined, undefined,
      row => { if (failed && row.sourceId === reference) throw Error("publication_read_failed"); return publishedStarIntroduction(row); });
    const before = details.get(reference, "zh-CN", "bsc5p-bright-stars.v3");
    assert.equal(before.dataState, "PARTIAL"); assert.equal(before.data.contentState, "BASIC_ONLY"); assert.equal(before.data.introduction, null);
    assert(!before.sources.some(s => s.provider === "Wikipedia contributors"));
    failed = false; const after = details.get(reference, "zh-CN", "bsc5p-bright-stars.v3");
    assert.equal(after.dataState, "FRESH"); assert.equal(after.data.contentState, "READY");
    assert.deepEqual(after.data.facts, before.data.facts); assert.deepEqual(after.data.aliases, before.data.aliases);
    assert.notEqual(after.data.contentRevision, before.data.contentRevision);
    assert.equal(details.get("HR:7001").data.contentState, "READY", "independent editorial text survives");
  }
});

test("corrupt offline prose fails closed and all nine solar bodies retry without losing independent sources", () => {
  const bytes = readFileSync(new URL("../assets/celestial-object-introductions.zh-cn.v72.json", import.meta.url));
  const pack = parseChineseIntroductionPublication(bytes);
  assert.deepEqual([...pack.keys()].slice(0, 12), ["HR:2326", "SOLAR:SUN", "SOLAR:MOON", "PLANET:VENUS", "PLANET:MERCURY", "PLANET:MARS", "PLANET:JUPITER", "PLANET:SATURN", "PLANET:URANUS", "PLANET:NEPTUNE", "M:1", "NGC:253"]);
  const corrupt = Buffer.from(bytes); corrupt[corrupt.length - 2] ^= 1;
  assert.throws(() => parseChineseIntroductionPublication(corrupt), /hash_mismatch/u);
  for (const reference of ["SOLAR:SUN", "SOLAR:MOON", "PLANET:VENUS", "PLANET:MERCURY", "PLANET:MARS", "PLANET:JUPITER", "PLANET:SATURN", "PLANET:URANUS", "PLANET:NEPTUNE"]) {
    let unavailable = true;
    const service = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, undefined,
      value => { if (unavailable && value === reference) parseChineseIntroductionPublication(corrupt); return publishedBodyIntroduction(value); });
    const partial = service.get(reference, "zh-CN", "bsc5p-bright-stars.v3", "coverage-v2");
    assert.equal(partial.dataState, "PARTIAL");
    assert.equal(partial.data.contentState, "BASIC_ONLY");
    assert.equal(partial.data.introduction, null);
    assert(partial.warnings.includes("celestial_introduction_publication_unavailable"));
    assert(!partial.sources.some(s => s.provider === "Wikipedia contributors"));
    unavailable = false;
    const recovered = service.get(reference, "zh-CN", "bsc5p-bright-stars.v3", "coverage-v2");
    assert.equal(recovered.dataState, "FRESH");
    assert.equal(recovered.data.contentState, "READY");
    assert.deepEqual(recovered.data.facts, partial.data.facts);
    assert.deepEqual(recovered.data.aliases, partial.data.aliases);
    assert.deepEqual(recovered.sources.filter(s => s.provider !== "Wikipedia contributors"), partial.sources);
    assert.notEqual(recovered.data.contentRevision, partial.data.contentRevision);
  }
  const row = loadBsc5pStarCatalog("bsc5p-bright-stars.v3").rows.find(r => r.sourceId === "HR:2326")!;
  assert.throws(() => publishedStarIntroduction({ ...row, hip: "30439" }), /identity_mismatch/u);
  const service = new CelestialObjectInformationService(undefined, undefined, undefined, undefined,
    value => { if (value.sourceId === "HR:2326") parseChineseIntroductionPublication(corrupt); return publishedStarIntroduction(value); });
  assert(service.get("HR:2326").warnings.includes("celestial_introduction_publication_unavailable"));
  assert.equal(service.get("HR:7001").dataState, "FRESH", "old independent editorial prose remains usable");
});

test("offline Chinese prose reaches a real HR star, Sun, Moon and Venus with independent facts and licenses", () => {
  const service = new CelestialObjectInformationService();
  for (const [reference, name] of [["HR:2326", "老人星"], ["SOLAR:SUN", "太阳"],
    ["SOLAR:MOON", "月球"], ["PLANET:VENUS", "金星"]]) {
    const response = service.get(reference, "zh-CN", "bsc5p-bright-stars.v3", "coverage-v2");
    assert.equal(response.data.contentState, "READY", reference);
    assert(response.data.introduction?.includes(name), reference);
    const source = response.sources.find(s => s.provider === "Wikipedia contributors")!;
    assert(source);
    assert.equal(source.license, "CC-BY-SA-4.0");
    assert.equal(source.confidence, null);
    assert(source.attribution?.statements.some(s => s.includes(source.licenseUrl!)));
    assert(source.attribution?.statements.some(s => /Starward.*节选.*改编/u.test(s)));
    assert.deepEqual(response.sources, response.data.sources);
    assert(response.data.sources.length > 1, "prose does not displace astronomy/texture sources");
  }
  const canopus = service.get("HR:2326", "zh-CN", "bsc5p-bright-stars.v3").data;
  assert.equal(canopus.facts.find(f => f.label === "光谱型")?.value, "F0II");
  assert(canopus.limitations.some(s => s.includes("光谱分类不同")));
  assert.equal(service.get("SAO:1").data.contentState, "BASIC_ONLY", "unadopted stellar prose is not generated");
});

test("a mismatched introduction preserves facts, avoids a complete cache and recovers with its own revision", () => {
  const row = loadBsc5pStarCatalog("bsc5p-bright-stars.v3").rows.find(r => r.sourceId === "HR:2061")!;
  assert.throws(() => publishedStarIntroduction({ ...row, hd: "39802" }), /identity_mismatch/u);
  let unavailable = true;
  const service = new CelestialObjectInformationService(undefined, undefined, undefined, undefined,
    candidate => publishedStarIntroduction(unavailable ? { ...candidate, hip: "27990" } : candidate));
  const partial = service.get("HR:2061", "zh-CN", "bsc5p-bright-stars.v3");
  assert.equal(partial.dataState, "PARTIAL");
  assert.equal(partial.data.contentState, "BASIC_ONLY");
  assert.equal(partial.data.introduction, null);
  assert(!partial.sources.some(s => s.provider === "Wikipedia contributors"));
  assert(partial.warnings.includes("celestial_introduction_identity_mismatch"));
  unavailable = false;
  const recovered = service.get("HR:2061", "zh-CN", "bsc5p-bright-stars.v3");
  assert.equal(recovered.dataState, "FRESH");
  assert.equal(recovered.data.contentState, "READY");
  assert.notEqual(recovered.data.contentRevision, partial.data.contentRevision);
  assert.deepEqual(recovered.data.facts, partial.data.facts);
  assert.deepEqual(recovered.data.aliases, partial.data.aliases);
  const changedPublication = new CelestialObjectInformationService(undefined, undefined, undefined, undefined,
    candidate => { const value = publishedStarIntroduction(candidate); return value ? { ...value,
      source: { ...value.source, retrievedAt: "2026-10-07T00:00:00Z" } } : null; });
  assert.notEqual(changedPublication.get("HR:2061", "zh-CN", "bsc5p-bright-stars.v3").data.contentRevision,
    recovered.data.contentRevision, "published prose provenance participates in the content revision");
});

test("HR2061 publishes a licensed Chinese introduction without changing catalog facts or alias identity", () => {
  const service = new CelestialObjectInformationService();
  for (const version of ["bsc5p-bright-stars.v2", "bsc5p-bright-stars.v3"] as const) {
    const first = service.get("HR:2061", "zh-CN", version);
    assert.equal(first.data.contentState, "READY");
    assert.match(first.data.introduction!, /参宿四.*红超巨星/u);
    assert.match(first.data.introduction!, /半规则变星/u);
    assert(first.data.aliases.includes("參宿四"));
    const source = first.sources.find(s => s.kind === "EDITORIAL_REFERENCE" && s.provider === "Wikipedia contributors")!;
    assert(source, "the prose has its own provenance, separate from CC0 aliases and BSC measurements");
    assert.match(source.sourceUrl!, /oldid=94362172/u);
    assert.equal(source.license, "CC-BY-SA-4.0");
    assert.equal(source.licenseUrl, "https://creativecommons.org/licenses/by-sa/4.0/");
    assert(source.attribution?.statements.some(s => /Starward.*节选.*简体.*改编/u.test(s)));
    assert(source.attribution?.statements.some(s => s.includes(source.licenseUrl!)));
    assert(source.limitations.some(s => /翻译质量警示/u.test(s)));
    assert(source.precision?.includes("HD 39801") && source.precision.includes("HIP 27989"));
    assert.deepEqual(first.sources, first.data.sources);
    const untouched = service.get("HR:2061", "zh-CN", version);
    (first.data.sources as unknown[]).length = 0;
    assert.deepEqual(service.get("HR:2061", "zh-CN", version), untouched, "cached content is detached");
  }
  assert.notEqual(service.get("HR:403").data.introduction, service.get("HR:2061").data.introduction,
    "another real catalog identity does not acquire this prose");
});

test("Acrux detail and catalog sources follow the requested report version", () => {
  const service = new CelestialObjectInformationService();
  const old = service.get("HR:4730");
  const revised = service.get("HR:4730", "zh-CN", "bsc5p-bright-stars.v3");
  assert.equal(old.data.displayName, "HR 4730");
  assert.equal(revised.data.displayName, "Acrux");
  assert.notEqual(old.data.contentRevision, revised.data.contentRevision);
  assert.ok(revised.sources.some(source => source.id.includes("bsc5p")));
  assert.equal(service.get("HR:4730").data.displayName, "HR 4730");
});

test("stable HR references return attributable ready and basic-only states", () => {
  const service = new CelestialObjectInformationService();
  const sirius = service.get("HR:2491");
  assert.equal(sirius.data.displayName, "Sirius");
  assert.equal(sirius.data.contentState, "READY");
  assert.ok(sirius.data.introduction?.includes("大犬座"));
  assert.ok(sirius.data.aliases.includes("HD 48915"));
  assert.ok(sirius.data.sources.some((source) => source.provider.includes("HEASARC")));
  assert.ok(sirius.data.sources.some((source) => source.provider.includes("Star Names")));

  const withoutProse = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, () => null);
  const basicOnly = withoutProse.get("HR:403");
  assert.equal(basicOnly.data.contentState, "BASIC_ONLY");
  assert.equal(basicOnly.data.introduction, null);
  assert.deepEqual(basicOnly.data.facts, service.get("HR:403").data.facts);
  assert.ok(basicOnly.data.limitations.some((value) => value.includes("只有目录基本资料")));
});

test("large numeric-like and unknown references stay strings and fail closed", () => {
  const service = new CelestialObjectInformationService();
  assert.throws(() => service.get("2940472157174944128"), /celestial_object_reference_invalid/u);
  assert.throws(() => service.get("HR:1"), /celestial_object_not_found/u);
  assert.throws(() => service.get("HR:2491", "en-US"), /celestial_object_locale_unsupported/u);
});

test("planet information distinguishes historical band profiles from current geometry and weather", () => {
  const service = new CelestialObjectInformationService();
  const mars = service.get("PLANET:MARS").data;
  assert.ok(mars.limitations.some(value => value.includes("火星历史影像") && value.includes("独立来源")));
  assert.ok(mars.limitations.every(value => !value.includes("球面外观尚无校准纹理")));
  const mercury = service.get("PLANET:MERCURY").data;
  assert.ok(mercury.limitations.some(value => value.includes("水星历史 750 nm 灰阶影像") && value.includes("独立来源")));
  const saturn = service.get("PLANET:SATURN").data;
  const jupiter = service.get("PLANET:JUPITER").data;
  assert.ok(jupiter.limitations.some(value => value.includes("扁球轮廓") && value.includes("大红斑")));
  assert.ok(jupiter.sources.some(source => source.sourceUrl ===
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html"));
  assert.ok(jupiter.sources.some(source=>source.sourceUrl===
    "https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31"&&
    source.licenseUrl==="https://creativecommons.org/licenses/by/4.0/"));
  assert.ok(jupiter.limitations.some(value=>value.includes("历史纬度云带")&&value.includes("经度细节")));
  assert.ok(saturn.limitations.some(value => value.includes("历史纬度云带") && value.includes("当前环影")));
  assert.ok(saturn.sources.some(source=>source.sourceUrl===
    "https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32"&&
    source.licenseUrl==="https://creativecommons.org/licenses/by/4.0/"));
  assert.ok(saturn.sources.some(source=>source.sourceUrl===
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html"));
  assert.ok(saturn.limitations.every(value => !value.includes("尚未绘制")));
  assert.notEqual(mars.contentRevision, saturn.contentRevision);
});

test("Messier galaxy and nebula references expose attributable catalog facts", () => {
  const service = new CelestialObjectInformationService();
  const m31 = service.get("M:31");
  assert.equal(m31.data.kind, "GALAXY");
  assert.equal(m31.data.displayName, "M 31");
  assert.equal(m31.data.contentState, "READY");
  assert.ok(m31.data.introduction?.includes("仙女座星系"));
  assert.ok(m31.data.facts.some((fact) => fact.label === "目录长轴"));
  assert.ok(m31.data.sources.some((source) => source.provider.includes("OpenNGC")));
  const catalogSource = m31.data.sources.find((source) => source.provider.includes("OpenNGC"))!;
  assert.match(catalogSource.provider, /Mattia Verga/u);
  assert.equal(catalogSource.license, "CC-BY-SA-4.0");
  assert.match(catalogSource.licenseUrl, /36cb178a0f69dba8bfc03a99c10512831edf1c6b\/LICENSES\/CC-BY-SA-4.0.txt$/u);
  assert.ok(catalogSource.limitations.some(value => /Starward/u.test(value) && /十进制度/u.test(value) && /JSON/u.test(value) && /CC BY-SA 4.0/u.test(value)));
  const imageSource = m31.data.sources.find(source => source.id.startsWith("imagery:"));
  assert.ok(imageSource, "published survey imagery has its own source, separate from the catalog license");
  assert.match(imageSource.title, /AllWISE.*W3/u);
  assert.equal(imageSource.licenseUrl, "https://opendatacommons.org/licenses/odbl/1-0/");
  const notices = imageSource.limitations.join("\n");
  assert.match(notices, /This publication makes use of data products from the Wide-field Infrared Survey Explorer/u);
  assert.match(notices, /and NEOWISE, which is a project/u);
  assert.match(notices, /10\.26131\/IRSA153/u);
  assert.match(notices, /10\.26093\/cds\/aladin\/na1n-03/u);
  assert.match(notices, /hips-image-services\/hips2fits/u);
  assert.doesNotMatch(notices, /2msf-n437/u, "the online service is not the offline cutout script");
  assert.match(notices, /AllWISE\/expsup\/sec1_6b.html/u);
  assert.match(notices, /ODbL/u);
  assert.match(notices, /CNRS\/Unistra/u);
  assert.match(notices, /Starward.*TAN/u);
  assert.deepEqual(m31.sources, m31.data.sources);

  const m42 = service.get("M:42");
  assert.equal(m42.data.kind, "NEBULA");
  assert.ok(m42.data.introduction?.includes("猎户座大星云"));

  const basic = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, undefined, undefined, () => null).get("M:17");
  assert.equal(basic.data.contentState, "BASIC_ONLY");
  assert.ok(basic.data.limitations.some((value) => value.includes("只有目录基本资料")));
});

test("same identity and locale reuse a stable content revision without sharing mutable values", () => {
  const service = new CelestialObjectInformationService();
  const first = service.get("HR:7001");
  first.data.aliases.length;
  const second = service.get("HR:7001");
  assert.equal(second.data.contentRevision, first.data.contentRevision);
  assert.notEqual(second, first);
  assert.notEqual(second.data, first.data);
});

test("SAO details interpret HD multiplicity codes instead of presenting them as names", () => {
  // HEASARC SAO HD_Component: 0 is not a component name; 1/2 distinguish
  // near-equal components; 9 represents two consecutive HD numbers.
  const service = new CelestialObjectInformationService();
  assert.deepEqual(service.get("SAO:18838").data.aliases, ["SAO 18838", "HD 194665"]);
  assert.deepEqual(service.get("SAO:3607").data.aliases, ["SAO 3607", "HD 207929（较亮分量）"]);
  assert.deepEqual(service.get("SAO:3608").data.aliases, ["SAO 3608", "HD 207929（较暗分量）"]);
  const combined = service.get("SAO:3769").data;
  assert.deepEqual(combined.aliases, ["SAO 3769", "HD 215318 / HD 215319（联合记录）"]);
  assert.equal(combined.facts.find(fact => fact.label === "光谱型")?.value,
    "复合、变化或特殊光谱（目录未区分）");
});


test("six remaining planets receive licensed Chinese prose while retaining independent astronomy and image facts", () => {
  const service = new CelestialObjectInformationService();
  const withoutProse = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, undefined, () => null);
  for (const [reference, name, property] of [
    ["PLANET:MERCURY", "水星", "最小"], ["PLANET:MARS", "火星", "氧化"],
    ["PLANET:JUPITER", "木星", "气体巨行星"], ["PLANET:SATURN", "土星", "冰"],
    ["PLANET:URANUS", "天王星", "自转轴"], ["PLANET:NEPTUNE", "海王星", "数学"]]) {
    const response = service.get(reference), base = withoutProse.get(reference);
    assert.equal(response.data.contentState, "READY", reference);
    assert(response.data.introduction?.includes(name) && response.data.introduction.includes(property), reference);
    const prose = response.sources.find(s => s.provider === "Wikipedia contributors")!;
    assert.equal(prose.license, "CC-BY-SA-4.0");
    assert.equal(prose.confidence, null);
    assert(prose.sourceUrl?.includes("oldid="));
    assert(prose.attribution?.statements.some(s => /Starward.*节选.*改编/u.test(s)));
    assert(prose.attribution?.statements.some(s => s.includes(prose.licenseUrl!)));
    assert.deepEqual(response.sources, response.data.sources);
    assert.deepEqual(response.data.facts, base.data.facts);
    assert.deepEqual(response.data.aliases, base.data.aliases);
    assert.deepEqual(response.sources.filter(s => s !== prose), base.sources);
    assert.notEqual(response.data.contentRevision, base.data.contentRevision);
    assert(!/当前可见|地下液态水|已发现生命/u.test(response.data.introduction!), reference);
  }
});


test("real Crab and Sculptor Chinese prose preserves exact deep-catalog facts and independent images", () => {
 const service = new CelestialObjectInformationService();
 for (const [reference, name, ngc] of [["M:1", "蟹状星云", "NGC 1952"], ["NGC:253", "玉夫座星系", "NGC 253"]]) {
  const value=service.get(reference).data;
  assert.equal(value.contentState, "READY", reference);
  assert(value.introduction?.includes(name), reference);
  assert(value.aliases.includes(name) && value.aliases.includes(ngc));
  const source=value.sources.find(s=>s.provider==="Wikipedia contributors")!;
  assert(source, "licensed text has its own source, independent of catalogue or images");
  assert.equal(source.license,"CC-BY-SA-4.0");assert.equal(source.confidence,null);
  assert(source.attribution?.statements.some(s=>s.includes(source.licenseUrl!)));
  assert(value.sources.some(s=>s.provider.includes("OpenNGC")));
 }
});


test("deep prose identity failures retain facts and images and retry without a false complete cache", () => {
 let unavailable=true;
 const service=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,undefined,undefined,
  row=>publishedDeepSkyIntroduction(unavailable ? {...row,ngcName:"NGC 9999"} : row));
 for(const reference of ["M:1","NGC:253"]){
  const failed=service.get(reference);assert.equal(failed.data.contentState,"BASIC_ONLY");assert.equal(failed.dataState,"PARTIAL");
  assert(failed.warnings.includes("celestial_introduction_identity_mismatch"));
  assert(!failed.sources.some(s=>s.provider==="Wikipedia contributors"));
  unavailable=false;const recovered=service.get(reference);assert.equal(recovered.data.contentState,"READY");assert.equal(recovered.dataState,"FRESH");
  assert.deepEqual(recovered.data.facts,failed.data.facts);assert.deepEqual(recovered.sources.filter(s=>s.provider!=="Wikipedia contributors"),failed.sources);
  assert(failed.data.aliases.every(a=>recovered.data.aliases.includes(a)));assert.notEqual(recovered.data.contentRevision,failed.data.contentRevision);unavailable=true;
 }
 const normal=new CelestialObjectInformationService().get("M:1").data;
 const changed=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,undefined,undefined,
  row=>{const p=publishedDeepSkyIntroduction(row);return p?{...p,introduction:p.introduction+" 原文内容已修订。"}:null;}).get("M:1").data;
 assert.notEqual(normal.contentRevision,changed.contentRevision,"body-only publication revision is not masked by unchanged source metadata");
 assert.throws(()=>parseChineseIntroductionPublication(Buffer.from('{}')),/hash_mismatch/u);
});
