import { PLAN_NOTES_MAX_LENGTH, parsePlanEventOccurrenceIds, parsePlanReminders, parsePlanTravel, type PlanReminder } from "@starward/miniapp-contracts";
import type { ObservationContext, PlanTiming, PlanTravel } from "@starward/miniapp-contracts";

export type PlanSaveInput = { planId: string; spotId: string; observationContextId: string; localDate: string; localTime: string; timing?: PlanTiming; travel?: PlanTravel; reminders?: readonly PlanReminder[]; eventOccurrenceIds?: readonly string[]; notes: string; expectedRevision: number | null; contextIdentity: string };
type Entry = { input: PlanSaveInput; key: string };
type Storage = { getStorageSync(key: string): unknown; setStorageSync(key: string, value: unknown): void; removeStorageSync(key: string): void };
const storageKey = (owner: string) => "starward.plan-save.v1:" + JSON.stringify([owner]);
export const planSaveBelongsTo = (key: string, owner: string) => key === storageKey(owner);
export class PlanSaveRecoveryError extends Error {}
export function clearPlanSaveRecovery(storage: Storage, owner: string) { storage.removeStorageSync(storageKey(owner)); }

/** Context IDs can expire; user-selected route origin and timezone define the same plan intent. */
export function planContextIdentity(context: ObservationContext) {
  const origin = context.location.kind === "MAP_POINT" ? context.location.wgs84 : context.routeOrigin?.wgs84;
  return JSON.stringify([context.timezone, origin ? [origin.latitude, origin.longitude, origin.system] : null]);
}
function clean(raw: unknown): PlanSaveInput {
  if (!raw || typeof raw !== "object") throw new Error("invalid plan input");
  const v = raw as PlanSaveInput;
  for (const [field, max] of [["planId", 180], ["spotId", 180], ["observationContextId", 256], ["localDate", 10], ["localTime", 5], ["notes", PLAN_NOTES_MAX_LENGTH], ["contextIdentity", 1000]] as const)
    if (typeof v[field] !== "string" || v[field].length > max) throw new Error("invalid plan input");
  if (!v.planId || !v.spotId || !v.observationContextId || !(v.expectedRevision === null || (Number.isSafeInteger(v.expectedRevision) && v.expectedRevision >= 0))) throw new Error("invalid plan identity");
  let timing: PlanTiming | undefined;
  if (v.timing !== undefined) {
    const t = v.timing;
    if (!t || typeof t !== "object" ||
      ![t.endLocalDate, t.departureLocalDate].every((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) ||
      ![t.endLocalTime, t.departureLocalTime].every((value) => typeof value === "string" && /^\d{2}:\d{2}$/.test(value))) throw new Error("invalid plan timing");
    timing = { endLocalDate: t.endLocalDate, endLocalTime: t.endLocalTime,
      departureLocalDate: t.departureLocalDate, departureLocalTime: t.departureLocalTime };
  }
  return { planId: v.planId, spotId: v.spotId, observationContextId: v.observationContextId, localDate: v.localDate, localTime: v.localTime,
    ...(timing ? { timing } : {}),
    ...(v.travel === undefined ? {} : { travel: parsePlanTravel(v.travel) }),
    ...(v.reminders === undefined ? {} : { reminders: parsePlanReminders(v.reminders) }),
    ...(v.eventOccurrenceIds === undefined ? {} : { eventOccurrenceIds: parsePlanEventOccurrenceIds(v.eventOccurrenceIds) }),
    notes: v.notes, expectedRevision: v.expectedRevision, contextIdentity: v.contextIdentity };
}
const identity = (v: PlanSaveInput) => JSON.stringify([v.expectedRevision === null ? null : v.planId, v.expectedRevision, v.spotId, v.localDate, v.localTime, v.notes, v.contextIdentity, v.timing ?? null, v.travel ?? null, v.reminders ?? null, v.eventOccurrenceIds ?? null]);
function read(storage: Storage, key: string): Entry[] {
  const raw = storage.getStorageSync(key);
  if (raw === undefined || raw === null || raw === "") return [];
  const v = raw as { schema: number; entries: Entry[] };
  if (!v || v.schema !== 1 || !Array.isArray(v.entries) || v.entries.length > 32) throw new Error("invalid recovery data");
  return v.entries.map(entry => {
    if (!entry || typeof entry.key !== "string" || !/^[a-zA-Z0-9:_-]{1,180}$/.test(entry.key)) throw new Error("invalid retry key");
    return { input: clean(entry.input), key: entry.key };
  });
}
export function createPlanSaveRetry(storage: Storage, makeKey: () => string, definitive: (error: unknown) => boolean) {
  return async <T>(owner: string, input: PlanSaveInput, operation: (key: string, original: PlanSaveInput) => Promise<T>): Promise<T> => {
    const key = storageKey(owner);
    let entry: Entry;
    try {
      const entries = read(storage, key), value = clean(input);
      const existing = entries.find(item => identity(item.input) === identity(value));
      if (!existing && entries.length >= 32) throw new Error("too many pending saves");
      entry = existing ?? { input: value, key: makeKey() };
      if (!existing) entries.push(entry);
      storage.setStorageSync(key, { schema: 1, entries });
    } catch { throw new PlanSaveRecoveryError("无法保留计划重试信息，尚未发出保存请求。请检查本机存储后重试。"); }
    const release = () => {
      try {
        const remaining = read(storage, key).filter(item => item.key !== entry.key);
        if (remaining.length) storage.setStorageSync(key, { schema: 1, entries: remaining });
        else storage.removeStorageSync(key);
      } catch { /* A confirmed receipt remains authoritative. */ }
    };
    let result: T;
    try { result = await operation(entry.key, entry.input); }
    catch (error) { if (definitive(error)) release(); throw error; }
    release(); return result;
  };
}
