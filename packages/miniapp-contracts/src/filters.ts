import type { SpotSummary } from "./types.ts";

export type FilterGroupKey =
  | "LIGHT"
  | "OBSTRUCTION"
  | "LIGHT_DIRECTION"
  | "DRIVE_TIME"
  | "TRIP"
  | "ALTITUDE"
  | "FACILITY";
export type FilterSelectionMode = "CANCELABLE_SINGLE" | "MULTIPLE";

export interface FilterOption {
  id: string;
  label: string;
  group: FilterGroupKey;
  mode: FilterSelectionMode;
  test: (spot: SpotSummary) => boolean;
}

const facility = (spot: SpotSummary, type: string) =>
  spot.facilities.some(
    (item) => item.type === type && item.status === "AVAILABLE",
  );

export const FILTER_OPTIONS: readonly FilterOption[] = Object.freeze([
  {
    id: "light-lte-2",
    label: "2级以下",
    group: "LIGHT",
    mode: "CANCELABLE_SINGLE",
    test: (s) =>
      s.lightPollution.levelAtMost !== null &&
      s.lightPollution.levelAtMost <= 2,
  },
  {
    id: "light-lte-3",
    label: "3级以下",
    group: "LIGHT",
    mode: "CANCELABLE_SINGLE",
    test: (s) =>
      s.lightPollution.levelAtMost !== null &&
      s.lightPollution.levelAtMost <= 3,
  },
  {
    id: "light-lte-4",
    label: "4级以下",
    group: "LIGHT",
    mode: "CANCELABLE_SINGLE",
    test: (s) =>
      s.lightPollution.levelAtMost !== null &&
      s.lightPollution.levelAtMost <= 4,
  },
  {
    id: "light-lte-5",
    label: "5级以下",
    group: "LIGHT",
    mode: "CANCELABLE_SINGLE",
    test: (s) =>
      s.lightPollution.levelAtMost !== null &&
      s.lightPollution.levelAtMost <= 5,
  },
  {
    id: "light-lte-6",
    label: "6级以下",
    group: "LIGHT",
    mode: "CANCELABLE_SINGLE",
    test: (s) =>
      s.lightPollution.levelAtMost !== null &&
      s.lightPollution.levelAtMost <= 6,
  },
  {
    id: "obstruction-lte-50",
    label: "遮挡面积 50% 以下",
    group: "OBSTRUCTION",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.obstructionPercent !== null && s.obstructionPercent <= 50,
  },
  {
    id: "obstruction-lte-30",
    label: "遮挡面积 30% 以下",
    group: "OBSTRUCTION",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.obstructionPercent !== null && s.obstructionPercent <= 30,
  },
  {
    id: "obstruction-none",
    label: "无遮挡",
    group: "OBSTRUCTION",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.obstructionPercent === 0,
  },
  {
    id: "direction-all",
    label: "全部无光害",
    group: "LIGHT_DIRECTION",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.clearDirections.includes("ALL"),
  },
  {
    id: "direction-west",
    label: "西边无光害",
    group: "LIGHT_DIRECTION",
    mode: "CANCELABLE_SINGLE",
    test: (s) =>
      s.clearDirections.includes("WEST") || s.clearDirections.includes("ALL"),
  },
  {
    id: "direction-northeast",
    label: "东北无光害",
    group: "LIGHT_DIRECTION",
    mode: "CANCELABLE_SINGLE",
    test: (s) =>
      s.clearDirections.includes("NORTHEAST") ||
      s.clearDirections.includes("ALL"),
  },
  {
    id: "drive-lte-120",
    label: "2小时内",
    group: "DRIVE_TIME",
    mode: "CANCELABLE_SINGLE",
    test: () => true,
  },
  {
    id: "drive-lte-240",
    label: "4小时内",
    group: "DRIVE_TIME",
    mode: "CANCELABLE_SINGLE",
    test: () => true,
  },
  {
    id: "drive-lte-360",
    label: "6小时内",
    group: "DRIVE_TIME",
    mode: "CANCELABLE_SINGLE",
    test: () => true,
  },
  {
    id: "trip-drive",
    label: "驾车直达",
    group: "TRIP",
    mode: "MULTIPLE",
    test: (s) => s.accessTags.includes("DRIVE_TO"),
  },
  {
    id: "trip-transit",
    label: "公共交通",
    group: "TRIP",
    mode: "MULTIPLE",
    test: (s) => s.accessTags.includes("PUBLIC_TRANSIT"),
  },
  {
    id: "trip-no-hike",
    label: "不要徒步",
    group: "TRIP",
    mode: "MULTIPLE",
    test: (s) => s.accessTags.includes("NO_HIKE"),
  },
  {
    id: "trip-no-climb",
    label: "不要登山",
    group: "TRIP",
    mode: "MULTIPLE",
    test: (s) => s.accessTags.includes("NO_CLIMB"),
  },
  {
    id: "altitude-lte-1000",
    label: "1000米以下",
    group: "ALTITUDE",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.altitudeM !== null && s.altitudeM <= 1000,
  },
  {
    id: "altitude-lte-2000",
    label: "2000米以下",
    group: "ALTITUDE",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.altitudeM !== null && s.altitudeM <= 2000,
  },
  {
    id: "altitude-lte-3000",
    label: "3000米以下",
    group: "ALTITUDE",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.altitudeM !== null && s.altitudeM <= 3000,
  },
  {
    id: "altitude-lte-4000",
    label: "4000米以下",
    group: "ALTITUDE",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.altitudeM !== null && s.altitudeM <= 4000,
  },
  {
    id: "altitude-lte-6000",
    label: "6000米以下",
    group: "ALTITUDE",
    mode: "CANCELABLE_SINGLE",
    test: (s) => s.altitudeM !== null && s.altitudeM <= 6000,
  },
  {
    id: "facility-parking",
    label: "有停车",
    group: "FACILITY",
    mode: "MULTIPLE",
    test: (s) => facility(s, "PARKING"),
  },
  {
    id: "facility-toilet",
    label: "有厕所",
    group: "FACILITY",
    mode: "MULTIPLE",
    test: (s) => facility(s, "TOILET"),
  },
  {
    id: "facility-charging",
    label: "可充电",
    group: "FACILITY",
    mode: "MULTIPLE",
    test: (s) => facility(s, "CHARGING"),
  },
  {
    id: "facility-camping",
    label: "能露营",
    group: "FACILITY",
    mode: "MULTIPLE",
    test: (s) => facility(s, "CAMPING"),
  },
]);

export const FILTER_GROUPS: ReadonlyArray<{
  key: FilterGroupKey;
  section: string;
  title: string;
  mode: FilterSelectionMode;
}> = Object.freeze([
  {
    key: "LIGHT",
    section: "观星条件",
    title: "光害等级",
    mode: "CANCELABLE_SINGLE",
  },
  {
    key: "OBSTRUCTION",
    section: "观星条件",
    title: "遮挡",
    mode: "CANCELABLE_SINGLE",
  },
  {
    key: "LIGHT_DIRECTION",
    section: "观星条件",
    title: "光害方向",
    mode: "CANCELABLE_SINGLE",
  },
  {
    key: "DRIVE_TIME",
    section: "观测点",
    title: "驾车时间",
    mode: "CANCELABLE_SINGLE",
  },
  { key: "TRIP", section: "观测点", title: "行程信息", mode: "MULTIPLE" },
  {
    key: "ALTITUDE",
    section: "观测点",
    title: "海拔",
    mode: "CANCELABLE_SINGLE",
  },
  { key: "FACILITY", section: "场地信息", title: "场地信息", mode: "MULTIPLE" },
]);

export type FilterState = Readonly<Record<FilterGroupKey, readonly string[]>>;

export const EMPTY_FILTER_STATE: FilterState = Object.freeze({
  LIGHT: Object.freeze([]),
  OBSTRUCTION: Object.freeze([]),
  LIGHT_DIRECTION: Object.freeze([]),
  DRIVE_TIME: Object.freeze([]),
  TRIP: Object.freeze([]),
  ALTITUDE: Object.freeze([]),
  FACILITY: Object.freeze([]),
});

export function assertFilterState(value: unknown): asserts value is FilterState {
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
    if (!Array.isArray(selected) || selected.some((id) => typeof id !== "string"))
      throw new Error(`filter_state_invalid:${group.key}:not_string_array`);
    if (new Set(selected).size !== selected.length)
      throw new Error(`filter_state_invalid:${group.key}:duplicate`);
    if (group.mode === "CANCELABLE_SINGLE" && selected.length > 1)
      throw new Error(`filter_state_invalid:${group.key}:multiple`);
    const allowed = new Set(
      FILTER_OPTIONS.filter((option) => option.group === group.key).map(
        (option) => option.id,
      ),
    );
    if (selected.some((id) => !allowed.has(id)))
      throw new Error(`filter_state_invalid:${group.key}:unknown_option`);
  }
}

export function cloneFilterState(state: FilterState): FilterState {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [key, [...value]]),
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
  next[option.group] = selected.includes(optionId)
    ? selected.filter((id) => id !== optionId)
    : option.mode === "CANCELABLE_SINGLE"
      ? [optionId]
      : [...selected, optionId];
  return next;
}

export function countAppliedFilters(state: FilterState): number {
  return Object.values(state).reduce(
    (total, selected) => total + selected.length,
    0,
  );
}

export function filterSpots(
  spots: readonly SpotSummary[],
  state: FilterState,
): SpotSummary[] {
  const active = Object.values(state)
    .flat()
    .map((id) => FILTER_OPTIONS.find((item) => item.id === id))
    .filter((item): item is FilterOption => Boolean(item));
  return spots.filter((spot) => active.every((option) => option.test(spot)));
}

if (
  FILTER_OPTIONS.length !== 27 ||
  new Set(FILTER_OPTIONS.map((item) => item.id)).size !== 27
) {
  throw new Error("filter_schema_must_have_exactly_27_unique_terminal_options");
}
