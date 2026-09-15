import { createRequire } from "node:module";
import type {
  AstronomicalEventLocalPhase,
  AstronomicalEventLocalVisibility,
  EclipseOccurrence,
  MeteorShowerOccurrence,
  MeteorRadiantDriftModel,
  MoonPhaseKey,
} from "@starward/miniapp-contracts";

type AstronomyEngine = typeof import("astronomy-engine");
type EngineBody = Parameters<AstronomyEngine["Equator"]>[0];
type EngineObserver = InstanceType<AstronomyEngine["Observer"]>;

// astronomy-engine@2.1.19 publishes an ESM entry without declaring its package
// as type=module. Node 24 therefore cannot safely consume its named ESM exports.
// The documented CommonJS entry has the same pinned implementation and types.
const require = createRequire(import.meta.url);
const engine = require("astronomy-engine") as AstronomyEngine;
const {
  Body,
  Equator,
  EquatorFromVector,
  GeoVector,
  Horizon,
  Illumination,
  MoonPhase,
  NextGlobalSolarEclipse,
  NextLunarEclipse,
  Observer,
  RotateVector,
  Rotation_EQJ_ECL,
  Rotation_ECL_EQJ,
  Rotation_EQJ_EQD,
  Spherical,
  VectorFromSphere,
  SearchAltitude,
  SearchGlobalSolarEclipse,
  SearchLocalSolarEclipse,
  SearchLunarEclipse,
  SearchRiseSet,
} = engine;

export const MINIAPP_ASTRONOMY_ALGORITHM =
  "miniapp-astronomy-engine-adapter@1.1.0+astronomy-engine@2.1.19";

export const MINIAPP_EVENT_PROJECTION_ALGORITHM =
  "miniapp-event-projection@2.0.0+astronomy-engine@2.1.19";

type EclipsePhaseKey = AstronomicalEventLocalPhase["key"];

function isoTime(value: { toString(): string }): string {
  return new Date(value.toString()).toISOString();
}

function offsetMinutes(at: string, minutes: number): string {
  return new Date(Date.parse(at) + minutes * 60_000).toISOString();
}

function calendarDateAt(at: string, timezone: string): string {
  return localDateTime(at, timezone).slice(0, 10);
}

function eclipseKind(value: string): EclipseOccurrence["eclipseKind"] {
  const normalized = value.toUpperCase();
  if (normalized === "PENUMBRAL" || normalized === "PARTIAL" || normalized === "ANNULAR" || normalized === "TOTAL")
    return normalized;
  throw new Error("astronomy_eclipse_kind_unknown");
}

/** Deterministic annual eclipse occurrences from the project's pinned ephemeris. */
export function calculateEclipseOccurrences(year: number): readonly EclipseOccurrence[] {
  if (!Number.isInteger(year) || year < 1900 || year > 2100)
    throw new RangeError("astronomy_eclipse_year_out_of_range");
  const start = new Date(Date.UTC(year, 0, 1));
  const end = Date.UTC(year + 1, 0, 1);
  const result: EclipseOccurrence[] = [];
  let lunar = SearchLunarEclipse(start);
  while (Date.parse(lunar.peak.toString()) < end) {
    const peakAtUtc = isoTime(lunar.peak);
    const phaseTimesUtc: EclipseOccurrence["phaseTimesUtc"] = {
      PENUMBRAL_BEGIN: offsetMinutes(peakAtUtc, -lunar.sd_penum),
      ...(lunar.sd_partial > 0 ? { PARTIAL_BEGIN: offsetMinutes(peakAtUtc, -lunar.sd_partial) } : {}),
      ...(lunar.sd_total > 0 ? { TOTAL_BEGIN: offsetMinutes(peakAtUtc, -lunar.sd_total) } : {}),
      PEAK: peakAtUtc,
      ...(lunar.sd_total > 0 ? { TOTAL_END: offsetMinutes(peakAtUtc, lunar.sd_total) } : {}),
      ...(lunar.sd_partial > 0 ? { PARTIAL_END: offsetMinutes(peakAtUtc, lunar.sd_partial) } : {}),
      PENUMBRAL_END: offsetMinutes(peakAtUtc, lunar.sd_penum),
    };
    const kind = eclipseKind(lunar.kind);
    const peakDate = calendarDateAt(peakAtUtc, "Asia/Shanghai");
    result.push({
      occurrenceId: `event-occurrence:lunar-eclipse:${peakDate}`,
      eventId: `lunar-eclipse:${peakDate}`,
      kind: "LUNAR_ECLIPSE",
      eclipseKind: kind,
      code: `LE-${kind.slice(0, 1)}`,
      displayName: kind === "TOTAL" ? "月全食" : kind === "PARTIAL" ? "月偏食" : "半影月食",
      activeStartDate: calendarDateAt(phaseTimesUtc.PENUMBRAL_BEGIN!, "Asia/Shanghai"),
      activeEndDate: calendarDateAt(phaseTimesUtc.PENUMBRAL_END!, "Asia/Shanghai"),
      peakDate,
      peakAtUtc,
      obscuration: Math.round(lunar.obscuration * 1_000_000) / 1_000_000,
      phaseTimesUtc,
    });
    lunar = NextLunarEclipse(lunar.peak);
  }
  let solar = SearchGlobalSolarEclipse(start);
  while (Date.parse(solar.peak.toString()) < end) {
    const peakAtUtc = isoTime(solar.peak);
    const kind = eclipseKind(solar.kind);
    const peakDate = calendarDateAt(peakAtUtc, "Asia/Shanghai");
    result.push({
      occurrenceId: `event-occurrence:solar-eclipse:${peakDate}`,
      eventId: `solar-eclipse:${peakDate}`,
      kind: "SOLAR_ECLIPSE",
      eclipseKind: kind,
      code: `SE-${kind.slice(0, 1)}`,
      displayName: kind === "TOTAL" ? "日全食" : kind === "ANNULAR" ? "日环食" : "日偏食",
      activeStartDate: peakDate,
      activeEndDate: peakDate,
      peakDate,
      peakAtUtc,
      obscuration: solar.obscuration === undefined ? null : Math.round(solar.obscuration * 1_000_000) / 1_000_000,
      phaseTimesUtc: { PEAK: peakAtUtc },
    });
    solar = NextGlobalSolarEclipse(solar.peak);
  }
  return result.sort((left, right) => left.peakAtUtc!.localeCompare(right.peakAtUtc!));
}

export function calculateSolarLongitudeJ2000(at: string): number {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) throw new Error("valid_iso_time_required");
  const sunEqj = GeoVector(Body.Sun, date, true);
  const sunEclipticJ2000 = RotateVector(Rotation_EQJ_ECL(), sunEqj);
  const longitude =
    (Math.atan2(sunEclipticJ2000.y, sunEclipticJ2000.x) * 180) / Math.PI;
  return (longitude + 360) % 360;
}

function signedLongitudeDelta(value: number, reference: number) {
  return ((value - reference + 540) % 360) - 180;
}

/**
 * The solar-longitude crossing is a calendar anchor for recurring references.
 * It is not a prediction of a meteor shower's maximum in the requested year.
 * SearchSunLongitude uses the ecliptic of date, so it cannot invert this J2000
 * quantity. Bracket the same existing J2000 ephemeris within the UTC year and
 * bisect its first crossing. Calendar years need not span exactly 360 degrees:
 * a missing crossing is an error, and a repeated crossing uses the first one.
 */
export function calculateAnnualSolarReferenceAt(year: number, solarLongitudeDeg: number): string {
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isFinite(solarLongitudeDeg) || solarLongitudeDeg < 0 || solarLongitudeDeg >= 360)
    throw new RangeError("meteor_annual_reference_invalid");
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year + 1, 0, 1) - 1;
  const startLongitude = calculateSolarLongitudeJ2000(new Date(yearStart).toISOString());
  const targetTravel = (solarLongitudeDeg - startLongitude + 360) % 360;
  if (targetTravel === 0) return new Date(yearStart).toISOString();
  let segmentStart = yearStart;
  let segmentLongitude = startLongitude;
  let travel = 0;
  while (segmentStart < yearEnd) {
    const segmentEnd = Math.min(segmentStart + 31 * 86_400_000, yearEnd);
    const endLongitude = calculateSolarLongitudeJ2000(new Date(segmentEnd).toISOString());
    const nextTravel = travel + signedLongitudeDelta(endLongitude, segmentLongitude);
    if (nextTravel >= targetTravel) {
      let left = segmentStart;
      let right = segmentEnd;
      while (right - left > 1) {
        const middle = Math.floor((left + right) / 2);
        const middleTravel = travel + signedLongitudeDelta(calculateSolarLongitudeJ2000(new Date(middle).toISOString()), segmentLongitude);
        if (middleTravel < targetTravel) left = middle;
        else right = middle;
      }
      return new Date(right).toISOString();
    }
    segmentStart = segmentEnd;
    segmentLongitude = endLongitude;
    travel = nextTravel;
  }
  throw new RangeError("meteor_solar_reference_absent_in_year");
}

/** Returns equatorial-of-date coordinates for the existing horizon owner. */
export function calculateDriftingMeteorRadiantAt(model: MeteorRadiantDriftModel, at: string) {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) throw new TypeError("astronomy_instant_invalid");
  const values = [model.referenceSolarLongitudeDeg, model.sunCenteredLongitudeDeg, model.latitudeDeg,
    model.longitudeDriftDegPerDeg, model.latitudeDriftDegPerDeg, model.validSolarOffsetMinDeg, model.validSolarOffsetMaxDeg];
  if (model.frame !== "SUN_CENTERED_ECLIPTIC_J2000" || !values.every(Number.isFinite) ||
    model.referenceSolarLongitudeDeg < 0 || model.referenceSolarLongitudeDeg >= 360 ||
    model.sunCenteredLongitudeDeg < 0 || model.sunCenteredLongitudeDeg >= 360 || Math.abs(model.latitudeDeg) > 90 ||
    model.validSolarOffsetMinDeg > 0 || model.validSolarOffsetMaxDeg < 0 ||
    model.validSolarOffsetMinDeg <= -180 || model.validSolarOffsetMaxDeg >= 180 ||
    model.validSolarOffsetMinDeg >= model.validSolarOffsetMaxDeg)
    throw new RangeError("meteor_radiant_model_invalid");
  const solarLongitudeDeg = calculateSolarLongitudeJ2000(at);
  const offset = signedLongitudeDelta(solarLongitudeDeg, model.referenceSolarLongitudeDeg);
  if (offset < model.validSolarOffsetMinDeg || offset > model.validSolarOffsetMaxDeg) return null;
  const longitude = (model.sunCenteredLongitudeDeg + model.longitudeDriftDegPerDeg * offset + solarLongitudeDeg + 720) % 360;
  const latitude = model.latitudeDeg + model.latitudeDriftDegPerDeg * offset;
  if (Math.abs(latitude) > 90) throw new RangeError("meteor_radiant_model_invalid");
  const ecliptic = VectorFromSphere(new Spherical(latitude, longitude, 1), date);
  const eqj = RotateVector(Rotation_ECL_EQJ(), ecliptic);
  const eqd = EquatorFromVector(RotateVector(Rotation_EQJ_EQD(date), eqj));
  return { rightAscensionDeg: eqd.ra * 15, declinationDeg: eqd.dec, solarLongitudeDeg };
}

/** One direction owner for current sky targets, night windows and event details. */
export function calculateMeteorRadiantAt(event: MeteorShowerOccurrence, at: string) {
  if (event.annualReference) {
    const reference = event.annualReference;
    if (!reference.radiantDrift) return null;
    // Keep the occurrence's year identity; solar checks below enforce the
    // exact within-day monitoring and measured-direction intervals.
    const instant = Date.parse(at);
    if (instant < Date.parse(event.activeStartDate + "T00:00:00Z") || instant >= Date.parse(event.activeEndDate + "T00:00:00Z") + 86_400_000) return null;
    const solar = calculateSolarLongitudeJ2000(at);
    const offset = signedLongitudeDelta(solar, reference.solarLongitudeReferenceDeg);
    if (offset < signedLongitudeDelta(reference.solarLongitudeStartDeg, reference.solarLongitudeReferenceDeg) ||
      offset > signedLongitudeDelta(reference.solarLongitudeEndDeg, reference.solarLongitudeReferenceDeg)) return null;
    return calculateDriftingMeteorRadiantAt(reference.radiantDrift, at);
  }
  if (event.radiantRightAscensionDeg === null || event.radiantDeclinationDeg === null) return null;
  return { rightAscensionDeg: event.radiantRightAscensionDeg, declinationDeg: event.radiantDeclinationDeg };
}

export type MiniappAstronomyTarget =
  | "milky-way-core"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn";

export interface MiniappAstronomyRequest {
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
  nightDate: string;
  target: MiniappAstronomyTarget;
  cadenceMinutes?: number;
  /**
   * Additional instants that must be calculated exactly alongside the regular
   * dusk-to-dawn cadence.  The caller owns the presentation axis; this
   * adapter only validates and calculates the requested instants.
   */
  additionalTimes?: readonly string[];
}

export interface MiniappHorizontalRequest {
  latitude: number;
  longitude: number;
  elevationM: number;
  at: string;
  target: MiniappAstronomyTarget;
}

export interface MiniappHorizontalCalculation {
  algorithmVersion: string;
  coordinateSystem: "WGS84";
  refraction: "none";
  at: string;
  target: MiniappAstronomyTarget;
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface MiniappEquatorialHorizontalRequest {
  latitude: number;
  longitude: number;
  elevationM: number;
  at: string;
  rightAscensionDeg: number;
  declinationDeg: number;
}

export interface MiniappEquatorialHorizontalCalculation {
  algorithmVersion: string;
  coordinateSystem: "WGS84";
  refraction: "none";
  at: string;
  rightAscensionDeg: number;
  declinationDeg: number;
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface MiniappSkySample {
  at: string;
  sunAltitudeDeg: number;
  moonAltitudeDeg: number;
  moonIllumination: number;
  moonPhase: MoonPhaseKey;
  moonPhaseAngleDeg: number;
  targetAltitudeDeg: number;
  targetAzimuthDeg: number;
}

const MOON_PHASES: readonly MoonPhaseKey[] = [
  "NEW",
  "WAXING_CRESCENT",
  "FIRST_QUARTER",
  "WAXING_GIBBOUS",
  "FULL",
  "WANING_GIBBOUS",
  "LAST_QUARTER",
  "WANING_CRESCENT",
];

export function moonPhaseKey(angleDeg: number): MoonPhaseKey {
  if (!Number.isFinite(angleDeg)) throw new RangeError("moon_phase_angle_invalid");
  const normalized = ((angleDeg % 360) + 360) % 360;
  return MOON_PHASES[Math.round(normalized / 45) % 8]!;
}

export interface MiniappNightSkyCalculation {
  algorithmVersion: string;
  coordinateSystem: "WGS84";
  refraction: "none-for-twilight-and-computed-altitudes";
  observer: { latitude: number; longitude: number; elevationM: number };
  timezone: string;
  nightDate: string;
  target: MiniappAstronomyTarget;
  civilDusk: string | null;
  nauticalDusk: string | null;
  astronomicalDusk: string | null;
  astronomicalDawn: string | null;
  nauticalDawn: string | null;
  civilDawn: string | null;
  moonRise: string | null;
  moonSet: string | null;
  moonIlluminationAtMidpoint: number | null;
  samples: MiniappSkySample[];
  limitations: string[];
}

const BODY_BY_TARGET: Partial<Record<MiniappAstronomyTarget, EngineBody>> = {
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
};

function assertObserver(
  input: Pick<
    MiniappAstronomyRequest,
    "latitude" | "longitude" | "elevationM"
  >,
): void {
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90
  )
    throw new RangeError("astronomy_latitude_out_of_range");
  if (
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  )
    throw new RangeError("astronomy_longitude_out_of_range");
  if (
    !Number.isFinite(input.elevationM) ||
    input.elevationM < -500 ||
    input.elevationM > 10_000
  )
    throw new RangeError("astronomy_elevation_out_of_range");
}

function assertRequest(input: MiniappAstronomyRequest): void {
  assertObserver(input);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.nightDate))
    throw new TypeError("astronomy_night_date_invalid");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }).format(
      new Date(),
    );
  } catch {
    throw new TypeError("astronomy_timezone_invalid");
  }
  const cadence = input.cadenceMinutes ?? 30;
  if (!Number.isInteger(cadence) || cadence < 5 || cadence > 120)
    throw new RangeError("astronomy_cadence_out_of_range");
  if (input.additionalTimes !== undefined) {
    for (const value of input.additionalTimes) {
      const instant = new Date(value);
      if (!Number.isFinite(instant.getTime()))
        throw new TypeError("astronomy_additional_time_invalid");
    }
  }
}

function zoneOffsetMillis(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = new Map(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)] as const),
  );
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  const hour = values.get("hour");
  const minute = values.get("minute");
  const second = values.get("second");
  if (
    [year, month, day, hour, minute, second].some(
      (value) => value === undefined || !Number.isFinite(value),
    )
  )
    throw new Error("astronomy_timezone_parts_unavailable");
  return (
    Date.UTC(year!, month! - 1, day!, hour!, minute!, second!) -
    instant.getTime()
  );
}

function localNoonUtc(nightDate: string, timezone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(nightDate);
  if (!match) throw new TypeError("astronomy_night_date_invalid");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  let instant = new Date(wallClockAsUtc);
  for (let iteration = 0; iteration < 3; iteration += 1)
    instant = new Date(wallClockAsUtc - zoneOffsetMillis(instant, timezone));
  return instant;
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function horizontal(body: EngineBody, at: Date, observer: EngineObserver) {
  const equator = Equator(body, at, observer, true, true);
  return Horizon(at, observer, equator.ra, equator.dec, "");
}

function targetHorizontal(
  target: MiniappAstronomyTarget,
  at: Date,
  observer: EngineObserver,
) {
  if (target === "milky-way-core") {
    return Horizon(at, observer, 17.761133, -29.0078, "");
  }
  const body = BODY_BY_TARGET[target];
  if (body === undefined) throw new Error("astronomy_target_not_supported");
  return horizontal(body, at, observer);
}

/**
 * Exposes the same airless topocentric calculation used by the night timeline
 * at an exact instant. This small deterministic surface is intentionally kept
 * separate from the UI DTO so a frozen independent ephemeris fixture can
 * validate the algorithm without sampling or copying implementation results.
 */
export function calculateTargetHorizontalAt(
  input: MiniappHorizontalRequest,
): MiniappHorizontalCalculation {
  assertObserver(input);
  const at = new Date(input.at);
  if (!Number.isFinite(at.getTime()))
    throw new TypeError("astronomy_instant_invalid");
  const observer = new Observer(
    input.latitude,
    input.longitude,
    input.elevationM,
  );
  const result = targetHorizontal(input.target, at, observer);
  return {
    algorithmVersion: MINIAPP_ASTRONOMY_ALGORITHM,
    coordinateSystem: "WGS84",
    refraction: "none",
    at: at.toISOString(),
    target: input.target,
    azimuthDeg: round(result.azimuth, 6),
    altitudeDeg: round(result.altitude, 6),
  };
}

/**
 * Projects an externally catalogued equatorial direction into the same
 * airless local horizon frame used by the built-in body calculations.
 * Catalog provenance and epoch/precision remain the caller's responsibility.
 */
export function calculateEquatorialHorizontalAt(
  input: MiniappEquatorialHorizontalRequest,
): MiniappEquatorialHorizontalCalculation {
  assertObserver(input);
  const at = new Date(input.at);
  if (!Number.isFinite(at.getTime()))
    throw new TypeError("astronomy_instant_invalid");
  if (
    !Number.isFinite(input.rightAscensionDeg) ||
    input.rightAscensionDeg < 0 ||
    input.rightAscensionDeg >= 360
  )
    throw new RangeError("astronomy_right_ascension_out_of_range");
  if (
    !Number.isFinite(input.declinationDeg) ||
    input.declinationDeg < -90 ||
    input.declinationDeg > 90
  )
    throw new RangeError("astronomy_declination_out_of_range");
  const observer = new Observer(
    input.latitude,
    input.longitude,
    input.elevationM,
  );
  const result = Horizon(
    at,
    observer,
    input.rightAscensionDeg / 15,
    input.declinationDeg,
    "",
  );
  return {
    algorithmVersion: MINIAPP_ASTRONOMY_ALGORITHM,
    coordinateSystem: "WGS84",
    refraction: "none",
    at: at.toISOString(),
    rightAscensionDeg: input.rightAscensionDeg,
    declinationDeg: input.declinationDeg,
    azimuthDeg: round(result.azimuth, 6),
    altitudeDeg: round(result.altitude, 6),
  };
}

export interface MiniappEventProjectionRequest {
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
  localDate: string;
  nightStartUtc: string;
  nightEndUtc: string;
  locationName: string;
}

function localDateTime(at: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(at));
  const value = (key: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === key)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
}

function phaseRows(
  phases: EclipseOccurrence["phaseTimesUtc"],
  timezone: string,
  observer: EngineObserver,
): AstronomicalEventLocalPhase[] {
  const order: readonly EclipsePhaseKey[] = [
    "PENUMBRAL_BEGIN", "PARTIAL_BEGIN", "TOTAL_BEGIN", "PEAK",
    "TOTAL_END", "PARTIAL_END", "PENUMBRAL_END",
  ];
  return order.flatMap(key => {
    const atUtc = phases[key];
    if (!atUtc) return [];
    const altitudeDeg = horizontal(Body.Moon, new Date(atUtc), observer).altitude;
    return [{ key, atUtc, localDateTime: localDateTime(atUtc, timezone), altitudeDeg: round(altitudeDeg) }];
  });
}

export function projectMeteorShowerAtLocation(
  event: MeteorShowerOccurrence,
  input: MiniappEventProjectionRequest,
): AstronomicalEventLocalVisibility {
  assertObserver(input);
  const base = {
    locationName: input.locationName,
    timezone: input.timezone,
    localDate: input.localDate,
    algorithmVersion: MINIAPP_EVENT_PROJECTION_ALGORITHM,
    constraints: [
      "仅计算天文黑夜、辐射方向与月光；未纳入天气、光污染及真实地平遮挡。",
      event.annualReference ? "方向采用历史样本漂移，只在资料覆盖的时段内计算；不预测当年活动率。" : "年度目录辐射点未应用逐日漂移；结果不是现场每小时可见数量。",
    ],
  };
  if (!event.annualReference && (input.localDate < event.activeStartDate || input.localDate > event.activeEndDate))
    return { ...base, state: "NOT_VISIBLE", reason: "所选日期不在这场流星雨的目录活动期内。" };
  const start = Date.parse(input.nightStartUtc);
  const end = Date.parse(input.nightEndUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("astronomy_event_night_interval_invalid");
  const observer = new Observer(input.latitude, input.longitude, input.elevationM);
  const samples: Array<{ at: string; altitude: number; azimuth: number; moon: number }> = [];
  let missingDirection = false;
  for (let at = start; at <= end; at += 15 * 60_000) {
    const date = new Date(at);
    if (horizontal(Body.Sun, date, observer).altitude > -18) continue;
    const coordinates = calculateMeteorRadiantAt(event, date.toISOString());
    if (!coordinates) { missingDirection = true; continue; }
    const radiant = Horizon(date, observer, coordinates.rightAscensionDeg / 15, coordinates.declinationDeg, "");
    if (radiant.altitude <= 0) continue;
    samples.push({
      at: date.toISOString(), altitude: radiant.altitude, azimuth: radiant.azimuth,
      moon: Illumination(Body.Moon, date).phase_fraction,
    });
  }
  if (!samples.length)
    return missingDirection || (event.annualReference && !event.annualReference.radiantDrift)
      ? { ...base, state: "UNAVAILABLE", reason: "所选夜晚的辐射方向暂无数据，无法确定本地几何观测时段。" }
      : { ...base, state: "NOT_VISIBLE", reason: "所选夜晚没有同时满足天文黑夜且辐射方向位于地平线以上的时段。" };
  const best = samples.reduce((left, right) => right.altitude > left.altitude ? right : left);
  return {
    ...base,
    constraints: [...base.constraints, ...(missingDirection ? ["部分时段方向暂无数据，所示窗口仅覆盖可计算的部分。"] : [])],
    state: "AVAILABLE",
    reason: best.altitude < 15
      ? "存在几何观测时段，但辐射方向始终较低；请结合现场地平遮挡判断。"
      : "已按所选地点和日期计算天文黑夜中的几何观测时段。",
    bestWindowStartUtc: samples[0]!.at,
    bestWindowEndUtc: samples.at(-1)!.at,
    bestAtUtc: best.at,
    bestWindowStartLocal: localDateTime(samples[0]!.at, input.timezone),
    bestWindowEndLocal: localDateTime(samples.at(-1)!.at, input.timezone),
    bestAtLocal: localDateTime(best.at, input.timezone),
    bestAltitudeDeg: round(best.altitude),
    bestAzimuthDeg: round(best.azimuth),
    moonIllumination: round(best.moon, 4),
  };
}

export function projectEclipseAtLocation(
  event: EclipseOccurrence,
  input: MiniappEventProjectionRequest,
): AstronomicalEventLocalVisibility {
  assertObserver(input);
  const observer = new Observer(input.latitude, input.longitude, input.elevationM);
  const base = {
    locationName: input.locationName,
    timezone: input.timezone,
    localDate: localDateTime(event.peakAtUtc!, input.timezone).slice(0, 10),
    algorithmVersion: MINIAPP_EVENT_PROJECTION_ALGORITHM,
    constraints: event.kind === "SOLAR_ECLIPSE"
      ? [
          "任何偏食、环食阶段都必须使用符合标准且完好的日食观测镜；普通太阳镜、相机取景器和裸眼都不能安全观测太阳。",
          "几何结果未纳入天气和真实地平遮挡。",
        ]
      : ["月球高度为几何视线结果；未纳入天气、光污染及真实地平遮挡。"],
  };
  if (event.kind === "LUNAR_ECLIPSE") {
    const phases = phaseRows(event.phaseTimesUtc, input.timezone, observer);
    const start = Date.parse(event.phaseTimesUtc.PENUMBRAL_BEGIN ?? event.peakAtUtc!);
    const end = Date.parse(event.phaseTimesUtc.PENUMBRAL_END ?? event.peakAtUtc!);
    const visible: Array<{ at: string; altitude: number; azimuth: number }> = [];
    const sampleTimes: number[] = [];
    for (let at = start; at <= end; at += 5 * 60_000) sampleTimes.push(at);
    if (sampleTimes.at(-1) !== end) sampleTimes.push(end);
    for (const at of sampleTimes) {
      const view = horizontal(Body.Moon, new Date(at), observer);
      if (view.altitude > 0) visible.push({ at: new Date(at).toISOString(), altitude: view.altitude, azimuth: view.azimuth });
    }
    if (!visible.length)
      return { ...base, state: "NOT_VISIBLE", reason: "食甚及各阶段期间月球均在所选地点的几何地平线以下。", phases };
    const best = visible.reduce((left, right) => right.altitude > left.altitude ? right : left);
    return {
      ...base, state: "AVAILABLE",
      reason: "月食期间月球至少有一段时间位于所选地点的几何地平线以上。",
      localDate: localDateTime(event.peakAtUtc!, input.timezone).slice(0, 10),
      bestWindowStartUtc: visible[0]!.at, bestWindowEndUtc: visible.at(-1)!.at,
      bestAtUtc: best.at, bestAltitudeDeg: round(best.altitude), bestAzimuthDeg: round(best.azimuth),
      bestWindowStartLocal: localDateTime(visible[0]!.at, input.timezone),
      bestWindowEndLocal: localDateTime(visible.at(-1)!.at, input.timezone),
      bestAtLocal: localDateTime(best.at, input.timezone),
      phases,
    };
  }
  const searchStart = new Date(Date.parse(event.peakAtUtc!) - 2 * 86_400_000);
  const local = SearchLocalSolarEclipse(searchStart, observer);
  const localPeak = isoTime(local.peak.time);
  if (Math.abs(Date.parse(localPeak) - Date.parse(event.peakAtUtc!)) > 2 * 86_400_000)
    return { ...base, state: "NOT_VISIBLE", reason: "这次日食在所选地点没有本地食相。" };
  const rawPhases: Array<[EclipsePhaseKey, { time: { toString(): string }; altitude: number } | undefined]> = [
    ["PARTIAL_BEGIN", local.partial_begin], ["TOTAL_BEGIN", local.total_begin],
    ["PEAK", local.peak], ["TOTAL_END", local.total_end], ["PARTIAL_END", local.partial_end],
  ];
  const phases = rawPhases.flatMap(([key, phase]) => phase ? [{
    key, atUtc: isoTime(phase.time), localDateTime: localDateTime(isoTime(phase.time), input.timezone), altitudeDeg: round(phase.altitude),
  }] : []);
  const above = phases.filter(phase => phase.altitudeDeg > 0);
  if (!above.length)
    return { ...base, localDate: localDateTime(localPeak, input.timezone).slice(0, 10), state: "NOT_VISIBLE", reason: "本地食相发生时太阳位于所选地点的几何地平线以下。", phases };
  const peakPhase = phases.find(phase => phase.key === "PEAK")!;
  return {
    ...base, state: "AVAILABLE",
    reason: "所选地点存在太阳位于几何地平线以上的本地食相；观测时必须全程遵守太阳眼安全要求。",
    localDate: peakPhase.localDateTime.slice(0, 10),
    bestWindowStartUtc: above[0]!.atUtc, bestWindowEndUtc: above.at(-1)!.atUtc,
    bestAtUtc: peakPhase.atUtc, bestAltitudeDeg: peakPhase.altitudeDeg,
    bestWindowStartLocal: above[0]!.localDateTime,
    bestWindowEndLocal: above.at(-1)!.localDateTime,
    bestAtLocal: peakPhase.localDateTime,
    bestAzimuthDeg: round(horizontal(Body.Sun, new Date(peakPhase.atUtc), observer).azimuth),
    phases,
  };
}

export function calculateMiniappNightSky(
  input: MiniappAstronomyRequest,
): MiniappNightSkyCalculation {
  assertRequest(input);
  const observer = new Observer(
    input.latitude,
    input.longitude,
    input.elevationM,
  );
  const start = localNoonUtc(input.nightDate, input.timezone);
  const civilDusk = SearchAltitude(Body.Sun, observer, -1, start, 1.5, -6);
  const nauticalDusk = SearchAltitude(Body.Sun, observer, -1, start, 1.5, -12);
  const dusk = SearchAltitude(Body.Sun, observer, -1, start, 1.5, -18);
  const dawn = dusk
    ? SearchAltitude(Body.Sun, observer, 1, dusk.AddDays(1 / 1440), 1.5, -18)
    : null;
  const nauticalDawn = nauticalDusk
    ? SearchAltitude(
        Body.Sun,
        observer,
        1,
        nauticalDusk.AddDays(1 / 1440),
        1.5,
        -12,
      )
    : null;
  const civilDawn = civilDusk
    ? SearchAltitude(
        Body.Sun,
        observer,
        1,
        civilDusk.AddDays(1 / 1440),
        1.5,
        -6,
      )
    : null;
  const moonRise = SearchRiseSet(Body.Moon, observer, 1, start, 1.5);
  const moonSet = SearchRiseSet(Body.Moon, observer, -1, start, 1.5);
  const samples: MiniappSkySample[] = [];
  const cadenceMs = (input.cadenceMinutes ?? 30) * 60_000;
  const sampleAt = (at: Date): MiniappSkySample => {
    const sun = horizontal(Body.Sun, at, observer);
    const moon = horizontal(Body.Moon, at, observer);
    const target = targetHorizontal(input.target, at, observer);
    const phaseAngle = MoonPhase(at);
    return {
      at: at.toISOString(),
      sunAltitudeDeg: round(sun.altitude),
      moonAltitudeDeg: round(moon.altitude),
      moonIllumination: round(Illumination(Body.Moon, at).phase_fraction, 4),
      moonPhase: moonPhaseKey(phaseAngle),
      moonPhaseAngleDeg: round(phaseAngle),
      targetAltitudeDeg: round(target.altitude),
      targetAzimuthDeg: round(target.azimuth),
    };
  };
  if (dusk && dawn) {
    for (
      let millis = Date.parse(dusk.toString());
      millis <= Date.parse(dawn.toString());
      millis += cadenceMs
    ) {
      samples.push(sampleAt(new Date(millis)));
    }
  }
  const existing = new Set(samples.map((sample) => sample.at));
  for (const additionalTime of input.additionalTimes ?? []) {
    const at = new Date(additionalTime);
    const iso = at.toISOString();
    if (existing.has(iso)) continue;
    samples.push(sampleAt(at));
    existing.add(iso);
  }
  samples.sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  const midpoint =
    dusk && dawn
      ? new Date(
          (Date.parse(dusk.toString()) + Date.parse(dawn.toString())) / 2,
        )
      : null;
  return {
    algorithmVersion: MINIAPP_ASTRONOMY_ALGORITHM,
    coordinateSystem: "WGS84",
    refraction: "none-for-twilight-and-computed-altitudes",
    observer: {
      latitude: input.latitude,
      longitude: input.longitude,
      elevationM: input.elevationM,
    },
    timezone: input.timezone,
    nightDate: input.nightDate,
    target: input.target,
    civilDusk: civilDusk?.toString() ?? null,
    nauticalDusk: nauticalDusk?.toString() ?? null,
    astronomicalDusk: dusk?.toString() ?? null,
    astronomicalDawn: dawn?.toString() ?? null,
    nauticalDawn: nauticalDawn?.toString() ?? null,
    civilDawn: civilDawn?.toString() ?? null,
    moonRise: moonRise?.toString() ?? null,
    moonSet: moonSet?.toString() ?? null,
    moonIlluminationAtMidpoint: midpoint
      ? round(Illumination(Body.Moon, midpoint).phase_fraction, 4)
      : null,
    samples,
    limitations: [
      "已通过 jpl-horizons-observer-airless-v1 冻结黄金集验证；声明容差为方位角和高度角各 0.01°，不适用于航天器导航",
      input.target === "milky-way-core"
        ? "银河核心使用 Sagittarius A* 附近 J2000 方向代理，不代表银河亮度或摄影可见性"
        : "目标高度未结合地点地平线遮挡模型",
    ],
  };
}
