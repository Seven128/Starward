import Taro, { useRouter } from "@tarojs/taro";
import { Input, Picker, Text, Textarea, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import {
  DEMO_SPOTS,
  type ObservationPlan,
  type PlanId,
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
  getPlans,
  MiniappApiError,
  saveObservationPlan,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./index.scss";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
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
  const [spotIndex, setSpotIndex] = useState(
    Math.max(
      0,
      existing
        ? DEMO_SPOTS.findIndex((spot) => spot.spotId === existing.spotId)
        : 0,
    ),
  );
  const [localDate, setLocalDate] = useState(existing?.localDate ?? today());
  const [localTime, setLocalTime] = useState(existing?.localTime ?? "22:00");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initializedFromRemote = useRef(Boolean(existing));
  const initialDraft = useRef({
    spotIndex,
    localDate,
    localTime,
    notes,
  });
  const themeClass = useThemeClass();
  const applyPlan = (plan: ObservationPlan) => {
    const nextSpotIndex = Math.max(
      0,
      DEMO_SPOTS.findIndex((spot) => spot.spotId === plan.spotId),
    );
    setActivePlanId(plan.planId);
    setSpotIndex(nextSpotIndex);
    setLocalDate(plan.localDate);
    setLocalTime(plan.localTime);
    setNotes(plan.notes);
    initialDraft.current = {
      spotIndex: nextSpotIndex,
      localDate: plan.localDate,
      localTime: plan.localTime,
      notes: plan.notes,
    };
  };
  const startNewPlan = () => {
    const nextDate = today();
    setActivePlanId(null);
    setSpotIndex(0);
    setLocalDate(nextDate);
    setLocalTime("22:00");
    setNotes("");
    initialDraft.current = {
      spotIndex: 0,
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
    ? activePlan.spotId !== DEMO_SPOTS[spotIndex]?.spotId ||
      activePlan.localDate !== localDate ||
      activePlan.localTime !== localTime ||
      activePlan.notes !== notes
    : spotIndex !== initialDraft.current.spotIndex ||
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
    const spot = DEMO_SPOTS[spotIndex];
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
    const plan: Omit<ObservationPlan, "revision" | "updatedAt"> = {
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
        `已持久化并回读修订 ${response.data.revision}；动态事实仍以详情/夜空当前数据为准。`,
      );
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const current = await planQuery.refetch().catch(() => undefined);
        if (current) replacePlans(current.data.plans);
        announce(
          "warning",
          "计划有新修订",
          "服务端版本已刷新，但本页输入完整保留；请核对后再次保存。",
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
              const spot = DEMO_SPOTS.find(
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
          <Picker
            mode="selector"
            range={DEMO_SPOTS.map((spot) => `${spot.name} · ${spot.region}`)}
            value={spotIndex}
            onChange={(event) => setSpotIndex(Number(event.detail.value))}
          >
            <View
              className="field focus-ring"
              role="button"
              aria-label="选择正式观星点"
            >
              <Text>{DEMO_SPOTS[spotIndex]?.name}</Text>
            </View>
          </Picker>
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
