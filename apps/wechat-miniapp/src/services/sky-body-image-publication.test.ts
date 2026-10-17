import {skyBodyImageProfile} from "./sky-body-image-profile";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import {celestialInformationSourceRoute} from "./celestial-information-presentation";
import {sourceRecoveryTestScope} from "../sky/sources/source-recovery-test-support";

const profiles=[
  ["SOLAR:MOON","moon/coverage-manifest.json","getMoonTextureManifest","moon/coverage"],
  ["PLANET:MARS","mars/manifest.json","getMarsTextureManifest","mars"],
  ["PLANET:MERCURY","mercury/manifest.json","getMercuryTextureManifest","mercury"],
  ["PLANET:JUPITER","jupiter/manifest.json","getJupiterBandsManifest","jupiter"],
  ["PLANET:SATURN","saturn/manifest.json","getSaturnBandsManifest","saturn"],
  ["PLANET:URANUS","uranus/manifest.json","getUranusBandsManifest","uranus"],
  ["PLANET:NEPTUNE","neptune/manifest.json","getNeptuneBandsManifest","neptune"],
] as const;
function actualModule<const T extends readonly string[]>(file:string,bindings:object,names:T,mutation?:(source:string)=>string){
  const original=ts.createSourceFile(file,readFileSync(new URL(file,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const printer=ts.createPrinter();
  const source=original.statements.filter(node=>!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))
    .map(node=>printer.printNode(ts.EmitHint.Unspecified,node,original).replace(/^export (?:default )?/gmu,"")).join("\n");
  const code=ts.transpileModule((mutation?mutation(source):source)+`\n({${names.join(",")}});`,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
  const scope=sourceRecoveryTestScope();
  const actual=vm.runInNewContext(code,{...contracts,...scope.bindings,...bindings});
  return Object.fromEntries(Object.entries(actual).map(([name,fn])=>[name,(...args:any[])=>scope.render(fn as (...args:any[])=>any,...args)])) as Record<T[number],(...args:any[])=>any>;
}
function fixture(profile:typeof profiles[number]){
  const bytes=readFileSync(new URL(`../../../../workers/miniapp-api/assets/${profile[1]}`,import.meta.url));
  const publication=JSON.parse(bytes.toString("utf8"));
  publication.publicationHash=createHash("sha256").update(bytes).digest("hex");
  publication.image.downloadUrl=`/v2/sky/${profile[3]}/${publication.publicationHash}/${publication.image.file}`;
  return publication;
}
function owner(){
  const calls:{reference:string;hash?:string;signal?:AbortSignal}[]=[];
  const bindings={skyBodyImageProfile,getBodyImageManifest:async(kind:string,signal?:AbortSignal,hash?:string)=>{
    const profile=profiles.find(p=>skyBodyImageProfile(p[0])!.kind===kind)!;
    calls.push({reference:profile[0],...(signal?{signal}:{}),...(hash!==undefined?{hash}:{})});return fixture(profile);
  }};
  const api=actualModule("./sky-body-image-publication.ts",bindings,
    ["getSkyBodyImagePublication","isSkyBodyImageReference","skyBodyImageSource","isDefaultSkyBodyImageSource"]);
  return {api,calls};
}
test("seven existing manifest clients retain the selected body/hash and request cancellation without downloading images",async()=>{
  const {api,calls}=owner(),signal=new AbortController().signal;
  for(const profile of profiles){
    const expected=fixture(profile),value=await api.getSkyBodyImagePublication(profile[0],expected.publicationHash,signal);
    assert.equal(value.publicationHash,expected.publicationHash);
    assert.equal(value.image.sha256,expected.image.sha256);
    assert.equal(calls.at(-1)!.hash,expected.publicationHash);assert.equal(calls.at(-1)!.reference,profile[0]);assert.equal(calls.at(-1)!.signal,signal);
    const source=api.skyBodyImageSource(profile[0],value);
    assert.equal(source.id,`body-image:${profile[0]}:${expected.publicationHash}`);
    assert.equal(source.attribution.name,expected.source.credit);
    assert.equal(source.attribution.statements[0],expected.processing);
    assert.deepEqual(source.limitations,expected.limitations);
    const url=celestialInformationSourceRoute(profile[0],undefined,undefined,value.publicationHash);
    assert.equal(new URL(url,"https://starward.invalid").searchParams.get("bodyImagePublicationHash"),expected.publicationHash);
    assert(!url.includes("opticalPublicationHash="));assert(!url.includes("imagePublicationHash="));
  }
  assert.equal(calls.length,7);
});
test("wrong object/version and malformed selection cannot borrow current image provenance",async()=>{
  const {api,calls}=owner(),moon=fixture(profiles[0]),saturn=fixture(profiles[4]);
  for(const reference of ["SOLAR:SUN","PLANET:VENUS","HR:7001","__proto__","constructor"])
    await assert.rejects(api.getSkyBodyImagePublication(reference,moon.publicationHash),/selection_invalid/u);
  for(const hash of ["","g".repeat(64),"../outside"])
    await assert.rejects(api.getSkyBodyImagePublication("SOLAR:MOON",hash),/selection_invalid/u);
  assert.equal(calls.length,0);
  for(const hash of [saturn.publicationHash,"0".repeat(64),"ccdcceac70cf74c041cff589f59ea6a2b06f8b741f0be97e67b59799b22b73e6"])
    await assert.rejects(api.getSkyBodyImagePublication("SOLAR:MOON",hash),/version_unavailable/u);
  assert.equal((await api.getSkyBodyImagePublication("SOLAR:MOON",moon.publicationHash)).publicationHash,moon.publicationHash);
  assert(api.isDefaultSkyBodyImageSource({id:"usgs-clementine-uv750-v21-coverage"}));
  assert(api.isDefaultSkyBodyImageSource({id:"mast-hst-opal-saturn-2025a-latitude-bands"}));
  for(const id of ["nasa-nssdca-saturn-fact-sheet","nasa-nssdca-saturnian-rings-fact-sheet","editorial:moon","independent-open-data"])
    assert.equal(api.isDefaultSkyBodyImageSource({id}),false);
});
test("removing the actual version guard admits the wrong publication and is caught by the regression",async()=>{
  const bindings={skyBodyImageProfile,getBodyImageManifest:async(kind:string)=>fixture(profiles.find(p=>skyBodyImageProfile(p[0])!.kind===kind)!)};
  const mutated=actualModule("./sky-body-image-publication.ts",bindings,["getSkyBodyImagePublication"],source=>{
    const before=source;
    const after=source.replace(/if \(publication\.publicationHash !== publicationHash\)\s*throw new Error\("sky_body_image_version_unavailable"\);/u,"");
    assert.notEqual(after,before,"the mutation must remove the real boundary");return after;
  });
  const wrong="0".repeat(64),received=await mutated.getSkyBodyImagePublication("SOLAR:MOON",wrong);
  assert.notEqual(received.publicationHash,wrong);
  const {api}=owner();await assert.rejects(api.getSkyBodyImagePublication("SOLAR:MOON",wrong),/version_unavailable/u);
});

type Element={tag:unknown;props:any;children:unknown[]};
const createElement=(tag:unknown,props:unknown,...children:unknown[]):Element=>typeof tag==="function"?tag(props):({tag,props,children});
function elements(root:unknown,tag:unknown):Element[]{
  if(Array.isArray(root))return root.flatMap(child=>elements(child,tag));
  if(!root||typeof root!=="object"||!("children" in root))return [];
  const value=root as Element;return [...(value.tag===tag?[value]:[]),...value.children.flatMap(child=>elements(child,tag))];
}
test("actual Sources page admits only the separate body route and retains independent static credit",()=>{
  const {api}=owner(),moon=fixture(profiles[0]);let params:any={},enabled=false;
  const sources=["nasa-nssdca-moon-fact-sheet","usgs-clementine-uv750-v21-coverage","independent-open-data"]
    .map(id=>({id,kind:"OPEN_DATA",provider:id,title:id,limitations:[]}));
  const module=actualModule("../sky/sources/index.tsx",{
    React:{createElement},View:"View",ScrollView:"ScrollView",CustomNav:"Nav",StatusPanel:"StatusPanel",
    Provenance:"Provenance",SkyBodyImageSources:"BodySources",SkyHipsSourcesPage:"HipsSources",
    useRouter:()=>({params}),useState:()=>[true,()=>{}],useDidHide:()=>{},useDidShow:()=>{},useThemeClass:()=>"theme",
    useResourceQuery:()=>({}),useCelestialInformation:(_ref:string,on:boolean)=>{enabled=on;return {data:{data:{displayName:"月球",sources},dataState:"FRESH"}};},
    celestialInformationPartialDetail:()=>null,isProductSource:()=>true,deepSkyManifestUrl:()=>undefined,
    isSkyBodyImageReference:api.isSkyBodyImageReference,isDefaultSkyBodyImageSource:api.isDefaultSkyBodyImageSource,
  },["CelestialObjectSourcesPage"]);
  params={reference:"SOLAR%3AMOON",bodyImagePublicationHash:moon.publicationHash};
  const tree=module.CelestialObjectSourcesPage();assert(enabled);
  assert.equal(elements(tree,"BodySources")[0]!.props.publicationHash,moon.publicationHash);
  assert.deepEqual(elements(tree,"Provenance").map(value=>value.props.source.id),["nasa-nssdca-moon-fact-sheet","independent-open-data"]);
  for(const change of [{reference:"SOLAR:SUN"},{bodyImagePublicationHash:""},{imagePublicationHash:"a".repeat(64)},
    {opticalPublicationHash:"a".repeat(64)},{preparedPublicationHash:"a".repeat(64)},{hipsPublicationHash:"a".repeat(64)}]){
    params={reference:"SOLAR%3AMOON",bodyImagePublicationHash:moon.publicationHash,...change};
    const invalid=module.CelestialObjectSourcesPage();assert.equal(enabled,false);assert.equal(elements(invalid,"BodySources").length,0);
    assert.equal(elements(invalid,"HipsSources").length,0,"mixed body routes cannot bypass admission through HiPS");
  }
  params={reference:"SOLAR%3AMOON"};
  assert.equal(elements(module.CelestialObjectSourcesPage(),"Provenance").length,3,"ordinary information retains compatibility");
});
test("actual body Sources query partitions identities, preserves same-version stale credit, and exposes retry instead of replacement",async()=>{
  const {api}=owner(),moon=fixture(profiles[0]);let state:any={isError:true},query:any;
  const details=actualModule("../features/sky/sky-body-image-source.tsx",{React:{createElement,Fragment:"Fragment"},
    Provenance:"Provenance",Text:"Text",skyBodyImageProfile,skyBodyImageSource:api.skyBodyImageSource,bodyImageUrl:(url:string)=>"http://127.0.0.1:8791"+url},["SkyBodyImageDetails"]);
  const module=actualModule("../sky/sources/body-image-sources.tsx",{React:{createElement,Fragment:"Fragment"},
    View:"View",Text:"Text",StatusPanel:"StatusPanel",Provenance:"Provenance",__MINIAPP_API_BASE__:"http://127.0.0.1:8791",
    useResourceQuery:(value:any)=>{query=value;return {...state,refetch:()=>{state={data:moon};}};},
    SkyBodyImageDetails:details.SkyBodyImageDetails,getSkyBodyImagePublication:api.getSkyBodyImagePublication,skyBodyImageSource:api.skyBodyImageSource,
  },["SkyBodyImageSources"]);
  const props={reference:"SOLAR:MOON",publicationHash:moon.publicationHash,visible:true};
  const missing=module.SkyBodyImageSources(props);
  assert.equal(elements(missing,"Provenance").length,0);assert.equal(elements(missing,"StatusPanel")[0]!.props.state,"PARTIAL");
  elements(missing,"StatusPanel")[0]!.props.onRecover();
  const recovered=module.SkyBodyImageSources(props),credit=elements(recovered,"Provenance")[0]!;
  assert.equal(credit.props.downloadUrl,"http://127.0.0.1:8791"+moon.image.downloadUrl);
  const signal=new AbortController().signal;assert.equal((await query.queryFn(signal)).publicationHash,moon.publicationHash);
  const firstKey=JSON.stringify(query.queryKey);state={data:moon,refreshError:new Error("unavailable")};
  assert.equal(elements(module.SkyBodyImageSources(props),"StatusPanel")[0]!.props.state,"STALE");
  assert.equal(elements(module.SkyBodyImageSources({...props,publicationHash:"0".repeat(64)}),"Provenance").length,0);
  assert.notEqual(JSON.stringify(query.queryKey),firstKey);
  module.SkyBodyImageSources({...props,visible:false});assert.equal(query.enabled,false);
});


test("shared client requests immutable selected metadata for all bodies, with cancellation and no current fallback",async()=>{
  let response:any,calls:any[]=[];
  const client=actualModule("./body-image-client.ts",{
    skyResourceUrl:(path:string)=>path,
    requestBareSkyResource:async(...args:any[])=>{calls.push(args);return response;},
  },["getBodyImageManifest"]);
  const signal=new AbortController().signal;
  for(const profile of profiles){
    const manifest=fixture(profile),kind=skyBodyImageProfile(profile[0])!.kind;
    response={status:200,body:manifest};
    assert.equal((await client.getBodyImageManifest(kind,signal,manifest.publicationHash)).publicationHash,manifest.publicationHash);
    assert.equal(calls.at(-1)[0],'/v2/sky/'+profile[3]+'/'+manifest.publicationHash+'/manifest');
    assert.equal(calls.at(-1)[2],signal);
    await assert.rejects(client.getBodyImageManifest(kind,signal,'0'.repeat(64)),/version_unavailable/);
    for(const mutate of [(m:any)=>{m.image.sha256='0'.repeat(64);},(m:any)=>{m.source.credit='';},
      (m:any)=>{m.image.downloadUrl='/other';},(m:any)=>{m.projection.kind='unknown';}]){
      response={status:200,body:structuredClone(manifest)};mutate(response.body);
      await assert.rejects(client.getBodyImageManifest(kind,signal,manifest.publicationHash),/manifest_invalid/);
    }
    response={status:404,body:null};const before=calls.length;
    await assert.rejects(client.getBodyImageManifest(kind,signal,manifest.publicationHash),/unavailable/);
    assert.equal(calls.length,before+1,'a missing edition must not fetch the discovery endpoint');
  }
});
