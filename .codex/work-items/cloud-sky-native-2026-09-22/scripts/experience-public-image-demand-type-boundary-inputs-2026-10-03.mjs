import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const out='output/public-image-demand-type-boundary-fix-1003-r1';
const prior=JSON.parse(await fs.readFile(path.join(ROOT,'output/public-image-demand-type-boundary-probe-1003-r1/inputs-before.json'),'utf8'));
const files=prior.map(x=>path.resolve(ROOT,x.path));
for(const dir of ['workers/miniapp-api','apps/wechat-miniapp']){
 const require=createRequire(path.join(ROOT,dir,'package.json'));
 for(const name of ['typescript/lib/tsc.js','typescript/lib/typescript.js','typescript/package.json'])files.push(require.resolve(name));
 files.push(path.join(ROOT,dir,'tsconfig.json'),path.join(ROOT,dir,'package.json'));
}
for(const p of ['apps/wechat-miniapp/src/features/sky/deep-sky-image-request.test.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.test.ts',
 'output/public-image-demand-type-boundary-probe-1003-r1/result.json','output/public-image-demand-type-boundary-fix-1003-r1/adoption.json',
 '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-public-image-demand-type-boundary-independent-review-2026-10-03.md',
 'output/public-image-demand-type-boundary-independent-1003-r1/result.json'])files.push(path.join(ROOT,p));
files.push(process.execPath,fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const rows=await Promise.all([...new Set(files)].sort().map(async p=>{const b=await fs.readFile(p);return {path:path.relative(ROOT,p).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};}));
await fs.writeFile(path.join(ROOT,out,'inputs-before.json'),JSON.stringify(rows,null,2),{flag:'wx'});
await fs.writeFile(path.join(ROOT,out,'toolchain.json'),JSON.stringify({nodeVersion:process.version,executable:process.execPath,scope:'Original diagnostic compiler graph plus changed files, explicit test/type driver inputs and independent review; not an inventory of the entire App compilation or OS/driver'},null,2),{flag:'wx'});
console.log(JSON.stringify({out,inputs:rows.length,node:process.version,scope:'Bounded pre-check capture'}));
