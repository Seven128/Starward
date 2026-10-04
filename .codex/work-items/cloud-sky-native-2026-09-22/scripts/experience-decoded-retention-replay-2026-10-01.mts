// Real published identities/dimensions and the current production loader.
// Synchronous completed decode callbacks isolate retention ownership; no native
// memory, request timing, full rendered journey or new implementation is claimed.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSkyArtworkLoader,type SkyNativeImageAsset,type SkyArtworkLoadState} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import {selectSkyLandscapeResource} from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-resources.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const binding=JSON.parse(await fs.readFile(task+'/evidence/experience-resource-source-binding-2026-10-01.json','utf8'));
const catalog=JSON.parse(await fs.readFile('packages/astronomy-core/data/stellarium-modern-v24.4.v3.json','utf8'));
const landscape=JSON.parse(await fs.readFile('workers/miniapp-api/assets/landscape/manifest.json','utf8'));
const primary=JSON.parse(await fs.readFile('workers/miniapp-api/assets/deep-sky/manifest.json','utf8')).entries.find((entry:any)=>entry.objectRef==='M:42').levels.MEDIUM;
assert.equal(constellationVisibility(4.6,true),0,'local science view has no wanted illustrations');
type Asset=SkyNativeImageAsset&{bytes:number};
const baseline=binding.native.find((row:any)=>row.stage==='resource-source-baseline-encoded-digests');
const art=(id:string):Asset=>{const image=catalog.images.find((row:any)=>row.id===id);assert(image);return {...image,id:'constellation:'+id};};
const initialArt:Asset[]=baseline.files.filter((row:any)=>row.identity.startsWith('constellation:')).map((row:any)=>art(row.identity.split(':')[1]));
assert.equal(initialArt.length,8);
const localArt=[art('Eri'),art('Tau')];
const foreground=landscape.resources.map((resource:any)=>({...resource.image,id:'landscape:'+resource.id}));
const galaxySource=baseline.files.find((row:any)=>row.identity==='galactic:2mass');assert(galaxySource);
const galaxy:Asset={id:'galactic:2mass',sha256:galaxySource.sha256,width:galaxySource.width,height:galaxySource.height,bytes:galaxySource.encodedBytes};
const infrared:Asset={id:'infrared:M:42:MEDIUM',sha256:primary.sha256,width:primary.pixels,height:primary.pixels,bytes:primary.bytes};
const runs:any[]=[];
for(const releaseHidden of [false,true]){
 const live=new Map<object,Asset>(),starts:Asset[]=[],releases:string[]=[],owners:any[]=[];
 function create(){
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),failed:false,loading:false};
  const loader=createSkyArtworkLoader<Asset>({changed(next){state=next;},start(asset,ready){
   starts.push(asset);const image={width:asset.width,height:asset.height,identity:asset.id};live.set(image,asset);
   let released=false;ready({image,release(){if(!released){released=true;assert(live.delete(image));releases.push(asset.id);}}});return()=>{};
  }});
  const owner={loader,get state(){return state;}};owners.push(owner);return owner;
 }
 let illustrations=create(),galactic=create();const panorama=create();
 const points:any[]=[];
 function snapshot(stage:string,selectedForeground:string,primaryActive:boolean){
  const sources=[...live.values(),...(primaryActive?[infrared]:[])];
  const rows=sources.map(source=>({identity:source.id,sha256:source.sha256,encodedBytes:source.bytes,rgbaBytes:source.width*source.height*4}));
  const painted=[...illustrations.state.images.keys(),galactic.state.images.has(galaxy.id)?galaxy.id:null,'landscape:'+selectedForeground,primaryActive?infrared.id:null].filter(Boolean).sort();
  points.push({stage,count:rows.length,sourceRgbaBytes:rows.reduce((sum,row)=>sum+row.rgbaBytes,0),encodedBytes:rows.reduce((sum,row)=>sum+row.encodedBytes,0),associatedSources:rows,consumerImageIdentities:painted,retainedIllustrations:[...illustrations.state.retainedImages.keys()].sort()});
 }
 illustrations.loader.update(initialArt);galactic.loader.update([galaxy]);panorama.loader.update([foreground[0]]);
 snapshot('baseline-inventory','overview',false);
 assert.equal(points[0].sourceRgbaBytes,baseline.associatedSourceRgbaBytes);
 assert.equal(points[0].encodedBytes,baseline.encodedBytes);
 // Source-bound Eri/Tau inventory appeared while locating M42 before the
 // local zoom. Earlier retained native files were identified only by headers;
 // replay treats these names as inferred inputs, not a native digest assertion.
 illustrations.loader.update(localArt);galactic.loader.dispose();galactic=create();
 const local=selectSkyLandscapeResource(landscape,[{width:infrared.width,height:infrared.height}],false);
 assert.equal(local.id,'detail');panorama.loader.update(foreground);
 if(releaseHidden){illustrations.loader.dispose();illustrations=create();}
 else illustrations.loader.update([]);
 snapshot('local-4p6-retention','detail',true);
 const returningStart=starts.length;
 illustrations.loader.update(initialArt);galactic.loader.update([galaxy]);
 const returning=selectSkyLandscapeResource(landscape,[...illustrations.state.images.values(),...galactic.state.images.values()],false);
 assert.equal(returning.id,'overview');panorama.loader.update([foreground[0]]);
 snapshot('return-45-retention-model','overview',false);
 const returnStarts=starts.slice(returningStart);
 for(const owner of owners)owner.loader.dispose();assert.equal(live.size,0);
 runs.push({strategy:releaseHidden?'illustration-owner-disposed-when-hidden':'current-production-retention',points,returnRequestStarts:returnStarts.map(source=>source.id),returnEncodedRequestBytes:returnStarts.reduce((sum,source)=>sum+source.bytes,0),allReleaseCount:releases.length,logicalLiveAfterDispose:live.size});
}
const current=runs[0],disposal=runs[1];
assert.equal(current.points[1].sourceRgbaBytes,19_660_800);
assert.equal(current.points[1].encodedBytes,4_580_054);
const historicalBinding=JSON.parse(await fs.readFile(task+'/evidence/experience-scientific-scale-native-binding-2026-10-01.json','utf8'));
assert.equal(current.points[1].encodedBytes,historicalBinding.encodedHeaders.reduce((sum:number,row:any)=>sum+row.encodedBytes,0),'MEDIUM header inventory and DETAIL peak are distinct instants');
assert.deepEqual(current.points.map((row:any)=>row.consumerImageIdentities),disposal.points.map((row:any)=>row.consumerImageIdentities));
const extra=disposal.returnEncodedRequestBytes-current.returnEncodedRequestBytes;
assert.equal(extra,initialArt.reduce((sum,image)=>sum+image.bytes,0));assert(extra>0);
const sourceHashes=await Promise.all([
 'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',
 'apps/wechat-miniapp/src/features/sky/sky-landscape-resources.ts',
 'apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts',
].map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const output=task+'/evidence/experience-decoded-retention-replay-2026-10-01.json';
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Source-bound production loader ownership/retention replay; no native memory measurement or pressure policy adoption',inputs:{binding:task+'/evidence/experience-resource-source-binding-2026-10-01.json',m42LocalFov:4.6,initialArtIdentities:initialArt.map(row=>row.id),intermediateArtIdentities:localArt.map(row=>row.id),nativeHistoricalNames:'Header/size unique candidates; no retrospective digest assertion'},sourceHashes,runs,tradeoff:{localSourceRgbaReduction:current.points[1].sourceRgbaBytes-disposal.points[1].sourceRgbaBytes,extraReturnRequests:disposal.returnRequestStarts.length-current.returnRequestStarts.length,extraReturnEncodedRequestBytes:extra,adopted:false,reason:'Dispose couples file/decoded lifetime and creates return requests; request replay does not prove when returning artwork becomes visible. Keep current valid source/fallback behavior while evaluating file-backed re-decode.'},limits:['The baseline inventory matches current native file digests; historical Eri/Tau and 2K inventory are inferred header/size inputs','Source dimensions times four quantify declared decoded references only, not native/GPU/OS allocation or GC','Synchronous completed callbacks isolate retention; no request latency/real concurrency or final frame performance claim','Consumer image identities show availability at the owner, not actual rendered pixels or native composition','Return45 after local is a resource-owner model; latest native baseline followed Map exit and reentry instead']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,strategies:runs.map((run:any)=>({strategy:run.strategy,points:run.points.map((row:any)=>({stage:row.stage,sourceRgbaBytes:row.sourceRgbaBytes,encodedBytes:row.encodedBytes})),returnEncodedRequestBytes:run.returnEncodedRequestBytes})),extraReturnEncodedRequestBytes:extra,adopted:false}));
