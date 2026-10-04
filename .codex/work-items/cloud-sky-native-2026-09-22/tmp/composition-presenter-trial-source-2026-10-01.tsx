import { useSkyForecastQuery } from "@/hooks/use-forecast-query";
import { useCelestialInformation } from "@/hooks/use-celestial-information";
import { celestialInformationPartialDetail } from "@/services/celestial-information-presentation";
import { SkyObjectSearch } from "./sky-object-search";
import { SkyObjectPositionAction } from "./sky-object-position-action";
import { SkyObjectTrackingStatus } from "./sky-object-tracking-status";
import { SkySelectedObject } from "./sky-selected-object";
import { createSkyObjectSelection } from "./sky-object-selection";
import { createSkyObjectTracking, type SkyObjectTrackingState } from "./sky-object-tracking";
import { skyObjectPositionIsCurrent } from "./sky-object-location";
import { locatedBodyOccludesMarker } from "./sky-located-object";
import type { SkyObjectIdentity } from "./sky-object-picking";
import { dispatchSkyHipsImageFailure, drawSkyScene, skyPickIdentity, type SkyHipsCanvasTile, type SkyCoordinateGrids, type SkySdssOpticalImage } from "./sky-scene-render";
import { exactSkyObservationFrame } from "./sky-observation-frame";
import { projectHorizontalPoint, projectSkyTarget, type SkyTargetProjection } from "./sky-scene-projection";
import { createSkyGpuRenderer, type SkyGpuRenderer } from "./sky-gpu-renderer";
import { resolveConstellationFrame, type ConstellationFrame } from "./sky-constellation-scene";
import { projectConstellationLabels } from "./sky-constellation-labels";
import { constellationVisibility } from "./sky-constellation-visibility";
import { deepSkyAuxiliaryOpacity } from "./sky-deep-auxiliary-visibility";
import { artworkIntersectsView } from "./sky-artwork-visibility";
import { resolvedSkyBodyReferences, skyTargetLabelSuppressed } from "./sky-body-label-presentation";
import { useSkyArtwork } from "./use-sky-artwork";
import { useSkyOpticalHips } from "./use-sky-optical-hips";
import { useSkySdssOptical } from "./use-sky-sdss-optical";
import { useSkyWideFieldW3 } from "./use-sky-wide-field-w3";
import { useSkyMoonTexture } from "./use-sky-moon-texture";
import { useSkyMarsTexture } from "./use-sky-mars-texture";
import { useSkyMercuryTexture } from "./use-sky-mercury-texture";
import { useSkyJupiterBands } from "./use-sky-jupiter-bands";
import { SkyOpalBandsSource } from "./sky-opal-bands-source";
import { useSkySaturnBands } from "./use-sky-saturn-bands";
import { useSkyNeptuneBands } from "./use-sky-neptune-bands";
import { useSkyUranusBands } from "./use-sky-uranus-bands";
import { useSkyGalacticImage } from "./use-sky-galactic-image";
import { useSkyLandscape } from "./use-sky-landscape";
import type { SkyLandscapeMask, SkyLandscapePanorama } from "./sky-landscape-mask";
import { skyLandscapeAssetUrl } from "@/services/sky-landscape-client";
import {useSkyStellarSupplement} from './use-sky-stellar-supplement';
import type {SkyStellarSupplementFrame} from './sky-stellar-supplement-scene';
import {currentStellarSupplement} from './sky-stellar-supplement-scene';
import {skyStarAppearance} from './sky-star-appearance';
import {skySolarLightAt} from './sky-solar-light';
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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createSkyContextSession } from "./sky-context-session";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";
import { nativeNavigationInsets } from "@/theme/native-metrics";
import {
  CONSTELLATION_CATALOG_VERSION,
  SKY_PLANET_CATALOG_HASH,
  SKY_PLANET_CATALOG_VERSION,
  SKY_LUMINARY_CATALOG_VERSION, SKY_LUMINARY_CATALOG_HASH, SKY_LUMINARY_ORDER, SKY_LUMINARY_NAMES, skyLuminaryBody, skyLuminaryPosition,
  SKY_PLANET_NAMES,
  SKY_PLANET_ORDER,
  validSkyPlanetGeometry,
  type DisplayMode,
  type CelestialObjectInformation,
  type CelestialObjectPositionData,
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
  MiniappApiError,
  errorMessage,
  deepSkyImageUrl,
  getObservationContext,
  getSkyReport,
  getSkyTargetInstant,
  getStellarCatalog,
  getConstellationCatalog,
  constellationAssetUrl,
  getSpotOverview,
  restoreObservationContext,
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
  createSkyViewBasis,
  type SkyViewBasis,
} from "./sky-view-projection";
import type { DeviceOrientationFrame } from "./device-orientation-view";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view";
import { attachSkyCatalog, resolveSkyDeepSkyScene, resolveSkySceneFrame, skySceneHasContent, type ResolvedSkyReport as SkyReport } from "./sky-stellar-scene";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { createSkyObservationTime, skyPresentedTimeCurrent } from "./sky-observation-time";
import { presentSkyTime, skyPresentationTimeModel } from "./sky-time-presentation";
import type { SkyPositionPresentation } from "./sky-presentation-position";
import { createSkyCanvasLifecycle } from "./sky-canvas-lifecycle";
import { sdssOpticalPresentation } from "./sky-sdss-optical-selection";
import {
  isUnambiguousTapGesture,
  pickPaintedSkyObjects,
  skyPickSnapshotIsCurrent,
  paintedSkyPointVisible,
  skyObjectMagnitudeLabel,
  skyObjectKindLabel,
  type PaintedSkyObject,
  type SkyPickSnapshot,
} from "./sky-object-picking";
import { clampSkyFieldOfView, deepSkyImageLevelForFov, pinchFieldOfView, remapSkyFieldOfView, skyDomeProgress, SKY_MIN_VERTICAL_FOV_DEG, SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import { NO_SKY_INSETS, skyInsetsFromControls, skyViewportCenter, type SkyProjectionCenter, type SkyScreenRect, type SkyViewportInsets } from "./sky-viewport";
import {
  startDeepSkyImageRequest,
  type OwnedDeepSkyImageAsset,
} from "./deep-sky-image-request";
import "./spot-sky-page.scss";

const CANVAS_ID = "spot-night-sky-scene";
let skyFeedbackMountSequence = 0;
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
  sdssOpticalImage: SkySdssOpticalImage | null;
  constellations: ConstellationFrame | null;
  constellationImages: ReadonlyMap<string, object>;
  hipsTiles: readonly SkyHipsCanvasTile[];
  moonTexture: object | null;
  marsTexture: object | null;
  mercuryTexture: object | null;
  jupiterBands: object | null;
  saturnBands: object | null;
  neptuneBands: object | null;
  uranusBands: object | null;
  galacticImage: object | null;
  constellationsEnabled: boolean;
  landscapeEnabled: boolean;
  coordinateGrids: SkyCoordinateGrids;
  landscapePanorama: SkyLandscapePanorama | null;
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

function formatTimeWithSeconds(value: string | null | undefined, timezone: string) {
  if (!value) return "—";
  try {
    return `${clockTimeInTimezone(new Date(value), timezone)}:${value.slice(17, 19)}`;
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
    target.altitudeDeg === null ? "高度未提供" : `${Math.round(target.altitudeDeg)}°`;
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
  const altitude = `${Math.round(projection.altitude)}°`;
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
  opacity,
  onSelect,
  disabled,
}: {
  object: PaintedSkyObject;
  opacity: number;
  onSelect: (object: PaintedSkyObject) => void;
  disabled: boolean;
}) {
  const kindLabel = skyObjectKindLabel(object.kind);
  const magnitudeLabel = skyObjectMagnitudeLabel(object);
  return (
    <Button
      className="sky-orientation-catalog-label"
      style={{ left: `${object.x}px`, top: `${object.y}px`, opacity }}
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
  const altitude = target.altitudeDeg === null ? "暂无数据" : `${Math.round(target.altitudeDeg)}°`;
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
  positionAction,
  imagePublicationHash,
}: {
  reference: string;
  knownName: string;
  knownKind: PaintedSkyObject["kind"];
  onClose: () => void;
  positionAction?: ReactNode;
  imagePublicationHash?: string;
}) {
  const openingSources = useRef(false);
  const notify = useAppStore((state) => state.notify);
  const information = useCelestialInformation(reference, true, imagePublicationHash);
  const openSources = async () => {
    if (openingSources.current) return;
    openingSources.current = true;
    try {
      await Taro.navigateTo({ url: `/sky/sources/index?reference=${encodeURIComponent(reference)}` +
        (imagePublicationHash ? `&imagePublicationHash=${imagePublicationHash}` : "") });
    } catch {
      notify({ owner: "spot-night", placement: "floating", tone: "info",
        title: "来源页面未能打开", body: "请重试。", dedupeKey: "sky-source-navigation" });
    } finally { openingSources.current = false; }
  };
  const unavailable = information.data?.dataState === "UNAVAILABLE";
  const data: CelestialObjectInformation | undefined = unavailable ? undefined : information.data?.data;
  const title = data?.displayName ?? knownName;
  const resolvedKind = data?.kind ?? knownKind;
  const kindLabel = skyObjectKindLabel(resolvedKind);
  const stale = Boolean(data && (information.refreshError || information.data?.dataState === "STALE_USABLE"));
  const partialDetail = data ? celestialInformationPartialDetail(information.data) : null;
  const failed = information.isError || stale || unavailable;
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
          {positionAction}
          {information.isPending ? <StatusPanel state="LOADING" detail={`正在读取${title}的资料…`} /> : null}
          {information.isError || unavailable ? (
            <StatusPanel state="ERROR" detail={information.isError ? errorMessage(information.error) : "天体资料暂不可用。"}
              recoveryLabel="重试资料" onRecover={() => void information.refetch()} />
          ) : null}
          {stale ? <StatusPanel state="STALE" detail="天体资料更新失败，暂时显示上次记录。"
            recoveryLabel="重试资料" onRecover={() => void information.refetch()} /> : null}
          {partialDetail ? <StatusPanel state="PARTIAL" detail={partialDetail}
            recoveryLabel="重试资料" onRecover={() => void information.refetch()} /> : null}
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
  presentedAt,
  playing,
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
  presentedAt?: string;
  playing?: boolean;
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
  const currentLabel = presentedAt
    ? formatTimeWithSeconds(presentedAt, timezone)
    : activeRow
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
        {saving || isPreviewing || playing ? (
          <Text className="sky-orientation-time-ruler__current-state">
            {saving ? "保存中" : playing ? "播放中" : "预览"}
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
        detail="观测信息不完整，请返回入口核对地点与时刻，再打开云观星。"
        recoveryLabel="返回入口"
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
    setTimeIntent(observationTime.hide(Date.now()));
    setPageVisible(false);
    setTimeSaving(false);
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
  // red-only constraints; the sky stylesheet owns the observing surface.
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
  const autoRestoreAttemptedRef = useRef(false);
  const restoreAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => {
    restoreAbortRef.current?.abort();
    restoreAbortRef.current = null;
  }, [pageVisible, contextSession]);
  const staleReportError = report.error ?? report.refreshError;
  useEffect(() => {
    if (!pageVisible || !contextComplete || !activeContext || report.isFetching ||
      autoRestoreAttemptedRef.current || !(staleReportError instanceof MiniappApiError) ||
      (staleReportError.code !== "NOT_FOUND" && staleReportError.code !== "STALE_REJECTED")) return;
    const request = contextSession.begin(activeContext);
    if (!request) return;
    // A persisted Context can outlive a restarted service. Recover only an
    // explicit server rejection, once per page visit; transport errors keep
    // their offline behavior and manual retry remains available.
    autoRestoreAttemptedRef.current = true;
    const controller = new AbortController();
    restoreAbortRef.current = controller;
    void restoreObservationContext(activeContext, controller.signal)
      .then(response => {
        if (contextSession.accept(request, response.data))
          setObservationContext(response.data);
      })
      .catch(() => { /* The existing report error and retry control remain. */ })
      .finally(() => {
        if (restoreAbortRef.current === controller) restoreAbortRef.current = null;
        contextSession.finish(request);
      });
  }, [pageVisible, contextComplete, activeContext, report.isFetching, staleReportError,
    contextSession, setObservationContext]);
  const observationTime = useMemo(() => createSkyObservationTime(), []);
  const [timeIntent, setTimeIntent] = useState(() => observationTime.snapshot());
  const pauseSkyTime = () => setTimeIntent(observationTime.pause());
  const setPreviewIndex = (index: number | null) => {
    if (index === null) setTimeIntent(observationTime.cancel());
    else {
      const at = report.data?.data.hourly[index]?.at;
      if (at) setTimeIntent(observationTime.preview(at));
    }
  };
  const [manualBasis, setManualBasis] = useState<SkyViewBasis | null>(null);
  const manualBasisRef = useRef<SkyViewBasis | null>(null);
  const browsingCamera = useMemo(() => createSkyBrowsingCamera(), []);
  const objectTracking = useMemo(() => createSkyObjectTracking(), []);
  const [trackingState, setTrackingState] = useState(() => objectTracking.snapshot());
  const stopObjectTracking = () => setTrackingState(objectTracking.stop());
  useEffect(() => {
    if (objectTracking.snapshot().spotId && objectTracking.snapshot().spotId !== routeContext.spotId)
      setTrackingState(objectTracking.stop());
  }, [routeContext.spotId, objectTracking]);
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
  // DOM labels must wait for the matching native frame; the ref alone cannot trigger that commit.
  const [presentedSkyFrame, setPresentedSkyFrame] = useState<(Pick<SkyCanvasFrame,
    "data" | "frameAt" | "mode" | "constellations" | "constellationsEnabled" | "sdssOpticalImage" | "deepSkyImage" | "stellarSupplement"> &
    { resolvedBodyReferences: readonly string[]; suppressedBodyReferences: readonly string[];
      landscape: SkyLandscapeMask | null }) | null>(null);
  const canvasNodeRef = useRef<SkyCanvasNode | null>(null);
  const canvasGenerationRef = useRef(0);
  const retireDeepSkyDecodeRef = useRef<() => void>(() => {});
  const [canvasNodeRevision, setCanvasNodeRevision] = useState(0);
  const [constellationsEnabled, setConstellationsEnabled] = useState(true);
  const [landscapeEnabled, setLandscapeEnabled] = useState(true);
  const [coordinateGrids, setCoordinateGrids] = useState<SkyCoordinateGrids>({ horizontal: true, equatorial: false });
  const [wideFieldEnabled,setWideFieldEnabled]=useState(false);
  const [constellationSourcesOpen, setConstellationSourcesOpen] = useState(false);
  const [supplementSourcesOpen,setSupplementSourcesOpen]=useState(false);
  const [opticalSourcesOpen,setOpticalSourcesOpen]=useState(false);
  const [wideFieldSourcesOpen,setWideFieldSourcesOpen]=useState(false);
  const [moonTextureSourcesOpen,setMoonTextureSourcesOpen]=useState(false);
  const [marsTextureSourcesOpen,setMarsTextureSourcesOpen]=useState(false);
  const [mercuryTextureSourcesOpen,setMercuryTextureSourcesOpen]=useState(false);
  const [galacticImageSourcesOpen,setGalacticImageSourcesOpen]=useState(false);
  const [landscapeSourcesOpen,setLandscapeSourcesOpen]=useState(false);
  const artworkFailureRef = useRef<(image: object) => void>(() => {});
  const opticalFailureRef = useRef<(image: object) => void>(() => {});
  const sdssOpticalFailureRef = useRef<(image: object) => void>(() => {});
  const wideFieldFailureRef = useRef<(image: object) => void>(() => {});
  const moonTextureFailureRef = useRef<(image: object) => void>(() => {});
  const marsTextureFailureRef = useRef<(image: object) => void>(() => {});
  const mercuryTextureFailureRef = useRef<(image: object) => void>(() => {});
  const jupiterBandsFailureRef = useRef<(image: object) => void>(() => {});
  const saturnBandsFailureRef = useRef<(image: object) => void>(() => {});
  const neptuneBandsFailureRef = useRef<(image: object) => void>(() => {});
  const uranusBandsFailureRef = useRef<(image: object) => void>(() => {});
  const galacticImageFailureRef = useRef<(image: object) => void>(() => {});
  const landscapeImageFailureRef = useRef<(image: object) => void>(() => {});
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
        .select(".sky-quick-settings").boundingClientRect()
        .exec(results => {
        if (!viewportActiveRef.current || !viewportMountedRef.current || revision !== viewportMeasurementRevision.current) return;
        const [dock, back, notification, canvas, panel, quickSettings] = results as (SkyScreenRect | null)[];
        const bottom = panel && dock && panel.top < dock.top ? panel : dock;
        if (bottom && Number.isFinite(bottom.top)) {
          const reserve = Math.max(0, Taro.getWindowInfo().windowHeight - bottom.top + 8);
          setControlsBottomReserve(previous => previous === reserve ? previous : reserve);
        }
        if (canvas && bottom && back) {
          const nativeBottom = navigationInsets.capsuleBottom ?? navigationInsets.safeTop ?? 0;
          const insets = skyInsetsFromControls(canvas, [back, ...(notification ? [notification] : []), ...(quickSettings ? [quickSettings] : []),
            { top: 0, bottom: nativeBottom, height: nativeBottom }], bottom);
          if (insets) setViewportInsets(previous => previous.top === insets.top && previous.bottom === insets.bottom ? previous : insets);
        }
      });
    });
  }, []);
  const skySceneInspectionOwnerRef =
    useRef<AcceptanceSkySceneInspectionOwner | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [solarLightUnavailable, setSolarLightUnavailable] = useState(false);
  const [landscapeUnavailable, setLandscapeUnavailable] = useState(false);
  const [galacticBandUnavailable, setGalacticBandUnavailable] = useState(false);
  const [sunDiscUnavailable, setSunDiscUnavailable] = useState(false);
  const [moonDiscUnavailable, setMoonDiscUnavailable] = useState(false);
  const [planetDiscUnavailable, setPlanetDiscUnavailable] = useState(false);
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
      // Temporary task compatibility trial: retain the production WebGL renderer
      // and its own image factory; copy the completed buffer to a typed 2D node.
      const presentation = (node as unknown as { getContext(type: "2d"): {
        clearRect(x: number, y: number, width: number, height: number): void;
        drawImage(source: unknown, x: number, y: number, width: number, height: number): void;
      } | null }).getContext("2d");
      if (!presentation) throw new Error("sky_task_presentation_2d_unavailable");
      const imageNode = Taro.createOffscreenCanvas({ type: "webgl", width: node.width, height: node.height }) as unknown as SkyCanvasNode;
      const gl = imageNode.getContext("webgl");
      if (!gl) throw new Error("sky_canvas_webgl_context_unavailable");
      const context = createSkyGpuRenderer(gl, pixelRatio,{imageFailed(image){
        artworkFailureRef.current(image);opticalFailureRef.current(image);sdssOpticalFailureRef.current(image);
        wideFieldFailureRef.current(image);moonTextureFailureRef.current(image);marsTextureFailureRef.current(image);
        mercuryTextureFailureRef.current(image);
        jupiterBandsFailureRef.current(image);
        saturnBandsFailureRef.current(image);
        neptuneBandsFailureRef.current(image);
        uranusBandsFailureRef.current(image);
        galacticImageFailureRef.current(image);
        landscapeImageFailureRef.current(image);
      }});
      const trialPage = Taro.getCurrentPages().at(-1) as unknown as Record<string, unknown>;
      const trial = { copies: 0, width: node.width, height: node.height, submissionMs: 0, maxSubmissionMs: 0 };
      trialPage.__skyTaskPresentationTrial = trial;
      const beginWebgl = context.begin;
      context.begin = (width, height, background) => {
        if (imageNode.width !== node.width) imageNode.width = node.width;
        if (imageNode.height !== node.height) imageNode.height = node.height;
        beginWebgl(width, height, background);
      };
      const finishWebgl = context.finish;
      context.finish = () => {
        finishWebgl();
        const started = Date.now();
        presentation.clearRect(0, 0, node.width, node.height);
        presentation.drawImage(imageNode, 0, 0, node.width, node.height);
        const elapsed = Date.now() - started;
        trial.copies++; trial.submissionMs += elapsed; trial.maxSubmissionMs = Math.max(trial.maxSubmissionMs, elapsed);
      };
      const disposeWebgl = context.dispose;
      context.dispose = () => {
        try { disposeWebgl(); } finally {
          imageNode.width = 0; imageNode.height = 0;
          gl.getExtension("WEBGL_lose_context")?.loseContext();
          if (trialPage.__skyTaskPresentationTrial === trial) delete trialPage.__skyTaskPresentationTrial;
        }
      };
      setSolarLightUnavailable(false);
      setLandscapeUnavailable(false);
      setGalacticBandUnavailable(false);
      setSunDiscUnavailable(false);
      setPlanetDiscUnavailable(false);
      canvasNodeRef.current = imageNode;
      setCanvasNodeRevision(++canvasGenerationRef.current);
      return context;
    },
    releaseContext: context => {
      canvasNodeRef.current = null;
      canvasGenerationRef.current++;
      retireDeepSkyDecodeRef.current();
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
        intent: live.alignment.mode === "editing" ? "locked" : manualBasisRef.current ? objectTracking.snapshot().target ? "track" : "manual" : live.alignment.mode === "needs-alignment" ? "locked" : "follow",
        progress, at: Date.now(), reducedMotion: reducedMotionRef.current });
      const basis = camera.view;
      drawSkyScene(context, frame.data, frame.frameAt, frame.heading, frame.pose,
        size.width, size.height, frame.mode,
        (snapshot, sources) => {
          paintedSkyObjectsRef.current = snapshot;
          const paintedSdssOpticalImage = sources.sdssOpticalImage === frame.sdssOpticalImage?.image
            ? frame.sdssOpticalImage : sources.sdssOpticalImage && sources.sdssOpticalImage === frame.sdssOpticalImage?.coarser?.image
              ? { ...frame.sdssOpticalImage, ...frame.sdssOpticalImage.coarser, coarser: null } : null;
          const paintedDeepSkyImage = sources.deepSkyImage === frame.deepSkyImage?.image ? frame.deepSkyImage : null;
          const resolvedBodyReferences = resolvedSkyBodyReferences(snapshot);
          const suppressedBodyReferences = snapshot?.suppressedBodyReferences ?? [];
          const paintedLandscape = snapshot?.view?.landscape ?? null;
          setPresentedSkyFrame(previous => snapshot || paintedSdssOpticalImage || paintedDeepSkyImage ?
            previous && previous.data === frame.data && previous.frameAt === frame.frameAt &&
              previous.mode === frame.mode && previous.constellations === frame.constellations &&
              previous.stellarSupplement === frame.stellarSupplement &&
              previous.constellationsEnabled === frame.constellationsEnabled &&
              previous.sdssOpticalImage?.image === paintedSdssOpticalImage?.image &&
              previous.sdssOpticalImage?.reference === paintedSdssOpticalImage?.reference &&
              previous.sdssOpticalImage?.publicationHash === paintedSdssOpticalImage?.publicationHash &&
              previous.sdssOpticalImage?.fieldDegrees === paintedSdssOpticalImage?.fieldDegrees &&
              previous.sdssOpticalImage?.level === paintedSdssOpticalImage?.level &&
              previous.deepSkyImage?.image === paintedDeepSkyImage?.image &&
              previous.landscape === paintedLandscape &&
              previous.suppressedBodyReferences.length === suppressedBodyReferences.length &&
              previous.suppressedBodyReferences.every((reference, index) => reference === suppressedBodyReferences[index]) &&
              previous.resolvedBodyReferences.length === resolvedBodyReferences.length &&
              previous.resolvedBodyReferences.every((reference, index) => reference === resolvedBodyReferences[index])
              ? previous : { data: frame.data, frameAt: frame.frameAt, mode: frame.mode,
                constellations: frame.constellations, constellationsEnabled: frame.constellationsEnabled,
                stellarSupplement: frame.stellarSupplement,
                sdssOpticalImage: paintedSdssOpticalImage, deepSkyImage: paintedDeepSkyImage,
                resolvedBodyReferences, suppressedBodyReferences, landscape: paintedLandscape } : null);
          if (frame.sceneReady) orientation.presented.current = basis;
          setPresentedCamera(previous => previous?.basis === basis && previous.fov === fov && previous.center.x === center.x && previous.center.y === center.y ? previous : { basis, fov, center });
          if (camera.animating && browsingTimerRef.current === null) {
            browsingTimerRef.current = setTimeout(() => { browsingTimerRef.current = null; browsingDrawRef.current(); }, 16);
          }
        }, done, fov, frame.deepSkyImage?.canvasGeneration === canvasGenerationRef.current ? frame.deepSkyImage : null, basis, center, asset => {
          deepSkyImageFailureRef.current = `deep-sky-image:${asset.reference}:${asset.level}`;
          setDeepSkyImageState("ERROR");
        }, { frame: frame.constellations, images: frame.nativeImageGeneration === canvasGenerationRef.current ? frame.constellationImages : EMPTY_SKY_IMAGES,
          enabled: frame.constellationsEnabled, failed: image => artworkFailureRef.current(image) },frame.stellarSupplement,
        () => setSolarLightUnavailable(true), () => setMoonDiscUnavailable(true), () => setPlanetDiscUnavailable(true),
        () => setSunDiscUnavailable(true),
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.hipsTiles : [],
        tile => dispatchSkyHipsImageFailure(tile,wideFieldFailureRef.current,opticalFailureRef.current),
        () => setGalacticBandUnavailable(true),
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.moonTexture : null,
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.marsTexture : null,
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.galacticImage : null,
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.mercuryTexture : null,
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.jupiterBands : null,
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.saturnBands : null,
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.sdssOpticalImage : null,
        image => sdssOpticalFailureRef.current(image),
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.uranusBands : null,
        frame.nativeImageGeneration === canvasGenerationRef.current ? frame.neptuneBands : null,
        { enabled: frame.landscapeEnabled,
          panorama: frame.nativeImageGeneration === canvasGenerationRef.current ? frame.landscapePanorama : null,
          availability: available => setLandscapeUnavailable(!available) }, frame.coordinateGrids);
    },
    sameScene: (completed, latest) => completed.data === latest.data && completed.frameAt === latest.frameAt &&
      completed.mode === latest.mode && completed.verticalFovDeg === latest.verticalFovDeg &&
      completed.nativeImageGeneration === latest.nativeImageGeneration && completed.deepSkyImage?.image === latest.deepSkyImage?.image &&
      completed.sdssOpticalImage?.image === latest.sdssOpticalImage?.image &&
      completed.sdssOpticalImage?.level === latest.sdssOpticalImage?.level &&
      completed.sdssOpticalImage?.reference === latest.sdssOpticalImage?.reference &&
      completed.sdssOpticalImage?.publicationHash === latest.sdssOpticalImage?.publicationHash &&
      completed.sdssOpticalImage?.fieldDegrees === latest.sdssOpticalImage?.fieldDegrees &&
      completed.sdssOpticalImage?.coarser?.image === latest.sdssOpticalImage?.coarser?.image &&
      completed.sdssOpticalImage?.coarser?.fieldDegrees === latest.sdssOpticalImage?.coarser?.fieldDegrees &&
      completed.sdssOpticalImage?.coarser?.level === latest.sdssOpticalImage?.coarser?.level &&
      completed.constellations === latest.constellations && completed.constellationImages === latest.constellationImages &&
      completed.hipsTiles === latest.hipsTiles &&
      completed.moonTexture === latest.moonTexture &&
      completed.marsTexture === latest.marsTexture &&
      completed.mercuryTexture === latest.mercuryTexture &&
      completed.jupiterBands === latest.jupiterBands &&
      completed.saturnBands === latest.saturnBands &&
      completed.neptuneBands === latest.neptuneBands &&
      completed.uranusBands === latest.uranusBands &&
      completed.galacticImage === latest.galacticImage &&
      completed.constellationsEnabled === latest.constellationsEnabled &&
      completed.landscapeEnabled === latest.landscapeEnabled &&
      completed.coordinateGrids === latest.coordinateGrids &&
      completed.landscapePanorama === latest.landscapePanorama &&
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
      setPresentedSkyFrame(null);
      setCanvasSize(previous => previous.width === 0 && previous.height === 0 ? previous : { width: 0, height: 0 });
    },
    failed: (error, frame) => {
      setPresentedSkyFrame(null);
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
  const [selectedCatalogObject, setSelectedCatalogObject] = useState<SkyObjectIdentity | null>(null);
  const objectSelection = useMemo(() => createSkyObjectSelection(), []);
  const [selectionState, setSelectionState] = useState(() => objectSelection.snapshot());
  useEffect(() => {
    if (objectSelection.snapshot().spotId && objectSelection.snapshot().spotId !== routeContext.spotId)
      setSelectionState(objectSelection.clear());
  }, [routeContext.spotId, objectSelection]);
  const [catalogPickChoices, setCatalogPickChoices] = useState<readonly PaintedSkyObject[]>([]);
  const [catalogListLimit, setCatalogListLimit] = useState(24);
  const [verticalFovDeg, setVerticalFovState] = useState(SKY_VERTICAL_FOV_DEG);
  const [skyFeedbackMount] = useState(() => __MINIAPP_SKY_FEEDBACK_ID__ ? ++skyFeedbackMountSequence : 0);
  const [skyFeedbackTrace, setSkyFeedbackTrace] = useState({ event: "mounted", minFov: SKY_VERTICAL_FOV_DEG, cancels: 0 });
  const skyFeedbackTraceRef = useRef(skyFeedbackTrace);
  const recordSkyFeedback = (event: string, fov = zoomRef.current, flush = false) => {
    if (!__MINIAPP_SKY_FEEDBACK_ID__) return;
    const previous = skyFeedbackTraceRef.current;
    const next = {
      event,
      minFov: Math.min(previous.minFov, fov),
      cancels: previous.cancels + Number(event === "cancel"),
    };
    skyFeedbackTraceRef.current = next;
    if (flush) setSkyFeedbackTrace(next);
  };
  const setVerticalFovDeg = useCallback((value: number | ((previous: number) => number)) => {
    const next = typeof value === "function" ? value(zoomRef.current) : value;
    zoomRef.current = next;
    setVerticalFovState(next);
  }, []);
  const [deepSkyImageAsset, storeDeepSkyImageAsset] = useState<OwnedDeepSkyImageAsset | null>(null);
  const [canvasDeepSkyImage, storeCanvasDeepSkyImage] = useState<SkyCanvasImageAsset | null>(null);
  const deepSkyImageFileRef = useRef<OwnedDeepSkyImageAsset | null>(null);
  const canvasDeepSkyImageRef = useRef<SkyCanvasImageAsset | null>(null);
  const deepSkyRecoveryFileRef = useRef<OwnedDeepSkyImageAsset | null>(null);
  // Requested and last decoded files can differ while a finer level fails.
  // Recovery retains file metadata, never a bitmap from a retired Canvas.
  const setDeepSkyImageAsset = useCallback((next: OwnedDeepSkyImageAsset | null) => {
    const previous = deepSkyImageFileRef.current;
    deepSkyImageFileRef.current = next;
    storeDeepSkyImageAsset(next);
    if (previous && previous.tempFilePath !== next?.tempFilePath && previous.tempFilePath !== deepSkyRecoveryFileRef.current?.tempFilePath) previous.release();
  }, []);
  const setCanvasDeepSkyImage = useCallback((value: SkyCanvasImageAsset | null | ((previous: SkyCanvasImageAsset | null) => SkyCanvasImageAsset | null)) => {
    const previous = canvasDeepSkyImageRef.current;
    const previousFile = deepSkyRecoveryFileRef.current;
    const next = typeof value === "function" ? value(previous) : value;
    canvasDeepSkyImageRef.current = next;
    if (next) {
      const { image, canvasGeneration, ...file } = next;
      deepSkyRecoveryFileRef.current = file;
    } else deepSkyRecoveryFileRef.current = null;
    storeCanvasDeepSkyImage(next);
    if (previousFile && previousFile.tempFilePath !== next?.tempFilePath && previousFile.tempFilePath !== deepSkyImageFileRef.current?.tempFilePath) previousFile.release();
  }, []);
  const retireDeepSkyDecode = useCallback(() => {
    const previous = canvasDeepSkyImageRef.current;
    if (!previous) return;
    previous.image.onload = null;
    previous.image.onerror = null;
    canvasDeepSkyImageRef.current = null;
    storeCanvasDeepSkyImage(null);
  }, []);
  retireDeepSkyDecodeRef.current = retireDeepSkyDecode;
  useEffect(() => () => {
    deepSkyImageFileRef.current?.release();
    deepSkyRecoveryFileRef.current?.release();
    deepSkyImageFileRef.current = null;
    deepSkyRecoveryFileRef.current = null;
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
    trackingCheckpoint: SkyObjectTrackingState;
    originalManualBasis: SkyViewBasis | null;
    startCenter: SkyProjectionCenter;
  } | null>(null);
  const cancelSkyGestureRef = useRef(() => { skyTapRef.current = null; });
  const settleSkyGestureForViewportRef = useRef(() => { skyTapRef.current = null; });

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
  const committedAt = activeContext?.selectedAtUtc ?? routeContext.selectedAt;
  const timeBinding = activeContext ? `${activeContext.contextId}:${activeContext.revision}:${activeContext.contextFingerprint}` : "";
  const timeModel = useMemo(() => skyPresentationTimeModel(rawReportData), [rawReportData]);
  useEffect(() => {
    if (!timeBinding) return;
    setTimeIntent(observationTime.bind(timeBinding, committedAt, timeModel));
  }, [observationTime, timeBinding, committedAt, timeModel]);
  const requestedAt = timeIntent.binding === timeBinding && timeIntent.committedAt === committedAt
    ? timeIntent.at : committedAt;
  const timePresentation = useMemo(() => presentSkyTime(rawReportData, requestedAt), [rawReportData, requestedAt]);
  const timePlaying = timeIntent.binding === timeBinding && timeIntent.mode === "PLAYING";
  const fineTargetBinding = timePresentation?.mode === "MODEL" && !timePlaying && rawReportData ? {
    spotId: rawReportData.context.spotId,
    contextId: rawReportData.context.contextId,
    contextRevision: rawReportData.context.contextRevision,
    contextFingerprint: rawReportData.context.contextFingerprint,
    at: requestedAt,
  } : null;
  const fineTarget = useResourceQuery({
    queryKey: ["spot-sky-target-instant", timeBinding, rawReportData?.context.dataRevision,
      fineTargetBinding?.at ?? ""],
    queryFn: signal => getSkyTargetInstant(fineTargetBinding!, signal),
    enabled: pageVisible && Boolean(fineTargetBinding),
    staleTime: 60_000,
  });
  const fineTargetData = fineTargetBinding && fineTarget.data?.data &&
    fineTarget.data.data.at === fineTargetBinding.at &&
    fineTarget.data.data.contextFingerprint === fineTargetBinding.contextFingerprint &&
    fineTarget.data.data.contextRevision === fineTargetBinding.contextRevision
    ? fineTarget.data.data : null;
  const geometryReport = useMemo(() => timePresentation?.report && fineTargetData
    ? { ...timePresentation.report, targets: fineTargetData.targets,
      targetFrames: [{ at: fineTargetData.at, targets: fineTargetData.targets }] }
    : timePresentation?.report, [timePresentation?.report, fineTargetData]);
  useEffect(() => {
    if (!timePlaying) return;
    if (!pageVisible || contextSession.busy || timeSaving || alignmentEditing || report.isError ||
      !geometryReport || report.data?.dataState === "EXPIRED" || report.data?.dataState === "UNAVAILABLE") {
      setTimeIntent(observationTime.pause());
      return;
    }
    // Reuse the native presentation cadence; elapsed time remains 1x even
    // when rendering coalesces or scheduling is delayed.
    const timer = setInterval(() => setTimeIntent(observationTime.tick(Date.now())), 16);
    return () => clearInterval(timer);
  }, [observationTime, timePlaying, pageVisible, contextSession.busy, timeSaving, alignmentEditing,
    report.isError, Boolean(geometryReport), report.data?.dataState]);
  const stellarReference = rawReportData?.skyScene.state === "AVAILABLE" ? rawReportData.skyScene.catalog : null;
  const stellarCatalog = useResourceQuery({
    queryKey: ["stellar-catalog", stellarReference?.catalogVersion, stellarReference?.catalogHash],
    queryFn: signal => getStellarCatalog(stellarReference!, signal),
    enabled: pageVisible && Boolean(stellarReference),
    staleTime: Infinity,
  });
  const reportData = useMemo(() => geometryReport ? attachSkyCatalog(geometryReport, stellarCatalog.data?.data) : undefined,
    [geometryReport, stellarCatalog.data?.data]);
  const positionPresentation = useMemo<SkyPositionPresentation | undefined>(() =>
    reportData && report.data
      ? { source: report.data, rendered: reportData, anchorAt: timeModel?.startAt ?? requestedAt }
      : undefined,
    [reportData, report.data, timeModel?.startAt, requestedAt]);
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
    autoRestoreAttemptedRef.current = false;
    void report.refetch();
    if (stellarReference) void stellarCatalog.refetch();
  };
  useEffect(() => {
    if (selectedCatalogObject)
      setFocusedDeepSkyReference(selectedCatalogObject.kind === "GALAXY" || selectedCatalogObject.kind === "NEBULA" ? selectedCatalogObject.reference : null);
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
    if (!pageVisible) { retireDeepSkyDecode(); return; }
    const node = canvasNodeRef.current;
    if (!selectedDeepSkyEntry || !desiredDeepSkyImageLevel) {
      setCanvasDeepSkyImage(null);
      return;
    }
    // Retain this object's decoded coarse image while the finer file loads or
    // retries. An image for a different selected object must never survive.
    if (deepSkyRecoveryFileRef.current?.reference !== selectedDeepSkyEntry.objectRef) setCanvasDeepSkyImage(null);
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
    const retained = deepSkyRecoveryFileRef.current;
    const needsRecovery = retained && canvasDeepSkyImageRef.current?.canvasGeneration !== generation;
    // A decoded object never crosses native canvas generations. Re-decode its
    // still-owned coarse file while the requested finer level recovers.
    if (needsRecovery && retained.tempFilePath !== deepSkyImageAsset?.tempFilePath) decode(retained, false);
    if (deepSkyImageAsset?.reference === selectedDeepSkyEntry.objectRef && deepSkyImageAsset.level === desiredDeepSkyImageLevel) {
      deepSkyImageFailureRef.current = null;
      setDeepSkyImageState("LOADING");
      decode(deepSkyImageAsset, true);
    } else if (needsRecovery && retained.tempFilePath === deepSkyImageAsset?.tempFilePath) decode(retained, false);
    return () => {
      active = false;
      for (const image of images) { image.onload = null; image.onerror = null; }
    };
  }, [pageVisible, canvasNodeRevision, deepSkyImageAsset, selectedDeepSkyEntry, desiredDeepSkyImageLevel, retireDeepSkyDecode]);
  useEffect(() => {
    if (!pageVisible || deepSkyImageState !== "ERROR" || !selectedDeepSkyEntry || !desiredDeepSkyImageLevel ||
      deepSkyImageFailureRef.current !== `deep-sky-image:${selectedDeepSkyEntry.objectRef}:${desiredDeepSkyImageLevel}`) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info", title: "深空影像数据异常",
      body: `${selectedDeepSkyEntry.displayName}的巡天影像暂时无法读取，可在天空图中重试。`,
      dedupeKey: `deep-sky-image:${selectedDeepSkyEntry.objectRef}` });
  }, [pageVisible, deepSkyImageState, notify, selectedDeepSkyEntry, desiredDeepSkyImageLevel]);
  const committedRow = exactSkyTimeFrame(rawReportData?.hourly, committedAt);
  const committedIndex = committedRow
    ? rawReportData!.hourly.indexOf(committedRow)
    : -1;
  const activeIndex = rawReportData?.hourly.reduce((index, frame, position) =>
    Date.parse(frame.at) <= Date.parse(requestedAt) ? position : index, committedIndex) ?? committedIndex;
  const row = timePresentation?.row;
  // No report frame or pointing basis means no sky to paint. Do not leave an
  // empty native surface over the recovery and error controls.
  const nativeCanvasMounted = Boolean(pageVisible && reportData && row && !report.isError &&
    report.data?.dataState !== "EXPIRED" && report.data?.dataState !== "UNAVAILABLE" &&
    (manualBasis || devicePose || orientation.presented.current));
  const isPreviewing = requestedAt !== committedAt;
  const rowTime = formatTime(row?.at ?? committedAt, routeContext.timezone);
  const presentedAt = row?.at ?? committedAt;
  const selectedCivilDate = contextComplete ? civilDateForInstant(
    presentedAt,
    routeContext.timezone,
  ) : "";
  const dateOptions = useMemo(
    () => contextComplete ? observationDateOptions(new Date(), routeContext.timezone) : [],
    [contextComplete, routeContext.timezone],
  );
  const todayCivilDate = dateOptions[7] ?? selectedCivilDate;
  const sensorHeadingForScene = devicePose?.headingDeg ?? null;
  const sensorBasis = devicePose?.basis ?? null;
  const currentViewBasis = presentedCamera?.basis ?? manualBasis ?? sensorBasis;
  const presentedFov = presentedCamera?.fov ?? verticalFovDeg;
  const presentedCenter = presentedCamera?.center ?? skyViewportCenter(canvasSize.width, canvasSize.height, 0);
  const starSunAltitudeDeg = mode === "OBSERVATION" ? undefined : skySolarLightAt(reportData?.hourly,row?.at)?.altitudeDeg;
  const stellarSupplement=useSkyStellarSupplement(reportData?.skyScene,row?.at,currentViewBasis?{
    basis:currentViewBasis,width:canvasSize.width,height:canvasSize.height,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    pageVisible&&Boolean(rawReportData)&&report.data?.dataState!=='EXPIRED'&&report.data?.dataState!=='UNAVAILABLE'&&!report.isError,
    starSunAltitudeDeg);
  const optical=useSkyOpticalHips(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  opticalFailureRef.current=optical.failedImage;
  const sdssOptical = useSkySdssOptical(selectedDeepSkyEntry?.objectRef ?? null, verticalFovDeg,
    canvasNodeRef.current, canvasNodeRevision,
    pageVisible && deepSkyRegistrationReady && Boolean(rawReportData) && mode !== "OBSERVATION" &&
      report.data?.dataState !== "EXPIRED" && report.data?.dataState !== "UNAVAILABLE" && !report.isError);
  sdssOpticalFailureRef.current = sdssOptical.failedImage;
  const wideField=useSkyWideFieldW3(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&wideFieldEnabled&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  wideFieldFailureRef.current=wideField.failedImage;
  const moonTexture=useSkyMoonTexture(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  moonTextureFailureRef.current=moonTexture.failedImage;
  const marsTexture=useSkyMarsTexture(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  marsTextureFailureRef.current=marsTexture.failedImage;
  const mercuryTexture=useSkyMercuryTexture(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  mercuryTextureFailureRef.current=mercuryTexture.failedImage;
  const jupiterBands=useSkyJupiterBands(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  jupiterBandsFailureRef.current=jupiterBands.failedImage;
  const saturnBands=useSkySaturnBands(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  saturnBandsFailureRef.current=saturnBands.failedImage;
  const uranusBands=useSkyUranusBands(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  uranusBandsFailureRef.current=uranusBands.failedImage;
  const neptuneBands=useSkyNeptuneBands(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
      report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  neptuneBandsFailureRef.current=neptuneBands.failedImage;
  const galacticImage=useSkyGalacticImage(geometryReport,row?.at,presentedFov,canvasNodeRef.current,
    canvasNodeRevision,pageVisible&&Boolean(rawReportData)&&mode!=="OBSERVATION"&&
    !(wideFieldEnabled&&presentedFov>=60)&&
    report.data?.dataState!=="EXPIRED"&&report.data?.dataState!=="UNAVAILABLE"&&!report.isError);
  galacticImageFailureRef.current=galacticImage.failedImage;
  const hipsTiles=useMemo(()=>[...wideField.tiles,...optical.tiles],[wideField.tiles,optical.tiles]);
  useEffect(()=>{
    if(!stellarSupplement.failed)return;
    notify({owner:'spot-night',placement:'floating',tone:'info',title:'暗星资料加载异常',
      body:'可重试加载，已取得的亮星与天体资料仍可查看。',dedupeKey:'sky-stellar-supplement'});
  },[stellarSupplement.failed,notify]);
  const constellationFrame = useMemo(() => resolveConstellationFrame(constellationCatalog.data?.data,geometryReport?.skyScene,row?.at),
    [constellationCatalog.data?.data,rawReportData?.skyScene,row?.at]);
  const coordinateGridFrame = useMemo(() => report.data?.dataState === "EXPIRED" ||
    report.data?.dataState === "UNAVAILABLE" || report.isError ? null : exactSkyObservationFrame(geometryReport, row?.at),
    [geometryReport, row?.at, report.data?.dataState, report.isError]);
  const visibleFigures = constellationFrame && currentViewBasis && constellationVisibility(presentedFov,constellationsEnabled)>0
    ? constellationFrame.images.filter(figure => artworkIntersectsView(figure.registration,
      {basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter},canvasSize.width,canvasSize.height)).map(figure=>figure.source) : [];
  const artwork = useSkyArtwork(canvasNodeRef.current,canvasNodeRevision,constellationCatalog.data?.data.catalogHash,
    pageVisible && constellationsEnabled && Boolean(rawReportData) && report.data?.dataState !== "EXPIRED" && report.data?.dataState !== "UNAVAILABLE" && !report.isError,visibleFigures);
  artworkFailureRef.current=artwork.failedImage;
  const landscapeImage = useSkyLandscape(canvasNodeRef.current, canvasNodeRevision,
    pageVisible && landscapeEnabled && Boolean(rawReportData) &&
    report.data?.dataState !== "EXPIRED" && report.data?.dataState !== "UNAVAILABLE" && !report.isError,
    [...artwork.images.values(), ...hipsTiles.map(tile => tile.image), canvasDeepSkyImage?.image, sdssOptical.image,
      galacticImage.image, moonTexture.image, marsTexture.image, mercuryTexture.image, jupiterBands.image,
      saturnBands.image, uranusBands.image, neptuneBands.image].filter((image): image is object => Boolean(image)),
    artwork.loading || constellationCatalog.isFetching || wideField.loading || optical.loading || sdssOptical.loading ||
      galacticImage.loading || moonTexture.loading || marsTexture.loading || mercuryTexture.loading ||
      jupiterBands.loading || saturnBands.loading || uranusBands.loading || neptuneBands.loading);
  landscapeImageFailureRef.current = landscapeImage.failedImage;
  const constellationFailed = constellationsEnabled && (artwork.failed || constellationCatalog.isError || Boolean(constellationCatalog.refreshError) || constellationCatalog.data?.dataState === "STALE_USABLE");
  useEffect(() => {
    if (!pageVisible || !constellationFailed) return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"星座资料加载异常",
      body:"可重试加载，已取得的星图与天体资料仍可查看。",dedupeKey:"sky-constellations"});
  },[pageVisible,constellationFailed,notify]);
  const retryNativeImage = (retry: () => boolean) => {
    // Ordinary transport/decode retries keep independent valid images and the
    // current canvas. Only the shared loader's GPU failure requires a reset.
    if (retry()) canvasLifecycle.resize();
  };
  const retryConstellations = () => {
    // Assets may return 404 after a server publication change. Refresh the
    // immutable catalog too, otherwise Infinity cache repeats the old hash.
    void constellationCatalog.refetch();
    retryNativeImage(artwork.retryImages);
  };
  const retryOptical = () => retryNativeImage(optical.retry);
  const retrySdssOptical = () => retryNativeImage(sdssOptical.retry);
  const retryWideField = () => retryNativeImage(wideField.retry);
  const retryMoonTexture=()=>retryNativeImage(moonTexture.retry);
  const retryMarsTexture=()=>retryNativeImage(marsTexture.retry);
  const retryMercuryTexture=()=>retryNativeImage(mercuryTexture.retry);
  const retryJupiterBands=()=>retryNativeImage(jupiterBands.retry);
  const retrySaturnBands=()=>retryNativeImage(saturnBands.retry);
  const retryNeptuneBands=()=>retryNativeImage(neptuneBands.retry);
  const retryUranusBands=()=>retryNativeImage(uranusBands.retry);
  const retryGalacticImage=()=>retryNativeImage(galacticImage.retry);
  const retryLandscapeImage=()=>retryNativeImage(landscapeImage.retry);
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
    if (__MINIAPP_SKY_FEEDBACK_ID__) recordSkyFeedback("viewport", undefined, true);
    settleSkyGestureForViewportRef.current();
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
    stopObjectTracking();
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
      (skySceneHasContent(canvasData, row?.at) || constellationFrame?.at === row?.at));
    publishAcceptanceSkySceneInspection(owner, { ...canvasFrameInfo.inspection, state: "PENDING", drawRevision: canvasDrawRevisionRef.current });
    canvasLifecycle.request({ nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,
      data: canvasData, frameAt: row?.at, heading, pose, manualBasis: selectedManualBasis, mode,
      verticalFovDeg, deepSkyImage: mode === "OBSERVATION" ? null : canvasDeepSkyImage,
      sdssOpticalImage: canvasData && mode !== "OBSERVATION" && sdssOptical.image &&
        sdssOptical.fieldDegrees && sdssOptical.renderedLevel && sdssOptical.publication
        ? { image: sdssOptical.image, fieldDegrees: sdssOptical.fieldDegrees, level: sdssOptical.renderedLevel,
          reference: sdssOptical.publication.objectRef, publicationHash: sdssOptical.publication.publicationHash,
          coarser: sdssOptical.coarser } : null,
      constellations: canvasData ? constellationFrame : null, constellationImages: artwork.images, constellationsEnabled, landscapeEnabled, coordinateGrids,
      hipsTiles:canvasData?hipsTiles:[],moonTexture:canvasData?moonTexture.image:null,
      marsTexture:canvasData?marsTexture.image:null,mercuryTexture:canvasData?mercuryTexture.image:null,
      jupiterBands:canvasData?jupiterBands.image:null,
      saturnBands:canvasData?saturnBands.image:null,
      neptuneBands:canvasData?neptuneBands.image:null,
      uranusBands:canvasData?uranusBands.image:null,
      galacticImage:canvasData?galacticImage.image:null,
      landscapePanorama:canvasData?landscapeImage.panorama:null,
      stellarSupplement:canvasData?stellarSupplement.frame:null,
      sceneReady, owner, inspection: canvasFrameInfo.inspection },
      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode);
    previousCanvasModeRef.current = mode;
  }, [canvasLifecycle, canvasNodeRevision, canvasFrameInfo, mode, report.data?.dataState, report.isError, reportData, row?.at, sensorHeadingForScene, sensorBasis, devicePose, manualBasis, verticalFovDeg, canvasDeepSkyImage, sdssOptical.image, sdssOptical.fieldDegrees, sdssOptical.renderedLevel, sdssOptical.coarser, sdssOptical.publication, orientation.snapshot.presentationRevision, viewportInsets, constellationFrame, artwork.images, constellationsEnabled,landscapeEnabled,coordinateGrids,stellarSupplement.frame,hipsTiles,moonTexture.image,marsTexture.image,mercuryTexture.image,jupiterBands.image,saturnBands.image,uranusBands.image,neptuneBands.image,galacticImage.image,landscapeImage.panorama]);
  browsingDrawRef.current = draw;

  useReady(() => { canvasLifecycle.setMounted(Boolean(contextComplete && activeContext && nativeCanvasMounted)); canvasLifecycle.ready(); draw(); });
  useResize(() => { canvasLifecycle.resize(); draw(); measureBottomControls(); });
  useEffect(() => {
    measureBottomControls();
  }, [measureBottomControls, Boolean(manualBasis), followRequested, alignment.mode, alignment.ready,
    compassState, orientationObjectListOpen, skyControlPanel, themeClass, canvasSize.width, canvasSize.height, Boolean(reportData), coordinateGrids, Boolean(coordinateGridFrame), constellationFailed,stellarSupplement.failed,optical.failed,wideField.failed]);
  useEffect(() => { measureBottomControls(); }, [measureBottomControls, skyInlineNotice, skyInlineNoticeResidual]);
  useDidHide(() => { viewportActiveRef.current = false; viewportMeasurementRevision.current++; cancelSkyGestureRef.current(); stopBrowsingAnimation(); canvasLifecycle.hide(); hideCompass(); });
  useDidShow(() => { viewportActiveRef.current = true; canvasLifecycle.show(); showCompass(); measureBottomControls(); });
  useEffect(() => {
    canvasLifecycle.setMounted(Boolean(contextComplete && activeContext && nativeCanvasMounted));
    // Include every report transition: error/expiry submits a clear frame,
    // while the single native writer discards superseded completion callbacks.
    draw();
  }, [activeIndex, activeContext, contextComplete, nativeCanvasMounted, canvasLifecycle, draw, reportData]);

  useEffect(() => {
    setPreviewIndex(null);
    setOrientationObjectListOpen(false);
  }, [committedAt, routeContext.localDate, routeContext.spotId]);
  useEffect(() => {
    cancelSkyGestureRef.current();
  }, [timePlaying ? timeIntent.runStartAt : row?.at, mode, selectedCatalogObject, selectedTargetId, orientationObjectListOpen, skyControlPanel, datePickerOpen]);

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
    } else if (dataState === "PARTIAL") {
      const solarWarning = report.data?.warnings.find(message => message.includes("太阳精确位置"));
      if (solarWarning) notify({ ...base, tone: "info", title: "晨昏光照资料暂缺",
        body: solarWarning, dedupeKey: `spot-night-solar-data:${routeContext.spotId}:${routeContext.localDate}` });
      const moonWarning = report.data?.warnings.find(message => message.includes("月球精确位置"));
      if (moonWarning) notify({ ...base, tone: "info", title: "月球外观资料暂缺",
        body: moonWarning, dedupeKey: `spot-night-moon-data:${routeContext.spotId}:${routeContext.localDate}` });
      const planetWarning = report.data?.warnings.find(message => message.includes("行星精确位置"));
      if (planetWarning) notify({ ...base, tone: "info", title: "行星外观资料暂缺",
        body: planetWarning, dedupeKey: `spot-night-planet-data:${routeContext.spotId}:${routeContext.localDate}` });
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

  useEffect(() => {
    if (!pageVisible || mode === "OBSERVATION" || !solarLightUnavailable) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info",
      title: "晨昏光照暂不可绘制", body: "星点与其他天空资料仍可使用；可重试晨昏图层。",
      dedupeKey: `spot-night-solar-light:${routeContext.spotId}` });
  }, [mode, notify, pageVisible, routeContext.spotId, solarLightUnavailable]);

  useEffect(() => {
    if (!pageVisible || !landscapeEnabled || !landscapeUnavailable) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info",
      title: "模拟地景暂不可绘制", body: "几何地平线、星点与资料仍可使用；可重试模拟地景。",
      dedupeKey: `spot-night-landscape:${routeContext.spotId}` });
  }, [landscapeEnabled, landscapeUnavailable, notify, pageVisible, routeContext.spotId]);

  useEffect(() => {
    if (!pageVisible || mode === "OBSERVATION" || !galacticBandUnavailable) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info",
      title: "银河方位示意暂不可绘制", body: "星点与其他天空资料仍可使用；可重试银河图层。",
      dedupeKey: `spot-night-galactic-band:${routeContext.spotId}` });
  }, [galacticBandUnavailable, mode, notify, pageVisible, routeContext.spotId]);

  useEffect(() => {
    if (!pageVisible || !moonDiscUnavailable) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info",
      title: "月球外观暂不可绘制", body: "星场与月相资料仍可使用；可重试月球图层。",
      dedupeKey: `spot-night-moon-disc:${routeContext.spotId}` });
  }, [notify, pageVisible, routeContext.spotId, moonDiscUnavailable]);

  useEffect(()=>{
    if(!pageVisible||!moonTexture.failed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"月面影像暂不可用",
      body:"月相和月球位置仍可查看，可重试加载月面影像。",dedupeKey:`spot-night-moon-texture:${routeContext.spotId}`});
  },[pageVisible,moonTexture.failed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!moonTexture.refreshFailed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"月面影像来源更新失败",
      body:"已加载的历史月面仍可查看；可重试更新来源。",dedupeKey:`spot-night-moon-texture-refresh:${routeContext.spotId}`});
  },[pageVisible,moonTexture.refreshFailed,notify,routeContext.spotId]);

  useEffect(()=>{
    if(!pageVisible||!marsTexture.failed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"火星表面影像暂不可用",
      body:"火星位置和相位仍可查看，可重试加载表面影像。",dedupeKey:`spot-night-mars-texture:${routeContext.spotId}`});
  },[pageVisible,marsTexture.failed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!marsTexture.refreshFailed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"火星影像来源更新失败",
      body:"已加载的历史表面影像仍可查看；可重试更新来源。",dedupeKey:`spot-night-mars-texture-refresh:${routeContext.spotId}`});
  },[pageVisible,marsTexture.refreshFailed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!mercuryTexture.failed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"水星表面影像暂不可用",
      body:"水星位置和相位仍可查看，可重试加载表面影像。",dedupeKey:`spot-night-mercury-texture:${routeContext.spotId}`});
  },[pageVisible,mercuryTexture.failed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!mercuryTexture.refreshFailed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"水星影像来源更新失败",
      body:"已加载的历史表面影像仍可查看；可重试更新来源。",dedupeKey:`spot-night-mercury-texture-refresh:${routeContext.spotId}`});
  },[pageVisible,mercuryTexture.refreshFailed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!jupiterBands.failed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"木星历史云带暂不可用",
      body:"木星位置、扁球轮廓和相位仍可查看；可重试加载云带。",
      dedupeKey:`spot-night-jupiter-bands:${routeContext.spotId}`});
  },[pageVisible,jupiterBands.failed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!jupiterBands.refreshFailed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"木星云带来源更新失败",
      body:"已加载的历史云带仍可查看；可重试更新来源。",
      dedupeKey:`spot-night-jupiter-bands-refresh:${routeContext.spotId}`});
  },[pageVisible,jupiterBands.refreshFailed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!saturnBands.failed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"土星历史云带暂不可用",
      body:"土星位置、环与相位仍可查看；可重试加载云带。",
      dedupeKey:`spot-night-saturn-bands:${routeContext.spotId}`});
  },[pageVisible,saturnBands.failed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!saturnBands.refreshFailed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"土星云带来源更新失败",
      body:"已加载的历史云带仍可查看；可重试更新来源。",
      dedupeKey:`spot-night-saturn-bands-refresh:${routeContext.spotId}`});
  },[pageVisible,saturnBands.refreshFailed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!neptuneBands.failed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"海王星历史云带暂不可用",
      body:"海王星位置、环与相位仍可查看；可重试加载云带。",
      dedupeKey:`spot-night-neptune-bands:${routeContext.spotId}`});
  },[pageVisible,neptuneBands.failed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!neptuneBands.refreshFailed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"海王星云带来源更新失败",
      body:"已加载的历史云带仍可查看；可重试更新来源。",
      dedupeKey:`spot-night-neptune-bands-refresh:${routeContext.spotId}`});
  },[pageVisible,neptuneBands.refreshFailed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!uranusBands.failed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"天王星历史云带暂不可用",
      body:"天王星位置、环与相位仍可查看；可重试加载云带。",
      dedupeKey:`spot-night-uranus-bands:${routeContext.spotId}`});
  },[pageVisible,uranusBands.failed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!uranusBands.refreshFailed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"天王星云带来源更新失败",
      body:"已加载的历史云带仍可查看；可重试更新来源。",
      dedupeKey:`spot-night-uranus-bands-refresh:${routeContext.spotId}`});
  },[pageVisible,uranusBands.refreshFailed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!galacticImage.failed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"银河红外图暂不可用",
      body:"已回退到银河方位示意；可重试加载历史影像。",dedupeKey:`spot-night-galactic-image:${routeContext.spotId}`});
  },[pageVisible,galacticImage.failed,notify,routeContext.spotId]);
  useEffect(()=>{
    if(!pageVisible||!galacticImage.refreshFailed)return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"银河红外图来源更新失败",
      body:"已加载的历史影像仍可查看；可重试更新来源。",dedupeKey:`spot-night-galactic-image-refresh:${routeContext.spotId}`});
  },[pageVisible,galacticImage.refreshFailed,notify,routeContext.spotId]);

  useEffect(() => {
    if (!pageVisible || !planetDiscUnavailable) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info",
      title: "行星外观暂不可绘制", body: "星场和行星目标资料仍可使用；可重试行星图层。",
      dedupeKey: `spot-night-planet-disc:${routeContext.spotId}` });
  }, [notify, pageVisible, routeContext.spotId, planetDiscUnavailable]);

  const commitInstant = async (nextAt: string) => {
    if (orientationController.snapshot().alignment.mode === "editing" || !rawReportData || !activeContext || timeSaving ||
      !presentSkyTime(rawReportData, nextAt)) return;
    setTimeIntent(observationTime.pause());
    if (Date.parse(nextAt) === Date.parse(committedAt)) {
      setPreviewIndex(null);
      return;
    }
    const request = contextSession.begin(activeContext);
    if (!request) return;
    setTimeSaving(true);
    try {
      const response = await updateObservationContext(activeContext, {
        selectedAt: nextAt,
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

  const commitIndex = (nextIndex: number) => {
    if (!rawReportData?.hourly.length) return;
    const nextRow = rawReportData.hourly[clampIndex(nextIndex, rawReportData.hourly.length)];
    if (nextRow) void commitInstant(nextRow.at);
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
    if (!rawReportData?.hourly.length) return;
    setPreviewIndex(clampIndex(value, rawReportData.hourly.length));
  };

  const returnToSkyEntry = () => {
    void Taro.navigateBack().catch(() =>
      Taro.switchTab({ url: "/pages/map/index" }),
    );
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
    returnToSkyEntry();
  };

  const closeSkyObjectDisclosure = () => {
    setSelectedTargetId(null);
    setSelectedCatalogObject(null);
    setCatalogPickChoices([]);
  };
  const selectCatalogObject = (object: SkyObjectIdentity) => {
    if (orientationController.snapshot().alignment.mode === "editing") return;
    if (objectTracking.snapshot().target?.reference !== object.reference) stopObjectTracking();
    setSelectionState(objectSelection.select(object, reportData?.context.spotId ?? routeContext.spotId));
    setSelectedTargetId(null);
    setCatalogPickChoices([]);
    setSelectedCatalogObject(object);
  };
  const positionCatalog = (reference: string) => skyLuminaryBody(reference)
    ? skyLuminaryPosition(row, skyLuminaryBody(reference)!)
      ? { catalogVersion: SKY_LUMINARY_CATALOG_VERSION, catalogHash: SKY_LUMINARY_CATALOG_HASH } : null
    : reference.startsWith("SAO:")
    ? stellarSupplement.publication?.index ?? null
    : reference.startsWith("HR:") ? rawReportData?.skyScene.catalog ?? null
      : reference.startsWith("PLANET:") ? row?.at && Array.isArray(row.planets) && row.planets.length === SKY_PLANET_ORDER.length &&
        row.planets.every((planet, index) => validSkyPlanetGeometry(planet, index))
        ? { catalogVersion: SKY_PLANET_CATALOG_VERSION, catalogHash: SKY_PLANET_CATALOG_HASH } : null
        : rawReportData?.skyScene.deepSky?.catalog ?? null;
  const locateCatalogObject = (data: CelestialObjectPositionData) => {
    if (!selectedCatalogObject || data.reference !== selectedCatalogObject.reference || !data.position ||
      !skyObjectPositionIsCurrent(data, reportData?.context, row?.at, positionCatalog(data.reference)) ||
      !pageVisible || contextSession.busy || timeSaving || orientationController.snapshot().alignment.mode === "editing") return false;
    const basis = createSkyViewBasis(data.position.azimuthDeg, 90 + data.position.altitudeDeg, 0);
    if (!basis) return false;
    cancelSkyGestureRef.current();
    setVerticalFovDeg(value => Math.min(value, SKY_VERTICAL_FOV_DEG));
    enterManualView(basis);
    setSelectionState(objectSelection.select(selectedCatalogObject, data.spotId));
    setSelectedCatalogObject(null);
    setCatalogPickChoices([]);
    setOrientationObjectListOpen(false);
    // A located preview belongs to an uncommitted time; keep its cancel/commit
    // control visible until the shared Observation Context owns the result.
    setSkyControlPanel(isPreviewing ? "time" : null);
    return true;
  };
  const trackCatalogObject = (data: CelestialObjectPositionData) => {
    const object = selectedCatalogObject;
    if (!object || !locateCatalogObject(data)) return;
    objectTracking.start(object, data.spotId);
    objectTracking.accept(data, reportData?.context, row?.at, positionCatalog(data.reference));
    setTrackingState(objectTracking.snapshot());
  };
  const applyTrackedPosition = (data: CelestialObjectPositionData) => {
    if (!pageVisible || contextSession.busy || timeSaving || orientationController.snapshot().alignment.mode === "editing" ||
      !objectTracking.accept(data, reportData?.context, row?.at, positionCatalog(data.reference))) return;
    // Keep the newest valid result during a pinch, then apply on release.
    // Updating the local target does not recapture the overview's fixed path.
    if (skyTapRef.current) return;
    const position = data.position!;
    const basis = createSkyViewBasis(position.azimuthDeg, 90 + position.altitudeDeg, 0);
    if (!basis) return;
    manualBasisRef.current = basis;
    setManualBasis(basis);
  };
  const selectSkyTarget = (target: SkyReport["targets"][number]) => {
    if (orientationController.snapshot().alignment.mode === "editing") return;
    setSelectionState(objectSelection.clear());
    stopObjectTracking();
    setSelectedCatalogObject(null);
    setCatalogPickChoices([]);
    setSelectedTargetId(target.targetId);
  };

  const orientationData = reportData && !report.isError &&
    report.data?.dataState !== "EXPIRED" && report.data?.dataState !== "UNAVAILABLE"
    ? reportData : undefined;
  const presentedSceneCurrent = Boolean(orientationData && !canvasError && presentedSkyFrame &&
    presentedSkyFrame.mode === mode &&
    presentedSkyFrame.data?.context === rawReportData?.context && row?.at &&
    skyPresentedTimeCurrent(row.at, presentedSkyFrame.frameAt, timePlaying, timeIntent.runStartAt) &&
    (timePlaying || presentedSkyFrame.data === orientationData));
  const paintedData = presentedSceneCurrent ? presentedSkyFrame?.data : undefined;
  const paintedAt = presentedSceneCurrent ? presentedSkyFrame?.frameAt : undefined;
  const paintedRow = exactSkyTimeFrame(paintedData?.hourly, paintedAt);
  const paintedPositionPresentation = useMemo<SkyPositionPresentation | undefined>(() =>
    paintedData && report.data
      ? { source: report.data, rendered: paintedData, anchorAt: timeModel?.startAt ?? paintedAt! }
      : undefined,
    [paintedData, report.data, timeModel?.startAt, paintedAt]);

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
        <OrientationQuietBack onBack={returnToSkyEntry} />
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
        <OrientationQuietBack onBack={returnToSkyEntry} />
        <View className="sky-orientation-state-page__status">
          <ContextError onBack={returnToSkyEntry} />
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
  const deepSkyImagePresented = Boolean(presentedSceneCurrent && nativeCanvasMounted &&
    canvasSize.width > 0 && canvasSize.height > 0 && presentedSkyFrame?.deepSkyImage);
  const sdssOpticalStatus = sdssOpticalPresentation({
    requested: sdssOptical.requested,
    paintedImage: presentedSkyFrame?.sdssOpticalImage?.image ?? null,
    canvasVisible: nativeCanvasMounted && !canvasError && canvasSize.width > 0 && canvasSize.height > 0,
    failed: sdssOptical.failed,
    loading: sdssOptical.loading,
  });
  const sdssOpticalCurrentImagePresented = Boolean(presentedSkyFrame?.sdssOpticalImage && sdssOptical.publication &&
    presentedSkyFrame.sdssOpticalImage.reference === sdssOptical.publication.objectRef &&
    presentedSkyFrame.sdssOpticalImage.publicationHash === sdssOptical.publication.publicationHash &&
    (presentedSkyFrame.sdssOpticalImage.image === sdssOptical.image ||
      presentedSkyFrame.sdssOpticalImage.image === sdssOptical.coarser?.image));
  const orientationTargetFrame = exactSkyTimeFrame(paintedData?.targetFrames, paintedAt);
  const orientationTargets = orientationTargetFrame?.targets ?? [];
  const fineTargetUnresolved = timePresentation?.mode === "MODEL" && !orientationTargetFrame;
  const fineTargetRetainedStale = Boolean(fineTargetData &&
    (fineTarget.refreshError || fineTarget.data?.dataState === "STALE_USABLE"));
  const selectedTarget = selectedTargetId
    ? orientationTargets.find((target) => target.targetId === selectedTargetId) ?? null
    : null;
  const orientationHeading = compassIsReady && sensorHeadingForScene !== null
    ? `${Math.round(sensorHeadingForScene)}°`
    : "未提供";
  // DOM projections and their mask share the committed camera/frame. The
  // mutable Canvas hit snapshot can already belong to a later native draw.
  const presentedSkyVisibility = presentedSceneCurrent && currentViewBasis && presentedSkyFrame ? {
    width: canvasSize.width, height: canvasSize.height,
    view: { basis: currentViewBasis, verticalFovDeg: presentedFov, center: presentedCenter,
      landscape: presentedSkyFrame.landscape },
  } : null;
  const visibleOrientationTargets = presentedSceneCurrent ? orientationTargets.flatMap((target) => {
    if (skyTargetLabelSuppressed(target, presentedSkyFrame?.resolvedBodyReferences,
      presentedSkyFrame?.suppressedBodyReferences)) return [];
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
    return projection && paintedSkyPointVisible(presentedSkyVisibility, projection.x, projection.y)
      ? [{ target, projection }] : [];
  }) : [];
  const catalogFrameObjects = (() => {
    if (!orientationObjectListOpen) return [];
    const planets: PaintedSkyObject[] = row?.at && Array.isArray(row.planets) && row.planets.length === SKY_PLANET_ORDER.length &&
      row.planets.every((planet, index) => validSkyPlanetGeometry(planet, index))
      ? row.planets.filter(planet => planet.altitudeDeg > 0).map(planet => ({
        reference: `PLANET:${planet.body}`, displayName: SKY_PLANET_NAMES[planet.body].zh,
        kind: "PLANET" as const, magnitude: planet.visualMagnitude, magnitudeBand: "VISUAL" as const, x: 0, y: 0,
      })) : [];
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
    const deepScene = resolveSkyDeepSkyScene(reportData?.skyScene, row?.at);
    const deepCatalog = deepScene?.catalog;
    const deepFrame = deepScene?.frame;
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
    const luminaries: PaintedSkyObject[] = SKY_LUMINARY_ORDER.flatMap(body => {
      const position = skyLuminaryPosition(row, body);
      return position && position.altitudeDeg > 0 ? [{ reference: `SOLAR:${body}`,
        displayName: SKY_LUMINARY_NAMES[body].zh, kind: SKY_LUMINARY_NAMES[body].kind,
        magnitude: null, x: 0, y: 0 }] : [];
    });
    return [...luminaries, ...planets, ...deep, ...stars,...faint].sort((left, right) =>
      Number(left.kind === "STAR") - Number(right.kind === "STAR") ||
      (left.magnitude ?? 99) - (right.magnitude ?? 99) ||
      left.reference.localeCompare(right.reference));
  })();
  const visibleNamedCatalogObjects = (() => {
    const catalog = paintedData?.skyScene.catalog;
    const frame = resolveSkySceneFrame(paintedData?.skyScene, paintedAt);
    if (!presentedSceneCurrent ||
      !currentViewBasis || canvasSize.width <= 0 || canvasSize.height <= 0)
      return [];
    type NamedCandidate = PaintedSkyObject & { auxiliaryOpacity?: number };
    const starCandidates: NamedCandidate[] = !catalog || frame?.state !== "AVAILABLE" || !frame.points ? [] : frame.points.flatMap(([catalogIndex, azimuth, altitude]) => {
      const entry = catalog.entries[catalogIndex];
      if (!entry?.displayName || entry.magnitude > 2.5 || altitude <= 0) return [];
      const appearance = skyStarAppearance(entry.magnitude,presentedFov,
        mode === "OBSERVATION" ? undefined : skySolarLightAt(paintedData?.hourly, paintedAt)?.altitudeDeg,
        mode === "OBSERVATION" ? undefined : altitude);
      if (!appearance || appearance.opacity < .1) return [];
      const projection = projectHorizontalPoint(azimuth, altitude, sensorHeadingForScene, devicePose, canvasSize.width, canvasSize.height, presentedFov, currentViewBasis, presentedCenter);
      return projection && paintedSkyPointVisible(presentedSkyVisibility, projection.x, projection.y)
        ? [{ reference: entry.objectRef, displayName: entry.displayName, kind: "STAR" as const, magnitude: entry.magnitude, x: projection.x, y: projection.y }] : [];
    });
    const deepScene = resolveSkyDeepSkyScene(paintedData?.skyScene, paintedAt);
    const deepCatalog = deepScene?.catalog;
    const deepFrame = deepScene?.frame;
    const deepCandidates: NamedCandidate[] = !deepCatalog || deepFrame?.state !== "AVAILABLE" || !deepFrame.points ? [] : deepFrame.points.flatMap(([catalogIndex, azimuth, altitude]) => {
      if (altitude <= 0) return [];
      const entry = deepCatalog.entries[catalogIndex];
      const projection = entry ? projectHorizontalPoint(azimuth, altitude, sensorHeadingForScene, devicePose, canvasSize.width, canvasSize.height, presentedFov, currentViewBasis, presentedCenter) : null;
      const imagePainted = Boolean(entry && (presentedSkyFrame?.sdssOpticalImage?.reference === entry.objectRef ||
        presentedSkyFrame?.deepSkyImage?.reference === entry.objectRef));
      const auxiliaryOpacity = entry ? deepSkyAuxiliaryOpacity(presentedFov, canvasSize.height, entry.majorAxisArcmin, imagePainted) : 1;
      return entry && projection && auxiliaryOpacity > 0.08 && paintedSkyPointVisible(presentedSkyVisibility, projection.x, projection.y)
        ? [{ reference: entry.objectRef, displayName: entry.displayName, kind: entry.kind,
        magnitude: entry.magnitude, x: projection.x, y: projection.y, auxiliaryOpacity }] : [];
    });
    const candidates = [...deepCandidates, ...starCandidates]
      .sort((left, right) => (left.magnitude ?? 99) - (right.magnitude ?? 99));
    const retained: NamedCandidate[] = [];
    for (const candidate of candidates) {
      if (retained.every((current) => Math.hypot(current.x - candidate.x, current.y - candidate.y) > 46))
        retained.push(candidate);
      if (retained.length === 8) break;
    }
    return retained;
  })();
  const visibleConstellationLabels = presentedSceneCurrent && currentViewBasis && presentedSkyFrame &&
    presentedSkyFrame.constellations?.at === paintedAt &&
    presentedSkyFrame.constellationsEnabled === constellationsEnabled
    ? projectConstellationLabels(presentedSkyFrame.constellations,
      {basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter},
      canvasSize.width,canvasSize.height,constellationsEnabled,
      [...visibleNamedCatalogObjects.map(object=>[object.x,object.y] as const),
        ...visibleOrientationTargets.map(({projection})=>[projection.x,projection.y] as const)])
      .filter(label => paintedSkyPointVisible(presentedSkyVisibility, label.x, label.y))
    : [];
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
            : !row
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
  const skySceneReady = skySceneHasContent(orientationData, row?.at) ||
    Boolean(orientationData && constellationFrame && constellationFrame.at === row?.at);
  const visibleNamedLabels = skySceneReady ? visibleNamedCatalogObjects.filter(
    object => object.reference !== selectionState.object?.reference) : [];
  const onSkyTouchStart = (event: unknown) => {
    if (__MINIAPP_SKY_FEEDBACK_ID__) recordSkyFeedback(`start${(event as SkyTouchLike).touches?.length ?? 0}`);
    if (orientationController.snapshot().alignment.mode === "editing" || !presentedSceneCurrent || !skySceneReady || selectedCatalogObject || selectedTargetId || orientationObjectListOpen || datePickerOpen || timeSaving) return;
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
      trackingCheckpoint: objectTracking.snapshot(),
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
      if (__MINIAPP_SKY_FEEDBACK_ID__) recordSkyFeedback("pinch", fov);
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
    if (__MINIAPP_SKY_FEEDBACK_ID__) recordSkyFeedback(gesture ? "cancel" : "cancel-empty", zoomRef.current, true);
    skyTapRef.current = null;
    if (!gesture) return;
    stopBrowsingAnimation();
    browsingCamera.restore(gesture.cameraCheckpoint);
    if (gesture.dragged) setTrackingState(objectTracking.restore(gesture.trackingCheckpoint));
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
    const trackedPosition = objectTracking.snapshot().position;
    if (trackedPosition) applyTrackedPosition(trackedPosition);
  };
  const settleSkyGestureForViewport = () => {
    // A notice or control can change the usable viewport during a pinch.
    // End that gesture without treating the layout change as user cancellation:
    // the zoom and manual direction already visible to the user stay committed.
    if (!skyTapRef.current) return;
    if (__MINIAPP_SKY_FEEDBACK_ID__) recordSkyFeedback("settle", zoomRef.current, true);
    skyTapRef.current = null;
    stopBrowsingAnimation();
    const trackedPosition = objectTracking.snapshot().position;
    if (trackedPosition) applyTrackedPosition(trackedPosition);
  };
  const beginSkyCalibration = () => {
    // Calibration must freeze the current painted frame. A queued frame or a
    // sensor transition may make begin fail even while a report is available.
    if (contextSession.busy || timeSaving || isPreviewing || !skySceneReady ||
      !presentedSceneCurrent || manualBasisRef.current || !orientationController.begin()) return;
    skyTapRef.current = null;
    stopObjectTracking();
    stopBrowsingAnimation();
    browsingCamera.freeze(orientation.presented.current);
    setVerticalFovDeg(SKY_VERTICAL_FOV_DEG);
  };
  cancelSkyGestureRef.current = onSkyTouchCancel;
  settleSkyGestureForViewportRef.current = settleSkyGestureForViewport;
  const onSkyTouchEnd = (event: unknown) => {
    const remainingTouches = (event as SkyTouchLike).touches?.length ?? 0;
    if (__MINIAPP_SKY_FEEDBACK_ID__) recordSkyFeedback(`end${remainingTouches}`, zoomRef.current, remainingTouches === 0);
    if (orientationController.snapshot().alignment.mode === "editing" || (event as SkyTouchLike).touches?.length) return;
    const gesture = skyTapRef.current;
    skyTapRef.current = null;
    const trackedPosition = objectTracking.snapshot().position;
    if (trackedPosition) applyTrackedPosition(trackedPosition);
    const point = skyTouchPoint(event, true);
    if (gesture && point) gesture.travelPx = Math.max(gesture.travelPx, Math.hypot(point.x - gesture.startX, point.y - gesture.startY));
    // The painter excludes a stale SAO frame; touch must use the same bound
    // publication identity or a valid visible planet/star can become unpickable.
    const identity = skyPickIdentity(paintedData,currentStellarSupplement(presentedSkyFrame?.stellarSupplement,paintedData?.skyScene,paintedAt));
    if (!presentedSceneCurrent || !gesture || gesture.dragged || gesture.edge || !point || !paintedRow || !identity.catalogVersion || !isUnambiguousTapGesture(gesture)) return;
    const pickInput = {
      x: point.x,
      y: point.y,
      frameAt: paintedRow.at,
      catalogVersion: identity.catalogVersion,
      catalogHash: identity.catalogHash,
    };
    // No-result from a stale/missing frame is not a verified blank-sky tap.
    if (!skyPickSnapshotIsCurrent(paintedSkyObjectsRef.current, pickInput)) return;
    const choices = pickPaintedSkyObjects(paintedSkyObjectsRef.current, pickInput);
    if (choices.length === 1) {
      selectCatalogObject(choices[0]!);
    } else if (choices.length > 1) {
      setCatalogPickChoices(choices);
    } else {
      setSelectionState(objectSelection.clear());
      stopObjectTracking();
    }
  };
  const skySceneStarCount =
    activeSkySceneFrame?.state === "AVAILABLE" && activeSkySceneFrame.points
      ? activeSkySceneFrame.points.filter((point) => point[2] > 0).length
      : 0;
  const presentedSceneReady = presentedSceneCurrent && skySceneReady;
  const skySceneAccessibleProvenance = presentedSceneReady
    ? `，场景时刻 ${activeSkySceneFrame?.at ?? "未知"}`
    : "";
  const skyScenePresentationState = presentedSceneReady ? "READY"
    : skySceneReady && nativeCanvasMounted && !canvasError ? "PENDING" : "UNAVAILABLE";
  const skySceneAccessibleCount = presentedSceneReady
    ? `${skySceneStarCount} 颗真实亮星目录对象`
    : skyScenePresentationState === "PENDING" ? "天空图尚未完成绘制" : "天空图当前不可绘制";
  const skyTargetAccessibleCount = !orientationTargetFrame
    ? fineTargetUnresolved ? timePlaying ? "播放中，暂停后更新当前时刻目标资料"
      : fineTarget.isFetching ? "当前时刻目标资料正在计算" : "当前时刻目标资料暂不可用"
      : "目标待绘制"
    : presentedSceneReady ? `${orientationTargets.length} 个真实目标`
      : skyScenePresentationState === "PENDING" ? "目标待绘制" : "目标资料可在列表查看";
  const skySceneAccessibleFov = presentedSceneReady ? presentedFov : verticalFovDeg;
  const skySceneAccessibleOrientation = trackingState.target
    ? `已选择跟踪${trackingState.target.displayName}`
    : manualBasis ? "手动视角，不代表手机朝向"
      : alignmentEditing ? "画面锁定，正在对齐"
        : alignmentRequired ? "方向参照中断，保留原视图"
          : compassIsReady ? presentedSceneReady ? "已使用实时设备姿态" : "设备姿态可用，天空画面待更新"
            : "当前设备姿态不可用，暂停方位投影";
  const skySceneAccessibleLabel = `${spotName}的方位高度天空图，${presentedSceneReady ? "已呈现" : "所选"}垂直视场 ${skySceneAccessibleFov < 1 ? skySceneAccessibleFov.toFixed(2) : skySceneAccessibleFov.toFixed(1)} 度，${skySceneAccessibleCount}${skySceneAccessibleProvenance}，${visibleConstellationLabels.length ? `可见星座 ${visibleConstellationLabels.map(label=>label.nameZh).join("、")}，` : ""}${skyTargetAccessibleCount}，${skySceneAccessibleOrientation}，所选观测时刻 ${rowTime}`;
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
        active={pageVisible && Boolean(datePickerOpen || selectedTargetId || selectedCatalogObject || catalogPickChoices.length)}
        onBack={goBack}
      />
        <View
          className="sky-orientation-canvas"
          data-control="sky-orientation-canvas"
          data-od-id="sky-orientation-canvas"
          data-canvas-state={orientationDataStatus?.state ?? "READY"}
          data-sky-scene-state={skyScenePresentationState}
          data-sky-star-count={presentedSceneReady ? skySceneStarCount : 0}
          data-sky-catalog-version={
            reportData?.skyScene.catalog?.catalogVersion ?? ""
          }
          data-sky-scene-frame-at={presentedSceneReady ? activeSkySceneFrame?.at ?? "" : ""}
          role="img"
          aria-busy={orientationDataStatus?.state === "LOADING" || skyScenePresentationState === "PENDING"}
          aria-label={skySceneAccessibleLabel}
        >
          {nativeCanvasMounted ? <Canvas
            type="2d"
            disableScroll
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
          /> : null}
          {pageVisible && presentedSceneCurrent && selectionState.object && paintedData && paintedRow &&
            selectionState.spotId === paintedData.context.spotId && currentViewBasis && !alignmentEditing ?
            <SkySelectedObject object={selectionState.object} context={paintedData.context} at={paintedRow.at}
              {...(paintedPositionPresentation ? { presentation: paintedPositionPresentation } : {})}
              catalog={positionCatalog(selectionState.object.reference)}
              view={{ basis: currentViewBasis, width: canvasSize.width, height: canvasSize.height,
                verticalFovDeg: presentedFov, center: presentedCenter }}
              angularDiameterDeg={(() => {
                const entry = paintedData.skyScene.deepSky?.catalog?.entries.find(
                  object => object.objectRef === selectionState.object?.reference);
                return entry?.majorAxisArcmin ? entry.majorAxisArcmin / 60 : null;
              })()}
              discIsItsMarker={locatedBodyOccludesMarker(selectionState.object.reference, paintedRow,
                currentViewBasis, canvasSize.width, canvasSize.height, presentedFov, presentedCenter)}
              landscapeCovered={(x, y) => Boolean(presentedSkyVisibility?.view?.landscape &&
                !paintedSkyPointVisible(presentedSkyVisibility, x, y))}
              reducedMotion={reducedMotion} suspended={contextSession.busy || timeSaving}
              onSelect={selectCatalogObject}
              onRetrySky={() => { void report.refetch(); stellarSupplement.retry(); }} /> : null}
          {skySceneReady && !canvasError && canvasSize.width > 0 && canvasSize.height > 0 ?
            ([[0, "北"], [90, "东"], [180, "南"], [270, "西"]] as const).map(([azimuth, label]) => {
              const point = projectHorizontalPoint(azimuth, 0, null, null, canvasSize.width, canvasSize.height,
                presentedFov, currentViewBasis, presentedCenter);
              return point ? <Text key={label} className="sky-cardinal-label"
                style={{ left: `${point.x}px`, top: `${point.y}px` }} aria-hidden>{label}</Text> : null;
            }) : null}
          {skySceneReady && !canvasError ? visibleConstellationLabels.map(label=><Text key={label.iau}
            className="sky-constellation-label" aria-hidden
            style={{left:`${label.x}px`,top:`${label.y}px`,opacity:label.opacity}}>{label.nameZh}</Text>) : null}
          {(__MINIAPP_SKY_FEEDBACK_ID__ || Math.abs(verticalFovDeg - SKY_VERTICAL_FOV_DEG) > 0.05) ? (
            <View className={`sky-zoom-status${__MINIAPP_SKY_FEEDBACK_ID__ ? " sky-zoom-status--feedback" : ""}`} role="status" aria-live="polite">
              {__MINIAPP_SKY_FEEDBACK_ID__ ? <Text>验证 {__MINIAPP_SKY_FEEDBACK_ID__}</Text> : null}
              {__MINIAPP_SKY_FEEDBACK_ID__ ? <Text>m{skyFeedbackMount} {skyFeedbackTrace.event} 最小{skyFeedbackTrace.minFov.toFixed(2)}° 取消{skyFeedbackTrace.cancels}</Text> : null}
              {Math.abs(verticalFovDeg - SKY_VERTICAL_FOV_DEG) > 0.05 ? <Text>{verticalFovDeg < 1 ? verticalFovDeg.toFixed(2) : verticalFovDeg.toFixed(1)}°</Text> : null}
              {Math.abs(verticalFovDeg - SKY_VERTICAL_FOV_DEG) > 0.05 && verticalFovDeg <= SKY_MIN_VERTICAL_FOV_DEG ? <Text>已到最大放大</Text> : null}
            </View>
          ) : null}
          {visibleNamedLabels.map((object) => (
            <SkyOrientationCatalogLabel
              key={object.reference}
              object={object}
              opacity={object.auxiliaryOpacity ?? 1}
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

        {orientationObjectListOpen && pageVisible && !alignmentEditing ? (
          <View
            className="sky-orientation-object-list"
            data-control="sky-orientation-object-list"
            data-od-id="sky-orientation-object-list"
            aria-label="天体列表与目录搜索"
          >
            <View className="sky-orientation-object-list__header">
              <View className="sky-orientation-object-list__heading">
                <Text className="sky-orientation-object-list__title">
                  对象列表
                </Text>
                <Text className="sky-orientation-object-list__meta">
                  {orientationData
                    ? "所选地点与时刻的天体"
                    : "暂无可用的天空数据"}
                </Text>
              </View>
            </View>
            <SkyObjectSearch onSelect={selectCatalogObject}>
            <Text className="type-caption">当前天空 · {orientationTargetFrame
              ? `${orientationTargets.length} 个目标` : "目标待更新"}</Text>
            {orientationTargetFrame && fineTargetRetainedStale ? <StatusPanel state="STALE"
              detail="目标资料尚未更新，当前保留同一地点与时刻的缓存计算。"
              recoveryLabel="重试目标" onRecover={() => void fineTarget.refetch()} /> : null}
            {orientationData ? (
              !orientationTargetFrame ? (
                <StatusPanel
                  state={fineTargetUnresolved && fineTarget.isError ? "ERROR" : "LOADING"}
                  detail={fineTargetUnresolved
                    ? timePlaying ? "播放中；暂停后计算该时刻的目标与事件资料。"
                      : fineTarget.isError ? "该时刻目标资料暂不可用；星空仍可浏览。"
                        : "正在计算并绘制该时刻的目标资料。"
                    : "目标随天空画面更新中。"}
                  {...(fineTargetUnresolved && fineTarget.isError ? {
                    recoveryLabel: "重试目标", onRecover: () => void fineTarget.refetch(),
                  } : {})}
                />
              ) : orientationTargets.length ? (
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
                    <Text>{skyObjectKindLabel(object.kind)} · {object.reference.replace(":", " ")}{object.magnitude === null ? "" : ` · ${skyObjectMagnitudeLabel(object)}`}</Text>
                  </Button>
                ))}
                {catalogListLimit < catalogFrameObjects.length ? (
                  <Button className="sky-catalog-row__more" onClick={() => setCatalogListLimit((value) => Math.min(value + 24, catalogFrameObjects.length))}>
                    显示更多天体
                  </Button>
                ) : null}
              </View>
            ) : null}
            </SkyObjectSearch>
            {constellationCatalog.data ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起星座资料来源"
                onClick={() => setConstellationSourcesOpen(value=>!value)}>星座资料来源 · Johan Meuris / Stellarium</Button>
              {constellationSourcesOpen ? constellationCatalog.data.sources.map(source => <Provenance key={source.provider} source={source} showKind={false}
                downloadUrl={source.id.startsWith("constellation-geometry:") ? constellationAssetUrl(constellationCatalog.data!.data.catalogHash,constellationCatalog.data!.data.geometryAsset.file)
                  : source.id.startsWith("constellation:") ? constellationAssetUrl(constellationCatalog.data!.data.catalogHash,"constellation_names.eng.fab") : undefined} />) : null}
            </View> : null}
            {stellarSupplement.sources.length ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起暗星资料来源"
                onClick={()=>setSupplementSourcesOpen(value=>!value)}>暗星资料来源 · SAO / NASA HEASARC</Button>
              {supplementSourcesOpen?stellarSupplement.sources.map(source=><Provenance key={source.id} source={source} showKind={false}/>):null}
            </View>:null}
            <Text className="type-caption">普通星图的天空颜色按太阳位置和固定晴空散射参数示意；低空星点参考 ESO La Silla 可见光数据渐暗。均不代表当前地点的透明度、天气或肉眼可见性。</Text>
            <Text className="type-caption">太阳边缘明暗采用历史 579.88 nm 单波段临边昏暗模型（Neckel / Labs，Hestroffer / Magnan 1998）；颜色为显示配色，不是实时日面、自然真彩或测光结果。</Text>
            <Text className="type-caption" selectable>太阳模型出处：https://legacy.adsabs.harvard.edu/pdf/1998A%26A...333..338H</Text>
            <Text className="type-caption">地景是通用模拟场景，亮度随所选时刻变化；不代表当前地点的地貌、天气或现场遮挡。地平线是几何方向参照。</Text>
            {presentedSceneCurrent && presentedSkyFrame?.landscape?.kind === "panorama" ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起模拟地景图片来源"
                onClick={() => setLandscapeSourcesOpen(value => !value)}>模拟地景图片来源 · Lubomir Hambalek</Button>
              {landscapeSourcesOpen ? <View>
                <Text className="type-caption">{presentedSkyFrame.landscape.publication.source.credit}</Text>
                <Text className="type-caption">历史斯洛伐克草地全景经缩小、透明度编码及显示曝光处理；原包标注 CC BY 4.0，来源目录标注 CC BY-SA 4.0，图片派生物按 CC BY-SA 4.0 提供。它不是所选观星点的现场照片或遮挡测量。</Text>
                <Text className="type-caption" selectable>图片条款：{presentedSkyFrame.landscape.publication.source.rightsUrl} · 原始来源：{presentedSkyFrame.landscape.publication.source.originalUrl}</Text>
                <Text className="type-caption" selectable>当前图片：{skyLandscapeAssetUrl(presentedSkyFrame.landscape.resource.image.downloadUrl)}</Text>
                <Text className="type-caption" selectable>原包：{skyLandscapeAssetUrl(presentedSkyFrame.landscape.publication.source.originalDownloadUrl)}</Text>
              </View> : null}
            </View> : presentedSceneCurrent && presentedSkyFrame?.landscape?.kind === "procedural"
              ? <Text className="type-caption">当前显示自有草地与树木模拟模型。</Text> : null}
            <Text className="type-caption">
              夜间广角银河层优先使用历史 2MASS 近红外伪彩色图；开启可选 W3 广角红外时由 W3 替换，缺图时按标准银河坐标绘制淡带示意。它们都不代表肉眼可见性或现场天气。
            </Text>
            {galacticImage.publication ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起银河红外图来源"
                onClick={()=>setGalacticImageSourcesOpen(value=>!value)}>银河红外图来源 · 2MASS</Button>
              {galacticImageSourcesOpen?<View>
                <Text className="type-caption">历史 J/H/K 近红外伪彩色图，不是可见光、实时天空或现场可见性；缩放细节限于 2048×1024 图。</Text>
                <Text className="type-caption">{galacticImage.publication.source.credit} · {galacticImage.publication.processing}</Text>
                <Text className="type-caption">局部放大时对全景背景作平滑显示；原图中的红外点源不作为可点选恒星，恒星身份以目录为准。此显示处理不修改原始影像或补足缺测。</Text>
                <Text className="type-caption" selectable>原始图：{galacticImage.publication.source.recordUrl} · 使用条款：{galacticImage.publication.source.rightsUrl} · 2MASS 图库公有领域声明：{galacticImage.publication.source.galleryRightsUrl}</Text>
                <Text className="type-caption" selectable>机器可读清单：{__MINIAPP_API_BASE__.replace(/\/+$/u,"")}/v2/sky/galactic/manifest</Text>
              </View>:null}
            </View>:null}
            <Text className="type-caption">可选的广角红外图层使用 2010 年 AllWISE W3 12 μm 影像；它不是可见光银河，也不表示现场可见性。</Text>
            {wideField.publication ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起广角红外影像来源"
                onClick={()=>setWideFieldSourcesOpen(value=>!value)}>广角红外影像来源 · AllWISE W3 12 μm</Button>
              {wideFieldSourcesOpen ? <View>
                <Text className="type-caption">2010 年历史红外资料，不是肉眼可见光、实时天空或现场可见性。仅有第 0 阶低分辨率影像。</Text>
                <Text className="type-caption">{wideField.publication.source.acknowledgment}</Text>
                <Text className="type-caption">原影像：{wideField.publication.source.originalCopyright} · CDS HiPS：{wideField.publication.source.hipsCopyright}，{wideField.publication.source.hipsLicense}；{wideField.publication.processing}</Text>
                <Text className="type-caption" selectable>原始来源：{wideField.publication.source.recordUrl} · 条款：{wideField.publication.source.originalRightsUrl} · HiPS 许可：{wideField.publication.source.hipsLicenseUrl}</Text>
                <Text className="type-caption" selectable>机器可读清单：{__MINIAPP_API_BASE__.replace(/\/+$/u,"")}/v2/sky/wide-field/manifest</Text>
              </View>:null}
            </View>:null}
            {moonTexture.publication ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起月面影像来源"
                onClick={()=>setMoonTextureSourcesOpen(value=>!value)}>月面影像来源 · USGS Clementine</Button>
              {moonTextureSourcesOpen?<View>
                <Text className="type-caption">1994 年 Clementine UVVIS 750 nm 灰阶拼图；不是自然彩色或实时月面。月相照明为计算示意。</Text>
                <Text className="type-caption">原始影像在中低纬和极区均有缺测，缺区以统一灰色盘面示意，不补出地貌；部分覆盖按有效面积混合。这些区域的月面细节暂不可用。</Text>
                <Text className="type-caption">{moonTexture.publication.source.credit} · {moonTexture.publication.processing}</Text>
                <Text className="type-caption" selectable>原始产品：{moonTexture.publication.source.recordUrl} · 公开使用说明：{moonTexture.publication.source.rightsUrl}</Text>
                <Text className="type-caption" selectable>机器可读清单：{__MINIAPP_API_BASE__.replace(/\/+$/u,"")}/v2/sky/moon/coverage/manifest</Text>
              </View>:null}
            </View>:null}
            {marsTexture.publication ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起火星表面影像来源"
                onClick={()=>setMarsTextureSourcesOpen(value=>!value)}>火星表面影像来源 · USGS Viking</Button>
              {marsTextureSourcesOpen?<View>
                <Text className="type-caption">Viking MDIM 2.1 历史彩色化拼图；不是自然真彩或当前火星画面。相位照明为计算示意。</Text>
                <Text className="type-caption">{marsTexture.publication.source.credit} · {marsTexture.publication.processing}</Text>
                <Text className="type-caption" selectable>原始产品与公开使用说明：{marsTexture.publication.source.recordUrl}</Text>
                <Text className="type-caption" selectable>机器可读清单：{__MINIAPP_API_BASE__.replace(/\/+$/u,"")}/v2/sky/mars/manifest</Text>
              </View>:null}
            </View>:null}
            {mercuryTexture.publication ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起水星表面影像来源"
                onClick={()=>setMercuryTextureSourcesOpen(value=>!value)}>水星表面影像来源 · USGS MESSENGER</Button>
              {mercuryTextureSourcesOpen?<View>
                <Text className="type-caption">2013 年 MESSENGER MDIS 750 nm 灰阶拼图，含极区补图；不是自然彩色或实时水星画面。相位照明为计算示意。</Text>
                <Text className="type-caption">{mercuryTexture.publication.source.credit} · {mercuryTexture.publication.processing}</Text>
                <Text className="type-caption" selectable>原始产品与公开使用说明：{mercuryTexture.publication.source.recordUrl}</Text>
                <Text className="type-caption" selectable>机器可读清单：{__MINIAPP_API_BASE__.replace(/\/+$/u,"")}/v2/sky/mercury/manifest</Text>
              </View>:null}
            </View>:null}
            <SkyOpalBandsSource body="jupiter" name="木星" publication={jupiterBands.publication} description="2024 年 11 月历史云带；已移除大红斑等经度细节。" />
            <SkyOpalBandsSource body="saturn" name="土星" publication={saturnBands.publication} description="2025 年 8 月历史云带；已移除经度细节与当时卫星影子，环遮挡及极区缺测处回退基础盘面。" />
            <SkyOpalBandsSource body="uranus" name="天王星" publication={uranusBands.publication} description="2025 年 10 月历史纬度色带；南部缺测纬度回退基础盘面。" />
            <SkyOpalBandsSource body="neptune" name="海王星" publication={neptuneBands.publication} description="2025 年 8 月历史纬度色带；北部缺测纬度回退基础盘面。" />
            {optical.publication ? <View>
              <Button className="sky-catalog-row__more" aria-label="展开或收起光学巡天影像来源"
                onClick={()=>setOpticalSourcesOpen(value=>!value)}>光学巡天影像来源 · {optical.publication.sources.map(source=>source.provider).join(" / ")}</Button>
              {opticalSourcesOpen ? <View>
                {optical.publication.sources.map(source=><Text key={source.id} className="type-caption">
                  {source.title} · {source.provider} · 原始资料：{source.originalRights} · 加工HiPS：{source.hipsLicense} · DOI {source.hipsDoi}
                </Text>)}
                <Text className="type-caption">{optical.publication.processing}；{optical.publication.limitations.join("；")}</Text>
              </View>:null}
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
                <Text>{skyObjectKindLabel(choice.kind)} · {choice.reference.replace(":", " ")}{choice.magnitude === null ? "" : ` · ${skyObjectMagnitudeLabel(choice)}`}</Text>
              </Button>
            ))}
            <Button className="sky-object-choice__cancel" onClick={() => setCatalogPickChoices([])}>取消</Button>
          </View>
        ) : null}

        {pageVisible && selectedCatalogObject ? (
          <SkyCatalogInformation
            reference={selectedCatalogObject.reference}
            knownName={selectedCatalogObject.displayName}
            knownKind={selectedCatalogObject.kind}
            {...(deepSkyImagePresented && presentedSkyFrame?.deepSkyImage?.reference === selectedCatalogObject.reference &&
              presentedSkyFrame.deepSkyImage.publicationHash ? { imagePublicationHash: presentedSkyFrame.deepSkyImage.publicationHash } : {})}
            onClose={() => setSelectedCatalogObject(null)}
            positionAction={pageVisible && reportData && row ? <SkyObjectPositionAction
              {...(positionPresentation ? { presentation: positionPresentation } : {})}
              binding={{ reference: selectedCatalogObject.reference, spotId: reportData.context.spotId,
                contextId: reportData.context.contextId, contextRevision: reportData.context.contextRevision,
                contextFingerprint: reportData.context.contextFingerprint, dataRevision: reportData.context.dataRevision,
                algorithmVersion: reportData.context.algorithmVersion, at: row.at }}
              catalog={positionCatalog(selectedCatalogObject.reference)}
              suspended={contextSession.busy || timeSaving}
              onLocate={locateCatalogObject}
              onTrack={trackCatalogObject}
              onRetrySky={() => { void report.refetch(); stellarSupplement.retry(); }} /> : null}
          />
        ) : null}

        <View className="sky-quick-settings">
        <View className="sky-view-mode">
          <Button className="sky-view-mode__button sky-view-mode__landscape focus-ring" disabled={alignmentEditing}
            aria-label={landscapeEnabled ? "关闭通用模拟地景，不影响几何地平线" : "开启通用模拟地景，不代表当前地点地貌"}
            aria-pressed={landscapeEnabled}
            onClick={() => setLandscapeEnabled(value=>!value)}>{landscapeEnabled ? "模拟地景：开" : "模拟地景：关"}</Button>
          <Button className="sky-view-mode__button focus-ring" disabled={alignmentEditing}
            aria-label={constellationsEnabled ? "关闭星座连线、名称与插画，随视场渐显或渐隐" : "开启星座连线、名称与插画，随视场渐显或渐隐"}
            onClick={() => setConstellationsEnabled(value=>!value)}>{constellationsEnabled ? "星座：开" : "星座：关"}</Button>
          <Button className="sky-view-mode__button focus-ring" disabled={alignmentEditing}
            aria-label={wideFieldEnabled ? "关闭历史 W3 红外图层，恢复银河近红外图" : "开启历史 W3 红外图层，替换银河近红外图，仅夜间广角显示"}
            onClick={()=>setWideFieldEnabled(value=>!value)}>{wideFieldEnabled ? "红外：开" : "红外：关"}</Button>
          <Button className="sky-view-mode__button focus-ring" disabled={alignmentEditing}
            aria-label={coordinateGrids.horizontal ? "关闭地平坐标网格，保留地平线" : "开启地平坐标网格"}
            aria-pressed={coordinateGrids.horizontal}
            onClick={() => setCoordinateGrids(value => ({ ...value, horizontal: !value.horizontal }))}>{coordinateGrids.horizontal ? "地平网格：开" : "地平网格：关"}</Button>
          <Button className="sky-view-mode__button focus-ring" disabled={alignmentEditing || (!coordinateGridFrame && !coordinateGrids.equatorial)}
            aria-label={coordinateGrids.equatorial ? "关闭 J2000 赤道坐标网格" : coordinateGridFrame ? "开启 J2000 赤道坐标网格" : "当前时刻赤道网格暂不可用"}
            aria-pressed={coordinateGrids.equatorial}
            onClick={() => setCoordinateGrids(value => ({ ...value, equatorial: !value.equatorial }))}>{coordinateGrids.equatorial ? "赤道网格：开" : "赤道网格：关"}</Button>
          {coordinateGrids.equatorial && !coordinateGridFrame ? <View className="sky-view-mode__status" role="status" aria-live="polite"><Text className="type-caption">当前时刻赤道网格暂不可用</Text></View> : null}
          {constellationFailed ? <Button className="sky-view-mode__button focus-ring" onClick={retryConstellations}>重试星座</Button> : null}
          {optical.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryOptical}>重试光学影像</Button> : null}
          {wideField.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryWideField}>重试红外影像</Button> : null}
          {moonTexture.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryMoonTexture}>重试月面影像</Button> : null}
          {moonTexture.refreshFailed ? <Button className="sky-view-mode__button focus-ring" onClick={moonTexture.retry}>重试更新月面来源</Button> : null}
          {marsTexture.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryMarsTexture}>重试火星表面影像</Button> : null}
          {marsTexture.refreshFailed ? <Button className="sky-view-mode__button focus-ring" onClick={marsTexture.retry}>重试更新火星来源</Button> : null}
          {mercuryTexture.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryMercuryTexture}>重试水星表面影像</Button> : null}
          {mercuryTexture.refreshFailed ? <Button className="sky-view-mode__button focus-ring" onClick={mercuryTexture.retry}>重试更新水星来源</Button> : null}
          {jupiterBands.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryJupiterBands}>重试木星历史云带</Button> : null}
          {jupiterBands.refreshFailed ? <Button className="sky-view-mode__button focus-ring" onClick={jupiterBands.retry}>重试更新木星云带来源</Button> : null}
          {saturnBands.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retrySaturnBands}>重试土星历史云带</Button> : null}
          {neptuneBands.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryNeptuneBands}>重试海王星历史云带</Button> : null}
          {uranusBands.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryUranusBands}>重试天王星历史云带</Button> : null}
          {saturnBands.refreshFailed ? <Button className="sky-view-mode__button focus-ring" onClick={saturnBands.retry}>重试更新土星云带来源</Button> : null}
          {neptuneBands.refreshFailed ? <Button className="sky-view-mode__button focus-ring" onClick={neptuneBands.retry}>重试更新海王星云带来源</Button> : null}
          {uranusBands.refreshFailed ? <Button className="sky-view-mode__button focus-ring" onClick={uranusBands.retry}>重试更新天王星云带来源</Button> : null}
          {galacticImage.failed ? <Button className="sky-view-mode__button focus-ring" onClick={retryGalacticImage}>重试银河红外图</Button> : null}
          {galacticImage.refreshFailed ? <Button className="sky-view-mode__button focus-ring" onClick={galacticImage.retry}>重试更新银河来源</Button> : null}
          {solarLightUnavailable && mode !== "OBSERVATION" ? <Button className="sky-view-mode__button focus-ring" onClick={() => { canvasLifecycle.resize(); draw(); }}>重试晨昏</Button> : null}
          {landscapeImage.failed && landscapeEnabled ? <Button className="sky-view-mode__button focus-ring" onClick={retryLandscapeImage}>重试模拟地景图片</Button> : null}
          {landscapeUnavailable && landscapeEnabled ? <Button className="sky-view-mode__button focus-ring" onClick={() => { void report.refetch(); canvasLifecycle.resize(); draw(); }}>重试模拟地景</Button> : null}
          {galacticBandUnavailable && mode !== "OBSERVATION" ? <Button className="sky-view-mode__button focus-ring" onClick={() => { canvasLifecycle.resize(); draw(); }}>重试银河</Button> : null}
          {sunDiscUnavailable ? <Button className="sky-view-mode__button focus-ring" onClick={() => { setSunDiscUnavailable(false); canvasLifecycle.resize(); draw(); }}>重试太阳盘</Button> : null}
          {moonDiscUnavailable ? <Button className="sky-view-mode__button focus-ring" onClick={() => { setMoonDiscUnavailable(false); canvasLifecycle.resize(); draw(); }}>重试月球</Button> : null}
          {planetDiscUnavailable ? <Button className="sky-view-mode__button focus-ring" onClick={() => { setPlanetDiscUnavailable(false); canvasLifecycle.resize(); draw(); }}>重试行星</Button> : null}
          {stellarSupplement.failed ? <Button className="sky-view-mode__button focus-ring" onClick={stellarSupplement.retry}>重试暗星</Button> : null}
          {manualBasis && !trackingState.target ? <Text className="type-caption">手动视角</Text> : null}
          <Button disabled={alignmentEditing} className="sky-view-mode__button focus-ring" aria-label={followRequested ? "取消恢复手机跟随，保留手动视角" : manualBasis ? "恢复手机方向跟随" : "切换手动拖动模式"}
            onClick={() => {
              skyTapRef.current = null;
              if (!manualBasis || followRequested) enterManualView();
              else { stopObjectTracking(); setFollowRequested(true); recoverCompass(); }
            }}>{followRequested ? "取消跟随" : manualBasis ? "跟随手机" : "拖动模式"}</Button>
          {manualBasis && followRequested ? <Text className="sky-view-mode__status type-caption">{compassIsReady ? "正在恢复跟随" : `${compassRecovery.title}，保留手动视角`}</Text> : null}
        </View>
        <View className="sky-image-status-group">
          {deepSkyImagePresented || selectedDeepSkyEntry && verticalFovDeg <= 15 &&
            (mode === "OBSERVATION" || !deepSkyRegistrationReady || deepSkyImageState === "LOADING" || deepSkyImageState === "ERROR") ? (
            <View className="sky-image-status" role="status" aria-live="polite">
              {mode === "OBSERVATION" ? (
                <Text>红光模式已隐藏巡天影像</Text>
              ) : deepSkyImagePresented ? (
                <>
                  <Text>NASA/IPAC IRSA · AllWISE W3 12 μm · 处理后红外影像{presentedSkyFrame?.deepSkyImage?.sourceMissingPixels ? " · 缺测区已留空" : ""}</Text>
                  {deepSkyImageState === "ERROR" ? <Button onClick={retryDeepSkyImage}>影像更新失败 · 重试</Button> : null}
                </>
              ) : !deepSkyRegistrationReady ? (
                <Button onClick={() => void report.refetch()}>影像配准资料需刷新 · 重试天空</Button>
              ) : deepSkyImageState === "LOADING" ? (
                <Text>正在载入 {selectedDeepSkyEntry?.displayName} 巡天影像…</Text>
              ) : deepSkyImageState === "ERROR" ? (
                <Button onClick={retryDeepSkyImage}>影像载入失败 · 重试</Button>
              ) : null}
            </View>
          ) : null}
          {sdssOpticalStatus !== "NONE" ? (
            <View className="sky-image-status" role="status" aria-live="polite">
              {sdssOpticalStatus === "CREDIT" ? (
                <>
                  <Text>Sloan Digital Sky Survey · CC BY 4.0 · 历史 g/r/i 光学影像{sdssOptical.refreshFailed && sdssOpticalCurrentImagePresented ? " · 来源刷新失败，保留已载图" : ""}</Text>
                  {sdssOptical.updateFailed && sdssOpticalCurrentImagePresented ?
                    <Button onClick={retrySdssOptical}>影像更新失败，保留已载图 · 重试</Button> : null}
                </>
              ) : sdssOpticalStatus === "RETRY" ? (
                <Button onClick={retrySdssOptical}>{selectedDeepSkyEntry?.displayName} 光学影像不可用 · 重试</Button>
              ) : sdssOpticalStatus === "LOADING" ? (
                <Text>正在载入 {selectedDeepSkyEntry?.displayName} 光学影像…</Text>
              ) : null}
            </View>
          ) : null}
        </View>
        {pageVisible && trackingState.target && reportData && row && trackingState.spotId === reportData.context.spotId ?
          <SkyObjectTrackingStatus name={trackingState.target.displayName}
            {...(positionPresentation ? { presentation: positionPresentation } : {})}
            binding={{ reference: trackingState.target.reference, spotId: reportData.context.spotId,
              contextId: reportData.context.contextId, contextRevision: reportData.context.contextRevision,
              contextFingerprint: reportData.context.contextFingerprint, dataRevision: reportData.context.dataRevision,
              algorithmVersion: reportData.context.algorithmVersion, at: row.at }}
            catalog={positionCatalog(trackingState.target.reference)} overview={skyDomeProgress(verticalFovDeg, canvasSize.width, canvasSize.height, viewportInsets) > 0}
            suspended={contextSession.busy || timeSaving}
            onPosition={applyTrackedPosition}
            onStop={() => { skyTapRef.current = null; enterManualView(); }}
            onRetrySky={() => { void report.refetch(); stellarSupplement.retry(); }} /> : null}
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
              if (skyControlPanel !== "calibration" && !manualBasis && alignment.ready && !timeSaving && !isPreviewing && skySceneReady && presentedSceneCurrent) beginSkyCalibration();
            }}>重新校准</Button>
          <Button className="sky-control-dock__button focus-ring" disabled={alignmentEditing}
            aria-expanded={orientationObjectListOpen} data-od-id="sky-orientation-object-list-toggle"
            onClick={() => {
              if (orientationController.snapshot().alignment.mode === "editing") return;
              closeSkyObjectDisclosure();
              setSkyControlPanel(null);
              setDatePickerOpen(false);
              pauseSkyTime();
              setOrientationObjectListOpen(open => !open);
            }}>{orientationObjectListOpen ? "收起列表" : "天体列表"}</Button>
          <Button className="sky-control-dock__button sky-control-dock__button--time focus-ring" disabled={alignmentEditing}
            aria-expanded={skyControlPanel === "time"}
            onClick={() => {
              if (orientationController.snapshot().alignment.mode === "editing") return;
              closeSkyObjectDisclosure();
              setOrientationObjectListOpen(false);
              setDatePickerOpen(false);
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
                disabled={!alignment.ready || timeSaving || isPreviewing || datePickerOpen || !skySceneReady || !presentedSceneCurrent}
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
            rows={committedRow ? rawReportData?.hourly ?? [] : []}
            activeIndex={activeIndex}
            committedIndex={committedIndex}
            {...((timeIntent.mode === "PLAYING" || timeIntent.mode === "PAUSED" ||
              Date.parse(committedAt) % 60_000 !== 0) && row ? { presentedAt: row.at } : {})}
            playing={timePlaying}
            timezone={routeContext.timezone}
            isPreviewing={isPreviewing}
            saving={timeSaving}
            interactionLocked={alignmentEditing}
            reducedMotion={reducedMotion}
            onPreview={onPreview}
            onCommit={(index) => void commitIndex(index)}
            onCancel={() => setPreviewIndex(null)}
          />
          <View className="sky-time-playback" role="group" aria-label="天空时间播放">
            <Button className="sky-time-playback__button sky-time-playback__toggle focus-ring" data-od-id="sky-time-play-toggle"
              disabled={!timePlaying && (!timeModel || !geometryReport || !pageVisible || timeSaving || alignmentEditing ||
                timeIntent.binding !== timeBinding || Date.parse(requestedAt) >= Date.parse(timeModel.endAt))}
              aria-label={timePlaying ? "暂停天空时间播放" : "以真实时间一倍速度播放天空"}
              onClick={() => setTimeIntent(timePlaying ? observationTime.pause() : observationTime.play(Date.now()))}>
              {timePlaying ? "暂停" : "播放 1×"}
            </Button>
            {isPreviewing ? <Button className="sky-time-playback__button sky-time-playback__apply focus-ring" data-od-id="sky-time-apply"
              disabled={timeSaving || alignmentEditing || !geometryReport}
              onClick={() => void commitInstant(requestedAt)}>设为观测时间</Button> : null}
            {isPreviewing || timeIntent.mode === "PAUSED" ? <Button className="sky-time-playback__button sky-time-playback__cancel focus-ring" data-od-id="sky-time-cancel"
              disabled={timeSaving} onClick={() => setPreviewIndex(null)}>取消</Button> : null}
            {!timeModel ? <Text className="sky-time-playback__status">连续时间资料暂不可用，可使用时间轴。</Text> : null}
            {timeIntent.reachedEnd ? <Text className="sky-time-playback__status">已到本次时段末端，可选择其他日期。</Text> : null}
          </View>
        </View>
        ) : null}
      </View>
    );
}
