import { afterEach, describe, expect, it, vi } from "vitest";

const fakes = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  getInitialURL: vi.fn(),
  useSyncExternalStore: vi.fn((_subscribe: unknown, getSnapshot: () => string | null) => getSnapshot()),
}));

vi.mock("expo-linking", () => ({
  addEventListener: fakes.addEventListener,
  getInitialURL: fakes.getInitialURL,
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("react", () => ({ useSyncExternalStore: fakes.useSyncExternalStore }));

describe("native route store", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("recovers an Android deep link delivered during release-bundle startup", async () => {
    vi.useFakeTimers();
    fakes.getInitialURL.mockResolvedValueOnce(null).mockResolvedValue("starward:///forecast");
    const routes = await import("./native-route-store");
    await Promise.resolve();

    expect(routes.useNativeRouteUrl()).toBeNull();
    await vi.advanceTimersByTimeAsync(250);
    expect(routes.useNativeRouteUrl()).toBe("starward:///forecast");
    expect(fakes.getInitialURL).toHaveBeenCalledTimes(2);
  });
});
