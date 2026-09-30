import { isCelestialObjectReference, isBrightStarReference, isSaoStarReference,
  assertStellarGeometryMotion, STELLAR_GEOMETRY_REFERENCE_AT,
  type ApiEnvelope, type CelestialObjectPositionData } from "@starward/miniapp-contracts";

export type CelestialPositionBinding = Pick<CelestialObjectPositionData,
  "reference" | "spotId" | "contextId" | "contextRevision" | "contextFingerprint" | "dataRevision" | "algorithmVersion" | "at">;

/** Equality against the consumer's current report is necessary even for a
 * cached success: an old observer/time must never move the current camera. */
export function matchingCelestialPositionResponse(response: ApiEnvelope<CelestialObjectPositionData>,
  expected: CelestialPositionBinding, catalog: { catalogVersion: string; catalogHash: string }) {
  const data = response?.data;
  if (!data || !isCelestialObjectReference(data.reference) ||
    !["reference", "spotId", "contextId", "contextRevision", "contextFingerprint", "dataRevision", "algorithmVersion", "at"].every(
      key => data[key as keyof CelestialPositionBinding] === expected[key as keyof CelestialPositionBinding]))
    throw new Error("celestial_position_binding_invalid");
  const point = data.position;
  if (data.stellarMotion !== undefined) {
    if (!point || (!isBrightStarReference(data.reference) && !isSaoStarReference(data.reference)) ||
      data.stellarMotion?.referenceAt !== STELLAR_GEOMETRY_REFERENCE_AT) throw new Error("celestial_position_motion_invalid");
    assertStellarGeometryMotion(data.stellarMotion.factors);
  }
  if (point === null) {
    if (response.dataState !== "UNAVAILABLE" || !["SKY_UNAVAILABLE", "OBJECT_GEOMETRY_UNAVAILABLE"].includes(data.unavailableReason ?? ""))
      throw new Error("celestial_position_availability_invalid");
  } else if (!point || data.unavailableReason !== null ||
    !["FRESH", "STALE_USABLE"].includes(response.dataState) ||
    !Number.isFinite(point.azimuthDeg) || point.azimuthDeg < 0 || point.azimuthDeg >= 360 ||
    !Number.isFinite(point.altitudeDeg) || Math.abs(point.altitudeDeg) > 90 ||
    point.catalogVersion !== catalog.catalogVersion || point.catalogHash !== catalog.catalogHash) {
    throw new Error("celestial_position_geometry_invalid");
  }
  return response;
}
