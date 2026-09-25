export type Ring = readonly (readonly [longitude: number, latitude: number])[];

/** Include a published edge so adjacent districts in one jurisdiction do not create gaps. */
export function ringContainsOrBorders(ring: Ring, longitude: number, latitude: number) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [ax, ay] = ring[previous]!;
    const [bx, by] = ring[index]!;
    const cross = (longitude - ax) * (by - ay) - (latitude - ay) * (bx - ax);
    if (Math.abs(cross) < 1e-12 &&
      longitude >= Math.min(ax, bx) && longitude <= Math.max(ax, bx) &&
      latitude >= Math.min(ay, by) && latitude <= Math.max(ay, by))
      return true;
    if ((ay > latitude) !== (by > latitude) &&
      longitude < ((bx - ax) * (latitude - ay)) / (by - ay) + ax)
      inside = !inside;
  }
  return inside;
}
