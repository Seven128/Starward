type RecoverableResource = {
  isError?: boolean;
  refreshError?: unknown;
  dataState?: string | undefined;
  refetch(): Promise<unknown>;
};

export async function retryFailedFormalResources(...resources: readonly RecoverableResource[]) {
  await Promise.allSettled(resources
    .filter(resource => resource.isError || resource.refreshError || resource.dataState === "STALE_USABLE")
    .map(resource => resource.refetch()));
}
