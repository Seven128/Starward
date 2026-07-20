import { describe, expect, it } from "vitest";
import { createProfileClient } from "./profile-client";

const snapshot = { schemaVersion: "starward-profile-v1", revision: 1 };
describe("profile client", () => {
  it("loads and commands the private versioned profile boundary", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => { calls.push([input, init]); return new Response(JSON.stringify(snapshot), { status: 200 }); }) as typeof fetch;
    const client = createProfileClient({ baseUrl: "http://api", fetcher });
    await expect(client.get()).resolves.toMatchObject(snapshot);
    await expect(client.command("restrict-location")).resolves.toMatchObject(snapshot);
    expect(calls[1]?.[0]).toBe("http://api/v1/profile/commands");
    expect(calls[1]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ command: "restrict-location" }) });
  });
});
