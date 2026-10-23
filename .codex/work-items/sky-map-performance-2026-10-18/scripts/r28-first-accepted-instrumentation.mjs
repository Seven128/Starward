// TASK ONLY. Associate existing elapsed observations with the original first
// accepted identity. No new clock, product scheduler, frame copy or cache.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('r28_boundary_changed:' + label);
  return source.replace(before, after);
}

export function addR28FirstAcceptedCosts({ runtime, observation, lifecycle, page, scene, starPreparation }) {
  observation = one(observation,
    'export function createR20DrawCosts<Stamp>(now: () => Stamp, interval: (start: Stamp, end: Stamp) => R20Interval) {',
    'export function createR20DrawCosts<Stamp>(now: () => Stamp, interval: (start: Stamp, end: Stamp) => R20Interval,\n' +
    '  onCost?: (stage: R20Stage, value: R20Interval, threw: boolean, kind?: "bsc" | "sao") => void) {', 'reuse_interval_owner');
  observation = one(observation, '    measure<T>(stage: R20Stage, work: () => T): T {',
    '    measure<T>(stage: R20Stage, work: () => T, kind?: "bsc" | "sao"): T {', 'traversal_site');
  observation = one(observation, '          record(target, interval(started, now()), threw);',
    '          const elapsed = interval(started, now());\n          record(target, elapsed, threw);\n' +
    '          onCost?.(stage, elapsed, threw, kind);', 'same_interval_read');

  runtime = 'import { createR28FirstAcceptedCosts } from "./r28-first-accepted-costs";\n' + runtime;
  runtime = one(runtime, 'const r20DrawCosts = createR20DrawCosts(now, interval);',
    'const r28Costs = createR28FirstAcceptedCosts();\n' +
    'const r20DrawCosts = createR20DrawCosts(now, interval, (stage, elapsed, threw, kind) => {\n' +
    '  if (stage === "starTraversal") {\n' +
    '    if (kind) r28Costs.record(kind === "bsc" ? "bscTraversal" : "saoTraversal", elapsed, threw);\n' +
    '  } else r28Costs.record(stage, elapsed, threw);\n});', 'same_cost_observer');
  runtime = one(runtime, '  r20DrawCosts.stop();', '  r20DrawCosts.stop();\n  r28Costs.stop();', 'stop');
  runtime = one(runtime, '    r20DrawCosts.start(configuration.mode === "normal");',
    '    r20DrawCosts.start(configuration.mode === "normal");\n    r28Costs.start(configuration.mode === "normal");', 'start');
  runtime = one(runtime, '  paintStarted(frame: any) {',
    '  canvasOwnerCreated() { return r28Costs.canvasOwner(); },\n' +
    '  withNativePaint<T>(frame: unknown, work: () => T): T {\n' +
    '    return r28Costs.withFrame(frame, () => r17Probe.measure("nativePaintOwner", work));\n  },\n' +
    '  frameStage<T>(frame: unknown, stage: "displayCopy" | "publishAccepted", work: () => T): T {\n' +
    '    return r28Costs.withFrame(frame, () => r17Probe.measure(stage, work));\n  },\n' +
    '  exactStarPreparation(kind: "bsc" | "sao", mode: "build" | "replay" | "bypass") { r28Costs.cache(kind, mode); },\n' +
    '  paintStarted(frame: any, canvasOwner: number | null = null, canvasGeneration = 0) {', 'actual_frame_methods');
  runtime = one(runtime, '    facts.attempt = now(); rememberFrame(frame, facts);',
    '    facts.attempt = now(); rememberFrame(frame, facts);\n' +
    '    r28Costs.begin(frame, getIntent(facts.intent)?.acceptedOnce === false\n' +
    '      ? { intentSequence: facts.intent, prepareToken: facts.token, canvasOwner, canvasGeneration } : null);', 'attempt_identity');
  runtime = one(runtime, '    record(timing.nativeCallbackMs, interval(started ?? null, now()));',
    '    const elapsed = interval(started ?? null, now());\n' +
    '    record(timing.nativeCallbackMs, elapsed);\n    r28Costs.recordFrame(frame, "nativeCallback", elapsed, false);', 'same_callback_interval');
  runtime = one(runtime,
    '  intent.acceptedOnce = true; intent.firstAccepted = wall; links.firstAcceptedIntents = add(links.firstAcceptedIntents);',
    '  intent.acceptedOnce = true; intent.firstAccepted = wall; links.firstAcceptedIntents = add(links.firstAcceptedIntents);\n' +
    '  r28Costs.accept(frame, intent.superseded);', 'original_first_accepted_gate');
  runtime = one(runtime, '  actualDrawCost<T>(stage: "starTraversal" | "rendererSubmit", work: () => T): T {\n' +
    '    return active ? r20DrawCosts.measure(stage, work) : work();',
    '  actualDrawCost<T>(stage: "starTraversal" | "rendererSubmit", work: () => T, kind?: "bsc" | "sao"): T {\n' +
    '    return active ? r20DrawCosts.measure(stage, work, kind) : work();', 'existing_traversal_cost');
  runtime = one(runtime,
    '    const started = now(); try { const result = invoke(); after?.(result); return result; } finally { if (active) record(stageElapsed[stage], interval(started, now())); }',
    '    const started = now(); let threw = true;\n' +
    '    try { const result = invoke(); after?.(result); threw = false; return result; } finally { if (active) {\n' +
    '      const elapsed = interval(started, now()); record(stageElapsed[stage], elapsed);\n' +
    '      if (stage === "nativePaintOwner" || stage === "displayCopy" || stage === "publishAccepted") r28Costs.record(stage, elapsed, threw);\n' +
    '    } }', 'same_copy_and_owner_intervals');
  runtime = one(runtime, 'return r17ProbeBoundedReceipt(r17Geometry.attach(',
    'return r17ProbeBoundedReceipt(r28Costs.attach(r17Geometry.attach(', 'whole_receipt_budget');
  runtime = one(runtime,
    'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) })))));',
    'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) }))))));', 'receipt_close');

  lifecycle = one(lifecycle, '  let ready = false, visible = true, mounted = true, disposed = false;',
    '  const r28CanvasOwner = r17Probe.canvasOwnerCreated();\n  let ready = false, visible = true, mounted = true, disposed = false;', 'canvas_owner');
  lifecycle = one(lifecycle, '    r17Probe.paintStarted(frame);',
    '    r17Probe.paintStarted(frame, r28CanvasOwner, generation);', 'canvas_epoch');
  lifecycle = one(lifecycle, 'r17Probe.measure("nativePaintOwner",()=>port.paint(',
    'r17Probe.withNativePaint(frame,()=>port.paint(', 'real_paint_scope');
  page = one(page, 'r17Probe.measure("displayCopy",()=>surface.present(',
    'r17Probe.frameStage(frame,"displayCopy",()=>surface.present(', 'copy_frame');
  page = one(page, 'r17Probe.measure("publishAccepted",()=>attempt.publish!(',
    'r17Probe.frameStage(frame,"publishAccepted",()=>attempt.publish!(', 'publication_frame');
  scene = one(scene, '  });\n\n  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);',
    '  }, "bsc");\n\n  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);', 'bsc_span');
  scene = one(scene, '  });\n\n  const solarDisc=skySunDiscAt(data.hourly,frameAt,basis,width,height,verticalFovDeg,center);',
    '  }, "sao");\n\n  const solarDisc=skySunDiscAt(data.hourly,frameAt,basis,width,height,verticalFovDeg,center);', 'sao_span');
  scene = one(scene, '  else buildCatalogStars(paintCatalogStar);',
    '  else { r17Probe.exactStarPreparation("bsc", "bypass"); buildCatalogStars(paintCatalogStar); }', 'bsc_no_cache');
  scene = one(scene, '  else buildSupplementStars(paintSupplementStar);',
    '  else { r17Probe.exactStarPreparation("sao", "bypass"); buildSupplementStars(paintSupplementStar); }', 'sao_no_cache');

  starPreparation = 'import { r17Probe } from "./r17-phone-probe-runtime";\n' + starPreparation;
  starPreparation = one(starPreparation, '          catalog = null; build(visit); return;',
    '          r17Probe.exactStarPreparation("bsc", "bypass");\n          catalog = null; build(visit); return;', 'catalog_bypass');
  starPreparation = one(starPreparation, '          // Release before constructing B: a throw cannot revive prior A.',
    '          r17Probe.exactStarPreparation("bsc", "build");\n          // Release before constructing B: a throw cannot revive prior A.', 'catalog_build');
  starPreparation = one(starPreparation, '          catalog = { source, frame, points };\n        }\n        replay(catalog.points, visit);',
    '          catalog = { source, frame, points };\n        } else r17Probe.exactStarPreparation("bsc", "replay");\n        replay(catalog.points, visit);', 'catalog_replay');
  starPreparation = one(starPreparation, '          supplement = null; build(visit); return;',
    '          r17Probe.exactStarPreparation("sao", "bypass");\n          supplement = null; build(visit); return;', 'supplement_bypass');
  starPreparation = one(starPreparation, '        if (supplement?.frame !== frame) {\n          supplement = null;',
    '        if (supplement?.frame !== frame) {\n          r17Probe.exactStarPreparation("sao", "build");\n          supplement = null;', 'supplement_build');
  starPreparation = one(starPreparation, '          supplement = { frame, points };\n        }\n        replay(supplement.points, visit);',
    '          supplement = { frame, points };\n        } else r17Probe.exactStarPreparation("sao", "replay");\n        replay(supplement.points, visit);', 'supplement_replay');
  return { runtime, observation, lifecycle, page, scene, starPreparation };
}
