import { afterEach, describe, expect, it, vi } from "vitest";

const fakes = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  getInitialURL: vi.fn(),
  useSyncExternalStore: vi.fn((_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot()),
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

  it("normalizes triple-slash and host-form native routes", async () => {
    const routes = await import("./native-route-store");

    expect(routes.resolveNativeRouteHref("starward:///trips?revision=42")).toBe("/trips?revision=42");
    expect(routes.resolveNativeRouteHref("starward://forecast")).toBe("/forecast");
    expect(routes.resolveNativeRouteHref("starward:///contribute")).toBe("/contribute");
    expect(routes.resolveNativeRouteHref("not a url")).toBeNull();
  });

  it("consumes each native intent revision only once across root remounts", async () => {
    const routes = await import("./native-route-store");
    const intent = { revision: 91, url: "starward:///forecast" };

    expect(routes.consumeNativeRouteIntent(intent)).toBe("/forecast");
    expect(routes.consumeNativeRouteIntent(intent)).toBeNull();
    expect(routes.consumeNativeRouteIntent({ ...intent, revision: 92 })).toBe("/forecast");
  });
});
