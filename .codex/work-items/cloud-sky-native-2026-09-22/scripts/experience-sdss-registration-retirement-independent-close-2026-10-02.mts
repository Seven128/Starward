/** Read-only closure of actual r3 outputs plus five controlled wide-TAN points. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto'; import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict'; import vm from 'node:vm'; import ts from 'typescript';
import * as contracts from '../../../../packages/miniapp-contracts/src/index.ts';
import * as registration from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
import * as observation from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts';
import { registerSkyScienceOpticalField } from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-science-registration.ts';
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url)), OUT = process.argv[2];
assert.match(OUT ?? '', /^output\/sdss-registration-retirement-independent-closure-1002-r\d+$/u);
assert(!fs.existsSync(path.join(ROOT, OUT!))); fs.mkdirSync(path.join(ROOT, OUT!));
const PREVIOUS = 'output/sdss-registration-retirement-independent-1002-r3/';
const raw = (p: string) => fs.readFileSync(path.join(ROOT, p)), sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
const bind = (p: string) => { const r = raw(p); return { path: p, bytes: r.length, sha256: sha(r) }; };
const inputs = new Map<string, ReturnType<typeof bind>>();
const admit = (p: string, expected?: { bytes?: number; sha256?: string }) => { const b = bind(p);
  if (expected?.bytes !== undefined) assert.equal(b.bytes, expected.bytes, p); if (expected?.sha256) assert.equal(b.sha256, expected.sha256, p); inputs.set(p, b); return b; };
const read = (p: string) => { admit(p); return JSON.parse(raw(p).toString('utf8')); };
const save = (p: string, v: unknown) => fs.writeFileSync(path.join(ROOT, OUT!, p), JSON.stringify(v, null, 2) + '\n', { flag: 'wx' });
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(ROOT, OUT!, 'executed-script.mts.txt'), fs.constants.COPYFILE_EXCL);
try {
  admit('.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-registration-retirement-independent-close-2026-10-02.mts');
  const frozen = read(PREVIOUS + 'binding.json'); assert.equal(frozen.unchanged, true); assert.deepEqual(frozen.inputsBefore, frozen.inputsAfter);
  for (const b of frozen.inputsBefore) admit(b.path, b);
  const six = read('output/sdss-presentation-retirement-1002-r1/current-source-bindings.json'); assert.equal(six.length, 6); for (const b of six) admit(b.path, b);
  const baseline = read('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'); assert.equal(baseline.length, 6); for (const b of baseline) admit(b.path, b);
  const failure = read(PREVIOUS + 'failed.json'); assert.match(failure.error, /ReferenceError: scienceNormalizeMutantRejectedAtQualificationTolerance is not defined/u);
  admit(PREVIOUS + 'executed-script.mts.txt');
  assert.deepEqual(raw(PREVIOUS + 'executed-script.mts.txt'), raw('.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-registration-retirement-independent-2026-10-02.mts'));
  const graph = read(PREVIOUS + 'actual-runtime-source-graph.json');
  for (const p of graph.sourceFiles) assert(inputs.has(p), p);
  const geometry = read(PREVIOUS + 'geometry-observations.json'); assert.equal(geometry.observations.length, 108);
  assert(geometry.observations.every((r: any) => r.pixelError < 1e-6));
  const mutations = read(PREVIOUS + 'normalization-mutations.json'); assert.equal(mutations.rawResults.length, 2);
  assert(mutations.rawResults.every((r: any) => r.error < 1e-12 && r.mutatedError > .01));
  assert.equal(mutations.scienceNormalized.length, 27); assert.equal(mutations.scienceMutantRejectedAtQualificationTolerance, false);
  assert(mutations.scienceNormalized.every((r: any) => r.pixelError < 1e-6));
  const units = read(PREVIOUS + 'old-unit-api-comparison.json'); assert.equal(units.cases.length, 12);
  assert(units.cases.every((r: any) => r.exactRegistrationAndUvComparison));
  for (const p of ['raw-normalize-mutant.ts.txt', 'science-normalize-mutant.ts.txt', 'head-unit-registration.ts.txt', 'actual-page-expressions.json']) admit(PREVIOUS + p);
  const page = read(PREVIOUS + 'page-retirement-observations.json'); assert.equal(page.observations.length, 14);
  assert(page.usesActualPageAst && page.usesActualNativeLifetimeRegistry);
  const named = (name: string) => { const r = page.observations.find((r: any) => r.name === name); assert(r, name); return r.value; };
  const bothRetired = named('both actual handles retired before queued envelope replacement');
  assert.deepEqual(bothRetired, { optical: false, infrared: false, status: 'NONE', recovery: false, cueImagePainted: false, informationBinding: {} });
  const priorPage = named('actual frozen before source under same retired handles'); assert.equal(priorPage.status, 'CREDIT'); assert(priorPage.recovery && priorPage.cueImagePainted); assert.deepEqual(priorPage.informationBinding, {});
  const ir = named('independently live W3 survives optical retirement'); assert(!ir.optical && ir.infrared && ir.cueImagePainted && ir.status === 'NONE');
  assert.deepEqual(named('explicit native registry retirement stays retired after predicate resumes'), bothRetired);
  const wcs = read(PREVIOUS + 'astropy-readback.json'); assert.equal(wcs.rows.length, 27); assert.equal(wcs.astropyVersion, '8.0.1');
  assert(wcs.rows.every((r: any) => r.maxErrorDegrees < 1e-12));
  for (const b of wcs.actualLoadedModuleBindings) { const r = fs.readFileSync(b.path); assert.equal(r.length, b.bytes); assert.equal(sha(r), b.sha256); }
  admit(PREVIOUS + 'astropy-readback.stderr.txt');

  const pythonScript = '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-registration-wide-diagnostic-2026-10-02.py'; admit(pythonScript);
  const py = spawnSync('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe', [path.join(ROOT, pythonScript)], { cwd: ROOT, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
  fs.writeFileSync(path.join(ROOT, OUT!, 'wide-diagnostic.stderr.txt'), py.stderr ?? '', { flag: 'wx' }); assert.equal(py.status, 0, py.stderr || String(py.error));
  const wide = JSON.parse(py.stdout); assert.equal(wide.rows.length, 5); assert.equal(wide.astropyVersion, '8.0.1'); assert.equal(wide.fieldDegrees, 45);
  save('controlled-wide-wcs.json', wide);
  const publication = read('output/sdss-science-optical-writer-1002-r1/publication/manifest.json');
  assert.equal(wide.sourceSha256, bind('output/sdss-science-optical-writer-1002-r1/publication/manifest.json').sha256);
  const asset = { ...publication.levels.OVERVIEW, fieldDegrees: wide.fieldDegrees };
  const controlled = { ...publication, levels: { ...publication.levels, OVERVIEW: asset } };
  // This is a controlled geometry caller; no new immutable publication is
  // admitted or hashed. The original admitted writer manifest is untouched.
  const frame = { ...geometry.frames[3], equatorialToEnu: [1, 4e-7, 0, 0, 1, 0, 0, 0, 1] };
  contracts.assertStellarRotation(frame.equatorialToEnu);
  const normal = registerSkyScienceOpticalField(controlled, asset, frame); assert(normal);
  const js = ts.transpileModule(raw(PREVIOUS + 'science-normalize-mutant.ts.txt').toString('utf8'), { fileName: 'science-normalize-mutant.ts',
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: any = {}, imports: Record<string, unknown> = { '@starward/miniapp-contracts': contracts, './sky-artwork-registration': registration, './sky-observation-frame': observation };
  vm.runInNewContext(js, { exports, require(name: string) { assert(name in imports); return imports[name]; } });
  const normalized = exports.registerSkyScienceOpticalField(controlled, asset, frame); assert(normalized);
  const observations = wide.rows.map((row: any) => {
    const ra = row.raDeg * Math.PI / 180, dec = row.decDeg * Math.PI / 180;
    const ray = observation.skyEquatorialDirectionToEnu(frame.equatorialToEnu, [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]);
    const unit = ray.map((n: number) => n / Math.hypot(...ray)), actual = registration.skyArtworkUvAtDirection(normal, unit as any)!, mutant = registration.skyArtworkUvAtDirection(normalized, unit as any)!;
    assert(actual && mutant); const error = Math.hypot(actual[0] - row.uv[0], actual[1] - row.uv[1]) * 512;
    const mutantError = Math.hypot(mutant[0] - row.uv[0], mutant[1] - row.uv[1]) * 512;
    assert(error < 1e-6); return { uv: row.uv, actual, mutant, pixelError: error, mutantPixelError: mutantError };
  });
  const wideRejected = observations.some((r: any) => r.mutantPixelError >= 1e-6);
  save('controlled-wide-observations.json', { ...wide, matrix: frame.equatorialToEnu, observations,
    scienceNormalizeMutantRejectedAtOriginalTolerance: wideRejected, originalTolerancePixels: 1e-6,
    originalManifestUntouched: true, noSourceCoverageOrAdoptionClaim: true });
  const currentBefore = [...inputs.values()], currentAfter = currentBefore.map(b => bind(b.path)); assert.deepEqual(currentAfter, currentBefore);
  for (const b of wcs.actualLoadedModuleBindings) { const r = fs.readFileSync(b.path); assert.equal(r.length, b.bytes); assert.equal(sha(r), b.sha256); }
  save('closure-binding.json', { inputsBefore: currentBefore, inputsAfter: currentAfter, unchanged: true,
    previousActualRuntimeBindingsVerified: frozen.inputsBefore.length, pythonActualLoadedModuleHashesRechecked: wcs.actualLoadedModuleBindings.length });
  save('result.json', { status: 'INDEPENDENT_SCIENCE_GEOMETRY_AND_PRESENTATION_RETIREMENT_DEVELOPMENT_CLOSED',
    closureOfActualBehavior: PREVIOUS, previousSummaryWriterFailedAndPreserved: failure.error,
    noGeometryOrRetirementBehaviorRerun: true, extraDiagnosticPoints: 5, controlledWideFieldDegrees: 45,
    actualAstropyRows: 27, actualThreeObserverMatrixWcsCases: 81, nearRotationWcsCases: 27,
    maxActualGeometryPixelError: Math.max(...geometry.observations.map((r: any) => r.pixelError)),
    rawNormalizeMutantRejected: true, rawFourthCornerAndInteriorWitnesses: 2,
    actualTinyScienceNormalizeMutantNotRejected: true, maxTinyNormalizeMutantPixelError: Math.max(...mutations.scienceNormalized.map((r: any) => r.pixelError)),
    controlledWideNormalizeMutantRejected: wideRejected, maxControlledWidePixelError: Math.max(...observations.map((r: any) => r.pixelError)),
    maxControlledWideNormalizeMutantPixelError: Math.max(...observations.map((r: any) => r.mutantPixelError)),
    exactOldUnitApiAndUvComparisons: 12, actualPageAstNativeLifetimeCases: 14, actualBeforeRetirementRegression: true,
    frozenSixSourceBindingsCurrent: true, unrelatedSixPreserved: true, originalManifestCurrent: true,
    previousProductRuntimeSourceFiles: graph.sourceFiles.length, previousProductRuntimeEdges: graph.edges.length,
    closureBoundInputs: currentBefore.length, nativeNormalScienceQualityAndAcceptanceNotClaimed: true });
  console.log(JSON.stringify({ result: bind(OUT! + '/result.json'), binding: bind(OUT! + '/closure-binding.json') }));
} catch (error) { save('failed.json', { error: String(error), inputs: [...inputs.values()] }); throw error; }
