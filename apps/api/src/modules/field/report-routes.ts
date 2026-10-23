import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FieldReportCommandError, type FieldReportService } from "./report-service";
import { resolveLocalPocOwner, type LocalPocOwner, type LocalPocOwnerResolver } from "../../local-poc-owner";

export type FieldReportActorResolver = LocalPocOwnerResolver;
export const resolveLocalFieldReportOwner = resolveLocalPocOwner;
function commandRequestError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") return reply.code(413).header("cache-control", "private, no-store").send({ code: "field_report_request_body_too_large", outcome: "rejected" });
  throw error;
}
export function registerFieldReportRoutes(app: FastifyInstance, service: Pick<FieldReportService, "list" | "get" | "command">, resolveActor: FieldReportActorResolver = async () => null) {
  const respond = async (request: FastifyRequest, reply: FastifyReply, work: (actor: LocalPocOwner | null) => unknown) => {
    reply.header("cache-control", "private, no-store").header("vary", "authorization");
    try { return reply.send(work(await resolveActor(request))); }
    catch (error) {
      if (error instanceof FieldReportCommandError) return reply.code(error.statusCode).send({ code: error.code, ...error.details, outcome: "rejected" });
      return reply.code(503).send({ code: "field_report_storage_unavailable", outcome: "unknown", retryWithSameCommand: true });
    }
  };
  app.get<{ Querystring: { cursor?: string } }>("/v2/field-reports", (request, reply) => respond(request, reply, actor => {
    const cursor = request.query.cursor === undefined ? undefined : Number(request.query.cursor);
    if (cursor !== undefined && (!Number.isSafeInteger(cursor) || cursor < 1)) throw new FieldReportCommandError("invalid_field_report_cursor");
    return service.list(actor, cursor);
  }));
  app.get<{ Params: { id: string } }>("/v2/field-reports/:id", (request, reply) => respond(request, reply, actor => ({ schemaVersion: "starward-field-reports-v2", report: service.get(actor, request.params.id) })));
  app.get<{ Params: { id: string; revision: string } }>("/v2/field-reports/:id/revisions/:revision", (request, reply) => respond(request, reply, actor => {
    const revision = Number(request.params.revision);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new FieldReportCommandError("invalid_field_report_revision");
    return { schemaVersion: "starward-field-reports-v2", report: service.get(actor, request.params.id, revision) };
  }));
  app.post("/v2/field-reports/commands", { errorHandler: commandRequestError }, (request, reply) => {
    const command = structuredClone(request.body);
    return respond(request, reply, actor => service.command(actor, command));
  });
}
