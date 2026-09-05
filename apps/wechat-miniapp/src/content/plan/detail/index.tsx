import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useRouter } from "@tarojs/taro";
import { Button, Picker, Text, Textarea, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import {
  EMPTY_FILTER_STATE,
  type ObservationPlan,
  type PlanId,
  type SpotId,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  deleteObservationPlan,
  estimateSpotRoute,
  getMapScene,
  getPlans,
  getSkyReport,
  MiniappApiError,
  resolveObservationContext,
  restoreObservationContext,
  saveObservationPlan,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import {
  emptyPlanChecklist,
  normalizePlanChecklist,
  PLAN_CHECKLIST_ITEMS,
  planChecklistProgress,
  planChecklistStorageKey,
  type PlanChecklistState,
} from "./plan-checklist";
import { resolvePlanSaveSpotId } from "./plan-save-spot";
import { calendarDateInTimezone } from "@/utils/zoned-date";
import "./index.scss";

function today(timezone = "Asia/Shanghai") {
  return calendarDateInTimezone(new Date(), timezone);
}

function localTimeFor(value: string, timezone: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function windowLabel(
  window: { start: string; end: string } | null | undefined,
  timezone: string,
) {
  if (!window) return null;
  const start = localTimeFor(window.start, timezone);
  const end = localTimeFor(window.end, timezone);
  return start && end ? `${start}–${end}` : null;
}

function timeBefore(localDate: string, localTime: string, minutes: number) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(localDate) ||
    !/^\d{2}:\d{2}$/u.test(localTime)
  )
    return null;
  const base = new Date(`${localDate}T${localTime}:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setMinutes(base.getMinutes() - minutes);
  return `${String(base.getHours()).padStart(2, "0")}:${String(
    base.getMinutes(),
  ).padStart(2, "0")}`;
}

export default function PlanEditorPage() {
  const router = useRouter();
  const requestedPlanId = router.params.planId
    ? (router.params.planId as PlanId)
    : null;
  const plans = useAppStore((state) => state.plans);
  const savePlan = useAppStore((state) => state.savePlan);
  const replacePlans = useAppStore((state) => state.replacePlans);
  const notify = useAppStore((state) => state.notify);
  const observationContext = useAppStore(
    (state) => state.observationContext,
  );
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const existing = plans.find((plan) => plan.planId === requestedPlanId);
  const [activePlanId, setActivePlanId] = useState<PlanId | null>(
    existing?.planId ?? plans[0]?.planId ?? null,
  );
  const [editing, setEditing] = useState(false);
  const newPlanRequested = useRef(false);
  const activePlan = activePlanId
    ? (plans.find((plan) => plan.planId === activePlanId) ?? null)
    : null;
  const planQuery = useResourceQuery({
    queryKey: ["plans"],
    queryFn: (signal) => getPlans(signal),
    staleTime: 15_000,
  });
  const planSnapshot = activePlan?.contextSnapshot ?? null;
  const contextQuery = useResourceQuery({
    queryKey: planSnapshot
      ? [
          "plan-observation-context",
          "snapshot",
          activePlan?.planId,
          activePlan?.revision,
          planSnapshot.contextId,
          planSnapshot.contextFingerprint,
          planSnapshot.contextRevision,
        ]
      : [
          "plan-observation-context",
          "active",
          observationContext?.contextId,
          observationContext?.contextFingerprint,
          observationContext?.revision,
        ],
    queryFn: (signal) => {
      if (planSnapshot) {
        const restoreSnapshot = async () => {
          let routeOriginContextId: string | null = null;
          if (
            planSnapshot.schemaVersion === "observation-context-snapshot-v2" &&
            planSnapshot.routeOrigin
          ) {
            const routeOrigin = await resolveObservationContext(
              {
                location: {
                  kind: "MAP_POINT",
                  displayName: planSnapshot.routeOrigin.displayName,
                  wgs84: planSnapshot.routeOrigin.wgs84,
                  source: planSnapshot.routeOrigin.source,
                  ...(planSnapshot.timezone === "Asia/Shanghai" ||
                  planSnapshot.timezone === "Asia/Hong_Kong"
                    ? { timezoneHint: planSnapshot.timezone }
                    : {}),
                },
                localDate: planSnapshot.localDate,
                selectedAt: planSnapshot.selectedAtUtc,
                eventInstanceId: planSnapshot.eventInstanceId,
                targetProfile: "DAILY",
              },
              signal,
            );
            routeOriginContextId = routeOrigin.data.contextId;
          }
          return resolveObservationContext(
            {
              location: { kind: "FORMAL_SPOT", spotId: planSnapshot.spotId },
              ...(routeOriginContextId ? { routeOriginContextId } : {}),
              localDate: planSnapshot.localDate,
              selectedAt: planSnapshot.selectedAtUtc,
              eventInstanceId: planSnapshot.eventInstanceId,
              targetProfile: "DAILY",
            },
            signal,
          );
        };
        return restoreSnapshot();
      }
      if (observationContext)
        return restoreObservationContext(observationContext, signal);
      throw new Error("plan_observation_context_missing");
    },
    enabled: Boolean(observationContext || planSnapshot),
    staleTime: 60_000,
  });
  const activeContext = contextQuery.data?.data ?? null;
  useEffect(() => {
    if (
      activeContext &&
      (observationContext?.contextId !== activeContext.contextId ||
        observationContext.revision !== activeContext.revision ||
        observationContext.contextFingerprint !==
          activeContext.contextFingerprint)
    )
      setObservationContext(activeContext);
  }, [activeContext, observationContext, setObservationContext]);
  const spotsQuery = useResourceQuery({
    queryKey: [
      "plan-formal-spots",
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
    ],
    queryFn: (signal) =>
      getMapScene(
        activeContext!.contextId,
        EMPTY_FILTER_STATE,
        "",
        undefined,
        undefined,
        "NORMAL",
        activeContext!.weatherView.cloudLayer,
        signal,
      ),
    enabled: Boolean(activeContext),
    staleTime: 60_000,
  });
  const formalSpots = spotsQuery.data?.data.spots ?? [];
  const [selectedSpotId, setSelectedSpotId] = useState<SpotId | null>(
    existing?.spotId ??
      plans[0]?.spotId ??
      (observationContext?.location?.kind === "FORMAL_SPOT"
        ? observationContext.location.spotId
        : null),
  );
  const [localDate, setLocalDate] = useState(
    existing?.localDate ??
      plans[0]?.localDate ??
      observationContext?.localDate ??
      today(observationContext?.timezone),
  );
  const [localTime, setLocalTime] = useState(
    existing?.localTime ?? plans[0]?.localTime ?? "22:00",
  );
  const [notes, setNotes] = useState(existing?.notes ?? plans[0]?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checklist, setChecklist] = useState<PlanChecklistState>(
    emptyPlanChecklist(),
  );
  const routeQuery = useResourceQuery({
    queryKey: [
      "plan-route-estimate",
      activeContext?.contextId,
      selectedSpotId,
    ],
    queryFn: (signal) =>
      estimateSpotRoute(activeContext!.contextId, selectedSpotId!, signal),
    enabled: Boolean(activeContext && selectedSpotId),
    staleTime: 60_000,
  });
  const skyQuery = useResourceQuery({
    queryKey: [
      "plan-sky-summary",
      activePlan?.spotId,
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
    ],
    queryFn: (signal) =>
      getSkyReport(activePlan!.spotId, activeContext!.contextId, signal),
    enabled: Boolean(activePlan && activeContext),
    staleTime: 60_000,
  });
  const hydratedPlanId = useRef<PlanId | null>(existing?.planId ?? null);
  const appliedContextDefaults = useRef(false);
  const initialDraft = useRef({
    selectedSpotId,
    localDate,
    localTime,
    notes,
  });
  const themeClass = useThemeClass();
  const selectedSpotIndex = Math.max(
    0,
    formalSpots.findIndex((spot) => spot.spotId === selectedSpotId),
  );
  const applyPlan = (plan: ObservationPlan) => {
    hydratedPlanId.current = plan.planId;
    newPlanRequested.current = false;
    setActivePlanId(plan.planId);
    setEditing(false);
    setSelectedSpotId(plan.spotId);
    setLocalDate(plan.localDate);
    setLocalTime(plan.localTime);
    setNotes(plan.notes);
    initialDraft.current = {
      selectedSpotId: plan.spotId,
      localDate: plan.localDate,
      localTime: plan.localTime,
      notes: plan.notes,
    };
  };
  const startNewPlan = () => {
    newPlanRequested.current = true;
    setEditing(true);
    const nextDate =
      observationContext?.localDate ?? today(observationContext?.timezone);
    setActivePlanId(null);
    setSelectedSpotId(
      observationContext?.location?.kind === "FORMAL_SPOT"
        ? observationContext.location.spotId
        : null,
    );
    setLocalDate(nextDate);
    setLocalTime("22:00");
    setNotes("");
    initialDraft.current = {
      selectedSpotId:
        observationContext?.location?.kind === "FORMAL_SPOT"
          ? observationContext.location.spotId
          : null,
      localDate: nextDate,
      localTime: "22:00",
      notes: "",
    };
  };
  useEffect(() => {
    if (!planQuery.data) return;
    const nextPlans = planQuery.data.data.plans;
    replacePlans(nextPlans);
    if (
      !requestedPlanId &&
      !newPlanRequested.current &&
      !activePlanId &&
      nextPlans[0]
    ) {
      applyPlan(nextPlans[0]);
    }
  }, [activePlanId, planQuery.data, replacePlans, requestedPlanId]);
  useEffect(() => {
    if (!activePlan || newPlanRequested.current) return;
    if (hydratedPlanId.current === activePlan.planId) return;
    applyPlan(activePlan);
  }, [activePlan]);
  useEffect(() => {
    if (!activePlanId) {
      setChecklist(emptyPlanChecklist());
      return;
    }
    try {
      setChecklist(
        normalizePlanChecklist(
          Taro.getStorageSync(planChecklistStorageKey(activePlanId)),
        ),
      );
    } catch {
      setChecklist(emptyPlanChecklist());
    }
  }, [activePlanId]);
  useEffect(() => {
    if (
      appliedContextDefaults.current ||
      activePlan ||
      requestedPlanId ||
      !activeContext
    )
      return;
    appliedContextDefaults.current = true;
    setSelectedSpotId(
      activeContext.location.kind === "FORMAL_SPOT"
        ? activeContext.location.spotId
        : null,
    );
    setLocalDate(activeContext.localDate);
  }, [activeContext, activePlan, requestedPlanId]);
  const isDirty = activePlan
    ? activePlan.spotId !== selectedSpotId ||
      activePlan.localDate !== localDate ||
      activePlan.localTime !== localTime ||
      activePlan.notes !== notes
    : selectedSpotId !== initialDraft.current.selectedSpotId ||
      localDate !== initialDraft.current.localDate ||
      localTime !== initialDraft.current.localTime ||
      notes !== initialDraft.current.notes;
  const route = routeQuery.data?.data ?? null;
  const sky = skyQuery.data?.data ?? null;
  const selectedSpot = formalSpots.find(
    (spot) => spot.spotId === activePlan?.spotId,
  );
  const timezone =
    activeContext?.timezone ?? selectedSpot?.timezone ?? "Asia/Shanghai";
  const primaryWindow = windowLabel(
    sky?.decision.skyOpportunity.primaryWindow,
    timezone,
  );
  const backupWindow = windowLabel(
    sky?.decision.skyOpportunity.backupWindow,
    timezone,
  );
  const estimatedDeparture =
    route?.driveMinutes != null && activePlan
      ? timeBefore(activePlan.localDate, activePlan.localTime, route.driveMinutes)
      : null;
  const checklistSummary = planChecklistProgress(checklist);
  const announce = (
    tone: "error" | "warning" | "info" | "success",
    title: string,
    body: string,
  ) => {
    notify({
      owner: "plan",
      placement: "inline",
      tone,
      title,
      body,
      dismissible: true,
      dedupeKey: `plan-${tone}-${title}-${body.slice(0, 48)}`,
    });
  };
  const save = async () => {
    if (!activeContext) {
      announce(
        "error",
        "计划未保存",
        "观测上下文尚未恢复；本页草稿仍保留，请恢复后重试。",
      );
      return;
    }
    const spotId = resolvePlanSaveSpotId({
      selectedSpotId,
      formalSpotIds: formalSpots.map((item) => item.spotId),
      activePlanSpotId: activePlan?.spotId ?? null,
      contextLocation: activeContext.location,
    });
    if (!spotId) {
      announce(
        "error",
        "计划未保存",
        "请先选择一个正式观星点；本页草稿仍保留。",
      );
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/u.test(localDate) ||
      !/^\d{2}:\d{2}$/u.test(localTime)
    ) {
      announce(
        "error",
        "计划未保存",
        "日期或时间格式无效；本页草稿仍保留，可修正后重试。",
      );
      return;
    }
    const planId =
      activePlanId ??
      (`plan:${Date.now()}-${Math.random().toString(16).slice(2)}` as PlanId);
    const plan: Omit<
      ObservationPlan,
      "revision" | "updatedAt" | "contextSnapshot"
    > = {
      planId,
      spotId,
      localDate,
      localTime,
      notes,
    };
    setSaving(true);
    try {
      const response = await saveObservationPlan(
        plan,
        activeContext.contextId,
        activePlan?.revision ?? null,
      );
      savePlan(response.data);
      hydratedPlanId.current = response.data.planId;
      newPlanRequested.current = false;
      setActivePlanId(response.data.planId);
      setEditing(false);
      try {
        Taro.setStorageSync(
          planChecklistStorageKey(response.data.planId),
          checklist,
        );
      } catch {
        // Checklist progress is a local recovery aid; the plan itself is already server-owned.
      }
      announce(
        "success",
        "计划已保存",
        "计划已安全保存；天气与夜空条件仍以打开页面时的最新数据为准。",
      );
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const current = await planQuery.refetch().catch(() => undefined);
        if (current) replacePlans(current.data.plans);
        announce(
          "warning",
          "计划已在其他位置更新",
          "本页输入已完整保留；请核对最新计划后再次保存。",
        );
      } else {
        announce(
          "error",
          "计划保存失败",
          `${errorMessage(error)}；输入完整保留，可重试。`,
        );
      }
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!activePlan) return;
    const confirmation = await Taro.showModal({
      title: "删除观测计划？",
      content: `删除后本计划将从服务端移除${isDirty ? "，本页未保存修改也会丢弃" : ""}；取消或失败时本页内容保持不变。`,
      confirmText: "删除",
      confirmColor: "#B53A3A",
    });
    if (!confirmation.confirm) return;
    setDeleting(true);
    try {
      const response = await deleteObservationPlan(activePlan.planId);
      replacePlans(response.data.plans);
      try {
        Taro.removeStorageSync(planChecklistStorageKey(activePlan.planId));
      } catch {
        // A failed local cleanup cannot resurrect a deleted server plan.
      }
      announce(
        "success",
        "计划已删除",
        "已从服务端回读计划列表，即将返回 My。",
      );
      await Taro.navigateBack().catch(() =>
        Taro.switchTab({ url: "/pages/my/index" }),
      );
    } catch (error) {
      announce(
        "error",
        "计划删除失败",
        `${errorMessage(error)}；计划与本页草稿保持不变，可重试。`,
      );
    } finally {
      setDeleting(false);
    }
  };
  const toggleChecklistItem = (id: keyof PlanChecklistState) => {
    setChecklist((current) => {
      const next = { ...current, [id]: !current[id] };
      if (activePlanId) {
        try {
          Taro.setStorageSync(planChecklistStorageKey(activePlanId), next);
        } catch {
          // Keep the interaction usable even when local storage is unavailable.
        }
      }
      return next;
    });
  };
  const showMissingRequestedPlan = Boolean(
    requestedPlanId &&
      !activePlan &&
      planQuery.data &&
      !planQuery.isPending &&
      !planQuery.isError,
  );
  const showCreateEmpty = Boolean(
    !requestedPlanId &&
      !activePlan &&
      !editing &&
      planQuery.data &&
      !planQuery.isPending &&
      !planQuery.isError &&
      plans.length === 0,
  );
  return (
    <View
      className={`${themeClass} plan-editor`}
      data-route="plan-editor"
      data-od-id="my-plan"
      data-control="plan-editor"
    >
      <FloatingNotificationHost />
      <CustomNav
        title="今晚计划"
        back
        backOdId="my-plan-back-action"
        backFallbackTab="/pages/my/index"
      />
      <View className="plan-content safe-bottom">
        <View
          className="plan-notification-state"
          data-od-id="my-plan-notification-state"
        >
          <NotificationRegion owner="plan" placement="inline" />
        </View>
        {planQuery.isError && !activePlan ? (
          <StatusPanel
            state="ERROR"
            detail={`服务端计划暂不可回读：${errorMessage(planQuery.error)}；不会用示例计划替代。`}
            recoveryLabel="重试回读"
            onRecover={() => void planQuery.refetch()}
          />
        ) : null}
        {!activePlan && planQuery.isPending && !editing ? (
          <StatusPanel state="LOADING" detail="正在回读你的已保存计划。" />
        ) : null}
        {showMissingRequestedPlan ? (
          <StatusPanel
            state="ERROR"
            detail="这条计划已不在当前身份的服务端列表中；不会把它降级成新建表单。"
            recoveryLabel="重试回读"
            onRecover={() => void planQuery.refetch()}
          />
        ) : null}
        {showCreateEmpty ? (
          <View className="plan-empty card">
            <Text className="type-section">还没有已保存计划</Text>
            <Text className="type-caption">
              只有你确认正式观星点、日期和当地时间后，才会创建一条服务端计划。
            </Text>
            <SoftButton
              variant="primary"
              label="新建观测计划"
              onClick={startNewPlan}
            >
              新建观测计划
            </SoftButton>
          </View>
        ) : null}
        {activePlan && !editing ? (
          <>
            <View className="plan-hero" data-od-id="plan-summary">
              <View className="plan-hero__orbit" aria-hidden="true">
                <View className="plan-hero__moon" />
              </View>
              <Text className="plan-hero__eyebrow">
                {sky
                  ? `${sky.decision.label} · ${
                      primaryWindow ? `主时窗 ${primaryWindow}` : "主时窗暂缺"
                    }`
                  : skyQuery.isPending
                    ? "动态条件加载中"
                    : "动态条件暂不可用"}
              </Text>
              <Text className="plan-hero__title">
                {selectedSpot?.name ?? "点位资料暂不可用"}
              </Text>
              <Text className="plan-hero__subtitle">
                {selectedSpot
                  ? [
                      selectedSpot.region,
                      route?.distanceKm != null
                        ? `路线约 ${route.distanceKm.toFixed(1)} km`
                        : null,
                      route?.driveMinutes != null
                        ? `预计 ${route.driveMinutes} 分钟`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "地点身份已回读，路线动态尚待确认"
                  : "正式点位资料暂不可用；计划内容仍保留。"}
              </Text>
              <View className="plan-hero__facts" aria-label="计划关键时间">
                <View className="plan-hero__fact">
                  <Text className="plan-hero__fact-value">
                    {routeQuery.isPending ? "…" : estimatedDeparture ?? "—"}
                  </Text>
                  <Text className="plan-hero__fact-label">建议出发</Text>
                </View>
                <View className="plan-hero__fact">
                  <Text className="plan-hero__fact-value">
                    {activePlan.localTime}
                  </Text>
                  <Text className="plan-hero__fact-label">预计到达</Text>
                </View>
                <View className="plan-hero__fact">
                  <Text className="plan-hero__fact-value">
                    {skyQuery.isPending ? "…" : backupWindow ?? "—"}
                  </Text>
                  <Text className="plan-hero__fact-label">备选时窗</Text>
                </View>
              </View>
            </View>
            {planQuery.isError ? (
              <StatusPanel
                state="STALE"
                detail={`服务端计划暂不可回读，当前仍显示本机已回读副本：${errorMessage(planQuery.error)}。`}
                recoveryLabel="重试回读"
                onRecover={() => void planQuery.refetch()}
              />
            ) : null}
            {contextQuery.isError ? (
              <StatusPanel
                state="ERROR"
                detail="计划的观测上下文暂不可恢复；计划、检查项仍保留，不会改用另一个地点或日期。"
                recoveryLabel="重试动态条件"
                onRecover={() => void contextQuery.refetch()}
              />
            ) : null}
            {skyQuery.isError ? (
              <StatusPanel
                state="STALE"
                detail="天气与夜空动态条件暂不可用；计划和出发复核仍可继续，恢复后可重试。"
                recoveryLabel="重试动态条件"
                onRecover={() => void skyQuery.refetch()}
              />
            ) : null}
            <View className="plan-section plan-checklist" data-od-id="plan-preparation">
              <View className="plan-section-heading">
                <Text className="type-section">出发前复核</Text>
                <Text className="plan-section-count">
                  {checklistSummary.completed} / {checklistSummary.total}
                </Text>
              </View>
              <View className="plan-checklist__list">
                {PLAN_CHECKLIST_ITEMS.map((item) => {
                  const checked = checklist[item.id];
                  return (
                    <Button
                      className={`plan-checklist__row focus-ring${checked ? " plan-checklist__row--done" : ""}`}
                      key={item.id}
                      aria-label={`${item.title}${checked ? "，已完成" : "，未完成"}`}
                      aria-pressed={checked}
                      onClick={() => toggleChecklistItem(item.id)}
                    >
                      <View className="plan-checklist__check" aria-hidden="true">
                        <Text>{checked ? "✓" : ""}</Text>
                      </View>
                      <View className="plan-checklist__copy">
                        <Text className="plan-checklist__title">{item.title}</Text>
                        <Text className="plan-checklist__detail">{item.detail}</Text>
                      </View>
                      <Text
                        className={`plan-checklist__status${checked ? " plan-checklist__status--done" : ""}`}
                      >
                        {checked ? item.doneLabel : item.pendingLabel}
                      </Text>
                    </Button>
                  );
                })}
              </View>
            </View>
            <View className="plan-section plan-route" data-od-id="plan-route-nodes">
              <View className="plan-section-heading">
                <Text className="type-section">路线节点</Text>
                <Text className="plan-section-caption">地图与计划共用地点</Text>
              </View>
              {routeQuery.isPending ? (
                <StatusPanel state="LOADING" detail="正在回读路线估算。" />
              ) : routeQuery.isError ? (
                <StatusPanel
                  state="STALE"
                  detail="路线动态暂不可用；计划、地点和检查项仍保留。"
                  recoveryLabel="重试路线"
                  onRecover={() => void routeQuery.refetch()}
                />
              ) : route ? (
                <View className="plan-route__card">
                  <View className="plan-route__timeline">
                    <View className="plan-route__node">
                      <View className="plan-route__dot" aria-hidden="true" />
                      <View className="plan-route__node-copy">
                        <Text className="plan-route__node-title">
                          {estimatedDeparture
                            ? `${estimatedDeparture} · ${route.originLabel ?? "出发地"}`
                            : route.originLabel ?? "出发位置"}
                        </Text>
                        <Text className="plan-route__node-detail">
                          {route.driveMinutes != null
                            ? `预计驾车 ${route.driveMinutes} 分钟`
                            : "驾车时间暂缺"}
                        </Text>
                      </View>
                      <Text className="plan-route__node-meta">START</Text>
                    </View>
                    <View className="plan-route__node plan-route__node--summary">
                      <View className="plan-route__dot" aria-hidden="true" />
                      <View className="plan-route__node-copy">
                        <Text className="plan-route__node-title">路线概览</Text>
                        <Text className="plan-route__node-detail">
                          {route.lastRoad || "末段道路信息暂缺"}
                          {route.parkingGuidance
                            ? ` · ${route.parkingGuidance}`
                            : ""}
                        </Text>
                      </View>
                      <Text className="plan-route__node-meta">
                        {route.distanceKm != null
                          ? `${route.distanceKm.toFixed(1)} km`
                          : "—"}
                      </Text>
                    </View>
                    <View className="plan-route__node">
                      <View className="plan-route__dot" aria-hidden="true" />
                      <View className="plan-route__node-copy">
                        <Text className="plan-route__node-title">
                          {activePlan.localTime} · {selectedSpot?.name ?? "正式观星点"}
                        </Text>
                        <Text className="plan-route__node-detail">
                          计划观测时间；到达后仍需以现场开放与安全事实为准
                        </Text>
                      </View>
                      <Text className="plan-route__node-meta">ARRIVE</Text>
                    </View>
                  </View>
                  <Text className="plan-route__source-note">
                    {route.state === "FRESH"
                      ? "路线结果来自当前上下文。"
                      : "路线结果可能过期；出发前请重新复核。"}
                  </Text>
                </View>
              ) : (
                <StatusPanel
                  state="PARTIAL"
                  detail="当前没有可用路线节点；不会用直线距离冒充驾车时间。"
                />
              )}
            </View>
            <View className="plan-actions">
              <SoftButton
                variant="primary"
                label="出发前复核路线"
                disabled={routeQuery.isPending}
                onClick={() => void routeQuery.refetch()}
              >
                {routeQuery.isPending ? "复核中…" : "出发前复核路线"}
              </SoftButton>
              <SoftButton label="编辑计划" onClick={() => setEditing(true)}>
                编辑计划
              </SoftButton>
            </View>
            {plans.length > 1 ? (
              <View className="plan-list plan-list--secondary card" data-od-id="plan-list">
                <View className="plan-list__heading">
                  <Text className="type-section">其他已保存计划</Text>
                  <SoftButton label="新建观测计划" onClick={startNewPlan}>
                    新建
                  </SoftButton>
                </View>
                {plans
                  .filter((plan) => plan.planId !== activePlan.planId)
                  .map((plan) => {
                    const spot = formalSpots.find(
                      (item) => item.spotId === plan.spotId,
                    );
                    return (
                      <View className="plan-list__item" key={plan.planId}>
                        <View className="plan-list__copy">
                          <Text className="type-label">
                            {spot?.name ?? "点位资料暂不可用"}
                          </Text>
                          <Text className="type-caption">
                            {plan.localDate} · {plan.localTime}
                          </Text>
                        </View>
                        <SoftButton
                          label={`打开${spot?.name ?? "观测"}计划`}
                          onClick={() => applyPlan(plan)}
                        >
                          打开
                        </SoftButton>
                      </View>
                    );
                  })}
              </View>
            ) : null}
          </>
        ) : null}
        {editing ? (
          <View className="plan-editor-form" data-od-id="plan-editor-form">
            <View className="plan-editor-form__heading">
              <Text className="type-section">
                {activePlan ? "编辑计划" : "新建观测计划"}
              </Text>
              <Text className="type-caption">
                保存只写入你的计划意图；动态条件仍由服务端回读。
              </Text>
            </View>
            <View className="form-group">
              <Text className="type-label">正式观星点</Text>
              {!activeContext ? (
                <StatusPanel
                  state="ERROR"
                  detail="请先返回地图，让应用建立观测地点、日期与时区，再新建计划。"
                  recoveryLabel="返回地图"
                  onRecover={() => Taro.switchTab({ url: "/pages/map/index" })}
                />
              ) : contextQuery.isPending ? (
                <StatusPanel
                  state="LOADING"
                  detail="正在恢复观测地点、日期与时区。"
                />
              ) : contextQuery.isError ? (
                <StatusPanel
                  state="ERROR"
                  detail="观测上下文当前不可用；计划草稿仍保留，也不会改用另一个地点或日期。"
                  recoveryLabel="重试"
                  onRecover={() => void contextQuery.refetch()}
                />
              ) : spotsQuery.isPending ? (
                <StatusPanel state="LOADING" detail="正在加载正式观星点。" />
              ) : spotsQuery.isError ? (
                <StatusPanel
                  state="ERROR"
                  detail="正式观星点目录当前不可用；不会显示内置示例点位。"
                  recoveryLabel="重试"
                  onRecover={() => void spotsQuery.refetch()}
                />
              ) : formalSpots.length === 0 ? (
                <StatusPanel
                  state="EMPTY"
                  detail="当前没有已完成核验并发布的正式观星点，因此暂不能新建正式计划。"
                />
              ) : null}
              {formalSpots.length ? (
                <Picker
                  mode="selector"
                  range={formalSpots.map(
                    (spot) => `${spot.name} · ${spot.region}`,
                  )}
                  value={selectedSpotIndex}
                  onChange={(event) => {
                    const spot = formalSpots[Number(event.detail.value)];
                    if (spot) setSelectedSpotId(spot.spotId);
                  }}
                >
                  <View
                    className="field focus-ring"
                    role="button"
                    aria-label="选择正式观星点"
                  >
                    <Text>
                      {formalSpots.find(
                        (spot) => spot.spotId === selectedSpotId,
                      )?.name ?? "请选择正式观星点"}
                    </Text>
                  </View>
                </Picker>
              ) : activePlan ? (
                <View className="field field--readonly" role="status">
                  <Text>{selectedSpot?.name ?? "当前计划点位资料暂不可用"}</Text>
                </View>
              ) : (
                <View
                  className="field field--disabled"
                  role="button"
                  aria-label="选择正式观星点"
                  aria-disabled="true"
                >
                  <Text>暂无可选正式观星点</Text>
                </View>
              )}
            </View>
            <View className="form-grid">
              <View className="form-group">
                <Text className="type-label">当地日期</Text>
                <Picker
                  mode="date"
                  value={localDate}
                  onChange={(event) => setLocalDate(event.detail.value)}
                >
                  <View className="field focus-ring">
                    <Text>{localDate}</Text>
                  </View>
                </Picker>
              </View>
              <View className="form-group">
                <Text className="type-label">当地时间</Text>
                <Picker
                  mode="time"
                  value={localTime}
                  onChange={(event) => setLocalTime(event.detail.value)}
                >
                  <View className="field focus-ring">
                    <Text>{localTime}</Text>
                  </View>
                </Picker>
              </View>
            </View>
            <View className="form-group">
              <Text className="type-label">备注</Text>
              <Textarea
                className="field field-textarea"
                value={notes}
                maxlength={800}
                autoHeight={false}
                placeholder="器材、同伴、撤离和准备事项"
                aria-label="观测计划备注"
                onInput={(event) => setNotes(event.detail.value)}
              />
            </View>
            {isDirty ? (
              <StatusPanel
                state="PARTIAL"
                detail="本页有未保存修改；返回、保存失败或冲突时草稿会保留。"
              />
            ) : null}
            {planQuery.isError ? (
              <StatusPanel
                state="STALE"
                detail={`服务端计划暂不可回读，当前仅显示本机最后一次副本：${errorMessage(planQuery.error)}。`}
                recoveryLabel="重试回读"
                onRecover={() => void planQuery.refetch()}
              />
            ) : null}
            <View className="plan-editor-form__actions">
              <SoftButton
                variant="primary"
                disabled={saving}
                label="保存观测计划"
                onClick={() => void save()}
              >
                {saving ? "保存中…" : "保存计划"}
              </SoftButton>
              {activePlan ? (
                <SoftButton
                  variant="danger"
                  disabled={saving || deleting}
                  label="删除观测计划"
                  onClick={() => void remove()}
                >
                  {deleting ? "删除中…" : "删除计划"}
                </SoftButton>
              ) : null}
              <SoftButton
                label="返回计划详情"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                返回计划详情
              </SoftButton>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
