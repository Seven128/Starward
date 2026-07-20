const hardGates = ["provenance", "quality", "stability", "commercial-license", "safe-degradation"] as const;
export interface ProviderCost { subscription: number; apiOverage: number; compute: number; storage: number; egressCdn: number; monitoringRetry: number; engineeringOps: number; complianceAttribution: number; migrationExit: number }
export interface ProviderCandidate { id: string; capability: string; region: string; passedGates: string[]; priceEvidenceAt: string; currency: "CNY"; taxIncluded: boolean; scenarios: Record<"mau1k"|"mau10k"|"mau100k"|"failure", ProviderCost> }
const sum = (cost: ProviderCost) => Object.values(cost).reduce((total, value) => total + value, 0);
export function evaluateProviderCandidates(input: { candidates: ProviderCandidate[]; approvedPaidBudgetCny: number; secondPaidSourceApproved: boolean }) {
  const evaluated = input.candidates.map((candidate) => ({ ...candidate, qualified: hardGates.every((gate) => candidate.passedGates.includes(gate)), tco12Month: Object.fromEntries(Object.entries(candidate.scenarios).map(([key, cost]) => [key, sum(cost)])), effectiveOutputCost: sum(candidate.scenarios.mau10k) }));
  const qualified = evaluated.filter((candidate) => candidate.qualified).sort((a,b)=>a.effectiveOutputCost-b.effectiveOutputCost);
  const selected = qualified[0];
  return { evaluated, decision: selected ? { providerId: selected.id, basis: "qualified-lowest-12m-tco", purchaseAuthorized: input.approvedPaidBudgetCny >= selected.effectiveOutputCost } : { providerId: null, basis: "blocked-no-qualified-provider", purchaseAuthorized: false }, secondPaidSourceEnabled: Boolean(input.secondPaidSourceApproved && qualified[1]), autoUpgrade: false };
}
