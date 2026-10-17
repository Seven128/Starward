import { Button, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { currentDraftUserId, planReminderSubscription } from "@/services/api-client";
import { createPlanSubscriptionFlow, type PlanSubscriptionState } from "@/services/plan-subscription-flow";
import { useAppStore } from "@/state/app-store";

/** Mounted only for a fresh server AUTHORIZATION_REQUIRED state, inside its existing status dialog. */
export function PlanReminderSubscription({ owner, planId, reminderId, scheduleVersion, redLight }: {
  owner: string; planId: string; reminderId: string; scheduleVersion: string; redLight: boolean;
}) {
  const [state, setState] = useState<PlanSubscriptionState>({ phase: "preparing", detail: "正在准备本组微信授权…" });
  const flow = useRef<ReturnType<typeof createPlanSubscriptionFlow> | null>(null);
  useEffect(() => {
    const session = createPlanSubscriptionFlow({ owner, planId, reminderId, scheduleVersion,
      currentUser: currentDraftUserId, now: Date.now,
      prepare: planReminderSubscription.prepare, report: planReminderSubscription.report,
      // Taro's cross-platform Option also requires Alipay entityIds; WEAPP uses tmplIds only.
      requestSubscribeMessage: options => Taro.requestSubscribeMessage(options as unknown as Taro.requestSubscribeMessage.Option), changed: setState,
    });
    flow.current = session;
    const unsubscribe = useAppStore.subscribe(snapshot => {
      if (snapshot.accountOwnerId !== owner) {
        session.dispose();
        if (flow.current === session) { flow.current = null; setState({ phase: "unavailable", detail: "账户已变化，请重新打开计划。" }); }
      }
    });
    void session.prepare();
    return () => { unsubscribe(); session.dispose(); if (flow.current === session) flow.current = null; };
  }, [owner, planId, reminderId, scheduleVersion]);
  return <>
    <View role="status" aria-live="polite"><Text className="plan-reminder-status-dialog__detail">{state.detail}</Text></View>
    {state.phase === "ready" && redLight ? <Text className="plan-reminder-status-dialog__detail">
      微信授权弹窗可能显示亮色，不受红光主题控制。可关闭本说明，稍后再授权。
    </Text> : null}
    {state.phase === "ready" ? <Button className="plan-reminder-status-dialog__close"
      onClick={() => flow.current?.authorize()}>{redLight ? "继续微信授权" : "授权本次提醒"}</Button> : null}
    {state.phase === "failed" ? <Button className="plan-reminder-status-dialog__close"
      onClick={() => { if (state.retry === "report") void flow.current?.retryReport(); else void flow.current?.prepare(); }}>
      {state.retry === "report" ? "重试确认授权选择" : "重新准备授权"}
    </Button> : null}
  </>;
}
