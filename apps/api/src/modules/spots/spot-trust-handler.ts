import type { SpotActor, SpotTrustService } from "./spot-trust-service";

export type SpotActorResolver = (headers: Record<string, string | string[] | undefined>) => Promise<SpotActor>;

export function createSpotTrustHandler(service: Pick<SpotTrustService, "getDetail">, resolveActor: SpotActorResolver) {
  return async (request: { spotId: string; headers: Record<string, string | string[] | undefined> }) => {
    if (!request.spotId) return { status: 422, headers: { "cache-control": "no-store" }, body: { code: "spot_id_required" } };
    try {
      const detail = await service.getDetail(request.spotId, await resolveActor(request.headers));
      return { status: 200, headers: { "cache-control": "private, no-store", vary: "authorization" }, body: detail };
    } catch (error) {
      const code = error instanceof Error ? error.message : "spot_detail_unavailable";
      return { status: code === "spot_not_found" ? 404 : 503, headers: { "cache-control": "no-store" }, body: { code: code === "spot_not_found" ? code : "spot_detail_unavailable" } };
    }
  };
}
