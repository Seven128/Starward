import { createHash, randomUUID } from "node:crypto";
import { applyItineraryPatch } from "../../../../../packages/domain/src/itinerary/index";
import type { ItineraryDraft, ItineraryDraftCommand } from "../../../../../packages/domain/src/itinerary/draft";
import { ItineraryCommandError, parseItineraryDraftCommand } from "./draft-command";
import type { ItineraryDraftRepository } from "./sqlite-itinerary-repository";

export interface ItineraryActor { id: string; scope: "local-owner-poc" }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export class ItineraryService {
  constructor(private readonly repository: ItineraryDraftRepository, private readonly now = () => new Date().toISOString()) {}
  private actor(actor: ItineraryActor | null): ItineraryActor {
    if (!actor?.id || actor.scope !== "local-owner-poc") throw new ItineraryCommandError("itinerary_owner_required", 403);
    return actor;
  }
  list(actor: ItineraryActor | null, cursor?: number) { return this.repository.list(this.actor(actor).id, cursor); }
  get(actor: ItineraryActor | null, id: string, revision?: number) {
    const result = this.repository.read(this.actor(actor).id, id, revision);
    if (!result) throw new ItineraryCommandError("itinerary_not_found", 404);
    return result;
  }
  command(actor: ItineraryActor | null, value: unknown) {
    const owner = this.actor(actor);
    const command = parseItineraryDraftCommand(value);
    const digest = createHash("sha256").update(canonical(command)).digest("hex");
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
    const { inputs, ...patch } = command.patch;
    if (inputs && inputs.date !== current.inputs.date && current.stages.length && !patch.stages) throw new ItineraryCommandError("itinerary_stages_require_review", 422);
    const result = applyItineraryPatch(current, { idempotencyKey: command.idempotencyKey, actorId: actor.id, role: "owner", baseRevision: command.baseRevision, patch, at });
    if (result.status === "conflict") throw new ItineraryCommandError("itinerary_revision_conflict", 409, { currentRevision: current.revision });
    if (result.status === "invalid-timeline") throw new ItineraryCommandError("itinerary_invalid_timeline", 422, { conflicts: result.conflicts });
    if (result.status !== "applied") throw new ItineraryCommandError("itinerary_command_not_applied", 409);
    const next = { ...result.value, inputs: inputs ?? current.inputs, updatedAt: at };
    next.operationLog[next.operationLog.length - 1] = { ...next.operationLog.at(-1)!, patch: command.patch };
    return next;
  }
}
