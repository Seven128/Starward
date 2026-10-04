// Current compiled task HTTP -> image response owner -> decoded PNG -> GPU/pick.
// Fresh public Context/report, controlled native file callbacks; browser closes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-area-display-support-current-checked-0930');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const before=JSON.parse(await fs.readFile('output/playwright/cloud-sky-area-support-0930-final/result.json','utf8'));
const previous=await fs.readFile('output/playwright/cloud-sky-scene-v47-lines-checked-0930/production.js');
assert.equal(sha(previous),before.productionBundleSha256);
const compiled=await build({stdin:{resolveDir:path.resolve('.'),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';export {startDeepSkyImageRequest} from './apps/wechat-miniapp/src/features/sky/deep-sky-image-request';"},
  bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'scene49Gpu',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=compiled.outputFiles[0]!.text;
await fs.writeFile(path.join(output,'production.js'),production,{flag:'wx'});
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const reportBytes=await fs.readFile(path.join(task,'tmp/v49-current-public-report.json'));
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const presentation=presentSkyTime(raw,before.at)!;assert(presentation);
const starResponse=await fetch('http://127.0.0.1:60065'+before.starInput.route,{signal:AbortSignal.timeout(15000)});
assert.equal(starResponse.status,200);const starBytes=Buffer.from(await starResponse.arrayBuffer());
// HTTP envelopes have a new request/time identity after the epoch change;
// the production catalog owner validates the actual publication against the report.
const starData=JSON.parse(starBytes.toString()).data;
const report=attachSkyCatalog(presentation.report,starData);
const deep=report.skyScene.deepSky!,frame=deep.frames.find(value=>value.at===before.at)!;
const index=deep.catalog!.entries.findIndex(value=>value.objectRef==='M:42');
assert.deepEqual(frame.points!.find(value=>value[0]===index),before.point);
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let browser:any;
try{
  const response=await fetch('http://127.0.0.1:60065/v2/celestial-objects/M%3A42/image?level=DETAIL&imageVersion=source-finite-v3',
    {signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200);const imageBytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(imageBytes),before.source.sha256);
  const headers=Object.fromEntries(response.headers.entries());
  const support=JSON.parse(headers['x-starward-image-display-support']!);
  await fs.writeFile(path.join(output,'response-headers.json'),JSON.stringify(headers,null,2)+'\n',{flag:'wx'});
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors:string[]=[];page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');
  await page.addScriptTag({content:previous.toString()});await page.addScriptTag({content:production});
  const load=await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).scene49Gpu,files=new Map<string,ArrayBuffer>();let ready:any,writes=0,removes=0,failures=0;
    const bytes=Uint8Array.from(atob(input.base64),(ch:string)=>ch.charCodeAt(0));
    api.startDeepSkyImageRequest({asset:{reference:'M:42',level:'DETAIL',tempFilePath:'/owned/source.png'},url:'/actual-response',
      request:(options:any)=>{options.success({statusCode:200,header:input.headers,data:bytes.buffer});return {};},
      writeFile:(options:any)=>{writes++;files.set(options.filePath,options.data);options.success();},
      removeFile:(file:string)=>{removes++;files.delete(file);},onReady:(asset:any)=>{ready=asset;},onError:()=>{failures++;}});
    if(!ready||!ready.displaySupport||failures)throw Error('response_owner_not_ready');
    const image=new Image();image.src='data:image/png;base64,'+input.base64;await image.decode();
    const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error('software_webgl_missing');
    const resources={created:0,deleted:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
    gl.createTexture=()=>{const texture=create();if(texture)resources.created++;return texture;};
    gl.deleteTexture=(texture:WebGLTexture|null)=>{if(texture)resources.deleted++;remove(texture);};
    const renderer=api.createSkyGpuRenderer(gl,1);
    (globalThis as any).inputs={...input,asset:{...ready,image},image,gl,renderer,resources,files,ready,
      fileCounts:()=>({writes,removes,failures,remaining:files.size})};
    return {width:image.width,height:image.height,metadata:ready.displaySupport,fileCounts:{writes,removes,failures,remaining:files.size}};
  },{report,at:before.at,point:before.point,headers,base64:imageBytes.toString('base64'),
    cameraBasis:Object.fromEntries([-67,0,71].map(roll=>{
      const basis=createSkyViewBasis(before.point[1],90+before.point[2],0)!;
      const angle=roll*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
      return [roll,{forward:basis.forward,right:basis.right.map((value,i)=>value*c+basis.up[i]!*s),
        up:basis.up.map((value,i)=>value*c-basis.right[i]!*s)}];
    }))});
  assert.deepEqual(load.metadata,support);assert.equal(load.width,512);assert.equal(load.height,512);
  console.log(JSON.stringify({phase:'actual-http-and-response-owner-ready',publicationHash:headers['x-starward-image-publication-hash']}));
  const rows:any[]=[];
  const scenarios=[
    ...[.05,.12,.8].flatMap(fov=>['before','current','without-support','no-image'].map(edition=>({fov,edition,roll:0,offset:false}))),
    ...[-67,71].flatMap(roll=>[.05,.12,.8].flatMap(fov=>['current','without-support','no-image'].map(edition=>({fov,edition,roll,offset:true})))),
    {fov:.05,edition:'current',roll:0,offset:false},
  ];
  for(let sequence=0;sequence<scenarios.length;sequence++){
    const scenario=scenarios[sequence]!;
    const row=await page.evaluate((scenario:any)=>{
      const input=(globalThis as any).inputs;
      const api=(globalThis as any)[scenario.edition==='before'?'scene47Gpu':'scene49Gpu'];let snapshot:any,sources:any,submitted=0,failed=0;
      const renderer=new Proxy(input.renderer,{get:(target,key)=>key==='artwork'?(...args:any[])=>{submitted++;return target.artwork(...args);}:Reflect.get(target,key)});
      const basis=input.cameraBasis[scenario.roll];
      const args:any[]=Array(36).fill(undefined);args[0]=renderer;args[1]=input.report;args[2]=input.at;args[3]=null;args[4]=null;
      args[5]=390;args[6]=844;args[7]='NIGHT';args[8]=(value:any,painted:any)=>{snapshot=value;sources=painted;};
      args[10]=scenario.fov;args[11]=scenario.edition==='no-image'?null:scenario.edition==='without-support'?{...input.asset,displaySupport:undefined}:input.asset;
      args[12]=basis;args[14]=()=>{failed++;};
      if(scenario.offset)args[13]={x:120,y:370};
      args[34]={enabled:false};args[35]={horizontal:false,equatorial:false};
      api.drawSkyScene(...args);input.gl.finish();
      const pixels=new Uint8Array(390*844*4);input.gl.readPixels(0,0,390,844,input.gl.RGBA,input.gl.UNSIGNED_BYTE,pixels);
      const object=snapshot.objects.find((value:any)=>value.reference==='M:42');
      const picks=object?api.pickPaintedSkyObjects(snapshot,{x:object.x,y:object.y,frameAt:input.at,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash}):[];
      return {...scenario,claimedImage:sources?.deepSkyImage===input.image,submitted,failed,frameAt:snapshot.frameAt,
        objects:snapshot.objects.map((value:any)=>value.reference),picks:picks.map((value:any)=>value.reference),glError:input.gl.getError(),pixels:Array.from(pixels)};
    },scenario);
    assert.equal(row.glError,0);assert.equal(row.failed,0);assert.equal(row.frameAt,before.at);
    assert(row.objects.includes('M:42'),JSON.stringify({sequence,scenario,objects:row.objects}));assert(row.picks.includes('M:42'));
    const image=`${sequence}-${scenario.edition}-${scenario.fov}-roll${scenario.roll}.png`;await page.screenshot({path:path.join(output,image)});
    const {pixels,...rest}=row;rows.push({...rest,rgbaSha256:sha(Uint8Array.from(pixels)),image,imageSha256:sha(await fs.readFile(path.join(output,image)))});
  }
  const narrow=rows.filter(row=>row.fov===.05&&row.roll===0),wide=rows.filter(row=>row.fov===.8&&row.roll===0);
  assert.equal(narrow[0].claimedImage,true);assert.equal(narrow[1].claimedImage,false);assert.equal(narrow[1].submitted,0);
  assert.equal(narrow[1].rgbaSha256,narrow[3].rgbaSha256);assert.equal(narrow[0].rgbaSha256,narrow[2].rgbaSha256);
  assert.equal(narrow.at(-1).rgbaSha256,narrow[1].rgbaSha256,'reverse zoom must restore the catalog cue with the same source owner');
  assert.equal(wide[1].claimedImage,true);assert.equal(wide[1].rgbaSha256,wide[0].rgbaSha256,'useful wider source pixels must stay unchanged');
  assert.notEqual(wide[1].rgbaSha256,wide[3].rgbaSha256);
  for (const roll of [-67,71]) for (const fov of [.05,.12,.8]) {
    const cases=rows.filter(row=>row.roll===roll&&row.fov===fov);
    if(fov===.05){assert.equal(cases[0].claimedImage,false);assert.equal(cases[0].submitted,0);assert.equal(cases[0].rgbaSha256,cases[2].rgbaSha256);}
    else {assert.equal(cases[0].claimedImage,true);assert.equal(cases[0].rgbaSha256,cases[1].rgbaSha256);assert.notEqual(cases[0].rgbaSha256,cases[2].rgbaSha256);}
  }
  const retired=await page.evaluate(()=>{const input=(globalThis as any).inputs;input.renderer.dispose();input.ready.release();return {resources:input.resources,files:input.fileCounts()};});
  assert.equal(retired.resources.created,retired.resources.deleted);assert.equal(retired.files.remaining,0);assert.equal(retired.files.removes,1);assert.equal(errors.length,0);
  const result={scope:'Current compiled owned HTTP headers/body and actual fresh-Context report, response owner, PNG decode and production software WebGL/pick; controlled filesystem callbacks, no native/device composition or performance acceptance',
    at:before.at,committedContextUnchanged:true,reportSha256:sha(reportBytes),contextIdSha256:sha(raw.context.contextId),contextFingerprint:raw.context.contextFingerprint,
    starInput:{route:before.starInput.route,bytes:starBytes.length,sha256:sha(starBytes),dataSha256:sha(JSON.stringify(starData))},
    publicationHash:headers['x-starward-image-publication-hash'],sourceSha256:sha(imageBytes),supportBytes:Buffer.byteLength(headers['x-starward-image-display-support']!),
    beforeBundleSha256:sha(previous),productionBundleSha256:sha(production),sourceHashes,load,rows,retired,errors};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,publicationHash:result.publicationHash,supportBytes:result.supportBytes,scenarios:rows.length,narrowFixed:true,wideUnchanged:true,retired}));
}finally{if(browser)await browser.close();}
