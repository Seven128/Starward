import { assertNightReportRequest, nightReportRequestIdentity, type NightReportRequest, type PersistedNightReport } from "../../../../../packages/contracts/src/night-report";
import { commandDigest } from "../../persistence/command-transaction";
import type { LocalPocOwner } from "../../local-poc-owner";
import type { NightReportService } from "./night-report-service";
import { NightReportPersistenceError, type SqliteNightReportRepository } from "./sqlite-night-report-repository";

export class PersistedNightReportService {
  constructor(private readonly repository: SqliteNightReportRepository, private readonly generator: Pick<NightReportService, "generate">) {}
  private owner(actor: LocalPocOwner | null) {
    if (typeof actor?.id !== "string" || !actor.id.trim() || actor.scope !== "local-owner-poc") throw new NightReportPersistenceError("night_report_owner_required", 403);
    return actor.id;
  }
  async create(actor: LocalPocOwner | null, raw: NightReportRequest): Promise<PersistedNightReport> {
    const actorId = this.owner(actor);
    const request = structuredClone(assertNightReportRequest(raw));
    const digest = commandDigest(nightReportRequestIdentity(request));
    const existing = this.repository.result(actorId, request.requestId, digest);
    if (existing) return existing;
    // Provider work holds no SQLite transaction. The subsequent transaction
    // arbitrates competing connections and commits only one effect/receipt.
    return this.repository.commit(actorId, digest, request, await this.generator.generate(request));
  }
  get(actor: LocalPocOwner | null, id: string) {
    const actorId = this.owner(actor);
    const report = this.repository.read(actorId, id);
    if (!report) throw new NightReportPersistenceError("night_report_not_found", 404);
    return report;
  }
  result(actor: LocalPocOwner | null, requestId: string): PersistedNightReport {
    const actorId = this.owner(actor);
    const result = this.repository.result(actorId, requestId);
    if (!result) throw new NightReportPersistenceError("night_report_not_found", 404);
    const report = this.repository.read(actorId, result.receipt.reportId);
    if (!report || JSON.stringify(report) !== JSON.stringify(result.report)) throw new Error("night_report_readback_incomplete");
    return result;
  }
}
