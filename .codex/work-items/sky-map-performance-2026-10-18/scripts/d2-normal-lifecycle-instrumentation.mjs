// Only the new current-source diagnostic copy. Actual product state/writes,
// factory results, timers, native methods and publication remain unchanged.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('d2_normal_lifecycle_boundary_changed:' + label);
  return source.replace(before, after);
}
export function addD2NormalLifecycle({ page, time, observation }) {
  time = 'import { d2NormalTimeChanged } from "./d2-normal-lifecycle";\n' + time;
  time = one(time, 'export function createSkyObservationTime(options: { latestInstant?: () => number } = {}) {',
    'export function createSkyObservationTime(options: { latestInstant?: () => number } = {}) {\n  const d2ObservationToken = {};', 'time_empty_identity');
  time = one(time, '  const publish = (change: Partial<SkyObservationTimeState>) => { state = { ...state, ...change }; return state; };',
    '  const publish = (change: Partial<SkyObservationTimeState>) => { const d2Before = state.mode; state = { ...state, ...change };\n' +
    '    d2NormalTimeChanged(d2ObservationToken, d2Before, state.mode); return state; };', 'actual_publish');
  time = one(time, '  return {\n    snapshot: () => state,',
    '  return {\n    __d2ObservationToken: d2ObservationToken,\n    snapshot: () => state,', 'time_identity_consumer');
  page = 'import { useD2NormalLifecycle, D2DecodeControls } from "./d2-normal-lifecycle-controls";\n' +
    'import { d2NormalSurfaceCreation } from "./d2-normal-lifecycle";\n' + page;
  page = one(page, '  const timeBinding = activeContext ? `${activeContext.contextId}:${activeContext.revision}:${activeContext.contextFingerprint}` : "";',
    '  const timeBinding = activeContext ? `${activeContext.contextId}:${activeContext.revision}:${activeContext.contextFingerprint}` : "";\n' +
    '  const d2NormalOwner = useD2NormalLifecycle(observationTime.__d2ObservationToken, timeBinding, committedAt, pageVisible,\n' +
    '    timeIntent.binding === timeBinding && timeIntent.committedAt === committedAt && timeIntent.mode === "PLAYING");', 'page_context_owner');
  page = one(page, '      const surface = createSkyCanvasSurface<SkyCanvasImage>(display, size, pixelRatio, backing =>',
    '      const surface = d2NormalSurfaceCreation(observationTime.__d2ObservationToken, () => createSkyCanvasSurface<SkyCanvasImage>(display, size, pixelRatio, backing =>', 'same_surface_factory_start');
  page = one(page, '        selectionDisplay);\n      const { node, gl } = surface;',
    '        selectionDisplay));\n      const { node, gl } = surface;', 'same_surface_factory_end');
  page = one(page, '  </SkyNavigationMenu>;',
    '    <D2DecodeControls owner={d2NormalOwner} />\n  </SkyNavigationMenu>;', 'diagnostic_menu_only');
  // The configured original receipt writer forwards its fixed id/event. No
  // reverse import, new surface probe, extra receipt or object reader is added.
  return { page, time, observation };
}
