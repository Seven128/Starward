import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, minimumTouchTarget, radii, spacing, type ColorPalette, type as typography } from "@starward/ui-system/tokens";
import { createFieldReportsClient, FieldReportRequestError, type FieldReportCommandInput, type FieldReportDraft, type FieldReportInput } from "../../data/field-reports-client";
import { resolveRuntimeApiBaseUrl } from "../../data/runtime-api-base-url";
import { useShellStore } from "../../state/shell-store";

const defaultClient = createFieldReportsClient({ baseUrl: resolveRuntimeApiBaseUrl() });
const categoryLabels: Record<FieldReportInput["category"], string> = { sky: "天空", weather: "天气", access: "到达", other: "其他" };
function errorText(error: unknown): string {
  if (error instanceof FieldReportRequestError) {
    if (error.code === "field_report_api_base_url_missing") return "记录服务未配置，尚未提交。";
    if (error.code === "field_report_pending_owner_unqualified") return "旧保存的归属尚未确认，暂不能重发。原内容已保留。";
    if (error.code === "field_report_owner_mismatch") return "请恢复原保存账户后重试，原内容已保留。";
    if (error.code === "field_report_owner_unconfirmed" || error.code === "field_report_owner_changed") return "保存账户尚未核对，未提交新内容。请重新读取记录。";
    if (error.code === "field_report_revision_conflict") return "记录已有新版本，未覆盖它。你的修改已保留，可核对新版或另存记录。";
    if (error.code === "field_report_owner_required") return "私人记录目前仅在本机个人试用服务中可用，尚未确认本次保存。";
    if (error.code === "field_report_request_body_too_large" && error.rejected) return "内容过长，尚未保存。请缩短后重试。";
    if (error.rejected) return "未保存，请检查地点、记录内容和带时区的时间。原记录保持不变。";
  }
  return "保存结果尚未确认。原始内容已保留，请重试同一次保存。";
}
function FieldButton({ id, children, onPress, palette, disabled = false }: { id: string; children: ReactNode; onPress(): void; palette: ColorPalette; disabled?: boolean }) {
  return <Pressable testID={id} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, { backgroundColor: pressed ? palette.surfaceMuted : palette.surface, borderColor: palette.border, opacity: disabled ? 0.55 : 1 }]}><Text style={{ color: palette.text }}>{children}</Text></Pressable>;
}
function ReportField({ label, value, onChange, palette, editable, multiline = false }: { label: string; value: string; onChange(value: string): void; palette: ColorPalette; editable: boolean; multiline?: boolean }) {
  return <View><Text style={{ color: palette.text }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={editable} multiline={multiline} autoCapitalize="none" keyboardAppearance="dark" style={[styles.input, multiline && styles.note, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} /></View>;
}
export function FieldReportsPanel({ client = defaultClient }: { client?: ReturnType<typeof createFieldReportsClient> } = {}) {
  const context = useShellStore(state => state.decisionContext), spot = useShellStore(state => state.selectedSpot), location = useShellStore(state => state.location);
  const profile = useShellStore(state => state.profiles.find(item => item.id === state.decisionContext.profileId));
  const mode = useShellStore(state => state.displayMode), palette = colors[mode];
  const [form, setForm] = useState<FieldReportInput | null>(null), [editing, setEditing] = useState<FieldReportDraft | null>(null), [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOwnerId, setFormOwnerId] = useState<string | null>(null), [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const authority = useSyncExternalStore(client.subscribeAuthority, client.authority, client.authority);
  const ownerId = authority.status === "ready" ? authority.ownerId : null;
  const reportKey = (id: string | null, owner = ownerId) => ["field-report", owner, id];
  const [keyboardConfirmed, setKeyboardConfirmed] = useState(false);
  useEffect(() => { setKeyboardConfirmed(false); if (mode === "redLight") Keyboard.dismiss(); }, [mode]);
  const cache = useQueryClient();
  const library = useInfiniteQuery({ queryKey: ["field-reports"], initialPageParam: undefined as { cursor: string; ownerId: string } | undefined,
    queryFn: ({ signal, pageParam }) => client.list(signal, pageParam?.cursor, pageParam?.ownerId),
    getNextPageParam: page => page.nextCursor && page.ownerQualification && client.canPublishLibrary(page) ? { cursor: page.nextCursor, ownerId: page.ownerQualification.ownerId } : undefined });
  const pending = useQuery({ queryKey: ["field-report-pending"], queryFn: client.pending });
  const activeId = selectedOwnerId === ownerId ? selectedId : null;
  const current = useQuery({ queryKey: reportKey(activeId), queryFn: ({ signal }) => client.get(activeId!, signal, ownerId ?? undefined), enabled: activeId !== null && ownerId !== null });
  const mutation = useMutation({
    mutationFn: (intent: { input: FieldReportCommandInput; expectedOwnerId: string | null } | "retry") => intent === "retry" ? client.retry() : client.command(intent.input, intent.expectedOwnerId ?? undefined),
    onSuccess: async report => {
      if (!client.canPublish(report)) return;
      const key = reportKey(report.id, report.ownerId);
      await cache.cancelQueries({ queryKey: key });
      if (!client.canPublish(report)) return;
      const existing = cache.getQueryData<FieldReportDraft>(key);
      cache.setQueryData(key, existing && existing.ownerId === report.ownerId && existing.revision > report.revision ? existing : report);
      setSelectedId(report.id); setSelectedOwnerId(report.ownerId); setForm(null); setFormOwnerId(null); setEditing(null); Keyboard.dismiss();
      void cache.invalidateQueries({ queryKey: ["field-reports"] });
    },
    onSettled: () => { void cache.invalidateQueries({ queryKey: ["field-report-pending"] }); },
  });
  const blocked = authority.status !== "ready" || mutation.isPending || pending.isPending || pending.isError || !!pending.data;
  const begin = (report?: FieldReportDraft) => {
    if (blocked || form) return;
    mutation.reset(); setEditing(report ?? null); setFormOwnerId(ownerId); setKeyboardConfirmed(false);
    // A new note snapshots only explicitly available native App choices.
    // An open or saved note never follows a later browsing Context change.
    setForm(report ? structuredClone(report.input) : {
      observedAt: context.moment, place: spot ? { label: spot.name, spotId: spot.id } : { label: location.source === "unset" ? "" : location.label }, category: "other", note: "",
      context: { revision: context.revision, observingNight: context.observingNight, moment: context.moment, timezone: context.timezone, target: context.target, profileId: context.profileId, profileRevision: profile?.revision ?? null },
    });
  };
  const update = (patch: Partial<FieldReportInput>) => setForm(prior => prior && ({ ...prior, ...patch }));
  const text = [styles.text, { color: palette.text }], muted = [styles.text, { color: palette.textSecondary }];
  const libraryPages = library.data?.pages.filter(client.canPublishLibrary);
  const items = libraryPages?.length ? libraryPages.flatMap(page => page.items) : undefined, report = current.data && client.canPublish(current.data) ? current.data : undefined;
  const typingAllowed = !blocked && (mode !== "redLight" || keyboardConfirmed);
  return <View testID="field-private-reports" style={styles.panel}>
    <Text style={[styles.title, { color: palette.text }]}>现场记录</Text>
    <Text style={muted}>私人草稿需联网保存。尚未公开或送审，也未接入本机离线队列、图片与补传。</Text>
    <FieldButton palette={palette} id="field-new-report" onPress={() => begin()} disabled={blocked || form !== null}>新建记录</FieldButton>
    {pending.isError ? <View><Text style={text}>待确认保存读取失败，暂不能提交新记录。</Text><FieldButton palette={palette} id="field-retry-pending" onPress={() => { void pending.refetch(); }}>重新读取</FieldButton></View> : null}
    {pending.data ? <View testID="field-report-pending" style={styles.panel}><Text style={text}>上次保存待确认</Text>{ownerId && pending.data.ownerQualification?.ownerId === ownerId ? <View><Text style={text}>{`${pending.data.input.place.label} · ${pending.data.input.observedAt}`}</Text><Text style={text}>{pending.data.input.note}</Text></View> : <Text style={text}>原保存内容已保留，请恢复原账户后重试。</Text>}<FieldButton palette={palette} id="field-retry-save" onPress={() => mutation.mutate("retry")} disabled={mutation.isPending}>重试保存</FieldButton></View> : null}
    {mutation.isError ? <Text testID="field-report-save-error" style={[styles.text, { color: palette.danger }]}>{errorText(mutation.error)}</Text> : null}
    {library.isPending ? <Text style={muted}>正在读取记录…</Text> : library.isError ? <View><Text style={text}>记录列表读取失败。</Text><FieldButton palette={palette} id="field-retry-list" onPress={() => { void library.refetch(); }}>重新读取</FieldButton></View> : <View style={styles.panel}>
      {ownerId && items?.length === 0 ? <Text testID="field-report-empty" style={muted}>还没有现场记录。</Text> : null}
      {items?.map(item => <FieldButton palette={palette} key={item.id} id={`field-report-${item.id}`} onPress={() => { setSelectedId(item.id); setSelectedOwnerId(ownerId); }} disabled={blocked || form !== null}>{`${item.input.place.label} · ${item.input.observedAt} · 版本 ${item.revision}`}</FieldButton>)}
      {library.hasNextPage ? <FieldButton palette={palette} id="field-more-reports" onPress={() => { void library.fetchNextPage(); }} disabled={!ownerId || library.isFetchingNextPage}>更多记录</FieldButton> : null}
    </View>}
    {authority.status !== "ready" ? <Text testID="field-report-owner-unconfirmed" style={muted}>{authority.status === "denied" ? "当前账户暂不能读取私人记录。原编辑内容和待确认保存已保留。" : "正在核对私人记录的账户…"}</Text> : null}
    {current.isFetching && selectedId ? <Text style={muted}>正在核对当前记录…</Text> : null}
    {current.isError ? <View><Text style={text}>当前记录未能核对，暂不能编辑旧资料。</Text><FieldButton palette={palette} id="field-retry-current" onPress={() => { void current.refetch(); }}>重新读取</FieldButton></View> : null}
    {report && !current.isError ? <View testID="field-report-current" style={styles.panel}>
      <Text style={[styles.title, { color: palette.text }]}>{`私人草稿已保存 · 版本 ${report.revision}`}</Text>
      <Text style={text}>{`${report.input.place.label} · ${report.input.observedAt}`}</Text>
      <Text style={text}>{`${categoryLabels[report.input.category]} · 用户填写，尚未送审`}</Text>
      <Text testID="field-report-content" style={text}>{report.input.note}</Text>
      <Text style={muted}>{`写作时的选择：${report.input.context.observingNight} · ${report.input.context.target} · ${report.input.context.timezone}`}</Text>
      <FieldButton palette={palette} id="field-edit-report" onPress={() => begin(report)} disabled={blocked || form !== null || current.isFetching}>编辑记录</FieldButton>
    </View> : null}
    {form && formOwnerId !== ownerId ? <View><Text style={muted}>原账户的编辑内容已保留，恢复后可继续。</Text><FieldButton palette={palette} id="field-cancel-edit" onPress={() => { Keyboard.dismiss(); setForm(null); setFormOwnerId(null); setEditing(null); mutation.reset(); }} disabled={mutation.isPending}>取消编辑</FieldButton></View> : null}
    {form && formOwnerId === ownerId && authority.status === "ready" ? <View testID="field-report-editor" style={styles.panel}>
      <Text style={[styles.title, { color: palette.text }]}>{editing ? `编辑版本 ${editing.revision}` : "新建记录"}</Text>
      <Text style={muted}>地点和时间取自打开时的选择，请核对后保存；不会据此认证到访或生成天气事实。</Text>
      {mode === "redLight" && !keyboardConfirmed ? <View testID="field-report-keyboard-warning" style={styles.panel}><Text style={text}>系统键盘可能较亮。继续填写会打开系统输入；也可以保留红光、稍后填写。</Text><FieldButton palette={palette} id="field-report-allow-keyboard" onPress={() => setKeyboardConfirmed(true)} disabled={blocked}>继续填写</FieldButton><FieldButton palette={palette} id="field-report-defer-keyboard" onPress={() => { setForm(null); setEditing(null); }} disabled={blocked}>稍后填写</FieldButton></View> : null}
      <ReportField label="记录地点" palette={palette} editable={typingAllowed} value={form.place.label} onChange={label => update({ place: { label } })} />
      <ReportField label="记录时间 UTC 或带时差" palette={palette} editable={typingAllowed} value={form.observedAt} onChange={observedAt => update({ observedAt })} />
      <Text style={text}>{`类别：${categoryLabels[form.category]}`}</Text><View style={styles.row}>{(Object.keys(categoryLabels) as FieldReportInput["category"][]).map(category => <FieldButton palette={palette} key={category} id={`field-report-category-${category}`} onPress={() => update({ category })} disabled={blocked}>{`${form.category === category ? "已选 · " : ""}${categoryLabels[category]}`}</FieldButton>)}</View>
      <ReportField label="记录内容" palette={palette} editable={typingAllowed} multiline value={form.note} onChange={note => update({ note })} />
      <Text style={muted}>保存完整私人文字草稿，不会自动上传图片或发送消息。</Text>
      {form.context.profileRevision === null ? <Text style={muted}>所选预设尚未读取，记录中保留为未知版本。</Text> : null}
      <View style={styles.row}><FieldButton palette={palette} id="field-save-draft" onPress={() => mutation.mutate({ expectedOwnerId: formOwnerId, input: editing ? { command: "update-report-draft", reportId: editing.id, baseRevision: editing.revision, input: form } : { command: "create-report-draft", input: form } })} disabled={blocked}>{mutation.isPending ? "正在保存…" : "保存草稿"}</FieldButton><FieldButton palette={palette} id="field-cancel-edit" onPress={() => { Keyboard.dismiss(); setForm(null); setFormOwnerId(null); setEditing(null); mutation.reset(); }} disabled={mutation.isPending}>取消编辑</FieldButton></View>
      {mutation.error instanceof FieldReportRequestError && mutation.error.code === "field_report_revision_conflict" ? <View style={styles.panel}><FieldButton palette={palette} id="field-load-latest" onPress={() => { void current.refetch(); }}>读取当前版本</FieldButton><FieldButton palette={palette} id="field-save-as-new" onPress={() => { setEditing(null); mutation.reset(); }} disabled={blocked}>保留修改，另存记录</FieldButton><Text style={muted}>当前修改不会自动覆盖新版。取消编辑后可编辑最新记录。</Text></View> : null}
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({ panel: { gap: spacing.sm }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, title: { fontSize: typography.section, fontWeight: "700" }, text: { fontSize: typography.body, lineHeight: typography.bodyLineHeight }, button: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderRadius: radii.control, justifyContent: "center" }, input: { minHeight: minimumTouchTarget, borderWidth: 1, borderRadius: radii.control, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, note: { minHeight: 120, textAlignVertical: "top" } });
