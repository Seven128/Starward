import type { ApiEnvelope, SkyReport } from "@starward/miniapp-contracts";

/** Old/partial network, 304 and offline reports may have only a broad darkness
 * category. Do not turn that category into an invented sun direction. */
export function projectSkySolarGeometry(envelope: ApiEnvelope<SkyReport>): ApiEnvelope<SkyReport> {
  let missingDirection = false, missingDisc = false;
  const hourly = envelope.data.hourly.map(row => {
    const directionValid = typeof row.sunAzimuthDeg === "number" && Number.isFinite(row.sunAzimuthDeg) &&
      row.sunAzimuthDeg >= 0 && row.sunAzimuthDeg < 360 &&
      typeof row.sunAltitudeDeg === "number" && Number.isFinite(row.sunAltitudeDeg) &&
      row.sunAltitudeDeg >= -90 && row.sunAltitudeDeg <= 90;
    const discValid = typeof row.sunAngularDiameterDeg === "number" && Number.isFinite(row.sunAngularDiameterDeg) &&
      row.sunAngularDiameterDeg > .45 && row.sunAngularDiameterDeg < .6;
    if (!directionValid) missingDirection = true;
    if (!discValid) missingDisc = true;
    if (directionValid && discValid) return row;
    return { ...row,
      sunAzimuthDeg: directionValid ? row.sunAzimuthDeg : null,
      sunAltitudeDeg: directionValid ? row.sunAltitudeDeg : null,
      sunAngularDiameterDeg: discValid && directionValid ? row.sunAngularDiameterDeg : null };
  });
  if (!missingDirection && !missingDisc) return envelope;
  const warnings = [...envelope.warnings];
  for (const warning of [
    missingDirection ? "太阳精确位置暂不可用，请联网后刷新。" : null,
    missingDisc ? "太阳盘角直径暂不可用，请联网后刷新。" : null,
  ]) if (warning && !warnings.includes(warning)) warnings.push(warning);
  return { ...envelope, dataState: envelope.dataState === "FRESH" ? "PARTIAL" : envelope.dataState,
    warnings,
    data: { ...envelope.data, hourly, offlineReady: false, precachedHours: 0 } };
}
