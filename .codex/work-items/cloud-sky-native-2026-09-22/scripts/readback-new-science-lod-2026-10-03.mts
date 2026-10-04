/** Current saved-output readback, corrected adopted red-mode oracle; no GPU run. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {exactSkyObservationFrame,skyEquatorialDirectionToEnu} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {createSkyViewBasis,unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {registerSkyTanOpticalField} from '../../../../apps/wechat-miniapp/src/features/sky/sky-tan-optical-registration';
import {skyArtworkUvAtDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration';
const TASK='.codex/work-items/cloud-sky-native-2026-09-22/',SOURCE='output/playwright/cloud-sky-new-science-lod-1003-r1';
const OUT='output/new-science-lod-readback-1003-r1';await assert.rejects(access(OUT),{code:'ENOENT'});await mkdir(OUT);
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const bind=async(file:string)=>{const bytes=await readFile(file);return{path:file,bytes:bytes.length,sha256:sha(bytes)};};
const json=async(file:string)=>JSON.parse(await readFile(file,'utf8'));
const observed=await json(SOURCE+'/observations.json'),original=await json(SOURCE+'/inputs-before.json');
const changes:any[]=[];
for(const entry of original){const current=await bind(entry.path);if(current.sha256!==entry.sha256){
 assert.equal(entry.path,TASK+'scripts/experience-new-science-lod-2026-10-03.mts');
 const snapshot=await bind(SOURCE+'/executed-host-script.mts');assert.equal(snapshot.sha256,entry.sha256);assert.equal(snapshot.bytes,entry.bytes);
 changes.push({entry,current,exactOriginalSnapshot:snapshot,reason:'Host-only red suppression oracle repair after capture; original failed generation preserved.'});
}}
assert.equal(changes.length,1);assert.deepEqual(observed.failures,[]);assert.deepEqual(observed.pageErrors,[]);
assert(!observed.contextLost&&Object.values(observed.final.counts).every(value=>value===0));
const rows:any[]=[],bindings:any[]=[await bind(SOURCE+'/observations.json'),await bind(SOURCE+'/failed.json'),await bind(SOURCE+'/executed-bundle.js')];
const pixels=new Map<string,Buffer>();
for(const capture of observed.captures){
 const p=capture.raw.path,png=capture.png.path;const pb=await bind(p),gb=await bind(png);
 assert.deepEqual(pb,capture.raw);assert.deepEqual(gb,capture.png);assert.equal(pb.bytes,390*844*4);
 bindings.push(pb,gb);pixels.set(capture.name,await readFile(p));
}
const datasets=[{name:'partial-fixed',directory:'output/partial-science-publication-1003-r1'},
 {name:'frozen-zscale',directory:'output/frozen-zscale-publication-1003-r1'}];
for(const dataset of datasets){
 const publication=await json(dataset.directory+'/manifest.json');
 for(const row of observed.rows.filter((row:any)=>row.dataset===dataset.name&&!row.baseline)){
  const a=pixels.get(row.name)!,b=pixels.get(row.name+'-baseline')!;let differentPixels=0,maxDelta=0;
  for(let i=0;i<a.length;i+=4){let different=false;for(let k=0;k<3;k++){const delta=Math.abs(a[i+k]!-b[i+k]!);maxDelta=Math.max(maxDelta,delta);different ||= delta>0;}differentPixels+=Number(different);}
  if(row.condition.mode==='OBSERVATION'){assert.equal(differentPixels,0);assert.equal(row.completed,null);}
  else{
   assert(differentPixels>0&&row.completed.publicationHash===publication.publicationHash);
   assert(row.completed.fields.length>0&&row.completed.fields.every((field:any)=>field.assetExact&&field.nativeExact&&field.assetSha256===publication.levels[field.level].sha256));
  }
  rows.push({name:row.name,differentPixels,maxDelta,sourceFields:row.completed?.fields??[],redSuppression:row.condition.mode==='OBSERVATION'});
 }
 const retired=observed.rows.find((row:any)=>row.name===dataset.name+'-retired-detail');
 assert.deepEqual(retired.imageFailures,['DETAIL']);assert(retired.completed.fields.every((field:any)=>field.level==='MEDIUM'));
 assert.deepEqual(pixels.get(dataset.name+'-retired-detail'),pixels.get(dataset.name+'-medium-only-rotated'));
}
// Locate actual fine-vs-parent changes with the existing CPU shader model.
// This is a diagnostic band, not a new astrometry tolerance or quality gate.
const report=await json(TASK+'tmp/current-native-report-2026-10-01.json');
const times=await json('output/playwright/cloud-sky-sdss-level-composition-1002-r3/result.json');
const at=times.rows.find((row:any)=>row.name==='night-real-pair').at;
const observation=exactSkyObservationFrame(report.data,at)!;assert(observation);
const lodDifferences:any[]=[];
for(const dataset of datasets){
 const publication=await json(dataset.directory+'/manifest.json'),rad=Math.PI/180;
 const ra=publication.center.raDeg*rad,dec=publication.center.decDeg*rad;
 const ray=skyEquatorialDirectionToEnu(observation.equatorialToEnu,[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)]);
 const base=createSkyViewBasis(Math.atan2(ray[0],ray[1])/rad,90+Math.atan2(ray[2],Math.hypot(ray[0],ray[1]))/rad,0)!;
 const angle=37*rad,basis={forward:base.forward,right:base.right.map((v,i)=>Math.cos(angle)*v-Math.sin(angle)*base.up[i]!) as any,
  up:base.up.map((v,i)=>Math.cos(angle)*v+Math.sin(angle)*base.right[i]!) as any};
 const registration=registerSkyTanOpticalField(publication,publication.levels.DETAIL,observation)!;assert(registration);
 const fine=pixels.get(dataset.name+'-detail-rotated')!,parent=pixels.get(dataset.name+'-medium-only-rotated')!;
 const categories:any={fineInterior:[],innerFourSourcePixelEdge:[],nearOuterTwoSourcePixelEdge:[],farOutsideFine:[]};
 for(let y=0;y<844;y++)for(let x=0;x<390;x++){
  const ray=unprojectSkyPoint(x+.5,843.5-y,basis,390,844,.10)!;
  const uv=skyArtworkUvAtDirection(registration,ray)!;assert(uv);
  const distance=512*Math.min(uv[0],uv[1],1-uv[0],1-uv[1]);
  const name=distance>=4?'fineInterior':distance>=0?'innerFourSourcePixelEdge':distance>=-2?'nearOuterTwoSourcePixelEdge':'farOutsideFine';
  const i=(y*390+x)*4;let maximum=0;for(let k=0;k<3;k++)maximum=Math.max(maximum,Math.abs(fine[i+k]!-parent[i+k]!));categories[name].push(maximum);
 }
 const metrics:any={};for(const[name,values]of Object.entries(categories) as [string,number[]][]){
  values.sort((a,b)=>a-b);metrics[name]={pixels:values.length,changedPixels:values.filter(value=>value>0).length,
   maxChannelDelta:values.at(-1)??null,p50:values.length?values[Math.floor(values.length*.5)]:null,p95:values.length?values[Math.min(values.length-1,Math.floor(values.length*.95))]:null};
 }
 lodDifferences.push({dataset:dataset.name,metrics,scope:'Actual full RGBA difference, theoretical current CPU fine footprint used only to locate differences; no science-accuracy or image-quality threshold.'});
}
bindings.push(await bind(TASK+'scripts/readback-new-science-lod-2026-10-03.mts'),await bind('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'));
const result={status:'SAVED_ACTUAL_SCENE_MECHANISMS_VERIFIED_QUALITY_OPEN',rows,lodDifferences,retiredFineExactMediumFallback:true,
 redModesExactlyMatchNoImageBaseline:true,originalHostOracleFailureRetained:true,changedInputs:changes,
 peakLogicalRgbaTextureBytes:observed.peakLogicalRgbaTextureBytes,final:observed.final,bindings,
 independentReview:'MISSING_SELF_READBACK',quality:'UNACCEPTED_PARTIAL_SOURCE_BOUNDARY_BROWN_NOISY_ZSCALE_AND_LOD_CHANGES',
 scope:observed.scope+' Reader checks saved bytes/current input identities and adopted red suppression; no new GPU/browser/source processing or full quality/source Back acceptance.'};
await writeFile(OUT+'/result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:await bind(OUT+'/result.json'),rows,lodDifferences,peakLogicalRgbaTextureBytes:result.peakLogicalRgbaTextureBytes,final:result.final}));
