import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePermissionFallbacks } from "@starward/contracts/platform-boundary";
import { createUnrestrictedProfile, facilityKinds, profileExamples } from "@starward/domain/preferences";
import { presentDataState } from "@starward/ui-system/data-state";

describe("mobile shell authority", () => {
  it("distinguishes every global data state without synthetic fallback data", () => {
    const states = ["empty", "no-results", "stale", "partial", "failed"] as const;
    const values = states.map((state) => presentDataState({ state, missing: state === "partial" ? ["route"] : [] }));

    expect(new Set(values.map((value) => value.kind))).toHaveLength(5);
    expect(new Set(values.map((value) => value.label))).toHaveLength(5);
    expect(values.every((value) => value.action && value.accessibilityLabel && value.syntheticData === false)).toBe(true);
    expect(values.find((value) => value.kind === "partial")?.missing).toEqual(["route"]);
  });

  it("starts in an explicitly unrestricted profile instead of applying an example silently", () => {
    const profile = createUnrestrictedProfile("2026-07-20T00:00:00.000Z");

    expect(profile.name).toBe("基础模式");
    expect(profile.observerTypes).toEqual([]);
    expect(profile.travel.modes).toEqual([]);
    expect(profile.targets).toEqual([]);
    expect(profile.equipment).toEqual([]);
    expect(facilityKinds.every((key) => profile.facilities[key] === "unrestricted")).toBe(true);
    expect(profileExamples.every((example) => example.notSelectedByDefault)).toBe(true);
  });

  it("keeps useful fallbacks when every optional permission is denied", () => {
    const result = resolvePermissionFallbacks({ preciseLocation: "denied", backgroundLocation: "denied", camera: "denied", notifications: "denied" });

    expect(result).toMatchObject({
      manualLocation: true,
      staticSky: true,
      foregroundTimer: true,
      localSettings: true,
      repeatPrompts: false,
      transmittedPreciseLocation: false,
    });
  });

  it("declares only foreground mobile permissions in the Expo application boundary", () => {
    const configPath = path.resolve(import.meta.dirname, "../../app.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")).expo;

    expect(config.newArchEnabled).toBe(true);
    expect(config.android.permissions).toEqual(expect.arrayContaining(["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "CAMERA", "POST_NOTIFICATIONS"]));
    expect(config.android.permissions).not.toContain("ACCESS_BACKGROUND_LOCATION");
    expect(config.android.blockedPermissions).toContain("android.permission.ACCESS_BACKGROUND_LOCATION");
    expect(config.ios.infoPlist.NSLocationWhenInUseUsageDescription).toContain("拒绝后仍可手动选择");
  });
});
