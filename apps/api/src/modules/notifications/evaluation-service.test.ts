import { describe, expect, it } from "vitest";
import { NotificationEvaluationService, type NotificationInboxRepository } from "./evaluation-service";
import type { NotificationInboxPage, NotificationRuleActivity } from "../../../../../packages/domain/src/notifications/evaluation";

describe("notification worker/read scheduling responsibility", () => {
  it("gives due work a turn while source pages continue and returns committed history without a global drain", async () => {
    let sourcePages = 0, duePages = 0, reads = 0;
    // Deliberately non-draining source work. The assertion must finish while
    // that producer is still pending; an await-flush reader cannot pass.
    const repository: NotificationInboxRepository = {
      enqueue() {}, controls() { throw Error("not_used"); }, setControls() { throw Error("not_used"); },
      processSourceIntent() { return false; }, hasUnconfirmedSources() { return false; }, acceptedSource() { return false; }, retireObservedSource() {},
      processSourceBatch() { sourcePages++; return true; }, processDueBatch() { duePages++; return false; }, nextDue() { return null; }, hasImmediateWork() { return true; },
      activity() { return { ruleId: "rule", revision: 1, supported: true, reason: null, lastEvaluation: null, lastDeliveryAt: null, pending: 1, evaluationStatus: "ready" } as NotificationRuleActivity; },
      inbox() { reads++; return { schemaVersion: "starward-notifications-v1", ownerId: "owner", checkedAt: "2026-10-24T19:00:00.000Z", items: [], nextCursor: null, scope: "local-owner-poc", evaluationStatus: "ready" } as NotificationInboxPage; },
    };
    const service = new NotificationEvaluationService(repository);
    try {
      expect(sourcePages).toBe(1); expect(duePages).toBe(1);
      expect(await service.inbox({ id: "owner", scope: "local-owner-poc" })).toMatchObject({ evaluationStatus: "processing" });
      expect(reads).toBe(1); expect(sourcePages).toBe(1);
      expect(await service.activity({ id: "owner", scope: "local-owner-poc" }, "rule")).toMatchObject({ evaluationStatus: "processing", pending: 1 });
    } finally { await service.close(); }
  });
});
