import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { Button, Picker, ScrollView, Text, Textarea, View } from "@tarojs/components";
import { useEffect, useId, useRef, useState } from "react";
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
  currentDraftUserId,
  clearObservationPlanSaveRecovery,
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
  PLAN_CHECKLIST_ITEMS,
  planChecklistProgress,
  planChecklistStorageKey,
  readOwnedPlanChecklist,
  type PlanChecklistState,
} from "./plan-checklist";
import { resolvePlanSaveSpotId } from "./plan-save-spot";
import { departureTimeLabel, observingWindowLabel } from "./plan-time-labels";
import { initialPlanSelection, planIdFromRoute } from "./plan-selection";
import { clearPlanDraft, createDraftOwner, parsePlanDraft, planDraftKey, type PlanDraft } from "./plan-draft";
import { canApplyContextRestore, sameContextVersion } from "@/pages/map/context-restore";
import { calendarDateInTimezone } from "@/utils/zoned-date";
import { planContextIdentity, PlanSaveRecoveryError } from "@/services/plan-save-retry";
import "./index.scss";

function today(timezone = "Asia/Shanghai") {
  return calendarDateInTimezone(new Date(), timezone);
}

export default function PlanEditorPage() {
  const router = useRouter();
  const requestedPlanId = planIdFromRoute(router.params.planId);
  const mountId = useId();
  const [, refreshIdentity] = useState(0);
  useDidShow(() => refreshIdentity((value) => value + 1));
  const planOwner = currentDraftUserId();
  const formOwner = useRef(planOwner);
  formOwner.current ??= planOwner;
  const planQuery = useResourceQuery({
    queryKey: ["plans", planOwner ?? `unresolved:${mountId}`],
    queryFn: (signal) => getPlans(signal, planOwner ?? undefined),
    staleTime: 15_000,
    throwOnRefetchError: true,
  });
  const plans = planQuery.data?.data.plans ?? [];
  const savePlan = useAppStore((state) => state.savePlan);
  const replacePlans = useAppStore((state) => state.replacePlans);
  const notify = useAppStore((state) => state.notify);
  const observationContext = useAppStore(
    (state) => state.observationContext,
  );
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const initialSelection = initialPlanSelection(requestedPlanId, plans);
  const draftOwner = useRef(createDraftOwner(currentDraftUserId()));
  const scopedDraftUserId = () => draftOwner.current(currentDraftUserId());
  const readDraft = (id: string | null) => {
    const key = planDraftKey(scopedDraftUserId(), id);
    try { return key ? parsePlanDraft(Taro.getStorageSync(key)) : null; } catch { return null; }
  };
  const restoredDraft = useRef(readDraft(initialSelection.planId)).current;
  const existing = initialSelection.plan;
  const [conflictPlan, setConflictPlan] = useState<ObservationPlan | null>(
    restoredDraft && restoredDraft.baseRevision === undefined ? existing : null,
  );
  const draftBaseRevision = useRef<number | null>(restoredDraft?.baseRevision ?? existing?.revision ?? null);
  const [activePlanId, setActivePlanId] = useState<PlanId | null>(
    initialSelection.planId,
  );
  const [editing, setEditing] = useState(Boolean(restoredDraft));
  const [recoveredLocalDraft, setRecoveredLocalDraft] = useState(Boolean(restoredDraft));
  const newPlanRequested = useRef(Boolean(restoredDraft && !initialSelection.planId));
  const activePlan = activePlanId
    ? (plans.find((plan) => plan.planId === activePlanId) ?? null)
    : null;
  const planSnapshot = activePlan?.contextSnapshot ?? null;
  const contextQuery = useResourceQuery({
    queryKey: planSnapshot
      ? [
          "plan-observation-context",
          "snapshot",
          planOwner,
          activePlan?.planId,
          activePlan?.revision,
          planSnapshot.contextId,
          planSnapshot.contextFingerprint,
          planSnapshot.contextRevision,
        ]
      : [
          "plan-observation-context",
          "active",
          planOwner,
          observationContext?.contextId,
          observationContext?.contextFingerprint,
          observationContext?.revision,
        ],
    queryFn: async (signal) => {
      const requestingOwner = scopedDraftUserId();
      if (!requestingOwner || requestingOwner !== planOwner) throw new Error("账号已变化，请重新打开计划。");
      const expectedContext = useAppStore.getState().observationContext;
      const loadContext = async () => {
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
      };
      const response = await loadContext();
      if (scopedDraftUserId() !== requestingOwner) throw new Error("账号已变化，请重新打开计划。");
      return { ...response, expectedContext, owner: requestingOwner };
    },
    enabled: Boolean(scopedDraftUserId() && (observationContext || planSnapshot)),
    staleTime: 60_000,
  });
  const activeContext = contextQuery.data?.data ?? null;
  useEffect(() => {
    if (!scopedDraftUserId() || contextQuery.data?.owner !== scopedDraftUserId()) return;
    const current = useAppStore.getState().observationContext;
    if (
      activeContext &&
      contextQuery.data &&
      canApplyContextRestore(contextQuery.data.expectedContext, current, activeContext) &&
      !sameContextVersion(current, activeContext)
    )
      setObservationContext(activeContext);
  }, [activeContext, contextQuery.data, setObservationContext, planOwner]);
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
    restoredDraft ? restoredDraft.selectedSpotId : existing?.spotId ??
      (observationContext?.location?.kind === "FORMAL_SPOT"
        ? observationContext.location.spotId
        : null),
  );
  const [localDate, setLocalDate] = useState(
    restoredDraft?.localDate ?? existing?.localDate ??
      observationContext?.localDate ??
      today(observationContext?.timezone),
  );
  const [localTime, setLocalTime] = useState(
    restoredDraft?.localTime ?? existing?.localTime ?? "22:00",
  );
  const [notes, setNotes] = useState(restoredDraft?.notes ?? existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveRecoveryError, setSaveRecoveryError] = useState(false);
  const [saveRecoveryReviewed, setSaveRecoveryReviewed] = useState(false);
  const mutationBusy = useRef(false);
  const [checklist, setChecklist] = useState<PlanChecklistState>(
    emptyPlanChecklist(),
  );
  const routeQuery = useResourceQuery({
    queryKey: [
      "plan-route-estimate",
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
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
  const hydratedDraftScope = useRef(planDraftKey(scopedDraftUserId(), initialSelection.planId));
  const appliedContextDefaults = useRef(Boolean(restoredDraft));
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
    if (mutationBusy.current || !scopedDraftUserId()) return;
    hydratedPlanId.current = plan.planId;
    newPlanRequested.current = false;
    setActivePlanId(plan.planId);
    const draft = readDraft(plan.planId);
    setConflictPlan(draft && draft.baseRevision === undefined ? plan : null);
    draftBaseRevision.current = draft?.baseRevision ?? plan.revision;
    setRecoveredLocalDraft(Boolean(draft));
    hydratedDraftScope.current = planDraftKey(scopedDraftUserId(), plan.planId);
    setEditing(Boolean(draft));
    setSelectedSpotId(draft ? draft.selectedSpotId : plan.spotId);
    setLocalDate(draft?.localDate ?? plan.localDate);
    setLocalTime(draft?.localTime ?? plan.localTime);
    setNotes(draft?.notes ?? plan.notes);
    initialDraft.current = {
      selectedSpotId: plan.spotId,
      localDate: plan.localDate,
      localTime: plan.localTime,
      notes: plan.notes,
    };
  };
  const startNewPlan = () => {
    if (mutationBusy.current || !scopedDraftUserId()) return;
    setConflictPlan(null);
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
    const draft = readDraft(null);
    draftBaseRevision.current = null;
    setRecoveredLocalDraft(Boolean(draft));
    if (draft) {
      appliedContextDefaults.current = true;
      setSelectedSpotId(draft.selectedSpotId);
      setLocalDate(draft.localDate);
      setLocalTime(draft.localTime);
      setNotes(draft.notes);
    }
  };
  useEffect(() => {
    if (!planQuery.data || !planOwner || scopedDraftUserId() !== planOwner) return;
    replacePlans(planQuery.data.data.plans);
  }, [planQuery.data, replacePlans, planOwner]);
  useEffect(() => {
    // Authentication can complete after the initial storage read. Restore a new
    // draft before choosing the first server plan, but never overwrite typing.
    if (planQuery.data && !requestedPlanId && !activePlanId &&
        !newPlanRequested.current && !editing && readDraft(null)) {
      startNewPlan();
      return;
    }
    const nextPlans = planQuery.data?.data.plans ?? [];
    if (
      !requestedPlanId &&
      !newPlanRequested.current &&
      !activePlanId &&
      nextPlans[0]
    ) {
      applyPlan(nextPlans[0]);
    }
  }, [activePlanId, planQuery.data, requestedPlanId]);
  useEffect(() => {
    if (!activePlan || newPlanRequested.current) return;
    const scope = planDraftKey(scopedDraftUserId(), activePlan.planId);
    if (hydratedPlanId.current === activePlan.planId &&
        (hydratedDraftScope.current === scope || editing)) return;
    applyPlan(activePlan);
  }, [activePlan, planQuery.data]);
  useEffect(() => {
    const owner = scopedDraftUserId();
    if (!activePlanId || !owner) {
      setChecklist(emptyPlanChecklist());
      return;
    }
    try {
      setChecklist(
        readOwnedPlanChecklist(Taro, activePlanId, owner, Boolean(activePlan && planOwner === owner)),
      );
    } catch {
      setChecklist(emptyPlanChecklist());
    }
  }, [activePlanId, activePlan, planOwner]);
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
    : recoveredLocalDraft || selectedSpotId !== initialDraft.current.selectedSpotId ||
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
  const primaryWindow = observingWindowLabel(
    sky?.decision.skyOpportunity.primaryWindow,
    timezone,
  );
  const backupWindow = observingWindowLabel(
    sky?.decision.skyOpportunity.backupWindow,
    timezone,
  );
  const estimatedDeparture =
    route?.driveMinutes != null && activePlan
      ? departureTimeLabel(activePlan.contextSnapshot.selectedAtUtc, route.driveMinutes, activePlan.contextSnapshot.timezone)
      : null;
  const checklistSummary = planChecklistProgress(checklist);
  const announce = (
    tone: "error" | "warning" | "info" | "success",
    title: string,
    body: string,
  ) => {
    notify({
      owner: "plan",
      placement: tone === "info" ? "inline" : "floating",
      tone,
      title,
      body,
      dismissible: true,
      dedupeKey: `plan-${tone}-${title}-${body.slice(0, 48)}`,
    });
  };
  const retainDraft = (patch: Partial<PlanDraft>) => {
    appliedContextDefaults.current = true;
    const key = planDraftKey(scopedDraftUserId(), activePlanId);
    if (!key) {
      announce("warning", "草稿尚未保存在本机", "账户尚未恢复或已切换，请返回对应账户后重新打开计划。");
      return;
    }
    try { Taro.setStorageSync(key, { selectedSpotId, localDate, localTime, notes, ...patch, baseRevision: draftBaseRevision.current }); }
    catch { announce("warning", "草稿暂未保存在本机", "当前输入仍在页面中，请保存成功后再离开。"); }
  };
  const save = async () => {
    if (mutationBusy.current) return;
    if (conflictPlan) {
      announce("warning", "请先核对当前计划", "本页草稿已保留，请核对下方最新计划后再保存。");
      return;
    }
    if (activePlanId && !activePlan) {
      announce("warning", "计划未保存", "原计划尚未恢复或已删除；不会用本地草稿重新创建同一计划。");
      return;
    }
    const savingOwner = scopedDraftUserId();
    if (!savingOwner) {
      announce("warning", "计划未保存", "账户尚未恢复或已切换，请返回对应账户后重新打开计划。");
      return;
    }
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
    mutationBusy.current = true;
    setSaving(true);
    const savedDraftKey = planDraftKey(scopedDraftUserId(), activePlanId);
    try {
      const response = await saveObservationPlan(
        plan,
        activeContext.contextId,
        draftBaseRevision.current,
        savingOwner,
        planContextIdentity(activeContext),
      );
      if (scopedDraftUserId() !== savingOwner) {
        announce("warning", "账户已变化", "保存请求已返回，请回到原账户核对计划；本页不会更新当前账户的数据。");
        return;
      }
      savePlan(response.data);
      draftBaseRevision.current = response.data.revision;
      const draftCleared = clearPlanDraft(Taro, savedDraftKey);
      setRecoveredLocalDraft(false);
      hydratedPlanId.current = response.data.planId;
      newPlanRequested.current = false;
      setActivePlanId(response.data.planId);
      setEditing(false);
      try {
        Taro.setStorageSync(
          planChecklistStorageKey(response.data.planId, savingOwner),
          checklist,
        );
      } catch {
        // Checklist progress is a local recovery aid; the plan itself is already server-owned.
      }
      announce(
        draftCleared ? "success" : "warning",
        "计划已保存",
        draftCleared
          ? "计划已安全保存；天气与夜空条件仍以打开页面时的最新数据为准。"
          : "计划已安全保存，但本机旧草稿清理失败；重新打开时请核对已保存内容，避免重复建立计划。",
      );
    } catch (error) {
      if (scopedDraftUserId() !== savingOwner) return;
      if (error instanceof PlanSaveRecoveryError) { setSaveRecoveryError(true); setSaveRecoveryReviewed(false); }
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const current = await planQuery.refetch().catch(() => undefined);
        if (scopedDraftUserId() !== savingOwner) return;
        if (current) replacePlans(current.data.plans);
        const latestPlan = current?.data.plans.find((item) => item.planId === activePlanId);
        if (latestPlan) setConflictPlan(latestPlan);
        announce(
          "warning",
          "计划已在其他位置更新",
          "本页输入已完整保留；请核对最新计划后再次保存。",
        );
      } else {
        announce(
          "error",
          "暂未确认计划保存结果",
          `${errorMessage(error)}；当前输入保留，请核对已保存计划后重试。`,
        );
      }
    } finally {
      mutationBusy.current = false;
      setSaving(false);
    }
  };
  const clearSaveRecovery = async () => {
    const owner = scopedDraftUserId();
    if (!owner || mutationBusy.current) return;
    mutationBusy.current = true; setSaving(true);
    try {
      await planQuery.refetch();
      if (scopedDraftUserId() !== owner) return;
      if (!saveRecoveryReviewed) {
        setSaveRecoveryReviewed(true);
        announce("warning", "请核对已保存计划", "列表已刷新。清理后不能沿用旧请求身份，重复保存可能新增计划；核对后可确认清理本机恢复信息。");
        return;
      }
      clearObservationPlanSaveRecovery(owner);
      setSaveRecoveryError(false); setSaveRecoveryReviewed(false);
      announce("success", "恢复信息已清理", "当前输入与服务器计划保留；不会自动重发保存请求。");
    } catch (error) {
      if (scopedDraftUserId() === owner) {
        setSaveRecoveryReviewed(false);
        announce("warning", "恢复信息未清理", errorMessage(error));
      }
    } finally { mutationBusy.current = false; setSaving(false); }
  };
  const remove = async () => {
    if (!activePlan || mutationBusy.current) return;
    const deletionOwner = scopedDraftUserId();
    if (!deletionOwner) return;
    mutationBusy.current = true;
    setDeleting(true);
    try {
      const confirmation = await Taro.showModal({
      title: "删除观测计划？",
      content: `删除后本计划将从服务端移除${isDirty ? "，本页未保存修改也会丢弃" : ""}；取消或失败时本页内容保持不变。`,
      confirmText: "删除",
      confirmColor: "#B53A3A",
    });
    if (!confirmation.confirm) return;
      if (scopedDraftUserId() !== deletionOwner) {
        announce("warning", "计划未删除", "账户已变化，请重新打开对应计划。");
        return;
      }
      const response = await deleteObservationPlan(activePlan.planId, deletionOwner);
      if (scopedDraftUserId() !== deletionOwner) {
        announce("warning", "账户已变化", "删除请求已返回，请回到原账户核对计划；本页不会更新当前账户的数据。");
        return;
      }
      replacePlans(response.data.plans);
      const draftKey = planDraftKey(deletionOwner, activePlan.planId);
      clearPlanDraft(Taro, draftKey);
      try {
        Taro.removeStorageSync(planChecklistStorageKey(activePlan.planId, deletionOwner));
      } catch {
        // A failed local cleanup cannot resurrect a deleted server plan.
      }
      announce(
        "success",
        "计划已删除",
        "计划已删除，即将返回我的。",
      );
      await Taro.navigateBack().catch(() =>
        Taro.switchTab({ url: "/pages/my/index" }),
      ).catch(() => {
        announce("warning", "计划已删除", "自动返回暂不可用，可通过顶部返回或“我的”继续浏览。");
      });
    } catch (error) {
      if (scopedDraftUserId() !== deletionOwner) return;
      announce(
        "error",
        "计划删除失败",
        `${errorMessage(error)}；计划与本页草稿保持不变，可重试。`,
      );
    } finally {
      mutationBusy.current = false;
      setDeleting(false);
    }
  };
  const toggleChecklistItem = (id: keyof PlanChecklistState) => {
    const owner = scopedDraftUserId();
    if (!owner || mutationBusy.current) return;
    setChecklist((current) => {
      if (scopedDraftUserId() !== owner) return current;
      const next = { ...current, [id]: !current[id] };
      if (activePlanId) {
        try {
          Taro.setStorageSync(planChecklistStorageKey(activePlanId, owner), next);
        } catch {
          // Keep the interaction usable even when local storage is unavailable.
        }
      }
      return next;
    });
  };
  const showMissingRequestedPlan = Boolean(
    requestedPlanId &&
      !newPlanRequested.current &&
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
  if (formOwner.current && planOwner !== formOwner.current) return (
    <View className={`${themeClass} plan-page`}>
      <FloatingNotificationHost />
      <CustomNav title="今晚计划" back backFallbackTab="/pages/my/index" />
      <StatusPanel state="PERMISSION_DENIED" detail="当前账号已变化，请返回后重新打开计划。原账号的编辑内容不会转存到其他账号。" />
    </View>
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
      <ScrollView className="plan-editor__scroll hide-scrollbar" scrollY enhanced showScrollbar={false}>
      <View className="plan-content safe-bottom">
        {contextQuery.refreshError || contextQuery.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE"
          detail="以下仍使用上次的地点与时间资料，尚未确认最新状态。"
          recoveryLabel="重新获取观测条件"
          onRecover={() => void contextQuery.refetch()} /> : null}
        {activePlan && (skyQuery.refreshError || skyQuery.data?.dataState === "STALE_USABLE") ? <StatusPanel state="STALE"
          detail="天气与夜空数据尚未确认最新状态，当前时窗参考上次结果，出发前请重新核实。"
          recoveryLabel="重新获取天气与夜空"
          onRecover={() => void skyQuery.refetch()} /> : null}
        {selectedSpotId && (routeQuery.refreshError || routeQuery.data?.dataState === "STALE_USABLE") ? <StatusPanel state="STALE"
          detail="路线尚未确认最新状态，当前距离和预计时间沿用上次结果。"
          recoveryLabel="重新获取路线"
          onRecover={() => void routeQuery.refetch()} /> : null}
        {editing && (spotsQuery.refreshError || spotsQuery.data?.dataState === "STALE_USABLE") ? <StatusPanel state="STALE"
          detail="地点列表尚未确认最新状态，暂时显示上次列表，当前选择和输入已保留。"
          recoveryLabel="重新获取地点"
          onRecover={() => void spotsQuery.refetch()} /> : null}
        {saveRecoveryError ? <StatusPanel state="ERROR"
          detail="本机计划重试信息暂不可用。清理前请核对已保存计划，避免重复建立；当前输入和服务器计划保留。"
          recoveryLabel={saveRecoveryReviewed ? "已核对，确认清理恢复信息" : "刷新计划列表并核对"}
          onRecover={saving || deleting ? undefined : () => void clearSaveRecovery()} /> : null}
        <View
          className="plan-notification-state"
          data-od-id="my-plan-notification-state"
        >
          <NotificationRegion owner="plan" placement="inline" />
        </View>
        {planQuery.isError && !activePlan ? (
          <StatusPanel
            state="ERROR"
            detail={`计划暂时无法加载：${errorMessage(planQuery.error)}`}
            recoveryLabel="重试"
            onRecover={() => void planQuery.refetch().catch(() => {})}
          />
        ) : null}
        {!activePlan && planQuery.isPending && !editing ? (
          <StatusPanel state="LOADING" detail="正在加载你的计划。" />
        ) : null}
        {showMissingRequestedPlan ? (
          <StatusPanel
            state="ERROR"
            detail="当前账户下找不到这条计划，可能已被删除。"
            recoveryLabel="重试"
            onRecover={() => void planQuery.refetch().catch(() => {})}
          />
        ) : null}
        {showCreateEmpty ? (
          <View className="plan-empty card">
            <Text className="type-section">还没有已保存计划</Text>
            <Text className="type-caption">
              选择观星点、日期和当地时间，安排一次观测。
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
            {planQuery.isError || planQuery.refreshError || planQuery.data?.dataState === "STALE_USABLE" ? (
              <StatusPanel
                state="STALE"
                detail="当前计划尚未确认最新状态，正在显示上次获取的记录；本页修改已保留。"
                recoveryLabel="重试"
                onRecover={() => void planQuery.refetch().catch(() => {})}
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
                    </View>
                  </View>
                  <Text className="plan-route__source-note">
                    {route.kind === "UNAVAILABLE"
                      ? "暂无可用路线；出发前请核实到达方式。"
                      : route.kind === "STRAIGHT_LINE_ONLY"
                        ? "当前仅有直线距离，不代表实际道路里程或用时。"
                        : route.state === "FRESH"
                          ? "路线结果来自当前上下文。"
                          : "路线结果尚未确认最新状态；出发前请重新复核。"}
                  </Text>
                </View>
              ) : (
                <StatusPanel
                  state="PARTIAL"
                  detail="暂无可用路线，请在出发前核实到达方式。"
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
              <SoftButton variant="ghost" label="新建观测计划" onClick={startNewPlan}>
                新建观测计划
              </SoftButton>
            </View>
            {plans.length > 1 ? (
              <View className="plan-list plan-list--secondary card" data-od-id="plan-list">
                <View className="plan-list__heading">
                  <Text className="type-section">其他已保存计划</Text>
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
                保存后仍需在出发前复核天气与到达条件。
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
                  detail="观测条件暂时无法加载，计划草稿已保留。"
                  recoveryLabel="重试"
                  onRecover={() => void contextQuery.refetch()}
                />
              ) : spotsQuery.isPending ? (
                <StatusPanel state="LOADING" detail="正在加载正式观星点。" />
              ) : spotsQuery.isError ? (
                <StatusPanel
                  state="ERROR"
                  detail="观星点列表暂时无法加载，请重试。"
                  recoveryLabel="重试"
                  onRecover={() => void spotsQuery.refetch()}
                />
              ) : formalSpots.length === 0 ? (
                <StatusPanel
                  state="EMPTY"
                  detail="暂无可选正式观星点，暂不能新建计划。"
                />
              ) : null}
              {formalSpots.length ? (
                <Picker
                  mode="selector"
                  disabled={saving || deleting}
                  range={formalSpots.map(
                    (spot) => `${spot.name} · ${spot.region}`,
                  )}
                  value={selectedSpotIndex}
                  onChange={(event) => {
                    const spot = formalSpots[Number(event.detail.value)];
                    if (spot) { retainDraft({ selectedSpotId: spot.spotId }); setSelectedSpotId(spot.spotId); }
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
                  aria-label={`观测地点当地日期：${localDate}`}
                  disabled={saving || deleting}
                  value={localDate}
                  onChange={(event) => { retainDraft({ localDate: event.detail.value }); setLocalDate(event.detail.value); }}
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
                  aria-label={`观测地点当地时间：${localTime}`}
                  disabled={saving || deleting}
                  value={localTime}
                  onChange={(event) => { retainDraft({ localTime: event.detail.value }); setLocalTime(event.detail.value); }}
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
                disabled={saving || deleting}
                maxlength={800}
                autoHeight={false}
                placeholder="器材、同伴、撤离和准备事项"
                aria-label="观测计划备注"
                onInput={(event) => { retainDraft({ notes: event.detail.value }); setNotes(event.detail.value); }}
              />
            </View>
            {conflictPlan ? (
              <View className="form-group">
                <Text className="type-section">核对最新计划</Text>
                <Text className="type-body">地点：{formalSpots.find((spot) => spot.spotId === conflictPlan.spotId)?.name ?? "原正式观星点（名称暂不可用）"}</Text>
                <Text className="type-body">时间：{conflictPlan.localDate} {conflictPlan.localTime}</Text>
                <Text className="type-body">备注：{conflictPlan.notes || "无"}</Text>
                <Text className="type-caption">本页输入保持不变。确认后，下次保存会以本页内容更新这份计划。</Text>
                <SoftButton
                  disabled={saving || deleting}
                  label="已核对，保留本页修改"
                  onClick={() => {
                    draftBaseRevision.current = conflictPlan.revision;
                    setConflictPlan(null);
                    retainDraft({});
                  }}
                >已核对，保留本页修改</SoftButton>
              </View>
            ) : null}
            {isDirty ? (
              <StatusPanel
                state="PARTIAL"
                detail={recoveredLocalDraft
                  ? "已恢复未保存的草稿，请核对后保存。"
                  : "修改已暂存本机，尚未保存到计划。"}
              />
            ) : null}
            {planQuery.isError || planQuery.refreshError || planQuery.data?.dataState === "STALE_USABLE" ? (
              <StatusPanel
                state="STALE"
                detail="当前计划尚未确认最新状态，正在显示上次获取的记录；本页修改已保留。"
                recoveryLabel="重试"
                onRecover={() => void planQuery.refetch().catch(() => {})}
              />
            ) : null}
            <View className="plan-editor-form__actions">
              <SoftButton
                variant="primary"
                disabled={saving || deleting}
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
                label={activePlan ? "返回计划详情" : "返回计划列表"}
                disabled={saving || deleting}
                onClick={() => {
                  if (mutationBusy.current || !scopedDraftUserId()) return;
                  if (!activePlan) {
                    const previous = plans.find((plan) => plan.planId === requestedPlanId) ?? plans[0];
                    if (previous) applyPlan(previous);
                    else newPlanRequested.current = false;
                  }
                  setEditing(false);
                }}
              >
                {activePlan ? "返回计划详情" : "返回计划列表"}
              </SoftButton>
            </View>
          </View>
        ) : null}
      </View>
      </ScrollView>
    </View>
  );
}
