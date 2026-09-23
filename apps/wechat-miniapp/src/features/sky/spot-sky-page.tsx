import { useSkyForecastQuery } from "@/hooks/use-forecast-query";
import { useCelestialInformation } from "@/hooks/use-celestial-information";
import { drawSkyScene, skyPickIdentity } from "./sky-scene-render";
import { projectHorizontalPoint, projectSkyTarget, type SkyTargetProjection } from "./sky-scene-projection";
import { createSkyGpuRenderer, type SkyGpuRenderer } from "./sky-gpu-renderer";
import { resolveConstellationFrame, type ConstellationFrame } from "./sky-constellation-scene";
import { artworkIntersectsView, constellationVisibility } from "./sky-constellation-visibility";
import { useSkyArtwork } from "./use-sky-artwork";
import {useSkyStellarSupplement} from './use-sky-stellar-supplement';
import type {SkyStellarSupplementFrame} from './sky-stellar-supplement-scene';
import {skyStarAppearance} from './sky-star-appearance';
import { Provenance } from "@/components/provenance";
import { createRulerScrollPosition } from "@/components/ruler-scroll-position";
import { createScrollSettlement } from "@/components/scroll-settlement";
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
  CONSTELLATION_CATALOG_VERSION,
  type DisplayMode,
  type CelestialObjectInformation,
  type HourlySkyRow,
  type ObservationContext,
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
  getObservationContext,
  getSkyReport,
  getStellarCatalog,
  getConstellationCatalog,
  constellationAssetUrl,
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
import { selectNotification } from "@/state/notification";
import { useSkyOrientation } from "./use-sky-orientation";
import {
  type SkyViewBasis,
} from "./sky-view-projection";
import type { DeviceOrientationFrame } from "./device-orientation-view";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view";
import { attachSkyCatalog, resolveSkySceneFrame, skySceneHasContent, type ResolvedSkyReport as SkyReport } from "./sky-stellar-scene";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { createSkyCanvasLifecycle } from "./sky-canvas-lifecycle";
import {
  isUnambiguousTapGesture,
  pickPaintedSkyObjects,
  skyObjectMagnitudeLabel,
  type PaintedSkyObject,
  type SkyPickSnapshot,
} from "./sky-object-picking";
import { clampSkyFieldOfView, deepSkyImageLevelForFov, pinchFieldOfView, remapSkyFieldOfView, skyDomeProgress, SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import { NO_SKY_INSETS, skyInsetsFromControls, skyViewportCenter, type SkyProjectionCenter, type SkyScreenRect, type SkyViewportInsets } from "./sky-viewport";
import {
  startDeepSkyImageRequest,
  type OwnedDeepSkyImageAsset,
} from "./deep-sky-image-request";
import "./spot-sky-page.scss";

const CANVAS_ID = "spot-night-sky-scene";
// Explicit angular view, independent of logical-pixel density. Physical
// apparent scale and platform pose conventions still require device feedback.
const SKY_VERTICAL_FOV_DEG = SKY_OBSERVING_VERTICAL_FOV_DEG;

interface SkyCanvasFrame {
  nativeImageGeneration: number;
  orientationRevision: number;
  data: SkyReport | undefined;
  frameAt: string | undefined;
  heading: number | null;
  pose: DevicePose | null;
  manualBasis: SkyViewBasis | null;
  mode: DisplayMode;
  verticalFovDeg: number;
  deepSkyImage: SkyCanvasImageAsset | null;
  constellations: ConstellationFrame | null;
  constellationImages: ReadonlyMap<string, object>;
  constellationsEnabled: boolean;
  stellarSupplement:SkyStellarSupplementFrame|null;
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
  getContext(type: "webgl"): WebGLRenderingContext | null;
  createImage(): SkyCanvasImage;
}

type SkyCanvasImageAsset = OwnedDeepSkyImageAsset & { image: SkyCanvasImage; canvasGeneration: number };
const EMPTY_SKY_IMAGES: ReadonlyMap<string, object> = new Map();

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
) {
  return target.window
    ? `窗口 ${target.window.start}—${target.window.end}`
    : "窗口不足";
}

function SkyOrientationTargetLabel({
  target,
  projection,
  width,
  onSelect,
  disabled,
}: {
  target: SkyReport["targets"][number];
  projection: SkyTargetProjection;
  width: number;
  height: number;
  timezone: string;
  onSelect: (target: SkyReport["targets"][number]) => void;
  disabled: boolean;
}) {
  const altitude = `${projection.altitude}°`;
  const isEvent =
    target.type === "METEOR_SHOWER" ||
    target.type === "CONJUNCTION" ||
    target.type === "MILKY_WAY";
  const left = projection.x;
  const top = projection.y;
  const label = `${target.displayName}，${TARGET_TYPE_LABEL[target.type]}，${target.direction}，高度 ${altitude}，${skyTargetWindowLabel(target)}`;
  return (
    <Button
      className={`sky-orientation-target-label${isEvent ? " sky-orientation-target-label--event" : ""}${left > width / 2 ? " sky-orientation-target-label--left" : ""}`}
      style={{ left: `${left}px`, top: `${top}px` }}
      ariaLabel={`查看${label}`}
      data-target-id={target.targetId}
      disabled={disabled}
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
      </View>
    </Button>
  );
}

function SkyOrientationCatalogLabel({
  object,
  onSelect,
  disabled,
}: {
  object: PaintedSkyObject;
  onSelect: (object: PaintedSkyObject) => void;
  disabled: boolean;
}) {
  const kindLabel = object.kind === "STAR" ? "恒星" : object.kind === "GALAXY" ? "星系" : "星云";
  const magnitudeLabel = skyObjectMagnitudeLabel(object);
  return (
    <Button
      className="sky-orientation-catalog-label"
      style={{ left: `${object.x}px`, top: `${object.y}px` }}
      ariaLabel={`查看${object.displayName}，${kindLabel}，${object.reference.replace(":", " ")}，${magnitudeLabel}`}
      disabled={disabled}
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
  const openingSources = useRef(false);
  const notify = useAppStore((state) => state.notify);
  const information = useCelestialInformation(reference);
  const openSources = async () => {
    if (openingSources.current) return;
    openingSources.current = true;
    try {
      await Taro.navigateTo({ url: `/sky/sources/index?reference=${encodeURIComponent(reference)}` });
    } catch {
      notify({ owner: "spot-night", placement: "floating", tone: "info",
        title: "来源页面未能打开", body: "请重试。", dedupeKey: "sky-source-navigation" });
    } finally { openingSources.current = false; }
  };
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
            <StatusPanel state="ERROR" detail={errorMessage(information.error)} recoveryLabel="重试资料" onRecover={() => void information.refetch()} />
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
              {productSourceNames(data.sources) ? <SoftButton
                label="查看天体资料来源与许可"
                onClick={() => void openSources()}>
                来源与许可
              </SoftButton> : null}
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

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

type CompassAccuracy = number | string | null;

type DevicePose = DeviceOrientationFrame;

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
  interactionLocked = false,
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
  interactionLocked?: boolean;
  reducedMotion: boolean;
  onPreview: (index: number) => void;
  onCommit: (index: number) => void;
  onCancel: () => void;
}) {
  const interactionDisabled = saving || interactionLocked;
  const safeActiveIndex = clampIndex(activeIndex, rows.length);
  const safeCommittedIndex = clampIndex(committedIndex, rows.length);
  const [visualIndex, setVisualIndex] = useState(safeActiveIndex);
  const [scrollLeft, setScrollLeft] = useState(
    safeActiveIndex * orientationRulerStepPx(),
  );
  const settleCallback = useRef<(offset: number) => void>(() => {});
  const settlementRef = useRef<ReturnType<typeof createScrollSettlement> | null>(null);
  if (!settlementRef.current) settlementRef.current = createScrollSettlement(offset => settleCallback.current(offset));
  const settlement = settlementRef.current;
  const nativePosition = useRef(createRulerScrollPosition("sky-orientation-time-ruler-scroll")).current;
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const cancelInteraction = () => {
    const pending = settlement.active;
    settlement.cancel();
    setVisualIndex(safeCommittedIndex);
    setScrollLeft(safeCommittedIndex * orientationRulerStepPx());
    nativePosition.move(safeCommittedIndex * orientationRulerStepPx());
    if (pending) cancelRef.current();
  };
  useDidHide(() => { cancelInteraction(); nativePosition.cancel(); });
  useDidShow(() => nativePosition.move(safeCommittedIndex * orientationRulerStepPx()));
  useEffect(() => () => {
    nativePosition.cancel();
    if (settlement.active) {
      settlement.cancel();
      cancelRef.current();
    }
  }, []);
  const rowIdentity = rows.map(row => row.at).join("|");
  useEffect(cancelInteraction, [committedIndex, rowIdentity, interactionDisabled]);

  useEffect(() => {
    if (settlement.active) return;
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
      nativePosition.move(nextIndex * step);
      settlement.cancel();
      onCommit(nextIndex);
    },
    [onCommit, setPreviewFromScroll, step, settlement, nativePosition],
  );
  settleCallback.current = offset => {
    if (!interactionDisabled) settle(offset);
  };
  const selectTick = useCallback(
    (nextIndex: number) => {
      const safeIndex = clampIndex(nextIndex, rows.length);
      settlement.cancel();
      setVisualIndex(safeIndex);
      setScrollLeft(safeIndex * step);
      nativePosition.move(safeIndex * step);
      onPreview(safeIndex);
      onCommit(safeIndex);
    },
    [onCommit, onPreview, rows.length, step, settlement, nativePosition],
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
        scrollX={!interactionDisabled}
        enhanced
        fastDeceleration
        showScrollbar={false}
        scrollLeft={scrollLeft}
        scrollWithAnimation={!reducedMotion}
        className="sky-orientation-time-ruler__viewport"
        id="sky-orientation-time-ruler-scroll"
        data-od-id="sky-orientation-time-ruler-scroll"
        aria-label="拖动选择真实观测时刻"
        aria-valuemin={0}
        aria-valuemax={maxIndex}
        aria-valuenow={previewValue}
        aria-valuetext={orientationRulerLabel(rows[previewValue], timezone, previewValue)}
        onTouchStart={(event) => {
          if (interactionDisabled || (event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) {
            cancelInteraction();
            return;
          }
          nativePosition.cancel();
          settlement.begin();
        }}
        onTouchMove={(event) => {
          if ((event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) cancelInteraction();
        }}
        onTouchEnd={() => settlement.release()}
        onDragEnd={() => settlement.release()}
        onTouchCancel={cancelInteraction}
        onScroll={(event) => {
          if (interactionDisabled || !settlement.active) return;
          const nextScrollLeft = Number(event.detail.scrollLeft);
          if (Number.isFinite(nextScrollLeft)) {
            settlement.update(nextScrollLeft);
            setPreviewFromScroll(nextScrollLeft);
          }
        }}
        onScrollEnd={() => {
          if (interactionDisabled || !settlement.active) return;
          settlement.end();
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
                disabled={interactionDisabled}
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
          disabled={interactionDisabled || safeActiveIndex <= 0}
          onClick={() => stepTime(-1)}
        >
          更早一个时刻
        </Button>
        <Button
          className="sky-orientation-time-ruler__step"
          ariaLabel="更晚一个真实观测时刻"
          disabled={interactionDisabled || safeActiveIndex >= maxIndex}
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
          disabled={interactionDisabled}
          onClick={() => {
            settlement.cancel();
            setVisualIndex(safeCommittedIndex);
            setScrollLeft(safeCommittedIndex * step);
            nativePosition.move(safeCommittedIndex * step);
            onCancel();
          }}
        >
          取消预览
        </SoftButton>
      ) : null}
    </View>
  );
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
  const report = useSkyForecastQuery({
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
  const browsingCamera = useMemo(() => createSkyBrowsingCamera(), []);
  const [presentedCamera, setPresentedCamera] = useState<{ basis: SkyViewBasis | null; fov: number; center: SkyProjectionCenter } | null>(null);
  const [viewportInsets, setViewportInsets] = useState<SkyViewportInsets>(NO_SKY_INSETS);
  const viewportInsetsRef = useRef(viewportInsets);
  viewportInsetsRef.current = viewportInsets;
  const viewportMeasurementRevision = useRef(0);
  const viewportActiveRef = useRef(true);
  const viewportMountedRef = useRef(true);
  const skyInlineNotice = useAppStore(state => selectNotification(state.notifications, "inline", "spot-night").current);
  const skyInlineNoticeResidual = useAppStore(state => selectNotification(state.notifications, "inline", "spot-night").residualCount);
  const previousViewportRef = useRef<{ width: number; height: number; insets: SkyViewportInsets } | null>(null);
  const browsingDrawRef = useRef(() => {});
  const browsingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomRef = useRef(SKY_VERTICAL_FOV_DEG);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const stopBrowsingAnimation = useCallback(() => {
    if (browsingTimerRef.current !== null) clearTimeout(browsingTimerRef.current);
    browsingTimerRef.current = null;
    browsingCamera.suspend();
  }, [browsingCamera]);
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
  const canvasGenerationRef = useRef(0);
  const [canvasNodeRevision, setCanvasNodeRevision] = useState(0);
  const [constellationsEnabled, setConstellationsEnabled] = useState(true);
  const [constellationSourcesOpen, setConstellationSourcesOpen] = useState(false);
  const [supplementSourcesOpen,setSupplementSourcesOpen]=useState(false);
  const artworkFailureRef = useRef<(image: object) => void>(() => {});
  const [controlsBottomReserve, setControlsBottomReserve] = useState<number | null>(null);
  const measureBottomControls = useCallback(() => {
    if (!viewportActiveRef.current || !viewportMountedRef.current) return;
    const revision = ++viewportMeasurementRevision.current;
    Taro.nextTick(() => {
      if (!viewportActiveRef.current || !viewportMountedRef.current || revision !== viewportMeasurementRevision.current) return;
      Taro.createSelectorQuery()
        .select("#sky-bottom-controls").boundingClientRect()
        .select(".sky-orientation-back-layer").boundingClientRect()
        .select(".sky-orientation-notification").boundingClientRect()
        .select(`#${CANVAS_ID}`).boundingClientRect()
        .select(".sky-control-panel").boundingClientRect()
        .exec(results => {
        if (!viewportActiveRef.current || !viewportMountedRef.current || revision !== viewportMeasurementRevision.current) return;
        const [dock, back, notification, canvas, panel] = results as (SkyScreenRect | null)[];
        const bottom = panel && dock && panel.top < dock.top ? panel : dock;
        if (bottom && Number.isFinite(bottom.top)) {
          const reserve = Math.max(0, Taro.getWindowInfo().windowHeight - bottom.top + 8);
          setControlsBottomReserve(previous => previous === reserve ? previous : reserve);
        }
        if (canvas && bottom && back) {
          const nativeBottom = navigationInsets.capsuleBottom ?? navigationInsets.safeTop ?? 0;
          const insets = skyInsetsFromControls(canvas, [back, ...(notification ? [notification] : []),
            { top: 0, bottom: nativeBottom, height: nativeBottom }], bottom);
          if (insets) setViewportInsets(previous => previous.top === insets.top && previous.bottom === insets.bottom ? previous : insets);
        }
      });
    });
  }, []);
  const skySceneInspectionOwnerRef =
    useRef<AcceptanceSkySceneInspectionOwner | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasLifecycle = useMemo(() => createSkyCanvasLifecycle<SkyCanvasFrame, SkyGpuRenderer>({
    measure: done => {
      Taro.createSelectorQuery()
        .select(`#${CANVAS_ID}`)
        .fields({ node: true, size: true }, done)
        .exec();
    },
    createContext: (measurement, size) => {
      const node = canvasMeasurement(measurement)?.node;
      if (!node) throw new Error("sky_canvas_webgl_node_unavailable");
      const pixelRatio = Math.max(1, Taro.getWindowInfo().pixelRatio || 1);
      node.width = Math.round(size.width * pixelRatio);
      node.height = Math.round(size.height * pixelRatio);
      const gl = node.getContext("webgl");
      if (!gl) throw new Error("sky_canvas_webgl_context_unavailable");
      const context = createSkyGpuRenderer(gl, pixelRatio);
      canvasNodeRef.current = node;
      setCanvasNodeRevision(++canvasGenerationRef.current);
      return context;
    },
    releaseContext: context => {
      canvasNodeRef.current = null;
      canvasGenerationRef.current++;
      context.dispose();
    },
    paint: (context, frame, size, done) => {
      // A queued pre-calibration frame must not move the newly locked scene
      // while React's coalesced presentation is catching up with the control.
      const live = orientation.latestPresentation.current ?? orientationController.snapshot();
      const locked = manualBasisRef.current === null &&
        (frame.orientationRevision !== live.presentationRevision ||
          live.alignment.mode === "editing" || live.alignment.mode === "needs-alignment");
      const inputBasis = locked ? live.alignment.view : manualBasisRef.current ?? frame.pose?.basis ?? null;
      // Entering calibration changes scale and freezes the last presented direction
      // atomically; an already queued wide frame cannot repaint at the old scale.
      const insets = viewportInsetsRef.current;
      const fov = live.alignment.mode === "editing" ? SKY_VERTICAL_FOV_DEG : clampSkyFieldOfView(zoomRef.current, size.width, size.height, insets);
      const progress = skyDomeProgress(fov, size.width, size.height, insets);
      const center = skyViewportCenter(size.width, size.height, progress, insets);
      const camera = browsingCamera.update({ localView: inputBasis,
        intent: live.alignment.mode === "editing" ? "locked" : manualBasisRef.current ? "manual" : live.alignment.mode === "needs-alignment" ? "locked" : "follow",
        progress, at: Date.now(), reducedMotion: reducedMotionRef.current });
      const basis = camera.view;
      drawSkyScene(context, frame.data, frame.frameAt, frame.heading, frame.pose,
        size.width, size.height, frame.mode,
        (snapshot) => {
          paintedSkyObjectsRef.current = snapshot;
          if (frame.sceneReady) orientation.presented.current = basis;
          setPresentedCamera(previous => previous?.basis === basis && previous.fov === fov && previous.center.x === center.x && previous.center.y === center.y ? previous : { basis, fov, center });
          if (camera.animating && browsingTimerRef.current === null) {
            browsingTimerRef.current = setTimeout(() => { browsingTimerRef.current = null; browsingDrawRef.current(); }, 16);
          }
        }, done, fov, frame.deepSkyImage?.canvasGeneration === canvasGenerationRef.current ? frame.deepSkyImage : null, basis, center, asset => {
          deepSkyImageFailureRef.current = `deep-sky-image:${asset.reference}:${asset.level}`;
          setDeepSkyImageState("ERROR");
        }, { frame: frame.constellations, images: frame.nativeImageGeneration === canvasGenerationRef.current ? frame.constellationImages : EMPTY_SKY_IMAGES,
          enabled: frame.constellationsEnabled, failed: image => artworkFailureRef.current(image) },frame.stellarSupplement);
    },
    sameScene: (completed, latest) => completed.data === latest.data && completed.frameAt === latest.frameAt &&
      completed.mode === latest.mode && completed.verticalFovDeg === latest.verticalFovDeg &&
      completed.nativeImageGeneration === latest.nativeImageGeneration && completed.deepSkyImage?.image === latest.deepSkyImage?.image &&
      completed.constellations === latest.constellations && completed.constellationImages === latest.constellationImages &&
      completed.constellationsEnabled === latest.constellationsEnabled &&
      completed.stellarSupplement === latest.stellarSupplement &&
      completed.owner === latest.owner && completed.inspection.spotId === latest.inspection.spotId,
    presented: (frame, size) => {
      setCanvasSize(previous => previous.width === size.width && previous.height === size.height ? previous : size);
      if (frame.sceneReady) {
        canvasDrawRevisionRef.current++;
      }
      publishAcceptanceSkySceneInspection(frame.owner, { ...frame.inspection, state: frame.sceneReady ? "READY" : "UNAVAILABLE", drawRevision: canvasDrawRevisionRef.current });
      setCanvasError(null);
    },
    invalidated: () => {
      paintedSkyObjectsRef.current = null;
      setCanvasSize(previous => previous.width === 0 && previous.height === 0 ? previous : { width: 0, height: 0 });
    },
    failed: (error, frame) => {
      if (frame) publishAcceptanceSkySceneInspection(frame.owner, { ...frame.inspection, state: "ERROR", drawRevision: canvasDrawRevisionRef.current });
      setCanvasError(error instanceof Error ? error.message : "canvas_unavailable");
    },
  }), []);
  const [timeSaving, setTimeSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [orientationObjectListOpen, setOrientationObjectListOpen] =
    useState(false);
  const [skyControlPanel, setSkyControlPanel] = useState<"calibration" | "time" | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedCatalogObject, setSelectedCatalogObject] = useState<PaintedSkyObject | null>(null);
  const [catalogPickChoices, setCatalogPickChoices] = useState<readonly PaintedSkyObject[]>([]);
  const [catalogListLimit, setCatalogListLimit] = useState(24);
  const [verticalFovDeg, setVerticalFovState] = useState(SKY_VERTICAL_FOV_DEG);
  const setVerticalFovDeg = useCallback((value: number | ((previous: number) => number)) => {
    const next = typeof value === "function" ? value(zoomRef.current) : value;
    zoomRef.current = next;
    setVerticalFovState(next);
  }, []);
  const [deepSkyImageAsset, storeDeepSkyImageAsset] = useState<OwnedDeepSkyImageAsset | null>(null);
  const [canvasDeepSkyImage, storeCanvasDeepSkyImage] = useState<SkyCanvasImageAsset | null>(null);
  const deepSkyImageFileRef = useRef<OwnedDeepSkyImageAsset | null>(null);
  const canvasDeepSkyImageRef = useRef<SkyCanvasImageAsset | null>(null);
  // The requested file and last successfully decoded image can differ while a
  // finer level fails. Keep both files until neither role needs them for recovery.
  const setDeepSkyImageAsset = useCallback((next: OwnedDeepSkyImageAsset | null) => {
    const previous = deepSkyImageFileRef.current;
    deepSkyImageFileRef.current = next;
    storeDeepSkyImageAsset(next);
    if (previous && previous.tempFilePath !== next?.tempFilePath && previous.tempFilePath !== canvasDeepSkyImageRef.current?.tempFilePath) previous.release();
  }, []);
  const setCanvasDeepSkyImage = useCallback((value: SkyCanvasImageAsset | null | ((previous: SkyCanvasImageAsset | null) => SkyCanvasImageAsset | null)) => {
    const previous = canvasDeepSkyImageRef.current;
    const next = typeof value === "function" ? value(previous) : value;
    canvasDeepSkyImageRef.current = next;
    storeCanvasDeepSkyImage(next);
    if (previous && previous.tempFilePath !== next?.tempFilePath && previous.tempFilePath !== deepSkyImageFileRef.current?.tempFilePath) previous.release();
  }, []);
  useEffect(() => () => {
    deepSkyImageFileRef.current?.release();
    canvasDeepSkyImageRef.current?.release();
    deepSkyImageFileRef.current = null;
    canvasDeepSkyImageRef.current = null;
  }, []);
  const [deepSkyImageState, setDeepSkyImageState] = useState<"IDLE" | "LOADING" | "READY" | "ERROR">("IDLE");
  const deepSkyImageFailureRef = useRef<string | null>(null);
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
    pinchStartBasis: SkyViewBasis;
    startBasis: SkyViewBasis;
    dragged: boolean;
    edge: boolean;
    startedManual: boolean;
    startedFollowing: boolean;
    initialFov: number;
    cameraCheckpoint: ReturnType<typeof browsingCamera.checkpoint>;
    originalManualBasis: SkyViewBasis | null;
    startCenter: SkyProjectionCenter;
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
  const rawReportData = contextMatches ? data : undefined;
  const stellarReference = rawReportData?.skyScene.state === "AVAILABLE" ? rawReportData.skyScene.catalog : null;
  const stellarCatalog = useResourceQuery({
    queryKey: ["stellar-catalog", stellarReference?.catalogVersion, stellarReference?.catalogHash],
    queryFn: signal => getStellarCatalog(stellarReference!, signal),
    enabled: pageVisible && Boolean(stellarReference),
    staleTime: Infinity,
  });
  const reportData = useMemo(() => rawReportData ? attachSkyCatalog(rawReportData, stellarCatalog.data?.data) : undefined,
    [rawReportData, stellarCatalog.data?.data]);
  const constellationCatalog = useResourceQuery({
    queryKey: ["constellation-catalog", CONSTELLATION_CATALOG_VERSION], queryFn: signal => getConstellationCatalog(signal),
    enabled: pageVisible && Boolean(stellarReference) && constellationsEnabled, staleTime: Infinity,
  });
  useEffect(() => {
    if (!pageVisible || !stellarReference || stellarCatalog.isFetching ||
      !(stellarCatalog.isError || stellarCatalog.refreshError || stellarCatalog.data?.dataState === "STALE_USABLE")) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info", title: "星图资料加载异常",
      body: stellarCatalog.data ? "当前保留已取得的星图资料，可重新加载。" : "网络恢复后可重试，天体与天气资料仍可查看。",
      dedupeKey: `stellar-catalog:${stellarReference.catalogVersion}:${stellarReference.catalogHash}` });
  }, [pageVisible, stellarReference?.catalogVersion, stellarReference?.catalogHash, stellarCatalog.isFetching,
    stellarCatalog.isError, stellarCatalog.refreshError, stellarCatalog.data?.dataState, notify]);
  const retrySkyData = () => {
    void report.refetch();
    if (stellarReference) void stellarCatalog.refetch();
  };
  useEffect(() => {
    if (selectedCatalogObject)
      setFocusedDeepSkyReference(selectedCatalogObject.kind === "STAR" ? null : selectedCatalogObject.reference);
  }, [selectedCatalogObject]);
  const selectedDeepSkyEntry = focusedDeepSkyReference
    ? reportData?.skyScene.deepSky?.catalog?.entries.find((entry) => entry.objectRef === focusedDeepSkyReference) ?? null
    : null;
  const deepSkyRegistrationReady = reportData?.skyScene.deepSky?.catalog?.imageRegistration === "ICRS_TAN_NORTH_0_1_V1";
  const desiredDeepSkyImageLevel = selectedDeepSkyEntry && deepSkyRegistrationReady && mode !== "OBSERVATION"
    ? deepSkyImageLevelForFov(verticalFovDeg)
    : null;
  useEffect(() => {
    if (!pageVisible) return;
    deepSkyImageFailureRef.current = null;
    if (!selectedDeepSkyEntry || !desiredDeepSkyImageLevel) {
      setDeepSkyImageAsset(null);
      setDeepSkyImageState("IDLE");
      return;
    }
    if (deepSkyImageAsset?.reference === selectedDeepSkyEntry.objectRef && deepSkyImageAsset.level === desiredDeepSkyImageLevel) {
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
      removeFile: (filePath) => { Taro.getFileSystemManager().unlink({ filePath, fail: () => undefined }); },
      onReady: (asset) => {
        recordAcceptanceDiagnostic(diagnosticKey, "success", "ready");
        setDeepSkyImageAsset(asset);
      },
      onError: () => {
        recordAcceptanceDiagnostic(diagnosticKey, "failure", "request_or_write");
        deepSkyImageFailureRef.current = diagnosticKey;
        setDeepSkyImageState("ERROR");
      },
      onCancel: () =>
        recordAcceptanceDiagnostic(diagnosticKey, "cancel", "superseded_or_unmounted"),
    });
  }, [pageVisible, deepSkyImageAsset, deepSkyImageRetry, desiredDeepSkyImageLevel, selectedDeepSkyEntry]);
  useEffect(() => {
    if (!pageVisible) return;
    const node = canvasNodeRef.current;
    if (!selectedDeepSkyEntry || !desiredDeepSkyImageLevel) {
      setCanvasDeepSkyImage(null);
      return;
    }
    // Retain this object's decoded coarse image while the finer file loads or
    // retries. An image for a different selected object must never survive.
    setCanvasDeepSkyImage(previous => previous?.reference === selectedDeepSkyEntry.objectRef ? previous : null);
    // Show can precede native-node reconstruction. Keep the owned recovery file
    // through that gap; the generation fence already rejects its old image.
    if (!node) return;
    let active = true;
    let preferredReady = false;
    const generation = canvasNodeRevision;
    const images: SkyCanvasImage[] = [];
    const decode = (asset: OwnedDeepSkyImageAsset, preferred: boolean) => {
      const current = () => active && canvasNodeRef.current === node && canvasGenerationRef.current === generation;
      const failed = () => {
        if (!current() || !preferred) return;
        deepSkyImageFailureRef.current = `deep-sky-image:${asset.reference}:${asset.level}`;
        setDeepSkyImageState("ERROR");
      };
      let created: SkyCanvasImage | undefined;
      try {
        const image = node.createImage();
        created = image;
        images.push(image);
        image.onload = () => {
          if (!current() || (!preferred && preferredReady)) return;
          if (preferred) preferredReady = true;
          setCanvasDeepSkyImage({ ...asset, image, canvasGeneration: generation });
          if (preferred) setDeepSkyImageState("READY");
        };
        image.onerror = failed;
        image.src = asset.tempFilePath;
      } catch {
        if (created) { created.onload = null; created.onerror = null; }
        failed();
      }
    };
    const retained = canvasDeepSkyImageRef.current;
    // A decoded object never crosses native canvas generations. Re-decode its
    // still-owned coarse file while the requested finer level recovers.
    if (retained && retained.canvasGeneration !== generation && retained.tempFilePath !== deepSkyImageAsset?.tempFilePath) decode(retained, false);
    if (deepSkyImageAsset?.reference === selectedDeepSkyEntry.objectRef && deepSkyImageAsset.level === desiredDeepSkyImageLevel) {
      deepSkyImageFailureRef.current = null;
      setDeepSkyImageState("LOADING");
      decode(deepSkyImageAsset, true);
    } else if (retained && retained.canvasGeneration !== generation && retained.tempFilePath === deepSkyImageAsset?.tempFilePath) decode(retained, false);
    return () => {
      active = false;
      for (const image of images) { image.onload = null; image.onerror = null; }
    };
  }, [pageVisible, canvasNodeRevision, deepSkyImageAsset, selectedDeepSkyEntry, desiredDeepSkyImageLevel]);
  useEffect(() => {
    if (!pageVisible || deepSkyImageState !== "ERROR" || !selectedDeepSkyEntry || !desiredDeepSkyImageLevel ||
      deepSkyImageFailureRef.current !== `deep-sky-image:${selectedDeepSkyEntry.objectRef}:${desiredDeepSkyImageLevel}`) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info", title: "深空影像数据异常",
      body: `${selectedDeepSkyEntry.displayName}的巡天影像暂时无法读取，可在天空图中重试。`,
      dedupeKey: `deep-sky-image:${selectedDeepSkyEntry.objectRef}` });
  }, [pageVisible, deepSkyImageState, notify, selectedDeepSkyEntry, desiredDeepSkyImageLevel]);
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
  const currentViewBasis = presentedCamera?.basis ?? manualBasis ?? sensorBasis;
  const presentedFov = presentedCamera?.fov ?? verticalFovDeg;
  const presentedCenter = presentedCamera?.center ?? skyViewportCenter(canvasSize.width, canvasSize.height, 0);
  const stellarSupplement=useSkyStellarSupplement(reportData?.skyScene,row?.at,currentViewBasis?{
    basis:currentViewBasis,width:canvasSize.width,height:canvasSize.height,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    pageVisible&&Boolean(rawReportData)&&report.data?.dataState!=='EXPIRED'&&report.data?.dataState!=='UNAVAILABLE'&&!report.isError);
  useEffect(()=>{
    if(!stellarSupplement.failed)return;
    notify({owner:'spot-night',placement:'floating',tone:'info',title:'暗星资料加载异常',
      body:'可重试加载，已取得的亮星与天体资料仍可查看。',dedupeKey:'sky-stellar-supplement'});
  },[stellarSupplement.failed,notify]);
  const constellationFrame = useMemo(() => resolveConstellationFrame(constellationCatalog.data?.data,rawReportData?.skyScene,row?.at),
    [constellationCatalog.data?.data,rawReportData?.skyScene,row?.at]);
  const visibleFigures = constellationFrame && currentViewBasis && constellationVisibility(presentedFov,constellationsEnabled)>0
    ? constellationFrame.images.filter(figure => artworkIntersectsView(figure.registration,
      {basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter},canvasSize.width,canvasSize.height)).map(figure=>figure.source) : [];
  const artwork = useSkyArtwork(canvasNodeRef.current,canvasNodeRevision,constellationCatalog.data?.data.catalogHash,
    pageVisible && Boolean(rawReportData) && report.data?.dataState !== "EXPIRED" && report.data?.dataState !== "UNAVAILABLE" && !report.isError,visibleFigures);
  artworkFailureRef.current=artwork.failedImage;
  const constellationFailed = constellationsEnabled && (artwork.failed || constellationCatalog.isError || Boolean(constellationCatalog.refreshError) || constellationCatalog.data?.dataState === "STALE_USABLE");
  useEffect(() => {
    if (!pageVisible || !constellationFailed) return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"星座资料加载异常",
      body:"可重试加载，已取得的星图与天体资料仍可查看。",dedupeKey:"sky-constellations"});
  },[pageVisible,constellationFailed,notify]);
  const retryConstellations = () => {
    // Assets may return 404 after a server publication change. Refresh the
    // immutable catalog too, otherwise Infinity cache repeats the old hash.
    void constellationCatalog.refetch();
    // A failed lazy artwork shader is scoped to the GPU owner. Recreate it as
    // well as native decoded images on explicit retry; never on each pose.
    if (artwork.failed) canvasLifecycle.resize();
  };
  const retryDeepSkyImage = () => {
    // Reset the GPU owner's latched shader failure as well as file/decode work.
    // Retain the last decoded image while its current replacement loads.
    canvasLifecycle.resize();
    void report.refetch();
    setDeepSkyImageAsset(null);
    setDeepSkyImageRetry(value => value + 1);
  };
  useEffect(() => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return;
    cancelSkyGestureRef.current();
    const next = { ...canvasSize, insets: viewportInsets };
    const previous = previousViewportRef.current;
    setVerticalFovDeg(value => previous ? remapSkyFieldOfView(value, previous, next) : clampSkyFieldOfView(value, next.width, next.height, next.insets));
    previousViewportRef.current = next;
  }, [canvasSize.width, canvasSize.height, viewportInsets]);
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
    stopBrowsingAnimation();
    browsingCamera.pan(basis, skyDomeProgress(zoomRef.current, canvasSize.width, canvasSize.height, viewportInsets));
    setFollowRequested(false);
    manualBasisRef.current = basis;
    setManualBasis(basis);
    orientationController.stopFollowing();
  };
  useEffect(() => () => { viewportMountedRef.current = false; viewportMeasurementRevision.current++; stopBrowsingAnimation(); canvasLifecycle.dispose(); }, [canvasLifecycle, stopBrowsingAnimation]);

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
    const frame = resolveSkySceneFrame(reportData?.skyScene, row?.at);
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
    const sceneReady = Boolean((selectedManualBasis || pose?.basis) && canvasData &&
      skySceneHasContent(canvasData.skyScene, row?.at, canvasFrameInfo.targetFrame));
    publishAcceptanceSkySceneInspection(owner, { ...canvasFrameInfo.inspection, state: "PENDING", drawRevision: canvasDrawRevisionRef.current });
    canvasLifecycle.request({ nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,
      data: canvasData, frameAt: row?.at, heading, pose, manualBasis: selectedManualBasis, mode,
      verticalFovDeg, deepSkyImage: mode === "OBSERVATION" ? null : canvasDeepSkyImage,
      constellations: canvasData ? constellationFrame : null, constellationImages: artwork.images, constellationsEnabled,
      stellarSupplement:canvasData?stellarSupplement.frame:null,
      sceneReady, owner, inspection: canvasFrameInfo.inspection },
      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode);
    previousCanvasModeRef.current = mode;
  }, [canvasLifecycle, canvasNodeRevision, canvasFrameInfo, mode, report.data?.dataState, report.isError, reportData, row?.at, sensorHeadingForScene, sensorBasis, devicePose, manualBasis, verticalFovDeg, canvasDeepSkyImage, orientation.snapshot.presentationRevision, viewportInsets, constellationFrame, artwork.images, constellationsEnabled,stellarSupplement.frame]);
  browsingDrawRef.current = draw;

  useReady(() => { canvasLifecycle.setMounted(Boolean(contextComplete && activeContext)); canvasLifecycle.ready(); draw(); });
  useResize(() => { canvasLifecycle.resize(); draw(); measureBottomControls(); });
  useEffect(() => {
    measureBottomControls();
  }, [measureBottomControls, Boolean(manualBasis), followRequested, alignment.mode, alignment.ready,
    compassState, orientationObjectListOpen, skyControlPanel, themeClass, canvasSize.width, canvasSize.height, reportData, constellationFailed,stellarSupplement.failed]);
  useEffect(() => { measureBottomControls(); }, [measureBottomControls, skyInlineNotice, skyInlineNoticeResidual]);
  useDidHide(() => { viewportActiveRef.current = false; viewportMeasurementRevision.current++; cancelSkyGestureRef.current(); stopBrowsingAnimation(); canvasLifecycle.hide(); hideCompass(); });
  useDidShow(() => { viewportActiveRef.current = true; canvasLifecycle.show(); showCompass(); draw(); measureBottomControls(); });
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
  }, [row?.at, mode, selectedCatalogObject, selectedTargetId, orientationObjectListOpen, skyControlPanel, datePickerOpen]);

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

  const closeSkyObjectDisclosure = () => {
    setSelectedTargetId(null);
    setSelectedCatalogObject(null);
    setCatalogPickChoices([]);
  };
  const selectCatalogObject = (object: PaintedSkyObject) => {
    if (orientationController.snapshot().alignment.mode === "editing") return;
    setSelectedTargetId(null);
    setCatalogPickChoices([]);
    setSelectedCatalogObject(object);
  };
  const selectSkyTarget = (target: SkyReport["targets"][number]) => {
    if (orientationController.snapshot().alignment.mode === "editing") return;
    setSelectedCatalogObject(null);
    setCatalogPickChoices([]);
    setSelectedTargetId(target.targetId);
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
      presentedFov,
      currentViewBasis,
      presentedCenter,
    );
    return projection ? [{ target, projection }] : [];
  });
  const catalogFrameObjects = (() => {
    if (!orientationObjectListOpen) return [];
    const catalog = reportData?.skyScene.catalog;
    const frame = resolveSkySceneFrame(reportData?.skyScene, row?.at);
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
    const deep: PaintedSkyObject[] = !deepCatalog || deepFrame?.state !== "AVAILABLE" || !deepFrame.points ? [] : deepFrame.points.flatMap(([catalogIndex, , altitude]) => {
      if (altitude <= 0) return [];
      const entry = deepCatalog.entries[catalogIndex];
      return entry ? [{ reference: entry.objectRef, displayName: entry.displayName, kind: entry.kind,
        magnitude: entry.magnitude, x: 0, y: 0 }] : [];
    });
    const faint:PaintedSkyObject[]=currentViewBasis?(stellarSupplement.frame?.points??[]).flatMap(([reference,magnitude,azimuth,altitude])=>{
      if((skyStarAppearance(magnitude,presentedFov)?.opacity??0)<.1)return [];
      const p=projectHorizontalPoint(azimuth,altitude,sensorHeadingForScene,devicePose,canvasSize.width,canvasSize.height,presentedFov,currentViewBasis,presentedCenter);
      return p?[{reference,displayName:reference.replace(':',' '),kind:'STAR',magnitude,magnitudeBand:'VISUAL',x:p.x,y:p.y}]:[];
    }):[];
    return [...deep, ...stars,...faint].sort((left, right) =>
      Number(left.kind === "STAR") - Number(right.kind === "STAR") ||
      (left.magnitude ?? 99) - (right.magnitude ?? 99) ||
      left.reference.localeCompare(right.reference));
  })();
  const visibleNamedCatalogObjects = (() => {
    const catalog = reportData?.skyScene.catalog;
    const frame = resolveSkySceneFrame(reportData?.skyScene, row?.at);
    if (!catalog || frame?.state !== "AVAILABLE" || !frame.points ||
      !currentViewBasis || canvasSize.width <= 0 || canvasSize.height <= 0)
      return [];
    const starCandidates: PaintedSkyObject[] = frame.points.flatMap(([catalogIndex, azimuth, altitude]) => {
      const entry = catalog.entries[catalogIndex];
      if (!entry?.displayName || entry.magnitude > 2.5) return [];
      const projection = projectHorizontalPoint(azimuth, altitude, sensorHeadingForScene, devicePose, canvasSize.width, canvasSize.height, presentedFov, currentViewBasis, presentedCenter);
      return projection ? [{ reference: entry.objectRef, displayName: entry.displayName, kind: "STAR" as const, magnitude: entry.magnitude, x: projection.x, y: projection.y }] : [];
    });
    const deepCatalog = reportData?.skyScene.deepSky?.catalog;
    const deepFrame = exactSkyTimeFrame(reportData?.skyScene.deepSky?.frames, row?.at);
    const deepCandidates: PaintedSkyObject[] = !deepCatalog || deepFrame?.state !== "AVAILABLE" || !deepFrame.points ? [] : deepFrame.points.flatMap(([catalogIndex, azimuth, altitude]) => {
      const entry = deepCatalog.entries[catalogIndex];
      const projection = entry ? projectHorizontalPoint(azimuth, altitude, sensorHeadingForScene, devicePose, canvasSize.width, canvasSize.height, presentedFov, currentViewBasis, presentedCenter) : null;
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
  const activeSkySceneFrame = resolveSkySceneFrame(reportData?.skyScene, row?.at);
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
            : stellarReference && stellarCatalog.isPending
              ? { state: "LOADING" as const, detail: "正在加载星图资料。" }
            : stellarCatalog.refreshError || stellarCatalog.data?.dataState === "STALE_USABLE"
              ? { state: "ERROR" as const, detail: "星图资料更新失败，当前显示已取得的资料。" }
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
  const skySceneReady = skySceneHasContent(orientationData?.skyScene, row?.at, orientationTargetFrame);
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
      skyTapRef.current.pinchStartBasis = currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW;
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
      pinchStartBasis: currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW,
      startBasis: currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW,
      dragged: false,
      edge: point.x < 16 || point.x > canvasSize.width - 16,
      startedManual: Boolean(manualBasis),
      startedFollowing: followRequested || (!manualBasis && (compassLifecycle.active || sensorBasis !== null)),
      initialFov: verticalFovDeg,
      cameraCheckpoint: browsingCamera.checkpoint(),
      originalManualBasis: manualBasisRef.current,
      startCenter: presentedCenter,
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
      gesture.pinchStartBasis = currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW;
    } else if (gesture.pinchStartDistance !== null && pinchDistance !== null) {
      const fov = pinchFieldOfView(gesture.pinchStartFov, gesture.pinchStartDistance, pinchDistance, canvasSize.width, canvasSize.height, viewportInsets);
      setVerticalFovDeg(fov);
    }
    gesture.travelPx = Math.max(gesture.travelPx, Math.hypot(point.x - gesture.startX, point.y - gesture.startY));
    if (gesture.maximumTouches === 1 && gesture.travelPx > 6) {
      stopBrowsingAnimation();
      const dragged = dragSkyView(gesture.startBasis, { x: gesture.startX, y: gesture.startY }, point,
        canvasSize.width, canvasSize.height, gesture.pinchStartFov, gesture.startCenter);
      const next = browsingCamera.pan(dragged, skyDomeProgress(gesture.pinchStartFov, canvasSize.width, canvasSize.height, viewportInsets)).view ?? dragged;
      if (!gesture.dragged) { enterManualView(next); gesture.dragged = true; }
      else { manualBasisRef.current = next; setManualBasis(next); }
    }
  };
  const onSkyTouchCancel = () => {
    const gesture = skyTapRef.current;
    skyTapRef.current = null;
    if (!gesture) return;
    stopBrowsingAnimation();
    browsingCamera.restore(gesture.cameraCheckpoint);
    if (gesture.dragged || gesture.startedManual) {
      const restored = gesture.startedManual ? gesture.originalManualBasis : gesture.startedFollowing ? gesture.startBasis : null;
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
  const beginSkyCalibration = () => {
    if (contextSession.busy) return;
    skyTapRef.current = null;
    stopBrowsingAnimation();
    browsingCamera.freeze(orientation.presented.current);
    setVerticalFovDeg(SKY_VERTICAL_FOV_DEG);
    orientationController.begin();
  };
  cancelSkyGestureRef.current = onSkyTouchCancel;
  const onSkyTouchEnd = (event: unknown) => {
    if (orientationController.snapshot().alignment.mode === "editing" || (event as SkyTouchLike).touches?.length) return;
    const gesture = skyTapRef.current;
    skyTapRef.current = null;
    const point = skyTouchPoint(event, true);
    if (gesture && point) gesture.travelPx = Math.max(gesture.travelPx, Math.hypot(point.x - gesture.startX, point.y - gesture.startY));
    const identity = skyPickIdentity(reportData,stellarSupplement.frame);
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
        active={Boolean(datePickerOpen || selectedTargetId || selectedCatalogObject || catalogPickChoices.length)}
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
            type="webgl"
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
          {skySceneReady && !canvasError && canvasSize.width > 0 && canvasSize.height > 0 ?
            ([[0, "北"], [90, "东"], [180, "南"], [270, "西"]] as const).map(([azimuth, label]) => {
              const point = projectHorizontalPoint(azimuth, 0, null, null, canvasSize.width, canvasSize.height,
                presentedFov, currentViewBasis, presentedCenter);
              return point ? <Text key={label} className="sky-cardinal-label"
                style={{ left: `${point.x}px`, top: `${point.y}px` }} aria-hidden>{label}</Text> : null;
            }) : null}
          {Math.abs(verticalFovDeg - SKY_VERTICAL_FOV_DEG) > 0.05 ? (
            <View className="sky-zoom-status" role="status" aria-live="polite">
              <Text>{verticalFovDeg.toFixed(1)}°</Text>
              {verticalFovDeg <= 1.5 ? <Text>已到当前最高分辨率</Text> : null}
            </View>
          ) : null}
          {selectedDeepSkyEntry && verticalFovDeg <= 15 ? (
            <View className="sky-image-status" role="status" aria-live="polite">
              {mode === "OBSERVATION" ? (
                <Text>红光模式已隐藏巡天影像</Text>
              ) : !deepSkyRegistrationReady ? (
                <Button onClick={() => void report.refetch()}>影像配准资料需刷新 · 重试天空</Button>
              ) : deepSkyImageState === "LOADING" ? (
                <Text>正在载入 {selectedDeepSkyEntry.displayName} 巡天影像…</Text>
              ) : deepSkyImageState === "ERROR" ? (
                <Button onClick={retryDeepSkyImage}>影像载入失败 · 重试</Button>
              ) : deepSkyImageAsset ? (
                <Text>NASA/IPAC IRSA · AllWISE W3 12 μm · 处理后红外影像</Text>
              ) : null}
            </View>
          ) : null}
          {visibleNamedCatalogObjects.map((object) => (
            <SkyOrientationCatalogLabel
              key={object.reference}
              object={object}
              disabled={alignmentEditing}
              onSelect={selectCatalogObject}
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
              disabled={alignmentEditing}
              onSelect={selectSkyTarget}
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
                onClick={() => { draw(); canvasLifecycle.retry(); }}
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
                    ? retrySkyData
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
              onContentChange={measureBottomControls}
              active={pageVisible && contextComplete} refreshing={report.isFetching} scopeKey={routeContext.spotId}
              reportHandlesFailure={report.data?.dataState === "UNAVAILABLE" || report.data?.dataState === "EXPIRED"}
              refreshFailed={Boolean(report.refreshError) || report.data?.dataState === "STALE_USABLE"} onRecover={() => void report.refetch()} />
          </ScrollView>
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

        {(skyControlPanel === null && !manualBasis && !alignmentRequired && !alignmentEditing && !compassIsReady) || orientationObjectListOpen ? (
        <ScrollView
          scrollY
          enhanced
          showScrollbar={false}
          className={`sky-orientation-details sky-orientation-details--${orientationObjectListOpen ? "list" : "recovery"}`}
          style={controlsBottomReserve !== null ? {
            bottom: `${controlsBottomReserve}px`,
            maxHeight: `calc(100vh - ${controlsBottomReserve}px - var(--sky-controls-top) - var(--target-min) - 8px)`,
          } : {}}
          aria-label={orientationObjectListOpen ? "天体列表" : "方向状态"}
        >
        {skyControlPanel === null && !manualBasis && !alignmentRequired && !alignmentEditing && !compassIsReady && !orientationObjectListOpen ? (
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
                      onSelect={selectSkyTarget}
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
                  <Button className="sky-catalog-row" key={object.reference} onClick={() => selectCatalogObject(object)}>
                    <Text>{object.displayName}</Text>
                    <Text>{object.kind === "STAR" ? "恒星" : object.kind === "GALAXY" ? "星系" : "星云"} · {object.reference.replace(":", " ")}{object.magnitude === null ? "" : ` · ${skyObjectMagnitudeLabel(object)}`}</Text>
                  </Button>
                ))}
                {catalogListLimit < catalogFrameObjects.length ? (
                  <Button className="sky-catalog-row__more" onClick={() => setCatalogListLimit((value) => Math.min(value + 24, catalogFrameObjects.length))}>
                    显示更多天体
                  </Button>
                ) : null}
              </View>
            ) : null}
            {constellationCatalog.data ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起星座资料来源"
                onClick={() => setConstellationSourcesOpen(value=>!value)}>星座资料来源 · Johan Meuris / Stellarium</Button>
              {constellationSourcesOpen ? constellationCatalog.data.sources.map(source => <Provenance key={source.provider} source={source} showKind={false}
                downloadUrl={source.id.startsWith("constellation-geometry:") ? constellationAssetUrl(constellationCatalog.data!.data.catalogHash,constellationCatalog.data!.data.geometryAsset.file) : undefined} />) : null}
            </View> : null}
            {stellarSupplement.sources.length ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起暗星资料来源"
                onClick={()=>setSupplementSourcesOpen(value=>!value)}>暗星资料来源 · SAO / NASA HEASARC</Button>
              {supplementSourcesOpen?stellarSupplement.sources.map(source=><Provenance key={source.id} source={source} showKind={false}/>):null}
            </View>:null}
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
              <Button key={choice.reference} className="sky-object-choice__row" onClick={() => selectCatalogObject(choice)}>
                <Text>{choice.displayName}</Text>
                <Text>{choice.kind === "STAR" ? "恒星" : choice.kind === "GALAXY" ? "星系" : "星云"} · {choice.reference.replace(":", " ")}{choice.magnitude === null ? "" : ` · ${skyObjectMagnitudeLabel(choice)}`}</Text>
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

        <View className="sky-quick-settings">
        <View className="sky-view-mode">
          <Button className="sky-view-mode__button focus-ring" disabled={alignmentEditing}
            aria-label={constellationsEnabled ? "关闭星座连线与插画，目前设置为放大后显示" : "开启星座连线与插画，放大后显示"}
            onClick={() => setConstellationsEnabled(value=>!value)}>{constellationsEnabled ? "星座：开" : "星座：关"}</Button>
          {constellationFailed ? <Button className="sky-view-mode__button focus-ring" onClick={retryConstellations}>重试星座</Button> : null}
          {stellarSupplement.failed ? <Button className="sky-view-mode__button focus-ring" onClick={stellarSupplement.retry}>重试暗星</Button> : null}
          {manualBasis ? <Text className="type-caption">手动视角</Text> : null}
          <Button disabled={alignmentEditing} className="sky-view-mode__button focus-ring" aria-label={followRequested ? "取消恢复手机跟随，保留手动视角" : manualBasis ? "恢复手机方向跟随" : "切换手动拖动模式"}
            onClick={() => {
              skyTapRef.current = null;
              if (!manualBasis || followRequested) enterManualView();
              else { setFollowRequested(true); recoverCompass(); }
            }}>{followRequested ? "取消跟随" : manualBasis ? "跟随手机" : "拖动模式"}</Button>
          {manualBasis && followRequested ? <Text className="sky-view-mode__status type-caption">{compassIsReady ? "正在恢复跟随" : `${compassRecovery.title}，保留手动视角`}</Text> : null}
        </View>
        </View>
        <View className="sky-control-dock safe-bottom" id="sky-bottom-controls" role="group" aria-label="天空控件">
          <Button className="sky-control-dock__button focus-ring" aria-expanded={skyControlPanel === "calibration"}
            onClick={() => {
              if (orientationController.snapshot().alignment.mode === "editing") return;
              closeSkyObjectDisclosure();
              setOrientationObjectListOpen(false);
              setDatePickerOpen(false);
              setPreviewIndex(null);
              setSkyControlPanel(value => value === "calibration" ? null : "calibration");
              if (skyControlPanel !== "calibration" && !manualBasis && alignment.ready && !timeSaving && !isPreviewing && skySceneReady) beginSkyCalibration();
            }}>重新校准</Button>
          <Button className="sky-control-dock__button focus-ring" disabled={alignmentEditing}
            aria-expanded={orientationObjectListOpen} data-od-id="sky-orientation-object-list-toggle"
            onClick={() => {
              if (orientationController.snapshot().alignment.mode === "editing") return;
              closeSkyObjectDisclosure();
              setSkyControlPanel(null);
              setDatePickerOpen(false);
              setPreviewIndex(null);
              setOrientationObjectListOpen(open => !open);
            }}>{orientationObjectListOpen ? "收起列表" : "天体列表"}</Button>
          <Button className="sky-control-dock__button focus-ring" disabled={alignmentEditing}
            aria-expanded={skyControlPanel === "time"}
            onClick={() => {
              if (orientationController.snapshot().alignment.mode === "editing") return;
              closeSkyObjectDisclosure();
              setOrientationObjectListOpen(false);
              setDatePickerOpen(false);
              setPreviewIndex(null);
              setSkyControlPanel(value => value === "time" ? null : "time");
            }}>{skyControlPanel === "time" ? "收起时间轴" : "时间轴"}</Button>
        </View>
        {skyControlPanel === "calibration" ? (
          <View className="sky-control-panel sky-calibration-panel" role="group" aria-label="重新校准控件">
          {!manualBasis && (alignment.ready || alignmentRequired || alignmentEditing) ? (
            alignmentEditing ? <>
              <Text className="sky-view-mode__status type-caption">画面已锁定。移动手机与真实星空对齐后确定。</Text>
              <Button className="sky-view-mode__button focus-ring" onClick={() => { orientationController.cancel(); setSkyControlPanel(null); }}>取消</Button>
              <Button className="sky-view-mode__button focus-ring" disabled={!alignment.ready}
                onClick={() => { if (orientationController.commit()) setSkyControlPanel(null); }}>确定</Button>
            </> : <>
              <Button className="sky-view-mode__button focus-ring"
                disabled={!alignment.ready || timeSaving || isPreviewing || datePickerOpen || !skySceneReady}
                onClick={beginSkyCalibration}>重新校准</Button>
              {alignmentRequired ? <Text className="sky-view-mode__status type-caption">方向参照已中断，保留原视图，请重新校准。</Text> : null}
              {alignmentRequired && !alignment.ready ? <Button className="sky-view-mode__button focus-ring"
                onClick={recoverCompass}>重新连接</Button> : null}
            </>
          ) : null}
          {!manualBasis && orientationSensorState === "LOW_ACCURACY" ? <Text className="sky-view-mode__status type-caption">方向精度较低，方位可能存在偏差</Text> : null}
            {manualBasis ? <Text>先点击“跟随手机”，取得设备方向后重新校准。</Text> : null}
            {!manualBasis && !alignment.ready && !alignmentRequired && !alignmentEditing ? <Button className="sky-view-mode__button" onClick={recoverCompass}>连接设备方向</Button> : null}
            {!alignmentEditing ? <Button className="sky-view-mode__button" onClick={() => setSkyControlPanel(null)}>收起</Button> : null}
          </View>
        ) : null}
        {skyControlPanel === "time" ? (
        <View
          className={`sky-orientation-ruler-layer sky-control-panel safe-bottom${datePickerOpen ? " sky-control-panel--calendar" : ""}`}
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
            nativeBackBoundary={false}
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
            saving={timeSaving}
            interactionLocked={alignmentEditing}
            reducedMotion={reducedMotion}
            onPreview={onPreview}
            onCommit={(index) => void commitIndex(index)}
            onCancel={() => setPreviewIndex(null)}
          />
        </View>
        ) : null}
      </View>
    );
}
