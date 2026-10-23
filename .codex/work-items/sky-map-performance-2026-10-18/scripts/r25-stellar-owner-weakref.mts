// One local mechanism experiment, not phone evidence or a Scene stress run.
// Complete real modules + real admitted-shape SAO bytes; only the observation
// boundary is injected in memory. No production or frozen file is changed.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import * as contracts from '@starward/miniapp-contracts';
import * as vectors from '@starward/astronomy-core/stellar-vectors';
import * as projection from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import * as appearance from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance';
import * as exactTime from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-frame';
import * as saoAdmission from '../../../../apps/wechat-miniapp/src/services/sao-catalog-client';
import {createR25MemoryLifetimeObserver} from './r25-memory-lifetime-observer';
import {validateR25MemoryLifetime} from './r25-memory-lifetime-protocol.mjs';

const root=path.resolve(import.meta.dirname,'../../../..');
const output=process.argv[2];
if(!output||!path.isAbsolute(output))throw Error('new_absolute_output_required');
const gc=(globalThis as any).gc as (()=>void)|undefined;
if(!gc)throw Error('local_gc_required');
const require=createRequire(import.meta.url),ts=require('../../../../apps/wechat-miniapp/node_modules/typescript');
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const paths=['apps/wechat-miniapp/src/features/sky/sky-stellar-transform.ts',
  'apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts',
  '.codex/work-items/sky-map-performance-2026-10-18/scripts/r25-memory-lifetime-observer.ts'];
const contents=await Promise.all(paths.map(file=>fs.readFile(path.join(root,file),'utf8')));
const identities=paths.map((file,i)=>({file,sha256:sha(contents[i]!)}));
const load=(source:string,imports:Record<string,unknown>)=>{
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  assert.equal(compiled.diagnostics.filter((d:any)=>d.category===ts.DiagnosticCategory.Error).length,0);
  const module={exports:{}};
  vm.runInNewContext('(function(exports,require,module){'+compiled.outputText+'\n})')(
    module.exports,(name:string)=>{if(!Object.hasOwn(imports,name))throw Error('unexpected_import:'+name);return imports[name];},module);
  return module.exports as any;
};
const observer=createR25MemoryLifetimeObserver();
assert(observer.configure({generation:28,sourceHash:sha(contents[0]!+contents[1]!)}));
const anchor='  const transmissions:Array<number|undefined>=new Array(count);';
assert.equal(contents[0]!.split(anchor).length,2);
const transformSource='import { r25MemoryTrack } from "./r25-boundary";\n'+contents[0]!.replace(anchor,anchor+'\n'+
  '  r25MemoryTrack("stellar-vectors",vectors,count); r25MemoryTrack("stellar-positions",positions,count);\n'+
  '  r25MemoryTrack("stellar-directions",directions,count); r25MemoryTrack("stellar-transmissions",transmissions,count);');
const transform=load(transformSource,{
  './r25-boundary':{r25MemoryTrack:observer.track},'@starward/astronomy-core/stellar-vectors':vectors,
  './sky-view-projection':projection,'./sky-star-appearance':appearance,
});
const resolver=load(contents[1]!,{'@starward/miniapp-contracts':contracts,'./sky-time-frame':exactTime,
  './sky-stellar-transform':transform,'../../services/sao-catalog-client':saoAdmission});
const directory=path.join(root,'workers/miniapp-api/assets/sao-v2');
const indexBytes=await fs.readFile(path.join(directory,'index.json'));
const index=JSON.parse(indexBytes.toString('utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(directory,'publication.json'),'utf8'));
const publication={publicationHash:manifest.publicationHash,index};contracts.assertSaoIndexPublication(publication);
const references=index.tiles.filter((t:any)=>t.rowCount>0&&t.rowCount<=100&&t.minMagnitude<=7).slice(0,32);
assert.equal(references.length,32);
let tiles:any[]=await Promise.all(references.map(async(reference:any)=>{
  const bytes=await fs.readFile(path.join(directory,reference.file));
  assert.equal(sha(bytes),reference.sha256);assert.equal(bytes.length,reference.bytes);
  const value={publicationHash:publication.publicationHash,tile:JSON.parse(bytes.toString('utf8'))};
  contracts.assertSaoTilePublication(value,publication,reference);return value;
}));
const tileRows=tiles.reduce((total,tile)=>total+tile.tile.rows.length,0);
let checksum=0,consumedPoints=0;
function makeFrame(step:number){
  const at=new Date(Date.parse(contracts.STELLAR_GEOMETRY_REFERENCE_AT)+step*1000).toISOString();
  const observerPosition=Object.freeze({latitude:0,longitude:0,elevationM:0});
  const geometry=Object.freeze({format:contracts.STELLAR_GEOMETRY_FORMAT,referenceAt:contracts.STELLAR_GEOMETRY_REFERENCE_AT,
    catalogVersion:index.baseCatalogVersion,catalogHash:index.baseAssetSha256,at,observer:observerPosition,
    julianYears:step*1000/(365.25*86400000),equatorialToEnu:Object.freeze([0,1,0,-1,0,0,0,0,1])});
  const catalog={catalogVersion:index.baseCatalogVersion,catalogHash:index.baseAssetSha256};
  contracts.assertStellarGeometryFrame(geometry,{catalog,at,observer:observerPosition});
  const scene={state:'AVAILABLE',publication:catalog,observer:observerPosition,frames:[{at,state:'AVAILABLE',geometry}]};
  const frame=resolver.resolveSkyStellarSupplement(publication,tiles,scene,at);
  assert.equal(frame.pointCount,tileRows);
  for(let i=0;i<frame.pointCount;i++){
    const point=frame.points[i];
    checksum+=point[2]+point[3]+frame.displayTransmission(i);
    assert(frame.displayDirection(i));consumedPoints++;
  }
  assert(Number.isFinite(checksum));return frame;
}
const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));
async function drain(){for(let i=0;i<4;i++){await turn();gc!();}await turn();}
assert(observer.start());
let retainedA:any=makeFrame(0);
const aWitness=new WeakRef(retainedA);
let b:any=makeFrame(1);const bWitness=new WeakRef(b);b=null;
let c:any=makeFrame(2);const cWitness=new WeakRef(c);c=null;
const phases:any[]=[];
await drain();
assert.equal(retainedA.pointCount,tileRows); // explicit positive retaining root
assert.equal(aWitness.deref()!==undefined,true);
assert.equal(bWitness.deref(),undefined);assert.equal(cWitness.deref(),undefined);
observer.checkpoint('active-5');phases.push({phase:'A-root-held-after-A-B-C',a:true,b:false,c:false,tilesHeld:tiles.length});
retainedA=null;
await drain();
assert.equal(aWitness.deref(),undefined);
observer.checkpoint('paused');phases.push({phase:'A-root-released-current-tile-keys-held',a:false,b:false,c:false,tilesHeld:tiles.length});
tiles=[];
await drain();observer.checkpoint('retired');
phases.push({phase:'tile-keys-released',tilesHeld:tiles.length});
const receipt=observer.seal()!;assert(validateR25MemoryLifetime(receipt));
const held=receipt.checkpoints[1] as any,released=receipt.checkpoints[2] as any,retired=receipt.checkpoints[3] as any;
for(let i=0;i<4;i++){
  assert.equal(held.sites[i].allocations,96);assert.equal(held.sites[i].first.alive,32);
  assert.equal(held.sites[i].recent.witnesses,4);assert.equal(held.sites[i].recent.alive,2);assert.equal(held.sites[i].recent.collected,2);
  assert.equal(released.sites[i].first.collected,32);assert.equal(released.sites[i].recent.alive,2);
  assert.equal(retired.sites[i].first.collected,32);assert.equal(retired.sites[i].recent.collected,4);
}
const result={schema:'starward-r25-local-stellar-owner-weakref-v1',scope:'LOCAL_NODE_REAL_SAO_RESOLVER_WEAKMAP_REPLACEMENT_NOT_PHONE',
  node:process.version,sourceOwners:identities,indexSha256:sha(indexBytes),saoPublicationHash:publication.publicationHash,
  tileFiles:references.map((reference:any)=>({file:reference.file,sha256:reference.sha256,bytes:reference.bytes,rows:reference.rowCount})),
  geometry:'three-contract-valid-J2000-instants-1-second-apart-fixed-valid-rotation',tileObjects:32,tileRows,frames:3,
  consumedPoints,checksum,phases,receipt,
  limits:['Full resolver and transform modules transpiled in a local VM; fixed observation calls added only in memory',
    'Real SAO bytes and contract admission; no phone trace or production/publication mutation',
    'No React, Taro, host/native Canvas/GPU, real device collector or natural GC cadence',
    'No population leak percentage or phone no-leak conclusion; local forced GC is not a product repair']};
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,scope:result.scope,node:result.node,tileObjects:32,tileRows,frames:3,consumedPoints,
  firstA:{held:held.sites[0].first.alive,afterRelease:released.sites[0].first.collected},
  recent:{withTileKeys:released.sites[0].recent,afterTileRelease:retired.sites[0].recent},outputSha256:sha(await fs.readFile(output))}));
