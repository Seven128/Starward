import { getStellarCatalog, getConstellationCatalog } from "@/services/sky-catalog-api";
import { SourceButton } from "@/components/source-button";
import { navigateToSource } from "@/services/source-navigation";
import { SOURCE_READING_ROUTE, type SourceDocument } from "@/utils/source-document";
import { skyConstellationSourceDocument, skyGalacticSourceDocument, skyLandscapeSourceDocument,
  skySolarLightSourceDocument, skyStellarSupplementSourceDocument, skyWideFieldSourceDocument } from "./sky-source-documents";
import { reportRuntimeError } from "@/services/runtime-error";
import { skyMapLifecycle } from "@/navigation/sky-map-lifecycle";
import { openPrimaryPage } from "@/navigation/primary-page-navigation";
import { PAGE_BLACKOUT_FADE_MS } from "@/navigation/page-blackout-transition";
import { useSkyPageExit } from "./use-sky-page-exit";
import { usePageBlackoutReducedMotion } from "@/hooks/use-reduced-motion";
import {useSkyBodyImages} from "./use-sky-body-images";
import {useSkyImageRecovery} from "./use-sky-image-recovery";
import {useSkyImageFailureDiagnostics} from "./sky-image-feedback";
import {SkyBodyImageSource} from "./sky-body-image-source";
import { useSkyForecastQuery } from "@/hooks/use-forecast-query";
import { skyReportAccessRejection, skyReportRecovery } from "./sky-report-access";
import { createSkyTimeCommitContinuity, skyReportMatchesContext } from "./sky-time-commit-continuity";
import { useCelestialInformation } from "@/hooks/use-celestial-information";
import { celestialInformationPartialDetail, celestialInformationSourceRoute } from "@/services/celestial-information-presentation";
import { SkyObjectSearch } from "./sky-object-search";
import { SkySearchRow } from "./sky-search-row";
import { SkyTimeControls } from "./sky-time-controls";
import { skyTimeInputAllowed } from "./sky-time-input";
import { SkyObjectDialog } from "./sky-object-dialog";
import { SkyDisclosureSurface, SkyOverlayMotion, useSkyOverlayMotion, useSkyOverlayLayoutReady } from "./sky-overlay-motion";
import { SkyObjectPositionAction } from "./sky-object-position-action";
import { skyDirectionLabel, skyHeightLabel } from "./sky-position-label";
import { SkyObjectTrackingStatus } from "./sky-object-tracking-status";
import { skyRetainedLayerStyle } from "./sky-retained-layer";
import { SkySelectedObject, type SkySelectionPosition } from "./sky-selected-object";
import { projectSkySelectionMarker } from "./sky-selection-marker";
import { createSkyStarTransitions } from "./sky-star-transition";
import { createSkyReadyImages } from "./sky-ready-presentation";
import { createSkyObjectSelection } from "./sky-object-selection";
import { createSkyObjectTracking, type SkyObjectTrackingState } from "./sky-object-tracking";
import { skyObjectPositionIsCurrent } from "./sky-object-location";
import { locatedBodyOccludesMarker } from "./sky-located-object";
import type { SkyObjectIdentity } from "./sky-object-picking";
import { dispatchSkyHipsImageFailure, drawSkyScene, skyPickIdentity, type SkyCoordinateGrids } from "./sky-scene-render";
import { createSkySceneFrameIdentity, type SkySceneFrameIdentity, type SkySceneFrameInput } from "./sky-scene-frame";
import { completeSkySceneResources, liveSkySceneResources, resolveSkyCanvasResources, sameSkyCanvasResources,
  sameSkyCompletedSceneResources, skySceneResourceInputs, type SkyCanvasResourceFrame,
  type SkyCompletedSceneResources } from "./sky-scene-resources";
import { createSkyStarDrawPreparation } from "./sky-star-draw-preparation";
import type { SkyBodyImageBinding } from "./sky-body-image-completion";
import { exactSkyObservationFrame } from "./sky-observation-frame";
import { projectHorizontalPoint, type SkyTargetProjection } from "./sky-scene-projection";
import { createSkyGpuRenderer, type SkyGpuRenderer } from "./sky-gpu-renderer";
import { skyArtworkContributionFrameBudget } from "./sky-gpu-artwork-contributions";
import { resolveConstellationFrame, type ConstellationFrame } from "./sky-constellation-scene";
import { projectSkyCatalogNames, projectSkyTargetLabels, projectSkyConstellationNames } from "./sky-label-presentation";
import { createSkyNameLayouts, pickSkyCatalogName, pickSkyControlName, sameSkyCatalogNames, sameSkyControlNames,
  type SkyPlacedCatalogName, type SkyPlacedControlName } from "./sky-name-layout";
import {skyConstellationAvoidsPoints} from "./sky-constellation-labels";
import { constellationVisibility } from "./sky-constellation-visibility";
import { copySkyDeepAuxiliaryDecisions, sameSkyDeepAuxiliaryDecisions,
  type SkyDeepAuxiliaryDecision } from "./sky-deep-auxiliary-visibility";
import { skyPreparedRegionImages } from "./sky-prepared-region-frame";
import { useSkyPreparedRegions } from "./use-sky-prepared-regions";
import { skyOpticalSourceCredit, type SkyOpticalSourceCredit } from "./sky-optical-source-credit";
import { SkyOpticalImageCredit } from "./sky-optical-image-credit";
import { skyHipsSourceCredit } from "./sky-hips-source-credit";
import { createSkyArtworkViewCuller } from "./sky-artwork-visibility";
import { useSkyDeepSkyImage } from "./use-sky-deep-sky-image";
import { resolvedSkyBodyReferences } from "./sky-body-label-presentation";
import { useSkyArtwork } from "./use-sky-artwork";
import { useSkyOpticalHips } from "./use-sky-optical-hips";
import { useSkyTargetOptical } from "./use-sky-target-optical";
import { useSkyWideFieldW3 } from "./use-sky-wide-field-w3";
import { useSkyGalacticImage } from "./use-sky-galactic-image";
import { useSkyLandscape } from "./use-sky-landscape";
import { skyLandscapeHasPaintedModel, skyLandscapePaintedPanorama, skyLandscapeVisibleInView, type SkyPanoramaMask } from "./sky-landscape-mask";
import {useSkyStellarSupplement} from './use-sky-stellar-supplement';
import type {SkyStellarSupplementFrame} from './sky-stellar-supplement-scene';
import {currentStellarSupplement} from './sky-stellar-supplement-scene';
import {createSkyStarAppearance} from './sky-star-appearance';
import {skySolarLightAt} from './sky-solar-light';
import { createRulerScrollPosition } from "@/components/ruler-scroll-position";
import { createSkyTimeRulerSettlement } from "./sky-time-ruler-settlement";
import { createOrientationRulerLayout } from "./orientation-ruler-layout";
import { WeatherAlerts } from "@/components/weather-alerts";
import { WEATHER_ALERT_REFRESH_MS } from "@/components/weather-alert-state";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, {
  useDidHide,
  useDidShow,
  useReady,
  useResize,
  useRouter,
} from "@tarojs/taro";
import { Canvas, ScrollView, Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createSkyContextSession } from "./sky-context-session";
import { matchesPrivateProposal } from "../../services/observation-context-version";
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
  localParts,
  skySourceSelectionPath,
  type DisplayMode,
  type CelestialObjectInformation,
  type CelestialObjectPositionData,
  type HourlySkyRow,
  type GalacticImageManifestData,
  type ObservationContext,
  type SourceSummary,
} from "@starward/miniapp-contracts";
import { NotificationRegion } from "@/components/notification";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { SkyStatusPanel as StatusPanel } from "@/features/sky/sky-status-panel";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { observationNightForInstant } from "@/components/observation-date";
import {
  calendarDateInTimezone,
  clockTimeInTimezone,
} from "@/utils/zoned-date";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  MiniappApiError,
  getObservationContext,
  getSkyReport,
  getSpotOverview,
  restoreObservationContext,
  updateObservationContext,
} from "@/services/api-client";
import {
  acquireAcceptanceSkySceneInspection,
  clearAcceptanceSkySceneInspection,
  publishAcceptanceSkySceneInspection,
  recordAcceptanceDiagnostic,
  type AcceptanceSkySceneInspection,
  type AcceptanceSkySceneInspectionOwner,
} from "@/services/acceptance-diagnostics";
import { useAppStore } from "@/state/app-store";
import { selectNotification } from "@/state/notification";
import { useSkyOrientation } from "./use-sky-orientation";
import {
  createSkyViewBasis,
  createSkyDirectionProjector,
  sameSkyViewBasis,
  type SkyViewBasis,
} from "./sky-view-projection";
import { skyViewPointingArc } from "./sky-view-rotation";
import type { DeviceOrientationFrame } from "./device-orientation-view";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW, type SkyPanMode } from "./sky-manual-view";
import { attachSkyCatalog, resolveSkyDeepSkyScene, resolveSkySceneFrame, skySceneHasContent, type ResolvedSkyReport as SkyReport } from "./sky-stellar-scene";
import { skySceneFrameFacts, skyPresentedViewFacts } from "./sky-scene-frame-facts";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { createSkyObservationTime, skyPresentedTimeCurrent, type SkyTimeEditSource } from "./sky-observation-time";
import { skyCommandStateSetter } from "./sky-command-state";
import { createSkyDisclosureCommands, skyHasDisclosure, type SkyControlPanel } from "./sky-disclosure-commands";
import { SkyBrowseControl, SkyLayerToggle, SkyMenuAction, SkyNavigationMenu, SkySourceSummary } from "./sky-menu";
import { skyTargetSourcesRoute } from "./sky-target-sources-route";
import { useSkyTimeTargetQuery } from "./sky-time-target-query";
import { sameContextVersion } from "../../services/observation-context-version";
import { presentSkyTime, selectSkyTimePresentation, skyPresentationTimeModel, skyRulerTime, skyTimeRulerRows,
  type SkyTimePresentation, type SkyTimeRulerRow } from "./sky-time-presentation";
import { useSkyTimeGeometry } from "./use-sky-time-geometry";
import { skyTimePreviewStatus } from "./sky-time-preview-status";
import type { SkyPositionPresentation } from "./sky-presentation-position";
import { createSkyCanvasLifecycle, createSkyCanvasFrameClock, skyCanvasFailureCode } from "./sky-canvas-lifecycle";
import { createSkyCanvasSurface, type SkyCanvasSurface, type SkyCanvasReticle, type SkyCanvasCaption, type SkyDisplayCanvas, type SkyWebGLCanvas } from "./sky-canvas-surface";
import { sdssOpticalPresentation } from "./sky-sdss-optical-selection";
import { skyTargetOpticalFrame } from "./sky-sdss-optical-frame";
import { useSkyPreparedOpticalDiscovery } from "./use-sky-prepared-optical-discovery";
import {
  isUnambiguousTapGesture,
  pickPaintedSkyObjects,
  skyPickSnapshotIsCurrent,
  paintedSkyPointVisible,
  paintedSkyBoundsVisible,
  skyObjectMagnitudeLabel,
  skyObjectKindLabel,
  skyObjectIdentityLabel,
  type PaintedSkyObject,
  type SkyPickSnapshot,
} from "./sky-object-picking";
import { clampSkyFieldOfView, deepSkyImageLevelForFov, pinchFieldOfView, remapSkyFieldOfView, skyDomeProgress, SKY_MIN_VERTICAL_FOV_DEG, SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import { resolveSkyCanvasView } from "./sky-canvas-view";
import { NO_SKY_INSETS, skyInsetsFromControls, skyViewportCenter, type SkyProjectionCenter, type SkyScreenRect, type SkyViewportInsets } from "./sky-viewport";
import type { SkyDeepSkyImageFrame } from "./sky-deep-sky-image-frame";
import "./spot-sky-page.scss";

const CANVAS_ID = "spot-night-sky-scene";
// Explicit angular view, independent of logical-pixel density. Physical
// apparent scale and platform pose conventions still require device feedback.
const SKY_VERTICAL_FOV_DEG = SKY_OBSERVING_VERTICAL_FOV_DEG;

interface SkyCalibrationScope {
  expectedContext: ObservationContext;
  visibilityRevision: number;
  binding: string;
  committedAt: string;
  at: string;
  mode: DisplayMode;
  orientationRevision: number;
  canvasGeneration: number;
}

interface SkyNavigationRequest {
  object: SkyObjectIdentity;
  expectedContext: ObservationContext;
  visibilityRevision: number;
  binding: string;
  committedAt: string;
  at: string;
  mode: DisplayMode;
  canvasGeneration: number;
  catalog: { catalogVersion: string; catalogHash: string } | null;
}

interface SkyCanvasFrame extends SkyCanvasResourceFrame {
  readonly orientationRevision: number;
  readonly data: SkySceneFrameIdentity["observation"]["data"];
  readonly frameAt: SkySceneFrameIdentity["observation"]["frameAt"];
  readonly timePresentation: SkyTimePresentation | null;
  readonly timePresentationScope: object;
  readonly heading: number | null;
  readonly pose: DevicePose | null;
  readonly manualBasis: SkyViewBasis | null;
  readonly mode: DisplayMode;
  readonly verticalFovDeg: number;
  readonly constellations: ConstellationFrame | null;
  readonly coordinateGrids: SkyCoordinateGrids;
  readonly stellarSupplement: SkyStellarSupplementFrame | null;
  readonly sceneReady: boolean;
  readonly owner: AcceptanceSkySceneInspectionOwner | null;
  readonly inspection: Omit<AcceptanceSkySceneInspection, "state" | "drawRevision">;
}

interface SkyCanvasImage {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  width?: number;
  height?: number;
}

type SkyCanvasNode = SkyWebGLCanvas<SkyCanvasImage>;

type SkyCanvasImageAsset = SkyDeepSkyImageFrame;

function canvasMeasurement(value: unknown, index = 0) {
  return (Array.isArray(value) ? value[index] : index === 0 ? value : null) as
    | { node?: SkyDisplayCanvas }
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

const TARGET_SUMMARY: Readonly<Record<SkyReport["targets"][number]["type"], string>> = {
  STAR: "查看这颗恒星此刻的方向",
  PLANET: "查看这颗行星此刻的方向",
  CONSTELLATION: "查看这个星座此刻的方向",
  MILKY_WAY: "标记的是银河中心方向",
  METEOR_SHOWER: "标记的是流星看起来飞出的方向",
  CONJUNCTION: "两颗天体在天空中相互靠近",
};

interface SpotNightRouteContext {
  spotId: string;
  locationName: string;
  contextId: string;
  localDate: string;
  selectedAt: string;
  timezone: string;
  dataRevision: string;
  proposalAttemptId?: string | undefined;
  proposalAttemptBaseRevision?: number | undefined;
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
    if (!Number.isFinite(instant.getTime())) return timezone;
    const parts = localParts(instant, timezone);
    const localAsUtc = new Date(0);
    localAsUtc.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    localAsUtc.setUTCHours(parts.hour, parts.minute, parts.second, 0);
    // Both sides describe the same second. Displaying minutes must not round
    // omitted seconds into a different zone, or absorb the input milliseconds.
    const utcAtSecond = Math.floor(instant.getTime() / 1000) * 1000;
    const minutes = Math.round((localAsUtc.getTime() - utcAtSecond) / 60_000);
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
  const direction = skyDirectionLabel(target.azimuthDeg);
  const altitude = skyHeightLabel(target.altitudeDeg);
  const window = target.window
    ? `${target.window.start}—${target.window.end}`
    : "时段未定";
  return (
    <Button
      className={`sky-target-row ${className}`}
      ariaLabel={`查看${target.displayName}信息，${TARGET_TYPE_LABEL[target.type]}，${direction}，${altitude}，${window}`}
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
      <View className="sky-target-row__geometry type-data">
        <Text>{direction}</Text>
        <Text>{target.altitudeDeg !== null && target.altitudeDeg >= 0 ? `高度 ${altitude}` : altitude}</Text>
      </View>
    </Button>
  );
}

function skyTargetWindowLabel(
  target: SkyReport["targets"][number],
) {
  return target.window
    ? `时段 ${target.window.start}—${target.window.end}`
    : "时段未定";
}

function SkyOrientationTargetLabel({
  target,
  projection,
  width,
  onSelect,
  disabled,
  opacity,
}: {
  target: SkyReport["targets"][number];
  projection: SkyTargetProjection;
  width: number;
  height: number;
  timezone: string;
  onSelect: (target: SkyReport["targets"][number]) => void;
  disabled: boolean;
  opacity:number;
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
      style={{ left: `${left}px`, top: `${top}px`,opacity }}
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
  width,
  onSelect,
  disabled,
}: {
  object: PaintedSkyObject;
  opacity: number;
  width: number;
  onSelect: (object: PaintedSkyObject) => void;
  disabled: boolean;
}) {
  const kindLabel = skyObjectKindLabel(object.kind);
  const magnitudeLabel = skyObjectMagnitudeLabel(object);
  return (
    <Button
      className={`sky-orientation-catalog-label${object.x > width / 2 ? " sky-orientation-catalog-label--left" : ""}`}
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
  onBack,
  onSources,
}: {
  target: SkyReport["targets"][number];
  spotName: string;
  selectedAt: string;
  timezone: string;
  onClose: () => void;
  onBack?: (() => void) | undefined;
  onSources: () => void;
}) {
  const altitude = skyHeightLabel(target.altitudeDeg);
  return (
    <SkyObjectDialog title={target.displayName} subtitle={TARGET_TYPE_LABEL[target.type]} onClose={onClose} onBack={onBack}
      priority={<View className="sky-object-modal__target-priority"><SourceButton className="sky-source-link" onOpen={onSources} /><View className="sky-object-modal__facts sky-object-modal__facts--core">
        <View><Text>方向</Text><Text>{skyDirectionLabel(target.azimuthDeg)}</Text></View>
        <View><Text>高度</Text><Text>{altitude}</Text></View>
        {target.window ? <View><Text>参考时段</Text><Text>{target.window.start}—{target.window.end}</Text></View> : null}
      </View></View>}>
          <Text className="sky-object-modal__reason">{TARGET_SUMMARY[target.type]}</Text>
          {target.type === "METEOR_SHOWER" ? <Text className="sky-object-modal__hint">流星也可能出现在天空其他位置</Text> : null}
          <Text className="sky-object-modal__limitation">
            {target.altitudeDeg !== null && target.altitudeDeg < 0 ? "此刻在地平线下" : "是否可见，还受天气与现场遮挡影响"}
          </Text>
    </SkyObjectDialog>
  );
}

function SkyCatalogInformation({
  active = true,
  reference,
  knownName,
  knownKind,
  onClose,
  onBack,
  positionAction,
  imagePublicationHash,
  opticalPublicationHash,
  bodyImagePublicationHash,
  openSourceRoute,
}: {
  active?: boolean;
  reference: string;
  knownName: string;
  knownKind: PaintedSkyObject["kind"];
  onClose: () => void;
  onBack?: (() => void) | undefined;
  positionAction?: ReactNode;
  imagePublicationHash?: string;
  opticalPublicationHash?: string;
  bodyImagePublicationHash?: string | undefined;
  openSourceRoute(url: string): Promise<void>;
}) {
  const openingSources = useRef(false);
  const notify = useAppStore((state) => state.notify);
  const information = useCelestialInformation(reference, active, imagePublicationHash, opticalPublicationHash);
  const openSources = async () => {
    if (!active || openingSources.current) return;
    openingSources.current = true;
    try {
      await openSourceRoute(celestialInformationSourceRoute(reference, imagePublicationHash, opticalPublicationHash,bodyImagePublicationHash));
    } catch {
      notify({ owner: "spot-night", placement: "floating", tone: "info",
        title: "打开失败", body: "来源页未打开，请重试", dedupeKey: "sky-source-navigation" });
    } finally { openingSources.current = false; }
  };
  const unavailable = information.data?.dataState === "UNAVAILABLE";
  const data: CelestialObjectInformation | undefined = unavailable ? undefined : information.data?.data;
  const title = data?.displayName ?? knownName;
  const resolvedKind = data?.kind ?? knownKind;
  const stale = Boolean(data && (information.refreshError || information.data?.dataState === "STALE_USABLE"));
  const partialDetail = data ? celestialInformationPartialDetail(information.data) : null;
  const failed = information.isError || stale || unavailable;
  useEffect(() => {
    if (!active || !failed) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info", title: "资料未全",
      body: "部分资料未加载，可在说明中重试", dedupeKey: `sky-object-information:${reference}` });
  }, [active, failed, notify, reference, title]);
  return (
    <SkyObjectDialog title={title} subtitle={skyObjectIdentityLabel({ kind: resolvedKind, reference })} reference={reference} onClose={onClose} onBack={onBack}
      priority={<View className="sky-object-modal__priority"><SourceButton className="sky-source-link" onOpen={openSources} />{positionAction}</View>}>
          {information.isPending ? <StatusPanel state="LOADING" detail="正在加载资料…" /> : null}
          {information.isError || unavailable ? (
            <StatusPanel state="ERROR" detail="资料未加载，请重试"
              recoveryLabel="重试资料" onRecover={() => void information.refetch()} />
          ) : null}
          {stale ? <StatusPanel state="STALE" detail="更新失败，显示上次资料"
            recoveryLabel="重试资料" onRecover={() => void information.refetch()} /> : null}
          {partialDetail ? <StatusPanel state="PARTIAL" detail={partialDetail}
            recoveryLabel="重试资料" onRecover={() => void information.refetch()} /> : null}
          {data ? (
            <>
              <Text className="sky-object-modal__section">介绍</Text>
              {data.contentState !== "READY" ? <Text className="sky-object-modal__hint">介绍尚未收录，已提供基本资料</Text> : null}
              {data.introduction ? <Text className="sky-object-modal__reason">{data.introduction}</Text> : null}
              {data.aliases.length ? <View className="sky-object-modal__aliases"><Text>别名</Text><Text>{data.aliases.join(" · ")}</Text></View> : null}
              <Text className="sky-object-modal__section">详细资料</Text>
              <View className="sky-object-modal__facts">
                {data.facts.map((fact) => (
                  <View key={fact.label}><Text>{fact.label}</Text><Text>{fact.value}{fact.unit ? ` ${fact.unit}` : ""}</Text></View>
                ))}
              </View>
            </>
          ) : null}
    </SkyObjectDialog>
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
    // Only a fallback before actual native tick layout becomes available.
  }
  return 20;
}

function orientationRulerLabel(
  row: SkyTimeRulerRow | undefined,
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
  presentationPending = false,
  presentationFailed = false,
  requirePaintedTime = false,
  playing,
  timezone,
  isPreviewing,
  saving,
  interactionLocked = false,
  layoutReady = true,
  selectionReady = true,
  preparing = false,
  onEntryReady,
  reducedMotion,
  onPreview,
  onCommit,
  onCancel,
  onScrubChange,
}: {
  rows: readonly SkyTimeRulerRow[];
  activeIndex: number;
  committedIndex: number;
  presentedAt?: string;
  presentationPending?: boolean;
  presentationFailed?: boolean;
  requirePaintedTime?: boolean;
  playing?: boolean;
  timezone: string;
  isPreviewing: boolean;
  saving: boolean;
  interactionLocked?: boolean;
  layoutReady?: boolean;
  selectionReady?: boolean;
  preparing?: boolean;
  onEntryReady?: (ready: boolean) => void;
  reducedMotion: boolean;
  onPreview: (index: number) => void;
  onCommit: (index: number) => void;
  onCancel: () => void;
  onScrubChange?: (active: boolean) => void;
}) {
  const interactionDisabled = saving || interactionLocked;
  const interactionAllowed = useRef(!interactionDisabled);
  interactionAllowed.current = !interactionDisabled;
  const safeActiveIndex = clampIndex(activeIndex, rows.length);
  const safeCommittedIndex = clampIndex(committedIndex, rows.length);
  const rowIdentity = rows.map(row => row.at).join("|");
  const [visualIndex, setVisualIndex] = useState(safeActiveIndex);
  const [alignedRows, setAlignedRows] = useState<string | null>(null);
  const [positionFailed, setPositionFailed] = useState(false);
  const entryReady = useRef(onEntryReady);
  entryReady.current = onEntryReady;
  const settleCallback = useRef<(offset: number) => void>(() => {});
  const interactionFinished = useRef<() => void>(() => {});
  const scrubChangeRef = useRef(onScrubChange);
  scrubChangeRef.current = onScrubChange;
  const settlementRef = useRef<ReturnType<typeof createSkyTimeRulerSettlement> | null>(null);
  if (!settlementRef.current) settlementRef.current = createSkyTimeRulerSettlement(offset => settleCallback.current(offset),
    active => { scrubChangeRef.current?.(active); if (!active) interactionFinished.current(); });
  const settlement = settlementRef.current;
  const nativePositionRef = useRef<ReturnType<typeof createRulerScrollPosition> | null>(null);
  if (!nativePositionRef.current) nativePositionRef.current = createRulerScrollPosition("sky-orientation-time-ruler-scroll");
  const nativePosition = nativePositionRef.current;
  const visible = useRef(true);
  const layoutAllowed = useRef(layoutReady);
  layoutAllowed.current = layoutReady;
  const selectionAllowed = useRef(selectionReady);
  selectionAllowed.current = selectionReady;
  const nativeRows = useRef<string | null>(null);
  const positionedIndex = useRef<number | null>(null);
  const alignmentRequired = useRef(true);
  const currentRows = useRef(rowIdentity);
  if (currentRows.current !== rowIdentity) {
    // Even A -> B -> A must cross the latest native child update. A retained
    // identity from A cannot certify that its replacement is installed yet.
    nativeRows.current = null;
    currentRows.current = rowIdentity;
  }
  const positionRevision = useRef(0);
  const pendingAlignment = useRef<{ revision: number; index: number; rows: string; reading: boolean } | null>(null);
  const layoutRef = useRef<ReturnType<typeof createOrientationRulerLayout> | null>(null);
  const positionLayout = useRef({ ready: layoutReady, revision: 0 });
  if (positionLayout.current.ready !== layoutReady) {
    positionLayout.current = { ready: layoutReady, revision: positionLayout.current.revision + 1 };
    // Preparation's offset does not certify the native geometry after the
    // surface reveal. Retire it before effects, including a quick ready ->
    // opening -> ready reversal with a queued native callback.
    positionRevision.current++;
    nativePosition.cancel();
    pendingAlignment.current = null;
    // The queued geometry read owns a separate revision. Returning to ready
    // must not revive its preparation sample before the new effects run.
    layoutRef.current?.invalidate(settlement.active);
    if (!settlement.active) {
      nativeRows.current = null;
      alignmentRequired.current = true;
    }
  }
  const observePosition = useRef<(left: number | null, finished?: boolean) => void>(() => {});
  const cancelPosition = useCallback(() => {
    positionRevision.current++;
    pendingAlignment.current = null;
    nativePosition.cancel();
  }, [nativePosition]);
  const targetIndex = useRef(safeActiveIndex);
  if (!settlement.active) targetIndex.current = safeActiveIndex;
  const positionResolved = useRef<() => void>(() => {});
  if (!layoutRef.current) layoutRef.current = createOrientationRulerLayout((accept, current) => {
    Taro.nextTick(() => {
      if (!current()) return;
      try {
        Taro.createSelectorQuery()
          .select("#sky-orientation-time-ruler-axis").boundingClientRect()
          .select("#sky-orientation-time-ruler-tick-0").boundingClientRect()
          .select("#sky-orientation-time-ruler-tick-1").boundingClientRect()
          .select("#sky-orientation-time-ruler-scroll").scrollOffset()
          .exec(accept);
      } catch { accept([]); }
    });
  }, () => visible.current && layoutAllowed.current && !settlement.active, () => positionResolved.current());
  const layout = layoutRef.current;
  const measuredLayoutRevision = useRef(positionLayout.current.revision);
  const positionIndex = useCallback((index: number, afterNativeUpdate = false) => {
    targetIndex.current = index;
    cancelPosition();
    if (!layoutAllowed.current && positionedIndex.current !== index) alignmentRequired.current = true;
    if (!visible.current || !layoutAllowed.current || !selectionAllowed.current || !interactionAllowed.current || settlement.active) return;
    // Entry must use the actual unscaled layout. A nominal rpx estimate can
    // put the first visible selected tick several native pixels off center.
    if (preparing && !layout.measured) return;
    const expected = positionRevision.current;
    const left = layout.left(index, orientationRulerStepPx());
    const verify = alignmentRequired.current || preparing || alignedRows !== rowIdentity || nativeRows.current !== rowIdentity;
    if (verify) {
      alignmentRequired.current = true;
      setAlignedRows(null);
      setPositionFailed(false);
      pendingAlignment.current = { revision: expected, index, rows: rowIdentity, reading: false };
    }
    // React effects precede Taro's native update. Replacing all row keys can
    // reset that native position. Target installed rows, not their predecessor.
    const move = () => {
      if (expected !== positionRevision.current || !visible.current ||
        !layoutAllowed.current || !selectionAllowed.current || !interactionAllowed.current || settlement.active ||
        currentRows.current !== rowIdentity) return;
      nativeRows.current = rowIdentity;
      positionedIndex.current = index;
      // There is one positioning writer. Newly installed windows jump while
      // hidden; an established window keeps native motion and direct input.
      nativePosition.move(left, !verify && !reducedMotion,
        verify ? observed => observePosition.current(observed) : undefined);
    };
    // Already installed rows (including short-drag snapping) need no new
    // nextTick wait. A completed layout read has crossed that same boundary.
    if (afterNativeUpdate || nativeRows.current === rowIdentity) move();
    else Taro.nextTick(move);
  }, [layout, nativePosition, cancelPosition, settlement, rowIdentity, preparing, alignedRows, reducedMotion]);
  observePosition.current = (left, finished = false) => {
    const pending = pendingAlignment.current;
    if (!pending || pending.revision !== positionRevision.current || pending.rows !== currentRows.current ||
      pending.rows !== nativeRows.current ||
      !visible.current || !layoutAllowed.current || !selectionAllowed.current || !interactionAllowed.current || settlement.active) return;
    if (left !== null && layout.aligned(left, pending.index)) {
      pendingAlignment.current = null;
      alignmentRequired.current = false;
      setAlignedRows(pending.rows);
      setPositionFailed(false);
    } else if (left === null || finished) {
      pendingAlignment.current = null;
      setPositionFailed(true);
    }
    // A first valid but not-yet-matching offset is pending, not unavailable.
    // Reveal the existing six fields with an honest recoverable ruler state;
    // later native scroll events can qualify the ticks without a poll loop.
    entryReady.current?.(true);
  };
  const readPendingPosition = (finished = false) => {
    const pending = pendingAlignment.current;
    if (!pending || pending.reading || pending.rows !== nativeRows.current) return;
    pending.reading = true;
    nativePosition.readOffset(left => {
      if (pending !== pendingAlignment.current) return;
      pending.reading = false;
      observePosition.current(left, finished);
    });
  };
  positionResolved.current = () => {
    if (!layout.measured) {
      setPositionFailed(true);
      entryReady.current?.(true);
      return;
    }
    positionIndex(targetIndex.current, true);
  };
  // Resize already marks the layout for measurement while retaining the held
  // drag's projection. Keep it through this drag's final offset conversion;
  // the nextTick measurement replaces it only after settlement has finished.
  interactionFinished.current = () => layout.measure();
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const cancelInteraction = () => {
    const pending = settlement.active;
    settlement.cancel();
    // A new geometry window is not a cancelled time preview. Its committed
    // instant may be outside the supplied rows; only a pending drag retracts
    // the observation-time intention to that committed instant.
    if (!selectionAllowed.current || pending && committedIndex < 0) {
      if (pending) cancelRef.current();
      return;
    }
    const nextIndex = pending ? safeCommittedIndex : safeActiveIndex;
    setVisualIndex(nextIndex);
    positionIndex(nextIndex);
    if (pending) cancelRef.current();
  };
  useDidHide(() => {
    visible.current = false; nativeRows.current = null;
    setAlignedRows(null); entryReady.current?.(false);
    layout.invalidate(); cancelInteraction(); cancelPosition();
  });
  useDidShow(() => {
    visible.current = true; layout.invalidate(); positionIndex(safeActiveIndex); layout.measure();
  });
  useResize(() => {
    cancelPosition();
    if (!settlement.active) setAlignedRows(null);
    // Keep the held drag's conversion until its existing owner finishes. A
    // resized measurement must never seize the finger or rebase its preview.
    layout.invalidate(settlement.active);
    layout.measure();
  });
  useEffect(() => () => {
    visible.current = false;
    entryReady.current?.(false);
    layout.invalidate();
    cancelPosition();
    if (settlement.active) {
      settlement.cancel();
      cancelRef.current();
    }
  }, []);
  useEffect(() => {
    // Preparation cannot certify the surface after reveal. Its own transition
    // endpoint permits a new layout read, not reuse of the earlier receipt.
    // The current hidden native position must be observed before showing ticks.
    cancelPosition();
    // A row replacement alone keeps cadence/origin. A surface geometry gate
    // change requires a fresh projection; a failed endpoint read must not
    // certify entry using the former transparent preparation. As on resize,
    // keep a held drag's conversion until its existing settlement finishes.
    const sameGeometry = measuredLayoutRevision.current === positionLayout.current.revision;
    measuredLayoutRevision.current = positionLayout.current.revision;
    layout.invalidate(sameGeometry || settlement.active);
    layout.measure();
    return () => layout.retire();
  }, [rowIdentity, layoutReady, positionLayout.current.revision]);
  useEffect(cancelInteraction, [committedIndex, rowIdentity, interactionDisabled]);
  useEffect(() => {
    // Missing time coverage is handled by the existing six fields/recovery.
    // Preparing a ruler must not hide those controls while supply is pending.
    if (preparing && (!selectionReady || !rows.length)) entryReady.current?.(true);
  }, [preparing, selectionReady, rows.length]);

  useEffect(() => {
    // The selected civil time may arrive before its geometry window. Neither
    // the old row zero nor its final row represents that pending intention.
    if (settlement.active || !selectionReady) return;
    const nextIndex = clampIndex(activeIndex, rows.length);
    setVisualIndex(nextIndex);
    positionIndex(nextIndex);
  }, [activeIndex, rows.length, rowIdentity, selectionReady]);

  const maxIndex = Math.max(0, rows.length - 1);
  const activeRow = rows[safeActiveIndex];
  const setPreviewFromScroll = useCallback(
    (nextScrollLeft: number) => {
      const projected = layout.index(nextScrollLeft, orientationRulerStepPx());
      const nextFloat = rows.length ? Math.max(0, Math.min(projected, rows.length - 1)) : 0;
      const nextIndex = clampIndex(Math.round(nextFloat), rows.length);
      setVisualIndex(nextFloat);
      onPreview(nextFloat);
      return nextIndex;
    },
    [onPreview, rows.length, layout],
  );
  const settle = useCallback(
    (nextScrollLeft: number) => {
      const nextIndex = setPreviewFromScroll(nextScrollLeft);
      setVisualIndex(nextIndex);
      positionIndex(nextIndex);
      settlement.cancel();
      onCommit(nextIndex);
    },
    [onCommit, setPreviewFromScroll, settlement, nativePosition, layout],
  );
  settleCallback.current = offset => {
    if (!interactionDisabled) settle(offset);
  };
  const selectTick = useCallback(
    (nextIndex: number) => {
      const safeIndex = clampIndex(nextIndex, rows.length);
      settlement.cancel();
      setVisualIndex(safeIndex);
      positionIndex(safeIndex);
      onPreview(safeIndex);
      onCommit(safeIndex);
    },
    [onCommit, onPreview, rows.length, settlement, nativePosition, layout],
  );
  const stepTime = useCallback(
    (delta: number) => {
      selectTick(safeActiveIndex + delta);
    },
    [safeActiveIndex, selectTick],
  );
  const previewValue = rows.length ? clampIndex(Math.round(visualIndex), rows.length) : 0;
  const ticksVisible = !alignmentRequired.current && alignedRows === rowIdentity && nativeRows.current === rowIdentity &&
    (layoutReady || settlement.active);
  const currentLabel = presentedAt
    ? formatTimeWithSeconds(presentedAt, timezone)
    : requirePaintedTime ? "暂无已绘时刻"
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
        <Text className="sky-orientation-time-ruler__empty">此日暂无可选时间</Text>
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
        {saving || presentationPending || presentationFailed || isPreviewing || playing ? (
          <Text className="sky-orientation-time-ruler__current-state">
            {saving ? "保存中" : presentationFailed ? "未更新" : presentationPending ? "更新中" : playing ? "播放中" : "预览"}
          </Text>
        ) : null}
      </View>
      <View id="sky-orientation-time-ruler-axis" className="sky-orientation-time-ruler__axis" aria-hidden="true"
        style={{ opacity: ticksVisible ? 1 : 0 }} />
      {/* Admission changes only the fixed contents' presentation. Keep the
          native container unchanged and its controls in fixed sibling slots,
          so a removal cannot rehydrate its parent after a position read. */}
      <ScrollView
        scrollX={!interactionDisabled}
        enhanced
        fastDeceleration
        showScrollbar={false}
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
          cancelPosition();
          layout.retire();
          settlement.begin();
        }}
        onTouchMove={(event) => {
          if ((event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) cancelInteraction();
        }}
        onTouchEnd={() => settlement.release()}
        onDragEnd={() => settlement.release()}
        onTouchCancel={cancelInteraction}
        onScroll={(event) => {
          const nextScrollLeft = Number(event.detail.scrollLeft);
          const pending = pendingAlignment.current;
          // An event can be queued by a preceding command. It is only a cue
          // for a current read, never the receipt of a replacement window.
          if (!settlement.active && pending && layout.aligned(nextScrollLeft, pending.index)) readPendingPosition();
          if (interactionDisabled || !settlement.active) return;
          if (Number.isFinite(nextScrollLeft)) {
            settlement.update(nextScrollLeft);
            setPreviewFromScroll(nextScrollLeft);
          }
        }}
        onScrollEnd={() => {
          readPendingPosition(true);
          if (interactionDisabled || !settlement.active) return;
          settlement.end();
        }}
      >
        <View className="sky-orientation-time-ruler__track"
          style={{ opacity: ticksVisible ? 1 : 0, pointerEvents: ticksVisible ? "auto" : "none" }}>
          {rows.map((row, index) => {
            const distance = orientationRulerDistance(index, visualIndex);
            const isSelected = index === previewValue;
            const isEvent = Boolean(
              row.opportunityBlockers?.length === 0 && row.opportunityEligible,
            );
            return (
              <Button
                key={`${row.at}:${index}`}
                id={`sky-orientation-time-ruler-tick-${index}`}
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
      <View className="sky-orientation-time-ruler__position-guard" catchMove
        style={{ opacity: ticksVisible ? 0 : 1, pointerEvents: ticksVisible ? "none" : "auto" }}
        onClick={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()}
        onTouchMove={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
        <Button className="sky-orientation-time-ruler__position-state"
          disabled={ticksVisible || interactionDisabled || !layoutReady}
          onClick={() => {
            if (ticksVisible || interactionDisabled || !layoutReady) return;
            cancelPosition(); setPositionFailed(false);
            layout.invalidate(true); layout.measure();
          }}>
          {positionFailed ? "时间尺暂不可用，重试" : "时间尺定位中，重试"}
        </Button>
      </View>
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
      <SoftButton
        variant="ghost"
        className={`sky-orientation-time-ruler__cancel${isPreviewing ? "" : " sky-orientation-time-ruler__cancel--inactive"}`}
        label="取消观测时刻预览"
        disabled={interactionDisabled || !isPreviewing}
        onClick={() => {
          if (!isPreviewing) return;
          settlement.cancel();
          if (committedIndex >= 0) {
            setVisualIndex(safeCommittedIndex);
            positionIndex(safeCommittedIndex);
          }
          onCancel();
        }}
      >
        取消预览
      </SoftButton>
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

function ContextError({ lookupError, onRetry }: { lookupError?: unknown; onRetry?: () => void }) {
  const lookupFailed = Boolean(onRetry && lookupError);
  const rejected = lookupFailed && skyReportAccessRejection(lookupError);
  return <View className="page-inset sky-context-error">
    <StatusPanel state={lookupFailed ? "ERROR" : "EMPTY"}
      detail={lookupFailed ? rejected ? "地点或时间已失效，请重新选择" : "地点与时间未恢复，请重试" : "地点与时间不完整，请从菜单返回"}
      {...(lookupFailed ? { recoveryLabel: rejected ? "重新核验" : "重试", onRecover: onRetry } : {})} />
  </View>;
}

/** Explicit caller-owned publication selection; ordinary routes omit it.
 * The transport still admits the pinned publication and owns its availability. */
export interface SpotSkyPageProps {
  /** Conditional HiPS may opt into the existing bounded contribution owner;
   * omission performs no probe work and never certifies visible provenance. */
  readonly opticalHipsContributions?:{readonly auxiliaryBytesLimit?:number;readonly maxGroups:number};
  readonly targetOpticalPublication?: Readonly<{ kind: "sdss-calibrated" | "prepared-optical-v1" | "prepared-display-optical-v1" | "prepared-optical-v2" | "prepared-native-optical-v1" | "prepared-derived-region-optical-v1";
    reference: string; publicationHash: string;
    artworkContributions: { readonly auxiliaryBytesLimit?: number; readonly maxGroups: number } }>;
}
export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {
  // Explicit trial limits remain fixed. Ordinary adopted Prepared fields use
  // only this frame's actual group count and native drawing-buffer dimensions.
  const contributionInput=targetOpticalPublication?.artworkContributions??opticalHipsContributions;
  const opticalContributionPolicy = useRef(contributionInput ? Object.freeze({
    auxiliaryBytesLimit: contributionInput.auxiliaryBytesLimit,
    maxGroups: contributionInput.maxGroups,
  }) : undefined);
  const automaticContributionGroupsRef = useRef(0);
  const router = useRouter();
  const entryRouteContext = useMemo<SpotNightRouteContext>(
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
      proposalAttemptId: safeParam(router.params.proposalAttemptId) || undefined,
      proposalAttemptBaseRevision: Number(router.params.proposalAttemptBaseRevision) || undefined,
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
      router.params.proposalAttemptId,
      router.params.proposalAttemptBaseRevision,
    ],
  );
  const storedContext = useAppStore((state) => state.observationContext);
  const accountOwnerId = useAppStore((state) => state.accountOwnerId);
  const routeContext: SpotNightRouteContext = storedContext?.location.kind === "FORMAL_SPOT" &&
    matchesPrivateProposal(storedContext, accountOwnerId, entryRouteContext.spotId, entryRouteContext.proposalAttemptId, entryRouteContext.proposalAttemptBaseRevision)
    ? { ...entryRouteContext, spotId: storedContext.location.spotId, timezone: storedContext.timezone,
        localDate: storedContext.localDate, selectedAt: storedContext.selectedAtUtc, dataRevision: storedContext.contextFingerprint, locationName: "" }
    : entryRouteContext;
  const [pageVisible, setPageVisible] = useState(true);
  const sourceReturnRef = useRef(false);
  const [sourceReturn, setSourceReturn] = useState(false);
  // Only our Sources route retains ready resources. Hidden work and all other
  // navigation/background teardown keep their existing cancellation semantics.
  const resourcePageVisible = pageVisible || sourceReturn;
  const contextSession = useMemo(
    () => createSkyContextSession(routeContext.contextId, () => useAppStore.getState()),
    [routeContext.contextId],
  );
  const timeCommitContinuity = useMemo(() => createSkyTimeCommitContinuity(useSkyForecastQuery.presentation), []);
  const skyInteractionRevision = contextSession.visibilityRevision;
  const hideSkyPageRef = useRef<(retainSources?: boolean) => void>(() => {});
  const showSkyPageRef = useRef(() => {});
  useEffect(() => {
    if (viewportActiveRef.current) contextSession.show();
    else contextSession.hide();
    return () => contextSession.hide();
  }, [contextSession]);
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const notify = useAppStore((state) => state.notify);
  const mode = useAppStore((state) => state.mode);
  const opticalSourcesOpeningRef = useRef<object | null>(null);
  const orientationSettingsOpeningRef = useRef<object | null>(null);
  const openSkySources = async (sourceRoute: string, document?: SourceDocument) => {
    // Native taps may be queued before begin(); use the current controller,
    // not a captured render flag, before hiding the frozen alignment frame.
    if (!skyTimeIntentCurrent() || opticalSourcesOpeningRef.current) return;
    cancelSkyCalibration();
    const navigation = {};
    opticalSourcesOpeningRef.current = navigation;
    sourceReturnRef.current = Boolean(canvasNodeRef.current);
    setSourceReturn(sourceReturnRef.current);
    try { await navigateToSource({ url: sourceRoute, ...(document ? { document } : {}) }); }
    catch (error) {
      reportRuntimeError("native", "sky_source_navigation_failed", error);
      if (opticalSourcesOpeningRef.current !== navigation) return;
      sourceReturnRef.current = false; setSourceReturn(false);
      if (!viewportActiveRef.current) canvasLifecycle.hide();
      if (skyTimeIntentCurrent()) notify({ owner: "spot-night", placement: "floating", tone: "info",
        title: "打开失败", body: "来源页未打开，请重试", dedupeKey: "sky-source-navigation" });
    }
    finally {
      if (opticalSourcesOpeningRef.current === navigation) {
        opticalSourcesOpeningRef.current = null;
        if (viewportActiveRef.current) { sourceReturnRef.current = false; setSourceReturn(false); }
      }
    }
  };
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
    ...(navigationInsets.statusBarHeight !== undefined ? { "--sky-observer-top": `${navigationInsets.statusBarHeight + 12}px` } : {}),
  } as CSSProperties;
  const routeContextComplete = useMemo(() => Boolean(
    (routeContext.spotId.startsWith("spot:") || routeContext.spotId.startsWith("contribution:")) &&
    routeContext.contextId.startsWith("ctx:") &&
    isDate(routeContext.localDate) && isSelectedAt(routeContext.selectedAt) &&
    validTimezone(routeContext.timezone) &&
    observationDateFor(routeContext.selectedAt, routeContext.timezone) === routeContext.localDate &&
    routeContext.dataRevision,
  ), [routeContext]);
  const contextLookupEnabled = routeContextComplete && pageVisible && contextSession.canLookup() &&
    routeContext.contextId.startsWith("ctx:") && storedContext?.contextId !== routeContext.contextId;
  const activeContext: ObservationContext | null =
    storedContext?.contextId === contextSession.contextId ? storedContext : null;
  const privateLookupEnabled = pageVisible && Boolean(activeContext?.privateProposal && activeContext.privateProposal.ownerId === accountOwnerId);
  const contextLookup = useResourceQuery({
    queryKey: ["observation-context", accountOwnerId, contextSession.contextId],
    queryFn: async (signal) => {
      const current = useAppStore.getState().observationContext;
      const request = current?.privateProposal ? contextSession.begin(current) : null;
      try {
        let response;
        try { response = await getObservationContext(contextSession.contextId, signal); }
        catch (error) {
          if (!request || !current || !contextSession.isCurrent(request) || !(error instanceof MiniappApiError) ||
              (error.code !== "NOT_FOUND" && error.code !== "STALE_REJECTED")) throw error;
          response = await restoreObservationContext(current, signal);
        }
        if (request && contextSession.accept(request, response.data)) setObservationContext(response.data);
        return response;
      } catch (error) {
        if (request && contextSession.isCurrent(request) && error instanceof MiniappApiError &&
            (error.code === "PERMISSION_DENIED" || error.code === "NOT_FOUND")) setObservationContext(null);
        throw error;
      } finally { if (request) contextSession.finish(request); }
    },
    enabled: contextLookupEnabled || privateLookupEnabled,
    staleTime: privateLookupEnabled ? 0 : 30_000,
    refetchInterval: privateLookupEnabled ? WEATHER_ALERT_REFRESH_MS : false,
  });

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
    (proposalRoute && (activeContext.location.kind === "MAP_POINT" ||
      (activeContext.location.kind === "PENDING_PROPOSAL" && activeContext.privateProposal?.submissionId === routeContext.spotId &&
        matchesPrivateProposal(activeContext, accountOwnerId, routeContext.spotId, routeContext.proposalAttemptId, routeContext.proposalAttemptBaseRevision))))
  ));
  const contextComplete = Boolean(
    routeContextComplete &&
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
  const reportQuery = useSkyForecastQuery({
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
  // Query intentionally keeps cached data during a failed refresh. A server
  // rejection of this location/identity/Context must revoke all Sky consumers,
  // including a Canvas retained across Sources; ordinary outages keep data.
  const rejectedReportError = skyReportAccessRejection(reportQuery.error ?? reportQuery.refreshError);
  const carriedReport = timeCommitContinuity.read(activeContext, routeContext.spotId,
    resourcePageVisible && contextComplete && Boolean(activeContext && contextSession.ownsContext(activeContext)),
    { data: reportQuery.data, pending: reportQuery.isPending || reportQuery.isFetching,
      failed: reportQuery.isError || Boolean(rejectedReportError) });
  const report = rejectedReportError ? { ...reportQuery, data: undefined,
    error: rejectedReportError, refreshError: undefined, isError: true as const,
    isPending: false as const } : carriedReport ? { ...reportQuery, data: carriedReport } : reportQuery;
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
  const observationTime = useMemo(() => createSkyObservationTime({ latestInstant: Date.now }), []);
  const [timeIntent, setTimeIntent] = useState(() => observationTime.snapshot());
  const timeScrubbing = timeIntent.editing.length > 0;
  const pauseSkyTime = () => setTimeIntent(observationTime.pause());
  const setPreviewIndex = (index: number | null) => {
    if (index === null) { setTimeIntent(observationTime.cancel()); }
    else {
      const at = report.data?.data.hourly[index]?.at;
      if (at) setTimeIntent(observationTime.preview(at));
    }
  };
  const [manualBasis, setManualBasis] = useState<SkyViewBasis | null>(INITIAL_MANUAL_SKY_VIEW);
  const manualBasisRef = useRef<SkyViewBasis | null>(INITIAL_MANUAL_SKY_VIEW);
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
  const previousViewportRef = useRef<{ width: number; height: number } | null>(null);
  const browsingDrawRef = useRef((_continuation = false) => {});
  const starTransitions = useMemo(() => createSkyStarTransitions(), []);
  const starDrawing = useMemo(() => createSkyStarDrawPreparation(), []);
  const readyImages = useMemo(() => createSkyReadyImages(), []);
  const nameLayouts = useMemo(() => createSkyNameLayouts(), []);
  const navigationRequestRef = useRef<SkyNavigationRequest | null>(null);
  const navigationCurrentRef = useRef<() => boolean>(() => true);
  const skySelectionPositionRef = useRef<SkySelectionPosition | null>(null);
  const onSkySelectionPosition = useCallback((position: SkySelectionPosition | null) => {
    skySelectionPositionRef.current = position;
    if (viewportMountedRef.current && viewportActiveRef.current) browsingDrawRef.current();
  }, []);
  const zoomRef = useRef(SKY_VERTICAL_FOV_DEG);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const stopBrowsingAnimation = useCallback(() => {
    navigationRequestRef.current = null;
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
  // This is only a pending page action. The orientation owner still owns
  // freezing/correction, and only lifecycle-accepted paint can finish it.
  const pendingSkyCalibrationRef = useRef<(SkyCalibrationScope & { context: SkyReport["context"] }) | null>(null);
  // Command scope only. Frozen view, latest raw pose and correction remain
  // exclusively with the orientation controller and its presentation revision.
  const editingSkyCalibrationRef = useRef<SkyCalibrationScope | null>(null);
  const [calibrationPreparing, setCalibrationPreparing] = useState(false);
  const cancelSkyCalibration = useCallback(() => {
    const editing = editingSkyCalibrationRef.current;
    editingSkyCalibrationRef.current = null;
    if (editing && orientationController.snapshot().presentationRevision === editing.orientationRevision)
      orientationController.cancel();
    if (pendingSkyCalibrationRef.current) {
      pendingSkyCalibrationRef.current = null;
      setCalibrationPreparing(false);
    }
  }, [orientationController]);
  const acceptSkyCalibrationRef = useRef<(frame: SkyCanvasFrame,
    view: { basis: SkyViewBasis | null; fov: number }) => void>(() => {});
  // Only lifecycle's accepted completion can publish this draw's actual view,
  // picking and immutable sources. The slot lives only around this attempt's done.
  const pendingSkyPaintRef = useRef<{ frame: SkyCanvasFrame; identity: SkySceneFrameIdentity; generation: number; publish: ((excludedNameKeys?:readonly string[]) => void) | null;
    camera: ReturnType<typeof browsingCamera.update> | null;
    selection: SkyObjectIdentity | null; reticle: SkyCanvasReticle | null;
    captions: readonly SkyCanvasCaption[]; constellationCaptions: readonly SkyCanvasCaption[];
    catalogNames: readonly SkyPlacedCatalogName[]; controlNames:readonly SkyPlacedControlName[] } | null>(null);
  // DOM labels must wait for the matching native frame; the ref alone cannot trigger that commit.
  const [presentedSkyFrame, setPresentedSkyFrameState] = useState<(Pick<SkyCanvasFrame,
    "data" | "frameAt" | "timePresentation" | "timePresentationScope" | "mode" | "constellations" | "constellationsEnabled" | "stellarSupplement"> &
    SkyCompletedSceneResources & { identity: SkySceneFrameIdentity; nativeCanvasGeneration: number;
      deepSkyAuxiliaryDecisions: readonly SkyDeepAuxiliaryDecision[];
      namedStars: NonNullable<SkyPickSnapshot["namedStars"]>;
      constellationNames: readonly string[];
      catalogNames: readonly SkyPlacedCatalogName[];
      controlNames:readonly SkyPlacedControlName[];
      resolvedBodyReferences: readonly string[]; suppressedBodyReferences: readonly string[];
    }) | null>(null);
  const presentedSkyFrameRef = useRef(presentedSkyFrame);
  const setPresentedSkyFrame = skyCommandStateSetter(presentedSkyFrameRef, setPresentedSkyFrameState);
  const canvasNodeRef = useRef<SkyCanvasNode | null>(null);
  const canvasSurfaceRef = useRef<SkyCanvasSurface<SkyCanvasImage> | null>(null);
  const canvasDisplayRef = useRef<SkyDisplayCanvas | null>(null);
  const canvasFrameClock = useMemo(() => createSkyCanvasFrameClock(() => canvasDisplayRef.current), []);
  const canvasGlRef = useRef<object | null>(null);
  const canvasGenerationRef = useRef(0);
  const deepSkyImageFailedRef = useRef<(image: object) => void>(() => {});
  const [canvasNodeRevision, setCanvasNodeRevision] = useState(0);
  const [constellationsEnabled, setConstellationsEnabled] = useState(true);
  const [landscapeEnabled, setLandscapeEnabled] = useState(true);
  const [coordinateGrids, setCoordinateGrids] = useState<SkyCoordinateGrids>({ horizontal: false, equatorial: false });
  const [wideFieldEnabled,setWideFieldEnabled]=useState(false);
  const [skyCatalogSourcesOpen, setSkyCatalogSourcesOpen] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const artworkFailureRef = useRef<(image: object) => void>(() => {});
  const opticalFailureRef = useRef<(image: object) => void>(() => {});
  const sdssOpticalFailureRef = useRef<(image: object) => void>(() => {});
  const preparedRegionFailureRef = useRef<(image: object) => void>(() => {});
  const wideFieldFailureRef = useRef<(image: object) => void>(() => {});
  const bodyImagesFailureRef=useRef<(image:object)=>void>(()=>{});
  const galacticImageFailureRef = useRef<(image: object) => void>(() => {});
  const landscapeImageFailureRef = useRef<(image: object) => void>(() => {});
  const measureBottomControls = useCallback(() => {
    if (!viewportActiveRef.current || !viewportMountedRef.current) return;
    const revision = ++viewportMeasurementRevision.current;
    Taro.nextTick(() => {
      if (!viewportActiveRef.current || !viewportMountedRef.current || revision !== viewportMeasurementRevision.current) return;
      Taro.createSelectorQuery()
        .select(`#${CANVAS_ID}`).boundingClientRect()
        .select(".sky-orientation-notification").boundingClientRect()
        .select(".sky-control-panel").boundingClientRect()
        .select(".sky-quick-settings").boundingClientRect()
        .select(".sky-navigation-actions").boundingClientRect()
        .select(".sky-orientation-details").boundingClientRect()
        .exec(results => {
        if (!viewportActiveRef.current || !viewportMountedRef.current || revision !== viewportMeasurementRevision.current) return;
        const [canvas, notification, panel, quickSettings, navigation, list] = results as (SkyScreenRect | null)[];
        if (canvas) {
          const bottom = [panel, list].filter((rect): rect is SkyScreenRect => Boolean(rect && rect.height > 0 && Number.isFinite(rect.top)))
            .reduce<SkyScreenRect>((first, rect) => rect.top < first.top ? rect : first,
              { top: canvas.bottom, bottom: canvas.bottom, height: 0 });
          const nativeBottom = navigationInsets.capsuleBottom ?? navigationInsets.safeTop ?? 0;
          const insets = skyInsetsFromControls(canvas, [...(notification ? [notification] : []), ...(quickSettings ? [quickSettings] : []),
            ...(navigation ? [navigation] : []),
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
  const [artworkContributionUnavailable, setArtworkContributionUnavailable] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasLifecycle = useMemo(() => createSkyCanvasLifecycle<SkyCanvasFrame, SkyGpuRenderer>({
    measure: done => {
      Taro.createSelectorQuery()
        .select(`#${CANVAS_ID}`)
        .fields({ node: true, size: true })
        .select(`#${CANVAS_ID}-selection`)
        .fields({ node: true, size: true })
        .exec(done);
    },
    validateContext: (_context, measurement, size) => {
      try {
        const node = canvasMeasurement(measurement)?.node;
        const ratio = Math.max(1, Taro.getWindowInfo().pixelRatio || 1);
        return Boolean(node && canvasSurfaceRef.current?.isCurrent(node, size, ratio, canvasMeasurement(measurement, 1)?.node) &&
          canvasSurfaceRef.current.gl === canvasGlRef.current);
      } catch { return false; }
    },
    suspended: () => { canvasSurfaceRef.current?.clearSelection?.(); starTransitions.reset(); starDrawing.reset(); readyImages.reset(); nameLayouts.reset(); pendingSkyPaintRef.current=null; paintedSkyObjectsRef.current=null; setPresentedSkyFrame(null); },
    createContext: (measurement, size) => {
      const display = canvasMeasurement(measurement)?.node;
      if (!display) throw new Error("sky_canvas_display_node_unavailable");
      const pixelRatio = Math.max(1, Taro.getWindowInfo().pixelRatio || 1);
      const selectionDisplay = canvasMeasurement(measurement, 1)?.node;
      if (!selectionDisplay) reportRuntimeError("native", "sky_selection_layer_node_unavailable");
      const surface = createSkyCanvasSurface<SkyCanvasImage>(display, size, pixelRatio, backing =>
        Taro.createOffscreenCanvas({ type: "webgl", ...backing }) as unknown as SkyCanvasNode,
        selectionDisplay);
      const { node, gl } = surface;
      let context: SkyGpuRenderer;
      try { context = createSkyGpuRenderer(gl, pixelRatio,{
        artworkContributions: opticalContributionPolicy.current ? skyArtworkContributionFrameBudget(
          gl.drawingBufferWidth, gl.drawingBufferHeight, opticalContributionPolicy.current.maxGroups,
          opticalContributionPolicy.current.auxiliaryBytesLimit) : () => skyArtworkContributionFrameBudget(
            gl.drawingBufferWidth, gl.drawingBufferHeight, automaticContributionGroupsRef.current),
        nativeNavigationHeightPx: Math.max(navigationInsets.statusBarHeight ?? 0,
          navigationInsets.capsuleBottom ?? 0),
        imageFailed(image){
        artworkFailureRef.current(image);opticalFailureRef.current(image);sdssOpticalFailureRef.current(image);
        preparedRegionFailureRef.current(image);
        deepSkyImageFailedRef.current(image);
        wideFieldFailureRef.current(image);bodyImagesFailureRef.current(image);
        galacticImageFailureRef.current(image);
        landscapeImageFailureRef.current(image);
      }}); } catch (error) { surface.dispose(); throw error; }
      canvasSurfaceRef.current = surface;
      canvasDisplayRef.current = display;
      canvasFrameClock.resetFailures();
      canvasGlRef.current = gl;
      setSolarLightUnavailable(false);
      setLandscapeUnavailable(false);
      setGalacticBandUnavailable(false);
      setSunDiscUnavailable(false);
      setPlanetDiscUnavailable(false);
      setArtworkContributionUnavailable(false);
      canvasNodeRef.current = node;
      setCanvasNodeRevision(++canvasGenerationRef.current);
      return context;
    },
    releaseContext: context => {
      starTransitions.reset();
      starDrawing.reset();
      readyImages.reset();
      nameLayouts.reset();
      const surface = canvasSurfaceRef.current;
      canvasSurfaceRef.current = null;
      canvasDisplayRef.current = null;
      canvasFrameClock.resetFailures();
      canvasNodeRef.current = null; canvasGlRef.current = null;
      canvasGenerationRef.current++;
      // Native callback detachment, renderer cleanup and both backing stores
      // retire independently. Lifecycle records a failure after fencing picks.
      try { context.dispose(); } finally { surface?.dispose(); }
    },
    resolveFrame: frame => {
      return viewportActiveRef.current ? resolveSkyCanvasResources(frame, canvasGenerationRef.current) : frame;
    },
    paint: (context, frame, size, done) => {
      // A queued pre-calibration frame must not move the newly locked scene
      // while React's coalesced presentation is catching up with the control.
      const live = orientation.latestPresentation.current ?? orientationController.snapshot();
      const resolvedView = resolveSkyCanvasView({
        queuedOrientationRevision: frame.orientationRevision, queuedBasis: frame.pose?.basis ?? null,
        live, manualBasis: manualBasisRef.current, tracking: Boolean(manualBasisRef.current && objectTracking.snapshot().target),
        requestedFov: zoomRef.current, width: size.width, height: size.height,
        occlusionInsets: viewportInsetsRef.current,
      });
      if (!navigationCurrentRef.current()) stopBrowsingAnimation();
      const { verticalFovDeg: requestedFov, progress, center } = resolvedView;
      const camera = browsingCamera.update({ localView: resolvedView.localView, intent: resolvedView.intent,
        progress, at: Date.now(), reducedMotion: reducedMotionRef.current });
      const resolvedBasis = camera.view;
      const fov = camera.verticalFovDeg ?? requestedFov;
      const starTransitionFrame = starTransitions.prepare({ context: frame.data?.context,
        at: frame.frameAt, mode: frame.mode }, Date.now(), reducedMotionRef.current, live.alignment.mode === "editing");
      const readyImageFrame = readyImages.prepare(Date.now(), reducedMotionRef.current, live.alignment.mode === "editing");
      const nameLayout = nameLayouts.prepare({context:frame.data?.context,mode:frame.mode},Date.now(),size.width,size.height,
        resolvedView.occlusionInsets,reducedMotionRef.current,live.alignment.mode === "editing");
      const resourceInputs = skySceneResourceInputs(frame, { generation: canvasGenerationRef.current,
        surface: context, previousLandscape: paintedSkyObjectsRef.current?.view?.landscape ?? null });
      automaticContributionGroupsRef.current = frame.mode === "OBSERVATION" ? 0 : (resourceInputs.imagery?.preparedRegions?.length ?? 0) +
        (resourceInputs.imagery?.targetOptical?.prepared ? 1 : 0);
      const sceneIdentity = createSkySceneFrameIdentity({
        observation: { data: frame.data, frameAt: frame.frameAt, stellarSupplement: frame.stellarSupplement,
          constellations: frame.constellations },
        view: { heading: frame.heading, pose: frame.pose, manualBasis: resolvedBasis, mode: frame.mode,
          verticalFovDeg: fov, center },
        canvas: { generation: canvasGenerationRef.current, width: size.width, height: size.height },
      }, presentedSkyFrameRef.current?.identity);
      const sceneInput: SkySceneFrameInput = { identity: sceneIdentity,
        ...resourceInputs,
        work: { starTransitions: starTransitionFrame, ...(frame.mode === "OBSERVATION" ? {} : { readyImages: readyImageFrame }), starDrawing },
        layers: {
          ...resourceInputs.layers,
          coordinateGrids: frame.coordinateGrids,
        },
      };
      const basis = sceneIdentity.view.manualBasis;
      const paintAttempt = { frame, identity: sceneIdentity, generation: sceneIdentity.canvas.generation,
        publish: null as ((excludedNameKeys?:readonly string[]) => void) | null, camera,
        selection: null as SkyObjectIdentity | null, reticle: null as SkyCanvasReticle | null,
        captions: [] as readonly SkyCanvasCaption[], constellationCaptions: [] as readonly SkyCanvasCaption[],
        catalogNames: [] as readonly SkyPlacedCatalogName[], controlNames:[] as readonly SkyPlacedControlName[] };
      drawSkyScene(context, sceneInput, {
        painted: ({ identity, snapshot, sources }) => {
          if (identity !== sceneIdentity || snapshot && snapshot.identity !== identity) return;
          const selection = objectSelection.snapshot(), position = skySelectionPositionRef.current;
          let selectionMarker:ReturnType<typeof projectSkySelectionMarker>=null;
          if (frame.sceneReady && !contextSession.busy && live.alignment.mode !== "editing" && basis && frame.data &&
            selection.object && selection.spotId === frame.data.context.spotId &&
            position?.report === frame.data && position.data.reference === selection.object.reference &&
            skyObjectPositionIsCurrent(position.data, frame.data.context, frame.frameAt, position.catalog)) {
            const entry = frame.data.skyScene.deepSky?.catalog?.entries.find(value => value.objectRef === selection.object!.reference);
            const marker = projectSkySelectionMarker(selection.object, position.data.position!,
              { basis, width: size.width, height: size.height, verticalFovDeg: fov, center },
              entry?.majorAxisArcmin ? entry.majorAxisArcmin / 60 : null);
            if (marker && !locatedBodyOccludesMarker(selection.object.reference, exactSkyTimeFrame(frame.data.hourly, frame.frameAt),
              basis, size.width, size.height, fov, center)) {
              selectionMarker=marker;
              paintAttempt.selection = selection.object;
              paintAttempt.reticle = { ...marker, color: frame.mode === "OBSERVATION" ? "#FF6B58" : "#DCE4EF" };
            }
          }
          if (frame.sceneReady && frame.mode !== "OBSERVATION" && basis && snapshot && snapshot.frameAt === frame.frameAt) {
            const labelView = { width: size.width, height: size.height,
              view: { basis, verticalFovDeg: fov, center, landscape: snapshot.view?.landscape ?? null } };
            const names = projectSkyCatalogNames(frame.data?.skyScene, frame.frameAt, labelView,
              snapshot.namedStars, snapshot.deepSkyAuxiliaryDecisions, resolvedView.occlusionInsets,true,nameLayout.retainedCatalogReferences);
            const surface=canvasSurfaceRef.current;
            if (!surface) throw new Error("sky_canvas_surface_unavailable");
            if(selectionMarker&&paintAttempt.selection&&position) {
              const locationLabel=position.data.position!.altitudeDeg<0?'地平线以下':
                !paintedSkyPointVisible(labelView,selectionMarker.x,selectionMarker.y)?'图中地面遮挡':null;
              const text=paintAttempt.selection.displayName+(locationLabel?` · ${locationLabel}`:'');
              nameLayout.selected(paintAttempt.selection,selectionMarker,locationLabel,surface.measureText(text,'12px sans-serif',18));
            }
            const targets = projectSkyTargetLabels(exactSkyTimeFrame(frame.data?.targetFrames, frame.frameAt)?.targets ?? [],
              labelView, resolvedSkyBodyReferences(snapshot), snapshot.suppressedBodyReferences,resolvedView.occlusionInsets,nameLayout.retainedTargetIds,true);
            for(const {target,projection,opacity} of targets)nameLayout.target(target,projection,opacity,
              surface.measureText(target.displayName,'600 14px sans-serif',21),
              surface.measureText(`${target.direction} · ${Math.round(projection.altitude)}°`,'12px sans-serif',18),
              bounds=>paintedSkyBoundsVisible(labelView,bounds));
            for (const object of names) {
              if (nameLayout.names.length === 8) break;
              if (object.reference === selection.object?.reference) continue;
              nameLayout.catalog(object,surface.measureText(object.displayName,"12px sans-serif",18),
                bounds=>paintedSkyBoundsVisible(labelView,bounds));
            }
            const gesture = skyTapRef.current;
            const pressed = gesture && gesture.maximumTouches === 1 && !gesture.dragged ? gesture.nameReference : null;
            paintAttempt.catalogNames = nameLayout.names.filter(name=>name.auxiliaryOpacity>.01).map(name=>
              name.reference === pressed ? {...name,caption:{...name.caption,color:"#AABCCA"}} : name);
            paintAttempt.controlNames=nameLayout.controls.filter(name=>name.opacity>.01||name.action.kind==='selected').map(name=>
              name.key===gesture?.controlNameKey&&gesture.maximumTouches===1&&!gesture.dragged
                ?{...name,opacity:name.opacity*.72,captions:name.captions.map(caption=>({...caption,opacity:caption.opacity*.72}))}:name);
            if (frame.constellations?.at === frame.frameAt && (constellationVisibility(fov,frame.constellationsEnabled)>=.14 || nameLayout.retainedConstellationIds.size))
              paintAttempt.constellationCaptions = projectSkyConstellationNames(frame.constellations, frame.frameAt, labelView,
                frame.constellationsEnabled, [...nameLayout.names, ...targets.map(value => value.projection)],resolvedView.occlusionInsets,true,nameLayout.retainedConstellationIds)
                .flatMap(label => {
                  const spacing=size.width/750;
                  const caption=nameLayout.constellation(label.iau,{text:label.nameZh,x:label.x,y:label.y,
                    opacity:label.opacity,textAlign:'center',letterSpacing:spacing},
                    surface.measureText(label.nameZh,'12px sans-serif',18,spacing),
                    (bounds,x,y)=>paintedSkyBoundsVisible(labelView,bounds)&&skyConstellationAvoidsPoints(x,y,
                      targets.map(value=>[value.projection.x,value.projection.y] as const)));
                  return caption&&caption.opacity>.01?[caption]:[];
                });
            paintAttempt.captions = [...paintAttempt.catalogNames.map(name=>name.caption),...paintAttempt.constellationCaptions,
              ...paintAttempt.controlNames.flatMap(name=>name.captions.filter(caption=>caption.opacity>.01))];
          }
          paintAttempt.publish = (excludedNameKeys=[]) => {
            if (browsingCamera.accept(camera) && basis) {
              manualBasisRef.current = basis;
              zoomRef.current = fov;
              if (!camera.animating) { navigationRequestRef.current = null; setManualBasis(basis); }
            }
            starTransitionFrame.commit();
            readyImageFrame.commit(Date.now());
            nameLayout.commit(Date.now(),excludedNameKeys);
            setArtworkContributionUnavailable(context.artworkContributionsFailed?.() === true);
            paintedSkyObjectsRef.current = snapshot;
            const completedResources = completeSkySceneResources({ frame, input: sceneInput, sources,
              landscape: snapshot?.view?.landscape ?? null });
            const resolvedBodyReferences = resolvedSkyBodyReferences(snapshot);
            const suppressedBodyReferences = snapshot?.suppressedBodyReferences ?? [];
            const deepSkyAuxiliaryDecisions = copySkyDeepAuxiliaryDecisions(snapshot?.deepSkyAuxiliaryDecisions);
            const namedStars = snapshot?.namedStars ?? [];
            const constellationNames = paintAttempt.constellationCaptions.map(caption => caption.text);
            const catalogNames = paintAttempt.catalogNames;
            const controlNames = paintAttempt.controlNames;
            setPresentedSkyFrame(previous => snapshot || completedResources.sdssOptical || completedResources.preparedRegions.length ||
              completedResources.deepSkyImage || completedResources.galacticImage || completedResources.opticalHips.length || completedResources.bodyImages.length ?
              previous && previous.identity === sceneIdentity && previous.data === frame.data && previous.frameAt === frame.frameAt && previous.timePresentation === frame.timePresentation &&
                previous.timePresentationScope === frame.timePresentationScope &&
                previous.mode === frame.mode && previous.constellations === frame.constellations &&
                previous.stellarSupplement === frame.stellarSupplement &&
                previous.constellationsEnabled === frame.constellationsEnabled &&
                previous.nativeCanvasGeneration === paintAttempt.generation &&
                sameSkyCatalogNames(previous.catalogNames ?? [],catalogNames) &&
                sameSkyControlNames(previous.controlNames ?? [],controlNames) &&
                previous.constellationNames.length === constellationNames.length &&
                previous.constellationNames.every((name, index) => name === constellationNames[index]) &&
                previous.namedStars.length === namedStars.length && previous.namedStars.every((star, index) => {
                  const next = namedStars[index]!;
                  return star.reference === next.reference && star.x === next.x && star.y === next.y && star.opacity === next.opacity;
                }) &&
                sameSkyCompletedSceneResources(previous, completedResources) &&
                sameSkyDeepAuxiliaryDecisions(previous.deepSkyAuxiliaryDecisions, deepSkyAuxiliaryDecisions) &&
                previous.suppressedBodyReferences.length === suppressedBodyReferences.length &&
                previous.suppressedBodyReferences.every((reference, index) => reference === suppressedBodyReferences[index]) &&
                previous.resolvedBodyReferences.length === resolvedBodyReferences.length &&
                previous.resolvedBodyReferences.every((reference, index) => reference === resolvedBodyReferences[index])
                ? previous : { identity: sceneIdentity, data: sceneIdentity.observation.data,
                  frameAt: sceneIdentity.observation.frameAt, timePresentation: frame.timePresentation,
                  timePresentationScope: frame.timePresentationScope, mode: frame.mode,
                  constellations: frame.constellations, constellationsEnabled: frame.constellationsEnabled,
                  stellarSupplement: frame.stellarSupplement,
                  ...completedResources, nativeCanvasGeneration: paintAttempt.generation,
                  deepSkyAuxiliaryDecisions, namedStars,
                  resolvedBodyReferences, suppressedBodyReferences, constellationNames, catalogNames, controlNames } : null);
            if (frame.sceneReady) orientation.presented.current = basis;
            setPresentedCamera(previous => previous && sameSkyViewBasis(previous.basis, basis) && previous.fov === fov && previous.center.x === center.x && previous.center.y === center.y ? previous : { basis, fov, center });
            setVerticalFovState(fov);
            // Renew through the same native RAF writer, without adding a timer
            // delay to the frame's work before requesting the next refresh.
            if (camera.animating || starTransitionFrame.animating || nameLayout.animating || readyImageFrame.animating)
              browsingDrawRef.current(true);
            acceptSkyCalibrationRef.current(frame, { basis, fov });
          };
        },
        completed: identity => {
          // A late/repeated/rejected completion must not publish or clear a newer
          // attempt. Scene completion is synchronous today; retain the port fence.
          if (identity !== sceneIdentity || paintAttempt.generation !== canvasGenerationRef.current || !paintAttempt.publish) { done(); return; }
          pendingSkyPaintRef.current = paintAttempt;
          try { done(); }
          finally { if (pendingSkyPaintRef.current === paintAttempt) pendingSkyPaintRef.current = null; }
        },
        failed: (failure, identity) => {
          if (identity !== sceneIdentity || identity.canvas.generation !== canvasGenerationRef.current) return;
          switch (failure.kind) {
            case "infrared": deepSkyImageFailedRef.current(failure.asset.image); break;
            case "constellation": artworkFailureRef.current(failure.image); break;
            case "target-optical": sdssOpticalFailureRef.current(failure.image); preparedRegionFailureRef.current(failure.image); break;
            case "hips": dispatchSkyHipsImageFailure(failure.tile, wideFieldFailureRef.current, opticalFailureRef.current); break;
            case "solar-light": setSolarLightUnavailable(true); break;
            case "moon": setMoonDiscUnavailable(true); break;
            case "planet": setPlanetDiscUnavailable(true); break;
            case "sun-disc": setSunDiscUnavailable(true); break;
            case "galactic-band": setGalacticBandUnavailable(true); break;
            case "scene": break; // The original lifecycle owns fatal invalidation/retirement.
          }
        },
        landscapeAvailability: (available, identity) => {
          if (identity === sceneIdentity && identity.canvas.generation === canvasGenerationRef.current)
            setLandscapeUnavailable(available === false);
        },
      });
    },
    sameScene: (completed, latest) => completed.data === latest.data && completed.frameAt === latest.frameAt &&
      completed.timePresentation === latest.timePresentation &&
      completed.timePresentationScope === latest.timePresentationScope &&
      completed.mode === latest.mode && completed.verticalFovDeg === latest.verticalFovDeg &&
      sameSkyCanvasResources(completed, latest) && completed.constellations === latest.constellations &&
      completed.coordinateGrids === latest.coordinateGrids &&
      completed.stellarSupplement === latest.stellarSupplement &&
      completed.owner === latest.owner && completed.inspection.spotId === latest.inspection.spotId,
    presented: (frame, size) => {
      const attempt = pendingSkyPaintRef.current;
      pendingSkyPaintRef.current = null;
      if (!attempt || attempt.frame !== frame || attempt.generation !== canvasGenerationRef.current ||
        attempt.identity.canvas.generation !== canvasGenerationRef.current || !attempt.publish) return;
      if (attempt.camera?.navigation && (!navigationCurrentRef.current() || !browsingCamera.current(attempt.camera))) return;
      const surface = canvasSurfaceRef.current;
      if (!surface) throw new Error("sky_canvas_surface_unavailable");
      const selectionCurrent=attempt.selection === objectSelection.snapshot().object;
      const retired=selectionCurrent?[]:attempt.controlNames.filter(name=>name.action.kind==='selected');
      const excludedNameKeys=retired.map(name=>name.key);
      if(retired.length) {
        attempt.captions=attempt.captions.filter(caption=>!retired.some(name=>name.captions.includes(caption)));
        attempt.controlNames=attempt.controlNames.filter(name=>!excludedNameKeys.includes(name.key));
      }
      surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions);
      attempt.publish(excludedNameKeys);
      setCanvasSize(previous => previous.width === size.width && previous.height === size.height ? previous : size);
      if (frame.sceneReady) {
        canvasDrawRevisionRef.current++;
      }
      publishAcceptanceSkySceneInspection(frame.owner, { ...frame.inspection, state: frame.sceneReady ? "READY" : "UNAVAILABLE", drawRevision: canvasDrawRevisionRef.current });
      setCanvasError(null);
    },
    invalidated: () => {
      starDrawing.reset();
      canvasSurfaceRef.current?.clearSelection?.();
      pendingSkyPaintRef.current = null;
      paintedSkyObjectsRef.current = null;
      setPresentedSkyFrame(null);
      setCanvasSize(previous => previous.width === 0 && previous.height === 0 ? previous : { width: 0, height: 0 });
    },
    failed: (error, frame) => {
      cancelSkyCalibration();
      setPresentedSkyFrame(null);
      if (frame) publishAcceptanceSkySceneInspection(frame.owner, { ...frame.inspection, state: "ERROR", drawRevision: canvasDrawRevisionRef.current });
      setCanvasError(skyCanvasFailureCode(error));
    },
  }, canvasFrameClock), []);
  const [contextTimeSaving, setTimeSaving] = useState(false);
  const timeSaving = contextTimeSaving || Boolean(carriedReport);
  const [datePickerOpen, setDatePickerOpenState] = useState(false);
  const datePickerOpenRef = useRef(false);
  const setDatePickerOpen = skyCommandStateSetter(datePickerOpenRef, setDatePickerOpenState);
  const [orientationObjectListOpen, setOrientationObjectListOpenState] =
    useState(false);
  const orientationObjectListOpenRef = useRef(orientationObjectListOpen);
  const setOrientationObjectListOpen = skyCommandStateSetter(orientationObjectListOpenRef, setOrientationObjectListOpenState);
  const [skyControlPanel, setSkyControlPanelState] = useState<SkyControlPanel | null>(null);
  const skyControlPanelRef = useRef(skyControlPanel);
  const setSkyControlPanel = skyCommandStateSetter(skyControlPanelRef, setSkyControlPanelState);
  const [selectedTargetId, setSelectedTargetIdState] = useState<string | null>(null);
  const selectedTargetIdRef = useRef(selectedTargetId);
  const setSelectedTargetId = skyCommandStateSetter(selectedTargetIdRef, setSelectedTargetIdState);
  const [selectedCatalogObject, setSelectedCatalogObjectState] = useState<SkyObjectIdentity | null>(null);
  const selectedCatalogObjectRef = useRef<SkyObjectIdentity | null>(null);
  const setSelectedCatalogObject = skyCommandStateSetter(selectedCatalogObjectRef, setSelectedCatalogObjectState);
  const objectSelection = useMemo(() => createSkyObjectSelection(), []);
  const [selectionState, setSelectionState] = useState(() => objectSelection.snapshot());
  useEffect(() => {
    if (objectSelection.snapshot().spotId && objectSelection.snapshot().spotId !== routeContext.spotId)
      setSelectionState(objectSelection.clear());
  }, [routeContext.spotId, objectSelection]);
  const [catalogPickChoices, setCatalogPickChoicesState] = useState<readonly PaintedSkyObject[]>([]);
  const catalogPickChoicesRef = useRef(catalogPickChoices);
  const setCatalogPickChoices = skyCommandStateSetter(catalogPickChoicesRef, setCatalogPickChoicesState);
  const [catalogListLimit, setCatalogListLimit] = useState(24);
  const [verticalFovDeg, setVerticalFovState] = useState(SKY_VERTICAL_FOV_DEG);
  const setVerticalFovDeg = useCallback((value: number | ((previous: number) => number)) => {
    const next = typeof value === "function" ? value(zoomRef.current) : value;
    zoomRef.current = next;
    setVerticalFovState(next);
    browsingDrawRef.current();
  }, []);
  const [focusedDeepSkyReference, setFocusedDeepSkyReference] = useState<string | null>(null);
  const skyTapRef = useRef<{
    session: ReturnType<typeof createSkyContextSession>;
    visibilityRevision: number;
    expectedContext: NonNullable<typeof activeContext>;
    timeBinding: string;
    committedAt: string;
    at: string;
    canvasGeneration: number;
    startX: number;
    startY: number;
    nameReference: string | null;
    controlNameKey:string|null;
    travelPx: number;
    startedWithTouches: number;
    maximumTouches: number;
    cancelled: boolean;
    pinchStartDistance: number | null;
    pinchStartFov: number;
    pinchStartBasis: SkyViewBasis;
    startBasis: SkyViewBasis;
    panMode: SkyPanMode;
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
  const contextMatches = Boolean(carriedReport) || skyReportMatchesContext(data, activeContext, routeContext.spotId);
  const rawReportData = contextMatches ? data : undefined;
  // Shared resource eligibility; image mode and family demand remain separate.
  // Sources retains this owner while paused, ordinary hide retires it.
  const skyResourcesActive = resourcePageVisible && Boolean(rawReportData) && !report.isError &&
    report.data?.dataState !== "EXPIRED" && report.data?.dataState !== "UNAVAILABLE";
  const skyImageryActive = skyResourcesActive && mode !== "OBSERVATION";
  const skyResourcesPaused = !pageVisible;
  const committedAt = activeContext?.selectedAtUtc ?? routeContext.selectedAt;
  const timeBinding = activeContext ? `${activeContext.contextId}:${activeContext.revision}:${activeContext.contextFingerprint}` : "";
  // Native callbacks can precede React's next render. The session owns the
  // live visibility/location/commit lock; public time owns the current binding.
  const skyPageVisibleCurrent = () => Boolean(contextSession.visibilityRevision === skyInteractionRevision &&
    pageVisible && viewportActiveRef.current && viewportMountedRef.current);
  const skyInteractionCurrent = () => Boolean(skyPageVisibleCurrent() && contextComplete &&
    activeContext && contextSession.canRequest(activeContext) && !timeSaving &&
    orientationController.snapshot().alignment.mode !== "editing");
  const skyTimeIntentCurrent = () => {
    const time = observationTime.snapshot();
    return skyInteractionCurrent() && time.binding === timeBinding && time.committedAt === committedAt;
  };
  const requestedAt = timeIntent.binding === timeBinding && timeIntent.committedAt === committedAt
    ? timeIntent.at : committedAt;
  const timePlaying = timeIntent.binding === timeBinding && timeIntent.mode === "PLAYING";
  const timePlayRequested = timeIntent.binding === timeBinding && timeIntent.committedAt === committedAt && timeIntent.playRequested;
  const previewGeometry = useSkyTimeGeometry(rawReportData, requestedAt,
    pageVisible && skyResourcesActive && !carriedReport && !timeSaving, timePlaying || timePlayRequested, () => {
      if (!skyTimeIntentCurrent()) return null;
      const time = observationTime.snapshot();
      return { at: time.at, fullWindow: time.mode === "PLAYING" || time.playRequested };
    });
  const timeModel = carriedReport ? timeCommitContinuity.model() ?? previewGeometry.model : previewGeometry.model;
  const timeGeometrySources = carriedReport ? timeCommitContinuity.sources() : previewGeometry.sources;
  useEffect(() => {
    if (!timeBinding) return;
    setTimeIntent(observationTime.bind(timeBinding, committedAt, timeModel));
  }, [observationTime, timeBinding, committedAt, timeModel]);
  // A return to the same values must not revive an input invalidated in between.
  // This is a scope ticket on the existing accepted frame, not another clock.
  const timePresentationScope = useMemo(() => ({}), [rawReportData, timeBinding, committedAt, mode, canvasNodeRevision,
    skyInteractionRevision, pageVisible, skyResourcesActive, canvasError]);
  const requestedTimePresentation = useMemo(() => presentSkyTime(rawReportData, requestedAt, timeModel, timeGeometrySources),
    [rawReportData, requestedAt, timeModel, timeGeometrySources]);
  const acceptedTimePresentation = pageVisible && skyResourcesActive && !canvasError &&
    presentedSkyFrame?.mode === mode && presentedSkyFrame.nativeCanvasGeneration === canvasGenerationRef.current &&
    presentedSkyFrame.timePresentationScope === timePresentationScope &&
    presentedSkyFrame.data?.context === rawReportData?.context &&
    presentedSkyFrame.timePresentation?.row.at === presentedSkyFrame.frameAt ? presentedSkyFrame.timePresentation : null;
  const timePresentation = useMemo(() => selectSkyTimePresentation(rawReportData, requestedAt, committedAt,
    requestedTimePresentation, acceptedTimePresentation),
    [rawReportData, requestedAt, committedAt, requestedTimePresentation, acceptedTimePresentation]);
  const timeGeometryReady = requestedTimePresentation?.row.at === requestedAt;
  const timeRows = useMemo(() => skyTimeRulerRows(rawReportData, timeModel), [rawReportData, timeModel]);
  const registrationAt = skyPresentationTimeModel(rawReportData)?.startAt ?? rawReportData?.observationFrames?.[0]?.at ?? committedAt;
  const fineTargetBinding = timeGeometryReady && timePresentation?.mode === "MODEL" && !carriedReport && !timePlaying &&
    !timeScrubbing && rawReportData && activeContext && Date.parse(requestedAt) >= Date.parse(activeContext.nightStartUtc) &&
    Date.parse(requestedAt) < Date.parse(activeContext.nightEndUtc) ? {
    spotId: rawReportData.context.spotId,
    contextId: rawReportData.context.contextId,
    contextRevision: rawReportData.context.contextRevision,
    contextFingerprint: rawReportData.context.contextFingerprint,
    at: requestedAt,
  } : null;
  const fineTarget = useSkyTimeTargetQuery(fineTargetBinding, rawReportData?.context.dataRevision,
    pageVisible && skyResourcesActive && Boolean(fineTargetBinding), () => {
      const current = observationTime.snapshot();
      return skyTimeIntentCurrent() && !current.editing.length && current.mode !== "PLAYING" &&
        !current.playRequested && current.at === fineTargetBinding?.at;
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
  const renderTimePresentation = useMemo(() => timePresentation && geometryReport
    ? geometryReport === timePresentation.report ? timePresentation : { ...timePresentation, report: geometryReport }
    : null, [timePresentation, geometryReport]);
  useEffect(() => {
    if (!timePlayRequested) return;
    const current = observationTime.snapshot();
    if (!current.playRequested || current.at !== requestedAt) return;
    if (!pageVisible || contextSession.busy || timeSaving || alignmentEditing || report.isError ||
      !geometryReport || report.data?.dataState === "EXPIRED" || report.data?.dataState === "UNAVAILABLE") {
      setTimeIntent(observationTime.pause());
      return;
    }
    if (previewGeometry.playbackReady && skyTimeIntentCurrent() && !datePickerOpenRef.current)
      setTimeIntent(observationTime.play(Date.now()));
  }, [observationTime, timePlayRequested, requestedAt, previewGeometry.playbackReady, pageVisible,
    contextSession, contextSession.busy, timeSaving, alignmentEditing, report.isError, Boolean(geometryReport),
    report.data?.dataState, timeBinding, committedAt, skyInteractionRevision]);
  useEffect(() => {
    if (!timePlaying) return;
    if (!pageVisible || contextSession.busy || timeSaving || alignmentEditing || report.isError ||
      !geometryReport || report.data?.dataState === "EXPIRED" || report.data?.dataState === "UNAVAILABLE") {
      setTimeIntent(observationTime.pause());
      return;
    }
    // Reuse the native presentation cadence; elapsed time remains 1x even
    // when rendering coalesces or scheduling is delayed.
    const timer = setInterval(advanceSkyTime, 16);
    return () => clearInterval(timer);
  }, [observationTime, timePlaying, pageVisible, contextSession, contextSession.busy, activeContext, contextComplete,
    skyInteractionRevision, timeBinding, committedAt, timeSaving, alignmentEditing,
    report.isError, Boolean(geometryReport), report.data?.dataState]);
  const stellarReference = rawReportData?.skyScene.state === "AVAILABLE" ? rawReportData.skyScene.catalog : null;
  const stellarCatalog = useResourceQuery({
    queryKey: ["stellar-catalog", stellarReference?.catalogVersion, stellarReference?.catalogHash],
    queryFn: signal => getStellarCatalog(stellarReference!, signal),
    enabled: pageVisible && Boolean(stellarReference),
    staleTime: Infinity,
    structuralSharing: false,
  });
  const reportData = useMemo(() => geometryReport ? attachSkyCatalog(geometryReport, stellarCatalog.data?.data) : undefined,
    [geometryReport, stellarCatalog.data?.data]);
  const positionPresentation = useMemo<SkyPositionPresentation | undefined>(() =>
    reportData && report.data && !carriedReport
      ? { source: report.data, rendered: reportData, anchorAt: registrationAt,
        ...(timePresentation?.mode === "MODEL" && timePresentation.model ? { timeModelAlgorithmVersion: timePresentation.model.algorithmVersion } : {}) }
      : undefined,
    [reportData, report.data, carriedReport, registrationAt, timePresentation?.mode, timePresentation?.model?.algorithmVersion]);
  const constellationCatalog = useResourceQuery({
    queryKey: ["constellation-catalog", CONSTELLATION_CATALOG_VERSION], queryFn: signal => getConstellationCatalog(signal),
    enabled: pageVisible && Boolean(stellarReference) && constellationsEnabled, staleTime: Infinity,
  });
  useEffect(() => {
    if (!pageVisible || !stellarReference || stellarCatalog.isFetching ||
      !(stellarCatalog.isError || stellarCatalog.refreshError || stellarCatalog.data?.dataState === "STALE_USABLE")) return;
    notify({ owner: "spot-night", placement: "floating", tone: "info", title: "星图未加载",
      body: stellarCatalog.data ? "已保留星图，可在显示中重试" : "仍可查看目标与天气，稍后可重试",
      dedupeKey: `stellar-catalog:${stellarReference.catalogVersion}:${stellarReference.catalogHash}` });
  }, [pageVisible, stellarReference?.catalogVersion, stellarReference?.catalogHash, stellarCatalog.isFetching,
    stellarCatalog.isError, stellarCatalog.refreshError, stellarCatalog.data?.dataState, notify]);
  const skyDisplayCurrent = () => skyTimeIntentCurrent() && useAppStore.getState().mode === mode;
  const recoverSkyResource = <T,>(recover: () => T): T | false => {
    if (!skyDisplayCurrent()) return false;
    return recover();
  };
  const retrySkyCanvas = () => recoverSkyResource(() => {
    browsingDrawRef.current();
    canvasLifecycle.retry();
  });
  const onSkyCanvasError = (event?: unknown) => {
    // A current native failure must retire an editing/busy surface too. An
    // event belonging to a hidden/replaced page cannot fail its new surface.
    if (!skyPageVisibleCurrent() || activeContext && !contextSession.ownsContext(activeContext)) return;
    let cause: unknown;
    try { cause = (event as { detail?: unknown } | null)?.detail ?? event; } catch { /* Native getter. */ }
    canvasLifecycle.fail(Object.assign(new Error("sky_canvas_native_error"), { cause }));
  };
  const onSkySelectionLayerError = (event?: unknown) => {
    if (!skyPageVisibleCurrent() || activeContext && !contextSession.ownsContext(activeContext)) return;
    reportRuntimeError("native", "sky_selection_layer_native_error", event);
    canvasSurfaceRef.current?.disableSelectionLayer();
    browsingDrawRef.current();
  };
  const reportRecoveryRef = useRef({pageVisible,contextComplete,activeContext,refetch:report.refetch,
    stellarReference,refetchStars:stellarCatalog.refetch});
  reportRecoveryRef.current = {pageVisible,contextComplete,activeContext,refetch:report.refetch,
    stellarReference,refetchStars:stellarCatalog.refetch};
  const canRetryReport = useCallback(() => {
    const current=reportRecoveryRef.current;
    return Boolean(skyDisplayCurrent()&&current.pageVisible&&current.contextComplete&&current.activeContext&&
      contextSession.canRequest(current.activeContext));
  },[contextSession,skyDisplayCurrent]);
  const retryReport = useCallback(() => {
    if(!canRetryReport())return false;
    autoRestoreAttemptedRef.current = false;
    void reportRecoveryRef.current.refetch();
    return true;
  },[canRetryReport]);
  const retrySkyData = useCallback(() => {
    if(!retryReport())return;
    const current=reportRecoveryRef.current;
    if(current.stellarReference)void current.refetchStars();
  },[retryReport]);
  useEffect(() => {
    if (selectedCatalogObject)
      setFocusedDeepSkyReference(selectedCatalogObject.kind === "GALAXY" || selectedCatalogObject.kind === "NEBULA" ? selectedCatalogObject.reference : null);
  }, [selectedCatalogObject]);
  const row = timePresentation?.row;
  const sensorHeadingForScene = devicePose?.headingDeg ?? null;
  // Snapshot copies and raw timestamps still update sensor telemetry, but an
  // exactly unchanged rendered basis must not invalidate the whole Scene.
  const sensorBasis = useMemo(() => devicePose?.basis ?? null, [
    devicePose?.basis.right[0], devicePose?.basis.right[1], devicePose?.basis.right[2],
    devicePose?.basis.up[0], devicePose?.basis.up[1], devicePose?.basis.up[2],
    devicePose?.basis.forward[0], devicePose?.basis.forward[1], devicePose?.basis.forward[2],
  ]);
  const currentViewBasis = presentedCamera?.basis ?? manualBasis ?? sensorBasis;
  const presentedFov = presentedCamera?.fov ?? verticalFovDeg;
  const presentedCenter = presentedCamera?.center ?? skyViewportCenter(canvasSize.width, canvasSize.height);
  const targetOpticalView = currentViewBasis ? { report: geometryReport, at: row?.at,
    width: canvasSize.width, height: canvasSize.height,
    drawingWidth: canvasNodeRef.current?.width, drawingHeight: canvasNodeRef.current?.height,
    view: { basis: currentViewBasis, verticalFovDeg: presentedFov, center: presentedCenter } } : undefined;
  const selectedDeepSkyEntry = focusedDeepSkyReference
    ? reportData?.skyScene.deepSky?.catalog?.entries.find((entry) => entry.objectRef === focusedDeepSkyReference) ?? null
    : null;
  const deepSkyRegistrationReady = reportData?.skyScene.deepSky?.catalog?.imageRegistration === "ICRS_TAN_NORTH_0_1_V1";
  const desiredDeepSkyImageLevel = selectedDeepSkyEntry && deepSkyRegistrationReady && skyImageryActive
    ? deepSkyImageLevelForFov(verticalFovDeg) : null;
  const deepSkyImages = useSkyDeepSkyImage(selectedDeepSkyEntry?.objectRef ?? null, desiredDeepSkyImageLevel,
    canvasNodeRef.current, canvasNodeRevision, skyImageryActive, targetOpticalView, skyResourcesPaused);
  const canvasDeepSkyImage = deepSkyImages.frame;
  const deepSkyImageState = deepSkyImages.state;
  deepSkyImageFailedRef.current = deepSkyImages.failedImage;
  const committedRow = exactSkyTimeFrame(timeRows, committedAt);
  const committedIndex = committedRow
    ? timeRows.indexOf(committedRow)
    : -1;
  const activeIndex = timeRows.reduce((index, frame, position) =>
    Date.parse(frame.at) <= Date.parse(requestedAt) ? position : index, committedIndex);
  // No report frame or pointing basis means no sky to paint. Do not leave an
  // empty native surface over the recovery and error controls.
  const nativeCanvasMounted = Boolean(resourcePageVisible && reportData && row && !report.isError &&
    report.data?.dataState !== "EXPIRED" && report.data?.dataState !== "UNAVAILABLE" &&
    (manualBasis || devicePose || orientation.presented.current));
  const isPreviewing = requestedAt !== committedAt;
  const presentedAt = row?.at ?? committedAt;
  const rowTime = useMemo(() => formatTime(presentedAt, routeContext.timezone), [presentedAt, routeContext.timezone]);
  const starSunAltitudeDeg = mode === "OBSERVATION" ? undefined : skySolarLightAt(reportData?.hourly,row?.at)?.altitudeDeg;
  const stellarSupplement=useSkyStellarSupplement(reportData?.skyScene,row?.at,currentViewBasis?{
    basis:currentViewBasis,width:canvasSize.width,height:canvasSize.height,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    pageVisible&&Boolean(rawReportData)&&report.data?.dataState!=='EXPIRED'&&report.data?.dataState!=='UNAVAILABLE'&&!report.isError,
    starSunAltitudeDeg,mode);
  const optical=useSkyOpticalHips(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    skyImageryActive, skyResourcesPaused);
  opticalFailureRef.current=optical.failedImage;
  // An explicitly registered native region has its own footprint, independent
  // of a celestial pick. Normal callers do not register these candidate assets.
  const nativeFieldPublication = targetOpticalPublication?.kind === "prepared-native-optical-v1" || targetOpticalPublication?.kind === "prepared-derived-region-optical-v1"
    ? targetOpticalPublication : undefined;
  const preparedDiscovery = useSkyPreparedOpticalDiscovery(selectedDeepSkyEntry?.objectRef ?? null,
    skyImageryActive && !targetOpticalPublication, skyResourcesPaused);
  const selectedOpticalPublication = nativeFieldPublication ?? (targetOpticalPublication?.reference === selectedDeepSkyEntry?.objectRef
    ? targetOpticalPublication : undefined) ?? preparedDiscovery.publication;
  const sdssOptical = useSkyTargetOptical(selectedOpticalPublication?.kind ?? "sdss-legacy",
    nativeFieldPublication?.reference ?? selectedDeepSkyEntry?.objectRef ?? null, presentedFov,
    canvasNodeRef.current, canvasNodeRevision,
    skyImageryActive && (Boolean(nativeFieldPublication) || deepSkyRegistrationReady),
    selectedOpticalPublication?.publicationHash, targetOpticalView, skyResourcesPaused);
  sdssOpticalFailureRef.current = sdssOptical.failedImage;
  const preparedRegions = useSkyPreparedRegions(preparedDiscovery.publications, targetOpticalView,
    canvasNodeRef.current, canvasNodeRevision, skyImageryActive && !targetOpticalPublication, skyResourcesPaused);
  preparedRegionFailureRef.current = preparedRegions.failedImage;
  const wideField=useSkyWideFieldW3(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    skyImageryActive && wideFieldEnabled, skyResourcesPaused);
  wideFieldFailureRef.current=wideField.failedImage;
  const bodyImages=useSkyBodyImages(geometryReport,row?.at,currentViewBasis?{
    basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter}:null,
    canvasSize.width,canvasSize.height,canvasNodeRef.current,canvasNodeRevision,
    skyImageryActive, skyResourcesPaused);
  const bodyImageBindings=bodyImages.bindings;
  bodyImagesFailureRef.current=bodyImages.failedImage;
  const galacticImage=useSkyGalacticImage(geometryReport,row?.at,presentedFov,canvasNodeRef.current,
    canvasNodeRevision,skyImageryActive && !(wideFieldEnabled&&presentedFov>=60), skyResourcesPaused);
  galacticImageFailureRef.current=galacticImage.failedImage;
  const hipsTiles=useMemo(()=>[...wideField.tiles,...optical.tiles],[wideField.tiles,optical.tiles]);
  const readHipsTiles=useCallback(()=>{
    const currentOptical=optical.currentTiles();
    return currentOptical===optical.tiles?hipsTiles:[...wideField.tiles,...currentOptical];
  },[hipsTiles,wideField.tiles,optical.tiles,optical.currentTiles]);
  useEffect(()=>{
    if(!stellarSupplement.failed)return;
    notify({owner:'spot-night',placement:'floating',tone:'info',title:'暗星未加载',
      body:'亮星仍在，可在显示中重试',dedupeKey:'sky-stellar-supplement'});
  },[stellarSupplement.failed,notify]);
  const constellationFrame = useMemo(() => resolveConstellationFrame(constellationCatalog.data?.data,geometryReport?.skyScene,row?.at),
    [constellationCatalog.data?.data,rawReportData?.skyScene,row?.at]);
  const coordinateGridFrame = useMemo(() => report.data?.dataState === "EXPIRED" ||
    report.data?.dataState === "UNAVAILABLE" || report.isError ? null : exactSkyObservationFrame(geometryReport, row?.at),
    [geometryReport, row?.at, report.data?.dataState, report.isError]);
  const visibleFigures = useMemo(() => {
    if (!constellationFrame || !currentViewBasis || constellationVisibility(presentedFov,constellationsEnabled)<=0) return [];
    const intersects = createSkyArtworkViewCuller({basis:currentViewBasis,verticalFovDeg:presentedFov,center:presentedCenter},
      canvasSize.width,canvasSize.height);
    return constellationFrame.images.filter(figure => intersects(figure.registration)).map(figure=>figure.source);
  }, [constellationFrame,currentViewBasis,presentedFov,presentedCenter.x,presentedCenter.y,
    canvasSize.width,canvasSize.height,constellationsEnabled]);
  const artwork = useSkyArtwork(canvasNodeRef.current,canvasNodeRevision,constellationCatalog.data?.data.catalogHash,
    skyResourcesActive && constellationsEnabled,visibleFigures, skyResourcesPaused);
  artworkFailureRef.current=artwork.failedImage;
  const landscapeImage = useSkyLandscape(canvasNodeRef.current, canvasNodeRevision,
    skyResourcesActive && landscapeEnabled,
    [...artwork.images.values(), ...hipsTiles.map(tile => tile.image), canvasDeepSkyImage?.image,
      canvasDeepSkyImage?.coarser?.image, canvasDeepSkyImage?.fallback?.image, sdssOptical.image,
      sdssOptical.coarser?.image, sdssOptical.fallback?.image,
      ...skyPreparedRegionImages(preparedRegions.frames),
      galacticImage.image, ...bodyImages.images].filter((image): image is object => Boolean(image)),
    artwork.loading || constellationCatalog.isFetching || wideField.loading || optical.loading || sdssOptical.loading ||
      galacticImage.loading || bodyImages.loading || preparedRegions.loading,
    currentViewBasis ? { view: { basis: currentViewBasis, verticalFovDeg: presentedFov, center: presentedCenter },
      width: canvasSize.width, height: canvasSize.height } : null, reducedMotion, skyResourcesPaused);
  landscapeImageFailureRef.current = landscapeImage.failedImage;
  // Optional image failures only degrade the scene. Console diagnostics stay
  // separate from catalog, position, time and whole-Canvas recovery feedback.
  useSkyImageFailureDiagnostics([
    {resource:"selected-infrared",failed:deepSkyImageState === "ERROR"},
    {resource:"optical-hips",failed:optical.failed},
    {resource:"wide-field",failed:wideField.failed},
    {resource:"optical-publication",failed:preparedDiscovery.failed},
    {resource:"target-optical",failed:sdssOptical.failed || sdssOptical.updateFailed || sdssOptical.refreshFailed},
    {resource:"galactic-image",failed:galacticImage.failed || galacticImage.refreshFailed},
    {resource:"landscape-image",failed:landscapeImage.failed},
    {resource:"constellation-artwork",failed:artwork.failed || artworkContributionUnavailable},
    ...bodyImages.resources.map(resource => ({resource:resource.profile.kind,failed:resource.failed || resource.refreshFailed})),
    ...preparedRegions.bindings.map(binding => ({resource:binding.selection.publicationHash,
      failed:binding.requested && (binding.failed || binding.updateFailed || binding.refreshFailed)})),
    {resource:"solar-light-render",failed:solarLightUnavailable},
    {resource:"landscape-render",failed:landscapeEnabled && landscapeUnavailable},
    {resource:"galactic-render",failed:galacticBandUnavailable},
    {resource:"sun-render",failed:sunDiscUnavailable},
    {resource:"moon-render",failed:moonDiscUnavailable},
    {resource:"planet-render",failed:planetDiscUnavailable},
  ],pageVisible);
  const constellationFailed = constellationsEnabled && (constellationCatalog.isError || Boolean(constellationCatalog.refreshError) || constellationCatalog.data?.dataState === "STALE_USABLE");
  useEffect(() => {
    if (!pageVisible || !constellationFailed) return;
    notify({owner:"spot-night",placement:"floating",tone:"info",title:"星座未加载",
      body:"星图仍在，可在显示中重试",dedupeKey:"sky-constellations"});
  },[pageVisible,constellationFailed,notify]);
  const retryConstellations = useSkyImageRecovery(skyResourcesActive && constellationsEnabled && !skyResourcesPaused, () => {
    // Assets may return 404 after a server publication change. Refresh the
    // immutable catalog too, otherwise Infinity cache repeats the old hash.
    const resetGpu = artwork.retryImages();
    if (resetGpu) canvasLifecycle.resize();
    return resetGpu;
  }, constellationCatalog.refetch, skyDisplayCurrent);
  useEffect(() => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return;
    settleSkyGestureForViewportRef.current();
    const next = canvasSize;
    const previous = previousViewportRef.current;
    setVerticalFovDeg(value => previous ? remapSkyFieldOfView(value, previous, next) : clampSkyFieldOfView(value, next.width, next.height));
    previousViewportRef.current = next;
  }, [canvasSize.width, canvasSize.height]);
  useEffect(() => {
    // Newly covered input may settle a gesture, but does not reframe its sky.
    settleSkyGestureForViewportRef.current();
  }, [viewportInsets]);
  useEffect(() => {
    if (followRequested && alignment.ready && sensorBasis) {
      manualBasisRef.current = null;
      setManualBasis(null);
      setFollowRequested(false);
    }
  }, [followRequested, alignment.ready, sensorBasis]);
  useEffect(() => {
    if (!pageVisible || compassTelemetry.sampledAt === null && devicePose === null) return;
    const timer = setInterval(() => { if (viewportActiveRef.current) setCompassNow(Date.now()); }, 1000);
    return () => clearInterval(timer);
  }, [pageVisible, compassTelemetry.sampledAt !== null, devicePose !== null]);
  const hideCompass = orientationController.hide;
  const showCompass = orientationController.show;
  const enterManualView = (basis: SkyViewBasis = currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW,
    gesture?: NonNullable<typeof skyTapRef.current>) => {
    if (!skyTimeIntentCurrent()) return;
    if (gesture) { if (skyTapRef.current !== gesture || !skyGestureCurrent(gesture)) return; }
    else cancelSkyGestureRef.current();
    stopObjectTracking();
    stopBrowsingAnimation();
    browsingCamera.pan(basis, skyDomeProgress(zoomRef.current, canvasSize.width, canvasSize.height));
    setFollowRequested(false);
    manualBasisRef.current = basis;
    setManualBasis(basis);
    orientationController.stopFollowing();
  };
  useEffect(() => {
    viewportMountedRef.current = true;
    return () => {
      hideSkyPageRef.current();
      pendingSkyCalibrationRef.current = null;
      viewportMountedRef.current = false;
      canvasLifecycle.dispose();
    };
  }, [canvasLifecycle]);

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
    const facts = skySceneFrameFacts(reportData?.skyScene, row?.at);
    return {
      inspection: {
        spotId: routeContext.spotId,
        ...facts,
        starCount: facts.starCount ?? 0,
      },
    };
  }, [reportData, routeContext.spotId, row?.at]);
  const previousCanvasModeRef = useRef(mode);
  const draw = useCallback((continuation = false) => {
    const owner = skySceneInspectionOwnerRef.current;
    const canvasData = report.data?.dataState === "EXPIRED" || report.data?.dataState === "UNAVAILABLE" || report.isError ? undefined : reportData;
    // Native refs clear synchronously on hide/denial, before React's next commit.
    const pose = orientation.latestPresentation.current ? orientation.latestPresentation.current.pose : devicePose;
    const heading = pose?.headingDeg ?? null;
    const selectedManualBasis = manualBasisRef.current;
    const sceneReady = Boolean((selectedManualBasis || pose?.basis) && canvasData &&
      (skySceneHasContent(canvasData, row?.at) || constellationFrame?.at === row?.at));
    publishAcceptanceSkySceneInspection(owner, { ...canvasFrameInfo.inspection, state: "PENDING", drawRevision: canvasDrawRevisionRef.current });
    canvasLifecycle.request({ nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,
      data: canvasData, frameAt: row?.at, timePresentation: canvasData ? renderTimePresentation : null, timePresentationScope,
      heading, pose, manualBasis: selectedManualBasis, mode,
      verticalFovDeg: zoomRef.current, deepSkyImage: mode === "OBSERVATION" || !desiredDeepSkyImageLevel ? null : canvasDeepSkyImage,
      sdssOpticalImage: canvasData && mode !== "OBSERVATION" ? skyTargetOpticalFrame(sdssOptical) : null,
      preparedRegionImages: canvasData && mode !== "OBSERVATION" ? preparedRegions.frames : [],
      constellations: canvasData ? constellationFrame : null, constellationImages: artwork.images, constellationsEnabled, landscapeEnabled, coordinateGrids,
      hipsTiles:canvasData?hipsTiles:[],...(canvasData?{readHipsTiles}:{}),
      bodyImageBindings:canvasData?bodyImageBindings:[],
      galacticImage:canvasData?galacticImage.image:null,
      galacticPublication:canvasData?galacticImage.publication??null:null,
      landscapePanorama:canvasData?landscapeImage.panorama:null,
      landscapeMask:canvasData?landscapeImage.mask:null,
      landscapeOpacity:canvasData?landscapeImage.opacity:0,
      landscapePending:landscapeImage.loading,
      landscapeFailed:landscapeImage.failed,
      stellarSupplement:canvasData?stellarSupplement.frame:null,
      sceneReady, owner, inspection: canvasFrameInfo.inspection },
      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode, continuation);
    previousCanvasModeRef.current = mode;
  }, [canvasLifecycle, canvasNodeRevision, canvasFrameInfo, mode, report.data?.dataState, report.isError, reportData, row?.at, renderTimePresentation, timePresentationScope, sensorHeadingForScene, sensorBasis, manualBasis, desiredDeepSkyImageLevel, canvasDeepSkyImage, sdssOptical.image, sdssOptical.renderedAsset, sdssOptical.renderedLevel, sdssOptical.coarser, sdssOptical.fallback, sdssOptical.publication, preparedRegions.frames, orientation.snapshot.presentationRevision, viewportInsets, constellationFrame, artwork.images, constellationsEnabled,landscapeEnabled,coordinateGrids,stellarSupplement.frame,hipsTiles,readHipsTiles,bodyImageBindings,galacticImage.image,galacticImage.publication,landscapeImage.panorama,landscapeImage.mask,landscapeImage.opacity,landscapeImage.loading,landscapeImage.failed]);
  browsingDrawRef.current = draw;

  // PageHide and AppHide can arrive in either order, before React commits.
  // Retire every synchronous owner together. Stop sensor acquisition before a
  // cancelled gesture restores following; start() then preserves intent only.
  const hideSkyPage = (retainSources = false) => {
    if (!viewportMountedRef.current) return;
    contextSession.hide();
    viewportActiveRef.current = false;
    viewportMeasurementRevision.current++;
    hideCompass();
    cancelSkyCalibration();
    cancelSkyGestureRef.current();
    skyTapRef.current = null;
    stopBrowsingAnimation();
    setTimeIntent(observationTime.snapshot().mode === "PREVIEW" ? observationTime.cancel() : observationTime.hide(Date.now()));
    setPageVisible(false);
    setTimeSaving(false);
    if (!retainSources) {
      timeCommitContinuity.clear();
      sourceReturnRef.current = false; setSourceReturn(false);
      opticalSourcesOpeningRef.current = null;
      skyReturnPendingRef.current = null;
      orientationSettingsOpeningRef.current = null;
    }
    canvasLifecycle.hide(retainSources);
  };
  const showSkyPage = () => {
    if (!viewportMountedRef.current) return;
    contextSession.show();
    viewportActiveRef.current = true;
    setPageVisible(true);
    sourceReturnRef.current = false; setSourceReturn(false);
    opticalSourcesOpeningRef.current = null;
    skyReturnPendingRef.current = null;
    orientationSettingsOpeningRef.current = null;
    showCompass();
    measureBottomControls();
  };
  hideSkyPageRef.current = hideSkyPage;
  showSkyPageRef.current = showSkyPage;
  useEffect(() => {
    const hide = () => hideSkyPageRef.current();
    Taro.onAppHide(hide);
    return () => Taro.offAppHide(hide);
  }, []);
  useReady(() => { canvasLifecycle.setMounted(Boolean(contextComplete && activeContext && nativeCanvasMounted)); canvasLifecycle.ready(); draw(); });
  useResize(() => { canvasLifecycle.resize(); draw(); measureBottomControls(); });
  useEffect(() => {
    measureBottomControls();
  }, [measureBottomControls, Boolean(manualBasis), followRequested, alignment.mode, alignment.ready,
    compassState, orientationObjectListOpen, skyControlPanel, calibrationPreparing, themeClass, canvasSize.width, canvasSize.height, Boolean(reportData), coordinateGrids, Boolean(coordinateGridFrame), constellationFailed,stellarSupplement.failed,optical.failed,wideField.failed]);
  useEffect(() => { measureBottomControls(); }, [measureBottomControls, skyInlineNotice, skyInlineNoticeResidual]);
  useDidHide(() => hideSkyPageRef.current(sourceReturnRef.current));
  useDidShow(() => showSkyPageRef.current());
  useEffect(() => {
    if (!pageVisible) return;
    // Resume after this visible render has published current image/time scope.
    // Native onShow can arrive while the retained frame still belongs to hide.
    canvasLifecycle.show();
  }, [pageVisible, canvasLifecycle]);
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
  }, [contextSession, timeBinding, committedAt, timePlaying ? timeIntent.runStartAt : row?.at, mode,
    selectedCatalogObject, selectedTargetId, datePickerOpen]);
  useEffect(() => {
    // Overlay changes retain the last drawn intent; they are not a cancelled
    // sky gesture and must not restore its earlier camera checkpoint.
    settleSkyGestureForViewportRef.current();
  }, [orientationObjectListOpen, skyControlPanel]);

  const reportRecovery = skyReportRecovery(report.error ?? report.refreshError,
    Boolean(report.data), report.data?.dataState);
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
        title: "资料未全",
        body: reportRecovery.detail,
        dedupeKey: `spot-night-unavailable:${routeContext.spotId}:${activeContext?.contextId}:${routeContext.localDate}:${reportRecovery.reason}`,
      });
    } else if (dataState === "STALE_USABLE") {
      notify({
        ...base,
        tone: "info",
        title: "资料未全",
        body:
          "更新失败，显示上次资料",
        dedupeKey: `spot-night-state:${routeContext.spotId}:${routeContext.localDate}:${dataState}`,
      });
    } else if (dataState === "PARTIAL") {
      const solarWarning = report.data?.warnings.find(message => message.includes("太阳精确位置"));
      if (solarWarning) notify({ ...base, tone: "info", title: "晨昏未全",
        body: "晨昏资料未全，星图仍可浏览", dedupeKey: `spot-night-solar-data:${routeContext.spotId}:${routeContext.localDate}` });
      const moonWarning = report.data?.warnings.find(message => message.includes("月球精确位置"));
      if (moonWarning) notify({ ...base, tone: "info", title: "月球未全",
        body: "月球资料未全，星图仍可浏览", dedupeKey: `spot-night-moon-data:${routeContext.spotId}:${routeContext.localDate}` });
      const planetWarning = report.data?.warnings.find(message => message.includes("行星精确位置"));
      if (planetWarning) notify({ ...base, tone: "info", title: "行星未全",
        body: "行星资料未全，星图仍可浏览", dedupeKey: `spot-night-planet-data:${routeContext.spotId}:${routeContext.localDate}` });
    }
  }, [
    contextComplete,
    notify,
    report.data?.dataState,
    report.data?.warnings,
    report.isError,
    report.error,
    reportRecovery.detail,
    reportRecovery.reason,
    activeContext?.contextId,
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
      title: "星图未显示",
      body: "仍可搜索与选时间，恢复后可重试",
      dismissible: true,
      dedupeKey: `spot-night-canvas:${routeContext.spotId}`,
    });
  }, [canvasError, notify, routeContext.spotId]);

  const currentPaintedSkySourceFrame = () => {
    const frame = presentedSkyFrameRef.current, time = observationTime.snapshot();
    const identity = frame?.identity, picked = paintedSkyObjectsRef.current;
    if (!skyTimeIntentCurrent() || !frame || !orientationData || !nativeCanvasMounted || canvasError ||
      !identity || identity.observation.data?.context !== rawReportData?.context ||
      (time.mode !== "PLAYING" && identity.observation.data !== orientationData) ||
      identity.canvas.generation !== canvasGenerationRef.current || identity.view.mode !== mode ||
      (picked && picked.identity !== identity) ||
      !skyPresentedTimeCurrent(time.at, identity.observation.frameAt, time.mode === "PLAYING", time.runStartAt)) return null;
    return { ...frame, ...liveSkySceneResources(frame, canvasGenerationRef.current) };
  };
  const openOpticalSources = (credit: Pick<SkyOpticalSourceCredit, "sourceRoute">) => {
    const frame = currentPaintedSkySourceFrame();
    if (!frame) return;
    const currentCredits = [skyOpticalSourceCredit(frame.sdssOptical),
      ...frame.preparedRegions.map(skyOpticalSourceCredit), skyHipsSourceCredit(frame.opticalHips)];
    if (!currentCredits.some(value => value?.sourceRoute === credit.sourceRoute)) return;
    return openSkySources(credit.sourceRoute);
  };
  const advanceSkyTime = () => {
    const time = observationTime.snapshot();
    if (contextSession.visibilityRevision !== skyInteractionRevision || time.binding !== timeBinding || time.committedAt !== committedAt) return;
    if (!skyInteractionCurrent() || datePickerOpenRef.current) { setTimeIntent(observationTime.pause()); return; }
    setTimeIntent(observationTime.tick(Date.now()));
  };
  const skyTimeIntentRetirable = () => {
    const time = observationTime.snapshot();
    return contextSession.canRetireInteraction(skyInteractionRevision) &&
      time.binding === timeBinding && time.committedAt === committedAt;
  };
  const setSkyTimeEditing = (source: SkyTimeEditSource, active: boolean) => {
    if (observationTime.snapshot().editingGeneration !== timeIntent.editingGeneration ||
      (active ? !skyTimeIntentCurrent() : !skyTimeIntentRetirable())) return;
    setTimeIntent(observationTime.edit(source, active));
  };
  const cancelSkyTimePreview = () => {
    // Ruler hide/unmount must still retract its drag. An obsolete ruler cannot
    // cancel a preview belonging to the replacement Context.
    if (!skyTimeIntentRetirable()) return;
    setPreviewIndex(null);
  };
  const toggleSkyTimePlayback = () => {
    if (!skyTimeIntentCurrent() || datePickerOpenRef.current) return;
    const time = observationTime.snapshot();
    if (time.mode === "PLAYING" || time.playRequested) { setTimeIntent(observationTime.pause()); return; }
    if (!timeModel || !geometryReport || report.isError || report.data?.dataState === "EXPIRED" ||
      report.data?.dataState === "UNAVAILABLE" || carriedReport) return;
    cancelSkyCalibration();
    setTimeIntent(previewGeometry.playbackReady && time.at === requestedAt
      ? observationTime.play(Date.now()) : observationTime.requestPlay());
  };
  const commitInstant = async (nextAt: string) => {
    if (!skyTimeIntentCurrent() || datePickerOpenRef.current || !rawReportData || !activeContext ||
      !skyTimeInputAllowed(nextAt, Date.now())) return;
    if (Date.parse(nextAt) === Date.parse(committedAt)) {
      cancelSkyCalibration();
      setPreviewIndex(null);
      return true;
    }
    const request = contextSession.begin(activeContext);
    if (!request) return;
    cancelSkyCalibration();
    setTimeIntent(observationTime.pause());
    setTimeSaving(true);
    try {
      const response = await updateObservationContext(activeContext, {
        selectedAt: nextAt,
        localDate: observationNightForInstant(nextAt, activeContext.timezone),
        eventInstanceId: null,
      });
      if (!contextSession.accept(request, response.data)) return;
      if (presentSkyTime(rawReportData, nextAt, timeModel))
        timeCommitContinuity.stage(activeContext, response, report.data, routeContext.spotId, nextAt, timeModel, timeGeometrySources);
      setObservationContext(response.data);
      setPreviewIndex(null);
      return true;
    } catch (error) {
      if (!contextSession.isCurrent(request) || isMiniappRequestCancelled(error)) return;
      setPreviewIndex(null);
      notify({
        owner: "spot-night",
        placement: "inline",
        tone: "error",
        title: "时间未存",
        body: "保存失败，仍使用原来的时间",
        dismissible: true,
        dedupeKey: "spot-night-time-update-failed",
      });
    } finally {
      if (contextSession.finish(request)) setTimeSaving(false);
    }
  };

  const settleTimeIndex = (nextIndex: number) => {
    if (!skyTimeIntentCurrent() || datePickerOpenRef.current || !timeRows.length) return;
    const nextRow = timeRows[clampIndex(nextIndex, timeRows.length)];
    // A released ruler chooses a precise preview tick. Only the disclosure's
    // Apply action commits the public Context, just like the six civil fields.
    if (nextRow && skyTimeInputAllowed(nextRow.at, Date.now())) {
      cancelSkyCalibration();
      setTimeIntent(observationTime.preview(nextRow.at));
    }
  };

  const onPreview = (value: number) => {
    if (!skyTimeIntentCurrent() || datePickerOpenRef.current) return;
    if (!timeRows.length) return;
    const at = skyRulerTime(timeRows, value, timeModel ? "CALENDAR" : null);
    if (!at) return;
    cancelSkyCalibration();
    setTimeIntent(observationTime.preview(at));
  };

  const skyReturnPendingRef = useRef<object | null>(null);
  const routeReducedMotion = usePageBlackoutReducedMotion();
  const skyExit = useSkyPageExit(() => skyPageVisibleCurrent()
    ? `${contextSession.visibilityRevision}:${useAppStore.getState().accountOwnerId ?? "public"}` : null);
  const returnToSkyEntry = async () => {
    // Recovery Back is allowed without valid Context or Canvas data.
    if (!skyPageVisibleCurrent() || skyReturnPendingRef.current || skyExit.transition.isActive()) return;
    cancelSkyCalibration();
    skyExit.transition.start({
      reducedMotion: routeReducedMotion,
      onTimeout: () => {
        // Native navigation cannot be cancelled. Keep its return intent so a
        // late successful switch still restores Map; only release the UI lock.
        skyReturnPendingRef.current = null;
        notify({ owner: "spot-night", placement: "floating", tone: "info",
          title: "返回失败", body: "请再试一次", dedupeKey: "sky-return-navigation" });
      },
      navigate: async (isCurrent) => {
        const navigation = {};
        skyReturnPendingRef.current = navigation;
        const restoredMap = skyMapLifecycle.beginReturn();
        try {
          // redirectTo removed Map. Its tab must be recreated, not popped to.
          if (restoredMap || Taro.getCurrentPages().length <= 1) {
            await openPrimaryPage("/pages/map/index");
          } else {
            try { await Taro.navigateBack(); }
            catch (error) {
              reportRuntimeError("native", "sky_return_navigation_failed", error);
              if (!isCurrent()) return false;
              await openPrimaryPage("/pages/map/index");
            }
          }
          return true;
        } catch (error) {
          skyMapLifecycle.cancelReturn(restoredMap);
          reportRuntimeError("native", "sky_return_fallback_failed", error);
          if (isCurrent()) notify({ owner: "spot-night", placement: "floating", tone: "info",
            title: "返回失败", body: "请再试一次", dedupeKey: "sky-return-navigation" });
          return false;
        } finally { if (skyReturnPendingRef.current === navigation) skyReturnPendingRef.current = null; }
      },
    });
  };
  const closeSkyObjectDisclosure = () => {
    setSelectedTargetId(null);
    setSelectedCatalogObject(null);
    setCatalogPickChoices([]);
  };
  const skyDisclosures = createSkyDisclosureCommands({
    read: () => ({ panel: skyControlPanelRef.current, list: orientationObjectListOpenRef.current,
      date: datePickerOpenRef.current, object: Boolean(selectedCatalogObjectRef.current ||
        selectedTargetIdRef.current || catalogPickChoicesRef.current.length) }),
    canInteract: skyTimeIntentCurrent,
    canOpenMenu: () => skyPageVisibleCurrent() && orientationController.snapshot().alignment.mode !== "editing",
    canClose: () => skyPageVisibleCurrent() && (!contextComplete || !activeContext || contextSession.ownsContext(activeContext)),
    canRetireTime: skyTimeIntentRetirable,
    setPanel: setSkyControlPanel,
    setList: setOrientationObjectListOpen,
    setDate: setDatePickerOpen,
    clearObject: closeSkyObjectDisclosure,
    cancelCalibration: cancelSkyCalibration,
    cancelTimePreview: cancelSkyTimePreview,
    pauseTime: pauseSkyTime,
    leave: returnToSkyEntry,
  });
  const goBack = () => skyDisclosures.back();
  const selectCatalogObject = (object: SkyObjectIdentity) => {
    skyDisclosures.openObject(() => {
    stopBrowsingAnimation();
    if (objectTracking.snapshot().target?.reference !== object.reference) stopObjectTracking();
    setSelectionState(objectSelection.select(object, reportData?.context.spotId ?? routeContext.spotId));
    setSelectedTargetId(null);
    setCatalogPickChoices([]);
    setSelectedCatalogObject(object);
    });
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
    const object = selectedCatalogObjectRef.current;
    if (!skyTimeIntentCurrent() || !object || object.reference !== selectedCatalogObject?.reference ||
      data.reference !== object.reference || data.at !== observationTime.snapshot().at || !data.position ||
      !skyObjectPositionIsCurrent(data, reportData?.context, row?.at, positionCatalog(data.reference)) ||
      objectSelection.snapshot().object?.reference !== object.reference) return false;
    const basis = createSkyViewBasis(data.position.azimuthDeg, 90 + data.position.altitudeDeg, 0);
    if (!basis) return false;
    const copied = paintedSkyObjectsRef.current, displayed = copied?.view;
    const accepted = presentedSkyFrameRef.current;
    if (!copied || !displayed || !accepted || accepted.nativeCanvasGeneration !== canvasGenerationRef.current ||
      accepted.frameAt !== data.at || accepted.data?.context !== reportData?.context || !activeContext) return false;
    const time = observationTime.snapshot();
    if (!time.binding || !time.committedAt || !time.at) return false;
    const fromFov = displayed.verticalFovDeg;
    enterManualView(displayed.basis);
    zoomRef.current = fromFov;
    if (!browsingCamera.navigate(displayed.basis, basis, fromFov, Math.min(fromFov, SKY_VERTICAL_FOV_DEG),
      copied.width, copied.height, Date.now())) return false;
    navigationRequestRef.current = { object, expectedContext: activeContext,
      visibilityRevision: contextSession.visibilityRevision, binding: time.binding, committedAt: time.committedAt,
      at: data.at, mode, canvasGeneration: canvasGenerationRef.current,
      catalog: positionCatalog(data.reference) };
    setSelectionState(objectSelection.select(object, data.spotId));
    setSelectedCatalogObject(null);
    setCatalogPickChoices([]);
    setOrientationObjectListOpen(false);
    // Restore the expanded rail after information closes. An unapplied time
    // remains with its owner and is available when Time is opened again.
    setSkyControlPanel("menu");
    browsingDrawRef.current();
    return true;
  };

  // Once information starts a joint navigation, the actual copied camera and
  // original identity/time owners keep it valid while the rail is expanded.
  navigationCurrentRef.current = () => {
    const request = navigationRequestRef.current;
    if (!request) return true;
    const time = observationTime.snapshot(), catalog = positionCatalog(request.object.reference);
    return Boolean(skyDisplayCurrent() && contextSession.ownsContext(request.expectedContext) &&
      contextSession.visibilityRevision === request.visibilityRevision && time.binding === request.binding &&
      time.committedAt === request.committedAt && time.at === request.at && mode === request.mode &&
      canvasGenerationRef.current === request.canvasGeneration &&
      objectSelection.snapshot().object?.reference === request.object.reference &&
      !selectedCatalogObjectRef.current && !selectedTargetIdRef.current && !orientationObjectListOpenRef.current &&
      !datePickerOpenRef.current && (skyControlPanelRef.current === null || skyControlPanelRef.current === "time" || skyControlPanelRef.current === "menu") &&
      manualBasisRef.current !== null &&
      (!request.catalog || catalog?.catalogVersion === request.catalog.catalogVersion && catalog.catalogHash === request.catalog.catalogHash));
  };
  const selectSearchObject = (object: SkyObjectIdentity) => {
    if (!skyDisplayCurrent() || !orientationObjectListOpenRef.current) return;
    selectCatalogObject(object);
  };
  const trackCatalogObject = (data: CelestialObjectPositionData) => {
    const object = selectedCatalogObject;
    if (!object || !locateCatalogObject(data)) return;
    objectTracking.start(object, data.spotId);
    objectTracking.accept(data, reportData?.context, row?.at, positionCatalog(data.reference));
    setTrackingState(objectTracking.snapshot());
  };
  const applyTrackedPosition = (data: CelestialObjectPositionData) => {
    if (!skyTimeIntentCurrent() || data.at !== observationTime.snapshot().at ||
      !objectTracking.accept(data, reportData?.context, row?.at, positionCatalog(data.reference))) return;
    // Keep the newest valid result during a pinch, then apply on release.
    // Updating the local target does not recapture the overview's fixed path.
    if (skyTapRef.current) return;
    const navigating = browsingCamera.snapshot().navigation;
    if (navigating) {
      if (navigationRequestRef.current?.at === data.at && navigationCurrentRef.current()) return;
      stopBrowsingAnimation();
    }
    const position = data.position!;
    const direction = createSkyViewBasis(position.azimuthDeg, 90 + position.altitudeDeg, 0);
    if (!direction) return;
    // Accepted navigation writes the displayed axes into this local intent.
    // While browsing the overview, keep that local orientation rather than
    // borrowing the overview's zenith-facing axes or rolling upright.
    const currentView = manualBasisRef.current ?? paintedSkyObjectsRef.current?.view?.basis;
    const basis = currentView ? skyViewPointingArc(currentView, direction.forward).view : direction;
    if (navigating) browsingCamera.pan(basis, skyDomeProgress(zoomRef.current, canvasSize.width, canvasSize.height));
    manualBasisRef.current = basis;
    setManualBasis(basis);
  };
  const selectSkyTarget = (target: SkyReport["targets"][number]) => {
    skyDisclosures.openObject(() => {
    setSelectionState(objectSelection.clear());
    stopObjectTracking();
    setSelectedCatalogObject(null);
    setCatalogPickChoices([]);
    setSelectedTargetId(target.targetId);
    });
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
  const acceptedClockAt = pageVisible && !canvasError && presentedSkyFrame?.mode === mode &&
    presentedSkyFrame.nativeCanvasGeneration === canvasGenerationRef.current &&
    presentedSkyFrame.data?.context === rawReportData?.context ? presentedSkyFrame.frameAt : undefined;
  const timePreviewStatus = skyTimePreviewStatus({ requestedAt, geometryAt: timePresentation?.row.at,
    paintedAt: acceptedClockAt, playing: timePlaying, runStartAt: timeIntent.runStartAt,
    geometryFailed: previewGeometry.failed, canvasFailed: Boolean(canvasError) });
  const paintedLandscapePhoto = presentedSceneCurrent ? skyLandscapePaintedPanorama(presentedSkyFrame?.landscape) : null;
  const paintedSceneFacts = skySceneFrameFacts(paintedData?.skyScene, paintedAt);
  const paintedRow = exactSkyTimeFrame(paintedData?.hourly, paintedAt);
  const paintedPositionPresentation = useMemo<SkyPositionPresentation | undefined>(() =>
    paintedData && report.data && !carriedReport
      ? { source: report.data, rendered: paintedData, anchorAt: registrationAt,
        ...(presentedSkyFrame?.timePresentation?.mode === "MODEL" && presentedSkyFrame.timePresentation.model
          ? { timeModelAlgorithmVersion: presentedSkyFrame.timePresentation.model.algorithmVersion } : {}) }
      : undefined,
    [paintedData, report.data, carriedReport, registrationAt, presentedSkyFrame?.timePresentation]);

  // DOM projections and their mask share the committed camera/frame. The
  // mutable Canvas hit snapshot can already belong to a later native draw.
  const presentedSkyVisibility = presentedSceneCurrent && currentViewBasis && presentedSkyFrame ? {
    width: canvasSize.width, height: canvasSize.height,
    view: { basis: currentViewBasis, verticalFovDeg: presentedFov, center: presentedCenter,
      landscape: presentedSkyFrame.landscape },
  } : null;
  // Automatic names consume the actual accepted points, including their fade;
  // neither a requested catalogue row nor an exiting remnant grants a label.
  const visibleNamedCatalogObjects = useMemo(() => {
    return !presentedSceneCurrent ? [] : mode !== "OBSERVATION" ? presentedSkyFrame?.catalogNames ?? [] :
      projectSkyCatalogNames(paintedData?.skyScene, paintedAt, presentedSkyVisibility,
        presentedSkyFrame?.namedStars, presentedSkyFrame?.deepSkyAuxiliaryDecisions, viewportInsets);
  }, [paintedData, paintedAt, presentedSceneCurrent, currentViewBasis, canvasSize.width, canvasSize.height,
    presentedFov, presentedCenter.x, presentedCenter.y, viewportInsets.top, viewportInsets.bottom,
    presentedSkyFrame?.namedStars, presentedSkyFrame?.landscape, presentedSkyFrame?.deepSkyAuxiliaryDecisions,
    presentedSkyFrame?.catalogNames, mode]);

  const skySceneReady = skySceneHasContent(orientationData, row?.at) ||
    Boolean(orientationData && constellationFrame && constellationFrame.at === row?.at);
  const captureSkyCalibrationScope = (orientationRevision: number): SkyCalibrationScope | null => {
    if (!activeContext) return null;
    const time = observationTime.snapshot();
    return { expectedContext: activeContext, visibilityRevision: contextSession.visibilityRevision,
      binding: time.binding, committedAt: time.committedAt, at: time.at, mode, orientationRevision,
      canvasGeneration: canvasGenerationRef.current };
  };
  const skyCalibrationIntentCurrent = (scope: SkyCalibrationScope | null) => {
    const time = observationTime.snapshot(), live = orientationController.snapshot();
    // Use live owners so a passive effect from an earlier render cannot retire
    // a valid replacement command created before the next React commit.
    return Boolean(scope && viewportActiveRef.current && viewportMountedRef.current &&
      contextSession.visibilityRevision === scope.visibilityRevision && contextSession.ownsContext(scope.expectedContext) &&
      time.binding === scope.binding && time.committedAt === scope.committedAt && time.at === scope.at && time.mode !== "PLAYING" &&
      useAppStore.getState().mode === scope.mode && canvasGenerationRef.current === scope.canvasGeneration &&
      live.presentationRevision === scope.orientationRevision);
  };
  const skyCalibrationStartCurrent = () => {
    const live = orientationController.snapshot(), time = observationTime.snapshot(), frame = presentedSkyFrameRef.current;
    return Boolean(skyDisplayCurrent() && skyControlPanelRef.current === "calibration" && !datePickerOpenRef.current &&
      time.at === time.committedAt && time.mode !== "PLAYING" && skySceneReady && presentedSceneCurrent && !canvasError &&
      !manualBasisRef.current && live.alignment.ready && live.presentationRevision === orientation.snapshot.presentationRevision &&
      frame && frame.data?.context === rawReportData?.context && frame.frameAt === time.at && frame.mode === mode &&
      frame.nativeCanvasGeneration === canvasGenerationRef.current);
  };
  const finishSkyCalibration = (action: "cancel" | "commit") => {
    const scope = editingSkyCalibrationRef.current, live = orientationController.snapshot();
    if (!scope || !skyPageVisibleCurrent() || !skyCalibrationIntentCurrent(scope) || live.alignment.mode !== "editing" ||
      orientation.snapshot.presentationRevision !== scope.orientationRevision ||
      action === "commit" && (timeSaving || !contextSession.canRequest(scope.expectedContext))) return false;
    if (!orientationController[action]()) return false;
    editingSkyCalibrationRef.current = null;
    setSkyControlPanel("menu");
    return true;
  };
  const freezeSkyCalibration = () => {
    if (!skyCalibrationStartCurrent() || !orientationController.begin()) return false;
    editingSkyCalibrationRef.current = captureSkyCalibrationScope(orientationController.snapshot().presentationRevision);
    skyTapRef.current = null;
    stopObjectTracking();
    stopBrowsingAnimation();
    browsingCamera.freeze(orientation.presented.current);
    return true;
  };
  const beginSkyCalibration = () => {
    const live = orientationController.snapshot();
    if (pendingSkyCalibrationRef.current || !skyCalibrationStartCurrent() || !rawReportData || !row) return;
    if (presentedFov === SKY_VERTICAL_FOV_DEG && browsingCamera.snapshot().phase === "local") {
      freezeSkyCalibration();
      return;
    }
    // Restore the actual local direction and observing scale first. Freezing
    // the overview before changing its FOV would calibrate against zenith.
    const scope = captureSkyCalibrationScope(live.presentationRevision);
    if (!scope) return;
    pendingSkyCalibrationRef.current = { ...scope, context: rawReportData.context };
    setCalibrationPreparing(true);
    skyTapRef.current = null;
    stopBrowsingAnimation();
    browsingCamera.freeze(live.alignment.view);
    setVerticalFovDeg(SKY_VERTICAL_FOV_DEG);
  };
  const skyCalibrationRequestCurrent = () => {
    const request = pendingSkyCalibrationRef.current, live = orientationController.snapshot();
    const time = observationTime.snapshot();
    return Boolean(request && skyCalibrationIntentCurrent(request) && pageVisible && viewportActiveRef.current && contextComplete && activeContext &&
      contextSession.canRequest(activeContext) && !timeSaving && skySceneReady && !canvasError &&
      !manualBasisRef.current && live.alignment.ready && live.alignment.mode !== "editing" &&
      !skyTapRef.current && zoomRef.current === SKY_VERTICAL_FOV_DEG &&
      live.presentationRevision === request.orientationRevision && canvasGenerationRef.current === request.canvasGeneration &&
      rawReportData?.context === request.context && row?.at === request.at && mode === request.mode &&
      time.mode !== "PLAYING" && time.at === request.at && !selectedCatalogObjectRef.current && !selectedTargetIdRef.current &&
      !orientationObjectListOpenRef.current && !datePickerOpenRef.current);
  };
  const acceptSkyCalibration = (frame: SkyCanvasFrame, view: { basis: SkyViewBasis | null; fov: number }) => {
    const request = pendingSkyCalibrationRef.current;
    if (!request) return;
    if (!skyCalibrationIntentCurrent(request)) { cancelSkyCalibration(); return; }
    if (!skyPageVisibleCurrent() || !sameContextVersion(activeContext, request.expectedContext) ||
      timeBinding !== request.binding || committedAt !== request.committedAt) return;
    if (!skyCalibrationRequestCurrent()) { cancelSkyCalibration(); return; }
    if (!frame.sceneReady || frame.data?.context !== request.context || frame.frameAt !== request.at ||
      frame.mode !== request.mode || frame.nativeImageGeneration !== request.canvasGeneration || frame.orientationRevision !== request.orientationRevision ||
      !view.basis || view.fov !== SKY_VERTICAL_FOV_DEG || browsingCamera.snapshot().phase !== "local") return;
    cancelSkyCalibration();
    freezeSkyCalibration();
  };
  acceptSkyCalibrationRef.current = acceptSkyCalibration;
  // Install cleanup on loading/error renders too; a later conditional return
  // must never change React's hook order or leave an obsolete action alive.
  useEffect(() => {
    const request = pendingSkyCalibrationRef.current;
    if (request && !skyCalibrationIntentCurrent(request)) { cancelSkyCalibration(); return; }
    if (request && skyPageVisibleCurrent() && sameContextVersion(activeContext, request.expectedContext) &&
      timeBinding === request.binding && committedAt === request.committedAt && calibrationPreparing && !skyCalibrationRequestCurrent()) cancelSkyCalibration();
  }, [calibrationPreparing, pageVisible, contextComplete, activeContext, timeSaving, isPreviewing, skySceneReady, canvasError,
    alignment.ready, alignment.mode, orientation.snapshot.presentationRevision, canvasNodeRevision, rawReportData?.context,
    row?.at, mode, skyControlPanel, selectedCatalogObject, selectedTargetId, orientationObjectListOpen, datePickerOpen]);
  useEffect(() => {
    const scope = editingSkyCalibrationRef.current;
    if (scope && (!skyCalibrationIntentCurrent(scope) || orientationController.snapshot().alignment.mode !== "editing")) cancelSkyCalibration();
  }, [pageVisible, skyInteractionRevision, activeContext, timeBinding, committedAt, requestedAt, mode,
    orientation.snapshot.presentationRevision, canvasNodeRevision]);

  const navigationMenu = <SkyNavigationMenu open={skyControlPanel === "menu" || skyControlPanel === "calibration"} disabled={alignmentEditing}
    hidden={Boolean(contextComplete && activeContext && (orientationObjectListOpen || skyControlPanel === "time" || skyControlPanel === "layers" || selectedCatalogObject || selectedTargetId || catalogPickChoices.length || datePickerOpen))}
    onToggle={() => skyDisclosures.toggle("menu")} onLeave={() => void skyDisclosures.leave()}>
    <View className="sky-menu-grid">
      <SkyMenuAction icon="sky-search" label="搜索" id="sky-orientation-object-list-toggle" disabled={!contextComplete || !activeContext}
        expanded={orientationObjectListOpen} onClick={() => skyDisclosures.toggle("list")} />
      <SkyMenuAction icon="sky-clock" label="时间" id="sky-time-toggle" disabled={!contextComplete || !activeContext}
        expanded={skyControlPanel === "time"} onClick={() => skyDisclosures.toggle("time")} />
      <SkyMenuAction icon="sky-layers" label="叠加" id="sky-layers-toggle" disabled={!contextComplete || !activeContext}
        expanded={skyControlPanel === "layers"} onClick={() => skyDisclosures.toggle("layers")} />
      <SkyBrowseControl following={!manualBasis || followRequested} editing={alignmentEditing} active={pageVisible}
        disabled={!contextComplete || !activeContext || timeSaving} reducedMotion={reducedMotion}
        canCalibrate={alignmentEditing ? alignment.ready : !calibrationPreparing && alignment.ready && !timeSaving && !isPreviewing && !datePickerOpen && skySceneReady && presentedSceneCurrent}
        onToggle={() => {
          if (!skyPageVisibleCurrent() || timeSaving || contextSession.busy) return;
          const currentView = paintedSkyObjectsRef.current?.view?.basis ?? orientation.presented.current ?? INITIAL_MANUAL_SKY_VIEW;
          const wasFollowing = followRequested || !manualBasisRef.current || orientationController.snapshot().alignment.mode === "editing";
          cancelSkyCalibration(); setSkyControlPanel("menu");
          if (wasFollowing) enterManualView(currentView);
          else { stopObjectTracking(); setFollowRequested(true); recoverCompass(); }
        }}
        onCalibrate={() => {
          if (alignmentEditing) finishSkyCalibration("commit");
          else { setSkyControlPanel("calibration"); beginSkyCalibration(); }
        }} />
    </View>
    <SkyMenuAction icon="sky-observation" label="红光" id="sky-red-toggle" expanded={mode === "OBSERVATION"}
      onClick={() => {
        if (!skyPageVisibleCurrent()) return;
        const store = useAppStore.getState();
        if (store.mode === "OBSERVATION") store.exitObservation(); else store.enterObservation();
      }} />
  </SkyNavigationMenu>;

  const spotName = proposalRoute
    ? routeContext.locationName || "审核中观星点"
    : overview.data?.data.spot.name ?? "此观星点";
  const compassIsReady = alignment.ready && !alignmentRequired && devicePose !== null;
  const orientationSensorState = compassState;
  const compassRecovery =
    orientationSensorState === "DENIED"
      ? { title: "需要授权", detail: "请在微信设置中允许读取手机方向", action: "去设置" }
      : orientationSensorState === "UNAVAILABLE"
        ? { title: "方向暂缺", detail: "仍可拖动星图，或重试连接", action: "重试" }
        : orientationSensorState === "STALE"
          ? { title: "方向中断", detail: "已保留画面，连接后恢复跟随", action: "重新连接" }
          : orientationSensorState === "CALIBRATING"
            ? { title: "连接中", detail: "正在读取手机方向，请稍候", action: "连接中" }
            : orientationSensorState === "LOW_ACCURACY"
              ? { title: "方向偏差", detail: "远离磁性物体，再对齐星空", action: "重新连接" }
              : { title: "随手机", detail: "仅在此页使用手机方向，不记录轨迹", action: "开启跟随" };
  const recoverCompass = () => {
    if (!skyDisplayCurrent()) return;
    if (orientationController.snapshot().state === "DENIED") {
      if (orientationSettingsOpeningRef.current) return;
      const request = {};
      orientationSettingsOpeningRef.current = request;
      stopCompass();
      void Taro.openSetting()
        .catch(() => undefined)
        .finally(() => {
          if (orientationSettingsOpeningRef.current === request) orientationSettingsOpeningRef.current = null;
          // A new explicit tap retries after returning from settings.
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
  const presentedImageResources = liveSkySceneResources(presentedSceneCurrent && nativeCanvasMounted &&
    canvasSize.width > 0 && canvasSize.height > 0 ? presentedSkyFrame : null, canvasGenerationRef.current);
  const deepSkyImagePresented = Boolean(presentedImageResources.deepSkyImage);
  const presentedGalacticPublication = presentedImageResources.galacticImage?.publication ?? null;
  const presentedBodyImages = presentedImageResources.bodyImages;
  const sourceMetadataRef = useRef({ constellation: constellationCatalog.data,
    supplement: stellarSupplement.sources, wideField: wideField.publication });
  sourceMetadataRef.current = { constellation: constellationCatalog.data,
    supplement: stellarSupplement.sources, wideField: wideField.publication };
  const openConstellationSources = (catalog: NonNullable<typeof constellationCatalog.data>) => {
    if (!skyDisplayCurrent() || sourceMetadataRef.current.constellation !== catalog) return;
    return openSkySources(SOURCE_READING_ROUTE, skyConstellationSourceDocument(catalog));
  };
  const openStellarSupplementSources = (sources: readonly SourceSummary[]) => {
    if (!skyDisplayCurrent() || sourceMetadataRef.current.supplement !== sources) return;
    return openSkySources(SOURCE_READING_ROUTE, skyStellarSupplementSourceDocument(sources));
  };
  const openWideFieldSources = (publication: NonNullable<typeof wideField.publication>) => {
    if (!skyDisplayCurrent() || sourceMetadataRef.current.wideField !== publication) return;
    return openSkySources(SOURCE_READING_ROUTE, skyWideFieldSourceDocument(publication));
  };
  const openLandscapeSources = (photo: SkyPanoramaMask) => {
    const frame = currentPaintedSkySourceFrame();
    const currentPhoto = skyLandscapePaintedPanorama(frame?.landscape);
    if (!currentPhoto || currentPhoto.publication !== photo.publication || currentPhoto.resource !== photo.resource) return;
    return openSkySources(SOURCE_READING_ROUTE, skyLandscapeSourceDocument(photo));
  };
  const openGalacticSources = (publication: GalacticImageManifestData) => {
    const frame = currentPaintedSkySourceFrame();
    if (frame?.galacticImage?.publication !== publication) return;
    return openSkySources(SOURCE_READING_ROUTE, skyGalacticSourceDocument(publication));
  };
  const openBodyImageSources = (binding: SkyBodyImageBinding) => {
    const frame = currentPaintedSkySourceFrame();
    if (!frame?.bodyImages.some(current => current.reference === binding.reference && current.publication === binding.publication &&
      current.image === binding.image)) return;
    return openSkySources(skySourceSelectionPath({ kind: "body", reference: binding.reference,
      publicationHash: binding.publication.publicationHash }));
  };
  const presentedSdssOptical = presentedImageResources.sdssOptical;
  const sdssOpticalImagePresented = Boolean(presentedSdssOptical);
  const opticalImageCredit = skyOpticalSourceCredit(presentedSdssOptical);
  const presentedPreparedRegions = presentedImageResources.preparedRegions;
  const preparedRegionCredits = presentedPreparedRegions.flatMap(receipt => {
    const credit = skyOpticalSourceCredit(receipt); return credit ? [credit] : [];
  });
  const hipsImageCredit = skyHipsSourceCredit(presentedImageResources.opticalHips);
  const sdssOpticalStatus = sdssOpticalPresentation({
    requested: sdssOptical.requested,
    photoPresented: sdssOpticalImagePresented,
    canvasVisible: nativeCanvasMounted && !canvasError && canvasSize.width > 0 && canvasSize.height > 0,
    failed: sdssOptical.failed,
    loading: sdssOptical.loading,
  });

  const orientationTargetFrame = exactSkyTimeFrame(paintedData?.targetFrames, paintedAt);
  const orientationTargets = orientationTargetFrame?.targets ?? [];
  const fineTargetUnresolved = timePresentation?.mode === "MODEL" && !orientationTargetFrame;
  const fineTargetRetainedStale = Boolean(fineTargetData &&
    (fineTarget.refreshError || fineTarget.data?.dataState === "STALE_USABLE"));
  const selectedTarget = selectedTargetId
    ? orientationTargets.find((target) => target.targetId === selectedTargetId) ?? null
    : null;
  const searchSurfaceOpen = Boolean(orientationObjectListOpen && !selectedCatalogObject && !selectedTargetId &&
    !catalogPickChoices.length && !datePickerOpen);
  const objectSurfaceOpen = Boolean(selectedTarget || selectedCatalogObject || catalogPickChoices.length > 1);
  const overlayEnabled = pageVisible && !alignmentEditing;
  const searchMotion = useSkyOverlayMotion(searchSurfaceOpen, overlayEnabled, reducedMotion);
  const objectMotion = useSkyOverlayMotion(objectSurfaceOpen, overlayEnabled, reducedMotion);
  const [timeEntryReady, setTimeEntryReady] = useState(false);
  const timeMotion = useSkyOverlayMotion(skyControlPanel === "time" && !objectSurfaceOpen, overlayEnabled, reducedMotion, timeEntryReady);
  const timeLayout = useSkyOverlayLayoutReady(timeMotion, reducedMotion);
  const layersMotion = useSkyOverlayMotion(skyControlPanel === "layers" && !objectSurfaceOpen, overlayEnabled, reducedMotion);
  const closingOverlay = objectMotion.present && !objectMotion.active ||
    !objectMotion.present && searchMotion.present && !searchMotion.active;
  const orientationHeading = compassIsReady && sensorHeadingForScene !== null
    ? `${Math.round(sensorHeadingForScene)}°`
    : "未提供";
  // Ordinary target names already consume the accepted Canvas projection.
  // Only the retained native red-light labels need this UI projection pass.
  const visibleOrientationTargets = mode === "OBSERVATION" && presentedSceneCurrent ? projectSkyTargetLabels(orientationTargets,
    presentedSkyVisibility, presentedSkyFrame?.resolvedBodyReferences, presentedSkyFrame?.suppressedBodyReferences,viewportInsets) : [];
  const catalogFrameObjects = useMemo(() => {
    if (!orientationObjectListOpen) return [];
    const planets: PaintedSkyObject[] = row?.at && Array.isArray(row.planets) && row.planets.length === SKY_PLANET_ORDER.length &&
      row.planets.every((planet, index) => validSkyPlanetGeometry(planet, index))
      ? row.planets.filter(planet => planet.altitudeDeg > 0).map(planet => ({
        reference: `PLANET:${planet.body}`, displayName: SKY_PLANET_NAMES[planet.body].zh,
        kind: "PLANET" as const, magnitude: planet.visualMagnitude, magnitudeBand: "VISUAL" as const, x: 0, y: 0,
      })) : [];
    const catalog = reportData?.skyScene.catalog;
    const frame = resolveSkySceneFrame(reportData?.skyScene, row?.at);
    const stars: PaintedSkyObject[] = !catalog || frame?.state !== "AVAILABLE" || !frame.points ? [] : frame.points.flatMap(([catalogIndex, , altitude]) => {
      if (altitude <= 0) return [];
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
    const faintAppearance = createSkyStarAppearance(presentedFov,undefined,mode);
    const faintProjector = currentViewBasis ? createSkyDirectionProjector(currentViewBasis,canvasSize.width,canvasSize.height,presentedFov,presentedCenter) : null;
    const faint:PaintedSkyObject[]=currentViewBasis?(stellarSupplement.frame?.points??[]).flatMap(([reference,magnitude,azimuth,altitude])=>{
      if (altitude <= 0) return [];
      if((faintAppearance(magnitude)?.opacity??0)<.1)return [];
      const p=faintProjector?.project(azimuth,altitude);
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
  }, [orientationObjectListOpen, row, reportData, stellarSupplement.frame, currentViewBasis,
    presentedFov, canvasSize.width, canvasSize.height, presentedCenter.x, presentedCenter.y, mode]);
  const visibleConstellationLabels = mode === "OBSERVATION" && presentedSceneCurrent && currentViewBasis && presentedSkyFrame &&
    presentedSkyFrame.constellations?.at === paintedAt &&
    presentedSkyFrame.constellationsEnabled === constellationsEnabled
    ? projectSkyConstellationNames(presentedSkyFrame.constellations, paintedAt, presentedSkyVisibility,
      constellationsEnabled, [...visibleNamedCatalogObjects, ...visibleOrientationTargets.map(value => value.projection)],viewportInsets)
    : [];
  const visibleConstellationNames = mode === "OBSERVATION" ? visibleConstellationLabels.map(label => label.nameZh)
    : presentedSceneCurrent && presentedSkyFrame && presentedSkyFrame.constellations?.at === paintedAt &&
      presentedSkyFrame.constellationsEnabled === constellationsEnabled ? presentedSkyFrame.constellationNames : [];
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
    carriedReport
      ? { state: "LOADING" as const, detail: "时间已更新，正在加载资料…" }
      : report.isPending && !orientationData
      ? {
          state: "LOADING" as const,
          detail:
            "正在加载此地的星空…",
        }
      : report.isError
        ? {
            state: "ERROR" as const,
            detail:
              reportRecovery.detail,
          }
        : report.data?.dataState === "EXPIRED" ||
            report.data?.dataState === "UNAVAILABLE"
          ? {
              state: "ERROR" as const,
              detail:
                "天空资料未加载，请重试",
            }
          : !reportData
            ? {
                state: "ERROR" as const,
                detail:
                  "星图与地点或时间不符，请重试",
              }
            : !row
              ? {
                  state: "ERROR" as const,
                  detail: "此刻的天空未加载，请重试",
                }
            : stellarReference && stellarCatalog.isPending
              ? { state: "LOADING" as const, detail: "正在加载星图…" }
            : stellarCatalog.refreshError || stellarCatalog.data?.dataState === "STALE_USABLE"
              ? { state: "ERROR" as const, detail: "更新失败，保留已加载的星图" }
            : reportData.skyScene.state !== "AVAILABLE" ||
                !reportData.skyScene.catalog ||
                activeSkySceneFrame?.state !== "AVAILABLE" ||
                (activeSkySceneFrame.pointCount === undefined && !activeSkySceneFrame.points)
              ? {
                  state: "ERROR" as const,
                  detail:
                    "星图未加载，仍可搜索天体",
                }
            : null;
  const visibleNamedLabels = skySceneReady ? visibleNamedCatalogObjects.filter(
    object => object.reference !== selectionState.object?.reference) : [];
  const skyGestureCallbackOwns = (gesture: NonNullable<typeof skyTapRef.current>) =>
    gesture.session === contextSession && gesture.visibilityRevision === skyInteractionRevision &&
    gesture.timeBinding === timeBinding && gesture.committedAt === committedAt &&
    sameContextVersion(gesture.expectedContext, activeContext);
  const takeSkyGesture = () => {
    const gesture = skyTapRef.current;
    if (!gesture) return null;
    if (!skyGestureCallbackOwns(gesture)) {
      // The current render can discard an obsolete gesture without restoring
      // its checkpoint. A queued old render cannot discard the current one.
      if (skyTimeIntentCurrent()) skyTapRef.current = null;
      return null;
    }
    skyTapRef.current = null;
    return gesture;
  };
  const skyGestureRetirable = (gesture: NonNullable<typeof skyTapRef.current>) => {
    const time = observationTime.snapshot();
    return viewportMountedRef.current && skyGestureCallbackOwns(gesture) && contextSession.canRetireInteraction(gesture.visibilityRevision) &&
      contextSession.ownsContext(gesture.expectedContext) && time.binding === gesture.timeBinding &&
      time.committedAt === gesture.committedAt && canvasGenerationRef.current === gesture.canvasGeneration &&
      skyPresentedTimeCurrent(time.at, gesture.at, time.mode === "PLAYING", time.runStartAt);
  };
  const skyGestureCurrent = (gesture: NonNullable<typeof skyTapRef.current>) => {
    const time = observationTime.snapshot();
    return skyTimeIntentCurrent() && skyGestureRetirable(gesture) &&
      !selectedCatalogObjectRef.current && !selectedTargetIdRef.current &&
      !datePickerOpenRef.current && skyPresentedTimeCurrent(time.at, gesture.at, time.mode === "PLAYING", time.runStartAt);
  };
  const onSkyTouchStart = (event: unknown) => {
    if (!skyTimeIntentCurrent() || !presentedSceneCurrent || !skySceneReady || selectedCatalogObjectRef.current ||
      selectedTargetIdRef.current || datePickerOpenRef.current) return;
    const frame = presentedSkyFrameRef.current, time = observationTime.snapshot();
    if (!frame || frame.identity.canvas.generation !== canvasGenerationRef.current ||
      paintedSkyObjectsRef.current?.identity !== frame.identity ||
      !skyPresentedTimeCurrent(time.at, frame.identity.observation.frameAt, time.mode === "PLAYING", time.runStartAt)) return;
    const point = skyTouchPoint(event);
    const count = (event as SkyTouchLike).touches?.length ?? 0;
    const gestureBasis = paintedSkyObjectsRef.current?.view?.basis ?? currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW;
    if (point && count >= 1 && count <= 2 && navigationRequestRef.current) stopBrowsingAnimation();
    const pinchDistance = skyTouchDistance(event);
    if (skyTapRef.current && !skyGestureCurrent(skyTapRef.current)) skyTapRef.current = null;
    if (skyTapRef.current) {
      skyTapRef.current.maximumTouches = Math.max(count, skyTapRef.current.maximumTouches);
      if (count > 2) { cancelSkyGestureRef.current(); return; }
      skyTapRef.current.pinchStartDistance = pinchDistance;
      skyTapRef.current.pinchStartFov = zoomRef.current;
      skyTapRef.current.pinchStartBasis = gestureBasis;
      return;
    }
    skyTapRef.current = point && count >= 1 && count <= 2 ? {
      session: contextSession, visibilityRevision: skyInteractionRevision, expectedContext: activeContext!,
      timeBinding, committedAt, at: observationTime.snapshot().at, canvasGeneration: canvasGenerationRef.current,
      startX: point.x,
      startY: point.y,
      nameReference: mode !== "OBSERVATION" && count === 1
        ? pickSkyCatalogName(frame.catalogNames ?? [],point.x,point.y)?.reference ?? null : null,
      controlNameKey:mode !== "OBSERVATION" && count===1
        ?pickSkyControlName(frame.controlNames??[],point.x,point.y)?.key??null:null,
      travelPx: 0,
      startedWithTouches: count,
      maximumTouches: count,
      cancelled: false,
      pinchStartDistance: pinchDistance,
      pinchStartFov: zoomRef.current,
      pinchStartBasis: gestureBasis,
      startBasis: gestureBasis,
      panMode: currentViewBasis && !skyLandscapeVisibleInView(frame.landscape,
        { basis: currentViewBasis, verticalFovDeg: presentedFov, center: presentedCenter },
        canvasSize.width, canvasSize.height, viewportInsets) ? "screen" : "horizon",
      dragged: false,
      edge: point.x < 16 || point.x > canvasSize.width - 16,
      startedManual: Boolean(manualBasis),
      startedFollowing: followRequested || (!manualBasis && (compassLifecycle.active || sensorBasis !== null)),
      initialFov: zoomRef.current,
      cameraCheckpoint: browsingCamera.checkpoint(),
      trackingCheckpoint: objectTracking.snapshot(),
      originalManualBasis: manualBasisRef.current,
      startCenter: presentedCenter,
    } : null;
    if (skyTapRef.current?.nameReference||skyTapRef.current?.controlNameKey) browsingDrawRef.current();
  };
  const onSkyTouchMove = (event: unknown) => {
    const gesture = skyTapRef.current;
    const point = skyTouchPoint(event);
    if (!gesture || !skyGestureCurrent(gesture) || !point || gesture.edge || gesture.cancelled) return;
    gesture.maximumTouches = Math.max(gesture.maximumTouches, (event as SkyTouchLike).touches?.length ?? 0);
    const pinchDistance = skyTouchDistance(event);
    if (pinchDistance !== null && gesture.pinchStartDistance === null) {
      gesture.pinchStartDistance = pinchDistance;
      gesture.pinchStartFov = zoomRef.current;
      gesture.pinchStartBasis = currentViewBasis ?? INITIAL_MANUAL_SKY_VIEW;
    } else if (gesture.pinchStartDistance !== null && pinchDistance !== null) {
      const fov = pinchFieldOfView(gesture.pinchStartFov, gesture.pinchStartDistance, pinchDistance, canvasSize.width, canvasSize.height);
      // Direct manipulation reaches the existing single native writer first.
      // Its accepted frame publishes the page scale, not each raw touch event.
      zoomRef.current = fov;
      browsingDrawRef.current();
    }
    gesture.travelPx = Math.max(gesture.travelPx, Math.hypot(point.x - gesture.startX, point.y - gesture.startY));
    if (gesture.maximumTouches === 1 && gesture.travelPx > 6) {
      stopBrowsingAnimation();
      const dragged = dragSkyView(gesture.startBasis, { x: gesture.startX, y: gesture.startY }, point,
        canvasSize.width, canvasSize.height, gesture.pinchStartFov, gesture.startCenter, gesture.panMode);
      const next = browsingCamera.pan(dragged, skyDomeProgress(gesture.pinchStartFov, canvasSize.width, canvasSize.height)).view ?? dragged;
      if (!gesture.dragged) { enterManualView(next, gesture); gesture.dragged = true; }
      else manualBasisRef.current = next;
      // Match pinch: retain the latest input immediately and let the existing
      // single writer coalesce it before publishing the accepted page camera.
      browsingDrawRef.current();
    }
  };
  const onSkyTouchCancel = () => {
    const gesture = takeSkyGesture();
    if (!gesture) return;
    // A queued old handler cannot clear the replacement gesture. Cleanup may
    // retract this gesture during its first hide, but cannot restore a camera
    // or tracking checkpoint after Context/time/native generation replacement.
    if (!skyGestureRetirable(gesture)) return;
    if (gesture.nameReference||gesture.controlNameKey) browsingDrawRef.current();
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
    const gesture = takeSkyGesture();
    if (!gesture) return;
    if (gesture.dragged) setManualBasis(manualBasisRef.current);
    stopBrowsingAnimation();
    const trackedPosition = objectTracking.snapshot().position;
    if (trackedPosition) applyTrackedPosition(trackedPosition);
  };
  cancelSkyGestureRef.current = onSkyTouchCancel;
  settleSkyGestureForViewportRef.current = settleSkyGestureForViewport;
  const onSkyTouchEnd = (event: unknown) => {
    if (!skyTimeIntentCurrent() || (event as SkyTouchLike).touches?.length) return;
    const gesture = skyTapRef.current;
    if (!gesture || !skyGestureCurrent(gesture)) return;
    skyTapRef.current = null;
    if (gesture.nameReference||gesture.controlNameKey) browsingDrawRef.current();
    if (gesture.dragged) setManualBasis(manualBasisRef.current);
    const trackedPosition = objectTracking.snapshot().position;
    if (trackedPosition) applyTrackedPosition(trackedPosition);
    const point = skyTouchPoint(event, true);
    if (gesture && point) gesture.travelPx = Math.max(gesture.travelPx, Math.hypot(point.x - gesture.startX, point.y - gesture.startY));
    // The painter excludes a stale SAO frame; touch must use the same bound
    // publication identity or a valid visible planet/star can become unpickable.
    const identity = skyPickIdentity(paintedData,currentStellarSupplement(presentedSkyFrame?.stellarSupplement,paintedData?.skyScene,paintedAt));
    if (!presentedSceneCurrent || !gesture || gesture.dragged || gesture.edge || !point || !paintedRow || !isUnambiguousTapGesture(gesture)) return;
    const accepted = presentedSkyFrameRef.current;
    if (!accepted || paintedSkyObjectsRef.current?.identity !== accepted.identity ||
      accepted.identity.canvas.generation !== canvasGenerationRef.current) return;
    if (skyControlPanelRef.current === "time") { skyDisclosures.close("time"); return; }
    if(mode!=="OBSERVATION"&&!alignmentEditing) {
      const copied=presentedSkyFrameRef.current;
      if(!copied||copied.data!==paintedData||copied.frameAt!==paintedRow.at||
        copied.nativeCanvasGeneration!==canvasGenerationRef.current)return;
      const name=pickSkyControlName(copied.controlNames??[],point.x,point.y);
      if(name) {
        if(name.action.kind==='selected') {
          if(name.action.object===objectSelection.snapshot().object)selectCatalogObject(name.action.object);
        } else {
          const action=name.action;
          const target=exactSkyTimeFrame(copied.data?.targetFrames,copied.frameAt)?.targets.find(
            target=>target.targetId===action.target.targetId);
          if(target&&target===action.target)selectSkyTarget(target);
        }
        return;
      }
    }
    if(!identity.catalogVersion)return;
    const pickInput = {
      x: point.x,
      y: point.y,
      frameAt: paintedRow.at,
      catalogVersion: identity.catalogVersion,
      catalogHash: identity.catalogHash,
    };
    // No-result from a stale/missing frame is not a verified blank-sky tap.
    if (!skyPickSnapshotIsCurrent(paintedSkyObjectsRef.current, pickInput)) return;
    if (mode !== "OBSERVATION") {
      const name = pickSkyCatalogName(presentedSkyFrameRef.current?.catalogNames ?? [],point.x,point.y);
      if (name) { selectCatalogObject(name);return; }
    }
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
  const skySceneStarCount = paintedSceneFacts.starCount;
  useEffect(() => { skyMapLifecycle.skyMounted(); }, []);
  useEffect(() => {
    if (pageVisible && presentedSceneCurrent && skySceneReady) skyMapLifecycle.skyReady();
  }, [pageVisible, presentedSceneCurrent, skySceneReady]);
  const exitBoundary = <NativeBackBoundary active={pageVisible}
    onBack={() => { if (!closingOverlay) return goBack(); }} />;
  const exitShield = skyExit.presentation === null ? null : <View
    className={`sky-page-exit-shield${routeReducedMotion ? " sky-page-exit-shield--reduced" : ""}`}
    style={{ "--sky-page-fade-ms": `${PAGE_BLACKOUT_FADE_MS}ms` } as CSSProperties}
    data-control="sky-page-exit-shield"
    onAnimationEnd={() => { if (skyExit.presentation !== null) skyExit.transition.finishFade(skyExit.presentation); }}
    onTouchMove={event => event.stopPropagation()} onClick={event => event.stopPropagation()} />;
  const routeLifecycleProbe = <View className="sr-live sky-route-lifecycle" aria-hidden="true"
    id={`sky-route-lifecycle-${encodeURIComponent(JSON.stringify(skyMapLifecycle.snapshot()))}`} />;
  const presentedSceneReady = presentedSceneCurrent && skySceneReady;
  const skySceneAccessibleProvenance = presentedSceneReady
    ? `，场景时刻 ${paintedSceneFacts.frameAt || "未知"}`
    : "";
  const skyScenePresentationState = presentedSceneReady ? "READY"
    : skySceneReady && nativeCanvasMounted && !canvasError ? "PENDING" : "UNAVAILABLE";
  const skySceneAccessibleCount = presentedSceneReady
    ? skySceneStarCount === null ? "亮星目录当前不可用" : `${skySceneStarCount} 颗真实亮星目录对象`
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
  const skySceneAccessibleLabel = `${spotName}的方位高度天空图，${presentedSceneReady ? "已呈现" : "所选"}垂直视场 ${skySceneAccessibleFov < 1 ? skySceneAccessibleFov.toFixed(2) : skySceneAccessibleFov.toFixed(1)} 度，${skySceneAccessibleCount}${skySceneAccessibleProvenance}，${visibleConstellationNames.length ? `可见星座 ${visibleConstellationNames.join("、")}，` : ""}${skyTargetAccessibleCount}，${skySceneAccessibleOrientation}，所选观测时刻 ${rowTime}`;
  if (!activeContext && contextLookupEnabled && contextLookup.isPending)
    return (
      <View
        className={`${presentationClass} sky-orientation-page sky-orientation-state-page`}
        style={skyLayoutStyle}
        data-route="spot-night-context-loading"
        data-sky-route-lifecycle={JSON.stringify(skyMapLifecycle.snapshot())}
      data-od-id="sky-orientation-route"
      >

      <FloatingNotificationHost />
      {exitBoundary}
      {exitShield}
      {routeLifecycleProbe}
        <View className="sky-orientation-state-page__canvas" aria-hidden="true" />
        {navigationMenu}
        <View className="sky-orientation-state-page__status">
          <StatusPanel
            state="LOADING"
            detail="正在恢复地点与时间…"
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
        data-sky-route-lifecycle={JSON.stringify(skyMapLifecycle.snapshot())}
      data-od-id="sky-orientation-route"
      >

      <FloatingNotificationHost />
      {exitBoundary}
      {exitShield}
      {routeLifecycleProbe}
        <View className="sky-orientation-state-page__canvas" aria-hidden="true" />
        {navigationMenu}
        <View className="sky-orientation-state-page__status">
          <ContextError
            lookupError={contextLookup.error}
            {...(!activeContext && contextLookupEnabled && contextLookup.isError
              ? { onRetry: () => { if (contextSession.canLookup()) void contextLookup.refetch(); } } : {})} />
        </View>
      </View>
    );

  return (
    <View
      className={`${presentationClass} sky-orientation-page`}
      style={skyLayoutStyle}
      data-route="sky/detail"
      data-spot-id={routeContext.spotId}
      data-sky-route-lifecycle={JSON.stringify(skyMapLifecycle.snapshot())}
      data-od-id="sky-orientation-route"
    >
      <FloatingNotificationHost />
      {exitBoundary}
      {exitShield}
      {routeLifecycleProbe}
      {preparedRegions.resources}
      <View className="sky-observer-meta">
        <Text className="sky-observer-meta__place">{spotName}</Text>
        <Text className="sky-observer-meta__zone">{timezoneOffsetLabel(row?.at ?? committedAt, routeContext.timezone)}</Text>
      </View>

        <View
          className="sky-orientation-canvas"
          data-control="sky-orientation-canvas"
          data-od-id="sky-orientation-canvas"
          data-canvas-state={orientationDataStatus?.state ?? "READY"}
          data-sky-scene-state={skyScenePresentationState}
          data-sky-canvas-failure={canvasError ?? ""}
          data-sky-star-count={presentedSceneReady ? skySceneStarCount : null}
          data-sky-star-state={presentedSceneReady ? paintedSceneFacts.starState : skyScenePresentationState}
          data-sky-catalog-version={
            presentedSceneReady ? paintedSceneFacts.catalogVersion : ""
          }
          data-sky-scene-frame-at={presentedSceneReady ? paintedSceneFacts.frameAt : ""}
          data-sky-presented-view={nativeCanvasMounted && presentedSceneReady
            ? JSON.stringify(skyPresentedViewFacts(paintedSkyObjectsRef.current, paintedAt)) : ""}
          data-sky-painted-body-images={nativeCanvasMounted && presentedSceneCurrent
            ?JSON.stringify(presentedBodyImages.map(value=>({reference:value.reference,
              publicationHash:value.publication.publicationHash,imageSha256:value.publication.image.sha256}))):""}
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
            onError={onSkyCanvasError}
            style={{ width: "100%", height: "100%", visibility: canvasError || canvasSize.width <= 0 || canvasSize.height <= 0 ? "hidden" : "visible" }}
            aria-label="方位天空投影；目录星与目标标记只来自当前正式点、真实时刻和服务端天文计算结果"
          /> : null}
          {nativeCanvasMounted ? <Canvas
            type="2d"
            disableScroll
            id={`${CANVAS_ID}-selection`}
            canvasId={`${CANVAS_ID}-selection`}
            className={`sky-selection-layer${pageVisible && presentedSceneCurrent && selectionState.object && !alignmentEditing && !reducedMotion ? " sky-selection-layer--breathing" : ""}`}
            onTouchStart={onSkyTouchStart}
            onTouchMove={onSkyTouchMove}
            onTouchEnd={onSkyTouchEnd}
            onTouchCancel={onSkyTouchCancel}
            onError={onSkySelectionLayerError}
            style={{ width: "100%", height: "100%", visibility: pageVisible && presentedSceneCurrent && selectionState.object && !alignmentEditing && !canvasError ? "visible" : "hidden" }}
            aria-hidden
          /> : null}
          {pageVisible && presentedSceneCurrent && selectionState.object && paintedData && paintedRow &&
            selectionState.spotId === paintedData.context.spotId && currentViewBasis && !alignmentEditing ?
            <SkySelectedObject object={selectionState.object} context={paintedData.context} at={paintedRow.at}
              visualName={mode==="OBSERVATION"}
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
              suspended={contextSession.busy || timeSaving}
              onPosition={onSkySelectionPosition}
              onSelect={selectCatalogObject}
              onRetrySky={() => { if(retryReport())stellarSupplement.retry(); }} /> : null}
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
          {(Math.abs(verticalFovDeg - SKY_VERTICAL_FOV_DEG) > 0.05) ? (
            <View className="sky-zoom-status" role="status" aria-live="polite">



              {Math.abs(verticalFovDeg - SKY_VERTICAL_FOV_DEG) > 0.05 ? <Text>{verticalFovDeg < 1 ? verticalFovDeg.toFixed(2) : verticalFovDeg.toFixed(1)}°</Text> : null}
              {Math.abs(verticalFovDeg - SKY_VERTICAL_FOV_DEG) > 0.05 && verticalFovDeg <= SKY_MIN_VERTICAL_FOV_DEG ? <Text>已放至最大</Text> : null}
            </View>
          ) : null}
          {mode === "OBSERVATION" && visibleNamedLabels.map((object) => (
            <SkyOrientationCatalogLabel
              key={object.reference}
              object={object}
              opacity={object.auxiliaryOpacity ?? 1}
              width={canvasSize.width}
              disabled={alignmentEditing}
              onSelect={selectCatalogObject}
            />
          ))}
          {mode==="OBSERVATION"&&visibleOrientationTargets.map(({ target, projection,opacity }) => (
            <SkyOrientationTargetLabel
              key={target.targetId}
              target={target}
              projection={projection}
              opacity={opacity}
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
              <Text>星图未能显示，仍可搜索与选择时间</Text>
              <SoftButton
                variant="ghost"
                className="sky-orientation-canvas__retry"
                label="重试天空图"
                onClick={retrySkyCanvas}
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
                    ? report.isError ? reportRecovery.label : "重试天空"
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
              refreshFailed={Boolean(report.refreshError) || report.data?.dataState === "STALE_USABLE"} onRecover={retryReport} />
          </ScrollView>
        </View>

        {navigationMenu}
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

        <SkyOverlayMotion motion={searchMotion} kind="search" keepMounted={overlayEnabled}>{active => (
        <SkyDisclosureSurface kind="search" className="sky-orientation-details sky-orientation-details--list"
          label="搜索天体" onClose={() => skyDisclosures.close("list")}>
        {orientationObjectListOpen && pageVisible && !alignmentEditing ? (
          <View
            className="sky-orientation-object-list"
            data-control="sky-orientation-object-list"
            data-od-id="sky-orientation-object-list"
            aria-label="天体列表与目录搜索"
          >
            <SkyObjectSearch active={active} onSelect={selectSearchObject}
              query={catalogSearchQuery} onQueryChange={setCatalogSearchQuery} children={<>
            {orientationTargetFrame && fineTargetRetainedStale ? <StatusPanel state="STALE"
              detail="更新失败，保留此刻的已算目标"
              recoveryLabel="重试目标" onRecover={() => void fineTarget.refetch()} /> : null}
            {orientationData ? (
              !orientationTargetFrame ? (
                <StatusPanel
                  state={fineTargetUnresolved && fineTarget.isError ? "ERROR" : "LOADING"}
                  detail={fineTargetUnresolved
                    ? timePlaying ? "暂停播放后，更新此刻的观测目标"
                      : fineTarget.isError ? "目标未加载，星图仍可浏览"
                        : "正在计算此刻的观测目标…"
                    : "正在更新观测目标…"}
                  {...(fineTargetUnresolved && fineTarget.isError ? {
                    recoveryLabel: "重试目标", onRecover: () => void fineTarget.refetch(),
                  } : {})}
                />
              ) : orientationTargets.length ? (
                <View className="sky-orientation-object-list__scroll">
                  {orientationTargets.map((target, index) => (
                    <SkySearchRow name={target.displayName} kind={target.type === "PLANET" ? "行星" : target.type === "STAR" ? "恒星" : target.type === "CONSTELLATION" ? "星座" : "区域"}
                      ordinal={index} key={target.targetId} onSelect={() => selectSkyTarget(target)} />
                  ))}
                </View>
              ) : (
                <StatusPanel
                  state="EMPTY"
                  detail="此刻没有已收录的观测目标"
                />
              )
            ) : (
              <StatusPanel
                state={orientationDataStatus?.state ?? "ERROR"}
                detail={
                  orientationDataStatus?.detail ??
                  "天空资料未加载，地点与时间已保留"
                }
                recoveryLabel="重试天空"
                onRecover={retryReport}
              />
            )}
            {catalogFrameObjects.length ? (
              <View className="sky-orientation-object-list__catalog" role="list" aria-label={`当前地平线上 ${catalogFrameObjects.length} 个目录天体`}>
                {catalogFrameObjects.slice(0, catalogListLimit).map((object, index) => (
                  <SkySearchRow name={object.displayName} kind={skyObjectKindLabel(object.kind)} ordinal={index % 24}
                    key={object.reference} onSelect={() => selectCatalogObject(object)} />
                ))}
                {catalogListLimit < catalogFrameObjects.length ? (
                  <Button className="sky-catalog-row__more" onClick={() => {
                    if (skyDisplayCurrent()) setCatalogListLimit(value => Math.min(value + 24, catalogFrameObjects.length));
                  }}>
                    <Text>更多</Text><SemanticIcon name="sky-down" />
                  </Button>
                ) : null}
              </View>
            ) : null}
            </>} footer={<>
            <Button className="sky-source-disclosure focus-ring" aria-expanded={skyCatalogSourcesOpen}
              onClick={() => { if (skyDisplayCurrent()) setSkyCatalogSourcesOpen(value => !value); }}>
              <Text>天空说明</Text><SemanticIcon name={skyCatalogSourcesOpen ? "sky-up" : "sky-down"} />
            </Button>
            {skyCatalogSourcesOpen ? <View className="sky-source-disclosure__content">
            {constellationCatalog.data ? <View>
              <SkySourceSummary label="星座资料" credit="Johan Meuris / Stellarium" disabled={alignmentEditing}
                onOpen={() => openConstellationSources(constellationCatalog.data!)} />
            </View> : null}
            {stellarSupplement.sources.length ? <View>
              <SkySourceSummary label="暗星资料" credit="SAO / NASA HEASARC" disabled={alignmentEditing}
                onOpen={() => openStellarSupplementSources(stellarSupplement.sources)} />
            </View>:null}
            <Text className="type-caption">普通星图的天空颜色按太阳位置和固定晴空散射参数示意；低空星点参考 ESO La Silla 可见光数据渐暗。均不代表当前地点的透明度、天气或肉眼可见性。</Text>
            <Text className="type-caption">太阳边缘明暗采用历史 579.88 nm 单波段临边昏暗模型（Neckel / Labs，Hestroffer / Magnan 1998）；颜色为显示配色，不是实时日面、自然真彩或测光结果。</Text>
            <SkySourceSummary label="太阳显示模型" credit="Neckel / Labs · Hestroffer / Magnan 1998" disabled={alignmentEditing}
              onOpen={() => { if (skyDisplayCurrent()) return openSkySources(SOURCE_READING_ROUTE, skySolarLightSourceDocument()); }} />
            <Text className="type-caption">地景是通用模拟场景，亮度随所选时刻变化；不代表当前地点的地貌、天气或现场遮挡。地平线是几何方向参照。</Text>
            {paintedLandscapePhoto ? <View>
              {presentedSkyFrame?.landscape?.kind === "transition"
                ? <Text className="type-caption">当前图片与自有草地、树木模拟模型正在过渡显示。</Text> : null}
              <SkySourceSummary label="地面图片" credit={paintedLandscapePhoto.publication.source.credit} disabled={alignmentEditing}
                onOpen={() => openLandscapeSources(paintedLandscapePhoto)} />
            </View> : presentedSceneCurrent && skyLandscapeHasPaintedModel(presentedSkyFrame?.landscape)
              ? <Text className="type-caption">当前显示自有草地与树木模拟模型。</Text> : null}
            <Text className="type-caption">
              银河层仅作夜间广角背景；开启可选 W3 广角红外时由 W3 替换，图片未成功显示时按标准银河坐标绘制淡带示意。来源只对应当前完成绘制的图片，不代表现场天气或肉眼可见性。
            </Text>
            {presentedGalacticPublication ? <View>
              <SkySourceSummary label="银河图片" credit={presentedGalacticPublication.source.credit} disabled={alignmentEditing}
                onOpen={() => openGalacticSources(presentedGalacticPublication)} />
            </View>:null}
            <Text className="type-caption">可选的广角红外图层使用 2010 年 AllWISE W3 12 μm 影像；它不是可见光银河，也不表示现场可见性。</Text>
            {wideField.publication ? <View>
              <Text className="type-caption">{wideField.publication.source.acknowledgment}</Text>
              <SkySourceSummary label="红外图层资料" credit="AllWISE W3 12 μm" disabled={alignmentEditing}
                onOpen={() => openWideFieldSources(wideField.publication!)} />
            </View>:null}
            {presentedBodyImages.map(binding=><SkyBodyImageSource key={binding.reference} binding={binding}
              disabled={alignmentEditing} onOpenSources={openBodyImageSources}/>)}
            {hipsImageCredit?<SkyOpticalImageCredit credit={hipsImageCredit} disabled={alignmentEditing} onOpenSources={openOpticalSources}/>:null}
            </View> : null}
            </>} />
          </View>
        ) : null}

        </SkyDisclosureSurface>
        )}</SkyOverlayMotion>

        <SkyOverlayMotion motion={objectMotion} kind="object">{active => <>
        {selectedTarget ? (
          <SkyTargetInformation
            target={selectedTarget}
            spotName={spotName}
            selectedAt={row?.at ?? committedAt}
            timezone={routeContext.timezone}
            onBack={orientationObjectListOpen ? skyDisclosures.returnToList : undefined}
            onSources={() => {
              if (active && selectedTargetIdRef.current === selectedTarget.targetId && activeContext && reportData && row)
                void openSkySources(skyTargetSourcesRoute(activeContext, routeContext.spotId, reportData.context.dataRevision, row.at, selectedTarget));
            }}
            onClose={() => skyDisclosures.closeObject()}
          />
        ) : null}

        {catalogPickChoices.length > 1 ? (
          <View className="sky-object-choice sky-overlay-motion__surface" role="dialog" aria-label="选择重叠的天体">
            <Text className="sky-object-choice__title">选择天体</Text>
            {catalogPickChoices.map((choice) => (
              <Button key={choice.reference} className="sky-object-choice__row" onClick={() => selectCatalogObject(choice)}>
                <Text>{choice.displayName}</Text>
                <Text>{skyObjectIdentityLabel(choice)}{choice.magnitude === null ? "" : ` · ${skyObjectMagnitudeLabel(choice)}`}</Text>
              </Button>
            ))}
            <Button className="sky-object-choice__cancel" onClick={() => skyDisclosures.closeObject()}>取消</Button>
          </View>
        ) : null}

        {pageVisible && selectedCatalogObject ? (
          <SkyCatalogInformation active={active} openSourceRoute={async url=>{
            if (active && selectedCatalogObjectRef.current?.reference === selectedCatalogObject.reference) await openSkySources(url);
          }}
            reference={selectedCatalogObject.reference}
            bodyImagePublicationHash={presentedBodyImages.find(value=>value.reference===selectedCatalogObject.reference)?.publication.publicationHash}
            knownName={selectedCatalogObject.displayName}
            knownKind={selectedCatalogObject.kind}
            onBack={orientationObjectListOpen ? skyDisclosures.returnToList : undefined}
            {...(deepSkyImagePresented && presentedSkyFrame?.deepSkyImage?.reference === selectedCatalogObject.reference &&
              presentedSkyFrame.deepSkyImage.publicationHash ? { imagePublicationHash: presentedSkyFrame.deepSkyImage.publicationHash } : {})}
            {...(presentedSdssOptical?.reference === selectedCatalogObject.reference &&
              presentedSdssOptical.publicationHash ? { opticalPublicationHash: presentedSdssOptical.publicationHash } : {})}
            onClose={() => skyDisclosures.closeObject()}
            positionAction={pageVisible && reportData && row ? <View className="sky-object-modal__position">
              <SkyObjectPositionAction
              {...(positionPresentation ? { presentation: positionPresentation } : {})}
              binding={{ reference: selectedCatalogObject.reference, spotId: reportData.context.spotId,
                contextId: reportData.context.contextId, contextRevision: reportData.context.contextRevision,
                contextFingerprint: reportData.context.contextFingerprint, dataRevision: reportData.context.dataRevision,
                algorithmVersion: reportData.context.algorithmVersion, at: row.at }}
              catalog={positionCatalog(selectedCatalogObject.reference)}
              suspended={!active || contextSession.busy || timeSaving}
              onLocate={locateCatalogObject}
              onTrack={trackCatalogObject}
              onRetrySky={() => { if(retryReport())stellarSupplement.retry(); }} /></View> : null}
          />
        ) : null}
        </>}</SkyOverlayMotion>

        <SkyOverlayMotion motion={layersMotion} kind="layers" keepMounted={skyControlPanel === "layers" && overlayEnabled}>{active => (
        <SkyDisclosureSurface kind="layers" className="sky-layers-panel" label="天空叠加"
          onClose={() => skyDisclosures.close("layers")}>
        <ScrollView scrollY enhanced showScrollbar={false} className="sky-layers-scroll">
          <Text className="sky-menu-section-label">星空标记</Text>
          <SkyLayerToggle icon="star" label="星座" detail="显示连线、名称与星座画" selected={constellationsEnabled} disabled={alignmentEditing}
            onClick={() => skyDisclosures.applyLayer(() => { if (skyDisplayCurrent()) setConstellationsEnabled(value => !value); })} />
          <SkyLayerToggle icon="horizon" label="方位网格" detail="标出方向与高度" selected={coordinateGrids.horizontal} disabled={alignmentEditing}
            onClick={() => skyDisclosures.applyLayer(() => { if (skyDisplayCurrent()) setCoordinateGrids(value => ({ ...value, horizontal: !value.horizontal })); })} />
          <SkyLayerToggle icon="compass" label="星空坐标" detail={coordinateGridFrame ? "按天体坐标查找位置（J2000）" : "此刻的坐标暂不可用"}
            selected={coordinateGrids.equatorial} disabled={alignmentEditing || (!coordinateGridFrame && !coordinateGrids.equatorial)}
            onClick={() => skyDisclosures.applyLayer(() => { if (skyDisplayCurrent()) setCoordinateGrids(value => ({ ...value, equatorial: !value.equatorial })); })} />
          <Text className="sky-menu-section-label">背景影像</Text>
          <SkyLayerToggle icon="terrain" label="地面" detail="通用景观，不是此地实景" selected={landscapeEnabled} disabled={alignmentEditing}
            onClick={() => skyDisclosures.applyLayer(() => { if (skyDisplayCurrent()) setLandscapeEnabled(value => !value); })} />
          <SkyLayerToggle icon="images" label="红外天空" detail={mode === "OBSERVATION" ? "红光模式下隐藏影像" : "夜间显示历史红外图，替换银河背景"}
            selected={wideFieldEnabled} disabled={alignmentEditing}
            onClick={() => skyDisclosures.applyLayer(() => { if (skyDisplayCurrent()) setWideFieldEnabled(value => !value); })} />
        <View className="sky-resource-recoveries">
          {coordinateGrids.equatorial && !coordinateGridFrame ? <View className="sky-view-mode__status" role="status" aria-live="polite"><Text className="type-caption">此刻的星空坐标暂不可用</Text></View> : null}
          {constellationFailed ? <Button className="sky-view-mode__button focus-ring" onClick={retryConstellations}>重试星座</Button> : null}
          {stellarSupplement.failed ? <Button className="sky-view-mode__button focus-ring" onClick={() => recoverSkyResource(stellarSupplement.retry)}>重试暗星</Button> : null}
        </View>
        </ScrollView>
        </SkyDisclosureSurface>
        )}</SkyOverlayMotion>
        <View className="sky-quick-settings" style={skyRetainedLayerStyle(Boolean(orientationObjectListOpen ||
          skyControlPanel && skyControlPanel !== "time" || selectedCatalogObject || selectedTargetId ||
          catalogPickChoices.length || datePickerOpen))}>
        {!skyHasDisclosure({panel:skyControlPanel,list:orientationObjectListOpen,date:datePickerOpen,
          object:Boolean(selectedCatalogObject || selectedTargetId || catalogPickChoices.length)}) ? <View className="sky-image-status-group">
          {deepSkyImagePresented || selectedDeepSkyEntry && verticalFovDeg <= 15 &&
            (mode === "OBSERVATION" || deepSkyRegistrationReady && deepSkyImageState === "LOADING") ? (
            <View className="sky-image-status" role="status" aria-live="polite">
              {mode === "OBSERVATION" ? (
                <Text>红光模式已隐藏巡天影像</Text>
              ) : deepSkyImagePresented ? (
                <>
                  <Text>NASA/IPAC IRSA · AllWISE W3 12 μm · 处理后红外影像{presentedSkyFrame?.deepSkyImage?.sourceMissingPixels ? " · 缺测区已留空" : ""}</Text>
                </>
              ) : deepSkyImageState === "LOADING" ? (
                <Text>正在载入 {selectedDeepSkyEntry?.displayName} 巡天影像…</Text>
              ) : null}
            </View>
          ) : null}
          {hipsImageCredit?<View className="sky-image-status"><SkyOpticalImageCredit credit={hipsImageCredit} disabled={alignmentEditing} onOpenSources={openOpticalSources}/></View>:null}
          {preparedRegionCredits.map(credit => <View key={credit.publicationHash} className="sky-image-status">
            <SkyOpticalImageCredit credit={credit} disabled={alignmentEditing} onOpenSources={openOpticalSources} />
          </View>)}
          {sdssOpticalStatus !== "NONE" ? (
            <View className="sky-image-status" role="status" aria-live="polite">
              {sdssOpticalStatus === "CREDIT" ? (
                <>
                  <SkyOpticalImageCredit credit={opticalImageCredit} disabled={alignmentEditing} onOpenSources={openOpticalSources} />
                </>
              ) : sdssOpticalStatus === "LOADING" ? (
                <Text>正在载入 {selectedDeepSkyEntry?.displayName} 光学影像…</Text>
              ) : null}
            </View>
          ) : null}
        </View> : null}
        {pageVisible && trackingState.target && reportData && row && trackingState.spotId === reportData.context.spotId ?
          <SkyObjectTrackingStatus name={trackingState.target.displayName}
            {...(positionPresentation ? { presentation: positionPresentation } : {})}
            binding={{ reference: trackingState.target.reference, spotId: reportData.context.spotId,
              contextId: reportData.context.contextId, contextRevision: reportData.context.contextRevision,
              contextFingerprint: reportData.context.contextFingerprint, dataRevision: reportData.context.dataRevision,
              algorithmVersion: reportData.context.algorithmVersion, at: row.at }}
            catalog={positionCatalog(trackingState.target.reference)} overview={skyDomeProgress(verticalFovDeg, canvasSize.width, canvasSize.height) > 0}
            suspended={contextSession.busy || timeSaving}
            onPosition={applyTrackedPosition}
            onStop={() => enterManualView()}
            onRetrySky={() => { if(retryReport())stellarSupplement.retry(); }} /> : null}
        </View>
        {(!manualBasis || followRequested) && (alignmentEditing || !compassIsReady || orientationSensorState === "LOW_ACCURACY" || alignmentRequired) &&
          (skyControlPanel === "menu" || skyControlPanel === "calibration") ? <View className="sky-follow-recovery">
          <Text>{alignmentEditing ? "画面已锁定，移动手机与实景对齐" : alignmentRequired ? "方向已中断，请重新对齐星空" : compassRecovery.detail}</Text>
          {!alignmentEditing && orientationSensorState !== "CALIBRATING" ? <Button pressVariant="icon" ariaLabel={compassRecovery.action}
            onClick={recoverCompass}><SemanticIcon name="sky-follow" /></Button> : null}
        </View> : null}
        <SkyOverlayMotion motion={timeMotion} kind="time" keepMounted={skyControlPanel === "time" && overlayEnabled}>{active => (
        <SkyDisclosureSurface kind="time" label="天空时间" onClose={() => skyDisclosures.close("time")}
          className="sky-time-panel" id="sky-time-disclosure-surface" onMotionEnd={timeLayout.finish}
        >
          <SkyTimeControls at={requestedAt} timezone={routeContext.timezone} active={active && !timeSaving && !alignmentEditing}
            current={() => skyTimeIntentCurrent() && skyControlPanelRef.current === "time"}
            editingCurrent={() => skyTimeIntentCurrent() && skyControlPanelRef.current === "time" &&
              observationTime.snapshot().editingGeneration === timeIntent.editingGeneration}
            editingGeneration={timeIntent.editingGeneration}
            playing={timePlaying || timePlayRequested} canPlay={Boolean(!carriedReport && timeGeometryReady && timeModel && geometryReport && skyTimeInputAllowed(requestedAt, Date.now()))}
            previewPending={timePreviewStatus.pending}
            previewFailed={timePreviewStatus.failed}
            playbackPending={timePlayRequested && previewGeometry.playbackPending}
            playbackFailed={timePlayRequested && previewGeometry.playbackFailed}
            onRetryPreview={() => {
              if (!skyTimeIntentCurrent()) return;
              if (canvasError) retrySkyCanvas(); else void previewGeometry.retry();
            }}
            onPause={pauseSkyTime} onTogglePlay={toggleSkyTimePlayback}
            onEditChange={editing => setSkyTimeEditing("fields", editing)}
            onPreview={at => {
              if (!skyTimeIntentCurrent() || !skyTimeInputAllowed(at, Date.now())) return false;
              cancelSkyCalibration(); setTimeIntent(observationTime.preview(at)); return true;
            }}
            onApply={at => { void commitInstant(at).then(applied => {
              if (applied && skyControlPanelRef.current === "time") setSkyControlPanel("menu");
            }); }} />
          <OrientationTimeRuler
            rows={timeRows}
            activeIndex={activeIndex}
            committedIndex={committedIndex}
            {...(timePreviewStatus.presentedAt ? { presentedAt: timePreviewStatus.presentedAt } : {})}
            presentationPending={timePreviewStatus.pending}
            presentationFailed={timePreviewStatus.failed}
            requirePaintedTime
            playing={timePlaying}
            timezone={routeContext.timezone}
            isPreviewing={isPreviewing}
            saving={timeSaving}
            interactionLocked={!active || alignmentEditing || datePickerOpen}
            layoutReady={active && (timeMotion.phase === "preparing" || timeLayout.ready)}
            preparing={timeMotion.phase === "preparing"}
            onEntryReady={setTimeEntryReady}
            selectionReady={timeGeometryReady}
            reducedMotion={reducedMotion}
            onPreview={onPreview}
            onCommit={settleTimeIndex}
            onCancel={cancelSkyTimePreview}
            onScrubChange={editing => setSkyTimeEditing("ruler", editing)}
          />
        </SkyDisclosureSurface>
        )}</SkyOverlayMotion>
      </View>
    );
}
