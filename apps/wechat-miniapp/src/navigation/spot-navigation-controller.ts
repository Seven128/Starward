import type { AccessAndSafetyState, DataState, SpotSummary } from "@starward/miniapp-contracts";

export type NavigationSpot = Pick<SpotSummary, "spotId" | "name" | "address" | "status" | "visibilityPolicy" | "gcj02" | "wgs84">;
export interface SpotNavigationSnapshot {
  scope: string;
  version: string;
  available: boolean;
  spot: NavigationSpot | null;
  safety: AccessAndSafetyState | null;
}
export type SpotNavigationFailure = "RESTRICTED" | "COORDINATES" | "SITE" | "OPTIONS" | "MAP" | "COPY" | "NATIVE";
const feedback: Record<SpotNavigationFailure, { title: string; body: string }> = {
  RESTRICTED: { title: "坐标不对外开放", body: "该点位不允许向外部地图发送精确坐标；请查看公开的到达说明。" },
  COORDINATES: { title: "坐标暂不可用", body: "地点坐标尚未确认，请查看到达说明或重新获取地点资料。" },
  SITE: { title: "到达资料尚未确认", body: "请重新获取当前点位的开放与安全信息后重试；原计划和出发安排仍保留。" },
  OPTIONS: { title: "导航选项暂未打开", body: "请重试并选择查看位置或复制坐标。" },
  MAP: { title: "外部地图未打开", body: "请稍后重试，或查看到达说明。" },
  COPY: { title: "坐标未能复制", body: "请重试复制坐标；本次没有打开外部地图。" },
  NATIVE: { title: "本次导航操作未完成", body: "提示或复制操作暂不可用，请返回页面重试。" },
};
export const spotNavigationFeedback = (failure: SpotNavigationFailure) => feedback[failure];

type NavigationResource = { data: { dataState: DataState } | undefined; error: unknown; isInvalidated: boolean };
export function currentNavigationResource(resource: NavigationResource) {
  // Overview's aggregate state describes sky/weather, not the independently
  // published coordinates and safety. Transport fallback and samples are stale.
  return Boolean(resource.data && !resource.error && !resource.isInvalidated
    && resource.data.dataState !== "STALE_USABLE" && resource.data.dataState !== "SAMPLE_DATA");
}
export function currentNavigationSiteResource(resource: NavigationResource) {
  return currentNavigationResource(resource)
    && (resource.data?.dataState === "FRESH" || resource.data?.dataState === "PARTIAL");
}

function validPoint(point: { system: string; latitude: number; longitude: number } | undefined, system: string) {
  return Boolean(point && point.system === system && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
}
export function isCancelledSpotNavigation(error: unknown) {
  const message = error instanceof Error ? error.message : error && typeof error === "object" && "errMsg" in error
    ? String(error.errMsg) : String(error ?? "");
  return /cancel/iu.test(message);
}
const signature = (snapshot: SpotNavigationSnapshot) => JSON.stringify(snapshot);

/** One clearance/operation owner; callers supply their current published data, never saved coordinates. */
export function createSpotNavigationController(deps: {
  readSnapshot(): SpotNavigationSnapshot;
  isCurrent(): boolean;
  confirmHandoff(): Promise<boolean>;
  confirmBlocker(content: string): Promise<boolean>;
  chooseAction(canCopy: boolean): Promise<"MAP" | "COPY" | null>;
  openLocation(target: { latitude: number; longitude: number; name: string; address: string; scale: number }): Promise<unknown>;
  copyCoordinates(value: string): Promise<unknown>;
  confirmCopyFallback(): Promise<boolean>;
  report(failure: SpotNavigationFailure): void;
  onAttempt(): void;
  onBusy(busy: boolean): void;
}) {
  let visible = true, disposed = false, revision = 0;
  let pending: object | null = null;
  const open = async (options: boolean) => {
    if (disposed || !visible || pending || !deps.isCurrent()) return;
    const snapshot = deps.readSnapshot(), key = signature(snapshot), serial = revision;
    const token = {}; pending = token; deps.onBusy(true);
    const current = () => !disposed && visible && serial === revision && pending === token
      && deps.isCurrent() && signature(deps.readSnapshot()) === key;
    let stage: SpotNavigationFailure = "NATIVE";
    try {
      deps.onAttempt();
      const spot = snapshot.spot;
      if (!spot) { deps.report("SITE"); return; }
      if (spot.visibilityPolicy !== "PUBLIC_EXACT" || (spot.status !== "PUBLISHED" && spot.status !== "TEMPORARILY_CLOSED")) {
        deps.report("RESTRICTED"); return;
      }
      if (!validPoint(spot.gcj02, "GCJ02")) { deps.report("COORDINATES"); return; }
      if (!snapshot.available || !snapshot.safety) { deps.report("SITE"); return; }
      const target = { latitude: spot.gcj02.latitude, longitude: spot.gcj02.longitude, name: spot.name, address: spot.address, scale: 14 };
      const copy = validPoint(spot.wgs84, "WGS84") ? `${spot.wgs84.latitude},${spot.wgs84.longitude}` : null;
      if (!(await deps.confirmHandoff()) || !current()) return;
      const safety = snapshot.safety;
      if (spot.status === "TEMPORARILY_CLOSED" || safety.explicitDanger || safety.openness === "CLOSED"
        || safety.legalAccess === "PROHIBITED" || safety.nightSafety === "DANGER") {
        const content = [...safety.restrictions, ...safety.guidance].join("；") || "当前开放、进入或夜间安全状态不支持直接前往。";
        if (!(await deps.confirmBlocker(content)) || !current()) return;
      }
      let action: "MAP" | "COPY" | null = "MAP";
      if (options) { stage = "OPTIONS"; action = await deps.chooseAction(copy !== null); if (!current()) return; }
      if (action === null) return;
      if (action === "COPY") {
        if (copy === null) { deps.report("COORDINATES"); return; }
        stage = "COPY"; await deps.copyCoordinates(copy); return;
      }
      stage = "MAP";
      try { await deps.openLocation(target); }
      catch (error) {
        if (!current() || isCancelledSpotNavigation(error)) return;
        if (!options || copy === null) { deps.report("MAP"); return; }
        stage = "NATIVE";
        if (!(await deps.confirmCopyFallback()) || !current()) return;
        stage = "COPY"; await deps.copyCoordinates(copy);
      }
    } catch (error) {
      if (current() && !isCancelledSpotNavigation(error)) deps.report(stage);
    } finally {
      // Hide retires feedback, but an already-issued native operation holds its lock until settled.
      if (pending === token) { pending = null; if (!disposed) deps.onBusy(false); }
    }
  };
  return {
    openDirect: () => open(false), openOptions: () => open(true),
    invalidate: () => { revision += 1; },
    show: () => { if (!disposed) visible = true; },
    hide: () => { visible = false; revision += 1; },
    dispose: () => { disposed = true; visible = false; revision += 1; },
  };
}
