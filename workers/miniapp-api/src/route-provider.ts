import type { RouteOverview, RouteTravelMode, SourceSummary } from "@starward/miniapp-contracts";
import type { ProviderResult, RoutePort } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

function source(input: {
  retrievedAt: string;
  mode: RouteTravelMode;
  state: SourceSummary["state"];
  limitations: readonly string[];
}): SourceSummary {
  const modeLabel = input.mode === "DRIVING" ? "驾车" : input.mode === "TRANSIT" ? "公交" : "步行";
  return {
    id: `route:retired:${input.mode.toLowerCase()}:${input.retrievedAt}`,
    kind: "THIRD_PARTY_ROUTE",
    provider: "Starward 出行能力说明",
    title: `${modeLabel}路线未提供`,
    sourceUrl: "",
    license: "应用能力说明，不含第三方路网数据",
    licenseUrl: "",
    publishedAt: null,
    retrievedAt: input.retrievedAt,
    validFrom: input.retrievedAt,
    validTo:
      input.state === "FRESH"
        ? new Date(Date.parse(input.retrievedAt) + 30 * 60 * 1_000).toISOString()
        : null,
    state: input.state,
    confidence: null,
    precision: "不提供道路里程、预计用时或自动到达时间",
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
      "当前方案由用户手动安排出行，并通过微信地图确认路线",
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

/** Compatibility port for older callers. No external requests are made. */
export class DisabledRouteAdapter implements RoutePort {
  readonly key = "route-retired";
  async estimate(): Promise<ProviderResult<RouteOverview>> {
    return unavailable("route_provider_retired");
  }
}
export function createRoutePort(_config: MiniappRuntimeConfig, _transport: typeof fetch = fetch): RoutePort {
  return new DisabledRouteAdapter();
}
