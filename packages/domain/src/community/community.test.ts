import { describe, expect, it } from "vitest";
import { applyModeration, buildSafetyCorrection, buildSpotSubmission, createContribution, materializeCurrentReports, publishReview } from "./index";

describe("community evidence", () => {
  it("expires transient reports without mutating long-term facts or history", () => {
    const evidence = createContribution({ id: "r1", kind: "field-report", contributorId: "u1", anonymousPublicly: true, capturedAt: "2026-07-20T00:00:00Z", receivedAt: "2026-07-20T00:01:00Z", source: "user-confirmed", value: { toilet: "closed-tonight", fog: true }, expiresAt: "2026-07-20T02:00:00Z", risk: "low" });
    const view = materializeCurrentReports([evidence], "2026-07-20T03:00:00Z");
    expect(view.current).toHaveLength(0); expect(view.immutableHistory).toHaveLength(1); expect(view.longTermFactsMutated).toBe(false);
  });
  it("creates a new version without overwriting original evidence", () => {
    const evidence = createContribution({ id: "c1", kind: "correction", contributorId: "u1", anonymousPublicly: false, capturedAt: "now", receivedAt: "now", source: "user-confirmed", value: { road: "closed" }, risk: "high" });
    expect(applyModeration(evidence, { decision: "publish", moderatorId: "m1", reason: "verified", decidedAt: "later" }).originalMutated).toBe(false);
  });
  it("fails closed for private land and high-risk claims", () => {
    expect(buildSpotSubmission({ latitude: 22.529, longitude: 113.9468, landStatus: "private-unknown", requestedVisibility: "public-exact", duplicateCandidates: [] }).preciseCoordinate.visibility).toBe("invite_only");
    expect(buildSafetyCorrection({ category: "closed-road", capturedAt: "now", evidenceIds: ["photo"] }).permanentClosureClaim).toBe(false);
  });
  it("keeps unexperienced review dimensions empty and excludes social feed actions", () => {
    const review = publishReview({ darkness: 4, access: 3, photography: 5, visitedAt: "now", verifiedVisit: true });
    expect(review.dimensions).not.toHaveProperty("safety"); expect(review.socialActions).toEqual([]);
  });
});
