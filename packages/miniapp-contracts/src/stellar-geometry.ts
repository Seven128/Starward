import { isBrightStarReference } from "./celestial-identity.ts";

/** Geometry representation, independent from photometry, UI and ephemeris libraries. */
export const STELLAR_GEOMETRY_FORMAT = "bsc5p-stellar-geometry-v1";
export const STELLAR_GEOMETRY_REFERENCE_AT = "2000-01-01T12:00:00.000Z";
export const STELLAR_GEOMETRY_MAX_ROWS = 8_404;

export interface StellarGeometryIdentity {
  format: typeof STELLAR_GEOMETRY_FORMAT;
  catalogVersion: string;
  /** Identity of the source publication, not a digest of this derived JSON. */
  catalogHash: string;
  /** UTC origin used by the adopted linear Julian-year propagation model. */
  referenceAt: typeof STELLAR_GEOMETRY_REFERENCE_AT;
}

/** Stable HR identity, unit EQJ position, tangent velocity in radians/Julian year. */
export type StellarGeometryRow = readonly [string, number, number, number, number, number, number];
export interface StellarGeometryCatalog extends StellarGeometryIdentity {
  rows: readonly StellarGeometryRow[];
}
export interface StellarGeometryObserver {
  latitude: number;
  longitude: number;
  elevationM: number;
}
export interface StellarGeometryFrame extends StellarGeometryIdentity {
  at: string;
  observer: StellarGeometryObserver;
  julianYears: number;
  /** Row-major EQJ -> east/north/up, no refraction or terrain mask. */
  equatorialToEnu: readonly [number, number, number, number, number, number, number, number, number];
}

const YEAR_MS = 365.25 * 86_400_000;
const ROTATION_TOLERANCE = 1e-6; // Allows float32 publication, rejects scale/shear/reflection.
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
function fail(reason: string): never { throw new TypeError(`stellar_geometry_invalid:${reason}`); }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("object");
  return value as Record<string, unknown>;
}

function assertIdentity(value: Record<string, unknown>, expected: Pick<StellarGeometryIdentity, "catalogVersion" | "catalogHash">): void {
  if (value.format !== STELLAR_GEOMETRY_FORMAT || value.referenceAt !== STELLAR_GEOMETRY_REFERENCE_AT ||
    typeof value.catalogVersion !== "string" || !value.catalogVersion.trim() ||
    typeof value.catalogHash !== "string" || !/^[a-f0-9]{64}$/u.test(value.catalogHash)) fail("identity");
  if (value.catalogVersion !== expected.catalogVersion || value.catalogHash !== expected.catalogHash) fail("catalog_binding");
}

export function assertStellarGeometryCatalog(
  value: unknown,
  expected: Pick<StellarGeometryIdentity, "catalogVersion" | "catalogHash">,
): asserts value is StellarGeometryCatalog {
  const catalog = record(value);
  assertIdentity(catalog, expected);
  if (!Array.isArray(catalog.rows) || catalog.rows.length === 0 || catalog.rows.length > STELLAR_GEOMETRY_MAX_ROWS) fail("rows");
  const seen = new Set<string>();
  for (const row of catalog.rows) {
    if (!Array.isArray(row) || row.length !== 7 || !isBrightStarReference(row[0]) || seen.has(row[0])) fail("row_identity");
    seen.add(row[0]);
    if (!Array.from(row).slice(1).every(finite)) fail("row_finite");
    const length = Math.hypot(row[1], row[2], row[3]);
    if (Math.abs(length - 1) > ROTATION_TOLERANCE) fail("row_unit");
    const speed = Math.hypot(row[4], row[5], row[6]);
    const radial = row[1] * row[4] + row[2] * row[5] + row[3] * row[6];
    if (!finite(speed) || !finite(radial) || Math.abs(radial) > Math.max(1e-15, speed * ROTATION_TOLERANCE)) fail("row_tangent");
  }
}

function assertObserver(value: unknown): asserts value is StellarGeometryObserver {
  const observer = record(value);
  if (!finite(observer.latitude) || Math.abs(observer.latitude) > 90 ||
    !finite(observer.longitude) || Math.abs(observer.longitude) > 180 || !finite(observer.elevationM)) fail("observer");
}

/** Validate shape AND handedness; normalized columns alone would admit a mirrored sky. */
export function assertStellarRotation(value: unknown): asserts value is StellarGeometryFrame["equatorialToEnu"] {
  if (!Array.isArray(value) || value.length !== 9 || !Array.from(value).every(finite)) fail("matrix_shape");
  for (let row = 0; row < 3; row++) {
    for (let other = row; other < 3; other++) {
      let dot = 0;
      for (let column = 0; column < 3; column++) dot += value[row * 3 + column] * value[other * 3 + column];
      if (Math.abs(dot - (row === other ? 1 : 0)) > ROTATION_TOLERANCE) fail("matrix_orthogonal");
    }
  }
  const m = value;
  const determinant = m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  if (Math.abs(determinant - 1) > ROTATION_TOLERANCE) fail("matrix_handedness");
}

/** Expected context comes from the request/report, never from the candidate frame itself. */
export function assertStellarGeometryFrame(value: unknown, expected: {
  catalog: Pick<StellarGeometryIdentity, "catalogVersion" | "catalogHash">;
  at: string;
  observer: StellarGeometryObserver;
}): asserts value is StellarGeometryFrame {
  const frame = record(value);
  assertIdentity(frame, expected.catalog);
  const millis = typeof frame.at === "string" ? Date.parse(frame.at) : NaN;
  if (!finite(millis) || new Date(millis).toISOString() !== frame.at || frame.at !== expected.at) fail("time_binding");
  if (!finite(frame.julianYears) || Math.abs(frame.julianYears -
    (millis - Date.parse(STELLAR_GEOMETRY_REFERENCE_AT)) / YEAR_MS) > 1e-10) fail("epoch_delta");
  assertObserver(frame.observer);
  assertObserver(expected.observer);
  if (frame.observer.latitude !== expected.observer.latitude || frame.observer.longitude !== expected.observer.longitude ||
    frame.observer.elevationM !== expected.observer.elevationM) fail("observer_binding");
  assertStellarRotation(frame.equatorialToEnu);
}
