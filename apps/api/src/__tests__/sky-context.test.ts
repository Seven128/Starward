import { describe, expect, it } from "vitest";
import { parseSkyQuery } from "../../../../packages/contracts/src/sky";
import { createSkyContextHandler } from "../modules/sky/sky-context-handler";
import { SkyContextService } from "../modules/sky/sky-context-service";
import { MILKY_WAY_CORE_DIRECTION } from "../../../../packages/astronomy-core/src/milky-way-direction";
import { EquatorFromVector, Horizon, Observer, RotateVector, Rotation_EQJ_EQD, Spherical, VectorFromSphere } from "../../../../packages/astronomy-core/src/astronomy-engine-runtime";

const query = {
  latitude: "22.529", longitude: "113.9468", elevationM: "18", timezone: "Asia/Shanghai",
  at: "2026-08-12T16:40:00.000Z", target: "milky-way-core",
};

describe("sky context boundary", () => {
  it("validates WGS84, timezone, time and target inputs", () => {
    expect(parseSkyQuery(query)).toMatchObject({ latitude: 22.529, longitude: 113.9468, target: "milky-way-core" });
    expect(() => parseSkyQuery({ ...query, latitude: 91 })).toThrow("sky_latitude_invalid");
    expect(() => parseSkyQuery({ ...query, timezone: "Mars/Olympus" })).toThrow("sky_timezone_invalid");
    expect(() => parseSkyQuery({ ...query, at: "not-a-date" })).toThrow("sky_time_invalid");
  });

  it("computes positions and a 15-minute trajectory without inventing a site horizon", async () => {
    const service = new SkyContextService(() => new Date("2026-08-12T12:00:00.000Z"));
    const result = await service.get(parseSkyQuery(query));
    expect(result.objects.find((item) => item.id === "milky-way-core")).toBeTruthy();
    expect(result.trajectory).toHaveLength(97);
    expect(result.bestTargetTime).toMatch(/^2026-/u);
    expect(result.horizon).toBeNull();
    expect(result.warnings[0]).toContain("不推断");
    expect(result.selectedTarget?.magnitude).toBeNull();
    expect(result.algorithm.refraction).toBe("none");
    expect(result.warnings.join(" ")).toContain("方向代理");
    const at = new Date(query.at);
    const equator = EquatorFromVector(RotateVector(Rotation_EQJ_EQD(at), VectorFromSphere(
      new Spherical(MILKY_WAY_CORE_DIRECTION.decDeg, MILKY_WAY_CORE_DIRECTION.raHours * 15, 1), at,
    )));
    const expected = Horizon(at, new Observer(Number(query.latitude), Number(query.longitude), Number(query.elevationM)), equator.ra, equator.dec, "");
    expect(result.selectedTarget!.altitudeDeg).toBeCloseTo(expected.altitude, 9);
    expect(result.selectedTarget!.azimuthDeg).toBeCloseTo(expected.azimuth, 9);
  });

  it.each([
    ["sirius", "HIP:32349"], ["vega", "HIP:91262"],
    ["antares", "HIP:80763"], ["m31", "M:31"],
  ])("preserves the supported %s target through its real catalog identity", async (target, sourceId) => {
    const service = new SkyContextService();
    const result = await service.get(parseSkyQuery({ ...query, target }));
    expect(result.selectedTarget).toMatchObject({ id: target, sourceId, obstructed: null });
    expect(result.objects.find(item => item.id === target)).toEqual(result.selectedTarget);
    expect(Number.isFinite(result.selectedTarget?.magnitude)).toBe(true);
    expect(result.trajectory).toHaveLength(97);
    expect(result.trajectory[0].at).toBe(result.context.at);
    expect(result.trajectory[0].altitudeDeg).toBe(result.selectedTarget!.altitudeDeg);
    expect(result.trajectory.at(-1)!.at).toBe(new Date(Date.parse(query.at) + 24 * 60 * 60_000).toISOString());
    expect(new Set(result.trajectory.map(sample => sample.altitudeDeg)).size).toBeGreaterThan(1);
  });

  it("reprojects the chosen target for changed time and observer without reusing the old sky", async () => {
    const service = new SkyContextService();
    const first = await service.get(parseSkyQuery(query));
    const changed = await service.get(parseSkyQuery({ ...query, latitude: 40, longitude: -70, at: "2026-08-13T02:40:00.000Z" }));
    expect(changed.selectedTarget!.altitudeDeg).not.toBe(first.selectedTarget!.altitudeDeg);
    expect(changed.selectedTarget!.azimuthDeg).not.toBe(first.selectedTarget!.azimuthDeg);
    expect(changed.trajectory[0].at).toBe(changed.context.at);
    expect(changed.horizon).toBeNull();
  });

  it("returns a bounded client error for invalid queries", async () => {
    const handler = createSkyContextHandler(new SkyContextService());
    await expect(handler({ ...query, target: "invented" })).resolves.toMatchObject({ status: 400, body: { code: "sky_target_invalid" } });
  });
});
