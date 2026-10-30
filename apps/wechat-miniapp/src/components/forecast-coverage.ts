import { cloudInstant } from "@starward/miniapp-contracts";

export interface ForecastInterval { start: string; end: string }

/** Merge only supplied intervals. A single native instant does not gain an hour. */
export function mergeForecastIntervals(intervals: readonly ForecastInterval[]): ForecastInterval[] {
  const ordered = intervals.flatMap(interval => {
    const start = cloudInstant(interval.start), end = cloudInstant(interval.end);
    return start && end && Date.parse(end) >= Date.parse(start)
      ? [{ start: new Date(start).toISOString(), end: new Date(end).toISOString() }] : [];
  }).sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || Date.parse(a.end) - Date.parse(b.end));
  const result: ForecastInterval[] = [];
  for (const interval of ordered) {
    const previous = result.at(-1);
    if (previous && Date.parse(previous.end) >= Date.parse(interval.start)) {
      if (Date.parse(interval.end) > Date.parse(previous.end)) previous.end = interval.end;
    } else result.push({ ...interval });
  }
  return result;
}

/** Actual source-hour intervals, merged only when adjacent. Missing hours remain gaps. */
export function forecastCoverage(starts: readonly string[]) {
  const ordered = [...new Set(starts.map(Date.parse).filter(Number.isFinite))].sort((a, b) => a - b);
  const intervals: Array<{ start: string; end: string }> = [];
  for (const start of ordered) {
    const previous = intervals.at(-1);
    const end = new Date(start + 3_600_000).toISOString();
    if (previous && Date.parse(previous.end) >= start) previous.end = end;
    else intervals.push({ start: new Date(start).toISOString(), end });
  }
  return intervals;
}
