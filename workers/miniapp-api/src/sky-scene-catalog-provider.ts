import {
  GAIA_DR3_PROJECTION_ALGORITHM,
  loadGaiaDr3BrightStarCatalog,
  positionGaiaDr3Catalog,
  type GaiaDr3ValidatedCatalog,
  type GaiaStarProjection,
} from "@starward/astronomy-core";
import {
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
  readonly source: SourceSummary;
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

function sourceSummary(source: GaiaDr3ValidatedCatalog["source"]): SourceSummary {
  return {
    id: source.id,
    kind: source.kind,
    provider: source.provider,
    title: source.title,
    sourceUrl: source.sourceUrl,
    license: source.license,
    licenseUrl: source.licenseUrl,
    publishedAt: source.publishedAt,
    retrievedAt: source.retrievedAt,
    validFrom: source.validFrom,
    validTo: source.validTo,
    state: source.state,
    confidence: source.confidence,
    precision: source.precision,
    limitations: source.limitations,
  };
}

function snapshotFromOwner(catalog: GaiaDr3ValidatedCatalog): SkyCatalogSnapshot {
  return Object.freeze({
    catalogVersion: catalog.catalogVersion,
    catalogHash: catalog.catalogHash,
    magnitudeLimit: catalog.magnitudeLimit,
    source: sourceSummary(catalog.source),
    entries: Object.freeze(
      catalog.entries.map((entry) =>
        Object.freeze({
          sourceId: entry.sourceId,
          gMagnitude: entry.gMagnitude,
          bpRp: entry.bpRp,
          raHours: entry.raHours,
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
  if (!finite(entry.gMagnitude)) return false;
  if (entry.gMagnitude < MIN_CATALOG_MAGNITUDE) return false;
  if (entry.gMagnitude > magnitudeLimit) return false;
  if (entry.bpRp !== null && !finite(entry.bpRp)) return false;
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
  GaiaStarProjection,
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
    if (typeof row.sourceId !== "string") throw new Error("gaia_projection_invalid");
    if (seen.has(row.sourceId) || !order.has(row.sourceId))
      throw new Error("gaia_projection_invalid");
    if (!finite(row.azimuthDeg) || !finite(row.altitudeDeg))
      throw new Error("gaia_projection_invalid");
    if (row.altitudeDeg < 0 || row.altitudeDeg > MAX_ALTITUDE_DEG)
      throw new Error("gaia_projection_invalid");
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

export function createGaiaDr3SkyCatalogProvider(): SkyCatalogProvider {
  let loaded:
    | { owner: GaiaDr3ValidatedCatalog; snapshot: SkyCatalogSnapshot }
    | undefined;
  let loadError: unknown;
  const ensureLoaded = () => {
    if (loadError) throw loadError;
    if (!loaded) {
      try {
        const owner = loadGaiaDr3BrightStarCatalog();
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
        positionGaiaDr3Catalog({
          at: input.at,
          latitude: input.latitude,
          longitude: input.longitude,
          elevationM: input.elevationM,
          magnitudeLimit: active.snapshot.magnitudeLimit,
          catalog: active.owner,
        }),
        active.snapshot,
      );
    },
    cacheKey: () => {
      try {
        const active = ensureLoaded().snapshot;
        return `${active.catalogVersion}:${active.catalogHash}:${GAIA_DR3_PROJECTION_ALGORITHM}`;
      } catch {
        return "catalog-unavailable";
      }
    },
  };
}
