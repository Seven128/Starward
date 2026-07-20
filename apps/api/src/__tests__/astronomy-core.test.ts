import { describe, expect, it } from "vitest";
import { calculateNightSky, STARWARD_ASTRONOMY_ALGORITHM } from "../../../../packages/astronomy-core/src/index";
import { AstronomyEngineNightReportProvider } from "../modules/astronomy/night-report-astronomy-provider";
import type { NightReportRequest } from "../../../../packages/contracts/src/night-report";

describe("deterministic astronomy core", () => {
  it("computes a Shenzhen astronomical-night timeline with versioned assumptions", () => {
    const result = calculateNightSky({ latitude: 22.529, longitude: 113.9468, elevationM: 30, timezone: "Asia/Shanghai", nightDate: "2026-08-12", target: "milky-way-core", cadenceMinutes: 30 });
    expect(result.algorithmVersion).toBe(STARWARD_ASTRONOMY_ALGORITHM);
    expect(result.astronomicalDusk).toMatch(/^2026-08-12T/u);
    expect(result.astronomicalDawn).toMatch(/^2026-08-12T|^2026-08-13T/u);
    expect(result.samples.length).toBeGreaterThan(10);
    expect(result.samples.every((sample) => sample.sunAltitudeDeg <= -17.9)).toBe(true);
    expect(result.samples.some((sample) => sample.targetAltitudeDeg > 20)).toBe(true);
    expect(result.moonIlluminationAtMidpoint).toBeGreaterThanOrEqual(0);
    expect(result.moonIlluminationAtMidpoint).toBeLessThanOrEqual(1);
    expect(result.limitations.join(" ")).toContain("JPL Horizons");
  });

  it("rejects an invalid IANA timezone instead of silently treating it as UTC", () => {
    expect(() => calculateNightSky({ latitude: 22.529, longitude: 113.9468, elevationM: 0, timezone: "China/Shenzhen", nightDate: "2026-08-12", target: "moon" })).toThrow("astronomy_timezone_invalid");
  });

  it("requires a versioned eligibility policy before astronomy can drive NightReport", async () => {
    const provider = new AstronomyEngineNightReportProvider(
      {
        version: "approved-fixture-astronomy-policy@1",
        difficulty: "medium",
        evaluate: ({ sample }) => ({ eligible: sample.targetAltitudeDeg >= 20, score: sample.targetAltitudeDeg >= 20 ? 85 : 40, confidence: 0.7, impact: "fixture altitude policy" }),
      },
      async () => 30,
      () => new Date("2026-08-12T12:00:00Z"),
    );
    const request = {
      requestId: "astronomy-1", location: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳" },
      timezone: "Asia/Shanghai", nightDate: "2026-08-12", profile: "milky-way", target: "milky-way-core",
      route: { origin: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳" }, maxTravelMinutes: 120, modes: ["drive"] },
    } satisfies NightReportRequest;
    const evidence = await provider.load(request);
    expect(evidence.version).toContain("policy=approved-fixture-astronomy-policy@1");
    expect(evidence.targets[0]).toMatchObject({ id: "milky-way-core", visible: true, difficulty: "medium" });
    expect(evidence.targets[0].peak?.altitudeDeg).toBeGreaterThan(20);
    expect(evidence.limitations?.join(" ")).toContain("JPL Horizons");
  });
});
