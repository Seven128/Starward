import { describe, expect, it } from "vitest";
import { observingNightHours } from "./observing-night-hours";

const hour = (validTimeUtc: string) => ({ validTimeUtc });

describe("observingNightHours", () => {
  it("keeps the complete selected observing-night window in the declared timezone", () => {
    const hours = [
      hour("2026-07-27T09:00:00.000Z"),
      hour("2026-07-27T10:00:00.000Z"),
      hour("2026-07-27T16:00:00.000Z"),
      hour("2026-07-27T22:00:00.000Z"),
      hour("2026-07-28T00:00:00.000Z"),
      hour("2026-07-28T23:00:00.000Z"),
    ];

    expect(observingNightHours(hours, "2026-07-27", "Asia/Shanghai")).toEqual([
      hour("2026-07-27T10:00:00.000Z"),
      hour("2026-07-27T16:00:00.000Z"),
      hour("2026-07-27T22:00:00.000Z"),
    ]);
  });

  it("fails closed for invalid dates or timezones", () => {
    expect(observingNightHours([hour("2026-07-27T12:00:00.000Z")], "invalid", "Asia/Shanghai")).toEqual([]);
    expect(observingNightHours([hour("2026-07-27T12:00:00.000Z")], "2026-07-27", "invalid")).toEqual([]);
  });
});
