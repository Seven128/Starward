import type { RouteTravelMode } from "./types.ts";

/** User-chosen local times in the formal spot's timezone, independent of forecasts. */
export interface PlanTiming {
  endLocalDate: string;
  endLocalTime: string;
  departureLocalDate: string;
  departureLocalTime: string;
}

export const PLAN_TRAVEL_ORIGIN_MAX_LENGTH = 120;
export const PLAN_EVENT_OCCURRENCES_MAX_COUNT = 8;
export type PlanTravelMode = RouteTravelMode;

/** User-owned departure arrangement. Provider route facts remain separate evidence. */
export interface PlanTravel {
  origin: string;
  mode: PlanTravelMode;
}

export function parsePlanTravel(value: unknown, allowBlankOrigin = false): PlanTravel {
  if (!value || typeof value !== "object") throw new Error("invalid_plan_travel");
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.origin !== "string" || candidate.origin.length > PLAN_TRAVEL_ORIGIN_MAX_LENGTH ||
      (!allowBlankOrigin && !candidate.origin.trim()) ||
      !["DRIVING", "TRANSIT", "WALKING"].includes(String(candidate.mode))) {
    throw new Error("invalid_plan_travel");
  }
  return { origin: candidate.origin, mode: candidate.mode as PlanTravelMode };
}

export function parsePlanEventOccurrenceIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > PLAN_EVENT_OCCURRENCES_MAX_COUNT)
    throw new Error("invalid_plan_event_occurrences");
  const ids = value.map((item) => {
    if (typeof item !== "string" || !/^event-occurrence:[a-z0-9-]+:\d{4}$/u.test(item))
      throw new Error("invalid_plan_event_occurrence");
    return item;
  });
  if (new Set(ids).size !== ids.length) throw new Error("duplicate_plan_event_occurrence");
  return ids;
}

/** Adopted plan editor note limit, shared by input, recovery and API validation. */
export const PLAN_NOTES_MAX_LENGTH = 2000;
