import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NativePermissionActivityModule } from "../../../modules/permission-handoff";

const environment = vi.hoisted(() => ({ os: "android", module: null as unknown }));
vi.mock("react-native", () => ({ Platform: { get OS() { return environment.os; } } }));
vi.mock("expo-modules-core", () => ({ requireOptionalNativeModule: () => environment.module }));

const initial = {
  moduleId: "native-module-a",
  activityId: 1,
  pauseEpoch: 7,
  stopEpoch: 3,
  resumed: true,
  available: true,
};

function nativeBridge() {
  let current: unknown = { ...initial };
  const listeners = new Set<(payload: unknown) => void>();
  const prepare = vi.fn(async () => current);
  const read = vi.fn(() => current);
  const remove = vi.fn();
  const addListener = vi.fn((_event: string, listener: (payload: unknown) => void) => {
    listeners.add(listener);
    return { remove() { listeners.delete(listener); remove(); } };
  });
  return {
    native: { prepare, read, addListener } as unknown as NativePermissionActivityModule,
    prepare, read, remove, addListener,
    set(value: unknown) { current = value; },
    event(payload: unknown) { for (const listener of listeners) listener(payload); },
    get listenerCount() { return listeners.size; },
  };
}

describe("permission Activity native fact gateway", () => {
  beforeEach(() => {
    vi.resetModules();
    environment.os = "android";
    environment.module = null;
  });

  it("reads immutable complete native facts without resetting an existing identity or epochs", async () => {
    const bridge = nativeBridge();
    environment.module = bridge.native;
    const { expoPermissionActivityGateway: gateway } = await import("./permission-handoff-gateway");
    const baseline = await gateway.prepare();
    expect(baseline).toEqual(initial);
    expect(Object.isFrozen(baseline)).toBe(true);
    bridge.set({ ...initial, pauseEpoch: 8, resumed: false });
    expect(gateway.read()).toEqual({ ...initial, pauseEpoch: 8, resumed: false });
    bridge.set({ ...initial, pauseEpoch: 8, stopEpoch: 4, resumed: false, available: false });
    expect(gateway.read()).toEqual({ ...initial, pauseEpoch: 8, stopEpoch: 4, resumed: false, available: false });
    expect(baseline).toEqual(initial);
    expect(bridge.prepare).toHaveBeenCalledOnce();
  });

  it("uses events only to wake a live subscriber; queued event payload cannot overwrite a newer synchronous read", async () => {
    const bridge = nativeBridge();
    const { createPermissionActivityGateway } = await import("./permission-handoff-gateway");
    const gateway = createPermissionActivityGateway(bridge.native);
    const observations: unknown[] = [];
    const unsubscribe = gateway.subscribe(() => observations.push(gateway.read()));
    expect(unsubscribe).toBeTypeOf("function");
    expect(bridge.listenerCount).toBe(1);
    bridge.set({ ...initial, activityId: 2, pauseEpoch: 9, stopEpoch: 4 });
    bridge.event(initial);
    expect(observations).toEqual([{ ...initial, activityId: 2, pauseEpoch: 9, stopEpoch: 4 }]);
    unsubscribe!();
    unsubscribe!();
    bridge.event(initial);
    expect(bridge.remove).toHaveBeenCalledOnce();
    expect(bridge.listenerCount).toBe(0);
    expect(observations).toHaveLength(1);
  });

  it.each([
    null,
    {},
    { ...initial, activityId: null },
    { ...initial, activityId: 0 },
    { ...initial, activityId: undefined },
    { ...initial, moduleId: "" },
    { ...initial, pauseEpoch: -1 },
    { ...initial, stopEpoch: Number.MAX_SAFE_INTEGER + 1 },
    { ...initial, stopEpoch: NaN },
    { ...initial, resumed: "true" },
    { ...initial, available: false },
  ])("keeps missing or malformed native facts unavailable (%j)", async (invalid) => {
    const bridge = nativeBridge();
    bridge.set(invalid);
    const { createPermissionActivityGateway } = await import("./permission-handoff-gateway");
    const gateway = createPermissionActivityGateway(bridge.native);
    expect(await gateway.prepare()).toBeNull();
    expect(gateway.read()).toBeNull();
  });

  it("preserves a native unavailable snapshot without turning its missing Activity into identity zero", async () => {
    const bridge = nativeBridge();
    bridge.set({ ...initial, activityId: null, resumed: false, available: false });
    const { createPermissionActivityGateway } = await import("./permission-handoff-gateway");
    const gateway = createPermissionActivityGateway(bridge.native);
    expect(await gateway.prepare()).toEqual({ ...initial, activityId: null, resumed: false, available: false });
  });

  it("fails closed for an absent or failed native bridge, including unavailable event subscription", async () => {
    const { createPermissionActivityGateway } = await import("./permission-handoff-gateway");
    const absent = createPermissionActivityGateway(null);
    expect(await absent.prepare()).toBeNull();
    expect(absent.read()).toBeNull();
    expect(absent.subscribe(vi.fn())).toBeNull();
    const bridge = nativeBridge();
    bridge.prepare.mockRejectedValueOnce(new Error("native_runtime_gone"));
    bridge.read.mockImplementationOnce(() => { throw new Error("native_runtime_gone"); });
    bridge.addListener.mockImplementationOnce(() => { throw new Error("native_runtime_gone"); });
    const failed = createPermissionActivityGateway(bridge.native);
    expect(await failed.prepare()).toBeNull();
    expect(failed.read()).toBeNull();
    expect(failed.subscribe(vi.fn())).toBeNull();
    expect(bridge.listenerCount).toBe(0);
  });

  it.each(["ios", "web"])("does not synthesize Android facts on %s", async (platform) => {
    const bridge = nativeBridge();
    environment.os = platform;
    environment.module = bridge.native;
    const { expoPermissionActivityGateway: gateway } = await import("./permission-handoff-gateway");
    expect(await gateway.prepare()).toBeNull();
    expect(gateway.read()).toBeNull();
    expect(gateway.subscribe(vi.fn())).toBeNull();
    expect(bridge.prepare).not.toHaveBeenCalled();
    expect(bridge.listenerCount).toBe(0);
  });
});
