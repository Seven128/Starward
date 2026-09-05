import { createRequire } from "node:module";

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
  GeoVector,
  Horizon,
  Illumination,
  Observer,
  RotateVector,
  Rotation_EQJ_ECL,
  SearchAltitude,
  SearchRiseSet,
} = engine;

export const MINIAPP_ASTRONOMY_ALGORITHM =
  "miniapp-astronomy-engine-adapter@1.1.0+astronomy-engine@2.1.19";

export function calculateSolarLongitudeJ2000(at: string): number {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) throw new Error("valid_iso_time_required");
  const sunEqj = GeoVector(Body.Sun, date, true);
  const sunEclipticJ2000 = RotateVector(Rotation_EQJ_ECL(), sunEqj);
  const longitude =
    (Math.atan2(sunEclipticJ2000.y, sunEclipticJ2000.x) * 180) / Math.PI;
  return (longitude + 360) % 360;
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
  targetAltitudeDeg: number;
  targetAzimuthDeg: number;
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
    return {
      at: at.toISOString(),
      sunAltitudeDeg: round(sun.altitude),
      moonAltitudeDeg: round(moon.altitude),
      moonIllumination: round(Illumination(Body.Moon, at).phase_fraction, 4),
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
    const existing = new Set(samples.map((sample) => sample.at));
    for (const additionalTime of input.additionalTimes ?? []) {
      const at = new Date(additionalTime);
      const iso = at.toISOString();
      if (existing.has(iso)) continue;
      samples.push(sampleAt(at));
      existing.add(iso);
    }
    samples.sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  }
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
