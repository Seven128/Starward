import { parseSkyQuery } from "../../../../../packages/contracts/src/sky";
import type { SkyContextService } from "./sky-context-service";

export function createSkyContextHandler(service: Pick<SkyContextService, "get">) {
  return async (query: Record<string, unknown>) => {
    try {
      return { status: 200, body: await service.get(parseSkyQuery(query)) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "sky_query_invalid";
      if (message.startsWith("sky_")) return { status: 400, body: { code: message } };
      throw error;
    }
  };
}
