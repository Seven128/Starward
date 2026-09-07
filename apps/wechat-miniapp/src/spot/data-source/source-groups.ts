import type { SourceKind, SourceSummary } from "@starward/miniapp-contracts";

export function groupSources(sources: readonly SourceSummary[]) {
  const groups = new Map<SourceKind, SourceSummary[]>();
  for (const source of sources) {
    const group = groups.get(source.kind) ?? [];
    group.push(source);
    groups.set(source.kind, group);
  }
  return [...groups].map(([kind, sources]) => ({ kind, sources }));
}
