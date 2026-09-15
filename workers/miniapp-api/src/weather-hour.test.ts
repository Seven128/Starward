import assert from "node:assert/strict";
import test from "node:test";
import { weatherHourAt } from "./weather-hour.ts";

test("missing hours and outer edges never borrow a future or expired forecast", () => {
  const first = { at: "2026-09-15T12:00:00Z", cloudPercent: 0 };
  const afterHole = { at: "2026-09-15T14:00:00Z", cloudPercent: 80 };
  const rows = [first, afterHole];
  for (const at of ["2026-09-15T11:59:00Z", "2026-09-15T13:00:00Z", "2026-09-15T13:30:00Z", "2026-09-15T13:59:00Z", "2026-09-15T15:00:00Z", "invalid"])
    assert.equal(weatherHourAt(rows, at), null, at);
  for (const at of ["2026-09-15T12:00:00Z", "2026-09-15T12:30:00Z", "2026-09-15T12:59:59Z"]) assert.equal(weatherHourAt(rows, at), first);
  assert.equal(weatherHourAt(rows, afterHole.at), afterHole);
  assert.equal(weatherHourAt([], first.at), null);
});
