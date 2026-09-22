import type { SkyScene, DeepSkyScene, DeepSkyScenePoint, SkyTarget, SkyTargetFrame } from "./types.ts";
import { assertStellarGeometryFrame } from "./stellar-geometry.ts";
import { assertStellarCatalogReference } from "./stellar-catalog-publication.ts";
import { STELLAR_SCENE_FORMAT } from "./stellar-scene.ts";
export { isBrightStarReference, isCelestialObjectReference } from "./celestial-identity.ts";

export const SKY_SCENE_MAX_CATALOG_ENTRIES = 8_404;
export const SKY_SCENE_MAX_MAGNITUDE_LIMIT = 6.5;
// Dynamic frames and independent deep-sky samples only. Static stars are separate.
export const SKY_SCENE_MAX_SERIALIZED_BYTES = 2 * 1_048_576;
export const DEEP_SKY_SCENE_MAX_CATALOG_ENTRIES = 128;
const SHA256 = /^[a-f0-9]{64}$/u;
function fail(reason: string): never { throw new TypeError(`sky_scene_invalid:${reason}`); }
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }

function assertDeepSky(scene: DeepSkyScene, hourlyAt: readonly string[]) {
  if (!scene || typeof scene !== "object" || !Array.isArray(scene.frames) || scene.frames.length !== hourlyAt.length)
    fail("deep_sky_root");
  if (scene.state === "UNAVAILABLE") {
    if (scene.catalog !== null || typeof scene.unavailableReason !== "string" || !scene.unavailableReason.trim() ||
      scene.frames.some((frame, index) => frame.at !== hourlyAt[index] || frame.state !== "UNAVAILABLE" || frame.points !== null))
      fail("deep_sky_unavailable");
    return;
  }
  if (scene.state !== "AVAILABLE" || !scene.catalog || scene.unavailableReason !== null)
    fail("deep_sky_available");
  const catalog = scene.catalog;
  if (catalog.imageRegistration !== undefined && catalog.imageRegistration !== "ICRS_TAN_NORTH_0_1_V1")
    fail("deep_sky_image_registration");
  if (!catalog.catalogVersion.trim() || !SHA256.test(catalog.catalogHash) || catalog.frame !== "ICRS J2000" ||
    !Array.isArray(catalog.sources) || catalog.sources.length === 0 || !Array.isArray(catalog.entries) ||
    catalog.entries.length === 0 || catalog.entries.length > DEEP_SKY_SCENE_MAX_CATALOG_ENTRIES)
    fail("deep_sky_catalog");
  const references = new Set<string>();
  catalog.entries.forEach((entry, index) => {
    if (!entry || !/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(entry.objectRef) || references.has(entry.objectRef) ||
      !entry.displayName.trim() || (entry.kind !== "GALAXY" && entry.kind !== "NEBULA") ||
      !Array.isArray(entry.aliases) || entry.aliases.some((alias: unknown) => typeof alias !== "string" || !alias.trim()) ||
      (entry.magnitudeBand !== "V" && entry.magnitudeBand !== null)) fail(`deep_sky_entry_${index}`);
    references.add(entry.objectRef);
    for (const value of [entry.magnitude, entry.majorAxisArcmin, entry.minorAxisArcmin, entry.positionAngleDeg])
      if (value !== null && !finite(value)) fail(`deep_sky_entry_${index}_measurement`);
  });
  scene.frames.forEach((frame, frameIndex) => {
    if (!frame || frame.at !== hourlyAt[frameIndex] || frame.state !== "AVAILABLE" || !Array.isArray(frame.points))
      fail(`deep_sky_frame_${frameIndex}`);
    const seen = new Set<number>();
    frame.points.forEach((point: DeepSkyScenePoint, pointIndex: number) => {
      if (!Array.isArray(point) || point.length !== 7 || !Number.isInteger(point[0]) || point[0] < 0 ||
        point[0] >= catalog.entries.length || seen.has(point[0])) fail(`deep_sky_point_${frameIndex}_${pointIndex}`);
      seen.add(point[0]);
      for (const [offset, value] of point.slice(1).entries()) {
        if (!finite(value) || (offset % 2 === 0 ? value < 0 || value >= 360 : value < -90 || value > 90))
          fail(`deep_sky_point_${frameIndex}_${pointIndex}_coordinate`);
      }
    });
  });
}

/** Validate the stars without letting an independent deep-sky failure retire them. */
export function assertStellarScene(scene: SkyScene, hourlyAt: readonly string[]): void {
  if (!scene || scene.format !== STELLAR_SCENE_FORMAT || !Array.isArray(scene.frames)) fail("format");
  if (scene.frames.length !== hourlyAt.length) fail("frame_count");
  if (scene.state === "AVAILABLE") {
    if (!scene.catalog || !scene.observer || scene.unavailableReason !== null) fail("available_shape");
    assertStellarCatalogReference(scene.catalog);
    const extended = scene.catalog.catalogVersion === "bsc5p-bright-stars.v2";
    if (scene.catalog.rowCount !== (extended ? 8404 : 1630) || scene.catalog.magnitudeLimit !== (extended ? 6.5 : 5) ||
      !Array.isArray(scene.catalog.sources) || scene.catalog.sources.length === 0) fail("catalog_identity");
    scene.frames.forEach((frame, index) => {
      if (!frame || frame.at !== hourlyAt[index] || frame.state !== "AVAILABLE" || !frame.geometry) fail("frame_binding");
      assertStellarGeometryFrame(frame.geometry, { catalog: scene.catalog!, at: hourlyAt[index]!, observer: scene.observer! });
    });
  } else if (scene.state === "UNAVAILABLE") {
    if (scene.catalog !== null || scene.observer !== null || typeof scene.unavailableReason !== "string" || !scene.unavailableReason.trim()) fail("unavailable_shape");
    scene.frames.forEach((frame, index) => {
      if (!frame || frame.at !== hourlyAt[index] || frame.state !== "UNAVAILABLE" || frame.geometry !== null) fail("unavailable_frame");
    });
  } else fail("state");
}

/** The current report has one factored frame per exact selected-time-axis instant. */
export function assertSkyScene(scene: SkyScene, hourlyAt: readonly string[]): asserts scene is SkyScene {
  assertStellarScene(scene, hourlyAt);
  if (scene.deepSky !== undefined && scene.deepSky !== null) assertDeepSky(scene.deepSky, hourlyAt);
  if (new TextEncoder().encode(JSON.stringify(scene)).byteLength >= SKY_SCENE_MAX_SERIALIZED_BYTES) fail("serialized_size");
}

/**
 * Validate the target timeline's relationship to the report's real hourly
 * axis.  Target semantics remain actionable data, so this check deliberately
 * validates only the time binding and per-frame identity shape; astronomy
 * values remain owned and calculated by the BFF.
 */
export function assertSkyTargetFrames(
  targetFrames: readonly SkyTargetFrame[],
  hourlyAt: readonly string[],
): asserts targetFrames is readonly SkyTargetFrame[] {
  if (!Array.isArray(targetFrames)) fail("target_frames_root");
  if (targetFrames.length !== hourlyAt.length)
    fail("target_frame_count");
  targetFrames.forEach((frame, index) => {
    const expectedAt = hourlyAt[index];
    if (!frame || typeof frame !== "object")
      fail(`target_frame_${index}`);
    if (frame.at !== expectedAt) fail(`target_frame_${index}:at`);
    if (!Array.isArray(frame.targets))
      fail(`target_frame_${index}:targets`);
    const targetIds = new Set<string>();
    const targets = frame.targets as readonly SkyTarget[];
    targets.forEach((target, targetIndex) => {
      if (!target || typeof target !== "object")
        fail(`target_frame_${index}:target_${targetIndex}`);
      if (typeof target.targetId !== "string" || !target.targetId.trim())
        fail(`target_frame_${index}:target_${targetIndex}:id`);
      if (targetIds.has(target.targetId))
        fail(`target_frame_${index}:target_${targetIndex}:duplicate`);
      targetIds.add(target.targetId);
    });
  });
}

export function skySceneSerializedBytes(scene: SkyScene): number {
  return new TextEncoder().encode(JSON.stringify(scene)).byteLength;
}
