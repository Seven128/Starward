import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {checkResources} from '../scripts/check-resources.mjs';
import {decodePng,hash} from '../scripts/resource-utils.mjs';
import {fixture} from './test-support.mjs';

test('coherent synthetic package validates mechanics only',async t=>{const f=await fixture(t); assert.equal((await checkResources(f.dir)).ok,true);});
for(const [name,mutate,pattern] of [
  ['duplicate node mapping',r=>r.boards.push({...r.boards[0],id:'other'}),/duplicate node mapping/],
  ['wrong logical dimensions',r=>r.boards[0].width=320,/dimensions mismatch/],
  ['stale export',r=>r.boards[0].revision='r1',/stale screenshot/],
  ['unsupported mode',r=>r.boards[0].mode='red',/invalid mode/],
  ['missing asset',r=>r.boards[0].assetIds=['missing'],/missing referenced asset/],
  ['path escape',r=>r.boards[0].screenshot.path='../owner.ts',/escapes root/],
  ['no boards',r=>r.boards=[],/no exported boards/],
]) test(name,async t=>{const f=await fixture(t); mutate(f.resources); await f.save(); assert.match((await checkResources(f.dir)).errors.join(),pattern);});
test('requirements are checked from visible readback even if manifest omits controls',async t=>{
  const f=await fixture(t); f.resources.boards[0].controls=[];
  await f.updateTree('map',tree=>tree.root.children[0].visible=false);
  assert.match((await checkResources(f.dir)).errors.join(),/missing readback control|no editable visible text/);
});
test('unresolved fonts and fabricated snapshot origins fail',async t=>{
  const f=await fixture(t); await f.updateTree('map',tree=>delete tree.root.children[0].children[0].fontName);
  assert.match((await checkResources(f.dir)).errors.join(),/missing resolved font/);
  await f.updateTree('my',tree=>tree.origin='author-manifest'); assert.match((await checkResources(f.dir)).errors.join(),/provenance/);
});
test('PNG corruption is rejected even after manifest hash refresh',async t=>{
  const f=await fixture(t), b=f.resources.boards[0], file=path.join(f.dir,b.screenshot.path), bytes=await fs.readFile(file);
  bytes[50]^=255; await fs.writeFile(file,bytes); b.screenshot.sha256=hash(bytes); await f.save();
  assert.match((await checkResources(f.dir)).errors.join(),/CRC|PNG/); assert.throws(()=>decodePng(Buffer.from('fake image')));
});
test('assets require actual bytes and attribution',async t=>{
  const f=await fixture(t); f.resources.assets.push({id:'asset',path:'fixture-map.png',sha256:f.resources.boards[0].screenshot.sha256}); await f.save();
  assert.match((await checkResources(f.dir)).errors.join(),/source\/license/);
});
test('one-pixel clipping container cannot certify editable content or hit targets',async t=>{
  const f=await fixture(t);await f.updateTree('map',tree=>{const box=tree.root.children[0];box.height=1;box.clipsContent=true;});
  assert.match((await checkResources(f.dir)).errors.join(),/clipped|44px|no editable visible text/);
});
