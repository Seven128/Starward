import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { opticalPublicationContentHash, OPTICAL_IMAGE_LEVELS } from '../../../../packages/miniapp-contracts/src/optical-publication-content.ts';
import { assertSdssScienceOpticalManifest, sdssScienceOpticalPublicationHash } from '../../../../packages/miniapp-contracts/src/sdss-science-optical-publication.ts';
import { assertSdssOpticalPublication, sdssOpticalPublicationHash, SDSS_OPTICAL_PUBLICATIONS } from '../../../../packages/miniapp-contracts/src/sdss-optical-publication.ts';
const root=process.cwd();
const output=resolve(root,'output/prepared-optical-independent-1003-r1');
mkdirSync(output,{recursive:false});
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const a=resolve(root,p),b=readFileSync(a);return {path:relative(root,a).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const canonical=(v:any):string=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`:JSON.stringify(v);
const content=(v:any)=>{const {publicationHash,...r}=structuredClone(v);for(const l of OPTICAL_IMAGE_LEVELS)delete r.levels[l].downloadUrl;return r;};
const oldPath='output/sdss-optical-provenance-independent-1002-r1/source-inputs/packages/miniapp-contracts/src/sdss-science-optical-publication.ts';
const v2Path='output/sdss-science-optical-writer-1002-r1/publication/manifest.json';
const paths=[oldPath,v2Path,'packages/miniapp-contracts/src/optical-publication-content.ts','packages/miniapp-contracts/src/sdss-science-optical-publication.ts','packages/miniapp-contracts/src/sdss-optical-publication.ts','.codex/work-items/cloud-sky-native-2026-09-22/scripts/probe-prepared-optical-compatibility-independent-2026-10-03.mts'];
const before=paths.map(bind);
const old=await import(pathToFileURL(resolve(root,oldPath)).href);
const v2=JSON.parse(readFileSync(resolve(root,v2Path),'utf8'));
assertSdssScienceOpticalManifest(v2,'M:51',v2.publicationHash);
old.assertSdssScienceOpticalManifest(v2,'M:51',v2.publicationHash);
assert.equal(sdssScienceOpticalPublicationHash(v2),v2.publicationHash);
assert.equal(old.sdssScienceOpticalPublicationHash(v2),v2.publicationHash);
assert.equal(sha(canonical(content(v2))),v2.publicationHash);
const trials:any[]=[];
for(const [name,change] of [
 ['sourceCredit',(v:any)=>{v.source.credit+=' bound change';}],
 ['recipe',(v:any)=>{v.master.transfer.recipe.stretch=6;v.master.transfer.recipe.requestedParameters.stretch=6;}],
 ['rawFrameHash',(v:any)=>{v.master.sourceFrames[0].sha256='f'.repeat(64);}],
] as const){const v=structuredClone(v2);change(v);const a=old.sdssScienceOpticalPublicationHash(v),b=sdssScienceOpticalPublicationHash(v);assert.equal(a,b);assert.equal(b,sha(canonical(content(v))));assert.notEqual(b,v2.publicationHash);trials.push({name,oldAndCurrentHash:b});}
const legacy:any[]=[];
for(const [ref,offer] of Object.entries(SDSS_OPTICAL_PUBLICATIONS)){
 const p=`workers/miniapp-api/assets/deep-sky/sdss-${ref.replace('M:','m')}/manifest.json`;paths.push(p);
 const v=JSON.parse(readFileSync(resolve(root,p),'utf8'));assertSdssOpticalPublication(v,ref);assert.equal(sdssOpticalPublicationHash(v),offer.publicationHash);
 let bytes=0; const images=[];
 for(const l of OPTICAL_IMAGE_LEVELS){const file=`workers/miniapp-api/assets/deep-sky/sdss-${ref.replace('M:','m')}/${v.levels[l].file}`;paths.push(file);const b=bind(file);assert.equal(b.sha256,v.levels[l].sha256);assert.equal(b.bytes,v.levels[l].bytes);images.push(b);bytes+=b.bytes;}
 legacy.push({reference:ref,hash:offer.publicationHash,manifest:bind(p),images,bytes});
}
const shared:any[]=[];
for(const v of [{b:0,a:[true,null,-1.2,1e-7,1e21]}, {unicode:'星空 / \\ "',nested:{z:2,a:1}}]){assert.equal(opticalPublicationContentHash(v),sha(canonical(v)));shared.push({value:v,hash:sha(canonical(v))});}
assert.throws(()=>opticalPublicationContentHash({bad:Number.NaN}));
assert.throws(()=>opticalPublicationContentHash(new Date()));
const after=before.map(v=>bind(v.path));assert.deepEqual(before,after);
const record={status:'PASS_BOUNDED_OLD_V1_V2_CONTENT_COMPATIBILITY',before,after,v2:{manifest:bind(v2Path),oldOwner:bind(oldPath),hash:v2.publicationHash,independentNodeCryptoExact:true},trials,legacy,shared,files:paths.map(bind),scope:'Actual old v2 manifest accepted by exact saved owner and new common extraction with unchanged digest; six v1 assets/18 JPEG exact. No service, source decode, reprojection or GPU. Schema structural admission is not source/quality authorization.'};
writeFileSync(resolve(output,'compatibility.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
writeFileSync(resolve(output,'executed-compatibility-script.mts'),readFileSync(resolve(root,paths[5])),{flag:'wx'});
console.log(JSON.stringify({result:bind(relative(root,resolve(output,'compatibility.json'))),v2Hash:v2.publicationHash,legacy:legacy.length,sourceOnlyMutations:trials.length}));
