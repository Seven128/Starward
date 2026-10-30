export interface NativeMapRasterOwner {
  dispose(): Promise<unknown>;
  /** Only real native removal settles this; a JS timeout/unmount does not. */
  retired: Promise<void>;
  hasResources(): boolean;
}

export const NATIVE_MAP_RETIREMENT_MESSAGE = "地图暂时无法再次加载，请重启微信后再试。";
export const NATIVE_MAP_RASTER_RETIREMENT_MESSAGE = "旧地图图层仍在清理，完成后会自动恢复。";

export interface NativeMapSession {
  mapId: string;
  isCurrent(): boolean;
  canInstallRasters(): boolean;
  /** Keep a fault predecessor's native node available for real late removals. */
  retiringMapIds(): string[];
  registerRaster(owner: NativeMapRasterOwner): () => void;
  retire(): void;
  recover(): NativeMapSession | null;
}

/** Native-node identity and terminal resource ownership share one lifetime.
 * One fault successor can remain useful while its predecessor is uncertain.
 * A second fault cannot create a chain of old Maps, even without file pins.
 * Real overlay removals settle only raster ownership; the old native Map's
 * destruction has no qualified acknowledgement in this runtime. Its single
 * unknown lifetime therefore remains until the appservice itself restarts.
 * An external unload can
 * retire that successor, but later pages admit no raster work until the real
 * removals clear the debt. This is a finite lifecycle, not a memory budget or
 * evidence that replacing a native node reclaimed its physical resources.
 */
export function createNativeMapSessions() {
  let serial = 0;
  const retired = new Set<Session>();
  let unknownNativeMap: Session | null = null;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  interface Session {
    mapId: string;
    active: boolean;
    resources: Set<NativeMapRasterOwner>;
    predecessor: Session | null;
  }
  const create = (predecessor: Session | null = null): NativeMapSession => {
    const state: Session = { mapId: `spot-map-${++serial}`, active: true, resources: new Set(), predecessor };
    const canInstallRasters = () => state.active && (retired.size === 0
      || retired.size === 1 && state.predecessor !== null && retired.has(state.predecessor));
    const retainRetirement = () => {
      if (state.active || ![...state.resources].some(owner => owner.hasResources())) return;
      retired.add(state);
    };
    const retire = () => {
      if (!state.active) return;
      state.active = false;
      for (const owner of state.resources) void owner.dispose();
      retainRetirement();
      notify();
    };
    return {
      mapId: state.mapId,
      isCurrent: () => state.active,
      canInstallRasters,
      retiringMapIds: () => state.active && state.predecessor && retired.has(state.predecessor)
        ? [state.predecessor.mapId] : [],
      registerRaster(owner: NativeMapRasterOwner) {
        state.resources.add(owner);
        void owner.retired.then(() => {
          state.resources.delete(owner);
          if (!state.active && ![...state.resources].some(resource => resource.hasResources()) && retired.delete(state)) notify();
        });
        if (!state.active) { void owner.dispose(); retainRetirement(); }
        // Cleanup disposes this exact coordinator; its unresolved ownership
        // remains registered until that coordinator's real removals finish.
        return () => { if (state.active) void owner.dispose(); };
      },
      retire,
      recover() {
        if (!state.active || unknownNativeMap || retired.size !== 0) return null;
        unknownNativeMap = state;
        retire();
        return create(retired.has(state) ? state : null);
      },
    };
  };
  return {
    create,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

export const nativeMapSessions = createNativeMapSessions();
