import { describe, expect, it } from "vitest";
import { FieldService } from "./field-service";
describe("field capability status", () => {
  it("has no pack proof, device permission, route or queue until actual owners supply them", () => {
    const status = new FieldService(() => "2026-10-24T13:20:00Z").get();
    expect(status).toEqual({ schemaVersion: "starward-field-v2", generatedAt: "2026-10-24T13:20:00Z", capabilities: { "observation-pack": "unavailable", "parking-route": "unavailable", "backup-switch": "unavailable", "safety-session": "unavailable", "location-share": "unavailable", "offline-replay": "unavailable" } });
    expect(status).not.toHaveProperty("redMode"); expect(status).not.toHaveProperty("activeSpot"); expect(status).not.toHaveProperty("session");
  });
});
