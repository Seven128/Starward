import type { SpotSummary } from "./types.ts";

export type FilterTier = "FIRST_LEVEL" | "ADVANCED";

export type FilterGroupKey =
  | "TONIGHT_RECOMMENDED"
  | "BEST_WINDOW_DURATION"
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
  | "tonightRecommended"
  | "bestWindowDuration"
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
  tier: FilterTier;
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
 * The current product has one flat, ordered 10+8 taxonomy. Options whose
 * SpotSummary cannot truthfully answer a time/provider-dependent predicate
 * return no match instead of manufacturing a favourable value.
 */
export const FILTER_OPTIONS: readonly FilterOption[] = Object.freeze([
  {
    id: "tonightRecommended",
    label: "今晚推荐",
    group: "TONIGHT_RECOMMENDED",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "bestWindowDuration",
    label: "最佳窗口时长",
    group: "BEST_WINDOW_DURATION",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "distanceDriveTime",
    label: "距离/驾车时间",
    group: "DISTANCE_DRIVE_TIME",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "lightPollution",
    label: "光害",
    group: "LIGHT_POLLUTION",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.lightPollution.productBand !== null,
  },
  {
    id: "lessCloud",
    label: "少云",
    group: "LESS_CLOUD",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "parking",
    label: "停车",
    group: "PARKING",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "PARKING"),
  },
  {
    id: "restroom",
    label: "厕所",
    group: "RESTROOM",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "TOILET"),
  },
  {
    id: "driveUpAccess",
    label: "可驾车直达",
    group: "DRIVE_UP_ACCESS",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.accessTags.includes("DRIVE_TO"),
  },
  {
    id: "photoForeground",
    label: "摄影前景",
    group: "PHOTO_FOREGROUND",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.media.some((item) => item.isSiteSpecific),
  },
  {
    id: "campingOvernightParking",
    label: "可露营/驻车",
    group: "CAMPING_OVERNIGHT_PARKING",
    tier: "FIRST_LEVEL",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "CAMPING"),
  },
  {
    id: "specificCelestialEvent",
    label: "特定天象",
    group: "SPECIFIC_CELESTIAL_EVENT",
    tier: "ADVANCED",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "lowCloudThreshold",
    label: "低云阈值",
    group: "LOW_CLOUD_THRESHOLD",
    tier: "ADVANCED",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "moonImpact",
    label: "月亮影响",
    group: "MOON_IMPACT",
    tier: "ADVANCED",
    mode: "CANCELABLE_SINGLE",
    evidence: "DYNAMIC_CONTEXT",
    test: dynamicUnavailable,
  },
  {
    id: "hikingDifficulty",
    label: "徒步难度",
    group: "HIKING_DIFFICULTY",
    tier: "ADVANCED",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.accessTags.includes("NO_HIKE"),
  },
  {
    id: "signal",
    label: "信号",
    group: "SIGNAL",
    tier: "ADVANCED",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "SIGNAL"),
  },
  {
    id: "charging",
    label: "充电",
    group: "CHARGING",
    tier: "ADVANCED",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => facility(spot, "CHARGING"),
  },
  {
    id: "openSkyDirection",
    label: "天空开阔方向",
    group: "OPEN_SKY_DIRECTION",
    tier: "ADVANCED",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.clearDirections.length > 0,
  },
  {
    id: "lastVerifiedAt",
    label: "最近核验时间",
    group: "LAST_VERIFIED_AT",
    tier: "ADVANCED",
    mode: "CANCELABLE_SINGLE",
    evidence: "STATIC_SPOT",
    test: (spot) => spot.lastVerifiedAt !== null,
  },
]);

export const FILTER_GROUPS: ReadonlyArray<{
  key: FilterGroupKey;
  section: "首层筛选" | "高级筛选";
  title: string;
  mode: FilterSelectionMode;
}> = Object.freeze(
  FILTER_OPTIONS.map((option) => {
    const section: "首层筛选" | "高级筛选" =
      option.tier === "FIRST_LEVEL" ? "首层筛选" : "高级筛选";
    return {
      key: option.group,
      section,
      title: option.label,
      mode: option.mode,
    };
  }),
);

export type FilterState = Readonly<Record<FilterGroupKey, readonly string[]>>;

export const EMPTY_FILTER_STATE: FilterState = Object.freeze(
  Object.fromEntries(
    FILTER_GROUPS.map(({ key }) => [key, Object.freeze([])]),
  ) as unknown as FilterState,
);

export function assertFilterState(
  value: unknown,
): asserts value is FilterState {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("filter_state_invalid:not_object");
  const record = value as Record<string, unknown>;
  const expectedKeys = FILTER_GROUPS.map((group) => group.key).sort();
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
}

export function cloneFilterState(state: FilterState): FilterState {
  return Object.fromEntries(
    FILTER_GROUPS.map(({ key }) => [key, [...(state[key] ?? [])]]),
  ) as unknown as FilterState;
}

export function toggleFilter(
  state: FilterState,
  optionId: string,
): FilterState {
  const option = FILTER_OPTIONS.find((item) => item.id === optionId);
  if (!option) throw new Error(`unknown_filter:${optionId}`);
  const next = cloneFilterState(state) as Record<FilterGroupKey, string[]>;
  const selected = next[option.group];
  next[option.group] = selected.includes(optionId) ? [] : [optionId];
  return next;
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

const firstLevel = FILTER_OPTIONS.filter(
  (option) => option.tier === "FIRST_LEVEL",
);
const advanced = FILTER_OPTIONS.filter((option) => option.tier === "ADVANCED");
if (
  FILTER_OPTIONS.length !== 18 ||
  firstLevel.length !== 10 ||
  advanced.length !== 8 ||
  new Set(FILTER_OPTIONS.map((item) => item.id)).size !== 18
) {
  throw new Error("filter_schema_must_be_exact_ordered_10_plus_8");
}
