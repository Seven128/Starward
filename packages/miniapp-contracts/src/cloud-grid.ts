import { sourceInstant } from "./source-instant.ts";

/** ECMWF total-cloud numerical policy shared by publishers and consumers.
 * WGS84 grid-point centres; display warping belongs to coordinate-system. */
export const CLOUD_SAMPLING_POLICY = "bilinear-valid-neighbours-linear-adjacent-native-times-v1" as const;
export const CLOUD_NATIVE_STEPS = Object.freeze([
  0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72,
  75, 78, 81, 84, 87, 90, 93, 96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, 135, 138, 141, 144,
  150, 156, 162, 168, 174, 180, 186, 192, 198, 204, 210, 216, 222, 228, 234, 240, 246, 252, 258, 264, 270, 276, 282, 288, 294, 300, 306, 312, 318, 324, 330, 336, 342, 348, 354, 360,
]);
export interface CloudNumericGrid {
  crs: "WGS84";
  layout: "row-major-north-to-south";
  registration: "grid-point-centres";
  width: number;
  height: number;
  west: number;
  north: number;
  longitudeStep: 0.1;
  latitudeStep: -0.1;
  unit: "fraction";
  valueType: "float32-le";
  maskType: "uint8";
  validMaskValue: 1;
}
export interface CloudNativeTime { stepHours: number; validAt: string }
export interface CloudNumericFrame { values: Float32Array; mask: Uint8Array }
export interface CloudTimeBracket {
  lowerIndex: number;
  upperIndex: number;
  fraction: number;
  lowerAt: string;
  upperAt: string;
}
export interface CloudPointEvidence {
  publicationId: string;
  runAt: string;
  selectedAt: string;
  lowerAt: string;
  upperAt: string;
  interpolation: "NATIVE" | "LINEAR";
  samplingPolicy: typeof CLOUD_SAMPLING_POLICY;
  cloudPercent: number;
}

export const cloudInstant = (value: unknown) => sourceInstant(value)?.replace(".000Z", "Z") ?? null;

export function cloudTimeBracket(frames: readonly CloudNativeTime[], runAt: string, selectedAt: string): CloudTimeBracket | null {
  const run = Date.parse(cloudInstant(runAt) ?? ""), selected = Date.parse(cloudInstant(selectedAt) ?? "");
  if (!Number.isFinite(run) || !Number.isFinite(selected) || selected < run) return null;
  let lower = -1;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]!, time = Date.parse(cloudInstant(frame.validAt) ?? "");
    if (!CLOUD_NATIVE_STEPS.includes(frame.stepHours) || time !== run + frame.stepHours * 3_600_000) return null;
    if (i > 0 && frame.stepHours <= frames[i - 1]!.stepHours) return null;
    if (time === selected) return { lowerIndex: i, upperIndex: i, fraction: 0, lowerAt: frame.validAt, upperAt: frame.validAt };
    if (time < selected) lower = i;
    else if (lower >= 0) {
      const previous = frames[lower]!;
      if (CLOUD_NATIVE_STEPS.indexOf(frame.stepHours) !== CLOUD_NATIVE_STEPS.indexOf(previous.stepHours) + 1) return null;
      return { lowerIndex: lower, upperIndex: i, fraction: (selected - Date.parse(previous.validAt)) / (time - Date.parse(previous.validAt)),
        lowerAt: previous.validAt, upperAt: frame.validAt };
    } else return null;
  }
  return null;
}

export function assertCloudGrid(grid: CloudNumericGrid): CloudNumericGrid {
  if (grid?.crs !== "WGS84" || grid.layout !== "row-major-north-to-south" || grid.registration !== "grid-point-centres"
    || grid.unit !== "fraction" || grid.valueType !== "float32-le" || grid.maskType !== "uint8" || grid.validMaskValue !== 1
    || !Number.isSafeInteger(grid.width) || !Number.isSafeInteger(grid.height) || grid.width < 2 || grid.height < 2
    || grid.width * grid.height > 1_000_000 || grid.longitudeStep !== 0.1 || grid.latitudeStep !== -0.1
    || !Number.isFinite(grid.west) || !Number.isFinite(grid.north) || grid.west < -180 || grid.north > 90
    || grid.west + (grid.width - 1) * 0.1 > 180 + 1e-9 || grid.north - (grid.height - 1) * 0.1 < -90 - 1e-9)
    throw new Error("cloud_numeric_grid_invalid");
  return grid;
}

function cloudGridPositionIsCovered(grid: CloudNumericGrid, x: number, y: number): boolean {
  return x >= -1e-9 && y >= -1e-9 && x <= grid.width - 1 + 1e-9 && y <= grid.height - 1 + 1e-9;
}

/** Spatial support only, independent of native values or masks. Keep the
 * sampler's exact edge convention so crop absence cannot become source loss. */
export function cloudGridCoversPoint(grid: CloudNumericGrid, latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && cloudGridPositionIsCovered(grid, (longitude - grid.west) / grid.longitudeStep, (latitude - grid.north) / grid.latitudeStep);
}

/** All positively weighted neighbours must be valid. Exact nodes need only
 * their own sample; missing support is never renormalized into clear sky. */
export function cloudSpatialSample(grid: CloudNumericGrid, frame: CloudNumericFrame, latitude: number, longitude: number): number | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const x = (longitude - grid.west) / grid.longitudeStep, y = (latitude - grid.north) / grid.latitudeStep;
  if (!cloudGridPositionIsCovered(grid, x, y)) return null;
  const snap = (value: number) => Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : value;
  const sx = snap(x), sy = snap(y), left = Math.floor(sx), top = Math.floor(sy), dx = sx - left, dy = sy - top;
  let result = 0;
  for (let row = 0; row <= 1; row++) for (let column = 0; column <= 1; column++) {
    const weight = (row ? dy : 1 - dy) * (column ? dx : 1 - dx);
    if (weight === 0) continue;
    const at = (top + row) * grid.width + left + column, value = frame.values[at];
    if (frame.mask[at] !== 1 || value === undefined || !Number.isFinite(value) || value < 0 || value > 1) return null;
    result += weight * value;
  }
  // Valid inputs and convex weights cannot exceed the fraction domain; remove
  // only floating-point accumulation at its exact 0/1 bounds.
  return Math.max(0, Math.min(1, result));
}

export function cloudInterpolateFraction(lower: number | null, upper: number | null, fraction: number): number | null {
  if (lower === null || upper === null || !Number.isFinite(lower) || !Number.isFinite(upper)
    || lower < 0 || lower > 1 || upper < 0 || upper > 1 || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) return null;
  return Math.max(0, Math.min(1, lower + (upper - lower) * fraction));
}

/** The bracket and grid are validated once per frame, not once per pixel. */
export function cloudSamplePercent(grid: CloudNumericGrid, bracket: CloudTimeBracket, lower: CloudNumericFrame,
  upper: CloudNumericFrame, latitude: number, longitude: number): number | null {
  const first = cloudSpatialSample(grid, lower, latitude, longitude);
  if (first === null) return null;
  const second = bracket.lowerIndex === bracket.upperIndex ? first : cloudSpatialSample(grid, upper, latitude, longitude);
  if (second === null) return null;
  const value = cloudInterpolateFraction(first, second, bracket.fraction);
  return value === null ? null : value * 100;
}

export function cloudSampleAt(input: {
  grid: CloudNumericGrid; bracket: CloudTimeBracket; lower: CloudNumericFrame; upper: CloudNumericFrame;
  latitude: number; longitude: number; runAt: string; publicationId: string; selectedAt: string;
}): CloudPointEvidence | null {
  const selectedAt = cloudInstant(input.selectedAt), runAt = cloudInstant(input.runAt);
  if (!selectedAt || !runAt) return null;
  const { grid, bracket, lower, upper, latitude, longitude } = input;
  const cloudPercent = cloudSamplePercent(grid, bracket, lower, upper, latitude, longitude);
  if (cloudPercent === null) return null;
  return { publicationId: input.publicationId, runAt, selectedAt,
    lowerAt: bracket.lowerAt, upperAt: bracket.upperAt, interpolation: bracket.lowerIndex === bracket.upperIndex ? "NATIVE" : "LINEAR",
    samplingPolicy: CLOUD_SAMPLING_POLICY, cloudPercent };
}

/** Existing Map total-cloud palette; apply only after numeric sampling. */
export function cloudDisplayRgba(percent: number | null): readonly [number, number, number, number] {
  if (percent === null || !Number.isFinite(percent) || percent < 0 || percent > 100) return [0, 0, 0, 0];
  const rgb = percent <= 30 ? [0x4e, 0x8e, 0x9b] : percent <= 65 ? [0x76, 0xaa, 0xb2] : [0xa9, 0xc9, 0xce];
  return [rgb[0]!, rgb[1]!, rgb[2]!, Math.round(0x6b + percent / 100 * (0xbf - 0x6b))];
}
