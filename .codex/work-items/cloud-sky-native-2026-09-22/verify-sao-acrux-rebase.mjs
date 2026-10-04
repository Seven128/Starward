import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const [oldDirectory, newDirectory, oldSourcePath, newSourcePath] = process.argv.slice(2);
if (![oldDirectory, newDirectory, oldSourcePath, newSourcePath].every(Boolean))
  throw Error('usage: verify-sao-acrux-rebase.mjs <old-spatial-dir> <new-spatial-dir> <old-source> <new-source>');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
const oldSource = await parse(oldSourcePath), newSource = await parse(newSourcePath);
assert.deepEqual(newSource.rows, oldSource.rows);
assert.equal(newSource.rows.length, 246280);
assert.equal(newSource.catalogVersion, 'sao-visual-supplement.v2');
const oldIndex = await parse(path.join(oldDirectory, 'index.json'));
const newIndex = await parse(path.join(newDirectory, 'index.json'));
assert.equal(oldIndex.tiles.length, 826);
assert.equal(newIndex.tiles.length, oldIndex.tiles.length);
assert.equal(newIndex.baseCatalogVersion, newSource.baseCatalogVersion);
assert.equal(newIndex.baseAssetSha256, newSource.baseAssetSha256);
assert.equal(newIndex.catalogHash, sha(await readFile(newSourcePath)));
let rows = 0, bytes = 0;
for (let i = 0; i < oldIndex.tiles.length; i++) {
  const oldRef = oldIndex.tiles[i], newRef = newIndex.tiles[i];
  assert.equal(newRef.id, oldRef.id);
  assert.equal(newRef.rowCount, oldRef.rowCount);
  const [oldBytes, newBytes] = await Promise.all([
    readFile(path.join(oldDirectory, oldRef.file)), readFile(path.join(newDirectory, newRef.file)),
  ]);
  assert.equal(sha(oldBytes), oldRef.sha256);
  assert.equal(sha(newBytes), newRef.sha256);
  const oldTile = JSON.parse(oldBytes), newTile = JSON.parse(newBytes);
  assert.deepEqual(newTile.rows, oldTile.rows);
  assert.equal(newTile.catalogVersion, newSource.catalogVersion);
  assert.equal(newTile.catalogHash, newIndex.catalogHash);
  rows += newTile.rows.length;
  bytes += newBytes.length;
}
assert.equal(rows, 246280);
const publication = await parse(path.join(newDirectory, 'publication.json'));
assert.equal(publication.indexSha256, sha(await readFile(path.join(newDirectory, 'index.json'))));
assert.equal(publication.publicationHash, publication.indexSha256);
console.log(JSON.stringify({ oldCatalogVersion: oldSource.catalogVersion,
  newCatalogVersion: newSource.catalogVersion, rowCount: rows, tileCount: newIndex.tiles.length,
  tileBytes: bytes, sourceSha256: newIndex.catalogHash, publicationHash: publication.publicationHash,
  scientificRowsUnchanged: true }));
