import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=(value,algorithm='sha256')=>createHash(algorithm).update(value).digest('hex');
const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const assets=[];
const publicationReads=[];
async function readPublication(file){const bytes=await fs.readFile(file);publicationReads.push({path:file,bytes:bytes.length,sha256:sha(bytes)});return JSON.parse(bytes.toString());}
async function add(file,identity,width,height,expectedSha256,expectedBytes){
 const bytes=await fs.readFile(file);
 assert.equal(sha(bytes),expectedSha256,identity);
 assert.equal(bytes.length,expectedBytes,identity);
 assets.push({identity,path:file,width,height,rgbaBytes:width*height*4,encodedBytes:bytes.length,sha256:sha(bytes),sha1:sha(bytes,'sha1')});
}
const catalog=await readPublication('packages/astronomy-core/data/stellarium-modern-v24.4.v3.json');
for(const image of catalog.images)await add(path.posix.join('workers/miniapp-api/assets/constellations',image.file),'constellation:'+image.id,image.width,image.height,image.sha256,image.bytes);
const landscape=await readPublication('workers/miniapp-api/assets/landscape/manifest.json');
for(const resource of landscape.resources)await add(path.posix.join('workers/miniapp-api/assets/landscape',resource.image.file),'landscape:'+resource.id,resource.image.width,resource.image.height,resource.image.sha256,resource.image.bytes);
const galactic=await readPublication('workers/miniapp-api/assets/deep-sky/galactic-2mass/manifest.json');
await add(path.posix.join('workers/miniapp-api/assets/deep-sky/galactic-2mass',galactic.image.file),'galactic:2mass',galactic.image.width,galactic.image.height,galactic.image.sha256,galactic.image.bytes);
const infrared=await readPublication('workers/miniapp-api/assets/deep-sky/manifest.json');
const m42=infrared.entries.find(entry=>entry.objectRef==='M:42');assert(m42);
for(const [level,image] of Object.entries(m42.levels))await add(path.posix.join('workers/miniapp-api/assets/deep-sky',image.file),'infrared:M:42:'+level,image.pixels,image.pixels,image.sha256,image.bytes);
const trace=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(trace.toString()));
const events=trace.toString().trim().split(/\r?\n/).map(JSON.parse);
const native=[];
for(const event of events.filter(row=>row.stage.startsWith('resource-source-')&&row.stage.endsWith('-encoded-digests'))){
 assert.equal(event.value.failed,0);
 const files=event.value.files.map(row=>{
  const matches=assets.filter(asset=>asset.sha1===row.sha1&&asset.encodedBytes===row.encodedBytes);
  assert.equal(matches.length,1,JSON.stringify(row));return matches[0];
 });
 native.push({stage:event.stage,at:event.at,count:files.length,encodedBytes:files.reduce((sum,file)=>sum+file.encodedBytes,0),associatedSourceRgbaBytes:files.reduce((sum,file)=>sum+file.rgbaBytes,0),files});
}
assert(native.length);
const previous=await readJson(task+'/evidence/experience-scientific-scale-native-binding-2026-10-01.json');
const historical=previous.encodedHeaders.map(row=>{
 const matches=assets.filter(asset=>asset.width===row.width&&asset.height===row.height&&asset.encodedBytes===row.encodedBytes);
 return {width:row.width,height:row.height,encodedBytes:row.encodedBytes,candidates:matches.map(asset=>asset.identity),scope:'Historical header/size match only; these retired native bytes cannot receive a retrospective digest assertion'};
});
const optical=await fs.readFile('packages/miniapp-contracts/src/sdss-optical-publication.ts');
assert(!/"M:42"\s*:/.test(optical.toString()));
const output=task+'/evidence/experience-resource-source-binding-2026-10-01.json';
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Current native encoded file digests bound to existing individually verified local publications; no new upstream downloads or publication adoption',publicationReads,native,historicalHeaderCandidates:historical,m42:{source:infrared.source.provider,dataset:infrared.source.dataset,wavelengthMicrometers:infrared.source.wavelengthMicrometers,sdssOpticalPublication:false,sourceFiniteLevels:Object.fromEntries(Object.entries(m42.levels).map(([level,asset])=>[level,{fieldDegrees:asset.fieldDegrees,validFraction:asset.validFraction,coverageState:asset.coverageState,format:asset.format??null,sha256:asset.sha256}]))},opticalContract:{path:'packages/miniapp-contracts/src/sdss-optical-publication.ts',sha256:sha(optical)},limits:['SHA1 is a native readback identity cross-check; product integrity remains the SHA256 publication/server contract','Associated source RGBA bytes are declared image dimensions times four, not proof of live decoded bitmap/GPU/OS memory or current painted inputs','Historical size/header candidates do not retrospectively bind retired file contents','M42 finite sample alpha and zero encoded color are different; dark finite samples are not missing data','Total native resources, target performance, WXML composition, phone and whole acceptance remain open']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,native:native.map(({stage,count,encodedBytes,associatedSourceRgbaBytes,files})=>({stage,count,encodedBytes,associatedSourceRgbaBytes,identities:files.map(row=>row.identity)})),historicalUniqueCandidates:historical.filter(row=>row.candidates.length===1).length,m42Sdss:false}));
