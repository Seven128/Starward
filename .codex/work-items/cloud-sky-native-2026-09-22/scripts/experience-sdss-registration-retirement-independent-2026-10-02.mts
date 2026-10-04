/** Bounded actual-source independent readback. No rendering, HTTP or new source. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire, isBuiltin } from 'node:module';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../../../../packages/miniapp-contracts/src/index.ts';
import * as registration from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
import * as observation from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts';
import { registerSkyScienceOpticalField } from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-science-registration.ts';
import { registerSkyNativeImageLifetime, skyNativeImageIsCurrent } from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import { sdssOpticalPresentation } from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts';
import { Observer, Rotation_EQJ_HOR } from '../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts';
import * as view from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url)), OUT = process.argv[2];
assert.match(OUT ?? '', /^output\/sdss-registration-retirement-independent-1002-r\d+$/u);
assert(!fs.existsSync(path.join(ROOT, OUT!)));
fs.mkdirSync(path.join(ROOT, OUT!));
const prefix = 'apps/wechat-miniapp/src/features/sky/';
const sha = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const raw = (p: string) => fs.readFileSync(path.join(ROOT, p));
const bind = (p: string) => { const b = raw(p); return { path: p, bytes: b.length, sha256: sha(b) }; };
const inputs = new Map<string, ReturnType<typeof bind>>();
const admit = (p: string, expected?: { bytes?: number; sha256?: string }) => {
  const b = bind(p);
  if (expected?.sha256) assert.equal(b.sha256, expected.sha256, p);
  if (expected?.bytes !== undefined) assert.equal(b.bytes, expected.bytes, p);
  inputs.set(p, b); return b;
};
const save = (p: string, value: unknown) => fs.writeFileSync(path.join(ROOT, OUT!, p), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(ROOT, OUT!, 'executed-script.mts.txt'), fs.constants.COPYFILE_EXCL);
const compile = (p: string, text: string) => ts.transpileModule(text, { fileName: p,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const load = (p: string, text: string, imports: Record<string, unknown>) => {
  const exports: any = {};
  vm.runInNewContext(compile(p, text), { exports, require(name: string) { assert(name in imports, name); return imports[name]; } });
  return exports;
};
const unit = (v: readonly number[]) => v.map(n => n / Math.hypot(...v));
const eq = (raDeg: number, decDeg: number) => {
  const ra = raDeg * Math.PI / 180, dec = decDeg * Math.PI / 180;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
};
try {
  admit('.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-registration-retirement-independent-2026-10-02.mts');
  const author = 'output/sdss-presentation-retirement-1002-r1/';
  admit(author + 'current-source-bindings.json');
  const six = JSON.parse(raw(author + 'current-source-bindings.json').toString('utf8'));
  assert.equal(six.length, 6);
  for (const b of six) admit(b.path, b);
  for (const name of ['before.log', 'before-exit.json', 'after.log', 'after-exit.json', 'page-before.tsx', 'page-test-before.ts',
    'typecheck.log', 'typecheck-exit.json', 'typecheck-after.log', 'typecheck-after-exit.json',
    'geometry-after-test-import-repair.log', 'geometry-after-test-import-repair-exit.json']) admit(author + name);
  assert.equal(bind(author + 'page-before.tsx').sha256, '960b9e0ae7c0a2ac6b69fdada5feb104d06acd63cc4b6b7d168c130492fa42ad');
  assert.match(raw(author + 'before.log').toString(), /(?:#|ℹ) fail 2/u);
  assert.match(raw(author + 'after.log').toString(), /(?:#|ℹ) pass 41/u);
  assert.match(raw(author + 'after.log').toString(), /(?:#|ℹ) fail 0/u);
  assert.match(raw(author + 'geometry-after-test-import-repair.log').toString(), /(?:#|ℹ) pass 3/u);
  const fixturePath = 'output/sdss-science-registration-fixture-1002-r1/fixture.json';
  admit(fixturePath, { sha256: 'cd322c3b3b7b4133f5e96bc3f01108b8161650a363d82c63c4b561adb23fe6e9' });
  assert.deepEqual(raw(fixturePath), raw(prefix + 'sky-sdss-science-registration.fixture.json'));
  const fixture = JSON.parse(raw(fixturePath).toString('utf8'));
  const publicationPath = 'output/sdss-science-optical-writer-1002-r1/publication/manifest.json';
  admit(publicationPath, { sha256: '3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5' });
  const publication = JSON.parse(raw(publicationPath).toString('utf8'));
  contracts.assertSdssScienceOpticalManifest(publication, 'M:51', publication.publicationHash);
  const freeze = (value: any) => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  freeze(publication);
  for (const p of ['.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-science-registration-wcs-fixture-2026-10-02.py',
    '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-registration-independent-2026-10-02.py',
    'data-pipelines/deep-sky/sdss_gri_tan.py', 'data-pipelines/deep-sky/publish_sdss_science.py',
    '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-science-normal-consumer-boundary-2026-10-02.md']) admit(p);

  // Bind emitted runtime import closure of the owners actually used here.
  // Compiler/tooling and the complete React page are not executed product graphs.
  const graph = new Set<string>(), edges: any[] = [], builtins = new Set<string>();
  const bindGraph = (absolute: string) => {
    absolute = fs.realpathSync(absolute); const p = path.relative(ROOT, absolute).replaceAll('\\', '/');
    assert(!p.startsWith('../')); if (graph.has(p)) return; graph.add(p); admit(p);
    if (p.endsWith('.json')) return;
    const js = compile(p, fs.readFileSync(absolute, 'utf8')), ast = ts.createSourceFile('runtime.js', js, ts.ScriptTarget.Latest, true);
    const names = new Set<string>();
    const scan = (n: ts.Node) => { if (ts.isCallExpression(n) && n.expression.getText(ast) === 'require' && ts.isStringLiteral(n.arguments[0]!)) names.add(n.arguments[0].text); ts.forEachChild(n, scan); };
    scan(ast); const require = createRequire(absolute);
    for (const name of names) {
      if (isBuiltin(name)) { builtins.add(name); continue; }
      let resolved: string;
      if (name.startsWith('.')) {
        const c = path.resolve(path.dirname(absolute), name);
        const matches = [c, c + '.ts', c + '.tsx', c + '.js', path.join(c, 'index.ts'), path.join(c, 'index.js')]
          .filter(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        assert(matches.length, p + ' -> ' + name); resolved = matches[0]!;
      } else resolved = require.resolve(name);
      edges.push({ importer: p, request: name, resolved: path.relative(ROOT, resolved).replaceAll('\\', '/') }); bindGraph(resolved);
    }
  };
  for (const p of [prefix + 'sky-sdss-science-registration.ts', prefix + 'sky-artwork-loader.ts', prefix + 'sky-sdss-optical-selection.ts',
    'packages/miniapp-contracts/src/index.ts', 'packages/astronomy-core/src/astronomy-engine-runtime.ts']) bindGraph(path.join(ROOT, p));
  save('actual-runtime-source-graph.json', { sourceFiles: [...graph], edges, builtins: [...builtins],
    scope: 'Emitted-import closure of actual geometry/lifetime/presentation/contracts/Astronomy owners. Page is a complete admitted AST source; no full React/Taro page execution. Compiler/tsx runtime tooling excluded.' });
  const preserved = JSON.parse(raw('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').toString('utf8'));
  admit('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
  // The exact baseline format is recorded verbatim; current six unrelated file
  // preservation is independently checked by root and is not rewritten here.
  save('preserved-baseline-readback.json', preserved);

  const pythonFile = '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-registration-independent-2026-10-02.py';
  const python = 'C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
  const py = spawnSync(python, [path.join(ROOT, pythonFile)], { cwd: ROOT, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(ROOT, OUT!, 'astropy-readback.stderr.txt'), py.stderr ?? '', { flag: 'wx' });
  assert.equal(py.status, 0, py.stderr || String(py.error));
  const actualWcs = JSON.parse(py.stdout); assert.equal(actualWcs.status, 'ACTUAL_ASTROPY_TAN_FIXTURE_READBACK_PASS');
  save('astropy-readback.json', actualWcs);
  for (const b of actualWcs.actualLoadedModuleBindings) {
    const value = fs.readFileSync(b.path); assert.equal(value.length, b.bytes); assert.equal(sha(value), b.sha256);
  }

  const makeFrame = (latitude: number, longitude: number, at: string) => {
    const instant = new Date(at), m = Rotation_EQJ_HOR(instant, new Observer(latitude, longitude, 30)).rot;
    return { at: instant.toISOString(), format: contracts.OBSERVATION_FRAME_FORMAT, observer: { latitude, longitude, elevationM: 30 },
      equatorialToEnu: [-m[0]![1]!, -m[1]![1]!, -m[2]![1]!, m[0]![0]!, m[1]![0]!, m[2]![0]!, m[0]![2]!, m[1]![2]!, m[2]![2]!] };
  };
  const frames = [makeFrame(22.6, 114.5, '2026-09-20T13:00:00Z'), makeFrame(-35, 149, '2026-12-21T05:00:00Z'),
    makeFrame(65, -20, '2027-03-21T00:00:00Z')];
  const near = { ...frames[0]!, equatorialToEnu: [1, 4e-7, 0, 0, 1, 0, 0, 0, 1] };
  contracts.assertStellarRotation(near.equatorialToEnu);
  const geometry: any[] = [];
  for (const [i, frame] of [...frames, near].entries()) {
    contracts.assertSkyObservationFrames([frame], [frame.at]);
    assert.strictEqual(observation.exactSkyObservationFrame({ hourly: [{ at: frame.at }], observationFrames: [frame] } as any, frame.at), frame);
    for (const row of actualWcs.rows) {
      const asset = publication.levels[row.level], r = registerSkyScienceOpticalField(publication, asset, frame as any); assert(r);
      const ray = unit(observation.skyEquatorialDirectionToEnu(frame.equatorialToEnu as any, eq(row.raDeg, row.decDeg) as any));
      const uv = registration.skyArtworkUvAtDirection(r, ray as any); assert(uv);
      const pixelError = Math.hypot(uv[0] - row.uv[0], uv[1] - row.uv[1]) * 512;
      assert(pixelError < 1e-6, String(pixelError)); geometry.push({ frame: i, level: row.level, expected: row.uv, actual: uv, pixelError });
    }
  }
  save('geometry-observations.json', { frames: [...frames, near], observations: geometry });
  const rawAnchors = [{ uv: [0, 0], point: [-.8, .4, 1] }, { uv: [1, 0], point: [.6, .4, 1] }, { uv: [0, 1], point: [-.8, -.3, 1] }];
  const witnesses = [{ uv: [1, 1], point: [.6, -.3, 1] }, { uv: [.75, .6], point: [.25, -.02, 1] }];
  const rp = prefix + 'sky-artwork-registration.ts', rs = raw(rp).toString('utf8');
  const marker = '  const [a,b,c] = anchors as readonly [SkyArtworkPlaneAnchor, SkyArtworkPlaneAnchor, SkyArtworkPlaneAnchor];';
  assert.equal(rs.split(marker).length, 2);
  const rawMutant = rs.replace(marker, '  anchors = anchors.map(a => ({uv:a.uv,point:a.point.map(n=>n/Math.hypot(...a.point)) as unknown as SkyVector}));\n' + marker);
  const mutatedRaw = load(rp, rawMutant, { './sky-view-projection': view });
  fs.writeFileSync(path.join(ROOT, OUT!, 'raw-normalize-mutant.ts.txt'), rawMutant, { flag: 'wx' });
  const rawResults = witnesses.map(w => {
    const correct = registration.skyArtworkUvAtDirection(registration.registerSkyArtworkPlane(rawAnchors as any)!, unit(w.point) as any)!;
    const wrong = registration.skyArtworkUvAtDirection(mutatedRaw.registerSkyArtworkPlane(rawAnchors), unit(w.point) as any)!;
    const error = Math.hypot(correct[0] - w.uv[0]!, correct[1] - w.uv[1]!);
    const mutatedError = Math.hypot(wrong[0] - w.uv[0]!, wrong[1] - w.uv[1]!);
    assert(error < 1e-12); assert(mutatedError > .01); return { expected: w.uv, correct, wrong, error, mutatedError };
  });
  const sp = prefix + 'sky-sdss-science-registration.ts', ss = raw(sp).toString('utf8');
  const sm = 'point: skyEquatorialDirectionToEnu(observation.equatorialToEnu, raw)';
  assert.equal(ss.split(sm).length, 2);
  const scienceMutant = ss.replace(sm, 'point: skyEquatorialDirectionToEnu(observation.equatorialToEnu, raw).map((n,_i,v)=>n/Math.hypot(...v)) as unknown as SkyVector');
  const mutatedScience = load(sp, scienceMutant, { '@starward/miniapp-contracts': contracts,
    './sky-artwork-registration': registration, './sky-observation-frame': observation });
  fs.writeFileSync(path.join(ROOT, OUT!, 'science-normalize-mutant.ts.txt'), scienceMutant, { flag: 'wx' });
  const normalizedErrors = actualWcs.rows.map((row: any) => {
    const ray = unit(observation.skyEquatorialDirectionToEnu(near.equatorialToEnu as any, eq(row.raDeg, row.decDeg) as any));
    const r = mutatedScience.registerSkyScienceOpticalField(publication, publication.levels[row.level], near);
    const uv = registration.skyArtworkUvAtDirection(r, ray as any)!;
    return { level: row.level, expected: row.uv, actual: uv, pixelError: Math.hypot(uv[0] - row.uv[0], uv[1] - row.uv[1]) * 512 };
  });
  const scienceMutantRejectedAtQualificationTolerance = normalizedErrors.some(r => r.pixelError >= 1e-6);
  save('normalization-mutations.json', { rawResults, scienceNormalized: normalizedErrors,
    actualCompiledMutants: true, sourceFilesUntouched: true,
    scienceMutantRejectedAtQualificationTolerance,
    interpretation: 'The asymmetric raw-plane oracle rejects normalization. Actual tiny M51 TAN with accepted 4e-7 matrix deviation does not necessarily reject normalization at the original 1e-6-pixel qualification tolerance; this diagnostic is not upgraded to an escaped-defect proof.' });

  const prior = spawnSync('git', ['show', 'HEAD:' + rp], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.equal(prior.status, 0, prior.stderr);
  fs.writeFileSync(path.join(ROOT, OUT!, 'head-unit-registration.ts.txt'), prior.stdout, { flag: 'wx' });
  assert(!prior.stdout.includes('registerSkyArtworkPlane'));
  const old = load(rp, prior.stdout, { './sky-view-projection': view });
  const unitCases: any[] = [];
  const arrays = [
    [{ uv: [.1, .2], direction: unit([-.2, .7, .6]) }, { uv: [.9, .3], direction: unit([.3, .6, .7]) }, { uv: [.4, .85], direction: unit([.1, .85, .3]) }],
    rawAnchors.map(a => ({ uv: a.uv, direction: unit(a.point) })),
  ];
  const variants = [...arrays, ...arrays.flatMap(a => [a.slice(0, 2), [a[0], a[0], a[2]], a.map(v => ({ ...v, uv: [.2, .2] })),
    a.map(v => ({ ...v, direction: [1, 1, 1] })), a.map(v => ({ ...v, uv: [NaN, .2] }))])];
  for (const [index, anchors] of variants.entries()) {
    const a = old.registerSkyArtwork(anchors), b = registration.registerSkyArtwork(anchors as any);
    assert.equal(JSON.stringify(b), JSON.stringify(a));
    const probes = a ? [[0.2, 0.3, .5], [-.3, 1.1, .2]].map(weights => {
      const ray = unit([0, 1, 2].map(i => weights.reduce((s, w, k) => s + w * anchors[k]!.direction[i]!, 0)));
      const x = old.skyArtworkUvAtDirection(a, ray), y = registration.skyArtworkUvAtDirection(b!, ray as any);
      assert.equal(JSON.stringify(y), JSON.stringify(x)); return { weights, uv: y };
    }) : [];
    unitCases.push({ index, available: !!b, exactRegistrationAndUvComparison: true, probes });
  }
  save('old-unit-api-comparison.json', { headSourceSha256: sha(prior.stdout), sourceDiffReviewedOnlyRawExtension: true, cases: unitCases });

  const pp = prefix + 'spot-sky-page.tsx';
  const getExpressions = (sourceText: string) => {
    const ast = ts.createSourceFile(pp, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), found = new Map<string, ts.Expression[]>();
    const names = new Set(['sdssOpticalImagePresented', 'deepSkyImagePresented', 'sdssOpticalStatus', 'sdssOpticalCurrentImagePresented', 'imagePainted']);
    let modal: ts.Expression | undefined;
    const scan = (n: ts.Node) => {
      if (ts.isVariableDeclaration(n) && names.has(n.name.getText(ast)) && n.initializer) {
        const name = n.name.getText(ast); found.set(name, [...(found.get(name) ?? []), n.initializer]);
      }
      if (ts.isJsxSpreadAttribute(n) && n.expression.getText(ast).includes('opticalPublicationHash: presentedSkyFrame')) modal = n.expression;
      ts.forEachChild(n, scan);
    }; scan(ast); assert(modal);
    const result: Record<string, string> = { informationBinding: modal.getText(ast) };
    for (const name of names) { assert.equal(found.get(name)?.length, 1, name); result[name] = found.get(name)![0]!.getText(ast); }
    return result;
  };
  const current = getExpressions(raw(pp).toString('utf8')), before = getExpressions(raw(author + 'page-before.tsx').toString('utf8'));
  save('actual-page-expressions.json', { current, before });
  const evalExpr = (expression: string, bindings: object) => vm.runInNewContext(compile('actual-page-expression.ts', '(' + expression + ')'), bindings);
  const pageResults: any[] = [];
  const photo = {}, parent = {}, paintedHash = 'a'.repeat(64), latestHash = 'b'.repeat(64);
  let nativeLive = true, infraredLive = true;
  const retire = registerSkyNativeImageLifetime(photo, () => nativeLive);
  const queued = { sdssOpticalImage: { image: photo, reference: 'M:51', publicationHash: paintedHash },
    deepSkyImage: { image: {}, reference: 'M:51', publicationHash: 'c'.repeat(64), isCurrent: () => infraredLive } };
  const base: any = { presentedSceneCurrent: true, nativeCanvasMounted: true, canvasSize: { width: 390, height: 844 }, canvasError: null,
    presentedSkyFrame: queued, selectedCatalogObject: { reference: 'M:51' }, entry: { objectRef: 'M:51' },
    sdssOptical: { requested: true, failed: false, loading: false, image: photo, coarser: { image: parent },
      publication: { objectRef: 'M:51', publicationHash: paintedHash } }, skyNativeImageIsCurrent, sdssOpticalPresentation };
  const read = (expr: Record<string, string>, changes: object = {}) => {
    const state = { ...base, ...changes }, gates: any = {};
    for (const name of ['sdssOpticalImagePresented', 'deepSkyImagePresented']) gates[name] = evalExpr(expr[name]!, state);
    const scope = { ...state, ...gates };
    return { optical: gates.sdssOpticalImagePresented, infrared: gates.deepSkyImagePresented,
      status: evalExpr(expr.sdssOpticalStatus!, scope), recovery: evalExpr(expr.sdssOpticalCurrentImagePresented!, scope),
      cueImagePainted: evalExpr(expr.imagePainted!, scope), informationBinding: JSON.parse(JSON.stringify(evalExpr(expr.informationBinding!, scope))) };
  };
  const observe = (name: string, changes: object, expected: any) => {
    const value = read(current, changes); assert.deepEqual(value, expected, name); pageResults.push({ name, value }); return value;
  };
  const live = { optical: true, infrared: true, status: 'CREDIT', recovery: true, cueImagePainted: true, informationBinding: { opticalPublicationHash: paintedHash } };
  observe('actual completed native handle live', {}, live);
  observe('new query metadata cannot relabel completed hash', { sdssOptical: { ...base.sdssOptical, publication: { objectRef: 'M:51', publicationHash: latestHash }, image: {} } }, { ...live, recovery: false });
  observe('wrong selected target cannot acquire completed optical credit', { selectedCatalogObject: { reference: 'M:82' }, entry: { objectRef: 'M:82' } }, { ...live, cueImagePainted: false, informationBinding: {} });
  for (const [name, change] of [['scene expired', { presentedSceneCurrent: false }], ['canvas hidden', { nativeCanvasMounted: false }],
    ['canvas width zero', { canvasSize: { width: 0, height: 844 } }], ['canvas height zero', { canvasSize: { width: 390, height: 0 } }],
    ['completed frame missing', { presentedSkyFrame: null }]] as const) observe(name, change,
      { optical: false, infrared: false, status: 'NONE', recovery: false, cueImagePainted: false, informationBinding: {} });
  nativeLive = false; infraredLive = false;
  const retired = observe('both actual handles retired before queued envelope replacement', {},
    { optical: false, infrared: false, status: 'NONE', recovery: false, cueImagePainted: false, informationBinding: {} });
  const wrongBefore = read(before); assert.equal(wrongBefore.status, 'CREDIT'); assert.equal(wrongBefore.recovery, true); assert.equal(wrongBefore.cueImagePainted, true); assert.deepEqual(wrongBefore.informationBinding, {});
  pageResults.push({ name: 'actual frozen before source under same retired handles', value: wrongBefore, unchangedQueuedEnvelope: true });
  infraredLive = true;
  observe('independently live W3 survives optical retirement', {}, { ...retired, infrared: true, cueImagePainted: true });
  observe('retry state under retired optical', { sdssOptical: { ...base.sdssOptical, failed: true } }, { ...retired, infrared: true, cueImagePainted: true, status: 'RETRY' });
  observe('loading state under retired optical', { sdssOptical: { ...base.sdssOptical, loading: true } }, { ...retired, infrared: true, cueImagePainted: true, status: 'LOADING' });
  nativeLive = true; infraredLive = false; retire();
  observe('explicit native registry retirement stays retired after predicate resumes', {}, retired);
  save('page-retirement-observations.json', { usesActualPageAst: true, usesActualNativeLifetimeRegistry: true,
    nativeImagesAreStructuralControlledHandles: true, fullReactNativeNotExecuted: true, observations: pageResults });

  const beforeBindings = [...inputs.values()], afterBindings = beforeBindings.map(b => bind(b.path));
  assert.deepEqual(afterBindings, beforeBindings);
  for (const b of actualWcs.actualLoadedModuleBindings) { const r = fs.readFileSync(b.path); assert.equal(sha(r), b.sha256); assert.equal(r.length, b.bytes); }
  save('binding.json', { inputsBefore: beforeBindings, inputsAfter: afterBindings, unchanged: true,
    pythonActualLoadedBeforeAfterHashVerified: true, pythonRuntime: python, nodeVersion: process.version });
  save('result.json', { status: 'INDEPENDENT_SCIENCE_GEOMETRY_AND_PRESENTATION_RETIREMENT_PASS',
    realPublicationHash: publication.publicationHash, actualAstropyRows: actualWcs.rows.length,
    observerMatrices: 3, admittedNearRotationMatrix: true, geometryObservations: geometry.length,
    maxGeometryPixelError: Math.max(...geometry.map(r => r.pixelError)), rawWitnesses: rawResults.length,
    rawNormalizeMutantRejected: true, scienceNormalizeMutantRejectedAtQualificationTolerance,
    maxScienceNormalizeMutantPixelError: Math.max(...normalizedErrors.map(r => r.pixelError)),
    oldUnitCases: unitCases.length, exactOldNewUnitApiComparison: true,
    pageActualSourceCases: pageResults.length, actualBeforeFailureReadback: true,
    currentSourcesUnchanged: true, frozenInputs: beforeBindings.length,
    scope: ['Actual cached admitted manifest/fixture and independent Astropy origin=0 readback; actual report-matrix-compatible Astronomy observer transforms, CPU raw-plane/UV functions, actual compiled in-memory mutations.',
      'Full admitted page AST expressions execute with actual native lifetime registry and controlled structural image handles; no full React/Taro runtime, encoded decode, GPU, physical presentation, HTTP, default science enablement or source-quality/capacity acceptance.'] });
  console.log(JSON.stringify({ result: bind(OUT! + '/result.json'), binding: bind(OUT! + '/binding.json') }));
} catch (error) {
  save('failed.json', { error: String(error), inputs: [...inputs.values()] }); throw error;
}
