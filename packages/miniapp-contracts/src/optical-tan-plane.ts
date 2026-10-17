/** The affine pixel plane shared by original photos and derived work regions.
 * It carries no provenance, source coverage, quality or registration claim.
 * Those facts belong to each publication's stricter, versioned contract. */
export interface OpticalTanPlaneGeometry {
  projection: "TAN"; frame: "ICRS" | "ICRS J2000";
  sourceWidth: number; sourceHeight: number;
  referenceValue: [number, number]; referencePixelFitsOneBased: [number, number];
  cdDegreesPerPixel: [[number, number], [number, number]];
  rowOrder: "top-first";
}
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const dimension = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 1;
const pair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(finite);
export function isOpticalTanPlaneGeometry(value: unknown): value is OpticalTanPlaneGeometry {
  const g = value as OpticalTanPlaneGeometry | null;
  if (!g || g.projection !== "TAN" || !["ICRS", "ICRS J2000"].includes(g.frame) || g.rowOrder !== "top-first" ||
    !dimension(g.sourceWidth) || !dimension(g.sourceHeight) ||
    !Number.isSafeInteger(g.sourceWidth * g.sourceHeight * 3) ||
    !pair(g.referenceValue) || !pair(g.referencePixelFitsOneBased) ||
    g.referenceValue[0] < 0 || g.referenceValue[0] >= 360 || Math.abs(g.referenceValue[1]) > 90 ||
    !Array.isArray(g.cdDegreesPerPixel) || g.cdDegreesPerPixel.length !== 2 || !g.cdDegreesPerPixel.every(pair)) return false;
  const [[a, b], [c, d]] = g.cdDegreesPerPixel;
  const determinant = a * d - b * c;
  return finite(determinant) && determinant !== 0 &&
    g.cdDegreesPerPixel.flat().every(v => finite(v * Math.max(g.sourceWidth, g.sourceHeight)));
}
