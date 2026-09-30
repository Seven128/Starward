import {
  degreesToRadians,
  ecfToLookAngles,
  eciToEcf,
  gstime,
  json2satrec,
  propagate,
  radiansToDegrees,
  type OMMJsonObject,
} from "satellite.js";

/** A bounded SGP4 calculation for one Earth-centered CelesTrak GP/OMM row.
 * Fetch cadence, publication rights and the acceptable epoch age belong to
 * the caller; this module never turns an old orbit into a current position.
 */
export type OmmLookResult =
  | { state: "AVAILABLE"; catalogId: string; epochAt: string; at: string; epochAgeMinutes: number;
      azimuthDeg: number; altitudeDeg: number; rangeKm: number }
  | { state: "STALE_ORBIT" | "PROPAGATION_FAILED"; catalogId: string; epochAt: string; at: string;
      epochAgeMinutes: number };

export interface OmmObserver {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly elevationM: number;
}

const requiredNumbers = [
  "MEAN_MOTION", "ECCENTRICITY", "INCLINATION", "RA_OF_ASC_NODE",
  "ARG_OF_PERICENTER", "MEAN_ANOMALY", "BSTAR", "MEAN_MOTION_DOT", "MEAN_MOTION_DDOT",
] as const;

function invalid(reason: string): never { throw new TypeError(`satellite_omm_invalid:${reason}`); }
function finiteNumber(value: unknown): number {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") invalid("element");
  const number = Number(value);
  if (!Number.isFinite(number)) invalid("element");
  return number;
}

/** CelesTrak omits the UTC suffix; other time zones are rejected instead of
 * being interpreted in the backend process's local time zone. */
function parseEpoch(value: unknown): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z?$/u.test(value)) invalid("epoch_format");
  const epoch = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (!Number.isFinite(epoch.getTime()) || epoch.toISOString().slice(0, 19) !== value.slice(0, 19)) invalid("epoch_value");
  return epoch;
}

export function propagateCelesTrakOmm(
  candidate: unknown,
  at: Date,
  observer: OmmObserver,
  maxEpochAgeMinutes: number,
): OmmLookResult {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) invalid("row");
  const row = candidate as Record<string, unknown>;
  const catalogId = String(row.NORAD_CAT_ID ?? "");
  if (!/^\d{1,9}$/u.test(catalogId)) invalid("catalog_id");
  if (!(at instanceof Date) || !Number.isFinite(at.getTime())) invalid("at");
  if (!Number.isFinite(maxEpochAgeMinutes) || maxEpochAgeMinutes <= 0) invalid("max_epoch_age");
  if (!observer || !Number.isFinite(observer.latitudeDeg) || Math.abs(observer.latitudeDeg) > 90 ||
    !Number.isFinite(observer.longitudeDeg) || Math.abs(observer.longitudeDeg) > 180 ||
    !Number.isFinite(observer.elevationM)) invalid("observer");
  // CelesTrak's omitted OMM frame fields mean Earth/TEME/UTC/SGP4. Explicit
  // contradictory values must never be silently propagated under that model.
  for (const [key, expected] of [["CENTER_NAME", "EARTH"], ["REF_FRAME", "TEME"],
    ["TIME_SYSTEM", "UTC"], ["MEAN_ELEMENT_THEORY", "SGP4"]] as const) {
    if (row[key] !== undefined && row[key] !== expected) invalid(key.toLowerCase());
  }
  if (row.EPHEMERIS_TYPE !== undefined && String(row.EPHEMERIS_TYPE) !== "0") invalid("ephemeris_type");
  if (row.CCSDS_OMM_VERS !== undefined && (typeof row.CCSDS_OMM_VERS !== "string" || !row.CCSDS_OMM_VERS.startsWith("3.")))
    invalid("omm_version");
  const elementSetNo = finiteNumber(row.ELEMENT_SET_NO);
  if (!Number.isInteger(elementSetNo) || elementSetNo < 0) invalid("element_set_no");
  const epoch = parseEpoch(row.EPOCH);
  const numbers = Object.fromEntries(requiredNumbers.map(key => [key, finiteNumber(row[key])])) as Record<typeof requiredNumbers[number], number>;
  if (numbers.MEAN_MOTION <= 0 || numbers.ECCENTRICITY < 0 || numbers.ECCENTRICITY >= 1 ||
    numbers.INCLINATION < 0 || numbers.INCLINATION > 180 ||
    [numbers.RA_OF_ASC_NODE, numbers.ARG_OF_PERICENTER, numbers.MEAN_ANOMALY]
      .some(angle => angle < 0 || angle >= 360)) invalid("element_range");
  // The library's OMM parser requires these metadata members although SGP4
  // itself uses the numeric elements. No invented orbit field is supplied.
  const omm: OMMJsonObject = {
    ...row,
    ...numbers,
    OBJECT_NAME: typeof row.OBJECT_NAME === "string" ? row.OBJECT_NAME : "",
    OBJECT_ID: typeof row.OBJECT_ID === "string" ? row.OBJECT_ID : "",
    NORAD_CAT_ID: catalogId,
    ELEMENT_SET_NO: elementSetNo,
    EPOCH: epoch.toISOString(),
  };
  const resultBase = { catalogId, epochAt: epoch.toISOString(), at: at.toISOString(),
    epochAgeMinutes: (at.getTime() - epoch.getTime()) / 60_000 };
  if (Math.abs(resultBase.epochAgeMinutes) > maxEpochAgeMinutes)
    return { state: "STALE_ORBIT", ...resultBase };
  try {
    const satrec = json2satrec(omm);
    if (satrec.error !== 0) return { state: "PROPAGATION_FAILED", ...resultBase };
    const propagated = propagate(satrec, at, { communityDecayCheckEnabled: true });
    if (!propagated || satrec.error !== 0) return { state: "PROPAGATION_FAILED", ...resultBase };
    const position = eciToEcf(propagated.position, gstime(at));
    const look = ecfToLookAngles({
      latitude: degreesToRadians(observer.latitudeDeg),
      longitude: degreesToRadians(observer.longitudeDeg),
      height: observer.elevationM / 1000,
    }, position);
    const azimuthDeg = (radiansToDegrees(look.azimuth) + 360) % 360;
    const altitudeDeg = radiansToDegrees(look.elevation);
    const rangeKm = look.rangeSat;
    if (![azimuthDeg, altitudeDeg, rangeKm].every(Number.isFinite) ||
      altitudeDeg < -90 || altitudeDeg > 90 || rangeKm <= 0)
      return { state: "PROPAGATION_FAILED", ...resultBase };
    return { state: "AVAILABLE", ...resultBase, azimuthDeg, altitudeDeg, rangeKm };
  } catch {
    return { state: "PROPAGATION_FAILED", ...resultBase };
  }
}
