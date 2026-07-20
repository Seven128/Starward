import { describe, expect, it } from "vitest";
import { BASE_CHECKLIST, SHOOTING_RULE_VERSION, buildShootingPlan, calculateTrailingLimitSeconds, explainExposurePlan, mergeChecklist, saveShootingPlanVersion, type ShootingInput } from "./index";

const conditions = { capturedAt: "2026-08-12T12:00:00Z", sourceVersions: ["weather-7", "astronomy-5"], lightPollutionSqm: 20.5, moonIllumination: 0.1, totalCloudPercent: 12, windMps: 2, humidityPercent: 60, targetAltitudeDeg: 36 };
const camera: ShootingInput = { target: "milky-way", locationId: "spot-1", scheduledAt: "2026-08-12T16:40:00Z", timezone: "Asia/Shanghai", acceptsStacking: true, experience: "intermediate", conditions, equipment: { kind: "camera", model: "Fixture FF", sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: 20, maxAperture: 2.8, tracker: false, tripod: true } };

describe("versioned shooting rules", () => {
  it("produces replayable camera settings with a trailing limit and provenance", () => {
    const plan = buildShootingPlan(camera);
    expect(plan.ruleVersion).toBe(SHOOTING_RULE_VERSION); expect(plan.deterministic).toBe(true); expect(plan.settings).toMatchObject({ aperture: 2.8, iso: 1600, focalLengthMm: 20, stackingFrames: 20 }); expect(plan.risks.join(" ")).toContain("拖线"); expect(plan.provenance.sourceVersions).toEqual(["weather-7", "astronomy-5"]);
  });
  it("emits only controls supported by the phone", () => {
    const plan = buildShootingPlan({ ...camera, equipment: { kind: "phone", model: "Fixture phone", focalLengthMm: 6.8, equivalentFocalLengthMm: 24, tripod: true, controls: ["shutter", "iso", "focus"] } });
    expect(plan.settings).toMatchObject({ shutterSeconds: expect.any(Number), iso: 1600 }); expect(plan.settings.whiteBalanceK).toBeUndefined();
  });
  it("does not invent missing conditions and reduces confidence", () => {
    const plan = buildShootingPlan({ ...camera, conditions: { capturedAt: conditions.capturedAt, sourceVersions: [] } });
    expect(plan.missingConditions).toHaveLength(6); expect(plan.confidence).toBeLessThan(0.5);
  });
  it("versions recalculation without mutating the previous result", () => {
    const first = saveShootingPlanVersion(null, camera, { iso: 1600 }, "2026-08-12T12:00:00Z"); const second = saveShootingPlanVersion(first, { ...camera, conditions: { ...conditions, windMps: 8 } }, { iso: 1250 }, "2026-08-12T13:00:00Z");
    expect(second).toMatchObject({ revision: 2, previousRevision: 1, userOverrides: { iso: 1250 } }); expect(first.revision).toBe(1);
  });
  it("preserves critical checklist items and merges offline completion", () => {
    const merged = mergeChecklist([{ ...BASE_CHECKLIST[0], done: true }], []); expect(merged.find((item) => item.id === "battery")?.done).toBe(true); expect(merged.find((item) => item.id === "flash-off")?.critical).toBe(true);
  });
  it("keeps AI suggestions outside deterministic fields", () => {
    const explained = explainExposurePlan({ deterministic: { iso: 1600, seconds: 10, aperture: 2.8, ruleVersion: SHOOTING_RULE_VERSION }, aiSuggestion: { iso: 12800 } }); expect(explained.settings.iso).toBe(1600); expect(explained.ignoredSuggestion).toBe(true);
  });
  it("rejects invalid optics", () => { expect(() => calculateTrailingLimitSeconds({ focalLengthMm: 0, cropFactor: 1, tracker: false })).toThrow("invalid_optical_input"); });
});
