import assert from "node:assert/strict";
import test from "node:test";
import { eventPreviewContextInput } from "./event-preview-context";

test("event preview changes only a new context and never inherits a plan's old instant or route", () => {
  const original = { contextId: "plan-context", location: { kind: "FORMAL_SPOT", spotId: "spot:one" },
    localDate: "2026-09-15", selectedAtUtc: "2026-09-15T13:00:00Z", targetProfile: "METEOR",
    eventInstanceId: "event-occurrence:208-spe:2026", routeOrigin: { contextId: "origin:private" } };
  const before = structuredClone(original);
  const input = eventPreviewContextInput(original as never, "2026-08-13");
  assert.deepEqual(input, { location: { kind: "FORMAL_SPOT", spotId: "spot:one" }, localDate: "2026-08-13", targetProfile: "DAILY", eventInstanceId: null });
  assert.deepEqual(original, before);
});
