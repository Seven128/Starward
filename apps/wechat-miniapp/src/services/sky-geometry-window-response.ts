import { assertSkyTimeModel, skyGeometryWindow, type ApiEnvelope, type SkyGeometryWindowData,
  type StellarGeometryObserver } from "@starward/miniapp-contracts";

export type SkyGeometryWindowBinding = Omit<SkyGeometryWindowData, "model"> & {
  at: string; timezone: string; observer: StellarGeometryObserver;
};

/** The same day is one bounded geometry representation, never one per second. */
export function skyGeometryWindowKey(binding: SkyGeometryWindowBinding | null, dataRevision?: string) {
  return ["spot-sky-geometry", binding?.spotId ?? "", binding?.contextId ?? "", binding?.contextRevision ?? 0,
    binding?.contextFingerprint ?? "", dataRevision ?? "",
    binding ? skyGeometryWindow(binding.at, binding.timezone).startAt : ""] as const;
}

function freeze(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.values(value).forEach(freeze); Object.freeze(value);
}

/** Admission is tied to the original authorized observer, not server-supplied
 * coordinates. A valid model cannot smuggle in another place or Context. */
export function matchingSkyGeometryWindow(response: ApiEnvelope<SkyGeometryWindowData>, expected: SkyGeometryWindowBinding) {
  const data = response?.data, window = skyGeometryWindow(expected.at, expected.timezone);
  if (!["FRESH", "STALE_USABLE"].includes(response?.dataState) || !data ||
    !(["spotId", "contextId", "contextRevision", "contextFingerprint"] as const).every(key => data[key] === expected[key]) ||
    response.contextRevision !== expected.contextRevision || response.validAt !== window.startAt ||
    !response.sources.length || response.sources.some(source => source.kind !== "PRODUCT_CALCULATION" ||
      !source.id || source.validFrom !== window.startAt || source.validTo !== window.endAt))
    throw new Error("sky_geometry_window_binding_invalid");
  assertSkyTimeModel(data.model, { observer: expected.observer, hourlyAt: window.hourlyAt });
  freeze(data.model);
  return response;
}
