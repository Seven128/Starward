import type { SpotSummary } from "./types.ts";

export type FilterCategoryId =
  | "OBSERVATION"
  | "ARRIVAL"
  | "FACILITIES"
  | "PLACE"
  | "FRESHNESS";

export type FilterGroupKey =
  | "DISTANCE_DRIVE_TIME"
  | "LIGHT_POLLUTION"
  | "LESS_CLOUD"
  | "PARKING"
  | "RESTROOM"
  | "DRIVE_UP_ACCESS"
  | "PHOTO_FOREGROUND"
  | "CAMPING_OVERNIGHT_PARKING"
  | "SPECIFIC_CELESTIAL_EVENT"
  | "LOW_CLOUD_THRESHOLD"
  | "MOON_IMPACT"
  | "HIKING_DIFFICULTY"
  | "SIGNAL"
  | "CHARGING"
  | "OPEN_SKY_DIRECTION"
  | "LAST_VERIFIED_AT";

export type FilterOptionId =
  | "distanceDriveTime"
  | "lightPollution"
  | "lessCloud"
  | "parking"
  | "restroom"
  | "driveUpAccess"
  | "photoForeground"
  | "campingOvernightParking"
  | "specificCelestialEvent"
  | "lowCloudThreshold"
  | "moonImpact"
  | "hikingDifficulty"
  | "signal"
  | "charging"
  | "openSkyDirection"
  | "lastVerifiedAt";

export type FilterSelectionMode = "CANCELABLE_SINGLE";
export type FilterEvidence = "STATIC_SPOT" | "DYNAMIC_CONTEXT";

export interface FilterOption {
  id: FilterOptionId;
  label: string;
  group: FilterGroupKey;
  category: FilterCategoryId;
  mode: FilterSelectionMode;
  evidence: FilterEvidence;
  test: (spot: SpotSummary) => boolean;
}

const facility = (spot: SpotSummary, type: string) =>
  spot.facilities.some(
    (item) => item.type === type && item.status === "AVAILABLE",
  );

const dynamicUnavailable = () => false;

/**
 * The current product has one flat, ordered 16-option taxonomy. Options whose
 * SpotSummary cannot truthfully answer a time/provider-dependent predicate
 * return no match instead of manufacturing a favourable value.
 */
export const FILTER_OPTIONS: readonly FilterOption[] = Object.freeze([
  {
    id: "distanceDriveTime",
    label: "驾车范围",
    group: "DISTANCE_DRIVE_TIME",
    category: "ARRIVAL",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "lightPollution",
    label: "光害",
    group: "LIGHT_POLLUTION",
    category: "OBSERVATION",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.lightPollution.productBand !== null,
  },
  {
    id: "lessCloud",
    label: "少云",
    group: "LESS_CLOUD",
    category: "OBSERVATION",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "parking",
    label: "停车",
    group: "PARKING",
    category: "FACILITIES",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "PARKING"),
  },
  {
    id: "restroom",
    label: "厕所",
    group: "RESTROOM",
    category: "FACILITIES",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "TOILET"),
  },
  {
    id: "driveUpAccess",
    label: "可驾车直达",
    group: "DRIVE_UP_ACCESS",
    category: "ARRIVAL",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.accessTags.includes("DRIVE_TO"),
  },
  {
    id: "photoForeground",
    label: "摄影前景",
    group: "PHOTO_FOREGROUND",
    category: "PLACE",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.media.some((item) => item.isSiteSpecific),
  },
  {
    id: "campingOvernightParking",
    label: "可露营/驻车",
    group: "CAMPING_OVERNIGHT_PARKING",
    category: "PLACE",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "CAMPING"),
  },
  {
    id: "specificCelestialEvent",
    label: "特定天象",
    group: "SPECIFIC_CELESTIAL_EVENT",
    category: "OBSERVATION",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "lowCloudThreshold",
    label: "低云阈值",
    group: "LOW_CLOUD_THRESHOLD",
    category: "OBSERVATION",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "moonImpact",
    label: "月亮影响",
    group: "MOON_IMPACT",
    category: "OBSERVATION",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "hikingDifficulty",
    label: "徒步难度",
    group: "HIKING_DIFFICULTY",
    category: "ARRIVAL",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.accessTags.includes("NO_HIKE"),
  },
  {
    id: "signal",
    label: "信号",
    group: "SIGNAL",
    category: "FACILITIES",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "SIGNAL"),
  },
  {
    id: "charging",
    label: "充电",
    group: "CHARGING",
    category: "FACILITIES",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "CHARGING"),
  },
  {
    id: "openSkyDirection",
    label: "天空开阔方向",
    group: "OPEN_SKY_DIRECTION",
    category: "OBSERVATION",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.clearDirections.length > 0,
  },
  {
    id: "lastVerifiedAt",
    label: "最近核验时间",
    group: "LAST_VERIFIED_AT",
    category: "FRESHNESS",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.lastVerifiedAt !== null,
  },
]);

export const FILTER_GROUPS: ReadonlyArray<{
  key: FilterGroupKey;
  category: FilterCategoryId;
  title: string;
  mode: FilterSelectionMode;
}> = Object.freeze(
  FILTER_OPTIONS.map((option) => {
    return {
      key: option.group,
      category: option.category,
      title: option.label,
      mode: option.mode,
    };
  }),
);

export interface DrivingRangeParameter {
  readonly mode: "TIME" | "DISTANCE";
  readonly maxMinutes: number;
  readonly maxDistanceKm: number;
}

export const DEFAULT_DRIVING_RANGE: DrivingRangeParameter = Object.freeze({
  mode: "TIME",
  maxMinutes: 180,
  maxDistanceKm: 100,
});

export type FilterState = Readonly<Record<FilterGroupKey, readonly string[]>> & {
  readonly drivingRange: DrivingRangeParameter;
};

export const EMPTY_FILTER_STATE: FilterState = Object.freeze(
  Object.fromEntries(
    [
      ...FILTER_GROUPS.map(({ key }) => [key, Object.freeze([])]),
      ["drivingRange", DEFAULT_DRIVING_RANGE],
    ],
  ) as unknown as FilterState,
);

export function assertFilterState(
  value: unknown,
): asserts value is FilterState {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("filter_state_invalid:not_object");
  const record = value as Record<string, unknown>;
  const expectedKeys = [...FILTER_GROUPS.map((group) => group.key), "drivingRange"].sort();
  const actualKeys = Object.keys(record).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  )
    throw new Error("filter_state_invalid:key_set");
  for (const group of FILTER_GROUPS) {
    const selected = record[group.key];
    if (
      !Array.isArray(selected) ||
      selected.some((id) => typeof id !== "string")
    )
      throw new Error(`filter_state_invalid:${group.key}:not_string_array`);
    if (new Set(selected).size !== selected.length)
      throw new Error(`filter_state_invalid:${group.key}:duplicate`);
    if (selected.length > 1)
      throw new Error(`filter_state_invalid:${group.key}:multiple`);
    const allowed = new Set(
      FILTER_OPTIONS.filter((option) => option.group === group.key).map(
        (option) => option.id,
      ),
    );
    if (selected.some((id) => !allowed.has(id as FilterOptionId)))
      throw new Error(`filter_state_invalid:${group.key}:unknown_option`);
  }
  assertDrivingRangeParameter(record.drivingRange);
}

export function assertDrivingRangeParameter(
  value: unknown,
): asserts value is DrivingRangeParameter {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("driving_range_invalid:not_object");
  const candidate = value as Record<string, unknown>;
  if (candidate.mode !== "TIME" && candidate.mode !== "DISTANCE")
    throw new Error("driving_range_invalid:mode");
  if (
    !Number.isInteger(candidate.maxMinutes) ||
    (candidate.maxMinutes as number) < 30 ||
    (candidate.maxMinutes as number) > 360
  ) throw new Error("driving_range_invalid:max_minutes");
  if (
    !Number.isInteger(candidate.maxDistanceKm) ||
    (candidate.maxDistanceKm as number) < 1 ||
    (candidate.maxDistanceKm as number) > 1000
  ) throw new Error("driving_range_invalid:max_distance_km");
}

export function cloneFilterState(state: FilterState): FilterState {
  return Object.fromEntries(
    [
      ...FILTER_GROUPS.map(({ key }) => [key, [...(state[key] ?? [])]]),
      ["drivingRange", { ...(state.drivingRange ?? DEFAULT_DRIVING_RANGE) }],
    ],
  ) as unknown as FilterState;
}

export function setDrivingRangeParameter(
  state: FilterState,
  parameter: DrivingRangeParameter,
): FilterState {
  assertDrivingRangeParameter(parameter);
  return { ...cloneFilterState(state), drivingRange: { ...parameter } };
}

export function drivingRangeLabel(parameter: DrivingRangeParameter): string {
  return parameter.mode === "TIME"
    ? `驾车${parameter.maxMinutes}分钟内`
    : `驾车${parameter.maxDistanceKm}公里内`;
}

export function toggleFilter(
  state: FilterState,
  optionId: string,
): FilterState {
  const option = FILTER_OPTIONS.find((item) => item.id === optionId);
  if (!option) throw new Error(`unknown_filter:${optionId}`);
  const next = cloneFilterState(state) as unknown as Record<
    FilterGroupKey,
    string[]
  > & { drivingRange: DrivingRangeParameter };
  const selected = next[option.group];
  next[option.group] = selected.includes(optionId) ? [] : [optionId];
  return next as FilterState;
}

export function countAppliedFilters(state: FilterState): number {
  return FILTER_GROUPS.reduce(
    (total, { key }) => total + (state[key]?.length ?? 0),
    0,
  );
}

export function filterSpots(
  spots: readonly SpotSummary[],
  state: FilterState,
): SpotSummary[] {
  const active = FILTER_GROUPS.flatMap(({ key }) => state[key] ?? [])
    .map((id) => FILTER_OPTIONS.find((item) => item.id === id))
    .filter((item): item is FilterOption => Boolean(item));
  return spots.filter((spot) => active.every((option) => option.test(spot)));
}

if (
  FILTER_OPTIONS.length !== 16 ||
  new Set(FILTER_OPTIONS.map((item) => item.id)).size !== 16
) {
  throw new Error("filter_schema_must_be_exact_ordered_16");
}
