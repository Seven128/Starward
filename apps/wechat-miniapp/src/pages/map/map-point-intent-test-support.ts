import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { mapRegionEnded, userMapRegionEnd, userMapRegionStarted, userMapRegionEnded } from './map-region-event';
import { sameContextVersion } from '../../services/observation-context-version';
import { retryObservationScene } from './context-restore';
import * as camera from './map-camera';
import { createMapSceneTestBoundaries } from './map-page-test-support';

/** Real Page request/camera commands with controlled public native/HTTP ports.
 * This fixture does not implement a native map or simulate visual zoom recoil. */
export function createMapPointIntentTestRuntime() {
  const source = ts.createSourceFile('map.tsx', readFileSync(new URL('./index.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(['beginMapSceneRegion', 'finishMapSceneRegion', 'invalidateMapPointIntent', 'dismissMapRegionFailure', 'resolveMapPoint', 'onRegionChange', 'readMapRegionScale', 'resolveSpotContext', 'openDetail', 'refreshMap']);
  const declarations: string[] = [];
  let unmount = '', retireInvalidRead = '', scenePending = '';
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) declarations.push('const ' + node.getText(source) + ';');
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'mapSceneRegionPending') scenePending = node.initializer!.getText(source);
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') {
      const effect = node.arguments[0]?.getText(source) ?? '';
      if (effect.includes('mapPointIntent.current += 1')) unmount = effect;
      if (effect.includes('const reading = mapRegionScaleRead.current')) retireInvalidRead = effect;
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert(unmount);
  let selected: string | null = null, context: any = null, left = 0, viewportWrites = 0, attempt: any = null;
  let owner = 'owner', resetVersion = 0, nativeCurrent = true;
  const viewport = { center: { latitude: 22, longitude: 114 }, zoom: 9, loadedViewport: 'initial' };
  const notices = new Map<string, any>(), diagnostics: unknown[][] = [];
  const timers = new Map<number, { callback(): void; delay: number }>(); let timer = 0;
  const requests: { input: any; resolve(v: any): void; reject(e: Error): void }[] = [];
  const scales: { success(value: unknown): void; fail(cause: unknown): void }[] = [];
  const foregroundLife = { current: { visible: true, lease: {} } };
  const pendingCameraRead = { current: null as null | { controller: AbortController; isCurrent(): boolean } };
  const state = () => ({ viewport, selectedSpotId: selected, mapResetVersion: resetVersion, spotOpenRequestVersion: 0,
    observationContext: context, retiredObservationContextId: null, retireObservationContextEdit() {},
    notifications: [...notices.values()], dismissNotification: (id: string) => notices.delete(id) });
  const no = () => {};
  const scope: any = { ...createMapSceneTestBoundaries().scope, useAppStore: { getState: state }, mapResetVersion: 0,
    nativeMap: { mapId: 'controlled-map', isCurrent: () => nativeCurrent }, currentDraftUserId: () => owner,
    mapPointIntent: { current: 0 }, mapSceneRegionIntent: { current: null }, mapSceneRegionScope: null,
    setMapSceneRegionScope: (value: unknown) => { scope.mapSceneRegionScope = value; },
    failedMapRegion: { current: null }, mapRegionScaleRead: pendingCameraRead, foregroundLife,
    detailRequestGeneration: { current: 0 }, privateTransitionGeneration: { current: 0 }, lastHandledSelectedId: { current: null },
    lastHandledSpotOpenVersion: { current: 0 }, navigationEpoch: { current: 0 }, regionTimer: { current: null },
    candidateCameraGuard: { current: null }, panelCloseTimer: { current: null }, extentBeforeLayer: { current: null }, markerTapAt: { current: 0 },
    gcj02ToWgs84: ({ lat, lon }: any) => ({ lat, lon }), currentTimezoneHint: () => 'UTC', localDateForNow: () => '2026-09-26',
    activeContext: null, timeReference: null, bootstrapReplacementBlocked: false, selected: null,
    bootstrapContext: { refetch: async () => undefined }, retryObservationScene, sameContextVersion,
    mapRegionEnded, readTerrainViewport() {}, userMapRegionEnd, userMapRegionStarted, userMapRegionEnded,
    spotNeighborhoodCamera: camera.spotNeighborhoodCamera, readNativeMapScale: camera.readNativeMapScale,
    NATIVE_MAP_CAMERA_READ_TIMEOUT_MS: camera.NATIVE_MAP_CAMERA_READ_TIMEOUT_MS,
    spotMapFocus: { begin() {}, cancel() {} }, isMiniappRequestCancelled: () => false, errorMessage: (e: Error) => e.message,
    selectSpot: (id: string) => selected = id, setObservationContext: (v: any) => context = v,
    leaveSelectedLocationForMapPoint: () => { left++; selected = null; },
    setViewport: (patch: object) => { viewportWrites++; Object.assign(viewport, patch); },
    resolveObservationContext: (input: any) => new Promise((resolve, reject) => requests.push({ input, resolve, reject })),
    Taro: { createMapContext: () => ({ getScale(options: typeof scales[number]) { scales.push(options); } }) },
    reportRuntimeError: (...args: unknown[]) => diagnostics.push(args), AbortController,
    notify: (v: any) => notices.set(v.dedupeKey, { ...v, id: v.dedupeKey }), setPanelPhase: no, setPanelExtent: no,
    setPanelDragOffset: no, setSelectedFallback: no, setSelectedProposal: no, setBottomPresentation: no,
    setAnnouncement: no, setSpotContextAttempt: (v: any) => { attempt = typeof v === 'function' ? v(attempt) : v; },
    scene: { refetch: () => assert.fail('must not refresh old scene') },
    clearTimeout: (id: number) => timers.delete(id),
    setTimeout: (callback: () => void, delay = 0) => { timers.set(++timer, { callback, delay }); return timer; },
  };
  const fn = vm.runInNewContext(ts.transpileModule(declarations.join('\n') +
    `\n({onRegionChange,resolveMapPoint,openDetail,refreshMap,invalidateMapPointIntent,scenePending:()=>(${scenePending}),unmount:(${unmount})(),retireInvalidRead:${retireInvalidRead || '()=>{}'}});`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return { ...fn, viewport, requests, notices, diagnostics, scales, pendingCameraRead,
    switchOwner() { owner = 'other'; fn.retireInvalidRead(); },
    reset() { resetVersion++; scope.mapResetVersion = resetVersion; fn.retireInvalidRead(); },
    replaceMap() { nativeCurrent = false; fn.retireInvalidRead(); },
    changeSelection() { selected = 'other-selection'; fn.retireInvalidRead(); },
    hide() { foregroundLife.current.visible = false; foregroundLife.current.lease = {}; fn.invalidateMapPointIntent(true); },
    show() { foregroundLife.current.visible = true; },
    fire() { const pending = [...timers.values()]; timers.clear(); pending.forEach(value => value.callback()); },
    expireCameraRead() { for (const [id, value] of [...timers]) if (value.delay === camera.NATIVE_MAP_CAMERA_READ_TIMEOUT_MS) { timers.delete(id); value.callback(); } },
    get attempt() { return attempt; }, get selected() { return selected; }, get context() { return context; },
    get left() { return left; }, get viewportWrites() { return viewportWrites; } };
}
