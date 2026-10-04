// Actual frozen report/catalog plus shared optical local observation.
// Reuses the prior declared-resource measurement scaffold; no production transform.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { presentSkyTime } from "../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts";
import { exactSkyObservationFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts";
import { resolveConstellationFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts";
import { buildDeepSkyScene, deepSkySceneCacheKey } from "../../../../workers/miniapp-api/src/deep-sky-scene-provider.ts";
import { assertPreparedOpticalManifest } from "../../../../packages/miniapp-contracts/src/prepared-optical-publication.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const out = path.resolve(process.argv[2]);
assert.equal(path.dirname(out), path.join(root, "output/playwright"));
assert(path.basename(out).startsWith("cloud-sky-prepared-catalog-resource-"));
await mkdir(out);
const sha = b => createHash("sha256").update(b).digest("hex");
const bind = async p => { const raw = await readFile(p); return {
  path: path.relative(root, p).replaceAll("\\", "/"), bytes: raw.length, sha256: sha(raw) }; };
const save = (name, x) => writeFile(path.join(out, name), JSON.stringify(x, null, 2)+"\n", { flag: "wx" });
const base = path.join(root, "output/prepared-optical-publication-1003-r4/publication");
const raw = await readFile(path.join(base, "manifest.json"));
assert.equal(sha(raw), "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1");
const publication = JSON.parse(raw); assertPreparedOpticalManifest(publication, "M:51", publication.publicationHash);
const files = [fileURLToPath(import.meta.url), path.join(base, "manifest.json")], imageData = {};
for (const level of ["MEDIUM", "DETAIL"]) {
  const asset = publication.levels[level], p = path.join(base, asset.file), b = await readFile(p);
  assert.equal(b.length, asset.bytes); assert.equal(sha(b), asset.sha256);
  files.push(p); imageData[level] = "data:image/png;base64,"+b.toString("base64");
}

const previousDir = path.join(root, 'output/playwright/cloud-sky-wide-resource-composition-1002');
const previousFile = path.join(previousDir, 'result.json');
const previous = JSON.parse(await readFile(previousFile, 'utf8'));
files.push(previousFile, path.join(root, '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-prepared-resource-ledger-2026-10-03.mjs'));
const reportFile = path.join(root, previous.report.path), reportBytes = await readFile(reportFile);
assert.equal(sha(reportBytes), previous.report.sha256); files.push(reportFile);
async function frozenJson(route) {
 const row = previous.inputs.find(row => row.route === route);
 assert(row && row.transport === 'CURRENT_LOCAL_BFF_JSON', route);
 const p = path.join(previousDir, 'input-'+(previous.inputs.indexOf(row)+1)+'.json');
 const bytes = await readFile(p); assert.equal(sha(bytes), row.sha256); files.push(p);
 return JSON.parse(bytes);
}
const admitted = projectAdoptedSkyCatalog(JSON.parse(reportBytes)).data;
const stars = (await frozenJson('/v2/sky/catalogs/'+admitted.skyScene.catalog.catalogVersion+'/'+admitted.skyScene.catalog.catalogHash)).data;
const figures = (await frozenJson('/v2/sky/constellations')).data;
const atHost = new Date(admitted.context.at).toISOString();
const time = presentSkyTime(admitted, atHost); assert(time);
const oldReportHost = attachSkyCatalog(time.report, stars);
const hostObserver = exactSkyObservationFrame(oldReportHost, atHost)?.observer;
assert(hostObserver);
const generatedDeepSky = buildDeepSkyScene([atHost], {
 wgs84: { latitude: hostObserver.latitude, longitude: hostObserver.longitude, system: 'WGS84' },
 altitudeM: hostObserver.elevationM,
});
assert.equal(generatedDeepSky.state, 'AVAILABLE');
assert.equal(generatedDeepSky.catalog.catalogHash, oldReportHost.skyScene.deepSky.catalog.catalogHash);
assert.deepEqual(generatedDeepSky.catalog.entries.map(x=>x.objectRef), oldReportHost.skyScene.deepSky.catalog.entries.map(x=>x.objectRef));
assert(oldReportHost.skyScene.deepSky.catalog.entries.every(x=>x.icrsCenter===undefined));
const reportHost = {...oldReportHost, skyScene: {...oldReportHost.skyScene, deepSky: generatedDeepSky}};
const starFrameHost = resolveSkySceneFrame(reportHost.skyScene, atHost); assert(starFrameHost?.points.length);
const observationHost = exactSkyObservationFrame(reportHost, atHost); assert(observationHost);
const constellationFrameHost = resolveConstellationFrame(figures, reportHost.skyScene, atHost); assert(constellationFrameHost);
const sceneHost = {report: reportHost, oldReport: oldReportHost, observation: observationHost, constellations: constellationFrameHost};
await save('generated-deep-sky-scene.json', {producer:'buildDeepSkyScene',cacheKey:deepSkySceneCacheKey(),
 input:{at:atHost,observer:hostObserver},scene:generatedDeepSky,
 scope:'Actual current local producer/source, bound to frozen-report observer/time. Not a fresh BFF capture or live weather/network response.'});
for (const p of ['apps/wechat-miniapp/src/services/sky-report-catalog.ts',
 'apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts','apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts',
 'apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts','apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts',
 'workers/miniapp-api/src/deep-sky-scene-provider.ts','packages/astronomy-core/src/deep-sky-catalog.ts',
 'packages/astronomy-core/src/deep-sky-catalog-data.ts','packages/astronomy-core/data/opengc-messier-deep-sky.v1.json',
 'packages/astronomy-core/data/opengc-messier-deep-sky.v1.manifest.json']) files.push(path.join(root,p));
const protectedRows = JSON.parse(await readFile(path.join(root,
  ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8"));
files.push(...protectedRows.map(row => path.join(root, row.path)));
const require = createRequire(path.join(root, "apps/wechat-miniapp/package.json"));
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
assert.equal(require("typescript/package.json").version, "5.9.3");
files.push(process.execPath, chromium.executablePath(), require.resolve("typescript/package.json"),
  path.join(root, "packages/astronomy-core/src/observation-frame.ts"),
  path.join(root, "packages/astronomy-core/src/astronomy-engine-runtime.ts"), require.resolve("astronomy-engine"));
const before = await Promise.all(files.map(bind));
for (const row of protectedRows) assert.equal(before.find(x => x.path === row.path)?.sha256, row.sha256);
await save("inputs-before.json", before);
await writeFile(path.join(out, "executed-driver.mjs"), await readFile(fileURLToPath(import.meta.url)), { flag: "wx" });
const observation = observationHost;
const entry = `
import {OBSERVATION_FRAME_FORMAT} from './packages/miniapp-contracts/src/index';
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {SKY_ARTWORK_MAX_REDUCTION_STRIDE} from './apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skyPreparedOpticalFrame} from './apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {registerSkyNativeImageLifetime} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {createSkyViewBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {skyEquatorialDirectionToEnu} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {skyOpticalSourceCredit} from './apps/wechat-miniapp/src/features/sky/sky-optical-source-credit';
const publication=${JSON.stringify(publication)}, data=${JSON.stringify(imageData)}, scene=${JSON.stringify(sceneHost)}, observation=scene.observation;
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}}freeze(publication);
observation.format=OBSERVATION_FRAME_FORMAT;freeze(observation);
const width=390,height=844,at=observation.at,rad=Math.PI/180;
const ra=publication.center.raDeg*rad,dec=publication.center.decDeg*rad;
const direction=skyEquatorialDirectionToEnu(observation.equatorialToEnu,[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)]);
const az=(Math.atan2(direction[0],direction[1])/rad+360)%360,alt=Math.asin(direction[2])/rad;
const report=scene.report;freeze(report);freeze(scene.oldReport);freeze(scene.constellations);
const images={};
async function init(){for(const level of Object.keys(data)){const image=new Image();image.src=data[level];await image.decode();images[level]=image;}}
const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
function demand(w,h){const target=w*h*4,levels=[];while(w>1||h>1){w=Math.ceil(w/SKY_ARTWORK_MAX_REDUCTION_STRIDE);h=Math.ceil(h/SKY_ARTWORK_MAX_REDUCTION_STRIDE);levels.push({width:w,height:h,bytes:w*h*4});}
 return {stride:SKY_ARTWORK_MAX_REDUCTION_STRIDE,target,levels,scratch:levels.reduce((n,x)=>n+x.bytes,0),total:target+levels.reduce((n,x)=>n+x.bytes,0)};}
function run(condition){
 const report=condition.original?scene.oldReport:scene.report;
 const canvas=document.createElement('canvas');canvas.width=width*condition.ratio;canvas.height=height*condition.ratio;
 canvas.style.width=width+'px';canvas.style.height=height+'px';document.body.append(canvas);
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true});if(!gl)throw Error('software WebGL unavailable');
 const requested=demand(canvas.width,canvas.height),limit=requested.total-(condition.under?1:0);
 const records=[],handles=new Map(),events=[],unsupported=[];let stage='construction',sequence=0;
 const counts={},original={};
 const resourceKinds=['Texture','Framebuffer','Buffer','Program','Shader','Renderbuffer'];
 function event(op,record,extra={}){events.push({stage,op,id:record?.id??null,kind:record?.kind??null,...extra});}
 for(const kind of resourceKinds){const create='create'+kind,remove='delete'+kind;original[create]=gl[create].bind(gl);original[remove]=gl[remove].bind(gl);
  counts[kind]={created:0,deleteRequested:0};
  gl[create]=(...args)=>{const x=original[create](...args);if(x){const r={id:++sequence,kind,bytes:0,deleteRequested:false,createdStage:stage};handles.set(x,r);records.push(r);counts[kind].created++;event('create',r);}return x;};
  gl[remove]=x=>{const r=handles.get(x);if(r&&!r.deleteRequested){r.deleteRequested=true;counts[kind].deleteRequested++;event('delete-request',r);}return original[remove](x);};
 }
 for(const name of ['texImage2D','bufferData','shaderSource','attachShader','detachShader','drawArrays','drawElements','readPixels'])original[name]=gl[name].bind(gl);
 gl.texImage2D=(...args)=>{const result=original.texImage2D(...args),r=handles.get(gl.getParameter(gl.TEXTURE_BINDING_2D));
  const explicit=args.length===9, w=explicit?args[3]:args[5]?.width,h=explicit?args[4]:args[5]?.height;
  const format=explicit?args[6]:args[3],type=explicit?args[7]:args[4];
  const channels=format===gl.RGBA?4:format===gl.RGB?3:null;
  if(!r||args[0]!==gl.TEXTURE_2D||args[1]!==0||!channels||type!==gl.UNSIGNED_BYTE||!Number.isSafeInteger(w*h*channels))unsupported.push({stage,kind:'texture-storage',w,h,format,type});
  else{r.bytes=w*h*channels;r.width=w;r.height=h;r.format=format;r.type=type;event('texture-storage',r,{bytes:r.bytes,width:w,height:h});}return result;};
 gl.bufferData=(target,data,usage)=>{const result=original.bufferData(target,data,usage),binding=target===gl.ARRAY_BUFFER?gl.ARRAY_BUFFER_BINDING:target===gl.ELEMENT_ARRAY_BUFFER?gl.ELEMENT_ARRAY_BUFFER_BINDING:null;
  const r=binding===null?null:handles.get(gl.getParameter(binding)),n=typeof data==='number'?data:data?.byteLength;
  if(!r||!Number.isSafeInteger(n)||n<0)unsupported.push({stage,kind:'buffer-storage',target});else{r.bytes=n;event('buffer-storage',r,{bytes:n});}return result;};
 gl.shaderSource=(shader,source)=>{const r=handles.get(shader);if(r){r.source=source;r.sourceBytes=new TextEncoder().encode(source).length;}return original.shaderSource(shader,source);};
 gl.attachShader=(program,shader)=>{event('attach-shader',handles.get(program),{shader:handles.get(shader)?.id});return original.attachShader(program,shader);};
 gl.detachShader=(program,shader)=>{event('detach-shader',handles.get(program),{shader:handles.get(shader)?.id});return original.detachShader(program,shader);};
 for(const name of ['drawArrays','drawElements','readPixels'])gl[name]=(...args)=>{events.push({stage,op:name,width:name==='readPixels'?args[2]:undefined,height:name==='readPixels'?args[3]:undefined});return original[name](...args);};
 function snapshot(name){return {stage:name,counts:structuredClone(counts),notDeleteRequested:Object.fromEntries(resourceKinds.map(kind=>[kind,records.filter(r=>r.kind===kind&&!r.deleteRequested).length])),
  declaredTextureBytes:records.filter(r=>r.kind==='Texture'&&!r.deleteRequested).reduce((n,r)=>n+r.bytes,0),
  declaredBufferBytes:records.filter(r=>r.kind==='Buffer'&&!r.deleteRequested).reduce((n,r)=>n+r.bytes,0),
  drawCalls:events.filter(e=>e.stage===name&&(e.op==='drawArrays'||e.op==='drawElements')).length,
  readbacks:events.filter(e=>e.stage===name&&e.op==='readPixels').map(e=>[e.width,e.height])};}
 const active={MEDIUM:true,DETAIL:true},retire=Object.entries(images).map(([level,image])=>registerSkyNativeImageLifetime(image,()=>active[level]));
 const failed=[],methodCalls=[];
 const actual=createSkyGpuRenderer(gl,condition.ratio,{imageFailed:()=>failed.push('image_failed'),
  ...(condition.disabled?{}:{artworkContributions:{auxiliaryBytesLimit:limit,maxGroups:1}})});
 const renderer=new Proxy(actual,{get(target,key){const value=Reflect.get(target,key);if(typeof value!=='function')return value;
  return (...args)=>{const result=Reflect.apply(value,target,args);methodCalls.push({stage,name:String(key),
   ...(key==='artworkLevelsObserveRegion'?{result}:{}),
   ...(key==='disc'?{kind:args[6]??'catalog-or-target',x:args[0],y:args[1]}:{})});return result;};}});
 const frame=skyPreparedOpticalFrame({publication,image:images.DETAIL,renderedLevel:'DETAIL',renderedAsset:publication.levels.DETAIL,
  coarser:{image:images.MEDIUM,level:'MEDIUM',asset:publication.levels.MEDIUM}});
 const args=[renderer,report,at,null,null,width,height,'NIGHT'];let completion=null,done=0;
 let accepted=null;
 args[8]=(snapshot,sources)=>{accepted=snapshot;completion=sources.sdssOptical;};args[9]=()=>done++;args[10]=condition.fov;
 args[12]=createSkyViewBasis(az,90+alt,0);args[30]=frame;
 args[15]={frame:scene.constellations,images:new Map(),enabled:true,failed:()=>failed.push('constellation_image_failed')};
 args[34]={enabled:true};
 args[37]={surface:renderer,reference:publication.objectRef,publicationHash:publication.publicationHash};
 const frames=[],pixels=[];let firstPng;
 for(const name of ['cold','warm','idle']){stage=name;if(name==='idle')args[30]=null;
  const start=performance.now();drawSkyScene(...args);gl.finish();const elapsed=performance.now()-start;
  const resources=snapshot(name),credit=skyOpticalSourceCredit(completion);
  const rgba=new Uint8Array(canvas.width*canvas.height*4);original.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
  if(name==='cold')firstPng=canvas.toDataURL('image/png').split(',')[1];
  pixels.push({stage:name,rgba:base64(rgba)});
  frames.push({name,done,elapsedSoftwareGlFinishMs:elapsed,error:gl.getError(),resources,credit,
    accepted:accepted?{frameAt:accepted.frameAt,catalogVersion:accepted.catalogVersion,objectCount:accepted.objects?.length??0,deepSkyAuxiliaryDecisions:accepted.deepSkyAuxiliaryDecisions,landscapeKind:accepted.view.landscape?.kind}:null,
    methods:methodCalls.filter(x=>x.stage===name),
    completion:completion?{kind:completion.kind,hash:completion.publicationHash,fields:completion.participatingFields.map(f=>({slot:f.slot,level:f.level})),receipt:completion.receipt}:null});
 }
 stage='dispose';renderer.dispose();retire.forEach(fn=>fn());gl.finish();
 const afterDispose=snapshot('dispose'),error=gl.getError();
 for(const [name,method] of Object.entries(original))gl[name]=method;
 const attributes=gl.getContextAttributes();canvas.remove();
 return {condition,physical:[canvas.width,canvas.height],attributes,requested,limit,decoded:Object.fromEntries(Object.entries(images).map(([level,img])=>[level,[img.naturalWidth,img.naturalHeight]])),
  records,events,unsupported,frames,pixels,firstPng,afterDispose,error,failed,
  reportFacts:{at,solarAltitude:report.hourly.find(x=>x.at===at)?.sunAltitudeDeg,starCatalogRows:report.skyScene.catalog.entries.length,deepSkyEntries:report.skyScene.deepSky.catalog.entries.length,constellationLines:scene.constellations.lines.length}};
}
globalThis.preparedResourceProbe={init,run};`;
await writeFile(path.join(out, "executed-browser-entry.ts"), entry, { flag: "wx" });
const parsed = new Map();
const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: "ts" }, absWorkingDir: root,
  bundle: true, platform: "browser", format: "iife", target: "es2022", write: false, metafile: true,
  plugins: [{ name: "bind-unmodified-parser-inputs", setup(api) { api.onLoad({ filter: /\.(?:[cm]?js|tsx?|json)$/ }, async args => {
    const bytes = await readFile(args.path), ext = path.extname(args.path).slice(1), row = await bind(args.path);
    if (parsed.has(args.path)) assert.equal(parsed.get(args.path).sha256, row.sha256); parsed.set(args.path, row);
    return { contents: bytes.toString("utf8"), loader: ext === "json" ? "json" : ext === "tsx" ? "tsx" : ext === "ts" ? "ts" : "js",
      resolveDir: path.dirname(args.path) };
  }); } }] });
const sourceBefore = [...parsed.values()]; await save("parsed-inputs.json", sourceBefore);
await writeFile(path.join(out, "executed-browser-bundle.js"), bundle.outputFiles[0].contents, { flag: "wx" });
await save("bundle-metafile.json", bundle.metafile);
const launch = { executablePath: chromium.executablePath(), headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] };
await save("launch-options.json", launch);
const browser = await chromium.launch(launch), rows = [], errors = [];
let failure = null;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent("<!doctype html><body></body>"); await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(() => globalThis.preparedResourceProbe.init()); await save("browser.json", { version: browser.version() });
  for (const condition of [{ name: "ratio3-old-catalog-exact", ratio: 3, fov: 13, original: true }, { name: "ratio3-catalog-default", ratio: 3, fov: 13, disabled: true }, { name: "ratio3-catalog-under", ratio: 3, fov: 13, under: true }, { name: "ratio3-catalog-exact", ratio: 3, fov: 13 }]) {
    const captured = await page.evaluate(value => globalThis.preparedResourceProbe.run(value), condition);
    for (const pixels of captured.pixels) {
      const rgba = Buffer.from(pixels.rgba, "base64");
      await writeFile(path.join(out, condition.name+"-"+pixels.stage+".rgba"), rgba, { flag: "wx" });
      pixels.identity = await bind(path.join(out, condition.name+"-"+pixels.stage+".rgba")); delete pixels.rgba;
    }
    await writeFile(path.join(out, condition.name+".png"), Buffer.from(captured.firstPng, "base64"), { flag: "wx" }); delete captured.firstPng;
    await save(condition.name+"-ledger.json", captured);
    assert.equal(captured.error, 0); assert.equal(captured.unsupported.length, 0); assert.equal(captured.failed.length, 0);
    for (const frame of captured.frames) assert.equal(frame.error, 0);
    assert.equal(captured.pixels[0].identity.sha256, captured.pixels[1].identity.sha256, "cold/warm whole actual pixels");
    assert.equal(captured.frames[2].completion, null); assert.equal(captured.frames[2].resources.declaredTextureBytes, 0);
    for (const frame of captured.frames.slice(0, 2)) {
      if(condition.under || condition.disabled) assert.equal(frame.completion,null);
      assert.equal(frame.accepted.frameAt, atHost);
      assert(frame.methods.some(x=>x.name==='disc' && x.kind==='star'), 'real star consumer must paint');
      assert.equal(frame.methods.filter(x=>x.name==='artworkLevelsObserveRegion').length,condition.original?0:1,
        'missing original catalog center stays unknown; current producer supplies one actual pre-aid local region');
      if (condition.under || condition.disabled) assert.equal(frame.resources.notDeleteRequested.Framebuffer, 0);
      else {
        assert(frame.completion, 'exact policy must earn an actual positive completed photo in this declared scenario');
        assert.equal(frame.credit?.credit, publication.source.credit);
      }
    }
    const warmCreates = captured.events.filter(e => e.stage === "warm" && e.op === "create");
    assert.equal(warmCreates.length, 0, "same warm frame must reuse managed GL objects");
    const outstanding = Object.entries(captured.afterDispose.notDeleteRequested).filter(([, count]) => count !== 0);
    rows.push({ condition, physical: captured.physical, requested: captured.requested, limit: captured.limit,
      frames: captured.frames, afterDispose: captured.afterDispose, outstandingDeleteRequests: outstanding,
      ledger: await bind(path.join(out, condition.name+"-ledger.json")), png: await bind(path.join(out, condition.name+".png")) });
  }
} catch (error) { failure = String(error); } finally { await browser.close(); }
const after = await Promise.all(files.map(bind)), sourceAfter = await Promise.all([...parsed.keys()].map(bind));
await save("inputs-after.json", after); await save("parsed-inputs-after.json", sourceAfter);
const exact = JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
const outstanding = rows.some(row => row.outstandingDeleteRequests.length > 0);
const result = { status: failure || errors.length || !exact ? "FAILED" : outstanding ? "MEASURED_WITH_UNREQUESTED_RESOURCE_RELEASE" : "PASSED_BOUNDED_DECLARED_RESOURCE_LEDGER",
  failure, errors, rows, beforeAfterExact: exact, selectedHostInputs: before.length, actualUnmodifiedParserInputs: sourceBefore.length,
  observation, frozenReport: previous.report, sourceNetworkRequests: 0, originalDecodesOrReprojections: 0, browserPngDecodes: 2,
  scope: "Current untransformed production Scene and actual frozen report/BSC/deep-sky/target/constellation geometry with one Prepared pair. Three-times physical scale, default/one-byte-under/exact optional auxiliary policy; cold/warm/no-photo idle/dispose. Actual solar calculation, star and catalog cue consumers and pre-aid local observation. Constellation bitmap map is empty (narrow crop); no SAO packet, W3 tiles, body maps or ground panorama. Model availability is not all image-provider availability. This is the next bounded catalog/composition resource path, not complete Hook/page/native/whole-sky quality, default adoption, total-client memory, phone frame time or 200 DAU capacity. Declared managed texture/buffer storage/delete requests exclude implicit depth/AA/drawing buffers, physical driver retirement/GC/native decode/files." };
await save("result.json", result);
console.log(JSON.stringify({ status: result.status, failure, cases: rows.map(row => ({ name: row.condition.name, logicalAuxiliaryBytes: row.requested.total,
  outstanding: row.outstandingDeleteRequests })), inputsExact: exact, result: await bind(path.join(out, "result.json")) }));
process.exitCode = failure || errors.length || !exact ? 1 : 0;
