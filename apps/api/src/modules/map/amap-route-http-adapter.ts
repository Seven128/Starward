import { assertHttpsHost, requestJson, type HttpTransport } from "../../../../../packages/data-source-runtime/src/index";
import type { AmapRouteAdapter, RouteRequest } from "./route-service";

interface AmapPath {
  distance?: string;
  cost?: { duration?: string };
  steps?: Array<{ polyline?: string; cost?: { duration?: string } }>;
}

interface AmapTransit {
  distance?: string;
  cost?: { duration?: string };
  segments?: unknown[];
}

interface AmapRoutePayload {
  status?: string;
  info?: string;
  infocode?: string;
  route?: { paths?: AmapPath[]; transits?: AmapTransit[] };
}

export interface AmapRouteHttpAdapterOptions {
  webServiceKey: string;
  transport?: HttpTransport;
  now?: () => Date;
  ttlSeconds?: number;
  resolveTransitCities?: (input: { origin: { lat: number; lon: number }; destination: { lat: number; lon: number } }) => Promise<{ city1: string; city2: string }>;
}

function coordinate(value: { lon: number; lat: number }): string {
  return `${value.lon.toFixed(6)},${value.lat.toFixed(6)}`;
}

function endpointForMode(mode: RouteRequest["mode"]): string {
  if (mode === "drive") return "v5/direction/driving";
  if (mode === "walk") return "v5/direction/walking";
  if (mode === "cycle") return "v5/direction/bicycling";
  return "v5/direction/transit/integrated";
}

function collectPolylines(value: unknown, output: string[] = [], depth = 0): string[] {
  if (depth > 8 || output.length > 2_000 || value === null || value === undefined) return output;
  if (Array.isArray(value)) {
    for (const item of value) collectPolylines(item, output, depth + 1);
    return output;
  }
  if (typeof value !== "object") return output;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key === "polyline" && typeof item === "string" && item.trim()) output.push(item);
    else collectPolylines(item, output, depth + 1);
  }
  return output;
}

export class AmapRouteHttpAdapter implements AmapRouteAdapter {
  private readonly baseUrl = new URL("https://restapi.amap.com/");
  private readonly now: () => Date;

  constructor(private readonly options: AmapRouteHttpAdapterOptions) {
    if (!options.webServiceKey) throw new Error("amap_web_service_key_required");
    assertHttpsHost(this.baseUrl, ["restapi.amap.com"]);
    this.now = options.now ?? (() => new Date());
  }

  async route(input: Parameters<AmapRouteAdapter["route"]>[0]) {
    const url = new URL(endpointForMode(input.mode), this.baseUrl);
    const params = new URLSearchParams({
      key: this.options.webServiceKey,
      origin: coordinate(input.origin),
      destination: coordinate(input.destination),
      output: "json",
      show_fields: "cost,navi",
    });
    if (input.mode === "drive") params.set("strategy", "32");
    if (input.mode === "transit") {
      if (!this.options.resolveTransitCities) throw new Error("amap_transit_city_resolver_required");
      const cities = await this.options.resolveTransitCities({ origin: input.origin, destination: input.destination });
      params.set("city1", cities.city1);
      params.set("city2", cities.city2);
    }
    url.search = params.toString();
    const payload = await requestJson<AmapRoutePayload>({
      provider: "amap-route-v5",
      url,
      transport: this.options.transport,
      maxAttempts: 2,
      retryStatuses: [429, 500, 502, 503, 504],
    });
    if (payload.status !== "1" || payload.infocode !== "10000") throw new Error(`amap_route_rejected:${payload.infocode ?? "unknown"}`);
    const path = input.mode === "transit" ? payload.route?.transits?.[0] : payload.route?.paths?.[0];
    if (!path) throw new Error("amap_route_empty");
    const distanceMeters = Number(path.distance);
    const durationSeconds = Number(path.cost?.duration ?? ("steps" in path ? path.steps?.reduce((sum, step) => sum + Number(step.cost?.duration ?? 0), 0) : undefined));
    const geometry = collectPolylines(path).join(";");
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) throw new Error("amap_route_distance_invalid");
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("amap_route_duration_invalid");
    if (!geometry) throw new Error("amap_route_geometry_missing");
    const generatedAt = this.now();
    return {
      providerVersion: "amap-web-service-direction-v5",
      distanceMeters,
      durationSeconds,
      geometry,
      generatedAt: generatedAt.toISOString(),
      expiresAt: new Date(generatedAt.getTime() + (this.options.ttlSeconds ?? 1_800) * 1000).toISOString(),
    };
  }
}
