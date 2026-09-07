import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const mediaRoot = fileURLToPath(new URL('../../apps/wechat-miniapp/src/assets/media/', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(mediaRoot, 'extraction-manifest.json'), 'utf8'));
assert.equal(manifest.media.length, 3);
for (const item of manifest.media) {
  assert.equal(path.basename(item.file), item.file, 'media filename must stay in its asset directory');
  const bytes = await readFile(path.join(mediaRoot, item.file));
  assert.equal(bytes.length, item.bytes, item.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.file);
  assert.ok(bytes[0] === 0xff && bytes[1] === 0xd8, `${item.file}: JPEG required`);
}
console.log(JSON.stringify({ status: 'passed', assets: manifest.media.length, source: 'checked-in media files', limitation: 'Integrity only; provenance is retained in the catalog and asset manifest.' }));
