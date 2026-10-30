import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PNG } from "pngjs";
import { displayRasterWindowBounds, displayRasterWindowForBounds } from "@starward/coordinate-system";
import { assertCloudDisplayInventory, assertCloudDisplayProof, assertCloudDisplayRecord,
  type CloudDisplayWindowProof, type CloudDisplayInventory } from "@starward/miniapp-contracts";
import { prepareCloudDisplayWindows } from "../../../data-pipelines/cloud/prepare_tcc_display.mts";
import { CloudNumericPublication } from "./cloud-publication.ts";
import { cloudContextPin } from "./cloud-publication-registry.ts";
import { CloudDisplayPublication } from "./cloud-display-publication.ts";
import { createCloudPublicationFixture } from "./test-fixtures/cloud-publication-fixture.ts";

const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const nativeAt = "2026-10-27T00:00:00Z", selectedAt = "2026-10-27T01:30:00Z";
const viewport = { west: 113.01, east: 113.08, south: 22.92, north: 22.99 };
const window = displayRasterWindowForBounds(viewport);
const missingWindow = displayRasterWindowForBounds({ west: 115.01, east: 115.08, south: 22.92, north: 22.99 });

async function fixture() {
  const numericInput = await createCloudPublicationFixture();
  const numeric = await CloudNumericPublication.open(numericInput.directory, numericInput.manifestSha256);
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-cloud-display-"));
  try {
    const produced = await prepareCloudDisplayWindows({ directory: numericInput.directory, manifestSha256: numericInput.manifestSha256,
      output: directory, windows: [window, missingWindow], selectedTimes: [nativeAt, selectedAt],
      execution: { deadlineAt: new Date(Date.now() + 30_000).toISOString(), maximumConcurrent: 1,
        maximumQueued: 0, maximumOutputBytes: 4 * 1024 * 1024 } });
    const inventorySha256 = hash(await readFile(path.join(directory, "inventory.json")));
    const source = { ...numeric.manifest, manifestSha256: numeric.manifestSha256 };
    const pin = cloudContextPin(numeric.manifest, numeric.manifestSha256);
    return { directory, numeric, produced, inventorySha256, source, pin,
      async open(now: () => number = () => Date.parse("2026-10-27T18:00:00Z")) {
        return CloudDisplayPublication.open({ directory, inventorySha256, numeric, now });
      },
      async dispose() {
        await numeric.close(); await numericInput.dispose();
        const target = path.resolve(directory);
        assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
        assert(path.basename(target).startsWith("starward-cloud-display-"));
        await rm(target, { recursive: true, force: true });
      } };
  } catch (error) {
    await numeric.close(); await numericInput.dispose();
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert(path.basename(target).startsWith("starward-cloud-display-"));
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}

test("the real offline producer and read-only owner share exact native/interpolated artifact contracts", async () => {
  const f = await fixture();
  try {
    const publication = await f.open();
    try {
      // Full CRC and decoded-pixel admission is explicitly offline verification.
      for (const record of f.produced.inventory.records) {
        const raw = await readFile(path.join(f.directory, record.file + ".json"));
        const proof = assertCloudDisplayProof(JSON.parse(raw.toString("utf8")), f.source);
        assertCloudDisplayRecord(record, proof);
        assert.equal(hash(raw), record.proofSha256);
        const image = PNG.sync.read(await readFile(path.join(f.directory, record.file)), { checkCRC: true });
        assert.equal(image.width, proof.width); assert.equal(image.height, proof.height);
        let validPixels = 0;
        for (let i = 3; i < image.data.length; i += 4) if (image.data[i] !== 0) validPixels++;
        assert.equal(validPixels, proof.validPixels);
      }
      const interpolated = await publication.read({ binding: f.pin, selectedAt: "2026-10-27T09:30:00+08:00", window, viewport });
      assert.equal(interpolated.state, "PARTIAL");
      assert(interpolated.raster);
      assert.equal(interpolated.raster.unit, "%");
      assert.equal(interpolated.raster.sourceManifestSha256, f.pin.manifestSha256);
      assert.equal(interpolated.raster.selectedAt, selectedAt);
      assert.equal(interpolated.raster.brackets.lowerAt, nativeAt);
      assert.equal(interpolated.raster.brackets.upperAt, "2026-10-27T03:00:00Z");
      assert.equal(interpolated.raster.brackets.fraction, 0.5);
      assert(interpolated.raster.validPixelCount > 0);
      assert(interpolated.raster.missingPixelCount > 0);
      assert(!("imageUrl" in interpolated.raster)); // Local files never authorize a public URL.
      const zero = await publication.read({ binding: f.pin, selectedAt: nativeAt, window, viewport });
      assert(zero.raster && zero.raster.zeroPixelCount > 0);
      assert.equal(zero.raster.zeroPixelCount, zero.raster.validPixelCount);
      const absent = await publication.read({ binding: f.pin, selectedAt: nativeAt, window: missingWindow,
        viewport: displayRasterWindowBounds(missingWindow) });
      assert.equal(absent.state, "UNAVAILABLE");
      if (absent.state === "UNAVAILABLE") assert.equal(absent.reason, "SOURCE_MISSING");
      assert.equal(absent.raster?.validPixelCount, 0);
    } finally { publication.close(); }
  } finally { await f.dispose(); }
});

test("fixed-window discovery never borrows a neighboring time, unqueried coverage or another pin", async () => {
  const f = await fixture();
  try {
    const publication = await f.open();
    try {
      const request = { binding: f.pin, selectedAt, window, viewport };
      assert.deepEqual(await publication.read({ ...request, selectedAt: "2026-10-27T01:30:00.001Z" }),
        { state: "UNAVAILABLE", reason: "NOT_READY", raster: null });
      assert.deepEqual(await publication.read({ ...request, selectedAt: "2026-11-08T00:00:00Z" }),
        { state: "UNAVAILABLE", reason: "OUTSIDE_COVERAGE", raster: null });
      const bounds = displayRasterWindowBounds(window);
      assert.deepEqual(await publication.read({ ...request, viewport: { ...bounds, west: bounds.west - 1e-7 } }),
        { state: "UNAVAILABLE", reason: "NOT_READY", raster: null });
      await assert.rejects(publication.read({ ...request, binding: { ...f.pin, manifestSha256: "0".repeat(64) } }), /binding_mismatch/u);
      await assert.rejects(publication.read({ ...request, selectedAt: "2026-10-27T01:30:00" }), /time_invalid/u);
      const cancelled = new AbortController(); cancelled.abort(new Error("reader_cancelled"));
      await assert.rejects(publication.read(request, cancelled.signal), /reader_cancelled/u);
      assert.equal((await publication.read(request)).state, "PARTIAL");
    } finally { publication.close(); }
    await assert.rejects(publication.read({ binding: f.pin, selectedAt, window, viewport }), /cloud_display_closed/u);
  } finally { await f.dispose(); }
});

test("source expiry is inclusive and is rechecked after asynchronous artifact reads", async () => {
  const f = await fixture();
  try {
    const until = Date.parse(f.pin.supports240HoursUntil), request = { binding: f.pin, selectedAt, window, viewport };
    let now = until;
    const publication = await f.open(() => now);
    try {
      assert.equal((await publication.read(request)).state, "PARTIAL");
      now++;
      assert.deepEqual(await publication.read(request), { state: "UNAVAILABLE", reason: "EXPIRED", raster: null });
    } finally { publication.close(); }
    let calls = 0;
    const crossing = await f.open(() => calls++ === 0 ? until : until + 1);
    try {
      assert.deepEqual(await crossing.read(request), { state: "UNAVAILABLE", reason: "EXPIRED", raster: null });
    } finally { crossing.close(); }
  } finally { await f.dispose(); }
});

test("actual file corruption and forged geometry/brackets cannot enter the prepared descriptor", async () => {
  const f = await fixture();
  try {
    const record = f.produced.inventory.records[0]!;
    const proof = JSON.parse(await readFile(path.join(f.directory, record.file + ".json"), "utf8")) as CloudDisplayWindowProof;
    const geometry = structuredClone(proof); geometry.boundsGcj02.west += 1e-7;
    assert.throws(() => assertCloudDisplayProof(geometry, f.source), /geometry_or_quality_invalid/u);
    const bracket = structuredClone(proof); bracket.brackets.upperAt = "2026-10-27T06:00:00Z";
    assert.throws(() => assertCloudDisplayProof(bracket, f.source), /bracket_mismatch/u);
    const wrongPin = structuredClone(f.produced.inventory) as CloudDisplayInventory;
    wrongPin.sourceManifestSha256 = "0".repeat(64);
    assert.throws(() => assertCloudDisplayInventory(wrongPin, f.source), /inventory_invalid/u);
    const publication = await f.open();
    try {
      const file = path.join(f.directory, record.file), bytes = await readFile(file);
      bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1;
      await writeFile(file, bytes);
      await assert.rejects(publication.read({ binding: f.pin, selectedAt: record.selectedAt, window, viewport }), /file_integrity_invalid/u);
    } finally { publication.close(); }
    await assert.rejects(CloudDisplayPublication.open({ directory: f.directory, inventorySha256: "0".repeat(64), numeric: f.numeric }), /file_integrity_invalid/u);
  } finally { await f.dispose(); }
});
