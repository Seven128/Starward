import { assertStellarRotation, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { registerSkyArtworkPlane, type SkyArtworkRegistration } from "./sky-artwork-registration";
import { skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import type { SkyTargetOpticalImage } from "./sky-sdss-optical-frame";
import { skyExactTargetOpticalIdentity } from "./sky-target-optical-identity";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import type { SkyVector } from "./sky-view-projection";

/** Three homogeneous rows give top-first UV=(row0·ray,row1·ray)/row2·ray
 * only on the positive branch. These describe nominal display coordinates,
 * not scientific availability, an area mask or physical astrometric accuracy. */
export type SkyOpticalFootprintRows = readonly [SkyVector, SkyVector, SkyVector];
export interface SkyPreparedOpticalFootprints {
  readonly reference: string;
  readonly publicationHash: string;
  readonly at: string;
  readonly equatorialToEnu: SkyObservationFrame["equatorialToEnu"];
  readonly source: SkyOpticalFootprintRows;
  readonly master: SkyOpticalFootprintRows;
  readonly accuracy: "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM";
}

function footprintRows(registration: SkyArtworkRegistration): SkyOpticalFootprintRows | null {
  const { rows, anchorU, anchorV, determinant } = registration;
  const combine = (weights: SkyVector): SkyVector => [0, 1, 2].map(axis =>
    rows.reduce((sum, row, i) => sum + weights[i]! * row[axis]!, 0) / determinant) as unknown as SkyVector;
  const result = [combine(anchorU), combine(anchorV), combine([1, 1, 1])] as const;
  if (result.some(row => row.some(value => !Number.isFinite(value)))) return null;
  result.forEach(Object.freeze);
  return Object.freeze(result);
}

/** Exact ready Prepared identity owns both full-source and common-mother
 * footprints. Source CRPIX is FITS one-based/y-up; source UV spans its first
 * and last decoded pixel centers and flips y into top-first RGB coordinates.
 * Rotate raw affine points first, then invert the actual finite report matrix;
 * independently normalizing corners or rotating ICRS inverse rows would lose
 * the shared plane for an admitted numerically non-orthogonal transform.
 *
 * This owner supplies no tone curve/feather width and never reads RGB/alpha.
 * Consumers must still join these frozen facts to the current report/identity;
 * null means unavailable geometry, never EMPTY or scientific missing data.
 */
export function registerSkyPreparedOpticalFootprints(input: SkyTargetOpticalImage | null | undefined,
  observation: SkyObservationFrame | null): SkyPreparedOpticalFootprints | null {
  const identity = skyExactTargetOpticalIdentity(input);
  if (!identity || identity.kind !== "prepared" || !observation) return null;
  try { assertStellarRotation(observation.equatorialToEnu); } catch { return null; }
  const { publication } = identity;
  // This diagnostic describes the older reprojected source/mother pair.
  // Native full-source tiers have no invented 2048 square mother; their plane
  // is owned directly by registerSkyTanOpticalField.
  if (publication.imageVersion === "prepared-native-optical-v1") return null;
  const geometry = publication.source?.nominalAvm;
  if (!geometry || geometry.accuracy !== "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" ||
    ![geometry.referenceValue, geometry.crpixFitsOneBased, geometry.cdeltDegrees,
      geometry.decodedShapeWidthHeight].every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite)) ||
    !Number.isFinite(geometry.rotation) || geometry.referenceValue[0] < 0 || geometry.referenceValue[0] >= 360 ||
    Math.abs(geometry.referenceValue[1]) > 90 || geometry.cdeltDegrees[0] >= 0 || geometry.cdeltDegrees[1] <= 0 ||
    geometry.decodedShapeWidthHeight.some(size => !Number.isInteger(size) || size <= 1) ||
    publication.master?.pixels !== 2048 || publication.master.crpixFitsOneBased !== 1024.5 ||
    !Number.isFinite(publication.master.fieldDegrees) ||
    !Number.isFinite(publication.levels.OVERVIEW?.fieldDegrees) ||
    // The admitted producer's field→TAN→field roundtrip can differ in the
    // last binary digit. Use its existing contract tolerance, not equality.
    Math.abs(publication.levels.OVERVIEW.fieldDegrees - publication.master.fieldDegrees) >
      1e-12 * Math.max(1, Math.abs(publication.master.fieldDegrees))) return null;
  const masterRegistration = registerSkyTanOpticalField(publication, publication.levels.OVERVIEW, observation);
  if (!masterRegistration) return null;
  const rad = Math.PI / 180, ra = geometry.referenceValue[0] * rad, dec = geometry.referenceValue[1] * rad;
  const center: SkyVector = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const east: SkyVector = [-Math.sin(ra), Math.cos(ra), 0];
  const north: SkyVector = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  const angle = geometry.rotation * rad, cosine = Math.cos(angle), sine = Math.sin(angle);
  const [scaleX, scaleY] = geometry.cdeltDegrees, [width, height] = geometry.decodedShapeWidthHeight;
  const sourceRegistration = registerSkyArtworkPlane(([[0, 0], [1, 0], [0, 1]] as const).map(uv => {
    const x = uv[0] * (width - 1) - (geometry.crpixFitsOneBased[0] - 1);
    const y = (1 - uv[1]) * (height - 1) - (geometry.crpixFitsOneBased[1] - 1);
    const tangentEast = (scaleX * cosine * x - scaleY * sine * y) * rad;
    const tangentNorth = (scaleX * sine * x + scaleY * cosine * y) * rad;
    const raw = center.map((value, i) => value + tangentEast * east[i]! + tangentNorth * north[i]!) as unknown as SkyVector;
    return { uv, point: skyEquatorialDirectionToEnu(observation.equatorialToEnu, raw) };
  }));
  if (!sourceRegistration) return null;
  const source = footprintRows(sourceRegistration), master = footprintRows(masterRegistration);
  if (!source || !master) return null;
  return Object.freeze({ reference: identity.frame.reference, publicationHash: identity.frame.publicationHash,
    at: observation.at, equatorialToEnu: Object.freeze([...observation.equatorialToEnu]) as SkyObservationFrame["equatorialToEnu"],
    source, master, accuracy: geometry.accuracy });
}
