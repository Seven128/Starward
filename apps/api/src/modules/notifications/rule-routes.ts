import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { NotificationRuleCommandError, type NotificationRuleActor, type NotificationRuleService } from "./rule-service";
import { resolveLocalPocOwner } from "../../local-poc-owner";
import { restrictNotificationOwner } from "./owner-restriction";

export type NotificationRuleActorResolver = (request: Pick<FastifyRequest, "ip" | "headers">) => Promise<NotificationRuleActor | null>;
/** Loopback-only POC trust boundary; caller headers are not identity. */
export const resolveLocalNotificationOwner: NotificationRuleActorResolver = resolveLocalPocOwner;
function commandRequestError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") return reply.code(413).header("cache-control", "private, no-store").send({ code: "notification_rule_request_body_too_large", outcome: "rejected" });
  throw error;
}
export function registerNotificationRuleRoutes(app: FastifyInstance, service: Pick<NotificationRuleService, "list" | "get" | "command">, resolveActor: NotificationRuleActorResolver = async () => null) {
  const respond = async (request: FastifyRequest, reply: FastifyReply, work: (actor: NotificationRuleActor | null) => unknown) => {
    reply.header("cache-control", "private, no-store").header("vary", "authorization, x-notification-owner");
    try {
      const actor = restrictNotificationOwner(await resolveActor(request), request.headers["x-notification-owner"], "notification_rule_owner_mismatch");
      return reply.send(work(actor));
    }
    catch (error) {
      if (error instanceof NotificationRuleCommandError) return reply.code(error.statusCode).send({ code: error.code, ...error.details, outcome: "rejected" });
      return reply.code(503).send({ code: "notification_rule_storage_unavailable", outcome: "unknown", retryWithSameCommand: true });
    }
  };
  app.get<{ Querystring: { cursor?: string } }>("/v2/notification-rules", (request, reply) => respond(request, reply, actor => {
    const cursor = request.query.cursor === undefined ? undefined : Number(request.query.cursor);
    if (cursor !== undefined && (!Number.isSafeInteger(cursor) || cursor < 1)) throw new NotificationRuleCommandError("invalid_notification_rule_cursor");
    return service.list(actor, cursor);
  }));
  app.get<{ Params: { id: string } }>("/v2/notification-rules/:id", (request, reply) => respond(request, reply, actor => ({ schemaVersion: "starward-notification-rules-v2", rule: service.get(actor, request.params.id) })));
  app.get<{ Params: { id: string; revision: string } }>("/v2/notification-rules/:id/revisions/:revision", (request, reply) => respond(request, reply, actor => {
    const revision = Number(request.params.revision);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new NotificationRuleCommandError("invalid_notification_rule_revision");
    return { schemaVersion: "starward-notification-rules-v2", rule: service.get(actor, request.params.id, revision) };
  }));
  app.post("/v2/notification-rules/commands", { errorHandler: commandRequestError }, (request, reply) => {
    const command = structuredClone(request.body);
    return respond(request, reply, actor => service.command(actor, command));
  });
}
