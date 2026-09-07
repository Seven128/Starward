export const PLAN_CHECKLIST_ITEMS = [
  {
    id: "route",
    title: "路线与开放信息",
    detail: "出发前回看入口、开放状态和最后一段路。",
    doneLabel: "已复核",
    pendingLabel: "待复核",
  },
  {
    id: "red-light",
    title: "红光灯与备用电池",
    detail: "准备不影响暗适应的照明和备用电量。",
    doneLabel: "已准备",
    pendingLabel: "未完成",
  },
  {
    id: "companions",
    title: "同行与返程联系人",
    detail: "确认同行人和预计返程时间。",
    doneLabel: "已确认",
    pendingLabel: "未完成",
  },
  {
    id: "conditions",
    title: "天气与官方预警",
    detail: "建议出发前再次复核动态条件。",
    doneLabel: "已复核",
    pendingLabel: "待复核",
  },
  {
    id: "water",
    title: "饮水与薄外套",
    detail: "按夜间温度、风和停留时长准备随身物品。",
    doneLabel: "已准备",
    pendingLabel: "未完成",
  },
] as const;

export type PlanChecklistId = (typeof PLAN_CHECKLIST_ITEMS)[number]["id"];
export type PlanChecklistState = Record<PlanChecklistId, boolean>;

export function emptyPlanChecklist(): PlanChecklistState {
  return Object.fromEntries(
    PLAN_CHECKLIST_ITEMS.map(({ id }) => [id, false]),
  ) as PlanChecklistState;
}

export function normalizePlanChecklist(value: unknown): PlanChecklistState {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    PLAN_CHECKLIST_ITEMS.map(({ id }) => [id, source[id] === true]),
  ) as PlanChecklistState;
}

export function planChecklistProgress(state: PlanChecklistState) {
  const completed = PLAN_CHECKLIST_ITEMS.filter(({ id }) => state[id]).length;
  return { completed, total: PLAN_CHECKLIST_ITEMS.length };
}

export function planChecklistStorageKey(planId: string, owner: string) {
  return `starward:plan-checklist:v2:${JSON.stringify([owner, planId])}`;
}

export function planChecklistBelongsTo(key: string, owner: string) {
  const prefix = "starward:plan-checklist:v2:";
  if (!key.startsWith(prefix)) return false;
  try {
    const parts: unknown = JSON.parse(key.slice(prefix.length));
    return Array.isArray(parts) && parts.length === 2 && parts[0] === owner && typeof parts[1] === "string";
  } catch { return false; }
}

export function readOwnedPlanChecklist(
  storage: { getStorageSync(key: string): unknown; setStorageSync(key: string, value: unknown): void; removeStorageSync(key: string): void },
  planId: string, owner: string, ownsPlan: boolean,
) {
  if (!ownsPlan) return emptyPlanChecklist();
  const key = planChecklistStorageKey(planId, owner);
  const current = storage.getStorageSync(key);
  if (current !== undefined && current !== null && current !== "") return normalizePlanChecklist(current);
  // A current account-scoped server plan establishes ownership of this unique ID.
  // Only then may its older, plan-ID-only preparation progress be adopted.
  const legacyKey = `starward:plan-checklist:${planId}`;
  const legacy = storage.getStorageSync(legacyKey);
  if (legacy === undefined || legacy === null || legacy === "") return emptyPlanChecklist();
  const migrated = normalizePlanChecklist(legacy);
  storage.setStorageSync(key, migrated);
  try { storage.removeStorageSync(legacyKey); } catch { /* Scoped value now takes precedence. */ }
  return migrated;
}
