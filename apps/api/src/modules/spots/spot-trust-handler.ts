import type { SpotActor, SpotTrustService } from "./spot-trust-service";
import type { AwaitedSpotTrustRuntime } from "./runtime-types";

export type SpotActorResolver = (headers: Record<string, string | string[] | undefined>) => Promise<SpotActor>;

export function createSpotTrustHandler(service: Pick<SpotTrustService, "getDetail">, resolveActor: SpotActorResolver, runtime?: AwaitedSpotTrustRuntime) {
  return async (request: { spotId: string; headers: Record<string, string | string[] | undefined> }) => {
    if (!request.spotId) return { status: 422, headers: { "cache-control": "no-store" }, body: { code: "spot_id_required" } };
    try {
      const actor = await resolveActor(request.headers);
      const detail = await service.getDetail(request.spotId, actor);
      if (runtime) {
        const sourceVersion = detail.facts.flatMap((fact) => fact.sources.map((source) => source.version)).sort().join(",") || "no-facts";
        await runtime.execute({
          outcome: "spot-detail-and-trust",
          actorId: actor.userId ?? "personal-trial-owner",
          operation: "spot.detail",
          idempotencyKey: `spot:${detail.id}:${detail.updatedAt}:${sourceVersion}:${detail.coordinate.level}`,
          payload: { token: detail.id, spotId: detail.id, updatedAt: detail.updatedAt, sourceVersion, coordinateLevel: detail.coordinate.level },
        });
      }
      return { status: 200, headers: { "cache-control": "private, no-store", vary: "authorization" }, body: detail };
    } catch (error) {
      const code = error instanceof Error ? error.message : "spot_detail_unavailable";
      return { status: code === "spot_not_found" ? 404 : 503, headers: { "cache-control": "no-store" }, body: { code: code === "spot_not_found" ? code : "spot_detail_unavailable" } };
    }
  };
}
