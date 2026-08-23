import Taro, { useRouter } from "@tarojs/taro";
import { Input, Picker, Text, Textarea, View } from "@tarojs/components";
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
  getMapScene,
  getPlans,
  MiniappApiError,
  restoreObservationContext,
  saveObservationPlan,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./index.scss";

function today(timezone = "Asia/Shanghai") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export default function PlanEditorPage() {
  const router = useRouter();
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
  const existing = plans.find((plan) => plan.planId === router.params.planId);
  const [activePlanId, setActivePlanId] = useState<PlanId | null>(
    existing?.planId ?? null,
  );
  const activePlan = activePlanId
    ? (plans.find((plan) => plan.planId === activePlanId) ?? null)
    : null;
  const planQuery = useResourceQuery({
    queryKey: ["plans"],
    queryFn: (signal) => getPlans(signal),
    staleTime: 15_000,
  });
  const contextQuery = useResourceQuery({
    queryKey: [
      "plan-observation-context",
      observationContext?.contextId,
      observationContext?.contextFingerprint,
      observationContext?.revision,
    ],
    queryFn: (signal) =>
      restoreObservationContext(observationContext!, signal),
    enabled: Boolean(observationContext),
    staleTime: 60_000,
  });
  const activeContext = contextQuery.data?.data ?? null;
  useEffect(() => {
    if (
      activeContext &&
      (observationContext?.contextId !== activeContext.contextId ||
        observationContext.revision !== activeContext.revision ||
        observationContext.contextFingerprint !== activeContext.contextFingerprint)
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
      (observationContext?.location.kind === "FORMAL_SPOT"
        ? observationContext.location.spotId
        : null),
  );
  const [localDate, setLocalDate] = useState(
    existing?.localDate ??
      observationContext?.localDate ??
      today(observationContext?.timezone),
  );
  const [localTime, setLocalTime] = useState(existing?.localTime ?? "22:00");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initializedFromRemote = useRef(Boolean(existing));
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
    setActivePlanId(plan.planId);
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
    const nextDate =
      observationContext?.localDate ?? today(observationContext?.timezone);
    setActivePlanId(null);
    setSelectedSpotId(
      observationContext?.location.kind === "FORMAL_SPOT"
        ? observationContext.location.spotId
        : null,
    );
    setLocalDate(nextDate);
    setLocalTime("22:00");
    setNotes("");
    initialDraft.current = {
      selectedSpotId:
        observationContext?.location.kind === "FORMAL_SPOT"
          ? observationContext.location.spotId
          : null,
      localDate: nextDate,
      localTime: "22:00",
      notes: "",
    };
  };
  useEffect(() => {
    if (!planQuery.data) return;
    replacePlans(planQuery.data.data.plans);
  }, [planQuery.data, replacePlans]);
  useEffect(() => {
    if (!existing || initializedFromRemote.current) return;
    initializedFromRemote.current = true;
    applyPlan(existing);
  }, [existing]);
  const isDirty = activePlan
    ? activePlan.spotId !== selectedSpotId ||
      activePlan.localDate !== localDate ||
      activePlan.localTime !== localTime ||
      activePlan.notes !== notes
    : selectedSpotId !== initialDraft.current.selectedSpotId ||
      localDate !== initialDraft.current.localDate ||
      localTime !== initialDraft.current.localTime ||
      notes !== initialDraft.current.notes;
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
    const spot = formalSpots.find((item) => item.spotId === selectedSpotId);
    if (!spot) {
      announce(
        "error",
        "计划未保存",
        "请先选择一个正式观星点；本页草稿仍保留。 ",
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
      spotId: spot.spotId,
      localDate,
      localTime,
      notes,
    };
    setSaving(true);
    try {
      const response = await saveObservationPlan(
        plan,
        activePlan?.revision ?? null,
      );
      savePlan(response.data);
      setActivePlanId(response.data.planId);
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
  return (
    <View
      className={`${themeClass} plan-editor`}
      data-route="plan-editor"
      data-od-id="my-plan"
    >
      <CustomNav
        title={activePlan ? "编辑计划" : "新建计划"}
        back
        backOdId="my-plan-back-action"
        backFallbackTab="/pages/my/index"
      />
      <View className="plan-form page-inset safe-bottom">
        <View data-od-id="my-plan-notification-state">
          <NotificationRegion owner="plan" placement="inline" />
        </View>
        <View className="plan-list card" data-od-id="plan-list">
          <View className="plan-list__heading">
            <Text className="type-section">已有计划</Text>
            <SoftButton label="新建观测计划" onClick={startNewPlan}>
              新建
            </SoftButton>
          </View>
          {plans.length ? (
            plans.map((plan) => {
              const spot = formalSpots.find(
                (item) => item.spotId === plan.spotId,
              );
              return (
                <View
                  className={`plan-list__item${activePlanId === plan.planId ? " plan-list__item--active" : ""}`}
                  key={plan.planId}
                >
                  <View className="plan-list__copy">
                    <Text className="type-label">
                      {spot?.name ?? "正式观星点"}
                    </Text>
                    <Text className="type-caption">
                      {plan.localDate} · {plan.localTime}
                      {plan.notes ? ` · ${plan.notes}` : ""}
                    </Text>
                  </View>
                  <SoftButton
                    label={`编辑${spot?.name ?? "观测"}计划`}
                    onClick={() => applyPlan(plan)}
                  >
                    编辑
                  </SoftButton>
                </View>
              );
            })
          ) : (
            <Text className="type-caption">
              暂无已保存计划；可以从下方开始新建。
            </Text>
          )}
        </View>
        {isDirty ? (
          <StatusPanel
            state="PARTIAL"
            detail="本页有未保存修改；返回、保存失败或冲突时草稿会保留。"
          />
        ) : null}
        <View className="form-group">
          <Text className="type-label">正式观星点</Text>
          {!observationContext ? (
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
                  {formalSpots.find((spot) => spot.spotId === selectedSpotId)
                    ?.name ?? "请选择正式观星点"}
                </Text>
              </View>
            </Picker>
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
        <StatusPanel
          state="PARTIAL"
          detail="计划只保存用户意图，不会改写天气、天文或安全事实。保存失败时表单不会清空。"
        />
        {planQuery.isError ? (
          <StatusPanel
            state="STALE"
            detail={`服务端计划暂不可回读，当前仅显示本机最后一次副本：${errorMessage(planQuery.error)}。`}
            recoveryLabel="重试回读"
            onRecover={() => void planQuery.refetch()}
          />
        ) : null}
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
      </View>
    </View>
  );
}
