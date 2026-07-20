import type { NormalizedWeatherHour } from "../../../../../packages/weather-schema/src/index";
import type { AstronomyEligibilityPolicy } from "../astronomy/night-report-astronomy-provider";
import type { WeatherEligibilityPolicy } from "../forecast/night-report-weather-provider";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Initial explainable quality policy for the non-commercial POC. These values
 * decide recommendation quality only. They are not safety limits; official
 * warnings and verified access restrictions remain the only automatic blockers.
 */
export const pocWeatherEligibilityPolicy: WeatherEligibilityPolicy = {
  version: "starward-weather-quality-poc@1",
  isOfficialSafetyBlock: (warning) => /^(red|orange|extreme|severe)$/iu.test(warning.severity?.trim() ?? "") || /红色|橙色/u.test(warning.title),
  evaluate: ({ hour, activeWarnings }) => {
    const required = [hour.totalCloudPct, hour.precipitationMm, hour.visibilityM];
    const known = required.filter((value) => value !== null).length;
    const confidence = Math.round((0.45 + known / required.length * 0.35) * 100) / 100;
    const cloud = hour.totalCloudPct;
    const precipitation = hour.precipitationMm;
    const visibility = hour.visibilityM;
    const score = Math.round(clamp(
      (cloud === null ? 45 : 100 - cloud) * 0.55
      + (precipitation === null ? 45 : 100 - Math.min(100, precipitation * 35)) * 0.25
      + (visibility === null ? 45 : Math.min(100, visibility / 150)) * 0.20,
    ));
    const eligible = cloud !== null && precipitation !== null && visibility !== null
      && cloud <= 50 && precipitation <= 0.5 && visibility >= 5_000;
    const reasons = [
      cloud === null ? "总云缺失" : `总云 ${Math.round(cloud)}%`,
      precipitation === null ? "降水缺失" : `小时降水 ${precipitation} mm`,
      visibility === null ? "能见度缺失" : `能见度 ${Math.round(visibility / 1000)} km`,
      activeWarnings.length ? `存在 ${activeWarnings.length} 条有效预警，交由独立安全规则处理` : "无上游有效预警",
    ];
    return { eligible, score, confidence, reasons };
  },
};

export const pocAstronomyEligibilityPolicy: AstronomyEligibilityPolicy = {
  version: "starward-astronomy-visibility-poc@1",
  difficulty: "medium",
  evaluate: ({ sample }) => {
    const dark = sample.sunAltitudeDeg <= -18;
    const aboveUsableAltitude = sample.targetAltitudeDeg >= 20;
    const moonPenalty = sample.moonAltitudeDeg > 0 ? sample.moonIllumination * 35 : 0;
    const score = Math.round(clamp((sample.targetAltitudeDeg + 10) * 1.45 - moonPenalty));
    return {
      eligible: dark && aboveUsableAltitude,
      score,
      confidence: 0.82,
      impact: `${dark ? "天文黑夜" : "暮光未结束"} · 目标高度 ${Math.round(sample.targetAltitudeDeg)}° · 月面照明 ${Math.round(sample.moonIllumination * 100)}%`,
    };
  },
};
