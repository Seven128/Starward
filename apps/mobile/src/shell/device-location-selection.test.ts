import { describe, expect, it, vi } from "vitest";
import { createDeviceLocationSelection } from "./device-location-selection";
import type { DeviceLocationFix } from "../state/shell-location";
import type { ForegroundLocationResult } from "../native/permissions/permission-gateway";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const fix: DeviceLocationFix = { latitude: 31.23, longitude: 121.47, accuracyMeters: 6.5, timestampMs: 1_792_757_000_000, coordinateSystem: "WGS84" };
const allowed: ForegroundLocationResult = { decision: "granted", canAskAgain: true };
function setup() {
  const permission = { getForegroundLocationStatus: vi.fn(async () => allowed), requestForegroundLocation: vi.fn(async () => allowed) };
  const location = { getFix: vi.fn(async (_signal: AbortSignal) => fix) };
  const save = vi.fn(async (_fix: DeviceLocationFix, _signal: AbortSignal) => true);
  return { permission, location, save, selection: createDeviceLocationSelection({ permission, location, save }) };
}

describe("foreground location selection", () => {
  it("uses a real fix after current permission and coalesces repeated presses", async () => {
    const { selection, permission, location, save } = setup();
    const result = selection.request();
    expect(selection.request()).toBe(result);
    await expect(result).resolves.toBe(true);
    expect(permission.requestForegroundLocation).not.toHaveBeenCalled();
    expect(location.getFix).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(fix, expect.any(AbortSignal));
    expect(selection.getState()).toMatchObject({ phase: "saved", permission: "granted" });
  });

  it("requests only at use and never prompts again for a permanent denial", async () => {
    const { selection, permission, location, save } = setup();
    expect(permission.getForegroundLocationStatus).not.toHaveBeenCalled();
    permission.getForegroundLocationStatus.mockResolvedValue({ decision: "denied", canAskAgain: false });
    await expect(selection.request()).resolves.toBe(false);
    await selection.request();
    expect(selection.getState()).toMatchObject({ phase: "denied", permission: "denied", canAskAgain: false });
    expect(permission.requestForegroundLocation).not.toHaveBeenCalled();
    expect(location.getFix).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    permission.getForegroundLocationStatus.mockResolvedValue(allowed);
    await expect(selection.request()).resolves.toBe(true);
  });

  it("keeps an explicit prompt denial distinct from a granted but unavailable fix", async () => {
    const { selection, permission, location, save } = setup();
    permission.getForegroundLocationStatus.mockResolvedValue({ decision: "undetermined", canAskAgain: true });
    permission.requestForegroundLocation.mockResolvedValueOnce({ decision: "denied", canAskAgain: true });
    await selection.request();
    expect(selection.getState().phase).toBe("denied");
    expect(location.getFix).not.toHaveBeenCalled();
    permission.getForegroundLocationStatus.mockResolvedValue(allowed);
    location.getFix.mockRejectedValueOnce(new Error("gps_unavailable"));
    await selection.request();
    expect(selection.getState()).toMatchObject({ phase: "unavailable", permission: "granted" });
    expect(save).not.toHaveBeenCalled();
  });

  it("shows storage failure without reporting a permission or position failure", async () => {
    const { selection, save } = setup();
    save.mockRejectedValueOnce(new Error("disk_full"));
    await expect(selection.request()).resolves.toBe(false);
    expect(selection.getState()).toMatchObject({ phase: "error", permission: "granted" });
    expect(selection.getState().message).toContain("未保存成功");
    await expect(selection.request()).resolves.toBe(true);
    expect(selection.getState()).toMatchObject({ phase: "saved", message: null });
  });

  it("does not start acquisition when a cancelled permission response arrives late", async () => {
    const { selection, permission, location, save } = setup();
    const pending = deferred<ForegroundLocationResult>();
    permission.getForegroundLocationStatus.mockReturnValueOnce(pending.promise);
    const result = selection.request();
    await vi.waitFor(() => expect(permission.getForegroundLocationStatus).toHaveBeenCalledOnce());
    selection.cancel();
    pending.resolve(allowed);
    await expect(result).resolves.toBe(false);
    expect(location.getFix).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(selection.getState().phase).toBe("idle");
  });

  it("retires the old fix and preserves a new request when a provider ignores abort", async () => {
    const { selection, location, save } = setup();
    const pending = deferred<DeviceLocationFix>();
    location.getFix.mockReturnValueOnce(pending.promise);
    const old = selection.request();
    await vi.waitFor(() => expect(location.getFix).toHaveBeenCalledOnce());
    const oldSignal = location.getFix.mock.calls[0]![0];
    selection.cancel();
    expect(oldSignal.aborted).toBe(true);
    const current = selection.request();
    pending.resolve({ ...fix, latitude: -20 });
    await expect(old).resolves.toBe(false);
    await expect(current).resolves.toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0]![0]).toEqual(fix);
    expect(selection.getState().phase).toBe("saved");
  });
});
