import type { NightReport } from "@starward/contracts/night-report";

const generatedAt = "2026-08-12T12:00:00Z";
const primary = { id: "spot-xichong", name: "西涌", role: "primary" as const, score: 82, distanceKm: 42.3, travelMinutes: 58, routeState: "fresh" as const, reasons: ["sky", "weather"], risks: ["停车与开放状态需临行复核"] };

export function tonightAcceptanceFixture(partial = false): NightReport {
  return {
    id: partial ? "fixture-night-partial" : "fixture-night-ready", revision: 1, requestId: "acceptance-request", generatedAt, expiresAt: "2026-08-12T12:15:00Z", status: partial ? "partial" : "ready",
    context: { location: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳市 · 南山区" }, timezone: "Asia/Shanghai", nightDate: "2026-08-12", profile: "milky-way", target: "milky-way-core", route: { origin: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳市 · 南山区" }, maxTravelMinutes: 120, modes: ["drive"] } },
    decision: { category: "good", score: 82, confidence: partial ? 0.61 : 0.78, summary: "西涌为当前主地点，存在连续观测窗口", reasons: ["低云较少", "银河窗口与无月时段重叠"], blockers: [] },
    observationWindow: { start: "2026-08-12T16:20:00Z", end: "2026-08-12T18:45:00Z", durationMinutes: 145 },
    primarySpot: primary,
    backupSpots: [
      { id: "spot-dapeng", name: "大鹏半岛", role: "near-backup", score: 76, distanceKm: 35, travelMinutes: 49, routeState: partial ? "cached" : "fresh", reasons: ["距离较近"], risks: ["暗度一般"] },
      { id: "spot-qiniang", name: "七娘山入口", role: "weather-backup", score: 73, distanceKm: 51, travelMinutes: 72, routeState: partial ? "missing" : "fresh", reasons: ["低云更少"], risks: ["最后一段需步行"] },
    ],
    targets: [{ id: "milky-way-core", name: "银河核心", visible: true, window: { start: "2026-08-12T16:35:00Z", end: "2026-08-12T18:20:00Z" }, peak: { at: "2026-08-12T17:10:00Z", altitudeDeg: 34, azimuthDeg: 168 }, difficulty: "medium", impact: "月光较弱；南偏东遮挡需现场核对" }],
    parts: {
      weather: { state: "fresh", source: "fixture-weather", sourceVersion: "weather-7", sourceTime: generatedAt, confidence: 0.82 },
      astronomy: { state: "fresh", source: "fixture-astronomy", sourceVersion: "astro-5", sourceTime: generatedAt, confidence: 0.9 },
      spots: { state: "fresh", source: "fixture-spots", sourceVersion: "spots-11", sourceTime: generatedAt, confidence: 0.8 },
      route: partial ? { state: "cached", source: "fixture-route", sourceVersion: "route-4", sourceTime: "2026-08-12T11:20:00Z", confidence: 0.55, warning: "实时路线不可用，使用缓存路线" } : { state: "fresh", source: "fixture-route", sourceVersion: "route-5", sourceTime: generatedAt, confidence: 0.85 },
    },
    warnings: partial ? ["实时路线不可用，使用缓存路线；临行必须在导航服务复核"] : [],
    provenance: [{ source: "fixture-weather", version: "weather-7", generatedAt }, { source: "fixture-astronomy", version: "astro-5", generatedAt }, { source: "fixture-spots", version: "spots-11", generatedAt }, { source: "fixture-route", version: partial ? "route-4" : "route-5", generatedAt }],
  };
}
