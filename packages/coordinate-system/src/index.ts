export type Wgs84Coordinate = { lat: number; lon: number; system: "WGS84" };
export type Gcj02Coordinate = { lat: number; lon: number; system: "GCJ-02" };

const PI = Math.PI;
const A = 6378245.0;
const EE = 0.006693421622965943;

// Approximate GCJ-02 distortion coverage, not a political boundary. Points are
// CC0 from https://github.com/Artoria2e5/PRCoords/blob/master/js/misc/insane_is_in_china.js;
// This compact outline avoids the old rectangle shifting neighboring countries.
// Near an outline edge, platform/provider coordinates still need device checks.
const GCJ02_COVERAGE_LON_LAT = [
  114.433722,22.064310, 114.009458,22.182105, 113.599275,22.121763,
  113.583463,22.176002, 113.530900,22.175318, 113.529542,22.210608,
  113.613377,22.227435, 113.938514,22.483714, 114.043449,22.500274,
  114.138506,22.550640, 114.222984,22.550960, 114.366803,22.524255,
  115.254019,20.235733, 121.456316,26.504442, 123.417261,30.355685,
  124.289197,39.761103, 126.880509,41.774504, 127.887261,41.370015,
  128.214602,41.965359, 129.698745,42.452788, 130.766139,42.668534,
  131.282487,45.037051, 133.142361,44.842986, 134.882453,48.370596,
  132.235531,47.785403, 130.980075,47.804860, 130.659026,48.968383,
  127.860252,50.043973, 125.284310,53.667091, 120.619316,53.100485,
  119.403751,50.105903, 117.070862,49.690388, 115.586019,47.995542,
  118.599613,47.927785, 118.260771,46.707335, 113.534759,44.735134,
  112.093739,45.001999, 111.431259,43.489381, 105.206324,41.809510,
  96.485703,42.778692, 94.167961,44.991668, 91.130430,45.192938,
  90.694601,47.754437, 87.356293,49.232005, 85.375791,48.263928,
  85.876055,47.109272, 82.935423,47.285727, 81.929808,45.506317,
  79.919457,45.108122, 79.841455,42.178752, 73.334917,40.076332,
  73.241805,39.062331, 79.031902,34.206413, 78.738395,31.578004,
  80.715812,30.453822, 81.821692,30.585965, 85.501663,28.208463,
  92.096061,27.754241, 94.699781,29.357171, 96.079442,29.429559,
  98.910308,27.140660, 97.404057,24.494701, 99.400021,23.168966,
  100.697449,21.475914, 102.976870,22.616482, 105.476997,23.244292,
  108.565621,20.907735, 107.730505,18.193406, 110.669856,17.754550,
];

function validate(lat: number, lon: number): void {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError("coordinate_latitude_out_of_range");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new RangeError("coordinate_longitude_out_of_range");
}

function outsideGcj02Coverage(lat: number, lon: number): boolean {
  if (lon < 72.004 || lon > 137.8347 || lat < 17.75455 || lat > 55.8271) return true;
  let inside = false;
  for (let i = 0, j = GCJ02_COVERAGE_LON_LAT.length - 2; i < GCJ02_COVERAGE_LON_LAT.length; j = i, i += 2) {
    const yi = GCJ02_COVERAGE_LON_LAT[i + 1]!;
    const yj = GCJ02_COVERAGE_LON_LAT[j + 1]!;
    if ((yi <= lat && lat < yj) || (yj <= lat && lat < yi)) {
      const xi = GCJ02_COVERAGE_LON_LAT[i]!;
      const xj = GCJ02_COVERAGE_LON_LAT[j]!;
      const crossingLon = xi + (lat - yi) * (xj - xi) / (yj - yi);
      if (lon < crossingLon) inside = !inside;
    }
  }
  return !inside;
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

function projectGcj02(lat: number, lon: number) {
  let dLat = transformLat(lon - 105, lat - 35);
  let dLon = transformLon(lon - 105, lat - 35);
  const radLat = lat / 180 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = dLat * 180 / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLon = dLon * 180 / (A / sqrtMagic * Math.cos(radLat) * PI);
  return { lat: lat + dLat, lon: lon + dLon };
}

export function wgs84ToGcj02(input: Wgs84Coordinate): Gcj02Coordinate {
  validate(input.lat, input.lon);
  if (outsideGcj02Coverage(input.lat, input.lon)) return { lat: input.lat, lon: input.lon, system: "GCJ-02" };
  const projected = projectGcj02(input.lat, input.lon);
  // An offset may cross the approximate footprint edge; do not publish a
  // shifted point that the inverse would immediately classify as outside.
  if (outsideGcj02Coverage(projected.lat, projected.lon))
    return { lat: input.lat, lon: input.lon, system: "GCJ-02" };
  return { ...projected, system: "GCJ-02" };
}

export function gcj02ToWgs84(input: Gcj02Coordinate): Wgs84Coordinate {
  validate(input.lat, input.lon);
  if (outsideGcj02Coverage(input.lat, input.lon)) return { lat: input.lat, lon: input.lon, system: "WGS84" };
  let lat = input.lat;
  let lon = input.lon;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const projected = projectGcj02(lat, lon);
    const latError = projected.lat - input.lat;
    const lonError = projected.lon - input.lon;
    lat -= latError;
    lon -= lonError;
    if (Math.abs(latError) < 1e-9 && Math.abs(lonError) < 1e-9) break;
  }
  if (outsideGcj02Coverage(lat, lon))
    return { lat: input.lat, lon: input.lon, system: "WGS84" };
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
  // The source system is already known here. An identity projection at the
  // approximate edge must stay identity instead of guessing an inverse branch.
  const reconstructed = display.lat === authoritative.lat && display.lon === authoritative.lon
    ? authoritative : gcj02ToWgs84(display);
  return {
    authoritative: { ...authoritative },
    display,
    astronomyInput: { ...authoritative },
    roundTripErrorMeters: distanceMeters(authoritative, reconstructed),
    conversionVersion: "starward-coordinate-boundary-v3-gcj02-iterative",
    displayOnly: true,
  };
}
