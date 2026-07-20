import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { OrientationEngine } from "../../../modules/orientation/orientation-engine";
import { resolveArMode } from "../../../modules/sky-ar/sky-ar-adapter";
import { calculateFieldOfView, catalogChunks, positionCatalog, visibleIntervals, type HorizonProfile } from "../../../../../packages/astronomy-core/src/sky-model";

type CaseKey = "universal-sky" | "time-jump" | "obstruction-trajectory" | "field-of-view" | "ar-degradation" | "low-accuracy-guidance";
const palette = colors.night;
const actions: Record<CaseKey, { id: string; label: string }> = {
  "universal-sky": { id: "sky-open-universal-view", label: "通用天空" },
  "time-jump": { id: "sky-jump-time", label: "银河最高" },
  "obstruction-trajectory": { id: "sky-add-obstruction", label: "遮挡轨迹" },
  "field-of-view": { id: "sky-apply-fov", label: "视场" },
  "ar-degradation": { id: "sky-open-ar", label: "AR" },
  "low-accuracy-guidance": { id: "sky-calibrate-sensors", label: "方向校准" },
};

const location = { latitude: 22.529, longitude: 113.9468, elevationM: 620, timezone: "Asia/Shanghai", name: "深圳 · 西涌观测点" };
const horizon: HorizonProfile = {
  source: "estimated", version: "horizon-fixture-2026-07-20", confidence: 0.68,
  points: [{ azimuthDeg: 0, altitudeDeg: 5 }, { azimuthDeg: 90, altitudeDeg: 12 }, { azimuthDeg: 180, altitudeDeg: 8 }, { azimuthDeg: 270, altitudeDeg: 4 }],
};

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence}><Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}</View>;
}

function SkyCanvas({ at }: { at: Date }) {
  const positioned = useMemo(() => positionCatalog({ ...location, at, magnitudeLimit: 4, profile: horizon }), [at]);
  const visible = positioned.filter((object) => object.visible && object.obstructed !== true);
  const chunks = catalogChunks(4);
  return <View accessibilityRole="image" accessibilityLabel={`天空目标列表，${visible.map((item) => item.name).join("、") || "当前无目录目标在地平线上"}`} style={styles.canvas}>
    <View style={styles.horizon}><Text style={styles.horizonText}>W　　N　　E　　S</Text></View>
    {positioned.slice(0, 5).map((object, index) => <View key={object.id} style={[styles.star, { left: `${12 + index * 17}%`, top: `${18 + (index % 3) * 18}%`, opacity: object.visible ? 1 : 0.35 }]}><Text style={styles.starDot}>✦</Text><Text style={styles.starLabel}>{object.name}</Text></View>)}
    <Text style={styles.canvasMeta}>先载入 {chunks[0]?.objects.length ?? 0} 个亮目标 · 深层目录按需加载</Text>
  </View>;
}

function UniversalPanel({ at }: { at: Date }) {
  const objects = positionCatalog({ ...location, at, magnitudeLimit: 4, profile: horizon });
  const visibleNames = objects.filter((item) => item.visible && !item.obstructed).map((item) => item.name);
  return <View style={styles.panel}>
    <Evidence testID="sky-time-context" title="时间与状态" body="2026-08-13 00:40 · 模拟" meta="Asia/Shanghai；计算输入以 UTC 保存" />
    <Evidence testID="sky-location-context" title="所选地点" body={location.name} meta={`WGS84 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)} · 海拔 ${location.elevationM} m`} />
    <Evidence testID="sky-visible-objects" title="当前可见目标" body={visibleNames.join("、") || "当前目录目标均在地平线下"} meta="位置由固定版本天文引擎计算；遮挡轮廓为估算来源" />
  </View>;
}

function TimePanel() {
  return <View style={styles.panel}>
    <Evidence testID="sky-selected-time" title="所选时间 01:30 · 模拟" body="已跳到本夜银河核心最高附近" meta="跨午夜日期明确；不是实时朝向" />
    <Evidence testID="sky-object-position" title="银河核心" body="方位 192° · 高度 36°" meta="天空、轨迹、遮挡和摄影入口共享同一时刻" />
    <Evidence testID="sky-timezone" title="Asia/Shanghai" body="显示当地时间；计算时刻以 UTC 保存" />
  </View>;
}

function ObstructionPanel() {
  const intervals = visibleIntervals([
    { at: "00:20", altitudeDeg: 8, azimuthDeg: 88 }, { at: "00:52", altitudeDeg: 14, azimuthDeg: 96 },
    { at: "02:18", altitudeDeg: 15, azimuthDeg: 168 }, { at: "03:05", altitudeDeg: 6, azimuthDeg: 190 },
  ], horizon);
  const visible = intervals.filter((item) => item.visible).map((item) => item.at);
  return <View style={styles.panel}>
    <Evidence testID="sky-obstruction-profile" title="南偏东地平线遮挡 12°" body="山体/建筑估算轮廓 · 可信度 68%" meta={`${horizon.version}；不得称为现场实测`} />
    <Evidence testID="sky-target-trajectory" title="银河核心轨迹" body="00:20 升起 · 01:30 中天附近 · 03:05 降至遮挡后" meta="纯天文轨迹与地点遮挡分别计算" />
    <Evidence testID="sky-visible-window" title={`可见窗口 ${visible[0]}–${visible.at(-1)}`} body="遮挡区段与可见区段已分离" meta="缺少轮廓时会显示未知地平线，不假设开阔" />
  </View>;
}

function FovPanel() {
  const fov = calculateFieldOfView({ sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: 24, orientation: "landscape" })!;
  return <View style={styles.panel}>
    <Evidence testID="sky-fov-equipment" title="全画幅机身 · 24 mm 镜头" body="传感器 36 × 24 mm · 横向构图" meta="使用实际焦段；设备资料完整才生成结果" />
    <Evidence testID="sky-fov-overlay" title="视场覆盖层" body={`水平 ${fov.horizontalDeg.toFixed(1)}° × 垂直 ${fov.verticalDeg.toFixed(1)}°`} meta="边框可传入摄影方案" />
    <Evidence testID="sky-fov-scale" title="计算依据" body="2 × atan(传感器尺寸 ÷ 2 ÷ 焦距)" meta="缺少传感器或焦距时返回空，不猜裁切系数" />
  </View>;
}

function ArPanel() {
  const ar = resolveArMode({ platform: "none", cameraPermission: "granted", tracking: "unavailable" });
  return <View style={styles.panel}>
    <Evidence testID="sky-ar-support-state" title="AR 当前不可用" body="本设备未提供 ARKit/ARCore 能力" meta="能力与相机权限在开启前检查" />
    <Evidence testID="sky-ar-fallback" title="已降级到通用天空" body={ar.reason} meta="相同地点、时间和目标已保留" />
    <Evidence testID="sky-ar-accuracy" title="不显示不可信叠加" body="追踪不可用 · 漂移覆盖已隐藏" meta="AR 不阻断核心天空路径" />
  </View>;
}

function CalibrationPanel() {
  const engine = new OrientationEngine();
  const state = engine.update({ timestampMs: Date.now(), attitude: { yawDeg: 184, pitchDeg: 21, rollDeg: 2 }, magneticHeadingDeg: 212, magneticFieldMicrotesla: 91, declinationDeg: -2.4 });
  const direction = engine.directionTo(192);
  return <View style={styles.panel}>
    <Evidence testID="sky-sensor-accuracy" title="方向精度低 · 需要校准" body={state.guidance} meta={`磁场异常；实时跟随：${state.following ? "开启" : "已停止"}`} />
    <Evidence testID="sky-calibration-guide" title="八字校准" body="移开磁性手机壳、车辆和金属平台后，缓慢完成八字动作" meta="只有新样本稳定后才恢复跟随，不宣称当前已成功" />
    <Evidence testID="sky-manual-orientation" title="手动北向与触控浏览可用" body={`目标约在${direction.turn === "left" ? "左" : "右"}侧 ${direction.degrees.toFixed(0)}°；可按地标修正北向`} meta="文字方位不依赖原始磁力计冒充真北" />
  </View>;
}

export function SkyScreen({ fixture }: { fixture?: string }) {
  const fixtureCase = fixture?.split(":")[1] as CaseKey | undefined;
  const [active, setActive] = useState<CaseKey | null>(null);
  const [at, setAt] = useState(() => new Date("2026-08-12T16:40:00.000Z"));
  const select = (key: CaseKey) => { if (key === "time-jump") setAt(new Date("2026-08-12T17:30:00.000Z")); setActive(key); };
  return <SafeAreaView testID="screen-sky-orientation-ar" style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>天空 · {location.name}</Text><Text style={styles.title}>目标在哪里，遮挡在哪里</Text>
      <Text style={styles.subtitle}>通用天空是主路径。方向、相机和 AR 只在能力与精度可信时增强显示。</Text>
      <SkyCanvas at={at} />
      <View style={styles.actions}>{(Object.keys(actions) as CaseKey[]).map((key) => <Pressable key={key} testID={actions[key].id} accessibilityRole="button" onPress={() => select(key)} style={({ pressed }) => [styles.action, fixtureCase === key && styles.actionRecommended, pressed && styles.pressed]}><Text style={styles.actionText}>{actions[key].label}</Text></Pressable>)}</View>
      {active === "universal-sky" ? <UniversalPanel at={at} /> : null}{active === "time-jump" ? <TimePanel /> : null}
      {active === "obstruction-trajectory" ? <ObstructionPanel /> : null}{active === "field-of-view" ? <FovPanel /> : null}
      {active === "ar-degradation" ? <ArPanel /> : null}{active === "low-accuracy-guidance" ? <CalibrationPanel /> : null}
      {!active ? <View style={styles.empty}><Text style={styles.emptyTitle}>拖动天空或选择工具</Text><Text style={styles.emptyBody}>屏幕阅读器可使用目标列表；标签和装饰可降级，方位、高度与精度状态始终保留。</Text></View> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { padding: spacing.x2, paddingBottom: 48, gap: spacing.x2 },
  eyebrow: { color: palette.primary, fontSize: typeToken.label, fontWeight: "700" }, title: { color: palette.text, fontSize: typeToken.title, lineHeight: 32, fontWeight: "700" }, subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  canvas: { height: 250, overflow: "hidden", borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: "#06101D" },
  horizon: { position: "absolute", left: 12, right: 12, bottom: 42, borderTopWidth: 1, borderColor: palette.textSecondary, paddingTop: 6 }, horizonText: { color: palette.textSecondary, textAlign: "center", fontSize: typeToken.caption },
  star: { position: "absolute", alignItems: "center" }, starDot: { color: palette.text, fontSize: 18 }, starLabel: { color: palette.text, fontSize: 10 }, canvasMeta: { position: "absolute", left: 12, bottom: 12, color: palette.textSecondary, fontSize: typeToken.caption },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, action: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface }, actionRecommended: { borderColor: palette.primary }, actionText: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" },
  panel: { gap: spacing.x1, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, evidence: { minHeight: 86, padding: 12, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  empty: { minHeight: 130, justifyContent: "center", padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, emptyTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, emptyBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 }, pressed: { opacity: 0.7 },
});
