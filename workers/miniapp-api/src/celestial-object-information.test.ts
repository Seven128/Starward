import assert from "node:assert/strict";
import test from "node:test";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";

test("stable HIP references return attributable ready and basic-only states", () => {
  const service = new CelestialObjectInformationService();
  const sirius = service.get("HIP:32349");
  assert.equal(sirius.data.displayName, "Sirius");
  assert.equal(sirius.data.contentState, "READY");
  assert.ok(sirius.data.introduction?.includes("大犬座"));
  assert.ok(sirius.data.aliases.includes("HD 48915"));
  assert.ok(sirius.data.sources.some((source) => source.provider.includes("Hipparcos")));
  assert.ok(sirius.data.sources.some((source) => source.provider.includes("Star Names")));

  const unnamed = service.get("HIP:30438");
  assert.equal(unnamed.data.contentState, "BASIC_ONLY");
  assert.equal(unnamed.data.introduction, null);
  assert.ok(unnamed.data.limitations.some((value) => value.includes("只有目录基本资料")));
});

test("large numeric-like and unknown references stay strings and fail closed", () => {
  const service = new CelestialObjectInformationService();
  assert.throws(() => service.get("2940472157174944128"), /celestial_object_reference_invalid/u);
  assert.throws(() => service.get("HIP:999999"), /celestial_object_not_found/u);
  assert.throws(() => service.get("HIP:32349", "en-US"), /celestial_object_locale_unsupported/u);
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

  const m42 = service.get("M:42");
  assert.equal(m42.data.kind, "NEBULA");
  assert.ok(m42.data.introduction?.includes("猎户座大星云"));

  const basic = service.get("M:1");
  assert.equal(basic.data.contentState, "BASIC_ONLY");
  assert.ok(basic.data.limitations.some((value) => value.includes("只有目录基本资料")));
});

test("same identity and locale reuse a stable content revision without sharing mutable values", () => {
  const service = new CelestialObjectInformationService();
  const first = service.get("HIP:91262");
  first.data.aliases.length;
  const second = service.get("HIP:91262");
  assert.equal(second.data.contentRevision, first.data.contentRevision);
  assert.notEqual(second, first);
  assert.notEqual(second.data, first.data);
});
