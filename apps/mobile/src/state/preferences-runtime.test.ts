import { createHash, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUnrestrictedProfile } from "@starward/domain/preferences";
import type { PreferenceRuntimeStorage } from "@starward/domain/preferences/runtime";

const boundary = vi.hoisted(() => ({ createPreferenceStorage: vi.fn() }));
vi.mock("./preferences-storage", () => boundary);
vi.mock("expo-crypto", () => ({
  randomUUID: () => randomUUID(), CryptoDigestAlgorithm: { SHA256: "SHA256" },
  digestStringAsync: async (_algorithm: string, value: string) => createHash("sha256").update(value).digest("hex"),
}));

describe("native preference runtime recovery", () => {
  beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); });

  function storage() {
    const rows = new Map<string, string>();
    const port: PreferenceRuntimeStorage = {
      kind: "sqlite", read: async (key) => rows.get(key) ?? null,
      write: async (key, value) => { rows.set(key, value); },
    };
    boundary.createPreferenceStorage.mockResolvedValue(port);
    return port;
  }

  it("reopens after an initial native database open failure", async () => {
    const port = storage();
    boundary.createPreferenceStorage.mockRejectedValueOnce(new Error("sqlite_open_failed")).mockResolvedValue(port);
    const { hydratePreferenceRuntime } = await import("./preferences-runtime");
    await expect(hydratePreferenceRuntime()).rejects.toThrow("sqlite_open_failed");
    await expect(hydratePreferenceRuntime()).resolves.toMatchObject({ profiles: [] });
    expect(boundary.createPreferenceStorage).toHaveBeenCalledTimes(2);
  });

  it("restores profiles and exact location metadata through a new runtime instance", async () => {
    storage();
    let runtime = await import("./preferences-runtime");
    const profile = { ...createUnrestrictedProfile(), id: "profile-a", name: "本机预设" };
    const location = { source: "device" as const, label: "当前位置", latitude: 0, longitude: 0, accuracyMeters: null, timestampMs: 1_792_757_000_000, coordinateSystem: "WGS84" as const, mocked: false };
    await runtime.persistPreferenceProfile(profile);
    await runtime.persistShellLocation(location);
    await runtime.persistShellDestination("map");
    vi.resetModules();
    runtime = await import("./preferences-runtime");
    expect(await runtime.hydratePreferenceRuntime()).toEqual({ profiles: [profile], activeProfileId: profile.id, location, activeDestination: "map" });
    expect(boundary.createPreferenceStorage).toHaveBeenCalledTimes(2);
  });

  it("retains legacy coordinates without fabricating missing accuracy or capture time", async () => {
    storage();
    const runtime = await import("./preferences-runtime");
    await runtime.persistShellLocation({ source: "device", label: "旧位置", latitude: 0, longitude: 40 });
    expect((await runtime.hydratePreferenceRuntime()).location).toEqual({ source: "device", label: "旧位置", latitude: 0, longitude: 40 });
    await runtime.persistShellLocation({ source: "device", label: "坏位置", latitude: 200, longitude: 40 });
    expect((await runtime.hydratePreferenceRuntime()).location?.label).toBe("旧位置");
  });
});
