/** Saved actual Scene receipt → exact publication → current source consumers.
 * Native object liveness, router, hooks and I/O are controlled boundaries here;
 * this is neither another GPU run nor native Back acceptance. */
import "reflect-metadata";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import * as contracts from "../../../../packages/miniapp-contracts/src/index.ts";
import { SdssOpticalImageryService } from "../../../../workers/miniapp-api/src/sdss-optical-imagery.ts";
import { MiniappController } from "../../../../workers/miniapp-api/src/controller.ts";
import { MiniappService } from "../../../../workers/miniapp-api/src/miniapp-service.ts";
import { EtagInterceptor } from "../../../../workers/miniapp-api/src/etag.interceptor.ts";
import { ApiExceptionFilter } from "../../../../workers/miniapp-api/src/api-exception.filter.ts";
import { createTestMiniappService } from "../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts";
import { skyTargetOpticalFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame.ts";
import { completeTargetSkyOptical, liveSkyOpticalCompletion } from "../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-completion.ts";
import { registerSkyNativeImageLifetime } from "../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts";
import { skyOpticalSourceCredit } from "../../../../apps/wechat-miniapp/src/features/sky/sky-optical-source-credit.ts";
import { matchingCelestialInformationResponse } from "../../../../apps/wechat-miniapp/src/services/celestial-information-response.ts";
import { celestialInformationPartialDetail } from "../../../../apps/wechat-miniapp/src/services/celestial-information-presentation.ts";
import { transportHarness } from "../../../../apps/wechat-miniapp/src/services/api-request-test-support.ts";
import { isProductSource, SOURCE_KIND_LABEL } from "../../../../apps/wechat-miniapp/src/utils/source-presentation.ts";
const ROOT=resolve("."), TASK=".codex/work-items/cloud-sky-native-2026-09-22";
const outputPath=process.argv[2]??"output/new-science-source-chain-1003-r1";
assert.match(outputPath,/^output\/new-science-source-chain-1003-r[1-9][0-9]*$/u);
const OUT=join(ROOT,outputPath);
const APP="apps/wechat-miniapp/src/", SKY=APP+"features/sky/";
const sha=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");
const bind=(path:string)=>{const bytes=readFileSync(join(ROOT,path));return {path,bytes:bytes.length,sha256:sha(bytes)}};
const read=(path:string)=>readFileSync(join(ROOT,path),"utf8");
const save=(file:string,value:unknown)=>writeFileSync(join(OUT,file),JSON.stringify(value,null,2)+"\n",{flag:"wx"});
mkdirSync(OUT); // Exclusive, never overwrite a prior run.
const capturePath="output/playwright/cloud-sky-new-science-lod-1003-r1/observations.json";
assert.equal(bind(capturePath).sha256,"063946fba9e22e0b371e95bd787d1ba90976ecc6169574d46cdf4f719122a0fa");
const capture=JSON.parse(read(capturePath));
const datasets=[
 {name:"partial-fixed",dir:"output/partial-science-publication-1003-r1",manifestSha:"5a8696100a2ccc6e1279a720a731252a9262f378644f12aaa9ed919704962163",hash:"12b07bb699f494abbb8ecc95a523d5f65f6cb511839bc7d18cb958a0d795129a"},
 {name:"frozen-zscale",dir:"output/frozen-zscale-publication-1003-r1",manifestSha:"8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368",hash:"3f98c194d5ab2ea8935a0eb87c37fbc23d4a8fee5f1f7539a72e7c9b0e7acf7b"},
].map(row=>{
 assert.equal(bind(row.dir+"/manifest.json").sha256,row.manifestSha);
 const owner=new SdssOpticalImageryService({sciencePublications:[{reference:"M:51",expectedHash:row.hash,manifestUrl:pathToFileURL(join(ROOT,row.dir,"manifest.json"))}]});
 const manifest=owner.manifest(row.hash);contracts.assertSdssScienceOpticalManifest(manifest,"M:51",row.hash);
 for(const asset of Object.values(manifest.levels)) assert.equal(bind(row.dir+"/"+asset.file).sha256,asset.sha256);
 return {...row,manifest};
});
const protectedRows=JSON.parse(read(TASK+"/tmp/resume-preserved-hashes-2026-10-01.json"));
const paths=new Set([TASK+"/scripts/experience-new-science-source-chain-2026-10-03.mts",capturePath,
 ...protectedRows.map((row:any)=>row.path),...datasets.flatMap(d=>[d.dir+"/manifest.json",...Object.values(d.manifest.levels).map(a=>d.dir+"/"+a.file)]),
 ...["sky-sdss-optical-frame.ts","sky-sdss-optical-completion.ts","sky-artwork-loader.ts","sky-target-optical-identity.ts","sky-optical-source-credit.ts","sky-optical-image-credit.tsx","spot-sky-page.tsx"].map(p=>SKY+p),
 ...["services/api-client.ts","services/celestial-information-response.ts","services/celestial-information-presentation.ts","services/api-request-test-support.ts","services/response-cache.ts","services/cache-policy.ts","services/request-lifecycle.ts","hooks/use-celestial-information.ts","sky/sources/index.tsx","components/provenance.tsx","utils/source-presentation.ts"].map(p=>APP+p),
 ...["sdss-optical-imagery.ts","celestial-object-information.ts","controller.ts","miniapp-service.ts","etag.interceptor.ts","api-exception.filter.ts","test-fixtures/create-test-service.ts"].map(p=>"workers/miniapp-api/src/"+p),
 "packages/miniapp-contracts/src/sdss-science-optical-publication.ts"]);
const before=[...paths].map(bind);save("inputs-before.json",before);
for(const row of protectedRows) assert.equal(bind(row.path).sha256,row.sha256);
for(const row of before.filter(row=>!row.path.startsWith("output/")&&!protectedRows.some((p:any)=>p.path===row.path)))
 writeFileSync(join(OUT,"executed-"+row.path.replaceAll("/","__")+".txt"),read(row.path),{flag:"wx"});
function ast(path:string){return ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)}
function execute(code:string,bindings:object){return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText,{...contracts,...bindings},{timeout:3000})}
function fn(path:string,name:string,bindings:object){const source=ast(path),declaration=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(declaration);return execute(declaration.getText(source).replace(/^export\s+(?:default\s+)?/u,"")+`\n${name};`,bindings)}
const page=ast(SKY+"spot-sky-page.tsx"),expressions=new Map<string,string>();let caption="",back="";
function visit(node:ts.Node){
 if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer&&["presentedSdssOptical","opticalImageCredit","openOpticalSources"].includes(node.name.text))expressions.set(node.name.text,node.initializer.getText(page));
 if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(page)==="SkyOpticalImageCredit")caption=node.getText(page);
 if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(page)==="NativeBackBoundary"){
  const attr=node.attributes.properties.find(n=>ts.isJsxAttribute(n)&&n.name.getText(page)==="active") as ts.JsxAttribute;
  assert(attr.initializer&&ts.isJsxExpression(attr.initializer)&&attr.initializer.expression);back=attr.initializer.expression.getText(page);
 }ts.forEachChild(node,visit);
}visit(page);assert(caption&&back&&expressions.size===3);
const React={createElement:(type:any,props:any,...children:any[])=>typeof type==="function"?type({...props,children}):({type,props:props??{},children})};
function nodes(node:any):any[]{if(Array.isArray(node))return node.flatMap(nodes);if(!node||typeof node!=="object"||!("type" in node))return [];return [node,...nodes(node.children)]}
const text=(tree:any)=>nodes(tree).filter(n=>n.type==="Text").flatMap(n=>n.children).filter(v=>typeof v==="string");
const Credit=fn(SKY+"sky-optical-image-credit.tsx","SkyOpticalImageCredit",{React,View:"View",Text:"Text",Button:"Button"});
const observations:any={scope:"Saved actual Scene receipts/identities and original sealed real publications, current completion/caption/page action, Nest/Fastify/controller HTTP, current client/cache/Hook/Source/Provenance consumers. Native images are fresh controlled lifetime objects, not saved native handles. React/hook/router/clipboard I/O is controlled. Not GPU rerun, full page mounting, actual router Back, native composition, adoption, quality or capacity acceptance.",datasets:[],independentReview:"MISSING"};
const service=new SdssOpticalImageryService({sciencePublications:datasets.map(d=>({reference:"M:51",expectedHash:d.hash,manifestUrl:pathToFileURL(join(ROOT,d.dir,"manifest.json"))}))});
class TestModule{}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:createTestMiniappService({sdssOpticalImages:service})}]})(TestModule);
const app=await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});
app.useGlobalFilters(new ApiExceptionFilter());app.useGlobalInterceptors(new EtagInterceptor());
try{
 await app.init();const http=app.getHttpAdapter().getInstance();
 const infos:any[]=[];
 for(const dataset of datasets){
  const information=await http.inject({method:"GET",url:`/v2/celestial-objects/M%3A51?deepSkyImageVersion=source-finite-v3&opticalPublicationHash=${dataset.hash}`});
  assert.equal(information.statusCode,200);const response=information.json();assert.equal(response.dataState,"FRESH");
  const source=response.data.sources.find((s:any)=>s.id===`optical-imagery:${dataset.manifest.publicationId}:${dataset.hash}`);assert(source);
  assert.deepEqual(source,service.source("M:51",dataset.hash));infos.push(response);
 }
 const download=fn(APP+"services/api-client.ts","deepSkyManifestUrl",{__MINIAPP_API_BASE__:"http://127.0.0.1:0"});
 for(const [index,dataset] of datasets.entries()){
  const response=infos[index],source=response.data.sources.find((s:any)=>s.id.startsWith("optical-imagery:"));
  const result:any={name:dataset.name,hash:dataset.hash,source,actualReceiptReadbacks:[],http:{information:response,status:200},client:{},sourcePage:{}};
  const actualRows=capture.rows.filter((row:any)=>row.dataset===dataset.name&&!row.baseline);
  assert.equal(actualRows.length,7);
  let lastCredit:any;
  for(const row of actualRows){
   if(!row.completed){assert.equal(row.condition.mode,"OBSERVATION");assert.equal(skyOpticalSourceCredit(null),null);result.actualReceiptReadbacks.push({name:row.name,credit:null});continue;}
   assert.equal(row.completed.publicationHash,dataset.hash);assert.equal(row.completed.reference,"M:51");
   const retirements: Array<()=>void>=[];const image={},parentImage={};
   retirements.push(registerSkyNativeImageLifetime(image,()=>true));retirements.push(registerSkyNativeImageLifetime(parentImage,()=>true));
   try{
    for(const field of row.completed.fields){assert(field.assetExact&&field.nativeExact);assert.equal(field.assetSha256,dataset.manifest.levels[field.level as contracts.SdssOpticalLevel].sha256);}
    const level=row.condition.level as contracts.SdssOpticalLevel,parent=row.condition.parent as contracts.SdssOpticalLevel|undefined;
    const frame=skyTargetOpticalFrame({publication:dataset.manifest,image,renderedLevel:level,renderedAsset:dataset.manifest.levels[level],coarser:parent?{image:parentImage,level:parent,asset:dataset.manifest.levels[parent]}:null});assert(frame);
    if(row.condition.name==="retired-detail")retirements[0]!();
    const completion=completeTargetSkyOptical(frame,{submitted:true,finePrepared:row.completed.receipt.finePhoto==="positive",coarsePrepared:row.completed.receipt.coarsePhoto==="positive"},row.completed.receipt);assert(completion);
    assert.deepEqual(completion.participatingFields.map(f=>({slot:f.slot,level:f.level,assetSha256:f.asset.sha256})),row.completed.fields.map((f:any)=>({slot:f.slot,level:f.level,assetSha256:f.assetSha256})));
    const credit=skyOpticalSourceCredit(completion);assert(credit);assert.equal(credit.credit,dataset.manifest.source.credit);assert.equal(credit.license,dataset.manifest.source.license);lastCredit=credit;
    assert.equal(skyOpticalSourceCredit({...completion,publicationHash:datasets[1-index]!.hash}),null,"foreign latest version cannot borrow source");
    const context:any={React,SkyOpticalImageCredit:Credit,liveSkyOpticalCompletion,skyOpticalSourceCredit,presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:390,height:844},canvasGenerationRef:{current:9},presentedSkyFrame:{nativeCanvasGeneration:9,sdssOptical:completion},sdssOptical:{publication:datasets[1-index]!.manifest},selectedDeepSkyEntry:{reference:"M:82"},openOpticalSources(){},result:null};
    const pageCaption=`const presentedSdssOptical=${expressions.get("presentedSdssOptical")};const opticalImageCredit=${expressions.get("opticalImageCredit")};result=${caption};`;
    const getCaption=()=>execute(pageCaption+"\nresult;",context);
    assert(text(getCaption()).includes(dataset.manifest.source.credit));
    context.nativeCanvasMounted=false;assert.equal(getCaption(),null);context.nativeCanvasMounted=true;
    context.presentedSkyFrame.nativeCanvasGeneration=10;assert.equal(getCaption(),null);context.presentedSkyFrame.nativeCanvasGeneration=9;
    context.presentedSceneCurrent=false;assert.equal(getCaption(),null);
    retirements.forEach(retire=>retire());assert.equal(skyOpticalSourceCredit(completion),null);
    result.actualReceiptReadbacks.push({name:row.name,fields:row.completed.fields,credit,hiddenCanvas:null,oldGeneration:null,unacceptedFrame:null,allRetired:null});
   }finally{retirements.forEach(retire=>retire())}
  }
  assert(lastCredit);
  const navigationCalls:string[]=[],notifications:any[]=[];let resolveNavigation!:()=>void,rejectNavigation!:(reason:Error)=>void;
  const opening={current:false};
  const open=execute(`(${expressions.get("openOpticalSources")})`,{opticalSourcesOpeningRef:opening,Taro:{navigateTo:({url}:{url:string})=>{navigationCalls.push(url);return new Promise<void>((ok,no)=>{resolveNavigation=ok;rejectNavigation=no})}},notify:(value:any)=>notifications.push(value)});
  let capturedCredit:any;const tree=Credit({credit:lastCredit,onOpenSources:(credit:any)=>{capturedCredit=credit}});nodes(tree).find(n=>n.type==="Button").props.onClick();assert.equal(capturedCredit,lastCredit);
  const pending=open(capturedCredit);await open(capturedCredit);assert.equal(navigationCalls.length,1);rejectNavigation(new Error("controlled navigation failure"));await pending;assert.equal(opening.current,false);assert.equal(notifications.length,1);
  const retry=open(capturedCredit);assert.equal(navigationCalls.length,2);resolveNavigation();await retry;assert.equal(opening.current,false);assert.equal(navigationCalls[1],lastCredit.sourceRoute);
  result.navigation={capturedVersion:lastCredit.publicationHash,calls:navigationCalls,notifications,pendingDeduplicated:true,failedThenRetrySucceeded:true};
  const harness=transportHarness(),requests:any[]=[];
  const get=fn(APP+"services/api-client.ts","getCelestialObjectInformation",{ADOPTED_SKY_REPORT_CATALOG_VERSION:"bsc5p-bright-stars.v3",matchingCelestialInformationResponse,invalidateApiCache:harness.invalidateApiCache,requestOperation:(key:string,_operation:string,options:any)=>{requests.push({key,query:options.query});return harness.request(key,"/v2/celestial-objects/M%3A51?"+options.query,{signal:options.signal})}});
  async function deliver(pending:Promise<any>){const call=harness.calls.at(-1)!;const res=await http.inject({method:"GET",url:new URL(call.url).pathname+new URL(call.url).search,headers:call.header});call.success({statusCode:res.statusCode,data:res.statusCode===304?null:res.json()});return {value:await pending,status:res.statusCode};}
  const initial=await deliver(get("M:51",undefined,undefined,dataset.hash));assert.deepEqual(initial.value.data,response.data);await harness.flush();
  const conditional=await deliver(get("M:51",undefined,undefined,dataset.hash));assert.equal(conditional.status,304);assert.deepEqual(conditional.value.data,response.data);
  const offline=get("M:51",undefined,undefined,dataset.hash);harness.calls.at(-1)!.fail({errMsg:"request:fail controlled offline"});const stale=await offline;assert.equal(stale.dataState,"STALE_USABLE");assert.deepEqual(stale.data,response.data);
  const wrong=get("M:51",undefined,undefined,dataset.hash);const rejected=assert.rejects(wrong,/optical_source_invalid/u);harness.calls.at(-1)!.success({statusCode:200,data:infos[1-index]});await rejected;
  const recovered=await deliver(get("M:51",undefined,undefined,dataset.hash));assert.equal(recovered.status,200);assert.deepEqual(recovered.value.data,response.data);
  result.client={requests,statuses:[initial.status,conditional.status,"OFFLINE_STALE","WRONG_VERSION_REJECTED",recovered.status],stale};
  harness.queryClient.clear();
  let visible=true,current=response;const lifecycle:any={};const queryCalls:any[]=[];let queryOptions:any;
  const hook=fn(APP+"hooks/use-celestial-information.ts","useCelestialInformation",{getCelestialObjectInformation:get,useResourceQuery:(options:any)=>{queryOptions=options;return {isPending:false,isError:false,data:current,refetch:async()=>current}}});
  const renderSource=fn(APP+"sky/sources/index.tsx","CelestialSourcesPage",{React,View:"View",ScrollView:"ScrollView",CustomNav:"CustomNav",Provenance:"Provenance",StatusPanel:"StatusPanel",useRouter:()=>({params:{reference:"M%3A51",opticalPublicationHash:dataset.hash}}),useState:()=>[visible,(value:boolean)=>{visible=value}],useDidHide:(callback:any)=>{lifecycle.hide=callback},useDidShow:(callback:any)=>{lifecycle.show=callback},useThemeClass:()=>"mode-night",isProductSource,deepSkyManifestUrl:download,celestialInformationPartialDetail,useCelestialInformation:(...args:any[])=>{queryCalls.push(args);return hook(...args)}});
  const sourceTree=renderSource(),provenance=nodes(sourceTree).find(n=>n.type==="Provenance"&&n.props.source.id===source.id);assert(provenance);assert.deepEqual(provenance.props.source,source);
  assert(queryOptions.enabled);assert(queryOptions.queryKey.includes(dataset.hash));lifecycle.hide();renderSource();assert.equal(queryOptions.enabled,false);lifecycle.show();renderSource();assert.equal(queryOptions.enabled,true);
  const manifestResponse=await http.inject({method:"GET",url:new URL(provenance.props.downloadUrl).pathname});assert.equal(manifestResponse.statusCode,200);assert.deepEqual(manifestResponse.json(),dataset.manifest);
  const copied:string[]=[];
  const Provenance=fn(APP+"components/provenance.tsx","Provenance",{React,View:"View",Text:"Text",SoftButton:"SoftButton",DataStateBadge:"DataStateBadge",SourceAttribution:"SourceAttribution",SOURCE_KIND_LABEL,isProductSource,DATA_STATE_LABELS:{FRESH:"当前"},useState:(value:any)=>[value,()=>{}],Taro:{setClipboardData:async({data}:{data:string})=>{copied.push(data)}},formatRetrievedAt:()=>"时间未知"});
  const provenanceTree=Provenance(provenance.props),renderedText=text(provenanceTree).join("\n");
  assert(renderedText.includes(dataset.manifest.source.credit));assert(renderedText.includes(dataset.manifest.source.license));assert(renderedText.includes(source.precision));for(const limitation of source.limitations)assert(renderedText.includes(limitation));
  for(const label of ["复制原始出处","复制许可说明","复制下载链接"]){const action=nodes(provenanceTree).find(n=>n.type==="SoftButton"&&n.children.includes(label));assert(action);action.props.onClick();await new Promise(ok=>setImmediate(ok));}
  assert.equal(copied.length,3);assert.equal(copied[2],provenance.props.downloadUrl);
  const backState={pageVisible:true,datePickerOpen:false,selectedTargetId:null,selectedCatalogObject:{reference:"M:51"},catalogPickChoices:[]};assert.equal(execute(`(${back})`,backState),true);backState.pageVisible=false;assert.equal(execute(`(${back})`,backState),false);backState.pageVisible=true;assert.equal(execute(`(${back})`,backState),true);
  result.sourcePage={queryCalls,queryKey:queryOptions.queryKey,hiddenDisabled:true,returnEnabled:true,source:provenance.props.source,downloadUrl:provenance.props.downloadUrl,manifestReadbackExact:true,renderedText,copiedLinks:copied,hiddenParentReleasesBack:true,scope:"Current Source function/Hook/Provenance and actual parent Back expression. No actual router/Canvas remount or context/time restoration claim."};
  observations.datasets.push(result);
 }
 const unavailable=await http.inject({method:"GET",url:"/v2/celestial-objects/M%3A51?deepSkyImageVersion=source-finite-v3&opticalPublicationHash="+"0".repeat(64)});assert.equal(unavailable.statusCode,200);const partial=unavailable.json();assert.equal(partial.dataState,"PARTIAL");assert(partial.warnings.includes("sdss_optical_publication_unavailable"));assert(!partial.sources.some((s:any)=>s.id.startsWith("optical-imagery:")));assert(partial.sources.some((s:any)=>s.id.startsWith("imagery:")));assert(celestialInformationPartialDetail(partial));observations.unavailableOriginalVersion=partial;
 const after=[...paths].map(bind);assert.deepEqual(after,before);save("inputs-after.json",after);observations.inputsExact=true;observations.status="PASSED_BOUNDED_SOURCE_CHAIN";save("result.json",observations);console.log(JSON.stringify(bind(outputPath+"/result.json")));
}catch(error){save("failed.json",{error:String(error),stack:(error as Error).stack,observations});throw error;}finally{await app.close()}
