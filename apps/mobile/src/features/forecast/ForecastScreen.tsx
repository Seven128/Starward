import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  ForecastBundle,
  ForecastLayerDescriptor,
  ForecastModelSeries,
  ForecastTrendDay,
  ProfessionalForecastHour,
} from "@starward/contracts/forecast";
import { colors, minimumTouchTarget, radii, spacing, type as typeToken } from "@starward/ui-system/tokens";
import { createForecastClient } from "../../data/forecast-client";
import { useShellStore } from "../../state/shell-store";
import { useTabRestorationEvidence } from "../../shell/TabRestorationEvidence";
import { observingNightHours } from "./observing-night-hours";

const palette = colors.planning;
type SectionKey = "hourly-professional-view" | "model-disagreement" | "future-trend" | "twilight-and-milky-way" | "layer-provenance";
type ModelKey = "primary" | "comparison";

const configuredApiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;
const client = createForecastClient({
  baseUrl: Platform.OS === "android" && typeof configuredApiBaseUrl === "string" && configuredApiBaseUrl.trim()
    ? configuredApiBaseUrl
    : undefined,
});

const sectionActions: Array<{ key: SectionKey; testID: string; label: string }> = [
  { key: "model-disagreement", testID: "forecast-compare-models", label: "模型" },
  { key: "future-trend", testID: "forecast-select-future-night", label: "观测夜" },
  { key: "twilight-and-milky-way", testID: "forecast-open-astronomy-timeline", label: "天文窗口" },
  { key: "hourly-professional-view", testID: "forecast-open-hourly", label: "小时矩阵" },
  { key: "layer-provenance", testID: "forecast-open-layer-details", label: "图层" },
];

const value = (input: number | null, suffix = "") => input === null ? "—" : `${Math.round(input * 10) / 10}${suffix}`;
const percent = (input: number | null) => value(input, "%");
const time = (input: string | null, timezone = "Asia/Shanghai") => {
  if (!input) return "--:--";
  try {
    return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(new Date(input));
  } catch {
    return input.slice(11, 16);
  }
};
const dateLabel = (input: string) => {
  const date = new Date(`${input}T12:00:00+08:00`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short" }).format(date)
    : input;
};
const confidenceLabel = (confidence: number) => confidence >= 0.75 ? "较高" : confidence >= 0.55 ? "中等" : "较低";

function SectionHeading({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return <View style={styles.sectionHeading}>
    <View style={styles.sectionHeadingCopy}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text></View>
    {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
  </View>;
}

function Choice({ label, selected, disabled = false, onPress, accessibilityLabel, testID }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void; accessibilityLabel?: string; testID?: string }) {
  return <Pressable
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ selected, disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
  ><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></Pressable>;
}

function Evidence({ testID, title, body, meta }: { testID: string; title: string; body: string; meta?: string }) {
  return <View testID={testID} style={styles.evidence} accessibilityRole="summary">
    <Text style={styles.evidenceTitle}>{title}</Text><Text style={styles.evidenceBody}>{body}</Text>{meta ? <Text style={styles.evidenceMeta}>{meta}</Text> : null}
  </View>;
}

function State({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  return <View style={styles.state} accessibilityLiveRegion="polite">
    <Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text>
    {retry ? <Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={styles.retryText}>重试</Text></Pressable> : null}
  </View>;
}

function ModelSelector({ bundle, selected, onSelect }: { bundle: ForecastBundle; selected: ModelKey; onSelect: (key: ModelKey) => void }) {
  const primary = bundle.primary.run;
  const comparison = bundle.comparison?.run;
  const active = selected === "comparison" && bundle.comparison ? comparison : primary;
  return <View style={styles.section}>
    <SectionHeading eyebrow="预报模型" title="先看系统解释，再看模型值" meta={`${Math.round(bundle.modelComparison.confidence * 100)}% 可信度`} />
    <View style={styles.choiceRow}>
      <Choice testID="model-selector" label={`${primary.provider} · ${primary.model}`} accessibilityLabel={`预报模型选择，${primary.provider} ${primary.model}`} selected={selected === "primary"} onPress={() => onSelect("primary")} />
      <Choice label={comparison ? `${comparison.provider} · ${comparison.model}` : "暂无可比较模型"} selected={selected === "comparison"} disabled={!comparison} onPress={() => onSelect("comparison")} />
    </View>
    <View style={styles.explanation}>
      <Text style={styles.explanationTitle}>{bundle.modelComparison.explanation}</Text>
      <Text style={styles.explanationBody}>当前显示 {active?.provider} {active?.model} · 批次 {active?.runId} · {active?.status} · 分辨率 {value(active?.resolutionKm ?? null, " km")}</Text>
    </View>
    <View style={styles.evidenceGrid}>
      <Evidence testID="forecast-model-a" title={`主模型 · ${primary.provider} ${primary.model}`} body={`批次 ${primary.runId} · ${primary.status}`} meta={`${primary.sourceLicense} · ${time(primary.modelRunTimeUtc, bundle.context.timezone)} 运行`} />
      <Evidence testID="forecast-model-b" title={comparison ? `对比模型 · ${comparison.provider} ${comparison.model}` : "对比模型暂不可用"} body={comparison ? `批次 ${comparison.runId} · ${comparison.status}` : "不复制主模型充当第二模型。"} meta={comparison?.sourceLicense} />
    </View>
    <Evidence testID="forecast-disagreement" title={`模型${bundle.modelComparison.disagreementStartUtc ? "存在分歧" : "当前一致"}`} body={bundle.modelComparison.explanation} meta={`比较字段：${bundle.modelComparison.comparedFields.join("、") || "暂无"}`} />
  </View>;
}

function TrendCalendar({ trends, selectedNight, onSelect }: { trends: ForecastTrendDay[]; selectedNight: string; onSelect: (date: string) => void }) {
  const selected = trends.find((trend) => trend.date === selectedNight) ?? trends[0];
  return <View style={styles.section}>
    <SectionHeading eyebrow="15 日趋势" title="选择观测夜" meta="远期仅作规划" />
    {trends.length ? <ScrollView testID="trend-calendar" accessibilityLabel="七夜趋势日历" horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
      {trends.map((trend) => <Pressable
        key={trend.date}
        accessibilityRole="button"
        accessibilityLabel={`${dateLabel(trend.date)}，${trend.conditionText ?? "天气未知"}，可信度 ${Math.round(trend.confidence * 100)}%`}
        accessibilityState={{ selected: trend.date === selectedNight, disabled: trend.status === "missing" }}
        disabled={trend.status === "missing"}
        onPress={() => onSelect(trend.date)}
        style={({ pressed }) => [styles.dateCard, trend.date === selectedNight && styles.dateCardSelected, trend.status === "missing" && styles.disabled, pressed && styles.pressed]}
      >
        <Text style={styles.dateLabel}>{dateLabel(trend.date)}</Text><Text style={styles.dateCondition}>{trend.conditionText ?? "未知"}</Text>
        <Text style={styles.dateTemperature}>{value(trend.lowTemperatureC, "°")}–{value(trend.highTemperatureC, "°")}</Text>
        <Text style={styles.dateConfidence}>{confidenceLabel(trend.confidence)} · {Math.round(trend.confidence * 100)}%</Text>
      </Pressable>)}
    </ScrollView> : <State title="暂无 15 日趋势" body="供应商没有返回可用日数据；不会用当前天气填充未来日期。" />}
    <Text testID="forecast-night-selector" style={styles.srEvidence}>{selected ? `${selected.date} · 远期规划夜` : "暂无远期趋势"}</Text>
    <View style={styles.evidenceGrid}>
      <Evidence testID="forecast-trend-confidence" title={selected ? `趋势可信度 ${Math.round(selected.confidence * 100)}%` : "趋势不可用"} body={selected ? `${selected.conditionText ?? "天气现象未知"} · 总云 ${percent(selected.averageTotalCloudPct)} · 降水 ${value(selected.precipitationMm, " mm")}` : "供应商没有返回可用日数据。"} meta={selected ? `无月黑夜 ${value(selected.moonlessDarkMinutes, " 分钟")} · 目标可见 ${value(selected.targetVisibleMinutes, " 分钟")}` : undefined} />
      <Evidence testID="forecast-validity" title="规划边界" body="日期越远，可信度越低；临近出发必须刷新天气、预警和路线。" meta="选定日期会重新请求对应观星夜，而不是沿用今晚矩阵。" />
    </View>
  </View>;
}

function Timeline({ bundle, onSelectTime }: { bundle: ForecastBundle; onSelectTime: (instant: string) => void }) {
  const sky = bundle.astronomy;
  const windows = [
    { key: "dark", label: "完全天黑", window: sky.astronomicalDarkWindow, tone: styles.timelineDark },
    { key: "moon", label: "无月黑夜", window: sky.moonlessWindow, tone: styles.timelineMoonless },
    { key: "target", label: "目标可见", window: sky.targetWindow, tone: styles.timelineTarget },
    { key: "best", label: "最佳交集", window: sky.bestIntersection, tone: styles.timelineBest },
  ];
  return <View style={styles.section}>
    <SectionHeading eyebrow="暮光与目标" title="连续天文窗口" meta={sky.timezone} />
    <View style={styles.timeline} accessibilityRole="summary" accessibilityLabel="天文黑夜、无月与目标可见窗口">
      <View style={styles.timelineRail} />
      {windows.map((item) => <Pressable
        key={item.key}
        testID={item.key === "dark" ? "twilight-window-strip" : undefined}
        accessibilityRole="button"
        accessibilityLabel={item.key === "dark" ? `暮光与黑夜窗口，${item.label}` : undefined}
        disabled={!item.window}
        onPress={() => item.window && onSelectTime(item.window.startUtc)}
        style={({ pressed }) => [styles.timelineRow, pressed && styles.pressed]}
      >
        <Text style={styles.timelineLabel}>{item.label}</Text><View style={[styles.timelineBar, item.tone, !item.window && styles.timelineUnavailable]} />
        <Text style={styles.timelineTime}>{item.window ? `${time(item.window.startUtc, sky.timezone)}–${time(item.window.endUtc, sky.timezone)}` : "无连续窗口"}</Text>
      </Pressable>)}
      <View style={styles.timelineTicks}><Text style={styles.timelineTick}>{time(sky.civilDusk, sky.timezone)} 民用昏影</Text><Text style={styles.timelineTick}>{time(sky.civilDawn, sky.timezone)} 民用晨光</Text></View>
    </View>
    <View style={styles.evidenceGrid}>
      <Evidence testID="astronomy-twilight" title="完全天黑" body={sky.astronomicalDarkWindow ? `${time(sky.astronomicalDarkWindow.startUtc, sky.timezone)}–${time(sky.astronomicalDarkWindow.endUtc, sky.timezone)} · ${sky.astronomicalDarkWindow.durationMinutes} 分钟` : "本夜无完整天文黑夜"} meta={`算法 ${sky.algorithmVersion} · ${sky.coordinateSystem}`} />
      <Evidence testID="astronomy-moon-window" title="无月窗口" body={sky.moonlessWindow ? `${time(sky.moonlessWindow.startUtc, sky.timezone)}–${time(sky.moonlessWindow.endUtc, sky.timezone)} · ${sky.moonlessWindow.durationMinutes} 分钟` : "完全天黑期间没有连续无月窗口"} meta={`月升 ${time(sky.moonRise, sky.timezone)} · 月落 ${time(sky.moonSet, sky.timezone)}`} />
    </View>
    <Evidence testID="astronomy-milky-way-window" title="银河目标最佳真实交集" body={sky.bestIntersection ? `${time(sky.bestIntersection.startUtc, sky.timezone)}–${time(sky.bestIntersection.endUtc, sky.timezone)} · ${sky.bestIntersection.durationMinutes} 分钟` : "完全天黑、无月和银河目标高度没有交集"} meta={sky.limitations.join("；") || "窗口只取天文黑夜、月光与目标条件的真实交集。"} />
  </View>;
}

type MatrixRow = { label: string; value: (hour: ProfessionalForecastHour) => string };
const matrixRows: MatrixRow[] = [
  { label: "天气", value: (hour) => hour.conditionText ?? "—" },
  { label: "总 / 低云", value: (hour) => `${percent(hour.totalCloudPct)} / ${percent(hour.lowCloudPct)}` },
  { label: "中 / 高云", value: (hour) => `${percent(hour.midCloudPct)} / ${percent(hour.highCloudPct)}` },
  { label: "通透度", value: (hour) => `${Math.round(hour.atmosphere.confidence * 100)}%` },
  { label: "视宁度", value: (hour) => hour.atmosphere.officialSeeing ? "已验证" : "未启用" },
  { label: "能见度", value: (hour) => value(hour.visibilityM === null ? null : hour.visibilityM / 1000, " km") },
  { label: "温度 / 体感", value: (hour) => `${value(hour.temperatureC, "°")} / ${value(hour.apparentTemperatureC, "°")}` },
  { label: "湿度 / 露点", value: (hour) => `${percent(hour.relativeHumidityPct)} / ${value(hour.dewPointC, "°")}` },
  { label: "结露差", value: (hour) => value(hour.dewPointSpreadC, "°") },
  { label: "降水 / 概率", value: (hour) => `${value(hour.precipitationMm, " mm")} / ${percent(hour.precipitationProbabilityPct)}` },
  { label: "风 / 阵风", value: (hour) => `${value(hour.windSpeedMps, " m/s")} / ${value(hour.windGustMps, " m/s")}` },
  { label: "风向", value: (hour) => value(hour.windDirectionDeg, "°") },
  { label: "气压 / 变化", value: (hour) => `${value(hour.pressureHpa, " hPa")} / ${value(hour.pressureChangeHpa, " hPa")}` },
  { label: "AQI / PM2.5", value: (hour) => `${value(hour.aqi)} / ${value(hour.pm25UgM3, " μg/m³")}` },
  { label: "雾概率", value: (hour) => percent(hour.fogProbabilityPct) },
  { label: "月亮亮度 / 高度", value: (hour) => `${percent(hour.moonIlluminationPct)} / ${value(hour.moonAltitudeDeg, "°")}` },
  { label: "目标高度 / 方位", value: (hour) => `${value(hour.targetAltitudeDeg, "°")} / ${value(hour.targetAzimuthDeg, "°")}` },
];

function HourlyMatrix({ series, selectedIndex, onSelect, timezone, isFetching }: { series: ForecastModelSeries; selectedIndex: number; onSelect: (index: number) => void; timezone: string; isFetching: boolean }) {
  const hour = series.hours[selectedIndex];
  return <View style={styles.section}>
    <SectionHeading eyebrow="小时级矩阵" title="连续比较专业指标" meta={isFetching ? "正在刷新，保留已加载列" : `${series.run.provider} ${series.run.model}`} />
    {hour ? <View style={styles.selectedHour}>
      <Text style={styles.selectedHourTitle}>{time(hour.validTimeUtc, timezone)} · 已同步到天文窗口与图层时间</Text>
      <View style={styles.evidenceGrid}>
        <Evidence testID="forecast-hourly-cloud" title="分层云" body={`总云 ${percent(hour.totalCloudPct)} · 低云 ${percent(hour.lowCloudPct)} · 中云 ${percent(hour.midCloudPct)} · 高云 ${percent(hour.highCloudPct)}`} meta={hour.missingFields.length ? `缺失：${hour.missingFields.join("、")}` : "全部字段保留供应商质量标记。"} />
        <Evidence testID="forecast-hourly-transparency" title={hour.atmosphere.label} body={`可信度 ${Math.round(hour.atmosphere.confidence * 100)}% · 能见度 ${value(hour.visibilityM === null ? null : hour.visibilityM / 1000, " km")} · AOD ${value(hour.aerosolOpticalDepth)}`} meta={hour.atmosphere.uncertainty} />
      </View>
      <Evidence testID="forecast-hourly-seeing" title={hour.atmosphere.officialSeeing ? "经验证的视宁度" : "正式视宁度未启用"} body={hour.atmosphere.officialSeeing ? "由已校准供应商提供。" : "不输出 arcsec 数字；实验性大气稳定度不会伪装成专业视宁度。"} meta={`方法 ${hour.atmosphere.methodVersion} · 状态 ${hour.quality}`} />
    </View> : null}
    {series.hours.length ? <View style={styles.matrixFrame}>
      <View style={styles.matrixLabels}><View style={styles.matrixCorner}><Text style={styles.matrixCornerText}>指标</Text></View>{matrixRows.map((row) => <View key={row.label} style={styles.matrixLabelCell}><Text style={styles.matrixLabelText}>{row.label}</Text></View>)}</View>
      <ScrollView testID="hourly-matrix" horizontal nestedScrollEnabled showsHorizontalScrollIndicator contentContainerStyle={styles.matrixColumns} accessibilityRole="summary" accessibilityLabel="小时级连续矩阵，可横向浏览并选择时间列">
        {series.hours.map((item, index) => <Pressable
          key={item.validTimeUtc}
          accessibilityRole="button"
          accessibilityLabel={`${time(item.validTimeUtc, timezone)}，${item.conditionText ?? "天气未知"}，${item.quality}`}
          accessibilityState={{ selected: index === selectedIndex }}
          onPress={() => onSelect(index)}
          style={({ pressed }) => [styles.matrixColumn, index === selectedIndex && styles.matrixColumnSelected, pressed && styles.pressed]}
        >
          <View style={styles.matrixHeader}><Text style={styles.matrixTime}>{time(item.validTimeUtc, timezone)}</Text><Text style={styles.matrixQuality}>{item.quality}</Text></View>
          {matrixRows.map((row) => <View key={row.label} style={styles.matrixValueCell}><Text style={styles.matrixValueText}>{row.value(item)}</Text></View>)}
        </Pressable>)}
      </ScrollView>
    </View> : <State title="所选观星夜暂无小时数据" body="请检查日期或稍后刷新；缺失数据不会显示成晴天或 0。" />}
  </View>;
}

function LayerPanel({ layers, selectedId, onSelect, selectedTime }: { layers: ForecastLayerDescriptor[]; selectedId: string | null; onSelect: (id: string) => void; selectedTime: string | null }) {
  const layer = layers.find((item) => item.id === selectedId) ?? layers[0];
  const [opacity, setOpacity] = useState(layer?.opacity ?? 0.7);
  useEffect(() => setOpacity(layer?.opacity ?? 0.7), [layer?.id, layer?.opacity]);
  const changeOpacity = (delta: number) => setOpacity((current) => Math.max(0.2, Math.min(1, Math.round((current + delta) * 10) / 10)));
  return <View style={styles.section}>
    <SectionHeading eyebrow="天气图层" title="切换一个主要证据层" meta={selectedTime ? `${time(selectedTime)} 时刻` : "未选择时间"} />
    {layers.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
      {layers.map((item, index) => <Choice key={item.id} testID={index === 0 ? "weather-layer-panel" : undefined} label={item.name} selected={item.id === layer?.id} disabled={item.status === "missing"} onPress={() => onSelect(item.id)} accessibilityLabel={index === 0 ? `天气图层面板，${item.name}，${item.status}` : `${item.name}，${item.status}`} />)}
    </ScrollView> : <State title="当前范围无可用图层" body="保留基础地图；不会用无来源色块模拟天气图层。" />}
    {layer ? <View style={styles.layerPreview}>
      <View style={styles.legendRow}>{layer.legend.map((entry) => <View key={`${entry.from}-${entry.to}`} style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: entry.color, opacity }]} /><Text style={styles.legendText}>{entry.label}</Text></View>)}</View>
      <View style={styles.opacityRow}><Text style={styles.opacityLabel}>透明度 {Math.round(opacity * 100)}%</Text><View style={styles.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel="降低图层透明度" onPress={() => changeOpacity(-0.1)} style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}><Text style={styles.stepperText}>−</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="提高图层透明度" onPress={() => changeOpacity(0.1)} style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}><Text style={styles.stepperText}>＋</Text></Pressable>
      </View></View>
      {!layer.tileUrl ? <Text style={styles.layerLimitation}>当前没有合法可用的瓦片地址；底图保持可操作，图层仅显示来源和限制。</Text> : null}
    </View> : null}
    <View style={styles.evidenceGrid}>
      <Evidence testID="forecast-layer-source" title="数据来源" body={layer ? `${layer.provider} · ${layer.model}` : "来源不可用"} meta={layer?.attribution.map((item) => `${item.label} · ${item.licenseId}`).join("；")} />
      <Evidence testID="forecast-layer-version" title="批次与图例" body={layer ? `${layer.runId} · ${layer.legend.map((item) => item.label).join(" / ")} · 透明度 ${Math.round(opacity * 100)}%` : "无可验证批次"} meta={layer?.limitation ?? undefined} />
    </View>
    <Evidence testID="forecast-layer-freshness" title="生成与更新" body={layer ? `生成 ${layer.generatedAt} · 下次更新 ${layer.nextUpdateAt}` : "更新时间不可用"} meta={`状态：${layer?.status ?? "missing"}`} />
  </View>;
}

export function ForecastScreen() {
  const restoration = useTabRestorationEvidence({
    testID: "tab-restoration-tonight",
    tabId: "primary-tab-tonight",
    rootRoute: "/tonight",
    nestedRoute: "/forecast",
    ownerType: "scroll",
    ownerId: "tonight-forecast-scroll-owner",
  });
  const location = useShellStore((state) => state.location);
  const [activeSection, setActiveSection] = useState<SectionKey>("hourly-professional-view");
  const [selectedNight, setSelectedNight] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedModel, setSelectedModel] = useState<ModelKey>("primary");
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const pageScrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<SectionKey, number>>>({});
  const pendingSection = useRef<SectionKey | null>(null);
  const latitude = location.latitude ?? 22.529;
  const longitude = location.longitude ?? 113.9468;
  const query = useQuery({
    queryKey: ["forecast", latitude, longitude, selectedNight],
    queryFn: ({ signal }) => client.get({ latitude, longitude, timezone: "Asia/Shanghai", nightDate: selectedNight, target: "milky-way-core" }, signal),
    retry: 1,
    placeholderData: (previous) => previous,
  });
  const bundle = query.data;
  const sourceSeries = useMemo(
    () => selectedModel === "comparison" && bundle?.comparison ? bundle.comparison : bundle?.primary,
    [bundle, selectedModel],
  );
  const series = useMemo(() => sourceSeries ? {
    ...sourceSeries,
    hours: observingNightHours(sourceSeries.hours, selectedNight, bundle?.context.timezone ?? "Asia/Shanghai"),
  } : undefined, [bundle?.context.timezone, selectedNight, sourceSeries]);

  useEffect(() => {
    if (!series?.hours.length) { setSelectedHourIndex(0); return; }
    const dusk = bundle?.astronomy.astronomicalDusk;
    const nextIndex = dusk ? series.hours.findIndex((hour) => hour.validTimeUtc >= dusk) : 0;
    setSelectedHourIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [bundle?.context.nightDate, bundle?.astronomy.astronomicalDusk, series?.run.runId]);
  useEffect(() => {
    if (selectedModel === "comparison" && !bundle?.comparison) setSelectedModel("primary");
  }, [bundle?.comparison, selectedModel]);
  useEffect(() => {
    if (bundle?.layers.length && !bundle.layers.some((layer) => layer.id === selectedLayerId)) setSelectedLayerId(bundle.layers[0].id);
  }, [bundle?.layers, selectedLayerId]);

  const navigateToSection = (section: SectionKey) => {
    setActiveSection(section);
    pendingSection.current = section;
    const offset = sectionOffsets.current[section];
    if (typeof offset === "number") requestAnimationFrame(() => {
      pageScrollRef.current?.scrollTo({ y: Math.max(0, offset - spacing.x1), animated: true });
      pendingSection.current = null;
    });
  };
  const registerSectionOffset = (section: SectionKey, offset: number) => {
    sectionOffsets.current[section] = offset;
    if (pendingSection.current === section) requestAnimationFrame(() => {
      pageScrollRef.current?.scrollTo({ y: Math.max(0, offset - spacing.x1), animated: true });
      pendingSection.current = null;
    });
  };
  const selectTimelineTime = (instant: string) => {
    if (!series?.hours.length) return;
    const target = Date.parse(instant);
    const nearest = series.hours.reduce((best, hour, index) => Math.abs(Date.parse(hour.validTimeUtc) - target) < Math.abs(Date.parse(series.hours[best].validTimeUtc) - target) ? index : best, 0);
    setSelectedHourIndex(nearest); navigateToSection("hourly-professional-view");
  };
  const selectedHour = series?.hours[selectedHourIndex];
  const locationLabel = location.source === "unset" ? "深圳市 · 手动默认范围" : location.label;

  return <SafeAreaView testID="screen-forecast-and-astronomy" style={styles.screen}>
    <ScrollView ref={pageScrollRef} onScroll={restoration.onScroll} scrollEventThrottle={restoration.scrollEventThrottle} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {restoration.evidence}
      <View style={styles.pageHeader}>
        <Text testID={bundle ? "forecast-data-ready" : undefined} style={styles.eyebrow}>专业证据 · {locationLabel}</Text><Text style={styles.title}>为什么这个观星夜值得去</Text>
        <Text style={styles.subtitle}>预测、估算和版本化天文计算分别标注；缺失值、低可信度与实验边界不会被隐藏。</Text>
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionNav}>
          {sectionActions.map((action) => <Pressable key={action.key} testID={action.testID} accessibilityRole="button" accessibilityState={{ selected: activeSection === action.key }} onPress={() => navigateToSection(action.key)} style={({ pressed }) => [styles.navAction, activeSection === action.key && styles.navActionActive, pressed && styles.pressed]}><Text style={[styles.navActionText, activeSection === action.key && styles.navActionTextActive]}>{action.label}</Text></Pressable>)}
        </ScrollView>
      </View>

      {query.isLoading ? <State title="正在加载天气和天文证据…" body="服务端正在合并小时预报、模型来源与版本化天文计算；布局空间会保持稳定。" /> : null}
      {query.isError ? <State title="专业条件暂不可用" body={query.error instanceof Error && query.error.message === "forecast_api_base_url_missing" ? "尚未配置 EXPO_PUBLIC_API_BASE_URL；不会以内置数字替代真实数据。" : "上游或聚合 API 请求失败；可以安全重试。"} retry={() => void query.refetch()} /> : null}
      {bundle?.warnings.map((warning) => <View key={warning} style={styles.warning}><Text style={styles.warningText}>{warning}</Text></View>)}
      {bundle && bundle.status !== "fresh" ? <View style={styles.statusBanner}><Text style={styles.statusBannerTitle}>{bundle.status === "stale" ? "数据已过期" : "部分数据可用"}</Text><Text style={styles.statusBannerBody}>保留可用模型与列；缺失项显示为“—”，不会改写成 0 或 fresh。</Text></View> : null}

      {bundle ? <>
        <View collapsable={false} onLayout={(event) => registerSectionOffset("model-disagreement", event.nativeEvent.layout.y)}><ModelSelector bundle={bundle} selected={selectedModel} onSelect={(key) => { setSelectedModel(key); navigateToSection("model-disagreement"); }} /></View>
        <View collapsable={false} onLayout={(event) => registerSectionOffset("future-trend", event.nativeEvent.layout.y)}><TrendCalendar trends={bundle.trends} selectedNight={selectedNight} onSelect={(date) => { setSelectedNight(date); navigateToSection("future-trend"); }} /></View>
        <View collapsable={false} onLayout={(event) => registerSectionOffset("twilight-and-milky-way", event.nativeEvent.layout.y)}><Timeline bundle={bundle} onSelectTime={selectTimelineTime} /></View>
        {series ? <View collapsable={false} onLayout={(event) => registerSectionOffset("hourly-professional-view", event.nativeEvent.layout.y)}><HourlyMatrix series={series} selectedIndex={Math.min(selectedHourIndex, Math.max(0, series.hours.length - 1))} onSelect={(index) => { setSelectedHourIndex(index); navigateToSection("hourly-professional-view"); }} timezone={bundle.context.timezone} isFetching={query.isFetching} /></View> : null}
        <View collapsable={false} onLayout={(event) => registerSectionOffset("layer-provenance", event.nativeEvent.layout.y)}><LayerPanel layers={bundle.layers} selectedId={selectedLayerId} onSelect={(id) => { setSelectedLayerId(id); navigateToSection("layer-provenance"); }} selectedTime={selectedHour?.validTimeUtc ?? null} /></View>
        <View style={styles.provenance}><Text style={styles.provenanceTitle}>本次证据修订</Text><Text style={styles.provenanceBody}>生成 {bundle.generatedAt} · 有效至 {bundle.expiresAt} · {bundle.context.coordinateSystem} · {bundle.context.timezone}</Text></View>
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingBottom: spacing.x5, gap: spacing.x2 },
  pageHeader: { paddingHorizontal: spacing.x2, paddingTop: spacing.x2, gap: spacing.x1 },
  eyebrow: { color: palette.primaryActive, fontSize: typeToken.label, fontWeight: "700", letterSpacing: 0.4 },
  title: { color: palette.text, fontSize: typeToken.title, lineHeight: 32, fontWeight: "700" },
  subtitle: { color: palette.textSecondary, fontSize: typeToken.body, lineHeight: 23 },
  sectionNav: { gap: spacing.x1, paddingTop: spacing.x1, paddingBottom: 2 },
  navAction: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface },
  navActionActive: { borderColor: palette.primaryActive, backgroundColor: palette.primaryActive },
  navActionText: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" },
  navActionTextActive: { color: palette.onPrimary },
  section: { marginHorizontal: spacing.x2, gap: spacing.x2, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface },
  sectionHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.x1 },
  sectionHeadingCopy: { flex: 1, gap: 2 }, sectionEyebrow: { color: palette.primaryActive, fontSize: typeToken.caption, fontWeight: "700", letterSpacing: 0.5 },
  sectionTitle: { color: palette.text, fontSize: typeToken.section, lineHeight: 24, fontWeight: "700" }, sectionMeta: { maxWidth: 132, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17, textAlign: "right" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 },
  choice: { minHeight: minimumTouchTarget, justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.surface },
  choiceSelected: { borderColor: palette.primaryActive, backgroundColor: palette.surfaceMuted }, choiceText: { color: palette.textSecondary, fontSize: typeToken.label, fontWeight: "700" }, choiceTextSelected: { color: palette.primaryActive },
  disabled: { opacity: 0.48 }, pressed: { opacity: 0.68 },
  explanation: { padding: spacing.x2, borderLeftWidth: 3, borderLeftColor: palette.primaryActive, borderRadius: radii.control, backgroundColor: palette.surfaceMuted }, explanationTitle: { color: palette.text, fontSize: typeToken.body, lineHeight: 21, fontWeight: "700" }, explanationBody: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 18 },
  evidenceGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 },
  evidence: { flexGrow: 1, flexBasis: 150, minHeight: 94, padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface }, evidenceTitle: { color: palette.text, fontSize: typeToken.body, fontWeight: "700" }, evidenceBody: { marginTop: 5, color: palette.text, fontSize: typeToken.label, lineHeight: 19 }, evidenceMeta: { marginTop: 5, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 17 },
  dateRow: { gap: spacing.x1, paddingBottom: 2 }, dateCard: { width: 112, minHeight: 118, padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.canvas }, dateCardSelected: { borderWidth: 2, borderColor: palette.primaryActive, backgroundColor: palette.surfaceMuted }, dateLabel: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" }, dateCondition: { marginTop: spacing.x1, color: palette.text, fontSize: typeToken.body }, dateTemperature: { marginTop: 4, color: palette.text, fontSize: typeToken.label, fontWeight: "700" }, dateConfidence: { marginTop: 4, color: palette.textSecondary, fontSize: typeToken.caption }, srEvidence: { color: palette.textSecondary, fontSize: typeToken.caption },
  timeline: { gap: spacing.x1, paddingVertical: spacing.x1 }, timelineRail: { position: "absolute", top: 8, bottom: 28, left: 82, width: 1, backgroundColor: palette.border }, timelineRow: { minHeight: minimumTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.x1 }, timelineLabel: { width: 70, color: palette.text, fontSize: typeToken.label, fontWeight: "700" }, timelineBar: { flex: 1, height: 10, borderRadius: radii.pill }, timelineDark: { backgroundColor: "#203A5A" }, timelineMoonless: { backgroundColor: "#58677C" }, timelineTarget: { backgroundColor: palette.primary }, timelineBest: { backgroundColor: palette.success }, timelineUnavailable: { backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.border }, timelineTime: { width: 84, color: palette.textSecondary, fontSize: 11, textAlign: "right" }, timelineTicks: { flexDirection: "row", justifyContent: "space-between", marginLeft: 78 }, timelineTick: { color: palette.textSecondary, fontSize: 11 },
  matrixFrame: { flexDirection: "row", overflow: "hidden", borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.canvas }, matrixLabels: { width: 114, zIndex: 2, borderRightWidth: 1, borderRightColor: palette.border, backgroundColor: palette.surface }, matrixCorner: { height: 62, justifyContent: "center", paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: palette.border }, matrixCornerText: { color: palette.textSecondary, fontSize: typeToken.caption, fontWeight: "700" }, matrixLabelCell: { height: 48, justifyContent: "center", paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border }, matrixLabelText: { color: palette.text, fontSize: 11, fontWeight: "700" }, matrixColumns: { minWidth: 112, flexDirection: "row" }, matrixColumn: { width: 112, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: palette.border }, matrixColumnSelected: { backgroundColor: palette.surfaceMuted, borderTopWidth: 3, borderTopColor: palette.primaryActive }, matrixHeader: { height: 62, justifyContent: "center", alignItems: "center", borderBottomWidth: 1, borderBottomColor: palette.border }, matrixTime: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" }, matrixQuality: { marginTop: 3, color: palette.textSecondary, fontSize: 10 }, matrixValueCell: { height: 48, justifyContent: "center", alignItems: "center", paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border }, matrixValueText: { color: palette.text, fontFamily: typeToken.mono, fontSize: 10, lineHeight: 14, textAlign: "center" },
  selectedHour: { gap: spacing.x1 }, selectedHourTitle: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" },
  layerPreview: { gap: spacing.x2, padding: spacing.x2, borderRadius: radii.control, backgroundColor: palette.canvas }, legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x1 }, legendItem: { flexDirection: "row", alignItems: "center", gap: 5 }, legendSwatch: { width: 24, height: 12, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border }, legendText: { color: palette.textSecondary, fontSize: typeToken.caption }, opacityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, opacityLabel: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" }, stepper: { flexDirection: "row", gap: spacing.x1 }, stepperButton: { width: minimumTouchTarget, height: minimumTouchTarget, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.border, borderRadius: radii.control, backgroundColor: palette.surface }, stepperText: { color: palette.text, fontSize: 20, fontWeight: "700" }, layerLimitation: { color: palette.warning, fontSize: typeToken.caption, lineHeight: 18 },
  state: { minHeight: 170, justifyContent: "center", marginHorizontal: spacing.x2, padding: spacing.x2, borderWidth: 1, borderColor: palette.border, borderRadius: radii.layer, backgroundColor: palette.surface }, stateTitle: { color: palette.text, fontSize: typeToken.section, fontWeight: "700" }, stateBody: { marginTop: spacing.x1, color: palette.textSecondary, lineHeight: 21 }, retry: { minHeight: minimumTouchTarget, marginTop: spacing.x2, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: palette.primaryActive }, retryText: { color: palette.onPrimary, fontWeight: "700" },
  warning: { marginHorizontal: spacing.x2, padding: spacing.x1, borderRadius: radii.control, backgroundColor: "#FFF5E5" }, warningText: { color: palette.warning, fontSize: typeToken.caption, lineHeight: 18 }, statusBanner: { marginHorizontal: spacing.x2, padding: spacing.x2, borderWidth: 1, borderColor: palette.warning, borderRadius: radii.control, backgroundColor: "#FFF8EA" }, statusBannerTitle: { color: palette.warning, fontSize: typeToken.label, fontWeight: "700" }, statusBannerBody: { marginTop: 4, color: palette.text, fontSize: typeToken.caption, lineHeight: 18 },
  provenance: { marginHorizontal: spacing.x2, padding: spacing.x2, borderTopWidth: 1, borderTopColor: palette.border }, provenanceTitle: { color: palette.text, fontSize: typeToken.label, fontWeight: "700" }, provenanceBody: { marginTop: 4, color: palette.textSecondary, fontSize: typeToken.caption, lineHeight: 18 },
});
