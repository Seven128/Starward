// Pure task-only r5 transforms. Never edits production or an older candidate.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('ruler_entry_boundary_changed:' + label);
  return source.replace(before, after);
}
const emit = (code, values = '', window = '') => `if (r17RulerEntry.active()) r17RulerEntry.record(${code}, [${values}]${window ? ', ' + window : ''});`;
const prepend = source => 'import { r17RulerEntry } from "./r17-ruler-entry-runtime";\n' + source;
const phase = '(timeMotion.phase === "opening" ? 1 : timeMotion.phase === "open" ? 2 : timeMotion.phase === "closing" ? 3 : 4)';
export function addR17RulerEntry({ runtime, controls, page, layout, nativePosition }) {
  ({ runtime, controls } = addR17RulerEntryClock({ runtime, controls }));

  page = prepend(page);
  page = one(page, 'import { createRulerScrollPosition } from "@/components/ruler-scroll-position";',
    'import { createRulerScrollPosition } from "./r17-ruler-scroll-position";', 'sky_only_native_copy');
  page = one(page, '  const rowIdentity = rows.map(row => row.at).join("|");',
    '  const rowIdentity = rows.map(row => row.at).join("|");\n' +
    '  const r17RenderWindow = r17RulerEntry.window();\n  const r17RulerOwner = useRef(0);\n  if (!r17RulerOwner.current) r17RulerOwner.current = r17RulerEntry.id();\n' +
    '  const r17Rows = useRef({ identity: rowIdentity, version: 1 });\n' +
    '  if (r17Rows.current.identity !== rowIdentity) { r17Rows.current.identity = rowIdentity; r17Rows.current.version++; }', 'local_numeric_owner_and_row_version');
  page = one(page, 'createRulerScrollPosition("sky-orientation-time-ruler-scroll")',
    'createRulerScrollPosition("sky-orientation-time-ruler-scroll", r17RulerOwner.current)', 'native_owner_association');
  page = one(page, '  const cancelPosition = useCallback(() => {\n    positionRevision.current++;\n    nativePosition.cancel();',
    '  const cancelPosition = useCallback((r17ObservationWindow = r17RulerEntry.window()) => {\n    positionRevision.current++;\n    nativePosition.cancel(r17ObservationWindow);', 'position_revision_boundary');
  page = one(page, '  const positionResolved = useRef<() => void>(() => {});',
    '  const positionResolved = useRef<(observationWindow?: number) => void>(() => {});', 'resolved_window_type');
  page = one(page, '  if (!layoutRef.current) layoutRef.current = createOrientationRulerLayout((accept, current) => {\n    Taro.nextTick(() => {\n      if (!current()) return;',
    '  if (!layoutRef.current) layoutRef.current = createOrientationRulerLayout((accept, current, r17ObservationWindow) => {\n' +
    '    const r17QueryId = r17RulerEntry.current(r17ObservationWindow) ? r17RulerEntry.id() : 0;\n    const r17RowsVersion = r17Rows.current.version;\n' +
    '    ' + emit(7, 'r17RulerOwner.current, r17QueryId, r17RowsVersion', 'r17ObservationWindow') + '\n    Taro.nextTick(() => {\n' +
    '      const r17Current = current();\n      ' + emit(8, 'r17RulerOwner.current, r17QueryId, r17RowsVersion, r17Current', 'r17ObservationWindow') + '\n      if (!r17Current) return;', 'original_measure_schedule');
  page = one(page, '          .exec(accept);',
    '          .exec(values => {\n            ' + emit(9, 'r17RulerOwner.current, r17QueryId, r17RowsVersion, current(), ' +
      '(values[0] as { left?: number })?.left, (values[0] as { width?: number })?.width, ' +
      '(values[1] as { left?: number })?.left, (values[1] as { width?: number })?.width, ' +
      '(values[2] as { left?: number })?.left, (values[2] as { width?: number })?.width, ' +
      '(values[3] as { scrollLeft?: number })?.scrollLeft', 'r17ObservationWindow') + '\n            accept(values);\n          });', 'same_batch_values_before_admission');
  page = one(page, '}, () => visible.current && layoutAllowed.current && !settlement.active, () => positionResolved.current());',
    '}, () => visible.current && layoutAllowed.current && !settlement.active, observationWindow => positionResolved.current(observationWindow), r17RulerOwner.current);', 'layout_owner_association');
  page = one(page, '  const positionIndex = useCallback((index: number, afterNativeUpdate = false) => {\n    targetIndex.current = index;',
    '  const positionIndex = useCallback((index: number, afterNativeUpdate = false, r17ObservationWindow = r17RulerEntry.window()) => {\n    ' +
    emit(11, 'r17RulerOwner.current, r17Rows.current.version, positionRevision.current, index, afterNativeUpdate, visible.current, layoutAllowed.current, selectionAllowed.current, settlement.active', 'r17ObservationWindow') +
    '\n    targetIndex.current = index;', 'position_request_before_guard');
  page = one(page, '    targetIndex.current = index;\n    cancelPosition();',
    '    targetIndex.current = index;\n    cancelPosition(r17ObservationWindow);', 'position_cancel_window');
  page = one(page, '    const left = layout.left(index, orientationRulerStepPx());\n    setScrollLeft(left);',
    '    const left = layout.left(index, orientationRulerStepPx());\n    ' +
    emit(12, 'r17RulerOwner.current, r17Rows.current.version, positionRevision.current, index, left', 'r17ObservationWindow') + '\n    setScrollLeft(left);', 'declarative_left_request');
  page = one(page, '    const move = () => {\n      if (expected !== positionRevision.current',
    '    const move = () => {\n      ' + emit(13, 'r17RulerOwner.current, r17Rows.current.version, expected, positionRevision.current, currentRows.current === rowIdentity, visible.current, layoutAllowed.current, selectionAllowed.current, settlement.active', 'r17ObservationWindow') +
    '\n      if (expected !== positionRevision.current', 'deferred_command_before_guard');
  page = one(page, '      nativePosition.move(left);', '      nativePosition.move(left, r17ObservationWindow);', 'deferred_native_window');
  page = one(page, '  positionResolved.current = () => positionIndex(targetIndex.current, true);',
    '  positionResolved.current = observationWindow => positionIndex(targetIndex.current, true, observationWindow);', 'resolved_command_window');
  for (const [before, boundary] of [
    ['  useDidHide(() => {\n    visible.current = false;', 4],
    ['  useDidShow(() => {\n    visible.current = true;', 6],
    ['  useResize(() => {\n    cancelPosition();', 3],
    ['  useEffect(() => () => {\n    visible.current = false;', 5],
    ['  useEffect(() => {\n    cancelPosition();', 2],
  ]) {
    const firstLine = before.indexOf('\n') + 1;
    page = one(page, before, before.slice(0, firstLine) + '    ' +
      emit(20, `r17RulerOwner.current, ${boundary}, r17Rows.current.version, positionRevision.current`) + '\n' + before.slice(firstLine), 'lifecycle_' + boundary);
  }
  page = one(page, '          cancelPosition();\n          layout.retire();\n          settlement.begin();',
    '          ' + emit(20, 'r17RulerOwner.current, 1, r17Rows.current.version, positionRevision.current') +
    '\n          cancelPosition();\n          layout.retire();\n          settlement.begin();', 'gesture_retirement');
  page = one(page, '        onScroll={(event) => {\n          if (interactionDisabled || !settlement.active) return;',
    '        onScroll={(event) => {\n          ' + emit(19, 'r17RulerOwner.current, r17Rows.current.version, positionRevision.current, Number(event.detail.scrollLeft), interactionDisabled, settlement.active') +
    '\n          if (interactionDisabled || !settlement.active) return;', 'native_scroll_before_original_guard');
  page = one(page, '  const maxIndex = Math.max(0, rows.length - 1);',
    '  useEffect(() => {\n    ' + emit(2, 'r17RulerOwner.current, r17Rows.current.version, rows.length, activeIndex, committedIndex, selectionReady, layoutReady, reducedMotion, scrollLeft, layoutReady && !reducedMotion, Date.parse(rows[0]?.at ?? ""), Date.parse(rows[rows.length - 1]?.at ?? "")', 'r17RenderWindow') +
    '\n  }, [rowIdentity, activeIndex, committedIndex, selectionReady, layoutReady, reducedMotion, scrollLeft]);\n' +
    '  useEffect(() => {\n    if (!r17RulerEntry.current(r17RenderWindow)) return;\n' +
    '    const expected = positionRevision.current, expectedRows = currentRows.current, rowsVersion = r17Rows.current.version;\n' +
    '    ' + emit(3, 'r17RulerOwner.current, rowsVersion, expected', 'r17RenderWindow') + '\n    Taro.nextTick(() => {\n' +
    '      const current = visible.current && expected === positionRevision.current && expectedRows === currentRows.current;\n' +
    '      ' + emit(4, 'r17RulerOwner.current, rowsVersion, expected, current', 'r17RenderWindow') + '\n      if (!current || !r17RulerEntry.current(r17RenderWindow)) return;\n' +
    '      try { Taro.createSelectorQuery().select("#sky-orientation-time-ruler-scroll").scrollOffset().exec(values => {\n' +
    '        ' + emit(22, 'r17RulerOwner.current, rowsVersion, expected, visible.current && expected === positionRevision.current && expectedRows === currentRows.current, (values[0] as { scrollLeft?: number })?.scrollLeft', 'r17RenderWindow') +
    '\n      }); } catch { ' + emit(22, 'r17RulerOwner.current, rowsVersion, expected, false, null', 'r17RenderWindow') + ' }\n    });\n  }, []);\n\n  const maxIndex = Math.max(0, rows.length - 1);', 'props_and_one_extra_public_offset');
  page = one(page, '  const timeLayout = useSkyOverlayLayoutReady(timeMotion, reducedMotion);',
    '  const timeLayout = useSkyOverlayLayoutReady(timeMotion, reducedMotion);\n  const r17TimeMotionWindow = r17RulerEntry.window();\n' +
    '  useEffect(() => { ' + emit(5, `${phase}, timeMotion.active, timeMotion.present, timeLayout.ready, reducedMotion`, 'r17TimeMotionWindow') +
    ' }, [timeMotion.phase, timeMotion.active, timeMotion.present, timeLayout.ready, reducedMotion]);', 'actual_motion_phase');
  page = one(page, 'id="sky-time-disclosure-surface" onMotionEnd={timeLayout.finish}',
    'id="sky-time-disclosure-surface" onMotionEnd={() => { ' + emit(6, `${phase}, timeMotion.active, timeLayout.ready`, 'r17TimeMotionWindow') + ' timeLayout.finish(); }}', 'actual_surface_finish');

  layout = addR17RulerLayoutObservation(layout);

  nativePosition = prepend(nativePosition);
  nativePosition = one(nativePosition, 'export function createRulerScrollPosition(id: string) {',
    'export function createRulerScrollPosition(id: string, observationOwner = 0) {', 'native_signature');
  nativePosition = one(nativePosition, '  const cancel = () => {\n    revision++;\n    if (timer !== null)',
    '  const cancel = (observationWindow = r17RulerEntry.window()) => {\n    revision++;\n    ' + emit(14, 'observationOwner, revision', 'observationWindow') + '\n    if (timer !== null)', 'native_cancel');
  const moveStart = nativePosition.indexOf('    move(left: number) {'), moveEnd = nativePosition.indexOf('    settle(', moveStart);
  if (moveStart < 0 || moveEnd < moveStart) throw Error('ruler_entry_native_move_missing');
  let move = nativePosition.slice(moveStart, moveEnd);
  move = one(move, '    move(left: number) {\n      cancel();',
    '    move(left: number, observationWindow = r17RulerEntry.window()) {\n      cancel(observationWindow);', 'native_move_window');
  move = one(move, '      const expected = revision;',
    '      const expected = revision;\n      ' + emit(15, 'observationOwner, revision, left', 'observationWindow'), 'native_move_request');
  move = one(move, '        if (expected !== revision) return;',
    '        if (expected !== revision) { ' + emit(16, 'observationOwner, expected, revision, null, null', 'observationWindow') + ' return; }', 'native_stale_node_callback');
  move = one(move, '        node?.scrollTo?.({ left, animated: false });',
    '        const scrollTo = node?.scrollTo;\n        ' + emit(16, 'observationOwner, expected, revision, Boolean(node), typeof scrollTo === "function"', 'observationWindow') +
    '\n        if (scrollTo !== null && scrollTo !== undefined) {\n          ' + emit(17, 'observationOwner, revision, left, false', 'observationWindow') +
    '\n          scrollTo.call(node, { left, animated: false });\n          ' + emit(18, 'observationOwner, revision', 'observationWindow') + '\n        }', 'native_call_not_presentation');
  nativePosition = nativePosition.slice(0, moveStart) + move + nativePosition.slice(moveEnd);
  return { runtime, controls, page, layout, nativePosition };
}

// Shared bounded recorder/clock and layout ownership. Historical r5 output is unchanged.
export function addR17RulerEntryClock({ runtime, controls }) {
  runtime = prepend(runtime);
  runtime = one(runtime, 'binding = { ...configuration, windowId: sequence }; armedAt = now(); sealed = terminalSealed = false;',
    'binding = { ...configuration, windowId: sequence }; armedAt = now(); sealed = terminalSealed = false;\n' +
    '    r17RulerEntry.start(configuration.mode === "normal" && selected === "wide-time", armedAt, now);', 'immediate_shared_clock_start');
  runtime = one(runtime, '  active = armed = false; if (wasRunning) reason = nextReason;',
    '  r17RulerEntry.stop(nextReason === "limit" ? 1 : 0);\n  active = armed = false; if (wasRunning) reason = nextReason;', 'same_stop_owner');
  runtime = one(runtime, '    return { schemaVersion: "starward-r17-phone-probe-v3", variant, runId, caseKey, clock: { ...metricsClock! },',
    '    return r17RulerEntry.attach({ schemaVersion: "starward-r17-phone-probe-v3", variant, runId, caseKey, clock: { ...metricsClock! },', 'same_receipt_start');
  runtime = one(runtime, 'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) };',
    'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) });', 'same_receipt_end');
  controls = prepend(controls);
  controls = one(controls, 'useDidHide(() => { cancelDiagnostic(); detach(); });',
    'useDidHide(() => { ' + emit(20, '0, 8, 0, 0') + ' cancelDiagnostic(); detach(); });', 'page_hide_before_probe_retirement');
  controls = one(controls, 'useEffect(() => { attach(); return () => { cancelDiagnostic(); detach(); }; }, []);',
    'useEffect(() => { attach(); return () => { ' + emit(20, '0, 9, 0, 0') + ' cancelDiagnostic(); detach(); }; }, []);', 'page_unmount_before_probe_retirement');

  return { runtime, controls };
}
export function addR17RulerLayoutObservation(layout) {
  layout = prepend(layout);
  layout = one(layout, '  read: (accept: (values: readonly unknown[]) => void, current: () => boolean) => void,',
    '  read: (accept: (values: readonly unknown[]) => void, current: () => boolean, observationWindow: number) => void,', 'layout_reader_window_type');
  layout = one(layout, '  onResolved: () => void,\n)', '  onResolved: (observationWindow?: number) => void,\n  observationOwner = 0,\n)', 'layout_signature');
  layout = one(layout, '  const retire = () => { revision++; pending = false; };',
    '  const retire = () => { revision++; pending = false; ' + emit(21, 'observationOwner, 1, revision, false, pending, needsMeasure') + ' };', 'layout_retire');
  layout = one(layout, '      retire(); needsMeasure = true;\n      if (!retainProjection) projection = null;',
    '      retire(); needsMeasure = true;\n      if (!retainProjection) projection = null;\n      ' +
    emit(21, 'observationOwner, 2, revision, retainProjection, pending, needsMeasure'), 'layout_invalidate');
  layout = one(layout, '      const expected = ++revision;\n      pending = true;',
    '      const expected = ++revision;\n      const observationWindow = r17RulerEntry.window();\n      pending = true;\n      ' + emit(21, 'observationOwner, 3, revision, false, pending, needsMeasure', 'observationWindow'), 'layout_measure');
  layout = one(layout, '          const next = orientationRulerProjection(values);\n          if (next) {',
    '          const next = orientationRulerProjection(values);\n          ' + emit(10, 'observationOwner, expected, revision, next?.stepPx, next?.zeroOffsetPx', 'observationWindow') + '\n          if (next) {', 'projection_before_install');
  if (layout.split('onResolved();').length !== 3) throw Error('ruler_entry_resolution_paths_changed');
  layout = layout.replaceAll('onResolved();', 'onResolved(observationWindow);');
  layout = one(layout, 'read(accept, () => expected === revision && canAccept());',
    'read(accept, () => expected === revision && canAccept(), observationWindow);', 'same_measurement_window_on_retry');

  return layout;
}
