import { describe, expect, it } from "vitest";
import {
  evaluateDeferredReleaseGate,
  evaluateProductionCarrier,
  evaluateReleasePromotion,
  evaluateRestoreEvidence,
} from "./platform-boundary";

describe("release quality", () => {
  it("blocks OTA for native changes without new binaries", () => {
    expect(evaluateReleasePromotion({
      currentRuntimeVersion: "1",
      candidateRuntimeVersion: "1",
      nativeModulesChanged: ["amap"],
      schemaReversible: true,
      channel: "staging",
    }).promotion).toBe("blocked-native-binary-required");
  });

  it("accepts explicit external pending evidence for machine delivery without opening production", () => {
    const result = evaluateDeferredReleaseGate({
      gate: "native-field-matrix",
      status: "pending-native-and-field-validation",
      releaseBlocked: true,
    });
    expect(result.currentMachineDeliveryAccepted).toBe(true);
    expect(result.productionPromotionAllowed).toBe(false);
    expect(result.disposition).toBe("external-pending");
    expect(result.reminderRequired).toBe(true);
  });

  it("accepts completed provider carriers while keeping unactivated traffic fail-closed", () => {
    expect(evaluateProductionCarrier({
      implementationStatus: "passed",
      externalActivationStatus: "pending",
      productionEnabled: false,
    })).toEqual({
      implementationComplete: true,
      productionTrafficAllowed: false,
      externalActivationPending: true,
      disposition: "implemented-awaiting-external-activation",
    });
  });

  it("rejects pending evidence when production is not explicitly blocked", () => {
    expect(evaluateDeferredReleaseGate({
      gate: "china-production-compliance",
      status: "pending",
      releaseBlocked: false,
    }).disposition).toBe("invalid-evidence");
  });

  it("computes restore objectives without treating Redis as truth", () => {
    const result = evaluateRestoreEvidence({
      targetAt: "2026-07-20T01:10:00Z",
      latestDurableAt: "2026-07-20T01:01:00Z",
      startedAt: "2026-07-20T01:20:00Z",
      completedAt: "2026-07-20T02:01:00Z",
      databaseVerified: true,
      objectVersionsVerified: true,
      referencesVerified: true,
      permissionsVerified: true,
      redisRestored: false,
    });
    expect(result.objectivesMet).toBe(true);
    expect(result.redisRequiredForTruth).toBe(false);
  });
});
