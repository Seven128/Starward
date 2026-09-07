import type { SpotId } from "@starward/miniapp-contracts";
export { planDraftKey } from "../../../services/local-draft-keys";

export interface PlanDraft {
  selectedSpotId: SpotId | null;
  localDate: string;
  localTime: string;
  notes: string;
  baseRevision?: number | null;
}

/** Invalidate recovery data even when the storage adapter cannot remove a key. */
export function clearPlanDraft(storage: {
  removeStorageSync(key: string): void;
  setStorageSync(key: string, value: unknown): void;
}, key: string | null): boolean {
  if (!key) return true;
  try { storage.removeStorageSync(key); return true; } catch {
    try { storage.setStorageSync(key, null); return true; } catch { return false; }
  }
}

/** A mounted editor can acquire its first identity, but cannot change owners. */
export function createDraftOwner(initialUserId: string | null) {
  let owner = initialUserId;
  return (currentUserId: string | null): string | null => {
    if (!currentUserId) return null;
    owner ??= currentUserId;
    return owner === currentUserId ? owner : null;
  };
}

export function parsePlanDraft(value: unknown): PlanDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Record<string, unknown>;
  if (draft.baseRevision !== undefined && draft.baseRevision !== null &&
      (!Number.isSafeInteger(draft.baseRevision) || (draft.baseRevision as number) < 0)) return null;
  if ((draft.selectedSpotId !== null && typeof draft.selectedSpotId !== "string") ||
      typeof draft.localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(draft.localDate) ||
      typeof draft.localTime !== "string" || !/^\d{2}:\d{2}$/.test(draft.localTime) ||
      typeof draft.notes !== "string" || draft.notes.length > 800) return null;
  return { selectedSpotId: draft.selectedSpotId as SpotId | null,
    localDate: draft.localDate, localTime: draft.localTime, notes: draft.notes,
    ...(draft.baseRevision === undefined ? {} : { baseRevision: draft.baseRevision as number | null }) };
}
