// r6 observes the single native positioning writer and actual offset admission.
// No synthetic declarative-scroll event and no extra selector/polling operation.
import { addR17RulerEntryClock, addR17RulerLayoutObservation } from './r17-ruler-entry-instrumentation.mjs';
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('ruler_entry_v2_boundary_changed:' + label);
  return source.replace(before, after);
}
const emit = (code, values = '', window = '') => `if (r17RulerEntry.active()) r17RulerEntry.record(${code}, [${values}]${window ? ', ' + window : ''});`;
const prepend = source => 'import { r17RulerEntry } from "./r17-ruler-entry-runtime";\n' + source;
export function addR17RulerEntryV2({ runtime, controls, page, layout, nativePosition }) {
  ({ runtime, controls } = addR17RulerEntryClock({ runtime, controls }));
  layout = addR17RulerLayoutObservation(layout);
  page = prepend(page);
  page = one(page, 'import { createRulerScrollPosition } from "@/components/ruler-scroll-position";',
    'import { createRulerScrollPosition } from "./r17-ruler-scroll-position";', 'sky_only_native_copy');
  page = one(page, '  const rowIdentity = rows.map(row => row.at).join("|");',
    '  const rowIdentity = rows.map(row => row.at).join("|");\n' +
    '  const r17RenderWindow = r17RulerEntry.window();\n  const r17RulerOwner = useRef(0);\n  if (!r17RulerOwner.current) r17RulerOwner.current = r17RulerEntry.id();\n' +
    '  const r17Rows = useRef({ identity: rowIdentity, version: 1 });\n' +
    '  if (r17Rows.current.identity !== rowIdentity) { r17Rows.current.identity = rowIdentity; r17Rows.current.version++; }', 'owner_and_row_version');
  page = one(page, 'createRulerScrollPosition("sky-orientation-time-ruler-scroll")',
    'createRulerScrollPosition("sky-orientation-time-ruler-scroll", r17RulerOwner.current)', 'native_owner');
  page = one(page, 'rows: string; reading: boolean } | null>(null);',
    'rows: string; reading: boolean; observationWindow: number } | null>(null);', 'pending_window_scalar');
  page = one(page, 'useRef<(left: number | null, finished?: boolean) => void>',
    'useRef<(left: number | null, finished?: boolean, observationWindow?: number) => void>', 'observed_window_type');
  page = one(page, '  const cancelPosition = useCallback(() => {',
    '  const cancelPosition = useCallback((r17ObservationWindow = r17RulerEntry.window()) => {', 'cancel_window');
  page = one(page, '    pendingAlignment.current = null;\n    nativePosition.cancel();',
    '    pendingAlignment.current = null;\n    nativePosition.cancel(r17ObservationWindow);', 'native_cancel_window');
  page = one(page, '  const positionResolved = useRef<() => void>(() => {});',
    '  const positionResolved = useRef<(observationWindow?: number) => void>(() => {});', 'resolved_window_type');
  page = one(page, '  if (!layoutRef.current) layoutRef.current = createOrientationRulerLayout((accept, current) => {\n    Taro.nextTick(() => {\n      if (!current()) return;',
    '  if (!layoutRef.current) layoutRef.current = createOrientationRulerLayout((accept, current, r17ObservationWindow) => {\n' +
    '    const r17QueryId = r17RulerEntry.current(r17ObservationWindow) ? r17RulerEntry.id() : 0;\n    const r17RowsVersion = r17Rows.current.version;\n' +
    '    ' + emit(7, 'r17RulerOwner.current, r17QueryId, r17RowsVersion', 'r17ObservationWindow') + '\n    Taro.nextTick(() => {\n' +
    '      const r17Current = current();\n      ' + emit(8, 'r17RulerOwner.current, r17QueryId, r17RowsVersion, r17Current', 'r17ObservationWindow') + '\n      if (!r17Current) return;', 'measure_schedule');
  page = one(page, '          .exec(accept);',
    '          .exec(values => {\n            ' + emit(9, 'r17RulerOwner.current, r17QueryId, r17RowsVersion, current(), ' +
    '(values[0] as { left?: number })?.left, (values[0] as { width?: number })?.width, ' +
    '(values[1] as { left?: number })?.left, (values[1] as { width?: number })?.width, ' +
    '(values[2] as { left?: number })?.left, (values[2] as { width?: number })?.width, ' +
    '(values[3] as { scrollLeft?: number })?.scrollLeft', 'r17ObservationWindow') + '\n            accept(values);\n          });', 'measure_batch_result');
  page = one(page, '}, () => visible.current && layoutAllowed.current && !settlement.active, () => positionResolved.current());',
    '}, () => visible.current && layoutAllowed.current && !settlement.active, observationWindow => positionResolved.current(observationWindow), r17RulerOwner.current);', 'layout_owner');
  page = one(page, '  const positionIndex = useCallback((index: number, afterNativeUpdate = false) => {\n    targetIndex.current = index;\n    cancelPosition();',
    '  const positionIndex = useCallback((index: number, afterNativeUpdate = false, r17ObservationWindow = r17RulerEntry.window()) => {\n    ' +
    emit(11, 'r17RulerOwner.current, r17Rows.current.version, positionRevision.current, index, afterNativeUpdate, visible.current, layoutAllowed.current, selectionAllowed.current, settlement.active', 'r17ObservationWindow') +
    '\n    targetIndex.current = index;\n    cancelPosition(r17ObservationWindow);', 'position_request');
  page = one(page, '    if (verify) {\n      alignmentRequired.current = true;',
    '    ' + emit(25, 'r17RulerOwner.current, r17Rows.current.version, expected, index, left, verify, layout.measured, nativeRows.current === rowIdentity', 'r17ObservationWindow') +
    '\n    if (verify) {\n      alignmentRequired.current = true;', 'target_not_a_command');
  page = one(page, 'pendingAlignment.current = { revision: expected, index, rows: rowIdentity, reading: false };',
    'pendingAlignment.current = { revision: expected, index, rows: rowIdentity, reading: false, observationWindow: r17ObservationWindow };', 'pending_request_window');
  page = one(page, '    const move = () => {\n      if (expected !== positionRevision.current',
    '    const move = () => {\n      ' + emit(13, 'r17RulerOwner.current, r17Rows.current.version, expected, positionRevision.current, currentRows.current === rowIdentity, visible.current, layoutAllowed.current, selectionAllowed.current, settlement.active', 'r17ObservationWindow') +
    '\n      if (expected !== positionRevision.current', 'move_guard');
  page = one(page, '      nativePosition.move(left, !verify && !reducedMotion,\n        verify ? observed => observePosition.current(observed) : undefined);',
    '      nativePosition.move(left, !verify && !reducedMotion,\n        verify ? observed => observePosition.current(observed, false, r17ObservationWindow) : undefined, r17ObservationWindow);', 'move_observed_window');
  page = one(page, '  observePosition.current = (left, finished = false) => {\n    const pending = pendingAlignment.current;',
    '  observePosition.current = (left, finished = false, r17ObservationWindow = r17RulerEntry.window()) => {\n    const pending = pendingAlignment.current;\n    ' +
    emit(26, 'r17RulerOwner.current, r17Rows.current.version, positionRevision.current, pending?.revision, pending?.index, pending?.rows === currentRows.current, pending?.rows === nativeRows.current, visible.current, selectionAllowed.current, interactionAllowed.current, settlement.active, left, finished', 'r17ObservationWindow'), 'observed_before_original_admission_guard');
  page = one(page, '      setAlignedRows(pending.rows);\n      setPositionFailed(false);',
    '      setAlignedRows(pending.rows);\n      setPositionFailed(false);\n      ' +
    emit(27, 'r17RulerOwner.current, r17Rows.current.version, pending.revision, pending.index, left', 'r17ObservationWindow'), 'actual_alignment_admitted');
  page = one(page, '    } else if (left === null || finished) {\n      pendingAlignment.current = null;\n      setPositionFailed(true);',
    '    } else if (left === null || finished) {\n      pendingAlignment.current = null;\n      setPositionFailed(true);\n      ' +
    emit(28, 'r17RulerOwner.current, r17Rows.current.version, pending.revision, pending.index, left, finished', 'r17ObservationWindow'), 'actual_alignment_unavailable');
  page = one(page, '    pending.reading = true;\n    nativePosition.readOffset(left => {',
    '    pending.reading = true;\n    const r17ObservationWindow = pending.observationWindow;\n    ' +
    emit(29, 'r17RulerOwner.current, r17Rows.current.version, pending.revision, pending.index, finished', 'r17ObservationWindow') +
    '\n    nativePosition.readOffset(left => {\n      ' + emit(30, 'r17RulerOwner.current, r17Rows.current.version, pending.revision, pending === pendingAlignment.current, left', 'r17ObservationWindow'), 'pending_read_window');
  page = one(page, '      observePosition.current(left, finished);\n    });',
    '      observePosition.current(left, finished, r17ObservationWindow);\n    }, r17ObservationWindow);', 'read_callback_window');
  page = one(page, '  positionResolved.current = () => {',
    '  positionResolved.current = (r17ObservationWindow = r17RulerEntry.window()) => {', 'resolved_callback_window');
  page = one(page, '    positionIndex(targetIndex.current, true);',
    '    positionIndex(targetIndex.current, true, r17ObservationWindow);', 'resolved_command_window');
  for (const [before, boundary] of [
    ['  useDidHide(() => {\n    visible.current = false;', 4],
    ['  useDidShow(() => {\n    visible.current = true;', 6],
    ['  useResize(() => {\n    cancelPosition();', 3],
    ['  useEffect(() => () => {\n    visible.current = false;', 5],
    ['  useEffect(() => {\n    // Preparation', 2],
  ]) {
    const first = before.indexOf('\n') + 1;
    page = one(page, before, before.slice(0, first) + '    ' +
      emit(20, `r17RulerOwner.current, ${boundary}, r17Rows.current.version, positionRevision.current`) + '\n' + before.slice(first), 'lifecycle_' + boundary);
  }
  page = one(page, '          cancelPosition();\n          layout.retire();\n          settlement.begin();',
    '          ' + emit(20, 'r17RulerOwner.current, 1, r17Rows.current.version, positionRevision.current') +
    '\n          cancelPosition();\n          layout.retire();\n          settlement.begin();', 'gesture_retirement');
  page = one(page, '        onScroll={(event) => {',
    '        onScroll={(event) => {\n          ' + emit(19, 'r17RulerOwner.current, r17Rows.current.version, positionRevision.current, Number(event.detail.scrollLeft), interactionDisabled, settlement.active'), 'scroll_event_not_admission');
  page = one(page, '  const currentLabel = presentedAt',
    '  useEffect(() => {\n    ' + emit(24, 'r17RulerOwner.current, r17Rows.current.version, rows.length, activeIndex, committedIndex, selectionReady, layoutReady, preparing, alignedRows === rowIdentity, alignmentRequired.current, ticksVisible, positionFailed, reducedMotion, Date.parse(rows[0]?.at ?? ""), Date.parse(rows[rows.length - 1]?.at ?? "")', 'r17RenderWindow') +
    '\n  }, [rowIdentity, activeIndex, committedIndex, selectionReady, layoutReady, preparing, alignedRows, ticksVisible, positionFailed, reducedMotion]);\n  const currentLabel = presentedAt', 'actual_props_no_declarative_writer');
  const phase = '(timeMotion.phase === "preparing" ? 5 : timeMotion.phase === "opening" ? 1 : timeMotion.phase === "open" ? 2 : timeMotion.phase === "closing" ? 3 : 4)';
  page = one(page, '  const timeLayout = useSkyOverlayLayoutReady(timeMotion, reducedMotion);',
    '  const timeLayout = useSkyOverlayLayoutReady(timeMotion, reducedMotion);\n  const r17TimeMotionWindow = r17RulerEntry.window();\n' +
    '  useEffect(() => { ' + emit(5, `${phase}, timeMotion.active, timeMotion.present, timeLayout.ready, reducedMotion`, 'r17TimeMotionWindow') +
    ' }, [timeMotion.phase, timeMotion.active, timeMotion.present, timeLayout.ready, reducedMotion]);', 'preparing_is_distinct');
  page = one(page, 'id="sky-time-disclosure-surface" onMotionEnd={timeLayout.finish}',
    'id="sky-time-disclosure-surface" onMotionEnd={() => { ' + emit(6, `${phase}, timeMotion.active, timeLayout.ready`, 'r17TimeMotionWindow') + ' timeLayout.finish(); }}', 'surface_finish');

  nativePosition = prepend(nativePosition);
  nativePosition = one(nativePosition, 'export function createRulerScrollPosition(id: string) {',
    'export function createRulerScrollPosition(id: string, observationOwner = 0) {', 'native_signature');
  nativePosition = one(nativePosition, '  const cancel = () => {\n    revision++;',
    '  const cancel = (observationWindow = r17RulerEntry.window()) => {\n    revision++;\n    ' + emit(14, 'observationOwner, revision', 'observationWindow'), 'native_retirement');
  nativePosition = one(nativePosition, 'accept: (left: number | null) => void, retry = true) => {',
    'accept: (left: number | null) => void, retry = true, observationWindow = r17RulerEntry.window()) => {\n    ' +
    emit(31, 'observationOwner, expected, revision, retry', 'observationWindow'), 'actual_read_scheduled');
  nativePosition = one(nativePosition, '      Taro.createSelectorQuery().select(`#${id}`).scrollOffset().exec(result => {\n        if (expected !== revision) return;',
    '      Taro.createSelectorQuery().select(`#${id}`).scrollOffset().exec(result => {\n        ' +
    emit(32, 'observationOwner, expected, revision, expected === revision, result[0]?.scrollLeft', 'observationWindow') +
    '\n        if (expected !== revision) return;', 'actual_read_result_before_native_guard');
  nativePosition = one(nativePosition, 'readOffset(expected, accept, false);',
    'readOffset(expected, accept, false, observationWindow);', 'read_retry_window');
  nativePosition = one(nativePosition, '    readOffset(accept: (left: number | null) => void) { readOffset(revision, accept); },',
    '    readOffset(accept: (left: number | null) => void, observationWindow = r17RulerEntry.window()) { readOffset(revision, accept, true, observationWindow); },', 'public_read_window');
  nativePosition = one(nativePosition, '    move(left: number, animated = false, observed?: (left: number | null) => void) {\n      cancel();\n      const expected = revision;',
    '    move(left: number, animated = false, observed?: (left: number | null) => void, observationWindow = r17RulerEntry.window()) {\n      cancel(observationWindow);\n      const expected = revision;\n      ' +
    emit(15, 'observationOwner, revision, left, animated', 'observationWindow'), 'one_native_move');
  nativePosition = one(nativePosition, '          Taro.createSelectorQuery().select(`#${id}`).node().exec(result => {\n            if (expected !== revision) return;',
    '          Taro.createSelectorQuery().select(`#${id}`).node().exec(result => {\n            if (expected !== revision) { ' +
    emit(16, 'observationOwner, expected, revision, null, null', 'observationWindow') + ' return; }', 'stale_node_callback');
  nativePosition = one(nativePosition, '            if (!node?.scrollTo) {',
    '            ' + emit(16, 'observationOwner, expected, revision, Boolean(node), typeof node?.scrollTo === "function"', 'observationWindow') +
    '\n            if (!node?.scrollTo) {', 'node_capability_result');
  nativePosition = one(nativePosition, '              node.scrollTo({ left, animated });',
    '              ' + emit(17, 'observationOwner, revision, left, animated', 'observationWindow') + '\n              node.scrollTo({ left, animated });\n              ' +
    emit(18, 'observationOwner, revision', 'observationWindow'), 'scrollTo_return_not_completion');
  nativePosition = one(nativePosition, 'if (observed) readOffset(expected, observed);',
    'if (observed) readOffset(expected, observed, true, observationWindow);', 'post_move_read_window');
  return { runtime, controls, page, layout, nativePosition };
}
