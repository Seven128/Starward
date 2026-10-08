import { unprojectSkyPoint, type SkyVector, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import { SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";

export interface SkyScreenPoint { x: number; y: number }
const dot = (a: SkyVector, b: SkyVector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: SkyVector, b: SkyVector): SkyVector => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const TWO_PI = Math.PI * 2;
const ELEVATION_LIMIT = Math.PI / 2;

function rotateGrabbedRay(basis: SkyViewBasis, from: SkyVector, to: SkyVector): SkyViewBasis {
  // Unprojection inherits tiny basis-length errors. Rodrigues' sine/cosine
  // require unit rays; otherwise repeated pans amplify them into a rejected view.
  const fromLength = Math.hypot(...from), toLength = Math.hypot(...to);
  from = from.map(value => value / fromLength) as unknown as SkyVector;
  to = to.map(value => value / toLength) as unknown as SkyVector;
  const product = cross(from, to), sine = Math.hypot(...product);
  if (sine < 1e-12) return basis;
  const cosine = Math.max(-1, Math.min(1, dot(from, to)));
  const axis = product.map(value => value / sine) as unknown as SkyVector;
  const rotate = (vector: SkyVector): SkyVector => {
    const perpendicular = cross(axis, vector), along = dot(axis, vector) * (1 - cosine);
    return [0, 1, 2].map(index => vector[index]! * cosine + perpendicular[index]! * sine + axis[index]! * along) as unknown as SkyVector;
  };
  return { right: rotate(basis.right), up: rotate(basis.up), forward: rotate(basis.forward) };
}

/** A sky pan has two degrees of freedom. Keep the roll at gesture start, including
 * a real sensor roll when the user switches from following to manual browsing. */
function levelView(azimuth: number, elevation: number, roll: number): SkyViewBasis {
  const sa = Math.sin(azimuth), ca = Math.cos(azimuth);
  const se = Math.sin(elevation), ce = Math.cos(elevation);
  const sr = Math.sin(roll), cr = Math.cos(roll);
  const right: SkyVector = [ca, -sa, 0];
  const up: SkyVector = [-se * sa, -se * ca, ce];
  return {
    right: [right[0] * cr + up[0] * sr, right[1] * cr + up[1] * sr, right[2] * cr + up[2] * sr],
    up: [-right[0] * sr + up[0] * cr, -right[1] * sr + up[1] * cr, -right[2] * sr + up[2] * cr],
    forward: [ce * sa, ce * ca, se],
  };
}

function elevationForGrab(targetUp: number, cameraUp: number, cameraForward: number, previous: number): number {
  // In the horizon-level basis, targetUp = cameraUp*cos(elevation) + cameraForward*sin(elevation).
  // Both inverse-sine branches matter when a wide field crosses the zenith.
  const amplitude = Math.hypot(cameraUp, cameraForward);
  const phase = Math.atan2(cameraUp, cameraForward);
  const candidates: number[] = [previous, -ELEVATION_LIMIT, ELEVATION_LIMIT];
  if (amplitude > 1e-12) {
    const principal = Math.asin(Math.max(-1, Math.min(1, targetUp / amplitude)));
    for (const root of [principal - phase, Math.PI - principal - phase]) {
      for (const revolution of [-1, 0, 1]) {
        const elevation = root + revolution * TWO_PI;
        if (elevation >= -ELEVATION_LIMIT && elevation <= ELEVATION_LIMIT) candidates.push(elevation);
      }
    }
    // If exact tracking is geometrically impossible without rolling the sky,
    // use the closest level view instead of introducing an abrupt camera roll.
    for (const root of [Math.atan2(cameraForward, cameraUp), Math.atan2(cameraForward, cameraUp) + Math.PI]) {
      for (const revolution of [-1, 0, 1]) {
        const elevation = root + revolution * TWO_PI;
        if (elevation >= -ELEVATION_LIMIT && elevation <= ELEVATION_LIMIT) candidates.push(elevation);
      }
    }
  }
  let best = previous, error = Infinity;
  for (const elevation of candidates) {
    const candidateError = Math.abs(cameraUp * Math.cos(elevation) + cameraForward * Math.sin(elevation) - targetUp);
    if (candidateError < error - 1e-12 || (Math.abs(candidateError - error) <= 1e-12 && Math.abs(elevation - previous) < Math.abs(best - previous))) {
      best = elevation;
      error = candidateError;
    }
  }
  return best;
}

/** Pan the camera so the grabbed sky ray follows the finger where a level view
 * permits it. Uses the same stereographic projection as projectSkyDirection,
 * without accumulating a roll from repeated sideways drags. It never moves the
 * observer, changes time, or converts a manual direction into a device pose.
 * Each move uses the gesture-start basis, so reversing returns exactly home.
 */
export function dragSkyView(basis: SkyViewBasis, start: SkyScreenPoint, end: SkyScreenPoint,
  width: number, height: number, verticalFovDeg: number, center?: SkyProjectionCenter): SkyViewBasis {
  if (![start.x,start.y,end.x,end.y,width,height,verticalFovDeg].every(Number.isFinite) ||
    width <= 0 || height <= 0 || verticalFovDeg <= 0 || verticalFovDeg >= 360) return basis;
  if (Math.hypot(start.x - end.x, start.y - end.y) < 1e-12) return basis;
  const target = unprojectSkyPoint(start.x,start.y,basis,width,height,verticalFovDeg,center);
  const endRay = unprojectSkyPoint(end.x,end.y,basis,width,height,verticalFovDeg,center);
  if (!target || !endRay) return basis;

  // The browsing camera owns the wide-to-dome transition. Keep its original
  // free rotation: a fixed-roll solution can jump between the two poles when
  // a wide gesture has no exact level-camera solution. The same rule applies
  // when the local view already points at a pole, where azimuth is undefined.
  if (verticalFovDeg > SKY_OBSERVING_VERTICAL_FOV_DEG ||
    Math.abs(basis.forward[2]) > Math.cos(Math.PI / 360)) return rotateGrabbedRay(basis, endRay, target);

  const elevation = Math.asin(Math.max(-1, Math.min(1, basis.forward[2])));
  const azimuth = Math.atan2(basis.forward[0], basis.forward[1]);
  const level = levelView(azimuth, elevation, 0);
  const roll = Math.atan2(dot(basis.right, level.up), dot(basis.right, level.right));
  const localRight = dot(endRay, basis.right), localUp = dot(endRay, basis.up);
  const cameraRight = localRight * Math.cos(roll) - localUp * Math.sin(roll);
  const cameraUp = localRight * Math.sin(roll) + localUp * Math.cos(roll);
  const cameraForward = dot(endRay, basis.forward);
  const nextElevation = elevationForGrab(target[2], cameraUp, cameraForward, elevation);
  const north = cameraForward * Math.cos(nextElevation) - cameraUp * Math.sin(nextElevation);
  const nextAzimuth = Math.hypot(target[0], target[1]) > 1e-10
    ? Math.atan2(target[0], target[1]) - Math.atan2(cameraRight, north)
    : azimuth;
  return levelView(nextAzimuth, nextElevation, roll);
}

/** Manual default is explicitly a view north/up, never a sensor reading. */
export const INITIAL_MANUAL_SKY_VIEW: SkyViewBasis = {
  right: [1,0,0], up: [0,-Math.SQRT1_2,Math.SQRT1_2], forward: [0,Math.SQRT1_2,Math.SQRT1_2],
};
