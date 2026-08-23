import type {
  OrdinaryPlaceRef,
  SourceSummary,
} from "@starward/miniapp-contracts";
import type { PlaceSearchPort, ProviderResult } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

interface AmapPlace {
  id?: unknown;
  name?: unknown;
  location?: unknown;
  address?: unknown;
  pname?: unknown;
  cityname?: unknown;
  adname?: unknown;
}

interface AmapPlacePayload {
  status?: unknown;
  infocode?: unknown;
  pois?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function regionOf(place: AmapPlace): string {
  return [...new Set([place.pname, place.cityname, place.adname].map(text).filter(Boolean))].join(" · ");
}

function locationOf(value: unknown): OrdinaryPlaceRef["location"] | null {
  const raw = text(value).split(",");
  if (raw.length !== 2) return null;
  const longitude = Number(raw[0]);
  const latitude = Number(raw[1]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  return { system: "GCJ02", latitude, longitude };
}

function placeSource(input: {
  retrievedAt: string;
  state: SourceSummary["state"];
  limitations: readonly string[];
}): SourceSummary {
  return {
    id: `place:amap-v5:${input.retrievedAt}`,
    kind: "THIRD_PARTY_PLACE",
    provider: "高德地图开放平台",
    title: "地点搜索服务",
    sourceUrl: "https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch",
    license: "高德开放平台服务条款（以当前账号合同与配额为准）",
    licenseUrl: "https://lbs.amap.com/api/webservice/summary/",
    publishedAt: null,
    retrievedAt: input.retrievedAt,
    validFrom: input.retrievedAt,
    validTo:
      input.state === "FRESH"
        ? new Date(Date.parse(input.retrievedAt) + 10 * 60_000).toISOString()
        : null,
    state: input.state,
    confidence: null,
    precision: "供应商地点名称、地址与地图坐标；不代表观星条件或现场核验",
    limitations: input.limitations,
  };
}

function unavailable(
  errorCode: string,
): ProviderResult<readonly OrdinaryPlaceRef[]> {
  const retrievedAt = new Date().toISOString();
  const source = placeSource({
    retrievedAt,
    state: "UNAVAILABLE",
    limitations: [
      "当前请求未获得可验证的地点搜索结果；具体技术原因已记录用于诊断",
      "地点搜索不可用时不会生成伪地点，也不会把普通地点提升为正式观星点",
    ],
  });
  return {
    value: null,
    state: "UNAVAILABLE",
    source,
    errorCode,
  };
}

function timeoutSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(parent?.reason);
  if (parent?.aborted) forwardAbort();
  else parent?.addEventListener("abort", forwardAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort("place_search_timeout"),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      parent?.removeEventListener("abort", forwardAbort);
    },
  };
}

export class AmapPlaceSearchAdapter implements PlaceSearchPort {
  readonly key = "amap-place-v5";

  constructor(
    private readonly webServiceKey: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!webServiceKey) throw new Error("amap_web_service_key_required");
  }

  async search(
    input: Parameters<PlaceSearchPort["search"]>[0],
  ): Promise<ProviderResult<readonly OrdinaryPlaceRef[]>> {
    const query = input.query.trim();
    if (!query || query.length > 80) return unavailable("place_query_invalid");
    const url = new URL("https://restapi.amap.com/v5/place/text");
    url.search = new URLSearchParams({
      key: this.webServiceKey,
      keywords: query,
      show_fields: "business",
      page_size: "20",
      page_num: "1",
      output: "json",
      ...(input.region?.trim() ? { region: input.region.trim() } : {}),
    }).toString();
    const request = timeoutSignal(input.signal, 5_000);
    try {
      const response = await this.transport(url, {
        headers: { accept: "application/json" },
        signal: request.signal,
      });
      if (!response.ok) throw new Error(`amap_http_${response.status}`);
      if (!(response.headers.get("content-type") ?? "").includes("json"))
        throw new Error("amap_non_json_response");
      const payload = (await response.json()) as AmapPlacePayload;
      if (payload.status !== "1" || payload.infocode !== "10000")
        throw new Error("amap_place_rejected");
      if (!Array.isArray(payload.pois)) throw new Error("amap_place_rows_invalid");
      const retrievedAt = new Date().toISOString();
      const source = placeSource({
        retrievedAt,
        state: "FRESH",
        limitations: [
          "结果只用于移动地图或查找附近正式观星点",
          "地点名称、地址与坐标可能随供应商数据更新",
        ],
      });
      const value = payload.pois.flatMap((raw): OrdinaryPlaceRef[] => {
        if (!raw || typeof raw !== "object") return [];
        const place = raw as AmapPlace;
        const placeId = text(place.id);
        const label = text(place.name);
        const location = locationOf(place.location);
        if (!placeId || !label || !location) return [];
        return [
          {
            placeId,
            label,
            address: text(place.address),
            region: regionOf(place),
            kind: "ORDINARY_PLACE",
            location,
            actions: ["MOVE_MAP", "FIND_NEARBY_FORMAL_SPOTS"],
            spotId: null,
            nightSkyAllowed: false,
            dataState: "FRESH",
            source,
          },
        ];
      });
      return { value, state: "FRESH", source, errorCode: null };
    } catch (error) {
      if (input.signal?.aborted) throw error;
      return unavailable(
        request.signal.aborted
          ? "place_search_timeout"
          : error instanceof Error
            ? error.message
            : "amap_place_unknown_failure",
      );
    } finally {
      request.dispose();
    }
  }
}

export class DisabledPlaceSearchAdapter implements PlaceSearchPort {
  readonly key = "place-search-disabled";

  async search(): Promise<ProviderResult<readonly OrdinaryPlaceRef[]>> {
    return unavailable("place_search_provider_not_configured");
  }
}

export function createPlaceSearchPort(
  config: MiniappRuntimeConfig,
): PlaceSearchPort {
  return config.placeSearchProvider === "AMAP"
    ? new AmapPlaceSearchAdapter(config.amapWebServiceKey!)
    : new DisabledPlaceSearchAdapter();
}
