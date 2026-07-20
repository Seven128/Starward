import { calculateNightSky, type NightSkyCalculation, type SkySample, type SupportedTarget } from "../../../../../packages/astronomy-core/src/index";
import type { NightReportRequest, NightReportTarget } from "../../../../../packages/contracts/src/night-report";
import { selectContinuousWindow } from "../../../../../packages/scoring-engine/src/index";
import type { AstronomyEvidence } from "../night-report/night-report-service";

const SUPPORTED_TARGETS = new Set<SupportedTarget>(["milky-way-core", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]);
const TARGET_ORDER: SupportedTarget[] = ["milky-way-core", "moon", "venus", "mars", "jupiter", "saturn", "mercury"];
const TARGET_NAMES: Record<SupportedTarget, string> = { "milky-way-core": "银河核心", moon: "月亮", mercury: "水星", venus: "金星", mars: "火星", jupiter: "木星", saturn: "土星" };

export interface AstronomyEligibilityResult {
  eligible: boolean;
  score: number;
  confidence: number;
  impact: string;
}

export interface AstronomyEligibilityPolicy {
  readonly version: string;
  readonly difficulty: NightReportTarget["difficulty"];
  evaluate(input: { sample: SkySample; calculation: NightSkyCalculation; request: NightReportRequest }): AstronomyEligibilityResult;
}

function targetFromRequest(value: string): SupportedTarget {
  if (!SUPPORTED_TARGETS.has(value as SupportedTarget)) throw new Error("astronomy_target_unsupported");
  return value as SupportedTarget;
}

function validate(result: AstronomyEligibilityResult): AstronomyEligibilityResult {
  if (!Number.isFinite(result.score) || result.score < 0 || result.score > 100) throw new RangeError("astronomy_policy_score_out_of_range");
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) throw new RangeError("astronomy_policy_confidence_out_of_range");
  return result;
}

export class AstronomyEngineNightReportProvider {
  constructor(
    private readonly policy: AstronomyEligibilityPolicy,
    private readonly elevationM: (request: NightReportRequest) => Promise<number>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async load(request: NightReportRequest): Promise<AstronomyEvidence> {
    const elevationM = await this.elevationM(request);
    const requestedTarget = targetFromRequest(request.target);
    const calculations = TARGET_ORDER.map((target) => ({ target, calculation: calculateNightSky({
      latitude: request.location.lat, longitude: request.location.lon, elevationM,
      timezone: request.timezone, nightDate: request.nightDate, target, cadenceMinutes: 15,
    }) }));
    const requested = calculations.find((item) => item.target === requestedTarget)!;
    if (!requested.calculation.samples.length) throw new Error("astronomy_night_window_unavailable");
    const minimumMinutes = request.profile === "milky-way" ? 120 : 60;
    const evaluatedByTarget = calculations.map(({ target, calculation }) => {
      const targetRequest = { ...request, target };
      const evaluated = calculation.samples.map((sample) => ({ sample, result: validate(this.policy.evaluate({ sample, calculation, request: targetRequest })) }));
      const eligible = evaluated.map((item) => ({ at: item.sample.at, eligible: item.result.eligible }));
      const selected = selectContinuousWindow({ cadenceMinutes: 15, samples: eligible });
      const hasExecutableWindow = selected.sampleCount * selected.cadenceMinutes >= minimumMinutes;
      const peak = [...evaluated].filter((item) => item.result.eligible).sort((left, right) => right.sample.targetAltitudeDeg - left.sample.targetAltitudeDeg)[0];
      const result: NightReportTarget = {
        id: target, name: TARGET_NAMES[target], visible: Boolean(peak && hasExecutableWindow),
        window: hasExecutableWindow && selected.start && selected.end ? { start: selected.start, end: selected.end } : null,
        peak: peak ? { at: peak.sample.at, altitudeDeg: peak.sample.targetAltitudeDeg, azimuthDeg: peak.sample.targetAzimuthDeg } : null,
        difficulty: this.policy.difficulty,
        impact: hasExecutableWindow ? (peak?.result.impact ?? "当前政策下没有合格可见窗口") : `连续时长不足 ${minimumMinutes} 分钟`,
      };
      return { target, calculation, evaluated, eligible, result };
    });
    const selectedTarget = evaluatedByTarget.find((item) => item.target === requestedTarget)!;
    const score = Math.round(selectedTarget.evaluated.reduce((sum, item) => sum + item.result.score, 0) / selectedTarget.evaluated.length);
    const confidence = Math.round(Math.min(...selectedTarget.evaluated.map((item) => item.result.confidence)) * 100) / 100;
    const moonless = selectContinuousWindow({ cadenceMinutes: 15, samples: requested.calculation.samples.map((sample) => ({ at: sample.at, eligible: sample.sunAltitudeDeg <= -18 && sample.moonAltitudeDeg <= 0 })) });
    const moonlessDuration = moonless.sampleCount * moonless.cadenceMinutes;
    const unavailableTargets: NightReportTarget[] = [
      ["constellations", "主要星座"], ["meteor-showers", "流星雨"], ["comets", "彗星"], ["space-station", "空间站"], ["special-events", "特殊天象"],
    ].map(([id, name]) => ({ id, name, visible: false, window: null, peak: null, difficulty: "hard", impact: "对应星表、事件历表或轨道源尚未接入，不能推断为不可见" }));
    return {
      score,
      confidence,
      version: `${requested.calculation.algorithmVersion};policy=${this.policy.version}`,
      generatedAt: this.now().toISOString(),
      samples: selectedTarget.eligible,
      targets: [...evaluatedByTarget.map((item) => item.result), ...unavailableTargets],
      limitations: [...requested.calculation.limitations, "星座、流星雨、彗星、空间站与特殊事件需要独立获许可/版本化数据源，当前保持 unknown"],
      summary: {
        moonIllumination: requested.calculation.moonIlluminationAtMidpoint,
        moonRise: requested.calculation.moonRise,
        moonSet: requested.calculation.moonSet,
        astronomicalDusk: requested.calculation.astronomicalDusk,
        astronomicalDawn: requested.calculation.astronomicalDawn,
        moonlessWindow: moonlessDuration >= 60 && moonless.start && moonless.end ? { start: moonless.start, end: moonless.end, durationMinutes: moonlessDuration } : null,
      },
    };
  }
}
