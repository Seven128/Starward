import { assertSkyObservationFrames, type SkyObservationFrame, type SkyGeometryReport } from "@starward/miniapp-contracts";
import { exactSkyTimeFrame } from "./sky-time-frame";
import type { SkyVector } from "./sky-view-projection";

/** Rotate an EQJ/J2000 direction using an already validated report frame. */
export function skyEquatorialDirectionToEnu(matrix: SkyObservationFrame["equatorialToEnu"], direction: SkyVector): SkyVector {
  return [
    matrix[0] * direction[0] + matrix[1] * direction[1] + matrix[2] * direction[2],
    matrix[3] * direction[0] + matrix[4] * direction[1] + matrix[5] * direction[2],
    matrix[6] * direction[0] + matrix[7] * direction[1] + matrix[8] * direction[2],
  ];
}

/** A missing or retired bright-star publication cannot revoke a valid
 * catalog-independent observation frame. Old offline reports simply lack it. */
export function exactSkyObservationFrame(report: Pick<SkyGeometryReport,"hourly"|"observationFrames"> | undefined,
  at: string | undefined): SkyObservationFrame | null {
  if (!report?.observationFrames || !at) return null;
  try { assertSkyObservationFrames(report.observationFrames,report.hourly.map(row=>row.at)); }
  catch { return null; }
  return exactSkyTimeFrame(report.observationFrames,at) ?? null;
}
