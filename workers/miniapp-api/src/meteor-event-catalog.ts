import type { MeteorActivityEvidence, MeteorShowerOccurrence, SourceSummary } from "@starward/miniapp-contracts";
import { calculateAnnualSolarReferenceAt } from "./astronomy-engine-adapter.ts";
import referenceData from "./data/gmn-annual-reference.ts";

export const METEOR_EVENT_CATALOG_VERSION = "gmn-annual-2022-2023.20260914.1";
export const METEOR_ACTIVITY_PROFILE_VERSION = "gmn-no-reviewed-activity-profile";
export type MeteorEventOccurrence = MeteorShowerOccurrence;
const SOURCE_ID = `meteor-catalog:${METEOR_EVENT_CATALOG_VERSION}`;

/** The acquired GMN table/trajectories do not provide a reviewed activity curve.
 * Never attach the retired NASA 2017 Perseids shape to a new GMN occurrence. */
export function meteorActivityAt(
  _occurrenceId: string, _solarLongitudeDeg: number, _localDate: string,
): MeteorActivityEvidence | null {
  return null;
}

export function meteorReferencesForYear(year: number): readonly MeteorShowerOccurrence[] {
  return referenceData.showers.map((row): MeteorShowerOccurrence => {
    const referenceAt = calculateAnnualSolarReferenceAt(year, row.solarLongitudeReferenceDeg);
    let startAt = calculateAnnualSolarReferenceAt(year, row.solarLongitudeStartDeg);
    let endAt = calculateAnnualSolarReferenceAt(year, row.solarLongitudeEndDeg);
    if (startAt > referenceAt) startAt = calculateAnnualSolarReferenceAt(year - 1, row.solarLongitudeStartDeg);
    if (endAt < referenceAt) endAt = calculateAnnualSolarReferenceAt(year + 1, row.solarLongitudeEndDeg);
    const fit = row.radiantReference;
    const radiantDrift = fit.state === "CANDIDATE" ? {
      frame: fit.frame,
      referenceSolarLongitudeDeg: fit.referenceSolarLongitudeDeg,
      sunCenteredLongitudeDeg: fit.sunCenteredLongitudeDeg,
      latitudeDeg: fit.latitudeDeg,
      longitudeDriftDegPerDeg: fit.longitudeDriftDegPerDeg,
      latitudeDriftDegPerDeg: fit.latitudeDriftDegPerDeg,
      validSolarOffsetMinDeg: fit.validSolarOffsetMinDeg,
      validSolarOffsetMaxDeg: fit.validSolarOffsetMaxDeg,
    } : null;
    const identity = `${String(row.iauNumber).padStart(3, "0")}-${row.code.toLowerCase()}`;
    return {
      kind: "METEOR_SHOWER", occurrenceId: `event-occurrence:${identity}:${year}`,
      eventId: `meteor-shower:${identity}`, iauNumber: row.iauNumber, code: row.code,
      displayName: row.displayName, activeStartDate: startAt.slice(0, 10), activeEndDate: endAt.slice(0, 10),
      peakDate: referenceAt.slice(0, 10), peakAtUtc: null, sourceId: SOURCE_ID,
      radiantRightAscensionDeg: null, radiantDeclinationDeg: null,
      velocityKmPerSecond: fit.state === "CANDIDATE" ? fit.velocityKmPerSecond : null,
      populationIndex: row.populationIndex, nominalPeakZhr: null,
      annualReference: {
        kind: "GMN_ANNUAL_MONITORING_REFERENCE", dateTimezone: "UTC",
        solarLongitudeStartDeg: row.solarLongitudeStartDeg,
        solarLongitudeReferenceDeg: row.solarLongitudeReferenceDeg,
        solarLongitudeEndDeg: row.solarLongitudeEndDeg, radiantDrift,
      },
    };
  });
}

// Existing release and plan IDs remain stable; these are newly derived annual
// references, not the displaced IMO annual forecast values.
export const METEOR_EVENTS_2026 = Object.freeze(meteorReferencesForYear(2026));

export function activeMeteorEvents(localDate: string) {
  return METEOR_EVENTS_2026.filter(event => meteorReferenceOverlapsLocalDate(event, localDate));
}

/** Candidate inclusion only: local observing nights may overlap adjacent UTC
 * calendar dates. Exact solar/fit coverage is enforced by the geometry owner. */
export function meteorReferenceOverlapsLocalDate(event: MeteorShowerOccurrence, localDate: string) {
  const padding = event.annualReference ? 86_400_000 : 0;
  const date = Date.parse(localDate);
  return date >= Date.parse(event.activeStartDate) - padding && date <= Date.parse(event.activeEndDate) + padding;
}

export function meteorEventByOccurrenceId(occurrenceId: string) {
  return METEOR_EVENTS_2026.find(event => event.occurrenceId === occurrenceId) ?? null;
}

export function meteorCatalogSource(localDate: string, state: SourceSummary["state"] = "FRESH"): SourceSummary {
  return {
    id: SOURCE_ID, kind: "HISTORICAL_RECORD", provider: "Global Meteor Network",
    title: "GMN 常年监测参考与 2022–2023 历史辐射方向",
    sourceUrl: "https://globalmeteornetwork.org/flux/", license: "CC BY 4.0 · Starward 按历史轨迹分箱整理并拟合方向",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    publishedAt: "2026-09-14T14:20:18.453Z", retrievedAt: "2026-09-14T21:22:00.000Z",
    validFrom: `${localDate.slice(0, 4)}-01-01T00:00:00.000Z`,
    validTo: `${localDate.slice(0, 4)}-12-31T23:59:59.999Z`, state, confidence: null,
    precision: "太阳黄经 J2000；UTC 日期为常年监测参考，不是当年精确极大预报",
    limitations: [
      "监测窗口不是完整物理活动边界；常年参考不预测当年特殊爆发或现场可见数量",
      "方向只在实际历史样本支持的时段内提供；缺少可审阅的流量值与活动曲线时保持暂无数据",
      "轨迹原始资料：https://globalmeteornetwork.org/data/traj_summary_data/",
      "GMN 数据收集获 NASA Meteoroid Environment Office 与 Western Meteor Physics Group 协议 80NSSC21M0073 的部分支持",
      "研究出处：Vida 等，MNRAS 506(2021) 5046–5074；515(2022) 2322–2339",
    ],
  };
}
