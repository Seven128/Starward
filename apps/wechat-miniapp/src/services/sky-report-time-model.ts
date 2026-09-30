import { assertSkyTimeModel, type ApiEnvelope, type SkyReport } from "@starward/miniapp-contracts";

/** Runs after independent observation-frame validation on network/304/offline
 * recovery. A bad fine-time model cannot erase genuine discrete sky layers. */
export function projectSkyTimeModel(envelope: ApiEnvelope<SkyReport>): ApiEnvelope<SkyReport> {
  if (envelope.data.timeModel == null) return envelope;
  try {
    const observer = envelope.data.observationFrames?.[0]?.observer;
    if (!observer) throw new TypeError("sky_time_observer_missing");
    assertSkyTimeModel(envelope.data.timeModel, { observer, hourlyAt: envelope.data.hourly.map(row => row.at) });
    return envelope;
  } catch {
    return { ...envelope, dataState: envelope.dataState === "FRESH" ? "PARTIAL" : envelope.dataState,
      warnings: [...envelope.warnings, "连续时间暂不可用；仍可选择报告中提供的观测时刻。"],
      data: { ...envelope.data, timeModel: null } };
  }
}
