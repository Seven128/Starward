import assert from "node:assert/strict";
import test from "node:test";
import { AmapPlaceSearchAdapter } from "./place-provider.ts";

test("AMap place adapter returns only attributable ordinary map references", async () => {
  let requestedUrl = "";
  const adapter = new AmapPlaceSearchAdapter(
    "server-only-secret",
    async (input) => {
      requestedUrl = String(input);
      return new Response(
        JSON.stringify({
          status: "1",
          infocode: "10000",
          pois: [
            {
              id: "B0FFTEST",
              name: "深圳湾公园",
              location: "113.942111,22.486111",
              address: "望海路",
              pname: "广东省",
              cityname: "深圳市",
              adname: "南山区",
            },
            { id: "missing-location", name: "无坐标结果" },
            { id: "bad-coordinate", name: "坏坐标", location: "999,999" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  );
  const result = await adapter.search({ query: "深圳湾", region: "深圳" });
  assert.equal(result.state, "FRESH");
  assert.equal(result.value?.length, 1);
  assert.deepEqual(result.value?.[0], {
    placeId: "B0FFTEST",
    label: "深圳湾公园",
    address: "望海路",
    region: "广东省 · 深圳市 · 南山区",
    kind: "ORDINARY_PLACE",
    location: {
      system: "GCJ02",
      latitude: 22.486111,
      longitude: 113.942111,
    },
    actions: ["MOVE_MAP", "FIND_NEARBY_FORMAL_SPOTS"],
    spotId: null,
    nightSkyAllowed: false,
    dataState: "FRESH",
    source: result.source,
  });
  const requested = new URL(requestedUrl);
  assert.equal(requested.pathname, "/v5/place/text");
  assert.equal(requested.searchParams.get("keywords"), "深圳湾");
  assert.equal(requested.searchParams.get("region"), "深圳");
  assert.equal(requested.searchParams.get("key"), "server-only-secret");
  assert.equal(JSON.stringify(result).includes("server-only-secret"), false);
  assert.equal(result.source.kind, "THIRD_PARTY_PLACE");
});

test("AMap place adapter fails closed when provider rejects the request", async () => {
  const adapter = new AmapPlaceSearchAdapter("server-only-secret", async () =>
    new Response(JSON.stringify({ status: "0", infocode: "10001" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  const result = await adapter.search({ query: "深圳湾" });
  assert.equal(result.state, "UNAVAILABLE");
  assert.equal(result.value, null);
  assert.match(result.errorCode ?? "", /amap_place_rejected/u);
  assert.equal(
    result.source.limitations.some((item) => item.includes("amap_")),
    false,
    "internal provider error codes must not leak into user-facing provenance",
  );
});
