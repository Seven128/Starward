import type {
  RouteOverview,
  SourceSummary,
  Wgs84Point,
} from "@starward/miniapp-contracts";
import { createMapCoordinateView } from "@starward/coordinate-system";
import type { ProviderResult, RoutePort } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

interface AmapPath {
  distance?: string;
  cost?: { duration?: string };
  steps?: Array<{
    road_name?: string;
    instruction?: string;
    cost?: { duration?: string };
  }>;
}

interface AmapPayload {
  status?: string;
  info?: string;
  infocode?: string;
  route?: { paths?: AmapPath[] };
}

function point(value: Wgs84Point) {
  const view = createMapCoordinateView({
    authoritative: {
      lat: value.latitude,
      lon: value.longitude,
      system: "WGS84",
    },
  });
  return `${view.display.lon.toFixed(6)},${view.display.lat.toFixed(6)}`;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function source(input: {
  retrievedAt: string;
  state: SourceSummary["state"];
  limitations: readonly string[];
}): SourceSummary {
  return {
    id: `route:amap-v5:${input.retrievedAt}`,
    kind: "THIRD_PARTY_ROUTE",
    provider: "高德地图开放平台",
    title: "驾车路线规划结果",
    sourceUrl: "https://lbs.amap.com/api/webservice/guide/api/newroute",
    license: "高德开放平台网页服务条款",
    licenseUrl: "https://lbs.amap.com/pages/product/webservice/",
    publishedAt: null,
    retrievedAt: input.retrievedAt,
    validFrom: input.retrievedAt,
    validTo:
      input.state === "FRESH"
        ? new Date(Date.parse(input.retrievedAt) + 30 * 60 * 1_000).toISOString()
        : null,
    state: input.state,
    confidence: null,
    precision: "起终点坐标只在服务端按地图要求转换一次；路线会随路网和供应商算法更新而变化",
    limitations: input.limitations,
  };
}

function unavailable(errorCode: string): ProviderResult<RouteOverview> {
  const retrievedAt = new Date().toISOString();
  const dataSource = source({
    retrievedAt,
    state: "UNAVAILABLE",
    limitations: [
      "当前请求未获得可验证的驾车路线；具体技术原因已记录用于诊断",
      "未返回真实路线时不以直线距离冒充驾车距离或时间",
    ],
  });
  return {
    value: {
      kind: "UNAVAILABLE",
      originLabel: null,
      distanceKm: null,
      driveMinutes: null,
      walkingMinutes: null,
      lastRoad: "路线服务当前不可用",
      parkingGuidance: "请查看点位已核验停车信息，并使用微信外部地图确认路线",
      state: "UNAVAILABLE",
      source: dataSource,
    },
    state: "UNAVAILABLE",
    source: dataSource,
    errorCode,
  };
}

export class AmapRouteAdapter implements RoutePort {
  readonly key = "amap-route-v5";

  constructor(
    private readonly webServiceKey: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!webServiceKey) throw new Error("amap_web_service_key_required");
  }

  async estimate(
    input: Parameters<RoutePort["estimate"]>[0],
  ): Promise<ProviderResult<RouteOverview>> {
    const url = new URL("https://restapi.amap.com/v5/direction/driving");
    url.search = new URLSearchParams({
      key: this.webServiceKey,
      origin: point(input.origin),
      destination: point(input.destination),
      strategy: "32",
      show_fields: "cost,navi",
      output: "json",
    }).toString();
    try {
      const response = await this.transport(url, {
        headers: { accept: "application/json" },
        ...(input.signal ? { signal: input.signal } : {}),
      });
      if (!response.ok) throw new Error(`amap_http_${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) throw new Error("amap_non_json_response");
      const payload = (await response.json()) as AmapPayload;
      if (payload.status !== "1" || payload.infocode !== "10000")
        throw new Error(`amap_rejected_${payload.infocode ?? "unknown"}`);
      const path = payload.route?.paths?.[0];
      if (!path) throw new Error("amap_route_empty");
      const distanceM = number(path.distance);
      const durationSeconds =
        number(path.cost?.duration) ??
        number(
          path.steps?.reduce(
            (sum, step) => sum + (number(step.cost?.duration) ?? 0),
            0,
          ),
        );
      if (distanceM === null || durationSeconds === null)
        throw new Error("amap_route_measurement_invalid");
      const lastRoad = [...(path.steps ?? [])]
        .reverse()
        .map((step) => step.road_name?.trim() || step.instruction?.trim())
        .find(Boolean);
      const retrievedAt = new Date().toISOString();
      const dataSource = source({
        retrievedAt,
        state: "FRESH",
        limitations: [
          "驾车时间是当前路线规划估算，不等同于实际到达时间",
          "停车与末段现场条件仍以点位核验证据为准",
        ],
      });
      const value: RouteOverview = {
        kind: "ROUTE_ESTIMATE",
        originLabel: null,
        distanceKm: Math.round((distanceM / 1_000) * 10) / 10,
        driveMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        walkingMinutes: null,
        lastRoad: lastRoad || "路线已返回，但未包含末段道路名称",
        parkingGuidance: "停车以点位已核验场地信息为准",
        state: "FRESH",
        source: dataSource,
      };
      return {
        value,
        state: "FRESH",
        source: dataSource,
        errorCode: null,
      };
    } catch (error) {
      if (input.signal?.aborted) throw error;
      return unavailable(
        error instanceof Error ? error.message : "amap_unknown_failure",
      );
    }
  }
}

export class DisabledRouteAdapter implements RoutePort {
  readonly key = "route-disabled";

  async estimate(): Promise<ProviderResult<RouteOverview>> {
    return unavailable("route_provider_not_configured");
  }
}

export function createRoutePort(config: MiniappRuntimeConfig): RoutePort {
  return config.routeProvider === "AMAP"
    ? new AmapRouteAdapter(config.amapWebServiceKey!)
    : new DisabledRouteAdapter();
}
