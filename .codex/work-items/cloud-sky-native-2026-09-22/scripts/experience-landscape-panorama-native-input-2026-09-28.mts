import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import http from "node:http";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import ts from "typescript";
import sdk from "miniprogram-automator";
import { PNG } from "pngjs";
import { createSkyViewBasis, skyProjectionScale, unprojectSkyPoint } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

// Local data-conversion and public-platform trial, kept outside production.
// Use the current DevTools window; do not draw into or rewrite the live scene.
const require = createRequire(import.meta.url);
const {chromium}=require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root=path.resolve(import.meta.dirname,"../../../..");
const evidence=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output=path.join(evidence,"landscape-input-trial-2026-09-28/native");
const attempt=process.argv.find(value=>value.startsWith("--attempt="))?.slice(10)??"r2";
assert.ok(["r2","r3","r4"].includes(attempt),"bounded named attempts only");
const resultPath=path.join(output,attempt==="r2"?"result.json":`result-${attempt}.json`);
assert.ok(!await fs.access(resultPath).then(()=>true,()=>false),"preserve native trial evidence");
await fs.mkdir(output,{recursive:true});
const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const original=await fs.readFile(path.join(evidence,"landscape-input-trial-2026-09-28/stara_lesna/slnew.png"));
assert.equal(digest(original),"6591d5da60b77df296b06de930edf3c598868006cca476ff6a122617f0118226");
const earlier=JSON.parse(await fs.readFile(path.join(root,"output/playwright/cloud-sky-landscape-panorama-trial-0928/result.json"),"utf8"));
const fixed=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v5-candidate-2026-09-28.json"),"utf8"));
async function unchanged(){for(const file of fixed.fingerprint.files)assert.equal(digest(await fs.readFile(path.join(root,fixed.bundle,file.path))),file.sha256);}
function initializer(file:string,name:string,scope:Record<string,unknown>={}){
  const source=ts.createSourceFile(file,require("node:fs").readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.flatMap(statement=>ts.isVariableStatement(statement)?[...statement.declarationList.declarations]:[]).find(item=>item.name.getText(source)===name);
  assert.ok(declaration?.initializer,name);return vm.runInNewContext(declaration.initializer.getText(source),scope);
}
const gpuPath=path.join(root,"apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts");
const vertex=initializer(gpuPath,"artworkVertex",{position:initializer(gpuPath,"position")});
const ray=initializer(gpuPath,"skyRay");
const fragment=initializer(path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-landscape-panorama-trial-2026-09-28.mts"),"fragment",{ray});
const textureOwner=ts.transpile(await fs.readFile(path.join(root,"apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts"),"utf8"),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS});
const imageRequestOwner=ts.transpile(await fs.readFile(path.join(root,"apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts"),"utf8"),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS});
function alphaFacts(bytes:Buffer){
  const png=PNG.sync.read(bytes);let hash=2166136261,transparent=0,opaque=0,partial=0;
  for(let index=3;index<png.data.length;index+=4){const alpha=png.data[index]!;hash=Math.imul(hash^alpha,16777619)>>>0;if(alpha===0)transparent++;else if(alpha===255)opaque++;else partial++;}
  return {width:png.width,height:png.height,alphaHash:hash,transparent,opaque,partial};
}
const assets=new Map<number,Buffer>(),assetFacts=[];
const resume=process.argv.includes("--resume");
if(resume){
  for(const width of [1024,2048]){const filename=`panorama-${width}.png`,bytes=await fs.readFile(path.join(output,filename)),facts=alphaFacts(bytes),prior=earlier.input.find((row:any)=>row.side===width);
    assert.deepEqual({transparent:facts.transparent,opaque:facts.opaque,partial:facts.partial},{transparent:prior.transparent,opaque:prior.opaque,partial:prior.partial});
    assets.set(width,bytes);assetFacts.push({...facts,filename,bytes:bytes.length,sha256:digest(bytes),rgbaBytes:width*width*2});}
}else{
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
 try{
  const page=await browser.newPage();await page.setContent("<main>Local texture conversion</main>");
  const converted=await page.evaluate(async({source})=>{
    const image=new Image();image.src=source;await image.decode();const rows=[];
    const decoded=document.createElement("canvas");decoded.width=image.width;decoded.height=image.height;decoded.getContext("2d")!.drawImage(image,0,0);
    for(const width of [1024,2048]){const canvas=document.createElement("canvas");canvas.width=width;canvas.height=width/2;canvas.getContext("2d")!.drawImage(decoded,0,0,width,width/2);rows.push({width,data:canvas.toDataURL("image/png").split(",")[1]});}
    return rows;
  },{source:`data:image/png;base64,${original.toString("base64")}`});
  for(const row of converted){const bytes=Buffer.from(row.data!,"base64"),facts=alphaFacts(bytes);const before=earlier.input.find((value:any)=>value.side===row.width);
    assert.deepEqual({transparent:facts.transparent,opaque:facts.opaque,partial:facts.partial},{transparent:before.transparent,opaque:before.opaque,partial:before.partial},"conversion retains the tested texture alpha");
    assets.set(row.width,bytes);const filename=`panorama-${row.width}.png`;await fs.writeFile(path.join(output,filename),bytes,{flag:"wx"});assetFacts.push({...facts,filename,bytes:bytes.length,sha256:digest(bytes),rgbaBytes:row.width*row.width*2});}
 }finally{await browser.close()}
}
console.log(JSON.stringify({stage:"inputs-ready",cachedConversion:resume,assets:assetFacts.map(row=>({width:row.width,bytes:row.bytes}))}));
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9438"}),5000);boundWechatProtocol(program);
const current=await program.currentPage();assert.equal(current.path,"sky/detail/index");
console.log(JSON.stringify({stage:"current-page",path:current.path}));
const visible=async()=>({description:await(await current.$(".sky-orientation-canvas"))!.attribute("aria-label"),located:await(await current.$(".sky-located-object"))?.attribute("aria-label")??null,tracking:await(await current.$(".sky-object-tracking-status"))?.text()??null});
const before=await visible();assert.ok(before.description.includes("2026-09-28T16:00:00.000Z")&&before.description.includes("25.0 度"));await unchanged();
console.log(JSON.stringify({stage:"scene-and-files-bound"}));
const requests:number[]=[];
const server=http.createServer((req,res)=>{const side=Number(req.url?.match(/^\/panorama-(1024|2048)\.png$/)?.[1]);const bytes=assets.get(side);if(!bytes){res.writeHead(404).end();return;}requests.push(side);res.writeHead(200,{"Content-Type":"image/png","Content-Length":bytes.length,"Cache-Control":"no-store"});res.end(bytes);});
await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const address=server.address();assert.ok(address&&typeof address!=="string");
const observations:any[]=[];
let stage="before-native-evaluate";
try{
  for(const asset of assetFacts){
    const scenario={heading:0,beta:100,gamma:0,fov:85,solar:-24,red:false};
    const basis=createSkyViewBasis(scenario.heading,scenario.beta,scenario.gamma)!;
    const scale=skyProjectionScale(844,scenario.fov)!;
    stage=`native-${asset.width}`;console.log(JSON.stringify({stage}));
    const result=await program.evaluate(async function(parameters:any){
      let image:any=null,loaded:any=null,cancel:any=null,parseCanvas:any=null,canvas:any=null,gl:any=null,owner:any=null,program:any=null,buffer:any=null,vs:any=null,fs:any=null;let cleanup=false;
      const files=wx.getFileSystemManager(),filePath=wx.env.USER_DATA_PATH+"/sky-trial-panorama-"+parameters.fileTag+".png";
      const result:any={side:parameters.side,phase:"offscreen-canvas"};
      try{
        // The SDK cannot marshal the current visible Canvas node. Use a new
        // native WebGL Canvas factory and the actual production request owner.
        // This resolves feasibility only; the composed main page is still open.
        canvas=wx.createOffscreenCanvas({type:"webgl",width:390,height:844});gl=canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false});if(!gl||typeof canvas.createImage!=="function")throw Error("offscreen_webgl_unavailable");
        result.phase="shared-request-owner";
        const start=new Function("exports",parameters.imageRequestOwner+"\nreturn exports.startSkyArtworkRequest;")({});
        loaded=await new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>{cancel?.();reject(Error("shared_image_deadline"))},7000);
          cancel=start({asset:{bytes:parameters.bytes,width:parameters.side,height:parameters.side/2},url:parameters.url,filePath,canvas,format:"png",
            request:options=>wx.request({...options,timeout:6000}),
            writeFile:options=>{try{files.writeFileSync(options.filePath,options.data);options.success()}catch{options.fail()}},
            removeFile:path=>{if(path!==filePath)throw Error("foreign_file");files.unlinkSync(path)},
            ready:value=>{clearTimeout(timer);resolve(value)},fail:()=>{clearTimeout(timer);reject(Error("shared_image_failed"))}})});
        image=loaded.image;result.nativeFileBytes=files.readFileSync(filePath).byteLength;
        result.width=image.width;result.height=image.height;
        result.phase="alpha-read";parseCanvas=wx.createOffscreenCanvas({type:"2d",width:image.width,height:image.height});
        const context=parseCanvas.getContext("2d");context.drawImage(image,0,0);
        const pixels=context.getImageData(0,0,image.width,image.height).data;let hash=2166136261,transparent=0,opaque=0,partial=0;
        for(let index=3;index<pixels.length;index+=4){const alpha=pixels[index];hash=Math.imul(hash^alpha,16777619)>>>0;if(alpha===0)transparent++;else if(alpha===255)opaque++;else partial++;}
        Object.assign(result,{alphaHash:hash,transparent,opaque,partial,decoder:"native offscreen WebGL Canvas.createImage; production startSkyArtworkRequest; offscreen 2d alpha"});
        parseCanvas.width=1;parseCanvas.height=1;parseCanvas=null;
        result.phase="offscreen-webgl";
        const makeOwner=new Function("exports",parameters.textureOwner+"\nreturn exports.createSkyGpuTextures;")({});owner=makeOwner(gl);
        function compile(type:number,code:string){const value=gl.createShader(type);gl.shaderSource(value,code);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS)){gl.deleteShader(value);throw Error("trial_shader_compile_failed")};return value}
        vs=compile(gl.VERTEX_SHADER,parameters.vertex);fs=compile(gl.FRAGMENT_SHADER,parameters.fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("trial_link_failed");gl.useProgram(program);
        buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,390,0,0,844,0,844,390,0,390,844]),gl.STATIC_DRAW);const attribute=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,8,0);
        function uniform(name:string,values:any[]){const location=gl.getUniformLocation(program,name);if(values.length===1)gl.uniform1f(location,values[0]);if(values.length===2)gl.uniform2fv(location,values);if(values.length===3)gl.uniform3fv(location,values)}
        uniform("u_resolution",[390,844]);uniform("u_center",[195,422]);uniform("u_scale",[parameters.scale]);uniform("u_right",parameters.basis.right);uniform("u_up",parameters.basis.up);uniform("u_forward",parameters.basis.forward);uniform("u_sunAltitude",[-24]);uniform("u_red",[0]);
        owner.begin();const texture=owner.get(image);if(!texture)throw Error("native_upload_failed");gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.uniform1i(gl.getUniformLocation(program,"u_image"),0);gl.viewport(0,0,390,844);gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
        const rendered=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,rendered);let covered=0,open=0;const samples=[];
        for(let index=3;index<rendered.length;index+=4){if(rendered[index]===0)open++;if(rendered[index]===255)covered++;}
        for(let y=5;y<844;y+=11)for(let x=5;x<390;x+=11){const index=((843-y)*390+x)*4;samples.push({x:x+.5,y:y+.5,alpha:rendered[index+3]});}
        result.rendered={width:390,height:844,covered,open,noGlError:gl.getError()===gl.NO_ERROR};
        result.samples=samples;
        result.phase="rendered";owner.finish();
      }catch(error:any){result.error=String(error?.message??error)}finally{
        if(gl){owner?.dispose();if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);result.resourcesReleased=true;}
        loaded?.release();cancel?.();image=null;loaded=null;
        if(parseCanvas){parseCanvas.width=1;parseCanvas.height=1;parseCanvas=null;}
        if(canvas){canvas.width=1;canvas.height=1;canvas=null;}
        try{files.accessSync(filePath)}catch{cleanup=result.nativeFileBytes>0}result.temporaryFileRemoved=cleanup;
      }
      return result;
    },{side:asset.width,bytes:asset.bytes,fileTag:`${Date.now()}-${asset.width}`,url:`http://127.0.0.1:${address.port}/panorama-${asset.width}.png`,basis,scale,vertex,fragment,textureOwner,imageRequestOwner});
    if(result.frame){const raw=Buffer.from(result.frame,"base64");assert.equal(raw.length,390*844*4);const png=new PNG({width:390,height:844});for(let y=0;y<844;y++)raw.copy(png.data,y*390*4,(843-y)*390*4,(844-y)*390*4);const filename=`native-environment-only-${asset.width}.png`;await fs.writeFile(path.join(output,filename),PNG.sync.write(png),{flag:"wx"});delete result.frame;result.rendered.filename=filename;}
    result.alphaMatchesConvertedInput=result.width===asset.width&&result.height===asset.height&&result.alphaHash===asset.alphaHash&&result.transparent===asset.transparent&&result.opaque===asset.opaque&&result.partial===asset.partial;
    if(result.samples){const source=PNG.sync.read(assets.get(asset.width)!);const differences=result.samples.map((sample:any)=>{const direction=unprojectSkyPoint(sample.x,sample.y,basis,390,844,85)!;const u=((Math.atan2(direction[0],direction[1])/(2*Math.PI))%1+1)%1,v=.5-Math.asin(Math.max(-1,Math.min(1,direction[2])))/Math.PI;const tx=u*asset.width-.5,ty=v*asset.height-.5,x0=Math.floor(tx),y0=Math.floor(ty),fx=tx-x0,fy=ty-y0;const at=(x:number,y:number)=>source.data[(Math.max(0,Math.min(asset.height-1,y))*asset.width+((x%asset.width+asset.width)%asset.width))*4+3]!;const cpu=(at(x0,y0)*(1-fx)+at(x0+1,y0)*fx)*(1-fy)+(at(x0,y0+1)*(1-fx)+at(x0+1,y0+1)*fx)*fy;return{gpu:sample.alpha,cpu,difference:Math.abs(cpu-sample.alpha)}});result.alphaComparison={rays:differences.length,maxDifference:Math.max(...differences.map((row:any)=>row.difference)),interiorErrors:differences.filter((row:any)=>(row.cpu===0&&row.gpu>1)||(row.cpu===255&&row.gpu<254)).length};}
    observations.push(result);const {samples,...compact}=result;console.log(JSON.stringify({nativeObservation:compact}));
  }
  const after=await visible();assert.deepEqual(after,before,"actual page state is preserved");assert.equal((await program.currentPage()).pageId,current.pageId);await unchanged();
  const result={scope:"Same clean-v5 DevTools, native offscreen WebGL Canvas image factory, production request and GPU cache owners, offscreen alpha feasibility; not a composed main page, phone, adopted asset or published service",sourceHash:digest(original),conversion:"Chromium Canvas2D image downsample; preserves alpha counts of the prior shader trial; no sky or terrain synthesis",assetFacts,requests,observations,before,after,candidateUnchanged:true,licensedSource:"Lubomir Hambalek; package CC BY 4.0, registry/icon BY-SA label retained; candidate has no external publication",finished:true};
  await fs.writeFile(resultPath,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  assert.ok(observations.every(row=>row.alphaMatchesConvertedInput&&row.temporaryFileRemoved&&row.rendered?.noGlError&&row.rendered.covered>0&&row.rendered.open>0&&row.alphaComparison?.interiorErrors===0&&!row.error),"actual native input/render/cleanup must be available; preserve failure result");
  console.log(JSON.stringify({nativeCases:observations.length,alphaMatches:true,temporaryFilesRemoved:true,candidateUnchanged:true,resultPath:path.relative(root,resultPath)}));
}catch(error:any){
  if(!await fs.access(resultPath).then(()=>true,()=>false))await fs.writeFile(path.join(output,`native-attempt-${attempt}-failure.json`),JSON.stringify({scope:"Native trial failure, not scene acceptance",stage,error:String(error?.message??error),requests,observations,assetFacts},null,2)+"\n",{flag:"wx"});
  console.error(JSON.stringify({stage,error:String(error?.message??error),requests}));process.exitCode=1;
}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));program.disconnect()}
