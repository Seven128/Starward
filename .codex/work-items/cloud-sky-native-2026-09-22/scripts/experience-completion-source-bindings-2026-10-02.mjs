import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const output=process.argv[2]??'output/science-optical-completion-consumer-1002-r2';
assert.match(output,/^output\/science-optical-completion-consumer-1002-r[2-9][0-9]*$/);
const digest=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const files=[
  'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-completion.ts',
  'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-completion.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-scene-render.ts',
  'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',
  'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts',
  'apps/wechat-miniapp/src/features/sky/sky-optical-page-acceptance.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-optical-page-test-support.ts',
  'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-page.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-scene.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-target-page-labels.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-dome-integration.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame.ts',
  'apps/wechat-miniapp/src/features/sky/sky-canvas-lifecycle.ts',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',
  'output/sdss-science-optical-writer-1002-r1/publication/manifest.json',
  task+'tmp/optical-completion-page-before-2026-10-02.tsx',
  task+'tmp/optical-completion-scene-before-2026-10-02.ts',
];
const bindings=[];
for(const file of files)bindings.push({file,sha256:await digest(file),bytes:(await fs.stat(file)).size});
assert.equal(bindings[0].sha256,'bf989376b0907cd472d51320a0953a060fa4e432318bdd74f802034ba0b818a4');
assert.equal(bindings[1].sha256,'ba26e404d69a92ef53694e697c675a1e20743d1177007570831483b092ca01bc');
assert.equal(bindings.at(-2).sha256,'f2005524cac532ab8af8d1fde65815ec7cfcf243abe305ae85b27b470e0831f3');
assert.equal(bindings.at(-1).sha256,'9d4343b3f3fae121ee4fc2b244112ad8cf7d886c949ffbf869746535f9a1e4f7');
const preserved=[];
for(const entry of JSON.parse(await fs.readFile(task+'tmp/resume-preserved-hashes-2026-10-01.json','utf8'))){
  const actual=await digest(entry.path);assert.equal(actual,entry.sha256,entry.path);preserved.push({...entry,actual,unchanged:true});
}
await fs.mkdir(output,{recursive:true});
const file=output+'/bindings.json';
await fs.writeFile(file,JSON.stringify({scope:'Current source, admitted metadata and before snapshots; no replay/certification of historical GPU results. Historical r1 check receipts keep their own earlier source bindings.',bindings,preserved},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,sha256:await digest(file),bindings:bindings.length,preserved:preserved.length}));
