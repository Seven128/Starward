import { describe, expect, it } from "vitest";
import { ProfileService } from "./profile-service";

describe("profile service", () => {
  it("keeps guest records until an idempotent merge is acknowledged", () => {
    const service = new ProfileService(() => "2026-07-20T00:00:00Z");
    const result = service.command("merge-guest");
    expect(result.merge).toMatchObject({ state: "completed", selectedCount: 3, conflictCount: 1 });
    expect(result.localGuestData).toMatchObject({ total: 4, retainedUntilAcknowledged: true });
    expect(new Set(result.merge.idempotencyKeys).size).toBe(3);
  });

  it("revokes only the remote session and never returns token material", () => {
    const value = new ProfileService(() => "2026-07-20T00:00:00Z").command("revoke-session");
    expect(value.sessions.find((item) => item.current)?.revokedAt).toBeNull();
    expect(value.sessions.find((item) => !item.current)?.revokedAt).toBeTruthy();
    expect(JSON.stringify(value)).not.toContain("redacted-other");
  });

  it("projects export/deletion and enforces location privacy on the server", () => {
    const service = new ProfileService(() => "2026-07-20T00:00:00Z");
    expect(service.command("request-export").exportJob).toMatchObject({ schemaVersion: 1, expiresAt: "2026-07-21T00:00:00.000Z" });
    expect(service.command("request-deletion").deletion).toMatchObject({ state: "cooling-off", backupExpiryBy: "2026-10-18T00:00:00.000Z" });
    const privacy = service.command("restrict-location").privacy;
    expect(privacy).toMatchObject({ analyticsConsent: false, locationHistoryState: "deleting", sharedCoordinate: { precision: "coarse" } });
    expect(privacy.sanitizedAnalytics).not.toHaveProperty("latitude");
  });
});
