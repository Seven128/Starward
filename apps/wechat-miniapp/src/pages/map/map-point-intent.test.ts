import assert from 'node:assert/strict';
import test from 'node:test';
import { createMapPointIntentTestRuntime as runtime } from './map-point-intent-test-support';

const center = { latitude: 22, longitude: 114 };
const drag = { type: 'end', causedBy: 'drag', detail: { centerLocation: center, scale: 12 } };
const settle = () => new Promise<void>(r => setImmediate(r));
const newSpot = { spotId: 'spot:new', name: 'new', gcj02: { latitude: 23, longitude: 115 } };

test('Scene waits for the existing gesture debounce and current Context result', async () => {
    const m = runtime();
    assert.equal(m.scenePending(), false, 'initial no-gesture Scene remains eligible');
    m.onRegionChange({ type: 'begin', causedBy: 'gesture', detail: {} });
    assert.equal(m.scenePending(), true);
    m.onRegionChange(drag);
    assert.equal(m.scenePending(), true); assert.equal(m.requests.length, 0);
    m.fire();
    assert.equal(m.scenePending(), true, 'new viewport cannot query against the old Context');
    m.requests[0].resolve({ data: { contextId: 'settled-camera' } }); await settle();
    assert.equal(m.scenePending(), false); assert.equal(m.context.contextId, 'settled-camera');
});

test('cancelled gesture releases Scene, while programmatic settle cannot release a user transaction', async () => {
    const m = runtime();
    m.onRegionChange({ type: 'begin', causedBy: 'gesture', detail: {} });
    m.onRegionChange({ type: 'end', causedBy: 'update', detail: {} });
    assert.equal(m.scenePending(), true);
    m.onRegionChange({ type: 'end', causedBy: 'gesture', detail: {} });
    assert.equal(m.scenePending(), false); assert.equal(m.requests.length, 0);
    m.onRegionChange(drag); m.fire();
    m.onRegionChange({ type: 'end', causedBy: 'drag', detail: {} });
    assert.equal(m.scenePending(), true, 'a malformed later callback cannot release an already settled Context transaction');
    m.requests[0].reject(Error('current request failed')); await settle();
    assert.equal(m.scenePending(), false, 'real failure exposes recovery instead of holding Scene indefinitely');
    const retry = m.refreshMap();
    assert.equal(m.scenePending(), true);
    m.requests[1].resolve({ data: { contextId: 'recovered-camera' } }); await retry;
    assert.equal(m.scenePending(), false);
});

test('retired Context work cannot release a newer Scene gate; hide and scope changes are eligible independently', async () => {
    const m = runtime();
    m.onRegionChange(drag); m.fire();
    m.onRegionChange(drag);
    m.requests[0].resolve({ data: { contextId: 'old-camera' } }); await settle();
    assert.equal(m.scenePending(), true);
    m.hide(); assert.equal(m.scenePending(), false); m.show(); assert.equal(m.scenePending(), false);
    m.onRegionChange(drag); m.switchOwner(); assert.equal(m.scenePending(), false);
    const reset = runtime(); reset.onRegionChange(drag); reset.reset(); assert.equal(reset.scenePending(), false);
});

test('a new native gesture retires queued conditions before its settled camera is known', async () => {
    const m = runtime();
    m.onRegionChange(drag);
    m.onRegionChange({ type: 'begin', causedBy: 'gesture', detail: {} });
    m.fire(); await settle();
    assert.equal(m.requests.length, 0, 'the previous camera must not start a conditions request during the next gesture');
    assert.equal(m.viewportWrites, 1, 'gesture begin does not invent a new camera or rewrite the previous one');
    m.onRegionChange({ type: 'end', causedBy: 'scale', detail: { centerLocation: center, scale: 17.25 } });
    m.fire();
    assert.equal(m.requests.length, 1);
    assert.equal(m.viewport.zoom, 17.25, 'the actual settled fractional zoom remains exact');
});

test('a new native gesture fences in-flight old conditions and their late failure', async () => {
    for (const fail of [false, true]) {
        const m = runtime();
        m.onRegionChange(drag); m.fire();
        m.onRegionChange({ type: 'begin', causedBy: 'gesture', detail: {} });
        if (fail) m.requests[0].reject(Error('old camera failure'));
        else m.requests[0].resolve({ data: { contextId: 'old-camera' } });
        await settle();
        assert.equal(m.context, null, 'the previous camera result cannot commit after the new gesture begins');
        assert.equal(m.left, 0); assert.equal(m.notices.size, 0);
        const latest = { latitude: 23, longitude: 115 };
        m.onRegionChange({ type: 'end', causedBy: 'scale', detail: { centerLocation: latest, scale: 17.25 } });
        m.fire(); m.requests[1].resolve({ data: { contextId: 'current-camera' } }); await settle();
        assert.equal(m.context.contextId, 'current-camera'); assert.equal(m.viewport.zoom, 17.25);
        assert.deepEqual(m.viewport.center, latest); assert.equal(m.left, 1);
    }
});

test('a gesture without a new settled camera preserves the previous real failure recovery', async () => {
    const m = runtime();
    m.onRegionChange(drag); m.fire(); m.requests[0].reject(Error('current camera failure')); await settle();
    assert(m.notices.has('map-context-region-failed'));
    m.onRegionChange({ type: 'begin', causedBy: 'gesture', detail: {} });
    assert(m.notices.has('map-context-region-failed'), 'a cancelled gesture must not erase the known failure before any new camera settles');
    const recovery = m.refreshMap();
    assert.equal(m.requests[1].input.location.wgs84.latitude, center.latitude);
    m.requests[1].resolve({ data: { contextId: 'recovered-original-camera' } }); await recovery;
    assert.equal(m.context.contextId, 'recovered-original-camera');
    assert(!m.notices.has('map-context-region-failed'));
});

test('native refined view survives an immediate selection before the conditions debounce', async () => {
    const m = runtime();
    m.onRegionChange({ type: 'end', causedBy: 'scale', detail: { centerLocation: center, scale: 17 } });
    assert.equal(m.requests.length, 0, 'conditions still wait for their existing debounce');
    const selected = m.openDetail(newSpot);
    assert.equal(m.viewport.zoom, 17, 'selection must preserve the latest completed native zoom, not the old store value');
    m.requests[0].resolve({ data: { location: { kind: 'FORMAL_SPOT' }, contextId: 'new' } });
    await selected;
    m.fire(); await settle();
    assert.equal(m.requests.length, 1, 'the retired map-conditions timer cannot submit after selection');
    assert.equal(m.viewport.zoom, 17);
});
test('queued pan cannot dispatch after a newer formal selection', async () => {
    const m = runtime();
    m.onRegionChange(drag);
    const selected = m.openDetail(newSpot);
    const afterSelection = structuredClone(m.viewport);
    m.requests[0].resolve({ data: { location: { kind: 'FORMAL_SPOT' }, contextId: 'new' } });
    await selected;
    m.fire();
    await settle();
    assert.equal(m.requests.length, 1);
    assert.deepEqual(m.viewport, afterSelection, 'queued pan cannot move the selected camera');
    assert.equal(m.selected, 'spot:new');
});
test('already dispatched old pan cannot overwrite a newer formal selection or publish its late error', async () => {
    for (const fail of [false, true]) {
        const m = runtime();
        m.onRegionChange(drag);
        m.fire();
        const selected = m.openDetail(newSpot);
        m.requests[1].resolve({ data: { location: { kind: 'FORMAL_SPOT' }, contextId: 'new' } });
        await selected;
        if (fail)
            m.requests[0].reject(Error('old failure'));
        else
            m.requests[0].resolve({ data: { contextId: 'old' } });
        await settle();
        assert.equal(m.selected, 'spot:new');
        assert.equal(m.context.contextId, 'new');
        assert.equal(m.notices.size, 0);
    }
});
test('successful current map conditions remove only their region failure; late success cannot dismiss a newer failure', async () => {
    const m = runtime();
    m.notices.set('unrelated', { id: 'unrelated', owner: 'map', dedupeKey: 'unrelated' });
    m.onRegionChange(drag);
    m.fire();
    m.requests[0].reject(Error('first failure'));
    await settle();
    assert(m.notices.has('map-context-region-failed'));
    m.onRegionChange(drag);
    m.fire();
    m.requests[1].resolve({ data: { contextId: 'recovered' } });
    await settle();
    assert(!m.notices.has('map-context-region-failed'));
    assert(m.notices.has('unrelated'));
    m.onRegionChange(drag);
    m.fire();
    m.onRegionChange(drag);
    m.fire();
    m.requests[3].reject(Error('new failure'));
    await settle();
    m.requests[2].resolve({ data: { contextId: 'old success' } });
    await settle();
    assert(m.notices.has('map-context-region-failed'));
    assert.equal(m.context.contextId, 'recovered');
});
test('refresh retries the failed pan location; repeated failure stays retryable', async () => {
    const m = runtime();
    m.onRegionChange(drag);
    m.fire();
    m.requests[0].reject(Error('pan failure'));
    await settle();
    const retry = m.refreshMap();
    assert.equal(m.requests[1].input.location.wgs84.latitude, center.latitude);
    m.requests[1].reject(Error('still offline'));
    await retry;
    assert(m.notices.has('map-context-region-failed'));
    const recovered = m.refreshMap();
    m.requests[2].resolve({ data: { contextId: 'refreshed-region' } });
    await recovered;
    assert.equal(m.context.contextId, 'refreshed-region');
    assert(!m.notices.has('map-context-region-failed'));
});
test('interrupted formal request exposes recovery and same-point retry does not alter the panel selection', async () => {
    const m = runtime();
    const pending = m.openDetail(newSpot);
    assert.equal(m.attempt.pending, true);
    m.invalidateMapPointIntent();
    assert.equal(m.attempt.pending, false);
    assert.match(m.attempt.error.message, /重试/);
    m.requests[0].resolve({ data: { contextId: 'obsolete' } });
    await pending;
    assert.equal(m.context, null);
    const retry = m.openDetail(newSpot);
    m.requests[1].resolve({ data: { location: { kind: 'FORMAL_SPOT', spotId: 'spot:new' }, contextId: 'current' } });
    await retry;
    m.notices.set('map-context-region-failed', { id: 'map-context-region-failed', owner: 'map', dedupeKey: 'map-context-region-failed' });
    await m.openDetail(newSpot);
    assert.equal(m.requests.length, 2);
    assert(!m.notices.has('map-context-region-failed'));
    assert.equal(m.selected, 'spot:new');
});
test('hiding or rebuilding native Map retains the failed center, while a real new selection retires it', async () => {
    const map = runtime();
    map.onRegionChange(drag);
    map.fire();
    map.requests[0].reject(Error('failed'));
    await settle();
    assert.equal(map.notices.get('map-context-region-failed').action.label, '重试此位置');
    map.invalidateMapPointIntent(true);
    const retry = map.refreshMap();
    assert.equal(map.requests[1].input.location.wgs84.latitude, center.latitude);
    map.requests[1].reject(Error('still failed'));
    await retry;
    map.invalidateMapPointIntent();
    assert.equal(map.notices.has('map-context-region-failed'), false);
});

test('a failed map center cannot be retried after account change or default-region reset', async () => {
  for (const boundary of ['OWNER', 'RESET'] as const) {
    const map = runtime();
    map.onRegionChange(drag); map.fire(); map.requests[0].reject(Error('failed')); await settle();
    if (boundary === 'OWNER') map.switchOwner(); else map.reset();
    map.invalidateMapPointIntent(true);
    const retry = map.refreshMap();
    if (map.requests[1]) map.requests[1].resolve({data: {contextId: 'wrong old center'}});
    await retry;
    assert.equal(map.requests.length, 1, 'the old recovery target must not be submitted under the new scope');
    assert.equal(map.notices.has('map-context-region-failed'), false);
  }
});
