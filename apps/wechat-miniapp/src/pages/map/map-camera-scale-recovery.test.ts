import assert from 'node:assert/strict';
import test from 'node:test';
import { createMapPointIntentTestRuntime as runtime } from './map-point-intent-test-support';

const center = { latitude: 24, longitude: 118 };
const partial = { type: 'end', causedBy: 'scale', detail: { centerLocation: center } };
const complete = { type: 'end', causedBy: 'scale', detail: { centerLocation: center, scale: 17.25 } };
const settle = () => new Promise<void>(resolve => setImmediate(resolve));

test('missing native scale is read before a settled center and conditions are published', async () => {
  const map = runtime();
  map.onRegionChange(partial);
  assert.equal(map.viewportWrites, 0, 'unknown zoom cannot be published as the prior stored zoom');
  assert.equal(map.viewport.loadedViewport, 'initial'); assert.equal(map.requests.length, 0);
  assert.equal(map.scales.length, 1);
  map.scales[0]!.success({ scale: 17.25 }); await settle();
  assert.equal(map.viewportWrites, 1); assert.equal(map.viewport.zoom, 17.25);
  assert.deepEqual(map.viewport.center, center); assert.equal(map.requests.length, 0);
  map.fire(); assert.equal(map.requests.length, 1, 'only the existing conditions debounce remains');
});

test('complete native end keeps the immediate path without an extra native scale read', () => {
  const map = runtime(); map.onRegionChange(complete);
  assert.equal(map.viewportWrites, 1); assert.equal(map.viewport.zoom, 17.25);
  assert.equal(map.scales.length, 0); assert.equal(map.requests.length, 0);
});

test('new gesture, selection, Map, account, reset, hide and unmount retire an incomplete camera', async () => {
  for (const boundary of ['gesture', 'selection', 'map', 'account', 'reset', 'hide', 'unmount'] as const) {
    const map = runtime(); map.onRegionChange(partial);
    assert.equal(map.scales.length, 1);
    const pending = map.pendingCameraRead.current!;
    if (boundary === 'gesture') map.onRegionChange({ type: 'begin', causedBy: 'gesture', detail: {} });
    else if (boundary === 'selection') map.changeSelection();
    else if (boundary === 'map') map.replaceMap();
    else if (boundary === 'account') map.switchOwner();
    else if (boundary === 'reset') map.reset();
    else if (boundary === 'hide') { map.hide(); map.show(); }
    else map.unmount();
    assert(pending.controller.signal.aborted, `${boundary}: retire the pending JS read`);
    map.scales[0]!.success({ scale: 17.25 }); await settle(); map.fire();
    assert.equal(map.viewportWrites, 0, boundary); assert.equal(map.requests.length, 0, boundary);
    assert.equal(map.notices.size, 0, boundary); assert.equal(map.diagnostics.length, 0, boundary);
  }
});

test('an A-to-B-to-A camera cannot accept the first A native scale result', async () => {
  const map = runtime(); map.onRegionChange(partial);
  const old = map.scales[0]!;
  map.onRegionChange({ ...complete, detail: { ...complete.detail, scale: 15.5 } });
  map.onRegionChange(partial);
  assert.equal(map.scales.length, 2);
  old.success({ scale: 19 }); await settle();
  assert.equal(map.viewport.zoom, 15.5); assert.equal(map.viewportWrites, 1);
  map.scales[1]!.success({ scale: 17.25 }); await settle();
  assert.equal(map.viewport.zoom, 17.25); assert.equal(map.viewportWrites, 2);
  map.fire(); assert.equal(map.requests.length, 1);
});

test('failed native scale stays retryable without inventing a camera or reloading native Map', async () => {
  const map = runtime(); map.onRegionChange(partial);
  map.scales[0]!.fail({ errno: 1234, errMsg: 'private native detail' }); await settle();
  assert.equal(map.viewportWrites, 0); assert.equal(map.requests.length, 0);
  assert.equal(map.notices.get('map-context-region-failed')?.action.label, '重试此位置');
  assert.equal(map.diagnostics.length, 1);
  const failedRetry = map.refreshMap(); assert.equal(map.scales.length, 2);
  map.scales[1]!.fail({ errno: 1234 }); await failedRetry;
  assert.equal(map.viewportWrites, 0); assert(map.notices.has('map-context-region-failed'));
  const retry = map.refreshMap(); assert.equal(map.scales.length, 3);
  map.scales[2]!.success({ scale: 17.25 }); await settle();
  assert.equal(map.viewport.zoom, 17.25); assert.equal(map.viewportWrites, 1); assert.equal(map.requests.length, 1);
  map.requests[0]!.reject(Error('conditions unavailable')); await retry;
  const second = map.refreshMap();
  assert.equal(map.scales.length, 3, 'after camera completion only the failed conditions need retry');
  map.requests[1]!.resolve({ data: { contextId: 'recovered' } }); await second;
  assert.equal(map.context.contextId, 'recovered'); assert(!map.notices.has('map-context-region-failed'));
});

test('invalid scale and missing native callback fail within the existing native read deadline', async () => {
  for (const outcome of ['invalid', 'timeout'] as const) {
    const map = runtime(); map.onRegionChange(partial);
    if (outcome === 'invalid') map.scales[0]!.success({ scale: NaN });
    else map.expireCameraRead();
    await settle();
    assert.equal(map.viewportWrites, 0); assert.equal(map.requests.length, 0);
    assert(map.notices.has('map-context-region-failed')); assert.equal(map.pendingCameraRead.current, null);
    map.scales[0]!.success({ scale: 17.25 }); await settle();
    assert.equal(map.viewportWrites, 0, 'late native result cannot recover an expired operation');
  }
});
