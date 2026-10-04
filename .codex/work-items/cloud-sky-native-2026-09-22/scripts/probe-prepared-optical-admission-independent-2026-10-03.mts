import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { assertPreparedOpticalPublication, assertPreparedOpticalManifest, preparedOpticalPublicationHash } from '../../../../packages/miniapp-contracts/src/prepared-optical-publication.ts';
const root=process.cwd(),out=resolve(root,'output/prepared-optical-independent-1003-r1');
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=readFileSync(resolve(root,p));return {path:p,bytes:b.length,sha256:sha(b)};};
const p=process.argv[2]??'output/prepared-optical-publication-1003-r3/publication/manifest.json';
const source='packages/miniapp-contracts/src/prepared-optical-publication.ts';
const before=[bind(source),bind('packages/miniapp-contracts/src/optical-publication-content.ts'),bind(p)];
const manifest=JSON.parse(readFileSync(resolve(root,p),'utf8'));
assertPreparedOpticalManifest(manifest,'M:51',manifest.publicationHash);
const canonical=(v:any):string=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`:JSON.stringify(v);
const content=structuredClone(manifest);delete content.publicationHash;for(const a of Object.values(content.levels) as any[])delete a.downloadUrl;
assert.equal(sha(canonical(content)),manifest.publicationHash);
assert.equal(content.master.rgba.bytes,2048**2*4);assert.equal(content.master.rgba.sha256,'2c9790bb218556a3e2474a4101e0dad4a389c7d45c1ff441210df0678a3694a9');
assert.equal(content.master.rgbaNpy.bytes,2048**2*4+128);assert.equal(content.master.rgbaNpy.sha256,'cf086879a92021445163ca4ff9d6ccd80d4f46d77e071f57ecec1ef0f46556ee');
const rows=[];
for(const [name,change] of [
 ['container-bytes-as-raw',(v:any)=>{v.master.rgba.bytes=v.master.rgbaNpy.bytes;}],
 ['invalid-npy-format',(v:any)=>{v.master.rgbaNpy.format='raw';}],
 ['npy-row-order',(v:any)=>{v.master.rgbaNpy.rowOrder='bottom-first';}],
 ['npy-shape',(v:any)=>{v.master.rgbaNpy.shape=[2048,2048,3];}],
 ['npy-dtype',(v:any)=>{v.master.rgbaNpy.dtype='float32';}],
 ['level-container-hash-as-raw',(v:any)=>{v.levels.DETAIL.masterRgbaSha256=v.master.rgbaNpy.sha256;}],
 ['science-availability-claim',(v:any)=>{v.master.scientificAvailability='COMPLETE';}],
 ['science-flux-claim',(v:any)=>{v.master.unit='nanomaggies/pixel';}],
 ['native-decoded-row-order',(v:any)=>{v.source.decodedRgb.rowOrder='bottom-first';}],
 ['different-crop',(v:any)=>{v.levels.DETAIL.masterCrop.boundsXYExclusive[0]++;}],
 ['fractional-detail-mask',(v:any)=>{v.levels.DETAIL.alphaPixels.opaque--;v.levels.DETAIL.alphaPixels.partial++;}],
 ['scientific-mask-display',(v:any)=>{v.levels.DETAIL.displayAlpha='joint-area-alpha';}],
 ['path-traversal',(v:any)=>{v.levels.DETAIL.file='../not-admitted.png';}],
 ['foreign-ref',(v:any)=>{v.objectRef='M:82';}],
] as const){const v=structuredClone(content);change(v);let reason='';try{assertPreparedOpticalPublication(v,'M:51',preparedOpticalPublicationHash(v));}catch(e){reason=String(e);}assert.match(reason,/prepared_optical_publication_invalid/);rows.push({name,reason});}
const pins=[];
for(const [name,change] of [
 ['credit',(v:any)=>{v.source.credit+=' changed';}],['raw-source',(v:any)=>{v.source.rawXmp.sha256='e'.repeat(64);}],
 ['uncertainty',(v:any)=>{v.source.nominalAvm.spatialNotes+=' retained uncertainty changed';}],
 ['producer-receipt',(v:any)=>{v.processing.producerReceipt.sha256='e'.repeat(64);}],
 ['raw-master',(v:any)=>{v.master.rgba.sha256='e'.repeat(64);for(const a of Object.values(v.levels) as any[])a.masterRgbaSha256=v.master.rgba.sha256;}],
] as const){const v=structuredClone(content);change(v);const h=preparedOpticalPublicationHash(v);assert.notEqual(h,manifest.publicationHash);assert.throws(()=>assertPreparedOpticalPublication(v,'M:51',manifest.publicationHash));pins.push({name,changedHash:h});}
const redirected=structuredClone(manifest);redirected.levels.DETAIL.downloadUrl='/outside.png';assert.equal(preparedOpticalPublicationHash(redirected),manifest.publicationHash);assert.throws(()=>assertPreparedOpticalManifest(redirected,'M:51',manifest.publicationHash));
const after=before.map(v=>bind(v.path));assert.deepEqual(before,after);
const record={status:'PASS_BOUNDED_REAL_PREPARED_CONTRACT',manifest:bind(p),pin:manifest.publicationHash,independentCanonicalNodeCryptoExact:true,rawAndNpyIdentitiesDistinct:true,rows,pins,transportRedirectRejected:true,before,after,scope:'Actual current TS owner on real saved R3 manifest; fresh hashes cannot bypass structural constraints, retained expected pin binds source/credit/uncertainty. No new packaging/source decode/projection/GPU or scientific/rights approval.'};
writeFileSync(resolve(out,'admission.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
writeFileSync(resolve(out,'executed-admission-script.mts'),readFileSync(resolve(root,'.codex/work-items/cloud-sky-native-2026-09-22/scripts/probe-prepared-optical-admission-independent-2026-10-03.mts')),{flag:'wx'});
console.log(JSON.stringify({result:bind(relative(root,resolve(out,'admission.json')).replaceAll('\\','/')),freshInvalids:rows.length,pinChanges:pins.length}));
