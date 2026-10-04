/** Independent opt-in source recovery/ETag and completed-frame controls. No listener/GPU. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {MINIAPP_API_BASE_PATH,SDSS_OPTICAL_PUBLICATIONS,isCelestialObjectReference,celestialReferenceKindMatches} from '../../../../packages/miniapp-contracts/src/index.ts';
import {matchingCelestialInformationResponse} from '../../../../apps/wechat-miniapp/src/services/celestial-information-response.ts';
import {registerSkyNativeImageLifetime,skyNativeImageIsCurrent} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),out=process.argv[2];
assert.match(out??'',/^output\/sdss-optical-provenance-independent-1002-r\d+$/u);
assert(!fs.existsSync(path.join(ROOT,out!)));fs.mkdirSync(path.join(ROOT,out!));
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const raw=(p:string)=>fs.readFileSync(path.join(ROOT,p));
const binding=(p:string)=>{const b=raw(p);return{path:p,bytes:b.length,sha256:hash(b)};};
const admitted=new Map<string,ReturnType<typeof binding>>();
const admit=(p:string,e?:{sha256?:string;bytes?:number})=>{const b=binding(p);if(e?.sha256)assert.equal(b.sha256,e.sha256,p);if(e?.bytes!==undefined)assert.equal(b.bytes,e.bytes,p);const previous=admitted.get(p);if(previous)assert.deepEqual(previous,b);admitted.set(p,b);return b;};
const save=(name:string,value:unknown)=>fs.writeFileSync(path.join(ROOT,out!,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(ROOT,out!,'executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const workerRequire=createRequire(path.join(ROOT,'workers/miniapp-api/package.json'));workerRequire('reflect-metadata');
const {Module}=workerRequire('@nestjs/common'),{NestFactory}=workerRequire('@nestjs/core'),{FastifyAdapter}=workerRequire('@nestjs/platform-fastify');
let app:any;
try{
 const sourcePaths=['workers/miniapp-api/src/sdss-optical-imagery.ts','workers/miniapp-api/src/celestial-object-information.ts','workers/miniapp-api/src/controller.ts','workers/miniapp-api/src/miniapp-service.ts','workers/miniapp-api/src/etag.interceptor.ts','workers/miniapp-api/src/api-exception.filter.ts','workers/miniapp-api/src/test-fixtures/create-test-service.ts','apps/wechat-miniapp/src/services/sdss-optical-client.ts','apps/wechat-miniapp/src/services/bare-sky-resource.ts','apps/wechat-miniapp/src/services/api-client.ts','apps/wechat-miniapp/src/services/celestial-information-response.ts','apps/wechat-miniapp/src/hooks/use-celestial-information.ts','apps/wechat-miniapp/src/sky/sources/index.tsx','apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx','apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts','packages/miniapp-contracts/src/sdss-science-optical-publication.ts','packages/miniapp-contracts/src/sdss-optical-publication.ts'];
 for(const p of sourcePaths){const b=admit(p);const destination=path.join(ROOT,out!,'source-inputs',p);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,raw(p),{flag:'wx'});assert.equal(hash(fs.readFileSync(destination)),b.sha256);}
 const manifestPath='output/sdss-science-optical-writer-1002-r1/publication/manifest.json';
 admit(manifestPath,{bytes:18078,sha256:'3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5'});
 const manifest=JSON.parse(raw(manifestPath).toString('utf8')),opticalHash=manifest.publicationHash;
 assert.equal(opticalHash,'34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0');
 const author='output/sdss-science-optical-transport-1002-r2';
 admit(author+'/result.json',{bytes:4663,sha256:'3878b7a6fb050be0cced915337e36033bd8336b3aa555a031e4fb8a8a35775ad'});
 const authorResult=JSON.parse(raw(author+'/result.json').toString('utf8'));admit(authorResult.observations.path,authorResult.observations);
 const authorRaw=JSON.parse(raw(authorResult.observations.path).toString('utf8'));admit(author+'/binding-before.json');admit(author+'/binding-after.json');
 const authorBindings=JSON.parse(raw(author+'/binding-before.json').toString('utf8'));assert.equal(authorBindings.length,457);assert.deepEqual(JSON.parse(raw(author+'/binding-after.json').toString('utf8')),authorBindings);
 for(const b of authorBindings)admit(b.path,b);
 admit(authorResult.finalOwner.path,authorResult.finalOwner);const authorFinal=JSON.parse(raw(authorResult.finalOwner.path).toString('utf8'));assert.equal(authorFinal.applicationClosed,true);assert.equal(authorFinal.listening,false);
 assert.deepEqual(authorRaw.direct.scienceManifest,manifest);assert.deepEqual(authorRaw.httpManifest.body,manifest);assert.equal(authorRaw.httpManifest.status,200);
 assert.deepEqual(authorRaw.client.actualManifest,manifest);assert.equal(authorRaw.client.defaultHash,SDSS_OPTICAL_PUBLICATIONS['M:51'].publicationHash);assert.equal(authorRaw.client.aborts,1);assert.equal(authorRaw.client.preabortRequests,0);
 const httpImages=[];
 for(const r of authorRaw.images){const a=manifest.levels[r.level];admit(r.actual.path,a);admit(r.source.path,a);assert.deepEqual(raw(r.actual.path),raw(r.source.path));assert.equal(r.directBytes,a.bytes);
  for(const[k,v]of Object.entries({'content-type':'image/png','cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff','x-starward-image-source':'Sloan Digital Sky Survey - DR17 optical','x-starward-image-field-degrees':String(a.fieldDegrees),'content-length':String(a.bytes)}))assert.equal(r.headers[k],v);
  httpImages.push({level:r.level,actual:binding(r.actual.path),sameWriterBytes:true,headersExact:true});}
 assert.equal(httpImages.length,3);assert.equal(httpImages.reduce((n,r)=>n+r.actual.bytes,0),949846);assert(authorRaw.httpControls.every((r:any)=>r.status===404));
 assert.deepEqual(authorRaw.information.map((r:any)=>r.condition),['default-v1','explicit-v2','unknown-optical-hash','foreign-optical-reference']);
 for(const r of authorRaw.information){const value=r.body;assert.equal(value.data.reference,r.condition==='foreign-optical-reference'?'M:82':'M:51');assert.deepEqual(value.sources,value.data.sources);
  if(r.condition==='explicit-v2'){assert.equal(value.dataState,'FRESH');assert(value.data.sources.some((s:any)=>s.id==='optical-imagery:'+manifest.publicationId+':'+opticalHash));}
  else if(r.condition==='default-v1'){assert.equal(value.dataState,'FRESH');assert(value.data.sources.some((s:any)=>s.id.endsWith(':'+SDSS_OPTICAL_PUBLICATIONS['M:51'].publicationHash)));}
  else {assert.equal(value.dataState,'PARTIAL');assert(value.warnings.includes('sdss_optical_publication_unavailable'));assert(!value.data.sources.some((s:any)=>s.id.startsWith('optical-imagery:')));}
  assert(value.data.sources.some((s:any)=>s.id.startsWith('catalog:')));assert(value.data.sources.some((s:any)=>s.id.startsWith('imagery:')));
 }
 assert.equal(authorRaw.direct.scienceSource.id,'optical-imagery:'+manifest.publicationId+':'+opticalHash);assert.equal(authorRaw.direct.defaultManifestHash,SDSS_OPTICAL_PUBLICATIONS['M:51'].publicationHash);
 const {SdssOpticalImageryService}=await import('../../../../workers/miniapp-api/src/sdss-optical-imagery.ts');
 const {MiniappController}=await import('../../../../workers/miniapp-api/src/controller.ts');
 const {MiniappService}=await import('../../../../workers/miniapp-api/src/miniapp-service.ts');
 const {createTestMiniappService}=await import('../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts');
 const {EtagInterceptor}=await import('../../../../workers/miniapp-api/src/etag.interceptor.ts');
 const {ApiExceptionFilter}=await import('../../../../workers/miniapp-api/src/api-exception.filter.ts');
 class RecoverableOptical extends SdssOpticalImageryService {
  unavailable=true;sourceCalls=0;
  override source(reference:string,expected?:string){this.sourceCalls++;if(this.unavailable)throw new Error('independent_control_source_owner_unavailable');return super.source(reference,expected);}
 }
 const optical=new RecoverableOptical({sciencePublications:[{reference:'M:51',expectedHash:opticalHash,manifestUrl:pathToFileURL(path.join(ROOT,manifestPath))}]});
 const service=createTestMiniappService({sdssOpticalImages:optical});
 class TestModule{};Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
 app=await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});app.useGlobalFilters(new ApiExceptionFilter());app.useGlobalInterceptors(new EtagInterceptor());await app.init();
 const http=app.getHttpAdapter().getInstance(),w3Hash=service.deepSkyImages.discovery('M:51').publicationHash;
 assert.notEqual(w3Hash,opticalHash);
 const base='/v2/celestial-objects/M%3A51?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash='+w3Hash;
 const url=base+'&opticalPublicationHash='+opticalHash,observations:any[]=[];
 const request=async(label:string,target:string,etag?:string)=>{const r=await http.inject({method:'GET',url:target,...(etag?{headers:{'if-none-match':etag}}:{})});const row={label,status:r.statusCode,etag:r.headers.etag??null,body:r.rawPayload.toString('utf8'),sourceCalls:optical.sourceCalls};observations.push(row);return r;};
 const first=await request('optical-unavailable',url);assert.equal(first.statusCode,200);const partial=first.json();
 assert.equal(partial.dataState,'PARTIAL');assert.deepEqual(partial.sources,partial.data.sources);assert(partial.warnings.includes('sdss_optical_publication_unavailable'));
 assert(!partial.data.sources.some((s:any)=>s.id.startsWith('optical-imagery:')));assert(partial.data.sources.some((s:any)=>s.id.endsWith(':'+w3Hash)));
 matchingCelestialInformationResponse(partial,'M:51',w3Hash,opticalHash);assert.equal(optical.sourceCalls,1);
 const repeated=await request('still-partial-conditional',url,first.headers.etag);assert.equal(repeated.statusCode,304);assert.equal(optical.sourceCalls,2,'PARTIAL is not service-cached');
 optical.unavailable=false;const recovered=await request('recovered-exact-version',url,first.headers.etag);assert.equal(recovered.statusCode,200);const complete=recovered.json();
 assert.equal(complete.dataState,'FRESH');assert.deepEqual(complete.data.facts,partial.data.facts);assert.deepEqual(complete.data.aliases,partial.data.aliases);assert.deepEqual(complete.warnings,[]);
 assert.notEqual(recovered.headers.etag,first.headers.etag);assert.deepEqual(complete.sources,complete.data.sources);
 const sourceId='optical-imagery:'+manifest.publicationId+':'+opticalHash;assert(complete.data.sources.some((s:any)=>s.id===sourceId));matchingCelestialInformationResponse(complete,'M:51',w3Hash,opticalHash);
 const callsAfterRecovery=optical.sourceCalls;const warm=await request('recovered-conditional',url,recovered.headers.etag);assert.equal(warm.statusCode,304);assert.equal(optical.sourceCalls,callsAfterRecovery);
 for(const [label,pin,reference] of [['unknown-optical','0'.repeat(64),'M:51'],['w3-as-optical',w3Hash,'M:51'],['foreign-reference',opticalHash,'M:82']] as const){
  const target='/v2/celestial-objects/'+encodeURIComponent(reference)+'?deepSkyImageVersion=source-finite-v3&opticalPublicationHash='+pin;
  const response=await request(label,target);assert.equal(response.statusCode,200);const value=response.json();assert.equal(value.dataState,'PARTIAL');assert(!value.data.sources.some((s:any)=>s.id.startsWith('optical-imagery:')));assert(value.warnings.includes('sdss_optical_publication_unavailable'));matchingCelestialInformationResponse(value,reference,undefined,pin);
 }
 const malformed=await request('malformed-optical',base+'&opticalPublicationHash=');assert.equal(malformed.statusCode,400);
 const nonDeep=await request('nondeep-optical','/v2/celestial-objects/HR%3A7001?opticalPublicationHash='+opticalHash);assert.equal(nonDeep.statusCode,400);

 // Execute the exact changed client/cache/link/hook functions in narrow, declared AST VMs.
 const extract=(p:string,name:string)=>{const source=ts.createSourceFile(p,raw(p).toString('utf8'),ts.ScriptTarget.Latest,true);const found=source.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(found.length,1);return found[0]!.getText(source).replace(/^export\s+/u,'');};
 const execute=(body:string,bindings:object)=>vm.runInNewContext(ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
 const api='apps/wechat-miniapp/src/services/api-client.ts',linkText=extract(api,'deepSkyManifestUrl');
 const download=execute(linkText+'\ndeepSkyManifestUrl;',{SDSS_OPTICAL_PUBLICATIONS,MINIAPP_API_BASE_PATH,__MINIAPP_API_BASE__:'https://independent.invalid'}) as (s:string,h?:string)=>string|undefined;
 assert.equal(download(sourceId,opticalHash),'https://independent.invalid/v2/sky/sdss-optical/'+opticalHash+'/manifest');assert.equal(download(sourceId),undefined);
 const old=SDSS_OPTICAL_PUBLICATIONS['M:51'],oldId='optical-imagery:'+old.publicationId+':'+old.publicationHash;
 for(const wrong of [opticalHash,w3Hash,'','not-a-hash'])assert.equal(download(oldId,wrong),undefined);
 assert.equal(download(oldId),'https://independent.invalid/v2/sky/sdss-optical/'+old.publicationHash+'/manifest');
 const guard='expectedOpticalHash === undefined || expectedOpticalHash === optical.publicationHash';assert.equal(linkText.split(guard).length,2);
 const badLink=linkText.replace(guard,'true /* independent bounded missing old-link pin guard */');fs.writeFileSync(path.join(ROOT,out!,'mutated-old-link-guard.ts.txt'),badLink,{flag:'wx'});
 const mutantDownload=execute(badLink+'\ndeepSkyManifestUrl;',{SDSS_OPTICAL_PUBLICATIONS,MINIAPP_API_BASE_PATH,__MINIAPP_API_BASE__:'https://independent.invalid'});
 assert.equal(mutantDownload(oldId,opticalHash),'https://independent.invalid/v2/sky/sdss-optical/'+old.publicationHash+'/manifest');
 const requestCalls:any[]=[];const get=execute(extract(api,'getCelestialObjectInformation')+'\ngetCelestialObjectInformation;',{isCelestialObjectReference,DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION:'source-finite-v3',ADOPTED_SKY_REPORT_CATALOG_VERSION:'bsc5p-bright-stars.v3',matchingCelestialInformationResponse,
  requestOperation:async(key:string,operation:string,input:any)=>{requestCalls.push({key,operation,input});return complete;},invalidateApiCache:(key:string)=>{throw new Error('unexpected invalidation '+key);}});
 await get('M:51',undefined,w3Hash,opticalHash);assert(requestCalls[0].key.includes(':optical:'+opticalHash+':M:51'));assert(requestCalls[0].input.query.includes('&deepSkyPublicationHash='+w3Hash));assert(requestCalls[0].input.query.includes('&opticalPublicationHash='+opticalHash));
 const oldCalls=requestCalls.length;for(const invalid of ['','not-a-hash'])assert.throws(()=>get('M:51',undefined,w3Hash,invalid));assert.equal(requestCalls.length,oldCalls);

 // The actual completed-frame predicate must not touch a newer loader's publication.
 const page='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',ast=ts.createSourceFile(page,raw(page).toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const nodes:ts.Node[]=[];const walk=(n:ts.Node)=>{nodes.push(n);ts.forEachChild(n,walk);};walk(ast);
 const presented=nodes.filter((n):n is ts.VariableDeclaration=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='sdssOpticalImagePresented');assert.equal(presented.length,1);
 const spreads=nodes.filter((n):n is ts.JsxSpreadAttribute=>ts.isJsxSpreadAttribute(n)&&n.expression.getText(ast).includes('opticalPublicationHash: presentedSkyFrame'));assert.equal(spreads.length,1);
 let live=true,latestReads=0;const image={};const retire=registerSkyNativeImageLifetime(image,()=>live);
 const latest=new Proxy({},{get(){latestReads++;throw new Error('completed-frame pin touched latest loader');}});
 const initial={presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:390,height:844},presentedSkyFrame:{sdssOpticalImage:{image,reference:'M:51',publicationHash:opticalHash}},selectedCatalogObject:{reference:'M:51'},sdssOptical:latest,skyNativeImageIsCurrent};
 const pagePin=(changes:object={})=>{const state={...initial,...changes};const shown=execute('('+presented[0]!.initializer!.getText(ast)+')',state);return execute('('+spreads[0]!.expression.getText(ast)+')',{...state,sdssOpticalImagePresented:shown});};
 fs.writeFileSync(path.join(ROOT,out!,'actual-completed-frame-predicate-and-modal.ts.txt'),presented[0]!.getText(ast)+'\n'+spreads[0]!.getText(ast)+'\n',{flag:'wx'});
 assert.equal(pagePin().opticalPublicationHash,opticalHash);assert.equal(latestReads,0);
 for(const change of [{presentedSceneCurrent:false},{nativeCanvasMounted:false},{canvasSize:{width:0,height:844}},{presentedSkyFrame:null},{selectedCatalogObject:{reference:'M:82'}}])assert.equal(Object.keys(pagePin(change)).length,0);
 live=false;assert.equal(Object.keys(pagePin()).length,0);live=true;retire();assert.equal(Object.keys(pagePin()).length,0);assert.equal(latestReads,0);
 const wrongEnvelope=structuredClone(complete);const envelopeOptical=wrongEnvelope.sources.find((s:any)=>s.id.startsWith('optical-imagery:'));envelopeOptical.id=oldId;
 assert.throws(()=>matchingCelestialInformationResponse(wrongEnvelope,'M:51',w3Hash,opticalHash),/optical_source_invalid/u);
 const validatorPath='apps/wechat-miniapp/src/services/celestial-information-response.ts',validator=extract(validatorPath,'matchingCelestialInformationResponse');
 const envelopeGuard='!envelopeOpticalSources || envelopeOpticalSources.length !== opticalSources.length ||\r\n      envelopeOpticalSources.some(source => !opticalSources.some(candidate => candidate.id === source.id))';
 const actualGuard=validator.includes(envelopeGuard)?envelopeGuard:envelopeGuard.replaceAll('\r\n','\n');assert.equal(validator.split(actualGuard).length,2);
 const badValidator=validator.replace(actualGuard,'false /* independent bounded missing envelope identity guard */');fs.writeFileSync(path.join(ROOT,out!,'mutated-envelope-optical-guard.ts.txt'),badValidator,{flag:'wx'});
 const mutantMatch=execute(badValidator+'\nmatchingCelestialInformationResponse;',{isCelestialObjectReference,celestialReferenceKindMatches});assert.strictEqual(mutantMatch(wrongEnvelope,'M:51',w3Hash,opticalHash),wrongEnvelope);
 await app.close();app=null;const before=[...admitted.values()],after=before.map(b=>binding(b.path));assert.deepEqual(after,before);
 save('http-observations.json',observations);save('result.json',{status:'INDEPENDENT_OPTICAL_PROVENANCE_BOUNDARY_PASS',opticalHash,w3Hash,sourceId,authorTransportReadback:{result:binding(author+'/result.json'),actual:binding(authorResult.observations.path),boundInputs:457,httpImages,notNewHttpPngRun:true},actualConditionalStatuses:observations.map(r=>({label:r.label,status:r.status,etag:r.etag,sourceCalls:r.sourceCalls})),
  partialNotServiceCached:true,recoveredCatalogFactsExact:true,recoveredSourcesExact:true,actualPageCompletedPin:{latestLoaderReads:latestReads,paintedHashPreserved:true,invalidOrRetiredNotPinned:true},
  oldLinkFreshMismatchRejected:true,clientCacheAndQuerySeparate:true,mutations:{oldLinkMissingGuardCaught:true,envelopeOpticalMismatchGuardCaught:true},
  scope:['Actual Nest HTTP inject has no listener, with exact real writer descriptor and bounded source-owner availability failure. No synthetic science PNG, FITS, new download, GPU or native decode.',
   'AST VM checks are narrow actual function/predicate executions with declared operation and DOM controls. They do not certify full Tanstack/UI lifecycle or normal v2 Hook/pair rendering. The pixel/frame object is a registered structural sentinel, not a decoded native bitmap.',
   'Runtime registry/default unchanged; opt-in transport and provenance identity only. No source/color/PSF/absolute-astrometry quality adoption, 200DAU capacity or target WEAPP/final experience acceptance.']});
 save('binding.json',{inputsBefore:before,inputsAfter:after,unchanged:true});console.log(JSON.stringify({result:binding(out!+'/result.json'),binding:binding(out!+'/binding.json'),httpCases:observations.length,opticalHash,w3Hash}));
}catch(cause){if(app)await app.close();save('failed.json',{status:'FAILED_INDEPENDENT_OPTICAL_PROVENANCE_PROBE',error:String(cause),inputs:[...admitted.values()]});throw cause;}
