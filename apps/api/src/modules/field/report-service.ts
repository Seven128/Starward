import { randomUUID } from "node:crypto";
import { FieldReportValidationError, parseFieldReportCommand, type FieldReportDraft } from "../../../../../packages/domain/src/offline/field-reports";
import { commandDigest } from "../../persistence/command-transaction";
import type { LocalPocOwner } from "../../local-poc-owner";
import type { FieldReportRepository } from "./sqlite-report-repository";

export class FieldReportCommandError extends Error {
  constructor(readonly code: string, readonly statusCode = 400, readonly details?: Record<string, unknown>) { super(code); }
}
export class FieldReportService {
  constructor(private readonly repository: FieldReportRepository, private readonly now = () => new Date().toISOString()) {}
  private actor(actor: LocalPocOwner | null) {
    if (!actor?.id || actor.scope !== "local-owner-poc") throw new FieldReportCommandError("field_report_owner_required", 403);
    return actor;
  }
  list(actor: LocalPocOwner | null, cursor?: number) {
    const owner = this.actor(actor), page = this.repository.list(owner.id, cursor);
    return { ...page, ownerQualification: { schemaVersion: "starward-private-command-owner-v1" as const, ownerId: owner.id } };
  }
  get(actor: LocalPocOwner | null, id: string, revision?: number) {
    const report = this.repository.read(this.actor(actor).id, id, revision);
    if (!report) throw new FieldReportCommandError("field_report_not_found", 404);
    return report;
  }
  command(actor: LocalPocOwner | null, value: unknown) {
    const owner = this.actor(actor);
    let command;
    try { command = parseFieldReportCommand(value); } catch (error) {
      if (error instanceof FieldReportValidationError) throw new FieldReportCommandError(error.code);
      throw error;
    }
    const digest = commandDigest(command), id = command.command === "create-report-draft" ? randomUUID() : command.reportId;
    return this.repository.commit({ actorId: owner.id, key: command.idempotencyKey, digest, id }, current => {
      const at = this.now();
      if (command.command === "create-report-draft") return { schemaVersion: "starward-field-report-draft-v1", id, ownerId: owner.id, revision: 1, createdAt: at, updatedAt: at, input: command.input, visibility: "private", publication: "not-submitted" };
      if (!current) throw new FieldReportCommandError("field_report_not_found", 404);
      if (current.revision !== command.baseRevision) throw new FieldReportCommandError("field_report_revision_conflict", 409, { currentRevision: current.revision });
      const next: FieldReportDraft = { ...current, input: command.input, revision: current.revision + 1, updatedAt: at };
      return next;
    });
  }
}
