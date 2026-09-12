import assert from "node:assert/strict";
import test from "node:test";
import { AmapRouteAdapter } from "./route-provider.ts";

const origin = {
  system: "WGS84" as const,
  latitude: 22.543096,
  longitude: 114.057865,
};
const destination = {
  system: "WGS84" as const,
  latitude: 22.4184,
  longitude: 114.3227,
};

test("AMap route adapter converts coordinates once and normalizes attributable v5 output", async () => {
  let requestedUrl = "";
  const adapter = new AmapRouteAdapter("server-only-secret", async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        status: "1",
        infocode: "10000",
        route: {
          paths: [
            {
              distance: "12345",
              cost: { duration: "1450" },
              steps: [
                { road_name: "起点道路" },
                { road_name: "末段道路" },
              ],
            },
          ],
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  const result = await adapter.estimate({ origin, destination });
  assert.equal(result.state, "FRESH");
  assert.equal(result.value?.kind, "ROUTE_ESTIMATE");
  assert.equal(result.value?.travelMode, "DRIVING");
  assert.equal(result.value?.durationMinutes, 24);
  assert.equal(result.value?.distanceKm, 12.3);
  assert.equal(result.value?.driveMinutes, 24);
  assert.equal(result.value?.lastRoad, "末段道路");
  const requested = new URL(requestedUrl);
  assert.equal(requested.pathname, "/v5/direction/driving");
  assert.equal(requested.searchParams.get("strategy"), "32");
  assert.equal(requested.searchParams.get("show_fields"), "cost,navi");
  assert.notEqual(
    requested.searchParams.get("origin"),
    `${origin.longitude.toFixed(6)},${origin.latitude.toFixed(6)}`,
  );
  assert.equal(result.source.sourceUrl.includes("server-only-secret"), false);
  assert.equal(JSON.stringify(result.value).includes("server-only-secret"), false);
});

test("AMap route adapter normalizes walking duration without labelling it as driving", async () => {
  let requestedUrl = "";
  const adapter = new AmapRouteAdapter("server-only-secret", async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      status: "1",
      infocode: "10000",
      route: {
        paths: [{
          distance: "3456",
          cost: { duration: "2700" },
          steps: [{ road_name: "登山步道" }],
        }],
      },
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const result = await adapter.estimate({ origin, destination, travelMode: "WALKING" });
  assert.equal(result.state, "FRESH");
  assert.equal(result.value?.travelMode, "WALKING");
  assert.equal(result.value?.durationMinutes, 45);
  assert.equal(result.value?.driveMinutes, null);
  assert.equal(result.value?.walkingMinutes, 45);
  assert.equal(result.value?.lastRoad, "登山步道");
  const requested = new URL(requestedUrl);
  assert.equal(requested.pathname, "/v5/direction/walking");
  assert.equal(requested.searchParams.get("isindoor"), "0");
});

test("AMap route adapter resolves required city codes and normalizes transit output", async () => {
  const requestedUrls: URL[] = [];
  const adapter = new AmapRouteAdapter("server-only-secret", async (input) => {
    const url = new URL(String(input));
    requestedUrls.push(url);
    if (url.pathname === "/v3/geocode/regeo") {
      return new Response(JSON.stringify({
        status: "1",
        infocode: "10000",
        regeocode: { addressComponent: { citycode: "0755" } },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({
      status: "1",
      infocode: "10000",
      route: {
        transits: [{
          distance: "28700",
          cost: { duration: "5400" },
          segments: [{ bus: { buslines: [{ name: "E11 路" }] } }],
        }],
      },
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const result = await adapter.estimate({
    origin,
    destination,
    travelMode: "TRANSIT",
    departureLocalDate: "2026-08-12",
    departureLocalTime: "19:30",
  });
  assert.equal(requestedUrls.filter((url) => url.pathname === "/v3/geocode/regeo").length, 2);
  const routeUrl = requestedUrls.find((url) => url.pathname === "/v5/direction/transit/integrated");
  assert.ok(routeUrl);
  assert.equal(routeUrl.searchParams.get("city1"), "0755");
  assert.equal(routeUrl.searchParams.get("city2"), "0755");
  assert.equal(routeUrl.searchParams.get("date"), "2026-08-12");
  assert.equal(routeUrl.searchParams.get("time"), "19-30");
  assert.equal(routeUrl.searchParams.get("nightflag"), "1");
  assert.equal(result.value?.travelMode, "TRANSIT");
  assert.equal(result.value?.durationMinutes, 90);
  assert.equal(result.value?.driveMinutes, null);
  assert.equal(result.value?.walkingMinutes, null);
  assert.equal(result.value?.lastRoad, "E11 路");
});

test("AMap route adapter fails closed without inventing distance or duration", async () => {
  const adapter = new AmapRouteAdapter("server-only-secret", async () =>
    new Response(JSON.stringify({ status: "0", infocode: "10001" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  const result = await adapter.estimate({ origin, destination });
  assert.equal(result.state, "UNAVAILABLE");
  assert.equal(result.value?.kind, "UNAVAILABLE");
  assert.equal(result.value?.distanceKm, null);
  assert.equal(result.value?.driveMinutes, null);
  assert.match(result.errorCode ?? "", /amap_rejected_10001/u);
  assert.equal(
    result.source.limitations.some((item) => item.includes("amap_")),
    false,
    "internal provider error codes must not leak into user-facing provenance",
  );
});
