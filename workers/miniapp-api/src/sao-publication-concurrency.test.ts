import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

test('slow distinct tile burst cannot evict an unfinished same-key read',async()=>{
 const reads=new Map<string,number>(),held:Array<()=>void>=[],corrupt=new Set<string>(),require=createRequire(import.meta.url);
 let hold=true;
 const source=readFileSync(new URL('./sao-publication.ts',import.meta.url),'utf8');
 const exports:Record<string,any>={};
 const controlledRead=async(url:URL)=>{
  if(!/\/\d{2}-\d{2}-\d+-\d+\.json$/u.test(url.pathname))return readFile(url);
  reads.set(url.href,(reads.get(url.href)??0)+1);
  const bytes=await readFile(url);if(hold)await new Promise<void>(resolve=>held.push(resolve));
  if(corrupt.delete(url.href)){const changed=Buffer.from(bytes);changed[50]^=1;return changed;}return bytes;
 };
 vm.runInNewContext(ts.transpileModule(source.replace('import.meta.url',JSON.stringify(new URL('./sao-publication.ts',import.meta.url).href)),
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
  {exports,URL,Date,require:(name:string)=>name==='node:fs/promises'?{readFile:controlledRead}:require(name)});
 const directory=new URL('../assets/sao-v2/',import.meta.url),service=new exports.SaoPublicationService(directory);
 const publication=(await service.get()).data,tiles=publication.index.tiles.slice(0,65),hash=publication.publicationHash;
 const requests=tiles.map((tile:any)=>service.tile(hash,tile.id));
 const drain=async()=>{for(let n=0;n<500&&held.length<65;n++)await new Promise(r=>setTimeout(r,2));};
 await drain();assert.equal(reads.size,65);assert.equal(held.length,65);
 const duplicate=service.tile(hash,tiles[0].id);await new Promise(r=>setTimeout(r,20));
 const first=new URL(tiles[0].file,directory).href,before={distinct:reads.size,total:[...reads.values()].reduce((a,b)=>a+b,0),first:reads.get(first),
  held:held.length,publicationHash:hash,burstSourceBytes:tiles.reduce((n:any,t:any)=>n+t.bytes,0),allTiles:publication.index.tiles.length};
 hold=false;for(const resolve of held.splice(0))resolve();const accepted=await Promise.all([...requests,duplicate]);
 const output=process.env.CLOUD_SKY_SAO_BURST_EVIDENCE;if(output)writeFileSync(output,JSON.stringify({before,accepted:accepted.length,
  sameEnvelope:accepted[0]===accepted.at(-1),scope:'Actual service/read/parse/hash/contract on real 65 v2 tiles. Slow-read adapter controls only settlement; not HTTP mixed-load frequency or production memory.'},null,2)+'\n',{flag:'wx'});
 assert.equal(before.first,1,'same-key read must remain coalesced while all 65 reads are unsettled');
 assert.equal(before.total,65);assert.equal(accepted[0],accepted.at(-1));
 const last=tiles.at(-1)!;
 for(const tile of tiles)await service.tile(hash,tile.id);
 const lastReady=await service.tile(hash,last.id);
 assert.equal(await service.tile(hash,last.id),lastReady,"completed retained tile reuses its immutable envelope");
 const firstBefore=reads.get(first)!;
 await service.tile(hash,tiles[0].id);assert.equal(reads.get(first),firstBefore+1,"65 completed distinct tiles still retire the oldest ready entry");
 const retryTile=publication.index.tiles[65],retryPath=new URL(retryTile.file,directory).href;corrupt.add(retryPath);
 await assert.rejects(service.tile(hash,retryTile.id),/sao_tile_asset_integrity/);
 assert.equal((await service.tile(hash,retryTile.id)).data.tile.rows.length,retryTile.rowCount);
 assert.equal(reads.get(retryPath),2,"failed in-flight read leaves a retryable key");
 const readCount=[...reads.values()].reduce((a,b)=>a+b,0);
 await assert.rejects(service.tile(hash,'../publication'),/sao_tile_not_found/);
 await assert.rejects(service.tile('0'.repeat(64),tiles[0].id),/sao_publication_not_found/);
 assert.equal([...reads.values()].reduce((a,b)=>a+b,0),readCount,"invalid keys never enter the in-flight table");
});
