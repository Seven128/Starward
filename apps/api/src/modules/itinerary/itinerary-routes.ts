import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ItineraryCommandError } from "./draft-command";
import type { ItineraryActor, ItineraryService } from "./itinerary-service";
import { resolveLocalPocOwner } from "../../local-poc-owner";

export type ItineraryActorResolver = (request: Pick<FastifyRequest, "ip" | "headers">) => Promise<ItineraryActor | null>;

/** POC composition only: no caller-selected user/role/header is an identity. */
export const resolveLocalItineraryOwner: ItineraryActorResolver = resolveLocalPocOwner;

function commandRequestError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  // Fastify rejects the body before the command handler can execute. This is
  // evidence for this request only, not for an earlier uncertain attempt.
  if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") return reply.code(413).header("cache-control", "private, no-store").send({ code: "itinerary_request_body_too_large", outcome: "rejected" });
  throw error;
}

export function registerItineraryRoutes(app: FastifyInstance, service: Pick<ItineraryService, "list" | "get" | "command">, resolveActor: ItineraryActorResolver = async () => null) {
  const respond = async (request: FastifyRequest, reply: FastifyReply, work: (actor: ItineraryActor | null) => unknown) => {
    reply.header("cache-control", "private, no-store").header("vary", "authorization");
    try { return reply.send(work(await resolveActor(request))); }
    catch (error) {
      if (error instanceof ItineraryCommandError) return reply.code(error.statusCode).send({ code: error.code, ...error.details, outcome: "rejected" });
      return reply.code(503).send({ code: "itinerary_storage_unavailable", outcome: "unknown", retryWithSameCommand: true });
    }
  };
  app.get<{ Querystring: { cursor?: string } }>("/v2/itineraries", (request, reply) => respond(request, reply, actor => {
    const cursor = request.query.cursor === undefined ? undefined : Number(request.query.cursor);
    if (cursor !== undefined && (!Number.isSafeInteger(cursor) || cursor < 1)) throw new ItineraryCommandError("invalid_itinerary_cursor");
    return service.list(actor, cursor);
  }));
  app.get<{ Params: { id: string } }>("/v2/itineraries/:id", (request, reply) => respond(request, reply, actor => ({ schemaVersion: "starward-itinerary-v2", itinerary: service.get(actor, request.params.id) })));
  app.get<{ Params: { id: string; revision: string } }>("/v2/itineraries/:id/revisions/:revision", (request, reply) => respond(request, reply, actor => {
    const revision = Number(request.params.revision);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new ItineraryCommandError("invalid_itinerary_revision");
    return { schemaVersion: "starward-itinerary-v2", itinerary: service.get(actor, request.params.id, revision) };
  }));
  app.post("/v2/itineraries/commands", { errorHandler: commandRequestError }, (request, reply) => respond(request, reply, actor => service.command(actor, request.body)));

  // V1 lacked inputs, revisions and retry identity. It cannot express a real
  // draft and its old renderer dereferences made-up route/stage values. Preserve
  // the endpoint with an explicit upgrade response instead of inventing data.
  app.get("/v1/itineraries", (_request, reply) => reply.code(409).header("cache-control", "private, no-store").send({ code: "itinerary_client_upgrade_required", apiVersion: "v2", legacyRecordsPreserved: true }));
  app.post<{ Body: { command?: string } }>("/v1/itineraries/commands", { errorHandler: commandRequestError }, (request, reply) => {
    const command = request.body?.command;
    if (command === "create-draft" || command === "patch-draft") return respond(request, reply, actor => service.command(actor, request.body));
    const known = ["generate", "overview", "add-candidate", "select-route", "refresh", "share-offline", "merge-collaboration", "astronomy-timeline"].includes(command ?? "");
    return reply.code(known ? 409 : 400).header("cache-control", "private, no-store").send({ code: known ? "itinerary_client_upgrade_required" : "invalid_itinerary_command", apiVersion: "v2", legacyRecordsPreserved: true });
  });
}
