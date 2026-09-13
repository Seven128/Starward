import type {
  RouteOverview,
  RouteTravelMode,
  SourceSummary,
  Wgs84Point,
} from "@starward/miniapp-contracts";
import { createMapCoordinateView } from "@starward/coordinate-system";
import type { ProviderResult, RoutePort } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

interface AmapStep {
  road_name?: string;
  instruction?: string;
  cost?: { duration?: string };
}

interface AmapPath {
  distance?: string;
  cost?: { duration?: string };
  steps?: AmapStep[];
}

interface AmapTransit {
  distance?: string;
  cost?: { duration?: string };
  segments?: Array<{
    walking?: { steps?: AmapStep[] };
    bus?: { buslines?: Array<{ name?: string }> };
    railway?: { name?: string };
  }>;
}

interface AmapPayload {
  status?: string;
  info?: string;
  infocode?: string;
  route?: { paths?: AmapPath[]; transits?: AmapTransit[] };
}

interface AmapReverseGeocodePayload {
  status?: string;
  infocode?: string;
  regeocode?: { addressComponent?: { citycode?: string } };
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
  mode: RouteTravelMode;
  state: SourceSummary["state"];
  limitations: readonly string[];
}): SourceSummary {
  const modeLabel = input.mode === "DRIVING" ? "驾车" : input.mode === "TRANSIT" ? "公交" : "步行";
  return {
    id: `route:amap-v5:${input.mode.toLowerCase()}:${input.retrievedAt}`,
    kind: "THIRD_PARTY_ROUTE",
    provider: "高德地图开放平台",
    title: `${modeLabel}路线规划结果`,
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

function unavailable(errorCode: string, mode: RouteTravelMode = "DRIVING"): ProviderResult<RouteOverview> {
  const retrievedAt = new Date().toISOString();
  const dataSource = source({
    retrievedAt,
    mode,
    state: "UNAVAILABLE",
    limitations: [
      "当前请求未获得可验证的路线；具体技术原因已记录用于诊断",
      "未返回真实路线时不以直线距离冒充道路距离或时间",
    ],
  });
  return {
    value: {
      kind: "UNAVAILABLE",
      travelMode: mode,
      originLabel: null,
      distanceKm: null,
      durationMinutes: null,
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
    const mode = input.travelMode ?? "DRIVING";
    const endpoint = mode === "DRIVING"
      ? "driving"
      : mode === "WALKING"
        ? "walking"
        : "transit/integrated";
    const url = new URL(`https://restapi.amap.com/v5/direction/${endpoint}`);
    const parameters: Record<string, string> = {
      key: this.webServiceKey,
      origin: point(input.origin),
      destination: point(input.destination),
      show_fields: "cost,navi",
      output: "json",
    };
    if (mode === "DRIVING") parameters.strategy = "32";
    if (mode === "WALKING") parameters.isindoor = "0";
    try {
      if (mode === "TRANSIT") {
        const [city1, city2] = await Promise.all([
          this.#cityCode(parameters.origin, input.signal),
          this.#cityCode(parameters.destination, input.signal),
        ]);
        parameters.city1 = city1;
        parameters.city2 = city2;
        parameters.strategy = "0";
        parameters.nightflag = "1";
        if (input.departureLocalDate) parameters.date = input.departureLocalDate;
        if (input.departureLocalTime)
          parameters.time = input.departureLocalTime.replace(":", "-");
      }
      url.search = new URLSearchParams(parameters).toString();
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
      const route = mode === "TRANSIT"
        ? payload.route?.transits?.[0]
        : payload.route?.paths?.[0];
      if (!route) throw new Error("amap_route_empty");
      const distanceM = number(route.distance);
      const durationSeconds =
        number(route.cost?.duration) ??
        ("steps" in route
          ? number(
              route.steps?.reduce(
                (sum, step) => sum + (number(step.cost?.duration) ?? 0),
                0,
              ),
            )
          : null);
      if (distanceM === null || durationSeconds === null)
        throw new Error("amap_route_measurement_invalid");
      const steps = "steps" in route ? route.steps ?? [] : [];
      const transitName = "segments" in route
        ? route.segments
            ?.flatMap((segment) => [
              ...(segment.bus?.buslines ?? []).map((line) => line.name?.trim()),
              segment.railway?.name?.trim(),
            ])
            .find(Boolean)
        : null;
      const lastRoad = [...steps]
        .reverse()
        .map((step) => step.road_name?.trim() || step.instruction?.trim())
        .find(Boolean);
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
      const retrievedAt = new Date().toISOString();
      const modeLabel = mode === "DRIVING" ? "驾车" : mode === "TRANSIT" ? "公交" : "步行";
      const dataSource = source({
        retrievedAt,
        mode,
        state: "FRESH",
        limitations: [
          `${modeLabel}时间是当前路线规划估算，不等同于实际到达时间`,
          mode === "TRANSIT"
            ? "班次、停运和夜间运营状态可能变化，出发前仍需复核"
            : "末段现场条件仍以点位核验证据为准",
        ],
      });
      const value: RouteOverview = {
        kind: "ROUTE_ESTIMATE",
        travelMode: mode,
        originLabel: null,
        distanceKm: Math.round((distanceM / 1_000) * 10) / 10,
        durationMinutes,
        driveMinutes: mode === "DRIVING" ? durationMinutes : null,
        walkingMinutes: mode === "WALKING" ? durationMinutes : null,
        lastRoad: transitName || lastRoad || `${modeLabel}路线已返回`,
        parkingGuidance: mode === "DRIVING" ? "停车以点位已核验场地信息为准" : "到达后仍需核验末段步行与场地开放情况",
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
        mode,
      );
    }
  }

  async #cityCode(location: string, signal?: AbortSignal) {
    const url = new URL("https://restapi.amap.com/v3/geocode/regeo");
    url.search = new URLSearchParams({
      key: this.webServiceKey,
      location,
      extensions: "base",
      output: "json",
    }).toString();
    const response = await this.transport(url, {
      headers: { accept: "application/json" },
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) throw new Error(`amap_city_http_${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) throw new Error("amap_city_non_json_response");
    const payload = (await response.json()) as AmapReverseGeocodePayload;
    if (payload.status !== "1" || payload.infocode !== "10000")
      throw new Error(`amap_city_rejected_${payload.infocode ?? "unknown"}`);
    const cityCode = payload.regeocode?.addressComponent?.citycode?.trim();
    if (!cityCode) throw new Error("amap_city_code_missing");
    return cityCode;
  }
}

export class DisabledRouteAdapter implements RoutePort {
  readonly key = "route-disabled";

  async estimate(): Promise<ProviderResult<RouteOverview>> {
    return unavailable("route_provider_not_configured");
  }
}

export function createRoutePort(config: MiniappRuntimeConfig, transport: typeof fetch = fetch): RoutePort {
  return config.routeProvider === "AMAP"
    ? new AmapRouteAdapter(config.amapWebServiceKey!, transport)
    : new DisabledRouteAdapter();
}
