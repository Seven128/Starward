import { displayRasterWindowBounds, DISPLAY_RASTER_GRID } from "@starward/coordinate-system";
import { CLOUD_DISPLAY_STYLE, CLOUD_NATIVE_STEPS, CLOUD_SAMPLING_POLICY, cloudInstant, cloudTimeBracket,
  copyTotalCloudContext, mapCloudGridReadMatches, mapCloudReadInstant, uniqueSourceRecords,
  type ApiEnvelope, type MapCloudData, type MapCloudRaster, type ObservationContext, type SourceSummary,
} from "@starward/miniapp-contracts";

type Bounds = { west: number; south: number; east: number; north: number };
export interface MapCloudRasterView {
  layer: MapCloudData["layer"];
  raster: MapCloudRaster;
  sources: readonly SourceSummary[];
  clockOffsetMs: number;
}
const hash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const fail = (): never => { throw new Error("map_cloud_raster_identity_invalid"); };

/** A scope for pixels, independent of viewport discovery. It never selects a
 * latest publication or rounds the user's precise read instant. */
export function mapCloudRasterRetentionKey(scope: string | null, context: ObservationContext | null | undefined,
  selectedAt: string): string {
  if (!scope || !context?.weatherView.totalCloud) return "";
  try {
    const binding = copyTotalCloudContext(context.weatherView.totalCloud);
    if (binding.state !== "PINNED") return "";
    return JSON.stringify([scope, context.contextId, context.contextFingerprint, context.revision,
      binding, mapCloudReadInstant(selectedAt)]);
  } catch { return ""; }
}

/** Validate the actual API boundary. URL origin admission/download hashes stay
 * with map-raster-files; this owner binds that exact URL to this exact cloud
 * publication, source, time, geometry and quality rather than annual light. */
export function mapCloudRasterView(input: {
  scene: ApiEnvelope<MapCloudData>; context: ObservationContext; selectedAt: string;
  viewport: Bounds; clockOffsetMs: number;
}): MapCloudRasterView | null {
  const { scene, context, viewport } = input, data = scene.data;
  const selectedAt = mapCloudReadInstant(input.selectedAt);
  if (!mapCloudGridReadMatches(data, context, selectedAt)
    || !Number.isFinite(input.clockOffsetMs) || input.clockOffsetMs < 0) return fail();
  if (data.layer.kind !== "CLOUD" || data.layer.cloudLayer !== "TOTAL") return fail();
  const displayState = data.gridTimeline!.display.state;
  if (displayState === "READ_FAILED") throw new Error("cloud_display_read_failed");
  // Numeric availability and a leftover URL cannot grant image readiness.
  // The original metadata keeps the precise reason for the layer's UI owner.
  if (["NOT_READY", "SOURCE_MISSING", "OUTSIDE_COVERAGE", "EXPIRED"].includes(displayState)) return null;
  const raster = data.layer.cloudRaster;
  if (displayState !== "READY" || !raster || data.layer.raster || data.layer.polygons.length
    || data.cloudSnapshot) return fail();
  const pin = copyTotalCloudContext(context.weatherView.totalCloud);
  const match = /^https:\/\/[^/?#]+\/v2\/cloud\/assets\/([a-f0-9]{64})\/cloud-([a-f0-9]{64})\.png$/u.exec(raster.imageUrl);
  if (pin.state !== "PINNED" || raster.schemaVersion !== "map-cloud-raster-v1"
    || raster.publicationId !== `cloud-display:${match?.[2]}` || match?.[1] !== pin.manifestSha256
    || raster.sourcePublicationId !== pin.publicationId || raster.sourceManifestSha256 !== pin.manifestSha256
    || raster.runAt !== pin.runAt || raster.selectedAt !== selectedAt || data.layer.validAt !== selectedAt
    || raster.sourceValidUntil !== pin.supports240HoursUntil || raster.samplingPolicy !== CLOUD_SAMPLING_POLICY
    || raster.styleVersion !== CLOUD_DISPLAY_STYLE || raster.unit !== "%" || !hash(raster.imageSha256)
    || !Number.isSafeInteger(raster.imageBytes) || raster.imageBytes < 1 || raster.imageBytes > 16 * 1024 * 1024
    || raster.nativeGrid?.crs !== "WGS84" || raster.nativeGrid.registration !== "grid-point-centres"
    || raster.nativeGrid.resolutionDegrees !== 0.1 || raster.coordinateGrid !== DISPLAY_RASTER_GRID) return fail();
  const nativeTimes = CLOUD_NATIVE_STEPS.filter(step => Date.parse(pin.runAt) + step * 3_600_000 <= Date.parse(pin.validTo))
    .map(stepHours => ({ stepHours, validAt: cloudInstant(new Date(Date.parse(pin.runAt) + stepHours * 3_600_000).toISOString())! }));
  const bracket = cloudTimeBracket(nativeTimes, pin.runAt, selectedAt), declared = raster.brackets;
  if (!bracket || !declared || declared.lowerAt !== bracket.lowerAt || declared.upperAt !== bracket.upperAt
    || declared.fraction !== bracket.fraction || !hash(declared.lowerValuesSha256) || !hash(declared.upperValuesSha256)
    || bracket.lowerAt === bracket.upperAt && declared.lowerValuesSha256 !== declared.upperValuesSha256) return fail();
  const bounds = displayRasterWindowBounds(raster.window);
  if (raster.window.columns > 3 || raster.window.rows > 3
    || raster.width !== raster.window.columns * 256 || raster.height !== raster.window.rows * 256
    || !raster.boundsGcj02 || (Object.keys(bounds) as (keyof Bounds)[]).some(key => raster.boundsGcj02[key] !== bounds[key])
    || !Object.values(viewport).every(Number.isFinite) || viewport.east <= viewport.west || viewport.north <= viewport.south
    || bounds.west > viewport.west || bounds.east < viewport.east || bounds.south > viewport.south || bounds.north < viewport.north
    || !count(raster.validPixelCount) || !count(raster.zeroPixelCount) || !count(raster.missingPixelCount)
    || raster.validPixelCount + raster.missingPixelCount !== raster.width * raster.height
    || raster.zeroPixelCount > raster.validPixelCount
    || !["FRESH", "STALE_USABLE", "PARTIAL", "UNAVAILABLE"].includes(data.layer.state)
    || raster.validPixelCount > 0 && raster.missingPixelCount > 0 && data.layer.state !== "PARTIAL"
    || (raster.validPixelCount > 0 ? data.layer.state === "UNAVAILABLE" : data.layer.state !== "UNAVAILABLE")) return fail();
  const source = data.layer.source;
  if (!source || source.id !== pin.publicationId || source.kind !== "THIRD_PARTY_FORECAST"
    || cloudInstant(source.validFrom) !== pin.validFrom || cloudInstant(source.validTo) !== pin.validTo
    || !["FRESH", "STALE_USABLE", "PARTIAL", "EXPIRED", "UNAVAILABLE"].includes(source.state)
    || !Array.isArray(source.limitations) || source.limitations.some(value => typeof value !== "string")
    || !scene.sources.some(value => uniqueSourceRecords([source, value]).length === 1)) return fail();
  return { layer: data.layer, raster, sources: [source], clockOffsetMs: input.clockOffsetMs };
}

export function currentMapCloudRaster(view: MapCloudRasterView, now: number): boolean {
  const source = view.layer.source;
  return Boolean(view.raster.validPixelCount > 0 && view.layer.state !== "UNAVAILABLE"
    && Number.isFinite(now) && now >= Date.parse(view.raster.runAt)
    && now <= Date.parse(view.raster.sourceValidUntil) && source
    && source.state !== "EXPIRED" && source.state !== "UNAVAILABLE");
}

/** A failed/unknown removal still owns its actual old pixels and source. Expiry
 * cannot keep that source labelled fresh while native retirement is pending. */
export function presentedMapCloudRasterSources(view: MapCloudRasterView, now: number): readonly SourceSummary[] {
  const current = currentMapCloudRaster(view, now), expired = now > Date.parse(view.raster.sourceValidUntil);
  const actualTime = `当前地图影像时刻（UTC）：${view.raster.selectedAt}`;
  return view.sources.map(source => ({ ...source,
    state: current ? source.state : expired || source.state === "EXPIRED" ? "EXPIRED" : "UNAVAILABLE",
    limitations: source.limitations.includes(actualTime) ? source.limitations : [...source.limitations, actualTime],
  }));
}
