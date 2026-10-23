// Bounded CPU diagnosis using the existing public report and admitted catalogues.
// Native GPU, React, transport and physical presentation are deliberately separate.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { projectAdoptedSkyCatalog } from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog';
import { createStellarCatalogClient } from '../../../../apps/wechat-miniapp/src/services/stellar-catalog-client';
import { attachSkyCatalog, resolveSkySceneFrame } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
import { presentSkyTime } from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation';
import { resolveConstellationFrame } from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene';
import { resolveSkyStellarSupplement, supplementGeometry } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene';
import { selectSkyStellarTiles } from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection';
import { drawSkyScene } from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render';
import { createSkySceneFrameIdentity } from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-frame';
import { createSkyViewBasis } from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import { assertSaoIndexPublication, assertSaoTilePublication } from '@starward/miniapp-contracts';

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) throw Error('input_and_new_output_required');
const inputBytes = await fs.readFile(inputFile);
const input = JSON.parse(inputBytes.toString('utf8'));
if (input.envelope?.data?.context?.spotId !== 'spot:test-published') throw Error('public_fixture_required');
const report = projectAdoptedSkyCatalog(input.envelope).data;
const client = createStellarCatalogClient({request:async()=>input.catalog,invalidate(){throw Error('catalog_invalid');}});
const catalog = (await client(report.skyScene.catalog!)).data;
const sourceRoot = path.resolve(import.meta.dirname, '../../../../workers/miniapp-api/assets/sao-v2');
const index = JSON.parse(await fs.readFile(path.join(sourceRoot, 'index.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(sourceRoot, 'publication.json'), 'utf8'));
const publication = {publicationHash:manifest.publicationHash,index};
assertSaoIndexPublication(publication);
const night = report.hourly.find(row => row.sunAltitudeDeg != null && row.sunAltitudeDeg < -18);
if (!night) throw Error('real_night_required');
const basis = createSkyViewBasis(45,110,0)!;
const width=390,height=844;
const tiles = new Map<string,any>();
const results=[];
for (const fov of [45,10.8]) {
  const durations:Record<string,number[]>={presentation:[],base:[],selection:[],supplement:[],constellations:[],draw:[],total:[]};
  const hash=createHash('sha256');
  let loadedRows=0, selectedTiles=0, submittedStars=0, pickedSao=0, pickedBase=0;
  let recording=false, snapshot:any, frameStars=0;
  const surface:any = new Proxy({}, {get(_target,key){
    return (...args:any[])=>{
      if (key==='disc' && args[6]==='star') frameStars++;
      if(recording) hash.update(JSON.stringify([key,args]));
      return true;
    };
  }});
  for(let i=0;i<100;i++) {
    const at=new Date(Date.parse(night.at)+1000+i*17000).toISOString();
    let started=performance.now(), beginning=started;
    const sample=(key:string)=>{const now=performance.now();if(i>=10)durations[key]!.push(now-started);started=now;};
    const presentation=presentSkyTime(report,at); if(!presentation)throw Error('time_unavailable');sample('presentation');
    const attached=attachSkyCatalog(presentation.report,catalog);
    if(!resolveSkySceneFrame(attached.skyScene,at))throw Error('base_unavailable');sample('base');
    const geometry=supplementGeometry(publication,attached.skyScene,at)!;
    const selected=selectSkyStellarTiles(index.tiles,{frame:geometry,
      expected:{catalog,at,observer:attached.skyScene.observer!},basis,width,height,verticalFovDeg:fov,
      sunAltitudeDeg:presentation.row.sunAltitudeDeg!,mode:'NIGHT'});
    sample('selection');
    // File I/O/admission is preparation, not included in the warmed CPU sample.
    const ioStart=performance.now();
    for(const reference of selected) if(!tiles.has(reference.id)) {
      const tile=JSON.parse(await fs.readFile(path.join(sourceRoot,reference.file),'utf8'));
      const value={publicationHash:publication.publicationHash,tile};
      assertSaoTilePublication(value,publication,reference);tiles.set(reference.id,value);
    }
    beginning+=performance.now()-ioStart;started=performance.now();
    const supplement=resolveSkyStellarSupplement(publication,selected.map(t=>tiles.get(t.id)),attached.skyScene,at)!;
    loadedRows=Math.max(loadedRows,supplement.points.length);selectedTiles=Math.max(selectedTiles,selected.length);sample('supplement');
    const constellations=resolveConstellationFrame(input.constellations.data,attached.skyScene,at);sample('constellations');
    frameStars=0;recording=[10,50,99].includes(i);
    drawSkyScene(surface,{identity:createSkySceneFrameIdentity({
      observation:{data:attached,frameAt:at,stellarSupplement:supplement,constellations},
      view:{heading:null,pose:null,manualBasis:basis,mode:'NIGHT',verticalFovDeg:fov},
      canvas:{generation:1,width,height},
    }),layers:{constellations:{images:new Map(),enabled:true}}},
    {painted:({snapshot:value})=>{snapshot=value;}});
    sample('draw');if(i>=10)durations.total!.push(performance.now()-beginning);
    if(recording){hash.update(JSON.stringify(snapshot));submittedStars+=frameStars;
      pickedSao+=snapshot.objects.filter((o:any)=>o.reference.startsWith('SAO:')).length;
      pickedBase+=snapshot.objects.filter((o:any)=>o.reference.startsWith('HR:')).length;}
  }
  if(!submittedStars||!pickedSao)throw Error('nonempty_base_and_sao_draw_required');
  const stages=Object.fromEntries(Object.entries(durations).map(([key,values])=>{
    const sorted=values.toSorted((a,b)=>a-b);
    return [key,{samples:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)]}];
  }));
  results.push({fov,baseCatalogRows:catalog.rows.length,saoPublicationRows:index.rowCount,
    selectedTiles,loadedSaoRows:loadedRows,sampledFrames:3,submittedStars,pickedBase,pickedSao,
    outputSha256:hash.digest('hex'),stages});
}
const result={scope:'LOCAL_CPU_CURRENT_PRODUCTION_OWNERS_PUBLIC_FIXTURE_BASE_PLUS_SELECTED_SAO',
  inputSha256:createHash('sha256').update(inputBytes).digest('hex'),results,
  limitations:['No native GPU, React or physical FPS claim','No photos/textures or sensor workload','Not all catalogue rows are loaded or drawn together']};
await fs.writeFile(outputFile,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
