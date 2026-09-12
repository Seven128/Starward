import assert from "node:assert/strict";
import test from "node:test";
import { DeepSkyImageryService, skyViewImageUrl } from "./deep-sky-imagery.ts";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

test("SkyView request is pinned to numeric J2000 WISE settings and catalog identity", () => {
  const request = skyViewImageUrl("M:31", "MEDIUM");
  const url = new URL(request.url);
  assert.equal(url.origin, "https://skyview.gsfc.nasa.gov");
  assert.equal(url.searchParams.get("Survey"), "WISE 12");
  assert.equal(url.searchParams.get("Coordinates"), "J2000");
  assert.equal(url.searchParams.get("Projection"), "Tan");
  assert.equal(url.searchParams.get("Scaling"), "LogLog");
  assert.match(url.searchParams.get("Position") ?? "", /^\d+(?:\.\d+)?,-?\d/u);
  assert.ok(request.fieldDegrees >= 0.75 && request.fieldDegrees <= 8);
  assert.throws(() => skyViewImageUrl("HIP:32349", "MEDIUM"), /not_found/u);
});

test("overview imagery keeps large Messier objects within SkyView's reliable field size", () => {
  const request = skyViewImageUrl("M:31", "OVERVIEW");
  assert.equal(request.fieldDegrees, 4);
  assert.equal(request.pixelSize, 256);
});

test("image service coalesces requests, validates JPEG and returns isolated buffers", async () => {
  let calls = 0;
  const service = new DeepSkyImageryService(async () => {
    calls += 1;
    return new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });
  });
  const [left, right] = await Promise.all([service.get("M:31"), service.get("M:31")]);
  assert.equal(calls, 1);
  assert.deepEqual(left.bytes, Buffer.from(jpeg));
  assert.notEqual(left.bytes, right.bytes);
  left.bytes[0] = 0;
  assert.equal((await service.get("M:31")).bytes[0], 0xff);
});

test("image service rejects invalid levels and provider payloads", async () => {
  const service = new DeepSkyImageryService(async () =>
    new Response("not an image", { status: 200, headers: { "content-type": "text/html" } }));
  await assert.rejects(service.get("M:31", "FULL"), /level_invalid/u);
  await assert.rejects(service.get("M:31"), /invalid_content_type/u);
});
