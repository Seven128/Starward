import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  colors,
  minimumTouchTarget,
  radii,
  spacing,
  type as typeToken,
} from "@starward/ui-system/tokens";
import {
  createFieldClient,
  type FieldCommand,
  type FieldSnapshot,
} from "../../data/field-client";
import { resolveRuntimeApiBaseUrl } from "../../data/runtime-api-base-url";

type ViewKey =
  | "pack"
  | "red"
  | "tools"
  | "return"
  | "route"
  | "session"
  | "share"
  | "queue"
  | "offline";

type FieldAction = {
  key: ViewKey;
  command?: FieldCommand;
  id: string;
  label: string;
  stableControlId?: string;
  accessibilityName?: string;
};

const palette = colors.planning;
const client = createFieldClient({ baseUrl: resolveRuntimeApiBaseUrl() });

const actions: FieldAction[] = [
  {
    key: "pack",
    command: "verify-pack",
    id: "field-verify-pack",
    label: "离线包",
    stableControlId: "offline-pack-manager",
    accessibilityName: "离线观测包管理",
  },
  {
    key: "red",
    command: "toggle-red",
    id: "field-toggle-red-mode",
    label: "红光",
    stableControlId: "night-red-mode-toggle",
    accessibilityName: "夜间与红光模式切换",
  },
  {
    key: "tools",
    id: "field-open-tool-grid",
    label: "现场工具",
    stableControlId: "field-tool-grid",
    accessibilityName: "现场工具网格",
  },
  {
    key: "return",
    id: "field-return-to-parking",
    label: "返车路线",
    stableControlId: "return-to-parking",
    accessibilityName: "返回停车点",
  },
  {
    key: "route",
    command: "switch-backup",
    id: "field-open-offline-route",
    label: "切换备选",
    stableControlId: "backup-switcher",
    accessibilityName: "主备地点切换",
  },
  {
    key: "session",
    command: "start-session",
    id: "field-start-session",
    label: "安全会话",
    stableControlId: "safety-session-panel",
    accessibilityName: "安全会话面板",
  },
  {
    key: "share",
    command: "share-location",
    id: "field-share-location",
    label: "分享位置",
    stableControlId: "location-share-action",
    accessibilityName: "位置分享操作",
  },
  {
    key: "queue",
    command: "save-report",
    id: "field-save-report",
    label: "同步队列",
    stableControlId: "offline-sync-queue",
    accessibilityName: "离线同步队列",
  },
  {
    key: "offline",
    command: "enter-offline",
    id: "field-enter-airplane-mode",
    label: "完全离线",
  },
];

function Evidence({
  id,
  title,
  body,
  meta,
  red,
}: {
  id: string;
  title: string;
  body: string;
  meta?: string;
  red: boolean;
}) {
  return (
    <View testID={id} style={[styles.evidence, red && styles.redCard]}>
      <Text style={[styles.evidenceTitle, red && styles.redText]}>{title}</Text>
      <Text style={[styles.evidenceBody, red && styles.redMuted]}>{body}</Text>
      {meta ? <Text style={[styles.meta, red && styles.redMuted]}>{meta}</Text> : null}
    </View>
  );
}

function Panel({ view, data }: { view: ViewKey; data: FieldSnapshot }) {
  const red = data.redMode;
  if (view === "pack") {
    return (
      <View style={styles.panel}>
        <Evidence
          red={red}
          id="offline-pack-version"
          title={`观测包 revision ${data.pack.revision} · ${Math.round(data.pack.totalBytes / 1024)} KiB`}
          body={data.pack.components.map((item) => `${item.kind}:${item.version}`).join(" · ")}
          meta="每组件记录大小、有效期、哈希、许可和坐标授权"
        />
        <Evidence
          red={red}
          id="offline-pack-checksum"
          title={`${data.pack.components.filter((item) => item.valid).length}/${data.pack.components.length} 组件哈希一致`}
          body={`设备保留空间 ${Math.round(data.pack.reserveBytes / 1024 ** 3)} GB；临时区校验后原子激活`}
        />
        <Evidence
          red={red}
          id="offline-pack-validity"
          title={data.pack.canActivate ? "校验通过 · 可离线" : "需要更新 · 不可激活"}
          body="只有全部必需组件通过才激活；过期数据可读但标 stale"
        />
      </View>
    );
  }
  if (view === "red") {
    return (
      <View style={[styles.panel, styles.redPanel]}>
        <Evidence
          red
          id="field-red-mode-state"
          title="红光模式 · 应用内已启用"
          body="主题原子切换，降低发光面积和动效；系统 UI/外部地图边界已说明"
        />
        <Evidence
          red
          id="field-primary-action"
          title="▣ 主操作：返回停车点"
          body="44 px 触控区，文本与图形共同表达"
        />
        <Evidence
          red
          id="field-status-label"
          title="⚠ 风险 · 路线为缓存"
          body="危险、选择和禁用不只靠颜色；支持文本放大与 reduced motion"
        />
      </View>
    );
  }
  if (view === "tools") {
    return (
      <View style={styles.panel}>
        <Evidence
          red={red}
          id="field-tool-availability"
          title="现场工具 · 离线能力"
          body={data.offline.tools.join(" · ")}
          meta="计时、水平仪、手电提示与摄影计划仅使用已校验的本地输入"
        />
        <Evidence
          red={red}
          id="field-tool-network-boundary"
          title="联网专属能力保持禁用"
          body={data.offline.networkOnly.join("、")}
          meta="网络恢复前不把缓存结果标记为实时"
        />
      </View>
    );
  }
  if (view === "return" || view === "route") {
    return (
      <View style={styles.panel}>
        <Evidence
          red={red}
          id="field-parking-point"
          title={`停车点 · 西北 ${data.route.parking.bearingDeg}° · ${data.route.parking.distanceM / 1000} km`}
          body={`WGS84 · 精度 ±${data.route.parking.accuracyM} m · ${data.route.parking.cachedAt} 缓存`}
        />
        <Evidence
          red={red}
          id="field-walking-segment"
          title={`最后步行 ${data.route.walk.distanceM} m · ${data.route.walk.minutes} 分钟`}
          body={`缓存路线 ${data.route.walk.version}；与直线方向明确区分`}
        />
        <Evidence
          red={red}
          id="field-backup-spot"
          title={`备选已确认 · ${data.activeSpot}窗口 ${data.route.backup.window}`}
          body={`主备原子切换；旧计划 ${data.rollbackSpot} 可撤回`}
        />
      </View>
    );
  }
  if (view === "session") {
    return (
      <View style={styles.panel}>
        <Evidence
          red={red}
          id="field-session-window"
          title={`安全时段 · 预计结束 ${data.session?.plannedEndAt}`}
          body={`自动停止 ${data.session?.autoStopAt}；逐次授权且状态持续可见`}
        />
        <Evidence
          red={red}
          id="field-checkin-control"
          title="本地签到提醒已排程"
          body={`权限 ${data.session?.permission} · ${data.session?.sampling}；系统限制会降频`}
        />
        <Evidence
          red={red}
          id="field-overdue-action"
          title="到时停止后台定位和计划任务"
          body="拒绝权限时只运行前台计时，不宣称已保护；不是救援服务"
        />
      </View>
    );
  }
  if (view === "share") {
    return (
      <View style={styles.panel}>
        <Evidence
          red={red}
          id="share-location-scope"
          title="仅本次 · 指定接收者 · 精确位置"
          body={`${data.share?.latitude}, ${data.share?.longitude} · ±${data.share?.accuracyM} m · ${data.share?.recipient}`}
        />
        <Evidence
          red={red}
          id="share-location-expiry"
          title={`有效至 ${data.share?.expiresAt}`}
          body="发送前预览接收者、精度、时间；当前尚未发送"
        />
        <Evidence
          red={red}
          id="share-location-revoke"
          title="可撤销链接 · 不自动重发"
          body={`状态 ${data.share?.deliveryState}；未知或失败不显示已送达`}
        />
      </View>
    );
  }
  if (view === "queue") {
    return (
      <View style={styles.panel}>
        <Evidence
          red={red}
          id="offline-write-state"
          title={`已保存在本机 · ${data.queue.ordered.length + data.queue.conflicts.length} 项待同步`}
          body="实况、图片、清单草稿保留；逐项显示队列状态"
        />
        <Evidence
          red={red}
          id="offline-replay-key"
          title={`幂等键 ${data.queue.ordered[0]?.idempotencyKey}`}
          body="恢复后按依赖续传，确认键不会重复发布"
        />
        <Evidence
          red={red}
          id="offline-conflict-action"
          title={`清单存在冲突 · ${data.queue.conflicts.length} 项`}
          body="选择合并或保留版本；上传中断不删除本地文件"
        />
      </View>
    );
  }
  return (
    <View style={styles.panel}>
      <Evidence
        red={red}
        id="field-offline-banner"
        title="完全离线 · 包校验通过"
        body={`缓存于 ${data.offline.cachedAt}；实时天气/预警/路况不可更新`}
      />
      <Evidence
        red={red}
        id="field-cached-plan"
        title={`${data.activeSpot} · 最佳窗口 00:35–02:20`}
        body="路线、天气、天文、拍摄和返程均显示各自缓存版本"
      />
      <Evidence
        red={red}
        id="field-offline-toolbox"
        title={`离线可用：${data.offline.tools.join(" · ")}`}
        body={`联网专属：${data.offline.networkOnly.join("、")}；禁用且给出本地替代`}
      />
    </View>
  );
}

export function FieldScreen() {
  const [activeView, setActiveView] = useState<ViewKey | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["field"],
    queryFn: ({ signal }) => client.get(signal),
  });
  const mutation = useMutation({
    mutationFn: (command: FieldCommand) => client.command(command),
    onSuccess: (data) => queryClient.setQueryData(["field"], data),
  });
  const data = mutation.data ?? query.data;
  const red = data?.redMode ?? false;

  const activate = (action: FieldAction) => {
    setActiveView(action.key);
    if (action.command) mutation.mutate(action.command);
  };

  return (
    <SafeAreaView testID="screen-field-offline-safety" style={[styles.screen, red && styles.redScreen]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          testID="field-dashboard"
          accessible
          accessibilityLabel={`field-dashboard:现场仪表盘，${data?.activeSpot ?? "地点读取中"}，最佳窗口 00:35 至 02:20，返程与安全状态可查看`}
          style={[styles.dashboard, red && styles.redCard]}
        >
          <Text style={[styles.eyebrow, red && styles.redText]}>现场模式 · {data?.activeSpot ?? "读取中"}</Text>
          <Text style={[styles.title, red && styles.redText]}>断网也能找到方向和退路</Text>
          <Text style={[styles.subtitle, red && styles.redMuted]}>
            最佳窗口 00:35–02:20 · 返程与安全状态可用
          </Text>
        </View>
        <Text style={[styles.subtitle, red && styles.redMuted]}>
          所有现场能力绑定已校验观测包；网络专属数据不会冒充实时。
        </Text>
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              testID={action.id}
              accessibilityRole="button"
              accessibilityLabel={
                action.stableControlId
                  ? `${action.stableControlId}:${action.accessibilityName}`
                  : action.label
              }
              disabled={mutation.isPending}
              onPress={() => activate(action)}
              style={styles.action}
            >
              <Text style={[styles.actionText, red && styles.redText]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
        {activeView && data ? <Panel view={activeView} data={data} /> : null}
        {query.isError ? (
          <Pressable onPress={() => query.refetch()} style={styles.retry}>
            <Text>现场包读取失败，点按重试</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  redScreen: { backgroundColor: "#090000" },
  content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 },
  dashboard: {
    minHeight: 132,
    padding: spacing.x2,
    gap: spacing.x1,
    borderRadius: radii.layer,
    backgroundColor: palette.surface,
  },
  eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700" },
  title: { color: palette.text, fontSize: typeToken.title, fontWeight: "700" },
  subtitle: { color: palette.textSecondary, lineHeight: 23 },
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
  actionText: { color: palette.text, fontWeight: "700" },
  retry: {
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.x2,
    borderRadius: radii.control,
    backgroundColor: palette.surface,
  },
  panel: {
    gap: spacing.x1,
    padding: spacing.x2,
    borderRadius: radii.layer,
    backgroundColor: palette.surface,
  },
  redPanel: { backgroundColor: "#130202" },
  evidence: {
    minHeight: 86,
    padding: 12,
    borderRadius: radii.control,
    backgroundColor: palette.surfaceMuted,
  },
  redCard: { backgroundColor: "#210504" },
  evidenceTitle: { color: palette.text, fontWeight: "700" },
  evidenceBody: { marginTop: 5, color: palette.text, lineHeight: 19 },
  meta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption },
  redText: { color: "#FFB7B1" },
  redMuted: { color: "#D37D76" },
});
