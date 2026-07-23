import { describe, expect, it } from "vitest";
import { advanceDecisionContext, type DecisionContextRevision } from "./decision-context";

const current: DecisionContextRevision = {
  revision: 4,
  observingNight: "2026-07-23",
  origin: "22.5290,113.9468",
  profileId: "profile-a",
  target: "milky-way-core",
};

describe("decision context revision", () => {
  it("preserves the revision and object identity when the context is unchanged", () => {
    expect(advanceDecisionContext(current, { ...current })).toBe(current);
  });

  it("increments once when a decision-bearing field changes", () => {
    expect(advanceDecisionContext(current, {
      ...current,
      observingNight: "2026-07-24",
    })).toEqual({ ...current, observingNight: "2026-07-24", revision: 5 });
  });
});
