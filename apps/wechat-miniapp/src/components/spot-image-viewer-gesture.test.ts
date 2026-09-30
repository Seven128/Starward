import assert from "node:assert/strict";
import test from "node:test";
import { REST_FRAME, viewerDragFrame, viewerEndPoint, viewerImageRect, viewerRelease, viewerSourceRect, viewerStageRect } from "./spot-image-viewer-gesture.ts";

test("photo follows a permitted horizontal drag and resists the gallery edge", () => {
  assert.equal(viewerDragFrame("horizontal", -90, 4, 0, 3).x, -90);
  assert.equal(viewerDragFrame("horizontal", 90, 4, 0, 3).x, 22.5);
  assert.equal(viewerDragFrame("horizontal", -90, 4, 2, 3).x, -22.5);
  assert.equal(viewerDragFrame("horizontal", -90, 4, 0, 1).x, -22.5);
  assert.deepEqual(viewerRelease("horizontal", -90, 4, 0, 3), { kind: "page", index: 1 });
  assert.deepEqual(viewerRelease("horizontal", -90, 4, 2, 3), { kind: "rebound" });
});

test("downward dismiss does not treat an upward scroll or short drag as close", () => {
  assert.deepEqual(viewerDragFrame("vertical", 0, -50, 0, 1), REST_FRAME);
  const dragged = viewerDragFrame("vertical", 15, 120, 0, 1);
  assert.equal(dragged.y, 120);
  assert.ok(dragged.scale < 1 && dragged.backdrop < REST_FRAME.backdrop);
  assert.deepEqual(viewerRelease("vertical", 0, 85, 0, 1), { kind: "rebound" });
  assert.deepEqual(viewerRelease("vertical", 0, 86, 0, 1), { kind: "close" });
  assert.deepEqual(viewerRelease(null, 0, 0, 0, 1), { kind: "rebound" });
});

test("release uses the last valid move when WEAPP reports an empty end point", () => {
  assert.deepEqual(viewerEndPoint({ x: 0, y: 0 }, { x: 160, y: 470 }), { x: 160, y: 470 });
  assert.deepEqual(viewerEndPoint({ x: 160, y: 410 }, { x: 160, y: 470 }), { x: 160, y: 410 });
  assert.deepEqual(viewerEndPoint(null, { x: 160, y: 470 }), { x: 160, y: 470 });
});

test("photo flight uses only a visible source crop and the actual viewport stage", () => {
  assert.deepEqual(viewerSourceRect({ left: 12, top: 59, width: 296, height: 116 }, 320, 700), { left: 12, top: 59, width: 296, height: 116 });
  assert.equal(viewerSourceRect({ left: 12, top: 282, width: 296, height: 0 }, 320, 700), null);
  assert.equal(viewerSourceRect({ left: 12, top: -20, width: 296, height: 116 }, 320, 700), null);
  assert.deepEqual(viewerStageRect(320, 700), { left: 0, top: 120, width: 320, height: 460 });
  assert.deepEqual(viewerImageRect(320, 700, 1.6), { left: 0, top: 250, width: 320, height: 200 });
  const dragged = viewerStageRect(320, 700, { x: 0, y: 120, scale: .8, backdrop: .5 });
  assert.ok(Math.abs(dragged.left - 32) < .001);
  assert.deepEqual({ top: dragged.top, width: dragged.width, height: dragged.height }, { top: 286, width: 256, height: 368 });
});
