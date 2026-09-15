import {
  BSC5P_PROJECTION_ALGORITHM,
  loadBsc5pBrightStarCatalog,
  positionBsc5pCatalog,
} from "@starward/astronomy-core/bsc5p-catalog";
import {
  isBrightStarReference,
  SKY_SCENE_MAX_CATALOG_ENTRIES,
  SKY_SCENE_MAX_MAGNITUDE_LIMIT,
  type SkySceneCatalogEntry,
  type SourceSummary,
} from "@starward/miniapp-contracts";

export interface SkyCatalogEntry extends SkySceneCatalogEntry {
  readonly raHours: number;
  readonly decDeg: number;
}

export interface SkyCatalogSnapshot {
  readonly catalogVersion: string;
  readonly catalogHash: string;
  readonly magnitudeLimit: number;
  readonly sources: readonly SourceSummary[];
  readonly entries: readonly SkyCatalogEntry[];
}

export interface SkyCatalogPositionInput {
  readonly at: Date;
  readonly latitude: number;
  readonly longitude: number;
  readonly elevationM: number;
  readonly catalog: SkyCatalogSnapshot;
}

export interface SkyCatalogPosition {
  readonly sourceId: string;
  readonly azimuthDeg: number;
  readonly altitudeDeg: number;
}

export interface SkyCatalogProvider {
  load(): SkyCatalogSnapshot;
  position(input: SkyCatalogPositionInput): readonly SkyCatalogPosition[];
  cacheKey(): string;
}

const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_ALTITUDE_DEG = 90;
const MIN_CATALOG_MAGNITUDE = -10;

export function bsc5pCatalogSources(catalog: ReturnType<typeof loadBsc5pBrightStarCatalog>): readonly SourceSummary[] {
  const manifest = catalog.manifest;
  return Object.freeze<SourceSummary[]>([
      {
        id: `catalog:${catalog.catalogVersion}:${manifest.derivedAssetSha256}`,
        kind: "OPEN_DATA",
        provider: "HEASARC / NASA GSFC; Hoffleit & Warren",
        title: "BSC5P Bright Star Catalog, 5th edition preliminary",
        sourceUrl: manifest.sources.catalog.landingUrl,
        license: "Public dataset; HEASARC source-specific usage policy",
        licenseUrl: manifest.sources.catalog.usagePolicyUrl,
        publishedAt: null,
        retrievedAt: manifest.retrievedAt,
        validFrom: null,
        validTo: null,
        state: "FRESH",
        confidence: 0.98,
        precision: "FK5 J2000, published proper motion in arcsec/year; original V and nullable B-V",
        limitations: ["V=-2..5.0 的完整有界子集；不表示天气、地形遮挡或肉眼可见性", "保留目录原始测光系统及不确定标记；不统一宣称为 Johnson V", "未计视差、径向速度与大气折射；不用于专业指向校准"],
      },
      {
        id: `catalog:wgsn:${manifest.sources.names.responseSha256}`,
        kind: "OFFICIAL_REFERENCE",
        provider: manifest.sources.names.provider,
        title: "IAU Catalog of Star Names",
        sourceUrl: manifest.sources.names.sourceUrl,
        license: "IAU standardized names",
        licenseUrl: "https://exopla.net/star-names/wgsn-guidelines/",
        publishedAt: null,
        retrievedAt: manifest.retrievedAt,
        validFrom: null,
        validTo: null,
        state: "FRESH",
        confidence: 1,
        precision: "Exact published HR/HD/Bayer/Flamsteed identity, preserving component digits",
        limitations: ["名称目录持续更新；当前包固定到清单哈希", "组件身份不一致或映射不唯一时保留 HR 编号，不猜测名称"],
      },
  ]);
}

function snapshotFromOwner(catalog: ReturnType<typeof loadBsc5pBrightStarCatalog>): SkyCatalogSnapshot {
  return Object.freeze({
    catalogVersion: catalog.catalogVersion,
    catalogHash: catalog.catalogHash,
    magnitudeLimit: catalog.magnitudeLimit,
    sources: bsc5pCatalogSources(catalog),
    entries: Object.freeze(
      catalog.rows.map((entry) =>
        Object.freeze({
          sourceId: entry.sourceId,
          objectRef: entry.sourceId,
          displayName: entry.properName,
          magnitude: entry.vMag,
          magnitudeBand: "V" as const,
          colorIndex: entry.bV,
          colorIndexBand: "B-V" as const,
          raHours: entry.raDeg / 15,
          decDeg: entry.decDeg,
        }),
      ),
    ),
  });
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function fixed(value: number): number {
  const rounded = Math.round(value * 1_000) / 1_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function validSnapshotIdentity(snapshot: SkyCatalogSnapshot): boolean {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (typeof snapshot.catalogVersion !== "string") return false;
  if (!snapshot.catalogVersion.trim()) return false;
  if (typeof snapshot.catalogHash !== "string") return false;
  if (!SHA256.test(snapshot.catalogHash)) return false;
  if (!finite(snapshot.magnitudeLimit)) return false;
  if (snapshot.magnitudeLimit < MIN_CATALOG_MAGNITUDE) return false;
  if (snapshot.magnitudeLimit > SKY_SCENE_MAX_MAGNITUDE_LIMIT) return false;
  if (!Array.isArray(snapshot.entries)) return false;
  if (snapshot.entries.length === 0) return false;
  return snapshot.entries.length <= SKY_SCENE_MAX_CATALOG_ENTRIES;
}

function validCatalogEntry(
  entry: SkyCatalogEntry,
  magnitudeLimit: number,
  ids: Set<string>,
): boolean {
  if (!entry || typeof entry !== "object") return false;
  if (typeof entry.sourceId !== "string" || !entry.sourceId.trim()) return false;
  if (ids.has(entry.sourceId)) return false;
  if (!isBrightStarReference(entry.objectRef) || entry.sourceId !== entry.objectRef) return false;
  if (!finite(entry.magnitude)) return false;
  if (entry.magnitude < MIN_CATALOG_MAGNITUDE) return false;
  if (entry.magnitude > magnitudeLimit) return false;
  if (entry.magnitudeBand !== "V" || entry.colorIndexBand !== "B-V") return false;
  if (entry.colorIndex !== null && !finite(entry.colorIndex)) return false;
  if (!finite(entry.raHours) || entry.raHours < 0 || entry.raHours >= 24)
    return false;
  if (!finite(entry.decDeg) || entry.decDeg < -90 || entry.decDeg > 90)
    return false;
  ids.add(entry.sourceId);
  return true;
}

export function validSkyCatalogSnapshot(snapshot: SkyCatalogSnapshot): boolean {
  if (!validSnapshotIdentity(snapshot)) return false;
  const ids = new Set<string>();
  return snapshot.entries.every((entry) =>
    validCatalogEntry(entry, snapshot.magnitudeLimit, ids),
  );
}

function catalogOrder(catalog: SkyCatalogSnapshot): Map<string, number> {
  return new Map(
    catalog.entries.map((entry, index) => [entry.sourceId, index] as const),
  );
}

function normalizedPosition(
  sourceId: string,
  azimuthDeg: number,
  altitudeDeg: number,
): SkyCatalogPosition {
  return {
    sourceId,
    azimuthDeg: fixed(((azimuthDeg % 360) + 360) % 360),
    altitudeDeg: fixed(altitudeDeg),
  };
}

type OwnerPosition = Pick<
  ReturnType<typeof positionBsc5pCatalog>[number],
  "sourceId" | "azimuthDeg" | "altitudeDeg" | "visible" | "obstructed"
>;

export function normalizeOwnerPositions(
  rows: readonly OwnerPosition[],
  catalog: SkyCatalogSnapshot,
): readonly SkyCatalogPosition[] {
  const order = catalogOrder(catalog);
  const seen = new Set<string>();
  const positions: SkyCatalogPosition[] = [];
  for (const row of rows) {
    if (row.visible === false || row.obstructed === true) continue;
    if (typeof row.sourceId !== "string") throw new Error("catalog_projection_invalid");
    if (seen.has(row.sourceId) || !order.has(row.sourceId))
      throw new Error("catalog_projection_invalid");
    if (!finite(row.azimuthDeg) || !finite(row.altitudeDeg))
      throw new Error("catalog_projection_invalid");
    if (row.altitudeDeg < 0 || row.altitudeDeg > MAX_ALTITUDE_DEG)
      throw new Error("catalog_projection_invalid");
    seen.add(row.sourceId);
    positions.push(
      normalizedPosition(row.sourceId, row.azimuthDeg, row.altitudeDeg),
    );
  }
  positions.sort(
    (left, right) => order.get(left.sourceId)! - order.get(right.sourceId)!,
  );
  return Object.freeze(positions);
}

export function normalizeScenePositions(
  rows: readonly SkyCatalogPosition[],
  catalog: SkyCatalogSnapshot,
): readonly SkyCatalogPosition[] {
  const order = catalogOrder(catalog);
  const seen = new Set<string>();
  const positions: SkyCatalogPosition[] = [];
  for (const row of rows) {
    if (!row || typeof row.sourceId !== "string")
      throw new Error("catalog_position_invalid");
    if (seen.has(row.sourceId) || !order.has(row.sourceId))
      throw new Error("catalog_position_invalid");
    if (!finite(row.azimuthDeg) || !finite(row.altitudeDeg))
      throw new Error("catalog_position_invalid");
    if (row.altitudeDeg < 0 || row.altitudeDeg > MAX_ALTITUDE_DEG)
      throw new Error("catalog_position_invalid");
    seen.add(row.sourceId);
    positions.push(
      normalizedPosition(row.sourceId, row.azimuthDeg, row.altitudeDeg),
    );
  }
  positions.sort(
    (left, right) => order.get(left.sourceId)! - order.get(right.sourceId)!,
  );
  return Object.freeze(positions);
}

export function createBsc5pSkyCatalogProvider(): SkyCatalogProvider {
  let loaded:
    | { owner: ReturnType<typeof loadBsc5pBrightStarCatalog>; snapshot: SkyCatalogSnapshot }
    | undefined;
  let loadError: unknown;
  const ensureLoaded = () => {
    if (loadError) throw loadError;
    if (!loaded) {
      try {
        const owner = loadBsc5pBrightStarCatalog();
        loaded = { owner, snapshot: snapshotFromOwner(owner) };
      } catch (error) {
        loadError = error;
        throw error;
      }
    }
    return loaded;
  };
  return {
    load: () => ensureLoaded().snapshot,
    position: (input) => {
      const active = ensureLoaded();
      if (input.catalog.catalogHash !== active.snapshot.catalogHash)
        throw new Error("catalog_snapshot_mismatch");
      return normalizeOwnerPositions(
        positionBsc5pCatalog({
          at: input.at,
          latitude: input.latitude,
          longitude: input.longitude,
          elevationM: input.elevationM,
          catalog: active.owner,
        }),
        active.snapshot,
      );
    },
    cacheKey: () => {
      try {
        const active = ensureLoaded().snapshot;
        return `${active.catalogVersion}:${active.catalogHash}:${BSC5P_PROJECTION_ALGORITHM}`;
      } catch {
        return "catalog-unavailable";
      }
    },
  };
}
