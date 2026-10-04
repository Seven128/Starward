// Bounded reproducible pixel trial with cached real PNGs and current Scene/GPU owners.
// Controlled report/camera, browser decode + software WebGL; no ordinary/default/native claim.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { assertPreparedOpticalManifest } from "../../../../packages/miniapp-contracts/src/prepared-optical-publication.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const out = path.resolve(process.argv[2]), relative = path.relative(path.join(root, "output/playwright"), out);
assert(relative && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
await mkdir(out);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const bind = async file => { const b = await readFile(file); return { path: path.relative(root, file).replaceAll("\\", "/"), bytes: b.length, sha256: sha(b) }; };
const save = (name, value) => writeFile(path.join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const base = path.join(root, "output/hubble-m82-prepared-publication-1004-r2");
const raw = await readFile(path.join(base, "manifest.json")); assert.equal(sha(raw), "3823d73fbc836710141e4052c9950de148a7bebb608b943ffb601111e383a7ca");
const publication = JSON.parse(raw); assertPreparedOpticalManifest(publication, "M:82", publication.publicationHash);
const data = {}, files = [fileURLToPath(import.meta.url), path.join(base, "manifest.json")];
for (const [level, asset] of Object.entries(publication.levels)) {
  const file = path.join(base, asset.file), b = await readFile(file); assert.equal(b.length, asset.bytes); assert.equal(sha(b), asset.sha256);
  data[level] = "data:image/png;base64," + b.toString("base64"); files.push(file);
}
const protectedRows = JSON.parse(await readFile(path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8"));
files.push(...protectedRows.map(row => path.join(root, row.path)));
const require = createRequire(path.join(root, "apps/wechat-miniapp/package.json"));
const playwrightPath = "C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const { chromium } = require(playwrightPath);
files.push(process.execPath, chromium.executablePath(), require.resolve("typescript/package.json"), require.resolve("typescript/lib/typescript.js"));
assert.equal(require("typescript/package.json").version, "5.9.3");
const before = await Promise.all(files.map(bind));
for (const row of protectedRows) assert.equal(before.find(item => item.path === row.path)?.sha256, row.sha256);
await save("inputs-before.json", before);
await writeFile(path.join(out,"executed-script.mjs"),await readFile(fileURLToPath(import.meta.url)),{flag:"wx"});
const entry = `
import {OBSERVATION_FRAME_FORMAT} from './packages/miniapp-contracts/src/index';
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skyPreparedOpticalFrame} from './apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {registerSkyNativeImageLifetime} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {createSkyViewBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
const publication=${JSON.stringify(publication)}, data=${JSON.stringify(data)};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}}freeze(publication);
const width=390,height=844,at='2026-10-03T00:00:00.000Z';
const az=(90-publication.center.raDeg+360)%360,alt=publication.center.decDeg;
const report={hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:-24}],observationFrames:[{format:OBSERVATION_FRAME_FORMAT,at,
 observer:{latitude:22.54,longitude:113.95,elevationM:50},equatorialToEnu:[1,0,0,0,1,0,0,0,1]}],
 skyScene:{state:'UNAVAILABLE',catalog:null,publication:null,frames:[],deepSky:{state:'UNAVAILABLE',catalog:null,frames:[]}},targetFrames:[]};
const images={};
async function init(){for(const level of Object.keys(data)){const image=new Image();image.src=data[level];await image.decode();
 if(image.naturalWidth!==512||image.naturalHeight!==512)throw Error('unexpected decoded dimensions');images[level]=image;}}
const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
function run(condition){
 report.hourly[0].sunAltitudeDeg=condition.sunAltitude??-24;
 const canvas=document.querySelector('canvas');canvas.width=width;canvas.height=height;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('software WebGL unavailable');
 const live=new Map(),counts={created:0,deleted:0};
 const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
 gl.createTexture=()=>{const x=create();if(x){live.set(x,true);counts.created++;}return x;};
 gl.deleteTexture=x=>{if(x&&live.get(x)){live.set(x,false);counts.deleted++;}return remove(x);};
 const active={OVERVIEW:true,MEDIUM:true,DETAIL:true},retire=[];
 for(const level of Object.keys(images))retire.push(registerSkyNativeImageLifetime(images[level],()=>active[level]));
 if(condition.retireFine)active[condition.level]=false;
 const failed=[],renderer=createSkyGpuRenderer(gl,1,{imageFailed:image=>failed.push(Object.entries(images).find(([,x])=>x===image)?.[0])});
 // No new auxiliary allocation policy: default receipts remain UNKNOWN.
 const frame=condition.baseline?null:skyPreparedOpticalFrame({image:images[condition.level],renderedLevel:condition.level,
  renderedAsset:publication.levels[condition.level],publication,coarser:condition.parent?{image:images[condition.parent],
  level:condition.parent,asset:publication.levels[condition.parent]}:null});
 const args=[renderer,report,at,null,null,width,height,condition.mode??'NIGHT'];let completed=null,done=0;
 args[8]=(_snapshot,sources)=>{completed=sources.sdssOptical;};args[9]=()=>done++;args[10]=condition.fov;
 const basis=createSkyViewBasis(az,90+alt,0),angle=(condition.roll??0)*Math.PI/180;
 // Device gamma is a tilt, not an in-plane camera roll. This controlled rigid
 // roll keeps forward fixed and rotates the screen axes around that direction.
 args[12]={forward:basis.forward,right:basis.right.map((v,i)=>Math.cos(angle)*v-Math.sin(angle)*basis.up[i]),
  up:basis.up.map((v,i)=>Math.cos(angle)*v+Math.sin(angle)*basis.right[i])};args[30]=frame;args[31]=image=>failed.push(Object.entries(images).find(([,x])=>x===image)?.[0]);
 if(!condition.wrongPort)args[37]={surface:renderer,reference:publication.objectRef,publicationHash:publication.publicationHash};
 else args[36]={surface:renderer,reference:publication.objectRef,publicationHash:publication.publicationHash};
 drawSkyScene(...args);
 const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 const error=gl.getError(),png=canvas.toDataURL('image/png').split(',')[1],summary=completed?{
  kind:completed.kind,hash:completed.publicationHash,fields:completed.participatingFields.map(field=>({slot:field.slot,level:field.level})),receipt:completed.receipt}:null;
 renderer.dispose();retire.forEach(fn=>fn());gl.createTexture=create;gl.deleteTexture=remove;
 return {rgba:base64(pixels),png,error,done,failed,completed:summary,textureObjects:counts,liveTextureObjects:[...live.values()].filter(Boolean).length,
 decoded:Object.fromEntries(Object.entries(images).map(([level,image])=>[level,[image.naturalWidth,image.naturalHeight]]))};
}
globalThis.preparedPixelProbe={init,run};`;
await writeFile(path.join(out, "executed-browser-entry.ts"), entry, { flag: "wx" });
const parsed = new Map();
const bundle = await build({stdin:{contents:entry,resolveDir:root,loader:"ts"},absWorkingDir:root,bundle:true,platform:"browser",format:"iife",target:"es2022",write:false,metafile:true,
 plugins:[{name:"bind-actual-parsed-buffers",setup(api){api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async args=>{
  const b=await readFile(args.path),ext=path.extname(args.path).slice(1),row={...await bind(args.path),sha256:sha(b),bytes:b.length};
  const previous=parsed.get(args.path);if(previous)assert.equal(previous.sha256,row.sha256);parsed.set(args.path,row);
  return {contents:b.toString("utf8"),loader:ext==='json'?'json':ext==='tsx'?'tsx':ext==='ts'?'ts':'js',resolveDir:path.dirname(args.path)};
 });}}]});
const sourceBefore=[...parsed.values()];await save("parsed-inputs.json",sourceBefore);
await writeFile(path.join(out,"executed-browser-bundle.js"),bundle.outputFiles[0].contents,{flag:"wx"});await save("bundle-metafile.json",bundle.metafile);
const launch={executablePath:chromium.executablePath(),headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]};
await save("toolchain.json",{node:process.version,typescript:require("typescript/package.json").version,playwright:require(playwrightPath+"/package.json").version,launch,scope:"Selected actual parser buffers/executable identities, not full vendor load trace or native memory."});
const browser=await chromium.launch(launch),rows=[],errors=[];
const conditions=[{name:"overview",level:"OVERVIEW",parent:null,fov:.38,roll:0},
 {name:"medium-parent",level:"MEDIUM",parent:"OVERVIEW",fov:.17,roll:0},
 {name:"detail-parent-rotated",level:"DETAIL",parent:"MEDIUM",fov:.10,roll:37},
 {name:"retired-detail-coarse",level:"DETAIL",parent:"MEDIUM",fov:.10,roll:37,retireFine:true},
 {name:"medium-only-same-view",level:"MEDIUM",parent:null,fov:.10,roll:37},
 {name:"twilight-overview",level:"OVERVIEW",parent:null,fov:.38,roll:0,sunAltitude:-6},
 {name:"day-overview",level:"OVERVIEW",parent:null,fov:.38,roll:0,sunAltitude:35},
 {name:"observation-mode",level:"OVERVIEW",parent:null,fov:.38,roll:0,mode:"OBSERVATION"}];
let failure;
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on("pageerror",error=>errors.push(error.message));
 await page.setContent('<!doctype html><canvas style="width:390px;height:844px"></canvas>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>globalThis.preparedPixelProbe.init());await save("browser.json",{version:browser.version()});
 for(const condition of conditions){
  const captured=await page.evaluate(condition=>globalThis.preparedPixelProbe.run(condition),condition);
  const baseline=await page.evaluate(condition=>globalThis.preparedPixelProbe.run({...condition,baseline:true}),condition);
  assert.equal(captured.error,0);assert.equal(baseline.error,0);assert.equal(captured.done,1);assert.equal(captured.liveTextureObjects,0);
  await save(condition.name+"-actual-summary.json",{condition,error:captured.error,done:captured.done,failed:captured.failed,completed:captured.completed,textureObjects:captured.textureObjects});
  const rgba=Buffer.from(captured.rgba,"base64"),bg=Buffer.from(baseline.rgba,"base64"),png=Buffer.from(captured.png,"base64");
  let differentPixels=0;for(let i=0;i<rgba.length;i+=4)if(rgba[i]!==bg[i]||rgba[i+1]!==bg[i+1]||rgba[i+2]!==bg[i+2])differentPixels++;
  assert.equal(rgba.length,390*844*4);assert(condition.mode==="OBSERVATION"?differentPixels===0:differentPixels>1000);
  assert.equal(captured.completed,null,"without auxiliary observation allocation the actual GPU receipt is incomplete; rendered pixels cannot manufacture completed source credit");
  await writeFile(path.join(out,condition.name+".rgba"),rgba,{flag:"wx"});await writeFile(path.join(out,condition.name+"-baseline.rgba"),bg,{flag:"wx"});
  await writeFile(path.join(out,condition.name+".png"),png,{flag:"wx"});
  delete captured.rgba;delete captured.png;rows.push({condition,...captured,differentPixels,rgba:{bytes:rgba.length,sha256:sha(rgba),rowOrder:"bottom-first"},png:{bytes:png.length,sha256:sha(png)},baselineRgbaSha256:sha(bg)});
 }
 const a=await readFile(path.join(out,"retired-detail-coarse.rgba")),b=await readFile(path.join(out,"medium-only-same-view.rgba"));
 assert.deepEqual(a,b,"retired fine must exactly use the independently current medium color in the same controlled view");
} catch(error){failure=String(error);} finally {await browser.close();}
const after=await Promise.all(files.map(bind)),sourceAfter=await Promise.all([...parsed.keys()].map(bind));
await save("inputs-after.json",after);await save("parsed-inputs-after.json",sourceAfter);
const exact=JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
const result={status:!failure&&errors.length===0&&exact?"PASSED_BOUNDED_M82_PREPARED_SCENE_EXECUTION":"FAILED",failure,errors,rows,beforeAfterExact:exact,
 parserBufferInputs:sourceBefore.length,boundInputs:before.length,sourceNetworkRequests:0,originalJpegDecodesOrReprojections:0,browserPngDecodes:3,
 scope:"Actual three pinned Prepared PNG decodes, current complete Scene + software WebGL/GPU shaders in a controlled report/camera with catalog unavailable. Executed rows bind the actual finite-field/default-budget frames and matching backgrounds; This new-source run checks five LOD/retirement conditions plus twilight/day/observation backgrounds; exact retired-fine/medium-only equality and observation-mode absence are mechanical checks, not visual acceptance. Default-no-auxiliary-budget returns an incomplete UNKNOWN receipt and no optical completion/credit. No full app/native scene, visible full credit, physical astrometry/quality/default adoption, client total memory or capacity certification."};
await save("result.json",result);console.log(JSON.stringify({status:result.status,failure,frames:rows.length,inputsExact:exact,...await bind(path.join(out,"result.json"))}));
process.exitCode=result.status==='FAILED'?1:0;
