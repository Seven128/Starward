import { fieldCapabilityNames, type FieldStatus } from "../../../../packages/domain/src/offline/field-status";
export type { FieldStatus } from "../../../../packages/domain/src/offline/field-status";

export function createFieldClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const base = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL, fetcher = options.fetcher ?? fetch;
  return { get: async (signal?: AbortSignal): Promise<FieldStatus> => {
    if (!base) throw new Error("field_api_base_url_missing");
    const response = await fetcher(`${base.replace(/\/$/u, "")}/v2/field`, { signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`field_http_${response.status}`);
    const value = await response.json() as FieldStatus;
    if (value?.schemaVersion !== "starward-field-v2" || !value.capabilities || !fieldCapabilityNames.every(name => value.capabilities[name] === "unavailable")) throw new Error("field_response_invalid");
    return value;
  } };
}
