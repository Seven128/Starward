import { PLAN_NOTES_MAX_LENGTH, parsePlanEventOccurrenceIds, parsePlanReminders, parsePlanTravel, type PlanReminder } from "@starward/miniapp-contracts";
import type { ObservationContext, ObservationPlan, PlanTiming, PlanTravel } from "@starward/miniapp-contracts";
import { planSaveStorageKey as storageKey } from "./local-draft-keys";
export { planSaveBelongsTo } from "./local-draft-keys";

export type PlanSaveInput = { planId: string; spotId: string; observationContextId: string; localDate: string; localTime: string; timing?: PlanTiming; travel?: PlanTravel; reminders?: readonly PlanReminder[]; eventOccurrenceIds?: readonly string[]; notes: string; expectedRevision: number | null; contextIdentity: string };
type Entry = { input: PlanSaveInput; key: string; stableIdentity?: true; selected?: true };
export type PlanSaveReceipt = { owner: string; key: string; planId: string };
type Storage = { getStorageSync(key: string): unknown; setStorageSync(key: string, value: unknown): void; removeStorageSync(key: string): void };
export class PlanSaveRecoveryError extends Error {
  constructor(message: string, readonly pending: readonly Entry[] = []) { super(message); }
}
export class PlanSaveReviewRequired extends Error {
  constructor(readonly planId: string, readonly current: ObservationPlan | null,
    readonly receiptRevision: number | null, readonly receipt: PlanSaveReceipt) {
    super(current ? "已取得当前计划，请核对后保存本页修改。" : "未找到上次保存的计划，当前输入保留，不会自动重新创建。");
  }
}
export function clearPlanSaveRecovery(storage: Storage, owner: string) { storage.removeStorageSync(storageKey(owner)); }

/** Context IDs can expire; user-selected route origin and timezone define the same plan intent. */
export function planContextIdentity(context: ObservationContext, travel?: PlanTravel) {
  const origin = travel?.originLocation !== undefined ? null
    : context.location.kind === "MAP_POINT" ? context.location.wgs84 : context.routeOrigin?.wgs84;
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
export const samePlanSaveIntent = (left: PlanSaveInput, right: PlanSaveInput) => identity(clean(left)) === identity(clean(right));
function read(storage: Storage, key: string): Entry[] {
  const raw = storage.getStorageSync(key);
  if (raw === undefined || raw === null || raw === "") return [];
  const v = raw as { schema: number; entries: Entry[] };
  if (!v || v.schema !== 1 || !Array.isArray(v.entries) || v.entries.length > 32) throw new Error("invalid recovery data");
  return v.entries.map(entry => {
    if (!entry || typeof entry.key !== "string" || !/^[a-zA-Z0-9:_-]{1,180}$/.test(entry.key)) throw new Error("invalid retry key");
    if (entry.stableIdentity !== undefined && entry.stableIdentity !== true) throw new Error("invalid save identity");
    if (entry.selected !== undefined && entry.selected !== true) throw new Error("invalid save selection");
    return { input: clean(entry.input), key: entry.key, ...(entry.stableIdentity ? { stableIdentity: true as const } : {}), ...(entry.selected ? { selected: true as const } : {}) };
  });
}
/** Old versions did not associate their new-plan retries with a durable draft ID. */
export function resolvePlanCreationId(storage: Storage, owner: string, input: PlanSaveInput): string {
  try {
    const legacy = read(storage, storageKey(owner)).filter(entry => !entry.stableIdentity && entry.input.expectedRevision === null);
    if (!legacy.length) return input.planId;
    const matching = legacy.filter(entry => samePlanSaveIntent(entry.input, input));
    if (matching.length === 1) return matching[0]!.input.planId;
    throw new PlanSaveRecoveryError("请先选择要核对的旧保存记录；本页输入仍保留。", legacy);
  } catch (error) {
    if (error instanceof PlanSaveRecoveryError) throw error;
    throw new PlanSaveRecoveryError("计划恢复信息无法读取，请先核对已保存计划。");
  }
}
/** A delayed acknowledgement must never clear a different operation on the same plan. */
export function acknowledgePlanSave(storage: Storage, receipt: PlanSaveReceipt) {
  const key = storageKey(receipt.owner);
  const remaining = read(storage, key).filter(entry => entry.key !== receipt.key || entry.input.planId !== receipt.planId);
  if (remaining.length) storage.setStorageSync(key, { schema: 1, entries: remaining });
  else storage.removeStorageSync(key);
}
export function selectPlanSaveRecovery(storage: Storage, receipt: PlanSaveReceipt) {
  const key = storageKey(receipt.owner), entries = read(storage, key);
  if (!entries.some(entry => entry.key === receipt.key && entry.input.planId === receipt.planId))
    throw new PlanSaveRecoveryError("这次保存的恢复记录已变化，请重新核对。");
  storage.setStorageSync(key, { schema: 1, entries: entries.map(entry => {
    const { selected: _selected, ...value } = entry;
    return entry.input.planId !== receipt.planId ? entry : { ...value, ...(entry.key === receipt.key ? { selected: true } : {}) };
  }) });
}
export function createPlanSaveRetry(storage: Storage, makeKey: () => string, definitive: (error: unknown) => boolean) {
  return async <T>(owner: string, input: PlanSaveInput, operation: (key: string, original: PlanSaveInput) => Promise<T>) => {
    const key = storageKey(owner);
    let entry: Entry;
    let resumed = false;
    try {
      const entries = read(storage, key), value = clean(input);
      const matching = entries.filter(item => item.input.planId === value.planId);
      const selected = matching.find(item => item.selected);
      if (matching.length > 1 && !selected) throw new PlanSaveRecoveryError("这份计划有多次未确认保存，请先核对旧记录。", matching);
      const existing = selected ?? matching[0];
      resumed = Boolean(existing);
      if (!existing && entries.length >= 32) throw new Error("too many pending saves");
      entry = existing ?? { input: value, key: makeKey(), stableIdentity: true };
      if (!existing) entries.push(entry);
      storage.setStorageSync(key, { schema: 1, entries });
    } catch (error) {
      if (error instanceof PlanSaveRecoveryError) throw error;
      throw new PlanSaveRecoveryError("无法保留计划重试信息，尚未发出保存请求。请检查本机存储后重试。");
    }
    // The durable entry is written BEFORE dispatch: a process exit is an unknown
    // result, even if the catch handler never had a chance to run.
    const receipt = { owner, key: entry.key, planId: entry.input.planId };
    let result: T;
    try { result = await operation(entry.key, entry.input); }
    catch (error) {
      if (!resumed && definitive(error)) { try { acknowledgePlanSave(storage, receipt); } catch { /* Retain the retry if cleanup fails. */ } }
      throw error;
    }
    // The caller acknowledges only after reconciling the current server record
    // and durably binding or removing its draft. A receipt is not current state.
    return { result, input: entry.input, receipt };
  };
}
