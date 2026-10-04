// One-shot local diagnostic. Real compiled API + production projection/GPU;
// explicit Memory/weather ports, no native controls/device/quality acceptance.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { createPublicationBackend } from "./experience-w3-proxy-backend-2026-09-29.mts";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { attachSkyCatalog } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { createSkyViewBasis } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { sdssOpticalLevelForFov } from "../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts";
import { SDSS_OPTICAL_PUBLICATIONS, assertSdssOpticalManifest } from "../../../../packages/miniapp-contracts/src/index.ts";

const finalComposition=process.argv.includes("--after");
const verifiedComposition=process.argv.includes("--verified");
const root = process.cwd(), output = path.join(root, `output/playwright/cloud-sky-sdss-targets-0929${verifiedComposition?"-verified":finalComposition?"-final":""}`);
await assert.rejects(fs.access(path.join(output, "result.json")), {code:"ENOENT"});
await fs.mkdir(output,{recursive:true});
const digest = (value:Uint8Array|string)=>createHash("sha256").update(value).digest("hex");
const backend = await createPublicationBackend();
let browser:any;
try {
  const origin=`http://127.0.0.1:${backend.port}`;
  async function json(relative:string,body?:unknown) {
    const response=await fetch(origin+relative,{signal:AbortSignal.timeout(10000),
      ...(body === undefined ? {} : {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})});
    assert([200,201].includes(response.status),`actual API ${relative.split("?")[0]}`);
    return response.json() as Promise<any>;
  }
  async function image(asset:{downloadUrl:string;bytes:number;sha256:string}) {
    const response=await fetch(origin+asset.downloadUrl,{signal:AbortSignal.timeout(10000)});
    assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length,asset.bytes);assert.equal(digest(bytes),asset.sha256);
    return `data:${response.headers.get("content-type")!.split(";")[0]};base64,${bytes.toString("base64")}`;
  }
  const search=await json("/v2/places/search?q="+encodeURIComponent("示例观星点"));
  const spot=search.data.formalSpots.find((row:any)=>row.name==="示例观星点");
  assert(spot?.spotId);assert.equal(spot.wgs84.latitude,22.4826799);assert.equal(spot.wgs84.longitude,114.5557147);
  // Spring evening provides comparable above-horizon galaxies; this is a
  // historical astronomy scenario, not a claim of present weather/visibility.
  const at="2026-04-01T14:00:00.000Z";
  const context=(await json("/v2/observation-contexts/resolve",{location:{kind:"FORMAL_SPOT",spotId:spot.spotId},
    localDate:"2026-04-01",selectedAt:at})).data;
  assert.equal(context.selectedAtUtc,at);
  const raw=projectAdoptedSkyCatalog(await json(`/v2/spots/${encodeURIComponent(spot.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`));
  const catalogReference=raw.data.skyScene.catalog!;assert(catalogReference);
  const stars=(await json(`/v2/sky/catalogs/${catalogReference.catalogVersion}/${catalogReference.catalogHash}`)).data;
  const report=attachSkyCatalog(raw.data,stars);
  const frame=report.skyScene.deepSky!.frames.find(row=>row.at===at)!;
  assert(frame?.state==="AVAILABLE"&&frame.points?.length);
  assert(report.hourly.find(row=>row.at===at)!.sunAltitudeDeg! < -18,"actual night scenario");
  const images:any[]=[],scenarios:any[]=[],publications:any[]=[];
  const deepPublication=await json(`/v2/sky/deep-sky/${backend.publicationHash}/manifest`);
  for(const [reference,offer] of Object.entries(SDSS_OPTICAL_PUBLICATIONS)) {
    const optical=await json(`/v2/sky/sdss-optical/${offer.publicationHash}/manifest`);
    assertSdssOpticalManifest(optical,reference);publications.push(optical);
    const deep=deepPublication.entries.find((row:any)=>row.objectRef===reference);assert(deep);
    const index=report.skyScene.deepSky!.catalog!.entries.findIndex(row=>row.objectRef===reference);
    const point=frame.points!.find(row=>row[0]===index)!;assert(point&&point[2]!>0,`above-horizon ${reference}`);
    const basis=createSkyViewBasis(point[1]!,90+point[2]!,0)!;
    for(const level of ["OVERVIEW","MEDIUM","DETAIL"] as const) {
      const asset=optical.levels[level];images.push({id:`sdss:${reference}:${level}`,width:512,height:512,data:await image(asset)});
    }
    const infrared=deep.levels.OVERVIEW;
    images.push({id:`w3:${reference}`,width:infrared.pixels,height:infrared.pixels,data:await image(infrared)});
    for(const fov of [reference==="M:81"?.5:.3,.05]) {
      const level=sdssOpticalLevelForFov(fov,reference)!;
      scenarios.push({name:`${reference.replace(":","-")}-${level}`,reference,at,basis,fov,mode:"NIGHT",point,
        optical:{reference,publicationHash:offer.publicationHash,level,fieldDegrees:optical.levels[level].fieldDegrees,id:`sdss:${reference}:${level}`},
        deep:{reference,publicationHash:backend.publicationHash,level:"OVERVIEW",fieldDegrees:infrared.fieldDegrees,id:`w3:${reference}`}});
    }
  }
  const m82=scenarios.find(row=>row.name==="M-82-OVERVIEW");
  scenarios.push({...m82,name:"M-82-optical-unavailable",optical:null});
  scenarios.push({...m82,name:"M-82-red",mode:"OBSERVATION"});
  scenarios.push({...m82,name:"M-82-next-frame",at:"2026-04-01T15:00:00.000Z"});
  const bundle=await build({stdin:{resolveDir:root,contents:
    "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer'; export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';"},
    bundle:true,write:false,metafile:true,format:"iife",globalName:"skyProduction",platform:"browser",target:"es2022",
    tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
  const sourceHashes=await Promise.all(Object.keys(bundle.metafile!.inputs).filter(file=>file!=="<stdin>").map(async file=>({file,sha256:digest(await fs.readFile(path.join(root,file)))})));
  await fs.writeFile(path.join(output,"production.js"),bundle.outputFiles[0]!.text);
  const require=createRequire(import.meta.url);
  const {chromium}=require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
  browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate("globalThis.__name = target => target");
  await page.addScriptTag({content:bundle.outputFiles[0]!.text});
  await page.evaluate(async ({images,report})=>{
    const decoded=new Map(),ids=new WeakMap();
    for(const asset of images){const image=new Image();image.src=asset.data;await image.decode();
      if(image.width!==asset.width||image.height!==asset.height)throw Error("image_dimensions");decoded.set(asset.id,image);ids.set(image,asset.id);}
    const gl=document.querySelector("canvas")!.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error("software_webgl_missing");
    const resources={created:0,deleted:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
    gl.createTexture=()=>{const value=create();if(value)resources.created++;return value;};
    gl.deleteTexture=value=>{if(value)resources.deleted++;remove(value);};
    const failures:string[]=[];
    const renderer=(globalThis as any).skyProduction.createSkyGpuRenderer(gl,1,{imageFailed:(image:object)=>failures.push(ids.get(image))});
    (globalThis as any).inputs={decoded,ids,gl,renderer,resources,failures,report};
  },{images,report});
  const rows:any[]=[];
  for(const scenario of scenarios) {
    const row=await page.evaluate(scenario=>{
      const inputs=(globalThis as any).inputs;let snapshot:any,sources:any;
      const deep={...scenario.deep,image:inputs.decoded.get(scenario.deep.id)};
      const optical=scenario.optical?{...scenario.optical,image:inputs.decoded.get(scenario.optical.id)}:null;
      const args:any[]=Array(36).fill(undefined);
      args[0]=inputs.renderer;args[1]=inputs.report;args[2]=scenario.at;args[3]=null;args[4]=null;
      args[5]=390.4;args[6]=844;args[7]=scenario.mode;args[8]=(value:any,painted:any)=>{snapshot=value;sources=painted;};
      args[10]=scenario.fov;args[11]=deep;args[12]=scenario.basis;args[30]=optical;
      args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
      (globalThis as any).skyProduction.drawSkyScene(...args);inputs.gl.finish();
      return {name:scenario.name,reference:scenario.reference,at:scenario.at,fov:scenario.fov,mode:scenario.mode,
        optical:optical?{reference:optical.reference,publicationHash:optical.publicationHash,level:optical.level,fieldDegrees:optical.fieldDegrees}:null,
        paintedOptical:sources?.sdssOpticalImage?inputs.ids.get(sources.sdssOpticalImage):null,
        paintedInfrared:sources?.deepSkyImage?inputs.ids.get(sources.deepSkyImage):null,
        successfulFrame:snapshot?.frameAt,paintedObjects:snapshot?.objects?.map((row:any)=>row.reference)??[],
        failures:[...inputs.failures],glError:inputs.gl.getError()};
    },scenario);
    assert.equal(row.glError,0);assert.equal(row.failures.length,0);assert.equal(row.successfulFrame,scenario.at);
    if(scenario.mode==="OBSERVATION" || scenario.name.endsWith("next-frame"))assert.equal(row.paintedOptical,null);
    else if(scenario.optical)assert.equal(row.paintedOptical,scenario.optical.id,`real painted ${scenario.name}`);
    else assert.equal(row.paintedInfrared,`w3:${scenario.reference}`,"independent infrared fallback remains painted");
    const file=`${scenario.name}.png`;await page.screenshot({path:path.join(output,file)});
    rows.push({...row,image:file,sha256:digest(await fs.readFile(path.join(output,file)))});
  }
  const resources=await page.evaluate(()=>{const inputs=(globalThis as any).inputs;inputs.renderer.dispose();return inputs.resources;});
  assert(resources.created>0);assert.equal(resources.deleted,resources.created);
  const result={scope:"Compiled production controllers with explicit Memory/weather ports; actual production GPU and HTTP hash-bound originals. Software Chromium only; not native controls, present-weather, full quality, scientific per-pixel coverage or device acceptance",platform:"Chromium/SwiftShader",
    spot:{latitude:spot.wgs84.latitude,longitude:spot.wgs84.longitude,timezone:spot.timezone},at,
    logicalViewport:{width:390.4,height:844},backingViewport:{width:390,height:844},
    sourceBundleSha256:digest(bundle.outputFiles[0]!.text),sourceHashes,
    catalogHash:stars.catalogHash,deepPublicationHash:backend.publicationHash,
    publications:publications.map(row=>({reference:row.objectRef,publicationHash:row.publicationHash,publicationId:row.publicationId})),
    rows,resources};
  await fs.writeFile(path.join(output,"result.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({output,cases:rows.length,resources,scope:result.scope}));
} finally { await browser?.close();await backend.close(); }
