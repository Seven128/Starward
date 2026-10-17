import type { DataState } from "./types.ts";

/** An application acquisition snapshot of point forecasts, never a supplier run. */
export interface MapCloudSnapshot {
  schemaVersion: "map-cloud-snapshot-v1";
  snapshotId: string;
  samplingPolicy: "viewport-nine-query-cells-v2" | "center-nine-query-cells-v1";
  collectionWindow: { startedAt: string; endedAt: string };
  requestedBoundsGcj02: { west: number; south: number; east: number; north: number } | null;
  queryCellDegrees: 0.01;
  maximumSourceAgeSeconds: 1800;
  maximumSamples: 9;
  mixedRetrievalTimes: boolean;
  requestBudget: {
    hourlyRequestAttempts: number | null;
    reusedHourlyResponses: number | null;
    category: "QWEATHER_WEATHER_HOURLY";
    alertRequests: 0 | null;
    reuseUnit: "FULL_HOURLY_RESPONSE";
  };
  cells: readonly {
    /** Planned sampling intent; requestedGcj02 records the actual provider cell. */
    id: string;
    requestedGcj02: { latitude: number; longitude: number };
    sourceId: string | null;
    providerTag: string | null;
    sourceRequestId: string | null;
    retrievedAt: string | null;
    sourceState: DataState;
    quality: "AVAILABLE" | "MISSING" | "STALE" | "READ_FAILED";
    hours: readonly { at: string; cloudPercent: number | null }[];
  }[];
}
