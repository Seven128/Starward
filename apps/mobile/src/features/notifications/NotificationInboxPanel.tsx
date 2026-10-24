import { useEffect, useState, useSyncExternalStore } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppState, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@starward/ui-system/tokens";
import { createNotificationInboxClient, NotificationInboxRequestError, type NotificationControls, type NotificationControlsInput } from "../../data/notification-inbox-client";
import { notificationWeatherMetrics, type NotificationInboxMessage } from "../../../../../packages/domain/src/notifications/evaluation";
import { useShellStore } from "../../state/shell-store";
import { RuleButton } from "./notification-controls";
import { defaultNotificationInboxClient } from "./notification-clients";

const currentLabels = { "same-condition": "最近资料仍满足条件", "condition-reversed": "条件已经反转", expired: "原资料已过期", unconfirmed: "当前条件尚未确认" };
const deniesOwner = (error: unknown) => error instanceof NotificationInboxRequestError &&
  (error.statusCode === 401 || error.statusCode === 403 || ["notification_rule_owner_required", "notification_controls_owner_mismatch"].includes(error.code));
const reasonLabels: Record<string, string> = {
  "grid-coverage-unqualified": "网格范围尚未核准", "target-unavailable": "目标尚不支持评估", "metric-unavailable": "指标尚不支持评估",
  "metric-unit-mismatch": "指标与单位不匹配", "channel-not-configured": "所选通道尚未接通", "quiet-hours-ambiguous": "请设置不同的免打扰起止时间",
  "time-range-unavailable": "提前量或冷却范围不可用", "night-window-unavailable": "本夜缺少可用暗夜时段", "target-window-unavailable": "本夜没有已核准的目标时段",
  "source-expired": "预报已过期，等待新资料", "source-time-unconfirmed": "预报时间尚未核准", "rule-newer-than-source": "等待保存后的新预报",
  "controls-disabled": "开关关闭，仅核对条件", "rule-expired": "规则已过期", evaluated: "已核对条件",
};
function controlsError(error: unknown): string {
  if (error instanceof NotificationInboxRequestError && error.code === "notification_controls_revision_conflict") return "开关已有新版本，未覆盖。请重新读取。";
  if (error instanceof NotificationInboxRequestError && error.rejected) return "修改未保存，请重新读取开关。";
  return "修改结果尚未确认，请重试原操作。";
}
export function NotificationInboxPanel({ client = defaultNotificationInboxClient, ruleId = null, onClose }: {
  client?: ReturnType<typeof createNotificationInboxClient>; ruleId?: string | null; onClose?: () => void;
} = {}) {
  const palette = colors[useShellStore(state => state.displayMode)], cache = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const authority = useSyncExternalStore(client.subscribeAuthority, client.authority, client.authority);
  const controls = useQuery({ queryKey: ["notification-controls"], queryFn: ({ signal }) => client.controls(signal) });
  const pending = useQuery({ queryKey: ["notification-controls-pending"], queryFn: client.pending });
  const ownerId = authority.status === "ready" ? authority.ownerId ?? undefined : undefined;
  const inbox = useInfiniteQuery({ queryKey: ["notification-inbox", ownerId], enabled: !!ownerId,
    initialPageParam: undefined as string | undefined, queryFn: ({ signal, pageParam }) => client.inbox(signal, pageParam, ownerId), getNextPageParam: page => page.nextCursor ?? undefined });
  const activity = useQuery({ queryKey: ["notification-activity", ownerId, ruleId], enabled: !!ownerId && !!ruleId,
    queryFn: ({ signal }) => client.activity(ruleId!, signal, ownerId) });
  const ownerDenied = authority.status === "denied" || deniesOwner(controls.error) || deniesOwner(inbox.error) || deniesOwner(activity.error);
  const mutation = useMutation({ mutationFn: (input: NotificationControlsInput | "retry") => input === "retry" ? client.retry() : client.command(input),
    onSuccess: async (value: NotificationControls) => {
      if (!client.canPublishControls(value)) return;
      await cache.cancelQueries({ queryKey: ["notification-controls"] });
      if (!client.canPublishControls(value)) return;
      const previous = cache.getQueryData<NotificationControls>(["notification-controls"]);
      if (previous && (previous.ownerId !== value.ownerId || previous.revision > value.revision)) return;
      cache.setQueryData(["notification-controls"], value);
      void cache.invalidateQueries({ queryKey: ["notification-inbox", value.ownerId] });
      void cache.invalidateQueries({ queryKey: ["notification-activity", value.ownerId] });
    }, onSettled: () => { void cache.invalidateQueries({ queryKey: ["notification-controls-pending"] }); } });
  const state = !ownerDenied && controls.data?.ownerId === ownerId ? controls.data : undefined;
  const blocked = ownerDenied || mutation.isPending || controls.isFetching || controls.isError || pending.isPending || pending.isError || !!pending.data;
  const change = (patch: Pick<NotificationControls, "enabled" | "categories">) => {
    if (!state || blocked) return;
    mutation.mutate({ command: "set-controls", baseRevision: state.revision, expectedOwnerId: state.ownerId, ...patch });
  };
  const messages = ownerDenied ? undefined : inbox.data?.pages.filter(page => page.ownerId === ownerId).flatMap(page => page.items);
  const message = messages?.find(item => item.id === selected);
  const evaluationUnavailable = inbox.data?.pages.some(page => page.evaluationStatus === "unavailable");
  const evaluationProcessing = inbox.data?.pages.some(page => page.evaluationStatus === "processing");
  const receiptById = new Map(inbox.data?.pages.flatMap(page => page.items.map(item => [item.id, page] as const)));
  const currentLabel = (item: NotificationInboxMessage) => {
    const page = receiptById.get(item.id);
    const serverNow = page ? Date.parse(page.checkedAt) + Math.max(0, now - page.requestStartedAt) : now;
    return currentLabels[Date.parse(item.trigger.window.endUtc) <= serverNow || item.currentEvidence && Date.parse(item.currentEvidence.source.expiresAt) <= serverNow ? "expired" : item.current];
  };
  useEffect(() => {
    let deadline = Infinity;
    for (const page of inbox.data?.pages ?? []) for (const item of page.items) {
      for (const at of [item.trigger.window.endUtc, item.currentEvidence?.source.expiresAt]) if (at) {
        const candidate = page.requestStartedAt + Date.parse(at) - Date.parse(page.checkedAt);
        if (candidate > now) deadline = Math.min(deadline, candidate);
      }
    }
    if (!Number.isFinite(deadline)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(1, Math.min(2_147_483_647, deadline - Date.now())));
    return () => clearTimeout(timer);
  }, [inbox.data, now]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => { if (state === "active") { setNow(Date.now()); void controls.refetch(); if (ownerId) void inbox.refetch(); } });
    return () => subscription.remove();
  }, [ownerId]);
  const text = [styles.text, { color: palette.text }], muted = [styles.text, { color: palette.textSecondary }];
  return <View testID="notification-inbox-panel" style={styles.panel}>
    <Text style={[styles.title, { color: palette.text }]}>收件箱</Text>
    <Text style={muted}>取得对应地点的新预报后核对条件，仅写入 App 收件箱。系统通知与后台持续监测尚未接通。</Text>
    {onClose ? <RuleButton id="notification-inbox-close" palette={palette} onPress={onClose}>返回规则</RuleButton> : null}
    {controls.isPending ? <Text style={muted}>正在读取开关…</Text> : controls.isError ? <View><Text style={text}>通知开关读取失败。</Text><RuleButton id="notification-controls-reload" palette={palette} onPress={() => { void controls.refetch(); }}>重试读取</RuleButton></View> : state ? <View style={styles.panel}>
      <RuleButton id="notification-controls-global" palette={palette} disabled={blocked} onPress={() => change({ enabled: !state.enabled, categories: state.categories })}>{`收件箱总开关：${state.enabled ? "开启" : "关闭"}`}</RuleButton>
      {(["pretrip", "long-term"] as const).map(category => <RuleButton key={category} id={`notification-controls-${category}`} palette={palette} disabled={blocked}
        onPress={() => change({ enabled: state.enabled, categories: { ...state.categories, [category]: !state.categories[category] } })}>{`${category === "pretrip" ? "行前" : "长期"}条件：${state.categories[category] ? "开启" : "关闭"}`}</RuleButton>)}
      <Text style={muted}>规则、总开关和类别均开启才写入收件箱。首次资料先确认状态，之后只在条件跨过阈值时提醒。</Text>
    </View> : null}
    {pending.isError ? <View><Text style={text}>待确认修改未能读取，暂不能更改开关。</Text><RuleButton id="notification-controls-retry-pending" palette={palette} onPress={() => { void pending.refetch(); }}>重试读取</RuleButton></View> : null}
    {pending.data ? <View><Text style={text}>有一次开关修改尚未确认。</Text><RuleButton id="notification-controls-retry" palette={palette} disabled={mutation.isPending} onPress={() => mutation.mutate("retry")}>重试原操作</RuleButton></View> : null}
    {mutation.error ? <View><Text style={text}>{controlsError(mutation.error)}</Text><RuleButton id="notification-controls-read-current" palette={palette} onPress={() => { void controls.refetch(); }}>读取当前开关</RuleButton></View> : null}
    {ownerDenied ? <View><Text testID="notification-owner-unavailable" style={text}>当前账户暂不能读取通知，请重新读取开关。</Text><RuleButton id="notification-owner-recheck" palette={palette} onPress={() => { void controls.refetch(); }}>重新核对账户</RuleButton></View> : null}
    {ruleId && activity.data && !ownerDenied ? <View testID="notification-rule-activity"><Text style={text}>{activity.data.supported ? "此规则可核对小时天气" : reasonLabels[activity.data.reason ?? ""] ?? "此规则暂不能评估"}</Text>
      {activity.data.evaluationStatus === "unavailable" ? <Text style={text}>本次评估未完成，保留上次记录。</Text> : null}
      {activity.data.evaluationStatus === "processing" ? <Text style={muted}>正在核对新资料，先显示已有记录。</Text> : null}
      <Text style={muted}>{activity.data.lastEvaluation ? `${reasonLabels[activity.data.lastEvaluation.status] ?? "已核对资料"} · ${activity.data.lastEvaluation.at}` : "尚无保存后的对应预报"}</Text>
      <Text style={muted}>{`待处理 ${activity.data.pending} · 最近写入 ${activity.data.lastDeliveryAt ?? "尚无"}`}</Text></View> : ruleId && activity.isError ? <Text style={text}>本条评估记录读取失败。</Text> : null}
    {evaluationUnavailable ? <Text testID="notification-evaluation-unavailable" style={text}>本次评估未完成，保留已有通知；重新读取可重试。</Text> : null}
    {evaluationProcessing ? <Text testID="notification-evaluation-processing" style={muted}>正在核对新资料，先显示已有通知。</Text> : null}
    {inbox.isError ? <Text style={text}>{messages?.length ? "收件箱更新失败，保留已有通知。" : "收件箱读取失败，尚不能核实新通知。"}</Text> : null}
    {inbox.isPending && ownerId && !ownerDenied ? <Text style={muted}>正在读取收件箱…</Text> : !messages?.length ? inbox.isSuccess && !!ownerId && !ownerDenied && <Text testID="notification-inbox-empty" style={muted}>{evaluationUnavailable || evaluationProcessing ? "暂不能确认是否有新通知。" : "收件箱尚无通知。"}</Text> : <View style={styles.panel}>
      {messages.map(item => <RuleButton key={item.id} id={`notification-inbox-${item.id}`} palette={palette} onPress={() => setSelected(item.id)}>{`${item.trigger.location.kind === "place" ? item.trigger.location.label : item.trigger.location.grid} · ${notificationWeatherMetrics[item.trigger.metric].label} · ${currentLabel(item)}`}</RuleButton>)}
      {inbox.hasNextPage ? <RuleButton id="notification-inbox-more" palette={palette} disabled={inbox.isFetchingNextPage} onPress={() => { void inbox.fetchNextPage(); }}>更多通知</RuleButton> : null}
    </View>}
    {ownerId ? <RuleButton id="notification-inbox-refresh" palette={palette} disabled={inbox.isFetching} onPress={() => { void inbox.refetch(); if (ruleId) void activity.refetch(); }}>重新读取</RuleButton> : null}
    {message ? <View testID="notification-message-detail" style={styles.panel}>
      <Text style={[styles.title, { color: palette.text }]}>{currentLabel(message)}</Text>
      <Text style={text}>{`${message.trigger.location.kind === "place" ? message.trigger.location.label : message.trigger.location.grid} · ${message.trigger.target}`}</Text>
      <Text style={text}>{`${notificationWeatherMetrics[message.trigger.metric].label}从 ${message.trigger.previousValue} 变为 ${message.trigger.value} ${message.trigger.unit}，${message.trigger.direction === "above" ? "高于" : "低于"}设定的 ${message.trigger.threshold} ${message.trigger.unit}。`}</Text>
      <Text style={text}>{`对应时段 ${message.trigger.window.startUtc} — ${message.trigger.window.endUtc}`}</Text>
      <Text style={muted}>{`触发资料 ${message.trigger.source.acquiredAt} · 写入 ${message.deliveredAt}`}</Text>
      <Text style={muted}>{`最近核对值 ${message.evidence.value} ${message.trigger.unit} · ${message.evidence.source.acquiredAt}`}</Text>
      {message.currentEvidence ? <Text style={muted}>{`后续资料 ${message.currentEvidence.value ?? "未知"} ${message.trigger.unit} · ${message.currentEvidence.source.acquiredAt}`}</Text> : null}
      <Text style={muted}>{`${message.evidence.source.provider} / ${message.evidence.source.model} · 原资料有效至 ${message.evidence.source.expiresAt}`}</Text>
      {message.evidence.source.attribution.map((source, index) => <Text key={index} style={muted}>{`${source.label} · ${source.url} · ${source.licenseId} ${source.licenseVersion}`}</Text>)}
      <Text style={text}>这是条件变化记录。出行前请重新查看天气、开放与安全资料；通知不保证适合观星。</Text>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({ panel: { gap: spacing.sm }, title: { fontSize: 16, fontWeight: "700" }, text: { lineHeight: 22 } });
