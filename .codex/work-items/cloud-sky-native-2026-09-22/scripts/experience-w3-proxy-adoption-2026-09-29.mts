// One-shot real running 8791 adoption, with a synthetic public Context kept in
// memory across replacement. Production Mini file/source owners; desktop fetch
// and disk are explicit I/O adapters. No native, phone or private-ID recording.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { startDeepSkyImageRequest } from "../../../../apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts";
import { matchingCelestialInformationResponse } from "../../../../apps/wechat-miniapp/src/services/celestial-information-response.ts";

const origin = "http://127.0.0.1:8791", direct = "http://127.0.0.1:8789";
const output = ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-w3-proxy-adoption-2026-09-29.json";
assert(!fs.existsSync(output));
const fileRoot = path.resolve("output/cloud-sky-w3-running-0929");
fs.mkdirSync(fileRoot, { recursive: true });
const headers = { "x-starward-measurement-probe": "1" };
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function get(relative: string, base = origin) {
  return fetch(base + relative, { headers, signal: AbortSignal.timeout(5000) });
}
async function json(relative: string, base = origin) {
  const response = await get(relative, base); assert.equal(response.status, 200); return response.json();
}
const controlBefore = await json("/__sky_test/context-status");
assert.equal(controlBefore.mode, "pass");
const trafficBefore = await json("/__sky_test/traffic-status");
assert.equal(trafficBefore.resourceMode, "pass");
assert.equal(trafficBefore.heldResourceCount, 0);
assert.equal(trafficBefore.active.length, 0);
const resolve = await fetch(direct + "/v2/observation-contexts/resolve", {
  method: "POST", headers: { ...headers, "content-type": "application/json" }, signal: AbortSignal.timeout(5000),
  body: JSON.stringify({ location: { kind: "FORMAL_SPOT", spotId: "spot:test-published" }, localDate: "2026-09-29", selectedAt: "2026-09-29T20:00:00.000Z" }),
});
assert.equal(resolve.status, 201);
const initial = (await resolve.json()).data;
const contextRoute = "/v2/observation-contexts/" + encodeURIComponent(initial.contextId);
assert.deepEqual((await json(contextRoute)).data, initial);
console.log(JSON.stringify({ waitingForPublicationAdoption: true, contextCreatedOnlyInMemory: true, previousEpoch: trafficBefore.epochStartedAt }));
let adoption: any = null, unavailableChecks = 0;
const deadline = Date.now() + 60000;
while (!adoption && Date.now() < deadline) {
  try {
    const response = await get("/__sky_test/publication-status");
    if (response.status === 200) adoption = await response.json();
  } catch { unavailableChecks++; }
  if (!adoption) await delay(500);
}
assert(adoption, "bounded publication adoption not observed");
assert.match(adoption.publicationHash, /^[a-f0-9]{64}$/u);
assert.equal(adoption.contextUpstream, 8789);
assert.deepEqual((await json(contextRoute)).data, initial, "existing Context must survive proxy replacement");
const manifest = await json(`/v2/sky/deep-sky/${adoption.publicationHash}/manifest`);
assert.equal(manifest.schemaVersion, "allwise-w3-deep-sky-publication-v3");
assert.equal(manifest.publicationHash, adoption.publicationHash);
const entry = manifest.entries.find((value: any) => value.objectRef === "M:42");
const legacyHash = manifest.legacyPublicationHash;
const oldResponse = await get("/v2/celestial-objects/M%3A42/image?level=DETAIL");
assert.equal(oldResponse.status, 200);
assert.equal(oldResponse.headers.get("content-type"), "image/jpeg");
const oldBytes = new Uint8Array(await oldResponse.arrayBuffer());
const legacy = await json(`/v2/sky/deep-sky/${legacyHash}/manifest`);
const legacyDetail = legacy.entries.find((value: any) => value.objectRef === "M:42").levels.DETAIL;
assert.equal(hash(oldBytes), legacyDetail.sha256);

const owned = new Set<any>(), rows: any[] = [];
try {
  // Real bounded canceled stream through the existing weak-network control.
  const control = await fetch(origin + "/__sky_test/resource-mode", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "hold-one-detail" }), signal: AbortSignal.timeout(5000) });
  assert.equal(control.status, 200);
  const cancelled = new AbortController();
  const paused = await fetch(origin + "/v2/celestial-objects/M%3A42/image?level=DETAIL&imageVersion=source-finite-v3", {
    headers, signal: AbortSignal.any([cancelled.signal, AbortSignal.timeout(5000)]),
  });
  assert.equal(paused.status, 200); assert.equal(paused.headers.get("content-type"), "image/png");
  assert.equal(paused.headers.get("x-starward-image-publication-hash"), adoption.publicationHash);
  assert.equal((await json("/__sky_test/traffic-status")).heldResourceCount, 1);
  cancelled.abort();
  for (let attempt = 0; attempt < 10; attempt++) {
    const current = await json("/__sky_test/traffic-status");
    if (!current.heldResourceCount && !current.active.length) break;
    await delay(50);
  }
  const retired = await json("/__sky_test/traffic-status");
  assert.equal(retired.heldResourceCount, 0); assert.equal(retired.active.length, 0);
  assert(retired.records.some((record: any) => record.controlledResourceOutcome === "downstream-cancel"));
  for (const level of ["OVERVIEW", "MEDIUM", "DETAIL", "LEGACY_DETAIL"] as const) {
    const actualLevel = level === "LEGACY_DETAIL" ? "DETAIL" : level;
    const relative = `/v2/celestial-objects/M%3A42/image?level=${actualLevel}&imageVersion=source-finite-v3`
      + (level === "LEGACY_DETAIL" ? `&publicationHash=${legacyHash}` : "");
    const asset = await new Promise<any>((resolveAsset, reject) => {
      startDeepSkyImageRequest({ asset: { reference: "M:42", level: actualLevel, tempFilePath: path.join(fileRoot, `deep-sky-M-42-${level}.jpg`) },
        url: origin + relative,
        request(options) {
          const abort = new AbortController();
          void fetch(options.url, { headers, signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]) })
            .then(async response => options.success({ statusCode: response.status, data: await response.arrayBuffer(), header: Object.fromEntries(response.headers) }))
            .catch(() => options.fail());
          return { abort: () => abort.abort() };
        },
        writeFile(options) { fs.writeFileSync(options.filePath, Buffer.from(options.data)); options.success(); },
        removeFile(file) { assert.equal(path.dirname(path.resolve(file)), fileRoot); fs.unlinkSync(file); },
        onReady: resolveAsset, onError: () => reject(Error("running_publication_rejected_by_mini_owner")),
      });
    });
    owned.add(asset);
    const bytes = fs.readFileSync(asset.tempFilePath);
    const expected = level === "LEGACY_DETAIL" ? legacyDetail : entry.levels[actualLevel];
    assert.equal(hash(bytes), expected.sha256); assert.equal(bytes.length, expected.bytes);
    assert.equal(asset.publicationHash, level === "LEGACY_DETAIL" ? legacyHash : adoption.publicationHash);
    assert.equal(path.extname(asset.tempFilePath), level === "LEGACY_DETAIL" ? ".jpg" : ".png");
    const information = matchingCelestialInformationResponse(await json(`/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${asset.publicationHash}`), "M:42", asset.publicationHash);
    assert.equal(information.data.sources.find((source: any) => source.id.startsWith("imagery:")).id, asset.sourceId);
    rows.push({ level, bytes: bytes.length, sha256: hash(bytes), publicationHash: asset.publicationHash, sourceId: asset.sourceId,
      sourceMissingPixels: asset.sourceMissingPixels ?? null, fieldDegrees: asset.fieldDegrees, suffix: path.extname(asset.tempFilePath) });
    asset.release(); owned.delete(asset); assert(!fs.existsSync(asset.tempFilePath));
  }
  const invalid = await get("/v2/celestial-objects/M%3A42/image?imageVersion=invalid");
  assert.equal(invalid.status, 400); await invalid.arrayBuffer();
  const unavailableSource = await json(`/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${"0".repeat(64)}`);
  assert.equal(unavailableSource.dataState, "PARTIAL");
  assert(!unavailableSource.data.sources.some((source: any) => source.id.startsWith("imagery:")));
  const recovered = await get("/v2/celestial-objects/M%3A42/image?level=DETAIL&imageVersion=source-finite-v3");
  assert.equal(hash(new Uint8Array(await recovered.arrayBuffer())), entry.levels.DETAIL.sha256);
  assert.deepEqual((await json(contextRoute)).data, initial);
  const state = await json("/__sky_test/traffic-status"), contextState = await json("/__sky_test/context-status");
  assert.equal(state.resourceMode, "pass"); assert.equal(state.heldResourceCount, 0); assert.equal(state.active.length, 0);
  assert.equal(contextState.mode, "pass"); assert.equal(contextState.puts, 0);
  const result = { scope: "Running task proxy 8791 -> real compiled publication controllers, production Mini loader/source validator with desktop HTTP/disk adapters. Existing 8789 Context retained; not a whole BFF upgrade, native rendering, phone, cloud or quality acceptance",
    publicationHash: adoption.publicationHash, contextRetained: { syntheticPublicSpot: true, revision: initial.revision, selectedAtUtc: initial.selectedAtUtc, expiresAtUnchanged: true },
    previousEpoch: trafficBefore.epochStartedAt, currentEpoch: state.epochStartedAt, unavailableChecks, legacyUnversionedBytesUnchanged: true,
    cancelledStreamRetired: true, missingSourceFacts: "PARTIAL", invalidVersionStatus: 400, rows, releasedFiles: 4,
    controls: { contextMode: contextState.mode, resourceMode: state.resourceMode, held: state.heldResourceCount, active: state.active.length },
    nativeCandidateOpened: false, phoneAccepted: false, independentReview: false };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(result));
} finally {
  for (const asset of owned) asset.release();
  await fetch(origin + "/__sky_test/resource-mode", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "pass" }), signal: AbortSignal.timeout(5000) });
}
