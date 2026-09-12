import { parsePlanEventOccurrenceIds } from "@starward/miniapp-contracts";

type Storage = {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
};

export interface PlanEventSelection {
  occurrenceId: string;
  target: string;
}

const keyFor = (owner: string, target: string) =>
  `starward.plan-event-selection.v1:${JSON.stringify([owner, target])}`;

export function writePlanEventSelection(
  storage: Storage,
  owner: string,
  selection: PlanEventSelection,
) {
  if (!owner || !selection.target) return false;
  try {
    parsePlanEventOccurrenceIds([selection.occurrenceId]);
    storage.setStorageSync(keyFor(owner, selection.target), {
      schema: 1,
      occurrenceId: selection.occurrenceId,
      target: selection.target,
    });
    return true;
  } catch {
    return false;
  }
}

export function consumePlanEventSelection(
  storage: Storage,
  owner: string,
  target: string,
): PlanEventSelection | null {
  const key = keyFor(owner, target);
  let value: unknown;
  try { value = storage.getStorageSync(key); } catch { return null; }
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  try {
    if (candidate.schema !== 1 || candidate.target !== target)
      throw new Error("invalid_plan_event_selection");
    const [occurrenceId] = parsePlanEventOccurrenceIds([candidate.occurrenceId]);
    storage.removeStorageSync(key);
    return { occurrenceId: occurrenceId!, target };
  } catch {
    try { storage.removeStorageSync(key); } catch { /* Invalid data remains unusable. */ }
    return null;
  }
}

export function planEventSelectionBelongsTo(key: string, owner: string) {
  return key.startsWith(`starward.plan-event-selection.v1:${JSON.stringify([owner]).slice(0, -1)},`);
}
