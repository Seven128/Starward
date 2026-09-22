import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationPlan, SkyReport } from "@starward/miniapp-contracts";
import { planReference } from "./plan-reference-model";

const plan = { spotId: "spot:a", localDate: "2026-09-13", localTime: "22:00",
  contextSnapshot: { timezone: "Asia/Shanghai", selectedAtUtc: "2026-09-13T14:00:00Z" },
  timing: { endLocalDate: "2026-09-16", endLocalTime: "00:00" } } as ObservationPlan;
const row = (at: string, cloud: number | null, weatherAt: string | null = at) => ({
  at, weatherAt, cloudPercent: cloud, temperatureC: 0, windKph: 0, moonIllumination: 0,
});
const report = { context: { at: plan.contextSnapshot.selectedAtUtc, timezone: "Asia/Shanghai", spotId: "spot:a" },
  nightFacts: { startAt: "2026-09-13T04:00:00Z", endAt: "2026-09-14T04:00:00Z",
    astronomicalDuskAt: "2026-09-13T11:00:00Z", astronomicalDawnAt: "2026-09-13T21:00:00Z" },
  lunarFacts: { moonriseAt: "2026-09-13T12:00:00Z", moonsetAt: null },
  hourly: [row("2026-09-13T13:00:00Z", 99), row("2026-09-13T14:00:00Z", 0),
    row("2026-09-13T15:00:00Z", 90, null), row("2026-09-13T16:00:00Z", 40)] } as unknown as SkyReport;

test("plan reference keeps exact computed astronomy and bounded weather samples, including zero", () => {
  const facts = planReference(plan, report);
  assert.equal(facts.dusk, "2026-09-13 19:00");
  assert.equal(facts.dawn, "2026-09-14 05:00");
  assert.equal(facts.moonrise, "2026-09-13 20:00");
  assert.equal(facts.moonset, "暂无数据");
  assert.equal(facts.cloud, "0–40%");
  assert.equal(facts.wind, "0 km/h");
  assert.equal(facts.temperature, "0°C");
  assert.equal(facts.illumination, "0%");
  assert.deepEqual(facts.weatherStarts, ["2026-09-13T14:00:00Z", "2026-09-13T16:00:00Z"]);
  assert.equal(facts.nightRange, "2026-09-13 12:00–2026-09-14 12:00", "never claim full three-day coverage");
});

test("shorter plans clip weather ranges and invalid/out-of-hour samples cannot fill gaps", () => {
  const short = { ...plan, timing: { ...plan.timing!, endLocalDate: "2026-09-13", endLocalTime: "23:00" } };
  assert.equal(planReference(short, report).cloud, "0%");
  const missing = { ...report, hourly: [row("2026-09-13T14:00:00Z", 90, "2026-09-13T12:00:00Z")] } as unknown as SkyReport;
  assert.equal(planReference(plan, missing).cloud, "暂无数据");
  assert.deepEqual(planReference(plan, missing).weatherStarts, []);
});

test("wrong spot, instant or timezone never become the saved plan's reference", () => {
  for (const context of [{ ...report.context, spotId: "spot:b" },
    { ...report.context, at: "2026-09-14T14:00:00Z" }, { ...report.context, timezone: "UTC" }]) {
    const facts = planReference(plan, { ...report, context } as SkyReport);
    assert.equal(facts.cloud, "暂无数据"); assert.equal(facts.nightRange, null);
  }
});

test("missing old-cache night facts and invalid plan interval do not invent astronomy", () => {
  const old = { ...report }; delete old.nightFacts;
  assert.equal(planReference(plan, old).dusk, "暂无数据");
  assert.equal(planReference(plan, old).cloud, "0–40%");
  const legacy = { ...plan }; delete legacy.timing;
  assert.equal(planReference(legacy, report).cloud, "暂无数据");
  const absent = planReference(plan, null);
  assert.equal(absent.nightRange, null); assert.equal(absent.cloud, "暂无数据");
});
