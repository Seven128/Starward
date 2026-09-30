// NSSDCA Saturnian Rings and Saturn Fact Sheets. These same radial bands drive
// visible arcs and sunlight interception on the globe; keep one geometry owner.
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html
export const SATURN_BANDS = [
  {band:"C",innerKm:74658,outerKm:91975,opacity:.2},
  {band:"B",innerKm:91975,outerKm:117507,opacity:.68},
  {band:"A",innerKm:122340,outerKm:136780,opacity:.57},
] as const;
export const SATURN_REFERENCE_RADIUS_KM=58232;
export const SATURN_EQUATORIAL_RADIUS_KM=60268;
export const SATURN_POLAR_RADIUS_KM=54364;

/** Whether a main-ring point is behind the 1-bar ellipsoid relative to the Sun.
 * Both vectors use Saturn equatorial radii and a shared orthonormal body frame. */
export function saturnGlobeShadowsRingPoint(point:readonly [number,number,number],
  sun:readonly [number,number,number]):boolean{
  const inversePolarSquared=(SATURN_EQUATORIAL_RADIUS_KM/SATURN_POLAR_RADIUS_KM)**2;
  const a=sun[0]**2+sun[1]**2+sun[2]**2*inversePolarSquared;
  const b=point[0]*sun[0]+point[1]*sun[1]+point[2]*sun[2]*inversePolarSquared;
  const c=point[0]**2+point[1]**2+point[2]**2*inversePolarSquared-1;
  return a>0&&b<0&&c>0&&b*b>=a*c;
}
