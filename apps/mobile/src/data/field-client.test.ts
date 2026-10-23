import { describe, expect, it } from "vitest";
import { createFieldClient } from "./field-client";
const status = { schemaVersion: "starward-field-v2", generatedAt: "2026-10-24T00:00:00Z", capabilities: { "observation-pack": "unavailable", "parking-route": "unavailable", "backup-switch": "unavailable", "safety-session": "unavailable", "location-share": "unavailable", "offline-replay": "unavailable" } };
describe("field status client", () => {
  it("reads availability without issuing a field command or inventing device state", async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const client = createFieldClient({ baseUrl: "http://api", fetcher: (async (input, init) => { calls.push({ url: String(input), method: init?.method }); return new Response(JSON.stringify(status)); }) as typeof fetch });
    expect(await client.get()).toEqual(status); expect(calls).toEqual([{ url: "http://api/v2/field", method: undefined }]); expect(client).not.toHaveProperty("command");
  });
  it("does not accept the former synthetic pack as a current capability result", async () => {
    const client = createFieldClient({ baseUrl: "http://api", fetcher: (async () => new Response(JSON.stringify({ schemaVersion: "starward-field-v1", pack: { canActivate: true } }))) as typeof fetch });
    await expect(client.get()).rejects.toThrow("field_response_invalid");
  });
});
