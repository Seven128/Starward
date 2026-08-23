import assert from "node:assert/strict";
import test from "node:test";
import {
  activeMeteorEvents,
  meteorActivityAt,
  METEOR_ACTIVITY_PROFILE_VERSION,
  METEOR_EVENT_CATALOG_VERSION,
  METEOR_EVENTS_2026,
  meteorCatalogSource,
  meteorEventByOccurrenceId,
} from "./meteor-event-catalog.ts";

test("current meteor catalog has unique attributable occurrences", () => {
  assert.equal(METEOR_EVENT_CATALOG_VERSION, "iau-imo-reviewed-2026.1");
  assert.equal(METEOR_EVENTS_2026.length, 13);
  assert.equal(
    new Set(METEOR_EVENTS_2026.map((event) => event.occurrenceId)).size,
    METEOR_EVENTS_2026.length,
  );
  for (const event of METEOR_EVENTS_2026) {
    assert.ok(event.activeStartDate <= event.peakDate);
    assert.ok(event.peakDate <= event.activeEndDate);
    assert.ok(event.radiantRightAscensionDeg >= 0);
    assert.ok(event.radiantRightAscensionDeg < 360);
    assert.ok(Math.abs(event.radiantDeclinationDeg) <= 90);
    assert.ok(event.nominalPeakZhr > 0);
  }
});

test("Perseids historical profile is attributable, solar-longitude based and normalized", () => {
  const atPeak = meteorActivityAt(
    "event-occurrence:007-per:2026",
    140.05,
    "2026-08-13",
  );
  assert.ok(atPeak);
  assert.equal(
    atPeak.profileVersion,
    METEOR_ACTIVITY_PROFILE_VERSION,
  );
  assert.equal(atPeak.axis, "SOLAR_LONGITUDE_J2000");
  assert.equal(atPeak.profileKind, "HISTORICAL_FIT");
  assert.equal(atPeak.stage, "NEAR_PEAK");
  assert.ok(Math.abs(atPeak.relativeActivity - 1) < 1e-12);
  assert.ok(atPeak.samples.length >= 30);
  assert.match(atPeak.source.sourceUrl, /ntrs\.nasa\.gov\/citations\/20170004446/u);
  assert.ok(atPeak.limitations.some((item) => item.includes("不是 2026 年实时观测")));

  const late = meteorActivityAt(
    "event-occurrence:007-per:2026",
    150,
    "2026-08-23",
  );
  assert.ok(late);
  assert.ok(late.relativeActivity < atPeak.relativeActivity);
  assert.equal(
    meteorActivityAt("event-occurrence:005-sda:2026", 130, "2026-08-01"),
    null,
  );
});

test("active lookup respects observation-night dates and stable identity", () => {
  const active = activeMeteorEvents("2026-08-23");
  assert.deepEqual(
    active.map((event) => event.code).sort(),
    ["PER", "SDA"],
  );
  assert.equal(
    meteorEventByOccurrenceId("event-occurrence:007-per:2026")?.code,
    "PER",
  );
  assert.equal(meteorEventByOccurrenceId("event-occurrence:unknown"), null);
});

test("catalog provenance distinguishes reference ZHR from visible counts", () => {
  const source = meteorCatalogSource("2026-08-23");
  assert.equal(source.kind, "OFFICIAL_REFERENCE");
  assert.match(source.sourceUrl, /imo\.net\/files\/meteor-shower\/cal2026\.pdf/u);
  assert.ok(source.limitations.some((item) => item.includes("不是用户实际可见数量")));
});
