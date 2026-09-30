import type { SkyVector } from "./sky-view-projection";

/** Original virtual meadow in ENU, not site imagery/elevation/obstruction data.
 * Model coordinates only describe this illustrative scene. The same finite
 * geometry owns GPU occlusion and the painted-frame hit mask.
 */
export const SKY_LANDSCAPE_EYE_HEIGHT = 1.6;
interface LandscapeSolid {
  center: SkyVector;
  radii: SkyVector;
  material: 1 | 2 | 3; // distant meadow, bark, foliage
}

interface LandscapeCanopy {
  center: SkyVector;
  halfWidth: number;
  halfHeight: number;
}

// Original broad-leaf outlines in fixed ENU planes. The observer stays at the
// model origin; these planes do not turn with the camera. Fine edge lobes are
// geometry, not an alpha texture or measurements of the selected spot.
export const SKY_LANDSCAPE_CANOPY_LOBES = [
  { frequency: 2, amplitude: .06, phase: 1.3 },
  { frequency: 5, amplitude: .09, phase: .3 },
  { frequency: 9, amplitude: .065, phase: 1.7 },
  { frequency: 21, amplitude: .022, phase: .4 },
  { frequency: 43, amplitude: .012, phase: 2.2 },
  { frequency: 83, amplitude: .006, phase: 0 },
] as const;
const canopyAmplitude = SKY_LANDSCAPE_CANOPY_LOBES.reduce((sum, lobe) => sum + lobe.amplitude, 0);
export const SKY_LANDSCAPE_CANOPY_INNER_RADIUS = 1 - canopyAmplitude;
export const SKY_LANDSCAPE_CANOPY_OUTER_RADIUS = 1 + canopyAmplitude;

const canopies: readonly LandscapeCanopy[] = [
  { center: [-25, 35, 10], halfWidth: 6.2, halfHeight: 4.5 },
  { center: [-50, 10, 11], halfWidth: 7.4, halfHeight: 5.1 },
  { center: [35, 40, 10.5], halfWidth: 6.6, halfHeight: 4.7 },
  { center: [45, -25, 9.6], halfWidth: 5.9, halfHeight: 4.3 },
];

const solids: readonly LandscapeSolid[] = [
  { center: [-600, 900, -55], radii: [520, 500, 90], material: 1 },
  { center: [800, 400, -50], radii: [600, 600, 85], material: 1 },
  { center: [150, -1000, -45], radii: [650, 470, 75], material: 1 },
  { center: [-900, -500, -60], radii: [520, 700, 100], material: 1 },
  { center: [-25, 35, 4], radii: [.42, .42, 4], material: 2 },
  { center: [-50, 10, 4.4], radii: [.5, .5, 4.4], material: 2 },
  { center: [35, 40, 4.2], radii: [.4, .4, 4.2], material: 2 },
  { center: [45, -25, 3.8], radii: [.36, .36, 3.8], material: 2 },
];

export const SKY_LANDSCAPE_CANOPIES = canopies.map(canopy => {
  const horizontalDistance = Math.hypot(canopy.center[0], canopy.center[1]);
  const normal: SkyVector = [-canopy.center[0] / horizontalDistance, -canopy.center[1] / horizontalDistance, 0];
  const right: SkyVector = [normal[1], -normal[0], 0];
  const relative: SkyVector = [canopy.center[0], canopy.center[1], canopy.center[2] - SKY_LANDSCAPE_EYE_HEIGHT];
  const distance = Math.hypot(...relative);
  const radius = Math.max(canopy.halfWidth, canopy.halfHeight) * SKY_LANDSCAPE_CANOPY_OUTER_RADIUS;
  const axis: SkyVector = [relative[0] / distance, relative[1] / distance, relative[2] / distance];
  return { ...canopy, normal, right, axis, cosineBound: Math.sqrt(1 - (radius / distance) ** 2) };
});

// Conservative angular bounds avoid solving every solid for every high-sky
// fragment. They come from the geometry, not a second skyline model.
export const SKY_LANDSCAPE_SOLIDS: readonly (LandscapeSolid & { axis: SkyVector; cosineBound: number })[] = solids.map(solid => {
  const relative: SkyVector = [solid.center[0], solid.center[1], solid.center[2] - SKY_LANDSCAPE_EYE_HEIGHT];
  const distance = Math.hypot(...relative);
  const radius = Math.max(...solid.radii);
  const axis: SkyVector = [relative[0] / distance, relative[1] / distance, relative[2] / distance];
  return { ...solid, axis, cosineBound: radius < distance ? Math.sqrt(1 - (radius / distance) ** 2) : -1 };
});
export const SKY_LANDSCAPE_MAXIMUM_Z = Math.max(...solids.map(({ center, radii }) => {
  const top = Math.max(0, center[2] + radii[2] - SKY_LANDSCAPE_EYE_HEIGHT);
  const nearestHorizontal = Math.max(0, Math.hypot(center[0], center[1]) - Math.max(radii[0], radii[1]));
  return top / Math.hypot(top, nearestHorizontal);
}), ...canopies.map(({ center, halfHeight }) => {
  const top = center[2] + halfHeight * SKY_LANDSCAPE_CANOPY_OUTER_RADIUS - SKY_LANDSCAPE_EYE_HEIGHT;
  return top / Math.hypot(top, Math.hypot(center[0], center[1]));
}));

function canopyOccludes(canopy: typeof SKY_LANDSCAPE_CANOPIES[number], direction: SkyVector, convexCore = false): boolean {
  if (direction[0] * canopy.axis[0] + direction[1] * canopy.axis[1] + direction[2] * canopy.axis[2] < canopy.cosineBound) return false;
  const facing = direction[0] * canopy.normal[0] + direction[1] * canopy.normal[1];
  if (facing >= 0) return false;
  const travel = (canopy.center[0] * canopy.normal[0] + canopy.center[1] * canopy.normal[1]) / facing;
  const x = ((direction[0] * travel - canopy.center[0]) * canopy.right[0]
    + (direction[1] * travel - canopy.center[1]) * canopy.right[1]) / canopy.halfWidth;
  const y = (SKY_LANDSCAPE_EYE_HEIGHT + direction[2] * travel - canopy.center[2]) / canopy.halfHeight;
  const radius = Math.hypot(x, y);
  if (convexCore) return radius <= SKY_LANDSCAPE_CANOPY_INNER_RADIUS;
  if (radius <= SKY_LANDSCAPE_CANOPY_INNER_RADIUS) return true;
  if (radius > SKY_LANDSCAPE_CANOPY_OUTER_RADIUS) return false;
  const angle = Math.atan2(y, x);
  const outline = 1 + SKY_LANDSCAPE_CANOPY_LOBES.reduce((sum, lobe) =>
    sum + lobe.amplitude * Math.sin(lobe.frequency * angle + lobe.phase), 0);
  return radius <= outline;
}

function solidOccludes({center,radii,axis,cosineBound}:typeof SKY_LANDSCAPE_SOLIDS[number],direction:SkyVector):boolean {
    if (direction[0] * axis[0] + direction[1] * axis[1] + direction[2] * axis[2] < cosineBound) return false;
    const ox = -center[0] / radii[0], oy = -center[1] / radii[1], oz = (SKY_LANDSCAPE_EYE_HEIGHT - center[2]) / radii[2];
    const dx = direction[0] / radii[0], dy = direction[1] / radii[1], dz = direction[2] / radii[2];
    const a = dx * dx + dy * dy + dz * dz;
    const b = ox * dx + oy * dy + oz * dz;
    const c = ox * ox + oy * oy + oz * oz - 1;
    const discriminant = b * b - a * c;
    return discriminant >= 0 && (-b - Math.sqrt(discriminant)) / a > 0;
}

export function skyLandscapeOccludes(direction: SkyVector): boolean {
  if (direction[2] < 0) return true;
  if (direction[2] > SKY_LANDSCAPE_MAXIMUM_Z) return false;
  return SKY_LANDSCAPE_SOLIDS.some(solid=>solidOccludes(solid,direction))
    || SKY_LANDSCAPE_CANOPIES.some(canopy=>canopyOccludes(canopy,direction));
}

/** A single convex solid must contain every corner ray. Its positive ray cone
 * then contains the whole normalized affine image quad. Corners hidden by
 * different trees cannot prove that the gaps between them are also hidden.
 * A lobed canopy is not convex; only its guaranteed opaque inner ellipse can
 * certify a whole image quad. Its outer outline remains point-mask geometry. */
export function skyLandscapeCoversRayHull(directions:readonly SkyVector[]|null):boolean {
  if (!directions?.length) return false;
  if (directions.every(direction=>direction[2]<0)) return true;
  return SKY_LANDSCAPE_SOLIDS.some(solid=>directions.every(direction=>solidOccludes(solid,direction)))
    || SKY_LANDSCAPE_CANOPIES.some(canopy=>directions.every(direction=>canopyOccludes(canopy,direction,true)));
}
