import {
  DEEP_SKY_PROJECTION_ALGORITHM,
  loadDeepSkyCatalog,
  positionDeepSkyCatalog,
} from "@starward/astronomy-core/deep-sky-catalog";
import type {
  DeepSkySceneCatalogEntry,
  DeepSkyScenePoint,
  SourceSummary,
  SpotSummary,
} from "@starward/miniapp-contracts";

// Report shape changes independently of the catalog bytes and projection math.
const DEEP_SKY_REPORT_GEOMETRY_VERSION = "catalog-icrs-center-v1";

function fixed(value: number) {
  const rounded = Math.round(value * 1_000_000_000) / 1_000_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function deepSkyCatalogSource(version?: string): SourceSummary {
  const manifest = loadDeepSkyCatalog(version).manifest;
  const extended = manifest.schemaVersion === "opengc-deep-sky-manifest-v2";
  return {
    id: `catalog:${manifest.catalogVersion}:${manifest.derivedAssetSha256}`,
    kind: "OPEN_DATA",
    provider: manifest.source.provider,
    title: extended ? "OpenNGC selected galaxy and nebula catalog" : "OpenNGC Messier galaxy and nebula subset",
    sourceUrl: manifest.source.landingUrl,
    license: manifest.source.license,
    licenseUrl: manifest.source.licenseUrl,
    publishedAt: "2026-05-01T00:00:00.000Z",
    retrievedAt: manifest.retrievedAt,
    validFrom: null,
    validTo: null,
    state: "FRESH",
    confidence: 0.95,
    precision: "ICRS J2000 positions and catalog angular extents",
    limitations: [...manifest.modifications, extended ? "仅含本版本明确选入的真实目录行，开发批次不是全天目录完整性或需求上限；不表示肉眼可见、天气或山体遮挡。"
      : "仅含OpenNGC中带Messier交叉标识的51个星系/星云类对象；不表示肉眼可见、天气或山体遮挡"],
  };
}

export function buildDeepSkyScene(
  hourlyAt: readonly string[],
  spot: Pick<SpotSummary, "wgs84" | "altitudeM">,
  version?: string,
) {
  const unavailable = (reason: string) => ({
    state: "UNAVAILABLE" as const,
    catalog: null,
    frames: hourlyAt.map((at) => ({ at, state: "UNAVAILABLE" as const, points: null })),
    unavailableReason: reason,
  });
  try {
    const catalog = loadDeepSkyCatalog(version);
    const entries = catalog.rows.map<DeepSkySceneCatalogEntry>((row) => ({
      objectRef: row.objectRef,
      displayName: row.messier === null ? row.ngcName : `M ${row.messier}`,
      kind: row.kind,
      aliases: [row.ngcName, ...row.commonNames],
      magnitude: row.vMag,
      magnitudeBand: row.vMag === null ? null : "V",
      majorAxisArcmin: row.majorAxisArcmin,
      minorAxisArcmin: row.minorAxisArcmin,
      positionAngleDeg: row.positionAngleDeg,
      icrsCenter: { raDeg: row.raDeg, decDeg: row.decDeg },
    }));
    const index = new Map(entries.map((entry, position) => [entry.objectRef, position] as const));
    const frames = hourlyAt.map((frameAt) => {
      if (!Number.isFinite(Date.parse(frameAt))) throw new Error("deep_sky_frame_invalid");
      const points = positionDeepSkyCatalog({
        at: frameAt,
        latitude: spot.wgs84.latitude,
        longitude: spot.wgs84.longitude,
        elevationM: spot.altitudeM ?? 0,
        catalog,
      }).map<DeepSkyScenePoint>((point) => {
        // A survey image can straddle the horizon while its center is below it.
        // Retain the plane; consumers independently clip marks and image rays.
        const catalogIndex = index.get(point.objectRef);
        if (catalogIndex === undefined) throw new Error("deep_sky_identity_invalid");
        return [catalogIndex, fixed(point.azimuthDeg), fixed(point.altitudeDeg),
          fixed(point.northAzimuthDeg), fixed(point.northAltitudeDeg),
          fixed(point.eastAzimuthDeg), fixed(point.eastAltitudeDeg)];
      });
      return { at: frameAt, state: "AVAILABLE" as const, points };
    });
    return {
      state: "AVAILABLE" as const,
      catalog: {
        catalogVersion: catalog.catalogVersion,
        catalogHash: catalog.catalogHash,
        frame: "ICRS J2000" as const,
        imageRegistration: "ICRS_TAN_NORTH_0_1_V1" as const,
        sources: [deepSkyCatalogSource(version)],
        entries,
      },
      frames,
      unavailableReason: null,
    };
  } catch {
    return unavailable("DEEP_SKY_CATALOG_UNAVAILABLE");
  }
}

export function deepSkySceneCacheKey(version?: string) {
  try {
    const catalog = loadDeepSkyCatalog(version);
    return `${catalog.catalogVersion}:${catalog.catalogHash}:${DEEP_SKY_PROJECTION_ALGORITHM}:${DEEP_SKY_REPORT_GEOMETRY_VERSION}`;
  } catch {
    return "deep-sky-unavailable";
  }
}
