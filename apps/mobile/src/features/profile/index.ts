export type GuestDataKind = "preferences" | "favorites" | "drafts" | "offline" | "pendingContribution";

export interface MergeItem {
  localId: string;
  kind: GuestDataKind;
  revision: number;
  selected: boolean;
  conflict?: { remoteRevision: number; resolution: "keep-local" | "keep-remote" | "keep-both" };
}

export function planGuestMerge(items: MergeItem[]) {
  const selected = items.filter((item) => item.selected);
  return {
    idempotencyKeys: selected.map((item) => `guest-merge:${item.kind}:${item.localId}:${item.revision}`),
    operations: selected.map((item) => ({ ...item, action: item.conflict?.resolution ?? "create" })),
    preserveLocalUntilAcknowledged: true,
    selectedCount: selected.length,
    conflictCount: selected.filter((item) => item.conflict).length,
  };
}

export function sanitizeAnalyticsEvent(input: Record<string, unknown>) {
  const forbidden = new Set(["latitude", "longitude", "lat", "lon", "trajectory", "contacts", "privateSpot", "exif"]);
  return Object.fromEntries(Object.entries(input).filter(([key]) => !forbidden.has(key)));
}
