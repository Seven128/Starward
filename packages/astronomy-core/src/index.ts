import { Body, Equator, Horizon, Illumination, Observer, SearchAltitude, SearchRiseSet } from "astronomy-engine";
export * from "./sky-capabilities";

export const ASTRONOMY_ENGINE_VERSION = "2.1.19";
export const STARWARD_ASTRONOMY_ALGORITHM = `starward-astronomy@1.0.0+astronomy-engine@${ASTRONOMY_ENGINE_VERSION}`;

export type SupportedTarget = "milky-way-core" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";

export interface AstronomyRequest {
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
  nightDate: string;
  target: SupportedTarget;
  cadenceMinutes?: number;
}

export interface SkySample {
  at: string;
  sunAltitudeDeg: number;
  moonAltitudeDeg: number;
  moonIllumination: number;
  targetAltitudeDeg: number;
  targetAzimuthDeg: number;
}

export interface NightSkyCalculation {
  algorithmVersion: string;
  coordinateSystem: "WGS84";
  refraction: "none-for-twilight-and-computed-altitudes";
  observer: { latitude: number; longitude: number; elevationM: number };
  timezone: string;
  nightDate: string;
  target: SupportedTarget;
  astronomicalDusk: string | null;
  astronomicalDawn: string | null;
  moonRise: string | null;
  moonSet: string | null;
  moonIlluminationAtMidpoint: number | null;
  samples: SkySample[];
  limitations: string[];
}

const BODY_BY_TARGET: Partial<Record<SupportedTarget, Body>> = {
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
};

function assertRequest(input: AstronomyRequest): void {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) throw new RangeError("astronomy_latitude_out_of_range");
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) throw new RangeError("astronomy_longitude_out_of_range");
  if (!Number.isFinite(input.elevationM) || input.elevationM < -500 || input.elevationM > 10_000) throw new RangeError("astronomy_elevation_out_of_range");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.nightDate)) throw new TypeError("astronomy_night_date_invalid");
  try { new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }).format(new Date()); }
  catch { throw new TypeError("astronomy_timezone_invalid"); }
  const cadence = input.cadenceMinutes ?? 30;
  if (!Number.isInteger(cadence) || cadence < 5 || cadence > 120) throw new RangeError("astronomy_cadence_out_of_range");
}

function zoneOffsetMillis(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second) - instant.getTime();
}

function localNoonUtc(nightDate: string, timezone: string): Date {
  const [year, month, day] = nightDate.split("-").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  let instant = new Date(wallClockAsUtc);
  for (let iteration = 0; iteration < 3; iteration += 1) instant = new Date(wallClockAsUtc - zoneOffsetMillis(instant, timezone));
  return instant;
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function horizontal(body: Body, at: Date, observer: Observer) {
  const equator = Equator(body, at, observer, true, true);
  return Horizon(at, observer, equator.ra, equator.dec);
}

function targetHorizontal(target: SupportedTarget, at: Date, observer: Observer) {
  if (target === "milky-way-core") {
    // Sagittarius A* vicinity, J2000; this is a direction proxy, not a brightness model.
    return Horizon(at, observer, 17.761133, -29.0078);
  }
  return horizontal(BODY_BY_TARGET[target]!, at, observer);
}

export function calculateNightSky(input: AstronomyRequest): NightSkyCalculation {
  assertRequest(input);
  const observer = new Observer(input.latitude, input.longitude, input.elevationM);
  const start = localNoonUtc(input.nightDate, input.timezone);
  const dusk = SearchAltitude(Body.Sun, observer, -1, start, 1.5, -18);
  const dawn = dusk ? SearchAltitude(Body.Sun, observer, +1, dusk.AddDays(1 / 1440), 1.5, -18) : null;
  const moonRise = SearchRiseSet(Body.Moon, observer, +1, start, 1.5);
  const moonSet = SearchRiseSet(Body.Moon, observer, -1, start, 1.5);
  const samples: SkySample[] = [];
  const cadenceMs = (input.cadenceMinutes ?? 30) * 60_000;
  if (dusk && dawn) {
    for (let millis = Date.parse(dusk.toString()); millis <= Date.parse(dawn.toString()); millis += cadenceMs) {
      const at = new Date(millis);
      const sun = horizontal(Body.Sun, at, observer);
      const moon = horizontal(Body.Moon, at, observer);
      const target = targetHorizontal(input.target, at, observer);
      samples.push({
        at: at.toISOString(),
        sunAltitudeDeg: round(sun.altitude),
        moonAltitudeDeg: round(moon.altitude),
        moonIllumination: round(Illumination(Body.Moon, at).phase_fraction, 4),
        targetAltitudeDeg: round(target.altitude),
        targetAzimuthDeg: round(target.azimuth),
      });
    }
  }
  const midpoint = dusk && dawn ? new Date((Date.parse(dusk.toString()) + Date.parse(dawn.toString())) / 2) : null;
  return {
    algorithmVersion: STARWARD_ASTRONOMY_ALGORITHM,
    coordinateSystem: "WGS84",
    refraction: "none-for-twilight-and-computed-altitudes",
    observer: { latitude: input.latitude, longitude: input.longitude, elevationM: input.elevationM },
    timezone: input.timezone,
    nightDate: input.nightDate,
    target: input.target,
    astronomicalDusk: dusk?.toString() ?? null,
    astronomicalDawn: dawn?.toString() ?? null,
    moonRise: moonRise?.toString() ?? null,
    moonSet: moonSet?.toString() ?? null,
    moonIlluminationAtMidpoint: midpoint ? round(Illumination(Body.Moon, midpoint).phase_fraction, 4) : null,
    samples,
    limitations: [
      "Astronomy Engine 版本已固定，但尚未完成本项目 JPL Horizons 多地点黄金集容差确认",
      input.target === "milky-way-core" ? "银河核心使用 Sagittarius A* 附近 J2000 方向代理，不代表银河亮度或摄影可见性" : "目标高度未结合地点地平线遮挡模型",
    ],
  };
}
