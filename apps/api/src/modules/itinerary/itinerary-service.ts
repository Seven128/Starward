import { randomUUID } from "node:crypto";
import { commandDigest } from "../../persistence/command-transaction";
import { applyItineraryPatch } from "../../../../../packages/domain/src/itinerary/index";
import type { ItineraryDraft, ItineraryDraftCommand, ItineraryDraftEditableContent } from "../../../../../packages/domain/src/itinerary/draft";
import { isRestorableItineraryRevision, itineraryDraftRestoreContent } from "../../../../../packages/domain/src/itinerary/draft-content";
import { ItineraryCommandError, parseItineraryDraftCommand } from "./draft-command";
import type { ItineraryDraftRepository } from "./sqlite-itinerary-repository";

export interface ItineraryActor { id: string; scope: "local-owner-poc" }
export class ItineraryService {
  constructor(private readonly repository: ItineraryDraftRepository, private readonly now = () => new Date().toISOString()) {}
  private actor(actor: ItineraryActor | null): ItineraryActor {
    if (!actor?.id || actor.scope !== "local-owner-poc") throw new ItineraryCommandError("itinerary_owner_required", 403);
    return actor;
  }
  list(actor: ItineraryActor | null, cursor?: number) {
    const owner = this.actor(actor), page = this.repository.list(owner.id, cursor);
    return { ...page, ownerQualification: { schemaVersion: "starward-private-command-owner-v1" as const, ownerId: owner.id } };
  }
  get(actor: ItineraryActor | null, id: string, revision?: number) {
    const result = this.repository.read(this.actor(actor).id, id, revision);
    if (!result) throw new ItineraryCommandError("itinerary_not_found", 404);
    return result;
  }
  history(actor: ItineraryActor | null, id: string, cursor?: number) {
    const owner = this.actor(actor), result = this.repository.history(owner.id, id, cursor);
    if (!result) throw new ItineraryCommandError("itinerary_not_found", 404);
    return { ...result, ownerQualification: { schemaVersion: "starward-private-command-owner-v1" as const, ownerId: owner.id } };
  }
  command(actor: ItineraryActor | null, value: unknown) {
    const owner = this.actor(actor);
    const command = parseItineraryDraftCommand(value);
    const digest = commandDigest(command);
    const id = command.command === "create-draft" ? randomUUID() : command.itineraryId;
    return this.repository.commit({ actorId: owner.id, key: command.idempotencyKey, digest, id }, current => this.apply(owner, command, id, current));
  }
  private apply(actor: ItineraryActor, command: ItineraryDraftCommand, id: string, current: ItineraryDraft | null): ItineraryDraft {
    const at = this.now();
    if (command.command === "create-draft") {
      if (current) throw new ItineraryCommandError("itinerary_already_exists", 409);
      return { schemaVersion: "starward-itinerary-draft-v1", id, ownerId: actor.id, title: command.input.title, timezone: command.input.timezone,
        revision: 1, sequence: 1, createdAt: at, updatedAt: at, inputs: command.input.inputs, source: { kind: "user-input", capturedAt: at },
        state: "draft", stops: [], stages: [], operationLog: [], evidence: { route: "missing", weather: "missing", astronomy: "missing", spot: "unverified" } };
    }
    if (!current) throw new ItineraryCommandError("itinerary_not_found", 404);
    // commit invokes this callback only after the original actor/key receipt
    // lookup, inside its existing write transaction. A replay never re-resolves
    // historical content or re-applies it to a later current revision.
    let contentPatch: Partial<ItineraryDraftEditableContent>;
    if (command.command === "restore-draft") {
      if (current.revision !== command.baseRevision) throw new ItineraryCommandError("itinerary_revision_conflict", 409, { currentRevision: current.revision });
      const historical = this.repository.read(actor.id, id, command.sourceRevision);
      if (!historical) throw new ItineraryCommandError("itinerary_restore_source_not_found", 404);
      if (!isRestorableItineraryRevision(historical, { id, ownerId: actor.id, revision: command.sourceRevision })) throw new ItineraryCommandError("itinerary_restore_source_incompatible", 422);
      try { contentPatch = itineraryDraftRestoreContent(current, historical); }
      catch { throw new ItineraryCommandError("itinerary_restore_source_incompatible", 422); }
    } else contentPatch = command.patch;
    const { inputs, ...patch } = contentPatch;
    if (inputs && inputs.date !== current.inputs.date && current.stages.length && !patch.stages) throw new ItineraryCommandError("itinerary_stages_require_review", 422);
    const result = applyItineraryPatch(current, { idempotencyKey: command.idempotencyKey, actorId: actor.id, role: "owner", baseRevision: command.baseRevision, patch, at });
    if (result.status === "conflict") throw new ItineraryCommandError("itinerary_revision_conflict", 409, { currentRevision: current.revision });
    if (result.status === "invalid-timeline") throw new ItineraryCommandError("itinerary_invalid_timeline", 422, { conflicts: result.conflicts });
    if (result.status !== "applied") throw new ItineraryCommandError("itinerary_command_not_applied", 409);
    const next = { ...result.value, inputs: inputs ?? current.inputs, updatedAt: at };
    next.operationLog[next.operationLog.length - 1] = { ...next.operationLog.at(-1)!, patch: contentPatch };
    return next;
  }
}
