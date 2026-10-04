import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSkyArtworkLoader,type SkyNativeImageAsset,type SkyArtworkLoadState} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import {startSkyArtworkRequest,type SkyArtworkImage} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const read=async(file:string)=>JSON.parse(await fs.readFile(file,'utf8'));
const previous=await read(task+'/evidence/experience-decoded-retention-replay-2026-10-01.json');
const binding=await read(task+'/evidence/experience-resource-source-binding-2026-10-01.json');
const catalog=await read('packages/astronomy-core/data/stellarium-modern-v24.4.v3.json');
const landscape=await read('workers/miniapp-api/assets/landscape/manifest.json');
const infrared=await read('workers/miniapp-api/assets/deep-sky/manifest.json');
const baseline=binding.native[0];
type Asset=SkyNativeImageAsset&{bytes:number;path:string;format:'png'|'jpeg';body:ArrayBuffer};
const assets:Asset[]=[];
async function add(id:string,file:string,width:number,height:number,bytes:number,sha256:string){
 const body=await fs.readFile(file);assert.equal(body.length,bytes);assert.equal(createHash('sha256').update(body).digest('hex'),sha256);
 assets.push({id,path:file,width,height,bytes,sha256,format:file.endsWith('.png')?'png':'jpeg',body:body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength) as ArrayBuffer});
}
const artIds=[...previous.inputs.initialArtIdentities,...previous.inputs.intermediateArtIdentities];
for(const id of artIds){const image=catalog.images.find((row:any)=>'constellation:'+row.id===id);assert(image);await add(id,'workers/miniapp-api/assets/constellations/'+image.file,image.width,image.height,image.bytes,image.sha256);}
for(const resource of landscape.resources)await add('landscape:'+resource.id,'workers/miniapp-api/assets/landscape/'+resource.image.file,resource.image.width,resource.image.height,resource.image.bytes,resource.image.sha256);
const galaxy=baseline.files.find((row:any)=>row.identity==='galactic:2mass');await add(galaxy.identity,galaxy.path,galaxy.width,galaxy.height,galaxy.encodedBytes,galaxy.sha256);
const m42=infrared.entries.find((row:any)=>row.objectRef==='M:42').levels.MEDIUM;
await add('infrared:M:42:MEDIUM','workers/miniapp-api/assets/deep-sky/'+m42.file,m42.pixels,m42.pixels,m42.bytes,m42.sha256);
const byId=(id:string)=>{const asset=assets.find(row=>row.id===id);assert(asset);return asset;};
const initial=previous.inputs.initialArtIdentities.map(byId),local=previous.inputs.intermediateArtIdentities.map(byId),fg=['landscape:overview','landscape:detail'].map(byId),gal=byId('galactic:2mass'),primary=byId('infrared:M:42:MEDIUM');
const runs:any[]=[];
for(const suspend of [false,true]){
 const files=new Map<string,Asset>(),starts:Asset[]=[],owners:any[]=[];let creates=0;
 function create(){
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
  const loader=createSkyArtworkLoader<Asset>({changed(next){state=next;},start(asset,ready,fail){
   const file='/owned/'+(starts.length+1)+'.'+(asset.format==='png'?'png':'jpg');starts.push(asset);
   return startSkyArtworkRequest({asset,url:'https://fixture.invalid/'+asset.sha256,filePath:file,format:asset.format,
    canvas:{createImage(){creates++;let source='';const image:SkyArtworkImage={src:'',onload:null,onerror:null};
     Object.defineProperty(image,'src',{get(){return source},set(value){source=value;const stored=files.get(value);if(!stored){image.onerror?.();return}image.width=stored.width;image.height=stored.height;image.onload?.();}});return image;}},
    request(options){options.success({statusCode:200,data:asset.body});return{abort(){}};},writeFile(options){assert.equal(options.data.byteLength,asset.bytes);files.set(file,asset);options.success();},
    removeFile(path){assert(files.delete(path));},ready,fail});
  }});const owner={loader,get state(){return state;}};owners.push(owner);return owner;
 }
 const art=create(),panorama=create();let galactic=create();const points:any[]=[];
 function snapshot(stage:string,hasPrimary:boolean){
  const decoded=new Map<object,Asset>();for(const owner of [art,panorama,galactic])for(const [id,image] of [...owner.state.retainedImages,...owner.state.images])decoded.set(image,byId(id));
  const ready=[...decoded.values(),...(hasPrimary?[primary]:[])],encoded=[...files.values(),...(hasPrimary?[primary]:[])];
  points.push({stage,decodedSourceRgbaBytes:ready.reduce((sum,row)=>sum+row.width*row.height*4,0),decodedIdentities:ready.map(row=>row.id).sort(),encodedBytes:encoded.reduce((sum,row)=>sum+row.bytes,0),encodedIdentities:encoded.map(row=>row.id).sort(),createImageCalls:creates,requestStarts:starts.length});
 }
 art.loader.update(initial);galactic.loader.update([gal]);panorama.loader.update([fg[0]]);snapshot('baseline',false);
 art.loader.update(local);if(suspend)art.loader.suspendUnusedDecoded();galactic.loader.dispose();galactic=create();panorama.loader.update(fg);
 art.loader.update([]);if(suspend)art.loader.suspendUnusedDecoded();snapshot('local',true);
 const returnAt=starts.length;art.loader.update(initial);if(suspend)art.loader.suspendUnusedDecoded();galactic.loader.update([gal]);panorama.loader.update([fg[0]]);snapshot('return-model',false);
 const returning=starts.slice(returnAt);for(const owner of owners)owner.loader.dispose();assert.equal(files.size,0);
 runs.push({strategy:suspend?'file-backed-unused-illustrations':'current-before-retention',points,returnRequestIdentities:returning.map(row=>row.id),returnEncodedRequestBytes:returning.reduce((sum,row)=>sum+row.bytes,0),encodedFilesAfterDispose:files.size});
}
const before=runs[0],after=runs[1];
assert.deepEqual(before.points.map((row:any)=>row.decodedSourceRgbaBytes),previous.runs[0].points.map((row:any)=>row.sourceRgbaBytes));
assert.equal(after.points[1].decodedSourceRgbaBytes,11_534_336);assert.equal(after.points[1].encodedBytes,before.points[1].encodedBytes);
assert.deepEqual(after.points.map((row:any)=>row.encodedIdentities),before.points.map((row:any)=>row.encodedIdentities));
assert.deepEqual(after.returnRequestIdentities,before.returnRequestIdentities);assert.deepEqual(after.returnRequestIdentities,['galactic:2mass']);
const sourceHashes=await Promise.all(['sky-artwork-loader.ts','sky-artwork-request.ts','use-sky-artwork.ts'].map(async name=>{const file='apps/wechat-miniapp/src/features/sky/'+name;return{path:file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')};}));
const output=task+'/evidence/experience-cold-artwork-replay-2026-10-01.json';
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Current production request/loader replay using existing exact published PNG/JPEG bytes. Native callbacks are modeled as synchronous; ownership references, not physical memory or rendered quality.',sourceHashes,assets:assets.map(({body,...rest})=>rest),runs,improvement:{localDecodedSourceRgbaReduction:before.points[1].decodedSourceRgbaBytes-after.points[1].decodedSourceRgbaBytes,returnDecodedSourceRgbaReduction:before.points[2].decodedSourceRgbaBytes-after.points[2].decodedSourceRgbaBytes,extraEncodedReturnRequestBytes:after.returnEncodedRequestBytes-before.returnEncodedRequestBytes},limits:['Historical13 source roles are header/size candidates, not retrospective native digest assertions','Cold files remain within the old source-equivalent retention allowance; no total native/GPU/OS hard budget is established','The callback/factory model does not measure native decode/GC, latency or physical gesture performance','Return-model consumer frame remains modeled; the current native baseline followed Map exit/reentry','Other consumers keep independent coarse fallback images; only illustrations invoke suspension']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,localRgbaBefore:before.points[1].decodedSourceRgbaBytes,localRgbaAfter:after.points[1].decodedSourceRgbaBytes,returnRgbaBefore:before.points[2].decodedSourceRgbaBytes,returnRgbaAfter:after.points[2].decodedSourceRgbaBytes,extraReturnEncodedBytes:0,filesReleased:true}));
