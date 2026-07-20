import { parseForecastQuery } from "../../../../../packages/contracts/src/forecast";
import type { ForecastQueryService } from "./forecast-query-service";

export function createForecastHandler(service: Pick<ForecastQueryService, "get">) {
  return async (query: Record<string, unknown>) => {
    try {
      const bundle = await service.get(parseForecastQuery(query));
      return { status: 200, headers: { "cache-control": "private, max-age=300", "x-data-mode": bundle.runtimeMode }, body: bundle };
    } catch (error) {
      const message = error instanceof Error ? error.message : "forecast_unavailable";
      if (message.startsWith("forecast_")) return { status: 400, headers: { "cache-control": "no-store" }, body: { code: message } };
      throw error;
    }
  };
}
