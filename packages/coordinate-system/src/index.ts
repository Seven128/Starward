export type Wgs84Coordinate = { lat: number; lon: number; system: "WGS84" };
export type Gcj02Coordinate = { lat: number; lon: number; system: "GCJ-02" };

const PI = Math.PI;
const A = 6378245.0;
const EE = 0.006693421622965943;

function validate(lat: number, lon: number): void {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError("coordinate_latitude_out_of_range");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new RangeError("coordinate_longitude_out_of_range");
}

function outsideMainlandChina(lat: number, lon: number): boolean {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  value += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
  value += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
  return value + (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
}

function transformLon(x: number, y: number): number {
  let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  value += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
  value += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
  return value + (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
}

export function wgs84ToGcj02(input: Wgs84Coordinate): Gcj02Coordinate {
  validate(input.lat, input.lon);
  if (outsideMainlandChina(input.lat, input.lon)) return { lat: input.lat, lon: input.lon, system: "GCJ-02" };
  let dLat = transformLat(input.lon - 105, input.lat - 35);
  let dLon = transformLon(input.lon - 105, input.lat - 35);
  const radLat = input.lat / 180 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = dLat * 180 / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLon = dLon * 180 / (A / sqrtMagic * Math.cos(radLat) * PI);
  return { lat: input.lat + dLat, lon: input.lon + dLon, system: "GCJ-02" };
}

export function gcj02ToWgs84(input: Gcj02Coordinate): Wgs84Coordinate {
  validate(input.lat, input.lon);
  if (outsideMainlandChina(input.lat, input.lon)) return { lat: input.lat, lon: input.lon, system: "WGS84" };
  let lat = input.lat;
  let lon = input.lon;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const projected = wgs84ToGcj02({ lat, lon, system: "WGS84" });
    const latError = projected.lat - input.lat;
    const lonError = projected.lon - input.lon;
    lat -= latError;
    lon -= lonError;
    if (Math.abs(latError) < 1e-9 && Math.abs(lonError) < 1e-9) break;
  }
  return { lat, lon, system: "WGS84" };
}

export function distanceMeters(left: Pick<Wgs84Coordinate, "lat" | "lon">, right: Pick<Wgs84Coordinate, "lat" | "lon">): number {
  validate(left.lat, left.lon);
  validate(right.lat, right.lon);
  const radians = (degrees: number) => degrees * PI / 180;
  const dLat = radians(right.lat - left.lat);
  const dLon = radians(right.lon - left.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(left.lat)) * Math.cos(radians(right.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function createMapCoordinateView(input: { authoritative: { lat: number; lon: number; system: string } }) {
  if (input.authoritative.system !== "WGS84") throw new Error("authoritative_coordinate_must_be_wgs84");
  const authoritative: Wgs84Coordinate = { lat: input.authoritative.lat, lon: input.authoritative.lon, system: "WGS84" };
  const display = wgs84ToGcj02(authoritative);
  const reconstructed = gcj02ToWgs84(display);
  return {
    authoritative: { ...authoritative },
    display,
    astronomyInput: { ...authoritative },
    roundTripErrorMeters: distanceMeters(authoritative, reconstructed),
    conversionVersion: "starward-coordinate-boundary-v2-gcj02-iterative",
    displayOnly: true,
  };
}
