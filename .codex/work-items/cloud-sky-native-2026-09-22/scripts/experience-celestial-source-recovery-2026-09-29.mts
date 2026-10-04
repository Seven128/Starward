// Compiled production HTTP -> actual Mini transport/cache/response adapter ->
// both actual component functions. Views/hooks use a Node diagnostic adapter;
// this is not Taro/native composition, gesture or full-journey acceptance.
import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import * as contracts from "@starward/miniapp-contracts";
import { MiniappController } from "../../../../workers/miniapp-api/dist/controller.js";
import { MiniappService } from "../../../../workers/miniapp-api/dist/miniapp-service.js";
import { EtagInterceptor } from "../../../../workers/miniapp-api/dist/etag.interceptor.js";
import { ApiExceptionFilter } from "../../../../workers/miniapp-api/dist/api-exception.filter.js";
import { DeepSkyImageryService } from "../../../../workers/miniapp-api/dist/deep-sky-imagery.js";
import { SdssOpticalImageryService } from "../../../../workers/miniapp-api/dist/sdss-optical-imagery.js";
import { createTestRuntimeConfig } from "../../../../workers/miniapp-api/dist/runtime-config.js";
import { MemoryMediaObjectStore } from "../../../../workers/miniapp-api/dist/media-object-store.js";
import { DisabledPlaceSearchAdapter } from "../../../../workers/miniapp-api/dist/place-provider.js";
import { DisabledRouteAdapter } from "../../../../workers/miniapp-api/dist/route-provider.js";
import { InMemoryTestRepository } from "../../../../workers/miniapp-api/src/test-fixtures/in-memory-repository.ts";
import { DeterministicWeatherTestAdapter } from "../../../../workers/miniapp-api/src/test-fixtures/deterministic-weather-adapter.ts";
import { createResponseCache, isResponseEnvelope, MAX_STALE_AGE_MS } from "../../../../apps/wechat-miniapp/src/services/response-cache.ts";
import { LatestRequestRegistry, MiniappRequestCancelled } from "../../../../apps/wechat-miniapp/src/services/request-lifecycle.ts";
import { createAuthenticatedOperationRequester } from "../../../../apps/wechat-miniapp/src/services/authenticated-operation.ts";
import { matchingCelestialInformationResponse } from "../../../../apps/wechat-miniapp/src/services/celestial-information-response.ts";
import { celestialInformationPartialDetail } from "../../../../apps/wechat-miniapp/src/services/celestial-information-presentation.ts";
import { responseCacheKey } from "../../../../apps/wechat-miniapp/src/services/cache-policy.ts";
import { isProductSource, productSourceNames } from "../../../../apps/wechat-miniapp/src/utils/source-presentation.ts";
import { skyObjectKindLabel } from "../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts";

const evidence = ".codex/work-items/cloud-sky-native-2026-09-22/evidence/";
const stage = process.argv[2] ?? "after";
assert(["before-stale", "before-stale-verified", "before-stale-transport", "after"].includes(stage));
const output = `${evidence}experience-celestial-source-consumers-${stage}-2026-09-29.json`;
await assert.rejects(fs.access(output), {code:"ENOENT"});
const rows: any[] = [], httpRows: any[] = [], urls: string[] = [];
class Infrared extends DeepSkyImageryService {
  unavailable = false;
  override source(reference: string, selection = {}) {
    if (this.unavailable && reference === "M:82") throw new Error("test_publication_unavailable");
    return super.source(reference, selection);
  }
}
class Optical extends SdssOpticalImageryService {
  unavailable = false;
  override source(reference: string) {
    if (this.unavailable && reference === "M:82") throw new Error("test_publication_unavailable");
    return super.source(reference);
  }
}
const infrared = new Infrared(), optical = new Optical();
const service = new MiniappService({repository:new InMemoryTestRepository(), config:createTestRuntimeConfig(),
  weather:new DeterministicWeatherTestAdapter(), mediaStore:new MemoryMediaObjectStore(),
  route:new DisabledRouteAdapter(), placeSearch:new DisabledPlaceSearchAdapter(),
  deepSkyImages:infrared, sdssOpticalImages:optical});
class PublicationModule {}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(PublicationModule);
const app = await NestFactory.create(PublicationModule,new FastifyAdapter(),{logger:false});
app.useGlobalFilters(new ApiExceptionFilter()); app.useGlobalInterceptors(new EtagInterceptor());
const sourceFiles = [
  "workers/miniapp-api/src/celestial-object-information.ts", "workers/miniapp-api/dist/celestial-object-information.js",
  "apps/wechat-miniapp/src/services/api-client.ts", "apps/wechat-miniapp/src/services/celestial-information-response.ts",
  "apps/wechat-miniapp/src/services/celestial-information-presentation.ts", "apps/wechat-miniapp/src/services/response-cache.ts",
  "apps/wechat-miniapp/src/services/authenticated-operation.ts", "apps/wechat-miniapp/src/services/request-lifecycle.ts",
  "apps/wechat-miniapp/src/hooks/use-celestial-information.ts", "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx",
  "apps/wechat-miniapp/src/sky/sources/index.tsx",
];
const sourceHashes = await Promise.all(sourceFiles.map(async file => ({file,sha256:createHash("sha256").update(await fs.readFile(file)).digest("hex")})));
const ast = async(file:string) => ts.createSourceFile(file,await fs.readFile(file,"utf8"),ts.ScriptTarget.Latest,true,file.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
const apiAst = await ast("apps/wechat-miniapp/src/services/api-client.ts");
function declarations(source:ts.SourceFile,names:string[]) {
  return names.map(name => { const node=source.statements.find(item =>
    (ts.isFunctionDeclaration(item)||ts.isClassDeclaration(item)) && item.name?.text === name);
    assert(node,`declaration missing ${name}`);return node.getText(source).replace(/^export\s+(default\s+)?/u,""); }).join("\n");
}
const storage = new Map<string,unknown>(), requests = new LatestRequestRegistry();
const responseCache = createResponseCache({getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>{storage.set(key,value);},
  removeStorageSync:key=>{storage.delete(key);},getStorageInfoSync:()=>({keys:[...storage.keys()]}),
  setStorage:async({key,data})=>{storage.set(key,data);}});
let networkUnavailable = false;
try {
  await app.listen(0,"127.0.0.1");
  const address = app.getHttpAdapter().getInstance().server.address();
  assert(address && typeof address !== "string"); const origin=`http://127.0.0.1:${address.port}`;
  const runtime:any = {...contracts,console,setTimeout,clearTimeout,URL,Date,Promise,
    __MINIAPP_API_BASE__:origin,__MINIAPP_OPERATOR_PREVIEW_TOKEN__:"",__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__:false,
    responseCache,requests,MiniappRequestCancelled,responseCacheKey,isResponseEnvelope,MAX_STALE_AGE_MS,
    recordAcceptanceDiagnostic(){},matchingCelestialInformationResponse,
    isCelestialObjectReference:contracts.isCelestialObjectReference,
    DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION:contracts.DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION,
    ADOPTED_SKY_REPORT_CATALOG_VERSION:"bsc5p-bright-stars.v3",sdssOpticalPublication:contracts.sdssOpticalPublication,
    SDSS_OPTICAL_PUBLICATIONS:contracts.SDSS_OPTICAL_PUBLICATIONS,
    Taro:{getEnv:()=>"NODE_TRANSPORT_ADAPTER",request(options:any) {
      const abort = new AbortController();
      const promise = (async()=>{
        if(networkUnavailable){options.fail({errMsg:"request:fail diagnostic offline"});return;}
        const response=await fetch(options.url,{method:options.method,headers:options.header,signal:abort.signal});
        const text=await response.text(),body=text?JSON.parse(text):undefined;
        httpRows.push({path:new URL(options.url).pathname,status:response.status,conditional:Boolean(options.header["If-None-Match"])});
        options.success({statusCode:response.status,data:body});
      })().catch(error=>{options.fail({errMsg:abort.signal.aborted?"request:fail abort":String(error)});});
      return Object.assign(promise,{abort:()=>abort.abort()});
    }},
  };
  const context = vm.createContext(runtime);
  vm.runInContext(ts.transpileModule(declarations(apiAst,["abortTask","isApiError","isEnvelope","staleCandidate","MiniappApiError","request","invalidateApiCache","getCelestialObjectInformation","deepSkyManifestUrl"])+
    "\nglobalThis.nativeRequest=request;globalThis.getInformation=getCelestialObjectInformation;globalThis.manifestUrl=deepSkyManifestUrl;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  context.requestOperation=createAuthenticatedOperationRequester({resolveSession:async()=>null,readStoredSession:()=>null,
    clearStoredSession(){},isPermissionDenied:()=>false,request:context.nativeRequest});
  const imageHash=infrared.source("M:82",{imageVersion:"source-finite-v3"})!.id.split(":").at(-1)!;
  const queryAst = await ast("apps/wechat-miniapp/src/hooks/use-celestial-information.ts");
  const componentAst = await ast("apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx");
  const routeAst = await ast("apps/wechat-miniapp/src/sky/sources/index.tsx");
  let response:any, pendingRetry:Promise<unknown>|undefined;
  const parameters = {reference:"M%3A82",imagePublicationHash:imageHash};
  const hookContext:any = {getCelestialObjectInformation:context.getInformation,
    isCelestialObjectReference:contracts.isCelestialObjectReference,DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION:contracts.DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION,
    useResourceQuery(options:any){
      assert.equal(options.enabled,true);assert.equal(options.queryKey[1],"M:82");assert.equal(options.queryKey.at(-1),imageHash);
      return {data:response,isError:false,isPending:false,isFetching:false,refetch(){
        pendingRetry=options.queryFn(undefined).then((value:any)=>{response=value;return value;});return pendingRetry;
      }};
    }};
  const useInformation=vm.runInNewContext(ts.transpileModule(declarations(queryAst,["useCelestialInformation"])+"\nuseCelestialInformation;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,hookContext);
  const common:any={React:{createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children})},
    View:"View",Text:"Text",Button:"Button",ScrollView:"ScrollView",CustomNav:"CustomNav",Provenance:"Provenance",
    StatusPanel:"StatusPanel",SoftButton:"SoftButton",SemanticIcon:"SemanticIcon",
    useRef:(current:any)=>({current}),useState:(value:any)=>[value,()=>{}],useEffect(){},useDidHide(){},useDidShow(){},
    useAppStore:(select:any)=>select({notify(){}}),useThemeClass:()=>"mode-night",useRouter:()=>({params:parameters}),
    Taro:{async navigateTo({url}:any){urls.push(url);}},useCelestialInformation:useInformation,
    celestialInformationPartialDetail,productSourceNames,isProductSource,skyObjectKindLabel,
    deepSkyManifestUrl:context.manifestUrl,isCelestialObjectReference:contracts.isCelestialObjectReference};
  const render = (source:ts.SourceFile,name:string) => vm.runInNewContext(ts.transpileModule(declarations(source,[name])+`\n${name};`,
    {compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText,common);
  const modal=render(componentAst,"SkyCatalogInformation"),route=render(routeAst,"CelestialSourcesPage");
  function nodes(tree:any,predicate:(node:any)=>boolean):any[]{
    if(Array.isArray(tree))return tree.flatMap(item=>nodes(item,predicate));
    return [...(predicate(tree)?[tree]:[]),...(tree?.children??[]).flatMap((item:any)=>nodes(item,predicate))];
  }
  function inspect(phase:string,expectMissing:boolean) {
    const modalTree=modal({reference:"M:82",knownName:"M 82",knownKind:"GALAXY",imagePublicationHash:imageHash,onClose(){}});
    const routeTree=route(),statuses=nodes(routeTree,node=>node?.type==="StatusPanel"),credits=nodes(routeTree,node=>node?.type==="Provenance");
    const modalStatuses=nodes(modalTree,node=>node?.type==="StatusPanel");
    const partial=statuses.find(node=>node.props.state==="PARTIAL"),modalPartial=modalStatuses.find(node=>node.props.state==="PARTIAL");
    const row={phase,dataState:response.dataState,sourceIds:credits.map(node=>node.props.source.id),
      sourceStates:statuses.map(node=>node.props.state),modalStates:modalStatuses.map(node=>node.props.state),
      detail:partial?.props.detail??null,modalDetail:modalPartial?.props.detail??null}; rows.push(row);
    assert.equal(Boolean(partial),expectMissing,`source route must retain the known missing publication during ${phase}`);
    assert.equal(Boolean(modalPartial),expectMissing,`object modal must retain the known missing publication during ${phase}`);
    if(expectMissing){assert.match(partial.props.detail,/光学影像.*来源/u);assert.equal(partial.props.detail,modalPartial.props.detail);}
    assert(credits.some(node=>node.props.source.provider.includes("OpenNGC")));
    if(response.data.sources.some((source:any)=>source.id.startsWith("imagery:")))
      assert(credits.some(node=>node.props.source.id.endsWith(`:${imageHash}`)));
    assert(nodes(modalTree,node=>node?.type==="Text"&&node.children.includes(response.data.facts[0].value)).length);
    return {partial,modalPartial,credits,modalTree,routeTree};
  }
  optical.unavailable=true;infrared.unavailable=true;
  response=await context.getInformation("M:82",undefined,imageHash);
  const both=inspect("both-publications-unavailable",true);
  assert.equal(both.credits.length,1,"only independently valid catalog credit remains");
  infrared.unavailable=false;
  response=await context.getInformation("M:82",undefined,imageHash);
  const first=inspect("optical-unavailable",true);
  assert(!first.credits.some(node=>node.props.source.id.startsWith("optical-imagery:")));
  first.partial.props.onRecover();assert(pendingRetry);await pendingRetry;
  assert.equal(httpRows.at(-1)?.status,304);inspect("still-unavailable-conditional",true);
  networkUnavailable=true;
  first.modalPartial.props.onRecover();await pendingRetry;
  assert.equal(response.dataState,"STALE_USABLE");inspect("offline-retained-partial",true);
  networkUnavailable=false;optical.unavailable=false;
  const beforeRecoveryRequests=httpRows.length;
  first.partial.props.onRecover();await pendingRetry;
  assert.equal(httpRows.length,beforeRecoveryRequests+1);assert.equal(httpRows.at(-1)?.status,200);
  assert.equal(response.dataState,"FRESH");const recovered=inspect("optical-recovered",false);
  const opticalCredit=recovered.credits.find(node=>node.props.source.id.startsWith("optical-imagery:"));assert(opticalCredit);
  assert.equal(opticalCredit.props.downloadUrl,`${origin}/v2/sky/sdss-optical/${contracts.SDSS_OPTICAL_PUBLICATIONS["M:82"].publicationHash}/manifest`);
  const sourceButton=nodes(recovered.modalTree,node=>node?.type==="SoftButton").find(node=>node.props.label==="查看天体资料来源与许可");assert(sourceButton);
  sourceButton.props.onClick();await Promise.resolve();
  assert.equal(urls.at(-1),`/sky/sources/index?reference=M%3A82&imagePublicationHash=${imageHash}`);
  // An unavailable selected version cannot borrow the valid current W3 credit.
  const wrongHash="0".repeat(64),missingBound=await context.getInformation("M:82",undefined,wrongHash);
  assert.equal(missingBound.dataState,"PARTIAL");assert(!missingBound.data.sources.some((source:any)=>source.id.startsWith("imagery:")));
  assert(missingBound.data.sources.some((source:any)=>source.id.startsWith("optical-imagery:")));
  response=await context.getInformation("M:82",undefined,imageHash);inspect("original-bound-return",false);
  assert.equal(requests.has(`celestial-object:v5:source-finite-v3:${imageHash}:M:82`),false);
  await responseCache.flush();
  await fs.writeFile(output,JSON.stringify({scope:"compiled HTTP, actual Mini transport/cache and component functions; Node view/hook adapters, not native or full journey acceptance",
    rows,httpRows,sourceHashes,routeIdentityPreserved:true,partialCreditNotSubstituted:true,requestsReleased:true,portRetiredOnExit:true},null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({output,phases:rows.length,httpReads:httpRows.length,requestsReleased:true}));
} catch(error) {
  await fs.writeFile(output,JSON.stringify({scope:"failed bounded diagnostic; not acceptance",rows,httpRows,sourceHashes,
    failure:String(error)},null,2)+"\n",{flag:"wx"});throw error;
} finally {await app.close();await responseCache.flush();}
