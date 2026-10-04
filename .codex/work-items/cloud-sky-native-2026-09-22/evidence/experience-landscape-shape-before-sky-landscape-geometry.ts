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

const solids: readonly LandscapeSolid[] = [
  { center: [-600, 900, -55], radii: [520, 500, 90], material: 1 },
  { center: [800, 400, -50], radii: [600, 600, 85], material: 1 },
  { center: [150, -1000, -45], radii: [650, 470, 75], material: 1 },
  { center: [-900, -500, -60], radii: [520, 700, 100], material: 1 },
  { center: [-25, 35, 4], radii: [.42, .42, 4], material: 2 },
  { center: [-25, 35, 8], radii: [3.6, 3.2, 4.5], material: 3 },
  { center: [-23.2, 34, 9.8], radii: [2.6, 2.8, 3.2], material: 3 },
  { center: [-50, 10, 4.4], radii: [.5, .5, 4.4], material: 2 },
  { center: [-50, 10, 9], radii: [4.5, 3.8, 5], material: 3 },
  { center: [-52, 9, 10.7], radii: [3.2, 3, 3.7], material: 3 },
  { center: [35, 40, 4.2], radii: [.4, .4, 4.2], material: 2 },
  { center: [35, 40, 8.5], radii: [3.8, 3.2, 4.6], material: 3 },
  { center: [37, 41, 10.3], radii: [2.8, 2.8, 3.3], material: 3 },
  { center: [45, -25, 3.8], radii: [.36, .36, 3.8], material: 2 },
  { center: [45, -25, 7.8], radii: [3.2, 3.6, 4.2], material: 3 },
  { center: [43.6, -26, 9.5], radii: [2.5, 2.6, 3], material: 3 },
];

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
}));

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
  return SKY_LANDSCAPE_SOLIDS.some(solid=>solidOccludes(solid,direction));
}

/** A single convex solid must contain every corner ray. Its positive ray cone
 * then contains the whole normalized affine image quad. Corners hidden by
 * different trees cannot prove that the gaps between them are also hidden. */
export function skyLandscapeCoversRayHull(directions:readonly SkyVector[]|null):boolean {
  if (!directions?.length) return false;
  if (directions.every(direction=>direction[2]<0)) return true;
  return SKY_LANDSCAPE_SOLIDS.some(solid=>directions.every(direction=>solidOccludes(solid,direction)));
}
