import assert from "node:assert/strict";
import test from "node:test";
import { skyTimePreviewStatus } from "./sky-time-preview-status";

test("geometry arrival cannot claim the delayed or failed native frame has been drawn", () => {
  const at = "2026-09-29T13:00:17.000Z", previous = "2026-09-30T14:00:00.000Z";
  const input = { requestedAt: at, geometryAt: at, paintedAt: previous, playing: false, runStartAt: null,
    geometryFailed: false, canvasFailed: false };
  assert.deepEqual(skyTimePreviewStatus(input), { ready: false, pending: true, failed: false, presentedAt: previous });
  assert.equal(skyTimePreviewStatus({ ...input, canvasFailed: true }).failed, true);
  assert.equal(skyTimePreviewStatus({ ...input, paintedAt: at }).ready, true);
  assert.equal(skyTimePreviewStatus({ ...input, geometryAt: previous }).pending, true,
    "fallback geometry cannot replace the independently accepted display time");
  assert.equal(skyTimePreviewStatus({ ...input, geometryFailed: true }).presentedAt, previous);
  assert.equal(skyTimePreviewStatus({ ...input, paintedAt: undefined }).presentedAt, undefined,
    "a retired native generation supplies no claimed displayed time");
  assert.equal(skyTimePreviewStatus({ ...input, requestedAt: "2026-09-29T13:00:19.000Z", paintedAt: at,
    geometryAt: "2026-09-29T13:00:19.000Z", playing: true, runStartAt: at }).ready, true,
    "1x playback keeps its actual accepted frame from the same run");
});

test("an equal timestamp from an earlier preview or run is not current native acceptance", () => {
  const at = "2026-09-30T14:15:17.123Z";
  const input = { requestedAt: at, geometryAt: at, paintedAt: at, generation: 4,
    playing: false, runStartAt: null, geometryFailed: false, canvasFailed: false };
  for (const paintedGeneration of [undefined, 3, 5, NaN]) {
    const status = skyTimePreviewStatus({ ...input, paintedGeneration });
    assert.equal(status.ready, false); assert.equal(status.pending, true); assert.equal(status.presentedAt, at);
  }
  assert.equal(skyTimePreviewStatus({ ...input, paintedGeneration: 4 }).ready, true);
});
