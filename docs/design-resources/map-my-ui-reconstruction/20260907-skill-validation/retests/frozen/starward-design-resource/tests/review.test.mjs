import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {buildReview} from '../scripts/build-review.mjs';
import {fixture} from './test-support.mjs';

test('anonymous IDs stay stable and public site contains no group or metadata labels',async t=>{
  const f=await fixture(t), first=await buildReview(f.dir), key=await fs.readFile(path.join(f.dir,'review-key.json'),'utf8');
  const html=await fs.readFile(path.join(first.directory,'index.html'),'utf8');
  assert.doesNotMatch(html,/group-B-private|fixture-file|unknown|unit-fixture/);
  assert.match(html,/初稿/); assert.match(html,/最终/); assert.match(html,/width="390"/);
  assert.equal((await fs.readdir(first.directory)).length,5);
  await buildReview(f.dir); assert.equal(await fs.readFile(path.join(f.dir,'review-key.json'),'utf8'),key);
});
test('comparison refuses missing paired page and missing round zero',async t=>{
  const f=await fixture(t); f.resources.boards.pop(); await f.save(); await assert.rejects(buildReview(f.dir),/missing paired/);
});
test('a product failure stays in anonymous comparison rather than hiding the weak candidate',async t=>{
  const f=await fixture(t);await f.updateTree('map',tree=>delete tree.root.children[0].controlKey);
  const result=await buildReview(f.dir);assert.equal(result.candidateCount,1);assert.equal(result.productChecksPassed,false);
  assert.match(result.unresolved.join(),/missing readback control/);
});
