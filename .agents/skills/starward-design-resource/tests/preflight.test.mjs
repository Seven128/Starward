import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {preflight} from '../scripts/preflight.mjs';
import {contained,secretIssues} from '../scripts/resource-utils.mjs';
import {fixture,json} from './test-support.mjs';

test('ordinary task-local fixture labels do not look like API keys',()=>{
  assert.deepEqual(secretIssues('task-local-non-live-fixture'),[]);
  assert.equal(secretIssues('sk-'+'a'.repeat(30)).length,1);
});

test('records unknown model/usage without inventing a real probe',async t=>{
  const f=await fixture(t), result=await preflight(f.dir);
  assert.equal(result.ok,true); assert.equal(result.warnings.length,2); assert.equal(result.run.usage.inputTokens,null);
});
test('missing input and modified source fail',async t=>{
  const f=await fixture(t); await fs.writeFile(path.join(f.repo,'owner.ts'),'changed');
  assert.match((await preflight(f.dir)).errors.join(),/hash mismatch/);
  await fs.unlink(path.join(f.dir,'run.json')); assert.equal((await preflight(f.dir)).ok,false);
});
test('path traversal, absolute paths and symlink escape fail',async t=>{
  const f=await fixture(t);
  for (const p of ['../owner.ts','C:/private/file','/tmp/file']) await assert.rejects(contained(f.dir,p));
  await fs.symlink(f.repo,path.join(f.dir,'outside'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(contained(f.dir,'outside/owner.ts'),/symlink/);
  await assert.rejects(contained(f.dir,'outside/new.json',{mustExist:false}),/symlink/);
});
test('unknown usage requires explanation and credential reports hide values',async t=>{
  const f=await fixture(t); f.run.usage.reason=''; f.run.access_token='sensitive-fixture'; await json(path.join(f.dir,'run.json'),f.run);
  const result=await preflight(f.dir); assert.equal(result.ok,false); assert.match(result.errors.join(),/unknown usage/); assert.doesNotMatch(result.errors.join(),/sensitive-fixture/);
  assert.ok(secretIssues({note:'Bearer '+ 'x'.repeat(30)}).length);
});
test('font files cannot enter delivery',async t=>{
  const f=await fixture(t); await fs.writeFile(path.join(f.dir,'font.ttf'),'fixture');
  assert.match((await preflight(f.dir)).errors.join(),/forbidden font/);
});
