import type { FastifyInstance } from "fastify";
import { NotificationEvaluationError } from "../../../../../packages/domain/src/notifications/evaluation";
import { NotificationRuleCommandError, type NotificationRuleActor } from "./rule-service";
import type { NotificationRuleActorResolver } from "./rule-routes";
import type { NotificationEvaluationService } from "./evaluation-service";
import { restrictNotificationOwner } from "./owner-restriction";

export function registerNotificationInboxRoutes(app: FastifyInstance, service: Pick<NotificationEvaluationService, "controls" | "command" | "inbox" | "activity">,
  resolveActor: NotificationRuleActorResolver = async () => null) {
  const respond = async (request: Parameters<NotificationRuleActorResolver>[0], reply: import("fastify").FastifyReply, work: (actor: NotificationRuleActor | null) => unknown) => {
    reply.header("cache-control", "private, no-store").header("vary", "authorization, x-notification-owner");
    try {
      const actor = restrictNotificationOwner(await resolveActor(request), request.headers["x-notification-owner"], "notification_controls_owner_mismatch");
      return reply.send(await work(actor));
    }
    catch (error) {
      if (error instanceof NotificationEvaluationError || error instanceof NotificationRuleCommandError) return reply.code(error.statusCode).send({ code: error.code, outcome: "rejected" });
      return reply.code(503).send({ code: "notification_evaluation_unavailable", outcome: "unknown" });
    }
  };
  app.get("/v2/notifications/controls", (request, reply) => respond(request, reply, actor => ({ schemaVersion: "starward-notifications-v1", controls: service.controls(actor) })));
  app.post("/v2/notifications/controls/commands", (request, reply) => {
    const command = structuredClone(request.body);
    return respond(request, reply, actor => service.command(actor, command));
  });
  app.get<{ Querystring: { cursor?: string } }>("/v2/notifications/inbox", (request, reply) => respond(request, reply, actor => {
    const cursor = request.query.cursor === undefined ? undefined : Number(request.query.cursor);
    if (cursor !== undefined && (!Number.isSafeInteger(cursor) || cursor < 1)) throw new NotificationEvaluationError("invalid_notification_inbox_cursor");
    return service.inbox(actor, cursor);
  }));
  app.get<{ Params: { id: string } }>("/v2/notifications/rules/:id/activity", (request, reply) => respond(request, reply, async actor => ({ schemaVersion: "starward-notifications-v1", activity: await service.activity(actor, request.params.id) })));
}
