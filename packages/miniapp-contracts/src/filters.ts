import type { SpotSummary } from "./types.ts";

export type FilterCategoryId =
  | "OBSERVATION"
  | "ARRIVAL"
  | "FACILITIES"
  | "PLACE"
  | "FRESHNESS";

export type FilterGroupKey =
  | "LIGHT_POLLUTION"
  | "LESS_CLOUD"
  | "PARKING"
  | "RESTROOM"
  | "DRIVE_UP_ACCESS"
  | "PHOTO_FOREGROUND"
  | "CAMPING_OVERNIGHT_PARKING"
  | "SPECIFIC_CELESTIAL_EVENT"
  | "MOON_IMPACT"
  | "HIKING_DIFFICULTY"
  | "SIGNAL"
  | "CHARGING"
  | "OPEN_SKY_DIRECTION"
  | "LAST_VERIFIED_AT";

export type FilterOptionId =
  | "lightPollution"
  | "lessCloud"
  | "parking"
  | "restroom"
  | "driveUpAccess"
  | "photoForeground"
  | "campingOvernightParking"
  | "specificCelestialEvent"
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
 * The current product has one flat, ordered 14-option taxonomy. Options whose
 * SpotSummary cannot truthfully answer a time/provider-dependent predicate
 * return no match instead of manufacturing a favourable value.
 */
export const FILTER_OPTIONS: readonly FilterOption[] = Object.freeze([
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

export type FilterState = Readonly<Record<FilterGroupKey, readonly string[]>>;

export const EMPTY_FILTER_STATE: FilterState = Object.freeze(
  Object.fromEntries(
    [
      ...FILTER_GROUPS.map(({ key }) => [key, Object.freeze([])]),
    ],
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
    [
      ...FILTER_GROUPS.map(({ key }) => [key, [...(state[key] ?? [])]]),
    ],
  ) as unknown as FilterState;
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
  >;
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
  FILTER_OPTIONS.length !== 14 ||
  new Set(FILTER_OPTIONS.map((item) => item.id)).size !== 14
) {
  throw new Error("filter_schema_must_be_exact_ordered_14");
}
