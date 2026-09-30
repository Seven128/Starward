import { PLAN_NOTES_MAX_LENGTH, parsePlanEventOccurrenceIds, parsePlanReminders, parsePlanTravel, type PlanReminder } from "@starward/miniapp-contracts";
import type { SpotId, PlanTiming, PlanTravel } from "@starward/miniapp-contracts";
export { planDraftKey } from "../../../services/local-draft-keys";

export interface PlanDraft {
  creationPlanId?: string;
  creationConfirmed?: true;
  timing?: PlanTiming;
  travel?: PlanTravel;
  reminders?: readonly PlanReminder[];
  eventOccurrenceIds?: readonly string[];
  selectedSpotId: SpotId | null;
  localDate: string;
  localTime: string;
  notes: string;
  baseRevision?: number | null;
}

/** Clearing a save may claim only the authored fields actually being submitted. */
export function planDraftMatchesInput(stored: PlanDraft, submitted: PlanDraft) {
  const fields = (draft: PlanDraft) => [draft.selectedSpotId, draft.localDate, draft.localTime, draft.notes,
    draft.timing ?? null, draft.travel ?? null, draft.reminders ?? [], draft.eventOccurrenceIds ?? [], draft.baseRevision ?? null];
  return JSON.stringify(fields(stored)) === JSON.stringify(fields(submitted));
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

/** Another editor may have changed or replaced this scope while saving. */
export function clearUnchangedPlanDraft(storage: {
  getStorageSync(key: string): unknown;
  removeStorageSync(key: string): void;
  setStorageSync(key: string, value: unknown): void;
}, key: string | null, serialized: string | undefined): boolean {
  if (!key) return true;
  try {
    if (JSON.stringify(storage.getStorageSync(key)) !== serialized) return false;
    return clearPlanDraft(storage, key);
  } catch { return false; }
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
  if (draft.creationPlanId !== undefined && (typeof draft.creationPlanId !== "string" || !/^plan:[a-zA-Z0-9:_-]{1,175}$/.test(draft.creationPlanId))) return null;
  if (draft.creationConfirmed !== undefined && (draft.creationConfirmed !== true || !draft.creationPlanId)) return null;
  let timing: PlanTiming | undefined;
  let travel: PlanTravel | undefined;
  let reminders: PlanReminder[] | undefined;
  let eventOccurrenceIds: string[] | undefined;
  try { if (draft.reminders !== undefined) reminders = parsePlanReminders(draft.reminders, true); } catch { return null; }
  try { if (draft.travel !== undefined) travel = parsePlanTravel(draft.travel, true); } catch { return null; }
  try { if (draft.eventOccurrenceIds !== undefined) eventOccurrenceIds = parsePlanEventOccurrenceIds(draft.eventOccurrenceIds); } catch { return null; }
  if (draft.timing !== undefined) {
    if (!draft.timing || typeof draft.timing !== "object") return null;
    const t = draft.timing as Record<string, unknown>;
    for (const field of ["endLocalDate", "departureLocalDate", "endLocalTime", "departureLocalTime"] as const) {
      if (typeof t[field] !== "string" || (t[field] !== "" &&
        !(field.endsWith("Date") ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{2}:\d{2}$/).test(t[field]))) return null;
    }
    timing = { endLocalDate: t.endLocalDate as string, endLocalTime: t.endLocalTime as string,
      departureLocalDate: t.departureLocalDate as string, departureLocalTime: t.departureLocalTime as string };
  }
  if (draft.baseRevision !== undefined && draft.baseRevision !== null &&
      (!Number.isSafeInteger(draft.baseRevision) || (draft.baseRevision as number) < 0)) return null;
  if ((draft.selectedSpotId !== null && typeof draft.selectedSpotId !== "string") ||
      typeof draft.localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(draft.localDate) ||
      typeof draft.localTime !== "string" || !/^\d{2}:\d{2}$/.test(draft.localTime) ||
      typeof draft.notes !== "string" || draft.notes.length > PLAN_NOTES_MAX_LENGTH) return null;
  return { selectedSpotId: draft.selectedSpotId as SpotId | null,
    ...(draft.creationPlanId === undefined ? {} : { creationPlanId: draft.creationPlanId as string }),
    ...(draft.creationConfirmed ? { creationConfirmed: true as const } : {}),
    ...(timing ? { timing } : {}),
    ...(travel ? { travel } : {}),
    ...(reminders === undefined ? {} : { reminders }),
    ...(eventOccurrenceIds === undefined ? {} : { eventOccurrenceIds }),
    localDate: draft.localDate, localTime: draft.localTime, notes: draft.notes,
    ...(draft.baseRevision === undefined ? {} : { baseRevision: draft.baseRevision as number | null }) };
}
