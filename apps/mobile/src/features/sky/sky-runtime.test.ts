import { describe, expect, it } from "vitest";
import { OrientationEngine } from "../../../modules/orientation/orientation-engine";
import { resolveArMode } from "../../../modules/sky-ar/sky-ar-adapter";
import { calculateFieldOfView, catalogChunks, positionCatalog, visibleIntervals } from "../../../../../packages/astronomy-core/src/sky-model";

describe("sky runtime", () => {
  it("stops following when magnetic interference makes absolute heading untrustworthy", () => {
    const engine = new OrientationEngine();
    const state = engine.update({ timestampMs: 1_000, attitude: { yawDeg: 20, pitchDeg: 5, rollDeg: 0 }, magneticHeadingDeg: 180, magneticFieldMicrotesla: 96, declinationDeg: -2 });
    expect(state).toMatchObject({ accuracy: "low", following: false, anomaly: "magnetic-interference" });
    expect(state.guidance).toContain("八字校准");
  });

  it("uses circular smoothing and true-north correction for healthy samples", () => {
    const engine = new OrientationEngine();
    engine.update({ timestampMs: 1_000, attitude: { yawDeg: 355, pitchDeg: 0, rollDeg: 0 }, magneticHeadingDeg: 355, magneticFieldMicrotesla: 48, declinationDeg: 3 });
    const state = engine.update({ timestampMs: 1_100, attitude: { yawDeg: 1, pitchDeg: 2, rollDeg: 1 }, magneticHeadingDeg: 1, magneticFieldMicrotesla: 49, declinationDeg: 3 });
    expect(state.following).toBe(true);
    expect(state.northReference).toBe("true");
    expect(state.headingDeg < 10 || state.headingDeg > 350).toBe(true);
  });

  it("never makes AR a blocker and hides overlays when tracking is lost", () => {
    expect(resolveArMode({ platform: "arcore", cameraPermission: "granted", tracking: "lost" })).toMatchObject({ mode: "universal-sky", trustworthyOverlay: false });
    expect(resolveArMode({ platform: "none", cameraPermission: "denied", tracking: "unavailable" }).reason).toContain("通用天空");
  });

  it("requires complete optical inputs before creating a field-of-view overlay", () => {
    expect(calculateFieldOfView({ sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: 24, orientation: "landscape" })).toMatchObject({ horizontalDeg: expect.any(Number), verticalDeg: expect.any(Number) });
    expect(calculateFieldOfView({ sensorWidthMm: 36, orientation: "landscape" })).toBeNull();
  });

  it("positions a progressively loaded catalog and keeps obstruction provenance separate", () => {
    expect(catalogChunks(4).map((chunk) => chunk.key)).toEqual(["bright", "deep"]);
    const objects = positionCatalog({ at: new Date("2026-08-12T16:40:00Z"), latitude: 22.529, longitude: 113.9468, elevationM: 620, magnitudeLimit: 4 });
    expect(objects).toHaveLength(5);
    expect(objects.every((object) => object.obstructed === null)).toBe(true);
    expect(visibleIntervals([{ at: "00:00", altitudeDeg: 10, azimuthDeg: 90 }])[0]).toMatchObject({ evidence: "astronomical-horizon", visible: true });
  });
});
