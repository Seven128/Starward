import { validMoonBodyFrame, type ApiEnvelope, type SkyReport } from "@starward/miniapp-contracts";

/** Retired network/304/offline rows keep their lunar facts but cannot place or size a Moon disc. */
export function projectSkyMoonGeometry(envelope: ApiEnvelope<SkyReport>): ApiEnvelope<SkyReport> {
  let changed = false;
  const hourly = envelope.data.hourly.map(row => {
    const valid = typeof row.moonAzimuthDeg === "number" && Number.isFinite(row.moonAzimuthDeg) &&
      row.moonAzimuthDeg >= 0 && row.moonAzimuthDeg < 360 &&
      typeof row.moonAltitudeDeg === "number" && Number.isFinite(row.moonAltitudeDeg) &&
      row.moonAltitudeDeg >= -90 && row.moonAltitudeDeg <= 90 &&
      typeof row.moonAngularDiameterDeg === "number" && Number.isFinite(row.moonAngularDiameterDeg) &&
      row.moonAngularDiameterDeg > 0 && row.moonAngularDiameterDeg < 1;
    if (valid) {
      if (row.moonBodyFrame == null || validMoonBodyFrame(row.moonBodyFrame)) return row;
      changed = true;
      return { ...row, moonBodyFrame: null };
    }
    changed = true;
    return { ...row, moonAzimuthDeg: null, moonAngularDiameterDeg: null, moonBodyFrame: null };
  });
  if (!changed) return envelope;
  const warning = "月球精确位置、视直径或月面定向部分资料暂不可用，请联网后刷新。";
  return { ...envelope, dataState: envelope.dataState === "FRESH" ? "PARTIAL" : envelope.dataState,
    warnings: envelope.warnings.includes(warning) ? envelope.warnings : [...envelope.warnings, warning],
    data: { ...envelope.data, hourly, offlineReady: false, precachedHours: 0 } };
}
