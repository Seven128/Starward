import { describe, expect, it } from "vitest";
import { advanceDecisionContext, currentObservingNight, type DecisionContextRevision } from "./decision-context";

const current: DecisionContextRevision = {
  revision: 4,
  observingNight: "2026-07-23",
  moment: "2026-07-23T16:45:12.000Z",
  momentSource: "selected",
  timezone: "Asia/Shanghai",
  timezoneSource: "product-default",
  origin: "22.5290,113.9468",
  profileId: "profile-a",
  profileRevision: 1,
  target: "milky-way-core",
};

describe("decision context revision", () => {
  it("preserves the revision and object identity when the context is unchanged", () => {
    expect(advanceDecisionContext(current, { observingNight: current.observingNight })).toBe(current);
    expect(advanceDecisionContext(current, { moment: current.moment })).toBe(current);
  });

  it("increments once when a decision-bearing field changes", () => {
    expect(advanceDecisionContext(current, {
      observingNight: "2026-07-24",
    })).toEqual({ ...current, observingNight: "2026-07-24", moment: "2026-07-24T10:00:00.000Z", momentSource: "night-preview", revision: 5 });
  });

  it("keeps the night across local midnight and commits exact moments atomically", () => {
    const next = advanceDecisionContext(current, { moment: "2026-07-25T01:45:12+08:00" });
    expect(next).toMatchObject({ observingNight: "2026-07-24", moment: "2026-07-24T17:45:12.000Z", momentSource: "selected", revision: 5 });
    expect(currentObservingNight("Asia/Shanghai", new Date("2026-07-24T03:59:59Z"))).toBe("2026-07-23");
    expect(currentObservingNight("Asia/Shanghai", new Date("2026-07-24T04:00:00Z"))).toBe("2026-07-24");
  });

  it("rejects incomplete dates, impossible calendar dates and timezone-free instants", () => {
    for (const observingNight of ["2026-", "2026-02-30", "2026-13-01"]) expect(advanceDecisionContext(current, { observingNight })).toBe(current);
    for (const moment of ["2026-07-24T00:00:00", "2026-02-30T00:00:00Z", "2026-07-24T25:00:00Z"]) expect(advanceDecisionContext(current, { moment })).toBe(current);
  });
});
