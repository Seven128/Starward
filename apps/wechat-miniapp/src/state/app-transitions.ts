import {
  cloneFilterState,
  toggleFilter,
  type DisplayMode,
  type FilterState,
  type SpotId,
  type UserPreferences,
} from "@starward/miniapp-contracts";

export function setDisplayMode(
  mode: DisplayMode,
  priorMode: Exclude<DisplayMode, "OBSERVATION">,
  preferences: UserPreferences,
) {
  return {
    mode,
    priorMode: mode === "OBSERVATION" ? priorMode : mode,
    preferences: { ...preferences, displayMode: mode },
  };
}

export function enterObservationMode(currentMode: DisplayMode) {
  return {
    priorMode: currentMode === "NIGHT" ? ("NIGHT" as const) : ("DAY" as const),
    mode: "OBSERVATION" as const,
  };
}

export function exitObservationMode(
  priorMode: Exclude<DisplayMode, "OBSERVATION">,
  preferences: UserPreferences,
) {
  return {
    mode: priorMode,
    preferences: { ...preferences, displayMode: priorMode },
  };
}

export function restorePriorMode(
  mode: DisplayMode | undefined,
  persistedPriorMode?: Exclude<DisplayMode, "OBSERVATION">,
) {
  return persistedPriorMode ?? (mode === "NIGHT" ? "NIGHT" : "DAY");
}

export function restoreStartupMode(
  mode: DisplayMode | undefined,
  persistedPriorMode?: Exclude<DisplayMode, "OBSERVATION">,
): Exclude<DisplayMode, "OBSERVATION"> {
  if (mode === "NIGHT") return "NIGHT";
  if (mode === "OBSERVATION")
    return restorePriorMode(mode, persistedPriorMode);
  return "DAY";
}

export function beginFilterDraft(committedFilters: FilterState) {
  return {
    filterSheetOpen: true,
    draftFilters: cloneFilterState(committedFilters),
  };
}

export function toggleFilterDraft(draftFilters: FilterState, optionId: string) {
  return { draftFilters: toggleFilter(draftFilters, optionId) };
}

export function cancelFilterDraft(committedFilters: FilterState) {
  return {
    filterSheetOpen: false,
    draftFilters: cloneFilterState(committedFilters),
  };
}

export function applyFilterDraft(draftFilters: FilterState) {
  return {
    filterSheetOpen: false,
    committedFilters: cloneFilterState(draftFilters),
    draftFilters: cloneFilterState(draftFilters),
  };
}

export function addBoundedSearchHistory(
  history: readonly string[],
  query: string,
) {
  const value = query.trim();
  if (!value) return [...history];
  return [value, ...history.filter((item) => item !== value)].slice(0, 8);
}

export function toggleFavoriteRelation(
  favoriteIds: readonly SpotId[],
  spotId: SpotId,
) {
  const wasFavorite = favoriteIds.includes(spotId);
  return {
    favorite: !wasFavorite,
    favoriteIds: wasFavorite
      ? favoriteIds.filter((id) => id !== spotId)
      : [...favoriteIds, spotId],
  };
}
