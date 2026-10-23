import { assertNightReportRequest, isNightReport, type NightReport, type NightReportRequest } from "@starward/contracts/night-report";

export type NightReportClient = { create(request: NightReportRequest, signal?: AbortSignal): Promise<NightReport> };

export function createNightReportClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}): NightReportClient {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  return {
    async create(request, signal) {
      assertNightReportRequest(request);
      if (!baseUrl) throw new Error("night_report_api_base_url_missing");
      const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}/v1/night-reports`, {
        method: "POST", headers: { "content-type": "application/json", "x-request-id": request.requestId }, body: JSON.stringify(request), signal,
      });
      if (!response.ok) throw new Error(`night_report_http_${response.status}`);
      const value: unknown = await response.json();
      if (!isNightReport(value)) throw new Error("night_report_response_invalid");
      const context = value.context;
      if (!context || context.nightDate !== request.nightDate || context.timezone !== request.timezone || context.target !== request.target || context.profile !== request.profile
        || context.location?.lat !== request.location.lat || context.location?.lon !== request.location.lon
        || context.route?.origin?.lat !== request.route.origin.lat || context.route?.origin?.lon !== request.route.origin.lon
        || context.route?.maxTravelMinutes !== request.route.maxTravelMinutes) throw new Error("night_report_response_context_mismatch");
      return value;
    },
  };
}
