import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {Module} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {FastifyAdapter,type NestFastifyApplication} from '@nestjs/platform-fastify';
import {SaoPublicationService} from './sao-publication.ts';
import {SaoPublicationController} from './sao-publication.controller.ts';
import {ApiExceptionFilter} from './api-exception.filter.ts';
import {EtagInterceptor} from './etag.interceptor.ts';
const directory=new URL('../assets/sao-v2/',import.meta.url);
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

test('hash-bound SAO raw GET/HEAD/304 preserve exact source bytes and existing envelope API',async()=>{
 class TestModule{}
 Module({controllers:[SaoPublicationController],providers:[{provide:SaoPublicationService,useValue:new SaoPublicationService()}]})(TestModule);
 const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
 app.useGlobalFilters(new ApiExceptionFilter());app.useGlobalInterceptors(new EtagInterceptor());
 try{
  await app.init();const http=app.getHttpAdapter().getInstance();await http.ready();
  const publication=(await new SaoPublicationService(directory).get()).data,expected=publication.index.tiles[0];
  const root='/v2/sky/supplements/sao/v2/'+publication.publicationHash;
  const route=root+'/assets/'+expected.id,source=await readFile(new URL(expected.file,directory));
  const raw=await http.inject({method:'GET',url:route});assert.equal(raw.statusCode,200);
  assert.deepEqual(raw.rawPayload,source);assert.equal(raw.rawPayload.length,expected.bytes);assert.equal(sha(raw.rawPayload),expected.sha256);
  assert.equal(raw.headers['content-type'],'application/json; charset=utf-8');
  assert.equal(raw.headers['cache-control'],'public, max-age=31536000, immutable');
  assert.equal(raw.headers['x-content-type-options'],'nosniff');assert.match(String(raw.headers['x-starward-data-source']),/SAO/);
  assert.equal(raw.headers.etag,`W/"${expected.sha256}"`);
  const conditional=await http.inject({method:'GET',url:route,headers:{'if-none-match':raw.headers.etag!}});
  assert.equal(conditional.statusCode,304);assert.equal(conditional.rawPayload.length,0);assert.equal(conditional.headers.etag,raw.headers.etag);
  const head=await http.inject({method:'HEAD',url:route});assert.equal(head.statusCode,200);assert.equal(head.rawPayload.length,0);
  assert.equal(Number(head.headers['content-length']),source.length);
  const old=await http.inject({method:'GET',url:root+'/tiles/'+expected.id});assert.equal(old.statusCode,200);
  const envelope=old.json();assert.equal(envelope.apiVersion,'v2');assert.deepEqual(envelope.data.tile,JSON.parse(source.toString()));assert.equal(envelope.sources[0].id,`sao:${publication.index.catalogHash}`);
  assert.equal((await http.inject({method:'GET',url:route,headers:{'if-none-match':'W/"'+'0'.repeat(64)+'"'}})).statusCode,200);
  assert.equal((await http.inject({method:'GET',url:route.replace(publication.publicationHash,'0'.repeat(64))})).statusCode,404);
  assert.equal((await http.inject({method:'GET',url:root+'/assets/unknown'})).statusCode,404);
 }finally{await app.close();}
});

function controlledService(read:(url:URL)=>Promise<Buffer>,mutate=false){
 const require=createRequire(import.meta.url),exports:Record<string,any>={};let source=readFileSync(new URL('./sao-publication.ts',import.meta.url),'utf8');
 const guard="if(bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('sao_tile_asset_integrity');";
 assert.equal(source.split(guard).length,2);if(mutate)source=source.replace(guard,'/* bounded mutation: raw byte guard removed */');
 vm.runInNewContext(ts.transpileModule(source.replace('import.meta.url',JSON.stringify(new URL('./sao-publication.ts',import.meta.url).href)),
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
  {exports,URL,Date,require:(name:string)=>name==='node:fs/promises'?{readFile:read}:require(name)});
 return new exports.SaoPublicationService(directory);
}

test('raw and envelope consumers coalesce an unfinished read, without retaining raw bytes in ready LRU',async()=>{
 let release!:()=>void,reads=0;const held=new Promise<void>(resolve=>{release=resolve;});
 const service=controlledService(async url=>{const b=await readFile(url);if(/\/\d{2}-\d{2}-\d+-\d+\.json$/u.test(url.pathname)){reads++;await held;}return b;});
 const publication=(await service.get()).data,expected=publication.index.tiles[0];
 const raw=service.asset(publication.publicationHash,expected.id);
 for(let i=0;i<500&&!reads;i++)await new Promise(r=>setTimeout(r,2));assert.equal(reads,1);
 const ordinary=service.tile(publication.publicationHash,expected.id);await new Promise(r=>setTimeout(r,5));assert.equal(reads,1);
 release();const [asset,envelope]=await Promise.all([raw,ordinary]);assert.equal(sha(asset.bytes),expected.sha256);assert.equal(envelope.data.tile.rows.length,expected.rowCount);
 assert.equal(await service.tile(publication.publicationHash,expected.id),envelope);assert.equal(reads,1);
 await service.asset(publication.publicationHash,expected.id);assert.equal(reads,2,'raw bytes are reverified, not retained with parsed ready entries');
});

test('valid JSON with changed raw bytes is rejected even when canonical parsed tile still matches',async()=>{
 const changedRead=async(url:URL)=>{const b=await readFile(url);return /\/\d{2}-\d{2}-\d+-\d+\.json$/u.test(url.pathname)?Buffer.concat([Buffer.from(' '),b]):b;};
 const service=controlledService(changedRead),publication=(await service.get()).data,expected=publication.index.tiles[0];
 await assert.rejects(service.asset(publication.publicationHash,expected.id),/sao_tile_asset_integrity/);
 const broken=controlledService(changedRead,true),escaped=await broken.asset(publication.publicationHash,expected.id);
 assert.notEqual(sha(escaped.bytes),expected.sha256,'removing the byte guard escapes canonical scientific validation');
});
