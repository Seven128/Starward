import type { ForegroundLocationGateway } from "../native/permissions/foreground-location-gateway";
import type { PermissionDecision, PermissionGateway } from "../native/permissions/permission-gateway";
import type { DeviceLocationFix } from "../state/shell-location";

export interface DeviceLocationSelectionState {
  phase: "idle" | "requesting" | "locating" | "saving" | "saved" | "denied" | "unavailable" | "error";
  permission: PermissionDecision;
  canAskAgain: boolean;
  message: string | null;
}

export function createDeviceLocationSelection(dependencies: {
  permission: PermissionGateway;
  location: ForegroundLocationGateway;
  save(fix: DeviceLocationFix, signal: AbortSignal): Promise<boolean>;
}) {
  let state: DeviceLocationSelectionState = { phase: "idle", permission: "undetermined", canAskAgain: true, message: null };
  let active: { controller: AbortController; result: Promise<boolean> } | null = null;
  const listeners = new Set<() => void>();
  const update = (next: Partial<DeviceLocationSelectionState>) => {
    state = { ...state, ...next };
    for (const notify of listeners) notify();
  };

  return {
    getState: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    cancel() {
      const previous = active;
      active = null;
      previous?.controller.abort();
      update({ phase: "idle", message: null });
    },
    request(): Promise<boolean> {
      if (active) return active.result;
      const controller = new AbortController();
      const current = () => active?.controller === controller && !controller.signal.aborted;
      update({ phase: "requesting", message: null });
      const result = Promise.resolve().then(async () => {
        if (!current()) return false;
        try {
          let permission = await dependencies.permission.getForegroundLocationStatus();
          if (!current()) return false;
          if (permission.decision !== "granted" && permission.canAskAgain) {
            permission = await dependencies.permission.requestForegroundLocation();
            if (!current()) return false;
          }
          update({ permission: permission.decision, canAskAgain: permission.canAskAgain });
          if (permission.decision !== "granted") {
            update({ phase: "denied", message: permission.canAskAgain
              ? "未获得位置权限，可以重试或手动选择地点。"
              : "位置权限已关闭；可在系统设置中开启，或继续手动选择地点。" });
            return false;
          }
          update({ phase: "locating" });
          const fix = await dependencies.location.getFix(controller.signal);
          if (!current()) return false;
          update({ phase: "saving" });
          const saved = await dependencies.save(fix, controller.signal);
          if (!current()) return false;
          update({ phase: saved ? "saved" : "idle" });
          return saved;
        } catch {
          if (!current()) return false;
          const saving = state.phase === "saving";
          update({ phase: saving ? "error" : "unavailable", message: saving
            ? "已取得设备位置，但未保存成功；原位置保留，请重试。"
            : "暂时无法取得设备位置，请检查定位服务后重试，或手动选择地点。" });
          return false;
        } finally {
          if (active?.controller === controller) active = null;
        }
      });
      active = { controller, result };
      return result;
    },
  };
}
