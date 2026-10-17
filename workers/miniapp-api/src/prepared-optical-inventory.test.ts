import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { preparedNativeOpticalPublicationHash } from '@starward/miniapp-contracts';
import { preparedNativeOpticalFixture } from '../../../packages/miniapp-contracts/src/test-fixtures/prepared-native-optical-publication.ts';
import { nativeTanNominalWidthDegrees } from '@starward/astronomy-core/tan-optical-geometry';
import { syntheticOpticalPng } from './test-fixtures/synthetic-optical-png.ts';
import { PreparedOpticalImageryService } from './prepared-optical-imagery.ts';
import { writeSkyStaticBundle } from '../../../tools/deployment/sky-static-bundle.mjs';
import { skyPublicAssetHeaders } from './sky-public-asset-headers.ts';
import { inventoryFileBinding, inspectPreparedInventory } from '../../../data-pipelines/deep-sky/prepared_inventory.mts';
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');

async function fixture(root: string, id = 'inventory-fixture') {
  const value = preparedNativeOpticalFixture(true); value.publicationId = id;
  // Transport/receipt fixture. It supplies no reviewed image or actual adoption.
  const sourceBytes = Buffer.from('source byte identity fixture, not an observational JPEG');
  await writeFile(join(root, `${id}-source.jpg`), sourceBytes);
  const sourceBinding = await inventoryFileBinding(root, `${id}-source.jpg`);
  Object.assign(value.source.encoded, { bytes: sourceBinding.bytes, sha256: sourceBinding.sha256 });
  for (const [level, asset] of Object.entries(value.levels)) {
    const bytes = syntheticOpticalPng(32, 64, 96, { width: asset.width, height: asset.height, colorType: 2 });
    Object.assign(asset, { file: `${id}-${level.toLowerCase()}.png`, format: 'png', bytes: bytes.length,
      sha256: sha(bytes), fieldDegrees: nativeTanNominalWidthDegrees(value.nominalTan) });
    await writeFile(join(root, asset.file), bytes);
  }
  const producer = { version: value.processing.producerVersion, levels: value.levels, nominalTan: value.nominalTan, inputs: [sourceBinding] };
  await writeFile(join(root, `${id}-producer.json`), JSON.stringify(producer));
  const producerBinding = await inventoryFileBinding(root, `${id}-producer.json`);
  value.processing.producerReceipt = { bytes: producerBinding.bytes, sha256: producerBinding.sha256 };
  const publicationHash = preparedNativeOpticalPublicationHash(value), reference = value.reference;
  const url = pathToFileURL(join(root, `${id}-manifest.json`));
  await writeFile(url, JSON.stringify(value));
  const owner = new PreparedOpticalImageryService([{ reference, expectedHash: publicationHash, manifestUrl: url }]);
  await writeFile(url, JSON.stringify(owner.manifest(publicationHash)));
  const manifest = await inventoryFileBinding(root, `${id}-manifest.json`);
  const files = [manifest, ...await Promise.all(Object.values(value.levels).map(a => inventoryFileBinding(root, a.file)))];
  await writeFile(join(root, `${id}-writer.json`), JSON.stringify({ status: 'OFFLINE_PREPARED_OPTICAL_CANDIDATE_PACKAGED',
    publicationHash, inputs: [producerBinding, sourceBinding], files }));
  const writerReceipt = await inventoryFileBinding(root, `${id}-writer.json`);
  const candidate = { id, manifest, writerReceipt };
  const input = async (extra: Record<string, unknown> = {}) => {
    await writeFile(join(root, 'input.json'), JSON.stringify({ schemaVersion: 'prepared-optical-inventory-input-v1',
      candidates: [candidate], ...extra }));
    return inventoryFileBinding(root, 'input.json');
  };
  return { owner, candidate, publicationHash, value, input, sourceBinding, files };
}
async function scoped(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'starward-prepared-inventory-'));
  try { await run(root); }
  finally {
    assert.equal(dirname(await realpath(root)), await realpath(tmpdir()));
    assert.match(root.split(/[\\/]/).at(-1)!, /^starward-prepared-inventory-/);
    await rm(root, { recursive: true }); // Exclusively generated data; resolved scope verified.
  }
}

test('inventory counts actual image/metadata roles and never promotes a transported candidate', () => scoped(async root => {
  const f = await fixture(root), result = await inspectPreparedInventory(root, await f.input());
  assert.equal(result.exceptions.length, 0);
  assert.equal(result.candidates.publications, 1); assert.equal(result.candidates.regions, 1);
  assert.equal(result.candidates.images.records, 3); assert.equal(result.candidates.metadata.records, 1);
  assert.equal(result.candidates.support.records, 0);
  assert.equal(result.distributable.publications, 0);
  assert.equal(result.rows[0].ordinaryAdoption, false); assert.equal(result.rows[0].fileReview, 'MISSING');
  assert.equal(result.rows[0].registration, 'UNVERIFIED');
  assert.equal([...f.owner.registeredPublications()].length, 1, 'inventory cannot mutate even an explicit owner');
  assert.deepEqual([...new PreparedOpticalImageryService().registeredPublications()], []);
}));

test('full-source file review binds the original and every level without implying Scene or adoption', () => scoped(async root => {
  const f = await fixture(root);
  const decision = { kind: 'FILE', status: 'PASSED', publicationHash: f.publicationHash,
    manifest: f.candidate.manifest, reason: 'Fixture review identity only, not actual visual approval',
    evidence: [f.sourceBinding, ...f.files] };
  const inspect = async (decisions: unknown[]) => {
    await writeFile(join(root, 'file-decisions.json'), JSON.stringify({ schemaVersion: 'prepared-optical-review-decisions-v1', decisions }));
    return inspectPreparedInventory(root, await f.input({ decisions: [await inventoryFileBinding(root, 'file-decisions.json')] }));
  };
  const passed = await inspect([decision]);
  assert.deepEqual(passed.exceptions, []);
  assert.equal(passed.rows[0].fileReview, 'FILE_REVIEW_PASSED_SCENE_PENDING');
  assert.equal(passed.rows[0].scene, 'MISSING');
  assert.equal(passed.rows[0].registration, 'UNVERIFIED');
  assert.equal(passed.rows[0].ordinaryAdoption, false);
  assert.equal(passed.distributable.publications, 0);
  assert.equal((await inspect([{ ...decision, status: 'FAILED' }])).rows[0].fileReview, 'NEEDS_REPAIR');
  assert.equal((await inspect([{ ...decision, status: 'UNKNOWN' }])).rows[0].fileReview, 'PENDING_REVIEW');
  for (const missing of decision.evidence.filter(b => b !== f.candidate.manifest)) {
    const result = await inspect([{ ...decision, evidence: decision.evidence.filter(b => b !== missing) }]);
    assert.match(result.exceptions[0].error, /full_source_file_review_evidence_missing/);
  }
  assert.match((await inspect([decision, decision])).exceptions[0].error, /decision_duplicate/);
  assert.match((await inspect([{ ...decision, manifest: { ...f.candidate.manifest, sha256: 'f'.repeat(64) } }])).exceptions[0].error, /decision_identity/);
}));

test('editions and LOD records stay distinct while identical payload bytes are counted once', () => scoped(async root => {
  const first = await fixture(root), next = await fixture(root, 'inventory-next');
  const result = await inspectPreparedInventory(root, await first.input({ candidates: [first.candidate, next.candidate] }));
  assert.deepEqual(result.exceptions, []); assert.equal(result.candidates.publications, 2);
  assert.equal(result.candidates.regions, 1); assert.equal(result.candidates.images.records, 6);
  assert.equal(result.candidates.images.uniqueFiles, 3); assert.equal(result.candidates.metadata.uniqueFiles, 2);
  assert.equal(result.candidates.images.uniqueBytes, Object.values(first.value.levels).reduce((n, a) => n + a.bytes, 0));
}));

test('native exception queues retain failed and repair rows and reject missing batch members', () => scoped(async root => {
  const save = async (file: string, value: unknown) => {
    await writeFile(join(root, file), JSON.stringify(value)); return inventoryFileBinding(root, file);
  };
  const ids = ['failed', 'repair'];
  const processingReceipt = await save('processing.json', { schema: 'sxt-processing-v1', rows: ids.map(id => ({ id, outputs: {} })) });
  const reviewReceipt = await save('review.json', { schema: 'sxt-review-queue-v1', processingReceipt,
    rows: ids.map((id, i) => ({ id, outputs: {}, status: i ? 'NEEDS_REPAIR' : 'HARD_CHECK_FAILED' })) });
  const batchReceipt = await save('batch.json', { schema: 'prepared-native-reviewed-batch-v1', review: { processingReceipt, reviewReceipt }, recipes: [] });
  const rows = ids.map((id, i) => ({ id, fileReview: i ? 'NEEDS_REPAIR' : 'HARD_CHECK_FAILED', status: 'QUEUED_REVIEW_EXCEPTION', reason: `${id} original reason` }));
  const receipt = async (selected: unknown[], declaredReview = reviewReceipt) => save('result.json', { schema: 'prepared-native-reviewed-batch-result-v1', batchReceipt, reviewReceipt: declaredReview, inputs: [batchReceipt], rows: selected });
  const input = async (selected: unknown[], declaredReview = reviewReceipt) => save('input.json', { schemaVersion: 'prepared-optical-inventory-input-v1', batchReceipts: [await receipt(selected, declaredReview)] });
  const result = await inspectPreparedInventory(root, await input(rows));
  assert.deepEqual(result.exceptions, []); assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map(r => r.fileReview), ['HARD_CHECK_FAILED', 'NEEDS_REPAIR']);
  assert.deepEqual(result.rows.map(r => r.batchReason), ['failed original reason', 'repair original reason']);
  assert.equal(result.candidates.publications, 0); assert.equal(result.distributable.publications, 0);
  const missing = await inspectPreparedInventory(root, await input(rows.slice(0, 1)));
  assert.equal(missing.completeness, 'PARTIAL'); assert.match(missing.exceptions[0].error, /native_batch_row_coverage/);
  const mixed = await inspectPreparedInventory(root, await input(rows, { ...reviewReceipt, sha256: 'f'.repeat(64) }));
  assert.equal(mixed.completeness, 'PARTIAL'); assert.match(mixed.exceptions[0].error, /native_batch_row_coverage/);
}));

test('the standard static reader proves exact payload delivery but cannot establish review or adoption', () => scoped(async root => {
  const f = await fixture(root), records = [];
  for await (const image of f.owner.publishedAssets()) records.push({ route: image.descriptor.downloadUrl, bytes: image.bytes,
    headers: skyPublicAssetHeaders('prepared-optical', image.contentType, image.fieldDegrees) });
  for (const metadata of f.owner.publishedMetadata()) records.push({ route: metadata.route, bytes: metadata.bytes, headers: metadata.headers });
  const exported = await writeSkyStaticBundle(join(root, 'sealed'), (async function* () { yield* records; })());
  const index = await inventoryFileBinding(root, exported.output + '/index.json');
  const result = await inspectPreparedInventory(root, await f.input({ staticIndexes: [index] }));
  assert.equal(exported.files, 4); assert.equal(result.rows[0].delivery, 'COMPLETE');
  assert.deepEqual(result.rows[0].missingRoutes, []); assert.equal(result.distributable.publications, 0);
  const detail = join(exported.output, 'files', f.owner.manifest(f.publicationHash).levels.DETAIL.downloadUrl);
  const old = await readFile(detail); await writeFile(detail, Buffer.concat([old, Buffer.from([0])]));
  const broken = await inspectPreparedInventory(root, await f.input({ staticIndexes: [index] }));
  assert.equal(broken.completeness, 'PARTIAL'); assert.equal(broken.rows[0].delivery, 'PARTIAL');
  assert.match(broken.exceptions[0].error, /file_identity_mismatch/);
  await writeFile(detail, old);
  assert.equal((await inspectPreparedInventory(root, await f.input({ staticIndexes: [index] }))).rows[0].delivery, 'COMPLETE');
}));

test('wrong manifest decisions, duplicate decisions and stale Scene code cannot grant a pass', () => scoped(async root => {
  const f = await fixture(root);
  await writeFile(join(root, 'scene.txt'), 'actual scene output evidence');
  await writeFile(join(root, 'renderer.ts'), 'first implementation');
  const decision = { kind: 'SCENE', status: 'PASSED', publicationHash: f.publicationHash, manifest: f.candidate.manifest,
    reason: 'Fixture decision identity check only', evidence: [await inventoryFileBinding(root, 'scene.txt')],
    implementation: [await inventoryFileBinding(root, 'renderer.ts')] };
  const inspect = async (decisions: unknown[]) => {
    await writeFile(join(root, 'decisions.json'), JSON.stringify({ schemaVersion: 'prepared-optical-review-decisions-v1', decisions }));
    return inspectPreparedInventory(root, await f.input({ decisions: [await inventoryFileBinding(root, 'decisions.json')] }));
  };
  assert.equal((await inspect([decision])).rows[0].scene, 'PASSED');
  await writeFile(join(root, 'renderer.ts'), 'changed implementation');
  assert.equal((await inspect([decision])).rows[0].scene, 'STALE');
  assert.match((await inspect([decision, decision])).exceptions[0].error, /decision_duplicate/);
  assert.match((await inspect([{ ...decision, manifest: { ...decision.manifest, sha256: 'f'.repeat(64) } }])).exceptions[0].error, /decision_identity/);
  const orphan = await inspect([{ ...decision, publicationHash: 'f'.repeat(64) }]);
  assert.equal(orphan.rows[0].scene, 'MISSING'); assert.match(orphan.exceptions[0].error, /orphan_decision/);
}));

test('corrupt candidate bytes retain an explicit failure and cannot turn into an empty successful input', () => scoped(async root => {
  const f = await fixture(root);
  const pin = await f.input(); await writeFile(join(root, f.value.levels.DETAIL.file), 'corrupt PNG');
  const broken = await inspectPreparedInventory(root, pin);
  assert.equal(broken.candidates.publications, 0); assert.equal(broken.rows.length, 1);
  assert.match(broken.rows[0].error as string, /input_identity/);
  assert.deepEqual(broken.rows[0].blockers, ['JOIN_OR_ADMISSION_FAILED']);
  await assert.rejects(inspectPreparedInventory(root, { ...pin, sha256: '0'.repeat(64) }), /input_identity/);
  await assert.rejects(inspectPreparedInventory(root, { ...pin, path: '../input.json' }), /binding_invalid/);
}));

test('one invalid candidate does not erase an independently valid row', () => scoped(async root => {
  const f = await fixture(root), pin = await f.input({ candidates: [f.candidate, { ...f.candidate, id: 'bad',
    manifest: { ...f.candidate.manifest, sha256: 'f'.repeat(64) } }] });
  const result = await inspectPreparedInventory(root, pin);
  assert.equal(result.rows.length, 2); assert.equal(result.candidates.publications, 1);
  assert.equal(result.rows[0].publicationHash, f.publicationHash);
  assert.equal(result.rows[1].blockers && (result.rows[1].blockers as unknown[])[0], 'JOIN_OR_ADMISSION_FAILED');
  assert.equal(result.exceptions.length, 1); assert.equal(result.completeness, 'PARTIAL');
}));
