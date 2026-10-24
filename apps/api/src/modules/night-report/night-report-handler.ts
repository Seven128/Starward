import type { NightReportRequest } from "../../../../../packages/contracts/src/night-report";
import type { NightReportService } from "./night-report-service";
import type { AwaitedNightReportRuntime } from "./runtime-types";
import type { LocalPocOwner } from "../../local-poc-owner";
import { NightReportPersistenceError } from "./sqlite-night-report-repository";

export type NightReportHttpRequest = { body: unknown; headers: Record<string, string | string[] | undefined>; actor?: LocalPocOwner | null };
export type NightReportHttpResponse = { status: number; headers: Record<string, string>; body: unknown };

export function createNightReportHandler(service: Pick<NightReportService, "create"> & Partial<Pick<NightReportService, "generate">>, runtime?: AwaitedNightReportRuntime) {
  return async function handle(request: NightReportHttpRequest): Promise<NightReportHttpResponse> {
    const body = request.body as Partial<NightReportRequest> | null;
    const requestHeader = request.headers["x-request-id"];
    const requestId = Array.isArray(requestHeader) ? requestHeader[0] : requestHeader;
    if (!body || typeof body !== "object") return { status: 422, headers: { "cache-control": "no-store" }, body: { code: "night_report_body_required" } };
    if (!requestId || body.requestId !== requestId) return { status: 422, headers: { "cache-control": "no-store" }, body: { code: "night_report_request_id_mismatch" } };
    try {
      const persisted = runtime && request.actor ? await runtime.service.create(request.actor, body as NightReportRequest) : null;
      const report = persisted?.report ?? await (service.generate ?? service.create).call(service, body as NightReportRequest);
      return { status: 200, headers: { "cache-control": "private, no-store", vary: "authorization", etag: `W/\"night-report-${report.id}-${report.revision}\"`, "x-request-id": report.requestId, "x-night-report-storage": persisted ? "local-owner-poc-v1" : "ephemeral", "x-night-report-replayed": String(persisted?.replayed ?? false) }, body: report };
    } catch (error) {
      const code = error instanceof Error ? error.message : "night_report_unknown_error";
      if (error instanceof NightReportPersistenceError || code === "night_report_idempotency_conflict") return { status: error instanceof NightReportPersistenceError ? error.statusCode : 409, headers: { "cache-control": "private, no-store", "x-request-id": requestId }, body: { code, outcome: "rejected" } };
      const invalid = /required|invalid|wgs84|timezone|route_limit|route_mode/u.test(code);
      return { status: invalid ? 422 : 503, headers: { "cache-control": "no-store", "x-request-id": requestId }, body: { code: invalid ? code : "night_report_temporarily_unavailable", outcome: invalid ? "rejected" : "unknown" } };
    }
  };
}
