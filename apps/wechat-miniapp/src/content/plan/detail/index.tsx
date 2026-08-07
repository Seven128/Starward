import Taro, { useRouter } from "@tarojs/taro";
import { Input, Picker, Text, Textarea, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import {
  DEMO_SPOTS,
  type ObservationPlan,
  type PlanId,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
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
  const existing = plans.find((plan) => plan.planId === router.params.planId);
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
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const initializedFromRemote = useRef(Boolean(existing));
  const themeClass = useThemeClass();
  useEffect(() => {
    if (!planQuery.data) return;
    replacePlans(planQuery.data.data.plans);
  }, [planQuery.data, replacePlans]);
  useEffect(() => {
    if (!existing || initializedFromRemote.current) return;
    initializedFromRemote.current = true;
    setSpotIndex(
      Math.max(
        0,
        DEMO_SPOTS.findIndex((spot) => spot.spotId === existing.spotId),
      ),
    );
    setLocalDate(existing.localDate);
    setLocalTime(existing.localTime);
    setNotes(existing.notes);
  }, [existing]);
  const save = async () => {
    const spot = DEMO_SPOTS[spotIndex];
    if (!spot) return;
    if (
      !/^\d{4}-\d{2}-\d{2}$/u.test(localDate) ||
      !/^\d{2}:\d{2}$/u.test(localTime)
    ) {
      setStatus("日期或时间格式无效；草稿仍保留。");
      return;
    }
    const planId =
      existing?.planId ??
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
        existing?.revision ?? null,
      );
      savePlan(response.data);
      setStatus(
        `计划已持久化并回读修订 ${response.data.revision}；动态事实仍以详情/夜空当前数据为准。`,
      );
      await Taro.showToast({ title: "计划已保存", icon: "success" });
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const current = await planQuery.refetch().catch(() => undefined);
        if (current) replacePlans(current.data.plans);
        setStatus(
          "计划已在其他位置更新；已刷新服务端版本，但本页输入完整保留。请核对后再次保存。",
        );
      } else {
        setStatus(`保存失败：${errorMessage(error)}。输入完整保留，可重试。`);
      }
    } finally {
      setSaving(false);
    }
  };
  return (
    <View className={`${themeClass} plan-editor`} data-route="plan-editor">
      <CustomNav title={existing ? "编辑计划" : "新建计划"} back />
      <View className="plan-form page-inset safe-bottom">
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
        {status ? (
          <StatusPanel
            state={
              status.includes("失败") || status.includes("无效")
                ? "ERROR"
                : "READY"
            }
            detail={status}
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
      </View>
    </View>
  );
}
