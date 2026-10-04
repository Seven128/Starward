// Re-run the same regression against the exact pre-fix page without restoring
// or editing the shared checkout. Only that page's source read is substituted.
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');
const { syncBuiltinESMExports } = require('node:module');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const task = path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const page = path.resolve('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx');
const before = path.join(task, 'evidence/experience-image-intent-before-2026-09-30.tsx');
const read = fs.readFileSync;
assert.equal(createHash('sha256').update(read(before)).digest('hex'),
  'c5e9f38fed669ebb79ebb0a710849488372a8ee563a2c6b741c52b248eab6e24');
fs.readFileSync = (input, options) => {
  const filename = input instanceof URL ? fileURLToPath(input) : typeof input === 'string' ? path.resolve(input) : '';
  return read(filename === page ? before : input, options);
};
syncBuiltinESMExports();
import(pathToFileURL(path.resolve('apps/wechat-miniapp/src/features/sky/sky-native-image-owner.test.ts')).href)
  .finally(() => { fs.readFileSync = read; syncBuiltinESMExports(); });
