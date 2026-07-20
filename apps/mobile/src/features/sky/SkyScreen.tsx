import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SkyContext, SkyPosition } from "@starward/contracts/sky";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { calculateFieldOfView, visibleIntervals, type HorizonProfile } from "../../../../../packages/astronomy-core/src/sky-model";
import { startExpoOrientation } from "../../../modules/orientation/expo-orientation-adapter";
import { OrientationEngine, type StableOrientation } from "../../../modules/orientation/orientation-engine";
import { resolveArMode } from "../../../modules/sky-ar/sky-ar-adapter";
import { createSkyClient } from "../../data/sky-client";
import { useShellStore } from "../../state/shell-store";
import { persistSkyResolution } from "../../state/sky-runtime";

type ViewKey = "universal-sky" | "time-jump" | "obstruction-trajectory" | "field-of-view" | "ar-degradation" | "low-accuracy-guidance";
const palette = colors.night;
const client = createSkyClient();
const actions: Array<{ key: ViewKey; id: string; label: string }> = [
  { key: "universal-sky", id: "sky-open-universal-view", label: "通用天空" },
  { key: "time-jump", id: "sky-jump-time", label: "目标最高" },
  { key: "obstruction-trajectory", id: "sky-add-obstruction", label: "遮挡轨迹" },
  { key: "field-of-view", id: "sky-apply-fov", label: "视场" },
  { key: "ar-degradation", id: "sky-open-ar", label: "AR" },
  { key: "low-accuracy-guidance", id: "sky-calibrate-sensors", label: "方向校准" },
];

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}
const degrees = (value: number) => `${Math.round(value * 10) / 10}°`;
const localTime = (value: string, timezone: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: timezone, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

function SkyCanvas({ context }: { context: SkyContext }) {
  const visible = context.objects.filter((object) => object.visible && object.obstructed !== true);
  return <View accessibilityRole="image" accessibilityLabel={`天空目标列表，${visible.map((item) => item.name).join("、") || "当前无目录目标在地平线上"}`} style={styles.canvas}>
    <View style={styles.horizon}><Text style={styles.horizonText}>N　　　　 E　　　　 S　　　　 W</Text></View>
    {context.objects.map((object) => <View key={object.id} style={[styles.star, { left: `${5 + object.azimuthDeg / 4}%`, top: `${Math.max(7, 72 - Math.max(-10, object.altitudeDeg) * 0.65)}%`, opacity: object.visible ? 1 : 0.28 }]}><Text style={styles.starDot}>✦</Text><Text style={styles.starLabel}>{object.name}</Text></View>)}
    <Text style={styles.canvasMeta}>亮星先呈现 · {context.catalog.deferredChunks.length ? `${context.catalog.deferredChunks.join("、")}目录按视口加载` : "目录已加载"}</Text>
  </View>;
}

function UniversalPanel({ data, locationLabel }: { data: SkyContext; locationLabel: string }) {
  const visible = data.objects.filter((item) => item.visible).map((item) => `${item.name} ${degrees(item.altitudeDeg)}`);
  return <View style={styles.panel}>
    <Evidence testID="sky-time-context" title={`${localTime(data.context.at, data.context.timezone)} · ${data.context.at === data.generatedAt ? "实时" : "所选时间"}`} body={`时区 ${data.context.timezone} · 计算时刻 ${data.context.at}`} meta="显示使用当地时区；计算和持久化使用 UTC。" />
    <Evidence testID="sky-location-context" title={locationLabel} body={`WGS84 ${data.context.latitude.toFixed(4)}, ${data.context.longitude.toFixed(4)} · 海拔 ${data.context.elevationM} m`} meta="位置变化会重新请求天空状态。" />
    <Evidence testID="sky-visible-objects" title={`当前可见 ${visible.length} 个目录目标`} body={visible.join("、") || "当前载入目录目标都在纯天文地平线下。"} meta={`${data.algorithm.name} · ${data.algorithm.version} · ${data.algorithm.refraction} 折射模型`} />
  </View>;
}

function TimePanel({ data }: { data: SkyContext }) {
  const target = data.selectedTarget;
  return <View style={styles.panel}>
    <Evidence testID="sky-selected-time" title={`所选时间 ${localTime(data.context.at, data.context.timezone)} · 模拟`} body="画布、目标轨迹、遮挡边界和摄影入口使用同一 UTC 时刻。" meta="模拟状态不会冒充实时朝向。" />
    <Evidence testID="sky-object-position" title={target?.name ?? "目标暂无位置"} body={target ? `方位 ${degrees(target.azimuthDeg)} · 高度 ${degrees(target.altitudeDeg)}` : "当前亮目标目录没有该目标。"} meta={data.bestTargetTime ? `未来 24 小时最高点 ${localTime(data.bestTargetTime, data.context.timezone)}` : "未来 24 小时没有地平线上窗口"} />
    <Evidence testID="sky-timezone" title={data.context.timezone} body={`服务端计算输入 ${data.context.at}`} />
  </View>;
}

function trajectoryWindow(data: SkyContext, profile?: HorizonProfile) {
  const samples = visibleIntervals(data.trajectory.map((sample) => ({ at: sample.at, altitudeDeg: sample.altitudeDeg, azimuthDeg: sample.azimuthDeg })), profile);
  const visible = samples.filter((sample) => sample.visible);
  if (!visible.length) return "没有可见区段";
  return `${localTime(visible[0].at, data.context.timezone)}–${localTime(visible.at(-1)!.at, data.context.timezone)}`;
}

function ObstructionPanel({ data }: { data: SkyContext }) {
  return <View style={styles.panel}>
    <Evidence testID="sky-obstruction-profile" title="地点地平线：未知" body="当前地点没有经过来源、版本和置信度核验的地形/建筑/全景轮廓。" meta="不会用装饰山形或默认角度冒充现场遮挡。" />
    <Evidence testID="sky-target-trajectory" title={`${data.selectedTarget?.name ?? "目标"}纯天文轨迹`} body={`${data.trajectory.length} 个 15 分钟采样 · 方位/高度由服务端逐点计算`} meta={`${data.algorithm.version}；地点轮廓可用后再独立相交。`} />
    <Evidence testID="sky-visible-window" title={`可见窗口（纯天文）：${trajectoryWindow(data)}`} body="这里只表示高于数学地平线；山体、树木和建筑可能缩短窗口。" meta={data.warnings.join("；")} />
  </View>;
}

function FovPanel() {
  const fov = calculateFieldOfView({ sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: 24, orientation: "landscape" });
  return <View style={styles.panel}>
    <Evidence testID="sky-fov-equipment" title="全画幅机身 · 24 mm 镜头" body="传感器 36 × 24 mm · 实际焦距 · 横向构图" meta="这是当前器材输入；缺少尺寸或焦距时不生成视场。" />
    <Evidence testID="sky-fov-overlay" title="视场覆盖层" body={fov ? `水平 ${degrees(fov.horizontalDeg)} × 垂直 ${degrees(fov.verticalDeg)}` : "参数不完整，覆盖层已关闭"} meta="计算结果可作为摄影方案输入。" />
    <Evidence testID="sky-fov-scale" title="确定性计算" body="2 × atan(传感器尺寸 ÷ 2 ÷ 实际焦距)" meta="不猜测裁切系数，也不把等效焦距重复换算。" />
  </View>;
}

function ArPanel({ data }: { data: SkyContext }) {
  const capability = Platform.OS === "web"
    ? { platform: "none" as const, cameraPermission: "undetermined" as const, tracking: "unavailable" as const }
    : { platform: "camera-overlay" as const, cameraPermission: "undetermined" as const, tracking: "unavailable" as const };
  const ar = resolveArMode(capability);
  return <View style={styles.panel}>
    <Evidence testID="sky-ar-support-state" title={ar.mode === "ar" ? "AR 追踪可用" : "AR 当前不可用"} body={`平台 ${capability.platform} · 相机权限 ${capability.cameraPermission} · 追踪 ${capability.tracking}`} meta="只在用户主动开启且原生适配器可用时请求相机。" />
    <Evidence testID="sky-ar-fallback" title="已降级到通用天空" body={ar.reason} meta={`地点 ${data.context.latitude.toFixed(4)}, ${data.context.longitude.toFixed(4)} · 时间 ${data.context.at} · 目标 ${data.selectedTarget?.name ?? data.context.target} 均保留`} />
    <Evidence testID="sky-ar-accuracy" title="不显示不可信叠加" body={ar.trustworthyOverlay ? "追踪可信，叠加可显示。" : "漂移覆盖已隐藏；纯天空仍可触控浏览。"} />
  </View>;
}

function CalibrationPanel({ orientation, target }: { orientation: StableOrientation; target: SkyPosition | null }) {
  const engine = new OrientationEngine();
  engine.update({ timestampMs: orientation.timestampMs, attitude: { yawDeg: orientation.headingDeg, pitchDeg: orientation.pitchDeg, rollDeg: orientation.rollDeg }, magneticHeadingDeg: orientation.northReference === "manual" ? undefined : orientation.headingDeg });
  const direction = engine.directionTo(target?.azimuthDeg ?? 0);
  return <View style={styles.panel}>
    <Evidence testID="sky-sensor-accuracy" title={orientation.accuracy === "high" || orientation.accuracy === "medium" ? `方向精度 ${orientation.accuracy}` : "方向精度低/不可用 · 需要校准或手动定向"} body={orientation.guidance} meta={`异常 ${orientation.anomaly} · 实时跟随 ${orientation.following ? "开启" : "已停止"} · ${orientation.northReference} north`} />
    <Evidence testID="sky-calibration-guide" title="校准与稳定度" body="移开磁性手机壳、车辆和金属平台，缓慢完成八字动作；等待新样本稳定。" meta="没有稳定新样本时不宣称校准成功。" />
    <Evidence testID="sky-manual-orientation" title="手动北向与触控浏览可用" body={direction.turn === "aligned" ? "目标接近当前手动方向" : `目标约在${direction.turn === "left" ? "左" : "右"}侧 ${degrees(direction.degrees)}`} meta="文字方位、目标列表和触控浏览不依赖未经校准的磁力计。" />
  </View>;
}

function State({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  return <View style={styles.state}><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text>{retry ? <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>重试</Text></Pressable> : null}</View>;
}

export function SkyScreen() {
  const location = useShellStore((state) => state.location);
  const [active, setActive] = useState<ViewKey>("universal-sky");
  const [at, setAt] = useState(() => new Date().toISOString());
  const [orientation, setOrientation] = useState<StableOrientation>(() => new OrientationEngine().unavailable());
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const subscription = useRef<{ stop(): void } | null>(null);
  const latitude = location.latitude ?? 22.529;
  const longitude = location.longitude ?? 113.9468;
  const request = useMemo(() => ({ latitude, longitude, elevationM: 0, timezone: "Asia/Shanghai", at, target: "milky-way-core" as const }), [latitude, longitude, at]);
  const query = useQuery({ queryKey: ["sky", request], queryFn: ({ signal }) => client.get(request, signal), retry: 1 });
  useEffect(() => () => subscription.current?.stop(), []);
  useEffect(() => {
    if (!query.data) return;
    const data = query.data;
    void persistSkyResolution({ token: data.selectedTarget?.id ?? data.context.target, at: data.context.at, algorithmVersion: data.algorithm.version, latitude: data.context.latitude, longitude: data.context.longitude, orientationAccuracy: orientation.accuracy }).then(() => setPersistenceError(null)).catch(() => setPersistenceError("天空结果未写入本机数据库；当前画面可查看，但不会冒充已保存。"));
  }, [query.data, orientation.accuracy]);
  const open = async (key: ViewKey) => {
    setActive(key);
    if (key === "time-jump" && query.data?.bestTargetTime) setAt(query.data.bestTargetTime);
    if (key === "low-accuracy-guidance") {
      subscription.current?.stop();
      subscription.current = await startExpoOrientation(setOrientation, { intervalMs: 100 });
      if (!subscription.current) setOrientation(new OrientationEngine().unavailable());
    }
  };
  return <SafeAreaView testID="screen-sky-orientation-ar" style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>天空定位 · {location.label}</Text><Text style={styles.title}>目标在哪里，遮挡证据在哪里</Text>
    <Text style={styles.subtitle}>通用天空是主路径。方向、相机与 AR 只在能力和精度可信时增强；现场轮廓未知时不猜测。</Text>
    {query.isLoading ? <State title="正在计算天空状态…" body="服务端按 WGS84 地点、UTC 时刻和版本化天文算法定位亮星、深空目标与轨迹。" /> : null}
    {query.isError ? <State title="天空状态暂不可用" body={query.error instanceof Error && query.error.message === "sky_api_base_url_missing" ? "尚未配置 API 地址；不会以内置星位替代真实计算。" : "请求或计算失败；当前不显示旧星位。"} retry={() => void query.refetch()} /> : null}
    {persistenceError ? <State title="本机保存失败" body={persistenceError} retry={() => void query.refetch()} /> : null}
    {query.data ? <SkyCanvas context={query.data} /> : null}
    <View style={styles.actions}>{actions.map((action) => <Pressable key={action.key} testID={action.id} accessibilityRole="button" onPress={() => void open(action.key)} style={({ pressed }) => [styles.action, active === action.key && styles.actionActive, pressed && styles.pressed]}><Text style={styles.actionText}>{action.label}</Text></Pressable>)}</View>
    {query.data && active === "universal-sky" ? <UniversalPanel data={query.data} locationLabel={location.label} /> : null}
    {query.data && active === "time-jump" ? <TimePanel data={query.data} /> : null}
    {query.data && active === "obstruction-trajectory" ? <ObstructionPanel data={query.data} /> : null}
    {active === "field-of-view" ? <FovPanel /> : null}
    {query.data && active === "ar-degradation" ? <ArPanel data={query.data} /> : null}
    {query.data && active === "low-accuracy-guidance" ? <CalibrationPanel orientation={orientation} target={query.data.selectedTarget} /> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 },
  eyebrow: { color: palette.primary, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, lineHeight: 32, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  canvas: { height: 250, overflow: "hidden", borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: "#06101D" }, horizon: { position: "absolute", left: 12, right: 12, bottom: 42, borderTopWidth: 1, borderColor: palette.textSecondary, paddingTop: 6 }, horizonText: { color: palette.textSecondary, textAlign: "center", fontSize: typeToken.caption }, star: { position: "absolute", alignItems: "center" }, starDot: { color: palette.text, fontSize: 18 }, starLabel: { color: palette.text, fontSize: 10 }, canvasMeta: { position: "absolute", left: 12, bottom: 12, color: palette.textSecondary, fontSize: typeToken.caption },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, actionActive: { borderColor: palette.primary }, actionText: { color: palette.text, fontSize: typeToken.caption, fontWeight: "700" }, pressed: { opacity: 0.7 },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, evidence: { minHeight: 86, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  state: { minHeight: 140, justifyContent: "center", padding: spacing.x2, borderRadius: radii.layer, backgroundColor: palette.surface }, stateTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, stateBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 }, retry: { minHeight: minimumTouchTarget, marginTop: spacing.x2, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: palette.primary }, retryText: { color: palette.onPrimary, fontWeight: "700" },
});
