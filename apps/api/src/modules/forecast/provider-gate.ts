import type { ProviderUse, WeatherProviderId } from "../../../../../packages/weather-schema/src/index";

export const WEATHER_HARD_GATES = [
  "provenance",
  "authenticity",
  "target-region-stability",
  "commercial-rights",
  "safe-degradation",
] as const;

export type WeatherHardGate = typeof WEATHER_HARD_GATES[number];

export interface WeatherProviderGateRecord {
  id: WeatherProviderId;
  productionEnabled: boolean;
  passedGates: WeatherHardGate[];
  licenseStatus: string;
}

export class ProviderGateError extends Error {
  constructor(public readonly code: string, public readonly details: string[]) {
    super(code);
    this.name = "ProviderGateError";
  }
}

export function assertWeatherProviderUse(
  record: WeatherProviderGateRecord,
  use: ProviderUse,
  endpointClass: "free" | "commercial",
): void {
  if (record.id === "open-meteo" && endpointClass === "free" && use === "production") {
    throw new ProviderGateError("open_meteo_free_endpoint_forbidden_in_production", ["commercial_endpoint_required"]);
  }
  if (use === "noncommercial-poc") return;

  const missing = WEATHER_HARD_GATES.filter((gate) => !record.passedGates.includes(gate));
  if (!record.productionEnabled || missing.length || record.licenseStatus !== "approved-commercial") {
    throw new ProviderGateError("weather_provider_not_approved_for_production", [
      ...missing,
      ...(!record.productionEnabled ? ["production-disabled"] : []),
      ...(record.licenseStatus !== "approved-commercial" ? ["commercial-license-unapproved"] : []),
    ]);
  }
}
