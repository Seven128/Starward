export const skyCapabilityBoundary = Object.freeze({
  universalSky: { cameraRequired: false, orientationRequired: false, endpoint: "/v1/sky" },
  orientation: { adapter: "expo-device-motion-and-magnetometer", rawMagneticHeadingIsAuthoritative: false },
  ar: { optional: true, unsupportedFallback: "universal-sky", lostTrackingFallback: "universal-sky" },
  siteHorizon: { unknownIsAllowed: true, defaultProfileForbidden: true },
});
