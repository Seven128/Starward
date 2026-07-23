import { describe, expect, it } from "vitest";
import { normalizeApplicationPathname } from "./application-route";

describe("application route normalization", () => {
  it("shares source-plan aliases across web and native routing", () => {
    expect(normalizeApplicationPathname("/me")).toBe("/profile");
    expect(normalizeApplicationPathname("/trips/")).toBe("/plans");
    expect(normalizeApplicationPathname("/forecast")).toBe("/forecast");
  });
});
