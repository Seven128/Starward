import type { NightReportRequest } from "../../../../../packages/contracts/src/night-report";
import type { NightReportService } from "./night-report-service";

export type NightReportHttpRequest = { body: unknown; headers: Record<string, string | string[] | undefined> };
export type NightReportHttpResponse = { status: number; headers: Record<string, string>; body: unknown };

export function createNightReportHandler(service: Pick<NightReportService, "create">) {
  return async function handle(request: NightReportHttpRequest): Promise<NightReportHttpResponse> {
    const body = request.body as Partial<NightReportRequest> | null;
    const requestHeader = request.headers["x-request-id"];
    const requestId = Array.isArray(requestHeader) ? requestHeader[0] : requestHeader;
    if (!body || typeof body !== "object") return { status: 422, headers: { "cache-control": "no-store" }, body: { code: "night_report_body_required" } };
    if (!requestId || body.requestId !== requestId) return { status: 422, headers: { "cache-control": "no-store" }, body: { code: "night_report_request_id_mismatch" } };
    try {
      const report = await service.create(body as NightReportRequest);
      return { status: 200, headers: { "cache-control": "private, no-store", etag: `W/\"night-report-${report.id}-${report.revision}\"`, "x-request-id": report.requestId }, body: report };
    } catch (error) {
      const code = error instanceof Error ? error.message : "night_report_unknown_error";
      const invalid = /required|invalid|wgs84|timezone|route_limit|route_mode/u.test(code);
      return { status: invalid ? 422 : 503, headers: { "cache-control": "no-store", "x-request-id": requestId }, body: { code: invalid ? code : "night_report_temporarily_unavailable" } };
    }
  };
}
