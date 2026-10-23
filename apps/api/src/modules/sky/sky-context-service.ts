import type { SkyContext, SkyQuery, SkyTrajectorySample } from "../../../../../packages/contracts/src/sky";
import { catalogChunks, positionCatalog } from "../../../../../packages/astronomy-core/src/sky-model";
import { createSkyTargetProjection } from "./sky-target-positions";

export class SkyContextService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async get(query: SkyQuery): Promise<SkyContext> {
    const at = new Date(query.at);
    const input = { latitude: query.latitude, longitude: query.longitude, elevationM: query.elevationM, magnitudeLimit: 4 };
    const projectTarget = createSkyTargetProjection(query.target);
    const selectedTarget = projectTarget({ ...input, at });
    const objects = [...positionCatalog({ ...input, at }), selectedTarget];
    const samples: SkyTrajectorySample[] = [];
    for (let minute = 0; minute <= 24 * 60; minute += 15) {
      const sampleAt = new Date(at.getTime() + minute * 60_000);
      const target = projectTarget({ ...input, at: sampleAt });
      samples.push({ at: sampleAt.toISOString(), altitudeDeg: target.altitudeDeg, azimuthDeg: target.azimuthDeg, aboveAstronomicalHorizon: target.visible });
    }
    const above = samples.filter((sample) => sample.aboveAstronomicalHorizon);
    const best = above.reduce<SkyTrajectorySample | null>((winner, sample) => !winner || sample.altitudeDeg > winner.altitudeDeg ? sample : winner, null);
    const chunks = catalogChunks(4);
    return {
      schemaVersion: "starward-sky-context-v1",
      state: "partial",
      generatedAt: this.now().toISOString(),
      algorithm: { name: "Astronomy Engine", version: "astronomy-engine@2.1.19+starward-sky-v2", coordinateSystem: "WGS84", refraction: "none" },
      context: query,
      catalog: { loadedChunk: "bright", deferredChunks: chunks.slice(1).map((chunk) => chunk.key), magnitudeLimit: 4 },
      objects,
      selectedTarget,
      trajectory: samples,
      bestTargetTime: best?.at ?? null,
      horizon: null,
      warnings: ["地点地平线/人工遮挡没有可验证来源；仅显示纯天文地平线，不推断现场开阔程度。",
        ...(query.target === "milky-way-core" ? ["银河核心使用 Sagittarius A* 附近 J2000 方向代理，不代表银河亮度或摄影可见性。"] : [])],
    };
  }
}
