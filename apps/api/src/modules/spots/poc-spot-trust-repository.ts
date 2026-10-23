import type { SpotIdentityProvider } from "../map/spot-search-service";
import type { SpotFact, SpotRecord, SpotTrustRepository } from "./spot-trust-service";

export class PocSpotTrustRepository implements SpotTrustRepository {
  constructor(
    private readonly source: SpotIdentityProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async load(id: string) {
    const item = await this.source.findById(id);
    if (!item) return null;
    if (item.id !== id) throw new Error("spot_source_identity_mismatch");
    const observedAt = item.source?.fetchedAt ?? this.now().toISOString();
    const spot: SpotRecord = {
      id: item.id, ownerId: null, name: item.name, coordinate: item.coordinate,
      visibility: "public_approximate", status: "caution",
      statusReason: "开放 POI 候选尚未完成夜间开放、合法可达性和现场安全核验",
      updatedAt: observedAt,
    };
    const sourceLabel = item.source?.label ?? "OpenStreetMap contributors";
    const fact = (key: string, value: SpotFact["value"], state: SpotFact["state"], safetyRelevant = false): SpotFact => ({
      id: `${item.id}-${key}`, key, value, state, sourceType: "model", sourceLabel, observedAt, expiresAt: null,
      version: item.source?.licenseId ?? "ODbL-1.0", safetyRelevant,
    });
    const facts: SpotFact[] = [
      fact("candidate_source", item.source?.url ?? null, "known"),
      fact("field_verification", false, "temporary-unavailable", true),
      fact("parking", item.facilities.includes("parking") ? "poi-tag-only" : null, item.facilities.includes("parking") ? "known" : "unknown"),
      fact("toilet", item.facilities.includes("toilet") ? "poi-tag-only" : null, item.facilities.includes("toilet") ? "known" : "unknown"),
      fact("last_mile", null, "unknown", true),
      fact("night_access", null, "unknown", true),
      fact("light_radiance", null, "unknown"),
      fact("horizon_profile", null, "unknown"),
      fact("media", null, "unknown"),
    ];
    return { spot, facts };
  }
}
