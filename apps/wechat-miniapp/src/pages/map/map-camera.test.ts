import assert from "node:assert/strict";
import test from "node:test";
import { cameraCenterForVisibleMapTarget } from "./map-camera.ts";

function mercatorY(latitude: number) {
  const sin = Math.sin((latitude * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

test("camera center places a candidate in the middle of the visible map above the editor", () => {
  const point = { latitude: 22.431234, longitude: 114.301234 };
  const viewportHeight = 762.4;
  const visibleMapHeight = 230;
  const zoom = 14;
  const center = cameraCenterForVisibleMapTarget(
    point,
    viewportHeight,
    visibleMapHeight,
    zoom,
  );
  const worldSize = 256 * 2 ** zoom;
  const renderedY =
    viewportHeight / 2 + (mercatorY(point.latitude) - mercatorY(center.latitude)) * worldSize;

  assert.ok(Math.abs(renderedY - visibleMapHeight / 2) < 0.001);
  assert.ok(center.latitude < point.latitude);
  assert.equal(center.longitude, point.longitude);
});

test("camera helper leaves invalid layout inputs unchanged", () => {
  const point = { latitude: 22, longitude: 114 };
  assert.equal(cameraCenterForVisibleMapTarget(point, 0, 230, 14), point);
  assert.equal(cameraCenterForVisibleMapTarget(point, 500, 600, 14), point);
});
