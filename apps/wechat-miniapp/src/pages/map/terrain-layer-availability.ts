import type { TerrainOverlayData } from "@starward/miniapp-contracts";

export function terrainLayerAvailability(
  state: TerrainOverlayData["state"] | undefined,
  failureCode: TerrainOverlayData["failureCode"] | TerrainOverlayData["lightPollution"]["failureCode"],
  requestFailed: boolean,
): "PENDING" | "READY" | "EMPTY" | "ERROR" {
  if (requestFailed || failureCode) return "ERROR";
  if (state === "UNAVAILABLE") return "EMPTY";
  return state ? "READY" : "PENDING";
}
