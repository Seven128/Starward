import { BSC5P_PROJECTION_ALGORITHM, loadBsc5pBrightStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { STELLAR_GEOMETRY_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT, STELLAR_SCENE_FORMAT,
  type SkySceneCatalogReference, type SourceSummary, type StellarGeometryFrame,
  type StellarGeometryObserver } from "@starward/miniapp-contracts";
import { createBsc5pGeometryFrame } from "./stellar-geometry-provider.ts";

export type SkyCatalogSnapshot = SkySceneCatalogReference;
export interface SkyCatalogFrameInput extends StellarGeometryObserver { at: Date; catalog: SkyCatalogSnapshot; }
export interface SkyCatalogProvider {
  load(): SkyCatalogSnapshot;
  frame(input: SkyCatalogFrameInput): StellarGeometryFrame;
  cacheKey(): string;
}

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
        limitations: [`V=-2..${catalog.magnitudeLimit.toFixed(1)} 的完整有界子集；不表示天气、地形遮挡或肉眼可见性`, "保留目录原始测光系统及不确定标记；不统一宣称为 Johnson V", "未计视差、径向速度与大气折射；不用于专业指向校准"],
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
      ...(manifest.sources.nameIdentities ? [{
        id: `catalog:wgsn-identities:${manifest.sources.nameIdentities.responseSha256}`,
        kind: "OFFICIAL_REFERENCE" as const,
        provider: manifest.sources.nameIdentities.provider,
        title: manifest.sources.nameIdentities.publication,
        sourceUrl: manifest.sources.nameIdentities.sourceUrl,
        license: "IAU standardized name identities",
        licenseUrl: "https://exopla.net/star-names/wgsn-guidelines/",
        publishedAt: null, retrievedAt: manifest.retrievedAt, validFrom: null, validTo: null,
        state: "FRESH" as const, confidence: 1,
        precision: "Explicit archived HR identity for a current active name",
        limitations: ["仅用于当前同名、多分量候选的明确 HR 身份消歧，不导入旧坐标、测光或退役名称"],
      }] : []),
  ]);
}


export function createBsc5pSkyCatalogProvider(): SkyCatalogProvider {
  let snapshot: SkyCatalogSnapshot | undefined;
  const load = () => {
    if (!snapshot) {
      const owner = loadBsc5pBrightStarCatalog();
      snapshot = Object.freeze({ catalogVersion: owner.catalogVersion, catalogHash: owner.catalogHash,
        magnitudeLimit: owner.magnitudeLimit, rowCount: owner.rows.length, sources: bsc5pCatalogSources(owner) });
    }
    return snapshot;
  };
  return {
    load,
    frame: input => {
      const catalog = load();
      if (input.catalog.catalogHash !== catalog.catalogHash || input.catalog.catalogVersion !== catalog.catalogVersion)
        throw new Error("catalog_snapshot_mismatch");
      return createBsc5pGeometryFrame({ ...catalog, format: STELLAR_GEOMETRY_FORMAT, referenceAt: STELLAR_GEOMETRY_REFERENCE_AT }, input);
    },
    cacheKey: () => {
      try { const catalog = load(); return [STELLAR_SCENE_FORMAT, catalog.catalogVersion, catalog.catalogHash, BSC5P_PROJECTION_ALGORITHM].join(":"); }
      catch { return "catalog-unavailable"; }
    },
  };
}
