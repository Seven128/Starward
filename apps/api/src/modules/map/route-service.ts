import { distanceMeters, wgs84ToGcj02, type Wgs84Coordinate } from "../../../../../packages/coordinate-system/src/index";

export interface RouteRequest {
  requestId: string;
  origin: Wgs84Coordinate;
  destination: Wgs84Coordinate;
  mode: "drive" | "walk" | "cycle" | "transit";
}

export interface RouteSnapshot {
  id: string;
  requestId: string;
  provider: string;
  providerVersion: string;
  generatedAt: string;
  expiresAt: string;
  state: "fresh" | "cached" | "missing";
  authoritativeCoordinates: { origin: Wgs84Coordinate; destination: Wgs84Coordinate };
  providerCoordinateSystem: "GCJ-02";
  mode: RouteRequest["mode"];
  distanceMeters: number | null;
  durationSeconds: number | null;
  straightLineReferenceMeters: number;
  navigationUsable: boolean;
  geometry: string | null;
  warning: string | null;
}

export interface AmapRouteAdapter {
  route(input: { origin: ReturnType<typeof wgs84ToGcj02>; destination: ReturnType<typeof wgs84ToGcj02>; mode: RouteRequest["mode"] }): Promise<{ providerVersion: string; distanceMeters: number; durationSeconds: number; geometry: string; generatedAt: string; expiresAt: string }>;
}

export interface RouteSnapshotRepository {
  findUsable(request: RouteRequest): Promise<RouteSnapshot | null>;
  save(snapshot: RouteSnapshot): Promise<RouteSnapshot>;
}

export class RouteService {
  constructor(private readonly amap: AmapRouteAdapter, private readonly repository: RouteSnapshotRepository, private readonly nextId: () => string = () => crypto.randomUUID()) {}

  async load(request: RouteRequest): Promise<RouteSnapshot> {
    if (request.origin.system !== "WGS84" || request.destination.system !== "WGS84") throw new Error("route_wgs84_required");
    const straightLineReferenceMeters = Math.round(distanceMeters(request.origin, request.destination));
    try {
      const route = await this.amap.route({ origin: wgs84ToGcj02(request.origin), destination: wgs84ToGcj02(request.destination), mode: request.mode });
      if (!Number.isFinite(route.distanceMeters) || route.distanceMeters < straightLineReferenceMeters) throw new Error("route_provider_distance_invalid");
      return this.repository.save({
        id: this.nextId(), requestId: request.requestId, provider: "amap", providerVersion: route.providerVersion,
        generatedAt: route.generatedAt, expiresAt: route.expiresAt, state: "fresh",
        authoritativeCoordinates: { origin: { ...request.origin }, destination: { ...request.destination } }, providerCoordinateSystem: "GCJ-02",
        mode: request.mode,
        distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds, straightLineReferenceMeters,
        navigationUsable: true, geometry: route.geometry, warning: null,
      });
    } catch {
      const cached = await this.repository.findUsable(request);
      if (cached) return { ...cached, state: "cached", warning: "路线供应商不可用，当前显示有来源且未过期的缓存路线" };
      return {
        id: this.nextId(), requestId: request.requestId, provider: "amap", providerVersion: "unavailable",
        generatedAt: new Date(0).toISOString(), expiresAt: new Date(0).toISOString(), state: "missing",
        authoritativeCoordinates: { origin: { ...request.origin }, destination: { ...request.destination } }, providerCoordinateSystem: "GCJ-02",
        mode: request.mode,
        distanceMeters: null, durationSeconds: null, straightLineReferenceMeters, navigationUsable: false, geometry: null,
        warning: "路线不可用；直线距离仅作方位参考，不能替代驾车或步行导航",
      };
    }
  }
}
