// Saved-output independent readback + bounded actual-owner CPU preflight. No browser/GPU.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {inflateSync} from 'node:zlib';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const TASK='.codex/work-items/cloud-sky-native-2026-09-22';
const OUT='output/artwork-max-resource-independent-1003-r2';
const OLD='output/playwright/cloud-sky-prepared-resource-ledger-1003-r2';
const NEW='output/playwright/cloud-sky-prepared-resource-ledger-1003-r3';
const SHADERS='output/playwright/cloud-sky-artwork-max-reduction-1003-r1';
const OWNER='apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts';
const COMPOSITION='apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts';
assert(!fs.existsSync(path.resolve(ROOT,OUT)));fs.mkdirSync(path.resolve(ROOT,OUT));
const read=p=>fs.readFileSync(path.resolve(ROOT,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(read(p).toString('utf8'));
const binding=p=>{const b=read(p);return {path:p,bytes:b.length,sha256:sha(b)};};
const inputs=new Map();
function admit(p,e={}){const b=binding(p);if(e.bytes!==undefined)assert.equal(b.bytes,e.bytes,p);if(e.sha256)assert.equal(b.sha256,e.sha256,p);if(inputs.has(p))assert.deepEqual(b,inputs.get(p));inputs.set(p,b);return b;}
const save=(name,x)=>fs.writeFileSync(path.resolve(ROOT,OUT,name),JSON.stringify(x,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),path.resolve(ROOT,OUT,'executed-reader.mjs'),fs.constants.COPYFILE_EXCL);

const crc32=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;};
function png(b,width,height){
 assert.deepEqual(b.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));let at=8,header=false,end=false;const chunks=[],filters=new Set();
 while(at<b.length){assert(at+12<=b.length);const n=b.readUInt32BE(at),tag=b.toString('ascii',at+4,at+8),next=at+n+12;assert(next<=b.length);assert.equal(crc32(b.subarray(at+4,next-4)),b.readUInt32BE(next-4));const d=b.subarray(at+8,next-4);
  if(tag==='IHDR'){assert(!header&&at===8);assert.equal(n,13);assert.equal(d.readUInt32BE(0),width);assert.equal(d.readUInt32BE(4),height);assert.deepEqual([...d.subarray(8)],[8,6,0,0,0]);header=true;}if(tag==='IDAT')chunks.push(d);at=next;if(tag==='IEND'){assert.equal(n,0);end=true;break;}}
 assert(header&&end);assert.equal(at,b.length);const stride=width*4,z=inflateSync(Buffer.concat(chunks),{maxOutputLength:(stride+1)*height});assert.equal(z.length,(stride+1)*height);const rgba=Buffer.alloc(stride*height);
 for(let y=0;y<height;y++){const f=z[y*(stride+1)];assert(f<=4);filters.add(f);for(let x=0;x<stride;x++){const a=x>=4?rgba[y*stride+x-4]:0,u=y?rgba[(y-1)*stride+x]:0,ul=x>=4&&y?rgba[(y-1)*stride+x-4]:0;let p=0;if(f===1)p=a;if(f===2)p=u;if(f===3)p=(a+u)>>1;if(f===4){const q=a+u-ul,da=Math.abs(q-a),du=Math.abs(q-u),dul=Math.abs(q-ul);p=da<=du&&da<=dul?a:du<=dul?u:ul;}rgba[y*stride+x]=(z[y*(stride+1)+x+1]+p)&255;}}
 return {rgba,filters:[...filters].sort()};
}
const chain=(w,h,stride)=>{const target=w*h*4,levels=[];while(w>1||h>1){w=Math.ceil(w/stride);h=Math.ceil(h/stride);levels.push({width:w,height:h,bytes:w*h*4});}const scratch=levels.reduce((s,x)=>s+x.bytes,0);return{target,levels,scratch,total:target+scratch};};
const kinds=['Texture','Framebuffer','Buffer','Program','Shader','Renderbuffer'];
function ledgerReadback(l){
 const map=new Map(),counts=Object.fromEntries(kinds.map(k=>[k,{created:0,deleteRequested:0}])),attachments=new Set();
 let peakTexture=0,peakBuffer=0;const snapshots=[];
 const live=k=>[...map.values()].filter(r=>r.kind===k&&!r.deleted);
 const snap=(stage)=>({stage,counts:structuredClone(counts),notDeleteRequested:Object.fromEntries(kinds.map(k=>[k,live(k).length])),declaredTextureBytes:live('Texture').reduce((s,r)=>s+r.bytes,0),declaredBufferBytes:live('Buffer').reduce((s,r)=>s+r.bytes,0),drawCalls:l.events.filter(e=>e.stage===stage&&(e.op==='drawArrays'||e.op==='drawElements')).length,readbacks:l.events.filter(e=>e.stage===stage&&e.op==='readPixels').map(e=>[e.width,e.height])});
 for(const stage of ['construction','cold','warm','idle','dispose']){
  for(const e of l.events.filter(e=>e.stage===stage)){
   if(e.op==='create'){assert(!map.has(e.id));assert(kinds.includes(e.kind));map.set(e.id,{kind:e.kind,bytes:0,deleted:false});counts[e.kind].created++;}
   if(e.op==='texture-storage'||e.op==='buffer-storage'){const r=map.get(e.id);assert(r&&!r.deleted);assert(Number.isSafeInteger(e.bytes)&&e.bytes>=0);r.bytes=e.bytes;if(e.op==='texture-storage')assert.equal(e.bytes,e.width*e.height*4);}
   if(e.op==='delete-request'){const r=map.get(e.id);assert(r&&!r.deleted);assert.equal(r.kind,e.kind);r.deleted=true;counts[r.kind].deleteRequested++;}
   if(e.op==='attach-shader'){assert(map.has(e.id)&&map.has(e.shader));attachments.add(e.id+':'+e.shader);}
   if(e.op==='detach-shader'){assert(attachments.delete(e.id+':'+e.shader));}
   peakTexture=Math.max(peakTexture,live('Texture').reduce((s,r)=>s+r.bytes,0));peakBuffer=Math.max(peakBuffer,live('Buffer').reduce((s,r)=>s+r.bytes,0));
  }
  if(stage!=='construction'){const actual=snap(stage),expected=stage==='dispose'?l.afterDispose:l.frames.find(f=>f.name===stage).resources;assert.deepEqual(actual,expected);snapshots.push(actual);}
 }
 assert.equal(attachments.size,0);assert.equal(map.size,l.records.length);
 for(const r of l.records){const actual=map.get(r.id);assert.equal(actual.kind,r.kind);assert.equal(actual.bytes,r.bytes);assert.equal(actual.deleted,r.deleteRequested);}
 for(const c of Object.values(counts))assert.equal(c.created,c.deleteRequested);assert.equal(l.events.filter(e=>e.stage==='warm'&&e.op==='create').length,0);
 assert.equal(l.unsupported.length,0);assert.equal(l.failed.length,0);assert.equal(l.error,0);l.frames.forEach(f=>assert.equal(f.error,0));
 return {peakDeclaredTextureBytes:peakTexture,peakDeclaredBufferBytes:peakBuffer,createDeleteRequested:counts,attachmentsAtEnd:0,snapshots,scope:'Logical declared storage and deletion requests only; no physical driver retirement, implicit depth/AA, native decoded images or total-client memory.'};
}
function cpuReduce(data,w,h,stride,mask=null){let current=new Uint8Array(data);if(mask)for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!mask(x,y))current.fill(0,(y*w+x)*4,(y*w+x)*4+4);
 while(w>1||h>1){const nw=Math.ceil(w/stride),nh=Math.ceil(h/stride),next=new Uint8Array(nw*nh*4);for(let y=0;y<nh;y++)for(let x=0;x<nw;x++)for(let dy=0;dy<stride;dy++)for(let dx=0;dx<stride;dx++){const at=(Math.min(h-1,y*stride+dy)*w+Math.min(w-1,x*stride+dx))*4,dest=(y*nw+x)*4;for(let c=0;c<4;c++)next[dest+c]=Math.max(next[dest+c],current[at+c]);}current=next;w=nw;h=nh;}return [...current];}
function controlsReadback(actual){
 const rows=[];assert.equal(actual.stride,4);assert.equal(actual.rows.length,21);
 for(const r of actual.rows){let data,w,h,mask=null,expected;
  if(r.kind==='one-hot-every-4x4-offset'){w=h=4;data=new Uint8Array(64);data.set([255,254,129,1],r.offset*4);}
  else if(r.kind==='odd-edge-last-texel'){[w,h]=r.size;data=new Uint8Array(w*h*4);data.set([255,254,253,1],(w*h-1)*4);}
  else{w=61;h=93;data=new Uint8Array(w*h*4);const inside=(x,y)=>((2*x+1)/w-1)**2+((2*y+1)/h-1)**2<1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(inside(x,y)?[127,93,41,1]:[255,254,253,252],(y*w+x)*4);mask=r.kind==='local-model-negative-branch'?()=>false:inside;
   let margin=1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)margin=Math.min(margin,Math.abs(((2*x+1)/w-1)**2+((2*y+1)/h-1)**2-1));if(r.minimumBoundaryMargin!==undefined)assert.equal(margin,r.minimumBoundaryMargin);}
  expected=cpuReduce(data,w,h,4,mask);assert.deepEqual(expected,r.expected);assert.deepEqual(expected,r.actual);assert.deepEqual(cpuReduce(data,w,h,2,mask),expected);rows.push({kind:r.kind,offset:r.offset,size:r.size,independentExpected:expected,actual:r.actual});
 }
 assert.deepEqual(actual.rows.slice(0,16).map(r=>r.offset),Array.from({length:16},(_,i)=>i));
 assert.deepEqual(actual.mutants.missedLastOffset.actual,[0,0,0,0]);assert.deepEqual(actual.mutants.averaging.actual,[16,16,8,0]);for(const r of Object.values(actual.mutants))assert.notDeepEqual(r.actual,r.expected);
 assert.deepEqual(actual.resources.created,actual.resources.deleted);assert.equal(actual.error,0);
 // Independent complete discrete partition coverage and deterministic all-channel MAX oracle.
 let allSmallDimensions=0;for(let w=1;w<=21;w++)for(let h=1;h<=21;h++){const covered=new Set();for(let y=0;y<Math.ceil(h/4);y++)for(let x=0;x<Math.ceil(w/4);x++)for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++)covered.add(Math.min(h-1,4*y+dy)*w+Math.min(w-1,4*x+dx));assert.equal(covered.size,w*h);allSmallDimensions++;}
 const synthetic=[];for(const [w,h] of [[3,5],[61,93],[1,17],[17,1],[19,23]]){const data=new Uint8Array(w*h*4);let seed=7919;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed>>>24;}const expected=[0,0,0,0];for(let i=0;i<data.length;i++)expected[i%4]=Math.max(expected[i%4],data[i]);const value=cpuReduce(data,w,h,4);assert.deepEqual(value,expected);synthetic.push({size:[w,h],directMax:expected,chain:value});}
 return{rows,mutants:actual.mutants,createdDeleted:actual.resources,allSmallDimensionsComplete:allSmallDimensions,synthetic,scope:'Integer texel partition/MAX and saved software shader observations. Local declaration is a linear-camera strict circle, not arbitrary region or native highp precision proof.'};
}

try{
 admit(fileURLToPath(import.meta.url));admit(process.execPath);admit('AGENTS.md');admit('project_context/global.md');
 const dirs=[OLD,NEW,SHADERS];for(const dir of dirs)for(const name of fs.readdirSync(path.resolve(ROOT,dir)))if(fs.statSync(path.resolve(ROOT,dir,name)).isFile())admit(dir+'/'+name);
 admit(OLD+'/result.json',{sha256:'23b9ff5e1b910e67297613de1bfc8eb52fcc4ccf8599a174e4c44f761502484d'});
 admit(NEW+'/result.json',{sha256:'91aa8973a17bd3c6431bfd04dc84a392cd8d039e8e49bef5c32f931c4d00ae78'});
 admit(SHADERS+'/result.json',{sha256:'2926c6352e44e4a88ed258fbcebd52b3d459980c5b2cb8e99efba74d49c537fc'});
 const old=json(OLD+'/result.json'),now=json(NEW+'/result.json'),actual=json(SHADERS+'/actual-controls.json');
 const bindingScope=[];for(const dir of dirs){const before=json(dir+'/inputs-before.json'),after=json(dir+'/inputs-after.json'),parsed=json(dir+'/parsed-inputs.json');assert.deepEqual(before,after);assert.deepEqual(parsed,json(dir+'/parsed-inputs-after.json'));
  for(const b of [...before,...parsed]){const oldOwner=dir===OLD&&b.path===OWNER,oldDriver=dir===OLD&&b.path===TASK+'/scripts/experience-prepared-resource-ledger-2026-10-03.mjs';if(oldOwner){assert.deepEqual(binding(OLD+'/executed-gpu-artwork-contributions.ts').sha256,b.sha256);continue;}if(oldDriver){assert.equal(binding(OLD+'/executed-driver.mjs').sha256,b.sha256);continue;}admit(b.path,b);}
  bindingScope.push({generation:dir,hosts:before.length,parser:parsed.length,beforeAfterExact:true,priorOwnerOrDriverUsesExactSavedSnapshot:dir===OLD});}
 const prior=read(OLD+'/executed-gpu-artwork-contributions.ts').toString('utf8'),current=read(OWNER).toString('utf8');
 const start='const reduceVertex =',end='const reductionQuad =';const oldPart=prior.slice(prior.indexOf(start),prior.indexOf(end));const currentPart=current.slice(current.indexOf(start),current.indexOf(end));
 const reverse=current.replace(currentPart,oldPart).replaceAll('Math.ceil(w / SKY_ARTWORK_MAX_REDUCTION_STRIDE); h = Math.ceil(h / SKY_ARTWORK_MAX_REDUCTION_STRIDE);','Math.ceil(w / 2); h = Math.ceil(h / 2);').replace('    while (w > 1 || h > 1) {\n      w = Math.ceil(w / 2); h = Math.ceil(h / 2);\n      sizes.push([w, h]);\n    }','    while (w > 1 || h > 1) { w = Math.ceil(w / 2); h = Math.ceil(h / 2); sizes.push([w, h]); }');assert.equal(reverse,prior,'Only shader main/stride/ceil plus exact loop formatting changes allowed in actual owner');
 const oldParsed=json(OLD+'/parsed-inputs.json'),newParsed=json(NEW+'/parsed-inputs.json');assert.deepEqual(oldParsed.map(b=>b.path).sort(),newParsed.map(b=>b.path).sort());const changed=oldParsed.filter(b=>newParsed.find(x=>x.path===b.path).sha256!==b.sha256);assert.deepEqual(changed.map(x=>x.path),[OWNER]);
 const require=createRequire(path.resolve(ROOT,'apps/wechat-miniapp/package.json')),ts=require('typescript');assert.equal(ts.version,'5.9.3');admit(require.resolve('typescript'));admit(require.resolve('typescript/package.json'));
 const compositionExports={};vm.runInNewContext(ts.transpileModule(read(COMPOSITION).toString('utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:compositionExports,require:()=>{throw Error('unexpected_composition_runtime_dependency');}});
 const exported={};vm.runInNewContext(ts.transpileModule(current+'\nexport {reduceFragment as __global,localReduceFragment as __local};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,Float32Array,Uint8Array,require:name=>{if(name==='./sky-artwork-level-composition')return compositionExports;if(name==='twgl.js')return{};throw Error('unexpected_owner_dependency:'+name);}});
 assert.equal(exported.SKY_ARTWORK_MAX_REDUCTION_STRIDE,4);assert.equal(exported.__global,actual.shaderSources.global);assert.equal(exported.__local('vec3 skyRay(vec2 pixel){return vec3(pixel,1.0);}'),actual.shaderSources.local);
 const expectedOffsets=Array.from({length:16},(_,i)=>[i%4,Math.floor(i/4)]),found=[[0,0],...[...actual.shaderSources.global.matchAll(/value=max\(value,sampleAt\(p\+vec2\((\d+)\.,(\d+)\.\)\)\);/g)].map(m=>[Number(m[1]),Number(m[2])])];assert.deepEqual(found,expectedOffsets);
 assert.equal(actual.shaderSources.global.slice(actual.shaderSources.global.indexOf('void main')),actual.shaderSources.local.slice(actual.shaderSources.local.indexOf('void main')));
 const prefix=read(SHADERS+'/executed-task-owner.ts');assert.deepEqual(prefix,Buffer.concat([read(OWNER),Buffer.from('\nexport {reduceFragment as taskMaxFragment,localReduceFragment as taskLocalMaxFragment};\n')]));
 admit(TASK+'/evidence/experience-artwork-max-resource-development-2026-10-03.md');
 const protectedPath=TASK+'/tmp/resume-preserved-hashes-2026-10-01.json';admit(protectedPath);for(const p of json(protectedPath))admit(p.path,p);
 save('inputs-before.json',[...inputs.values()]);
 const factory=exported.createSkyGpuArtworkContributions,submitted={submitted:true,finePrepared:true,coarsePrepared:true},prepared={program:{program:{}}},expectedUnknown={completed:false,qualification:{fine:'unknown',coarse:'unknown',any:'unknown'},finePhoto:'unknown',coarsePhoto:'unknown'};
 const noGlPolicies=[undefined,{auxiliaryBytesLimit:0,maxGroups:1},{auxiliaryBytesLimit:-1,maxGroups:1},{auxiliaryBytesLimit:NaN,maxGroups:1},{auxiliaryBytesLimit:Infinity,maxGroups:1},{auxiliaryBytesLimit:72,maxGroups:0},{auxiliaryBytesLimit:72,maxGroups:1.5}];
 for(const policy of noGlPolicies){const o=factory(new Proxy({},{get(){throw Error('disabled_gl_work');}}),policy);o.begin();o.capture(submitted,prepared);o.afterDraw(()=>{throw Error('disabled_replay');});o.clearPhoto();o.finish();assert.deepEqual(JSON.parse(JSON.stringify(o.contribution(submitted))),expectedUnknown);assert.strictEqual(o.observeRegion(submitted,null),compositionExports.unknownSkyArtworkLocalObservation);o.reset();o.dispose();}
 function boundary(){const c={NO_ERROR:0,FRAMEBUFFER_BINDING:1,DEPTH_TEST:2,STENCIL_TEST:3,COLOR_WRITEMASK:4,MAX_TEXTURE_SIZE:5,MAX_VIEWPORT_DIMS:6,VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:7};let error=0,attribute=0;const gl={...c,drawingBufferWidth:3,drawingBufferHeight:5,getError:()=>{const v=error;error=0;return v;},isContextLost:()=>false,isEnabled:()=>false,getAttribLocation:()=>0,getVertexAttrib:()=>{attribute++;return{};},getParameter:p=>{if(p===1)return null;if(p===4)return[true,true,true,true];if(p===5)return 4096;if(p===6)return new Int32Array([4096,4096]);throw Error('bounded_setup_stop');}};return{gl,setError:v=>error=v,reads:()=>attribute};}
 const under=boundary(),policy={auxiliaryBytesLimit:71,maxGroups:1},owner=factory(under.gl,policy);policy.auxiliaryBytesLimit=72;owner.begin();owner.capture(submitted,prepared);assert.equal(under.reads(),1);assert.deepEqual(JSON.parse(JSON.stringify(owner.contribution(submitted))),expectedUnknown);owner.dispose();
 const exact=boundary(),retry=factory(exact.gl,{auxiliaryBytesLimit:72,maxGroups:1});retry.begin();retry.capture(submitted,prepared);assert.equal(exact.reads(),2);const readsAfterSetupFailure=exact.reads();retry.begin();retry.capture(submitted,prepared);assert.equal(exact.reads(),readsAfterSetupFailure);retry.reset();retry.begin();retry.capture(submitted,prepared);assert.equal(exact.reads(),readsAfterSetupFailure+2);retry.dispose();
 const ordinary=boundary(),errorOwner=factory(ordinary.gl,{auxiliaryBytesLimit:71,maxGroups:1});errorOwner.begin();ordinary.setError(1282);assert.throws(()=>errorOwner.capture(submitted,prepared),/sky_gpu_draw_failed:1282/);errorOwner.begin();errorOwner.capture(submitted,prepared);assert.equal(ordinary.reads(),0);errorOwner.reset();errorOwner.begin();errorOwner.capture(submitted,prepared);assert.equal(ordinary.reads(),1);errorOwner.dispose();
 const controls=controlsReadback(actual),conditions=[],pixels=[];
 for(const row of now.rows){const name=row.condition.name,priorRow=old.rows.find(r=>r.condition.name===name),l=json(NEW+'/'+name+'-ledger.json'),oldL=json(OLD+'/'+name+'-ledger.json');assert.deepEqual(row.physical,priorRow.physical);assert.deepEqual(l.frames,row.frames);assert.deepEqual(l.afterDispose,row.afterDispose);
  admit(row.ledger.path,row.ledger);admit(row.png.path,row.png);const req=chain(...row.physical,4);assert.deepEqual(row.requested,{stride:4,...req});assert.deepEqual(priorRow.requested,chain(...row.physical,2));assert.equal(row.limit,req.total-(row.condition.under?1:0));
  for(const frame of l.frames){const p=NEW+'/'+name+'-'+frame.name+'.rgba',oldP=OLD+'/'+name+'-'+frame.name+'.rgba';const raw=read(p);assert.equal(raw.length,row.physical[0]*row.physical[1]*4);assert.deepEqual(raw,read(oldP));assert.deepEqual(frame.credit,oldL.frames.find(f=>f.name===frame.name).credit);assert.deepEqual(frame.completion,oldL.frames.find(f=>f.name===frame.name).completion);const desc=l.pixels.find(x=>x.stage===frame.name).identity;admit(p,desc);pixels.push({condition:name,frame:frame.name,bytes:raw.length,sha256:sha(raw),oldWholeRgbaExact:true,completionCreditExact:true});}
  const decoded=png(read(row.png.path),...row.physical),bottomUp=read(NEW+'/'+name+'-cold.rgba'),stride=row.physical[0]*4;for(let y=0;y<row.physical[1];y++)assert.deepEqual(decoded.rgba.subarray(y*stride,(y+1)*stride),bottomUp.subarray((row.physical[1]-y-1)*stride,(row.physical[1]-y)*stride));assert.deepEqual(read(row.png.path),read(priorRow.png.path));
  const fresh=ledgerReadback(l),previous=ledgerReadback(oldL);assert.equal(fresh.snapshots[0].declaredTextureBytes,2097152+(row.condition.under?0:req.total));
  if(row.condition.under){assert.equal(fresh.createDeleteRequested.Framebuffer.created,0);for(const f of row.frames.slice(0,2)){assert.equal(f.completion,null);assert.equal(f.credit,null);assert.equal(f.resources.readbacks.length,0);}}else{const textures=l.records.filter(r=>r.kind==='Texture'&&r.width!==512);assert.equal(textures.length,req.levels.length+1);assert.deepEqual(textures.map(r=>r.bytes).sort((a,b)=>a-b),[req.target,...req.levels.map(x=>x.bytes)].sort((a,b)=>a-b));for(const f of row.frames.slice(0,2)){assert.equal(f.resources.drawCalls,3+2*req.levels.length);assert.deepEqual(f.resources.readbacks,[[1,1],[1,1]]);assert(f.credit&&f.completion);}}
  assert.equal(fresh.snapshots[2].declaredTextureBytes,0);conditions.push({name,oldChain:priorRow.requested,newChain:row.requested,independentLedger:fresh,oldLedger:previous,png:{wholeRgbaExact:true,oldEncodedExact:true,filters:decoded.filters},warmManagedCreates:0});
 }
 assert.equal(conditions.find(x=>x.name==='ratio3-exact').oldChain.total-conditions.find(x=>x.name==='ratio3-exact').newChain.total,3161544);
 const after=[...inputs.keys()].map(binding);assert.deepEqual(after,[...inputs.values()]);save('inputs-after.json',after);
 const result={status:'PASSED_BOUNDED_INDEPENDENT_MAX_RESOURCE_REVIEW',owner:binding(OWNER),priorOwner:binding(OLD+'/executed-gpu-artwork-contributions.ts'),sourceOnlyStrideMainAndCeilChange:true,sharedGlobalLocalStaticMainExact:true,bindingScope,inputs:inputs.size,beforeAfterExact:true,
  actualOwnerBoundary:{disabledPolicies:noGlPolicies.length,noGlAccess:true,odd3x5CompleteRequired:72,oneByteUnderCapturedPolicyMutableCallerRefused:true,exactBudgetEntersSetup:true,auxiliarySetupFailureLatchesUntilExplicitReset:true,ordinaryErrorPropagates:true,resetReturnsToPreflight:true,scope:'Actual current owner/transpiled with existing TS5.9.3; controlled GL stops at guarded setup. No fake successful shader/readback or GPU.'},
  savedShaderAndCpuControls:controls,pixels,conditions,remainingLimits:['Software saved GPU only; no new browser or GPU run.','Local circle/branch controls do not certify arbitrary region or CPU/GPU highp precision.','RGBA8 zero/photo UNKNOWN is unchanged; no science validity or readability proof.','Declared bytes/managed delete requests exclude implicit depth/AA/drawing buffer, physical VRAM/driver retirement/GC/native/client total memory.','One-off software timings are not native FPS or performance guarantees.','Controlled NIGHT/catalog UNAVAILABLE and one ready pair; no normal Hook/page accepted/whole-catalog/default budget adoption.','Prepared default registry remains empty; all source/quality/visible native credit/200 DAU capacity goals remain open.']};
 save('result.json',result);save('final-current.json',{beforeAfterExact:true,inputs:after,protectedExact:true,result:binding(OUT+'/result.json')});console.log(JSON.stringify({status:result.status,result:binding(OUT+'/result.json'),inputs:inputs.size,owner:result.owner}));
}catch(error){save('failure.json',{error:String(error),stack:error.stack,inputs:[...inputs.values()]});console.error(error);process.exitCode=1;}
