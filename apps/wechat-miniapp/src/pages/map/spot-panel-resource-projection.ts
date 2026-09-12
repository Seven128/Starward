export type SpotPanelResourceProjection = {
  pending: boolean;
  error: unknown;
  stale: boolean;
};

export function projectSpotPanelResource(
  enabled: boolean,
  resource: {
    isPending: boolean;
    error: unknown;
    refreshError: unknown;
    dataState: string | undefined;
  },
): SpotPanelResourceProjection {
  if (!enabled) return { pending: false, error: null, stale: false };
  return {
    pending: resource.isPending,
    error: resource.error ?? resource.refreshError,
    stale: resource.dataState === "STALE_USABLE",
  };
}
