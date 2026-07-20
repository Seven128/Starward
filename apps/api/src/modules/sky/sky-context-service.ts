import type { SkyContext, SkyQuery, SkyTrajectorySample } from "../../../../../packages/contracts/src/sky";
import { catalogChunks, positionCatalog } from "../../../../../packages/astronomy-core/src/sky-model";

export class SkyContextService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async get(query: SkyQuery): Promise<SkyContext> {
    const at = new Date(query.at);
    const input = { latitude: query.latitude, longitude: query.longitude, elevationM: query.elevationM, magnitudeLimit: 4 };
    const objects = positionCatalog({ ...input, at });
    const samples: SkyTrajectorySample[] = [];
    for (let minute = 0; minute <= 24 * 60; minute += 15) {
      const sampleAt = new Date(at.getTime() + minute * 60_000);
      const target = positionCatalog({ ...input, at: sampleAt }).find((item) => item.id === query.target);
      if (target) samples.push({ at: sampleAt.toISOString(), altitudeDeg: target.altitudeDeg, azimuthDeg: target.azimuthDeg, aboveAstronomicalHorizon: target.visible });
    }
    const above = samples.filter((sample) => sample.aboveAstronomicalHorizon);
    const best = above.reduce<SkyTrajectorySample | null>((winner, sample) => !winner || sample.altitudeDeg > winner.altitudeDeg ? sample : winner, null);
    const chunks = catalogChunks(4);
    return {
      schemaVersion: "starward-sky-context-v1",
      state: "partial",
      generatedAt: this.now().toISOString(),
      algorithm: { name: "Astronomy Engine", version: "astronomy-engine@2.1.19+starward-sky-v1", coordinateSystem: "WGS84", refraction: "normal" },
      context: query,
      catalog: { loadedChunk: "bright", deferredChunks: chunks.slice(1).map((chunk) => chunk.key), magnitudeLimit: 4 },
      objects,
      selectedTarget: objects.find((item) => item.id === query.target) ?? null,
      trajectory: samples,
      bestTargetTime: best?.at ?? null,
      horizon: null,
      warnings: ["地点地平线/人工遮挡没有可验证来源；仅显示纯天文地平线，不推断现场开阔程度。"],
    };
  }
}
