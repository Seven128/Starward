import type { SpotSearchProvider } from "../map/spot-search-service";
import type { SpotFact, SpotRecord, SpotTrustRepository } from "./spot-trust-service";

export class PocSpotTrustRepository implements SpotTrustRepository {
  constructor(
    private readonly source: SpotSearchProvider,
    private readonly center = { lat: 22.529, lon: 113.9468, system: "WGS84" as const },
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async candidate(id: string) {
    const page = await this.source.search({ center: this.center, radiusMeters: 100_000, limit: 50 });
    return page.items.find((item) => item.id === id) ?? (id === "current" ? page.items[0] : undefined);
  }

  async findSpot(id: string): Promise<SpotRecord | null> {
    const item = await this.candidate(id);
    if (!item) return null;
    return {
      id: item.id, ownerId: null, name: item.name, coordinate: item.coordinate,
      visibility: "public_approximate", status: "caution",
      statusReason: "开放 POI 候选尚未完成夜间开放、合法可达性和现场安全核验",
      updatedAt: item.source?.fetchedAt ?? this.now().toISOString(),
    };
  }

  async listFacts(id: string): Promise<SpotFact[]> {
    const item = await this.candidate(id);
    if (!item) return [];
    const observedAt = item.source?.fetchedAt ?? this.now().toISOString();
    const sourceLabel = item.source?.label ?? "OpenStreetMap contributors";
    const fact = (key: string, value: SpotFact["value"], state: SpotFact["state"], safetyRelevant = false): SpotFact => ({
      id: `${item.id}-${key}`, key, value, state, sourceType: "model", sourceLabel, observedAt, expiresAt: null,
      version: item.source?.licenseId ?? "ODbL-1.0", safetyRelevant,
    });
    return [
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
  }
}
