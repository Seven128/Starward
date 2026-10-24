import { useEffect, useState, useSyncExternalStore } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, minimumTouchTarget, radii, spacing, type ColorPalette } from "@starward/ui-system/tokens";
import { createNotificationRulesClient, NotificationRuleRequestError, type NotificationRule, type NotificationRuleDefinition, type NotificationRuleInput } from "../../data/notification-rules-client";
import { resolveRuntimeApiBaseUrl } from "../../data/runtime-api-base-url";
import { useShellStore } from "../../state/shell-store";
import { RuleButton } from "./notification-controls";
import { NotificationInboxPanel } from "./NotificationInboxPanel";
import type { createNotificationInboxClient } from "../../data/notification-inbox-client";
import { defaultNotificationInboxClient } from "./notification-clients";
import { notificationWeatherMetrics } from "../../../../../packages/domain/src/notifications/evaluation";

const defaultClient = createNotificationRulesClient({ baseUrl: resolveRuntimeApiBaseUrl(), inboxClient: defaultNotificationInboxClient });
const channelLabels: Record<NotificationRuleDefinition["channel"], string> = { local: "本机提醒", inbox: "App 收件箱", apns: "Apple 通知", fcm: "Google 通知", vendor: "安卓厂商通知", "expo-poc": "试验通知" };
interface Form {
  kind: "place" | "grid"; label: string; latitude: string; longitude: string; grid: string; spotId?: string;
  category: NotificationRuleDefinition["category"]; target: string; metric: string; direction: "above" | "below"; value: string; unit: string;
  lead: string; quietStart: string; quietEnd: string; timezone: string; cooldown: string; channel: NotificationRuleDefinition["channel"]; enabled: boolean; expiresAt: string;
}
interface RuleMutationIntent { input: NotificationRuleInput | "retry"; expectedOwnerId?: string }
function fromRule(rule: NotificationRule): Form {
  const d = rule.definition, place = d.location;
  return { kind: place.kind, label: place.kind === "place" ? place.label : "", latitude: place.kind === "place" ? String(place.latitude) : "", longitude: place.kind === "place" ? String(place.longitude) : "", grid: place.kind === "grid" ? place.grid : "", spotId: place.kind === "place" ? place.spotId : undefined, category: d.category, target: d.target, metric: d.threshold.metric, direction: d.threshold.direction, value: String(d.threshold.value), unit: d.threshold.unit, lead: String(d.leadMinutes), quietStart: d.quietHours.start, quietEnd: d.quietHours.end, timezone: d.quietHours.timezone, cooldown: String(d.cooldownMinutes), channel: d.channel, enabled: d.enabled, expiresAt: d.expiresAt ?? "" };
}
function definition(form: Form): NotificationRuleDefinition {
  const number = (value: string) => value.trim() ? Number(value) : NaN;
  return { location: form.kind === "grid" ? { kind: "grid", grid: form.grid } : { kind: "place", label: form.label, latitude: number(form.latitude), longitude: number(form.longitude), ...(form.spotId ? { spotId: form.spotId } : {}) }, category: form.category, target: form.target, threshold: { metric: form.metric, direction: form.direction, value: number(form.value), unit: form.unit }, leadMinutes: number(form.lead), quietHours: { start: form.quietStart, end: form.quietEnd, timezone: form.timezone }, cooldownMinutes: number(form.cooldown), channel: form.channel, enabled: form.enabled, expiresAt: form.expiresAt.trim() || null };
}
function errorText(error: unknown): string {
  if (error instanceof NotificationRuleRequestError) {
    if (error.code === "notification_rule_api_base_url_missing") return "规则服务未配置，尚未提交。";
    if (error.code === "notification_rule_pending_owner_unqualified") return "旧保存的归属尚未确认，暂不能重发。原内容已保留。";
    if (error.code === "notification_rule_owner_unconfirmed" || error.code === "notification_rule_owner_changed_before_dispatch") return "尚未确认保存账户，未提交新规则。请重新读取通知开关。";
    if (error.code === "notification_rule_owner_mismatch") return "请恢复原保存账户后重试，原记录已保留。";
    if (error.code === "notification_rule_revision_conflict") return "规则已有新版本，未覆盖它。原修改已保留，可读取新版后重新编辑或另存规则。";
    if (error.code === "notification_rule_owner_required") return "规则配置目前仅在本机个人试用服务中可用。";
    if (error.code === "notification_rule_request_body_too_large" && error.rejected) return "内容过长，尚未保存。请缩短后重试。";
    if (error.rejected) return "未保存，请检查地点、目标、阈值单位、分钟和时区。原配置保持不变。";
  }
  return "保存结果尚未确认。原始内容已保留，请重试同一次保存。";
}
function RuleField({ label, value, onChange, palette, disabled }: { label: string; value: string; onChange(value: string): void; palette: ColorPalette; disabled: boolean }) {
  return <View><Text style={{ color: palette.text }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} autoCapitalize="none" style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} /></View>;
}
export function NotificationRulesPanel({ client = defaultClient, inboxClient: suppliedInboxClient, onEditingChange }: { client?: ReturnType<typeof createNotificationRulesClient>; inboxClient?: ReturnType<typeof createNotificationInboxClient>; onEditingChange?: (editing: boolean) => void } = {}) {
  const inboxClient = suppliedInboxClient ?? client.inboxClient;
  const context = useShellStore(state => state.decisionContext), spot = useShellStore(state => state.selectedSpot), location = useShellStore(state => state.location);
  const mode = useShellStore(state => state.displayMode), palette = colors[mode];
  const [form, setForm] = useState<Form | null>(null), [editing, setEditing] = useState<NotificationRule | null>(null), [selectedId, setSelectedId] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [cooldownEdited, setCooldownEdited] = useState(false);
  const [formOwnerId, setFormOwnerId] = useState<string | null>(null);
  const authority = useSyncExternalStore(inboxClient.subscribeAuthority, inboxClient.authority, inboxClient.authority);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);
  const cache = useQueryClient();
  const ownerId = authority.status === "ready" ? authority.ownerId : null;
  const libraryKey = ownerId ? ["notification-rules", ownerId] : ["notification-rules"];
  const ruleKey = (id: string | null) => ownerId ? ["notification-rule", ownerId, id] : ["notification-rule", id];
  const canRead = authority.status !== "denied" && !inboxOpen;
  const mayPublishRule = (rule: NotificationRule) => {
    const currentAuthority = inboxClient.authority();
    return currentAuthority.status !== "denied" && (currentAuthority.status !== "ready" || currentAuthority.ownerId === rule.ownerId);
  };
  const library = useInfiniteQuery({ queryKey: libraryKey, enabled: canRead, initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam }) => {
      const startedAuthority = inboxClient.authority();
      let result: Awaited<ReturnType<typeof client.list>>;
      try { result = await client.list(signal, pageParam, ownerId ?? undefined); }
      catch (error) { if (error instanceof NotificationRuleRequestError) inboxClient.rejectAuthority(error.statusCode, startedAuthority); throw error; }
      if (result.items.some(rule => !mayPublishRule(rule))) throw new NotificationRuleRequestError("notification_rule_owner_changed");
      return result;
    }, getNextPageParam: page => page.nextCursor ?? undefined });
  const pending = useQuery({ queryKey: ["notification-rule-pending"], queryFn: client.pending });
  const current = useQuery({ queryKey: ruleKey(selectedId), queryFn: async ({ signal }) => {
    const startedAuthority = inboxClient.authority();
    let result: NotificationRule;
    try { result = await client.get(selectedId!, signal, ownerId ?? undefined); }
    catch (error) { if (error instanceof NotificationRuleRequestError) inboxClient.rejectAuthority(error.statusCode, startedAuthority); throw error; }
    if (!mayPublishRule(result)) throw new NotificationRuleRequestError("notification_rule_owner_changed");
    return result;
  }, enabled: canRead && selectedId !== null });
  const mutation = useMutation({
    onMutate: () => inboxClient.authority(),
    mutationFn: (intent: RuleMutationIntent) => intent.input === "retry" ? client.retry() : client.command(intent.input, intent.expectedOwnerId),
    onError: (error, _intent, startedAuthority) => {
      if (error instanceof NotificationRuleRequestError && startedAuthority
        && (!error.expectedOwnerId || error.expectedOwnerId === startedAuthority.ownerId)) inboxClient.rejectAuthority(error.statusCode, startedAuthority);
    },
    onSuccess: async rule => {
      if (!mayPublishRule(rule)) return;
      const key = inboxClient.authority().status === "ready" ? ["notification-rule", rule.ownerId, rule.id] : ["notification-rule", rule.id];
      await cache.cancelQueries({ queryKey: key });
      if (!mayPublishRule(rule)) return;
      const previous = cache.getQueryData<NotificationRule>(key);
      if (previous && (previous.ownerId !== rule.ownerId || previous.revision > rule.revision)) return;
      cache.setQueryData(key, rule); setSelectedId(rule.id); setForm(null); setEditing(null);
      onEditingChange?.(false);
      void cache.invalidateQueries({ queryKey: ["notification-rules"] });
    },
    onSettled: () => { void cache.invalidateQueries({ queryKey: ["notification-rule-pending"] }); },
  });
  const submit = (input: NotificationRuleInput | "retry", expectedOwnerId?: string) => {
    const currentAuthority = inboxClient.authority();
    // Keep the intended owner with the click's full input, before Mutation's
    // asynchronous preparation can observe a different browsing authority.
    mutation.mutate({ input, expectedOwnerId: expectedOwnerId ?? (currentAuthority.status === "ready" ? currentAuthority.ownerId ?? undefined : undefined) });
  };
  const blocked = authority.status === "denied" || mutation.isPending || pending.isPending || pending.isError || !!pending.data;
  const begin = (rule?: NotificationRule) => {
    if (blocked) return;
    onEditingChange?.(true);
    setFormOwnerId(rule?.ownerId ?? (authority.status === "ready" ? authority.ownerId : null));
    mutation.reset(); setEditing(rule ?? null);
    setCooldownEdited(Boolean(rule));
    if (rule) { setForm(fromRule(rule)); return; }
    // Initialize only an explicitly opened new form. Existing rules and an
    // already open draft never follow later browsing Context changes.
    setForm({ kind: "place", label: spot?.name ?? location.label, latitude: spot ? String(spot.coordinate.lat) : location.latitude === undefined ? "" : String(location.latitude), longitude: spot ? String(spot.coordinate.lon) : location.longitude === undefined ? "" : String(location.longitude), spotId: spot?.id, grid: "", category: "pretrip", target: context.target, metric: "", direction: "above", value: "", unit: "", lead: "60", quietStart: "22:00", quietEnd: "08:00", timezone: context.timezone, cooldown: "120", channel: "inbox", enabled: false, expiresAt: "" });
  };
  const update = (patch: Partial<Form>) => setForm(prior => prior && ({ ...prior, ...patch }));
  const text = [styles.text, { color: palette.text }], muted = [styles.text, { color: palette.textSecondary }];
  const items = authority.status === "denied" ? undefined : library.data?.pages.flatMap(page => page.items).filter(mayPublishRule);
  const rule = current.data && mayPublishRule(current.data) ? current.data : undefined;
  const canShowForm = authority.status !== "denied" && (authority.status !== "ready" || !formOwnerId || formOwnerId === authority.ownerId);
  const cancelEdit = () => { setForm(null); setEditing(null); setFormOwnerId(null); mutation.reset(); onEditingChange?.(false); };
  if (inboxOpen) return <NotificationInboxPanel client={inboxClient} ruleId={selectedId} onClose={() => setInboxOpen(false)} />;
  return <View testID="notification-settings-center" style={styles.panel}>
    <Text style={[styles.title, { color: palette.text }]}>通知规则</Text>
    <Text style={muted}>已支持目标可观测时段内的小时天气跨阈，只写入 App 收件箱。规则、总开关和类别须分别开启；系统通知尚未接通。</Text>
    {authority.status === "denied" ? <Text style={text}>当前账户暂不能读取规则，请在收件箱重新核对通知开关。</Text> : null}
    <RuleButton palette={palette} id="notification-open-inbox" onPress={() => setInboxOpen(true)} disabled={form !== null && canShowForm || mutation.isPending}>收件箱</RuleButton>
    <RuleButton palette={palette} id="notification-new-rule" onPress={() => begin()} disabled={blocked || form !== null}>新建规则</RuleButton>
    {pending.isError ? <View><Text style={text}>未能读取待确认保存，暂不能提交新规则。</Text><RuleButton palette={palette} id="notification-retry-pending" onPress={() => { void pending.refetch(); }}>重试读取</RuleButton></View> : null}
    {pending.data ? <View testID="notification-pending"><Text style={text}>{pending.data.ownerQualification ? "有一次保存尚未确认，保留原始目标、内容和版本。" : "旧保存的归属尚未确认，暂不能重发。原内容已保留，可以查看已保存规则。"}</Text>{authority.status === "ready" && pending.data.ownerQualification?.ownerId === authority.ownerId ? <Text style={muted}>{pending.data.command === "set-rule-enabled" ? `原规则 ${pending.data.ruleId} · 基于版本 ${pending.data.baseRevision}` : `原目标 ${pending.data.input.target} · ${pending.data.input.threshold.metric} ${pending.data.input.threshold.value} ${pending.data.input.threshold.unit}`}</Text> : null}<RuleButton palette={palette} id="notification-retry-save" onPress={() => submit("retry")} disabled={!pending.data.ownerQualification || authority.status === "denied" || mutation.isPending}>重试原保存</RuleButton></View> : null}
    {mutation.error ? <Text testID="notification-save-error" style={text}>{errorText(mutation.error)}</Text> : null}
    {mutation.error instanceof NotificationRuleRequestError && mutation.error.code === "notification_rule_revision_conflict" && !form ? <RuleButton palette={palette} id="notification-reload-conflict" onPress={() => { void current.refetch(); }}>读取当前配置</RuleButton> : null}
    {authority.status === "denied" ? null : library.isPending ? <Text style={muted}>正在读取规则…</Text> : library.isError ? <View><Text style={text}>规则读取失败。</Text><RuleButton palette={palette} id="notification-retry-list" onPress={() => { void library.refetch(); }}>重试</RuleButton></View> : !items?.length ? library.isSuccess && <Text testID="notification-rules-empty" style={muted}>还没有规则。可选择地点、目标和条件，保存定义。</Text> : <View style={styles.panel}>{items.map(item => <RuleButton palette={palette} key={item.id} id={`notification-select-${item.id}`} onPress={() => { setSelectedId(item.id); mutation.reset(); }} disabled={blocked || form !== null}>{`${item.definition.location.kind === "place" ? item.definition.location.label : item.definition.location.grid} · ${item.definition.target} · ${item.definition.enabled ? "定义启用" : "定义停用"} · 版本 ${item.revision}`}</RuleButton>)}{library.hasNextPage ? <RuleButton palette={palette} id="notification-more-rules" onPress={() => { void library.fetchNextPage(); }} disabled={library.isFetchingNextPage}>更多规则</RuleButton> : null}</View>}
    {current.isFetching && selectedId ? <Text style={muted}>正在核对当前版本…</Text> : null}
    {current.isError ? <View><Text style={text}>未能核对当前配置，不能修改旧资料。</Text><RuleButton palette={palette} id="notification-retry-current" onPress={() => { void current.refetch(); }}>重新读取</RuleButton></View> : null}
    {rule && !current.isError ? <View testID="notification-rule-current" style={styles.panel}>
      <Text style={[styles.title, { color: palette.text }]}>{`规则配置已保存 · 版本 ${rule.revision}`}</Text>
      <Text style={text}>{`${rule.definition.location.kind === "place" ? `${rule.definition.location.label} (${rule.definition.location.latitude}, ${rule.definition.location.longitude})` : `网格 ${rule.definition.location.grid}`} · ${rule.definition.target}`}</Text>
      <Text testID="notification-rule-trigger" style={text}>{`${rule.definition.threshold.metric} ${rule.definition.threshold.direction === "above" ? "高于" : "低于"} ${rule.definition.threshold.value} ${rule.definition.threshold.unit} · 提前 ${rule.definition.leadMinutes} 分钟 · 冷却 ${rule.definition.cooldownMinutes} 分钟`}</Text>
      <Text testID="notification-rule-channel" style={text}>{`${channelLabels[rule.definition.channel]} · 免打扰 ${rule.definition.quietHours.start}–${rule.definition.quietHours.end} · ${rule.definition.quietHours.timezone}`}</Text>
      <Text testID="notification-rule-preview" style={muted}>{`${rule.definition.enabled ? "定义启用" : "定义停用"}；实际评估与写入记录请查看收件箱。${rule.definition.expiresAt ? `有效至 ${rule.definition.expiresAt}` : "未设有效期"}`}</Text>
      <RuleButton palette={palette} id="notification-edit-rule" onPress={() => begin(rule)} disabled={blocked || form !== null || current.isFetching}>编辑规则</RuleButton>
      <RuleButton palette={palette} id="notification-toggle-rule" onPress={() => submit({ command: "set-rule-enabled", ruleId: rule.id, baseRevision: rule.revision, enabled: !rule.definition.enabled }, rule.ownerId)} disabled={blocked || form !== null || current.isFetching}>{rule.definition.enabled ? "停用定义" : "启用定义"}</RuleButton>
    </View> : null}
    {form && !canShowForm ? <View><Text style={text}>当前账户暂不能查看原编辑内容，原内容仍保留。可重新核对账户，或取消这次编辑。</Text><RuleButton palette={palette} id="notification-cancel-edit" onPress={cancelEdit} disabled={mutation.isPending}>取消编辑</RuleButton></View> : null}
    {form && canShowForm ? <View testID="notification-rule-editor" style={styles.panel}>
      <Text style={[styles.title, { color: palette.text }]}>{editing ? `编辑版本 ${editing.revision}` : "新建规则"}</Text>
      <Text style={muted}>地点和目标取自打开表单时的选择。当前默认时区可修改，尚未自动识别地点时区。</Text>
      <View style={styles.row}><RuleButton palette={palette} id="notification-location-place" onPress={() => update({ kind: "place" })} disabled={blocked}>地点</RuleButton><RuleButton palette={palette} id="notification-location-grid" onPress={() => update({ kind: "grid" })} disabled={blocked}>网格</RuleButton></View>
      {form.kind === "place" ? <><RuleField palette={palette} disabled={blocked} label="地点名称" value={form.label} onChange={label => update({ label, spotId: undefined })} /><RuleField palette={palette} disabled={blocked} label="纬度 WGS84" value={form.latitude} onChange={latitude => update({ latitude, spotId: undefined })} /><RuleField palette={palette} disabled={blocked} label="经度 WGS84" value={form.longitude} onChange={longitude => update({ longitude, spotId: undefined })} /></> : <RuleField palette={palette} disabled={blocked} label="网格标识" value={form.grid} onChange={grid => update({ grid })} />}
      <Text style={text}>{`类别：${form.category === "pretrip" ? "行前" : "长期"}`}</Text>
      <View style={styles.row}><RuleButton palette={palette} id="notification-category-pretrip" onPress={() => update({ category: "pretrip", ...(!cooldownEdited ? { cooldown: "120" } : {}) })} disabled={blocked}>行前</RuleButton><RuleButton palette={palette} id="notification-category-longterm" onPress={() => update({ category: "long-term", ...(!cooldownEdited ? { cooldown: "1440" } : {}) })} disabled={blocked}>长期</RuleButton></View>
      <Text style={muted}>途中风险规则需要真实行程版本，当前尚不可配置。</Text>
      <RuleField palette={palette} disabled={blocked} label="目标" value={form.target} onChange={target => update({ target })} /><RuleField palette={palette} disabled={blocked} label="条件指标" value={form.metric} onChange={metric => update({ metric })} />
      <View style={styles.row}>{Object.entries(notificationWeatherMetrics).map(([metric, info]) => <RuleButton key={metric} palette={palette} id={`notification-metric-${metric}`} disabled={blocked} onPress={() => update({ metric, unit: info.unit })}>{info.label}</RuleButton>)}</View>
      <Text style={muted}>提前量相对该目标可观测小时段的开始。综合评分、未核网格和其他目标仍不能评估。</Text>
      <Text style={text}>{`触发方向：${form.direction === "above" ? "高于" : "低于"}`}</Text>
      <View style={styles.row}><RuleButton palette={palette} id="notification-direction-above" onPress={() => update({ direction: "above" })} disabled={blocked}>高于</RuleButton><RuleButton palette={palette} id="notification-direction-below" onPress={() => update({ direction: "below" })} disabled={blocked}>低于</RuleButton></View>
      <RuleField palette={palette} disabled={blocked} label="阈值" value={form.value} onChange={value => update({ value })} /><RuleField palette={palette} disabled={blocked} label="阈值单位" value={form.unit} onChange={unit => update({ unit })} /><RuleField palette={palette} disabled={blocked} label="提前分钟" value={form.lead} onChange={lead => update({ lead })} />
      <RuleField palette={palette} disabled={blocked} label="免打扰开始 HH:mm" value={form.quietStart} onChange={quietStart => update({ quietStart })} /><RuleField palette={palette} disabled={blocked} label="免打扰结束 HH:mm" value={form.quietEnd} onChange={quietEnd => update({ quietEnd })} /><RuleField palette={palette} disabled={blocked} label="时区" value={form.timezone} onChange={timezone => update({ timezone })} /><RuleField palette={palette} disabled={blocked} label="冷却分钟" value={form.cooldown} onChange={cooldown => { setCooldownEdited(true); update({ cooldown }); }} />
      <Text style={text}>{`拟用通道：${channelLabels[form.channel]}，尚未排程或投递`}</Text><View style={styles.row}>{(["local", "inbox", "apns", "fcm", "vendor", "expo-poc"] as const).map(channel => <RuleButton palette={palette} key={channel} id={`notification-channel-${channel}`} onPress={() => update({ channel })} disabled={blocked}>{channelLabels[channel]}</RuleButton>)}</View>
      <RuleField palette={palette} disabled={blocked} label="有效期 UTC 或带时差时间，留空不限" value={form.expiresAt} onChange={expiresAt => update({ expiresAt })} />
      <RuleButton palette={palette} id="notification-form-enabled" onPress={() => update({ enabled: !form.enabled })} disabled={blocked}>{form.enabled ? "定义启用，点击停用" : "定义停用，点击启用"}</RuleButton>
      <View style={styles.row}><RuleButton palette={palette} id="notification-save-rule" onPress={() => submit(editing ? { command: "update-rule", ruleId: editing.id, baseRevision: editing.revision, input: definition(form) } : { command: "create-rule", input: definition(form) }, formOwnerId ?? undefined)} disabled={blocked}>保存配置</RuleButton><RuleButton palette={palette} id="notification-cancel-edit" onPress={cancelEdit} disabled={mutation.isPending}>取消编辑</RuleButton></View>
      {mutation.error instanceof NotificationRuleRequestError && mutation.error.code === "notification_rule_revision_conflict" ? <View style={styles.panel}><RuleButton palette={palette} id="notification-load-latest" onPress={() => { void current.refetch(); }}>读取最新配置</RuleButton><RuleButton palette={palette} id="notification-save-as-new" onPress={() => { setEditing(null); mutation.reset(); }} disabled={blocked}>保留修改，另存规则</RuleButton><Text style={muted}>取消编辑后可编辑最新配置；当前表单不会自动覆盖新版。</Text></View> : null}
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({ panel: { gap: spacing.sm }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, title: { fontSize: 16, fontWeight: "700" }, text: { lineHeight: 22 }, button: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderRadius: radii.control, justifyContent: "center" }, input: { minHeight: minimumTouchTarget, borderWidth: 1, borderRadius: radii.control, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm } });
