import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { userMapRegionEnd } from './map-region-event';
function runtime() {
    const source = ts.createSourceFile('map.tsx', readFileSync(new URL('./index.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const names = new Set(['invalidateMapPointIntent', 'dismissMapRegionFailure', 'resolveMapPoint', 'onRegionChange', 'resolveSpotContext', 'openDetail', 'refreshMap']);
    const declarations: string[] = [];
    const visit = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source)))
            declarations.push('const ' + node.getText(source) + ';');
        ts.forEachChild(node, visit);
    };
    visit(source);
    let selected: string | null = null, context: any = null, left = 0, viewportWrites = 0, attempt: any = null;
    let owner = 'owner', resetVersion = 0;
    const notices = new Map<string, any>();
    const timers = new Map<number, () => void>();
    let timer = 0;
    const requests: {
        input: any;
        resolve(v: any): void;
        reject(e: Error): void;
    }[] = [];
    const state = () => ({ selectedSpotId: selected, mapResetVersion: resetVersion, observationContext: context, notifications: [...notices.values()], dismissNotification: (id: string) => notices.delete(id) });
    const no = () => { };
    const scope: any = { useAppStore: { getState: state }, mapResetVersion: 0, nativeMap: { isCurrent: () => true }, currentDraftUserId: () => owner,
        mapPointIntent: { current: 0 }, failedMapRegion: { current: null }, detailRequestGeneration: { current: 0 }, privateTransitionGeneration: { current: 0 }, lastHandledSelectedId: { current: null }, regionTimer: { current: null }, candidateCameraGuard: { current: null }, panelCloseTimer: { current: null }, extentBeforeLayer: { current: null }, markerTapAt: { current: 0 },
        gcj02ToWgs84: ({ lat, lon }: any) => ({ lat, lon }), currentTimezoneHint: () => 'UTC', localDateForNow: () => '2026-09-26', activeContext: null, userMapRegionEnd, isMiniappRequestCancelled: () => false, errorMessage: (e: Error) => e.message,
        selectSpot: (id: string) => selected = id, setObservationContext: (v: any) => context = v, leaveSelectedLocationForMapPoint: () => { left++; selected = null; }, setViewport: () => viewportWrites++,
        resolveObservationContext: (input: any) => new Promise((resolve, reject) => requests.push({ input, resolve, reject })),
        notify: (v: any) => notices.set(v.dedupeKey, { ...v, id: v.dedupeKey }), setPanelPhase: no, setPanelExtent: no, setPanelDragOffset: no, setSelectedFallback: no, setSelectedProposal: no, setBottomPresentation: no, setAnnouncement: no, setSpotContextAttempt: (v: any) => { attempt = typeof v === "function" ? v(attempt) : v; }, scene: { refetch: () => assert.fail("must not refresh old scene") },
        clearTimeout: (id: number) => timers.delete(id), setTimeout: (fn: () => void) => { timers.set(++timer, fn); return timer; } };
    const fn = vm.runInNewContext(ts.transpileModule(declarations.join('\n') + '\n({onRegionChange,resolveMapPoint,openDetail,refreshMap,invalidateMapPointIntent});', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, scope);
    return { ...fn, requests, notices, switchOwner() { owner = 'other'; }, reset() { resetVersion++; }, fire() { const f = [...timers.values()]; timers.clear(); f.forEach(x => x()); }, get attempt() { return attempt; }, get selected() { return selected; }, get context() { return context; }, get left() { return left; }, get viewportWrites() { return viewportWrites; } };
}
const center = { latitude: 22, longitude: 114 };
const drag = { type: 'end', causedBy: 'drag', detail: { centerLocation: center, scale: 12 } };
const settle = () => new Promise<void>(r => setImmediate(r));
test('queued pan cannot dispatch after a newer formal selection', async () => {
    const m = runtime();
    m.onRegionChange(drag);
    const selected = m.openDetail({ spotId: 'spot:new', name: 'new' });
    m.requests[0].resolve({ data: { location: { kind: 'FORMAL_SPOT' }, contextId: 'new' } });
    await selected;
    m.fire();
    await settle();
    assert.equal(m.requests.length, 1);
    assert.equal(m.viewportWrites, 0);
    assert.equal(m.selected, 'spot:new');
});
test('already dispatched old pan cannot overwrite a newer formal selection or publish its late error', async () => {
    for (const fail of [false, true]) {
        const m = runtime();
        m.onRegionChange(drag);
        m.fire();
        const selected = m.openDetail({ spotId: 'spot:new', name: 'new' });
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
    const pending = m.openDetail({ spotId: 'spot:new', name: 'new' });
    assert.equal(m.attempt.pending, true);
    m.invalidateMapPointIntent();
    assert.equal(m.attempt.pending, false);
    assert.match(m.attempt.error.message, /重试/);
    m.requests[0].resolve({ data: { contextId: 'obsolete' } });
    await pending;
    assert.equal(m.context, null);
    const retry = m.openDetail({ spotId: 'spot:new', name: 'new' });
    m.requests[1].resolve({ data: { location: { kind: 'FORMAL_SPOT', spotId: 'spot:new' }, contextId: 'current' } });
    await retry;
    m.notices.set('map-context-region-failed', { id: 'map-context-region-failed', owner: 'map', dedupeKey: 'map-context-region-failed' });
    await m.openDetail({ spotId: 'spot:new', name: 'new' });
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
