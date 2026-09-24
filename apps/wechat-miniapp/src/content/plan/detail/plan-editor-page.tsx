import { useSkyForecastQuery } from "@/hooks/use-forecast-query";
import { SemanticIcon } from "@/components/semantic-asset";
import { PLAN_NOTES_MAX_LENGTH, parsePlanReminders, resolvePlanTiming, type PlanReminder } from "@starward/miniapp-contracts";
import { distanceMeters } from "@starward/coordinate-system";
import { PlanReminderEditor } from "./plan-reminder-editor";
import { confirmPlanEditorLeave } from "./leave-editor";
import { planChecklistStorageKey } from "./plan-checklist";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
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
import { EMPTY_FIELD_VALUE, StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  currentDraftUserId,
  clearObservationPlanSaveRecovery,
  deleteObservationPlan,
  getSpotSite,
  getAstronomicalEvents,
  getMapScene,
  getPlans,
  getSkyReport,
  MiniappApiError,
  resolveObservationContext,
  restoreObservationContext,
  saveObservationPlan,
  setPlanChecklistCompletion,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { resolvePlanSaveSpotId } from "./plan-save-spot";
import { PlanReference } from "./plan-reference";
import { initialPlanSelection, planIdFromRoute } from "./plan-selection";
import { clearPlanDraft, createDraftOwner, parsePlanDraft, planDraftKey as scopedPlanDraftKey, type PlanDraft } from "./plan-draft";
import { spotIdFromPlanRoute } from "@/features/spot/spot-plan-route";
import { PlanTimingFields, emptyPlanTiming } from "./plan-timing-fields";
import { PlanTravelFields, emptyPlanTravel, planTravelMatchesRouteOrigin, planTravelModeLabel } from "./plan-travel-fields";
import { planReminderStatusDetail, planReminderStatusLabel } from "./plan-reminder-status";
import { calendarDateInTimezone } from "@/utils/zoned-date";
import { planContextIdentity, PlanSaveRecoveryError } from "@/services/plan-save-retry";
import { useNativeEditorLeaveGuard } from "@/hooks/use-editor-leave-guard";
import { AstronomicalEventModal } from "@/components/astronomical-event-modal";
import { eventDatePresentation } from "@/content/event/event-model";
import "./index.scss";

function today(timezone = "Asia/Shanghai") {
  return calendarDateInTimezone(new Date(), timezone);
}

export default function PlanEditorPage({ dedicatedEditor = false }: { dedicatedEditor?: boolean } = {}) {
  const router = useRouter();
  const requestedSpotId = spotIdFromPlanRoute(router.params.spotId);
  const planDraftKey = (owner: string | null, planId: string | null) => scopedPlanDraftKey(owner, planId, requestedSpotId);
  const requestedPlanId = planIdFromRoute(router.params.planId);
  let decodedEventOccurrenceId = "", decodedEventDate = "";
  try { decodedEventOccurrenceId = decodeURIComponent(router.params.eventOccurrenceId ?? ""); } catch { decodedEventOccurrenceId = ""; }
  try { decodedEventDate = decodeURIComponent(router.params.eventDate ?? ""); } catch { decodedEventDate = ""; }
  const requestedEventOccurrenceId = /^event-occurrence:[a-z0-9-]+:\d{4}$/u.test(decodedEventOccurrenceId) ? decodedEventOccurrenceId : null;
  const requestedEventDate = /^\d{4}-\d{2}-\d{2}$/u.test(decodedEventDate) ? decodedEventDate : null;
  const withRequestedEvent = (ids: readonly string[]) => requestedEventOccurrenceId
    ? [requestedEventOccurrenceId] : ids;
  const mountId = useId();
  const [, refreshIdentity] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  useDidShow(() => { setPageVisible(true); refreshIdentity((value) => value + 1); });
  useDidHide(() => { setPageVisible(false); useAppStore.getState().clearNotifications("plan"); });
  const planOwner = currentDraftUserId();
  const formOwner = useRef(planOwner);
  formOwner.current ??= planOwner;
  const planQuery = useResourceQuery({
    queryKey: ["plans", planOwner ?? `unresolved:${mountId}`],
    queryFn: (signal) => getPlans(signal, planOwner ?? undefined),
    staleTime: 15_000,
    throwOnRefetchError: true,
    enabled: pageVisible,
  });
  const plans = planQuery.data?.data.plans ?? [];
  const reminderNotifications = planQuery.data?.data.reminderNotifications ?? [];
  const savePlan = useAppStore((state) => state.savePlan);
  const replacePlans = useAppStore((state) => state.replacePlans);
  const notify = useAppStore((state) => state.notify);
  const observationContext = useAppStore(
    (state) => state.observationContext,
  );
  const explicitNew = router.params.new === "1";
  const initialSelection = initialPlanSelection(requestedPlanId, plans, explicitNew);
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
  const [editing, setEditing] = useState(dedicatedEditor || explicitNew || (!requestedPlanId && Boolean(restoredDraft)));
  const [recoveredLocalDraft, setRecoveredLocalDraft] = useState(Boolean(restoredDraft));
  const [draftStorageFailed, setDraftStorageFailed] = useState(false);
  const newPlanRequested = useRef(explicitNew || Boolean(restoredDraft && !initialSelection.planId));
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
          requestedSpotId,
          observationContext?.contextId,
          observationContext?.contextFingerprint,
          observationContext?.revision,
        ],
    queryFn: async (signal) => {
      const requestingOwner = scopedDraftUserId();
      if (!requestingOwner || requestingOwner !== planOwner) throw new Error("账号已变化，请重新打开计划。");
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
      if (requestedSpotId) return resolveObservationContext({
        location: { kind: "FORMAL_SPOT", spotId: requestedSpotId },
        localDate: observationContext?.localDate ?? today(),
        ...(observationContext?.location.kind === "MAP_POINT" ? { routeOriginContextId: observationContext.contextId }
          : observationContext?.routeOrigin ? { routeOriginContextId: observationContext.routeOrigin.contextId } : {}),
        targetProfile: "DAILY",
      }, signal);
      if (observationContext)
        return restoreObservationContext(observationContext, signal);
      throw new Error("plan_observation_context_missing");
      };
      const response = await loadContext();
      if (scopedDraftUserId() !== requestingOwner) throw new Error("账号已变化，请重新打开计划。");
      return { ...response, owner: requestingOwner };
    },
    enabled: pageVisible && Boolean(scopedDraftUserId() && (observationContext || planSnapshot || requestedSpotId)),
    staleTime: 60_000,
  });
  const activeContext = contextQuery.data?.data ?? null;
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
    enabled: pageVisible && Boolean(activeContext),
    staleTime: 60_000,
  });
  const formalSpots = spotsQuery.data?.data.spots ?? [];
  const [selectedSpotId, setSelectedSpotId] = useState<SpotId | null>(
    restoredDraft ? restoredDraft.selectedSpotId : existing?.spotId ?? requestedSpotId ??
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
  const [reminders, setReminders] = useState<readonly PlanReminder[]>(restoredDraft?.reminders ?? existing?.reminders ?? []);
  const [timing, setTiming] = useState(restoredDraft?.timing ?? existing?.timing ?? emptyPlanTiming());
  const [travel, setTravel] = useState(restoredDraft?.travel ?? existing?.travel ?? emptyPlanTravel(
    existing?.contextSnapshot.schemaVersion === "observation-context-snapshot-v2"
      ? existing.contextSnapshot.routeOrigin?.displayName ?? ""
      : observationContext?.routeOrigin?.displayName ?? "",
  ));
  const [eventOccurrenceIds, setEventOccurrenceIds] = useState<readonly string[]>(
    withRequestedEvent(restoredDraft?.eventOccurrenceIds ?? existing?.eventOccurrenceIds ?? []),
  );
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventModalPresent, setEventModalPresent] = useState(false);
  const [eventDetailId, setEventDetailId] = useState<string | null>(null);
  const eventsQuery = useResourceQuery({
    queryKey: ["astronomical-events"],
    queryFn: getAstronomicalEvents,
    staleTime: 6 * 60 * 60 * 1000,
    enabled: pageVisible,
  });
  const [saving, setSaving] = useState(false);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveRecoveryError, setSaveRecoveryError] = useState(false);
  const [saveRecoveryReviewed, setSaveRecoveryReviewed] = useState(false);
  const mutationBusy = useRef(false);
  const planRouteOrigin = activePlan?.contextSnapshot.schemaVersion === "observation-context-snapshot-v2"
    ? activePlan.contextSnapshot.routeOrigin?.displayName ?? null : null;
  const distanceOriginMatches = planTravelMatchesRouteOrigin(activePlan?.travel, planRouteOrigin);
  const siteOverviewQuery = useResourceQuery({
    queryKey: [
      "plan-site-facts",
      selectedSpotId,
    ],
    queryFn: (signal) =>
      getSpotSite(
        selectedSpotId!,
        signal,
      ),
    enabled: pageVisible && Boolean(activePlan && selectedSpotId && activePlan.spotId === selectedSpotId),
    staleTime: 60_000,
  });
  const skyQuery = useSkyForecastQuery({
    queryKey: [
      "plan-sky-summary",
      activePlan?.spotId,
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
    ],
    queryFn: (signal) =>
      getSkyReport(activePlan!.spotId, activeContext!.contextId, signal),
    enabled: pageVisible && Boolean(activePlan && activeContext),
    staleTime: 60_000,
  });
  const planEventNoticeKey = `plan-editor-resource-failed:${activePlanId ?? requestedPlanId ?? "new"}:events`;
  useEffect(() => {
    if (!eventModalOpen) return;
    const state = useAppStore.getState();
    const prior = state.notifications.find(item => item.owner === "plan" && item.placement === "floating" && item.dedupeKey === planEventNoticeKey);
    if (prior) state.dismissNotification(prior.id);
  }, [eventModalOpen, planEventNoticeKey]);
  useEffect(() => {
    if (!pageVisible) return;
    const failed = planQuery.isError || planQuery.refreshError || planQuery.data?.dataState === "STALE_USABLE"
      ? ["计划数据异常", "观星计划暂时无法同步，可在页面中重试。", "plans"]
      : contextQuery.isError || contextQuery.refreshError || contextQuery.data?.dataState === "STALE_USABLE"
        ? ["观测条件数据异常", "计划使用的地点与时间资料暂时无法更新，草稿仍会保留。", "context"]
        : spotsQuery.isError || spotsQuery.refreshError || spotsQuery.data?.dataState === "STALE_USABLE"
          ? ["地点数据异常", "正式观星点列表暂时无法更新，可在页面中重试。", "spots"]
          : !eventModalOpen && !eventModalPresent && (eventsQuery.isError || eventsQuery.refreshError || eventsQuery.data?.dataState === "STALE_USABLE")
            ? ["事件数据异常", "天文事件目录暂时无法更新，已选事件仍会保留。", "events"]
            : siteOverviewQuery.isError || siteOverviewQuery.refreshError || siteOverviewQuery.data?.dataState === "STALE_USABLE"
              ? ["场地数据异常", "计划地点的场地资料暂时无法更新，可稍后重试。", "site"]
              : skyQuery.isError || skyQuery.refreshError || skyQuery.data?.dataState === "STALE_USABLE"
                ? ["天气与夜空数据异常", "计划的天气与夜空资料暂时无法更新，出发前请重新核实。", "sky"]
                : null;
    if (!failed) return;
    notify({ owner: "plan", placement: "floating", tone: "info",
      title: failed[0]!, body: failed[1]!, dedupeKey: `plan-editor-resource-failed:${activePlanId ?? requestedPlanId ?? "new"}:${failed[2]}` });
  }, [activePlanId, contextQuery.data?.dataState, contextQuery.isError, contextQuery.refreshError,
    eventModalOpen, eventModalPresent, eventsQuery.data?.dataState, eventsQuery.isError, eventsQuery.refreshError, notify, pageVisible,
    planQuery.data?.dataState, planQuery.isError, planQuery.refreshError, requestedPlanId,
    siteOverviewQuery.data?.dataState, siteOverviewQuery.isError, siteOverviewQuery.refreshError,
    skyQuery.data?.dataState, skyQuery.isError, skyQuery.refreshError,
    spotsQuery.data?.dataState, spotsQuery.isError, spotsQuery.refreshError]);
  const hydratedPlanId = useRef<PlanId | null>(existing?.planId ?? null);
  const hydratedDraftScope = useRef(planDraftKey(scopedDraftUserId(), initialSelection.planId));
  const appliedContextDefaults = useRef(Boolean(restoredDraft));
  const initialDraft = useRef({
    timing,
    travel,
    eventOccurrenceIds,
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
    setEditing(dedicatedEditor || (!requestedPlanId && Boolean(draft)));
    setSelectedSpotId(draft ? draft.selectedSpotId : plan.spotId);
    setLocalDate(draft?.localDate ?? plan.localDate);
    setLocalTime(draft?.localTime ?? plan.localTime);
    setNotes(draft?.notes ?? plan.notes);
    setTiming(draft?.timing ?? plan.timing ?? emptyPlanTiming());
    setTravel(draft?.travel ?? plan.travel ?? emptyPlanTravel(
      plan.contextSnapshot.schemaVersion === "observation-context-snapshot-v2"
        ? plan.contextSnapshot.routeOrigin?.displayName ?? ""
        : "",
    ));
    setEventOccurrenceIds(withRequestedEvent(draft?.eventOccurrenceIds ?? plan.eventOccurrenceIds ?? []));
    setReminders(draft?.reminders ?? plan.reminders ?? []);
    initialDraft.current = {
      timing: plan.timing ?? emptyPlanTiming(),
      travel: plan.travel ?? emptyPlanTravel(plan.contextSnapshot.schemaVersion === "observation-context-snapshot-v2"
        ? plan.contextSnapshot.routeOrigin?.displayName ?? "" : ""),
      eventOccurrenceIds: withRequestedEvent(plan.eventOccurrenceIds ?? []),
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
    const nextDate = requestedEventDate ?? observationContext?.localDate ?? today(observationContext?.timezone);
    setActivePlanId(null);
    setSelectedSpotId(
      requestedSpotId ?? (observationContext?.location?.kind === "FORMAL_SPOT"
        ? observationContext.location.spotId
        : null),
    );
    setLocalDate(nextDate);
    setLocalTime("22:00");
    setTiming(emptyPlanTiming());
    setTravel(emptyPlanTravel(observationContext?.routeOrigin?.displayName ?? ""));
    setReminders([]);
    setEventOccurrenceIds(requestedEventOccurrenceId ? [requestedEventOccurrenceId] : []);
    setNotes("");
    initialDraft.current = {
      timing: emptyPlanTiming(),
      travel: emptyPlanTravel(observationContext?.routeOrigin?.displayName ?? ""),
      eventOccurrenceIds: requestedEventOccurrenceId ? [requestedEventOccurrenceId] : [],
      selectedSpotId:
        requestedSpotId ?? (observationContext?.location?.kind === "FORMAL_SPOT"
          ? observationContext.location.spotId
          : null),
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
      setTiming(draft.timing ?? emptyPlanTiming());
      setTravel(draft.travel ?? emptyPlanTravel());
      setReminders(draft.reminders ?? []);
      setEventOccurrenceIds(withRequestedEvent(draft.eventOccurrenceIds ?? []));
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
    if (
      appliedContextDefaults.current ||
      activePlan ||
      requestedPlanId ||
      !activeContext
    )
      return;
    appliedContextDefaults.current = true;
    setSelectedSpotId(
      requestedSpotId ?? (activeContext.location.kind === "FORMAL_SPOT"
        ? activeContext.location.spotId
        : null),
    );
    setLocalDate(activeContext.localDate);
  }, [activeContext, activePlan, requestedPlanId, requestedSpotId]);
  const remindersDirty = JSON.stringify(reminders) !== JSON.stringify(activePlan?.reminders ?? []);
  const eventsDirty = JSON.stringify(eventOccurrenceIds) !== JSON.stringify(activePlan?.eventOccurrenceIds ?? []);
  const isDirty = remindersDirty || eventsDirty || (activePlan
    ? activePlan.spotId !== selectedSpotId ||
      activePlan.localDate !== localDate ||
      activePlan.localTime !== localTime ||
      activePlan.notes !== notes || JSON.stringify(activePlan.timing ?? emptyPlanTiming()) !== JSON.stringify(timing) ||
      JSON.stringify(activePlan.travel ?? initialDraft.current.travel) !== JSON.stringify(travel)
    : recoveredLocalDraft || selectedSpotId !== initialDraft.current.selectedSpotId ||
      localDate !== initialDraft.current.localDate ||
      localTime !== initialDraft.current.localTime ||
      notes !== initialDraft.current.notes || JSON.stringify(timing) !== JSON.stringify(initialDraft.current.timing) ||
      JSON.stringify(travel) !== JSON.stringify(initialDraft.current.travel) ||
      JSON.stringify(eventOccurrenceIds) !== JSON.stringify(initialDraft.current.eventOccurrenceIds));
  const nativeLeaveGuard = useNativeEditorLeaveGuard(editing && isDirty, "当前计划尚未保存，确定离开吗？");
  const toggleReminderItem = async (reminderId: string, itemId: string, completed: boolean) => {
    const owner = scopedDraftUserId();
    if (!owner || !activePlan || mutationBusy.current) return;
    mutationBusy.current = true;
    setChecklistSaving(true);
    try {
      await setPlanChecklistCompletion(owner, activePlan.planId, { reminderId, itemId, completed, expectedRevision: activePlan.revision });
      if (scopedDraftUserId() !== owner) return;
      await planQuery.refetch();
    } catch (error) {
      if (scopedDraftUserId() !== owner) return;
      announce("error", "清单状态未确认", `${errorMessage(error)}；当前勾选保持已确认状态，可重试。`);
      if (error instanceof MiniappApiError && error.statusCode === 409) await planQuery.refetch().catch(() => undefined);
    } finally {
      mutationBusy.current = false;
      setChecklistSaving(false);
    }
  };
  const beforeLeavingEditor = () => confirmPlanEditorLeave({
    busy: mutationBusy.current,
    dirty: editing && isDirty,
    confirm: async () => (await Taro.showModal({ title: "离开编辑？", content: draftStorageFailed
      ? "最新修改未能存入本机草稿，离开会丢失这些修改。要继续离开吗？"
      : "修改尚未保存。已存入本机草稿的内容可在下次打开时继续编辑。", confirmText: "离开", cancelText: "继续编辑" })).confirm,
  });
  const siteRoute = siteOverviewQuery.data?.data.arrival ?? null;
  const sky = skyQuery.data?.data ?? null;
  const eventCatalog = eventsQuery.data?.data.events ?? [];
  const selectedSpot = formalSpots.find(
    (spot) => spot.spotId === activePlan?.spotId,
  );
  const distanceOrigin = activePlan?.travel?.originLocation?.wgs84 ??
    (activePlan?.travel?.originLocation !== null && distanceOriginMatches ? activeContext?.routeOrigin?.wgs84 : null);
  const straightDistanceKm = selectedSpot && distanceOrigin
    ? distanceMeters({ lat: distanceOrigin.latitude, lon: distanceOrigin.longitude },
      { lat: selectedSpot.wgs84.latitude, lon: selectedSpot.wgs84.longitude }) / 1000 : null;
  const timezone =
    (!editing ? activePlan?.contextSnapshot.timezone : undefined) ??
    activeContext?.timezone ?? selectedSpot?.timezone ?? "Asia/Shanghai";
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
      setDraftStorageFailed(true);
      announce("warning", "草稿尚未保存在本机", "账户尚未恢复或已切换，请返回对应账户后重新打开计划。");
      return;
    }
    try {
      Taro.setStorageSync(key, { selectedSpotId, localDate, localTime, timing, travel, eventOccurrenceIds, reminders, notes, ...patch, baseRevision: draftBaseRevision.current });
      setDraftStorageFailed(false);
    }
    catch { setDraftStorageFailed(true); announce("warning", "草稿暂未保存在本机", "当前输入仍在页面中，请保存成功后再离开。"); }
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
    if (!timing.endLocalDate || !timing.endLocalTime || !timing.departureLocalDate || !timing.departureLocalTime) {
      announce("error", "计划未保存", "请选择观测结束日期、时间和计划出发日期、时间；输入仍保留。");
      return;
    }
    if (!travel.origin.trim()) {
      announce("error", "计划未保存", "请填写实际出发地；当前输入仍保留。");
      return;
    }
    try {
      resolvePlanTiming({ localDate, localTime, timezone, timing });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      announce("error", "计划未保存",
        reason === "plan_end_must_follow_start"
          ? "观测结束必须晚于开始；当前输入仍保留。"
          : reason === "plan_departure_must_precede_start"
            ? "计划出发必须早于开始观测；当前输入仍保留。"
            : "计划时间无效；当前输入仍保留，可修正后重试。");
      return;
    }
    let validatedReminders: PlanReminder[];
    try { validatedReminders = parsePlanReminders(reminders); } catch {
      announce("error", "提醒清单未保存", "请填写提醒名称、清单内容与有效提前小时；最多5组、每组20项。");
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
      timing,
      travel,
      eventOccurrenceIds,
      reminders: validatedReminders,
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
        planContextIdentity(activeContext, travel),
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
      announce(
        draftCleared ? "success" : "warning",
        "计划已保存",
        draftCleared
          ? "计划已安全保存；天气与夜空条件仍以打开页面时的最新数据为准。"
          : "计划已安全保存，但本机旧草稿清理失败；重新打开时请核对已保存内容，避免重复建立计划。",
      );
      if (dedicatedEditor) {
        nativeLeaveGuard.suspendForProgrammaticLeave();
        const openSavedPlan = () => Taro.redirectTo({ url: `/content/plan/detail/index?planId=${encodeURIComponent(response.data.planId)}` });
        let hasPriorPage = false;
        try { hasPriorPage = Taro.getCurrentPages().length > 1; } catch { /* No reliable back target. */ }
        try {
          if (hasPriorPage) await Taro.navigateBack().catch(openSavedPlan);
          else await openSavedPlan();
        } catch {
          nativeLeaveGuard.restoreAfterFailedProgrammaticLeave();
          announce("warning", "计划已保存，暂时无法打开详情", "无需重复保存，可从观星计划列表查看。");
        }
      }
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
  const showMissingRequestedPlan = Boolean(
    requestedPlanId && !newPlanRequested.current && !activePlan &&
    planQuery.data && !planQuery.isPending && !planQuery.isError && !planQuery.refreshError &&
    planQuery.data.dataState !== "STALE_USABLE",
  );
  const showCreateEmpty = Boolean(
    !requestedPlanId &&
      !activePlan &&
      !editing &&
      planQuery.data &&
      !planQuery.isPending &&
      !planQuery.isError &&
      !planQuery.refreshError &&
      planQuery.data.dataState !== "STALE_USABLE" &&
      plans.length === 0,
  );
  if (formOwner.current && planOwner !== formOwner.current) return (
    <View className={`${themeClass} plan-page`}>
      <FloatingNotificationHost />
      <CustomNav title="观星计划" back backFallbackTab="/pages/my/index" />
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
      {!eventModalPresent ? <FloatingNotificationHost /> : null}
      <AstronomicalEventModal open={eventModalOpen} onPresenceChange={setEventModalPresent} mode={editing ? "select-one" : "browse"}
        context={activeContext} initialOccurrenceIds={eventOccurrenceIds} initialDetailId={eventDetailId}
        onClose={() => { setEventModalOpen(false); setEventDetailId(null); }}
        {...(editing ? { onConfirm: (occurrenceId: string | null) => {
          const next = occurrenceId ? [occurrenceId] : [];
          retainDraft({ eventOccurrenceIds: next });
          setEventOccurrenceIds(next);
          setEventModalOpen(false);
        }} : {})} />
      <CustomNav
        title={dedicatedEditor ? (activePlanId && !newPlanRequested.current ? "编辑观星计划" : "新建观星计划") : "观星计划"}
        beforeBack={beforeLeavingEditor}
        onBackAuthorized={nativeLeaveGuard.suspendForProgrammaticLeave}
        onBackFailure={nativeLeaveGuard.restoreAfterFailedProgrammaticLeave}
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
          detail="天气与夜空数据尚未更新，暂时显示上次资料。"
          recoveryLabel="重新获取天气与夜空"
          onRecover={() => void skyQuery.refetch()} /> : null}
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
        {showCreateEmpty ? <StatusPanel state="EMPTY" emptyLevel="page" title="暂无观星计划"
          detail="选择观星点、日期和当地时间，安排一次观测。"
          recoveryLabel="新建观测计划" onRecover={startNewPlan} /> : null}
        {activePlan && !editing ? (
          <>
            <View className="plan-hero" data-od-id="plan-summary">
              <Button className="plan-hero__spot-row" disabled={!selectedSpot || !activeContext} aria-label={`查看${selectedSpot?.name ?? "观星点"}详情`} onClick={() => {
                if (!selectedSpot || !activeContext) return;
                void Taro.navigateTo({ url: `/spot/plan/index?spotId=${encodeURIComponent(selectedSpot.spotId)}&contextId=${encodeURIComponent(activeContext.contextId)}` })
                  .catch(() => announce("warning", "观星点详情暂未打开", "计划内容保持不变，请重试。"));
              }}>
                <Text className="plan-hero__title">{selectedSpot?.name ?? "点位资料暂不可用"}</Text>
                <Text className="plan-hero__chevron" aria-hidden="true">›</Text>
              </Button>
              <Text className="plan-hero__subtitle">{selectedSpot?.region ?? "正式点位资料暂不可用；计划内容仍保留。"}</Text>
              <View className="plan-period" aria-label="计划观测时段">
                <Text className="plan-period__date">{activePlan.localDate} · 观测时段</Text>
                <View className="plan-period__time"><Text>{activePlan.localTime}</Text><Text>—</Text><Text>{activePlan.timing?.endLocalTime || "未填写"}</Text></View>
                <Text className="plan-period__meta">{activePlan.timing?.endLocalDate && activePlan.timing.endLocalDate !== activePlan.localDate ? `至 ${activePlan.timing.endLocalDate} · ` : ""}地点当地时间 · {timezone}</Text>
              </View>
            </View>
            {contextQuery.isError && !sky ? null : <PlanReference plan={activePlan} report={sky}
              failed={!sky && (skyQuery.isError || Boolean(skyQuery.refreshError) || skyQuery.data?.dataState === "STALE_USABLE")}
              onRetry={() => void skyQuery.refetch()} loading={Boolean(
              (contextQuery.isPending && contextQuery.isFetching) ||
              (activeContext && skyQuery.isPending && skyQuery.isFetching)
            )} />}
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
            <View className="plan-section plan-events" data-od-id="plan-events">
              <View className="plan-section-heading"><Text className="type-section"><Text className="plan-section-symbol">◌</Text>天文事件</Text></View>
              {(activePlan.eventOccurrenceIds ?? []).map(id => {
                const event = eventCatalog.find(item => item.occurrenceId === id);
                return <Button key={id} className="plan-event-row" onClick={() => { setEventDetailId(id); setEventModalOpen(true); }}>
                  <Text>{event?.displayName ?? "事件资料暂不可用"}</Text>
                  <Text className="type-caption">{event ? `${eventDatePresentation(event).date} ${event.peakDate}` : id}</Text>
                </Button>;
              })}
              {!activePlan.eventOccurrenceIds?.length ? <StatusPanel state="EMPTY" emptyLevel="section"
                title="暂无关联事件" detail="编辑计划可关联一项天文事件。" /> : null}
            </View>
            <View className="plan-section plan-preparation" data-od-id="plan-preparation">
              <View className="plan-section-heading"><Text className="type-section"><Text className="plan-section-symbol">☷</Text>提醒与清单</Text><Text className="plan-section-caption">{activePlan.reminders?.length ?? 0}/5 个提醒</Text></View>
              <Text className="plan-form-footnote">通知状态按每组记录，清单可独立使用。</Text>
              {(activePlan.reminders ?? []).map(reminder => {
                const notification = reminderNotifications.find(status => status.planId === activePlan.planId && status.reminderId === reminder.reminderId);
                return <View className="plan-reminder" key={reminder.reminderId}>
                <View className="plan-reminder__heading"><Text>◷　出发前 {reminder.hoursBeforeDeparture} 小时</Text><Text>{reminder.items.filter(item => item.completed).length}/{reminder.items.length}</Text></View>
                <View className="plan-reminder__status"><Text>提醒与清单已保存</Text><Text>{planReminderStatusLabel(notification)}</Text></View>
                <Text className="plan-reminder__status-detail">{planReminderStatusDetail(notification)}</Text>
                {reminder.items.map(item => <Button key={item.itemId} className={`plan-check ${item.completed ? "plan-check--done" : ""}`} disabled={checklistSaving} aria-pressed={item.completed} aria-label={`${item.text}，${item.completed ? "已完成" : "未完成"}`}
                    onClick={() => { void toggleReminderItem(reminder.reminderId, item.itemId, !item.completed); }}><View className="plan-check__box"><Text>✓</Text></View><Text>{item.text}</Text></Button>)}
              </View>})}
              {!activePlan.reminders?.length ? <StatusPanel state="EMPTY" emptyLevel="section"
                title="暂无个人提醒" detail="编辑计划可添加出发提醒和个人清单。" /> : null}
            </View>
            <View className="plan-section plan-route" data-od-id="plan-route-nodes">
              <View className="plan-section-heading">
                <Text className="type-section"><Text className="plan-section-symbol">↗</Text>出行安排</Text>
                <Text className="plan-section-caption">
                  {activePlan.travel ? planTravelModeLabel(activePlan.travel.mode) : "待补充"}
                </Text>
              </View>
              <View className="plan-route__card">
                <View className="plan-route__timeline">
                  <View className="plan-route__node">
                    <View className="plan-route__dot" aria-hidden="true" />
                    <View className="plan-route__node-copy">
                      <Text className="plan-route__node-title">
                        {activePlan.timing ? activePlan.timing.departureLocalDate + " " + activePlan.timing.departureLocalTime : "出发时间待补充"}
                      </Text>
                      <Text className="plan-route__node-detail">{activePlan.travel?.origin || "出发地待补充"}</Text>
                    </View>
                  </View>
                  <View className="plan-route__node plan-route__node--summary">
                    <View className="plan-route__dot" aria-hidden="true" />
                    <View className="plan-route__node-copy">
                      <Text className="plan-route__node-title">到达与停车信息</Text>
                      <Text className="plan-route__node-detail">{siteRoute?.lastRoad || siteRoute?.parkingGuidance
                        ? [siteRoute.lastRoad, siteRoute.parkingGuidance].filter(Boolean).join(" · ")
                        : siteOverviewQuery.isError || siteOverviewQuery.refreshError || siteOverviewQuery.data?.dataState === "STALE_USABLE"
                          ? "场地信息暂未获取" : EMPTY_FIELD_VALUE}</Text>
                    </View>
                    {straightDistanceKm != null
                      ? <Text className="plan-route__node-meta">直线 {straightDistanceKm.toFixed(1)} km</Text> : null}
                  </View>
                  <View className="plan-route__node">
                    <View className="plan-route__dot" aria-hidden="true" />
                    <View className="plan-route__node-copy">
                      <Text className="plan-route__node-title">{activePlan.localDate} {activePlan.localTime} · {selectedSpot?.name ?? "正式观星点"}</Text>
                      <Text className="plan-route__node-detail">计划开始观测；到达后请核实现场开放与安全情况</Text>
                    </View>
                  </View>
                </View>
                <Text className="plan-route__source-note">时间由你安排；直线距离不代表道路里程或用时。</Text>
                {siteOverviewQuery.isError || siteOverviewQuery.refreshError || siteOverviewQuery.data?.dataState === "STALE_USABLE"
                  ? <SoftButton variant="ghost" label="重新获取场地信息" onClick={() => void siteOverviewQuery.refetch()} /> : null}
              </View>
            </View>
            <View className="plan-section plan-notes" data-od-id="plan-notes">
              <View className="plan-section-heading"><Text className="type-section">备注</Text></View>
              <Text>{activePlan.notes || "未添加备注"}</Text>
            </View>
            <View className="plan-actions">
              <SoftButton variant="default" label="分享这份行程" onClick={() => {
                void Taro.navigateTo({ url: `/content/share/index?planId=${encodeURIComponent(activePlan.planId)}` }).catch(() => announce("warning", "分享页暂未打开", "请稍后重试，计划仍保留。"));
              }}>分享行程</SoftButton>
              <SoftButton
                variant="ghost"
                label="删除观测计划"
                disabled={deleting}
                onClick={() => void remove()}
              >{deleting ? "删除中…" : "删除"}</SoftButton>
              <SoftButton variant="primary" label="编辑计划" onClick={() => {
                void Taro.navigateTo({ url: `/content/plan/edit/index?planId=${encodeURIComponent(activePlan.planId)}` }).catch(() => announce("warning", "编辑页暂未打开", "请重试，已保存计划保持不变。"));
              }}>
                编辑计划
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
              <Text className="type-section">这次去哪里</Text>
              <Text className="type-caption">
                保存后仍需在出发前复核天气与到达条件。
              </Text>
            </View>
            <View className="form-group plan-location-field">
              {!activeContext ? (
                <StatusPanel
                  state="EMPTY"
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
                  <View className="plan-fields-card plan-field-row focus-ring"
                    role="button"
                    aria-label="选择正式观星点"
                  >
                    <Text className="plan-field-row__label">观星点</Text>
                    <Text className="plan-field-row__value">
                      {formalSpots.find(
                        (spot) => spot.spotId === selectedSpotId,
                      )?.name ?? "请选择正式观星点"}
                    </Text>
                    <SemanticIcon name="chevron-down" className="plan-field-row__chevron" />
                  </View>
                </Picker>
              ) : activePlan ? (
                <View className="plan-fields-card plan-field-row field--readonly" role="status">
                  <Text className="plan-field-row__label">观星点</Text><Text className="plan-field-row__value">{selectedSpot?.name ?? "当前计划点位资料暂不可用"}</Text>
                </View>
              ) : (
                <View
                  className="plan-fields-card plan-field-row field--disabled"
                  role="button"
                  aria-label="选择正式观星点"
                  aria-disabled="true"
                >
                  <Text className="plan-field-row__label">观星点</Text><Text className="plan-field-row__value">暂无可选正式观星点</Text>
                </View>
              )}
            </View>
            <View className="plan-editor-form__heading">
              <Text className="type-section">留给星空的时间</Text>
            </View>
            <View className="plan-fields-card">
              <View className="plan-field-row">
                <Text className="plan-field-row__label">开始观测</Text>
                <View className="plan-field-row__controls">
                <Picker
                  mode="date"
                  aria-label={`观测地点当地日期：${localDate}`}
                  disabled={saving || deleting}
                  value={localDate}
                  onChange={(event) => { retainDraft({ localDate: event.detail.value }); setLocalDate(event.detail.value); }}
                >
                  <View className="plan-field-value focus-ring">
                    <Text>{localDate.replaceAll("-", "/")}</Text>
                  </View>
                </Picker>
                <Picker
                  mode="time"
                  aria-label={`观测地点当地时间：${localTime}`}
                  disabled={saving || deleting}
                  value={localTime}
                  onChange={(event) => { retainDraft({ localTime: event.detail.value }); setLocalTime(event.detail.value); }}
                >
                  <View className="plan-field-value focus-ring">
                    <Text>{localTime}</Text>
                  </View>
                </Picker>
                </View>
              </View>
            </View>
            <View className="form-group">
              <PlanTimingFields value={timing} disabled={saving || deleting}
                timezone={formalSpots.find((spot) => spot.spotId === selectedSpotId)?.timezone ?? activePlan?.contextSnapshot.timezone ?? "Asia/Shanghai"}
                onChange={(value) => { retainDraft({ timing: value }); setTiming(value); }} />
            </View>
            <View className="plan-editor-form__heading">
              <Text className="type-section">出发安排</Text>
            </View>
            <PlanTravelFields value={travel} disabled={saving || deleting} ownerKey={`${planOwner}:${activePlanId ?? "new"}`}
              onChange={(value) => { retainDraft({ travel: value }); setTravel(value); }} />
            <Text className="plan-form-footnote">
              出发地、交通方式和时间由你填写。出发前可通过微信地图核实到达方式。
            </Text>
            <View className="plan-editor-form__heading plan-editor-form__heading--row">
              <Text className="type-section">天文事件</Text>
            </View>
            <View className="form-group">
              {eventOccurrenceIds.map(id => {
                const event = eventCatalog.find(item => item.occurrenceId === id);
                return <View key={id} className="plan-event-selection">
                  <View><Text>{event?.displayName ?? "事件资料暂不可用"}</Text><Text className="type-caption">{event ? `${eventDatePresentation(event).date} ${event.peakDate}` : id}</Text></View>
                </View>;
              })}
              {eventsQuery.isError || eventsQuery.refreshError || eventsQuery.data?.dataState === "STALE_USABLE" ? <StatusPanel
                state={eventsQuery.isError ? "ERROR" : "STALE"}
                detail="事件目录暂不可用或尚未确认最新状态；已选择的事件标识仍保留。"
                recoveryLabel="重试" onRecover={() => void eventsQuery.refetch()} /> : null}
              <SoftButton className="plan-event-picker" disabled={saving || deleting} label="打开天象事件目录" onClick={() => {
                retainDraft({ eventOccurrenceIds });
                setEventDetailId(null);
                setEventModalOpen(true);
              }}>{eventOccurrenceIds.length ? `已关联 ${eventOccurrenceIds.length} 个 ›` : "选择事件 ›"}</SoftButton>
            </View>
            <Text className="plan-form-footnote">事件目录只提供年度参考；历史多关联会原样保留，确认新选择或清除后改为最多一个。</Text>
            <View className="plan-editor-form__heading">
              <Text className="type-section">自己的提醒清单</Text>
            </View>
            <PlanReminderEditor reminders={reminders} onChange={value => { retainDraft({ reminders: value }); setReminders(value); }} />
            <View className="form-group plan-notes-field">
              <Text className="type-section">备注</Text>
              <Textarea
                className="field field-textarea"
                value={notes}
                disabled={saving || deleting}
                maxlength={PLAN_NOTES_MAX_LENGTH}
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
                detail={draftStorageFailed
                  ? "最新修改仅保留在当前页面，尚未存入本机草稿。请保存成功后再离开。"
                  : recoveredLocalDraft
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
          </View>
        ) : null}
      </View>
      </ScrollView>
      {editing ? <View className="plan-editor-footer safe-bottom">
        <SoftButton label="取消编辑" disabled={saving || deleting} onClick={async () => {
          if (!scopedDraftUserId() || !(await beforeLeavingEditor())) return;
          if (dedicatedEditor) {
            nativeLeaveGuard.suspendForProgrammaticLeave();
            let hasPriorPage = false;
            try { hasPriorPage = Taro.getCurrentPages().length > 1; } catch { /* No reliable back target. */ }
            try {
              if (hasPriorPage) await Taro.navigateBack().catch(() => Taro.switchTab({ url: "/pages/my/index" }));
              else await Taro.switchTab({ url: "/pages/my/index" });
            } catch {
              nativeLeaveGuard.restoreAfterFailedProgrammaticLeave();
              announce("warning", "暂时无法返回", "当前内容保留，请再次返回。");
            }
            return;
          }
          if (!activePlan) {
            const previous = plans.find((plan) => plan.planId === requestedPlanId) ?? plans[0];
            if (previous) applyPlan(previous);
            else newPlanRequested.current = false;
          }
          setEditing(false);
        }}>取消</SoftButton>
        <SoftButton variant="primary" disabled={saving || deleting} label="保存观测计划" onClick={() => void save()}>
          {saving ? "保存中…" : "保存计划"}
        </SoftButton>
      </View> : null}
    </View>
  );
}
