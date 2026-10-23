import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ getForegroundPermissionsAsync: vi.fn(), requestForegroundPermissionsAsync: vi.fn(), PermissionStatus: { UNDETERMINED: "undetermined" } }));
vi.mock("expo-location", () => native);

describe("foreground permission gateway", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.resetModules(); });

  it("shares the still-open OS permission request after a caller leaves and retries", async () => {
    let finish!: (value: { granted: boolean; status: string; canAskAgain: boolean }) => void;
    native.requestForegroundPermissionsAsync.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { expoPermissionGateway } = await import("./permission-gateway");
    const first = expoPermissionGateway.requestForegroundLocation();
    expect(expoPermissionGateway.requestForegroundLocation()).toBe(first);
    finish({ granted: false, status: "denied", canAskAgain: false });
    await expect(first).resolves.toEqual({ decision: "denied", canAskAgain: false });
    expect(native.requestForegroundPermissionsAsync).toHaveBeenCalledOnce();
  });

  it("releases a failed OS request so the user's next attempt can recover", async () => {
    native.requestForegroundPermissionsAsync.mockRejectedValueOnce(new Error("native_prompt_failed"))
      .mockResolvedValueOnce({ granted: true, status: "granted", canAskAgain: true });
    const { expoPermissionGateway } = await import("./permission-gateway");
    await expect(expoPermissionGateway.requestForegroundLocation()).rejects.toThrow("native_prompt_failed");
    await expect(expoPermissionGateway.requestForegroundLocation()).resolves.toEqual({ decision: "granted", canAskAgain: true });
    expect(native.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
  });
});
