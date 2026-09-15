import assert from "node:assert/strict";
import test from "node:test";
import { activeMeteorEvents, meteorActivityAt, METEOR_EVENT_CATALOG_VERSION, METEOR_EVENTS_2026, meteorCatalogSource, meteorEventByOccurrenceId, meteorReferencesForYear } from "./meteor-event-catalog.ts";
import { calculateMeteorRadiantAt } from "./astronomy-engine-adapter.ts";

test("GMN reference preserves 13 stable identities without old annual forecast values", () => {
  assert.match(METEOR_EVENT_CATALOG_VERSION, /^gmn-annual-/);
  assert.equal(METEOR_EVENTS_2026.length, 13);
  assert.equal(new Set(METEOR_EVENTS_2026.map(event => event.occurrenceId)).size, 13);
  for (const event of METEOR_EVENTS_2026) {
    assert.ok(event.activeStartDate <= event.peakDate && event.peakDate <= event.activeEndDate);
    assert.equal(event.annualReference?.kind, "GMN_ANNUAL_MONITORING_REFERENCE");
    assert.equal(event.annualReference?.dateTimezone, "UTC");
    assert.equal(event.peakAtUtc, null);
    assert.equal(event.nominalPeakZhr, null);
    assert.equal(event.radiantRightAscensionDeg, null);
    assert.equal(event.radiantDeclinationDeg, null);
    assert.equal(event.sourceId, meteorCatalogSource(event.peakDate).id);
  }
  assert.equal(meteorEventByOccurrenceId("event-occurrence:007-per:2026")?.code, "PER");
  assert.equal(meteorEventByOccurrenceId("event-occurrence:unknown"), null);
});

test("no retired NASA activity shape is attached to GMN peak or tail", () => {
  for (const longitude of [115, 140.05, 140.4, 150])
    assert.equal(meteorActivityAt("event-occurrence:007-per:2026", longitude, "2026-08-13"), null);
});

test("missing DRA direction retains the event; PER has a real drifting direction", () => {
  const dra = METEOR_EVENTS_2026.find(event => event.code === "DRA")!;
  assert.equal(dra.annualReference?.radiantDrift, null);
  assert.equal(calculateMeteorRadiantAt(dra, dra.peakDate + "T18:00:00Z"), null);
  assert.ok(activeMeteorEvents(dra.peakDate).some(event => event.occurrenceId === dra.occurrenceId));
  const per = meteorEventByOccurrenceId("event-occurrence:007-per:2026")!;
  const direction = calculateMeteorRadiantAt(per, "2026-08-12T18:00:00Z")!;
  assert.ok(direction);
  assert.ok(Math.abs(direction.rightAscensionDeg - 48.4747) < .02);
  assert.equal(calculateMeteorRadiantAt(per, "2026-02-12T18:00:00Z"), null);
  assert.equal(calculateMeteorRadiantAt(per, "2027-08-13T18:00:00Z"), null);
});

test("annual calendar dates are rederived while event identity remains stable", () => {
  const current = METEOR_EVENTS_2026.find(event => event.code === "PER")!;
  const next = meteorReferencesForYear(2027).find(event => event.code === "PER")!;
  assert.equal(current.peakDate, "2026-08-13");
  assert.equal(next.eventId, current.eventId);
  assert.equal(next.occurrenceId, "event-occurrence:007-per:2027");
  assert.equal(next.peakAtUtc, null);
  assert.equal(next.annualReference?.solarLongitudeReferenceDeg, 140.4);
});

test("catalog source is historical, licensed and never a local visible-count forecast", () => {
  const source = meteorCatalogSource("2026-08-13");
  assert.equal(source.kind, "HISTORICAL_RECORD");
  assert.match(source.sourceUrl, /globalmeteornetwork.org/);
  assert.match(source.license, /CC BY 4.0/);
  assert.match(source.precision, /不是当年精确极大/);
  assert.ok(source.limitations.some(item => item.includes("现场可见数量")));
  assert.equal(source.confidence, null);
});
