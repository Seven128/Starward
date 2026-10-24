import type { NightReportRequest } from "../../../../packages/contracts/src/night-report";
import type { NightReportProviders } from "../modules/night-report/night-report-service";

export const nightInput: Omit<NightReportRequest, "requestId"> = {
  location: { lat: 31.23, lon: 121.47, system: "WGS84", label: "Synthetic observing place" },
  timezone: "Asia/Shanghai", nightDate: "2026-10-24", profile: "neutral", target: "milky-way-core",
  route: { origin: { lat: 31.1, lon: 121.2, system: "WGS84", label: "Synthetic departure" }, maxTravelMinutes: 120, modes: ["drive"] },
};
export function nightProviders(): NightReportProviders {
  const generatedAt = "2026-10-24T10:00:00Z";
  const samples = Array.from({ length: 8 }, (_, i) => ({ at: new Date(Date.parse("2026-10-24T12:00:00Z") + i * 900_000).toISOString(), eligible: true }));
  return {
    weather: { load: async () => ({ score: 80, confidence: 0.9, version: "synthetic-weather-v1", generatedAt, samples }) },
    astronomy: { load: async () => ({ score: 80, confidence: 0.9, version: "synthetic-astronomy-v1", generatedAt, samples, targets: [{ id: "milky-way-core", name: "Synthetic target", visible: true, window: { start: samples[0]!.at, end: samples.at(-1)!.at }, peak: { at: samples[3]!.at, altitudeDeg: 40, azimuthDeg: 150 }, difficulty: "easy", impact: "synthetic" }] }) },
    spots: { find: async () => ({ version: "synthetic-spots-v1", generatedAt, candidates: [{ id: "synthetic-spot", name: "Synthetic spot", sky: 80, access: 80, safety: 90, preference: 80, risks: [] }] }) },
    routes: { load: async () => [{ spotId: "synthetic-spot", distanceKm: 10, travelMinutes: 15, accessScore: 80, version: "synthetic-route-v1", generatedAt, state: "fresh" }] },
  };
}
