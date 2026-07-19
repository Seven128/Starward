export function selectReplayPopulation(input: { entities: Array<{ id: string; eligible: boolean; reason?: string }> }) {
  const observed = input.entities.filter((item) => item.eligible);
  return {
    eligibleIds: input.entities.map((item) => item.id),
    observedIds: observed.map((item) => item.id),
    excludedItems: input.entities.filter((item) => !item.eligible).map((item) => ({ id: item.id, reason: item.reason ?? "ineligible", rule: "explicit-ineligible-only" })),
  };
}
