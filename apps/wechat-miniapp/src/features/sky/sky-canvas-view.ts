import type { SkyOrientationSnapshot } from "./sky-orientation-controller";
import type { SkyViewBasis } from "./sky-view-projection";
import type { SkyBrowsingCameraFrame } from "./sky-browsing-camera";
import { skyViewportCenter, type SkyViewportInsets } from "./sky-viewport";
import { clampSkyFieldOfView, skyDomeProgress, SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";

export interface SkyCanvasViewInput {
  readonly queuedOrientationRevision: number;
  readonly queuedBasis: SkyViewBasis | null;
  readonly live: {
    readonly presentationRevision: SkyOrientationSnapshot["presentationRevision"];
    readonly alignment: Pick<SkyOrientationSnapshot["alignment"], "mode" | "view">;
  };
  readonly manualBasis: SkyViewBasis | null;
  readonly tracking: boolean;
  readonly requestedFov: number;
  readonly width: number;
  readonly height: number;
  readonly insets: SkyViewportInsets;
}

/** Coordinates one queued draw with the current control/reference transition.
 * The orientation owner supplies its latest stabilized presentation. Sensor
 * acquisition, calibration and the browsing camera retain their own state. */
export function resolveSkyCanvasView(input: SkyCanvasViewInput) {
  const { live, manualBasis, width, height, insets } = input;
  const editing = live.alignment.mode === "editing";
  const needsAlignment = live.alignment.mode === "needs-alignment";
  const locked = manualBasis === null &&
    (input.queuedOrientationRevision !== live.presentationRevision || editing || needsAlignment);
  const localView = locked ? live.alignment.view : manualBasis ?? input.queuedBasis;
  // A queued overview or high-magnification frame cannot undo the scale at
  // which the current calibration freezes its presented direction.
  const verticalFovDeg = editing ? SKY_OBSERVING_VERTICAL_FOV_DEG
    : clampSkyFieldOfView(input.requestedFov, width, height, insets);
  const progress = skyDomeProgress(verticalFovDeg, width, height, insets);
  const intent: SkyBrowsingCameraFrame["intent"] = editing ? "locked"
    : manualBasis ? input.tracking ? "track" : "manual"
      : needsAlignment ? "locked" : "follow";
  return { localView, intent, verticalFovDeg, progress,
    center: skyViewportCenter(width, height, progress, insets) };
}
