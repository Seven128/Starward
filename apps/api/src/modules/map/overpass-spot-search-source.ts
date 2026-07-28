import { distanceMeters } from "../../../../../packages/coordinate-system/src/index";
import { assertHttpsHost, requestJson, type HttpTransport } from "../../../../../packages/data-source-runtime/src/index";
import type { SpotSearchPage, SpotSearchProvider, SpotSearchRequest } from "./spot-search-service";

interface OverpassElement { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }
interface OverpassPayload { elements?: OverpassElement[]; osm3s?: { timestamp_osm_base?: string } }

export interface OverpassSpotSearchSourceOptions {
  transport?: HttpTransport;
  now?: () => Date;
  endpoint?: string;
  endpoints?: readonly string[];
}

const staticSpotCacheTtlMs = 24 * 60 * 60_000;
const defaultOverpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
] as const;
const allowedOverpassHosts = ["overpass-api.de", "maps.mail.ru"] as const;

function stalePage(page: SpotSearchPage): SpotSearchPage {
  return {
    ...structuredClone(page),
    items: page.items.map((item) => ({
      ...structuredClone(item),
      source: item.source ? {
        ...item.source,
        label: `${item.source.label} · 缓存已过期，外部刷新失败`,
      } : item.source,
      factsBoundary: `${item.factsBoundary ?? "地点事实未核验"}；当前使用有来源的过期静态候选，动态开放、安全和路线必须重新核对。`,
    })),
  };
}

function facilities(tags: Record<string, string>): string[] {
  const found: string[] = [];
  if (tags.parking || tags.amenity === "parking") found.push("parking");
  if (tags.toilets === "yes") found.push("toilet");
  if (tags.wheelchair === "yes") found.push("wheelchair");
  if (tags.drinking_water === "yes") found.push("water");
  if (tags.internet_access && tags.internet_access !== "no") found.push("signal");
  return found;
}

export class OverpassSpotSearchSource implements SpotSearchProvider {
  private readonly endpoints: readonly URL[];
  private readonly now: () => Date;
  private readonly cache = new Map<string, { expiresAt: number; page: SpotSearchPage }>();
  private readonly inflight = new Map<string, Promise<SpotSearchPage>>();
  constructor(private readonly options: OverpassSpotSearchSourceOptions = {}) {
    const endpointValues = options.endpoints ?? (options.endpoint ? [options.endpoint] : defaultOverpassEndpoints);
    if (endpointValues.length === 0) throw new TypeError("overpass_endpoint_required");
    this.endpoints = endpointValues.map((value) => {
      const endpoint = new URL(value);
      assertHttpsHost(endpoint, allowedOverpassHosts);
      return endpoint;
    });
    this.now = options.now ?? (() => new Date());
  }

  async search(request: SpotSearchRequest): Promise<SpotSearchPage> {
    if (request.center.system !== "WGS84") throw new Error("spot_search_wgs84_required");
    if (!Number.isFinite(request.radiusMeters) || request.radiusMeters < 1 || request.radiusMeters > 200_000) throw new RangeError("spot_search_radius_out_of_range");
    if (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 50) throw new RangeError("spot_search_limit_out_of_range");
    const cacheKey = `${request.center.lat.toFixed(3)}:${request.center.lon.toFixed(3)}:${request.radiusMeters}:${request.limit}:${(request.requireFacilities ?? []).sort().join(",")}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > this.now().getTime()) return structuredClone(cached.page);
    const active = this.inflight.get(cacheKey);
    if (active) {
      try {
        return structuredClone(await active);
      } catch (error) {
        if (cached) return stalePage(cached.page);
        throw error;
      }
    }
    const pending = this.fetchPage(request, cacheKey);
    this.inflight.set(cacheKey, pending);
    try {
      return structuredClone(await pending);
    } catch (error) {
      if (cached) return stalePage(cached.page);
      throw error;
    }
    finally { this.inflight.delete(cacheKey); }
  }

  private async fetchPage(request: SpotSearchRequest, cacheKey: string): Promise<SpotSearchPage> {
    const queryRadius = Math.min(request.radiusMeters, 100_000);
    const query = `[out:json][timeout:30];(node["tourism"="viewpoint"](around:${queryRadius},${request.center.lat},${request.center.lon});node["amenity"="observatory"](around:${queryRadius},${request.center.lat},${request.center.lon}););out ${Math.min(request.limit * 4, 100)};`;
    const payload = await this.requestFromAvailableEndpoint(query);
    const fetchedAt = this.now().toISOString();
    const candidates = (payload.elements ?? []).flatMap((element) => {
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
      const tags = element.tags ?? {};
      const distance = Math.round(distanceMeters(request.center, { lat: lat!, lon: lon! }));
      if (distance > request.radiusMeters) return [];
      const itemFacilities = facilities(tags);
      if (request.requireFacilities?.some((item) => !itemFacilities.includes(item))) return [];
      return [{
        id: `osm-${element.id}`, name: tags["name:zh"] ?? tags.name ?? tags["name:en"] ?? `OpenStreetMap 地点 ${element.id}`,
        coordinate: { lat: lat!, lon: lon!, system: "WGS84" as const }, distanceMeters: distance,
        status: "provisional" as const, mapState: "insufficient" as const, facilities: itemFacilities,
        verificationAt: null, imageUrl: null,
        source: { label: "OpenStreetMap contributors via Overpass API", url: `https://www.openstreetmap.org/${element.lat === undefined ? "way" : "node"}/${element.id}`, licenseId: "ODbL-1.0", fetchedAt },
        factsBoundary: "POI 仅用于发现候选；夜间开放、停车、设施、安全和架设条件均未现场验证。",
      }];
    }).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, request.limit);
    const page = { items: candidates, nextCursor: null };
    this.cache.set(cacheKey, { expiresAt: this.now().getTime() + staticSpotCacheTtlMs, page: structuredClone(page) });
    return page;
  }

  private async requestFromAvailableEndpoint(query: string): Promise<OverpassPayload> {
    let lastError: unknown;
    for (const endpoint of this.endpoints) {
      const url = new URL(endpoint);
      url.searchParams.set("data", query);
      try {
        return await requestJson<OverpassPayload>({
          provider: "openstreetmap-overpass-poc",
          url,
          transport: this.options.transport,
          init: { headers: { accept: "application/json", "user-agent": "Starward-noncommercial-poc/0.1" } },
          timeoutMs: 35_000,
          maxAttempts: 1,
          retryStatuses: [429, 500, 502, 503, 504],
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error("openstreetmap_overpass_instances_unavailable", { cause: lastError });
  }
}
