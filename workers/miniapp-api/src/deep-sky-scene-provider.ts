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

function fixed(value: number) {
  const rounded = Math.round(value * 1_000) / 1_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function deepSkyCatalogSource(): SourceSummary {
  const manifest = loadDeepSkyCatalog().manifest;
  return {
    id: `catalog:${manifest.catalogVersion}:${manifest.derivedAssetSha256}`,
    kind: "OPEN_DATA",
    provider: manifest.source.provider,
    title: "OpenNGC Messier galaxy and nebula subset",
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
    limitations: ["仅含OpenNGC中带Messier交叉标识的51个星系/星云类对象；不表示肉眼可见、天气或山体遮挡"],
  };
}

export function buildDeepSkyScene(
  hourlyAt: readonly string[],
  spot: Pick<SpotSummary, "wgs84" | "altitudeM">,
) {
  const unavailable = (reason: string) => ({
    state: "UNAVAILABLE" as const,
    catalog: null,
    frames: hourlyAt.map((at) => ({ at, state: "UNAVAILABLE" as const, points: null })),
    unavailableReason: reason,
  });
  try {
    const catalog = loadDeepSkyCatalog();
    const entries = catalog.rows.map<DeepSkySceneCatalogEntry>((row) => ({
      objectRef: row.objectRef,
      displayName: `M ${row.messier}`,
      kind: row.kind,
      aliases: [row.ngcName, ...row.commonNames],
      magnitude: row.vMag,
      magnitudeBand: row.vMag === null ? null : "V",
      majorAxisArcmin: row.majorAxisArcmin,
      minorAxisArcmin: row.minorAxisArcmin,
      positionAngleDeg: row.positionAngleDeg,
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
      }).filter((point) => point.visible).map<DeepSkyScenePoint>((point) => {
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
        sources: [deepSkyCatalogSource()],
        entries,
      },
      frames,
      unavailableReason: null,
    };
  } catch {
    return unavailable("DEEP_SKY_CATALOG_UNAVAILABLE");
  }
}

export function deepSkySceneCacheKey() {
  try {
    const catalog = loadDeepSkyCatalog();
    return `${catalog.catalogVersion}:${catalog.catalogHash}:${DEEP_SKY_PROJECTION_ALGORITHM}`;
  } catch {
    return "deep-sky-unavailable";
  }
}
