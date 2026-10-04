/** Saved raw pins and an actual failing-before/working-after service boundary. */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { assertPreparedOpticalManifest, assertPreparedRenderedOpticalManifest,
  preparedOpticalPublicationHash } from '@starward/miniapp-contracts';
import { PreparedOpticalImageryService } from '../../../../workers/miniapp-api/src/prepared-optical-imagery.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const out = path.join(root, 'output/prepared-display-version-readback-1004-r1');
await fs.mkdir(out);
const sha = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');
const bind = async (rel: string) => { const raw = await fs.readFile(path.join(root, rel));
  return { path: rel, bytes: raw.length, sha256: sha(raw) }; };
const save = (name: string, value: unknown) => fs.writeFile(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
await fs.copyFile(fileURLToPath(import.meta.url), path.join(out, 'executed-script.mts'));
try {
  const existing = [
    ['output/prepared-optical-publication-1003-r4/publication/manifest.json', '23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1'],
    ['output/hubble-m82-prepared-publication-1004-r2/manifest.json', '3823d73fbc836710141e4052c9950de148a7bebb608b943ffb601111e383a7ca'],
    ['output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82/manifest.json', '1c99fb46449a4721131d7d7e45a4856d7c77499bd504c175b5ac9e3c0ecbc839'],
    ['output/noirlab-prepared-wide-publication-1004-r1/noao1309a/manifest.json', '79221ca85e79d0ae7e28c71b5ef4b281125284b4325e6ad2fc3862890af409c6'],
  ];
  const unchanged = [];
  for (const [rel, pin] of existing) {
    const identity = await bind(rel); assert.equal(identity.sha256, pin);
    const value = JSON.parse(await fs.readFile(path.join(root, rel), 'utf8'));
    assertPreparedOpticalManifest(value, value.objectRef, value.publicationHash);
    assert.equal(preparedOpticalPublicationHash(value), value.publicationHash);
    unchanged.push({ ...identity, publicationHash: value.publicationHash, unit: value.master.unit });
  }
  const currentPath = 'output/prepared-large-display-publication-1004-r1/manifest.json';
  const current = JSON.parse(await fs.readFile(path.join(root, currentPath), 'utf8'));
  const pin = current.publicationHash;
  assertPreparedRenderedOpticalManifest(current, 'M:82', pin);
  assert.throws(() => assertPreparedOpticalManifest(current, 'M:82', pin), /prepared_optical_publication_invalid/);
  const owner = 'workers/miniapp-api/src/prepared-optical-imagery.ts';
  const archived = '.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-display-identity-before-2026-10-04/' + owner;
  const original = await fs.readFile(path.join(root, archived), 'utf8');
  const result = await build({ stdin: { contents: original, resolveDir: path.dirname(path.join(root, owner)),
    sourcefile: 'before-prepared-display-service.ts', loader: 'ts' }, platform: 'node', format: 'esm',
    bundle: true, packages: 'external', write: false, tsconfig: path.join(root, 'workers/miniapp-api/tsconfig.json') });
  const beforeFile = path.join(out, 'before-service.mjs');
  await fs.writeFile(beforeFile, result.outputFiles[0]!.contents, { flag: 'wx' });
  const Before = (await import(pathToFileURL(beforeFile).href)).PreparedOpticalImageryService;
  const descriptor = { reference: 'M:82', expectedHash: pin, manifestUrl: pathToFileURL(path.join(root, currentPath)) };
  assert.throws(() => new Before([descriptor]).manifest(pin), /prepared_optical_publication_invalid/);
  const after = new PreparedOpticalImageryService([descriptor]);
  const admitted = after.manifest(pin); assertPreparedRenderedOpticalManifest(admitted, 'M:82', pin);
  const fields = [];
  for await (const field of after.publishedAssets()) {
    assert.equal(sha(field.bytes), field.descriptor.sha256);
    assert.equal(field.bytes.length, field.descriptor.bytes);
    fields.push({ file: field.descriptor.file, bytes: field.bytes.length, sha256: sha(field.bytes) });
  }
  assert.equal(fields.length, 3);
  assert.equal(fields.reduce((n, row) => n + row.bytes, 0), 1208058);
  const source = after.source('M:82', pin);
  assert.ok(source.attribution!.statements.includes(current.source.credit));
  assert.ok(source.attribution!.statements.some(text => text.includes(current.processing.geometryExclusion.credit)));
  const report = { status: 'REAL_DISPLAY_SERVICE_REJECTED_BEFORE_ADMITTED_AFTER', unchangedRawV1: unchanged,
    actualDisplay: await bind(currentPath), hash: pin, fields, source,
    beforeSource: await bind(archived), afterSource: await bind(owner),
    scope: 'Actual current TypeScript admission/service and real published PNG bytes. Archived original service rejects this version. No source processing, new picture rendering, static deployment, quality/native adoption or independent review.' };
  await save('result.json', report); console.log(JSON.stringify({ status: report.status, preservedRawPins: unchanged.length, pngBytes: 1208058 }));
} catch (error) {
  await save('failed.json', { error: String(error) }); throw error;
}
