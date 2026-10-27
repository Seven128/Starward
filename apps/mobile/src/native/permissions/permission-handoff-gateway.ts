import { permissionActivityNative, type NativePermissionActivityModule } from "../../../modules/permission-handoff";

/** Facts about one captured Activity, not a determination of why it paused. */
export interface PermissionActivitySnapshot {
  readonly moduleId: string;
  readonly activityId: number | null;
  readonly pauseEpoch: number;
  readonly stopEpoch: number;
  readonly resumed: boolean;
  readonly available: boolean;
}

export interface PermissionActivityGateway {
  prepare(): Promise<PermissionActivitySnapshot | null>;
  read(): PermissionActivitySnapshot | null;
  /** A wake-up only; always call read(). Null means native subscription unavailable. */
  subscribe(listener: () => void): (() => void) | null;
}

function snapshotFromNative(value: unknown): PermissionActivitySnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const counter = (input: unknown): input is number => typeof input === "number" && Number.isSafeInteger(input) && input >= 0;
  if (
    typeof record.moduleId !== "string" || !record.moduleId.length || record.moduleId.length > 128 ||
    !counter(record.pauseEpoch) || !counter(record.stopEpoch) ||
    typeof record.available !== "boolean" || typeof record.resumed !== "boolean" ||
    (record.activityId !== null && (!counter(record.activityId) || record.activityId === 0)) ||
    (record.available && record.activityId === null) ||
    (record.resumed && !record.available)
  ) return null;
  return Object.freeze({
    moduleId: record.moduleId,
    activityId: record.activityId as number | null,
    pauseEpoch: record.pauseEpoch,
    stopEpoch: record.stopEpoch,
    resumed: record.resumed,
    available: record.available,
  });
}

export function createPermissionActivityGateway(native: NativePermissionActivityModule | null): PermissionActivityGateway {
  return {
    async prepare() {
      if (!native) return null;
      try { return snapshotFromNative(await native.prepare()); } catch { return null; }
    },
    read() {
      if (!native) return null;
      try { return snapshotFromNative(native.read()); } catch { return null; }
    },
    subscribe(listener) {
      if (!native) return null;
      try {
        let active = true;
        const subscription = native.addListener("onActivityVisibility", () => {
          if (active) listener();
        });
        return () => {
          if (!active) return;
          active = false;
          subscription.remove();
        };
      } catch { return null; }
    },
  };
}

export const expoPermissionActivityGateway = createPermissionActivityGateway(permissionActivityNative);
