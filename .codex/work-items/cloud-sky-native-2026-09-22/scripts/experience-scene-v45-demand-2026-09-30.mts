// Bound the expanded image eligibility with the actual current publication.
// This is logical decoded demand, not a native/GPU memory measurement.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { projectAdoptedSkyCatalog } from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import { presentSkyTime } from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import { resolveConstellationFrame } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import { createSkyViewBasis } from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import { artworkIntersectsView } from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import { constellationVisibility } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const reportBytes=await fs.readFile(path.join(task,'tmp/v45-current-public-report.json'));
const publicationBytes=await fs.readFile(path.join(task,'tmp/v45-public-constellations.json'));
const context=JSON.parse(await fs.readFile(path.join(task,'tmp/v45-context-resolved.json'),'utf8')).data;
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const publication=JSON.parse(publicationBytes.toString()).data;
const time=presentSkyTime(raw,context.selectedAtUtc);assert(time);
const frame=resolveConstellationFrame(publication,time.report.skyScene,context.selectedAtUtc);assert(frame);
const rows=[];
for(const fov of [45,84.63316191100171,90,115,139,140]){
  for(let azimuth=0;azimuth<360;azimuth+=15){
    for(let altitude=0;altitude<=90;altitude+=15){
      const basis=createSkyViewBasis(azimuth,90+altitude,0)!;
      const wanted=constellationVisibility(fov,true)>0 ? frame.images.filter(image=>
        artworkIntersectsView(image.registration,{basis,verticalFovDeg:fov},390.4,844)).map(image=>image.source):[];
      const unique=[...new Map(wanted.map(image=>[image.sha256,image])).values()];
      rows.push({fov,azimuth,altitude,opacity:constellationVisibility(fov,true),
        ids:wanted.map(image=>image.id),bytes:unique.reduce((sum,image)=>sum+image.width*image.height*4,0)});
    }
  }
}
const budget=16*1024*1024;
const result={at:context.selectedAtUtc,publicationHash:publication.catalogHash,
  reportRawSha256:createHash('sha256').update(reportBytes).digest('hex'),
  viewport:{width:390.4,height:844},samples:rows.length,
  currentLoaderRetentionBudget:budget,
  perFov:[...new Set(rows.map(row=>row.fov))].map(fov=>({fov,
    largest:rows.filter(row=>row.fov===fov).sort((a,b)=>b.bytes-a.bytes)[0],
    samplesAboveRetentionBudget:rows.filter(row=>row.fov===fov&&row.bytes>budget).length})),
  meaning:'Actual eligibility uses the shared owner. The existing loader trims only unwanted ready assets; its retention allowance does not cap a still-wanted working set. No source, coverage or figures were dropped to satisfy the allowance.',
  limits:['A bounded angular grid is not a proof of the global maximum',
    'Logical width*height*4 demand is not native/GPU/GC peak or target performance',
    'Other sky layers are not included; shared coexistence remains unverified']};
const file=path.join(task,'evidence/experience-scene-v45-image-demand-2026-09-30.json');
await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
