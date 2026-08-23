import Taro, {
  useDidHide,
  useDidShow,
  useReady,
  useRouter,
} from "@tarojs/taro";
import { Canvas, ScrollView, Slider, Text, View } from "@tarojs/components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type HourlySkyRow,
  type ObservationContext,
  type SkyReport,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { DataStateBadge } from "@/components/data-state-badge";
import { NotificationRegion } from "@/components/notification";
import { Provenance } from "@/components/provenance";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  getObservationContext,
  getSkyReport,
  getSpotOverview,
  updateObservationContext,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./spot-sky-page.scss";

const CANVAS_ID = "spot-night-sky-scene";

export type SkyView = "MAIN" | "DETAIL" | "TARGETS";

const TARGET_TYPE_LABEL: Readonly<Record<SkyReport["targets"][number]["type"], string>> = {
  STAR: "恒星",
  PLANET: "行星",
  CONSTELLATION: "星座",
  MILKY_WAY: "银河",
  METEOR_SHOWER: "流星雨",
  CONJUNCTION: "天体相合",
};

const SUITABLE_FOR_LABEL: Readonly<
  Record<SkyReport["decision"]["skyOpportunity"]["suitableFor"][number], string>
> = {
  NAKED_EYE: "肉眼观测",
  PHONE: "手机拍摄",
  MILKY_WAY: "银河拍摄",
  STAR_TRAIL: "星轨拍摄",
  DEEP_SKY: "深空摄影",
};

const DATA_STATE_LABEL: Readonly<Record<HourlySkyRow["state"], string>> = {
  FRESH: "当前",
  STALE_USABLE: "可用但已旧",
  PARTIAL: "部分数据",
  EXPIRED: "已过期",
  UNAVAILABLE: "不可用",
  ESTIMATED: "估算",
  SAMPLE_DATA: "资料不足",
};

const DARKNESS_LABEL: Readonly<Record<HourlySkyRow["darkness"], string>> = {
  DAY: "日间",
  TWILIGHT: "暮光",
  ASTRONOMICAL_NIGHT: "天文黑夜",
};

const MODEL_CONSISTENCY_LABEL: Readonly<
  Record<HourlySkyRow["modelConsistencyLabel"], string>
> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
  UNAVAILABLE: "未提供",
};

const WEATHER_TIMELINE_ROLE_LABEL: Readonly<
  Record<SkyReport["weatherEvidence"]["timelineRole"], string>
> = {
  PRIMARY: "业务主时间线",
  PRIMARY_FALLBACK: "已启用明确备源",
  UNAVAILABLE: "时间线不可用",
};

const WEATHER_MODEL_LABEL: Readonly<Record<string, string>> = {
  "qweather-grid-72h": "和风天气格点预报",
  best_match: "Open-Meteo 推荐预报",
  icon_seamless: "ICON 全球模型",
  gfs_seamless: "GFS 全球模型",
  ecmwf_ifs025: "ECMWF IFS",
  ecmwf_aifs025_single: "ECMWF AIFS",
  "deterministic-test-fixture": "开发验收天气",
};

function metricValue(
  value: number | null | undefined,
  suffix = "",
  digits = 0,
) {
  return value === null || value === undefined
    ? "未提供"
    : `${value.toFixed(digits)}${suffix}`;
}

function ProfessionalMatrixRow({
  label,
  rows,
  value,
  header = false,
}: {
  label: string;
  rows: readonly HourlySkyRow[];
  value: (row: HourlySkyRow) => string;
  header?: boolean;
}) {
  return (
    <View
      className={`professional-matrix-row${header ? " professional-matrix-row--head" : ""}`}
      data-od-id="sky-professional-matrix-row"
    >
      <Text className="professional-matrix-row__label">{label}</Text>
      {rows.map((row) => (
        <Text className="professional-matrix-row__cell" key={`${label}:${row.at}`}>
          {value(row)}
        </Text>
      ))}
    </View>
  );
}

const ACTIVITY_STAGE_LABEL = {
  WEAK: "较弱",
  MODERATE: "中等",
  STRONG: "较强",
  NEAR_PEAK: "接近峰值",
} as const;

interface SpotNightRouteContext {
  spotId: string;
  contextId: string;
  localDate: string;
  selectedAt: string;
  timezone: string;
  dataRevision: string;
}

function safeParam(value: string | undefined) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isSelectedAt(value: string) {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

function validTimezone(value: string) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function observationDateFor(selectedAt: string, timezone: string) {
  if (!isSelectedAt(selectedAt) || !validTimezone(timezone)) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(Date.parse(selectedAt) - 12 * 60 * 60 * 1000));
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year ?? ""}-${values.month ?? ""}-${values.day ?? ""}`;
  } catch {
    return "";
  }
}

function formatTime(value: string | null | undefined, timezone: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "时间不可用";
  }
}

function formatDateTime(value: string | null | undefined, timezone: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "时间不可用";
  }
}

function MeteorActivityProfile({
  activity,
}: {
  activity: NonNullable<SkyReport["targets"][number]["activity"]>;
}) {
  const currentSample = activity.samples.reduce(
    (nearest, sample) =>
      Math.abs(sample.solarLongitudeDeg - activity.currentSolarLongitudeDeg) <
      Math.abs(nearest.solarLongitudeDeg - activity.currentSolarLongitudeDeg)
        ? sample
        : nearest,
    activity.samples[0]!,
  );
  return (
    <View className="meteor-activity">
      <View className="meteor-activity__header">
        <View>
          <Text className="type-label">相对活动曲线</Text>
          <Text className="type-caption">
            历史拟合 · 太阳黄经 J2000 · 不是实时观测
          </Text>
        </View>
        <Text className="status-tag meteor-activity__stage">
          {ACTIVITY_STAGE_LABEL[activity.stage]} · 约 {Math.round(activity.relativeActivity * 100)}%
        </Text>
      </View>
      <View
        className="meteor-activity__chart"
        aria-label={`历史拟合相对活动约 ${Math.round(activity.relativeActivity * 100)}%，${ACTIVITY_STAGE_LABEL[activity.stage]}`}
      >
        {activity.samples.map((sample) => (
          <View
            key={sample.solarLongitudeDeg}
            className={`meteor-activity__bar${sample.solarLongitudeDeg === currentSample.solarLongitudeDeg ? " meteor-activity__bar--current" : ""}`}
            style={{ height: `${Math.max(4, sample.relativeActivity * 100)}%` }}
            aria-hidden
          />
        ))}
      </View>
      <View className="meteor-activity__axis">
        <Text className="type-caption">
          λ☉ {activity.samples[0]?.solarLongitudeDeg.toFixed(0)}°
        </Text>
        <Text className="type-caption">
          峰值 {activity.referencePeakSolarLongitudeDeg.toFixed(2)}°
        </Text>
        <Text className="type-caption">
          {activity.samples.at(-1)?.solarLongitudeDeg.toFixed(0)}°
        </Text>
      </View>
      <Provenance source={activity.source} compact />
    </View>
  );
}

function SkyTargetCard({
  target,
}: {
  target: SkyReport["targets"][number];
}) {
  return (
    <View className="sky-target">
      <View className="sky-target__top">
        <View>
          <Text className="type-section">{target.displayName}</Text>
          <Text className="type-caption">{TARGET_TYPE_LABEL[target.type]}</Text>
        </View>
        <Text className="status-tag sky-target__confidence">
          {target.confidence === null
            ? "信心未知"
            : `信心 ${Math.round(target.confidence * 100)}%`}
        </Text>
      </View>
      <Text className="type-data sky-target__geometry">
        {target.window
          ? `${target.window.start}—${target.window.end}`
          : "窗口不足"}{" "}
        · {target.direction} · 高度 {target.altitudeDeg ?? "未知"}°
      </Text>
      <Text className="type-body">{target.reason}</Text>
      {target.activity ? (
        <MeteorActivityProfile activity={target.activity} />
      ) : null}
      <Provenance source={target.source} compact />
    </View>
  );
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
}

function nearestHourIndex(hourly: readonly HourlySkyRow[], selectedAt: string) {
  if (!hourly.length || !isSelectedAt(selectedAt)) return 0;
  const target = Date.parse(selectedAt);
  return hourly.reduce((nearest, item, index) => {
    const distance = Math.abs(Date.parse(item.at) - target);
    const nearestDistance = Math.abs(
      Date.parse(hourly[nearest]?.at ?? item.at) - target,
    );
    return distance < nearestDistance ? index : nearest;
  }, 0);
}

function extractDegrees(direction: string) {
  const match = direction.match(/(?:^|\s)(\d{1,3}(?:\.\d+)?)\s*°?/u);
  if (!match) return null;
  const degrees = Number(match[1]);
  return Number.isFinite(degrees) && degrees >= 0 && degrees <= 360
    ? degrees
    : null;
}

type LocalCompassState =
  | "STARTING"
  | "READY"
  | "LOW_ACCURACY"
  | "UNAVAILABLE";

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function compassAccuracyState(
  accuracy: number | string,
): Exclude<LocalCompassState, "STARTING"> {
  if (typeof accuracy === "number") {
    if (!Number.isFinite(accuracy) || accuracy < 0) return "UNAVAILABLE";
    return accuracy <= 20 ? "READY" : "LOW_ACCURACY";
  }
  const normalized = accuracy.toLowerCase();
  if (normalized === "high" || normalized === "medium") return "READY";
  if (normalized === "low") return "LOW_ACCURACY";
  return "UNAVAILABLE";
}

function drawSkyScene(
  context: ReturnType<typeof Taro.createCanvasContext>,
  data: SkyReport | undefined,
  orientationOffset: number,
  width: number,
  height: number,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(58, Math.min(width / 2 - 32, height / 2 - 34));
  context.setFillStyle("#07101C");
  context.fillRect(0, 0, width, height);
  context.setStrokeStyle("#42617E");
  context.setLineWidth(1);
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(centerX - radius, centerY);
  context.lineTo(centerX + radius, centerY);
  context.stroke();
  context.setFillStyle("#D5E4F3");
  context.setFontSize(12);
  context.fillText("北", centerX - 6, centerY - radius - 10);
  context.fillText("东", centerX + radius + 8, centerY + 4);
  context.fillText("南", centerX - 6, centerY + radius + 18);
  context.fillText("西", centerX - radius - 18, centerY + 4);
  context.setFillStyle("#87B8E8");
  context.setFontSize(11);
  context.fillText("当前计算目标（方向环，非 AR）", 16, 24);
  if (!data) {
    context.setFillStyle("#9EB2C8");
    context.fillText("等待天空数据", 16, height - 18);
    context.draw(false);
    return;
  }
  data.targets.forEach((target, index) => {
    const degrees = extractDegrees(target.direction);
    if (degrees === null) return;
    const altitude =
      target.altitudeDeg === null
        ? 0
        : Math.max(0, Math.min(90, target.altitudeDeg));
    const distance = radius * (1 - altitude / 90);
    const radians = ((degrees + orientationOffset - 90) * Math.PI) / 180;
    const x = centerX + Math.cos(radians) * distance;
    const y = centerY + Math.sin(radians) * distance;
    context.setFillStyle(index % 2 === 0 ? "#E7C7FF" : "#82D6E6");
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fill();
    context.setFillStyle("#F1F6FC");
    context.setFontSize(10);
    const labelX = Math.min(width - 92, Math.max(12, x + 8));
    context.fillText(target.displayName.slice(0, 12), labelX, y + 4);
  });
  context.draw(false);
}

function contextQuery(context: SpotNightRouteContext, selectedAt: string) {
  const params: Array<[string, string]> = [
    ["spotId", context.spotId],
    ["contextId", context.contextId],
    ["date", context.localDate],
    ["selectedAt", selectedAt || context.selectedAt],
    ["timezone", context.timezone],
    ["dataRevision", context.dataRevision],
  ];
  return params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
}

function ContextError({ onBack }: { onBack: () => void }) {
  return (
    <View className="page-inset sky-context-error">
      <StatusPanel
        state="ERROR"
        detail="请从地图中的正式观星点进入详情，再打开“此处夜空”。入口信息不完整时不会回退到当前位置、普通地点或未经核验的结果。"
        recoveryLabel="返回地图"
        onRecover={onBack}
      />
    </View>
  );
}

export function SpotSkyPage({ view = "MAIN" }: { view?: SkyView }) {
  const router = useRouter();
  const routeContext = useMemo<SpotNightRouteContext>(
    () => ({
      spotId: safeParam(router.params.spotId),
      contextId: safeParam(router.params.contextId),
      localDate: safeParam(router.params.date || router.params.localDate),
      selectedAt: safeParam(router.params.selectedAt),
      timezone: safeParam(router.params.timezone),
      dataRevision: safeParam(router.params.dataRevision),
    }),
    [
      router.params.contextId,
      router.params.dataRevision,
      router.params.date,
      router.params.localDate,
      router.params.selectedAt,
      router.params.spotId,
      router.params.timezone,
    ],
  );
  const storedContext = useAppStore((state) => state.observationContext);
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const notify = useAppStore((state) => state.notify);
  const mode = useAppStore((state) => state.mode);
  const themeClass = useThemeClass();
  const presentationClass =
    mode === "OBSERVATION"
      ? themeClass
      : themeClass.replace(/theme-day/u, "theme-night");
  const contextLookup = useResourceQuery({
    queryKey: ["observation-context", routeContext.contextId],
    queryFn: (signal) =>
      getObservationContext(routeContext.contextId, signal),
    enabled:
      routeContext.contextId.startsWith("ctx:") &&
      storedContext?.contextId !== routeContext.contextId,
    staleTime: 30_000,
  });
  const activeContext: ObservationContext | null =
    storedContext?.contextId === routeContext.contextId
      ? storedContext
      : (contextLookup.data?.data ?? null);

  useEffect(() => {
    if (
      contextLookup.data?.data &&
      storedContext?.contextId !== contextLookup.data.data.contextId
    )
      setObservationContext(contextLookup.data.data);
  }, [
    contextLookup.data?.data,
    setObservationContext,
    storedContext?.contextId,
  ]);

  const contextComplete = Boolean(
    routeContext.spotId.startsWith("spot:") &&
    routeContext.contextId.startsWith("ctx:") &&
    isDate(routeContext.localDate) &&
    isSelectedAt(routeContext.selectedAt) &&
    validTimezone(routeContext.timezone) &&
    observationDateFor(routeContext.selectedAt, routeContext.timezone) ===
      routeContext.localDate &&
    Boolean(routeContext.dataRevision) &&
    activeContext &&
    activeContext.contextId === routeContext.contextId &&
    activeContext.location.kind === "FORMAL_SPOT" &&
    activeContext.location.spotId === routeContext.spotId &&
    activeContext.localDate === routeContext.localDate &&
    activeContext.timezone === routeContext.timezone &&
    (activeContext.revision > 1 ||
      Date.parse(activeContext.selectedAtUtc) ===
        Date.parse(routeContext.selectedAt)),
  );
  const overview = useResourceQuery({
    queryKey: [
      "spot-overview",
      routeContext.spotId,
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
    ],
    queryFn: (signal) =>
      getSpotOverview(
        routeContext.spotId,
        routeContext.contextId,
        signal,
      ),
    enabled: contextComplete,
    staleTime: 30_000,
  });
  const report = useResourceQuery({
    queryKey: [
      "spot-sky",
      routeContext.spotId,
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
      routeContext.dataRevision,
    ],
    queryFn: (signal) =>
      getSkyReport(routeContext.spotId, routeContext.contextId, signal),
    enabled: contextComplete,
  });
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [manualOrientationOffset, setManualOrientationOffset] = useState(0);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassState, setCompassState] =
    useState<LocalCompassState>("STARTING");
  const [compassReason, setCompassReason] = useState("正在连接设备方向");
  const compassListenerRef = useRef<
    Parameters<typeof Taro.onCompassChange>[0] | null
  >(null);
  const compassRunningRef = useRef(false);
  const lastCompassHeadingRef = useRef<number | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [timeSaving, setTimeSaving] = useState(false);

  const data = report.data?.data;
  const contextMatches = Boolean(
    data &&
    activeContext &&
    data.context.contextId === activeContext.contextId &&
    data.context.contextFingerprint === activeContext.contextFingerprint &&
    data.context.contextRevision === activeContext.revision &&
    data.context.spotId === routeContext.spotId &&
    data.context.localDate === routeContext.localDate &&
    data.context.timezone === routeContext.timezone,
  );
  const reportData = contextMatches ? data : undefined;
  const committedAt = activeContext?.selectedAtUtc ?? routeContext.selectedAt;
  const committedIndex = clampIndex(
    reportData ? nearestHourIndex(reportData.hourly, committedAt) : 0,
    reportData?.hourly.length ?? 1,
  );
  const activeIndex = clampIndex(
    previewIndex ?? committedIndex,
    reportData?.hourly.length ?? 1,
  );
  const row = reportData?.hourly[activeIndex];
  const isPreviewing = previewIndex !== null && previewIndex !== committedIndex;
  const orientationOffset = normalizeDegrees(
    manualOrientationOffset - (compassHeading ?? 0),
  );

  const stopCompass = useCallback(() => {
    const listener = compassListenerRef.current;
    if (listener) {
      try {
        Taro.offCompassChange(listener);
      } catch {
        // Listener ownership is already released locally below.
      }
      compassListenerRef.current = null;
    }
    if (compassRunningRef.current) {
      compassRunningRef.current = false;
      try {
        void Promise.resolve(Taro.stopCompass()).catch(() => undefined);
      } catch {
        // Some DevTools builds throw synchronously while a page is hiding.
      }
    }
    lastCompassHeadingRef.current = null;
  }, []);

  const startCompass = useCallback(async () => {
    if (view !== "MAIN" || compassRunningRef.current) return;
    setCompassState("STARTING");
    setCompassReason("正在连接设备方向");
    const listener: Parameters<typeof Taro.onCompassChange>[0] = (event) => {
      const nextState = compassAccuracyState(event.accuracy);
      const direction = Number(event.direction);
      if (
        nextState === "UNAVAILABLE" ||
        !Number.isFinite(direction) ||
        direction < 0 ||
        direction > 360
      ) {
        setCompassState("UNAVAILABLE");
        setCompassReason("设备没有提供可信方向，请使用手动偏移");
        setCompassHeading(null);
        return;
      }
      const normalized = normalizeDegrees(direction);
      const previous = lastCompassHeadingRef.current;
      const delta =
        previous === null
          ? 360
          : Math.min(
              Math.abs(normalized - previous),
              360 - Math.abs(normalized - previous),
            );
      if (delta >= 1) {
        lastCompassHeadingRef.current = normalized;
        setCompassHeading(normalized);
      }
      setCompassState(nextState);
      setCompassReason(
        nextState === "LOW_ACCURACY"
          ? "设备方向精度较低，可配合手动偏移校准"
          : "设备方向已连接，天空图会随朝向更新",
      );
    };

    try {
      compassRunningRef.current = true;
      compassListenerRef.current = listener;
      Taro.onCompassChange(listener);
      await Taro.startCompass();
    } catch {
      try {
        Taro.offCompassChange(listener);
      } catch {
        // The listener may already have been removed by a hide lifecycle.
      }
      compassListenerRef.current = null;
      compassRunningRef.current = false;
      setCompassHeading(null);
      setCompassState("UNAVAILABLE");
      setCompassReason("设备方向不可用，请使用手动偏移");
    }
  }, [view]);

  useDidShow(() => {
    void startCompass();
  });
  useDidHide(stopCompass);

  useEffect(() => {
    if (view === "MAIN") void startCompass();
    else stopCompass();
    return stopCompass;
  }, [startCompass, stopCompass, view]);

  const draw = useCallback(() => {
    if (view !== "MAIN") return;
    try {
      Taro.createSelectorQuery()
        .select(".sky-scene__canvas")
        .boundingClientRect((result) => {
          try {
            const rect = Array.isArray(result) ? result[0] : result;
            const width =
              rect && Number.isFinite(rect.width) && rect.width > 0
                ? rect.width
                : 343;
            const height =
              rect && Number.isFinite(rect.height) && rect.height > 0
                ? rect.height
                : 270;
            const context = Taro.createCanvasContext(CANVAS_ID);
            drawSkyScene(
              context,
              reportData,
              orientationOffset,
              width,
              height,
            );
            setCanvasError(null);
          } catch (error) {
            setCanvasError(
              error instanceof Error ? error.message : "canvas_unavailable",
            );
          }
        })
        .exec();
    } catch (error) {
      setCanvasError(
        error instanceof Error ? error.message : "canvas_unavailable",
      );
    }
  }, [orientationOffset, reportData, view]);

  useReady(draw);
  useEffect(() => {
    if (view === "MAIN" && reportData) draw();
  }, [draw, reportData, view]);

  useEffect(() => {
    setPreviewIndex(null);
  }, [committedAt, routeContext.localDate, routeContext.spotId]);

  useEffect(() => {
    const dataState = report.data?.dataState;
    if (!contextComplete || !dataState) return;
    const base = {
      owner: "spot-night",
      placement: "inline" as const,
      dismissible: true,
    };
    if (dataState === "UNAVAILABLE" || dataState === "EXPIRED") {
      notify({
        ...base,
        tone: "warning",
        title: "夜空数据不可用",
        body: "保留正式点位和观测上下文；当前不把过期缓存或未经核验的结果当作今晚推荐。可在网络恢复后重试。",
        dedupeKey: `spot-night-unavailable:${routeContext.spotId}:${routeContext.localDate}`,
      });
    } else if (dataState !== "FRESH") {
      notify({
        ...base,
        tone: "warning",
        title: "夜空数据需要留意",
        body:
          report.data?.warnings.join(" ") ||
          "当前结果存在陈旧或资料不完整状态，请先查看来源与限制。",
        dedupeKey: `spot-night-state:${routeContext.spotId}:${routeContext.localDate}:${dataState}`,
      });
    }
  }, [
    contextComplete,
    notify,
    report.data?.dataState,
    report.data?.warnings,
    routeContext.localDate,
    routeContext.spotId,
  ]);

  useEffect(() => {
    const activeMaterialAlerts =
      reportData?.weatherEvidence.alerts.filter(
        (alert) => alert.status === "ACTIVE" && alert.material,
      ) ?? [];
    if (!activeMaterialAlerts.length) return;
    const first = activeMaterialAlerts[0]!;
    notify({
      owner: "spot-night",
      placement: "inline",
      tone: "error",
      title: first.headline,
      body:
        activeMaterialAlerts.length === 1
          ? `${first.description} 当前正式点出行建议已被官方天气预警阻断。`
          : `${first.description} 另有 ${activeMaterialAlerts.length - 1} 条有效官方预警；当前正式点出行建议已阻断。`,
      dismissible: false,
      dedupeKey: `spot-night-alert:${activeMaterialAlerts.map((alert) => alert.id).join(":")}`,
    });
  }, [notify, reportData?.weatherEvidence.alerts]);

  useEffect(() => {
    if (!canvasError) return;
    notify({
      owner: "spot-night",
      placement: "inline",
      tone: "warning",
      title: "天空图暂不可绘制",
      body: "保留下方可访问目标列表、方向和专业数据；Canvas 能力恢复后可重试。",
      dismissible: true,
      dedupeKey: `spot-night-canvas:${routeContext.spotId}`,
    });
  }, [canvasError, notify, routeContext.spotId]);

  const navigateView = (nextView: SkyView) => {
    const route =
      nextView === "MAIN"
        ? "spot/sky/index"
        : nextView === "DETAIL"
          ? "sky/detail/index"
          : "sky/targets/index";
    void Taro.redirectTo({
      url: `/${route}?${contextQuery(routeContext, committedAt)}`,
    });
  };

  const commitIndex = async (nextIndex: number) => {
    if (!reportData?.hourly.length || !activeContext || timeSaving) return;
    const safeIndex = clampIndex(nextIndex, reportData.hourly.length);
    const nextRow = reportData.hourly[safeIndex];
    if (!nextRow) return;
    setTimeSaving(true);
    try {
      const response = await updateObservationContext(activeContext, {
        selectedAt: nextRow.at,
      });
      setObservationContext(response.data);
      setPreviewIndex(null);
    } catch (error) {
      setPreviewIndex(null);
      notify({
        owner: "spot-night",
        placement: "inline",
        tone: "error",
        title: "观测时间未更新",
        body: errorMessage(error) + "。仍使用上一次已提交时间。",
        dismissible: true,
        dedupeKey: "spot-night-time-update-failed",
      });
    } finally {
      setTimeSaving(false);
    }
  };

  const onPreview = (value: number) => {
    if (!reportData?.hourly.length) return;
    setPreviewIndex(clampIndex(value, reportData.hourly.length));
  };

  const goBack = () => {
    Taro.navigateBack().catch(() =>
      Taro.switchTab({ url: "/pages/map/index" }),
    );
  };

  if (!activeContext && contextLookup.isPending)
    return (
      <View className={themeClass} data-route="spot-night-context-loading">
        <CustomNav title="此处夜空" back />
        <View className="page-inset">
          <StatusPanel
            state="LOADING"
            detail="正在恢复正式观星点、观测夜和已提交时刻。"
          />
        </View>
      </View>
    );

  if (!contextComplete || !activeContext)
    return (
      <View className={themeClass} data-route="spot-night-context-error">
        <CustomNav title="此处夜空" back />
        <ContextError
          onBack={() => Taro.switchTab({ url: "/pages/map/index" })}
        />
      </View>
    );

  const heading =
    view === "DETAIL"
      ? "专业数据"
      : view === "TARGETS"
        ? "观测目标"
        : "此处夜空";
  const spotName = overview.data?.data.spot.name ?? "此观星点";
  const usableData =
    reportData &&
    report.data?.dataState !== "EXPIRED" &&
    report.data?.dataState !== "UNAVAILABLE";
  const rowTime = formatTime(row?.at ?? committedAt, routeContext.timezone);
  const indexMax = Math.max(0, (reportData?.hourly.length ?? 1) - 1);

  return (
    <View
      className={`${presentationClass} sky-page`}
      data-route="spot-night"
      data-spot-id={routeContext.spotId}
      data-od-id="spot-night"
    >
      <CustomNav
        title={heading}
        subtitle={`${spotName} · ${routeContext.localDate}`}
        back
        right={
          <Text className="type-data" aria-label={`当前夜空时间 ${rowTime}`}>
            {rowTime}
          </Text>
        }
      />
      <View className="sky-tabs" role="tablist" aria-label="点位夜空视图">
        {(
          [
            ["MAIN", "结论"],
            ["DETAIL", "数据"],
            ["TARGETS", "目标"],
          ] as const
        ).map(([key, label]) => (
          <View
            key={key}
            className={`sky-tabs__item focus-ring${view === key ? " sky-tabs__item--active" : ""}`}
            data-od-id={`spot-night-tab-${key.toLowerCase()}`}
            role="tab"
            aria-selected={view === key}
            onClick={() => navigateView(key)}
          >
            <Text>{label}</Text>
          </View>
        ))}
      </View>
      <NotificationRegion owner="spot-night" placement="inline" />
      <View className="sky-page__scroll-viewport">
        <ScrollView
          scrollY
          className="sky-page__scroll"
          enhanced
          showScrollbar={false}
        >
          <View className="sky-content page-inset safe-bottom">
          <View className="sky-context card" data-od-id="spot-night-context">
            <View className="sky-context__identity">
              <Text className="type-section">{spotName}</Text>
              <Text className="type-caption">
                正式观星点 · {routeContext.localDate} 的观测夜
              </Text>
              <Text className="type-caption">
                当前时刻 {formatDateTime(committedAt, routeContext.timezone)} ·
                数据来源与更新时间见下方说明
              </Text>
            </View>
            <DataStateBadge state={report.data?.dataState ?? "UNAVAILABLE"} />
          </View>
          {reportData &&
          (report.data?.dataState === "UNAVAILABLE" ||
            report.data?.dataState === "EXPIRED") ? (
            <StatusPanel
              state="ERROR"
              detail="当前夜空数据不可用；正式点位、观测时间和来源说明保持可见，不会用过期缓存或未经核验的结果替代今晚结论。"
              recoveryLabel="重试夜空"
              onRecover={() => void report.refetch()}
            />
          ) : null}
          {report.isPending ? (
            <StatusPanel
              state="LOADING"
              detail="正在按正式观星点、当地观测夜和当前时刻加载当前数据；不会用当前位置或未经核验的结果顶替。"
            />
          ) : report.isError ? (
            <StatusPanel
              state="ERROR"
              detail="夜空计算请求失败；正式点位与完整上下文仍保留，未静默显示成功或合成数据。"
              recoveryLabel="重试夜空"
              onRecover={() => void report.refetch()}
            />
          ) : !reportData ? (
            <StatusPanel
              state="ERROR"
              detail="返回结果与当前正式点位、日期或时区上下文不一致；为避免混用不同条件的结果，暂不展示。"
              recoveryLabel="重新加载"
              onRecover={() => void report.refetch()}
            />
          ) : (
            <>
              {view === "MAIN" ? (
                <View className="sky-summary-stack">
                  <View
                    className="sky-decision card"
                    data-od-id="spot-night-summary"
                  >
                    <View className="sky-decision__top">
                      <Text className="type-caption">正式点出行建议</Text>
                      <DataStateBadge
                        state={report.data?.dataState ?? "UNAVAILABLE"}
                      />
                    </View>
                    <Text className="type-page-title sky-decision__label">
                      {usableData
                        ? reportData.decision.label
                        : "数据不足，暂不判断"}
                    </Text>
                    {usableData ? (
                      <>
                        <View className="sky-summary-grid">
                          <View>
                            <Text className="type-caption">天空机会</Text>
                            <Text className="type-data">
                              {reportData.decision.skyOpportunity.label}
                            </Text>
                          </View>
                          <View>
                            <Text className="type-caption">主连续窗口</Text>
                            <Text className="type-data">
                              {reportData.decision.skyOpportunity.primaryWindow
                                ? `${formatTime(
                                    reportData.decision.skyOpportunity.primaryWindow.start,
                                    routeContext.timezone,
                                  )}—${formatTime(
                                    reportData.decision.skyOpportunity.primaryWindow.end,
                                    routeContext.timezone,
                                  )} · ${reportData.decision.skyOpportunity.primaryWindow.durationMinutes} 分钟`
                                : "暂无可证明窗口"}
                            </Text>
                          </View>
                          <View>
                            <Text className="type-caption">天空 / 出行信心</Text>
                            <Text className="type-data">
                              {reportData.decision.skyOpportunity.confidence === null
                                ? "未知"
                                : `${Math.round(reportData.decision.skyOpportunity.confidence * 100)}%`}
                              {" / "}
                              {reportData.decision.confidence === null
                                ? "未知"
                                : `${Math.round(reportData.decision.confidence * 100)}%`}
                            </Text>
                          </View>
                          <View>
                            <Text className="type-caption">适合</Text>
                            <Text className="type-data">
                              {reportData.decision.skyOpportunity.suitableFor.length
                                ? reportData.decision.skyOpportunity.suitableFor
                                    .map((item) => SUITABLE_FOR_LABEL[item])
                                    .join(" · ")
                                : "暂无"}
                            </Text>
                          </View>
                        </View>
                        {reportData.decision.skyOpportunity.primaryWindow ? (
                          <Text className="type-caption">
                            窗口边界：
                            {reportData.decision.skyOpportunity.primaryWindow.startReason}
                            ；
                            {reportData.decision.skyOpportunity.primaryWindow.endReason}
                          </Text>
                        ) : null}
                        {reportData.decision.skyOpportunity.backupWindow ? (
                          <Text className="type-caption">
                            备选窗口 {formatTime(
                              reportData.decision.skyOpportunity.backupWindow.start,
                              routeContext.timezone,
                            )}
                            —{formatTime(
                              reportData.decision.skyOpportunity.backupWindow.end,
                              routeContext.timezone,
                            )}
                            · {reportData.decision.skyOpportunity.backupWindow.durationMinutes}
                            分钟
                          </Text>
                        ) : null}
                        <Text className="type-body">
                          月亮：{reportData.moonSummary}
                        </Text>
                        <Text className="type-body">
                          银河方向：{reportData.milkyWayDirection}
                        </Text>
                        {[
                          ...reportData.decision.factors,
                          ...reportData.decision.skyOpportunity.factors,
                        ].map((factor) => (
                          <View
                            className={`sky-factor sky-factor--${factor.severity.toLowerCase()}`}
                            key={`${factor.code}:${factor.detail}`}
                          >
                            <Text className="type-label">{factor.label}</Text>
                            <Text className="type-caption">
                              {factor.detail}
                            </Text>
                          </View>
                        ))}
                      </>
                    ) : (
                      <Text className="type-body">
                        当前没有可证明的天文或天气结论；来源和重试路径仍保留。
                      </Text>
                    )}
                  </View>
                  <View
                    className="time-card card"
                    data-od-id="spot-night-time-focus"
                  >
                    <View className="time-card__header">
                      <View>
                        <Text className="type-section">观测时间</Text>
                        <Text className="type-data">{rowTime}</Text>
                        <Text className="type-caption">
                          {isPreviewing
                            ? "预览中，松手提交；取消可恢复已提交时间"
                            : "已提交时间 · 可跨午夜"}
                        </Text>
                      </View>
                      {isPreviewing ? (
                        <SoftButton
                          variant="ghost"
                          label="取消观测时间预览"
                          onClick={() => setPreviewIndex(null)}
                        >
                          取消预览
                        </SoftButton>
                      ) : null}
                    </View>
                    <Slider
                      min={0}
                      max={indexMax}
                      step={1}
                      value={activeIndex}
                      activeColor="var(--primary)"
                      backgroundColor="var(--border)"
                      blockColor="var(--primary)"
                      blockSize={24}
                      disabled={!reportData.hourly.length || timeSaving}
                      aria-label="调整观测时间"
                      onChanging={(event) => onPreview(event.detail.value)}
                      onChange={(event) =>
                        void commitIndex(event.detail.value)
                      }
                    />
                    <View className="time-metrics">
                      <View>
                        <Text className="type-caption">机会分</Text>
                        <Text className="type-data">
                          {row?.opportunityScore === null ||
                          row?.opportunityScore === undefined
                            ? "暂无"
                            : `${row.opportunityScore}`}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">云量</Text>
                        <Text className="type-data">
                          {row?.cloudPercent === null ||
                          row?.cloudPercent === undefined
                            ? "暂无"
                            : `${row.cloudPercent}%`}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">月亮</Text>
                        <Text className="type-data">
                          {row?.moonAltitudeDeg === null ||
                          row?.moonAltitudeDeg === undefined
                            ? "暂无"
                            : `${row.moonAltitudeDeg}°`}
                        </Text>
                      </View>
                      <View>
                        <Text className="type-caption">稳定性</Text>
                        <Text className="type-data">
                          {row?.state ? DATA_STATE_LABEL[row.state] : "暂无"}
                        </Text>
                      </View>
                    </View>
                    <Text className="type-caption">
                      当前时间、结论、天空图、目标列表和专业数据共享同一份已提交观测时刻；预览不会改写已提交结果。
                    </Text>
                  </View>
                  <View className="sky-scene card" data-od-id="sky-scene">
                    <View className="sky-section-header">
                      <View className="sky-section-header__copy">
                        <Text className="type-section">天空方向图</Text>
                        <Text className="type-caption">
                          方向环 · 地平线 · 当前计算目标 · 非 AR
                        </Text>
                      </View>
                      <DataStateBadge
                        state={report.data?.dataState ?? "UNAVAILABLE"}
                      />
                    </View>
                    <Canvas
                      canvasId={CANVAS_ID}
                      id={CANVAS_ID}
                      className="sky-scene__canvas"
                      style={{ width: "100%", height: "270px" }}
                      aria-label="方向环和当前计算目标的天空图"
                    />
                    <View
                      className="orientation-control"
                      data-od-id="sky-orientation-control"
                    >
                      <View className="orientation-control__copy">
                        <Text className="type-label">方向输入</Text>
                        <Text className="type-caption">
                          {compassReason}
                          {compassHeading === null
                            ? ""
                            : ` · 当前 ${Math.round(compassHeading)}°`}
                        </Text>
                      </View>
                      <View className="orientation-actions">
                        {compassState === "UNAVAILABLE" ? (
                          <SoftButton
                            variant="ghost"
                            label="重新连接设备方向"
                            className="orientation-actions__retry"
                            onClick={() => void startCompass()}
                          >
                            重试方向
                          </SoftButton>
                        ) : null}
                        <SoftButton
                          variant="ghost"
                          label="手动方向向左 15 度"
                          onClick={() =>
                            setManualOrientationOffset((value) => value - 15)
                          }
                        >
                          −15°
                        </SoftButton>
                        <Text
                          className="type-data orientation-actions__offset"
                          aria-label={`手动方向偏移 ${manualOrientationOffset} 度`}
                        >
                          {manualOrientationOffset}°
                        </Text>
                        <SoftButton
                          variant="ghost"
                          label="手动方向向右 15 度"
                          onClick={() =>
                            setManualOrientationOffset((value) => value + 15)
                          }
                        >
                          +15°
                        </SoftButton>
                        <SoftButton
                          variant="ghost"
                          label="重置手动方向"
                          onClick={() => setManualOrientationOffset(0)}
                        >
                          重置
                        </SoftButton>
                      </View>
                    </View>
                    {reportData.compass.state === "UNAVAILABLE" ? (
                      <StatusPanel
                        state="PERMISSION_DENIED"
                        detail="方向传感器不是天文真值来源；未授权或不可用时仍可用北/东/南/西方向环、文本目标列表和手动偏移。"
                      />
                    ) : reportData.compass.state === "LOW_ACCURACY" ? (
                      <StatusPanel
                        state="PARTIAL"
                        detail="方向传感器精度较低；天文计算不受影响，呈现可以用手动偏移修正。"
                      />
                    ) : null}
                  </View>
                  <View
                    className="sky-targets card"
                    data-od-id="sky-target-list"
                  >
                    <View className="sky-section-header">
                      <View className="sky-section-header__copy">
                        <Text className="type-section">当前观测目标</Text>
                        <Text className="type-caption">
                          目标由当前正式观星点、观测夜和真实数据计算返回
                        </Text>
                      </View>
                      <Text className="status-tag">
                        {reportData.targets.length} 个
                      </Text>
                    </View>
                    {reportData.targets.length ? (
                      reportData.targets.map((target) => (
                        <SkyTargetCard target={target} key={target.targetId} />
                      ))
                    ) : (
                      <StatusPanel
                        state="EMPTY"
                        detail="当前没有可证明目标；不会把常见天体或流星雨预设成今晚可见。"
                      />
                    )}
                  </View>
                </View>
              ) : view === "TARGETS" ? (
                <View className="sky-targets card" data-od-id="sky-target-list">
                  <View className="sky-section-header">
                    <View className="sky-section-header__copy">
                      <Text className="type-section">观测目标列表</Text>
                      <Text className="type-caption">
                        与当前观测时刻和观测夜同步
                      </Text>
                    </View>
                  </View>
                  {reportData.targets.length ? (
                    reportData.targets.map((target) => (
                      <SkyTargetCard target={target} key={target.targetId} />
                    ))
                  ) : (
                    <StatusPanel
                      state="EMPTY"
                      detail="当前没有可证明目标，不显示预设目标。"
                    />
                  )}
                </View>
              ) : (
                <View
                  className="professional-card card"
                  data-od-id="sky-professional-matrix"
                >
                  <View className="sky-section-header">
                    <View className="sky-section-header__copy">
                      <Text className="type-section">分小时专业数据</Text>
                      <Text className="type-caption">
                        机会分与信心独立展示，并保留云、降水、风、温度、能见度、月亮与黑暗原始证据
                      </Text>
                    </View>
                    <DataStateBadge
                      state={report.data?.dataState ?? "UNAVAILABLE"}
                    />
                  </View>
                  {reportData.hourly.length ? (
                    <View className="professional-table-shell">
                      <ScrollView
                        scrollX
                        className="professional-table"
                        data-od-id="sky-professional-matrix-scroll"
                        enhanced
                        showScrollbar={false}
                        aria-label="专业数据横向矩阵，可左右滚动"
                      >
                        <View className="professional-table__inner">
                          <ProfessionalMatrixRow
                            header
                            label="变量"
                            rows={reportData.hourly}
                            value={(item) =>
                              formatTime(item.at, routeContext.timezone)
                            }
                          />
                          <ProfessionalMatrixRow
                            label="机会"
                            rows={reportData.hourly}
                            value={(item) =>
                              metricValue(item.opportunityScore, "%")
                            }
                          />
                          <ProfessionalMatrixRow
                            label="信心"
                            rows={reportData.hourly}
                            value={(item) =>
                              item.opportunityConfidence === null
                                ? "未提供"
                                : `${Math.round(item.opportunityConfidence * 100)}%`
                            }
                          />
                          <ProfessionalMatrixRow
                            label="总云"
                            rows={reportData.hourly}
                            value={(item) => metricValue(item.cloudPercent, "%")}
                          />
                          <ProfessionalMatrixRow
                            label="低云"
                            rows={reportData.hourly}
                            value={(item) =>
                              metricValue(item.lowCloudPercent, "%")
                            }
                          />
                          <ProfessionalMatrixRow
                            label="中云"
                            rows={reportData.hourly}
                            value={(item) =>
                              metricValue(item.midCloudPercent, "%")
                            }
                          />
                          <ProfessionalMatrixRow
                            label="高云"
                            rows={reportData.hourly}
                            value={(item) =>
                              metricValue(item.highCloudPercent, "%")
                            }
                          />
                          <ProfessionalMatrixRow
                            label="模型一致性"
                            rows={reportData.hourly}
                            value={(item) =>
                              MODEL_CONSISTENCY_LABEL[
                                item.modelConsistencyLabel
                              ]
                            }
                          />
                          <ProfessionalMatrixRow
                            label="模型差幅"
                            rows={reportData.hourly}
                            value={(item) =>
                              metricValue(item.modelSpreadPercent, "%", 1)
                            }
                          />
                          <ProfessionalMatrixRow
                            label="降水"
                            rows={reportData.hourly}
                            value={(item) =>
                              metricValue(item.precipitationMm, " mm", 1)
                            }
                          />
                          <ProfessionalMatrixRow
                            label="风 / 阵风"
                            rows={reportData.hourly}
                            value={(item) =>
                              `${metricValue(item.windKph, "", 0)} / ${metricValue(item.windGustKph, " km/h", 0)}`
                            }
                          />
                          <ProfessionalMatrixRow
                            label="温度"
                            rows={reportData.hourly}
                            value={(item) => metricValue(item.temperatureC, "℃", 1)}
                          />
                          <ProfessionalMatrixRow
                            label="湿度 / 露点"
                            rows={reportData.hourly}
                            value={(item) =>
                              `${metricValue(item.relativeHumidityPercent, "%", 0)} / ${metricValue(item.dewPointC, "℃", 1)}`
                            }
                          />
                          <ProfessionalMatrixRow
                            label="能见度"
                            rows={reportData.hourly}
                            value={(item) =>
                              metricValue(item.visibilityKm, " km", 1)
                            }
                          />
                          <ProfessionalMatrixRow
                            label="月亮影响"
                            rows={reportData.hourly}
                            value={(item) =>
                              `${Math.round(item.opportunityInput.moonPenalty * 100)}%`
                            }
                          />
                          <ProfessionalMatrixRow
                            label="黑暗"
                            rows={reportData.hourly}
                            value={(item) => DARKNESS_LABEL[item.darkness]}
                          />
                        </View>
                      </ScrollView>
                      <View
                        className="professional-table-indicator"
                        data-od-id="sky-professional-matrix-indicator"
                        aria-hidden
                      />
                    </View>
                  ) : (
                    <StatusPanel
                      state="EMPTY"
                      detail="当前没有逐小时数据；缺失不会显示为 0。"
                    />
                  )}
                </View>
              )}
              {view !== "DETAIL" ? (
                <View className="sky-compact-data card">
                  <View className="sky-section-header">
                    <View className="sky-section-header__copy">
                      <Text className="type-section">数据状态与边界</Text>
                      <Text className="type-caption">
                        更新时间{" "}
                        {formatDateTime(
                          report.data?.generatedAt,
                          routeContext.timezone,
                        )}
                      </Text>
                    </View>
                    <DataStateBadge
                      state={report.data?.dataState ?? "UNAVAILABLE"}
                    />
                  </View>
                  <Text className="type-body">
                    预缓存 {reportData.precachedHours} 小时 ·{" "}
                    {reportData.offlineReady
                      ? "声明可用的有限离线摘要"
                      : "没有离线摘要"}
                    ；硬过期或不可用时不显示当前推荐。
                  </Text>
                  <View className="weather-evidence-summary">
                    <View>
                      <Text className="type-caption">天气时间线</Text>
                      <Text className="type-data">
                        {
                          WEATHER_TIMELINE_ROLE_LABEL[
                            reportData.weatherEvidence.timelineRole
                          ]
                        }
                      </Text>
                    </View>
                    <View>
                      <Text className="type-caption">官方预警</Text>
                      <Text className="type-data">
                        {DATA_STATE_LABEL[reportData.weatherEvidence.warningState]}
                      </Text>
                    </View>
                  </View>
                  <Text className="type-caption">
                    天气模型：
                    {reportData.weatherEvidence.modelRuns.length
                      ? reportData.weatherEvidence.modelRuns
                          .map(
                            (run) =>
                              WEATHER_MODEL_LABEL[run.modelKey] ?? run.provider,
                          )
                          .filter(
                            (label, index, all) => all.indexOf(label) === index,
                          )
                          .join(" · ")
                      : "未提供"}
                  </Text>
                  {reportData.weatherEvidence.alerts
                    .filter(
                      (alert) => alert.status === "ACTIVE" && alert.material,
                    )
                    .map((alert) => (
                      <View className="weather-alert-summary" key={alert.id}>
                        <Text className="type-label">{alert.headline}</Text>
                        <Text className="type-caption">
                          {alert.description}
                        </Text>
                        {alert.instruction ? (
                          <Text className="type-caption">
                            建议：{alert.instruction}
                          </Text>
                        ) : null}
                        <Text className="type-caption">
                          发布 {formatDateTime(
                            alert.issuedAt,
                            routeContext.timezone,
                          )}
                          {alert.expiresAt
                            ? ` · 有效至 ${formatDateTime(alert.expiresAt, routeContext.timezone)}`
                            : ""}
                        </Text>
                      </View>
                    ))}
                  <Text className="type-caption">
                    计算标识 {reportData.context.algorithmVersion} · 星表标识{" "}
                    {reportData.context.catalogVersion} · 事件目录标识{" "}
                    {reportData.context.eventCatalogVersion}
                  </Text>
                  <Text className="type-caption">
                    这些标识只用于追溯本次结果，不代表另一套产品；具体来源、适用时间和限制见下方说明。
                  </Text>
                  {report.data?.warnings.map((warning) => (
                    <Text className="type-caption" key={warning}>
                      · {warning}
                    </Text>
                  ))}
                </View>
              ) : null}
              <View className="sources-stack" data-od-id="spot-source-evidence">
                <Text className="type-section">计算与数据来源</Text>
                {reportData.sources.map((source) => (
                  <Provenance source={source} key={source.id} />
                ))}
              </View>
              <View className="sky-actions">
                {view !== "DETAIL" ? (
                  <SoftButton
                    label="查看完整专业数据"
                    onClick={() => navigateView("DETAIL")}
                  >
                    专业数据
                  </SoftButton>
                ) : null}
                {view !== "TARGETS" ? (
                  <SoftButton
                    label="查看全部观测目标"
                    onClick={() => navigateView("TARGETS")}
                  >
                    目标列表
                  </SoftButton>
                ) : null}
                {view !== "MAIN" ? (
                  <SoftButton
                    variant="primary"
                    label="返回夜空结论"
                    onClick={() => navigateView("MAIN")}
                  >
                    返回结论
                  </SoftButton>
                ) : null}
                <SoftButton
                  variant="ghost"
                  label="返回正式观星点详情"
                  onClick={goBack}
                >
                  返回点位详情
                </SoftButton>
              </View>
            </>
          )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
