// One same-input native WEAPP shader comparison; no page state or files changed.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {skyGalacticBandAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';
import {INITIAL_MANUAL_SKY_VIEW} from '../../../../apps/wechat-miniapp/src/features/sky/sky-manual-view.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyGalacticImageWindow} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-image-window.ts';
import {skyArtworkViewParameters} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=task+'/tmp/galactic-native-production-shader-probe-v2.js';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const reportBytes=await fs.readFile(task+'/tmp/current-native-report-2026-10-01.json');
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const report=presentSkyTime(raw,raw.context.at)!.report;
const band=skyGalacticBandAt(report,raw.context.at,85)!;assert(band);
const publication=await (await fetch('http://127.0.0.1:60065/v2/sky/galactic/manifest')).json();
assert.equal(publication.image.width,2048);assert.equal(publication.image.height,1024);
const renderer=path.resolve('apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts');
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {artworkVertex,galacticImageFragment} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';"},bundle:true,write:false,metafile:true,minify:true,format:'iife',globalName:'nativeShaders',platform:'browser',target:'es2020',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json'),plugins:[{name:'read-only-private-shader-exports',setup(b){b.onLoad({filter:/sky-gpu-renderer\.ts$/},async args=>{assert.equal(path.resolve(args.path),renderer);return {contents:await fs.readFile(args.path,'utf8')+'\nexport {artworkVertex,galacticImageFragment};',loader:'ts'};});}}]});
// Evaluate production shader strings locally, rather than sending unused
// imported astronomy/library initializers through a Windows CLI argument.
const shaders=runInNewContext(compiled.outputFiles[0]!.text+';nativeShaders;');
const owner=await build({stdin:{resolveDir:process.cwd(),contents:"export {createSkyGpuTextures} from './apps/wechat-miniapp/src/features/sky/sky-gpu-textures';"},bundle:true,write:false,minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,format:'esm',platform:'browser',target:'es2020'});
const ownerCode=owner.outputFiles[0]!.text.replace(/export\{[^}]*\};?\s*$/,'');
assert.notEqual(ownerCode,owner.outputFiles[0]!.text,'Remove only the module export wrapper, keeping the actual production function');
const cases=[{name:'north-45',view:{basis:INITIAL_MANUAL_SKY_VIEW,verticalFovDeg:45}},{name:'north-returned',view:{basis:INITIAL_MANUAL_SKY_VIEW,verticalFovDeg:43.6}},{name:'wide',view:{basis:INITIAL_MANUAL_SKY_VIEW,verticalFovDeg:139}},{name:'rolled-offset',view:{basis:createSkyViewBasis(270,135,65),verticalFovDeg:85,center:{x:137,y:351}}},{name:'dome',view:{basis:createSkyViewBasis(0,180,0),verticalFovDeg:274.9}}];
const prepared=cases.map(row=>({...row,window:skyGalacticImageWindow(row.view as any,390.4,844,band,2048,1024),parameters:skyArtworkViewParameters(row.view as any,390.4,844)}));
const input={encodedBytes:publication.image.bytes,band,cases:prepared};
const source=`function(){${ownerCode}var nativeGalaxy={createSkyGpuTextures:createSkyGpuTextures};var nativeShaders=${JSON.stringify({artworkVertex:shaders.artworkVertex,galacticImageFragment:shaders.galacticImageFragment})};
return new Promise(function(resolve){
var input=${JSON.stringify(input)},out={scope:'Same-input production galaxy shader and GPU owner on WEAPP OffscreenCanvas; not integrated page/phone acceptance',rows:[],resourcesReleased:false},gl,canvas,image,owner,program,buffer,shaders=[],done=false;
var timer=setTimeout(function(){out.reason='bounded_native_shader_timeout';finish();},10000);
function finish(){if(done)return;done=true;clearTimeout(timer);if(image){image.onload=null;image.onerror=null;image=null;}if(owner)owner.dispose();if(gl){if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);shaders.forEach(function(s){gl.deleteShader(s);});out.releaseError=gl.getError();out.resourcesReleased=true;}canvas=null;resolve(out);}
function shader(type,text){var s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('production_shader_compile_failed');return s;}
function uniform(name,values){var loc=gl.getUniformLocation(program,name);if(values.length===1)gl.uniform1f(loc,values[0]);else if(values.length===2)gl.uniform2fv(loc,values);else gl.uniform3fv(loc,values);}
function paint(row,windowed){owner.begin();var prepared=owner.getWindow(image,windowed?row.window:undefined);if(!prepared.texture)throw new Error('production_texture_unavailable');var p=row.parameters;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);var loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,prepared.texture);gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);
uniform('u_resolution',[390.4,844]);uniform('u_center',[p.center.x,p.center.y]);uniform('u_scale',[p.scale]);uniform('u_right',row.view.basis.right);uniform('u_up',row.view.basis.up);uniform('u_forward',row.view.basis.forward);uniform('u_galacticPole',input.band.pole);uniform('u_galacticCenter',input.band.center);uniform('u_strength',[input.band.strength]);uniform('u_imageOrigin',[prepared.window.x/2048,prepared.window.y/1024]);uniform('u_imageScale',[2048/prepared.window.width,1024/prepared.window.height]);uniform('u_imageTexel',[1/2048,1/1024]);uniform('u_filterStrength',[Math.max(0,Math.min(1,p.scale*Math.PI/1024-1))]);gl.drawArrays(gl.TRIANGLES,0,6);gl.finish();var error=gl.getError();if(error!==0)throw new Error('production_shader_draw_failed:'+error);var pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);if(gl.getError()!==0)throw new Error('native_shader_read_failed');owner.finish();return {pixels:pixels,window:prepared.window};}
try{var fs=wx.getFileSystemManager(),root=wx.env.USER_DATA_PATH;fs.readdir({dirPath:root,success:function(list){try{var matches=list.files.filter(function(n){return /^sky-art-[a-z0-9_]+-[1-9]\\d*\\.jpg$/.test(n)&&fs.statSync(root+'/'+n).size===input.encodedBytes;});out.matchingEncodedFiles=matches.length;if(matches.length!==1)throw new Error('owned_publication_file_not_unique');canvas=wx.createOffscreenCanvas({type:'webgl',width:1171,height:2532});gl=canvas.getContext('webgl');if(!gl||typeof canvas.createImage!=='function')throw new Error('native_shader_surface_unavailable');owner=nativeGalaxy.createSkyGpuTextures(gl,function(){throw new Error('native_production_image_failed');});program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,nativeShaders.artworkVertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,nativeShaders.galacticImageFragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('production_program_link_failed');buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,390.4,0,0,844,0,844,390.4,0,390.4,844]),gl.STATIC_DRAW);image=canvas.createImage();image.onerror=function(){out.reason='native_owned_image_decode_failed';finish();};image.onload=function(){try{if(image.width!==2048||image.height!==1024)throw new Error('publication_dimensions_mismatch');input.cases.forEach(function(row){var full=paint(row,false),partial=paint(row,true),maximum=0,changed=0,nonzero=0;for(var i=0;i<full.pixels.length;i++){var delta=Math.abs(full.pixels[i]-partial.pixels[i]);maximum=Math.max(maximum,delta);if(delta)changed++;if(i%4!==3&&full.pixels[i])nonzero++;}out.rows.push({name:row.name,maxDelta:maximum,changedChannels:changed,comparedChannels:full.pixels.length,nonzeroColourChannels:nonzero,sourceWindow:partial.window});});out.drawError=gl.getError();out.available=true;}catch(e){out.reason=String(e).slice(0,240);}finish();};image.src=root+'/'+matches[0];}catch(e){out.reason=String(e).slice(0,240);finish();}},fail:function(){out.reason='owned_file_listing_unavailable';finish();}});}catch(e){out.reason=String(e).slice(0,240);finish();}
});}`;
assert(source.length<28000,'Bound the official CLI argument before execution');
await fs.writeFile(output,source,{flag:'wx'});
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const paths=new Set([...Object.keys(compiled.metafile!.inputs).filter(p=>p!=='<stdin>'),'apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts','apps/wechat-miniapp/src/features/sky/sky-galactic-image-window.ts']);
const sources=await Promise.all([...paths].map(async p=>({path:p,sha256:hash(await fs.readFile(p))})));
await fs.writeFile(task+'/tmp/galactic-native-production-shader-binding-v2.json',JSON.stringify({at:new Date().toISOString(),scope:'Production source and safe same-input native shader probe binding',probeSha256:hash(source),sourceHashes:sources,reportSha256:hash(reportBytes),frameAt:raw.context.at,sourcePublication:{sha256:publication.image.sha256,encodedBytes:publication.image.bytes},cases},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({generated:true,sourceCharacters:source.length,sourceCount:sources.length,cases:cases.length,frameAt:raw.context.at}));
