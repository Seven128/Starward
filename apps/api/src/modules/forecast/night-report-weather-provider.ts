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
  isOfficialSafetyBlock?(warning: NormalizedWeatherWarning): boolean;
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
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: request.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
    });
    const [year, month, day] = request.nightDate.split("-").map(Number);
    const followingDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
    const nightHours = run.hours.filter((hour) => {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(hour.validTimeUtc)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
      const localDate = `${parts.year}-${parts.month}-${parts.day}`;
      const localHour = Number(parts.hour);
      return (localDate === request.nightDate && localHour >= 12) || (localDate === followingDate && localHour < 12);
    });
    if (!nightHours.length) throw new Error("weather_run_missing_requested_night");
    const evaluated = nightHours.map((hour) => ({ hour, result: validateResult(this.policy.evaluate({ hour, request, activeWarnings })) }));
    const score = Math.round(evaluated.reduce((sum, item) => sum + item.result.score, 0) / evaluated.length);
    const confidence = Math.round(Math.min(...evaluated.map((item) => item.result.confidence)) * 100) / 100;
    const representative = evaluated[0]?.hour;
    return {
      score,
      confidence,
      version: `${run.provider}/${run.model}/${run.runId};policy=${this.policy.version}`,
      generatedAt: run.issuedAt,
      samples: evaluated.flatMap(({ hour, result }) => [0, 15, 30, 45].map((minutes) => ({
        at: new Date(Date.parse(hour.validTimeUtc) + minutes * 60_000).toISOString(), eligible: result.eligible,
      }))),
      warnings: activeWarnings.map((warning) => ({ id: warning.id, title: warning.title, severity: warning.severity, sources: warning.sources, safetyBlocking: this.policy.isOfficialSafetyBlock?.(warning) ?? false })),
      attribution: run.attribution.map((item) => ({ label: item.label, url: item.url, licenseId: item.licenseId, licenseVersion: item.licenseVersion })),
      qualityFlags: [...run.qualityFlags],
      summary: representative ? {
        at: representative.validTimeUtc,
        conditionText: representative.conditionText,
        temperatureC: representative.temperatureC,
        apparentTemperatureC: representative.apparentTemperatureC,
        totalCloudPct: representative.totalCloudPct,
        lowCloudPct: representative.lowCloudPct,
        midCloudPct: representative.midCloudPct,
        highCloudPct: representative.highCloudPct,
        visibilityM: representative.visibilityM,
        aqi: representative.aqi,
        windSpeedMps: representative.windSpeedMps,
        windDirectionDeg: representative.windDirectionDeg,
        precipitationProbabilityPct: representative.precipitationProbabilityPct,
        relativeHumidityPct: representative.relativeHumidityPct,
        dewPointC: representative.dewPointC,
      } : null,
    };
  }
}
