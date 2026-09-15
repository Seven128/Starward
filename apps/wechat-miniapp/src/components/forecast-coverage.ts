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
