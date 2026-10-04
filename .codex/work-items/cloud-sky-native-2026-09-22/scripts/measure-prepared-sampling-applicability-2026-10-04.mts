// Task-only sample-density evidence. Samples are not PSF resolution/quality.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {skyProjectionScale,unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.join(root,'output/prepared-sampling-applicability-1004-r1');
const bind=async(p:string)=>{const b=await readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const load=async(p:string)=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const files=[fileURLToPath(import.meta.url),path.join(root,'apps/wechat-miniapp/src/features/sky/sky-view-projection.ts')].map(p=>path.relative(root,p).replaceAll('\\','/'));
const paintFiles=['output/playwright/cloud-sky-prepared-m82-combination-1004-r2/software-prepared-fine-paint.json','output/playwright/cloud-sky-prepared-display-combination-1004-r1/software-prepared-display-night-paint.json'];
files.push(...paintFiles);
const paints=await Promise.all(paintFiles.map(load));
assert.deepEqual(paints[0].view,paints[1].view);assert.equal(paints[0].frameAt,paints[1].frameAt);
const {width,height,view,frameAt}=paints[0];assert.equal(width,390);assert.equal(height,844);
const scale=skyProjectionScale(height,view.verticalFovDeg)!;assert(scale>0);
const ray=(x:number,y:number)=>unprojectSkyPoint(x,y,view.basis,width,height,view.verticalFovDeg,view.center)!;
const angle=(a:number[],b:number[])=>Math.atan2(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]),a.reduce((s,v,i)=>s+v*b[i],0));
const c=ray(view.center.x,view.center.y),x=ray(view.center.x+1,view.center.y),y=ray(view.center.x,view.center.y+1);
const screenPitch=[angle(c,x),angle(c,y)].map(v=>v*180/Math.PI*3600);
const exactPitch=2*Math.atan(1/scale)*180/Math.PI*3600;
assert(screenPitch.every(v=>Math.abs(v-exactPitch)<1e-10));
const definitions=[
 ['Hubble M82','output/hubble-m82-prepared-publication-1004-r2/manifest.json'],
 ['NOIRLab M82 Large display','output/prepared-large-display-publication-1004-r1/manifest.json'],
 ['Hubble M51','output/prepared-optical-publication-1003-r4/publication/manifest.json'],
 ['NOIRLab M51 4k','output/noirlab-prepared-wide-publication-1004-r1/noao1309a/manifest.json'],
];
const rows=[];
for(const [name,p] of definitions){
 files.push(p);const pub=await load(p),g=pub.source.nominalAvm;
 const sourceNominalArcsecPerPixel=g.cdeltDegrees.map((v:number)=>Math.abs(v)*3600);
 const levels=Object.entries(pub.levels).map(([level,a]:[string,any])=>{
  const half=Math.tan(a.fieldDegrees*Math.PI/360);
  const outputArcsecPerPixel=2*Math.atan(half/a.pixels)*180/Math.PI*3600;
  const centeredScreenSpanPixels=2*scale*Math.tan(a.fieldDegrees*Math.PI/720);
  return {level,fieldDegrees:a.fieldDegrees,outputPixels:a.pixels,outputArcsecPerPixel,centeredScreenSpanPixels,
   screenPixelsPerOutputPixel:outputArcsecPerPixel/exactPitch,
   nominalSourceSamplesAcrossField:g.cdeltDegrees.map((v:number)=>a.fieldDegrees/Math.abs(v)),
   nominalSourceSamplesPerOutputPixel:sourceNominalArcsecPerPixel.map((v:number)=>outputArcsecPerPixel/v),
   alphaPixels:a.alphaPixels,encodedBytes:a.bytes};
 });
 rows.push({name,objectRef:pub.objectRef,publicationHash:pub.publicationHash,sourceResourceId:pub.source.resourceId,
  sourceEncodedBytes:pub.source.encodedJpeg.bytes,decodedShapeWidthHeight:g.decodedShapeWidthHeight,
  sourceNominalArcsecPerPixel,nominalSourcePixelsAcrossActualVerticalFov:g.cdeltDegrees.map((v:number)=>view.verticalFovDeg/Math.abs(v)),
  actualCenterScreenPixelsPerNativeSourcePixel:sourceNominalArcsecPerPixel.map((v:number)=>v/exactPitch),levels,
  scienceAvailability:'UNKNOWN',registration:g.accuracy,
  scope:pub.objectRef==='M:82'?'Saved M82 centered actual view':'Same viewport/field sample-density calculation only; not an actual M51 page frame'});
}
const before=await Promise.all(files.map(bind));await mkdir(out);
const result={status:'MEASURED_SOURCE_EXPORT_AND_ACTUAL_SCREEN_SAMPLE_DENSITY',frameAt,width,height,view,screenCenterArcsecPerPixel:screenPitch,
 currentFineScreenPixelsPerOutputPixel:rows[0].levels.find(r=>r.level==='DETAIL')!.screenPixelsPerOutputPixel,
 hypothetical1024SameFieldScreenPixelsPerOutputPixel:rows[0].levels.find(r=>r.level==='DETAIL')!.screenPixelsPerOutputPixel/2,
 actualSavedM82ViewsAndInstantExactlyEqual:true,rows,inputsBefore:before,
 limits:['Nominal AVM tangent-plane sampling, not measured PSF/resolved structure, absolute astrometry or quality acceptance.',
 'Centered logical DPR1 saved frame only; native DPR/physical allocation and source off-center distortions unverified.',
 'A higher-sampling source can be limited by the current export. Extra output pixels cannot create detail absent from a source.',
 'No JPEG RGB decode, reprojection, background fit, new downloads, production/source identities or default adoption.']};
assert.deepEqual(await Promise.all(files.map(bind)),before);
await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
await writeFile(path.join(out,'executed-script.mts'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'});
console.log(JSON.stringify({status:result.status,screenPitch,currentFineMagnification:result.currentFineScreenPixelsPerOutputPixel,rows:rows.map(r=>({name:r.name,sourceSamplesAcrossFine:r.levels.find(x=>x.level==='DETAIL')!.nominalSourceSamplesAcrossField}))}));
