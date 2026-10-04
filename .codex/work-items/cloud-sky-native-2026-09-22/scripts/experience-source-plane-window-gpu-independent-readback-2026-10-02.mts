/** Independent raw full-pixel, PNG and source/ledger readback. No browser or render. */
import fs from 'node:fs';
import path from 'node:path';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const dir='output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r4';
const prior='output/playwright/cloud-sky-full-hook-resource-1002-r4';
const out=process.argv[2]??'output/source-plane-window-gpu-independent-1002-r1';
assert(out.startsWith('output/source-plane-window-gpu-independent-'));
const file=(p:string)=>path.join(ROOT,p),read=(p:string)=>fs.readFileSync(file(p));
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=read(p);return {path:p,bytes:b.length,sha256:hash(b)};};
const json=(p:string)=>JSON.parse(read(p).toString());
assert(!fs.existsSync(file(out)));fs.mkdirSync(file(out),{recursive:true});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const receipt=json(dir+'/result.json'),original=json(prior+'/result.json');
assert.equal(hash(read(dir+'/result.json')),'a8bcd380aea334391ccc6a7c8b92e02e4efba8a22946a8833bb396d883432d7a');
assert.equal(hash(read(prior+'/result.json')),'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
const six=json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
const old=json('output/sky-artwork-public-retirement-1002-r3/result.json').oldAssetsUnchanged;assert.equal(old.length,201);
for(const b of receipt.originalSourceBindings)assert.deepEqual(bind(b.path),b);
for(const b of receipt.reusedInputs)assert.deepEqual(bind(b.path),b);
for(const b of six)assert.equal(bind(b.path).sha256,b.sha256);
for(const b of old)assert.deepEqual(bind(b.path),b);
const names=receipt.results.map((r:any)=>r.condition.name);
const inputPaths=[dir+'/result.json',prior+'/result.json',dir+'/executed-script.mts.txt',prior+'/executed-script.mts.txt',prior+'/bundle.js',
 ...['baseline','noart','candidate','badcrop'].map(n=>dir+'/'+n+'.js'),dir+'/candidate-helper.js',dir+'/candidate-pure-source.ts.txt',dir+'/reused-executors.json',
 receipt.executedCandidate.path,...receipt.originalSourceBindings.map((b:any)=>b.path),...receipt.reusedInputs.map((b:any)=>b.path),
 ...names.flatMap((n:string)=>['json','rgba','png'].map(e=>dir+'/'+n+'.'+e)),...six.map((b:any)=>b.path),...old.map((b:any)=>b.path)];
const before=[...new Set(inputPaths)].map(bind);
for(const b of receipt.reusedInputs){const n=path.basename(b.path);assert.deepEqual(read(dir+'/'+n),read(b.path));}
const baseline=read(dir+'/baseline.js').toString();assert.equal(hash(baseline),original.compiledSha256);
assert.equal(read(dir+'/noart.js').toString(),baseline);
const ast=ts.createSourceFile('baseline.js',baseline,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let owner:ts.FunctionDeclaration|undefined;
function find(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==='skyArtworkTextureWindow'){assert(!owner);owner=n;}ts.forEachChild(n,find);}
find(ast);assert(owner?.body);
const replace=(body:string)=>baseline.slice(0,owner!.body!.getStart(ast))+body+baseline.slice(owner!.body!.end);
assert.equal(read(dir+'/candidate.js').toString(),replace('{ return globalThis.taskClipProbe.sourcePlaneWindowCandidate(registration,view,width,height,imageWidth,imageHeight).window; }'));
assert.equal(read(dir+'/badcrop.js').toString(),replace('{ return {x:0,y:0,width:32,height:32}; }'));
assert.equal(hash(read(dir+'/candidate-helper.js')),receipt.candidateHelperSha256);
assert.deepEqual(bind(receipt.executedCandidate.path),receipt.executedCandidate);
const originalAst=ts.createSourceFile('original.mts',read(prior+'/executed-script.mts.txt').toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const executors:string[]=[];
function extract(n:ts.Node){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.getText(originalAst)==='page'&&n.expression.name.text==='evaluate'){
 const a=n.arguments[0]!;assert(ts.isArrowFunction(a));const emitted=ts.transpileModule('const fn='+a.getText(originalAst)+';',{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const ea=ts.createSourceFile('executor.js',emitted,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const d=ea.statements.filter(ts.isVariableStatement).flatMap(s=>Array.from(s.declarationList.declarations)).find(d=>ts.isIdentifier(d.name)&&d.name.text==='fn');
 assert(d?.initializer&&ts.isArrowFunction(d.initializer));executors.push(d.initializer.getText(ea));}ts.forEachChild(n,extract);}
extract(originalAst);assert.equal(executors.length,4);assert.deepEqual(executors,json(dir+'/reused-executors.json'));
const crc32=(b:Uint8Array)=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
function png(p:string){const b=read(p);assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));let w=0,h=0,color=0,channels=0,offset=8;const data:Buffer[]=[];
 while(offset<b.length){const len=b.readUInt32BE(offset),type=b.toString('ascii',offset+4,offset+8);assert.equal(crc32(b.subarray(offset+4,offset+8+len)),b.readUInt32BE(offset+8+len));
  const part=b.subarray(offset+8,offset+8+len);if(type==='IHDR'){w=part.readUInt32BE(0);h=part.readUInt32BE(4);assert.equal(part[8],8);color=part[9]!;assert([2,6].includes(color));channels=color===6?4:3;assert.deepEqual(Array.from(part.subarray(10)),[0,0,0]);}
  if(type==='IDAT')data.push(part);offset+=len+12;if(type==='IEND')break;}
 assert.equal(offset,b.length);const filtered=inflateSync(Buffer.concat(data)),stride=w*channels;assert.equal(filtered.length,(stride+1)*h);
 const rows=Buffer.alloc(stride*h),rgba=Buffer.alloc(w*h*4);const paeth=(a:number,b:number,c:number)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const f=filtered[y*(stride+1)]!;assert(f<=4);for(let x=0;x<stride;x++){const a=x>=channels?rows[y*stride+x-channels]!:0,bb=y?rows[(y-1)*stride+x]!:0,c=y&&x>=channels?rows[(y-1)*stride+x-channels]!:0;
   const predictor=f===0?0:f===1?a:f===2?bb:f===3?Math.floor((a+bb)/2):paeth(a,bb,c);rows[y*stride+x]=(filtered[y*(stride+1)+x+1]!+predictor)&255;}
  for(let x=0;x<w;x++){const dst=(y*w+x)*4,src=y*stride+x*channels;rows.copy(rgba,dst,src,src+3);rgba[dst+3]=channels===4?rows[src+3]!:255;}}
 return {w,h,rgba};}
const pixels=new Map<string,Buffer>(),frames:any[]=[],liveByVariant=new Map<string,number>();
const assetBySha=new Map(original.inputs.filter((a:any)=>a.transport==='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY').map((a:any)=>[a.sha256,a]));
for(const row of receipt.results){const name=row.condition.name,record=json(dir+'/'+name+'.json');assert.deepEqual(record,row);
 const raw=read(dir+'/'+name+'.rgba');assert.equal(raw.length,390*844*4);assert.equal(hash(raw),row.rgbaSha256);assert.equal(hash(read(dir+'/'+name+'.png')),row.pngSha256);
 const decoded=png(dir+'/'+name+'.png');assert.equal(decoded.w,390);assert.equal(decoded.h,844);
 for(let y=0;y<844;y++)assert(decoded.rgba.subarray(y*390*4,(y+1)*390*4).equals(raw.subarray((843-y)*390*4,(844-y)*390*4)));
 pixels.set(row.variant+':'+row.inputConditionIndex,raw);
 const passes=[];for(const pass of row.passes){let live=liveByVariant.get(row.variant)??0,peak=live,uploads=0,copies=0,deletes=0;
  for(const e of pass.events){assert(['source-upload','gpu-copy','delete'].includes(e.operation));assert(Number.isSafeInteger(e.bytes)&&e.bytes>0);
   if(e.operation==='source-upload'){const a:any=assetBySha.get(e.source.sha256);assert(a);assert.equal(e.bytes,a.width*a.height*4);uploads+=e.bytes;live+=e.bytes;}
   else if(e.operation==='gpu-copy'){copies+=e.bytes;live+=e.bytes;}else{deletes+=e.bytes;live-=e.bytes;}
   assert.equal(live,e.liveBytes);assert(live>=0);peak=Math.max(peak,live);}
  assert.equal(live,pass.liveBytes);assert.equal(peak,pass.peakBytes);assert.equal(pass.retained.reduce((n:number,e:any)=>n+e.bytes,0),live);assert.equal(pass.glError,0);
  passes.push({pass:pass.pass,sourceUploadBytes:uploads,gpuCopyBytes:copies,deletionBytes:deletes,peakBytes:peak,endBytes:live});liveByVariant.set(row.variant,live);}
 assert.deepEqual(row.gpuFailures,[]);frames.push({variant:row.variant,index:row.inputConditionIndex,condition:row.condition,precision:row.precision,fullPngYflipExact:true,rawRgba:bind(dir+'/'+name+'.rgba'),png:bind(dir+'/'+name+'.png'),passes});}
function diff(a:Buffer,b:Buffer){assert.equal(a.length,b.length);let count=0,max=0;const changed:any[]=[];for(let i=0;i<a.length;i+=4){let any=false;for(let c=0;c<4;c++){const d=Math.abs(a[i+c]!-b[i+c]!);max=Math.max(max,d);any||=d>0;}if(any){count++;if(changed.length<20)changed.push({x:(i/4)%390,glY:Math.floor(i/4/390),pngY:843-Math.floor(i/4/390),baseline:Array.from(a.subarray(i,i+4)),variant:Array.from(b.subarray(i,i+4))});}}return{changedPixels:count,maxByteDelta:max,firstChangedPixels:changed};}
const comparisons=[];for(const index of [0,1,2]){const base=pixels.get('baseline:'+index)!;const previous=read(prior+'/'+original.rows[index].condition.name+'.rgba');assert(base.equals(previous));
 comparisons.push({index,originalBaselineFullRgbaExact:true,variants:Object.fromEntries(['noart','candidate','badcrop'].map(v=>[v,diff(base,pixels.get(v+':'+index)!)]))});}
assert.equal(comparisons[0]!.variants.candidate.changedPixels,3);assert.equal(comparisons[1]!.variants.candidate.changedPixels,1);
assert.equal(comparisons[1]!.variants.noart.changedPixels,101155);assert.equal(comparisons[1]!.variants.badcrop.changedPixels,131287);
assert(Object.values(comparisons[2]!.variants).every(d=>d.changedPixels===0));
const after=before.map(b=>bind(b.path));assert.deepEqual(before,after);
const result={status:'ACTUAL_WINDOW_PIXEL_DIFFERENCE_INDEPENDENTLY_CONFIRMED_NOT_ADOPTED',input:bind(dir+'/result.json'),
 sourceMechanism:{sameOriginalBundleExceptExactOneFunctionBody:true,originalFourControlledExecutorsExact:true,baselineNoartCapturesReusedByteExact:true,originalSourceCount:receipt.originalSourceBindings.length},
 frames,comparisons,inputsUnchanged:before.length,scope:['Independent direct raw RGBA comparisons, custom PNG chunk/CRC/zlib/filter/Yflip decoder and logical GL ledger; no author comparison statistics used as pixel oracle.',
 'This is readback of actual softwareGPU captures, not a new GPU replay, target WEAPP/device or native memory/driver performance measurement.',
 'Candidate exact-pixel obligation fails 45/85 with one-byte differences; cause remains unassigned among float interpolation/remapping/copy/lifecycle without further evidence.',
 '139 normal-opacity noart and gross badcrop are also pixel exact: no useful artwork detection power; candidate139 exact cannot qualify crop quality.',
 'Original baseline/noart r3 reuse is explicit and bound. No fabricated current-generation rerun or retroactive closure of prior startup/helper failures.',
 'No production adoption, parameter tuning, budget change, new scene matrix or native/final acceptance.']};
fs.writeFileSync(file(out+'/binding.json'),JSON.stringify({before,after},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(file(out+'/result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:out,result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),comparisons,resourceTable:frames.map(f=>({variant:f.variant,index:f.index,maxPeak:Math.max(...f.passes.map((p:any)=>p.peakBytes)),warmEnd:f.passes[2].endBytes,warmSourceUpload:f.passes[2].sourceUploadBytes,warmGpuCopy:f.passes[2].gpuCopyBytes}))},null,2));
