import { describe, expect, it } from "vitest";
import { normalizeApplicationPathname } from "./application-route";

describe("application route normalization", () => {
  it("preserves the five primary physical routes and contribution route", () => {
    expect(normalizeApplicationPathname("/tonight")).toBe("/tonight");
    expect(normalizeApplicationPathname("/map")).toBe("/map");
    expect(normalizeApplicationPathname("/trips/")).toBe("/trips");
    expect(normalizeApplicationPathname("/sky")).toBe("/sky");
    expect(normalizeApplicationPathname("/me")).toBe("/me");
    expect(normalizeApplicationPathname("/contribute/")).toBe("/contribute");
    expect(normalizeApplicationPathname("/forecast")).toBe("/forecast");
  });
});
