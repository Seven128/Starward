import assert from "node:assert/strict";
import test from "node:test";
import { compassLabel, eclipseKindLabel, eventDatePresentation, eventDayLabel, eventKindLabel, eventMonthLabel, eventPlanState, eventPreviewDays, groupEventsByPeakMonth, phaseLabel } from "./event-model";

test("common event date presentation keeps annual references distinct from peaks and eclipses", () => {
  const annual = eventDatePresentation({ kind: "METEOR_SHOWER", annualReference: {} } as never);
  assert.equal(annual.ticket, "参考");
  assert.match(annual.date, /UTC/);
  assert.match(annual.precision, /不是当年精确极大/);
  const reviewed = eventDatePresentation({ kind: "METEOR_SHOWER", peakAtUtc: null } as never);
  assert.equal(reviewed.ticket, "极大");
  assert.match(reviewed.precision, /未提供极大时分/);
  assert.equal(eventDatePresentation({ kind: "SOLAR_ECLIPSE" } as never).ticket, "食甚");
  assert.match(eventDatePresentation({ kind: "SOLAR_ECLIPSE" } as never).date, /北京时间/);
});

test("event date strip includes the interval after the reference and crosses month/year boundaries", () => {
  assert.deepEqual(eventPreviewDays({ activeStartDate: "2026-12-21", activeEndDate: "2026-12-24" }).map(day => day.value),
    ["2026-12-21", "2026-12-22", "2026-12-23", "2026-12-24"]);
  const crossed = eventPreviewDays({ activeStartDate: "2026-12-31", activeEndDate: "2027-01-02" });
  assert.deepEqual(crossed.map(day => day.day), ["12/31", "1/1", "1/2"]);
  assert.equal(eventPreviewDays({ activeStartDate: "2026-07-26", activeEndDate: "2026-08-20" }).length, 26);
});

test("event catalog groups annual occurrences by peak month", () => {
  const rows = [
    { occurrenceId: "event-occurrence:a:2026", peakDate: "2026-09-10" },
    { occurrenceId: "event-occurrence:b:2026", peakDate: "2026-09-02" },
    { occurrenceId: "event-occurrence:c:2026", peakDate: "2026-10-20" },
  ] as never;
  const groups = groupEventsByPeakMonth(rows);
  assert.deepEqual(groups.map(group => [group.month, group.events.map(event => event.occurrenceId)]), [
    ["2026-09", ["event-occurrence:b:2026", "event-occurrence:a:2026"]],
    ["2026-10", ["event-occurrence:c:2026"]],
  ]);
  assert.equal(eventMonthLabel("2026-09-01"), "九月");
  assert.equal(eventDayLabel("2026-09-02"), "02");
});

test("event presentation distinguishes concrete eclipse types and local directions", () => {
  assert.equal(eventKindLabel({ kind: "LUNAR_ECLIPSE", code: "LE-T" } as never), "月食 · LE-T");
  assert.equal(eventKindLabel({ kind: "SOLAR_ECLIPSE", code: "SE-A" } as never), "日食 · SE-A");
  assert.equal(eclipseKindLabel("ANNULAR"), "环食");
  assert.equal(phaseLabel("TOTAL_BEGIN"), "食既");
  assert.equal(compassLabel(91), "东");
  assert.equal(compassLabel(359), "北");
});

test("event list distinguishes saved association from a merely overlapping plan date", () => {
  const occurrenceId = "event-occurrence:a:2026";
  const event = { occurrenceId, activeStartDate: "2026-08-01", activeEndDate: "2026-08-20" } as never;
  assert.equal(eventPlanState(event, [{ localDate: "2026-08-21" }] as never), "NONE");
  assert.equal(eventPlanState(event, [{ localDate: "2026-07-31", timing: { endLocalDate: "2026-08-02" } }] as never), "DATE_OVERLAP");
  assert.equal(eventPlanState(event, [{ localDate: "2026-09-01", eventOccurrenceIds: [occurrenceId] }] as never), "LINKED");
});
