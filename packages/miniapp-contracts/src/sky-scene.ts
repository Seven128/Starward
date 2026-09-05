import type {
  SkyScene,
  SkySceneCatalogEntry,
  SkySceneFrame,
  SkyScenePoint,
  SkyTarget,
  SkyTargetFrame,
} from "./types.ts";

/** Hard product limits for the catalog-backed Mini Program scene. */
export const SKY_SCENE_MAX_CATALOG_ENTRIES = 2_048;
export const SKY_SCENE_MAX_MAGNITUDE_LIMIT = 5.5;
export const SKY_SCENE_MAX_SERIALIZED_BYTES = 1_048_576;

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
  if (!finite(entry.gMagnitude) || entry.gMagnitude > SKY_SCENE_MAX_MAGNITUDE_LIMIT)
    fail(`catalog_entry_${index}:g_magnitude`);
  if (entry.bpRp !== null && !finite(entry.bpRp))
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
