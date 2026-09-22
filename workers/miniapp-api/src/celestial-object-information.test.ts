import assert from "node:assert/strict";
import test from "node:test";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";

test("stable HR references return attributable ready and basic-only states", () => {
  const service = new CelestialObjectInformationService();
  const sirius = service.get("HR:2491");
  assert.equal(sirius.data.displayName, "Sirius");
  assert.equal(sirius.data.contentState, "READY");
  assert.ok(sirius.data.introduction?.includes("大犬座"));
  assert.ok(sirius.data.aliases.includes("HD 48915"));
  assert.ok(sirius.data.sources.some((source) => source.provider.includes("HEASARC")));
  assert.ok(sirius.data.sources.some((source) => source.provider.includes("Star Names")));

  const unnamed = service.get("HR:2326");
  assert.equal(unnamed.data.contentState, "BASIC_ONLY");
  assert.equal(unnamed.data.introduction, null);
  assert.ok(unnamed.data.limitations.some((value) => value.includes("只有目录基本资料")));
});

test("large numeric-like and unknown references stay strings and fail closed", () => {
  const service = new CelestialObjectInformationService();
  assert.throws(() => service.get("2940472157174944128"), /celestial_object_reference_invalid/u);
  assert.throws(() => service.get("HR:1"), /celestial_object_not_found/u);
  assert.throws(() => service.get("HR:2491", "en-US"), /celestial_object_locale_unsupported/u);
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

  const basic = service.get("M:1");
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
