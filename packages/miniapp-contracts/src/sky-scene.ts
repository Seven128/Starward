import type {
  SkyScene,
  SkySceneCatalogEntry,
  DeepSkyScene,
  DeepSkyScenePoint,
  SkySceneFrame,
  SkyScenePoint,
  SkyTarget,
  SkyTargetFrame,
} from "./types.ts";

/** Hard product limits for the catalog-backed Mini Program scene. */
export const SKY_SCENE_MAX_CATALOG_ENTRIES = 2_048;
export const SKY_SCENE_MAX_MAGNITUDE_LIMIT = 5.5;
export const SKY_SCENE_MAX_SERIALIZED_BYTES = 1_048_576;
export const DEEP_SKY_SCENE_MAX_CATALOG_ENTRIES = 128;

const SHA256 = /^[a-f0-9]{64}$/u;

function fail(reason: string): never {
  throw new TypeError(`sky_scene_invalid:${reason}`);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function assertEntry(entry: SkySceneCatalogEntry, index: number): void {
  if (!entry || typeof entry !== "object") fail(`catalog_entry_${index}`);
  if (typeof entry.sourceId !== "string" || !entry.sourceId.trim())
    fail(`catalog_entry_${index}:source_id`);
  if (typeof entry.objectRef !== "string" || !/^HIP:\d{1,6}$/u.test(entry.objectRef))
    fail(`catalog_entry_${index}:object_ref`);
  if (entry.displayName !== null && (typeof entry.displayName !== "string" || !entry.displayName.trim()))
    fail(`catalog_entry_${index}:display_name`);
  if (!finite(entry.magnitude) || entry.magnitude > SKY_SCENE_MAX_MAGNITUDE_LIMIT)
    fail(`catalog_entry_${index}:g_magnitude`);
  if (entry.magnitudeBand !== "V" || entry.colorIndexBand !== "B-V")
    fail(`catalog_entry_${index}:photometry_band`);
  if (entry.colorIndex !== null && !finite(entry.colorIndex))
    fail(`catalog_entry_${index}:bp_rp`);
}

function assertPoint(
  point: SkyScenePoint,
  catalogLength: number,
  seen: Set<number>,
  index: number,
): void {
  if (!point || typeof point !== "object") fail(`frame_point_${index}`);
  if (
    !Array.isArray(point) ||
    point.length !== 3 ||
    !Number.isInteger(point[0]) ||
    point[0] < 0 ||
    point[0] >= catalogLength
  )
    fail(`frame_point_${index}:catalog_index`);
  if (seen.has(point[0])) fail(`frame_point_${index}:duplicate`);
  seen.add(point[0]);
  if (!finite(point[1]) || point[1] < 0 || point[1] >= 360)
    fail(`frame_point_${index}:azimuth`);
  if (!finite(point[2]) || point[2] < -90 || point[2] > 90)
    fail(`frame_point_${index}:altitude`);
}

function assertFrame(
  frame: SkySceneFrame,
  expectedAt: string,
  catalogLength: number,
  frameIndex: number,
): void {
  if (!frame || typeof frame !== "object") fail(`frame_${frameIndex}`);
  if (frame.at !== expectedAt) fail(`frame_${frameIndex}:at`);
  if (frame.state === "UNAVAILABLE") {
    if (frame.points !== null) fail(`frame_${frameIndex}:unavailable_points`);
    return;
  }
  if (frame.state !== "AVAILABLE" || !Array.isArray(frame.points))
    fail(`frame_${frameIndex}:state`);
  const seen = new Set<number>();
  frame.points.forEach((point, index) =>
    assertPoint(point, catalogLength, seen, index),
  );
}

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

/**
 * Validate the public scene shape and its relationship to the report's real
 * hourly slices.  The BFF calls this at its boundary; clients can use it in
 * development checks without owning any astronomy semantics.
 */
export function assertSkyScene(
  scene: SkyScene,
  hourlyAt: readonly string[],
): asserts scene is SkyScene {
  if (!scene || typeof scene !== "object") fail("root");
  if (scene.frames.length !== hourlyAt.length) fail("frame_count");
  scene.frames.forEach((frame, index) => {
    const expectedAt = hourlyAt[index];
    if (expectedAt === undefined) fail("hourly_index");
    assertFrame(frame, expectedAt, scene.catalog?.entries.length ?? 0, index);
  });
  if (scene.deepSky !== undefined && scene.deepSky !== null)
    assertDeepSky(scene.deepSky, hourlyAt);

  if (scene.state === "AVAILABLE") {
    if (!scene.catalog) fail("available_catalog_missing");
    if (
      scene.catalog.entries.length === 0 ||
      scene.catalog.entries.length > SKY_SCENE_MAX_CATALOG_ENTRIES
    )
      fail("catalog_count");
    if (
      !scene.catalog.catalogVersion.trim() ||
      !SHA256.test(scene.catalog.catalogHash) ||
      !finite(scene.catalog.magnitudeLimit) ||
      scene.catalog.magnitudeLimit > SKY_SCENE_MAX_MAGNITUDE_LIMIT
    )
      fail("catalog_identity");
    if (!Array.isArray(scene.catalog.sources) || scene.catalog.sources.length === 0)
      fail("catalog_sources");
    const ids = new Set<string>();
    scene.catalog.entries.forEach((entry, index) => {
      assertEntry(entry, index);
      if (ids.has(entry.sourceId)) fail(`catalog_entry_${index}:duplicate`);
      ids.add(entry.sourceId);
    });
    if (scene.unavailableReason !== null) fail("available_reason");
    if (scene.frames.some((frame) => frame.state !== "AVAILABLE"))
      fail("available_frame_state");
  } else if (scene.state === "UNAVAILABLE") {
    if (scene.catalog !== null) fail("unavailable_catalog_present");
    if (
      typeof scene.unavailableReason !== "string" ||
      !scene.unavailableReason.trim()
    )
      fail("unavailable_reason");
    if (scene.frames.some((frame) => frame.state !== "UNAVAILABLE"))
      fail("unavailable_frame_state");
  } else {
    fail("state");
  }

  const bytes = new TextEncoder().encode(JSON.stringify(scene)).byteLength;
  if (bytes >= SKY_SCENE_MAX_SERIALIZED_BYTES) fail("serialized_size");
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
