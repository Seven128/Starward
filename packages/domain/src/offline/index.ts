export function restoreOfflineFieldState(input: { network: string; pack: { checksumValid: boolean; plan: any; route: any; toolbox: string[] } }) {
  return {
    usable: input.pack.checksumValid,
    network: input.network,
    plan: input.pack.plan,
    route: input.pack.route,
    toolbox: input.pack.toolbox,
    safetyNotice: "离线信息可能过期；出发前核对道路、天气与现场管理要求。",
  };
}

export function recoverOfflineQueue(input: { saved: Array<{ id: string; idempotencyKey: string; state: string }>; network: string }) {
  const unique = new Map(input.saved.map((item) => [item.idempotencyKey, item]));
  return {
    restoredDrafts: input.saved.length,
    uploads: input.network === "restored" ? [...unique.values()] : [],
    conflictsVisible: true,
    dataLoss: false,
  };
}
