/** Sky-only operations share the existing authenticated request/cache owner.
 * Keeping their validators with their actual consumers avoids loading them on Map. */
import { requestOperation, invalidateApiCache } from "./api-client";
import { ADOPTED_SKY_REPORT_CATALOG_VERSION } from "./sky-report-catalog";
import { matchingCelestialSearchResponse } from "./celestial-search-response";
import { matchingCelestialInformationResponse } from "./celestial-information-response";
import { matchingCelestialPositionResponse, type CelestialPositionBinding } from "./celestial-position-response";
import { matchingSkyTargetInstantResponse, type SkyTargetInstantBinding } from "./sky-target-instant-response";
import { matchingSkyGeometryWindow, skyGeometryWindowKey, type SkyGeometryWindowBinding } from "./sky-geometry-window-response";
import { isCelestialObjectReference, isDeepSkyObjectReference, CURRENT_DEEP_SKY_CATALOG_VERSION,
  DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION, SKY_LUMINARY_CATALOG_VERSION } from "@starward/miniapp-contracts";

export function getSkyGeometryWindow(binding: SkyGeometryWindowBinding, signal?: AbortSignal) {
  const { spotId, contextId, at } = binding;
  if (!spotId.startsWith("spot:") && !spotId.startsWith("contribution:"))
    throw new Error("night_location_identity_invalid");
  const key = skyGeometryWindowKey(binding).join(":");
  return requestOperation(key, "spotSkyGeometryGet", {
    auth: spotId.startsWith("contribution:") ? "REQUIRED" : "OPTIONAL",
    pathParams: { spotId }, query: `contextId=${encodeURIComponent(contextId)}&at=${encodeURIComponent(at)}` +
      (binding.windowMode === "TWO_HOURS" ? "&window=TWO_HOURS" : ""),
    ...(signal ? { signal } : {}),
  }).then(response => {
    try { return matchingSkyGeometryWindow(response, binding); }
    catch (error) { invalidateApiCache(key + ":"); throw error; }
  });
}

/** Requested only for a settled fine-time preview. Playback never polls this
 * endpoint; the native sky continues from the already admitted time model. */
export function getSkyTargetInstant(binding: SkyTargetInstantBinding, signal?: AbortSignal) {
  const { spotId, contextId, at } = binding;
  if (!spotId.startsWith("spot:") && !spotId.startsWith("contribution:"))
    throw new Error("night_location_identity_invalid");
  const key = `spot-sky-targets:v1:${spotId}:${contextId}:${binding.contextRevision}:${binding.contextFingerprint}:${at}`;
  return requestOperation(key, "spotSkyTargetsGet", {
    auth: spotId.startsWith("contribution:") ? "REQUIRED" : "OPTIONAL",
    pathParams: { spotId },
    query: "contextId=" + encodeURIComponent(contextId) + "&at=" + encodeURIComponent(at),
    ...(signal ? { signal } : {}),
  }).then(response => {
    try { return matchingSkyTargetInstantResponse(response, binding); }
    catch (error) { invalidateApiCache(key + ":"); throw error; }
  });
}

export function getCelestialObjectInformation(
  reference: string,
  signal?: AbortSignal,
  imagePublicationHash?: string,
  opticalPublicationHash?: string,
) {
  if (!isCelestialObjectReference(reference))
    throw new Error("celestial_object_reference_invalid");
  if (imagePublicationHash !== undefined && !/^[a-f0-9]{64}$/u.test(imagePublicationHash))
    throw new Error("deep_sky_image_publication_hash_invalid");
  const deepSky = isDeepSkyObjectReference(reference), infrared = reference.startsWith("M:");
  if (opticalPublicationHash !== undefined && (!deepSky || !/^[a-f0-9]{64}$/u.test(opticalPublicationHash)))
    throw new Error("sdss_optical_publication_hash_invalid");
  const key = (reference==="SOLAR:MOON"?"celestial-object:v4:moon-coverage:":deepSky && !infrared ?
    `celestial-object:v7:native:optical:${opticalPublicationHash ?? "none"}:` : deepSky ?
    (opticalPublicationHash ? `celestial-object:v6:${DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION}:${imagePublicationHash ?? "current"}:optical:${opticalPublicationHash}:` :
      `celestial-object:v5:${DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION}:${imagePublicationHash ?? "current"}:`) : "celestial-object:v3:") + reference;
  return requestOperation(key, "celestialObjectGet", {
    pathParams: { reference },
    query: "locale=zh-CN&catalogVersion=" + ADOPTED_SKY_REPORT_CATALOG_VERSION+
      (reference==="SOLAR:MOON"?"&moonTextureVersion=coverage-v2":"") +
      (infrared ? `&deepSkyImageVersion=${DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION}` +
        (imagePublicationHash ? `&deepSkyPublicationHash=${imagePublicationHash}` : "") : "") +
      (opticalPublicationHash ? `&opticalPublicationHash=${opticalPublicationHash}` : ""),
    ...(signal ? { signal } : {}),
  }).then(response => {
    try { return matchingCelestialInformationResponse(response, reference, imagePublicationHash, opticalPublicationHash); }
    catch (error) { invalidateApiCache(key + ":"); throw error; }
  });
}

export function searchCelestialObjects(query: string, signal?: AbortSignal) {
  const key = "celestial-search:v5:extended:" + query.trim();
  return requestOperation(key, "celestialObjectSearchGet", {
    query: "q=" + encodeURIComponent(query.trim()) + "&catalogVersion=" + ADOPTED_SKY_REPORT_CATALOG_VERSION + "&luminaryCatalogVersion=" + encodeURIComponent(SKY_LUMINARY_CATALOG_VERSION) +
      "&deepSkyCatalogVersion=" + encodeURIComponent(CURRENT_DEEP_SKY_CATALOG_VERSION),
    ...(signal ? { signal } : {}),
  }).then(response => {
    try { return matchingCelestialSearchResponse(response, query); }
    catch (error) {
      invalidateApiCache(key + ":");
      throw error;
    }
  });
}

export function getCelestialObjectPosition(binding: CelestialPositionBinding,
  catalog: { catalogVersion: string; catalogHash: string }, signal?: AbortSignal) {
  if (!isCelestialObjectReference(binding.reference) ||
    (!binding.spotId.startsWith("spot:") && !binding.spotId.startsWith("contribution:")))
    throw new Error("celestial_position_identity_invalid");
  const key = `celestial-position:${binding.spotId}:${binding.reference}`;
  return requestOperation(key, "celestialObjectPositionGet", {
    auth: binding.spotId.startsWith("contribution:") ? "REQUIRED" : "NONE",
    pathParams: { spotId: binding.spotId, reference: binding.reference },
    query: `contextId=${encodeURIComponent(binding.contextId)}&at=${encodeURIComponent(binding.at)}&catalogVersion=${ADOPTED_SKY_REPORT_CATALOG_VERSION}` +
      "&deepSkyCatalogVersion=" + encodeURIComponent(CURRENT_DEEP_SKY_CATALOG_VERSION),
    ...(signal ? { signal } : {}),
  }).then(response => {
    try { return matchingCelestialPositionResponse(response, binding, catalog); }
    catch (error) { invalidateApiCache(key + ":"); throw error; }
  });
}
