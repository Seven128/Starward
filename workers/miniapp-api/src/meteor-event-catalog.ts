import type {
  MeteorActivityEvidence,
  MeteorActivityStage,
  SourceSummary,
} from "@starward/miniapp-contracts";

export const METEOR_EVENT_CATALOG_VERSION = "iau-imo-reviewed-2026.1";
export const METEOR_ACTIVITY_PROFILE_VERSION =
  "nasa-meo-double-exponential-perseids-2017.1";

export interface MeteorEventOccurrence {
  occurrenceId: string;
  eventId: string;
  iauNumber: number;
  code: string;
  displayName: string;
  activeStartDate: string;
  activeEndDate: string;
  peakDate: string;
  radiantRightAscensionDeg: number;
  radiantDeclinationDeg: number;
  velocityKmPerSecond: number;
  populationIndex: number;
  nominalPeakZhr: number;
}

interface DoubleExponentialComponent {
  peakSolarLongitudeDeg: number;
  peakReferenceZhr: number;
  risingExponentPerDeg: number;
  fallingExponentPerDeg: number;
}

interface MeteorActivityProfile {
  profileId: string;
  occurrenceId: string;
  sampleStartSolarLongitudeDeg: number;
  sampleEndSolarLongitudeDeg: number;
  components: readonly DoubleExponentialComponent[];
}

const PERSEIDS_PROFILE: MeteorActivityProfile = Object.freeze({
  profileId: "activity-profile:007-per:nasa-meo-2017",
  occurrenceId: "event-occurrence:007-per:2026",
  sampleStartSolarLongitudeDeg: 115,
  sampleEndSolarLongitudeDeg: 153,
  components: Object.freeze([
    Object.freeze({
      peakSolarLongitudeDeg: 140.05,
      peakReferenceZhr: 80,
      risingExponentPerDeg: 0.35,
      fallingExponentPerDeg: 0.35,
    }),
    Object.freeze({
      peakSolarLongitudeDeg: 140.05,
      peakReferenceZhr: 23,
      risingExponentPerDeg: 0.05,
      fallingExponentPerDeg: 0.092,
    }),
  ]),
});

const ACTIVITY_PROFILES = Object.freeze([PERSEIDS_PROFILE]);

function signedSolarLongitudeDelta(value: number, peak: number): number {
  return ((value - peak + 540) % 360) - 180;
}

function componentActivity(
  component: DoubleExponentialComponent,
  solarLongitudeDeg: number,
): number {
  const delta = signedSolarLongitudeDelta(
    solarLongitudeDeg,
    component.peakSolarLongitudeDeg,
  );
  const exponent =
    delta <= 0
      ? component.risingExponentPerDeg * delta
      : -component.fallingExponentPerDeg * delta;
  return component.peakReferenceZhr * 10 ** exponent;
}

function relativeProfileActivity(
  profile: MeteorActivityProfile,
  solarLongitudeDeg: number,
): number {
  const value = profile.components.reduce(
    (sum, component) => sum + componentActivity(component, solarLongitudeDeg),
    0,
  );
  const peak = profile.components.reduce(
    (sum, component) => sum + component.peakReferenceZhr,
    0,
  );
  return Math.max(0, Math.min(1, value / peak));
}

function activityStage(relativeActivity: number): MeteorActivityStage {
  if (relativeActivity >= 0.8) return "NEAR_PEAK";
  if (relativeActivity >= 0.45) return "STRONG";
  if (relativeActivity >= 0.15) return "MODERATE";
  return "WEAK";
}

export function meteorActivityProfileSource(localDate: string): SourceSummary {
  return {
    id: `meteor-activity:${METEOR_ACTIVITY_PROFILE_VERSION}`,
    kind: "HISTORICAL_RECORD",
    provider: "NASA Meteoroid Environment Office",
    title: "Meteor Shower Forecasting for Spacecraft Operations · Perseids activity profile",
    sourceUrl: "https://ntrs.nasa.gov/citations/20170004446",
    license: "NASA NTRS public use permitted; numeric model facts used with attribution",
    licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    publishedAt: "2017-04-18T00:00:00.000Z",
    retrievedAt: new Date().toISOString(),
    validFrom: `${localDate.slice(0, 4)}-01-01T00:00:00.000Z`,
    validTo: `${localDate.slice(0, 4)}-12-31T23:59:59.999Z`,
    state: "FRESH",
    confidence: 0.78,
    precision:
      "历史/雷达资料拟合的双指数相对活动形状；太阳黄经 J2000；不代表当年实时活动",
    limitations: [
      "原模型用于近地空间流星环境预报，产品只采用其英仙座历史活动形状",
      "曲线不是 2026 年实时观测，也不是用户每小时可见数量",
      "全球参考峰窗仍以当前年度 IMO 目录为准",
    ],
  };
}

export function meteorActivityAt(
  occurrenceId: string,
  solarLongitudeDeg: number,
  localDate: string,
): MeteorActivityEvidence | null {
  const profile = ACTIVITY_PROFILES.find(
    (candidate) => candidate.occurrenceId === occurrenceId,
  );
  if (!profile) return null;
  const relativeActivity = relativeProfileActivity(profile, solarLongitudeDeg);
  const samples = [];
  for (
    let longitude = profile.sampleStartSolarLongitudeDeg;
    longitude <= profile.sampleEndSolarLongitudeDeg;
    longitude += 1
  )
    samples.push({
      solarLongitudeDeg: longitude,
      relativeActivity: relativeProfileActivity(profile, longitude),
    });
  return {
    profileId: profile.profileId,
    profileKind: "HISTORICAL_FIT",
    profileVersion: METEOR_ACTIVITY_PROFILE_VERSION,
    axis: "SOLAR_LONGITUDE_J2000",
    unit: "RELATIVE_ACTIVITY",
    referencePeakSolarLongitudeDeg:
      profile.components[0]!.peakSolarLongitudeDeg,
    currentSolarLongitudeDeg: solarLongitudeDeg,
    relativeActivity,
    stage: activityStage(relativeActivity),
    samples,
    source: meteorActivityProfileSource(localDate),
    limitations: meteorActivityProfileSource(localDate).limitations,
  };
}

/**
 * Current release subset of the IMO 2026 Working List of Visual Meteor
 * Showers. It intentionally contains the principal nighttime showers needed
 * by the trial journey, not radio/daytime-only populations. Dates, peak
 * radiants, velocity, population index and reference ZHR are copied as facts;
 * no live rate or user-visible count is inferred from them.
 */
export const METEOR_EVENTS_2026: readonly MeteorEventOccurrence[] = Object.freeze([
  {
    occurrenceId: "event-occurrence:010-qua:2026",
    eventId: "meteor-shower:010-qua",
    iauNumber: 10,
    code: "QUA",
    displayName: "象限仪座流星雨",
    activeStartDate: "2025-12-28",
    activeEndDate: "2026-01-12",
    peakDate: "2026-01-03",
    radiantRightAscensionDeg: 230,
    radiantDeclinationDeg: 49,
    velocityKmPerSecond: 41,
    populationIndex: 2.1,
    nominalPeakZhr: 80,
  },
  {
    occurrenceId: "event-occurrence:006-lyr:2026",
    eventId: "meteor-shower:006-lyr",
    iauNumber: 6,
    code: "LYR",
    displayName: "四月天琴座流星雨",
    activeStartDate: "2026-04-14",
    activeEndDate: "2026-04-30",
    peakDate: "2026-04-22",
    radiantRightAscensionDeg: 271,
    radiantDeclinationDeg: 34,
    velocityKmPerSecond: 49,
    populationIndex: 2.1,
    nominalPeakZhr: 18,
  },
  {
    occurrenceId: "event-occurrence:031-eta:2026",
    eventId: "meteor-shower:031-eta",
    iauNumber: 31,
    code: "ETA",
    displayName: "宝瓶座η流星雨",
    activeStartDate: "2026-04-19",
    activeEndDate: "2026-05-28",
    peakDate: "2026-05-06",
    radiantRightAscensionDeg: 338,
    radiantDeclinationDeg: -1,
    velocityKmPerSecond: 66,
    populationIndex: 2.4,
    nominalPeakZhr: 50,
  },
  {
    occurrenceId: "event-occurrence:005-sda:2026",
    eventId: "meteor-shower:005-sda",
    iauNumber: 5,
    code: "SDA",
    displayName: "南宝瓶座δ流星雨",
    activeStartDate: "2026-07-12",
    activeEndDate: "2026-08-23",
    peakDate: "2026-07-31",
    radiantRightAscensionDeg: 340,
    radiantDeclinationDeg: -16,
    velocityKmPerSecond: 41,
    populationIndex: 2.5,
    nominalPeakZhr: 25,
  },
  {
    occurrenceId: "event-occurrence:001-cap:2026",
    eventId: "meteor-shower:001-cap",
    iauNumber: 1,
    code: "CAP",
    displayName: "摩羯座α流星雨",
    activeStartDate: "2026-07-03",
    activeEndDate: "2026-08-15",
    peakDate: "2026-07-31",
    radiantRightAscensionDeg: 307,
    radiantDeclinationDeg: -10,
    velocityKmPerSecond: 23,
    populationIndex: 2.5,
    nominalPeakZhr: 5,
  },
  {
    occurrenceId: "event-occurrence:007-per:2026",
    eventId: "meteor-shower:007-per",
    iauNumber: 7,
    code: "PER",
    displayName: "英仙座流星雨",
    activeStartDate: "2026-07-17",
    activeEndDate: "2026-08-24",
    peakDate: "2026-08-13",
    radiantRightAscensionDeg: 48,
    radiantDeclinationDeg: 58,
    velocityKmPerSecond: 59,
    populationIndex: 2.2,
    nominalPeakZhr: 100,
  },
  {
    occurrenceId: "event-occurrence:206-aur:2026",
    eventId: "meteor-shower:206-aur",
    iauNumber: 206,
    code: "AUR",
    displayName: "御夫座流星雨",
    activeStartDate: "2026-08-28",
    activeEndDate: "2026-09-05",
    peakDate: "2026-09-01",
    radiantRightAscensionDeg: 91,
    radiantDeclinationDeg: 39,
    velocityKmPerSecond: 66,
    populationIndex: 2.5,
    nominalPeakZhr: 6,
  },
  {
    occurrenceId: "event-occurrence:208-spe:2026",
    eventId: "meteor-shower:208-spe",
    iauNumber: 208,
    code: "SPE",
    displayName: "九月英仙座ε流星雨",
    activeStartDate: "2026-09-05",
    activeEndDate: "2026-09-21",
    peakDate: "2026-09-09",
    radiantRightAscensionDeg: 48,
    radiantDeclinationDeg: 40,
    velocityKmPerSecond: 64,
    populationIndex: 2.5,
    nominalPeakZhr: 8,
  },
  {
    occurrenceId: "event-occurrence:009-dra:2026",
    eventId: "meteor-shower:009-dra",
    iauNumber: 9,
    code: "DRA",
    displayName: "十月天龙座流星雨",
    activeStartDate: "2026-10-06",
    activeEndDate: "2026-10-10",
    peakDate: "2026-10-09",
    radiantRightAscensionDeg: 262,
    radiantDeclinationDeg: 54,
    velocityKmPerSecond: 20,
    populationIndex: 2.6,
    nominalPeakZhr: 5,
  },
  {
    occurrenceId: "event-occurrence:008-ori:2026",
    eventId: "meteor-shower:008-ori",
    iauNumber: 8,
    code: "ORI",
    displayName: "猎户座流星雨",
    activeStartDate: "2026-10-02",
    activeEndDate: "2026-11-07",
    peakDate: "2026-10-21",
    radiantRightAscensionDeg: 95,
    radiantDeclinationDeg: 16,
    velocityKmPerSecond: 66,
    populationIndex: 2.5,
    nominalPeakZhr: 20,
  },
  {
    occurrenceId: "event-occurrence:013-leo:2026",
    eventId: "meteor-shower:013-leo",
    iauNumber: 13,
    code: "LEO",
    displayName: "狮子座流星雨",
    activeStartDate: "2026-11-06",
    activeEndDate: "2026-11-30",
    peakDate: "2026-11-17",
    radiantRightAscensionDeg: 152,
    radiantDeclinationDeg: 22,
    velocityKmPerSecond: 71,
    populationIndex: 2.5,
    nominalPeakZhr: 15,
  },
  {
    occurrenceId: "event-occurrence:004-gem:2026",
    eventId: "meteor-shower:004-gem",
    iauNumber: 4,
    code: "GEM",
    displayName: "双子座流星雨",
    activeStartDate: "2026-12-04",
    activeEndDate: "2026-12-20",
    peakDate: "2026-12-14",
    radiantRightAscensionDeg: 112,
    radiantDeclinationDeg: 33,
    velocityKmPerSecond: 35,
    populationIndex: 2.6,
    nominalPeakZhr: 150,
  },
  {
    occurrenceId: "event-occurrence:015-urs:2026",
    eventId: "meteor-shower:015-urs",
    iauNumber: 15,
    code: "URS",
    displayName: "小熊座流星雨",
    activeStartDate: "2026-12-17",
    activeEndDate: "2026-12-26",
    peakDate: "2026-12-22",
    radiantRightAscensionDeg: 217,
    radiantDeclinationDeg: 76,
    velocityKmPerSecond: 33,
    populationIndex: 2.8,
    nominalPeakZhr: 10,
  },
]);

export function activeMeteorEvents(localDate: string) {
  return METEOR_EVENTS_2026.filter(
    (event) =>
      localDate >= event.activeStartDate && localDate <= event.activeEndDate,
  );
}

export function meteorEventByOccurrenceId(occurrenceId: string) {
  return METEOR_EVENTS_2026.find(
    (event) => event.occurrenceId === occurrenceId,
  ) ?? null;
}

export function meteorCatalogSource(
  localDate: string,
  state: SourceSummary["state"] = "FRESH",
): SourceSummary {
  return {
    id: `meteor-catalog:${METEOR_EVENT_CATALOG_VERSION}`,
    kind: "OFFICIAL_REFERENCE",
    provider: "International Meteor Organization",
    title: "2026 Meteor Shower Calendar · Working List of Visual Meteor Showers",
    sourceUrl: "https://www.imo.net/files/meteor-shower/cal2026.pdf",
    license: "事实引用并注明来源；不主张原文或版式再分发权",
    licenseUrl: "https://www.imo.net/resources/calendar/",
    publishedAt: "2025-06-30T00:00:00.000Z",
    retrievedAt: new Date().toISOString(),
    validFrom: `${localDate.slice(0, 4)}-01-01T00:00:00.000Z`,
    validTo: `${localDate.slice(0, 4)}-12-31T23:59:59.999Z`,
    state,
    confidence: 0.9,
    precision: "活动始末、峰值日期和峰值辐射点；不包含实时活动率或现场可见数量",
    limitations: [
      "ZHR 是理想条件下辐射点位于天顶时的参考率，不是用户实际可见数量",
      "峰值辐射点未应用逐日漂移，仅用于方向引导",
      "目录资料以 IMO 后续更新和 WGN 修订为准",
    ],
  };
}
