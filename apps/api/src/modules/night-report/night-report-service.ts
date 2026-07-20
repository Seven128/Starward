import type { DataPart, NightReport, NightReportRequest, NightReportSpot, NightReportTarget } from "../../../../../packages/contracts/src/night-report";
import { assertNightReportRequest } from "../../../../../packages/contracts/src/night-report";
import { evaluateRecommendation, selectContinuousWindow } from "../../../../../packages/scoring-engine/src/index";

export type WeatherEvidence = {
  score: number;
  confidence: number;
  version: string;
  generatedAt: string;
  samples: Array<{ at: string; eligible: boolean }>;
  warnings?: Array<{ id: string; title: string; sources: string[] }>;
  attribution?: Array<{ label: string; url: string; licenseId: string; licenseVersion: string }>;
  qualityFlags?: string[];
};
export type AstronomyEvidence = {
  score: number;
  confidence: number;
  version: string;
  generatedAt: string;
  samples: Array<{ at: string; eligible: boolean }>;
  targets: NightReportTarget[];
  limitations?: string[];
};
export type SpotCandidate = { id: string; name: string; sky: number; access: number; safety: number; preference: number; roadClosure?: string; risks: string[] };
export type RouteEvidence = { spotId: string; distanceKm: number; travelMinutes: number; accessScore: number; version: string; generatedAt: string; state: "fresh" | "cached" };

export type NightReportProviders = {
  weather: { load(request: NightReportRequest): Promise<WeatherEvidence> };
  astronomy: { load(request: NightReportRequest): Promise<AstronomyEvidence> };
  spots: { find(request: NightReportRequest): Promise<{ version: string; generatedAt: string; candidates: SpotCandidate[] }> };
  routes: { load(request: NightReportRequest, candidates: SpotCandidate[]): Promise<RouteEvidence[]> };
};

export interface NightReportRepository {
  save(report: NightReport): Promise<NightReport>;
  find(id: string): Promise<NightReport | null>;
  findByRequestId(requestId: string): Promise<NightReport | null>;
}

export class InMemoryNightReportRepository implements NightReportRepository {
  private readonly reports = new Map<string, NightReport>();
  async save(report: NightReport) {
    const existing = await this.findByRequestId(report.requestId);
    if (existing) return existing;
    if (this.reports.has(report.id)) throw new Error("night_report_snapshot_immutable");
    this.reports.set(report.id, structuredClone(report));
    return structuredClone(report);
  }
  async find(id: string) { const report = this.reports.get(id); return report ? structuredClone(report) : null; }
  async findByRequestId(requestId: string) { const report = [...this.reports.values()].find((item) => item.requestId === requestId); return report ? structuredClone(report) : null; }
}

const missingPart = (source: string, warning: string): DataPart => ({ state: "missing", source, sourceVersion: null, sourceTime: null, confidence: 0, warning });
const evidencePart = (source: string, value: { version: string; generatedAt: string; confidence?: number }, state: DataPart["state"] = "fresh"): DataPart => ({ state, source, sourceVersion: value.version, sourceTime: value.generatedAt, confidence: value.confidence ?? 0.8 });

function overlapSamples(weather: WeatherEvidence, astronomy: AstronomyEvidence) {
  const astronomyByTime = new Map(astronomy.samples.map((sample) => [sample.at, sample.eligible]));
  return weather.samples.map((sample) => ({ at: sample.at, eligible: sample.eligible && astronomyByTime.get(sample.at) === true }));
}

function category(score: number, blocked: boolean): NightReport["decision"]["category"] {
  if (blocked) return "safety-risk";
  if (score >= 85) return "excellent";
  if (score >= 72) return "good";
  if (score >= 55) return "mixed";
  return "not-recommended";
}

export class NightReportService {
  constructor(private readonly providers: NightReportProviders, private readonly repository: NightReportRepository, private readonly now: () => Date = () => new Date(), private readonly nextId: () => string = () => crypto.randomUUID()) {}

  async create(raw: NightReportRequest): Promise<NightReport> {
    const request = assertNightReportRequest(raw);
    const existing = await this.repository.findByRequestId(request.requestId);
    if (existing) return existing;
    const generatedAt = this.now().toISOString();
    const [weatherResult, astronomyResult, spotsResult] = await Promise.allSettled([
      this.providers.weather.load(request), this.providers.astronomy.load(request), this.providers.spots.find(request),
    ]);
    const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
    const astronomy = astronomyResult.status === "fulfilled" ? astronomyResult.value : null;
    const spots = spotsResult.status === "fulfilled" ? spotsResult.value : null;
    const parts: NightReport["parts"] = {
      weather: weather ? evidencePart("weather", weather) : missingPart("weather", "天气数据不可用，不能生成出发结论"),
      astronomy: astronomy ? evidencePart("astronomy", astronomy) : missingPart("astronomy", "天文数据不可用，不能生成观测窗口"),
      spots: spots ? evidencePart("spot-catalog", { ...spots, confidence: 0.8 }) : missingPart("spot-catalog", "地点候选不可用"),
      route: missingPart("route", "尚未请求路线"),
    };
    const warnings = [
      ...Object.values(parts).flatMap((part) => part.warning ? [part.warning] : []),
      ...(weather?.qualityFlags ?? []).map((flag) => `天气数据质量：${flag}`),
      ...(weather?.warnings ?? []).map((warning) => `${warning.title}${warning.sources.length ? `（来源：${warning.sources.join("、")}）` : "（上游来源缺失）"}`),
      ...(astronomy?.limitations ?? []).map((limitation) => `天文计算限制：${limitation}`),
    ];
    if (!weather || !astronomy || !spots?.candidates.length) {
      const report: NightReport = {
        id: this.nextId(), revision: 1, requestId: request.requestId, generatedAt, expiresAt: new Date(this.now().getTime() + 15 * 60_000).toISOString(), status: "insufficient-data",
        context: { location: request.location, timezone: request.timezone, nightDate: request.nightDate, profile: request.profile, target: request.target, route: request.route },
        decision: { category: "insufficient-data", score: null, confidence: 0, summary: "关键数据不足，暂不生成出发建议", reasons: [], blockers: warnings },
        observationWindow: null, primarySpot: null, backupSpots: [], targets: astronomy?.targets ?? [], parts, warnings,
        provenance: [weather && { source: "weather", version: weather.version, generatedAt: weather.generatedAt }, astronomy && { source: "astronomy", version: astronomy.version, generatedAt: astronomy.generatedAt }, spots && { source: "spot-catalog", version: spots.version, generatedAt: spots.generatedAt }].filter(Boolean) as NightReport["provenance"],
      };
      return this.repository.save(report);
    }

    let routes: RouteEvidence[] = [];
    try {
      routes = await this.providers.routes.load(request, spots.candidates.slice(0, 8));
      const routeState = routes.some((route) => route.state === "cached") ? "cached" : "fresh";
      const newest = [...routes].sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))[0];
      parts.route = newest ? evidencePart("route", { version: newest.version, generatedAt: newest.generatedAt, confidence: routeState === "cached" ? 0.55 : 0.85 }, routeState) : missingPart("route", "路线无结果，仅显示直线距离边界");
    } catch {
      parts.route = missingPart("route", "路线供应商不可用；不会把直线距离描述为驾车路线");
    }
    const routeBySpot = new Map(routes.map((route) => [route.spotId, route]));
    const recommendation = evaluateRecommendation({ candidates: spots.candidates.map((spot) => {
      const route = routeBySpot.get(spot.id);
      return { id: spot.id, sky: Math.round((spot.sky + astronomy.score) / 2), weather: weather.score, access: route?.accessScore ?? spot.access, safety: spot.safety, preference: spot.preference, roadClosure: spot.roadClosure };
    }), profile: request.profile });
    const ranked = [...recommendation.candidates].filter((item) => !item.safetyBlocked).sort((left, right) => right.total - left.total);
    const blocked = recommendation.candidates.filter((item) => item.safetyBlocked);
    const toSpot = (candidate: typeof ranked[number], role: NightReportSpot["role"]): NightReportSpot => {
      const source = spots.candidates.find((spot) => spot.id === candidate.id)!;
      const route = routeBySpot.get(candidate.id);
      return { id: candidate.id, name: source.name, role, score: Math.round(candidate.total), distanceKm: route?.distanceKm ?? null, travelMinutes: route?.travelMinutes ?? null, routeState: route?.state ?? "missing", reasons: Object.entries(candidate.factors).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => key), risks: source.risks };
    };
    const primaryCandidate = ranked[0];
    const primarySpot = primaryCandidate ? toSpot(primaryCandidate, "primary") : null;
    const backupSpots = ranked.slice(1, 4).map((candidate, index) => toSpot(candidate, (["near-backup", "weather-backup", "dark-backup"] as const)[index]));
    const window = selectContinuousWindow({ cadenceMinutes: 30, samples: overlapSamples(weather, astronomy) });
    const observationWindow = window.start && window.end ? { start: window.start, end: window.end, durationMinutes: window.sampleCount * window.cadenceMinutes } : null;
    const score = primaryCandidate ? Math.round(primaryCandidate.total) : 0;
    const confidence = Math.round(Math.min(weather.confidence, astronomy.confidence, parts.route.confidence || 0.45) * 100) / 100;
    const blockers = blocked.map((candidate) => `${spots.candidates.find((spot) => spot.id === candidate.id)?.name ?? candidate.id}：安全阻断`);
    const status = parts.route.state === "missing" || parts.route.state === "cached" ? "partial" : primarySpot ? "ready" : "blocked";
    warnings.splice(0, warnings.length,
      ...Object.values(parts).flatMap((part) => part.warning ? [part.warning] : []),
      ...(weather.qualityFlags ?? []).map((flag) => `天气数据质量：${flag}`),
      ...(weather.warnings ?? []).map((warning) => `${warning.title}${warning.sources.length ? `（来源：${warning.sources.join("、")}）` : "（上游来源缺失）"}`),
      ...(astronomy.limitations ?? []).map((limitation) => `天文计算限制：${limitation}`),
    );
    const report: NightReport = {
      id: this.nextId(), revision: 1, requestId: request.requestId, generatedAt, expiresAt: new Date(this.now().getTime() + 15 * 60_000).toISOString(), status,
      context: { location: request.location, timezone: request.timezone, nightDate: request.nightDate, profile: request.profile, target: request.target, route: request.route },
      decision: { category: category(score, !primarySpot), score: primarySpot ? score : null, confidence, summary: primarySpot ? `${primarySpot.name} 为当前主地点，${observationWindow ? "存在连续观测窗口" : "未找到连续观测窗口"}` : "候选均被安全条件阻断", reasons: primarySpot?.reasons ?? [], blockers },
      observationWindow, primarySpot, backupSpots, targets: astronomy.targets, parts, warnings,
      provenance: [{ source: "weather", version: weather.version, generatedAt: weather.generatedAt }, { source: "astronomy", version: astronomy.version, generatedAt: astronomy.generatedAt }, { source: "spot-catalog", version: spots.version, generatedAt: spots.generatedAt }, ...routes.map((route) => ({ source: "route", version: route.version, generatedAt: route.generatedAt }))],
    };
    return this.repository.save(report);
  }
}
