import type { AstronomicalEventOccurrence } from "@starward/miniapp-contracts";
import { eventDatePresentation } from "../content/event/event-model";

export const EVENT_BANNER_INTERVAL_MS = 5_000;

export function orderedBannerEvents(events: readonly AstronomicalEventOccurrence[]) {
  return [...events].sort((left, right) => left.peakDate.localeCompare(right.peakDate) || left.occurrenceId.localeCompare(right.occurrenceId));
}

/** Directory dates select the initial card; they never imply local visibility. */
export function initialBannerIndex(events: readonly AstronomicalEventOccurrence[], localDate: string) {
  const active = events.findIndex(event => event.activeStartDate <= localDate && event.activeEndDate >= localDate);
  if (active >= 0) return active;
  const next = events.findIndex(event => event.peakDate >= localDate);
  return next >= 0 ? next : Math.max(0, events.length - 1);
}

export function eventBannerCaption(event: AstronomicalEventOccurrence, localDate: string) {
  const date = event.peakDate.slice(0, 4) === localDate.slice(0, 4)
    ? `${Number(event.peakDate.slice(5, 7))}月${Number(event.peakDate.slice(8, 10))}日`
    : event.peakDate.replaceAll("-", ".");
  return `${eventDatePresentation(event).date} · ${date}`;
}
