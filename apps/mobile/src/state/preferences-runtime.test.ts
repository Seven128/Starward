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
      compareAndSwap: vi.fn(async (key, expected, value) => {
        if ((rows.get(key) ?? null) !== expected) return false;
        rows.set(key, value);
        return true;
      }),
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
    await expect(runtime.persistShellLocation({ source: "device", label: "坏位置", latitude: 200, longitude: 40 })).rejects.toThrow();
    expect((await runtime.hydratePreferenceRuntime()).location?.label).toBe("旧位置");
  });

  it("retries an unknown save with its original prepared identity and current projection", async () => {
    const port = storage();
    const read = port.read;
    const compareAndSwap = port.compareAndSwap;
    let unavailable = false;
    let committed = false;
    port.read = async (key) => {
      if (unavailable) throw new Error("database_temporarily_unavailable");
      return read(key);
    };
    port.compareAndSwap = vi.fn(async (key, expected, value) => {
      const changed = await compareAndSwap(key, expected, value);
      if (changed && !committed) { committed = true; unavailable = true; throw new Error("reply_lost"); }
      return changed;
    });
    const runtime = await import("./preferences-runtime");
    const profile = { ...createUnrestrictedProfile(), id: "uncertain", name: "待确认预设" };
    await expect(runtime.persistPreferenceProfile(profile)).rejects.toThrow();
    unavailable = false;
    const result = await runtime.persistPreferenceProfile(profile);
    expect(result.replayed).toBe(true);
    expect(result.projection).toMatchObject({ profiles: [profile], activeProfileId: profile.id, revision: 1 });
    expect(port.compareAndSwap).toHaveBeenCalledTimes(1);
    vi.resetModules();
    expect(await (await import("./preferences-runtime")).hydratePreferenceRuntime()).toMatchObject({ profiles: [profile], activeProfileId: profile.id });
  });

  it("replays an old save without making it current after another profile was selected", async () => {
    storage();
    const runtime = await import("./preferences-runtime");
    const first = { ...createUnrestrictedProfile(), id: "first", name: "第一预设" };
    const second = { ...first, id: "second", name: "第二预设" };
    await runtime.persistPreferenceProfile(first);
    await runtime.persistPreferenceProfile(second);
    const replay = await runtime.persistPreferenceProfile(first);
    expect(replay.replayed).toBe(true);
    expect(replay.projection.activeProfileId).toBe(second.id);
    expect((await runtime.hydratePreferenceRuntime()).activeProfileId).toBe(second.id);
  });

  it("refuses to relabel a mutated candidate as the success of its original command", async () => {
    storage();
    const runtime = await import("./preferences-runtime");
    const profile = { ...createUnrestrictedProfile(), id: "immutable", name: "原始输入" };
    await runtime.persistPreferenceProfile(profile);
    profile.name = "不同输入";
    await expect(runtime.persistPreferenceProfile(profile)).rejects.toThrow("preference_runtime_candidate_changed");
    expect((await runtime.hydratePreferenceRuntime()).profiles[0].name).toBe("原始输入");
  });

  it("can explicitly retry a never-written command whose prepared fence became stale", async () => {
    const port = storage();
    const read = port.read;
    let release!: () => void;
    let reached!: () => void;
    const paused = new Promise<void>((resolve) => { reached = resolve; });
    const resume = new Promise<void>((resolve) => { release = resolve; });
    let intercepted = false;
    port.read = async (key) => {
      const value = await read(key);
      if (!intercepted) { intercepted = true; reached(); await resume; }
      return value;
    };
    const facade = await import("./preferences-runtime");
    const profile = { ...createUnrestrictedProfile(), id: "local", name: "本轮预设" };
    const first = facade.persistPreferenceProfile(profile);
    const duplicate = facade.persistPreferenceProfile(profile);
    expect(duplicate).toBe(first);
    const failed = expect(first).rejects.toThrow("preference_runtime_stale_command");
    await paused;
    const { createPreferencesRuntime } = await import("@starward/domain/preferences/runtime");
    const other = await createPreferencesRuntime({ storage: port });
    const external = { ...profile, id: "external", name: "其他窗口预设" };
    await other.execute(await other.prepare({ outcome: "mobile-shell-and-preferences", actorId: "personal-trial-owner", operation: "preference.save", idempotencyKey: "intervening-save", payload: { token: external.name, profile: external } }));
    release();
    await failed;
    const retry = await facade.persistPreferenceProfile(profile);
    expect(retry.projection).toMatchObject({ activeProfileId: profile.id, revision: 2 });
    expect(retry.projection.profiles).toEqual([external, profile]);
    expect(port.compareAndSwap).toHaveBeenCalledTimes(2);
  });

  it("never renews an unknown committed command after its receipt was retired", async () => {
    const port = storage();
    const read = port.read;
    const compareAndSwap = port.compareAndSwap;
    let unavailable = false;
    let loseReply = true;
    port.read = async (key) => {
      if (unavailable) throw new Error("read_reply_lost");
      return read(key);
    };
    port.compareAndSwap = async (key, expected, value) => {
      const result = await compareAndSwap(key, expected, value);
      if (result && loseReply) { loseReply = false; unavailable = true; throw new Error("write_reply_lost"); }
      return result;
    };
    const facade = await import("./preferences-runtime");
    const original = { ...createUnrestrictedProfile(), id: "profile", name: "旧预设" };
    await expect(facade.persistPreferenceProfile(original)).rejects.toThrow("preference_runtime_commit_unknown");
    unavailable = false;
    const { createPreferencesRuntime } = await import("@starward/domain/preferences/runtime");
    const other = await createPreferencesRuntime({ storage: port });
    const replacement = { ...original, revision: 2, name: "后来的预设" };
    await other.execute(await other.prepare({ outcome: "mobile-shell-and-preferences", actorId: "personal-trial-owner", operation: "preference.save", idempotencyKey: "replace-profile", payload: { token: replacement.name, profile: replacement } }));
    await expect(facade.persistPreferenceProfile(original)).rejects.toThrow("preference_runtime_stale_command");
    await expect(facade.persistPreferenceProfile(original)).rejects.toThrow("preference_runtime_stale_command");
    expect((await facade.hydratePreferenceRuntime()).profiles).toEqual([replacement]);
    expect(compareAndSwap).toHaveBeenCalledTimes(2);
  });
});
