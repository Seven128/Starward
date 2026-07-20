import type { NightReportRequest } from "../../../../../packages/contracts/src/night-report";
import type { NormalizedWeatherHour, NormalizedWeatherRun, NormalizedWeatherWarning } from "../../../../../packages/weather-schema/src/index";
import type { WeatherEvidence } from "../night-report/night-report-service";

export interface WeatherRunLoader {
  load(request: NightReportRequest): Promise<NormalizedWeatherRun>;
}

export interface WeatherEligibilityResult {
  eligible: boolean;
  score: number;
  confidence: number;
  reasons: string[];
}

export interface WeatherEligibilityPolicy {
  readonly version: string;
  evaluate(input: {
    hour: NormalizedWeatherHour;
    request: NightReportRequest;
    activeWarnings: NormalizedWeatherWarning[];
  }): WeatherEligibilityResult;
}

function validateResult(result: WeatherEligibilityResult): WeatherEligibilityResult {
  if (!Number.isFinite(result.score) || result.score < 0 || result.score > 100) throw new RangeError("weather_policy_score_out_of_range");
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) throw new RangeError("weather_policy_confidence_out_of_range");
  return result;
}

/**
 * Converts one normalized, provenance-bearing provider run into NightReport evidence.
 * Numeric thresholds are deliberately supplied by a versioned policy; this adapter
 * must not invent safety limits or silently reinterpret missing provider fields.
 */
export class NormalizedNightReportWeatherProvider {
  constructor(private readonly loader: WeatherRunLoader, private readonly policy: WeatherEligibilityPolicy) {}

  async load(request: NightReportRequest): Promise<WeatherEvidence> {
    const run = await this.loader.load(request);
    if (!run.hours.length) throw new Error("weather_run_has_no_hours");
    const activeWarnings = run.warnings.filter((warning) => warning.status === "active");
    const evaluated = run.hours.map((hour) => ({ hour, result: validateResult(this.policy.evaluate({ hour, request, activeWarnings })) }));
    const score = Math.round(evaluated.reduce((sum, item) => sum + item.result.score, 0) / evaluated.length);
    const confidence = Math.round(Math.min(...evaluated.map((item) => item.result.confidence)) * 100) / 100;
    return {
      score,
      confidence,
      version: `${run.provider}/${run.model}/${run.runId};policy=${this.policy.version}`,
      generatedAt: run.issuedAt,
      samples: evaluated.map(({ hour, result }) => ({ at: hour.validTimeUtc, eligible: result.eligible })),
      warnings: activeWarnings.map((warning) => ({ id: warning.id, title: warning.title, sources: warning.sources })),
      attribution: run.attribution.map((item) => ({ label: item.label, url: item.url, licenseId: item.licenseId, licenseVersion: item.licenseVersion })),
      qualityFlags: [...run.qualityFlags],
    };
  }
}
