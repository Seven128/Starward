import { hasSkyTargetPosition, type ApiEnvelope, type SkyReport, type SkyTarget } from "@starward/miniapp-contracts";

/** Shared network/304/offline projection. Never reinterpret an old display
 * bearing as precise geometry, or retire independent stars/weather/images.
 */
export function projectSkyTargetCoordinates(envelope: ApiEnvelope<SkyReport>): ApiEnvelope<SkyReport> {
  let changed = false;
  const project = (targets: readonly SkyTarget[]) => {
    if (!Array.isArray(targets)) { changed = true; return []; }
    return targets.flatMap(target => {
      if (!target || typeof target !== "object") { changed = true; return []; }
      if (hasSkyTargetPosition(target) ||
        (target.azimuthDeg === null && target.altitudeDeg === null)) return [target];
      changed = true;
      return [{ ...target, azimuthDeg: null, altitudeDeg: null, direction: "暂无数据" }];
    });
  };
  const targets = project(envelope.data.targets);
  let targetFrames: SkyReport["targetFrames"] = [];
  if (Array.isArray(envelope.data.targetFrames)) {
    targetFrames = envelope.data.targetFrames.flatMap(frame => {
      if (!frame || typeof frame !== "object") { changed = true; return []; }
      return [{ ...frame, targets: project(frame.targets) }];
    });
  } else changed = true;
  if (!changed) return envelope;
  return {
    ...envelope,
    dataState: envelope.dataState === "FRESH" ? "PARTIAL" : envelope.dataState,
    warnings: [...envelope.warnings, "天体精确方位暂不可用，请联网后刷新。"],
    data: { ...envelope.data, targets, targetFrames, offlineReady: false, precachedHours: 0 },
  };
}
