import Taro, {
  useDidHide,
  useDidShow,
  useReady,
  useRouter,
} from "@tarojs/taro";
import { Button, Canvas, ScrollView, Text, View } from "@tarojs/components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type DisplayMode,
  type HourlySkyRow,
  type ObservationContext,
  type SkyReport,
} from "@starward/miniapp-contracts";
import { NotificationRegion } from "@/components/notification";
import { SemanticIcon } from "@/components/semantic-asset";
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
import {
  type DeviceMotionEvent,
  createCompassLifecycle,
} from "./compass-lifecycle";
import "./spot-sky-page.scss";

const CANVAS_ID = "spot-night-sky-scene";

const TARGET_TYPE_LABEL: Readonly<Record<SkyReport["targets"][number]["type"], string>> = {
  STAR: "恒星",
  PLANET: "行星",
  CONSTELLATION: "星座",
  MILKY_WAY: "银河",
  METEOR_SHOWER: "流星雨",
  CONJUNCTION: "天体相合",
};

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

function skyTargetWindowLabel(
  target: SkyReport["targets"][number],
  timezone: string,
) {
  return target.window
    ? `窗口 ${formatTime(target.window.start, timezone)}—${formatTime(target.window.end, timezone)}`
    : "窗口不足";
}

function SkyOrientationTargetLabel({
  target,
  projection,
  width,
  height,
  timezone,
}: {
  target: SkyReport["targets"][number];
  projection: SkyTargetProjection;
  width: number;
  height: number;
  timezone: string;
}) {
  const altitude = `${projection.altitude}°`;
  const isEvent =
    target.type === "METEOR_SHOWER" ||
    target.type === "CONJUNCTION" ||
    target.type === "MILKY_WAY";
  const left = Math.max(10, Math.min(width - 10, projection.x));
  const top = Math.max(16, Math.min(height - 24, projection.y));
  const label = `${target.displayName}，${TARGET_TYPE_LABEL[target.type]}，${target.direction}，高度 ${altitude}，${skyTargetWindowLabel(target, timezone)}`;
  return (
    <View
      className={`sky-orientation-target-label${isEvent ? " sky-orientation-target-label--event" : ""}`}
      style={{ left: `${left}px`, top: `${top}px` }}
      role="listitem"
      aria-label={label}
      data-target-id={target.targetId}
    >
      <View className="sky-orientation-target-label__mark" aria-hidden="true" />
      <View className="sky-orientation-target-label__copy">
        <Text className="sky-orientation-target-label__name">
          {target.displayName}
        </Text>
        <Text className="sky-orientation-target-label__meta">
          {target.direction} · {altitude}
        </Text>
        <Text className="sky-orientation-target-label__window">
          {skyTargetWindowLabel(target, timezone)}
        </Text>
      </View>
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

type CompassAccuracy = number | string | null;

interface CompassTelemetry {
  accuracy: CompassAccuracy;
  sampledAt: number | null;
}

interface DevicePose {
  alphaDeg: number;
  betaDeg: number;
  gammaDeg: number;
  sampledAt: number;
}

interface SkyCanvasMetrics {
  centerX: number;
  horizonY: number;
  radius: number;
}

interface SkyTargetProjection {
  x: number;
  y: number;
  degrees: number;
  altitude: number;
}

function skyCanvasMetrics(width: number, height: number): SkyCanvasMetrics {
  // Keep the horizon clear of the raised ruler while preserving a useful
  // field on short/landscape devices. The canvas itself still occupies the
  // complete route; this only defines the honest projection geometry.
  const centerX = width / 2;
  const horizonY = Math.max(
    120,
    Math.min(Math.max(120, height - 150), height * 0.78),
  );
  const radius = Math.max(
    64,
    Math.min(Math.max(64, width / 2 - 24), Math.max(64, horizonY - 72)),
  );
  return { centerX, horizonY, radius };
}

function projectSkyTarget(
  target: SkyReport["targets"][number],
  heading: number | null,
  pose: DevicePose | null,
  width: number,
  height: number,
): SkyTargetProjection | null {
  const degrees = extractDegrees(target.direction);
  if (degrees === null || target.altitudeDeg === null) return null;
  const { centerX, horizonY, radius } = skyCanvasMetrics(width, height);
  const altitude = Math.max(0, Math.min(90, target.altitudeDeg));
  const distance = radius * (1 - altitude / 90);
  const projectionHeading = heading ?? 0;
  const radians = ((degrees - projectionHeading - 90) * Math.PI) / 180;
  // Device motion supplies pitch/roll only after the compass has provided an
  // absolute heading. No synthetic tilt is introduced for missing/stale data.
  const pitchOffset =
    heading !== null && pose
      ? (Math.max(-90, Math.min(90, pose.betaDeg)) / 90) * radius * 0.18
      : 0;
  const rollOffset =
    heading !== null && pose
      ? (Math.max(-90, Math.min(90, pose.gammaDeg)) / 90) * radius * 0.18
      : 0;
  return {
    x: centerX + Math.cos(radians) * distance + rollOffset,
    y: horizonY + Math.sin(radians) * distance + pitchOffset,
    degrees,
    altitude,
  };
}

function compassAccuracyLabel(accuracy: CompassAccuracy) {
  if (accuracy === null || accuracy === undefined || accuracy === "") {
    return "未提供";
  }
  if (typeof accuracy === "number") {
    return Number.isFinite(accuracy) && accuracy >= 0
      ? `${Math.round(accuracy)}°`
      : "未提供";
  }
  const normalized = accuracy.toLowerCase();
  if (normalized === "high") return "高";
  if (normalized === "medium") return "中";
  if (normalized === "low") return "低";
  return "未提供";
}

function compassAgeLabel(sampledAt: number | null, now: number) {
  if (sampledAt === null || !Number.isFinite(sampledAt)) return "未收到";
  const ageMs = Math.max(0, now - sampledAt);
  if (ageMs < 1000) return `${ageMs} ms`;
  return `${(ageMs / 1000).toFixed(ageMs < 10_000 ? 1 : 0)} s`;
}

// The ruler's full ScrollView is the 88rpx direct-manipulation lane. Ticks
// remain visually compact at the Design Authority's 34rpx cadence so the
// selected center slice has useful temporal context instead of a sparse row.
const ORIENTATION_RULER_STEP_RPX = 34;

function orientationRulerStepPx() {
  try {
    const windowWidth = Number(Taro.getSystemInfoSync().windowWidth);
    if (Number.isFinite(windowWidth) && windowWidth > 0) {
      return (windowWidth * ORIENTATION_RULER_STEP_RPX) / 750;
    }
  } catch {
    // A conservative CSS-pixel fallback keeps the ruler usable in tests and
    // before the native system metrics are ready.
  }
  return 20;
}

function orientationRulerLabel(
  row: HourlySkyRow | undefined,
  timezone: string,
  index: number,
) {
  return row
    ? `${formatTime(row.at, timezone)}，第 ${index + 1} 个真实观测时刻`
    : `第 ${index + 1} 个真实观测时刻`;
}

function orientationRulerDistance(index: number, visualIndex: number) {
  const distance = Math.abs(index - visualIndex);
  return Math.min(1, distance / 7);
}

function OrientationTimeRuler({
  rows,
  activeIndex,
  committedIndex,
  timezone,
  isPreviewing,
  saving,
  reducedMotion,
  onPreview,
  onCommit,
  onCancel,
}: {
  rows: readonly HourlySkyRow[];
  activeIndex: number;
  committedIndex: number;
  timezone: string;
  isPreviewing: boolean;
  saving: boolean;
  reducedMotion: boolean;
  onPreview: (index: number) => void;
  onCommit: (index: number) => void;
  onCancel: () => void;
}) {
  const safeActiveIndex = clampIndex(activeIndex, rows.length);
  const safeCommittedIndex = clampIndex(committedIndex, rows.length);
  const [visualIndex, setVisualIndex] = useState(safeActiveIndex);
  const [scrollLeft, setScrollLeft] = useState(
    safeActiveIndex * orientationRulerStepPx(),
  );
  const interactingRef = useRef(false);

  useEffect(() => {
    if (interactingRef.current) return;
    const nextIndex = clampIndex(activeIndex, rows.length);
    setVisualIndex(nextIndex);
    setScrollLeft(nextIndex * orientationRulerStepPx());
  }, [activeIndex, rows.length]);

  const step = orientationRulerStepPx();
  const maxIndex = Math.max(0, rows.length - 1);
  const activeRow = rows[safeActiveIndex];
  const setPreviewFromScroll = useCallback(
    (nextScrollLeft: number) => {
      const maxScroll = Math.max(0, rows.length - 1) * step;
      const boundedScroll = Math.max(0, Math.min(nextScrollLeft, maxScroll));
      const nextFloat = rows.length ? boundedScroll / step : 0;
      const nextIndex = clampIndex(Math.round(nextFloat), rows.length);
      setScrollLeft(boundedScroll);
      setVisualIndex(nextFloat);
      onPreview(nextIndex);
      return nextIndex;
    },
    [onPreview, rows.length, step],
  );
  const settle = useCallback(
    (nextScrollLeft: number) => {
      const nextIndex = setPreviewFromScroll(nextScrollLeft);
      setVisualIndex(nextIndex);
      setScrollLeft(nextIndex * step);
      interactingRef.current = false;
      onCommit(nextIndex);
    },
    [onCommit, setPreviewFromScroll, step],
  );
  const selectTick = useCallback(
    (nextIndex: number) => {
      const safeIndex = clampIndex(nextIndex, rows.length);
      interactingRef.current = false;
      setVisualIndex(safeIndex);
      setScrollLeft(safeIndex * step);
      onPreview(safeIndex);
      onCommit(safeIndex);
    },
    [onCommit, onPreview, rows.length, step],
  );
  const stepTime = useCallback(
    (delta: number) => {
      selectTick(safeActiveIndex + delta);
    },
    [safeActiveIndex, selectTick],
  );
  const previewValue = rows.length ? clampIndex(Math.round(visualIndex), rows.length) : 0;
  const currentLabel = activeRow
    ? formatTime(activeRow.at, timezone)
    : "暂无可用时刻";

  if (!rows.length) {
    return (
      <View
        className="sky-orientation-time-ruler"
        data-control="sky-orientation-time-ruler"
        data-od-id="sky-orientation-time-ruler"
        role="group"
        aria-label="观测时间尺，当前没有可用的真实时刻"
      >
        <Text className="sky-orientation-time-ruler__empty">暂无可用观测时刻</Text>
      </View>
    );
  }

  return (
    <View
      className={`sky-orientation-time-ruler${isPreviewing ? " sky-orientation-time-ruler--preview" : ""}`}
      data-control="sky-orientation-time-ruler"
      data-od-id="sky-orientation-time-ruler"
      role="group"
      aria-label="方位天空观测时间尺"
    >
      <View className="sky-orientation-time-ruler__current" aria-hidden="true">
        <Text className="sky-orientation-time-ruler__current-value">
          {currentLabel}
        </Text>
        {saving || isPreviewing ? (
          <Text className="sky-orientation-time-ruler__current-state">
            {saving ? "保存中" : "预览"}
          </Text>
        ) : null}
      </View>
      <View className="sky-orientation-time-ruler__axis" aria-hidden="true" />
      <ScrollView
        scrollX
        enhanced
        fastDeceleration
        showScrollbar={false}
        scrollLeft={scrollLeft}
        scrollWithAnimation={!reducedMotion}
        className="sky-orientation-time-ruler__viewport"
        data-od-id="sky-orientation-time-ruler-scroll"
        aria-label="拖动选择真实观测时刻"
        aria-valuemin={0}
        aria-valuemax={maxIndex}
        aria-valuenow={previewValue}
        aria-valuetext={orientationRulerLabel(rows[previewValue], timezone, previewValue)}
        onScroll={(event) => {
          if (saving) return;
          const nextScrollLeft = Number(event.detail.scrollLeft);
          if (Number.isFinite(nextScrollLeft)) {
            interactingRef.current = true;
            setPreviewFromScroll(nextScrollLeft);
          }
        }}
        onScrollEnd={(event) => {
          if (saving) return;
          const nextScrollLeft = Number(event.detail.scrollLeft);
          settle(Number.isFinite(nextScrollLeft) ? nextScrollLeft : scrollLeft);
        }}
      >
        <View className="sky-orientation-time-ruler__track">
          {rows.map((row, index) => {
            const distance = orientationRulerDistance(index, visualIndex);
            const isSelected = index === previewValue;
            const isEvent = Boolean(
              row.opportunityBlockers.length === 0 && row.opportunityEligible,
            );
            return (
              <Button
                key={`${row.at}:${index}`}
                compileMode
                className={`sky-orientation-time-ruler__tick${isSelected ? " sky-orientation-time-ruler__tick--selected" : ""}${isEvent ? " sky-orientation-time-ruler__tick--event" : ""}`}
                style={{
                  opacity: 1 - distance * 0.68,
                  transform: `translateY(${Math.round(distance * distance * 18)}rpx) scale(${(1 - distance * 0.34).toFixed(3)})`,
                }}
                ariaLabel={orientationRulerLabel(row, timezone, index)}
                aria-pressed={isSelected ? "true" : "false"}
                disabled={saving}
                onClick={() => selectTick(index)}
              >
                <View className="sky-orientation-time-ruler__tick-mark" aria-hidden="true" />
                {(index % 4 === 0 || isSelected) ? (
                  <Text className="sky-orientation-time-ruler__tick-label">
                    {formatTime(row.at, timezone)}
                  </Text>
                ) : null}
              </Button>
            );
          })}
        </View>
      </ScrollView>
      <View className="sky-orientation-time-ruler__assistive" role="group" aria-label="观测时刻辅助操作">
        <Button
          compileMode
          className="sky-orientation-time-ruler__step"
          ariaLabel="更早一个真实观测时刻"
          disabled={saving || safeActiveIndex <= 0}
          onClick={() => stepTime(-1)}
        >
          更早一个时刻
        </Button>
        <Button
          compileMode
          className="sky-orientation-time-ruler__step"
          ariaLabel="更晚一个真实观测时刻"
          disabled={saving || safeActiveIndex >= maxIndex}
          onClick={() => stepTime(1)}
        >
          更晚一个时刻
        </Button>
      </View>
      {isPreviewing ? (
        <SoftButton
          variant="ghost"
          className="sky-orientation-time-ruler__cancel"
          label="取消观测时刻预览"
          disabled={saving}
          onClick={() => {
            interactingRef.current = false;
            setVisualIndex(safeCommittedIndex);
            setScrollLeft(safeCommittedIndex * step);
            onCancel();
          }}
        >
          取消预览
        </SoftButton>
      ) : null}
    </View>
  );
}

function drawSkyScene(
  context: ReturnType<typeof Taro.createCanvasContext>,
  data: SkyReport | undefined,
  heading: number | null,
  pose: DevicePose | null,
  width: number,
  height: number,
  mode: DisplayMode,
) {
  const palette =
    mode === "OBSERVATION"
      ? {
          canvas: "#000000",
          grid: "#7A1E18",
          gridSoft: "#240000",
          text: "#FF6B58",
          muted: "#C23D32",
          target: "#D84A3C",
          event: "#FF6B58",
        }
      : mode === "NIGHT"
        ? {
            canvas: "#11120F",
            grid: "#666D62",
            gridSoft: "#343830",
            text: "#F5F3EC",
            muted: "#989E94",
            target: "#D1D7FF",
            event: "#FFE5A0",
          }
        : {
            canvas: "#FFFFFF",
            grid: "#8A9088",
            gridSoft: "#E2E5DD",
            text: "#282B29",
            muted: "#6D746D",
            target: "#4859B8",
            event: "#6F5500",
          };
  const { centerX, horizonY, radius } = skyCanvasMetrics(width, height);
  context.setFillStyle(palette.canvas);
  context.fillRect(0, 0, width, height);

  context.setStrokeStyle(palette.grid);
  context.setLineWidth(1);
  context.beginPath();
  context.arc(centerX, horizonY, radius, Math.PI, Math.PI * 2);
  context.stroke();

  [0.5, 0.76].forEach((scale) => {
    context.setStrokeStyle(palette.gridSoft);
    context.beginPath();
    context.arc(centerX, horizonY, radius * scale, Math.PI, Math.PI * 2);
    context.stroke();
  });

  context.setStrokeStyle(palette.gridSoft);
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

  context.setStrokeStyle(palette.grid);
  context.beginPath();
  context.moveTo(centerX - radius, horizonY);
  context.lineTo(centerX + radius, horizonY);
  context.stroke();

  context.setFillStyle(palette.text);
  context.setFontSize(10);
  context.fillText("北", centerX - 5, horizonY - radius - 8);
  context.fillText("东", centerX + radius - 2, horizonY + 18);
  context.fillText("南", centerX - 5, horizonY + 18);
  context.fillText("西", centerX - radius - 8, horizonY + 18);
  context.setFillStyle(palette.muted);
  context.setFontSize(9);
  context.fillText("60°", centerX + 6, horizonY - radius * 0.76 + 3);
  context.fillText("30°", centerX + 6, horizonY - radius * 0.5 + 3);

  if (!data) {
    context.draw(false);
    return;
  }

  data.targets.forEach((target) => {
    const projection = projectSkyTarget(target, heading, pose, width, height);
    if (!projection) return;
    const isEvent =
      target.type === "METEOR_SHOWER" ||
      target.type === "CONJUNCTION" ||
      target.type === "MILKY_WAY";
    const mark = mode === "OBSERVATION"
      ? palette.target
      : isEvent
        ? palette.event
        : palette.target;
    context.setGlobalAlpha(heading === null ? 0.72 : 1);
    context.setFillStyle(mark);
    context.beginPath();
    context.arc(
      projection.x,
      projection.y,
      target.type === "MILKY_WAY" ? 6 : 4,
      0,
      Math.PI * 2,
    );
    context.fill();
    if (target.type === "CONSTELLATION" || target.type === "MILKY_WAY") {
      context.setStrokeStyle(mark);
      context.setLineWidth(1);
      context.beginPath();
      context.moveTo(projection.x - 8, projection.y);
      context.lineTo(projection.x + 8, projection.y);
      context.moveTo(projection.x, projection.y - 8);
      context.lineTo(projection.x, projection.y + 8);
      context.stroke();
    }
    context.setGlobalAlpha(1);
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

function OrientationQuietBack({
  onBack,
  label = "返回",
}: {
  onBack: () => void;
  label?: string;
}) {
  return (
    <View
      className="sky-orientation-back-layer safe-top"
      data-od-id="sky-orientation-back"
    >
      <SoftButton
        variant="ghost"
        className="sky-orientation-back"
        label={label}
        onClick={onBack}
      >
        <Text>{label}</Text>
      </SoftButton>
      <SemanticIcon
        name="arrow-left"
        decorative
        className="sky-orientation-back__icon"
      />
    </View>
  );
}

export function SpotSkyPage() {
  const router = useRouter();
  const routeContext = useMemo<SpotNightRouteContext>(
    () => ({
      spotId: safeParam(router.params.spotId || router.params.spot_id),
      contextId: safeParam(router.params.contextId || router.params.context_id),
      localDate: safeParam(
        router.params.date || router.params.localDate || router.params.local_date,
      ),
      selectedAt: safeParam(router.params.selectedAt || router.params.selected_at),
      timezone: safeParam(router.params.timezone),
      dataRevision: safeParam(
        router.params.dataRevision || router.params.data_revision,
      ),
    }),
    [
      router.params.contextId,
      router.params.context_id,
      router.params.dataRevision,
      router.params.data_revision,
      router.params.date,
      router.params.localDate,
      router.params.local_date,
      router.params.selectedAt,
      router.params.selected_at,
      router.params.spotId,
      router.params.spot_id,
      router.params.timezone,
    ],
  );
  const storedContext = useAppStore((state) => state.observationContext);
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const notify = useAppStore((state) => state.notify);
  const mode = useAppStore((state) => state.mode);
  const reducedMotion = useAppStore(
    (state) => state.preferences.reducedMotion,
  );
  const themeClass = useThemeClass();
  // Full-sky uses the active product mode as-is. In particular, DAY is the
  // selected white field profile; it must not be silently rendered as NIGHT.
  const presentationClass = themeClass;
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
  const [compassReason, setCompassReasonState] =
    useState("允许后仅在本页前台读取设备方向，不记录连续姿态轨迹");
  const [compassTelemetry, setCompassTelemetry] = useState<CompassTelemetry>({
    accuracy: null,
    sampledAt: null,
  });
  const [compassNow, setCompassNow] = useState(() => Date.now());
  // Keep the reason setter as the single presentation boundary used by the
  // extracted compass callbacks. The optional telemetry payload lets the
  // route expose accuracy and sample age without creating a second sensor
  // owner; old callback tests can continue to provide a one-argument stub.
  const setCompassReason = useCallback(
    (reason: string, telemetry?: CompassTelemetry | null) => {
      setCompassReasonState(reason);
      if (telemetry === null) {
        setCompassTelemetry({ accuracy: null, sampledAt: null });
      } else if (telemetry) {
        setCompassTelemetry(telemetry);
      }
    },
    [],
  );
  const compassLifecycle = useMemo(
    () => createCompassLifecycle(Taro, { requireDeviceMotion: true }),
    [],
  );
  const lastCompassHeadingRef = useRef<number | null>(null);
  const compassHeadingRef = useRef<number | null>(null);
  const compassQualityRef = useRef<LocalCompassState | null>(null);
  const [devicePose, setDevicePose] = useState<DevicePose | null>(null);
  const devicePoseRef = useRef<DevicePose | null>(null);
  const motionOffsetRef = useRef<number | null>(null);
  const compassStaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const motionStaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const compassResumeRef = useRef(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 343, height: 640 });
  const [timeSaving, setTimeSaving] = useState(false);
  const [orientationObjectListOpen, setOrientationObjectListOpen] =
    useState(false);

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
    compassState === "READY" &&
    compassHeading !== null &&
    devicePose !== null &&
    motionOffsetRef.current !== null
      ? normalizeDegrees(devicePose.alphaDeg + motionOffsetRef.current)
      : null;

  const stopCompass = useCallback(() => {
    if (compassStaleTimerRef.current) {
      clearTimeout(compassStaleTimerRef.current);
      compassStaleTimerRef.current = null;
    }
    if (motionStaleTimerRef.current) {
      clearTimeout(motionStaleTimerRef.current);
      motionStaleTimerRef.current = null;
    }
    void compassLifecycle.stop();
    lastCompassHeadingRef.current = null;
    compassHeadingRef.current = null;
    compassQualityRef.current = "PERMISSION_REQUIRED";
    devicePoseRef.current = null;
    motionOffsetRef.current = null;
    setDevicePose(null);
    setCompassHeading(null);
    setCompassState("PERMISSION_REQUIRED");
    setCompassReason(
      "允许后仅在本页前台读取设备方向，不记录连续姿态轨迹",
      null,
    );
  }, [compassLifecycle]);

  const startCompass = useCallback(async () => {
    if (compassLifecycle.active) return;
    setCompassState("CALIBRATING");
    compassQualityRef.current = "CALIBRATING";
    setCompassReason("正在校准设备方向");
    const motionListener = (event: DeviceMotionEvent) => {
      const alpha = Number(event.alpha);
      const beta = Number(event.beta);
      const gamma = Number(event.gamma);
      if (
        !Number.isFinite(alpha) ||
        !Number.isFinite(beta) ||
        !Number.isFinite(gamma) ||
        Math.abs(beta) > Math.PI ||
        Math.abs(gamma) > Math.PI / 2
      ) {
        if (motionStaleTimerRef.current) {
          clearTimeout(motionStaleTimerRef.current);
          motionStaleTimerRef.current = null;
        }
        compassQualityRef.current = "UNAVAILABLE";
        devicePoseRef.current = null;
        motionOffsetRef.current = null;
        setDevicePose(null);
        setCompassHeading(null);
        setCompassState("UNAVAILABLE");
        setCompassReason(
          "设备没有提供可信姿态，天空图不会伪造当前方向",
          null,
        );
        return;
      }

      const pose: DevicePose = {
        alphaDeg: normalizeDegrees((alpha * 180) / Math.PI),
        betaDeg: (beta * 180) / Math.PI,
        gammaDeg: (gamma * 180) / Math.PI,
        sampledAt: Date.now(),
      };
      devicePoseRef.current = pose;
      setDevicePose(pose);
      if (
        compassHeadingRef.current !== null &&
        motionOffsetRef.current === null
      ) {
        // Calibrate the device-motion alpha stream against the absolute
        // compass once per foreground session; subsequent alpha changes are
        // the continuous orientation signal.
        motionOffsetRef.current = normalizeDegrees(
          compassHeadingRef.current - pose.alphaDeg,
        );
      }
      if (compassQualityRef.current === "LOW_ACCURACY") {
        setCompassState("LOW_ACCURACY");
      } else if (compassQualityRef.current === "READY") {
        setCompassState("READY");
      } else if (
        compassQualityRef.current === null ||
        compassQualityRef.current === "PERMISSION_REQUIRED" ||
        compassQualityRef.current === "CALIBRATING"
      ) {
        setCompassState("CALIBRATING");
      }
      if (motionStaleTimerRef.current) {
        clearTimeout(motionStaleTimerRef.current);
      }
      motionStaleTimerRef.current = setTimeout(() => {
        if (!compassLifecycle.isCurrentMotion(motionListener)) return;
        motionStaleTimerRef.current = null;
        devicePoseRef.current = null;
        motionOffsetRef.current = null;
        setDevicePose(null);
        setCompassHeading(null);
        if (
          compassQualityRef.current === "UNAVAILABLE" ||
          compassQualityRef.current === "DENIED"
        ) return;
        compassQualityRef.current = "STALE";
        setCompassState("STALE");
        setCompassReason("设备姿态数据已暂时中断，请保持方向传感器可用");
      }, 1500);
    };

    const listener: Parameters<typeof Taro.onCompassChange>[0] = (event) => {
      const nextState = compassAccuracyState(event.accuracy);
      const direction = Number(event.direction);
      if (
        nextState === "UNAVAILABLE" ||
        !Number.isFinite(direction) ||
        direction < 0 ||
        direction > 360
      ) {
        compassQualityRef.current = "UNAVAILABLE";
        compassHeadingRef.current = null;
        lastCompassHeadingRef.current = null;
        devicePoseRef.current = null;
        motionOffsetRef.current = null;
        setDevicePose(null);
        setCompassState("UNAVAILABLE");
        setCompassReason(
          "设备没有提供可信方向，天空图不会伪造目标位置",
          null,
        );
        setCompassHeading(null);
        if (compassStaleTimerRef.current) {
          clearTimeout(compassStaleTimerRef.current);
          compassStaleTimerRef.current = null;
        }
        if (motionStaleTimerRef.current) {
          clearTimeout(motionStaleTimerRef.current);
          motionStaleTimerRef.current = null;
        }
        return;
      }
      const normalized = normalizeDegrees(direction);
      compassQualityRef.current = nextState;
      compassHeadingRef.current = normalized;
      if (
        devicePoseRef.current !== null &&
        motionOffsetRef.current === null
      ) {
        motionOffsetRef.current = normalizeDegrees(
          normalized - devicePoseRef.current.alphaDeg,
        );
      }
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
          : devicePoseRef.current === null
            ? "正在读取设备姿态"
            : "设备方向已连接，天空图随设备朝向更新",
        {
          accuracy: event.accuracy,
          sampledAt: Date.now(),
        },
      );
      if (compassStaleTimerRef.current) {
        clearTimeout(compassStaleTimerRef.current);
      }
      compassStaleTimerRef.current = setTimeout(() => {
        if (
          !compassLifecycle.isCurrent(listener) ||
          !compassLifecycle.isCurrentMotion(motionListener)
        ) return;
        compassStaleTimerRef.current = null;
        compassHeadingRef.current = null;
        motionOffsetRef.current = null;
        devicePoseRef.current = null;
        setDevicePose(null);
        setCompassHeading(null);
        setCompassState("STALE");
        compassQualityRef.current = "STALE";
        setCompassReason(
          "方向数据已暂时中断，请保持设备方向传感器可用",
        );
      }, 1500);
    };

    await compassLifecycle.start(listener, (error) => {
      if (compassStaleTimerRef.current) {
        clearTimeout(compassStaleTimerRef.current);
        compassStaleTimerRef.current = null;
      }
      if (motionStaleTimerRef.current) {
        clearTimeout(motionStaleTimerRef.current);
        motionStaleTimerRef.current = null;
      }
      lastCompassHeadingRef.current = null;
      compassHeadingRef.current = null;
      compassQualityRef.current = "UNAVAILABLE";
      devicePoseRef.current = null;
      motionOffsetRef.current = null;
      setDevicePose(null);
      setCompassHeading(null);
      const message =
        error instanceof Error
          ? error.message.toLowerCase()
          : error && typeof error === "object" && "errMsg" in error
            ? String((error as { errMsg?: unknown }).errMsg ?? "").toLowerCase()
            : String(error ?? "").toLowerCase();
      const permissionDenied =
        message.includes("auth") ||
        message.includes("permission") ||
        message.includes("deny") ||
        message.includes("authorize");
      setCompassState(permissionDenied ? "DENIED" : "UNAVAILABLE");
      compassQualityRef.current = permissionDenied ? "DENIED" : "UNAVAILABLE";
      setCompassReason(
        permissionDenied
          ? "未获得设备方向权限，天空图不会伪造 heading"
          : "设备没有可用的方向传感器，目标列表仍可用",
        null,
      );
    }, motionListener);
  }, [compassLifecycle]);

  useEffect(() => {
    if (compassTelemetry.sampledAt === null) return;
    const timer = setInterval(() => setCompassNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [compassTelemetry.sampledAt]);

  const hideCompass = useCallback(() => {
    // Backgrounding tears down native listeners, but preserves an explicit
    // user intent so the stream can be reacquired on foreground. Route exit
    // below clears this intent and therefore never restarts unexpectedly.
    compassResumeRef.current = compassLifecycle.active || compassState === "CALIBRATING";
    stopCompass();
  }, [compassLifecycle, compassState, stopCompass]);

  const showCompass = useCallback(() => {
    if (!compassResumeRef.current) return;
    compassResumeRef.current = false;
    void startCompass();
  }, [startCompass]);

  useDidHide(hideCompass);
  useDidShow(showCompass);

  useEffect(() => {
    return () => {
      compassResumeRef.current = false;
      stopCompass();
    };
  }, [stopCompass]);

  const draw = useCallback(() => {
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
                : 640;
            setCanvasSize((previous) =>
              previous.width === width && previous.height === height
                ? previous
                : { width, height },
            );
            const context = Taro.createCanvasContext(CANVAS_ID);
            const canvasData =
              report.data?.dataState === "EXPIRED" ||
              report.data?.dataState === "UNAVAILABLE" ||
              report.isError
                ? undefined
                : reportData;
            drawSkyScene(
              context,
              canvasData,
              sensorHeadingForScene,
              devicePose,
              width,
              height,
              mode,
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
  }, [
    mode,
    report.data?.dataState,
    report.isError,
    reportData,
    sensorHeadingForScene,
    devicePose,
  ]);

  useReady(draw);
  useEffect(() => {
    // Redraw on every report transition as well as time changes. Clearing the
    // canvas on error/expiry prevents a previous successful target projection
    // from remaining visible while the overlay truthfully reports failure.
    draw();
  }, [activeIndex, draw, reportData]);

  useEffect(() => {
    setPreviewIndex(null);
    setOrientationObjectListOpen(false);
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
      <View
        className={`${presentationClass} sky-orientation-page sky-orientation-state-page`}
        data-route="spot-night-context-loading"
        data-od-id="sky-orientation-route"
      >
        <View className="sky-orientation-state-page__canvas" aria-hidden="true" />
        <OrientationQuietBack
          onBack={() =>
            Taro.navigateBack().catch(() =>
              Taro.switchTab({ url: "/pages/map/index" }),
            )
          }
          label="返回地图"
        />
        <View className="sky-orientation-state-page__status">
          <StatusPanel
            state="LOADING"
            detail="正在恢复正式观星点、观测夜和已提交时刻。"
          />
        </View>
      </View>
    );

  if (!contextComplete || !activeContext)
    return (
      <View
        className={`${presentationClass} sky-orientation-page sky-orientation-state-page`}
        data-route="spot-night-context-error"
        data-od-id="sky-orientation-route"
      >
        <View className="sky-orientation-state-page__canvas" aria-hidden="true" />
        <OrientationQuietBack
          onBack={() => Taro.switchTab({ url: "/pages/map/index" })}
          label="返回地图"
        />
        <View className="sky-orientation-state-page__status">
          <ContextError
            onBack={() => Taro.switchTab({ url: "/pages/map/index" })}
          />
        </View>
      </View>
    );

  const spotName = overview.data?.data.spot.name ?? "此观星点";
  const compassIsReady =
    compassState === "READY" &&
    compassHeading !== null &&
    devicePose !== null &&
    motionOffsetRef.current !== null;
  // A compass can report before device-motion delivers its first pose. Keep
  // the internal compass state for callback compatibility, but present this
  // combined state as calibrating until both real streams are trustworthy.
  const orientationSensorState =
    compassState === "READY" && !compassIsReady ? "CALIBRATING" : compassState;
  const compassRecovery =
    orientationSensorState === "DENIED"
      ? {
          title: "方向权限未开启",
          detail: "开启后仅在本页前台读取设备方向；不会记录连续姿态轨迹。",
          action: "检查权限",
        }
      : orientationSensorState === "UNAVAILABLE"
        ? {
            title: "设备没有可用方向传感器",
            detail: "天空仍保留北向目标预览；当前不宣称手机方向，天体列表继续可用。",
            action: "重试方向",
          }
        : orientationSensorState === "STALE"
          ? {
              title: "方向数据暂时中断",
              detail: "天空暂停手机方向定位；重新连接后才恢复方向呈现。",
              action: "重新连接",
            }
          : orientationSensorState === "CALIBRATING"
            ? {
                title: "正在校准设备方向",
                detail: "保持手机平稳；可信方向到达前，天空保持北向预览。",
                action: "重新校准",
              }
            : orientationSensorState === "LOW_ACCURACY"
              ? {
                  title: "方向精度较低",
                  detail: "暂不显示当前方向结论；目标列表和北向预览仍可用。",
                  action: "重新校准",
                }
              : {
                title: "让天空图跟随手机方向",
                detail: "仅在本页前台读取设备方向，用于旋转当前天空投影。",
                action: "允许方向",
              };
  const recoverCompass = () => {
    if (orientationSensorState === "DENIED") {
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

  // `sky/detail` is a separate full-viewport surface. It intentionally does
  // not share the summary page header or vertical content stack: the canvas,
  // compact sensor telemetry, recovery and time ruler stay co-located so a
  // real device can be rotated without losing the selected formal spot/time.
  const orientationData =
    reportData &&
    !report.isError &&
    report.data?.dataState !== "EXPIRED" &&
    report.data?.dataState !== "UNAVAILABLE"
      ? reportData
      : undefined;
  const orientationTargets = orientationData?.targets ?? [];
  const orientationHeading = compassIsReady
    ? `${Math.round(sensorHeadingForScene ?? compassHeading ?? 0)}°`
    : "未提供";
  const visibleOrientationTargets = useMemo(
    () =>
      orientationTargets.flatMap((target) => {
        const projection = projectSkyTarget(
          target,
          sensorHeadingForScene,
          devicePose,
          canvasSize.width,
          canvasSize.height,
        );
        return projection ? [{ target, projection }] : [];
      }),
    [
      canvasSize.height,
      canvasSize.width,
      devicePose,
      orientationTargets,
      sensorHeadingForScene,
    ],
  );
  const orientationAccuracy = compassAccuracyLabel(compassTelemetry.accuracy);
  const orientationSampledAt = Math.max(
    compassTelemetry.sampledAt ?? 0,
    devicePose?.sampledAt ?? 0,
  );
  const orientationAge = compassAgeLabel(
    orientationSampledAt > 0 ? orientationSampledAt : null,
    compassNow,
  );
  const orientationSensorLabel = `设备方向，方位 ${orientationHeading}，精度 ${orientationAccuracy}，数据年龄 ${orientationAge}，${compassReason}`;
  const orientationDataStatus =
    report.isPending && !orientationData
      ? {
          state: "LOADING" as const,
          detail:
            "正在按正式观星点、观测夜和当前时刻加载天空数据；不会用当前位置或未经核验的结果顶替。",
        }
      : report.isError
        ? {
            state: "ERROR" as const,
            detail:
              "天空计算请求失败；正式点位与完整上下文仍保留，未静默显示成功或合成数据。",
          }
        : report.data?.dataState === "EXPIRED" ||
            report.data?.dataState === "UNAVAILABLE"
          ? {
              state: "ERROR" as const,
              detail:
                "当前天空数据不可用；不会用过期缓存或未经核验的结果替代今晚结论。",
            }
          : !reportData
            ? {
                state: "ERROR" as const,
                detail:
                  "返回结果与当前正式点位、日期或时区上下文不一致；为避免混用不同条件的结果，暂不展示。",
              }
            : null;
  const showOrientationObjectDisclosure =
    !compassIsReady ||
    orientationObjectListOpen ||
    Boolean(orientationDataStatus) ||
    Boolean(canvasError);

  return (
    <View
      className={`${presentationClass} sky-orientation-page`}
      data-route="sky/detail"
      data-spot-id={routeContext.spotId}
      data-od-id="sky-orientation-route"
    >
        <View
          className="sky-orientation-canvas"
          data-control="sky-orientation-canvas"
          data-od-id="sky-orientation-canvas"
          data-canvas-state={orientationDataStatus?.state ?? "READY"}
          role="img"
          aria-busy={orientationDataStatus?.state === "LOADING"}
          aria-label={`${spotName}的方位高度天空图，${orientationData ? `${orientationData.targets.length} 个真实目标` : "当前没有可证明天空结果"}，${compassIsReady ? "已使用实时设备姿态" : "未提供实时设备姿态，保持北向预览"}，当前观测时刻 ${rowTime}`}
        >
          <Canvas
            canvasId={CANVAS_ID}
            id={CANVAS_ID}
            className="sky-scene__canvas sky-orientation-canvas__surface"
            style={{ width: "100%", height: "100%" }}
            aria-label="方位天空投影；目标标记只来自当前正式点和观测上下文的结果"
          />
          {visibleOrientationTargets.map(({ target, projection }) => (
            <SkyOrientationTargetLabel
              key={target.targetId}
              target={target}
              projection={projection}
              width={canvasSize.width}
              height={canvasSize.height}
              timezone={routeContext.timezone}
            />
          ))}
          {canvasError ? (
            <View
              className="sky-orientation-canvas__error"
              role="alert"
              aria-live="assertive"
            >
              <Text>天空图暂不可绘制；对象列表和时间仍可访问。</Text>
              <SoftButton
                variant="ghost"
                className="sky-orientation-canvas__retry"
                label="重试天空图"
                onClick={draw}
              >
                重试
              </SoftButton>
            </View>
          ) : null}
          {orientationDataStatus ? (
            <View className="sky-orientation-data-status">
              <StatusPanel
                state={orientationDataStatus.state}
                detail={orientationDataStatus.detail}
                recoveryLabel={
                  orientationDataStatus.state === "ERROR"
                    ? "重试天空"
                    : undefined
                }
                onRecover={
                  orientationDataStatus.state === "ERROR"
                    ? () => void report.refetch()
                    : undefined
                }
              />
            </View>
          ) : null}
        </View>

        <View className="sky-orientation-notification" data-od-id="sky-orientation-notification">
          <NotificationRegion owner="spot-night" placement="inline" />
        </View>

        <OrientationQuietBack onBack={goBack} label="返回" />

        <View
          className={`sky-orientation-sensor sky-orientation-sensor--${orientationSensorState.toLowerCase()}`}
          data-control="sky-orientation-sensor"
          data-od-id="sky-orientation-sensor"
          data-sensor-state={orientationSensorState}
          role="status"
          aria-live="polite"
          aria-busy={orientationSensorState === "CALIBRATING"}
          aria-label={orientationSensorLabel}
        />

        {!compassIsReady ? (
          <View
            className="sky-orientation-recovery"
            data-control="sky-orientation-recovery"
            data-od-id="sky-orientation-recovery"
            role="group"
            aria-label={`${compassRecovery.title}。${compassRecovery.detail}`}
          >
            <View className="sky-orientation-recovery__icon" aria-hidden="true">
              <SemanticIcon name="compass" decorative />
            </View>
            <View className="sky-orientation-recovery__copy">
              <Text className="sky-orientation-recovery__title">
                {compassRecovery.title}
              </Text>
              <Text className="sky-orientation-recovery__detail">
                {compassRecovery.detail}
              </Text>
            </View>
            <View className="sky-orientation-recovery__actions">
              <SoftButton
                variant="primary"
                className="sky-orientation-recovery__primary"
                label={compassRecovery.action}
                disabled={orientationSensorState === "CALIBRATING"}
                onClick={recoverCompass}
              >
                {compassRecovery.action}
              </SoftButton>
            </View>
          </View>
        ) : null}

        {showOrientationObjectDisclosure ? (
          <View
            className="sky-orientation-object-toggle"
            data-od-id="sky-orientation-object-list-toggle"
          >
            <Button
              compileMode
              className="sky-orientation-object-toggle__button"
              ariaLabel={
                orientationObjectListOpen ? "收起对象列表" : "查看对象列表"
              }
              aria-pressed={orientationObjectListOpen ? "true" : "false"}
              onClick={() => setOrientationObjectListOpen((open) => !open)}
            >
              <SemanticIcon
                name={orientationObjectListOpen ? "chevron-up" : "chevron-down"}
                decorative
              />
              <Text>
                {orientationObjectListOpen ? "收起对象列表" : "查看对象列表"}
              </Text>
            </Button>
          </View>
        ) : null}

        {orientationObjectListOpen ? (
          <View
            className="sky-orientation-object-list"
            data-control="sky-orientation-object-list"
            data-od-id="sky-orientation-object-list"
            role="list"
            aria-label={`当前可访问天体对象列表，${orientationTargets.length} 个真实目标`}
          >
            <View className="sky-orientation-object-list__header">
              <View className="sky-orientation-object-list__heading">
                <Text className="sky-orientation-object-list__title">
                  对象列表
                </Text>
                <Text className="sky-orientation-object-list__meta">
                  {orientationData
                    ? "与当前正式点、观测夜和天空结果同步"
                    : "当前没有可证明的天空结果"}
                </Text>
              </View>
              <Text className="sky-orientation-object-list__count type-data">
                {orientationTargets.length} 个
              </Text>
            </View>
            {orientationData ? (
              orientationTargets.length ? (
                <ScrollView
                  scrollY
                  enhanced
                  showScrollbar={false}
                  className="sky-orientation-object-list__scroll"
                  aria-label="滚动查看真实观测对象"
                >
                  {orientationTargets.map((target) => (
                    <SkyTargetRow target={target} key={target.targetId} />
                  ))}
                </ScrollView>
              ) : (
                <StatusPanel
                  state="EMPTY"
                  detail="当前没有可证明目标；不会显示预设目标。"
                />
              )
            ) : (
              <StatusPanel
                state={orientationDataStatus?.state ?? "ERROR"}
                detail={
                  orientationDataStatus?.detail ??
                  "当前没有可证明的天空结果；正式点位和观测上下文仍保留。"
                }
                recoveryLabel="重试天空"
                onRecover={() => void report.refetch()}
              />
            )}
          </View>
        ) : null}

        <View
          className="sky-orientation-ruler-layer safe-bottom"
          data-od-id="sky-orientation-time-ruler-layer"
        >
          <OrientationTimeRuler
            rows={orientationData?.hourly ?? []}
            activeIndex={activeIndex}
            committedIndex={committedIndex}
            timezone={routeContext.timezone}
            isPreviewing={isPreviewing}
            saving={timeSaving}
            reducedMotion={reducedMotion}
            onPreview={onPreview}
            onCommit={(index) => void commitIndex(index)}
            onCancel={() => setPreviewIndex(null)}
          />
        </View>
      </View>
    );
}
