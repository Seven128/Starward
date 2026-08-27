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

export function planChecklistStorageKey(planId: string) {
  return `starward:plan-checklist:${planId}`;
}
