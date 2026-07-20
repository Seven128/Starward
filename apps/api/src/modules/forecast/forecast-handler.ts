import { parseForecastQuery } from "../../../../../packages/contracts/src/forecast";
import type { ForecastQueryService } from "./forecast-query-service";
import type { AwaitedForecastRuntime } from "./runtime-types";

export function createForecastHandler(service: Pick<ForecastQueryService, "get">, runtime?: AwaitedForecastRuntime) {
  return async (query: Record<string, unknown>) => {
    try {
      const bundle = await service.get(parseForecastQuery(query));
      if (runtime) {
        const token = `${bundle.context.latitude}:${bundle.context.longitude}:${bundle.context.nightDate}:${bundle.context.target}`;
        await runtime.execute({
          outcome: "forecast-and-astronomy",
          actorId: "personal-trial-owner",
          operation: "forecast.resolve",
          idempotencyKey: `forecast:${bundle.primary.run.runId}:${bundle.generatedAt}:${token}`,
          payload: { token, query: bundle.context, generatedAt: bundle.generatedAt },
        });
      }
      return { status: 200, headers: { "cache-control": "private, max-age=300", "x-data-mode": bundle.runtimeMode }, body: bundle };
    } catch (error) {
      const message = error instanceof Error ? error.message : "forecast_unavailable";
      if (message.startsWith("forecast_")) return { status: 400, headers: { "cache-control": "no-store" }, body: { code: message } };
      throw error;
    }
  };
}
