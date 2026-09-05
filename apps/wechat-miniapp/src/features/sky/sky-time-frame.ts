/** Select one attributable instant; neither a nearby nor an ambiguous frame is usable. */
export function exactSkyTimeFrame<T extends { readonly at: string }>(
  frames: readonly T[] | undefined,
  at: string | undefined,
): T | undefined {
  if (!at || !Number.isFinite(Date.parse(at)) || !Array.isArray(frames))
    return undefined;
  const matches = frames.filter((frame) => frame.at === at);
  return matches.length === 1 ? matches[0] : undefined;
}
