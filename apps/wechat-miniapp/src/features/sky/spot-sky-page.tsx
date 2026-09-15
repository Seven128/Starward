import { WeatherAlerts } from "@/components/weather-alerts";
import { WEATHER_ALERT_REFRESH_MS } from "@/components/weather-alert-state";
import { productSourceNames } from "@/utils/source-presentation";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, {
  useDidHide,
  useDidShow,
  useReady,
  useResize,
  useRouter,
} from "@tarojs/taro";
import { Button, Canvas, ScrollView, Text, View } from "@tarojs/components";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createSkyContextSession } from "./sky-context-session";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";
import { nativeNavigationInsets } from "@/theme/native-metrics";
import {
  type DisplayMode,
  type CelestialObjectInformation,
  type HourlySkyRow,
  type ObservationContext,
  type SkyReport,
} from "@starward/miniapp-contracts";
import { NotificationRegion } from "@/components/notification";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { ObservationDateControl } from "@/components/observation-date-control";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import {
  civilDateForInstant,
  instantForCivilDate,
  observationNightForInstant,
  observationDateOptions,
} from "@/components/observation-date";
import {
  calendarDateInTimezone,
  clockTimeInTimezone,
} from "@/utils/zoned-date";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  deepSkyImageUrl,
  getCelestialObjectInformation,
  getObservationContext,
  getSkyReport,
  getSpotOverview,
  updateObservationContext,
} from "@/services/api-client";
import {
  acquireAcceptanceSkySceneInspection,
  clearAcceptanceSkySceneInspection,
  publishAcceptanceSkySceneInspection,
  recordAcceptanceDiagnostic,
  type AcceptanceSkySceneInspectionOwner,
} from "@/services/acceptance-diagnostics";
import { useAppStore } from "@/state/app-store";
import { useSkyOrientation } from "./use-sky-orientation";
import {
  projectSkyDirection,
  type SkyViewBasis,
} from "./sky-view-projection";
import type { DeviceOrientationFrame } from "./device-orientation-view";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { createSkyCanvasLifecycle } from "./sky-canvas-lifecycle";
import {
  isUnambiguousTapGesture,
  pickPaintedSkyObjects,
  type PaintedSkyObject,
  type SkyPickSnapshot,
} from "./sky-object-picking";
import { deepSkyImageLevelForFov, pinchFieldOfView } from "./sky-zoom";
import {
  startDeepSkyImageRequest,
  type DeepSkyImageAsset,
} from "./deep-sky-image-request";
import "./spot-sky-page.scss";

const CANVAS_ID = "spot-night-sky-scene";
// Explicit angular view, independent of logical-pixel density. Physical
// apparent scale and platform pose conventions still require device feedback.
const SKY_VERTICAL_FOV_DEG = 45;

interface SkyCanvasFrame {
  orientationRevision: number;
  data: SkyReport | undefined;
  frameAt: string | undefined;
  heading: number | null;
  pose: DevicePose | null;
  manualBasis: SkyViewBasis | null;
  mode: DisplayMode;
  verticalFovDeg: number;
  deepSkyImage: SkyCanvasImageAsset | null;
  sceneReady: boolean;
  owner: AcceptanceSkySceneInspectionOwner | null;
  inspection: { spotId: string; frameAt: string; catalogVersion: string; starCount: number };
}

interface SkyCanvasImage {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
}

interface SkyCanvasNode {
  width: number;
  height: number;
  getContext(type: "2d"): CanvasRenderingContext2D | null;
  createImage(): SkyCanvasImage;
}

type SkyCanvasImageAsset = DeepSkyImageAsset & { image: SkyCanvasImage };

function canvasMeasurement(value: unknown) {
  return (Array.isArray(value) ? value[0] : value) as
    | { node?: SkyCanvasNode }
    | null;
}

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
  locationName: string;
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

type SkyTouchLike = {
  touches?: readonly { clientX?: number; clientY?: number; x?: number; y?: number }[];
  changedTouches?: readonly { clientX?: number; clientY?: number; x?: number; y?: number }[];
};

function skyTouchPoint(event: unknown, changed = false) {
  const candidate = event as SkyTouchLike;
  const touch = (changed ? candidate.changedTouches : candidate.touches)?.[0];
  const x = touch?.x ?? touch?.clientX;
  const y = touch?.y ?? touch?.clientY;
  return Number.isFinite(x) && Number.isFinite(y) ? { x: x!, y: y! } : null;
}

function skyTouchDistance(event: unknown) {
  const touches = (event as SkyTouchLike).touches;
  if (!touches || touches.length !== 2) return null;
  const [left, right] = touches;
  const leftX = left?.x ?? left?.clientX;
  const leftY = left?.y ?? left?.clientY;
  const rightX = right?.x ?? right?.clientX;
  const rightY = right?.y ?? right?.clientY;
  return [leftX, leftY, rightX, rightY].every(Number.isFinite)
    ? Math.hypot(rightX! - leftX!, rightY! - leftY!)
    : null;
}

function skyPickIdentity(data: SkyReport | undefined) {
  const star = data?.skyScene.catalog;
  const deep = data?.skyScene.deepSky?.catalog;
  return {
    catalogVersion: [star?.catalogVersion, deep?.catalogVersion].filter(Boolean).join("+"),
    catalogHash: [star?.catalogHash, deep?.catalogHash].filter(Boolean).join(":"),
  };
}

function validTimezone(value: string) {
  if (!value) return false;
  try {
    // Validate through the same formatter/fallback path used by the actual
    // observation-night calculation. Some Android WeChat runtimes accept an
    // IANA zone in Intl.DateTimeFormat but do not expose usable formatting
    // parts; treating that runtime limitation as an invalid route strands a
    // context that Map has already resolved successfully.
    observationNightForInstant("2026-01-01T12:00:00.000Z", value);
    return true;
  } catch {
    return false;
  }
}

function observationDateFor(selectedAt: string, timezone: string) {
  if (!isSelectedAt(selectedAt)) return "";
  try {
    return observationNightForInstant(selectedAt, timezone);
  } catch {
    return "";
  }
}

function formatTime(value: string | null | undefined, timezone: string) {
  if (!value) return "—";
  try {
    return clockTimeInTimezone(new Date(value), timezone);
  } catch {
    return "时间不可用";
  }
}

function formatSkyDate(value: string | null | undefined, timezone: string) {
  if (!value) return "日期不可用";
  try {
    const civil = calendarDateInTimezone(new Date(value), timezone);
    const [, month, day] = civil.split("-").map(Number);
    const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
      new Date(`${civil}T00:00:00Z`).getUTCDay()
    ];
    return `${String(month).padStart(2, "0")}月${String(day).padStart(2, "0")}日 ${weekday}`;
  } catch {
    return "日期不可用";
  }
}

function timezoneOffsetLabel(value: string | null | undefined, timezone: string) {
  if (!value) return timezone;
  try {
    const instant = new Date(value);
    const localDate = calendarDateInTimezone(instant, timezone);
    const localTime = clockTimeInTimezone(instant, timezone);
    const localAsUtc = Date.parse(`${localDate}T${localTime}:00Z`);
    const minutes = Math.round((localAsUtc - Date.parse(value)) / 60_000);
    const sign = minutes >= 0 ? "+" : "−";
    const absolute = Math.abs(minutes);
    const hours = Math.floor(absolute / 60);
    const remainder = absolute % 60;
    return `UTC${sign}${hours}${remainder ? `:${String(remainder).padStart(2, "0")}` : ""}`;
  } catch {
    return timezone;
  }
}

function SkyTargetRow({
  target,
  onSelect,
  className = "",
}: {
  target: SkyReport["targets"][number];
  onSelect: (target: SkyReport["targets"][number]) => void;
  className?: string;
}) {
  const altitude =
    target.altitudeDeg === null ? "高度未提供" : `${target.altitudeDeg}°`;
  const window = target.window
    ? `${target.window.start}—${target.window.end}`
    : "窗口不足";
  return (
    <Button
      className={`sky-target-row ${className}`}
      ariaLabel={`查看${target.displayName}信息，${TARGET_TYPE_LABEL[target.type]}，${target.direction}，${altitude}，${window}`}
      onClick={() => onSelect(target)}
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
    </Button>
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
  timezone,
  onSelect,
}: {
  target: SkyReport["targets"][number];
  projection: SkyTargetProjection;
  width: number;
  height: number;
  timezone: string;
  onSelect: (target: SkyReport["targets"][number]) => void;
}) {
  const altitude = `${projection.altitude}°`;
  const isEvent =
    target.type === "METEOR_SHOWER" ||
    target.type === "CONJUNCTION" ||
    target.type === "MILKY_WAY";
  const left = projection.x;
  const top = projection.y;
  const label = `${target.displayName}，${TARGET_TYPE_LABEL[target.type]}，${target.direction}，高度 ${altitude}，${skyTargetWindowLabel(target, timezone)}`;
  return (
    <Button
      className={`sky-orientation-target-label${isEvent ? " sky-orientation-target-label--event" : ""}`}
      style={{ left: `${left}px`, top: `${top}px` }}
      ariaLabel={`查看${label}`}
      data-target-id={target.targetId}
      onClick={() => onSelect(target)}
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
    </Button>
  );
}

function SkyOrientationCatalogLabel({
  object,
  onSelect,
}: {
  object: PaintedSkyObject;
  onSelect: (object: PaintedSkyObject) => void;
}) {
  const kindLabel = object.kind === "STAR" ? "恒星" : object.kind === "GALAXY" ? "星系" : "星云";
  const magnitudeLabel = object.magnitude === null ? "目录未提供V波段视星等" : `V 波段视星等 ${object.magnitude.toFixed(2)}`;
  return (
    <Button
      className="sky-orientation-catalog-label"
      style={{ left: `${object.x}px`, top: `${object.y}px` }}
      ariaLabel={`查看${object.displayName}，${kindLabel}，${object.reference.replace(":", " ")}，${magnitudeLabel}`}
      onClick={() => onSelect(object)}
    >
      <View className="sky-orientation-catalog-label__mark" aria-hidden="true" />
      <Text>{object.displayName}</Text>
    </Button>
  );
}

function SkyTargetInformation({
  target,
  spotName,
  selectedAt,
  timezone,
  onClose,
}: {
  target: SkyReport["targets"][number];
  spotName: string;
  selectedAt: string;
  timezone: string;
  onClose: () => void;
}) {
  const altitude = target.altitudeDeg === null ? "暂无数据" : `${target.altitudeDeg}°`;
  const source = productSourceNames([target.source]);
  return (
    <View className="sky-object-modal" data-control="sky-object-modal">
      <Button
        className="sky-object-modal__backdrop"
        ariaLabel="关闭天体信息"
        onClick={onClose}
      />
      <View
        className="liquid-glass-surface sky-object-modal__panel"
        data-material="liquid-glass"
        role="dialog"
        aria-label={`${target.displayName}天体信息`}
      >
        <View className="sky-object-modal__header">
          <View className="sky-object-modal__identity">
            <Text className="sky-object-modal__title">{target.displayName}</Text>
            <Text className="sky-object-modal__kind">{TARGET_TYPE_LABEL[target.type]}</Text>
          </View>
          <Button
            className="sky-object-modal__close"
            ariaLabel={`关闭${target.displayName}信息`}
            onClick={onClose}
          >
            <SemanticIcon name="close" decorative />
          </Button>
        </View>
        <ScrollView scrollY enhanced showScrollbar={false} className="sky-object-modal__body">
          <Text className="sky-object-modal__basic">当前仅收录可核验的基本资料</Text>
          <Text className="sky-object-modal__reason">{target.reason}</Text>
          <View className="sky-object-modal__facts">
            <View><Text>方位</Text><Text>{target.direction}</Text></View>
            <View><Text>仰角</Text><Text>{altitude}</Text></View>
          </View>
          <Text className="sky-object-modal__context">
            {spotName} · {formatSkyDate(selectedAt, timezone)} {formatTime(selectedAt, timezone)} · {timezoneOffsetLabel(selectedAt, timezone)}
          </Text>
          <Text className="sky-object-modal__limitation">
            方位与仰角属于上述地点和时刻；现场山体、建筑、云层与光害可能遮挡。
          </Text>
          {source ? <Text className="sky-object-modal__source">来源 · {source}</Text> : null}
        </ScrollView>
      </View>
    </View>
  );
}

function SkyCatalogInformation({
  reference,
  knownName,
  knownKind,
  onClose,
}: {
  reference: string;
  knownName: string;
  knownKind: PaintedSkyObject["kind"];
  onClose: () => void;
}) {
  const notify = useAppStore((state) => state.notify);
  const information = useResourceQuery({
    queryKey: ["celestial-object-information", reference, "zh-CN"],
    queryFn: (signal) => getCelestialObjectInformation(reference, signal),
    staleTime: 24 * 60 * 60 * 1_000,
  });
  const data: CelestialObjectInformation | undefined = information.data?.data;
  const title = data?.displayName ?? knownName;
  const resolvedKind = data?.kind ?? knownKind;
  const kindLabel = resolvedKind === "GALAXY" ? "星系" : resolvedKind === "NEBULA" ? "星云" : resolvedKind === "PLANET" ? "行星" : "恒星";
  const failed = information.isError || Boolean(information.refreshError) ||
    information.data?.dataState === "STALE_USABLE" || information.data?.dataState === "UNAVAILABLE";
  useEffect(() => {
    if (!failed) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info", title: "天体资料数据异常",
      body: `${title}的资料暂时无法完整读取，可在信息面板中重试。`, dedupeKey: `sky-object-information:${reference}` });
  }, [failed, notify, reference, title]);
  return (
    <View className="sky-object-modal" data-control="sky-object-modal" data-object-reference={reference}>
      <Button className="sky-object-modal__backdrop" ariaLabel="关闭天体信息" onClick={onClose} />
      <View className="liquid-glass-surface sky-object-modal__panel" data-material="liquid-glass" role="dialog" aria-label={`${title}天体信息`}>
        <View className="sky-object-modal__header">
          <View className="sky-object-modal__identity">
            <Text className="sky-object-modal__title">{title}</Text>
            <Text className="sky-object-modal__kind">{kindLabel} · {reference.replace(":", " ")}</Text>
          </View>
          <Button className="sky-object-modal__close" ariaLabel={`关闭${title}信息`} onClick={onClose}>
            <SemanticIcon name="close" decorative />
          </Button>
        </View>
        <ScrollView scrollY enhanced type="custom" showScrollbar={false} className="sky-object-modal__body">
          {information.isPending ? <StatusPanel state="LOADING" detail={`正在读取${title}的资料…`} /> : null}
          {information.isError ? (
            <StatusPanel state="EMPTY" detail={errorMessage(information.error)} recoveryLabel="重试资料" onRecover={() => void information.refetch()} />
          ) : null}
          {data ? (
            <>
              <Text className="sky-object-modal__basic">
                {data.contentState === "READY" ? "已收录可核验的中文介绍与目录资料" : "当前仅收录可核验的目录基本资料"}
              </Text>
              {data.introduction ? <Text className="sky-object-modal__reason">{data.introduction}</Text> : null}
              {data.aliases.length ? <Text className="sky-object-modal__aliases">{data.aliases.join(" · ")}</Text> : null}
              <View className="sky-object-modal__facts">
                {data.facts.map((fact) => (
                  <View key={fact.label}><Text>{fact.label}</Text><Text>{fact.value}{fact.unit ? ` ${fact.unit}` : ""}</Text></View>
                ))}
              </View>
              {data.limitations.map((limitation) => <Text className="sky-object-modal__limitation" key={limitation}>{limitation}</Text>)}
              {productSourceNames(data.sources) ? <Text className="sky-object-modal__source">
                来源 · {productSourceNames(data.sources)}
              </Text> : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
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

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

type CompassAccuracy = number | string | null;

type DevicePose = DeviceOrientationFrame;

interface SkyTargetProjection {
  x: number;
  y: number;
  degrees: number;
  altitude: number;
}

function projectHorizontalPoint(
  azimuthDeg: number,
  altitudeDeg: number,
  heading: number | null,
  pose: DevicePose | null,
  width: number,
  height: number,
  verticalFovDeg = SKY_VERTICAL_FOV_DEG,
  manualBasis: SkyViewBasis | null = null,
): SkyTargetProjection | null {
  const basis = manualBasis ?? pose?.basis ?? null;
  return basis
    ? projectSkyDirection(azimuthDeg, altitudeDeg, basis, width, height, verticalFovDeg)
    : null;
}

function projectSkyTarget(
  target: SkyReport["targets"][number],
  heading: number | null,
  pose: DevicePose | null,
  width: number,
  height: number,
  verticalFovDeg = SKY_VERTICAL_FOV_DEG,
  manualBasis: SkyViewBasis | null = null,
): SkyTargetProjection | null {
  const degrees = extractDegrees(target.direction);
  if (degrees === null || target.altitudeDeg === null) return null;
  // Stars and targets share the same perspective and live view basis.
  // No synthetic direction is introduced for missing/stale sensor data.
  return projectHorizontalPoint(
    degrees,
    target.altitudeDeg,
    heading,
    pose,
    width,
    height,
    verticalFovDeg,
    manualBasis,
  );
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
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const cancelInteraction = () => {
    const pending = interactingRef.current;
    interactingRef.current = false;
    setVisualIndex(safeCommittedIndex);
    setScrollLeft(safeCommittedIndex * orientationRulerStepPx());
    if (pending) cancelRef.current();
  };
  useDidHide(cancelInteraction);
  useEffect(() => () => {
    if (interactingRef.current) {
      interactingRef.current = false;
      cancelRef.current();
    }
  }, []);
  const rowIdentity = rows.map(row => row.at).join("|");
  useEffect(cancelInteraction, [committedIndex, rowIdentity, saving]);

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
        scrollX={!saving}
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
        onTouchStart={(event) => {
          if (saving || (event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) {
            cancelInteraction();
            return;
          }
          interactingRef.current = true;
        }}
        onTouchMove={(event) => {
          if ((event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) cancelInteraction();
        }}
        onTouchCancel={cancelInteraction}
        onScroll={(event) => {
          if (saving || !interactingRef.current) return;
          const nextScrollLeft = Number(event.detail.scrollLeft);
          if (Number.isFinite(nextScrollLeft)) {
            setPreviewFromScroll(nextScrollLeft);
          }
        }}
        onScrollEnd={(event) => {
          if (saving || !interactingRef.current) return;
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
                className={`sky-orientation-time-ruler__tick${isSelected ? " sky-orientation-time-ruler__tick--selected" : ""}${isEvent ? " sky-orientation-time-ruler__tick--event" : ""}`}
                style={{
                  transform: `translateY(${Math.round(distance * distance * 18)}rpx)`,
                }}
                ariaLabel={`${orientationRulerLabel(row, timezone, index)}${isSelected ? "，当前已选择" : "，选择此时刻"}`}
                disabled={saving}
                onClick={() => selectTick(index)}
              >
                <View className="sky-orientation-time-ruler__tick-mark" aria-hidden="true" />
                {(index % 4 === 0 && Math.abs(index - previewValue) >= 4) ? (
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
          className="sky-orientation-time-ruler__step"
          ariaLabel="更早一个真实观测时刻"
          disabled={saving || safeActiveIndex <= 0}
          onClick={() => stepTime(-1)}
        >
          更早一个时刻
        </Button>
        <Button
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
  context: CanvasRenderingContext2D,
  data: SkyReport | undefined,
  frameAt: string | undefined,
  heading: number | null,
  pose: DevicePose | null,
  width: number,
  height: number,
  mode: DisplayMode,
  painted?: (snapshot: SkyPickSnapshot | null) => void,
  completed?: () => void,
  verticalFovDeg = SKY_VERTICAL_FOV_DEG,
  deepSkyImage: SkyCanvasImageAsset | null = null,
  manualBasis: SkyViewBasis | null = null,
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
      : {
          // The adopted Cloud Stargazing surface is a deep sky in both
          // ordinary app modes. Observation alone swaps the whole surface to
          // the approved black and warm-red palette.
          canvas: "#080D17",
          grid: "#536782",
          gridSoft: "#29374B",
          text: "#DCE4EF",
          muted: "#7F90A8",
          target: "#AABCCA",
          event: "#CFC19A",
        };
  context.fillStyle = palette.canvas;
  context.fillRect(0, 0, width, height);
  const basis = manualBasis ?? pose?.basis ?? null;
  // Missing pose has no invented North-facing view. Recovery/list semantics
  // remain available outside this canvas until a trusted stream is present.
  if (!data || !basis) {
    painted?.(null);
    completed?.();
    return;
  }
  const paintedObjects: PaintedSkyObject[] = [];
  const project = (azimuth: number, altitude: number) =>
    projectSkyDirection(azimuth, altitude, basis, width, height, verticalFovDeg);
  const deepCatalog = data.skyScene.deepSky?.state === "AVAILABLE" ? data.skyScene.deepSky.catalog : null;
  const deepFrame = exactSkyTimeFrame(data.skyScene.deepSky?.frames, frameAt);
  if (deepSkyImage && deepCatalog && deepFrame?.state === "AVAILABLE" && deepFrame.points) {
    const imageIndex = deepCatalog.entries.findIndex((entry) => entry.objectRef === deepSkyImage.reference);
    const point = deepFrame.points.find((candidate) => candidate[0] === imageIndex);
    if (point) {
      const center = project(point[1], point[2]);
      const north = project(point[3], point[4]);
      const east = project(point[5], point[6]);
      if (center && north && east) {
        const scale = deepSkyImage.fieldDegrees / 0.1;
        context.save();
        context.globalAlpha = 0.58;
        // Published AllWISE W3 JPEGs are north-up/east-left. The two server-projected
        // tangent samples bind the bitmap to the same camera as stars.
        context.transform(
          -(east.x - center.x) * scale,
          -(east.y - center.y) * scale,
          -(north.x - center.x) * scale,
          -(north.y - center.y) * scale,
          center.x,
          center.y,
        );
        context.drawImage(deepSkyImage.image as CanvasImageSource, -0.5, -0.5, 1, 1);
        context.restore();
        context.globalAlpha = 1;
      }
    }
  }
  // The horizon is a world-space great circle, not fixed screen decoration.
  // Break paths at clipped samples so a hidden arc cannot cross the viewport.
  context.lineWidth = 1;
  for (const altitude of [0, 30, 60]) {
    context.strokeStyle = altitude === 0 ? palette.grid : palette.gridSoft;
    context.beginPath();
    let connected = false;
    for (let azimuth = 0; azimuth <= 360; azimuth += 1) {
      const point = project(azimuth, altitude);
      if (!point) { connected = false; continue; }
      if (connected) context.lineTo(point.x, point.y);
      else context.moveTo(point.x, point.y);
      connected = true;
    }
    context.stroke();
  }
  context.fillStyle = palette.text;
  context.font = "10px sans-serif";
  for (const [azimuth, label] of [[0, "北"], [90, "东"], [180, "南"], [270, "西"]] as const) {
    const point = project(azimuth, 0);
    if (point) context.fillText(label, point.x, point.y);
  }

  const catalog = data.skyScene.state === "AVAILABLE" ? data.skyScene.catalog : null;
  const frame = exactSkyTimeFrame(data.skyScene.frames, frameAt);
  if (catalog && frame?.state === "AVAILABLE" && frame.points) {
    frame.points.forEach((point) => {
      const [catalogIndex, azimuthDeg, altitudeDeg] = point;
      if (altitudeDeg <= 0) return;
      const entry = catalog.entries[catalogIndex];
      if (!entry) return;
      const projection = project(azimuthDeg, altitudeDeg);
      if (!projection) return;
      const brightness = Math.max(
        0,
        Math.min(1, (catalog.magnitudeLimit - entry.magnitude) / 7),
      );
      const radiusPx = 0.7 + brightness * 1.65;
      const starColor =
        mode === "OBSERVATION"
          ? palette.target
          : entry.colorIndex !== null && entry.colorIndex < 0.5
            ? "#D8E5FF"
            : entry.colorIndex !== null && entry.colorIndex > 1.5
              ? "#FFE6C6"
              : palette.text;
      context.globalAlpha = 0.52 + brightness * 0.48;
      context.fillStyle = starColor;
      context.beginPath();
      context.arc(projection.x, projection.y, radiusPx, 0, Math.PI * 2);
      context.fill();
      paintedObjects.push({
        reference: entry.objectRef,
        displayName: entry.displayName ?? entry.objectRef.replace(":", " "),
        kind: "STAR",
        magnitude: entry.magnitude,
        x: projection.x,
        y: projection.y,
      });
    });
    context.globalAlpha = 1;
  }

  if (deepCatalog && deepFrame?.state === "AVAILABLE" && deepFrame.points) {
    deepFrame.points.forEach(([catalogIndex, azimuthDeg, altitudeDeg]) => {
      if (altitudeDeg <= 0) return;
      const entry = deepCatalog.entries[catalogIndex];
      if (!entry) return;
      const projection = project(azimuthDeg, altitudeDeg);
      if (!projection) return;
      context.globalAlpha = 0.9;
      context.strokeStyle = mode === "OBSERVATION" ? palette.target : "#A9BDD6";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(projection.x, projection.y, 3.2, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
      paintedObjects.push({
        reference: entry.objectRef,
        displayName: entry.displayName,
        kind: entry.kind,
        magnitude: entry.magnitude,
        x: projection.x,
        y: projection.y,
      });
    });
  }

  const targetFrame = exactSkyTimeFrame(data.targetFrames, frameAt);
  (targetFrame?.targets ?? []).forEach((target) => {
    const projection = projectSkyTarget(target, heading, pose, width, height, verticalFovDeg, manualBasis);
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
    context.globalAlpha = 1;
    context.fillStyle = mark;
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
      context.strokeStyle = mark;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(projection.x - 8, projection.y);
      context.lineTo(projection.x + 8, projection.y);
      context.moveTo(projection.x, projection.y - 8);
      context.lineTo(projection.x, projection.y + 8);
      context.stroke();
    }
    context.globalAlpha = 1;
  });
  const identity = skyPickIdentity(data);
  painted?.(identity.catalogVersion && frameAt ? {
    catalogVersion: identity.catalogVersion,
    catalogHash: identity.catalogHash,
    frameAt,
    width,
    height,
    objects: paintedObjects,
  } : null);
  completed?.();
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
        state="EMPTY"
        detail="观测信息不完整，请返回地图选择观星点，再打开云观星。"
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
      className="sky-orientation-back-layer"
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
      locationName: safeParam(router.params.locationName || router.params.location_name),
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
      router.params.locationName,
      router.params.location_name,
      router.params.timezone,
    ],
  );
  const storedContext = useAppStore((state) => state.observationContext);
  const [pageVisible, setPageVisible] = useState(true);
  const contextSession = useMemo(
    () => createSkyContextSession(routeContext.contextId, () => useAppStore.getState()),
    [routeContext.contextId],
  );
  useEffect(() => {
    contextSession.show();
    return () => contextSession.hide();
  }, [contextSession]);
  useDidHide(() => {
    contextSession.hide();
    setPageVisible(false);
    setTimeSaving(false);
    setPreviewIndex(null);
  });
  useDidShow(() => {
    contextSession.show();
    setPageVisible(true);
  });
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const notify = useAppStore((state) => state.notify);
  const mode = useAppStore((state) => state.mode);
  const reducedMotion = useAppStore(
    (state) => state.preferences.reducedMotion,
  );
  const themeClass = useThemeClass();
  // Retain the selected app mode for ordinary controls and Observation's
  // red-only constraints; the sky stylesheet owns the adopted deep surface.
  const presentationClass = themeClass;
  const navigationInsets = useMemo(() => nativeNavigationInsets(), []);
  const skyLayoutStyle = {
    ...(navigationInsets.safeTop !== undefined ? { "--sky-controls-top": `${navigationInsets.safeTop}px` } : {}),
  } as CSSProperties;
  const contextLookupEnabled = pageVisible && contextSession.canLookup() &&
    routeContext.contextId.startsWith("ctx:") && storedContext?.contextId !== routeContext.contextId;
  const contextLookup = useResourceQuery({
    queryKey: ["observation-context", routeContext.contextId],
    queryFn: (signal) =>
      getObservationContext(routeContext.contextId, signal),
    enabled: contextLookupEnabled,
    staleTime: 30_000,
  });
  const activeContext: ObservationContext | null =
    storedContext?.contextId === contextSession.contextId
      ? storedContext
      : null;

  useEffect(() => {
    if (
      pageVisible && contextLookup.data?.data &&
      contextSession.acceptLookup(contextLookup.data.data)
    )
      setObservationContext(contextLookup.data.data);
  }, [
    contextLookup.data?.data,
    contextSession,
    pageVisible,
    setObservationContext,
    storedContext?.contextId,
  ]);

  const proposalRoute = routeContext.spotId.startsWith("contribution:");
  const contextLocationMatches = Boolean(activeContext && (
    (routeContext.spotId.startsWith("spot:") && activeContext.location.kind === "FORMAL_SPOT" && activeContext.location.spotId === routeContext.spotId) ||
    (proposalRoute && activeContext.location.kind === "MAP_POINT")
  ));
  const contextComplete = Boolean(
    (routeContext.spotId.startsWith("spot:") || proposalRoute) &&
    routeContext.contextId.startsWith("ctx:") &&
    isDate(routeContext.localDate) &&
    isSelectedAt(routeContext.selectedAt) &&
    validTimezone(routeContext.timezone) &&
    observationDateFor(routeContext.selectedAt, routeContext.timezone) ===
      routeContext.localDate &&
    Boolean(routeContext.dataRevision) &&
    activeContext &&
    activeContext.contextId === contextSession.contextId &&
    contextLocationMatches &&
    activeContext.timezone === routeContext.timezone &&
    (activeContext.revision > 1 ||
      (activeContext.localDate === routeContext.localDate &&
        Date.parse(activeContext.selectedAtUtc) ===
          Date.parse(routeContext.selectedAt))),
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
        activeContext?.contextId ?? routeContext.contextId,
        signal,
      ),
    enabled: pageVisible && contextComplete && !proposalRoute,
    staleTime: 30_000,
  });
  const report = useResourceQuery({
    queryKey: [
      "spot-sky",
      routeContext.spotId,
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
      activeContext?.localDate,
      routeContext.dataRevision,
    ],
    queryFn: (signal) =>
      getSkyReport(
        routeContext.spotId,
        activeContext?.contextId ?? routeContext.contextId,
        signal,
      ),
    enabled: pageVisible && contextComplete,
    staleTime: 0,
    refetchInterval: WEATHER_ALERT_REFRESH_MS,
  });
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [manualBasis, setManualBasis] = useState<SkyViewBasis | null>(null);
  const manualBasisRef = useRef<SkyViewBasis | null>(null);
  const [followRequested, setFollowRequested] = useState(false);
  const orientation = useSkyOrientation();
  const orientationController = orientation.controller;
  const { state: compassState, reason: compassReason, telemetry: compassTelemetry,
    pose: devicePose, alignment } = orientation.snapshot;
  const alignmentEditing = alignment.mode === "editing";
  const alignmentRequired = alignment.mode === "needs-alignment";
  const [compassNow, setCompassNow] = useState(() => Date.now());
  const startCompass = orientationController.start;
  const stopCompass = orientationController.stop;
  const compassLifecycle = orientationController;
  const canvasDrawRevisionRef = useRef(0);
  const paintedSkyObjectsRef = useRef<SkyPickSnapshot | null>(null);
  const canvasNodeRef = useRef<SkyCanvasNode | null>(null);
  const [canvasNodeRevision, setCanvasNodeRevision] = useState(0);
  const skySceneInspectionOwnerRef =
    useRef<AcceptanceSkySceneInspectionOwner | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasLifecycle = useMemo(() => createSkyCanvasLifecycle<SkyCanvasFrame, CanvasRenderingContext2D>({
    measure: done => {
      Taro.createSelectorQuery()
        .select(`#${CANVAS_ID}`)
        .fields({ node: true, size: true }, done)
        .exec();
    },
    createContext: (measurement, size) => {
      const node = canvasMeasurement(measurement)?.node;
      if (!node) throw new Error("sky_canvas_2d_node_unavailable");
      const pixelRatio = Math.max(1, Taro.getWindowInfo().pixelRatio || 1);
      node.width = Math.round(size.width * pixelRatio);
      node.height = Math.round(size.height * pixelRatio);
      const context = node.getContext("2d");
      if (!context) throw new Error("sky_canvas_2d_context_unavailable");
      context.scale(pixelRatio, pixelRatio);
      canvasNodeRef.current = node;
      setCanvasNodeRevision((revision) => revision + 1);
      return context;
    },
    paint: (context, frame, size, done) => {
      // A queued pre-calibration frame must not move the newly locked scene
      // while React's coalesced presentation is catching up with the control.
      const live = orientationController.snapshot();
      const locked = manualBasisRef.current === null &&
        (frame.orientationRevision !== live.presentationRevision ||
          live.alignment.mode === "editing" || live.alignment.mode === "needs-alignment");
      const basis = locked ? live.alignment.view : frame.manualBasis ?? frame.pose?.basis ?? null;
      drawSkyScene(context, frame.data, frame.frameAt, frame.heading, frame.pose,
        size.width, size.height, frame.mode,
        (snapshot) => {
          paintedSkyObjectsRef.current = snapshot;
          if (frame.sceneReady) orientation.presented.current = basis;
        }, done, frame.verticalFovDeg, frame.deepSkyImage, basis);
    },
    sameScene: (completed, latest) => completed.data === latest.data && completed.frameAt === latest.frameAt &&
      completed.mode === latest.mode && completed.verticalFovDeg === latest.verticalFovDeg &&
      completed.deepSkyImage?.tempFilePath === latest.deepSkyImage?.tempFilePath &&
      completed.owner === latest.owner && completed.inspection.spotId === latest.inspection.spotId,
    presented: (frame, size) => {
      setCanvasSize(previous => previous.width === size.width && previous.height === size.height ? previous : size);
      if (frame.sceneReady) {
        canvasDrawRevisionRef.current++;
      }
      publishAcceptanceSkySceneInspection(frame.owner, { ...frame.inspection, state: frame.sceneReady ? "READY" : "UNAVAILABLE", drawRevision: canvasDrawRevisionRef.current });
      setCanvasError(null);
    },
    invalidated: () => setCanvasSize(previous => previous.width === 0 && previous.height === 0 ? previous : { width: 0, height: 0 }),
    failed: (error, frame) => {
      if (frame) publishAcceptanceSkySceneInspection(frame.owner, { ...frame.inspection, state: "ERROR", drawRevision: canvasDrawRevisionRef.current });
      setCanvasError(error instanceof Error ? error.message : "canvas_unavailable");
    },
  }), []);
  const [timeSaving, setTimeSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [orientationObjectListOpen, setOrientationObjectListOpen] =
    useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedCatalogObject, setSelectedCatalogObject] = useState<PaintedSkyObject | null>(null);
  const [catalogPickChoices, setCatalogPickChoices] = useState<readonly PaintedSkyObject[]>([]);
  const [catalogListLimit, setCatalogListLimit] = useState(24);
  const [verticalFovDeg, setVerticalFovDeg] = useState(SKY_VERTICAL_FOV_DEG);
  const [deepSkyImageAsset, setDeepSkyImageAsset] = useState<DeepSkyImageAsset | null>(null);
  const [canvasDeepSkyImage, setCanvasDeepSkyImage] = useState<SkyCanvasImageAsset | null>(null);
  const [deepSkyImageState, setDeepSkyImageState] = useState<"IDLE" | "LOADING" | "READY" | "ERROR">("IDLE");
  const [focusedDeepSkyReference, setFocusedDeepSkyReference] = useState<string | null>(null);
  const [deepSkyImageRetry, setDeepSkyImageRetry] = useState(0);
  const skyTapRef = useRef<{
    startX: number;
    startY: number;
    travelPx: number;
    startedWithTouches: number;
    maximumTouches: number;
    cancelled: boolean;
    pinchStartDistance: number | null;
    pinchStartFov: number;
    startBasis: SkyViewBasis;
    dragged: boolean;
    edge: boolean;
    startedManual: boolean;
    startedFollowing: boolean;
    initialFov: number;
  } | null>(null);
  const cancelSkyGestureRef = useRef(() => { skyTapRef.current = null; });

  const data = report.data?.data;
  const contextMatches = Boolean(
    data &&
    activeContext &&
    data.context.contextId === activeContext.contextId &&
    data.context.contextFingerprint === activeContext.contextFingerprint &&
    data.context.contextRevision === activeContext.revision &&
    data.context.spotId === routeContext.spotId &&
    data.context.localDate === activeContext.localDate &&
    data.context.timezone === activeContext.timezone,
  );
  const reportData = contextMatches ? data : undefined;
  useEffect(() => {
    if (selectedCatalogObject)
      setFocusedDeepSkyReference(selectedCatalogObject.kind === "STAR" ? null : selectedCatalogObject.reference);
  }, [selectedCatalogObject]);
  const selectedDeepSkyEntry = focusedDeepSkyReference
    ? reportData?.skyScene.deepSky?.catalog?.entries.find((entry) => entry.objectRef === focusedDeepSkyReference) ?? null
    : null;
  const desiredDeepSkyImageLevel = selectedDeepSkyEntry && mode !== "OBSERVATION"
    ? deepSkyImageLevelForFov(verticalFovDeg)
    : null;
  useEffect(() => {
    if (!selectedDeepSkyEntry || !desiredDeepSkyImageLevel) {
      setDeepSkyImageAsset(null);
      setDeepSkyImageState("IDLE");
      return;
    }
    if (deepSkyImageAsset?.reference === selectedDeepSkyEntry.objectRef && deepSkyImageAsset.level === desiredDeepSkyImageLevel) {
      setDeepSkyImageState("READY");
      return;
    }
    if (deepSkyImageAsset && deepSkyImageAsset.reference !== selectedDeepSkyEntry.objectRef)
      setDeepSkyImageAsset(null);
    setDeepSkyImageState("LOADING");
    const diagnosticKey = `deep-sky-image:${selectedDeepSkyEntry.objectRef}:${desiredDeepSkyImageLevel}`;
    recordAcceptanceDiagnostic(diagnosticKey, "start", "request");
    const imagePath = `${Taro.env.USER_DATA_PATH}/deep-sky-${selectedDeepSkyEntry.objectRef.replace(":", "-")}-${desiredDeepSkyImageLevel}.jpg`;
    return startDeepSkyImageRequest({
      asset: {
        reference: selectedDeepSkyEntry.objectRef,
        level: desiredDeepSkyImageLevel,
        tempFilePath: imagePath,
      },
      url: deepSkyImageUrl(selectedDeepSkyEntry.objectRef, desiredDeepSkyImageLevel),
      request: (options) => Taro.request<ArrayBuffer>(options),
      writeFile: (options) => Taro.getFileSystemManager().writeFile(options),
      onReady: (asset) => {
        recordAcceptanceDiagnostic(diagnosticKey, "success", "ready");
        setDeepSkyImageAsset(asset);
        setDeepSkyImageState("READY");
      },
      onError: () => {
        recordAcceptanceDiagnostic(diagnosticKey, "failure", "request_or_write");
        setDeepSkyImageState("ERROR");
      },
      onCancel: () =>
        recordAcceptanceDiagnostic(diagnosticKey, "cancel", "superseded_or_unmounted"),
    });
  }, [deepSkyImageAsset, deepSkyImageRetry, desiredDeepSkyImageLevel, selectedDeepSkyEntry]);
  useEffect(() => {
    const node = canvasNodeRef.current;
    if (!deepSkyImageAsset || !node) {
      setCanvasDeepSkyImage(null);
      return;
    }
    let active = true;
    const image = node.createImage();
    image.onload = () => {
      if (active) setCanvasDeepSkyImage({ ...deepSkyImageAsset, image });
    };
    image.onerror = () => {
      if (!active) return;
      setCanvasDeepSkyImage(null);
      setDeepSkyImageState("ERROR");
    };
    image.src = deepSkyImageAsset.tempFilePath;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [canvasNodeRevision, deepSkyImageAsset]);
  useEffect(() => {
    if (deepSkyImageState !== "ERROR" || !selectedDeepSkyEntry) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info", title: "深空影像数据异常",
      body: `${selectedDeepSkyEntry.displayName}的巡天影像暂时无法读取，可在天空图中重试。`,
      dedupeKey: `deep-sky-image:${selectedDeepSkyEntry.objectRef}` });
  }, [deepSkyImageState, notify, selectedDeepSkyEntry]);
  const committedAt = activeContext?.selectedAtUtc ?? routeContext.selectedAt;
  const committedRow = exactSkyTimeFrame(reportData?.hourly, committedAt);
  const committedIndex = committedRow
    ? reportData!.hourly.indexOf(committedRow)
    : -1;
  const activeIndex = previewIndex ?? committedIndex;
  const row = exactSkyTimeFrame(
    reportData?.hourly,
    previewIndex === null ? committedAt : reportData?.hourly[previewIndex]?.at,
  );
  const isPreviewing = previewIndex !== null && previewIndex !== committedIndex;
  const rowTime = formatTime(row?.at ?? committedAt, routeContext.timezone);
  const presentedAt = row?.at ?? committedAt;
  const selectedCivilDate = civilDateForInstant(
    presentedAt,
    routeContext.timezone,
  );
  const dateOptions = useMemo(
    () => observationDateOptions(new Date(), routeContext.timezone),
    [routeContext.timezone],
  );
  const todayCivilDate = dateOptions[7] ?? selectedCivilDate;
  const sensorHeadingForScene = devicePose?.headingDeg ?? null;
  const sensorBasis = devicePose?.basis ?? null;
  const currentViewBasis = manualBasis ?? sensorBasis;
  useEffect(() => {
    if (followRequested && alignment.ready && sensorBasis) {
      manualBasisRef.current = null;
      setManualBasis(null);
      setFollowRequested(false);
    }
  }, [followRequested, alignment.ready, sensorBasis]);
  useEffect(() => {
    if (compassTelemetry.sampledAt === null && devicePose === null) return;
    const timer = setInterval(() => setCompassNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [compassTelemetry.sampledAt !== null, devicePose !== null]);
  const hideCompass = orientationController.hide;
  const showCompass = orientationController.show;
  const enterManualView = (basis: SkyViewBasis = currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW) => {
    if (orientationController.snapshot().alignment.mode === "editing") return;
    setFollowRequested(false);
    manualBasisRef.current = basis;
    setManualBasis(basis);
    orientationController.stopFollowing();
  };
  useEffect(() => () => canvasLifecycle.dispose(), [canvasLifecycle]);

  useEffect(() => {
    const owner = acquireAcceptanceSkySceneInspection();
    skySceneInspectionOwnerRef.current = owner;
    return () => {
      clearAcceptanceSkySceneInspection(owner);
      if (skySceneInspectionOwnerRef.current === owner) {
        skySceneInspectionOwnerRef.current = null;
      }
    };
  }, []);

  const canvasFrameInfo = useMemo(() => {
    const catalog = reportData?.skyScene.state === "AVAILABLE" ? reportData.skyScene.catalog : null;
    const frame = exactSkyTimeFrame(reportData?.skyScene.frames, row?.at);
    const targetFrame = exactSkyTimeFrame(reportData?.targetFrames, row?.at);
    return {
      catalog, frame, targetFrame,
      inspection: {
        spotId: routeContext.spotId,
        frameAt: frame?.at ?? "",
        catalogVersion: catalog?.catalogVersion ?? "",
        starCount: frame?.state === "AVAILABLE" && frame.points ? frame.points.filter(point => point[2] > 0).length : 0,
      },
    };
  }, [reportData, routeContext.spotId, row?.at]);
  const previousCanvasModeRef = useRef(mode);
  const draw = useCallback(() => {
    const owner = skySceneInspectionOwnerRef.current;
    const canvasData = report.data?.dataState === "EXPIRED" || report.data?.dataState === "UNAVAILABLE" || report.isError ? undefined : reportData;
    // Native refs clear synchronously on hide/denial, before React's next commit.
    const pose = devicePose;
    const heading = pose === null ? null : sensorHeadingForScene;
    const selectedManualBasis = manualBasisRef.current === null ? null : manualBasis;
    const sceneReady = Boolean((selectedManualBasis || pose?.basis) && canvasData?.skyScene.state === "AVAILABLE" &&
      canvasFrameInfo.catalog && canvasFrameInfo.targetFrame && canvasFrameInfo.frame?.state === "AVAILABLE" && canvasFrameInfo.frame.points);
    publishAcceptanceSkySceneInspection(owner, { ...canvasFrameInfo.inspection, state: "PENDING", drawRevision: canvasDrawRevisionRef.current });
    canvasLifecycle.request({ orientationRevision: orientation.snapshot.presentationRevision,
      data: canvasData, frameAt: row?.at, heading, pose, manualBasis: selectedManualBasis, mode,
      verticalFovDeg, deepSkyImage: mode === "OBSERVATION" ? null : canvasDeepSkyImage,
      sceneReady, owner, inspection: canvasFrameInfo.inspection },
      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode);
    previousCanvasModeRef.current = mode;
  }, [canvasLifecycle, canvasFrameInfo, mode, report.data?.dataState, report.isError, reportData, row?.at, sensorHeadingForScene, sensorBasis, devicePose, manualBasis, verticalFovDeg, canvasDeepSkyImage, orientation.snapshot.presentationRevision]);

  useReady(() => { canvasLifecycle.setMounted(Boolean(contextComplete && activeContext)); canvasLifecycle.ready(); draw(); });
  useResize(() => { canvasLifecycle.resize(); draw(); });
  useDidHide(() => { cancelSkyGestureRef.current(); canvasLifecycle.hide(); hideCompass(); });
  useDidShow(() => { canvasLifecycle.show(); showCompass(); draw(); });
  useEffect(() => {
    canvasLifecycle.setMounted(Boolean(contextComplete && activeContext));
    // Include every report transition: error/expiry submits a clear frame,
    // while the single native writer discards superseded completion callbacks.
    draw();
  }, [activeIndex, activeContext, contextComplete, canvasLifecycle, draw, reportData]);

  useEffect(() => {
    setPreviewIndex(null);
    setOrientationObjectListOpen(false);
  }, [committedAt, routeContext.localDate, routeContext.spotId]);
  useEffect(() => {
    cancelSkyGestureRef.current();
  }, [row?.at, canvasSize.width, canvasSize.height, mode, selectedCatalogObject, selectedTargetId, orientationObjectListOpen, datePickerOpen]);

  useEffect(() => {
    const dataState = report.data?.dataState;
    if (!contextComplete || !pageVisible || report.isFetching) return;
    const base = {
      owner: "spot-night",
      placement: "floating" as const,
    };
    if (report.isError || report.refreshError || dataState === "UNAVAILABLE" || dataState === "EXPIRED") {
      notify({
        ...base,
        tone: "info",
        title: "云观星数据异常",
        body: "网络恢复后可重试，观测地点与时刻已保留。",
        dedupeKey: `spot-night-unavailable:${routeContext.spotId}:${routeContext.localDate}`,
      });
    } else if (dataState === "STALE_USABLE") {
      notify({
        ...base,
        tone: "info",
        title: "云观星数据异常",
        body:
          report.data?.warnings.join(" ") ||
          "当前显示上次取得的资料，可在页面中重试。",
        dedupeKey: `spot-night-state:${routeContext.spotId}:${routeContext.localDate}:${dataState}`,
      });
    }
  }, [
    contextComplete,
    notify,
    report.data?.dataState,
    report.data?.warnings,
    report.isError,
    report.refreshError,
    report.isFetching,
    pageVisible,
    routeContext.localDate,
    routeContext.spotId,
  ]);

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
    if (orientationController.snapshot().alignment.mode === "editing" || !reportData?.hourly.length || !activeContext || timeSaving) return;
    const safeIndex = clampIndex(nextIndex, reportData.hourly.length);
    const nextRow = reportData.hourly[safeIndex];
    if (!nextRow) return;
    if (Date.parse(nextRow.at) === Date.parse(committedAt)) {
      setPreviewIndex(null);
      return;
    }
    const request = contextSession.begin(activeContext);
    if (!request) return;
    setTimeSaving(true);
    try {
      const response = await updateObservationContext(activeContext, {
        selectedAt: nextRow.at,
      });
      if (!contextSession.accept(request, response.data)) return;
      setObservationContext(response.data);
      setPreviewIndex(null);
    } catch (error) {
      if (!contextSession.isCurrent(request) || isMiniappRequestCancelled(error)) return;
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
      if (contextSession.finish(request)) setTimeSaving(false);
    }
  };

  const commitCivilDate = async (nextDate: string) => {
    if (orientationController.snapshot().alignment.mode === "editing" || !activeContext || timeSaving || nextDate === selectedCivilDate) return;
    const request = contextSession.begin(activeContext);
    if (!request) return;
    setPreviewIndex(null);
    setTimeSaving(true);
    try {
      const next = instantForCivilDate(
        nextDate,
        committedAt,
        activeContext.timezone,
      );
      const response = await updateObservationContext(activeContext, {
        localDate: next.localDate,
        selectedAt: next.selectedAt,
        eventInstanceId: null,
      });
      if (!contextSession.accept(request, response.data)) return;
      setObservationContext(response.data);
      setDatePickerOpen(false);
    } catch (error) {
      if (!contextSession.isCurrent(request) || isMiniappRequestCancelled(error)) return;
      notify({
        owner: "spot-night",
        placement: "inline",
        tone: "error",
        title: "观测日期未更新",
        body: errorMessage(error) + "。仍使用上一次已提交日期和时间。",
        dismissible: true,
        dedupeKey: "spot-night-date-update-failed",
      });
    } finally {
      if (contextSession.finish(request)) setTimeSaving(false);
    }
  };

  const onPreview = (value: number) => {
    if (orientationController.snapshot().alignment.mode === "editing") return;
    if (!reportData?.hourly.length) return;
    setPreviewIndex(clampIndex(value, reportData.hourly.length));
  };

  const goBack = () => {
    if (datePickerOpen) {
      setDatePickerOpen(false);
      return;
    }
    if (selectedCatalogObject) {
      setSelectedCatalogObject(null);
      return;
    }
    if (catalogPickChoices.length) {
      setCatalogPickChoices([]);
      return;
    }
    if (selectedTargetId) {
      setSelectedTargetId(null);
      return;
    }
    Taro.navigateBack().catch(() =>
      Taro.switchTab({ url: "/pages/map/index" }),
    );
  };

  if (!activeContext && contextLookupEnabled && contextLookup.isPending)
    return (
      <View
        className={`${presentationClass} sky-orientation-page sky-orientation-state-page`}
        style={skyLayoutStyle}
        data-route="spot-night-context-loading"
        data-od-id="sky-orientation-route"
      >
      <FloatingNotificationHost />
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
            detail="正在恢复观测地点与时刻。"
          />
        </View>
      </View>
    );

  if (!contextComplete || !activeContext)
    return (
      <View
        className={`${presentationClass} sky-orientation-page sky-orientation-state-page`}
        style={skyLayoutStyle}
        data-route="spot-night-context-error"
        data-od-id="sky-orientation-route"
      >
      <FloatingNotificationHost />
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

  const spotName = proposalRoute
    ? routeContext.locationName || "审核中观星点"
    : overview.data?.data.spot.name ?? "此观星点";
  const compassIsReady = alignment.ready && !alignmentRequired && devicePose !== null;
  const orientationSensorState = compassState;
  const compassRecovery =
    orientationSensorState === "DENIED"
      ? {
          title: "方向权限未开启",
          detail: "开启后仅在本页前台读取设备方向；不会记录连续姿态轨迹。",
          action: "检查权限",
        }
      : orientationSensorState === "UNAVAILABLE"
        ? {
            title: "设备方向暂不可用",
            detail: "方位投影暂不可用；天体列表与手动视角继续可用，可重试设备方向。",
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
                title: "正在读取设备方向",
                detail: compassReason,
                action: "正在连接",
              }
            : orientationSensorState === "LOW_ACCURACY"
              ? {
                  title: "方向精度较低",
                  detail: "天空仍跟随手机方向，但方位可能存在偏差；可重新校准。",
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
        .finally(() => { /* A new explicit tap retries after returning from settings. */ });
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
  const orientationTargetFrame = exactSkyTimeFrame(orientationData?.targetFrames, row?.at);
  const orientationTargets = orientationTargetFrame?.targets ?? [];
  const selectedTarget = selectedTargetId
    ? orientationTargets.find((target) => target.targetId === selectedTargetId) ?? null
    : null;
  const orientationHeading = compassIsReady && sensorHeadingForScene !== null
    ? `${Math.round(sensorHeadingForScene)}°`
    : "未提供";
  const visibleOrientationTargets = orientationTargets.flatMap((target) => {
    const projection = projectSkyTarget(
      target,
      sensorHeadingForScene,
      devicePose,
      canvasSize.width,
      canvasSize.height,
      verticalFovDeg,
      manualBasis,
    );
    return projection ? [{ target, projection }] : [];
  });
  const catalogFrameObjects = (() => {
    if (!orientationObjectListOpen) return [];
    const catalog = reportData?.skyScene.catalog;
    const frame = exactSkyTimeFrame(reportData?.skyScene.frames, row?.at);
    const stars: PaintedSkyObject[] = !catalog || frame?.state !== "AVAILABLE" || !frame.points ? [] : frame.points.flatMap(([catalogIndex]) => {
      const entry = catalog.entries[catalogIndex];
      return entry ? [{
        reference: entry.objectRef,
        displayName: entry.displayName ?? entry.objectRef.replace(":", " "),
        kind: "STAR" as const,
        magnitude: entry.magnitude,
        x: 0,
        y: 0,
      }] : [];
    });
    const deepCatalog = reportData?.skyScene.deepSky?.catalog;
    const deepFrame = exactSkyTimeFrame(reportData?.skyScene.deepSky?.frames, row?.at);
    const deep: PaintedSkyObject[] = !deepCatalog || deepFrame?.state !== "AVAILABLE" || !deepFrame.points ? [] : deepFrame.points.flatMap(([catalogIndex]) => {
      const entry = deepCatalog.entries[catalogIndex];
      return entry ? [{ reference: entry.objectRef, displayName: entry.displayName, kind: entry.kind,
        magnitude: entry.magnitude, x: 0, y: 0 }] : [];
    });
    return [...deep, ...stars].sort((left, right) =>
      Number(left.kind === "STAR") - Number(right.kind === "STAR") ||
      (left.magnitude ?? 99) - (right.magnitude ?? 99) ||
      left.reference.localeCompare(right.reference));
  })();
  const visibleNamedCatalogObjects = (() => {
    const catalog = reportData?.skyScene.catalog;
    const frame = exactSkyTimeFrame(reportData?.skyScene.frames, row?.at);
    if (!catalog || frame?.state !== "AVAILABLE" || !frame.points ||
      !currentViewBasis || canvasSize.width <= 0 || canvasSize.height <= 0)
      return [];
    const starCandidates: PaintedSkyObject[] = frame.points.flatMap(([catalogIndex, azimuth, altitude]) => {
      const entry = catalog.entries[catalogIndex];
      if (!entry?.displayName || entry.magnitude > 2.5) return [];
      const projection = projectHorizontalPoint(azimuth, altitude, sensorHeadingForScene, devicePose, canvasSize.width, canvasSize.height, verticalFovDeg, manualBasis);
      return projection ? [{ reference: entry.objectRef, displayName: entry.displayName, kind: "STAR" as const, magnitude: entry.magnitude, x: projection.x, y: projection.y }] : [];
    });
    const deepCatalog = reportData?.skyScene.deepSky?.catalog;
    const deepFrame = exactSkyTimeFrame(reportData?.skyScene.deepSky?.frames, row?.at);
    const deepCandidates: PaintedSkyObject[] = !deepCatalog || deepFrame?.state !== "AVAILABLE" || !deepFrame.points ? [] : deepFrame.points.flatMap(([catalogIndex, azimuth, altitude]) => {
      const entry = deepCatalog.entries[catalogIndex];
      const projection = entry ? projectHorizontalPoint(azimuth, altitude, sensorHeadingForScene, devicePose, canvasSize.width, canvasSize.height, verticalFovDeg, manualBasis) : null;
      return entry && projection ? [{ reference: entry.objectRef, displayName: entry.displayName, kind: entry.kind,
        magnitude: entry.magnitude, x: projection.x, y: projection.y }] : [];
    });
    const candidates = [...deepCandidates, ...starCandidates]
      .sort((left, right) => (left.magnitude ?? 99) - (right.magnitude ?? 99));
    const retained: PaintedSkyObject[] = [];
    for (const candidate of candidates) {
      if (retained.every((current) => Math.hypot(current.x - candidate.x, current.y - candidate.y) > 46))
        retained.push(candidate);
      if (retained.length === 8) break;
    }
    return retained;
  })();
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
  const activeSkySceneFrame = exactSkyTimeFrame(reportData?.skyScene.frames, row?.at);
  const orientationDataStatus =
    report.isPending && !orientationData
      ? {
          state: "LOADING" as const,
          detail:
            "正在加载所选地点与时刻的天空。",
        }
      : report.isError
        ? {
            state: "ERROR" as const,
            detail:
              "天空加载失败，请重试。观测地点与时刻已保留。",
          }
        : report.data?.dataState === "EXPIRED" ||
            report.data?.dataState === "UNAVAILABLE"
          ? {
              state: "ERROR" as const,
              detail:
                "天空数据暂不可用，请重新加载。",
            }
          : !reportData
            ? {
                state: "ERROR" as const,
                detail:
                  "天空数据与所选地点或时刻不一致，请重新加载。",
              }
            : !row || !orientationTargetFrame
              ? {
                  state: "ERROR" as const,
                  detail: "所选时刻暂无天空数据，请重新加载。",
                }
            : reportData.skyScene.state !== "AVAILABLE" ||
                !reportData.skyScene.catalog ||
                activeSkySceneFrame?.state !== "AVAILABLE" ||
                !activeSkySceneFrame.points
              ? {
                  state: "ERROR" as const,
                  detail:
                    "星图暂不可用，仍可在对象列表查看天体与事件。",
                }
            : null;
  const skySceneReady = Boolean(
    reportData?.skyScene.state === "AVAILABLE" &&
      reportData.skyScene.catalog &&
      orientationTargetFrame &&
      activeSkySceneFrame?.state === "AVAILABLE" &&
      activeSkySceneFrame.points,
  );
  const onSkyTouchStart = (event: unknown) => {
    if (orientationController.snapshot().alignment.mode === "editing" || !skySceneReady || selectedCatalogObject || selectedTargetId || orientationObjectListOpen || datePickerOpen || timeSaving) return;
    const point = skyTouchPoint(event);
    const count = (event as SkyTouchLike).touches?.length ?? 0;
    const pinchDistance = skyTouchDistance(event);
    if (skyTapRef.current) {
      skyTapRef.current.maximumTouches = Math.max(count, skyTapRef.current.maximumTouches);
      if (count > 2) { cancelSkyGestureRef.current(); return; }
      skyTapRef.current.pinchStartDistance = pinchDistance;
      skyTapRef.current.pinchStartFov = verticalFovDeg;
      return;
    }
    skyTapRef.current = point ? {
      startX: point.x,
      startY: point.y,
      travelPx: 0,
      startedWithTouches: count,
      maximumTouches: count,
      cancelled: false,
      pinchStartDistance: pinchDistance,
      pinchStartFov: verticalFovDeg,
      startBasis: currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW,
      dragged: false,
      edge: point.x < 16 || point.x > canvasSize.width - 16,
      startedManual: Boolean(manualBasis),
      startedFollowing: followRequested || (!manualBasis && (compassLifecycle.active || sensorBasis !== null)),
      initialFov: verticalFovDeg,
    } : null;
  };
  const onSkyTouchMove = (event: unknown) => {
    const gesture = skyTapRef.current;
    const point = skyTouchPoint(event);
    if (orientationController.snapshot().alignment.mode === "editing" || !gesture || !point || gesture.edge || gesture.cancelled) return;
    gesture.maximumTouches = Math.max(gesture.maximumTouches, (event as SkyTouchLike).touches?.length ?? 0);
    const pinchDistance = skyTouchDistance(event);
    if (pinchDistance !== null && gesture.pinchStartDistance === null) {
      gesture.pinchStartDistance = pinchDistance;
      gesture.pinchStartFov = verticalFovDeg;
    } else if (gesture.pinchStartDistance !== null && pinchDistance !== null) {
      setVerticalFovDeg(pinchFieldOfView(gesture.pinchStartFov, gesture.pinchStartDistance, pinchDistance));
    }
    gesture.travelPx = Math.max(gesture.travelPx, Math.hypot(point.x - gesture.startX, point.y - gesture.startY));
    if (gesture.maximumTouches === 1 && gesture.travelPx > 6) {
      const next = dragSkyView(gesture.startBasis, { x: gesture.startX, y: gesture.startY }, point,
        canvasSize.width, canvasSize.height, gesture.pinchStartFov);
      if (!gesture.dragged) { enterManualView(next); gesture.dragged = true; }
      else { manualBasisRef.current = next; setManualBasis(next); }
    }
  };
  const onSkyTouchCancel = () => {
    const gesture = skyTapRef.current;
    skyTapRef.current = null;
    if (!gesture) return;
    if (gesture.dragged) {
      const restored = gesture.startedManual || gesture.startedFollowing ? gesture.startBasis : null;
      manualBasisRef.current = restored;
      setManualBasis(restored);
      if (gesture.startedFollowing) {
        // Resume the original user intent only with a fresh usable pose.
        setFollowRequested(true);
        stopCompass();
        void startCompass();
      }
    }
    setVerticalFovDeg(gesture.initialFov);
  };
  cancelSkyGestureRef.current = onSkyTouchCancel;
  const onSkyTouchEnd = (event: unknown) => {
    if (orientationController.snapshot().alignment.mode === "editing" || (event as SkyTouchLike).touches?.length) return;
    const gesture = skyTapRef.current;
    skyTapRef.current = null;
    const point = skyTouchPoint(event, true);
    if (gesture && point) gesture.travelPx = Math.max(gesture.travelPx, Math.hypot(point.x - gesture.startX, point.y - gesture.startY));
    const identity = skyPickIdentity(reportData);
    if (!gesture || gesture.dragged || gesture.edge || !point || !row || !identity.catalogVersion || !isUnambiguousTapGesture(gesture)) return;
    const choices = pickPaintedSkyObjects(paintedSkyObjectsRef.current, {
      x: point.x,
      y: point.y,
      frameAt: row.at,
      catalogVersion: identity.catalogVersion,
      catalogHash: identity.catalogHash,
    });
    if (choices.length === 1) {
      setCatalogPickChoices([]);
      setSelectedTargetId(null);
      setSelectedCatalogObject(choices[0]!);
    } else if (choices.length > 1) {
      setCatalogPickChoices(choices);
    }
  };
  const skySceneStarCount =
    activeSkySceneFrame?.state === "AVAILABLE" && activeSkySceneFrame.points
      ? activeSkySceneFrame.points.filter((point) => point[2] > 0).length
      : 0;
  const skySceneAccessibleProvenance = skySceneReady
    ? `，场景时刻 ${activeSkySceneFrame?.at ?? "未知"}`
    : "";
  return (
    <View
      className={`${presentationClass} sky-orientation-page`}
      style={skyLayoutStyle}
      data-route="sky/detail"
      data-spot-id={routeContext.spotId}
      data-od-id="sky-orientation-route"
    >
      <FloatingNotificationHost />
      <NativeBackBoundary
        active={Boolean(selectedTargetId || selectedCatalogObject || catalogPickChoices.length)}
        onBack={goBack}
      />
        <View
          className="sky-orientation-canvas"
          data-control="sky-orientation-canvas"
          data-od-id="sky-orientation-canvas"
          data-canvas-state={orientationDataStatus?.state ?? "READY"}
          data-sky-scene-state={skySceneReady ? "READY" : "UNAVAILABLE"}
          data-sky-star-count={skySceneStarCount}
          data-sky-catalog-version={
            reportData?.skyScene.catalog?.catalogVersion ?? ""
          }
          data-sky-scene-frame-at={activeSkySceneFrame?.at ?? ""}
          role="img"
          aria-busy={orientationDataStatus?.state === "LOADING"}
          aria-label={`${spotName}的方位高度天空图，垂直视场 ${verticalFovDeg.toFixed(1)} 度，${skySceneReady ? `${skySceneStarCount} 颗真实亮星目录对象` : "真实星表场景不可用"}${skySceneAccessibleProvenance}，${orientationTargetFrame ? `${orientationTargets.length} 个真实目标` : "当前没有可证明天空结果"}，${manualBasis ? "手动视角，不代表手机朝向" : alignmentEditing ? "画面锁定，正在对齐" : alignmentRequired ? "方向参照中断，保留原视图" : compassIsReady ? "已使用实时设备姿态" : "当前设备姿态不可用，暂停方位投影"}，当前观测时刻 ${rowTime}`}
        >
          <Canvas
            type="2d"
            canvasId={CANVAS_ID}
            id={CANVAS_ID}
            className="sky-scene__canvas sky-orientation-canvas__surface"
            onTouchStart={onSkyTouchStart}
            onTouchMove={onSkyTouchMove}
            onTouchEnd={onSkyTouchEnd}
            onTouchCancel={onSkyTouchCancel}
            onError={() => canvasLifecycle.fail(new Error("sky_canvas_native_error"))}
            style={{ width: "100%", height: "100%", visibility: canvasError || canvasSize.width <= 0 || canvasSize.height <= 0 ? "hidden" : "visible" }}
            aria-label="方位天空投影；目录星与目标标记只来自当前正式点、真实时刻和服务端天文计算结果"
          />
          {verticalFovDeg < SKY_VERTICAL_FOV_DEG - 0.05 ? (
            <View className="sky-zoom-status" role="status" aria-live="polite">
              <Text>{verticalFovDeg.toFixed(1)}°</Text>
              {verticalFovDeg <= 1.5 ? <Text>已到当前最高分辨率</Text> : null}
            </View>
          ) : null}
          {selectedDeepSkyEntry && verticalFovDeg <= 15 ? (
            <View className="sky-image-status" role="status" aria-live="polite">
              {mode === "OBSERVATION" ? (
                <Text>红光模式已隐藏巡天影像</Text>
              ) : deepSkyImageState === "LOADING" ? (
                <Text>正在载入 {selectedDeepSkyEntry.displayName} 巡天影像…</Text>
              ) : deepSkyImageState === "ERROR" ? (
                <Button onClick={() => { setCanvasDeepSkyImage(null); setDeepSkyImageAsset(null); setDeepSkyImageRetry((value) => value + 1); }}>影像载入失败 · 重试</Button>
              ) : deepSkyImageAsset ? (
                <Text>NASA/IPAC IRSA · AllWISE W3 12 μm · 处理后红外影像</Text>
              ) : null}
            </View>
          ) : null}
          {visibleNamedCatalogObjects.map((object) => (
            <SkyOrientationCatalogLabel
              key={object.reference}
              object={object}
              onSelect={(selected) => {
                setSelectedTargetId(null);
                setSelectedCatalogObject(selected);
              }}
            />
          ))}
          {visibleOrientationTargets.map(({ target, projection }) => (
            <SkyOrientationTargetLabel
              key={target.targetId}
              target={target}
              projection={projection}
              width={canvasSize.width}
              height={canvasSize.height}
              timezone={routeContext.timezone}
              onSelect={(selected) => {
                setSelectedCatalogObject(null);
                setSelectedTargetId(selected.targetId);
              }}
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
          <ScrollView scrollY className="sky-weather-alerts" showScrollbar={false}>
            <WeatherAlerts evidence={reportData?.weatherEvidence} timezone={routeContext.timezone}
              active={pageVisible && contextComplete} refreshing={report.isFetching} scopeKey={routeContext.spotId}
              reportHandlesFailure={report.data?.dataState === "UNAVAILABLE" || report.data?.dataState === "EXPIRED"}
              refreshFailed={Boolean(report.refreshError) || report.data?.dataState === "STALE_USABLE"} onRecover={() => void report.refetch()} />
          </ScrollView>
        </View>

        <OrientationQuietBack onBack={goBack} label="返回" />
        <View className="sky-view-mode">
          {manualBasis ? <Text className="type-caption">手动视角</Text> : null}
          <Button disabled={alignmentEditing} className="sky-view-mode__button focus-ring" aria-label={followRequested ? "取消恢复手机跟随，保留手动视角" : manualBasis ? "恢复手机方向跟随" : "切换手动拖动模式"}
            onClick={() => {
              skyTapRef.current = null;
              if (!manualBasis || followRequested) enterManualView();
              else { setFollowRequested(true); recoverCompass(); }
            }}>{followRequested ? "取消跟随" : manualBasis ? "跟随手机" : "拖动模式"}</Button>
          {manualBasis && followRequested ? <Text className="sky-view-mode__status type-caption">{compassIsReady ? "正在恢复跟随" : `${compassRecovery.title}，保留手动视角`}</Text> : null}
          {!manualBasis && (alignment.ready || alignmentRequired || alignmentEditing) ? (
            alignmentEditing ? <>
              <Text className="sky-view-mode__status type-caption">画面已锁定。移动手机与真实星空对齐后确定。</Text>
              <Button className="sky-view-mode__button focus-ring" onClick={() => orientationController.cancel()}>取消</Button>
              <Button className="sky-view-mode__button focus-ring" disabled={!alignment.ready}
                onClick={() => orientationController.commit()}>确定</Button>
            </> : <>
              <Button className="sky-view-mode__button focus-ring"
                disabled={!alignment.ready || timeSaving || isPreviewing || datePickerOpen || !skySceneReady}
                onClick={() => { if (contextSession.busy) return; skyTapRef.current = null; orientationController.begin(); }}>重新校准</Button>
              {alignmentRequired ? <Text className="sky-view-mode__status type-caption">方向参照已中断，保留原视图，请重新校准。</Text> : null}
              {alignmentRequired && !alignment.ready ? <Button className="sky-view-mode__button focus-ring"
                onClick={recoverCompass}>重新连接</Button> : null}
            </>
          ) : null}
          {!manualBasis && orientationSensorState === "LOW_ACCURACY" ? <Text className="sky-view-mode__status type-caption">方向精度较低，方位可能存在偏差</Text> : null}
        </View>

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

        {(
          <View
            className="sky-orientation-object-toggle"
            data-od-id="sky-orientation-object-list-toggle"
          >
            <Button
              className="sky-orientation-object-toggle__button"
              ariaLabel={
                orientationObjectListOpen ? "对象列表已展开，收起对象列表" : "对象列表已收起，查看对象列表"
              }
              onClick={() => setOrientationObjectListOpen((open) => !open)}
            >
              <SemanticIcon
                name={orientationObjectListOpen ? "chevron-up" : "chevron-down"}
                decorative
              />
              <Text>
                {orientationObjectListOpen ? "收起列表" : "天体列表"}
              </Text>
            </Button>
          </View>
        )}

        {(!manualBasis && !alignmentRequired && !alignmentEditing && !compassIsReady) || orientationObjectListOpen ? (
        <ScrollView
          scrollY
          enhanced
          showScrollbar={false}
          className={`sky-orientation-details sky-orientation-details--${orientationObjectListOpen ? "list" : "recovery"}`}
          aria-label={orientationObjectListOpen ? "天体列表" : "方向状态"}
        >
        {!manualBasis && !alignmentRequired && !alignmentEditing && !compassIsReady && !orientationObjectListOpen ? (
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
              <SoftButton
                variant="ghost"
                className="sky-orientation-recovery__defer"
                label="使用手动拖动查看天空"
                onClick={() => enterManualView()}
              >
                手动查看
              </SoftButton>
            </View>
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
                    ? "所选地点与时刻的可见天体"
                    : "暂无可用的天空数据"}
                </Text>
              </View>
              <Text className="sky-orientation-object-list__count type-data">
                {orientationTargets.length} 个
              </Text>
            </View>
            {orientationData ? (
              orientationTargets.length ? (
                <View className="sky-orientation-object-list__scroll">
                  {orientationTargets.map((target) => (
                    <SkyTargetRow
                      target={target}
                      key={target.targetId}
                      onSelect={(selected) => {
                        setSelectedCatalogObject(null);
                        setSelectedTargetId(selected.targetId);
                      }}
                    />
                  ))}
                </View>
              ) : (
                <StatusPanel
                  state="EMPTY"
                  detail="所选时刻暂无可用天体。"
                />
              )
            ) : (
              <StatusPanel
                state={orientationDataStatus?.state ?? "ERROR"}
                detail={
                  orientationDataStatus?.detail ??
                  "天空数据暂不可用，观测地点与时刻已保留。"
                }
                recoveryLabel="重试天空"
                onRecover={() => void report.refetch()}
              />
            )}
            {catalogFrameObjects.length ? (
              <View className="sky-orientation-object-list__catalog" role="list" aria-label={`当前地平线上 ${catalogFrameObjects.length} 个目录天体`}>
                <Text className="sky-orientation-object-list__catalog-title">目录天体</Text>
                {catalogFrameObjects.slice(0, catalogListLimit).map((object) => (
                  <Button className="sky-catalog-row" key={object.reference} onClick={() => {
                    setSelectedTargetId(null);
                    setSelectedCatalogObject(object);
                  }}>
                    <Text>{object.displayName}</Text>
                    <Text>{object.kind === "STAR" ? "恒星" : object.kind === "GALAXY" ? "星系" : "星云"} · {object.reference.replace(":", " ")}{object.magnitude === null ? "" : ` · V ${object.magnitude.toFixed(2)}`}</Text>
                  </Button>
                ))}
                {catalogListLimit < catalogFrameObjects.length ? (
                  <Button className="sky-catalog-row__more" onClick={() => setCatalogListLimit((value) => Math.min(value + 24, catalogFrameObjects.length))}>
                    显示更多天体
                  </Button>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        </ScrollView>
        ) : null}

        {selectedTarget ? (
          <SkyTargetInformation
            target={selectedTarget}
            spotName={spotName}
            selectedAt={row?.at ?? committedAt}
            timezone={routeContext.timezone}
            onClose={() => setSelectedTargetId(null)}
          />
        ) : null}

        {catalogPickChoices.length > 1 ? (
          <View className="sky-object-choice" role="dialog" aria-label="选择重叠的天体">
            <Text className="sky-object-choice__title">选择天体</Text>
            {catalogPickChoices.map((choice) => (
              <Button key={choice.reference} className="sky-object-choice__row" onClick={() => {
                setSelectedTargetId(null);
                setSelectedCatalogObject(choice);
                setCatalogPickChoices([]);
              }}>
                <Text>{choice.displayName}</Text>
                <Text>{choice.kind === "STAR" ? "恒星" : choice.kind === "GALAXY" ? "星系" : "星云"} · {choice.reference.replace(":", " ")}{choice.magnitude === null ? "" : ` · V ${choice.magnitude.toFixed(2)}`}</Text>
              </Button>
            ))}
            <Button className="sky-object-choice__cancel" onClick={() => setCatalogPickChoices([])}>取消</Button>
          </View>
        ) : null}

        {selectedCatalogObject ? (
          <SkyCatalogInformation
            reference={selectedCatalogObject.reference}
            knownName={selectedCatalogObject.displayName}
            knownKind={selectedCatalogObject.kind}
            onClose={() => setSelectedCatalogObject(null)}
          />
        ) : null}

        <View
          className="sky-orientation-ruler-layer safe-bottom"
          data-od-id="sky-orientation-time-ruler-layer"
        >
          <View
            className="sky-orientation-context"
            role="status"
            aria-label={`当前选定地点${spotName}，${formatSkyDate(row?.at ?? committedAt, routeContext.timezone)} ${formatTime(row?.at ?? committedAt, routeContext.timezone)}，${timezoneOffsetLabel(row?.at ?? committedAt, routeContext.timezone)}`}
          >
            <Text className="sky-orientation-context__place">
              {spotName} · {timezoneOffsetLabel(row?.at ?? committedAt, routeContext.timezone)}
            </Text>
          </View>
          <ObservationDateControl
            dates={dateOptions}
            selectedDate={selectedCivilDate}
            today={todayCivilDate}
            open={datePickerOpen}
            busy={timeSaving || alignmentEditing}
            onOpenChange={(open) => {
              if (orientationController.snapshot().alignment.mode === "editing") return;
              if (open) setPreviewIndex(null);
              setDatePickerOpen(open);
            }}
            onSelect={(date) => void commitCivilDate(date)}
          />
          <OrientationTimeRuler
            rows={committedRow ? orientationData?.hourly ?? [] : []}
            activeIndex={activeIndex}
            committedIndex={committedIndex}
            timezone={routeContext.timezone}
            isPreviewing={isPreviewing}
            saving={timeSaving || alignmentEditing}
            reducedMotion={reducedMotion}
            onPreview={onPreview}
            onCommit={(index) => void commitIndex(index)}
            onCancel={() => setPreviewIndex(null)}
          />
        </View>
      </View>
    );
}
