import { afterEach, describe, expect, it } from "vitest";
import { ItineraryWorkflowService } from "./itinerary-workflow-service";
import { SqliteItineraryRepository } from "./sqlite-itinerary-repository";

const owner = { id: "owner-a", scope: "local-owner-poc" as const };
const repositories: SqliteItineraryRepository[] = [];
afterEach(() => { for (const repository of repositories.splice(0)) repository.close(); });
function setup() { const repository = new SqliteItineraryRepository(":memory:"); repositories.push(repository); return new ItineraryWorkflowService(repository, () => "2026-10-23T12:00:00Z"); }
const command = () => ({ command: "create-draft", idempotencyKey: "draft-1", input: { title: "用户的观星草稿", timezone: "Asia/Shanghai", inputs: { date: "2026-11-01", origin: "广州", people: 3, transport: "drive", target: "moon", userType: "family", latestReturnLocal: "02:30", overnight: false, collaborative: false } } });

describe("itinerary draft domain effects", () => {
  it("starts empty and saves explicit intent without fabricating external evidence", () => {
    const service = setup();
    expect(service.list(owner).items).toEqual([]);
    const saved = service.command(owner, command());
    expect(saved.itinerary).toMatchObject({ revision: 1, state: "draft", title: command().input.title, inputs: command().input.inputs, stages: [], stops: [], evidence: { route: "missing", weather: "missing", astronomy: "missing", spot: "unverified" } });
    expect(service.get(owner, saved.itinerary.id)).toEqual(saved.itinerary);
    expect(saved).not.toHaveProperty("offlinePack");
  });
  it("rejects changed same-key input, preserves history and rejects stale revisions", () => {
    const service = setup(); const original = service.command(owner, command()).itinerary;
    expect(service.command(owner, command())).toMatchObject({ replayed: true, itinerary: original });
    expect(() => service.command(owner, { ...command(), input: { ...command().input, title: "other" } })).toThrow("itinerary_idempotency_conflict");
    const patch = { command: "patch-draft", itineraryId: original.id, idempotencyKey: "patch-1", baseRevision: 1, patch: { title: "已确认的新标题" } };
    const next = service.command(owner, patch).itinerary;
    expect(next).toMatchObject({ revision: 2, sequence: 2, title: "已确认的新标题" });
    expect(service.get(owner, original.id, 1)).toEqual(original);
    expect(() => service.command(owner, { ...patch, idempotencyKey: "patch-stale" })).toThrow("itinerary_revision_conflict");
    expect(service.get(owner, original.id)).toEqual(next);
  });
  it("validates calendar, actor, unsupported collaboration and real timeline ordering", () => {
    const service = setup();
    expect(() => service.command(null, command())).toThrow("itinerary_owner_required");
    expect(() => service.command(owner, { ...command(), actorId: "other" })).toThrow("unexpected_itinerary_field");
    expect(() => service.command(owner, { ...command(), input: { ...command().input, inputs: { ...command().input.inputs, date: "2026-02-30" } } })).toThrow("invalid_itinerary_input");
    expect(() => service.command(owner, { ...command(), input: { ...command().input, inputs: { ...command().input.inputs, collaborative: true } } })).toThrow("itinerary_collaboration_unavailable");
    const original = service.command(owner, command()).itinerary;
    expect(() => service.get({ id: "other", scope: "local-owner-poc" }, original.id)).toThrow("itinerary_not_found");
    const patch = { command: "patch-draft", itineraryId: original.id, idempotencyKey: "time-1", baseRevision: 1, patch: { stages: [{ id: "observe", kind: "observation", startsAt: "2026-11-01T16:30:00Z", endsAt: "2026-11-01T16:00:00Z" }] } };
    expect(() => service.command(owner, patch)).toThrow("itinerary_invalid_timeline");
    expect(service.get(owner, original.id).revision).toBe(1);
    expect(() => service.command(owner, { ...patch, patch: { stages: [{ ...patch.patch.stages[0], startsAt: "2026-11-01T15:00:00" }] } })).toThrow("invalid_itinerary_stages");
  });
});
