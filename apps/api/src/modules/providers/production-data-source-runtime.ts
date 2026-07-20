import { evaluateProductionCarrier, type HttpTransport } from "../../../../../packages/data-source-runtime/src/index";
import type { ProviderUse } from "../../../../../packages/weather-schema/src/index";
import { OpenMeteoHttpClient } from "../forecast/open-meteo-http-client";
import type { WeatherProviderGateRecord } from "../forecast/provider-gate";
import { QWeatherHttpClient } from "../forecast/qweather-http-client";
import { AmapRouteHttpAdapter, type AmapRouteHttpAdapterOptions } from "../map/amap-route-http-adapter";

export interface ProductionCarrierActivation {
  implementationStatus: "passed" | "failed";
  externalActivationStatus: "pending" | "confirmed";
  productionEnabled: boolean;
}

export interface ProductionProviderSecrets {
  qweather: {
    apiHost: string;
    credentialId: string;
    projectId: string;
    privateKeyPem: string;
    licenseVersion: string;
    rawRetentionAllowed: boolean;
    gate: WeatherProviderGateRecord;
  };
  amap: {
    webServiceKey: string;
    resolveTransitCities?: AmapRouteHttpAdapterOptions["resolveTransitCities"];
  };
  openMeteo?: {
    apiKey: string;
    models: string[];
    licenseVersion: string;
    rawRetentionAllowed: boolean;
    gate: WeatherProviderGateRecord;
  };
}

export type ProductionDataSourceRuntime = {
  activation: ReturnType<typeof evaluateProductionCarrier>;
  qweather: QWeatherHttpClient | null;
  openMeteo: OpenMeteoHttpClient | null;
  amap: AmapRouteHttpAdapter | null;
};

/**
 * Composition boundary used after the deployment secret manager has resolved
 * provider bundles. A pending manifest deliberately creates no network-capable
 * clients; confirmed activation must include the complete server-only bundle.
 */
export function createProductionDataSourceRuntime(input: {
  activation: ProductionCarrierActivation;
  secrets?: ProductionProviderSecrets;
  transport?: HttpTransport;
  now?: () => Date;
}): ProductionDataSourceRuntime {
  const activation = evaluateProductionCarrier(input.activation);
  if (activation.disposition === "invalid") throw new Error("production_data_source_activation_invalid");
  if (!activation.productionTrafficAllowed) {
    return { activation, qweather: null, openMeteo: null, amap: null };
  }
  if (!input.secrets) throw new Error("production_provider_secret_bundle_required");
  const use: ProviderUse = "production";
  const qweather = new QWeatherHttpClient({
    ...input.secrets.qweather,
    use,
    transport: input.transport,
    now: input.now,
  });
  const openMeteo = input.secrets.openMeteo ? new OpenMeteoHttpClient({
    endpointClass: "commercial",
    ...input.secrets.openMeteo,
    use,
    transport: input.transport,
    now: input.now,
  }) : null;
  const amap = new AmapRouteHttpAdapter({
    ...input.secrets.amap,
    transport: input.transport,
    now: input.now,
  });
  return { activation, qweather, openMeteo, amap };
}
