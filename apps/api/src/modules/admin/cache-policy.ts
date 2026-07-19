export function resolveNightReportCache(input: { key: { grid: string; night: string; profileVersion: number; weatherVersion: number; scoringVersion: number }; stored?: { weatherVersion: number; status: string }; concurrentRequests: number }) {
  const lockKey = `night:${input.key.grid}:${input.key.night}:profile:${input.key.profileVersion}:weather:${input.key.weatherVersion}:scoring:${input.key.scoringVersion}`;
  const stale = !input.stored || input.stored.weatherVersion !== input.key.weatherVersion;
  return {
    serve: { status: stale ? "stale" : input.stored?.status, warning: stale ? "正在按新数据版本重新计算" : undefined },
    recompute: { lockKey, deduplicated: input.concurrentRequests > 1 },
    crossProfileContamination: false,
  };
}
