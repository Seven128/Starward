import Taro, {
  useDidHide,
  useReady,
  useRouter,
} from "@tarojs/taro";
import { Canvas, ScrollView, Slider, Text, View } from "@tarojs/components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type DisplayMode,
  type HourlySkyRow,
  type ObservationContext,
  type SkyReport,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { DataStateBadge } from "@/components/data-state-badge";
import { NotificationRegion } from "@/components/notification";
import { Provenance } from "@/components/provenance";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { nativeStatusBarHeightPx } from "@/theme/native-metrics";
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

export type SkyView = "MAIN" | "DETAIL" | "PROFESSIONAL" | "TARGETS";

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
  "qweather-weather-v1-hourly-24h": "和风天气 24 小时逐小时预报",
  "qweather-weather-v1-hourly-72h": "和风天气 72 小时逐小时预报",
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
    <View
      className="sky-target"
      role="listitem"
      aria-label={`${target.displayName}，${TARGET_TYPE_LABEL[target.type]}，${target.direction}，高度 ${target.altitudeDeg === null ? "未提供" : `${target.altitudeDeg}°`}`}
    >
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

type ConditionBandKind =
  | "darkness"
  | "cloud"
  | "low-cloud"
  | "mid-cloud"
  | "high-cloud"
  | "moon"
  | "precipitation"
  | "wind"
  | "humidity"
  | "visibility"
  | "opportunity";

const CONDITION_BANDS: ReadonlyArray<{
  key: ConditionBandKind;
  label: string;
  icon: "horizon" | "conditions" | "compass";
}> = [
  { key: "darkness", label: "天文黑夜", icon: "horizon" },
  { key: "cloud", label: "总云量", icon: "conditions" },
  { key: "low-cloud", label: "低云", icon: "conditions" },
  { key: "mid-cloud", label: "中云", icon: "conditions" },
  { key: "high-cloud", label: "高云", icon: "conditions" },
  { key: "moon", label: "月亮", icon: "compass" },
  { key: "precipitation", label: "降水", icon: "conditions" },
  { key: "wind", label: "风", icon: "conditions" },
  { key: "humidity", label: "湿度 / 露点", icon: "conditions" },
  { key: "visibility", label: "能见度", icon: "conditions" },
  { key: "opportunity", label: "机会分", icon: "horizon" },
];

function conditionBandValue(
  row: HourlySkyRow,
  kind: ConditionBandKind,
): number | null {
  switch (kind) {
    case "darkness":
      return row.darkness === "ASTRONOMICAL_NIGHT"
        ? 100
        : row.darkness === "TWILIGHT"
          ? 50
          : 0;
    case "cloud":
      return row.cloudPercent;
    case "low-cloud":
      return row.lowCloudPercent;
    case "mid-cloud":
      return row.midCloudPercent;
    case "high-cloud":
      return row.highCloudPercent;
    case "moon":
      return row.moonAltitudeDeg === null
        ? null
        : Math.max(0, Math.min(100, (row.moonAltitudeDeg / 90) * 100));
    case "precipitation":
      return row.precipitationProbabilityPercent;
    case "wind":
      return row.windKph;
    case "humidity":
      return row.relativeHumidityPercent;
    case "visibility":
      return row.visibilityKm;
    case "opportunity":
      return row.opportunityScore;
  }
}

function conditionBandTone(
  row: HourlySkyRow,
  kind: ConditionBandKind,
): "positive" | "neutral" | "warning" | "danger" | "unknown" | "night" {
  const value = conditionBandValue(row, kind);
  if (value === null || value === undefined || row.state === "UNAVAILABLE") {
    return "unknown";
  }
  if (kind === "darkness") {
    return row.darkness === "ASTRONOMICAL_NIGHT"
      ? "night"
      : row.darkness === "TWILIGHT"
        ? "warning"
        : "neutral";
  }
  if (kind === "opportunity") {
    return value >= 70 ? "positive" : value >= 40 ? "warning" : "danger";
  }
  if (kind === "moon") {
    return row.moonIllumination !== null && row.moonIllumination >= 0.65
      ? "warning"
      : "neutral";
  }
  if (kind === "wind") {
    return value <= 15 ? "positive" : value <= 30 ? "warning" : "danger";
  }
  if (kind === "visibility") {
    return value >= 10 ? "positive" : value >= 5 ? "warning" : "danger";
  }
  if (kind === "humidity") {
    return value <= 75 ? "positive" : value <= 90 ? "warning" : "danger";
  }
  if (kind === "precipitation") {
    return value <= 20 ? "positive" : value <= 50 ? "warning" : "danger";
  }
  return value <= 25 ? "positive" : value <= 60 ? "warning" : "danger";
}

function conditionBandText(row: HourlySkyRow, kind: ConditionBandKind) {
  if (kind === "darkness") return DARKNESS_LABEL[row.darkness];
  if (kind === "moon") {
    const altitude = metricValue(row.moonAltitudeDeg, "°");
    const illumination =
      row.moonIllumination === null || row.moonIllumination === undefined
        ? "未提供"
        : `${Math.round(row.moonIllumination * 100)}%`;
    return `${altitude} / ${illumination}`;
  }
  if (kind === "wind") {
    return row.windKph === null
      ? "未提供"
      : `${metricValue(row.windKph, " km/h")} / ${metricValue(row.windGustKph, " km/h")}`;
  }
  if (kind === "humidity") {
    return `${metricValue(row.relativeHumidityPercent, "%")} / ${metricValue(row.dewPointC, "℃", 1)}`;
  }
  if (kind === "visibility") return metricValue(row.visibilityKm, " km", 1);
  if (kind === "opportunity") return metricValue(row.opportunityScore, "%");
  if (kind === "precipitation") {
    return metricValue(row.precipitationProbabilityPercent, "%");
  }
  return metricValue(conditionBandValue(row, kind), "%");
}

function conditionBandOpacity(row: HourlySkyRow, kind: ConditionBandKind) {
  const value = conditionBandValue(row, kind);
  if (value === null || value === undefined || row.state === "UNAVAILABLE") {
    return 0.34;
  }
  if (kind === "darkness") return value === 100 ? 1 : value === 50 ? 0.7 : 0.42;
  if (kind === "opportunity") return 0.45 + Math.min(0.55, value / 160);
  if (kind === "visibility") return Math.min(1, 0.4 + value / 16);
  if (kind === "wind") return Math.min(1, 0.42 + value / 50);
  return 0.48 + Math.min(0.52, value / 150);
}

function SkyConditionBands({
  rows,
  activeIndex,
  timezone,
}: {
  rows: readonly HourlySkyRow[];
  activeIndex: number;
  timezone: string;
}) {
  const safeActiveIndex = clampIndex(activeIndex, rows.length);
  const activeRow = rows[safeActiveIndex];
  const tickIndexes = Array.from(
    new Set([0, Math.floor(Math.max(0, rows.length - 1) / 2), rows.length - 1]),
  ).filter((index) => index >= 0 && index < rows.length);
  if (!rows.length || !activeRow) {
    return <StatusPanel state="EMPTY" detail="当前没有逐小时条件带；缺失不会显示为 0。" />;
  }
  const markerPosition =
    rows.length > 1 ? (safeActiveIndex / (rows.length - 1)) * 100 : 0;
  return (
    <View
      className="sky-bands"
      role="list"
      aria-label={`观测条件带，当前 ${formatTime(activeRow.at, timezone)}`}
    >
      <View className="sky-bands__axis" aria-hidden>
        {tickIndexes.map((index) => (
          <Text key={index} className="sky-bands__axis-label">
            {formatTime(rows[index]?.at, timezone)}
          </Text>
        ))}
      </View>
      {CONDITION_BANDS.map((band) => (
        <View
          className="sky-band"
          role="listitem"
          key={band.key}
          aria-label={`${band.label}，当前 ${conditionBandText(activeRow, band.key)}`}
        >
          <View className="sky-band__label">
            <SemanticIcon name={band.icon} decorative />
            <Text className="sky-band__name">{band.label}</Text>
          </View>
          <View className="sky-band__track" aria-hidden>
            {rows.map((row, index) => (
              <View
                key={`${band.key}:${row.at}`}
                className={`sky-band__segment sky-band__segment--${conditionBandTone(row, band.key)}${index === safeActiveIndex ? " sky-band__segment--active" : ""}`}
                style={{ opacity: conditionBandOpacity(row, band.key) }}
              />
            ))}
            <View
              className="sky-band__cursor"
              style={{ left: `${markerPosition}%` }}
            />
          </View>
          <Text className="sky-band__value type-data">
            {conditionBandText(activeRow, band.key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SkyTargetRow({
  target,
  className = "",
}: {
  target: SkyReport["targets"][number];
  className?: string;
}) {
  const altitude =
    target.altitudeDeg === null ? "高度未提供" : `${target.altitudeDeg}°`;
  const window = target.window
    ? `${target.window.start}—${target.window.end}`
    : "窗口不足";
  return (
    <View
      className={`sky-target-row ${className}`}
      role="listitem"
      aria-label={`${target.displayName}，${TARGET_TYPE_LABEL[target.type]}，${target.direction}，${altitude}，${window}`}
    >
      <View className="sky-target-row__identity">
        <SemanticIcon name="horizon" decorative />
        <View>
          <Text className="sky-target-row__name">{target.displayName}</Text>
          <Text className="type-caption">
            {TARGET_TYPE_LABEL[target.type]} · {window}
          </Text>
        </View>
      </View>
      <Text className="sky-target-row__geometry type-data">
        {target.direction} · {altitude}
      </Text>
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
  const match = direction.match(/(\d{1,3}(?:\.\d+)?)\s*°/u) ??
    direction.match(/(?:^|\s)(\d{1,3}(?:\.\d+)?)(?=\s|$)/u);
  if (!match) return null;
  const degrees = Number(match[1]);
  return Number.isFinite(degrees) && degrees >= 0 && degrees <= 360
    ? degrees
    : null;
}

type LocalCompassState =
  | "PERMISSION_REQUIRED"
  | "DENIED"
  | "CALIBRATING"
  | "READY"
  | "LOW_ACCURACY"
  | "STALE"
  | "UNAVAILABLE";

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function compassAccuracyState(
  accuracy: number | string,
): Exclude<LocalCompassState, "PERMISSION_REQUIRED" | "DENIED" | "CALIBRATING" | "STALE"> {
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
  heading: number | null,
  width: number,
  height: number,
  mode: DisplayMode,
  selectedTimeLabel: string,
  orientation: boolean,
) {
  const observation = mode === "OBSERVATION";
  const canvas = observation ? "#000000" : "#050914";
  const surface = observation ? "#120000" : "#0B1222";
  const grid = observation ? "#551410" : "#1D2A45";
  const gridSoft = observation ? "#32100D" : "#15213A";
  const text = observation ? "#FF6A58" : "#EEF2FF";
  const muted = observation ? "#C54438" : "#94A0B8";
  const accent = observation ? "#FF3B30" : "#7E8FFF";
  const object = observation ? "#FF8A72" : "#F1D58A";
  const green = observation ? "#FF6A58" : "#55C7A5";
  const centerX = width / 2;
  const horizonY = orientation ? height - 48 : height - 46;
  const radius = Math.max(
    64,
    Math.min(width / 2 - 18, orientation ? height - 90 : height - 70),
  );
  context.setFillStyle(canvas);
  context.fillRect(0, 0, width, height);

  const stars = [
    [0.12, 0.15, 1],
    [0.24, 0.26, 1.5],
    [0.37, 0.11, 1],
    [0.49, 0.24, 1.25],
    [0.64, 0.14, 1],
    [0.78, 0.27, 1.35],
    [0.9, 0.12, 1],
    [0.16, 0.44, 0.9],
    [0.33, 0.52, 1],
    [0.58, 0.4, 0.9],
    [0.82, 0.49, 1.1],
    [0.93, 0.38, 0.8],
  ] as const;
  context.setFillStyle(muted);
  stars.forEach(([xRatio, yRatio, size]) => {
    context.beginPath();
    context.arc(width * xRatio, Math.min(horizonY - 12, height * yRatio), size, 0, Math.PI * 2);
    context.fill();
  });

  context.setStrokeStyle(grid);
  context.setLineWidth(1);
  context.beginPath();
  context.arc(centerX, horizonY, radius, Math.PI, Math.PI * 2);
  context.stroke();

  [0.5, 0.76].forEach((scale) => {
    context.setStrokeStyle(gridSoft);
    context.beginPath();
    context.arc(centerX, horizonY, radius * scale, Math.PI, Math.PI * 2);
    context.stroke();
  });

  context.setStrokeStyle(gridSoft);
  [-60, -30, 0, 30, 60].forEach((angle) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    context.beginPath();
    context.moveTo(centerX, horizonY);
    context.lineTo(
      centerX + Math.cos(radians) * radius,
      horizonY + Math.sin(radians) * radius,
    );
    context.stroke();
  });

  context.setStrokeStyle(grid);
  context.beginPath();
  context.moveTo(centerX - radius, horizonY);
  context.lineTo(centerX + radius, horizonY);
  context.stroke();

  context.setFillStyle(text);
  context.setFontSize(10);
  context.fillText("北", centerX - 5, horizonY - radius - 8);
  context.fillText("东", centerX + radius - 2, horizonY + 18);
  context.fillText("南", centerX - 5, horizonY + 18);
  context.fillText("西", centerX - radius - 8, horizonY + 18);
  context.setFillStyle(muted);
  context.setFontSize(9);
  context.fillText("60°", centerX + 6, horizonY - radius * 0.76 + 3);
  context.fillText("30°", centerX + 6, horizonY - radius * 0.5 + 3);

  context.setStrokeStyle(accent);
  context.setLineWidth(2);
  context.beginPath();
  context.arc(
    centerX,
    horizonY,
    radius * 0.76,
    Math.PI * 1.18,
    Math.PI * 1.72,
  );
  context.stroke();

  context.setFillStyle(surface);
  context.fillRect(12, 10, Math.min(width - 24, 164), 22);
  context.setFillStyle(accent);
  context.setFontSize(10);
  context.fillText(
    orientation
      ? heading === null
        ? "允许方向，先看北向目标"
        : "手机方向跟随"
      : "北向静态天空投影",
    20,
    25,
  );
  if (!data) {
    context.setFillStyle(text);
    context.fillText("等待天空数据", 18, horizonY - 18);
    context.draw(false);
    return;
  }

  const projectionHeading = heading ?? 0;
  data.targets.forEach((target, index) => {
    const degrees = extractDegrees(target.direction);
    if (degrees === null) return;
    if (target.altitudeDeg === null) return;
    const altitude = Math.max(0, Math.min(90, target.altitudeDeg));
    const distance = radius * (1 - altitude / 90);
    const radians = ((degrees - projectionHeading - 90) * Math.PI) / 180;
    const x = centerX + Math.cos(radians) * distance;
    const y = horizonY + Math.sin(radians) * distance;
    context.setGlobalAlpha(heading === null ? 0.68 : 1);
    context.setFillStyle(index % 2 === 0 ? object : green);
    context.beginPath();
    context.arc(x, y, target.type === "MILKY_WAY" ? 6 : 4, 0, Math.PI * 2);
    context.fill();
    context.setGlobalAlpha(1);
    context.setFillStyle(text);
    context.setFontSize(10);
    const labelX = Math.min(width - 112, Math.max(12, x + 8));
    context.fillText(target.displayName.slice(0, 10), labelX, y + 4);
  });
  context.setFillStyle(muted);
  context.setFontSize(10);
  context.fillText(
    heading === null && orientation
      ? "北向预览 · 允许方向后随手机朝向"
      : `${selectedTimeLabel} · ${orientation ? "方向呈现" : "当前计算"}`,
    16,
    orientation ? height - 12 : horizonY - 10,
  );
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
  const statusBarHeight = nativeStatusBarHeightPx();
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
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassState, setCompassState] =
    useState<LocalCompassState>("PERMISSION_REQUIRED");
  const [compassReason, setCompassReason] =
    useState("允许后仅在本页前台读取设备方向，不记录连续姿态轨迹");
  const compassListenerRef = useRef<
    Parameters<typeof Taro.onCompassChange>[0] | null
  >(null);
  const compassRunningRef = useRef(false);
  const lastCompassHeadingRef = useRef<number | null>(null);
  const compassStaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
  const rowTime = formatTime(row?.at ?? committedAt, routeContext.timezone);
  const sensorHeadingForScene =
    compassState === "READY" ? compassHeading : null;

  const stopCompass = useCallback(() => {
    if (compassStaleTimerRef.current) {
      clearTimeout(compassStaleTimerRef.current);
      compassStaleTimerRef.current = null;
    }
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
    if (view !== "DETAIL" || compassRunningRef.current) return;
    setCompassState("CALIBRATING");
    setCompassReason("正在校准设备方向");
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
        setCompassReason("设备没有提供可信方向，天空图不会伪造目标位置");
        setCompassHeading(null);
        if (compassStaleTimerRef.current) {
          clearTimeout(compassStaleTimerRef.current);
          compassStaleTimerRef.current = null;
        }
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
          ? "设备方向精度较低，目标列表仍可用"
          : "设备方向已连接，天空图随设备朝向更新",
      );
      if (compassStaleTimerRef.current) {
        clearTimeout(compassStaleTimerRef.current);
      }
      compassStaleTimerRef.current = setTimeout(() => {
        compassStaleTimerRef.current = null;
        setCompassHeading(null);
        setCompassState("STALE");
        setCompassReason("方向数据已暂时中断，请保持设备方向传感器可用");
      }, 1500);
    };

    try {
      compassRunningRef.current = true;
      compassListenerRef.current = listener;
      Taro.onCompassChange(listener);
      await Taro.startCompass();
    } catch (error) {
      try {
        Taro.offCompassChange(listener);
      } catch {
        // The listener may already have been removed by a hide lifecycle.
      }
      compassListenerRef.current = null;
      compassRunningRef.current = false;
      setCompassHeading(null);
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const permissionDenied =
        message.includes("auth") ||
        message.includes("permission") ||
        message.includes("deny") ||
        message.includes("authorize");
      setCompassState(permissionDenied ? "DENIED" : "UNAVAILABLE");
      setCompassReason(
        permissionDenied
          ? "未获得设备方向权限，天空图不会伪造 heading"
          : "设备没有可用的方向传感器，目标列表仍可用",
      );
    }
  }, [view]);

  useDidHide(stopCompass);

  useEffect(() => {
    if (view !== "DETAIL") stopCompass();
    return stopCompass;
  }, [stopCompass, view]);

  const draw = useCallback(() => {
    if (view !== "MAIN" && view !== "DETAIL") return;
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
              view === "MAIN" ? 0 : sensorHeadingForScene,
              width,
              height,
              mode,
              rowTime,
              view === "DETAIL",
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
  }, [mode, reportData, rowTime, sensorHeadingForScene, view]);

  useReady(draw);
  useEffect(() => {
    if ((view === "MAIN" || view === "DETAIL") && reportData) draw();
  }, [activeIndex, draw, reportData, view]);

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
          : nextView === "PROFESSIONAL"
            ? "sky/professional/index"
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
    if (Date.parse(nextRow.at) === Date.parse(committedAt)) {
      setPreviewIndex(null);
      return;
    }
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
      ? "方位天空"
      : view === "PROFESSIONAL"
        ? "专业数据"
      : view === "TARGETS"
        ? "观测目标"
        : "此处夜空";
  const spotName = overview.data?.data.spot.name ?? "此观星点";
  const usableData =
    reportData &&
    report.data?.dataState !== "EXPIRED" &&
    report.data?.dataState !== "UNAVAILABLE";
  const indexMax = Math.max(0, (reportData?.hourly.length ?? 1) - 1);
  const compassIsReady = compassState === "READY" && compassHeading !== null;
  const compassRecovery =
    compassState === "DENIED"
      ? {
          title: "方向权限未开启",
          detail: "开启后仅在本页前台读取设备方向；不会记录连续姿态轨迹。",
          action: "检查权限",
          secondary: "先看列表",
        }
      : compassState === "UNAVAILABLE"
        ? {
            title: "设备没有可用方向传感器",
            detail: "天空仍保留北向目标预览；当前不宣称手机方向，天体列表继续可用。",
            action: "重试方向",
            secondary: "先看列表",
          }
        : compassState === "STALE"
          ? {
              title: "方向数据暂时中断",
              detail: "天空暂停手机方向定位；重新连接后才恢复方向呈现。",
              action: "重新连接",
              secondary: "先看列表",
            }
          : compassState === "CALIBRATING"
            ? {
                title: "正在校准设备方向",
                detail: "保持手机平稳；可信方向到达前，天空保持北向预览。",
                action: "重新校准",
                secondary: "先看列表",
              }
            : compassState === "LOW_ACCURACY"
              ? {
                  title: "方向精度较低",
                  detail: "暂不显示当前方向结论；目标列表和北向预览仍可用。",
                  action: "重新校准",
                  secondary: "先看列表",
                }
              : {
                  title: "让天空图跟随手机方向",
                  detail: "仅在本页前台读取设备方向，用于旋转当前天空投影。",
                  action: "允许方向",
                  secondary: "先看列表",
                };
  const recoverCompass = () => {
    if (compassState === "DENIED") {
      stopCompass();
      void Taro.openSetting()
        .catch(() => undefined)
        .finally(() => {
          setCompassState("PERMISSION_REQUIRED");
          setCompassReason("权限设置返回后，可再次允许设备方向");
        });
      return;
    }
    stopCompass();
    void startCompass();
  };

  return (
    <View
      className={`${presentationClass} sky-page`}
      data-route="spot-night"
      data-spot-id={routeContext.spotId}
      data-od-id="spot-night"
    >
      <View
        className={`sky-mobile-header safe-top${view === "DETAIL" ? " sky-mobile-header--orientation" : ""}`}
        data-od-id="spot-night-header"
        {...(statusBarHeight > 0
          ? { style: { paddingTop: `${statusBarHeight}px` } }
          : {})}
      >
        {view === "DETAIL" ? (
          <SoftButton
            variant="ghost"
            className="sky-mobile-header__back"
            label="返回天文信息"
            onClick={() => navigateView("MAIN")}
          >
            返回天文信息
          </SoftButton>
        ) : (
          <View className="sky-mobile-header__identity">
            <Text className="sky-mobile-header__eyebrow">
              {spotName} · 今晚
            </Text>
            <Text className="sky-mobile-header__meta">
              {routeContext.localDate} · {routeContext.timezone}
            </Text>
          </View>
        )}
        {view === "DETAIL" ? (
          <View className="sky-mobile-header__identity sky-mobile-header__identity--orientation">
            <Text className="sky-mobile-header__eyebrow">
              {spotName} · {rowTime}
            </Text>
            <Text className="sky-mobile-header__meta">
              {routeContext.localDate} · 同一观测上下文
            </Text>
          </View>
        ) : null}
        <View className="sky-mobile-header__status">
          {view === "DETAIL" ? (
            <SoftButton
              variant={compassIsReady ? "default" : "primary"}
              className="sky-mobile-header__action"
              label={
                compassIsReady ? "设备方向已连接" : "允许设备方向并开始校准"
              }
              onClick={() => (compassIsReady ? undefined : recoverCompass())}
            >
              <SemanticIcon name="compass" decorative />
              {compassIsReady ? "已跟随手机" : "转为手机视图"}
            </SoftButton>
          ) : (
            <Text
              className="sky-mobile-header__time"
              aria-label={`当前夜空时间 ${rowTime}${isPreviewing ? "，预览中" : ""}`}
            >
              {rowTime} {isPreviewing ? "预览" : "实时"}
            </Text>
          )}
        </View>
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
          <View
            className="sky-context-strip"
            role="status"
            aria-label={`正式观星点 ${spotName}，观测夜 ${routeContext.localDate}，数据状态 ${report.data?.dataState ?? "UNAVAILABLE"}`}
          >
            <Text className="sky-context-strip__copy">
              正式观星点 · {routeContext.localDate} · {routeContext.timezone}
            </Text>
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
                <View className="sky-summary-stack sky-summary-stack--astronomy">
                  <View className="sky-scene sky-scene--astronomy" data-od-id="sky-scene">
                    <Canvas
                      canvasId={CANVAS_ID}
                      id={CANVAS_ID}
                      className="sky-scene__canvas"
                      style={{ width: "100%", height: "224px" }}
                      aria-label={`北向静态天空投影，${rowTime}，${reportData.targets.length} 个真实目标`}
                    />
                    <View className="sky-scene__time-overlay">
                      <Text className="sky-scene__time type-data">{rowTime}</Text>
                      <Text className="sky-scene__time-caption">
                        观测时间 · 预览松手后提交 · 数据与目标同一上下文
                      </Text>
                    </View>
                    {canvasError ? (
                      <Text className="sky-scene__error type-caption">
                        天空图暂不可绘制；下方目标与条件证据仍可访问。
                      </Text>
                    ) : null}
                  </View>

                  <View
                    className="sky-decision sky-decision--astronomy card"
                    data-od-id="spot-night-summary"
                  >
                    <View className="sky-decision__top">
                      <View className="sky-decision__heading">
                        <Text className="sky-decision__eyebrow">今晚结论</Text>
                        <Text className="sky-decision__label">
                          {usableData
                            ? reportData.decision.label
                            : "数据不足，暂不判断"}
                        </Text>
                      </View>
                      <DataStateBadge
                        state={report.data?.dataState ?? "UNAVAILABLE"}
                      />
                    </View>
                    <View className="sky-window-grid" role="list" aria-label="主窗口与备选窗口">
                      <View className="sky-window sky-window--primary" role="listitem">
                        <Text className="sky-window__label">主窗口</Text>
                        <Text className="sky-window__value type-data">
                          {usableData && reportData.decision.skyOpportunity.primaryWindow
                            ? `${formatTime(reportData.decision.skyOpportunity.primaryWindow.start, routeContext.timezone)}—${formatTime(reportData.decision.skyOpportunity.primaryWindow.end, routeContext.timezone)}`
                            : "暂无可证明窗口"}
                        </Text>
                        <Text className="sky-window__meta type-caption">
                          {usableData && reportData.decision.skyOpportunity.primaryWindow
                            ? `${reportData.decision.skyOpportunity.primaryWindow.durationMinutes} 分钟`
                            : "不会用过期或未经核验的结果补齐"}
                        </Text>
                      </View>
                      <View className="sky-window" role="listitem">
                        <Text className="sky-window__label">备选窗口</Text>
                        <Text className="sky-window__value type-data">
                          {usableData && reportData.decision.skyOpportunity.backupWindow
                            ? `${formatTime(reportData.decision.skyOpportunity.backupWindow.start, routeContext.timezone)}—${formatTime(reportData.decision.skyOpportunity.backupWindow.end, routeContext.timezone)}`
                            : "暂无可证明窗口"}
                        </Text>
                        <Text className="sky-window__meta type-caption">
                          {usableData && reportData.decision.skyOpportunity.backupWindow
                            ? `${reportData.decision.skyOpportunity.backupWindow.durationMinutes} 分钟`
                            : "数据不足时保持空缺"}
                        </Text>
                      </View>
                    </View>
                    {usableData ? (
                      <Text className="sky-decision__support type-caption">
                        {reportData.decision.skyOpportunity.label} · 天空信心 {reportData.decision.skyOpportunity.confidence === null ? "未知" : `${Math.round(reportData.decision.skyOpportunity.confidence * 100)}%`} · 出行信心 {reportData.decision.confidence === null ? "未知" : `${Math.round(reportData.decision.confidence * 100)}%`}
                      </Text>
                    ) : null}
                  </View>

                  <View className="time-card sky-time-card card" data-od-id="spot-night-time-focus">
                    <View className="time-card__header">
                      <View>
                        <Text className="sky-section-title">选择观测时间</Text>
                        <Text className="sky-time-card__value type-data">{rowTime}</Text>
                        <Text className="type-caption">
                          {isPreviewing ? "预览中 · 松手提交一次" : "已提交 · Map / Astronomy / Plan 共用"}
                        </Text>
                      </View>
                      {isPreviewing ? (
                        <SoftButton
                          variant="ghost"
                          className="sky-time-card__cancel"
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
                      aria-label="调整同一观测上下文的观测时间"
                      onChanging={(event) => onPreview(event.detail.value)}
                      onChange={(event) => void commitIndex(event.detail.value)}
                    />
                    <View className="sky-time-rail" aria-hidden>
                      <View className="sky-time-rail__track">
                        <View
                          className="sky-time-rail__progress"
                          style={{ width: `${reportData.hourly.length > 1 ? (activeIndex / (reportData.hourly.length - 1)) * 100 : 0}%` }}
                        />
                        {[reportData.decision.skyOpportunity.primaryWindow?.start, reportData.decision.skyOpportunity.primaryWindow?.end, reportData.decision.skyOpportunity.backupWindow?.start, reportData.decision.skyOpportunity.backupWindow?.end]
                          .filter((value): value is string => Boolean(value))
                          .map((value, eventIndex) => {
                            const markerIndex = nearestHourIndex(reportData.hourly, value);
                            const marker = reportData.hourly.length > 1 ? (markerIndex / (reportData.hourly.length - 1)) * 100 : 0;
                            return <View key={`${value}:${eventIndex}`} className="sky-time-rail__event" style={{ left: `${marker}%` }} />;
                          })}
                        <View
                          className="sky-time-rail__cursor"
                          style={{ left: `${reportData.hourly.length > 1 ? (activeIndex / (reportData.hourly.length - 1)) * 100 : 0}%` }}
                        />
                      </View>
                      <View className="sky-time-rail__labels">
                        {[0, Math.floor(Math.max(0, reportData.hourly.length - 1) / 2), reportData.hourly.length - 1]
                          .filter((value, index, all) => value >= 0 && value < reportData.hourly.length && all.indexOf(value) === index)
                          .map((value) => (
                            <Text key={value} className="type-caption">{formatTime(reportData.hourly[value]?.at, routeContext.timezone)}</Text>
                          ))}
                      </View>
                    </View>
                  </View>

                  <View className="sky-bands-card card" data-od-id="sky-condition-bands">
                    <View className="sky-section-header">
                      <View className="sky-section-header__copy">
                        <Text className="sky-section-title">条件随时间变化 · {rowTime}</Text>
                        <Text className="type-caption">同一 selected time 对齐天空、主备窗口、目标与条件；缺失保持缺失。</Text>
                      </View>
                      <Text className="sky-bands-card__count type-caption">{reportData.hourly.length} 个时刻</Text>
                    </View>
                    <SkyConditionBands rows={reportData.hourly} activeIndex={activeIndex} timezone={routeContext.timezone} />
                  </View>

                  <View className="sky-targets sky-targets--compact card" data-od-id="sky-target-list" role="list" aria-label="当前真实观测目标">
                    <View className="sky-section-header">
                      <View className="sky-section-header__copy">
                        <Text className="sky-section-title">目标</Text>
                        <Text className="type-caption">来自当前正式点、观测夜与 selected time 的 API 结果</Text>
                      </View>
                      <Text className="sky-bands-card__count type-caption">{reportData.targets.length} 个</Text>
                    </View>
                    {reportData.targets.length ? (
                      reportData.targets.map((target) => <SkyTargetRow target={target} key={target.targetId} />)
                    ) : (
                      <StatusPanel state="EMPTY" detail="当前没有可证明目标；不会显示预设天体。" />
                    )}
                  </View>

                  <View className="sky-source-drawer" data-od-id="spot-source-evidence">
                    <View className="sky-section-header">
                      <View className="sky-section-header__copy">
                        <Text className="sky-section-title">来源与完整度</Text>
                        <Text className="type-caption">{reportData.context.algorithmVersion} · {reportData.context.catalogVersion} · {reportData.context.eventCatalogVersion}</Text>
                      </View>
                      <DataStateBadge state={report.data?.dataState ?? "UNAVAILABLE"} />
                    </View>
                    {reportData.sources.length ? (
                      reportData.sources.map((source) => <Provenance source={source} key={source.id} compact />)
                    ) : (
                      <Text className="type-caption">当前没有可展示来源；不会把结果标记为完整。</Text>
                    )}
                    {report.data?.warnings.map((warning) => (
                      <Text className="type-caption" key={warning}>· {warning}</Text>
                    ))}
                  </View>
                </View>
              ) : view === "DETAIL" ? (
                <View className="sky-summary-stack sky-summary-stack--orientation">
                  <View className="sky-scene sky-scene--orientation" data-od-id="sky-orientation-scene">
                    <Canvas
                      canvasId={CANVAS_ID}
                      id={CANVAS_ID}
                      className="sky-scene__canvas"
                      style={{ width: "100%", height: "392px" }}
                      aria-label={`方位高度天空图，${compassIsReady ? "跟随设备方向" : "北向预览"}，不改变地点、观测时间或天文结果`}
                    />
                    <View className="orientation-control" data-od-id="sky-orientation-control" role="status">
                      <SemanticIcon name="compass" decorative={false} label="设备方向传感器" />
                      <Text className="orientation-control__status">
                        {compassIsReady
                          ? `方向已连接 · 当前 ${Math.round(compassHeading)}° · 只改变天空呈现`
                          : compassReason}
                      </Text>
                    </View>
                    {!compassIsReady ? (
                      <View className="orientation-recovery" role="group" aria-label={compassRecovery.title}>
                        <View className="orientation-recovery__icon">
                          <SemanticIcon name="compass" decorative={false} label="方向权限与传感器状态" />
                        </View>
                        <View className="orientation-recovery__copy">
                          <Text className="orientation-recovery__title">{compassRecovery.title}</Text>
                          <Text className="orientation-recovery__detail">{compassRecovery.detail}</Text>
                        </View>
                        <View className="orientation-actions">
                          <SoftButton
                            variant="primary"
                            className="orientation-actions__primary"
                            label={compassRecovery.action}
                            disabled={compassState === "CALIBRATING"}
                            onClick={recoverCompass}
                          >
                            {compassRecovery.action}
                          </SoftButton>
                          <SoftButton
                            variant="ghost"
                            className="orientation-actions__secondary"
                            label="暂不启用方向，查看可访问对象列表"
                            onClick={() => {
                              stopCompass();
                              navigateView("TARGETS");
                            }}
                          >
                            {compassRecovery.secondary}
                          </SoftButton>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <View className="sky-targets sky-targets--orientation card" data-od-id="sky-orientation-object-list" role="list" aria-label="当前可访问天体对象列表">
                    <View className="sky-section-header">
                      <View className="sky-section-header__copy">
                        <Text className="sky-section-title">对象列表</Text>
                        <Text className="type-caption">传感器不可用、拒绝或过期时仍可阅读真实目标结果</Text>
                      </View>
                      <Text className="sky-bands-card__count type-caption">{reportData.targets.length} 个</Text>
                    </View>
                    {reportData.targets.length ? (
                      reportData.targets.map((target) => (
                        <SkyTargetRow target={target} key={target.targetId} />
                      ))
                    ) : (
                      <StatusPanel state="EMPTY" detail="当前没有可证明目标；不会显示预设目标。" />
                    )}
                  </View>
                  <View className="sky-source-drawer sky-source-drawer--orientation" data-od-id="sky-orientation-context">
                    <Text className="type-caption">
                      {spotName} · {rowTime} · {routeContext.timezone} · 方向只改变呈现，不改变地点、时间或天文真相。
                    </Text>
                    <DataStateBadge state={report.data?.dataState ?? "UNAVAILABLE"} />
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
                    variant="primary"
                    label="打开跟随设备方向的方位天空"
                    onClick={() => navigateView("DETAIL")}
                  >
                    方位天空
                  </SoftButton>
                ) : null}
                {view !== "PROFESSIONAL" ? (
                  <SoftButton
                    label="查看完整专业数据"
                    onClick={() => navigateView("PROFESSIONAL")}
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
