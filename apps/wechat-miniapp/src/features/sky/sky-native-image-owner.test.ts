import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyArtworkLoader } from "./sky-artwork-loader";
import { startSkyArtworkRequest, type SkyArtworkImage } from "./sky-artwork-request";
import { skyImageFileSession } from "../../services/sky-image-file-session";
import { startDeepSkyImageRequest, type OwnedDeepSkyImageAsset } from "./deep-sky-image-request";
import { publishedDeepSkyDiscovery } from "./deep-sky-image-test-support";
import { OBSERVATION_FRAME_FORMAT,SKY_PLANET_ORDER } from "@starward/miniapp-contracts";
import { skyGalacticBandAt } from "./sky-galactic-band";
import { skyFixedImageStatus } from "./sky-fixed-image-status";
import { skyMoonDiscAt } from "./sky-moon-disc";
import { skyPlanetDiscsAt } from "./sky-planet-disc";
import {exactSkyObservationFrame} from "./sky-observation-frame";
import {skySolarLightAt} from "./sky-solar-light";
import {selectSkyHipsTiles} from "./sky-hips-tile-selection";
import {skyHipsTileIntersectsView} from "./sky-hips-tile-mesh";
import {createSkyViewBasis} from "./sky-view-projection";

// Run the production hook with controlled React effects and native callbacks.
// Public-file acquisition below is a synchronous completion/lease mock: these
// checks own consumer eligibility/decoded ownership, not FS, HTTP or persistent
// cache behavior. The real Promise/cache/hook path is verified separately.
const source = ts.createSourceFile("use-sky-artwork.ts", readFileSync(new URL("./use-sky-artwork.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declaration = source.statements.find(statement => ts.isFunctionDeclaration(statement) &&
  statement.name?.text === "useSkyNativeImages") as ts.FunctionDeclaration;
assert.ok(declaration);
const illustrationDeclaration=source.statements.find(statement=>ts.isFunctionDeclaration(statement)&&
  statement.name?.text==='useSkyArtwork') as ts.FunctionDeclaration;
assert.ok(illustrationDeclaration);
const galacticSource=ts.createSourceFile("use-sky-galactic-image.ts",readFileSync(new URL("./use-sky-galactic-image.ts",import.meta.url),"utf8"),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const galacticDeclaration=galacticSource.statements.find(statement=>ts.isFunctionDeclaration(statement)&&
  statement.name?.text==='useSkyGalacticImage') as ts.FunctionDeclaration;
assert.ok(galacticDeclaration);
const wideSource=ts.createSourceFile("use-sky-wide-field-w3.ts",readFileSync(new URL("./use-sky-wide-field-w3.ts",import.meta.url),"utf8"),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const wideDeclaration=wideSource.statements.find(statement=>ts.isFunctionDeclaration(statement)&&
  statement.name?.text==='useSkyWideFieldW3') as ts.FunctionDeclaration;
assert.ok(wideDeclaration);
const fixedSource=ts.createSourceFile("use-sky-fixed-image.ts",readFileSync(new URL("./use-sky-fixed-image.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const fixedDeclaration=fixedSource.statements.find(statement=>ts.isFunctionDeclaration(statement)&&statement.name?.text==='useSkyFixedImage') as ts.FunctionDeclaration;
assert.ok(fixedDeclaration);
const moonSource=ts.createSourceFile("use-sky-moon-texture.ts",readFileSync(new URL("./use-sky-moon-texture.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const moonDeclaration=moonSource.statements.find(statement=>ts.isFunctionDeclaration(statement)&&statement.name?.text==='useSkyMoonTexture') as ts.FunctionDeclaration;
assert.ok(moonDeclaration);
const planetConsumers=Object.fromEntries([
  ['mars','use-sky-mars-texture.ts','useSkyMarsTexture'],
  ['mercury','use-sky-mercury-texture.ts','useSkyMercuryTexture'],
  ['opal','use-sky-opal-bands.ts','useSkyOpalBands'],
].map(([key,file,name])=>{
  const fileSource=ts.createSourceFile(file!,readFileSync(new URL('./'+file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const fn=fileSource.statements.find(statement=>ts.isFunctionDeclaration(statement)&&statement.name?.text===name) as ts.FunctionDeclaration;
  assert.ok(fn);return [key,{source:fileSource,declaration:fn,name}];
}));

// Exercise the real page-to-hook ownership input, rather than bypassing the
// caller with an inactive flag that production never supplies for a layer toggle.
const pageSource = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const artworkCalls: ts.CallExpression[] = [],galacticCalls:ts.CallExpression[]=[];
function findArtworkCalls(node: ts.Node) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "useSkyArtwork") artworkCalls.push(node);
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "useSkyGalacticImage") galacticCalls.push(node);
  ts.forEachChild(node, findArtworkCalls);
}
findArtworkCalls(pageSource);
assert.equal(artworkCalls.length, 1);
const artworkActive = artworkCalls[0]!.arguments[3];
assert.ok(artworkActive);
const artworkActiveSource = artworkActive.getText(pageSource);
assert.equal(galacticCalls.length,1);
const galacticActiveSource=galacticCalls[0]!.arguments[5]!.getText(pageSource);
function pageGalacticActive(overrides:Record<string,unknown>={}){
  return Boolean(vm.runInNewContext(ts.transpileModule(`(${galacticActiveSource})`,
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    pageVisible:true,rawReportData:{},mode:"NIGHT",wideFieldEnabled:false,presentedFov:45,
    report:{data:{dataState:"FRESH"},isError:false},...overrides,
  }));
}
function pageArtworkActive(enabled: boolean): boolean {
  return Boolean(vm.runInNewContext(ts.transpileModule(`(${artworkActiveSource})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
      pageVisible: true, constellationsEnabled: enabled, rawReportData: {},
      report: { data: { dataState: "FRESH" }, isError: false },
    }));
}

function fixture(consumer:'native'|'illustration'|'galactic'|'moon'|'mars'|'mercury'|'opal'|'wide'='native') {
  const slots: any[] = [], pending: Array<() => void> = [];
  const requests: Array<{ success: (response: { statusCode: number; data: ArrayBuffer }) => void }> = [];
  const images: SkyArtworkImage[] = [], released: string[] = [];
  let cursor = 0, dirty = false;
  const galacticAt='2026-09-23T12:00:00.000Z';
  let sunAltitude=-24,fov=45,currentAt=galacticAt,publication:unknown,refreshError=false;
  let wideBasis=createSkyViewBasis(0,180,0)!;
  const queryOptions:Array<{enabled:boolean}>=[];
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length &&
    b.every((item, index) => Object.is(item, a![index]));
  const bindings = {
    EMPTY: { images: new Map(), retainedImages: new Map(), loading: false, failed: false },
    skyImageFileSession,
    createSkyArtworkLoader, startSkyArtworkRequest,
    acquirePublishedSkyImage(asset:{sha256:string;format:"png"|"jpeg";bytes:number;width:number;height:number},url:string,hash:string){
      assert.ok(url);assert.ok(hash);assert.equal(asset.width,512);assert.equal(asset.height,512);assert.equal(asset.bytes,32);
      const leaseId=`mock-public-lease-${requests.length+1}`;
      let cancelled=false,owned=false,resolve:((lease:unknown)=>void)|undefined,reject:((cause:Error)=>void)|undefined;
      const release=()=>{if(!owned)return;owned=false;released.push(leaseId);};
      const request={success(){
        if(cancelled)return;owned=true;
        resolve?.({filePath:`/owned/sky-public-images-v1/mock-${asset.sha256}.${asset.format==="jpeg"?"jpg":"png"}`,
          isCurrent:()=>owned,onRetire:()=>()=>{},release});
      }};
      return {promise:{then(ready:(lease:unknown)=>void,failed:(cause:Error)=>void){resolve=ready;reject=failed;requests.push(request);}},
        cancel(){if(owned){release();return;}cancelled=true;reject?.(new Error("controlled_public_acquisition_cancelled"));}};
    },
    skyGalacticBandAt,skyFixedImageStatus,skyMoonDiscAt,skyPlanetDiscsAt,
    exactSkyObservationFrame,skySolarLightAt,selectSkyHipsTiles,skyHipsTileIntersectsView,
    getWideFieldW3Manifest(){},wideFieldW3TileUrl:(url:string)=>url,
    getMarsTextureManifest(){},marsTextureImageUrl:(url:string)=>url,
    getMercuryTextureManifest(){},mercuryTextureImageUrl:(url:string)=>url,
    getMoonTextureManifest:()=>{throw Error('query function is controlled by resource owner');},
    moonTextureImageUrl:(url:string)=>url,
    getGalacticImageManifest:()=>{throw Error('query function is controlled by resource owner');},
    galacticImageUrl:(url:string)=>url,
    useResourceQuery(options:{enabled:boolean}){queryOptions.push(options);return{data:publication,isError:false,isFetching:false,refreshError,refetch(){}};},
    constellationAssetUrl:(hash:string,file:string)=>`/published/${hash}/assets/${file}`,
    Taro: { env: { USER_DATA_PATH: "/owned" },
      getFileSystemManager(){throw Error("approved public images must acquire a lease, not use a session writer");},
      request(){throw Error("approved public images must not call the legacy transport");} },
    useRef(initial: unknown) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: unknown) => {
        const next = typeof value === "function" ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useCallback(callback: unknown,deps:unknown[]) {
      const index=cursor++,previous=slots[index];
      if(same(previous?.deps,deps))return previous.callback;
      slots[index]={deps,callback};return callback;
    },
    useMemo(factory:()=>unknown,deps:unknown[]){
      const index=cursor++,previous=slots[index];if(same(previous?.deps,deps))return previous.value;
      const value=factory();slots[index]={deps,value};return value;
    },
    useEffect(effect: () => void | (() => void), deps: unknown[]) {
      const index = cursor++, previous = slots[index];
      if (same(previous?.deps, deps)) return;
      slots[index] = { deps };
      pending.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); });
    },
  };
  const hookSource=declaration.getText(source).replace(/^export /u,'')+'\n'+fixedDeclaration.getText(fixedSource).replace(/^export /u,'')+(consumer==='illustration'
    ?'\n'+illustrationDeclaration.getText(source).replace(/^export /u,'')+'\nuseSkyArtwork':consumer==='galactic'
      ?'\n'+galacticDeclaration.getText(galacticSource).replace(/^export /u,'')+'\nuseSkyGalacticImage':consumer==='moon'
        ?'\n'+moonDeclaration.getText(moonSource).replace(/^export /u,'')+'\nuseSkyMoonTexture':consumer==='wide'
          ?'\n'+wideDeclaration.getText(wideSource).replace(/^export /u,'')+'\nuseSkyWideFieldW3':planetConsumers[consumer]
          ?'\n'+planetConsumers[consumer]!.declaration.getText(planetConsumers[consumer]!.source).replace(/^export /u,'')+'\n'+planetConsumers[consumer]!.name:'\nuseSkyNativeImages');
  const hook = vm.runInNewContext(ts.transpileModule(hookSource,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, bindings) as (...values:any[]) => {
        images: ReadonlyMap<string, object>;
        image:object|null;failed:boolean;refreshFailed:boolean;loading:boolean;retry():boolean;
        tiles:Array<{pixel:number;image:object}>;
      };
  const bytes = new Uint8Array(32);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 8, 8, 2, 0, 2, 0, 0]);
  bytes.set([0xff, 0xda], 18); bytes.set([0xff, 0xd9], 30);
  if(consumer==='illustration'||consumer==='moon'||consumer==='opal'){
    bytes.fill(0);bytes.set([137,80,78,71,13,10,26,10]);const header=new DataView(bytes.buffer);
    header.setUint32(12,0x49484452);header.setUint32(16,512);header.setUint32(20,512);
  }
  const asset = { id: "w3:0:0", sha256: createHash('sha256').update(bytes).digest('hex'), file:'asset-0.png',width: 512, height: 512, bytes: 32 };
  function canvas() { return { createImage() {
    const image: SkyArtworkImage = { src: "", onload: null, onerror: null, width: 512, height: 512 };
    images.push(image); return image;
  } }; }
  const resolve = () => ({ url: "/published/asset-0.jpg", format: "jpeg" });
  function render(node: object | null, revision: number, hash: string | undefined, active = true,
    wanted: readonly object[] = [asset]) {
    cursor = 0; dirty = false;
    if(consumer==='wide'){
      publication=hash?{publicationHash:hash,tiles:[{...asset,pixel:0,downloadUrl:'/published/w3.jpg'}]}:undefined;
      const report={hourly:[{at:galacticAt,sunAzimuthDeg:270,sunAltitudeDeg:sunAltitude}],
        observationFrames:[{format:OBSERVATION_FRAME_FORMAT,at:galacticAt,
          observer:{latitude:30,longitude:110,elevationM:100},equatorialToEnu:[1,0,0,0,1,0,0,0,1]}]};
      return hook(report,currentAt,{basis:wideBasis,verticalFovDeg:fov},400,800,node,revision,active);
    }
    if(consumer==='moon'){
      publication=hash?{publicationHash:hash,image:{...asset,downloadUrl:'/published/moon.png'}}:undefined;
      const d=Math.SQRT1_2,basis={right:[1,0,0],up:[0,-d,d],forward:[0,d,d]};
      const report={hourly:[{at:galacticAt,moonAzimuthDeg:0,moonAltitudeDeg:45,moonAngularDiameterDeg:.5,moonIllumination:.5,
        sunAzimuthDeg:90,sunAltitudeDeg:0,moonBodyFrame:{primeMeridianEnu:[0,-d,-d],poleEnu:[0,-d,d]}}]};
      return hook(report,currentAt,{basis,verticalFovDeg:fov},400,800,node,revision,active);
    }
    if(planetConsumers[consumer]){
      publication=hash?{publicationHash:hash,image:{...asset,downloadUrl:'/published/planet.'+(consumer==='opal'?'png':'jpg')}}:undefined;
      const d=Math.SQRT1_2,basis={right:[1,0,0],up:[0,-d,d],forward:[0,d,d]};
      const body=consumer==='mars'?'MARS':consumer==='mercury'?'MERCURY':'JUPITER';
      const report={hourly:[{at:galacticAt,sunAzimuthDeg:90,sunAltitudeDeg:0,
        planets:SKY_PLANET_ORDER.map(p=>({body:p,azimuthDeg:0,altitudeDeg:p===body?45:-10,
          angularDiameterDeg:.02,illuminatedFraction:.99,visualMagnitude:1,ringTiltDeg:null,ringPoleEnu:null,
          bodyFrame:p===body?{poleEnu:[0,0,1],primeMeridianEnu:[1,0,0]}:null}))}]};
      const args=[report,currentAt,{basis,verticalFovDeg:fov},400,800,node,revision,active];
      return consumer==='opal'?hook({body,id:'jupiter:opal-2024c-bands',queryKey:'jupiter-bands-manifest',getManifest(){},imageUrl:(url:string)=>url},...args):hook(...args);
    }
    if(consumer==='galactic'){
      publication=hash?{publicationHash:hash,image:{...asset,downloadUrl:'/published/galaxy.jpg'}}:undefined;
      const report={hourly:[{at:galacticAt,sunAzimuthDeg:270,sunAltitudeDeg:sunAltitude}],
        observationFrames:[{format:OBSERVATION_FRAME_FORMAT,at:galacticAt,
          observer:{latitude:30,longitude:110,elevationM:100},equatorialToEnu:[1,0,0,0,1,0,0,0,1]}]};
      return hook(report,currentAt,fov,node,revision,active);
    }
    return hook(node, revision, hash, active, wanted, resolve);
  }
  function commit(node: object | null, revision: number, hash: string | undefined, active = true,
    wanted: readonly object[] = [asset]) {
    do {
      for (const effect of pending.splice(0)) effect();
      if (dirty) render(node, revision, hash, active, wanted);
    } while (pending.length || dirty);
    return render(node, revision, hash, active, wanted);
  }
  function finishRequest(index: number) {
    requests[index]!.success({ statusCode: 200, data: bytes.buffer });
    images.at(-1)!.onload!();
    return images.at(-1)!;
  }
  return { asset, canvas, render, commit, finishRequest, requests, images, released,
    queryOptions,setGalacticView(altitude:number,viewFov=45,at=galacticAt){sunAltitude=altitude;fov=viewFov;currentAt=at;},
    setWideView(azimuth:number,tilt:number,viewFov:number){wideBasis=createSkyViewBasis(azimuth,tilt,0)!;fov=viewFov;},
    setManifestRefreshError(value:boolean){refreshError=value;},
    heldNativeState() { return slots.find(slot => slot?.owner && slot?.value?.images instanceof Map) ?? null; } };
}

test('the production W3 consumer releases an empty face bitmap, reuses its file on return and retires it on hide',()=>{
  const h=fixture('wide'),node=h.canvas();h.setWideView(0,180,85);
  h.render(node,1,'w3-publication');h.commit(node,1,'w3-publication');
  const first=h.finishRequest(0);
  assert.equal(h.commit(node,1,'w3-publication').tiles[0]?.image,first);
  h.setWideView(180,90,60);h.render(node,1,'w3-publication');
  assert.equal(h.commit(node,1,'w3-publication').tiles.length,0);
  assert.equal(h.heldNativeState().value.retainedImages.size,0,'out-of-view faces cannot retain a dormant decoded handle');
  assert.equal(h.released.length,0,'the immutable file stays in the original bounded cache');
  assert.equal(first.onload,null);assert.equal(first.onerror,null);
  h.setWideView(0,180,85);h.render(node,1,'w3-publication');h.commit(node,1,'w3-publication');
  assert.equal(h.requests.length,1,'returning to this face must not download it again');
  const returning=h.images.at(-1)!;assert.notEqual(returning,first);assert.equal(returning.src,first.src);
  returning.onload!();assert.equal(h.commit(node,1,'w3-publication').tiles[0]?.image,returning);
  h.render(node,1,'w3-publication',false);h.commit(node,1,'w3-publication',false);
  assert.equal(h.released.length,1);assert.equal(h.heldNativeState(),null);
});

test('the production Moon consumer keeps its immutable file across wide browsing and redecodes before returning pixels',()=>{
  const h=fixture('moon'),node=h.canvas();h.setGalacticView(-24,3);
  h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
  const first=h.finishRequest(0);assert.equal(h.commit(node,1,'publication-a').image,first);
  h.setGalacticView(-24,123);
  assert.equal(h.render(node,1,'publication-a').image,null,'unresolved Moon cannot pass dormant surface pixels');
  h.commit(node,1,'publication-a');
  assert.equal(h.released.length,0,'wide browsing must not re-download the same immutable Moon file');
  assert.equal(h.heldNativeState().value.images.size,0);assert.equal(h.heldNativeState().value.retainedImages.size,0);
  assert.equal(first.onload,null);assert.equal(first.onerror,null);
  h.setGalacticView(-24,3);h.render(node,1,'publication-a');
  assert.equal(h.commit(node,1,'publication-a').image,null,'cold file is not a decoded image');
  assert.equal(h.requests.length,1);assert.equal(h.images.length,2);
  const returning=h.images[1]!;assert.notEqual(returning,first);assert.equal(returning.src,first.src);
  returning.onload!();assert.equal(h.commit(node,1,'publication-a').image,returning);
  h.render(null,1,'publication-a',false);h.commit(null,1,'publication-a',false);
  assert.equal(h.released.length,1);assert.equal(h.heldNativeState(),null);
});

test('surface and cloud-band consumers share cold return, failed decode recovery and ownership retirement',()=>{
  for(const consumer of ['mars','mercury','opal'] as const){
    const h=fixture(consumer),node=h.canvas();h.setGalacticView(-24,.25);
    h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
    const first=h.finishRequest(0);assert.equal(h.commit(node,1,'publication-a').image,first,consumer);
    h.setGalacticView(-24,123);assert.equal(h.render(node,1,'publication-a').image,null);
    h.commit(node,1,'publication-a');assert.equal(h.released.length,0,consumer);
    assert.equal(h.heldNativeState().value.retainedImages.size,0);
    h.setGalacticView(-24,.25);h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
    assert.equal(h.requests.length,1);const failed=h.images.at(-1)!;failed.onerror!();
    let result=h.commit(node,1,'publication-a');assert.equal(result.image,null);assert.equal(result.failed,true);
    h.render(node,1,'publication-a');h.commit(node,1,'publication-a');assert.equal(h.requests.length,1,'no failure loop');
    result.retry();assert.equal(h.requests.length,2);const recovered=h.finishRequest(1);
    assert.equal(h.commit(node,1,'publication-a').image,recovered);assert.equal(recovered.src,first.src);
    h.setGalacticView(-24,123);h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
    h.render(null,2,'publication-a',false);h.commit(null,2,'publication-a',false);
    assert.equal(h.heldNativeState(),null);assert.equal(h.released.length,2);assert.equal(new Set(h.released).size,2);
  }
});

test('galactic daylight and local fading release decoded state but return through the same bounded file without HTTP',()=>{
  const h=fixture('galactic'),node=h.canvas(),active=pageGalacticActive();
  h.render(node,1,'publication-a',active);h.commit(node,1,'publication-a',active);
  const first=h.finishRequest(0);assert.equal(h.commit(node,1,'publication-a',active).image,first);
  for(const [sun,viewFov] of [[20,45],[-24,4.8],[-24,Number.NaN]] as const){
    h.setGalacticView(sun,viewFov);
    assert.equal(h.render(node,1,'publication-a',active).image,null,'fade cannot pass stale pixels to the page before effects');
    h.commit(node,1,'publication-a',active);
    assert.equal(h.released.length,0,'temporary visibility loss does not retire the immutable file');
    const held=h.heldNativeState();assert.ok(held,'same live Canvas owner keeps its bounded file');
    assert.equal(held.value.images.size,0);assert.equal(held.value.retainedImages.size,0,'no dormant decoded bitmap in hook state');
    h.setGalacticView(-24,45);h.render(node,1,'publication-a',active);
    assert.equal(h.commit(node,1,'publication-a',active).image,null,'a returning file must be decoded before publication');
    assert.equal(h.requests.length,1);const returning=h.images.at(-1)!;
    assert.equal(returning.src,first.src);assert.notEqual(returning,first);returning.onload!();
    assert.equal(h.commit(node,1,'publication-a',active).image,returning);
  }
  h.render(node,1,'publication-a',false);h.commit(node,1,'publication-a',false);
  assert.equal(h.released.length,1);assert.equal(h.heldNativeState(),null);
});

test('galactic initial day, narrow or missing exact instant never acquire an image or enable its manifest',()=>{
  for(const [sun,fov,at] of [[20,45,'2026-09-23T12:00:00.000Z'],[-24,4.8,'2026-09-23T12:00:00.000Z'],
    [-24,45,'2026-09-23T13:00:00.000Z']] as const){
    const h=fixture('galactic'),node=h.canvas();h.setGalacticView(sun,fov,at);
    h.render(node,1,'publication-a');const result=h.commit(node,1,'publication-a');
    assert.equal(result.image,null);assert.equal(result.loading,false);assert.equal(result.failed,false);
    assert.equal(h.requests.length,0);assert(h.queryOptions.every(options=>options.enabled===false));
    h.render(null,2,undefined,false);h.commit(null,2,undefined,false);
  }
});

test('galactic cached decode cancellation, failure latch and explicit retry preserve current source ownership',()=>{
  const h=fixture('galactic'),node=h.canvas();h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
  h.finishRequest(0);h.commit(node,1,'publication-a');
  h.setGalacticView(20);h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
  h.setGalacticView(-24);h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
  const late=h.images[1]!.onload!;h.setGalacticView(20);h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
  assert.equal(h.images[1]!.onload,null);
  h.setGalacticView(-24);h.render(node,1,'publication-a');h.commit(node,1,'publication-a');late();
  assert.equal(h.render(node,1,'publication-a').image,null,'canceled cached bitmap cannot publish into its replacement');
  h.images[2]!.onerror!();let result=h.commit(node,1,'publication-a');assert.equal(result.failed,true);
  h.render(node,1,'publication-a');h.commit(node,1,'publication-a');assert.equal(h.requests.length,1,'failure cannot loop downloads');
  assert.equal(result.retry(),false);assert.equal(h.requests.length,2);assert.equal(h.released.length,1);
  const replacement=h.finishRequest(1);assert.equal(h.commit(node,1,'publication-a').image,replacement);
  h.render(null,2,undefined,false);h.commit(null,2,undefined,false);assert.equal(h.released.length,2);assert.equal(h.heldNativeState(),null);
});

test('galactic off intent, Canvas replacement and publication change retire cold files instead of reviving stale pixels',()=>{
  const stops=[{active:pageGalacticActive({pageVisible:false})},{active:pageGalacticActive({mode:'OBSERVATION'})},
    {active:pageGalacticActive({wideFieldEnabled:true,presentedFov:85})},
    {active:pageGalacticActive({report:{data:{dataState:'EXPIRED'},isError:false}})},
    {active:pageGalacticActive({report:{data:{dataState:'FRESH'},isError:true}})},
    {canvas:true},{hash:'publication-b'}];
  assert(pageGalacticActive({wideFieldEnabled:true,presentedFov:45}),'ordinary view does not activate the W3 replacement');
  for(const stop of stops){const h=fixture('galactic'),node=h.canvas();h.render(node,1,'publication-a');h.commit(node,1,'publication-a');h.finishRequest(0);h.commit(node,1,'publication-a');
    h.setGalacticView(20);h.render(node,1,'publication-a');h.commit(node,1,'publication-a');
    const nextNode='canvas'in stop?h.canvas():node,nextHash='hash'in stop?stop.hash:'publication-a',active='active'in stop?stop.active:true;
    const nextRevision='canvas'in stop?2:1;
    assert.equal(h.render(nextNode,nextRevision,nextHash,active).image,null);h.commit(nextNode,nextRevision,nextHash,active);
    assert.equal(h.released.length,1);assert.equal(h.heldNativeState(),null,'empty new owner cannot retain retired native graph');
    assert.equal(h.requests.length,1,'a replacement first shown in daylight still does not fetch');
    h.render(null,3,undefined,false);h.commit(null,3,undefined,false);
  }
});

test('galactic manifest refresh failure retains valid current pixels and stays silent during daylight',()=>{
  const h=fixture('galactic'),node=h.canvas();h.render(node,1,'publication-a');h.commit(node,1,'publication-a');const first=h.finishRequest(0);
  h.setManifestRefreshError(true);let result=h.commit(node,1,'publication-a');assert.equal(result.image,first);assert.equal(result.failed,false);assert.equal(result.refreshFailed,true);
  h.setGalacticView(20);h.render(node,1,'publication-a');result=h.commit(node,1,'publication-a');
  assert.equal(result.image,null);assert.equal(result.failed,false);assert.equal(result.refreshFailed,false);
  h.render(node,1,'publication-a',false);h.commit(node,1,'publication-a',false);
});

test("selected W3 uses a public file lease while its publication metadata retains separate ownership", async () => {
  const h = fixture(), node = h.canvas();
  h.render(node, 1, "publication-a"); h.commit(node, 1, "publication-a");
  const image = h.finishRequest(0);
  let deep: OwnedDeepSkyImageAsset | undefined;
  const discovery = publishedDeepSkyDiscovery("M:31"); let current = true, released = 0;
  startDeepSkyImageRequest({ reference: "M:31", level: "MEDIUM", discover: async () => discovery,
    demand: { isCurrent: () => true, onRetire: () => () => {}, release() {} },
    acquire: asset => ({ promise: Promise.resolve({ filePath: `/owned/sky-public-images-v1/file-${asset.sha256}.jpg`,
      isCurrent: () => current, onRetire: () => () => {}, release() { if (current) { current = false; released++; } } }), cancel() {} }),
    onReady: value => { deep = value; }, onError() { assert.fail("valid discovered object image"); } });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert(deep);
  assert.match(image.src,/\/sky-public-images-v1\/mock-[a-f0-9]{64}\.jpg$/);
  assert.match(deep.tempFilePath,/\/sky-public-images-v1\/file-[a-f0-9]{64}\.jpg$/);
  assert.equal(deep.publicationHash, discovery.publicationHash); assert.notEqual(image.src,deep.tempFilePath);
  deep.release(); deep.release(); assert.equal(released, 1);
  h.render(node, 1, "publication-a", false); h.commit(node, 1, "publication-a", false);
});

test("a publication or Canvas generation switch fences old decoded images before effects and redecodes for the new owner", () => {
  const h = fixture(), firstCanvas = h.canvas(), nextCanvas = h.canvas();
  assert.equal(h.render(firstCanvas, 1, "publication-a").images.size, 0);
  h.commit(firstCanvas, 1, "publication-a");
  const firstImage = h.finishRequest(0);
  assert.equal(h.render(firstCanvas, 1, "publication-a").images.get(h.asset.id), firstImage);

  assert.equal(h.render(nextCanvas, 2, "publication-a").images.size, 0);
  h.commit(nextCanvas, 2, "publication-a");
  assert.equal(h.released.length, 1);
  assert.equal(h.requests.length, 2);
  const nextImage = h.finishRequest(1);
  assert.notEqual(nextImage, firstImage);
  assert.equal(h.render(nextCanvas, 2, "publication-a").images.get(h.asset.id), nextImage);

  assert.equal(h.render(nextCanvas, 2, "publication-b").images.size, 0);
  h.commit(nextCanvas, 2, "publication-b");
  assert.equal(h.released.length, 2);
  assert.equal(h.requests.length, 3);
  h.finishRequest(2);
  assert.equal(h.render(nextCanvas, 2, "publication-b").images.size, 1);

  assert.equal(h.render(nextCanvas, 2, "publication-b", false).images.size, 0);
  h.commit(nextCanvas, 2, "publication-b", false);
  assert.equal(h.released.length, 3);
});

test("hide, Canvas removal and publication loss retire decoded images held by the Hook, not just its returned view", () => {
  for (const stop of ["hide", "canvas", "publication"] as const) {
    const h = fixture(), node = h.canvas();
    h.render(node, 1, "publication-a"); h.commit(node, 1, "publication-a");
    const image = h.finishRequest(0);
    h.render(node, 1, "publication-a");
    assert.equal(h.heldNativeState().value.images.get(h.asset.id), image);
    const next = { node: stop === "canvas" ? null : node,
      hash: stop === "publication" ? undefined : "publication-a", active: stop !== "hide" };
    assert.equal(h.render(next.node, 1, next.hash, next.active).images.size, 0);
    h.commit(next.node, 1, next.hash, next.active);
    assert.equal(h.released.length, 1, `${stop} releases its public-file lease`);
    assert.equal(h.heldNativeState(), null, `${stop} must release the Hook's retired Canvas and decoded-image graph`);
    assert.equal(image.onload, null); assert.equal(image.onerror, null);
  }
});

test("the page's constellation off intent retires ready files and decoded state, and re-enabling creates a fresh owner", () => {
  const h = fixture(), node = h.canvas();
  h.render(node, 1, "publication-a", pageArtworkActive(true));
  h.commit(node, 1, "publication-a", pageArtworkActive(true));
  const first = h.finishRequest(0);
  h.render(node, 1, "publication-a", pageArtworkActive(true));
  assert.equal(h.heldNativeState().value.images.get(h.asset.id), first);

  // The production page also empties visibleFigures when the layer is off.
  h.render(node, 1, "publication-a", pageArtworkActive(false), []);
  h.commit(node, 1, "publication-a", pageArtworkActive(false), []);
  assert.equal(h.released.length, 1, "switching off releases the completed layer's public-file lease");
  assert.equal(h.heldNativeState(), null, "an off layer must not retain its decoded-image/Canvas graph");

  h.render(node, 1, "publication-a", pageArtworkActive(true));
  h.commit(node, 1, "publication-a", pageArtworkActive(true));
  assert.equal(h.requests.length, 2, "re-enabling uses the same published source through a new live image owner");
  const restored = h.finishRequest(1);
  assert.notEqual(restored, first);
  assert.equal(h.render(node, 1, "publication-a", pageArtworkActive(true)).images.get(h.asset.id), restored);
  assert.equal(restored.src, first.src, "a fresh Canvas bitmap may acquire the same immutable public file");
  h.render(node, 1, "publication-a", false); h.commit(node, 1, "publication-a", false);
  assert.equal(h.released.length, 2);
  assert.equal(new Set(h.released).size, 2);
});

test("the shared native consumer retains ready fallback bitmaps when its wanted set is temporarily empty", () => {
  const h = fixture(), node = h.canvas();
  h.render(node, 1, "publication-a", pageArtworkActive(true));
  h.commit(node, 1, "publication-a", pageArtworkActive(true));
  const image = h.finishRequest(0);
  h.render(node, 1, "publication-a", pageArtworkActive(true), []);
  h.commit(node, 1, "publication-a", pageArtworkActive(true), []);
  assert.equal(h.heldNativeState().value.retainedImages.get(h.asset.id), image);
  assert.equal(h.released.length, 0, "local fading need not discard source files needed for a quick reverse zoom");
  h.render(node, 1, "publication-a", pageArtworkActive(true));
  assert.equal(h.commit(node, 1, "publication-a", pageArtworkActive(true)).images.get(h.asset.id), image);
  assert.equal(h.requests.length, 1, "returning to the same figure reuses its ready bitmap");
  h.render(node, 1, "publication-a", false); h.commit(node, 1, "publication-a", false);
});

test('the production illustration wrapper retires unused decoded state and reuses its file on reverse zoom',()=>{
  const h=fixture('illustration'),node=h.canvas();
  h.render(node,1,'publication-a',pageArtworkActive(true));h.commit(node,1,'publication-a',pageArtworkActive(true));
  const first=h.finishRequest(0);h.render(node,1,'publication-a',pageArtworkActive(true));h.commit(node,1,'publication-a',pageArtworkActive(true));
  h.render(node,1,'publication-a',pageArtworkActive(true),[]);h.commit(node,1,'publication-a',pageArtworkActive(true),[]);
  assert.equal(h.heldNativeState().value.images.size,0);assert.equal(h.heldNativeState().value.retainedImages.size,0);
  assert.equal(h.released.length,0,'keep the bounded file cache');
  h.render(node,1,'publication-a',pageArtworkActive(true));h.commit(node,1,'publication-a',pageArtworkActive(true));
  assert.equal(h.requests.length,1);assert.equal(h.images.length,2);
  const returning=h.images[1]!;assert.notEqual(returning,first);assert.equal(returning.src,first.src);returning.onload!();
  assert.equal(h.commit(node,1,'publication-a',pageArtworkActive(true)).images.get(h.asset.id),returning);
  h.render(node,1,'publication-a',false);h.commit(node,1,'publication-a',false);
  assert.equal(h.released.length,1);assert.equal(h.heldNativeState(),null);
});

test("an empty new Canvas generation cannot keep the old decoded-image state until another download finishes", () => {
  const h = fixture(), first = h.canvas(), next = h.canvas();
  h.render(first, 1, "publication-a"); h.commit(first, 1, "publication-a");
  h.finishRequest(0); h.render(first, 1, "publication-a");
  h.render(next, 2, "publication-a", true, []);
  h.commit(next, 2, "publication-a", true, []);
  assert.equal(h.requests.length, 1, "no new image is needed by the new view");
  assert.equal(h.released.length, 1);
  assert.equal(h.heldNativeState(), null, "ownership retirement cannot depend on a future successful image response");
  h.render(next, 2, "publication-a"); h.commit(next, 2, "publication-a");
  const replacement = h.finishRequest(1);
  assert.equal(h.render(next, 2, "publication-a").images.get(h.asset.id), replacement);
  assert.equal(h.heldNativeState().canvas, next);
});

test("repeated hide/show with a late canceled response releases retired state and preserves each new owner", () => {
  const h = fixture();
  for (let generation = 1; generation <= 6; generation++) {
    const node = h.canvas();
    h.render(node, generation, "publication-a"); h.commit(node, generation, "publication-a");
    const canceledRequest = h.requests.at(-1)!;
    if (generation % 2 === 0) {
      h.render(null, generation, "publication-a", false);
      h.commit(null, generation, "publication-a", false);
      canceledRequest.success({ statusCode: 200, data: new ArrayBuffer(32) });
      assert.equal(h.heldNativeState(), null);
    } else {
      const image = h.finishRequest(h.requests.length - 1);
      h.render(node, generation, "publication-a");
      assert.equal(h.heldNativeState().value.images.get(h.asset.id), image);
      h.render(null, generation, "publication-a", false);
      h.commit(null, generation, "publication-a", false);
      assert.equal(h.heldNativeState(), null);
    }
  }
  assert.equal(h.requests.length, 6);
  assert.equal(h.images.length, 3, "canceled generations cannot recreate decoded images");
  assert.equal(h.released.length, 3);
  assert.equal(new Set(h.released).size, 3, "each completed generation releases only its own lease");
});
