import { calculateNightSky, type NightSkyCalculation, type SkySample, type SupportedTarget } from "../../../../../packages/astronomy-core/src/index";
import type { NightReportRequest, NightReportTarget } from "../../../../../packages/contracts/src/night-report";
import { selectContinuousWindow } from "../../../../../packages/scoring-engine/src/index";
import type { AstronomyEvidence } from "../night-report/night-report-service";

const SUPPORTED_TARGETS = new Set<SupportedTarget>(["milky-way-core", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]);

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
    const calculation = calculateNightSky({
      latitude: request.location.lat,
      longitude: request.location.lon,
      elevationM: await this.elevationM(request),
      timezone: request.timezone,
      nightDate: request.nightDate,
      target: targetFromRequest(request.target),
      cadenceMinutes: 30,
    });
    if (!calculation.samples.length) throw new Error("astronomy_night_window_unavailable");
    const evaluated = calculation.samples.map((sample) => ({ sample, result: validate(this.policy.evaluate({ sample, calculation, request })) }));
    const score = Math.round(evaluated.reduce((sum, item) => sum + item.result.score, 0) / evaluated.length);
    const confidence = Math.round(Math.min(...evaluated.map((item) => item.result.confidence)) * 100) / 100;
    const eligible = evaluated.map((item) => ({ at: item.sample.at, eligible: item.result.eligible }));
    const selected = selectContinuousWindow({ cadenceMinutes: 30, samples: eligible });
    const peak = [...evaluated].filter((item) => item.result.eligible).sort((left, right) => right.sample.targetAltitudeDeg - left.sample.targetAltitudeDeg)[0];
    const target: NightReportTarget = {
      id: request.target,
      name: request.target === "milky-way-core" ? "银河核心" : request.target,
      visible: Boolean(peak),
      window: selected.start && selected.end ? { start: selected.start, end: selected.end } : null,
      peak: peak ? { at: peak.sample.at, altitudeDeg: peak.sample.targetAltitudeDeg, azimuthDeg: peak.sample.targetAzimuthDeg } : null,
      difficulty: this.policy.difficulty,
      impact: peak?.result.impact ?? "当前政策下没有合格可见窗口",
    };
    return {
      score,
      confidence,
      version: `${calculation.algorithmVersion};policy=${this.policy.version}`,
      generatedAt: this.now().toISOString(),
      samples: eligible,
      targets: [target],
      limitations: [...calculation.limitations],
    };
  }
}
