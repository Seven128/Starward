import { describe, expect, it } from "vitest";
import { buildLocationShare, planOfflineReplay, startSafetySession, stopSafetySession, validateObservationPack } from "./index";

describe("offline field domain", () => {
  it("activates only complete, licensed and checksum-valid required components", () => {
    const result = validateObservationPack({ id: "pack-1", revision: 2, components: [
      { id: "manifest", kind: "manifest", version: "2", bytes: 100, sha256: "ok", observedSha256: "ok", required: true, licenseAllowsOffline: true },
      { id: "map", kind: "map", version: "1", bytes: 100, sha256: "x", observedSha256: "x", required: false, licenseAllowsOffline: false },
    ] }, { now: "2026-07-20T00:00:00Z", availableBytes: 5 * 1024 ** 3, globalUsedBytes: 0 });
    expect(result.canActivate).toBe(true);
    expect(result.componentResults[1].reason).toBe("license-blocked");
  });

  it("deduplicates and orders replay dependencies", () => {
    const q = [
      { id: "media", idempotencyKey: "m1", revision: 1, dependsOn: ["report"], state: "queued" as const, createdAt: "2026-07-20T00:01:00Z" },
      { id: "report", idempotencyKey: "r1", revision: 1, dependsOn: [], state: "queued" as const, createdAt: "2026-07-20T00:00:00Z" },
      { id: "duplicate", idempotencyKey: "r1", revision: 1, dependsOn: [], state: "queued" as const, createdAt: "2026-07-20T00:02:00Z" },
    ];
    expect(planOfflineReplay(q).ordered.map((item) => item.id)).toEqual(["report", "media"]);
  });

  it("never claims background protection without permission and stops explicitly", () => {
    const session = startSafetySession({ now: "2026-07-20T12:00:00Z", plannedEndAt: "2026-07-20T16:00:00Z", backgroundPermission: false });
    expect(session.trackingClaim).toBe(false);
    expect(stopSafetySession(session).sampling).toBe("stopped");
  });

  it("does not auto-send a policy-limited location payload", () => {
    const payload = buildLocationShare({ latitude: 22.529, longitude: 113.9468, accuracyM: 8, capturedAt: "now", access: "public", recipient: "system-share-sheet", expiresAt: "later" });
    expect(payload.autoRetry).toBe(false);
    expect(payload.latitude).toBe(22.53);
  });
});
