/**
 * Deterministic Gaia-to-local-horizon projection owner.
 *
 * This module consumes only the immutable catalog returned by the integrity
 * owner and the package's Node24-safe Astronomy Engine adapter.  It owns the
 * WGS84/time coordinate boundary; callers never supply an alternate row set.
 */

import { Horizon, Observer } from "./astronomy-engine-runtime.ts";
import {
  GAIA_DR3_CATALOG_VERSION,
  GAIA_DR3_MAGNITUDE_LIMIT,
  type GaiaDr3Row,
} from "./gaia-catalog-data.ts";
import {
  GAIA_DR3_BRIGHT_STAR_CATALOG_VERSION,
  loadGaiaDr3BrightStarCatalog,
  type GaiaDr3ValidatedCatalog,
} from "./gaia-catalog-integrity.ts";

export const GAIA_DR3_PROJECTION_ALGORITHM =
  "starward-gaia-dr3-projection@1.0.0+astronomy-engine@2.1.19";
export const GAIA_DR3_PROJECTION_FRAME = "ICRS/J2000→EQD→HOR" as const;
export const GAIA_DR3_PROJECTION_REFRACTION = "none" as const;

const JULIAN_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const MAX_ABSOLUTE_PROPER_MOTION = 1_000_000;

export interface GaiaObserverWgs84 {
  latitude: number;
  longitude: number;
  elevationM: number;
}

export interface GaiaStarProjection {
  sourceId: string;
  gMag: number;
  bpRp: number | null;
  /** ICRS/J2000-equatorial coordinates after linear proper-motion propagation. */
  rightAscensionDeg: number;
  declinationDeg: number;
  azimuthDeg: number;
  altitudeDeg: number;
  visible: boolean;
  obstructed: boolean | null;
}

export interface ProjectGaiaStarInput {
  at: Date | string;
  observer: GaiaObserverWgs84;
  horizonAltitudeAtAzimuth?: (azimuthDeg: number) => number | null;
}

export interface GaiaSkyFrame {
  catalogVersion: typeof GAIA_DR3_CATALOG_VERSION;
  algorithmVersion: typeof GAIA_DR3_PROJECTION_ALGORITHM;
  coordinateSystem: "WGS84";
  equatorialFrame: typeof GAIA_DR3_PROJECTION_FRAME;
  refraction: typeof GAIA_DR3_PROJECTION_REFRACTION;
  at: string;
  observer: GaiaObserverWgs84;
  magnitudeLimit: number;
  stars: readonly GaiaStarProjection[];
}

function assertObserver(observer: GaiaObserverWgs84): void {
  if (
    !Number.isFinite(observer.latitude) ||
    observer.latitude < -90 ||
    observer.latitude > 90
  )
    throw new RangeError("gaia_observer_latitude_out_of_range");
  if (
    !Number.isFinite(observer.longitude) ||
    observer.longitude < -180 ||
    observer.longitude > 180
  )
    throw new RangeError("gaia_observer_longitude_out_of_range");
  if (
    !Number.isFinite(observer.elevationM) ||
    observer.elevationM < -500 ||
    observer.elevationM > 10_000
  )
    throw new RangeError("gaia_observer_elevation_out_of_range");
}

function parseInstant(value: Date | string): Date {
  const instant = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(instant.getTime()))
    throw new TypeError("gaia_observation_instant_invalid");
  return instant;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/**
 * Gaia's pmra is mu_alpha* = cos(dec) * dRA/dt.  Propagation uses the
 * catalogue's Julian-year reference epoch and a first-order tangent-plane
 * model.  No radial velocity/parallax correction is silently invented.
 */
export function propagateGaiaDr3Star(
  row: GaiaDr3Row,
  at: Date | string,
): Pick<GaiaStarProjection, "rightAscensionDeg" | "declinationDeg"> {
  const instant = parseInstant(at);
  if (
    !Number.isFinite(row.pmRaMasYr) ||
    !Number.isFinite(row.pmDecMasYr) ||
    Math.abs(row.pmRaMasYr) > MAX_ABSOLUTE_PROPER_MOTION ||
    Math.abs(row.pmDecMasYr) > MAX_ABSOLUTE_PROPER_MOTION
  )
    throw new RangeError("gaia_proper_motion_invalid");
  const reference = Date.UTC(2016, 0, 1);
  const deltaYears = (instant.getTime() - reference) / JULIAN_YEAR_MS;
  const decRad = (row.decDeg * Math.PI) / 180;
  const decDeg = row.decDeg + (row.pmDecMasYr * deltaYears) / 3_600_000;
  const cosDec = Math.cos(decRad);
  const raDeltaDeg =
    Math.abs(cosDec) < 1e-12
      ? 0
      : (row.pmRaMasYr * deltaYears) / (3_600_000 * cosDec);
  const boundedDec = Math.max(-90, Math.min(90, decDeg));
  return {
    rightAscensionDeg: normalizeDegrees(row.raDeg + raDeltaDeg),
    declinationDeg: boundedDec,
  };
}

export function projectGaiaDr3Star(
  row: GaiaDr3Row,
  input: ProjectGaiaStarInput,
): GaiaStarProjection {
  assertObserver(input.observer);
  const at = parseInstant(input.at);
  const propagated = propagateGaiaDr3Star(row, at);
  const horizontal = Horizon(
    at,
    new Observer(
      input.observer.latitude,
      input.observer.longitude,
      input.observer.elevationM,
    ),
    propagated.rightAscensionDeg / 15,
    propagated.declinationDeg,
    "",
  );
  const horizonAltitude = input.horizonAltitudeAtAzimuth?.(horizontal.azimuth) ?? null;
  return {
    sourceId: row.sourceId,
    gMag: row.gMag,
    bpRp: row.bpRp,
    rightAscensionDeg: propagated.rightAscensionDeg,
    declinationDeg: propagated.declinationDeg,
    azimuthDeg: horizontal.azimuth,
    altitudeDeg: horizontal.altitude,
    visible: horizontal.altitude > 0,
    obstructed:
      horizonAltitude === null ? null : horizontal.altitude <= horizonAltitude,
  };
}

export interface ProjectGaiaCatalogInput extends ProjectGaiaStarInput {
  magnitudeLimit?: number;
  catalog?: GaiaDr3ValidatedCatalog;
}

export function projectGaiaDr3Catalog(
  input: ProjectGaiaCatalogInput,
): GaiaStarProjection[] {
  const magnitudeLimit = input.magnitudeLimit ?? GAIA_DR3_MAGNITUDE_LIMIT;
  if (
    !Number.isFinite(magnitudeLimit) ||
    magnitudeLimit > GAIA_DR3_MAGNITUDE_LIMIT ||
    magnitudeLimit < -10
  )
    throw new RangeError("gaia_magnitude_limit_out_of_range");
  const catalog = input.catalog ?? loadGaiaDr3BrightStarCatalog();
  return catalog.rows
    .filter((row) => row.gMag <= magnitudeLimit)
    .map((row) => projectGaiaDr3Star(row, input));
}

/** Adapter-shaped API used by the BFF AstronomyService. */
export function positionGaiaDr3Catalog(input: {
  at: Date | string;
  latitude: number;
  longitude: number;
  elevationM: number;
  magnitudeLimit?: number;
  catalog?: unknown;
}): GaiaStarProjection[] {
  return projectGaiaDr3Catalog({
    at: input.at,
    observer: {
      latitude: input.latitude,
      longitude: input.longitude,
      elevationM: input.elevationM,
    },
    ...(input.magnitudeLimit === undefined
      ? {}
      : { magnitudeLimit: input.magnitudeLimit }),
  });
}

export const positionGaiaCatalog = positionGaiaDr3Catalog;

/** Retain every selected catalog row exactly once for one WGS84 time slice. */
export function projectGaiaDr3SkyFrame(
  input: ProjectGaiaCatalogInput,
): GaiaSkyFrame {
  const at = parseInstant(input.at);
  const magnitudeLimit = input.magnitudeLimit ?? GAIA_DR3_MAGNITUDE_LIMIT;
  return {
    catalogVersion: GAIA_DR3_BRIGHT_STAR_CATALOG_VERSION,
    algorithmVersion: GAIA_DR3_PROJECTION_ALGORITHM,
    coordinateSystem: "WGS84",
    equatorialFrame: GAIA_DR3_PROJECTION_FRAME,
    refraction: GAIA_DR3_PROJECTION_REFRACTION,
    at: at.toISOString(),
    observer: { ...input.observer },
    magnitudeLimit,
    stars: projectGaiaDr3Catalog({ ...input, at, magnitudeLimit }),
  };
}
