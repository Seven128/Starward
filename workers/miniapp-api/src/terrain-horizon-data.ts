import { createHash } from "node:crypto";
import type { TerrainHorizonData, TerrainHorizonRequest } from "@starward/miniapp-contracts";
import { HORIZON_RADIUS_M, HORIZON_OBSERVER_HEIGHT_M, type TerrainHorizonResult } from "./terrain-horizon-model.ts";
import { COPERNICUS_DEM_DOI, COPERNICUS_DEM_LICENSE_URL, COPERNICUS_DEM_SOURCE_NOTICE,
  COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE, COPERNICUS_DEM_LIABILITY_NOTICE } from "./terrain-publication.ts";

export function terrainHorizonData(center: TerrainHorizonRequest["center"], result: TerrainHorizonResult,
  failure: "READ_FAILED" | null = null): TerrainHorizonData {
  // Source windows include a bbox. A failed corner wholly outside the analysis
  // circle cannot invalidate a model whose 360 sectors are all known.
  const sourceFailed = failure !== null || (result?.status !== "COMPLETE"
    && Boolean(result?.sourceIssues.some(issue => issue.reason === "READ_FAILED")));
  const radiusKm = (result?.radiusM ?? HORIZON_RADIUS_M) / 1000;
  const observerHeightM = result?.observerHeightM ?? HORIZON_OBSERVER_HEIGHT_M;
  const limitations = ["依据历史约30米级DSM估算，不能证明近处树木、围墙或建筑无遮挡。",
    "轮廓为每个1度扇区内原始采样中心的最高视角，保留负角；缺测方向不作无遮挡判断。",
    `观察高度采用源DSM站位上方${observerHeightM}米的假设，含球面曲率、不含大气折射；分析范围外地形未计入。`];
  const sourceProof: TerrainHorizonData["sourceProof"] = (result?.sources ?? []).map(source => {
    if (source.hashScope !== "RETRIEVED_RANGES" || !source.etag || !source.ranges?.length)
      throw new Error("terrain_horizon_source_proof_invalid");
    return { tileId: source.tileId, url: source.url, etag: source.etag, byteSize: source.byteSize, sha256: source.sha256,
      hashScope: "RETRIEVED_RANGES", ranges: source.ranges };
  });
  const model = result ? {
    methodVersion: result.methodVersion, observerWgs84: result.observerWgs84, observerElevationM: result.observerElevationM,
    observerHeightM: result.observerHeightM, stationSample: result.stationSample, radiusM: result.radiusM,
    bearingReference: result.bearingReference, sectorWidthDegrees: result.sectorWidthDegrees, earthModel: result.earthModel,
    knownSectors: result.knownSectors, sectors: result.sectors,
  } : null;
  const state = result?.status === "COMPLETE" ? "AVAILABLE" : result?.status === "PARTIAL" ? "PARTIAL" : "UNAVAILABLE";
  const publicationId = result && sourceProof.length ? `terrain-horizon:${createHash("sha256").update(JSON.stringify({ model, sourceProof })).digest("hex")}` : null;
  const sourceUrl = `https://doi.org/${COPERNICUS_DEM_DOI}`;
  return { state, ...(sourceFailed ? { failureCode: "HORIZON_READ_FAILED" as const } : {}), centerGcj02: result?.centerGcj02 ?? center,
    publicationId, derivedAt: result?.derivedAt ?? null, model, sourceProof,
    source: sourceProof.length ? { id: `source:${publicationId}`, kind: "OPEN_DATA", provider: "Copernicus Programme / AWS Open Data",
      title: "Copernicus DEM GLO-30 Public AWS COG 2021", sourceUrl,
      attribution: { name: "Copernicus Programme", url: sourceUrl,
        statements: [COPERNICUS_DEM_SOURCE_NOTICE, COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE, COPERNICUS_DEM_LIABILITY_NOTICE] },
      license: "Copernicus DEM GLO-30 free worldwide licence", licenseUrl: COPERNICUS_DEM_LICENSE_URL,
      publishedAt: null, retrievedAt: null, validFrom: null, validTo: null, confidence: null,
      state: state === "AVAILABLE" ? "FRESH" : "PARTIAL", precision: "原始约30米DSM；真北顺时针1度扇区模型估算",
      limitations: [COPERNICUS_DEM_SOURCE_NOTICE, COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE, COPERNICUS_DEM_LIABILITY_NOTICE, ...limitations] } : null,
    coverageLabel: state === "AVAILABLE" ? `${radiusKm} km分析范围内各方位均有高程采样。`
      : state === "PARTIAL" ? "部分方向高程未知，未假定无遮挡。"
      : sourceFailed ? "山体轮廓读取失败，请重试。" : "当前站位或分析范围暂无可用高程。",
    limitations };
}
