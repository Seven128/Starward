import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {assembleDriveArchive, backendDataEnvironment, child, importBackendData, lockPath,
  prepareBackendData, verifyBackendData, verifyRebuildData} from './backend-data.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => Buffer.from(JSON.stringify(value));
const pin = (name, bytes) => ({path: name, bytes: bytes.length, sha256: hash(bytes)});
const temps = [];
test.after(() => {
  for (const directory of temps) {
    const relative = path.relative(os.tmpdir(), directory);
    assert(!path.isAbsolute(relative) && !relative.startsWith('..') && /^starward-(data-test|rebuild-test|external-runtime)-/u.test(relative));
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
function fixture() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'starward-data-test-')); temps.push(cwd);
  const relative = 'data-pipelines/runtime-data/releases/test-v1', directory = path.join(cwd, relative);
  const datasetVersion = 'test-nightlight-v1';
  const image = 'nightlight-v2-test.png', terrainImage = 'terrain-test.png';
  const members = new Map([
    [`nightlight/${datasetVersion}/${image}`, Buffer.from('public-image')],
    [`nightlight/${datasetVersion}/${image}.json`, json({source: 'public-provider'})],
    [`nightlight/${datasetVersion}/${image}.numbers.tif`, Buffer.from('original-numeric-values')],
    [`nightlight/${datasetVersion}/inventory.json`, json({releaseState: 'SEALED', datasetVersion,
      publicationVersion: 'nightlight:test', assets: [{file: image}]})],
    [`terrain/${terrainImage}`, Buffer.from('public-terrain')],
    [`terrain/${terrainImage}.json`, json({source: 'public-provider'})],
    ['terrain/inventory.json', json({publicationVersion: 'terrain:test', assets: [{file: terrainImage}]})],
  ]);
  for (const [name, bytes] of members) { fs.mkdirSync(path.dirname(path.join(directory, name)), {recursive: true}); fs.writeFileSync(path.join(directory, name), bytes); }
  const index = json({schemaVersion: 'starward-public-runtime-files-v1', files: [...members].map(([name, bytes]) => pin(name, bytes))});
  fs.writeFileSync(path.join(directory, 'FILES.json'), index);
  const archive = Buffer.from('whole-archive-original-bytes');
  const pieces = [archive.subarray(0, 12), archive.subarray(12)];
  const lock = {schemaVersion: 'starward-backend-data-lock-v1', runtime: {directory: relative, index: pin('FILES.json', index),
    nightLight: {datasetVersion, publicationVersion: 'nightlight:test', assetCount: 1,
      inventorySha256: hash(members.get(`nightlight/${datasetVersion}/inventory.json`))},
    terrain: {publicationVersion: 'terrain:test', inventorySha256: hash(members.get('terrain/inventory.json'))},
    transports: [{provider: 'GOOGLE_DRIVE', archive: {...pin('runtime.zip', archive), parts: pieces.map((bytes, i) => pin(`part${i}`, bytes))}}]},
    rebuild: {datasetVersion, files: [pin('raw-input.tif', Buffer.from('raw-source'))]}};
  fs.writeFileSync(path.join(cwd, lockPath), json(lock));
  const source = path.join(cwd, 'original'); fs.cpSync(directory, source, {recursive: true});
  const downloads = path.join(cwd, 'downloads'); fs.mkdirSync(downloads);
  pieces.forEach((bytes, i) => fs.writeFileSync(path.join(downloads, `part${i}`), bytes));
  return {cwd, directory, source, downloads, archive, lock, members};
}

test('warm public files verify offline; changing an inventory binding or configured version fails', () => {
  const {cwd, lock} = fixture();
  assert.equal(prepareBackendData(cwd).networkRequested, false); // No Git remote exists.
  assert.equal(verifyBackendData(cwd).files, 7);
  assert.throws(() => backendDataEnvironment(cwd, {MINIAPP_DARK_SKY_DATASET_VERSION: 'old-release'}), /configuration_differs/u);
  lock.runtime.nightLight.inventorySha256 = '0'.repeat(64);
  fs.writeFileSync(path.join(cwd, lockPath), json(lock));
  assert.throws(() => verifyBackendData(cwd), /publication_binding_mismatch/u);
});

test('a verified mirror restores missing files and LFS pointers, but never overwrites changed bytes', () => {
  const {cwd, directory, source, members} = fixture();
  const names = [...members.keys()];
  fs.unlinkSync(path.join(directory, names[0]));
  fs.writeFileSync(path.join(directory, names[1]), 'version https://git-lfs.github.com/spec/v1\noid sha256:' + 'a'.repeat(64));
  assert.equal(importBackendData(source, cwd).installed, 2);
  assert.equal(importBackendData(source, cwd).installed, 0);
  fs.unlinkSync(path.join(directory, names[0]));
  fs.writeFileSync(path.join(directory, names[1]), 'uncommitted modification');
  assert.throws(() => importBackendData(source, cwd), /hash_mismatch/u);
  assert.equal(fs.existsSync(path.join(directory, names[0])), false, 'Preflight must finish before any copy');
});

test('corrupt mirror bytes and escaping or linked paths are rejected before materialization', () => {
  const {cwd, directory, source, members} = fixture();
  const name = [...members.keys()][0]; fs.unlinkSync(path.join(directory, name));
  fs.writeFileSync(path.join(source, name), 'different data');
  assert.throws(() => importBackendData(source, cwd), /hash_mismatch/u);
  assert.equal(fs.existsSync(path.join(directory, name)), false);
  for (const name of ['../private.key', 'a/../../private.key', 'C:/private.key', 'a\\private.key'])
    assert.throws(() => child(directory, name), /path_invalid/u);
  const link = path.join(directory, 'linked');
  fs.symlinkSync(source, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => child(directory, 'linked/data.png'), /symlink_rejected/u);
});

test('multipart archives require all original bytes and reuse only an identical output', async () => {
  const {cwd, downloads, archive} = fixture();
  const target = path.join(cwd, 'assembled.zip');
  assert.equal((await assembleDriveArchive(downloads, target, cwd)).reused, false);
  assert.deepEqual(fs.readFileSync(target), archive);
  assert.equal((await assembleDriveArchive(downloads, target, cwd)).reused, true);
  fs.writeFileSync(path.join(downloads, 'part1'), 'corrupt');
  const second = path.join(cwd, 'other.zip');
  await assert.rejects(assembleDriveArchive(downloads, second, cwd), /hash_mismatch/u);
  assert.equal(fs.existsSync(second), false);
});

test('rebuild source verification is separate, streamed and hash-bound outside the checkout', async () => {
  const {cwd} = fixture();
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'starward-rebuild-test-')); temps.push(cache);
  await assert.rejects(verifyRebuildData(cache, cwd), /missing/u);
  fs.writeFileSync(path.join(cache, 'raw-input.tif'), 'raw-source');
  assert.equal((await verifyRebuildData(cache, cwd)).files, 1);
  fs.writeFileSync(path.join(cache, 'raw-input.tif'), 'bad-source');
  await assert.rejects(verifyRebuildData(cache, cwd), /hash_mismatch/u);
  await assert.rejects(verifyRebuildData(path.join(cwd, 'private'), cwd), /outside_checkout/u);
});

test('a Drive-only runtime materializes outside Git and feeds the same versioned consumers', () => {
  const {cwd, source, lock} = fixture();
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'starward-external-runtime-')); temps.push(cache);
  lock.runtime.materialization = 'EXTERNAL_CACHE';
  fs.writeFileSync(path.join(cwd, lockPath), json(lock));
  assert.throws(() => verifyBackendData(cwd, {}), /STARWARD_DATA_HOME_required/u);
  const env = {STARWARD_DATA_HOME: cache};
  assert.throws(() => prepareBackendData(cwd, env), /drive_download_required/u);
  assert.equal(importBackendData(source, cwd, env).installed, 7);
  assert.equal(prepareBackendData(cwd, env).networkRequested, false);
  assert.equal(backendDataEnvironment(cwd, env).MINIAPP_TERRAIN_PUBLICATION_ROOT, path.join(cache, 'runtime/test-v1/terrain'));
});
