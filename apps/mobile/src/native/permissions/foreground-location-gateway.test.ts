import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocationObject } from "expo-location";
import type { ForegroundLocationGateway } from "./foreground-location-gateway";

const native = vi.hoisted(() => ({ hasServicesEnabledAsync: vi.fn(), getCurrentPositionAsync: vi.fn(), watchPositionAsync: vi.fn(), Accuracy: { Balanced: 3 } }));
vi.mock("expo-location", () => native);

const sample: LocationObject = {
  coords: { latitude: 0, longitude: 121.47, accuracy: 12.5, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
  timestamp: 1_792_757_000_000,
  mocked: false,
};

describe("Expo foreground position adapter", () => {
  let gateway: ForegroundLocationGateway;
  beforeEach(async () => {
    vi.resetAllMocks(); vi.resetModules();
    native.hasServicesEnabledAsync.mockResolvedValue(true);
    gateway = (await import("./foreground-location-gateway")).expoForegroundLocationGateway;
  });

  it("uses an actual one-shot result, including legal zero coordinates and provenance", async () => {
    native.getCurrentPositionAsync.mockResolvedValue(sample);
    await expect(gateway.getFix(new AbortController().signal)).resolves.toEqual({ latitude: 0, longitude: 121.47, accuracyMeters: 12.5, timestampMs: sample.timestamp, coordinateSystem: "WGS84", mocked: false });
    expect(native.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3, mayShowUserSettingsDialog: false });
    expect(native.watchPositionAsync).not.toHaveBeenCalled();
  });

  it("removes cancelled readers while retaining one native acquisition across reopen", async () => {
    let complete!: (value: LocationObject) => void;
    native.getCurrentPositionAsync.mockImplementation(() => new Promise<LocationObject>((resolve) => { complete = resolve; }));
    for (let index = 0; index < 3; index++) {
      const controller = new AbortController();
      const result = gateway.getFix(controller.signal);
      const rejected = expect(result).rejects.toThrow("cancelled");
      await vi.waitFor(() => expect(native.getCurrentPositionAsync).toHaveBeenCalledOnce());
      controller.abort();
      await rejected;
    }
    const active = gateway.getFix(new AbortController().signal);
    complete(sample);
    await expect(active).resolves.toMatchObject({ latitude: 0, timestampMs: sample.timestamp });
    expect(native.getCurrentPositionAsync).toHaveBeenCalledOnce();
    native.getCurrentPositionAsync.mockResolvedValue({ ...sample, timestamp: sample.timestamp + 1000 });
    await expect(gateway.getFix(new AbortController().signal)).resolves.toMatchObject({ timestampMs: sample.timestamp + 1000 });
    expect(native.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it("one reader can cancel without cancelling another reader's result", async () => {
    let complete!: (value: LocationObject) => void;
    native.getCurrentPositionAsync.mockImplementation(() => new Promise<LocationObject>((resolve) => { complete = resolve; }));
    const controller = new AbortController();
    const first = gateway.getFix(controller.signal);
    const rejected = expect(first).rejects.toThrow("cancelled");
    const second = gateway.getFix(new AbortController().signal);
    await vi.waitFor(() => expect(native.getCurrentPositionAsync).toHaveBeenCalledOnce());
    controller.abort(); await rejected;
    complete(sample);
    await expect(second).resolves.toMatchObject({ longitude: 121.47 });
  });

  it("does not start positioning after cancellation during service preflight", async () => {
    let ready!: (value: boolean) => void;
    native.hasServicesEnabledAsync.mockImplementation(() => new Promise<boolean>((resolve) => { ready = resolve; }));
    const controller = new AbortController();
    const result = gateway.getFix(controller.signal);
    const rejected = expect(result).rejects.toThrow("cancelled");
    controller.abort(); await rejected;
    ready(true);
    await Promise.resolve(); await Promise.resolve();
    expect(native.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("consumes a native rejection after the last reader leaves and releases the owner for recovery", async () => {
    let failNative!: (error: Error) => void;
    native.getCurrentPositionAsync.mockImplementationOnce(() => new Promise<LocationObject>((_resolve, reject) => { failNative = reject; }));
    const controller = new AbortController();
    const added = vi.spyOn(controller.signal, "addEventListener");
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    const result = gateway.getFix(controller.signal);
    const rejected = expect(result).rejects.toThrow("foreground_location_cancelled");
    await vi.waitFor(() => expect(native.getCurrentPositionAsync).toHaveBeenCalledOnce());
    controller.abort();
    await rejected;
    expect(removed).toHaveBeenCalledWith("abort", added.mock.calls[0]![1]);
    failNative(new Error("late_native_failure"));
    // Let the native promise and owner settlement complete without any reader.
    await Promise.resolve(); await Promise.resolve();
    native.getCurrentPositionAsync.mockResolvedValueOnce({ ...sample, timestamp: sample.timestamp + 1000 });
    await expect(gateway.getFix(new AbortController().signal)).resolves.toMatchObject({ timestampMs: sample.timestamp + 1000 });
    expect(native.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it("keeps disabled, failed and invalid fixes unavailable and allows a new request after settlement", async () => {
    native.hasServicesEnabledAsync.mockResolvedValueOnce(false);
    await expect(gateway.getFix(new AbortController().signal)).rejects.toThrow("services_disabled");
    expect(native.getCurrentPositionAsync).not.toHaveBeenCalled();
    native.getCurrentPositionAsync.mockRejectedValueOnce(new Error("native details must not escape"));
    await expect(gateway.getFix(new AbortController().signal)).rejects.toThrow("foreground_location_unavailable");
    native.getCurrentPositionAsync.mockResolvedValueOnce({ ...sample, coords: { ...sample.coords, longitude: Number.NaN } });
    await expect(gateway.getFix(new AbortController().signal)).rejects.toThrow("fix_invalid");
    native.getCurrentPositionAsync.mockResolvedValue(sample);
    await expect(gateway.getFix(new AbortController().signal)).resolves.toMatchObject({ latitude: 0 });
    expect(native.getCurrentPositionAsync).toHaveBeenCalledTimes(3);
  });
});
