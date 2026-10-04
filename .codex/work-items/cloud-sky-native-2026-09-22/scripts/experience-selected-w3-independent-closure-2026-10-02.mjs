import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {skyStaticDeliveryFragment} from '../../../../tools/deployment/sky-static-bundle.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=p=>path.join(root,p),sha=v=>createHash('sha256').update(v).digest('hex');
const bind=p=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert.ok(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
const save=(p,v)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const note='.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-selected-w3-client-header-independent-review-2026-10-02.md';
const receipts=['output/selected-w3-consumer-before-independent-1002-r1/result.json','output/selected-w3-static-header-independent-1002-r3/failure.json',
 'output/selected-w3-static-header-independent-1002-r4/failure.json','output/selected-w3-static-header-independent-1002-r5/result.json',
 'output/selected-w3-server-independent-1002-r1/result.json','output/selected-w3-metadata-gap-independent-1002-r5/result.json',
 'output/selected-w3-demand-handoff-independent-1002-r1/result.json','output/selected-w3-client-independent-1002-r4/result.json',
 'output/selected-w3-export-readback-independent-1002-r1/result.json'];
const allFiles=p=>fs.readdirSync(file(p),{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>path.relative(root,path.join(e.parentPath,e.name)).replaceAll('\\','/'));
const names=new Set([note,'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-selected-w3-independent-closure-2026-10-02.mjs','tools/deployment/sky-static-bundle.mjs']);
for(const receipt of receipts){for(const p of allFiles(path.posix.dirname(receipt)))names.add(p);const value=JSON.parse(fs.readFileSync(file(receipt),'utf8'));for(const item of value.sources??[])names.add(item.path)}
for(const p of allFiles('workers/miniapp-api/assets/deep-sky'))names.add(p);
const baseline=JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of baseline){assert.equal(bind(b.path).sha256,b.sha256);names.add(b.path)}
const inputs=[...names].sort().map(bind),body=fs.readFileSync(file(note),'utf8'),links=[];
for(const match of body.matchAll(/\]\(([^)]+)\)/g)){const target=match[1];if(target.startsWith('http'))continue;const resolved=path.resolve(path.dirname(file(note)),target);assert.ok(fs.existsSync(resolved),target);links.push(target)}
for(const receipt of receipts){const actual=bind(receipt);assert.ok(body.includes(actual.sha256),receipt+' missing explicit hash')}
const proof=JSON.parse(fs.readFileSync(file('output/selected-w3-client-independent-1002-r4/result.json'),'utf8'));for(const source of proof.sources)assert.equal(bind(source.path).sha256,source.sha256);
const r5='output/selected-w3-static-header-independent-1002-r5/container/publication',index=JSON.parse(fs.readFileSync(file(r5+'/index.json'),'utf8'));
assert.deepEqual(Buffer.from(skyStaticDeliveryFragment(index.records)),fs.readFileSync(file(r5+'/delivery.caddy')),'current stricter route admission must not change admitted r5 header fragment');
save('result.json',{status:'PASS',note:bind(note),receipts:receipts.map(bind),currentClientSourceBound:true,currentRestrictedBundleSameR5Fragment:true,links:links.length,inputs:inputs.length,
 scope:'Readonly final evidence/source/link identity closure; no behavior rerun, native/device/quality/capacity acceptance or Goal completion.'});
const after=inputs.map(b=>bind(b.path));save('binding.json',{script:bind(out+'/executed-script.mjs.txt'),inputsBefore:inputs,inputsAfter:after,unchanged:JSON.stringify(after)===JSON.stringify(inputs)});assert.deepEqual(after,inputs);
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),note:bind(note),inputs:inputs.length}));
