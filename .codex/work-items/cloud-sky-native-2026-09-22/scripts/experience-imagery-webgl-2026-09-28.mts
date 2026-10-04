import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { build } from "esbuild";
const require=createRequire(import.meta.url);
const {chromium}=require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root=path.resolve(import.meta.dirname,"../../../..");
const output=path.join(root,"output/playwright",process.argv[2]??"cloud-sky-imagery-0928");
assert.ok(!fs.existsSync(path.join(output,"result.json")),"preserve_historical_evidence");fs.mkdirSync(output,{recursive:true});
const compiled=await build({stdin:{resolveDir:root,contents:`
  import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
  import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
  import {createSkyViewBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
  globalThis.skyTest={createSkyGpuRenderer,drawSkyScene,createSkyViewBasis};
`},bundle:true,write:false,platform:"browser",format:"iife",target:"es2020",
  tsconfig:path.join(root,"apps/wechat-miniapp/tsconfig.json")});
const origin=process.env.SKY_CHECK_API_ORIGIN??"http://127.0.0.1:8787";
async function resource(relative:string){const r=await fetch(origin+relative,{signal:AbortSignal.timeout(8000)});
  assert.ok(r.ok,`published local resource ${r.status}`);return r;}
const manifest=await (await resource("/v2/sky/sdss-optical/manifest")).json() as any;
const optical=manifest.levels.DETAIL;
const sdss=Buffer.from(await (await resource(optical.downloadUrl)).arrayBuffer());
const response=await resource("/v2/celestial-objects/M%3A51/image?level=DETAIL");
const w3Field=Number(response.headers.get("x-starward-image-field-degrees"));assert.ok(w3Field>0);
const w3=Buffer.from(await response.arrayBuffer());
const actualPoint=[0,42.09119465,7.958629734,41.999449434,8.000403185,42.048927669,7.867814753];
const scenarios=[
  {name:"real-m51-covered",point:actualPoint,fov:.05,landscape:true},
  {name:"real-m51-open",point:actualPoint,fov:.05,landscape:false},
  {name:"partial-image-edge",point:[0,332.46,10,332.46,10.1,332.36,10],fov:.3,landscape:true},
  {name:"covered-view-open-offscreen-edge",point:[0,329.1,10,329.1,10.1,329,10],fov:.05,landscape:true,noOptical:true},
  {name:"foreground-failure",point:actualPoint,fov:.05,landscape:true,failLandscape:true},
  {name:"optical-gpu-failure",point:actualPoint,fov:.05,landscape:false,failOptical:true},
];
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate("globalThis.__name = target => target");
  await page.addScriptTag({content:compiled.outputFiles[0]!.text});
  const results=[];
  for(const scenario of scenarios) {
    const result=await page.evaluate(async ({scenario,w3,sdss,w3Field,optical}:any)=>{
      const api=(globalThis as any).skyTest,canvas=document.querySelector("canvas")!;
      const gl=canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false})!;
      const image=async(base64:string)=>{const value=new Image();value.src="data:image/jpeg;base64,"+base64;await value.decode();return value;};
      const infrared=await image(w3),visible=await image(sdss);
      const at="2026-09-28T22:30:00.000Z",point=scenario.point;
      const data={hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:-6}],skyScene:{state:"UNAVAILABLE",frames:[],
        deepSky:{state:"AVAILABLE",catalog:{imageRegistration:"ICRS_TAN_NORTH_0_1_V1",entries:[{objectRef:"M:51",displayName:"M 51",kind:"GALAXY",magnitude:8.4}]},
          frames:[{at,state:"AVAILABLE",points:[point]}]}},targetFrames:[]};
      const basis=api.createSkyViewBasis(point[1],90+point[2],0);
      function paint(withW3:boolean,withOptical:boolean) {
        const renderer=api.createSkyGpuRenderer(gl,1),args=Array(35).fill(undefined);
        let sources:any=null,failures=0;
        const surface={...renderer,
          ...(scenario.failLandscape?{landscape:()=>false}:{}),
          ...(scenario.failOptical?{artwork:(source:any,...rest:any[])=>source===visible?false:renderer.artwork(source,...rest)}:{}),
        };
        args.splice(0,7,surface,data,at,null,null,390,844);args[7]="NIGHT";
        args[8]=(_snapshot:any,value:any)=>{sources=value;};args[10]=scenario.fov;args[12]=basis;
        args[11]=withW3?{image:infrared,reference:"M:51",level:"DETAIL",fieldDegrees:w3Field}:null;
        args[30]=withOptical&&!scenario.noOptical?{image:visible,fieldDegrees:optical.fieldDegrees,level:"DETAIL"}:null;
        args[31]=()=>{failures++;};args[34]={enabled:scenario.landscape};
        api.drawSkyScene(...args);
        const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        const result={pixels,credit:{infrared:sources.deepSkyImage===infrared,optical:sources.sdssOpticalImage===visible},failures,noGlError:gl.getError()===gl.NO_ERROR};
        renderer.dispose();return result;
      }
      const combined=paint(true,true),withoutW3=paint(false,true),withoutOptical=paint(true,false),withoutImages=paint(false,false);
      const changed=(other:Uint8Array)=>{let count=0;for(let index=0;index<other.length;index+=4)
        if([0,1,2].some(channel=>combined.pixels[index+channel]!==other[index+channel]))count++;return count;};
      paint(true,true); // leave the actual combined output for its screenshot
      return {credit:combined.credit,infraredAffectedPixels:changed(withoutW3.pixels),opticalAffectedPixels:changed(withoutOptical.pixels),
        imageAffectedPixels:changed(withoutImages.pixels),failures:combined.failures,noGlError:combined.noGlError};
    },{scenario,w3:w3.toString("base64"),sdss:sdss.toString("base64"),w3Field,optical});
    assert.ok(result.noGlError,scenario.name);
    if(scenario.name.includes("covered")){assert.equal(result.imageAffectedPixels,0,scenario.name);assert.deepEqual(result.credit,{infrared:false,optical:false});}
    else if(scenario.name==="partial-image-edge") {assert.ok(result.infraredAffectedPixels>0&&result.opticalAffectedPixels>0);assert.deepEqual(result.credit,{infrared:true,optical:true});}
    else if(scenario.failOptical){assert.equal(result.failures,1);assert.ok(result.imageAffectedPixels>0);assert.deepEqual(result.credit,{infrared:true,optical:false});}
    else {assert.equal(result.infraredAffectedPixels,0);assert.ok(result.opticalAffectedPixels>0);assert.deepEqual(result.credit,{infrared:false,optical:true});}
    await page.locator("canvas").screenshot({path:path.join(output,`${scenario.name}.png`)});
    results.push({scenario,...result});
  }
  fs.writeFileSync(path.join(output,"result.json"),JSON.stringify({scope:"Production TWGL renderer and scene compositor in software WebGL; published local JPEGs; controlled geometry/light/failures; not target-device acceptance",results},null,2)+"\n");
  console.log(JSON.stringify({scope:"production_framebuffer_development_check",cases:results.length,results}));
} finally {await browser.close();}
