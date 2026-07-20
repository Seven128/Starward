export { calculateFieldOfView, visibleIntervals } from "../../../../../packages/astronomy-core/src/sky-model";
export { OrientationEngine } from "../../../modules/orientation/orientation-engine";
export { resolveArMode } from "../../../modules/sky-ar/sky-ar-adapter";

export const skyCapabilityBoundary = Object.freeze({
  universalSky: { cameraRequired: false, orientationRequired: false, endpoint: "/v1/sky" },
  orientation: { adapter: "expo-device-motion-and-magnetometer", rawMagneticHeadingIsAuthoritative: false },
  ar: { optional: true, unsupportedFallback: "universal-sky", lostTrackingFallback: "universal-sky" },
  siteHorizon: { unknownIsAllowed: true, defaultProfileForbidden: true },
});
