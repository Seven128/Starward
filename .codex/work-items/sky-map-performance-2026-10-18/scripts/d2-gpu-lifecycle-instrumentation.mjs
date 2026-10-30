// Extend the existing task-only lifecycle/receipt. This does not create a
// second collector, expose a native object, or change the product time owner.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('d2_gpu_lifecycle_boundary_changed:' + label);
  return source.replace(before, after);
}
export function addD2GpuResourceLifecycle({ page, observation, lifecycle, controls, receipt }) {
  observation = one(observation, 'function writeReceipt(event: "initialized" | "ready" | "retire-attempt" | "retire-complete") {',
    'function writeReceipt(event: "initialized" | "ready" | "retire-attempt" | "retire-complete" | "gpu-snapshot") {', 'finite_gpu_event');
  observation = one(observation, 'starward.r17.normal-surface-retirement.v1.', 'starward.r17.normal-surface-retirement.v2.', 'new_exact_key');
  observation = one(observation, 'schemaVersion: "starward-r17-normal-surface-retirement-v1"',
    'schemaVersion: "starward-r17-normal-surface-retirement-v2"', 'new_schema');
  observation = one(observation, '      copyCounts: copyCounts(), coverage:', '      gpu: d2GpuReceipt(), copyCounts: copyCounts(), coverage:', 'scalar_snapshot');
  observation = one(observation, '    surfaceSequence++;', '    surfaceSequence++;\n    d2GpuNewSurface(surfaceSequence);', 'surface_identity');
  // The pre-existing fixed receipt is already bounded; the new six scalar
  // slots additionally keep the existing 32768 B envelope limit explicit.
  observation = one(observation, '    receiptWriter(`starward.r17.normal-surface-retirement.v2.${receiptBinding.buildSourceSha256}`, {',
    '    const packet = {', 'bounded_packet_start');
  observation = one(observation, '      gpu: d2GpuReceipt(), copyCounts: copyCounts(), coverage: "last-surface-and-last-armed-normal-play-only-no-retainer-or-GPU-residency-proof",\n    });',
    '      gpu: d2GpuReceipt(), copyCounts: copyCounts(), coverage: "last-surface-logical-gpu-and-native-operations-not-physical-release",\n    };\n' +
    '    if (JSON.stringify(packet).length > 32768) throw new Error("d2_gpu_receipt_budget");\n' +
    '    receiptWriter(`starward.r17.normal-surface-retirement.v2.${receiptBinding.buildSourceSha256}`, packet);', 'bounded_packet_end');
  observation += '\n' + receipt;
  lifecycle = 'import { r17NormalGpuPlayStarted, r17NormalGpuPaused } from "./r17-normal-observations";\n' + lifecycle;
  lifecycle = one(lifecycle, '      if (recording === owner) r25MemoryPaused();',
    '      if (recording === owner) { r17NormalGpuPaused(); r25MemoryPaused(); }', 'real_pause');
  lifecycle = one(lifecycle, '      owner.start = "started"; owner.recordingSurfaceId = owner.readySurfaceId; recording = owner;',
    '      owner.start = "started"; owner.recordingSurfaceId = owner.readySurfaceId; recording = owner;\n      r17NormalGpuPlayStarted();', 'real_play');
  page = 'import { r17NormalGpuSurfaceId, r17NormalGpuSnapshotPhase, r17NormalGpuRecord } from "./r17-normal-observations";\n' + page;
  page = one(page, '      canvasSurfaceRef.current = surface;',
    '      context.__d2SurfaceReceiptId = r17NormalGpuSurfaceId();\n      canvasSurfaceRef.current = surface;', 'renderer_surface_scalar');
  page = one(page, '      try { context.dispose(); } finally { surface?.dispose(); }',
    '      try {\n' +
    '        try { r17NormalGpuRecord(context.__d2SurfaceReceiptId, "before-retire", context.__d2ResourceFacts()); } catch { /* optional observation */ }\n' +
    '        context.dispose();\n' +
    '      } finally {\n' +
    '        try { r17NormalGpuRecord(context.__d2SurfaceReceiptId, "after-retire", context.__d2ResourceFacts()); } catch { /* optional observation */ }\n' +
    '        surface?.dispose();\n      }', 'original_dispose_order');
  page = one(page, '          pendingSkyPaintRef.current = paintAttempt;\n          try { done(); }',
    '          pendingSkyPaintRef.current = paintAttempt;\n' +
    '          try {\n            const phase = r17NormalGpuSnapshotPhase(context.__d2SurfaceReceiptId, frame.sceneReady);\n' +
    '            if (phase) r17NormalGpuRecord(context.__d2SurfaceReceiptId, phase, context.__d2ResourceFacts(), frame.frameAt);\n' +
    '          } catch { /* optional observation after the real renderer completion */ }\n          try { done(); }', 'completed_draw_only');
  controls = one(controls, '诊断：图片资源逻辑账', '诊断：GPU 资源逻辑账', 'accurate_task_label');
  return { page, observation, lifecycle, controls };
}
