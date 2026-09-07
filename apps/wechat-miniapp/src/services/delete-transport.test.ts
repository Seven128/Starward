import assert from "node:assert/strict";
import test from "node:test";
import { transportHarness } from "./api-request-test-support";

test("empty DELETE avoids JSON parsing while revision-bearing DELETE retains its body", async () => {
  for (const body of [undefined, { expectedRevision: 3 }]) {
    const h = transportHarness();
    const pending = h.request("delete", "/synthetic", { method: "DELETE", body });
    const call = h.calls[0]!;
    assert.equal(call.header["Content-Type"], body === undefined ? "text/plain" : undefined);
    assert.equal(call.data, body);
    call.success({ statusCode: 200, data: h.response });
    await pending;
  }
});
