// Exact task-only additions at existing normal lifecycle/publication owners.
// No product state or scheduling change; stripping the declarations restores
// the complete input bytes, including accepted updater and null retirements.
const both = 'import { r26AggregateUse, r26AggregateSlot } from "./r25-memory-lifetime-adapter";\n';
const slotOnly = 'import { r26AggregateSlot } from "./r25-memory-lifetime-adapter";\n';
const readFrame = '(frame as { stellarSupplement?: object | null } | null)?.stellarSupplement ?? null';
const readLatest = '(latest as { stellarSupplement?: object | null } | undefined)?.stellarSupplement ?? null';
const definitions = {
  lifecycle: { prefix: both, edits: [
    ['      latest = frame;', '      latest = frame;\n'+
      `      r26AggregateUse("request", ${readFrame});\n`+
      `      r26AggregateSlot("lifecycle-latest", ${readLatest});`, 1],
    ['    try { latest = port.resolveFrame?.(latest) ?? latest; }',
      '    try { latest = port.resolveFrame?.(latest) ?? latest; '+
      `r26AggregateSlot("lifecycle-latest", ${readLatest}); }`, 1],
    ['    r17Probe.paintStarted(frame);', '    r17Probe.paintStarted(frame);\n'+
      `    r26AggregateUse("paint", ${readFrame});`, 1],
    ['finally { latest = undefined; dirty = false; }',
      'finally { latest = undefined; dirty = false; r26AggregateSlot("lifecycle-latest", null); }', 2],
  ] },
  drawPreparation: { prefix: slotOnly, edits: [
    ['  const reset = () => { key = null; catalog = null; supplement = null; revision++; };',
      '  const reset = () => { key = null; catalog = null; supplement = null; revision++; r26AggregateSlot("draw-preparation", null); };', 1],
    ['          supplement = null; build(visit); return;',
      '          supplement = null; r26AggregateSlot("draw-preparation", null); build(visit); return;', 1],
    ['          supplement = null;\n          const expected = revision, points = collect(build);',
      '          supplement = null;\n          r26AggregateSlot("draw-preparation", null);\n          const expected = revision, points = collect(build);', 1],
    ['          supplement = { frame, points };',
      '          supplement = { frame, points };\n          r26AggregateSlot("draw-preparation", frame);', 1],
  ] },
  page: { prefix: both, edits: [
    ['      r17Probe.accepted(frame,paintedSkyObjectsRef.current);',
      '      r17Probe.accepted(frame,paintedSkyObjectsRef.current);\n'+
      '      r26AggregateUse("accepted", frame.stellarSupplement ?? null);\n'+
      '      r26AggregateSlot("accepted-command", presentedSkyFrameRef.current?.stellarSupplement ?? null);', 1],
    ['setPresentedSkyFrame(null);',
      'setPresentedSkyFrame(null); r26AggregateSlot("accepted-command", presentedSkyFrameRef.current?.stellarSupplement ?? null);', 3],
  ] },
};
function replaceExact(source, before, after, expected, label) {
  if (source.split(before).length !== expected + 1) throw Error('r26_aggregate_use_boundary_changed:' + label);
  return source.split(before).join(after);
}
export function addR26AggregateUse(sources) {
  const output = {};
  for (const [kind, definition] of Object.entries(definitions)) {
    let source = sources[kind];
    if (typeof source !== 'string' || source.includes('r26AggregateUse') || source.includes('r26AggregateSlot'))
      throw Error('r26_aggregate_use_source_required:' + kind);
    for (const [index, [before, after, count]] of definition.edits.entries())
      source = replaceExact(source, before, after, count, kind + ':' + index);
    output[kind] = definition.prefix + source;
  }
  return output;
}
export function stripR26AggregateUseSource(source, kind) {
  const definition = definitions[kind];
  if (!definition) throw Error('r26_aggregate_use_kind_required');
  source = replaceExact(source, definition.prefix, '', 1, kind + ':import');
  for (const [index, [before, after, count]] of definition.edits.entries())
    source = replaceExact(source, after, before, count, kind + ':strip:' + index);
  return source;
}
