import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BASE_CHECKLIST,
  mergeChecklist,
  saveShootingPlanVersion,
  type ChecklistItem,
  type ShootingPlanVersion,
} from "@starward/domain/shooting";
import {
  colors,
  minimumTouchTarget,
  radii,
  spacing,
  type as typeToken,
} from "@starward/ui-system/tokens";
import {
  createShootingClient,
  type ShootingPreview,
} from "../../data/shooting-client";
import {
  loadLocalChecklist,
  loadLocalShootingVersions,
  saveLocalChecklist,
  saveLocalShootingVersion,
} from "../../data/shooting-storage";
import { resolveRuntimeApiBaseUrl } from "../../data/runtime-api-base-url";
import { DecisionContextRevision } from "../../shell/DecisionContextRevision";
import { useTabRestorationEvidence } from "../../shell/TabRestorationEvidence";
import { useShellStore } from "../../state/shell-store";

type ViewKey = "mobile" | "camera" | "preset" | "checklist" | "version" | "ai";
const palette = colors.planning;
const client = createShootingClient({ baseUrl: resolveRuntimeApiBaseUrl() });
const actions = [
  {
    key: "mobile",
    id: "shooting-create-mobile-plan",
    label: "手机方案",
    stableControlId: "shooting-setup-form",
    accessibilityName: "拍摄器材与条件设置",
  },
  {
    key: "camera",
    id: "shooting-create-camera-plan",
    label: "相机方案",
    stableControlId: "shooting-recommendation",
    accessibilityName: "确定性拍摄建议",
  },
  {
    key: "preset",
    id: "shooting-apply-preset",
    label: "预设",
    stableControlId: "shooting-preset-picker",
    accessibilityName: "拍摄预设选择",
  },
  {
    key: "checklist",
    id: "shooting-save-checklist",
    label: "清单",
    stableControlId: "shooting-checklist",
    accessibilityName: "离线拍摄清单",
  },
  {
    key: "version",
    id: "shooting-save-version",
    label: "保存版本",
    stableControlId: "save-shooting-plan",
    accessibilityName: "保存版本化拍摄方案",
  },
  {
    key: "ai",
    id: "shooting-open-ai-explanation",
    label: "为什么",
    stableControlId: "ai-explanation-panel",
    accessibilityName: "查看规则解释",
  },
] as const;
function Evidence({
  testID,
  title,
  body,
  meta,
}: {
  testID: string;
  title: string;
  body: string;
  meta?: string;
}) {
  return (
    <View testID={testID} style={styles.evidence}>
      <Text style={styles.evidenceTitle}>{title}</Text>
      <Text style={styles.evidenceBody}>{body}</Text>
      {meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}
    </View>
  );
}
function State({
  title,
  body,
  retry,
}: {
  title: string;
  body: string;
  retry?: () => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.evidenceTitle}>{title}</Text>
      <Text style={styles.evidenceBody}>{body}</Text>
      {retry ? (
        <Pressable onPress={retry} style={styles.retry}>
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
function SectionTitle({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}
function FieldValue({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PlanPanels({
  data,
  active,
}: {
  data: ShootingPreview;
  active: ViewKey;
}) {
  const camera = data.camera;
  if (active === "camera")
    return (
      <View style={styles.panel}>
        <Evidence
          testID="shooting-camera-settings"
          title={`f/${camera.result.settings.aperture} · ${camera.result.settings.shutterSeconds} 秒 · ISO ${camera.result.settings.iso}`}
          body={`${camera.result.settings.focus} · 间隔 ${camera.result.settings.intervalSeconds} 秒 · 堆栈 ${camera.result.settings.stackingFrames} 张 · 长曝降噪 ${camera.result.settings.longExposureNoiseReduction ? "开" : "关"}`}
          meta={`${camera.result.ruleVersion} · 条件批次可追溯`}
        />
        <Evidence
          testID="shooting-lens-field"
          title={`${camera.result.settings.focalLengthMm} mm · 横向银河构图`}
          body={String(camera.result.settings.composition)}
          meta="实际焦段和传感器尺寸共同参与拖线限制。"
        />
        <Evidence
          testID="shooting-risk-note"
          title="拖线风险 · 必须先试拍"
          body={`${camera.result.risks.join("；")}；替代：${camera.result.alternatives.join("；")}`}
        />
      </View>
    );
  if (active === "preset")
    return (
      <View style={styles.panel}>
        <Evidence
          testID="shooting-preset-source"
          title="空间站轨迹 · V3 预设"
          body="当前缺少已验证的过境轨迹与设备曝光规则"
          meta="依赖新鲜 OMM、目标角速度和摄影专家验证。"
        />
        <Evidence
          testID="shooting-preset-assumptions"
          title="适用条件尚不完整"
          body="不会生成无依据完整参数；保留地点、时间、设备和基础构图输入。"
        />
        <Evidence
          testID="shooting-preset-adjustment"
          title="进入自定义"
          body="改选已有确定性规则，或补齐目标运动与器材参数。"
        />
      </View>
    );
  if (active === "ai")
    return (
      <View style={styles.panel}>
        <Evidence
          testID="shooting-rule-result"
          title={`规则结果 · ISO ${camera.result.settings.iso} / ${camera.result.settings.shutterSeconds} 秒 / f${camera.result.settings.aperture}`}
          body={camera.result.risks.join("；")}
          meta={camera.result.ruleVersion}
        />
        <Evidence
          testID="shooting-ai-explanation"
          title="规则解释可用"
          body="AI 服务未启用；当前解释直接来自版本化规则、器材输入和已展示条件。"
          meta="精确位置、路线、身份、媒体与 EXIF 不发送。"
        />
        <Evidence
          testID="shooting-ai-boundary"
          title="不会编造或覆盖规则参数"
          body="未来 AI 只能解释取舍；失败、超时或撤回同意不改变确定性结果。"
        />
      </View>
    );
  return null;
}

function ChecklistPanel({
  items,
  revision,
  onSave,
}: {
  items: ChecklistItem[];
  revision: number;
  onSave: (items: ChecklistItem[]) => void;
}) {
  const done = items.filter((item) => item.done).length;
  return (
    <View style={styles.panel}>
      <Evidence
        testID="shooting-checklist-items"
        title={`清单 ${done}/${items.length}`}
        body={items
          .map((item) => `${item.done ? "✓" : "○"} ${item.label}`)
          .join(" · ")}
        meta="出发前与现场基础项均可恢复。"
      />
      <Pressable
        onPress={() =>
          onSave(
            items.map((item, index) =>
              index === done ? { ...item, done: true } : item,
            ),
          )
        }
      >
        <Evidence
          testID="shooting-checklist-offline"
          title={`离线可用 · 本地 revision ${revision}`}
          body="点击勾选即先写本机；后续同步必须携带 revision 与幂等键。"
        />
      </Pressable>
      <Evidence
        testID="shooting-checklist-progress"
        title="关键礼仪保留"
        body="关闭自动闪光，避免白光干扰；关键基础项不会被空模板删除。"
      />
    </View>
  );
}

export function ShootingScreen() {
  const restoration = useTabRestorationEvidence({
    testID: "tab-restoration-sky",
    tabId: "primary-tab-sky",
    rootRoute: "/sky",
    nestedRoute: "/shooting",
    ownerType: "canvas",
    ownerId: "sky-shooting-canvas-owner",
  });
  const location = useShellStore((state) => state.location);
  const profiles = useShellStore((state) => state.profiles);
  const activeProfileId = useShellStore((state) => state.activeProfileId);
  const profile = profiles.find((item) => item.id === activeProfileId);
  const [active, setActive] = useState<ViewKey>("camera");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    mergeChecklist([], []),
  );
  const [checklistRevision, setChecklistRevision] = useState(1);
  const [saved, setSaved] = useState<ShootingPlanVersion[]>([]);
  const scheduledAt = useMemo(
    () => new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
    [],
  );
  const nightDate = scheduledAt.slice(0, 10);
  const focalLengthMm = profile?.lensFocalLengthsMm[0] ?? 24;
  const query = useQuery({
    queryKey: [
      "shooting-preview",
      location.latitude,
      location.longitude,
      scheduledAt,
      focalLengthMm,
    ],
    queryFn: ({ signal }) =>
      client.get(
        {
          latitude: location.latitude ?? 22.529,
          longitude: location.longitude ?? 113.9468,
          timezone: "Asia/Shanghai",
          nightDate,
          locationId: location.label || "manual-location",
          scheduledAt,
          focalLengthMm,
          acceptsStacking: true,
        },
        signal,
      ),
    retry: 1,
  });
  useEffect(() => {
    void Promise.all([loadLocalChecklist(), loadLocalShootingVersions()]).then(
      ([local, versions]) => {
        if (local) {
          setChecklist(mergeChecklist(local.items, []));
          setChecklistRevision(local.revision);
        }
        setSaved(versions);
      },
    );
  }, []);
  const persistChecklist = (items: ChecklistItem[]) => {
    const revision = checklistRevision + 1;
    setChecklist(items);
    setChecklistRevision(revision);
    void saveLocalChecklist(items, revision);
  };
  const persistVersion = () => {
    if (!query.data) return;
    const previous = saved.at(-1) ?? null;
    const next = saveShootingPlanVersion(
      previous,
      query.data.camera.input,
      { iso: query.data.camera.result.settings.iso },
      new Date().toISOString(),
    );
    void saveLocalShootingVersion(next).then(() =>
      setSaved((all) => [...all, next]),
    );
    setActive("version");
  };
  const camera = query.data?.camera;
  return (
    <SafeAreaView testID="screen-shooting-assistant" style={styles.screen}>
      <ScrollView
        onScroll={restoration.onScroll}
        scrollEventThrottle={restoration.scrollEventThrottle}
        contentContainerStyle={styles.content}
      >
        {restoration.evidence}
        <Text testID={query.data ? "shooting-data-ready" : undefined} style={styles.eyebrow}>摄影助手</Text>
        <Text style={styles.title}>银河广角 · 样例计划</Text>
        <Text style={styles.subtitle}>
          先给可执行参数，再展开假设；不保证成片或现场条件。
        </Text>
        <DecisionContextRevision />
        {query.isLoading ? (
          <State
            title="正在生成拍摄方案…"
            body="服务端正在读取天气、月光、目标高度与来源批次，再运行确定性规则。"
          />
        ) : null}
        {query.isError ? (
          <State
            title="拍摄条件暂不可用"
            body="不会以内置天气或曝光数字替代失败结果。"
            retry={() => void query.refetch()}
          />
        ) : null}
        <Pressable
          testID={actions[0].id}
          accessibilityRole="button"
          accessibilityLabel={`${actions[0].stableControlId}:${actions[0].accessibilityName}`}
          accessibilityState={{ selected: active === "mobile" }}
          onPress={() => setActive("mobile")}
          style={styles.section}
        >
          <SectionTitle title="器材设置" meta="本机档案" />
          <View style={styles.fieldGrid}>
            <FieldValue
              testID="shooting-phone-model"
              label="机身 *"
              value={query.data?.phone.input.equipment.model ?? "正在读取"}
            />
            <FieldValue label="镜头 *" value="24 mm F1.4" />
            <FieldValue label="焦距" value={`${focalLengthMm} mm`} />
            <FieldValue label="跟踪" value="固定三脚架" />
          </View>
        </Pressable>
        <Pressable
          testID={actions[2].id}
          accessibilityRole="button"
          accessibilityLabel={`${actions[2].stableControlId}:${actions[2].accessibilityName}`}
          accessibilityState={{ selected: active === "preset" }}
          onPress={() => setActive("preset")}
          style={styles.section}
        >
          <SectionTitle title="拍摄预设" meta="三选一" />
          <View style={styles.presetRow}>
            <View style={styles.presetSelected}>
              <Text style={styles.presetSelectedText}>银河广角</Text>
            </View>
            <View style={styles.preset}>
              <Text style={styles.presetText}>星轨</Text>
            </View>
            <View style={styles.preset}>
              <Text style={styles.presetText}>深空入门</Text>
            </View>
          </View>
        </Pressable>
        <Pressable
          testID={actions[1].id}
          accessibilityRole="button"
          accessibilityLabel={`${actions[1].stableControlId}:${actions[1].accessibilityName}`}
          accessibilityState={{ selected: active === "camera" }}
          onPress={() => setActive("camera")}
          style={[styles.section, styles.recommendation]}
        >
          <SectionTitle title="建议参数" meta="规则化估算" />
          <View style={styles.metricGrid}>
            <Metric
              value={`${camera?.result.settings.shutterSeconds ?? "—"}s`}
              label="快门"
            />
            <Metric
              value={`F${camera?.result.settings.aperture ?? "—"}`}
              label="光圈"
            />
            <Metric
              value={String(camera?.result.settings.iso ?? "—")}
              label="ISO"
            />
            <Metric
              value={String(camera?.result.settings.stackingFrames ?? "—")}
              label="张数"
            />
          </View>
          {query.data ? (
            <>
              <Text
                testID="shooting-mobile-settings"
                style={styles.inlineEvidence}
              >
                曝光{" "}
                {query.data.phone.result.settings.shutterSeconds ??
                  "设备夜景模式"}{" "}
                秒 · ISO {query.data.phone.result.settings.iso ?? "由设备控制"}{" "}
                · 堆栈 {query.data.phone.result.settings.stackingFrames} 帧
              </Text>
              <Text testID="shooting-mobile-risk" style={styles.inlineRisk}>
                先试拍并放大检查 ·{" "}
                {[
                  ...query.data.phone.result.risks,
                  ...query.data.phone.result.alternatives,
                ].join("；")}
              </Text>
            </>
          ) : null}
          <View style={styles.applyButton}>
            <Text style={styles.applyButtonText}>应用到检查清单</Text>
          </View>
        </Pressable>
        <Pressable
          testID={actions[5].id}
          accessibilityRole="button"
          accessibilityLabel={`${actions[5].stableControlId}:${actions[5].accessibilityName}`}
          accessibilityState={{
            selected: active === "ai",
            expanded: active === "ai",
          }}
          onPress={() => setActive("ai")}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            查看依据、假设与不确定性
          </Text>
        </Pressable>
        <Pressable
          testID={actions[3].id}
          accessibilityRole="button"
          accessibilityLabel={`${actions[3].stableControlId}:${actions[3].accessibilityName}`}
          accessibilityState={{ selected: active === "checklist" }}
          onPress={() => setActive("checklist")}
          style={styles.section}
        >
          <SectionTitle
            title="出发前检查"
            meta={`${checklist.filter((item) => item.done).length} / ${checklist.length} 完成`}
          />
          <Text style={styles.checklistPreview}>
            {checklist
              .map((item) => `${item.done ? "✓" : "○"} ${item.label}`)
              .join("\n")}
          </Text>
        </Pressable>
        <Pressable
          testID={actions[4].id}
          accessibilityRole="button"
          accessibilityLabel={`${actions[4].stableControlId}:${actions[4].accessibilityName}`}
          accessibilityState={{ selected: active === "version", busy: false }}
          onPress={persistVersion}
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>
            保存到行程 revision r{(saved.at(-1)?.revision ?? 0) + 1}
          </Text>
        </Pressable>
        {query.data ? <PlanPanels data={query.data} active={active} /> : null}
        {active === "checklist" ? (
          <ChecklistPanel
            items={checklist}
            revision={checklistRevision}
            onSave={persistChecklist}
          />
        ) : null}
        {active === "version" && query.data ? (
          <View style={styles.panel}>
            <Evidence
              testID="shooting-plan-version"
              title={`拍摄方案版本 ${saved.at(-1)?.revision ?? 1}`}
              body={`规则 ${query.data.camera.result.ruleVersion} · 条件 ${query.data.conditions.capturedAt}`}
              meta="本地离线版本已保存；加入行程时引用明确 revision。"
            />
            <Evidence
              testID="shooting-change-summary"
              title="变化摘要"
              body="条件批次、器材输入、规则结果与用户 ISO 覆盖分别保存；重算不覆盖旧版本。"
            />
            <Evidence
              testID="shooting-restore-version"
              title={`可恢复历史 ${Math.max(0, saved.length - 1)} 个`}
              body="旧输入、条件快照、规则结果和用户覆盖保持不可变。"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  content: { padding: spacing.x2, paddingBottom: 48, gap: 12 },
  eyebrow: {
    color: palette.textSecondary,
    fontSize: typeToken.caption,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: { color: palette.text, fontSize: typeToken.title, fontWeight: "700" },
  subtitle: { color: palette.textSecondary, lineHeight: 21 },
  section: {
    minHeight: minimumTouchTarget,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHeading: {
    color: palette.text,
    fontSize: typeToken.section,
    fontWeight: "700",
  },
  sectionMeta: { color: palette.textSecondary, fontSize: typeToken.caption },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: {
    width: "48%",
    minHeight: 58,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.control,
    backgroundColor: palette.surface,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: typeToken.caption,
    fontWeight: "700",
  },
  fieldValue: { marginTop: 6, color: palette.text, fontSize: typeToken.label },
  presetRow: { flexDirection: "row", gap: 8 },
  preset: {
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.control,
    backgroundColor: palette.surface,
  },
  presetSelected: {
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radii.control,
    backgroundColor: palette.text,
  },
  presetText: { color: palette.text, fontWeight: "700" },
  presetSelectedText: { color: palette.surface, fontWeight: "700" },
  recommendation: {
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.control,
    backgroundColor: palette.surfaceMuted,
  },
  metricGrid: { flexDirection: "row" },
  metric: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  metricValue: { color: palette.text, fontWeight: "700" },
  metricLabel: {
    marginTop: 4,
    color: palette.textSecondary,
    fontSize: typeToken.caption,
  },
  inlineEvidence: {
    marginTop: 8,
    color: palette.text,
    fontSize: typeToken.caption,
    fontWeight: "700",
  },
  inlineRisk: {
    marginTop: 4,
    color: palette.textSecondary,
    fontSize: typeToken.caption,
  },
  applyButton: {
    minHeight: minimumTouchTarget,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    backgroundColor: palette.text,
  },
  applyButtonText: { color: palette.surface, fontWeight: "700" },
  secondaryButton: {
    minHeight: minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.control,
    backgroundColor: palette.surface,
  },
  secondaryButtonText: { color: palette.text, fontWeight: "700" },
  checklistPreview: { color: palette.text, lineHeight: 24 },
  saveButton: {
    minHeight: minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: radii.control,
    backgroundColor: palette.primary,
  },
  saveButtonText: { color: palette.onPrimary, fontWeight: "700" },
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
    minHeight: minimumTouchTarget,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.control,
  },
  retryText: { color: palette.onPrimary, fontWeight: "700" },
});
