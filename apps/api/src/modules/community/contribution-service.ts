import { applyModeration, createContribution, materializeCurrentReports, type ContributionEvidence } from "@starward/domain/community";

export class ContributionService {
  readonly #evidence = new Map<string, ContributionEvidence>();
  readonly #versions: unknown[] = [];

  submit(input: Parameters<typeof createContribution>[0]) {
    if (this.#evidence.has(input.id)) return this.#evidence.get(input.id)!;
    const evidence = createContribution(input);
    this.#evidence.set(evidence.id, evidence);
    return evidence;
  }

  currentReports(now: string) { return materializeCurrentReports([...this.#evidence.values()], now); }

  moderate(id: string, decision: Parameters<typeof applyModeration>[1]) {
    const evidence = this.#evidence.get(id);
    if (!evidence) throw new Error("contribution_not_found");
    const result = applyModeration(evidence, decision);
    this.#versions.push(result.version, result.audit);
    return result;
  }
}
