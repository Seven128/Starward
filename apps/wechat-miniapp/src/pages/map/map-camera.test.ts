import assert from "node:assert/strict";
import test from "node:test";
import { cameraCenterForNativeMapTarget, readNativeMapScale, spotNeighborhoodGroundRange, NEIGHBORHOOD_MAX_VISIBLE_SPAN_M, type NativeMapProjection } from "./map-camera.ts";

test("native scale read preserves fractional zoom and settles callback plus Promise once", async () => {
  const scale = await readNativeMapScale({ getScale(options) {
    options.success({ scale: 17.25 });
    return Promise.reject(new Error("duplicate native rejection"));
  } }, new AbortController().signal);
  assert.equal(scale, 17.25);
  const promiseOnly = await readNativeMapScale({ getScale: () => Promise.resolve({ scale: 13.5 }) }, new AbortController().signal);
  assert.equal(promiseOnly, 13.5);
});

test("invalid or cancelled native scale cannot fall back to the last stored value", async () => {
  for (const scale of [NaN, Infinity, 2.99, 20.01, "17.25", undefined])
    await assert.rejects(readNativeMapScale({ getScale: () => Promise.resolve({ scale }) }, new AbortController().signal), /map_native_scale_invalid/);
  const controller = new AbortController(); let callback: ((value: unknown) => void) | undefined;
  const pending = readNativeMapScale({ getScale(options) { callback = options.success; } }, controller.signal);
  controller.abort(); await assert.rejects(pending, { name: "AbortError" });
  callback?.({ scale: 17.25 }); await Promise.resolve();
});

test("neighborhood detail follows actual visible ground coverage and preserves a finer view", () => {
  const bounds = { west: 114.30, east: 114.40, south: 22.55, north: 22.65 };
  const compact = { top: 30, height: 760, visibleBottom: 410 };
  const sameFraction = { top: 20, height: 1200, visibleBottom: 620 };
  const first = spotNeighborhoodGroundRange(bounds, compact, 14), second = spotNeighborhoodGroundRange(bounds, sameFraction, 14);
  assert.ok(first.spanM > NEIGHBORHOOD_MAX_VISIBLE_SPAN_M); assert.ok(first.zoom > 14);
  assert.equal(first.widthM, second.widthM); assert.equal(first.heightM, second.heightM);
  const fine = spotNeighborhoodGroundRange({ west: 114.349, east: 114.351, south: 22.599, north: 22.601 }, compact, 18);
  assert.equal(fine.zoom, 18); assert.ok(fine.spanM < 250);
  assert.throws(() => spotNeighborhoodGroundRange(bounds, compact, 20), /range_unreachable/);
});

test("selected point uses native projection with actual panel fraction and device pixel conversion", async () => {
  const point = { latitude: 30.2, longitude: 120.1 };
  const bounds = { west: 119.5, east: 120.5, south: 29.5, north: 30.5 };
  for (const frame of [{ top: 34, height: 768, visibleBottom: 424 }, { top: 34, height: 768, visibleBottom: 264 }]) for (const pixelConversion of [1, 3]) {
    const height = frame.height * pixelConversion;
    const nativeY = (latitude: number) => 100 + (30.5 - latitude) * height;
    const calls: string[] = [];
    const projection: NativeMapProjection = {
      toScreenLocation(options) {
        calls.push("to"); options.success({ x: 75 + (options.longitude - 119.5) * 400 * pixelConversion, y: nativeY(options.latitude) });
        return Promise.resolve({ x: NaN, y: NaN }); // Some adapters expose both callback and Promise; the first result owns it.
      },
      fromScreenLocation(options) {
        calls.push("from"); options.success({ latitude: 30.5 - (options.y - 100) / height,
          longitude: 119.5 + (options.x - 75) / (400 * pixelConversion) });
      },
    };
    const center = await cameraCenterForNativeMapTarget(point, bounds, frame, projection, new AbortController().signal);
    const afterMoveY = 100 + height / 2 + nativeY(point.latitude) - nativeY(center.latitude);
    const expectedY = 100 + height * (frame.visibleBottom - frame.top) / frame.height / 2;
    assert.ok(Math.abs(afterMoveY - expectedY) < 1e-8);
    assert.equal(center.longitude, point.longitude); assert.deepEqual(calls, ["to", "to", "to", "from"]);
  }
});

test("invalid or fully obscured native geometry cannot issue a projection call", async () => {
  const point = { latitude: 30, longitude: 120 }, bounds = { west: 119, east: 121, south: 29, north: 31 };
  let calls = 0;
  const projection = { toScreenLocation() { calls++; }, fromScreenLocation() { calls++; } };
  for (const frame of [{ top: 20, height: 700, visibleBottom: 20 }, { top: 20, height: 700, visibleBottom: 721 }])
    await assert.rejects(cameraCenterForNativeMapTarget(point, bounds, frame, projection, new AbortController().signal), /map_projection_frame_invalid/u);
  await assert.rejects(cameraCenterForNativeMapTarget(point, { ...bounds, north: NaN }, { top: 0, height: 700, visibleBottom: 300 }, projection, new AbortController().signal), /map_projection_frame_invalid/u);
  assert.equal(calls, 0);
});

test("cancelled native projection releases its read and never continues the old chain", async () => {
  const controller = new AbortController(); let callback: ((value: unknown) => void) | undefined, calls = 0;
  const pending = cameraCenterForNativeMapTarget({ latitude: 30, longitude: 120 }, { west: 119, east: 121, south: 29, north: 31 },
    { top: 0, height: 700, visibleBottom: 300 }, { toScreenLocation(options) { calls++; callback = options.success; }, fromScreenLocation() { calls++; } }, controller.signal);
  controller.abort(); await assert.rejects(pending, { name: "AbortError" });
  callback?.({ x: 20, y: 40 }); await Promise.resolve(); assert.equal(calls, 1);
});

test("native projection failure or invalid coordinates cannot fall back to invented geometry", async () => {
  const point = { latitude: 30, longitude: 120 }, bounds = { west: 119, east: 121, south: 29, north: 31 };
  const frame = { top: 0, height: 700, visibleBottom: 300 };
  await assert.rejects(cameraCenterForNativeMapTarget(point, bounds, frame,
    { toScreenLocation() { return Promise.reject(new Error("native_unavailable")); }, fromScreenLocation() {} }, new AbortController().signal), /native_unavailable/u);
  await assert.rejects(cameraCenterForNativeMapTarget(point, bounds, frame,
    { toScreenLocation(options) { options.success({ x: 1, y: NaN }); }, fromScreenLocation() {} }, new AbortController().signal), /map_projection_screen_point_invalid/u);
});
