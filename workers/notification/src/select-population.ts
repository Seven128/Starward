export function selectNotificationPopulation(input: { subscriptions: Array<{ id: string; affected: boolean; reason?: string }> }) {
  const observed = input.subscriptions.filter((item) => item.affected);
  return {
    eligibleIds: input.subscriptions.map((item) => item.id),
    observedIds: observed.map((item) => item.id),
    excludedItems: input.subscriptions.filter((item) => !item.affected).map((item) => ({ id: item.id, reason: item.reason ?? "not-affected", rule: "explicit-ineligible-only" })),
  };
}
