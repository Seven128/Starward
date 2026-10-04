import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const task = '.codex/work-items/cloud-sky-native-2026-09-22/';
const sky = 'apps/wechat-miniapp/src/features/sky/';
const directory = path.join(root, 'output/complete-resource-protocol-independent-1003-r4');
await fs.mkdir(directory);
const sha = value => createHash('sha256').update(value).digest('hex');
const paths = [
  task + 'scripts/experience-complete-resource-journey-2026-10-02.mts',
  task + 'scripts/experience-complete-resource-browser-2026-10-02.ts',
  task + 'evidence/experience-complete-resource-execution-protocol-2026-10-03.md',
  task + 'scripts/readback-complete-resource-protocol-independent-2026-10-03.mjs',
  task + 'scripts/launch-complete-resource-2026-10-03.ps1',
  sky + 'spot-sky-page.tsx', sky + 'sky-canvas-lifecycle.ts', sky + 'sky-canvas-view.ts',
  sky + 'sky-browsing-camera.ts', sky + 'sky-zoom.ts', sky + 'sky-scene-render.ts',
  sky + 'sky-gpu-renderer.ts', sky + 'sky-gpu-textures.ts', sky + 'sky-stellar-tile-loader.ts',
  sky + 'use-sky-stellar-supplement.ts', sky + 'sky-stellar-supplement-scene.ts',
  sky + 'sky-stellar-tile-selection.ts', sky + 'use-sky-artwork.ts', sky + 'sky-artwork-loader.ts',
  sky + 'sky-artwork-request.ts', sky + 'use-sky-sdss-optical.ts',
  'apps/wechat-miniapp/src/services/sky-public-image-cache.ts',
  'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',
  sky + 'deep-sky-image-request.ts', 'apps/wechat-miniapp/src/services/sao-catalog-client.ts',
  'apps/wechat-miniapp/src/services/api-client.ts', 'workers/miniapp-api/src/sao-publication.ts',
  'workers/miniapp-api/src/sdss-optical-imagery.ts', 'workers/miniapp-api/src/deep-sky-imagery.ts',
  'apps/wechat-miniapp/tsconfig.json', 'apps/wechat-miniapp/package.json', 'tools/run-node.cjs',
  'output/complete-resource-scope-preparation-1002-r2/result.json',
  'output/complete-resource-protocol-independent-1003-r1/captured-draft.json',
  'output/complete-resource-protocol-independent-1003-r2/captured-draft.json'
];
const before = [], texts = new Map();
for (const file of paths) {
  const bytes = await fs.readFile(path.join(root, file));
  texts.set(file, bytes.toString('utf8'));
  const copy = 'sources/' + file;
  await fs.mkdir(path.dirname(path.join(directory, copy)), { recursive: true });
  await fs.writeFile(path.join(directory, copy), bytes, { flag: 'wx' });
  before.push({ path: file, bytes: bytes.length, sha256: sha(bytes), copy });
}
assert.equal(before[0].sha256, '1178c9146381a9e2e646ca7e6211607259859efd48969a49e4231c41f07e137c');
assert.equal(before[1].sha256, '432ddb742b1475567a09edc6759bbb21b3c05f24e23c6aeaad3d4ad7c82a3e2e');
const host = texts.get(paths[0]), browser = texts.get(paths[1]);
const priorHost = host.replace(/^ '\.codex\/work-items\/cloud-sky-native-2026-09-22\/scripts\/launch-complete-resource-2026-10-03\.ps1',\r?\n/m, '')
  .replace(/^  assert\.deepEqual\(row\.ready\.hooks\.filter\(\(h:any\)=>h\.active&&h\.wanted\.length&&h\.failed\)\.map\(\(h:any\)=>h\.name\),\[\],'normal wanted image owner failed'\);assert\.deepEqual\(row\.gpuFailures,\[\],'actual GPU image failure'\);\r?\n/m, '');
assert.equal(sha(priorHost), '44bc86de20d900d62c086ed7de1bee47b79be0c9bbe97192930202d4e026a3dc');
await fs.writeFile(path.join(directory, 'reversed-exact-44bc-host.mts.txt'), priorHost, { flag: 'wx' });
assert(host.includes("${getVariable('currentViewBasis')}"));
assert(host.includes("${getVariable('presentedFov')}"));
assert(host.includes("${getVariable('presentedCenter')}"));
assert(host.includes("if(typeof update==='function'){w.publishCount++"));
assert(host.includes('zoomRef={get current(){return w.paintInput.requestedFov;}}'));
assert(browser.includes('basis:queuedBasis,fov:resolved.verticalFovDeg'));
assert(!browser.includes('w.browsingCamera.update('));
assert(host.includes('browsingDrawRef={current:()=>w.actualCurrentDraw()}'));
assert(host.includes('w.cameraClock=Math.max(w.cameraClock,task.due);task.fn()'));
assert(browser.includes("submit('actual-browsing-return-'+returnSubmits,true)"));
assert(browser.includes('if(++returnSubmits>32)'));
assert(host.includes("assert(expected,'dynamic SAO must be actual index tile')"));
assert(host.includes('actual requested local tile bound before browser delivery; not initial run source inventory'));
assert(host.includes("assert.deepEqual(afterTools,toolBindings,'actual tool identities frozen during execution')"));
const after = [];
for (const row of before) {
  const bytes = await fs.readFile(path.join(root, row.path));
  after.push({ path: row.path, bytes: bytes.length, sha256: sha(bytes), copy: row.copy });
}
assert.deepEqual(after, before);
const result = {
  status: 'STATIC_PROTOCOL_REVIEW_NO_REMAINING_EXECUTION_BLOCKER',
  finalHostDelta: { finalSha256: before[0].sha256, reversedPriorSha256: sha(priorHost),
    changes: ['Bind actual launcher as an input', 'Reject actual normal active/wanted image failures and GPU image failures after artifacts are saved'],
    scope: 'Exact reversal matches previously reviewed 44bc host. Added assertions do not change browser execution or payload. Current launcher source is separately copied; this is not execution of it.' },
  executionAuthorizedByThisReview: false, beforeAfterEqual: true,
  scope: 'Read-only source/protocol review and exact copies. No build, tests, browser, GPU, service, native or network execution. Explicit input list is not a complete import or vendor graph.',
  fixesObserved: [
    'Actual page three declarations select previous accepted camera for Hooks; requested FOV remains separate for real paint.',
    'Actual function updater marker and exact staged/published snapshot distinguish publication from lifecycle notification.',
    'Actual paint is the sole camera update. Requested target survives return. Actual 16 ms timer invokes current real draw closure with bounded <=32 submissions, each independently captured.',
    'Additional SAO source uses the same admitted local publication/index and actual producer; raw and envelope are bound before delivery and rechecked after, explicitly outside initial inventory.'
  ],
  remainingLimits: [
    'Controlled React/query/Taro/MapFS/clock/transport are measurement adapters. Production SDK/API-response cache/TanStack/native scheduling is not exercised.',
    'No actual new output exists in this review; future PNG/RGBA, ledgers, source/input/tool join and cleanup require independent actual readback.',
    'Encoded, JSON, numeric/decoded models and GL storage are separate layers. Attachments are not allocations; driver/GC/JS heap/native total remain unknown.',
    'Five legal poses do not cover every normal body/source/failure. Ordinary science and LOCAL remain disabled; no image quality, local readability, 12 Mbps or 200 DAU capacity acceptance.',
    'Historical draft captures and old runtime/GPU observations remain bound to their executed sources, without retrospective upgrade.'
  ], before, after
};
await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, directory), bindings: before.length, resultSha256: sha(await fs.readFile(path.join(directory, 'result.json'))) }));
