// Task-only diagnosis of the current cache with real immutable SAO files.
// All mutations are in-memory. No live file cache, device or network is used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createSkyPublicImageCache, type PublicSkyFileDescriptor, type SkyPublicImageFileSystem}
  from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts';
const [output, expectation = 'defect'] = process.argv.slice(2);
if(!output)throw Error('new_output_required');
assert(['defect','fixed'].includes(expectation));
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=await fs.readFile(path.join(root,'apps/wechat-miniapp/src/services/sky-public-image-cache.ts'));
const bound=/const MAX_INDEX_BYTES = (\d+) \* 1024;/.exec(source.toString());
assert(bound); const indexLimit=Number(bound[1])*1024,byteBudget=32*1024*1024;
const assetRoot=path.join(root,'workers/miniapp-api/assets/sao-v2');
const indexBytes=await fs.readFile(path.join(assetRoot,'index.json'));
const index=JSON.parse(indexBytes.toString());
const ordered=[...index.tiles].sort((a,b)=>a.bytes-b.bytes || a.id.localeCompare(b.id));
const environment='e'.repeat(64),cacheRoot='/task-fixture/sky-public-images-v1',clock=1793000000000;
const metadata=(tile:any,ordinal:number)=>({environment,format:'json' as const,sha256:tile.sha256,
  bytes:tile.bytes,file:`stage-catalog_${environment}_${tile.sha256}_seed-${ordinal}`,last:clock});
const entries:ReturnType<typeof metadata>[]=[],selected:any[]=[];
const encoded=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
for(const tile of ordered){
  const next=metadata(tile,entries.length+1);
  if(encoded({version:2,entries:[...entries,next]}).byteLength>indexLimit)break;
  entries.push(next);selected.push(tile);
}
const seedBody=encoded({version:2,entries}),seedBytes=entries.reduce((n,e)=>n+e.bytes,0);
assert(entries.length>100 && seedBody.length<=indexLimit);
const candidates=ordered.slice(entries.length,entries.length+2);assert.equal(candidates.length,2);
assert(seedBytes+Math.max(...candidates.map(t=>t.bytes))<byteBudget,'encoded byte budget must have room');
const files=new Map<string,ArrayBuffer>(),bodies=new Map<string,ArrayBuffer>();
for(const tile of [...selected,...candidates]){
  const bytes=await fs.readFile(path.join(assetRoot,tile.file));
  assert.equal(bytes.length,tile.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),tile.sha256);
  bodies.set(tile.sha256,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer);
}
for(const entry of entries)files.set(cacheRoot+'/'+entry.file,bodies.get(entry.sha256)!);
files.set(cacheRoot+'/index-v2.json',seedBody.buffer as ArrayBuffer);
let indexReadBytes=0,indexWriteBytes=0,transfers=0;
const removed:string[]=[];
const fileSystem:SkyPublicImageFileSystem={
  async mkdir(){},async list(dir){return [...files.keys()].filter(p=>p.startsWith(dir+'/')).map(p=>p.slice(dir.length+1));},
  async size(file){const value=files.get(file);if(!value)throw Error('missing');return value.byteLength;},
  async read(file,length){const value=files.get(file);if(!value)throw Error('missing');
    if(file.includes('/index-'))indexReadBytes+=length;return value.slice(0,length);},
  async write(file,body){if(file.includes('/index-'))indexWriteBytes+=body.byteLength;files.set(file,body.slice(0));},
  async rename(from,to){const value=files.get(from);if(!value)throw Error('missing');files.set(to,value);files.delete(from);},
  async remove(file){removed.push(file);files.delete(file);},
};
const cache=createSkyPublicImageCache({fs:fileSystem,root:cacheRoot,byteBudget,maxFileBytes:16*1024*1024,
  ioByteBudget:16*1024*1024,session:'index_diagnosis',now:()=>clock,
  transfer(asset){transfers++;return {promise:Promise.resolve(bodies.get(asset.sha256)!.slice(0)),cancel(){}};}});
await cache.ready();
const descriptor=(tile:any):PublicSkyFileDescriptor=>({environment,sha256:tile.sha256,bytes:tile.bytes,
  format:'json',url:'https://fixture.invalid/'+tile.file});
const held=await cache.acquire(descriptor(selected[0])).promise;
const settle=async()=>{for(let i=0;i<100 && cache.inspect().running;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(cache.inspect().running,0);};
await settle();const before=cache.inspect(),attempts=[];
for(const tile of candidates){
  let failure:string|null=null;
  try{const lease=await cache.acquire(descriptor(tile)).promise;lease.release();}
  catch(error){failure=error instanceof Error?error.message:'unknown';}
  await settle();
  const after=cache.inspect();
  if(expectation==='defect') {
    assert.equal(failure,'sky_public_image_index_limit');
    assert.equal(after.entries,before.entries);assert.equal(after.bytes,before.bytes);
  } else {
    assert.equal(failure,null);
    assert(after.bytes<=byteBudget);
    assert(files.get(cacheRoot+'/index-v2.json')!.byteLength<=indexLimit);
    assert(entries.some(entry=>removed.includes(cacheRoot+'/'+entry.file)), 'index admission must actually evict idle content');
  }
  assert(held.isCurrent(),'diagnosis must not retire a held reader');
  attempts.push({bytes:tile.bytes,failure,entries:after.entries,encodedBytes:after.bytes,
    unusedEncodedBudget:byteBudget-after.bytes,heldReaderCurrent:held.isCurrent(),
    durableIndexBytes:files.get(cacheRoot+'/index-v2.json')!.byteLength});
}
held.release();
const result={scope:'ISOLATED_CURRENT_CACHE_REAL_SAO_BYTES_NOT_DEVICE_ACCEPTANCE',
  sourceSha256:createHash('sha256').update(source).digest('hex'),saoIndexSha256:createHash('sha256').update(indexBytes).digest('hex'),
  indexLimit,seedIndexBytes:seedBody.byteLength,seedEntries:entries.length,seedEncodedBytes:seedBytes,byteBudget,
  unleasedSeedEntries:entries.length-1,attempts,transfers,indexReadBytes,indexWriteBytes,
  originalSeedFilesRemoved:entries.filter(entry=>removed.includes(cacheRoot+'/'+entry.file)).length,
  defectReproduced:expectation==='defect',repairVerified:expectation==='fixed',
  limitations:['Seeded valid warm inventory, not an actual phone cache readback.',
    'Confirms this admission behavior only; does not prove every phone failure or OOM has this cause.',
    'Owner-level real-byte evidence is not phone performance or product acceptance.']};
await fs.writeFile(output,JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify(result));
