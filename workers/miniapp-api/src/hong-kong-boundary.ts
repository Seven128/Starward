import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

type Point = readonly [longitude: number, latitude: number];
type Ring = Point[];
type District = { ring: Ring; west: number; east: number; south: number; north: number };

// The packaged HKSAR district geometry is the location owner for the narrow
// Shenzhen/Hong Kong band. Read it once; a missing or malformed publication
// must fail closed rather than silently falling back to the device timezone.
const districts: District[] = (() => {
  const bytes = readFileSync(new URL("../assets/timezone/hksar_18_district_boundary.json", import.meta.url));
  if (createHash("sha256").update(bytes).digest("hex") !==
    "ab2123b5a48c2e39e29ce594a0c51590cf6081922ab2c5c14ff78338b788f760")
    throw new Error("observation_timezone_boundary_invalid");
  const raw: unknown = JSON.parse(bytes.toString("utf8"));
  if (!raw || typeof raw !== "object" || !("features" in raw) ||
    !Array.isArray(raw.features) || raw.features.length !== 18)
    throw new Error("observation_timezone_boundary_invalid");
  return raw.features.map((feature: unknown) => {
    if (!feature || typeof feature !== "object" || !("geometry" in feature) ||
      !feature.geometry || typeof feature.geometry !== "object" ||
      !("type" in feature.geometry) || feature.geometry.type !== "Polygon" ||
      !("coordinates" in feature.geometry) || !Array.isArray(feature.geometry.coordinates) ||
      feature.geometry.coordinates.length !== 1)
      throw new Error("observation_timezone_boundary_invalid");
    const ring: unknown = feature.geometry.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every((point) =>
      Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)))
      throw new Error("observation_timezone_boundary_invalid");
    const coordinates = ring as Ring;
    const first = coordinates[0]!;
    const last = coordinates[coordinates.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1])
      throw new Error("observation_timezone_boundary_invalid");
    return {
      ring: coordinates,
      west: Math.min(...coordinates.map((point) => point[0])),
      east: Math.max(...coordinates.map((point) => point[0])),
      south: Math.min(...coordinates.map((point) => point[1])),
      north: Math.max(...coordinates.map((point) => point[1])),
    };
  });
})();

function containsOrBorders(ring: Ring, longitude: number, latitude: number) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [ax, ay] = ring[previous]!;
    const [bx, by] = ring[index]!;
    // District borders inside Hong Kong also occur in this publication.
    // Treat a point on any published district edge as within the union.
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

export function isHongKongDistrictPoint(latitude: number, longitude: number) {
  for (const district of districts) {
    if (longitude < district.west || longitude > district.east ||
      latitude < district.south || latitude > district.north) continue;
    if (containsOrBorders(district.ring, longitude, latitude)) return true;
  }
  return false;
}
