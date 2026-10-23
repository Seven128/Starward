import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUnrestrictedProfile } from "@starward/domain/preferences";

const runtime = vi.hoisted(() => ({
  hydratePreferenceRuntime: vi.fn(),
  persistActiveProfile: vi.fn(),
  persistPreferenceProfile: vi.fn(),
  persistShellDestination: vi.fn(),
  persistShellLocation: vi.fn(),
}));
vi.mock("./preferences-runtime", () => runtime);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe("shell startup recovery", () => {
  beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); });

  it("restores the other saved fields even after an early tab selection succeeds", async () => {
    const saved = { ...createUnrestrictedProfile(), id: "saved-family", name: "家人观星" };
    runtime.hydratePreferenceRuntime.mockResolvedValue({
      profiles: [saved], activeProfileId: saved.id,
      location: { source: "manual", label: "已保存出发地" }, activeDestination: "map",
    });
    const { useShellStore } = await import("./shell-store");
    await useShellStore.getState().setDestination("sky");
    await useShellStore.getState().hydrateFromRuntime();
    expect(runtime.hydratePreferenceRuntime).toHaveBeenCalledOnce();
    expect(useShellStore.getState()).toMatchObject({
      activeDestination: "sky", activeProfileId: saved.id,
      location: { source: "manual", label: "已保存出发地" },
    });
    expect(useShellStore.getState().profiles).toContainEqual(saved);
  });

  it("does not overwrite a newly saved location when startup read finishes late", async () => {
    const read = deferred<{ profiles: never[]; location: { source: "manual"; label: string } }>();
    runtime.hydratePreferenceRuntime.mockReturnValue(read.promise);
    const { useShellStore } = await import("./shell-store");
    const hydration = useShellStore.getState().hydrateFromRuntime();
    await useShellStore.getState().setManualLocation("本轮出发地");
    read.resolve({ profiles: [], location: { source: "manual", label: "旧出发地" } });
    await hydration;
    expect(useShellStore.getState().location).toEqual({ source: "manual", label: "本轮出发地" });
  });

  it("shares the startup read and keeps restoration independent from a pending save", async () => {
    const read = deferred<{ profiles: never[] }>();
    const save = deferred<void>();
    runtime.hydratePreferenceRuntime.mockReturnValue(read.promise);
    runtime.persistShellDestination.mockReturnValue(save.promise);
    const { useShellStore } = await import("./shell-store");
    const hydration = useShellStore.getState().hydrateFromRuntime();
    expect(useShellStore.getState().hydrateFromRuntime()).toBe(hydration);
    const writing = useShellStore.getState().setDestination("map");
    expect(useShellStore.getState()).toMatchObject({ hydrationState: "loading", persistenceState: "saving" });
    read.resolve({ profiles: [] });
    await hydration;
    expect(useShellStore.getState()).toMatchObject({ hydrationState: "ready", persistenceState: "saving" });
    save.resolve();
    await writing;
    await useShellStore.getState().hydrateFromRuntime();
    expect(runtime.hydratePreferenceRuntime).toHaveBeenCalledOnce();
    expect(useShellStore.getState()).toMatchObject({ activeDestination: "map", persistenceState: "ready" });
  });

  it("merges other restored profiles without replacing a new saved profile or active choice", async () => {
    const old = { ...createUnrestrictedProfile(), id: "first", name: "旧设置" };
    const other = { ...old, id: "second", name: "另一预设" };
    const edited = { ...old, revision: 2, name: "本轮设置" };
    const read = deferred<{ profiles: typeof old[]; activeProfileId: string }>();
    runtime.hydratePreferenceRuntime.mockReturnValue(read.promise);
    const { useShellStore } = await import("./shell-store");
    const hydration = useShellStore.getState().hydrateFromRuntime();
    await useShellStore.getState().saveProfile(edited);
    read.resolve({ profiles: [old, other], activeProfileId: other.id });
    await hydration;
    expect(useShellStore.getState().profiles).toEqual([edited, other]);
    expect(useShellStore.getState()).toMatchObject({ activeProfileId: edited.id, recommendationState: "stale" });
  });

  it("preserves an explicit neutral-profile selection while recovering saved custom profiles", async () => {
    const custom = { ...createUnrestrictedProfile(), id: "custom", name: "旧预设" };
    runtime.hydratePreferenceRuntime.mockResolvedValue({ profiles: [custom], activeProfileId: custom.id });
    const { useShellStore } = await import("./shell-store");
    await useShellStore.getState().activateProfile("base");
    await useShellStore.getState().hydrateFromRuntime();
    expect(useShellStore.getState().activeProfileId).toBe("base");
    expect(useShellStore.getState().profiles.map((profile) => profile.id)).toEqual(["custom", "base"]);
  });

  it("retries a failed read even after a save succeeds and does not clear an unrelated write error", async () => {
    runtime.hydratePreferenceRuntime.mockRejectedValueOnce(new Error("database_unavailable"))
      .mockResolvedValueOnce({ profiles: [], location: { source: "manual", label: "已保存位置" } });
    const { useShellStore } = await import("./shell-store");
    await useShellStore.getState().hydrateFromRuntime();
    await useShellStore.getState().setDestination("map");
    expect(useShellStore.getState()).toMatchObject({ hydrationState: "error", persistenceState: "ready" });
    runtime.persistPreferenceProfile.mockRejectedValueOnce(new Error("write_failed"));
    await expect(useShellStore.getState().saveProfile(createUnrestrictedProfile())).rejects.toThrow("write_failed");
    await useShellStore.getState().hydrateFromRuntime();
    expect(useShellStore.getState()).toMatchObject({
      hydrationState: "ready", hydrationError: null, persistenceState: "error",
      location: { source: "manual", label: "已保存位置" },
    });
    expect(useShellStore.getState().persistenceError).toContain("偏好预设");
  });

  it("keeps an earlier failed write recoverable when a retry was queued before it failed", async () => {
    const first = deferred<void>();
    runtime.persistShellLocation.mockReturnValueOnce(first.promise).mockResolvedValueOnce(undefined);
    const { useShellStore } = await import("./shell-store");
    const failed = useShellStore.getState().setManualLocation("第一次");
    const retry = useShellStore.getState().setManualLocation("重试位置");
    const rejection = expect(failed).rejects.toThrow("write_failed");
    first.reject(new Error("write_failed"));
    await rejection;
    await retry;
    expect(useShellStore.getState()).toMatchObject({ persistenceState: "ready", persistenceError: null, location: { label: "重试位置" } });
  });
});

describe("accepted device location persistence", () => {
  const fix = { latitude: 0, longitude: 0, accuracyMeters: 7.25, timestampMs: 1_792_757_000_000, coordinateSystem: "WGS84" as const };
  beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); });

  it("saves a valid zero coordinate with the actual accuracy and sampling time", async () => {
    const { useShellStore } = await import("./shell-store");
    expect(await useShellStore.getState().setDeviceLocation("当前位置", fix)).toBe(true);
    expect(runtime.persistShellLocation).toHaveBeenCalledWith({ source: "device", label: "当前位置", ...fix });
    expect(useShellStore.getState().location).toEqual({ source: "device", label: "当前位置", ...fix });
    await expect(useShellStore.getState().setDeviceLocation("当前位置", { ...fix, latitude: Number.NaN })).rejects.toThrow("device_location_fix_invalid");
    expect(runtime.persistShellLocation).toHaveBeenCalledOnce();
  });

  it("does not dispatch a queued fix after cancellation", async () => {
    const blocked = deferred<void>();
    runtime.persistShellDestination.mockReturnValue(blocked.promise);
    const { useShellStore } = await import("./shell-store");
    const saving = useShellStore.getState().setDestination("me");
    const controller = new AbortController();
    const location = useShellStore.getState().setDeviceLocation("当前位置", fix, controller.signal);
    controller.abort();
    blocked.resolve();
    await saving;
    await expect(location).resolves.toBe(false);
    expect(runtime.persistShellLocation).not.toHaveBeenCalled();
    expect(useShellStore.getState().location.source).toBe("unset");
  });

  it("serializes a newer manual choice after a dispatched device save", async () => {
    const device = deferred<void>();
    runtime.persistShellLocation.mockReturnValueOnce(device.promise).mockResolvedValueOnce(undefined);
    const { useShellStore } = await import("./shell-store");
    const first = useShellStore.getState().setDeviceLocation("当前位置", fix);
    await vi.waitFor(() => expect(runtime.persistShellLocation).toHaveBeenCalledOnce());
    const manual = useShellStore.getState().setManualLocation("新手动位置");
    expect(runtime.persistShellLocation).toHaveBeenCalledOnce();
    device.resolve();
    await first;
    await manual;
    expect(runtime.persistShellLocation).toHaveBeenLastCalledWith({ source: "manual", label: "新手动位置" });
    expect(useShellStore.getState().location).toEqual({ source: "manual", label: "新手动位置" });
  });
});
