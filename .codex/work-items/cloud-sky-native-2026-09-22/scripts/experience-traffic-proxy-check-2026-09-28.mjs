import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const headers = { "x-starward-measurement-probe": "1" };
const manifestResponse = await fetch("http://127.0.0.1:8791/v2/sky/galactic/manifest", { headers });
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.schemaVersion, "starward-2mass-galactic-v1");
const path = manifest.image.downloadUrl;
assert.match(path, /^\/v2\/sky\/galactic\/[0-9a-f]{64}\/2mass-galactic-2048x1024\.jpg$/);
const direct = await fetch(`http://127.0.0.1:8789${path}`, { headers });
const expected = Buffer.from(await direct.arrayBuffer());
const forwarded = await fetch(`http://127.0.0.1:8791${path}`, { headers });
const actual = Buffer.from(await forwarded.arrayBuffer());
assert.equal(forwarded.status, direct.status);
assert.deepEqual(actual, expected);
for (const name of ["content-type", "content-length", "cache-control"]) {
  assert.equal(forwarded.headers.get(name), direct.headers.get(name));
}
assert.equal(actual.length, manifest.image.bytes);
assert.equal(createHash("sha256").update(actual).digest("hex"), manifest.image.sha256);
const snapshot = await (await fetch("http://127.0.0.1:8791/__sky_test/traffic-status")).json();
const image = snapshot.records.findLast(record => record.agentProbe && record.resourceKind === "galactic_image");
assert.equal(image.status, 200);
assert.equal(image.upstreamBodyBytes, actual.length);
assert.equal(image.declaredContentLength, actual.length);
assert.equal(image.upstreamEnded, true);
assert.equal(image.downstreamFinished, true);
assert.equal(image.immutable, true);
assert.equal(image.maxAgeSeconds, 31536000);
assert.ok(!JSON.stringify(snapshot).includes(path));
assert.ok(snapshot.active.every(record => !record.agentProbe));
console.log(JSON.stringify({ scope: "agent_transport_probe", exactBodyAndHeadersPreserved: true,
  publishedImageIdentityAndLengthVerified: true, privacy: "no_url_id_header_values_or_payload_in_measurement",
  galacticBodyBytes: actual.length, proxyRecord: image }));
