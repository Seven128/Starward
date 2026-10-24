import { useState, useSyncExternalStore } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { createItineraryClient, ItineraryRequestError, type ItineraryDraft, type ItineraryDraftCommand, type ItineraryDraftInputs, type ItineraryCommandInput } from "../../data/itinerary-client";
import { resolveRuntimeApiBaseUrl } from "../../data/runtime-api-base-url";
import { DecisionContextRevision } from "../../shell/DecisionContextRevision";
import { useShellStore } from "../../state/shell-store";
import { observerTypeLabels } from "../preferences/observer-labels";
import { compareItineraryDraftContent, itineraryDraftRestoreInput, snapshotItineraryDraftContentRevision, type ItineraryDraftContentField, type ItineraryDraftContentRevision } from "../../../../../packages/domain/src/itinerary/draft-content";
import type { ItineraryDraftEditableContent } from "../../../../../packages/domain/src/itinerary/draft";
import { ManualStageEditor } from "./ManualStageEditor";
import { manualStageInputs, resolveManualStages, stageComparisonTime, stageNames, type ManualStageInput } from "./manual-stage-edit";

const palette = colors.planning;
const defaultClient = createItineraryClient({ baseUrl: resolveRuntimeApiBaseUrl() });
type DraftForm = { title: string; timezone: string; inputs: ItineraryDraftInputs; stages: ManualStageInput[] | null; stagesEdited: boolean; stageDatesReviewed: boolean };
type ViewKey = "overview" | "candidate" | "route" | "refresh" | "share" | "collaboration" | "timeline";
const actions: Array<{ key: ViewKey; id: string; label: string }> = [
  { key: "overview", id: "plan-open-overview", label: "总览" },
  { key: "candidate", id: "plan-add-candidate", label: "待规划" },
  { key: "route", id: "plan-compare-routes", label: "路线" },
  { key: "refresh", id: "plan-refresh", label: "刷新" },
  { key: "share", id: "plan-create-share", label: "分享/离线" },
  { key: "collaboration", id: "plan-resolve-conflict", label: "协作" },
  { key: "timeline", id: "plan-open-astronomy", label: "天文阶段" },
];
function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}
function Input({ label, value, onChange, disabled = false }: { label: string; value: string; onChange(value: string): void; disabled?: boolean }) {
  return <View><Text style={styles.evidenceTitle}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} style={[styles.action, styles.evidenceBody]} /></View>;
}
function Panel({ active, plan }: { active: ViewKey; plan: ItineraryDraft }) {
  if (active === "overview") return <View style={styles.panel}>
    <Evidence testID="plan-observation-window" title={`${plan.inputs.date} · ${plan.timezone}`} body={`从 ${plan.inputs.origin} 出发 · ${plan.inputs.people} 人 · 目标 ${plan.inputs.target}`} meta={`最晚返回 ${plan.inputs.latestReturnLocal ?? "未指定"}；${plan.inputs.overnight ? "计划过夜" : "不计划过夜"}`} />
    <Evidence testID="plan-main-spot" title="主备地点尚未选择" body="已保存你填写的行程意向，地点与到达条件仍需核实。" />
    <Evidence testID="plan-safety-checklist" title="尚未生成可执行计划" body="路线、天气与天文窗口尚未接入。未核实地点开放、道路和天气前，请勿据此出发。" />
    <Evidence testID="plan-overview-version" title={`已保存草稿 · 版本 ${plan.revision}`} body={`用户填写 · ${plan.updatedAt}`} meta="浏览其他日期或地点不会改写这份行程。" />
  </View>;
  const unavailable: Record<Exclude<ViewKey, "overview" | "timeline">, [string, string]> = {
    candidate: ["暂无候选地点", "地点来源与加入计划功能尚未接入，未添加示例或好友地点。"],
    route: ["路线尚不可用", "尚无经过核实的路线结果，车程、收费、道路与到达时间未知。"],
    refresh: ["暂无可刷新资料", "草稿未关联天气、路线或天文来源；已保存内容保持不变。"],
    share: ["分享与离线包尚不可用", "当前仅保存私人草稿，未生成分享链接，也未下载观测包。"],
    collaboration: ["当前仅个人编辑", "好友邀请、共同编辑与冲突合并尚未接入。"],
  };
  if (active !== "timeline") { const [title, body] = unavailable[active]; return <Evidence testID={`plan-${active}-unavailable`} title={title} body={body} />; }
  return <Evidence testID="plan-target-event" title={plan.stages.length ? "手工阶段安排" : "天文窗口尚未计算"} body={plan.stages.length ? plan.stages.map(stage => `${stageNames[stage.kind]} ${stageComparisonTime(stage.startsAt, plan.timezone)}—${stageComparisonTime(stage.endsAt, plan.timezone)}`).join("\n") : "尚无阶段。保存草稿不会自动生成出发、月落或银河时段。"} meta={plan.stages.length ? "以上是用户填写的阶段，不是计算所得的天文事实。" : plan.timezone} />;
}
function errorText(error: unknown): string {
  if (error instanceof ItineraryRequestError) {
    if (error.code === "itinerary_api_base_url_missing") return "行程服务未配置，草稿尚未提交。";
    if (error.code === "itinerary_pending_owner_unqualified") return "旧保存的归属尚未确认，暂不能重发。原内容已保留。";
    if (error.code === "itinerary_owner_mismatch") return "请恢复原保存账户后重试，原内容已保留。";
    if (error.code === "itinerary_owner_unconfirmed" || error.code === "itinerary_owner_changed") return "保存账户尚未核对，未提交新内容。请重新读取行程。";
    if (error.code === "itinerary_revision_conflict") return "行程已被更新。请先读取最新版本，再确认要保留的修改。";
    if (error.code === "itinerary_stages_require_review") return "日期已改变，请核对原阶段后再保存。原编辑仍保留。";
    if (error.code === "itinerary_invalid_timeline") return "阶段时刻有冲突，请调整起止时间。原编辑仍保留。";
    if (error.code === "itinerary_restore_source_not_found" || error.code === "itinerary_restore_source_incompatible") return "所选历史版本目前不能恢复，当前行程已保留。请重新读取并选择版本。";
    if (error.code === "itinerary_owner_required") return "行程目前仅在本机个人试用服务中可用。";
    if (error.code === "itinerary_request_body_too_large" && error.rejected) return "内容过长，尚未保存。请缩短填写内容后重试。";
    if (error.rejected) return "未保存，请检查日期、人数和必填内容；原行程保持不变。";
  }
  return "保存结果尚未确认。原始内容已保留，请重试同一次保存。";
}
function pendingDescription(command: ItineraryDraftCommand) {
  if (command.command === "create-draft") return `${command.input.title} · ${command.input.inputs.date}`;
  if (command.command === "restore-draft") return `行程 ${command.itineraryId} · 恢复版本 ${command.sourceRevision} · 基于版本 ${command.baseRevision}`;
  return `行程 ${command.itineraryId} · 基于版本 ${command.baseRevision}`;
}

const inputNames: Record<keyof ItineraryDraftInputs, string> = { date: "日期", origin: "出发地", people: "人数", transport: "交通方式", target: "观测目标", userType: "用户类型", latestReturnLocal: "最晚返回", overnight: "过夜安排", collaborative: "编辑方式" };
const localTime = (value: string, timezone: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(value));
function contentValue(field: ItineraryDraftContentField, value: ItineraryDraftEditableContent, timezone: string) {
  if (field === "title") return value.title;
  if (field === "stages") return value.stages.length ? value.stages.map((stage, index) => `${index + 1}. ${stageNames[stage.kind]}（${stage.id}） ${stageComparisonTime(stage.startsAt, timezone)}—${stageComparisonTime(stage.endsAt, timezone)}`).join("\n") : "尚无阶段";
  const key = field.slice(7) as keyof ItineraryDraftInputs, item = value.inputs[key];
  if (key === "transport") return ({ drive: "驾车", walk: "步行", mixed: "混合交通" })[value.inputs.transport];
  if (key === "overnight") return item ? "计划过夜" : "不计划过夜";
  if (key === "collaborative") return item ? "共同编辑" : "个人编辑";
  if (key === "people") return `${item} 人`;
  return item === null ? "未指定" : String(item);
}
function HistoryAction({ id, children, onPress, disabled = false }: { id: string; children: string; onPress(): void; disabled?: boolean }) {
  return <Pressable testID={id} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Text style={styles.actionText}>{children}</Text></Pressable>;
}
function DraftHistoryPanel({ client, plan, blocked, editing, isSaving, restoreError, onClose, onRestore, readCurrent }: {
  client: ReturnType<typeof createItineraryClient>; plan: ItineraryDraft; blocked: boolean; editing: boolean; isSaving: boolean; restoreError: unknown;
  onClose(): void; onRestore(input: ItineraryCommandInput, ownerId: string): void; readCurrent(): Promise<ItineraryDraft | undefined>;
}) {
  const [selection, setSelection] = useState<{ revision: number; base: ItineraryDraftContentRevision } | null>(null);
  const [comparing, setComparing] = useState(false), [comparisonFailed, setComparisonFailed] = useState(false);
  const history = useInfiniteQuery({ queryKey: ["itinerary-history", plan.ownerId, plan.id], initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => client.history(plan.id, signal, pageParam, plan.ownerId),
    getNextPageParam: page => client.canPublishHistory(page) ? page.nextCursor ?? undefined : undefined });
  const revision = useQuery({ queryKey: ["itinerary-revision", plan.ownerId, plan.id, selection?.revision],
    queryFn: ({ signal }) => client.getRevision(plan.id, selection!.revision, signal, plan.ownerId), enabled: selection !== null });
  const old = revision.data && client.canPublish(revision.data) && revision.data.id === plan.id && revision.data.revision === selection?.revision ? revision.data : undefined;
  const rows = history.data?.pages.filter(client.canPublishHistory).flatMap(page => page.items);
  const comparison = selection && old ? compareItineraryDraftContent(selection.base, old) : null;
  let restoreInput: ItineraryCommandInput | undefined;
  if (selection && old && old.revision < selection.base.revision) {
    try { restoreInput = itineraryDraftRestoreInput(selection.base, old); } catch { /* incompatible content stays read-only */ }
  }
  const conflict = restoreError instanceof ItineraryRequestError && restoreError.code === "itinerary_revision_conflict";
  const currentChanged = selection && selection.base.revision !== plan.revision;
  const select = (number: number) => { setSelection({ revision: number, base: snapshotItineraryDraftContentRevision(plan) }); setComparisonFailed(false); };
  const recompare = async () => {
    setComparing(true); setComparisonFailed(false);
    try { const current = await readCurrent(); if (!current || !client.canPublish(current) || current.id !== plan.id || current.ownerId !== plan.ownerId) { setComparisonFailed(true); return; }
      setSelection(selected => selected ? { ...selected, base: snapshotItineraryDraftContentRevision(current) } : selected);
    } catch { setComparisonFailed(true); } finally { setComparing(false); }
  };
  const restore = () => {
    if (!selection || !restoreInput || blocked || editing || conflict || currentChanged || comparing || revision.isFetching || revision.isError || !comparison?.changedFields.length) return;
    onRestore(restoreInput, selection.base.ownerId);
  };
  return <View testID="itinerary-history" style={styles.panel}>
    <Text style={styles.evidenceTitle}>版本历史</Text><Text style={styles.evidenceMeta}>选中版本只供查看，恢复会新建版本。</Text>
    <HistoryAction id="plan-close-history" onPress={onClose}>关闭历史</HistoryAction>
    {history.isPending ? <Text style={styles.subtitle}>正在读取历史…</Text> : null}
    {selection ? <HistoryAction id="plan-history-choose-version" disabled={isSaving || comparing} onPress={() => setSelection(null)}>选择版本</HistoryAction> : null}
    {rows?.filter(item => !selection || item.revision === selection.revision).map(item => <HistoryAction key={item.revision} id={`plan-history-revision-${item.revision}`} disabled={isSaving || comparing} onPress={() => select(item.revision)}>{`版本 ${item.revision} · ${item.title} · ${localTime(item.updatedAt, plan.timezone)}`}</HistoryAction>)}
    {!history.isError && rows?.length === 0 ? <Text style={styles.subtitle}>尚无可读取的版本。</Text> : null}
    {history.isError ? <View><Text style={styles.error}>历史读取失败，已存行程保持不变。</Text><HistoryAction id="plan-history-retry" onPress={() => { void history.refetch(); }}>重试历史</HistoryAction></View> : null}
    {!selection && history.hasNextPage ? <HistoryAction id="plan-history-more" disabled={history.isFetchingNextPage} onPress={() => { void history.fetchNextPage(); }}>{history.isFetchingNextPage ? "正在读取…" : "更早版本"}</HistoryAction> : null}
    {selection ? <View testID="plan-history-comparison" style={styles.comparison}>
      <Text style={styles.evidenceTitle}>{`比较：当前版本 ${selection.base.revision} → 历史版本 ${selection.revision}`}</Text>
      {revision.isPending ? <Text style={styles.subtitle}>正在读取所选版本…</Text> : null}
      {revision.isError ? <View><Text style={styles.error}>{old ? "读取失败，保留上次比较；重试后恢复。" : "所选版本未能读取，尚未恢复。"}</Text><HistoryAction id="plan-history-detail-retry" onPress={() => { void revision.refetch(); }}>重试版本</HistoryAction></View> : null}
      {comparison?.changedFields.map(field => <View key={field} testID={`plan-history-diff-${field}`} style={styles.difference}>
        <Text style={styles.evidenceTitle}>{field === "title" ? "行程名称" : field === "stages" ? "用户阶段" : inputNames[field.slice(7) as keyof ItineraryDraftInputs]}</Text>
        <Text style={styles.evidenceBody}>{`当前：${contentValue(field, comparison.current, plan.timezone)}`}</Text>
        <Text style={styles.evidenceBody}>{`恢复后：${contentValue(field, comparison.historical, plan.timezone)}`}</Text>
      </View>)}
      {comparison && comparison.changedFields.length === 0 ? <Text style={styles.subtitle}>此版本内容与当前相同。</Text> : null}
      {old && old.revision >= selection.base.revision ? <Text style={styles.subtitle}>请选择较早版本，或重新读取当前行程。</Text> : null}
      {old && old.revision < selection.base.revision && !restoreInput ? <Text style={styles.error}>版本内容不兼容，暂不能恢复。</Text> : null}
      {editing ? <Text testID="plan-history-edit-blocked" style={styles.subtitle}>当前还有未保存编辑，请先保存或取消。</Text> : null}
      {currentChanged || conflict ? <Text style={styles.subtitle}>当前行程已更新，请重新比较。</Text> : null}
      {restoreError ? <Text style={styles.error}>{restoreError instanceof ItineraryRequestError && restoreError.code === "itinerary_request_body_too_large" && restoreError.rejected ? "版本内容超出服务上限，尚未恢复。原版本保留。" : errorText(restoreError)}</Text> : null}
      {comparisonFailed ? <Text style={styles.error}>当前版本读取失败，原比较已保留。</Text> : null}
      <HistoryAction id="plan-history-recompare" disabled={isSaving || comparing} onPress={() => { void recompare(); }}>{comparing ? "正在读取…" : "重新比较"}</HistoryAction>
      <HistoryAction id="plan-restore-history" disabled={blocked || editing || comparing || revision.isFetching || revision.isError || !!currentChanged || conflict || !restoreInput || !comparison?.changedFields.length} onPress={restore}>{isSaving ? "正在恢复…" : "恢复版本"}</HistoryAction>
      <HistoryAction id="plan-close-history-comparison" onPress={onClose}>关闭历史</HistoryAction>
    </View> : null}
  </View>;
}

export function ItineraryScreen({ client = defaultClient }: { client?: ReturnType<typeof createItineraryClient> } = {}) {
  const context = useShellStore(state => state.decisionContext);
  const location = useShellStore(state => state.location);
  const profile = useShellStore(state => state.profiles.find(item => item.id === state.decisionContext.profileId));
  const [active, setActive] = useState<ViewKey>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [formOwnerId, setFormOwnerId] = useState<string | null>(null), [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ItineraryDraft | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const authority = useSyncExternalStore(client.subscribeAuthority, client.authority, client.authority);
  const ownerId = authority.status === "ready" ? authority.ownerId : null;
  const planKey = (id: string | undefined, owner = ownerId) => ["itinerary", owner, id];
  const queryClient = useQueryClient();
  const library = useInfiniteQuery({ queryKey: ["itinerary-library"], initialPageParam: undefined as { cursor: string; ownerId: string } | undefined,
    queryFn: ({ signal, pageParam }) => client.list(signal, pageParam?.cursor, pageParam?.ownerId),
    getNextPageParam: page => page.nextCursor && page.ownerQualification && client.canPublishLibrary(page) ? { cursor: page.nextCursor, ownerId: page.ownerQualification.ownerId } : undefined });
  const libraryPages = library.data?.pages.filter(client.canPublishLibrary);
  const libraryItems = libraryPages?.length ? libraryPages.flatMap(page => page.items) : undefined;
  const pending = useQuery({ queryKey: ["itinerary-pending"], queryFn: () => client.pending() });
  const id = (selectedOwnerId === ownerId ? selectedId : null) ?? libraryItems?.[0]?.id;
  const detail = useQuery({ queryKey: planKey(id), queryFn: ({ signal }) => client.get(id!, signal, ownerId ?? undefined), enabled: !!id && ownerId !== null });
  const mutation = useMutation({
    mutationFn: (intent: { input: ItineraryCommandInput; expectedOwnerId: string | null; origin?: "history" } | "retry") => intent === "retry" ? client.retry() : client.command(intent.input, intent.expectedOwnerId ?? undefined),
    onSuccess: async plan => {
      if (!client.canPublish(plan)) return;
      const key = planKey(plan.id, plan.ownerId);
      await queryClient.cancelQueries({ queryKey: key });
      if (!client.canPublish(plan)) return;
      const current = queryClient.getQueryData<ItineraryDraft>(key);
      queryClient.setQueryData(key, current && current.ownerId === plan.ownerId && current.revision > plan.revision ? current : plan);
      setSelectedId(plan.id); setSelectedOwnerId(plan.ownerId); setForm(null); setFormOwnerId(null); setEditing(null); setStageError(null); setActive("overview");
      setHistoryOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["itinerary-library"] });
      void queryClient.invalidateQueries({ queryKey: ["itinerary-history", plan.ownerId, plan.id] });
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ["itinerary-pending"] }); },
  });
  const plan = detail.data && client.canPublish(detail.data) ? detail.data : undefined;
  const blocked = authority.status !== "ready" || mutation.isPending || pending.isPending || pending.isError || !!pending.data;
  const begin = (existing?: ItineraryDraft, replaceForm = false) => {
    if (blocked || form && !replaceForm) return;
    mutation.reset(); setStageError(null);
    setFormOwnerId(ownerId);
    setEditing(existing ?? null);
    setForm(existing ? { title: existing.title, timezone: existing.timezone, inputs: { ...existing.inputs }, stages: manualStageInputs(existing.stages, existing.timezone), stagesEdited: false, stageDatesReviewed: false } : {
      title: `${context.observingNight} 观星行程`, timezone: context.timezone,
      inputs: { date: context.observingNight, origin: location.source === "unset" ? "" : context.origin, people: 1, transport: "drive", target: context.target, userType: profile?.observerTypes.map(type => observerTypeLabels[type]).filter(Boolean).join("、") ?? "", latestReturnLocal: null, overnight: false, collaborative: false },
      stages: [], stagesEdited: false, stageDatesReviewed: false,
    });
  };
  const changeInput = <K extends keyof ItineraryDraftInputs>(key: K, value: ItineraryDraftInputs[K]) => {
    if (key === "date") setStageError(null);
    setForm(current => current ? { ...current, inputs: { ...current.inputs, [key]: value }, ...(key === "date" ? { stageDatesReviewed: false } : {}) } : current);
  };
  const changeStages = (stages: ManualStageInput[]) => { setStageError(null); setForm(current => current ? { ...current, stages, stagesEdited: true, stageDatesReviewed: false } : current); };
  const cancelEdit = () => { setForm(null); setFormOwnerId(null); setEditing(null); setStageError(null); };
  const stageDateReviewNeeded = !!editing?.stages.length && form?.inputs.date !== editing.inputs.date;
  const save = () => {
    if (!form || blocked || formOwnerId !== ownerId) return;
    if (stageDateReviewNeeded && !form.stageDatesReviewed) { setStageError("行程日期已改变，请先核对阶段日期与时刻。原安排不会自动平移。"); return; }
    let stagePatch: Pick<ItineraryDraftEditableContent, "stages"> | undefined;
    if (editing && (form.stagesEdited || stageDateReviewNeeded)) {
      if (!form.stages) { setStageError("原阶段暂不能编辑，请使用兼容版本核对；已存安排保持不变。"); return; }
      const checked = resolveManualStages(form.stages, form.timezone);
      if (checked.error !== null) { setStageError(checked.error); return; }
      stagePatch = { stages: checked.stages };
    }
    setStageError(null);
    mutation.mutate({ expectedOwnerId: formOwnerId, input: editing ? { command: "patch-draft", itineraryId: editing.id, baseRevision: editing.revision, patch: { title: form.title, inputs: form.inputs, ...stagePatch } } : { command: "create-draft", input: { title: form.title, timezone: form.timezone, inputs: form.inputs } } });
  };
  return <SafeAreaView testID="screen-itinerary-and-collaboration" style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>行程 · {plan ? `版本 ${plan.revision}` : "私人草稿"}</Text>
      <Text style={styles.title}>{plan?.title ?? "我的行程"}</Text>
      <Text style={styles.subtitle}>先保存出行意向，再补充地点、路线和观测条件。</Text>
      <Pressable testID="itinerary-open-field-mode" onPress={() => router.push("/field")} style={styles.action}><Text style={styles.actionText}>进入现场模式</Text></Pressable>
      <DecisionContextRevision />
      <View testID="itinerary-library" style={styles.summaryCard}>
        <Text style={styles.evidenceTitle}>已保存行程</Text>
        {libraryItems?.map(item => <Pressable key={item.id} disabled={!!form || mutation.isPending} onPress={() => { setSelectedId(item.id); setSelectedOwnerId(ownerId); setActive("overview"); }} style={styles.action}><Text style={styles.evidenceBody}>{item.title} · 版本 {item.revision}</Text></Pressable>)}
        {ownerId && !library.isError && libraryItems?.length === 0 ? <Text testID="itinerary-empty" style={styles.subtitle}>还没有行程。新建草稿，保存日期、出发地和观测目标。</Text> : null}
        {library.hasNextPage ? <Pressable disabled={!ownerId || library.isFetchingNextPage} onPress={() => library.fetchNextPage()} style={styles.action}><Text>读取更早行程</Text></Pressable> : null}
      </View>
      {library.isLoading || detail.isLoading ? <Text style={styles.subtitle}>正在读取行程…</Text> : null}
      {library.isError || detail.isError ? <Pressable onPress={() => { void library.refetch(); if (id) void detail.refetch(); }} style={styles.retry}><Text>读取失败，点按重试</Text></Pressable> : null}
      {authority.status !== "ready" ? <Text testID="itinerary-owner-unconfirmed" style={styles.subtitle}>{authority.status === "denied" ? "当前账户暂不能读取私人行程。原编辑内容和待确认保存已保留。" : "正在核对私人行程的账户…"}</Text> : null}
      <Pressable testID="plan-generate" disabled={blocked || form !== null} onPress={() => begin()} style={styles.action}><Text style={styles.actionText}>新建草稿</Text></Pressable>
      {plan ? <Pressable testID="plan-edit" disabled={blocked || form !== null} onPress={() => begin(plan)} style={styles.action}><Text style={styles.actionText}>编辑草稿</Text></Pressable> : null}
      {plan ? <HistoryAction id="plan-open-history" onPress={() => setHistoryOpen(true)}>版本历史</HistoryAction> : null}
      {historyOpen && plan ? <DraftHistoryPanel key={`${plan.ownerId}:${plan.id}`} client={client} plan={plan} blocked={blocked} editing={form !== null} isSaving={mutation.isPending}
        restoreError={mutation.variables !== "retry" && mutation.variables?.origin === "history" ? mutation.error : null}
        onClose={() => setHistoryOpen(false)} onRestore={(input, expectedOwnerId) => mutation.mutate({ input, expectedOwnerId, origin: "history" })}
        readCurrent={async () => { const result = await detail.refetch(); if (!result.isSuccess || !result.data || !client.canPublish(result.data)) return undefined;
          if (mutation.variables !== "retry" && mutation.variables?.origin === "history" && mutation.error instanceof ItineraryRequestError && mutation.error.code === "itinerary_revision_conflict") mutation.reset();
          return result.data; }} /> : null}
      {pending.isError ? <Pressable onPress={() => pending.refetch()} style={styles.retry}><Text>待确认保存未能读取，请重试</Text></Pressable> : null}
      {pending.data ? <View testID="itinerary-pending" style={styles.panel}><Text style={styles.evidenceTitle}>上次保存待确认</Text><Text style={styles.evidenceBody}>{ownerId && pending.data.ownerQualification?.ownerId === ownerId ? pendingDescription(pending.data) : "原保存内容已保留，请恢复原账户后重试。"}</Text><Pressable testID="plan-retry-save" disabled={mutation.isPending} onPress={() => mutation.mutate("retry")} style={styles.action}><Text>重试保存</Text></Pressable></View> : null}
      {form && formOwnerId !== ownerId ? <View><Text style={styles.subtitle}>原账户的编辑内容已保留，恢复后可继续。</Text><Pressable testID="plan-cancel-edit" disabled={mutation.isPending} onPress={cancelEdit} style={styles.action}><Text>取消编辑</Text></Pressable></View> : null}
      {form && formOwnerId === ownerId && authority.status === "ready" ? <View testID="itinerary-creation-form" style={styles.panel}>
        <Input label="行程名称" value={form.title} onChange={title => setForm(current => current && { ...current, title })} disabled={blocked} />
        <Input label="日期 YYYY-MM-DD" value={form.inputs.date} onChange={value => changeInput("date", value)} disabled={blocked} />
        <Input label="出发地" value={form.inputs.origin} onChange={value => changeInput("origin", value)} disabled={blocked} />
        <Input label="人数" value={String(form.inputs.people)} onChange={value => changeInput("people", Number(value))} disabled={blocked} />
        <Input label="观测目标" value={form.inputs.target} onChange={value => changeInput("target", value)} disabled={blocked} />
        <Input label="用户类型" value={form.inputs.userType} onChange={value => changeInput("userType", value)} disabled={blocked} />
        <Input label="最晚返回 HH:mm（可不填）" value={form.inputs.latestReturnLocal ?? ""} onChange={value => changeInput("latestReturnLocal", value || null)} disabled={blocked} />
        <Text style={styles.evidenceMeta}>时区 {form.timezone} · 当前仅个人编辑</Text>
        <View style={styles.actions}>{([ ["drive", "驾车"], ["walk", "步行"], ["mixed", "混合交通"] ] as const).map(([value, label]) => <Pressable key={value} disabled={blocked} onPress={() => changeInput("transport", value)} style={styles.action}><Text>{form.inputs.transport === value ? "已选 · " : ""}{label}</Text></Pressable>)}</View>
        <Pressable disabled={blocked} onPress={() => changeInput("overnight", !form.inputs.overnight)} style={styles.action}><Text>{form.inputs.overnight ? "已选过夜" : "不计划过夜"}</Text></Pressable>
        {editing ? form.stages ? <ManualStageEditor key={`${editing.ownerId}:${editing.id}:${editing.revision}`} values={form.stages} timezone={form.timezone} observingDate={form.inputs.date} disabled={blocked} onChange={changeStages} onError={setStageError} /> : <Text style={styles.subtitle}>原阶段暂不能手工编辑，已存内容保留；名称等基本信息仍可保存。</Text> : <Text style={styles.evidenceMeta}>先保存草稿，再编辑出发、勘察、观测或返回阶段。</Text>}
        {stageDateReviewNeeded ? <View style={styles.comparison}><Text style={styles.subtitle}>{`行程日期已改为 ${form.inputs.date}，阶段时刻不会自动平移。请核对上方安排。`}</Text><HistoryAction id="plan-confirm-stage-dates" disabled={blocked || form.stages === null} onPress={() => { setStageError(null); setForm(current => current ? { ...current, stageDatesReviewed: true } : current); }}>{form.stageDatesReviewed ? "已核对阶段" : "保留这些时刻"}</HistoryAction></View> : null}
        {stageError ? <Text testID="plan-stage-error" style={styles.error}>{stageError}</Text> : null}
        {pending.data ? <Text style={styles.subtitle}>取消编辑不会撤回上次待确认的保存，请继续确认原保存。</Text> : null}
        <Pressable testID="plan-save-draft" disabled={blocked} onPress={save} style={styles.action}><Text style={styles.actionText}>{mutation.isPending ? "正在保存…" : "保存草稿"}</Text></Pressable>
        <Pressable testID="plan-cancel-edit" disabled={mutation.isPending} onPress={cancelEdit} style={styles.action}><Text>取消编辑</Text></Pressable>
      </View> : null}
      <View style={styles.actions}>{actions.map(item => <Pressable key={item.key} testID={item.id} onPress={() => setActive(item.key)} style={styles.action}><Text style={styles.actionText}>{item.label}</Text></Pressable>)}</View>
      {plan ? <Panel active={active} plan={plan} /> : null}
      {mutation.isError && !(historyOpen && mutation.variables !== "retry" && mutation.variables?.origin === "history") ? <View><Text style={styles.error}>{errorText(mutation.error)}</Text>{mutation.error instanceof ItineraryRequestError && mutation.error.code === "itinerary_revision_conflict" ? <Pressable onPress={async () => { const refreshed = await detail.refetch(); if (refreshed.data && client.canPublish(refreshed.data)) begin(refreshed.data, true); }} style={styles.retry}><Text>保留已存内容，重新编辑</Text></Pressable> : null}</View> : null}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 },
  eyebrow: {
    color: palette.primaryActive,
    fontSize: typeToken.label,
    fontWeight: "700",
  },
  title: { color: palette.text, fontSize: typeToken.title, fontWeight: "700" },
  subtitle: {
    color: palette.textSecondary,
    fontSize: typeToken.body,
    lineHeight: 23,
  },
  summaryCard: {
    minHeight: 86,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.control,
    backgroundColor: palette.surface,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 },
  action: {
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
  },
  actionText: {
    color: palette.text,
    fontSize: typeToken.label,
    fontWeight: "700",
  },
  panel: {
    gap: spacing.x1,
    padding: spacing.x2,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.layer,
    backgroundColor: palette.surface,
  },
  evidence: {
    minHeight: 86,
    padding: 12,
    borderRadius: radii.control,
    backgroundColor: palette.surfaceMuted,
  },
  evidenceTitle: {
    color: palette.text,
    fontSize: typeToken.body,
    fontWeight: "700",
  },
  evidenceBody: {
    marginTop: 5,
    color: palette.text,
    fontSize: typeToken.label,
    lineHeight: 19,
  },
  evidenceMeta: {
    marginTop: 5,
    color: palette.textSecondary,
    fontSize: typeToken.caption,
    lineHeight: 17,
  },
  retry: {
    padding: 14,
    backgroundColor: palette.surface,
    borderRadius: radii.control,
  },
  error: { color: palette.danger, fontSize: typeToken.label },
  pressed: { opacity: 0.7 },
  comparison: { gap: spacing.x1 },
  difference: { paddingVertical: spacing.x1, borderTopWidth: 1, borderColor: palette.border },
});
