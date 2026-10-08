import { skyArtworkViewParameters, type SkyArtworkRegistration } from "./sky-artwork-registration";
import { skyArtworkRasterBounds } from "./sky-artwork-raster-bounds";
import type { SkyTargetOpticalView } from "./sky-target-optical-visibility";
import type { SkyVector } from "./sky-view-projection";

const dot = (a: SkyVector, b: SkyVector) => a.reduce((sum, value, i) => sum + value * b[i]!, 0);

/** Native pixels per source texel from the actual stereographic ray/UV map.
 * This measures the decoded grid, not PSF, observation validity or generated
 * detail. The same renderer cap samples center/edges of its visible box; wide
 * or ill-conditioned uncertainty is retained rather than treated as zero.
 */
export function skyOpticalPixelMagnification(registration: SkyArtworkRegistration,
  grid: number | { width: number; height: number }, footprint: SkyTargetOpticalView): number | null {
  const { view, width, height, drawingWidth, drawingHeight } = footprint;
  const sourceWidth = typeof grid === "number" ? grid : grid.width;
  const sourceHeight = typeof grid === "number" ? grid : grid.height;
  const parameters = skyArtworkViewParameters(view, width, height);
  if (!parameters || !Number.isInteger(sourceWidth) || sourceWidth <= 0 || !Number.isInteger(sourceHeight) || sourceHeight <= 0 ||
    !Number.isInteger(drawingWidth) || !Number.isInteger(drawingHeight) ||
    !(drawingWidth! > 0 && drawingHeight! > 0)) return null;
  const scaleX = drawingWidth! / width, scaleY = drawingHeight! / height;
  const rows = registration.rows;
  const weighted = (weights: readonly number[]): SkyVector => [0, 1, 2].map(i =>
    rows.reduce((sum, row, j) => sum + row[i]! * weights[j]!, 0)) as unknown as SkyVector;
  const denominatorRow = weighted([1, 1, 1]);
  const uRow = weighted(registration.anchorU), vRow = weighted(registration.anchorV);
  const box = skyArtworkRasterBounds(registration, view, width, height, drawingWidth!, drawingHeight!);
  if (box && (box.width === 0 || box.height === 0)) return 0;
  const left = box ? box.x / scaleX : 0;
  const right = box ? (box.x + box.width) / scaleX : width;
  const top = box ? (drawingHeight! - box.y - box.height) / scaleY : 0;
  const bottom = box ? (drawingHeight! - box.y) / scaleY : height;
  let maximum = 0;
  for (const x of [left, (left + right) / 2, right]) {
    for (const y of [top, (top + bottom) / 2, bottom]) {
      const qx = (x - parameters.center.x) / parameters.scale;
      const qy = (parameters.center.y - y) / parameters.scale;
      // The common stereographic normalization cancels in the plane quotient.
      const ray = view.basis.forward.map((f, i) => (1 - qx * qx - qy * qy) * f +
        2 * qx * view.basis.right[i]! + 2 * qy * view.basis.up[i]!) as unknown as SkyVector;
      const dx = view.basis.right.map((r, i) => (2 * r - 2 * qx * view.basis.forward[i]!) /
        parameters.scale / scaleX) as unknown as SkyVector;
      const dy = view.basis.up.map((u, i) => (-2 * u + 2 * qy * view.basis.forward[i]!) /
        parameters.scale / scaleY) as unknown as SkyVector;
      const denominator = dot(denominatorRow, ray);
      if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-10 || registration.determinant / denominator <= 0) return null;
      const derivative = (row: SkyVector, delta: SkyVector, pixels: number) => pixels *
        (dot(row, delta) * denominator - dot(row, ray) * dot(denominatorRow, delta)) / (denominator * denominator);
      const a = derivative(uRow, dx, sourceWidth), b = derivative(uRow, dy, sourceWidth);
      const c = derivative(vRow, dx, sourceHeight), d = derivative(vRow, dy, sourceHeight);
      const trace = a * a + b * b + c * c + d * d, determinant = a * d - b * c;
      const largest = Math.sqrt((trace + Math.sqrt(Math.max(0, trace * trace - 4 * determinant * determinant))) / 2);
      const smallest = Math.abs(determinant) / largest;
      if (!Number.isFinite(smallest) || smallest <= 0) return null;
      maximum = Math.max(maximum, 1 / smallest);
    }
  }
  return maximum;
}
