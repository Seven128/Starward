// Author's read-only readback; independent review is a different responsibility.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
const input='output/playwright/cloud-sky-contribution-fbo-1002-r1';
const output='output/contribution-fbo-author-readback-1002-r1';
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const reads:any[]=[],checks:any[]=[];
const read=async(file:string)=>{const data=await fs.readFile(file);reads.push({path:file,bytes:data.length,sha256:sha(data)});return data;};
const check=(name:string,pass:boolean,details?:any)=>checks.push({name,pass,details});
const decodePng=(bytes:Buffer)=>{
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');let offset=8,w=0,h=0,type=0;const chunks:Buffer[]=[];
  while(offset<bytes.length){const n=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+n);if(kind==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);assert.equal(data[8],8);type=data[9];assert([2,6].includes(type));assert.equal(data[10],0);assert.equal(data[11],0);assert.equal(data[12],0);}if(kind==='IDAT')chunks.push(data);offset+=n+12;if(kind==='IEND')break;}
  const bpp=type===6?4:3,stride=w*bpp,filtered=inflateSync(Buffer.concat(chunks)),decoded=Buffer.alloc(w*h*4),previous=Buffer.alloc(stride);assert.equal(filtered.length,h*(stride+1));
  const paeth=(a:number,b:number,c:number)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<h;y++){
    const filter=filtered[y*(stride+1)],row=Buffer.from(filtered.subarray(y*(stride+1)+1,(y+1)*(stride+1)));
    for(let i=0;i<stride;i++){const a=i>=bpp?row[i-bpp]:0,b=previous[i],c=i>=bpp?previous[i-bpp]:0;row[i]=(row[i]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN))&255;assert(filter<=4);}
    for(let x=0;x<w;x++)for(let channel=0;channel<4;channel++)decoded[(y*w+x)*4+channel]=channel===3&&bpp===3?255:row[x*bpp+channel];row.copy(previous);
  }
  return {w,h,decoded};
};
try{
  const result=JSON.parse((await read(input+'/result.json')).toString()),actualRaw=await read(input+'/actual-raw.json'),raw=JSON.parse(actualRaw.toString());
  check('actual-raw-bind',sha(actualRaw)===result.actualRaw.sha256);
  const before=JSON.parse((await read(input+'/inputs-before.json')).toString()),after=JSON.parse((await read(input+'/inputs-after.json')).toString());
  check('stored-run-before-after-exact',JSON.stringify(before.before)===JSON.stringify(after.after)&&JSON.stringify(result.before)===JSON.stringify(before.before)&&JSON.stringify(result.after)===JSON.stringify(after.after));
  check('strict-local-browser-graph-bound',Object.keys(before.graph.inputs).filter((p:string)=>!p.startsWith('<')).every((p:string)=>{const absolute=path.resolve(p),relative=path.relative(process.cwd(),absolute).replaceAll('\\','/');return !!relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&before.before.some((b:any)=>b.path===relative);}));
  const bundle=await read(input+'/browser-executable.js');check('actual-executable-hash',sha(bundle)===result.bundle.sha256);
  for(const item of [result.script,result.browserSource]){const file=item.path.endsWith('.mts')?'executed-script.mts':'executed-browser.ts';check(file+'.hash',sha(await read(input+'/'+file))===item.sha256);}
  const original=await read(input+'/renderer-original.ts'),augmented=await read(input+'/renderer-task-augmented.ts'),delta=await read(input+'/renderer-readonly-export-delta.txt');check('readonly-export-only-exact-delta',Buffer.concat([original,delta]).equals(augmented));check('renderer-original-bound',sha(original)===before.before.find((b:any)=>b.path==='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts').sha256);
  const allPixels=new Map<string,Buffer>();
  for(const item of result.captures){
    const bytes=await read(item.raw.path);check(item.name+'.full-rgba-binding',sha(bytes)===item.raw.sha256&&bytes.length===item.width*item.height*4);allPixels.set(item.name,bytes);
    if(item.pngFile){const png=await read(item.pngFile.path),image=decodePng(png);let failed=0;for(let y=0;y<image.h;y++)for(let x=0;x<image.w;x++)for(let c=0;c<4;c++)if(image.decoded[(y*image.w+x)*4+c]!==bytes[((image.h-1-y)*image.w+x)*4+c])failed++;check(item.name+'.PNG-bottomup-RGBA-exact',sha(png)===item.pngFile.sha256&&image.w===item.width&&image.h===item.height&&failed===0,{failed});}
  }
  for(const row of raw.rows)for(const reduction of row.reductions??[row.maximum,row.average].filter(Boolean)){
    let current:Buffer,w:number,h:number;
    if(row.control==='one-hot'){current=Buffer.from([255,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255]);w=h=2;}
    else{current=allPixels.get(reduction.label+'.signal')!;w=96;h=128;}
    for(let index=0;index<reduction.steps.length;index++){
      const step=reduction.steps[index],next=await read(input+'/'+reduction.label+'.reduce-'+index+'.rgba');let failed=0;
      for(let y=0;y<step.height;y++)for(let x=0;x<step.width;x++)for(let c=0;c<4;c++){
        const values=[];for(const dy of [0,1])for(const dx of [0,1])values.push(current[((Math.min(h-1,y*2+dy)*w+Math.min(w-1,x*2+dx))*4)+c]);
        const expected=reduction.average?Math.round(values.reduce((a,b)=>a+b,0)/4):Math.max(...values);if(next[(y*step.width+x)*4+c]!==expected)failed++;
      }
      check(reduction.label+'.step-'+index+'.complete-exact',next.equals(Buffer.from(step.rgba,'base64'))&&next.length===step.width*step.height*4&&failed===0,{width:step.width,height:step.height,failed});current=next;w=step.width;h=step.height;
    }
    check(reduction.label+'.final-value',JSON.stringify(Array.from(current))===JSON.stringify(reduction.value));
  }
  const first=allPixels.get('real-pair.group.signal')!,add=allPixels.get('real-pair.additive.signal')!,partial=allPixels.get('real-pair.partial-disc.signal')!,opaque=allPixels.get('real-pair.opaque-disc.signal')!,terrain=allPixels.get('real-pair.terrain.signal')!,finished=allPixels.get('real-pair.finished.signal')!,black=allPixels.get('valid-black.group.signal')!;
  check('full-additive-exact-preservation',first.equals(add));
  for(const [name,a,b] of [['partial',first,partial],['opaque',partial,opaque],['terrain',opaque,terrain],['finish',terrain,finished]] as const){let failed=0,decreased=0;for(let i=0;i<a.length;i++){if(i%4<2){if(b[i]>a[i])failed++;if(b[i]<a[i])decreased++;}else if(b[i]!==a[i])failed++;}check(name+'.entire-photo-nonincreasing-eligibility-unchanged',failed===0&&decreased>0,{failed,decreased});}
  const at=(data:Buffer,x:number,y:number)=>Array.from(data.subarray(((127-y)*96+x)*4,((127-y)*96+x)*4+4));
  const center={group:at(first,48,64),partial:at(partial,48,64)},opaqueCenter={before:at(partial,24,64),after:at(opaque,24,64)};
  check('opaque-point-actual-positive-to-zero',opaqueCenter.before[0]>0&&opaqueCenter.after[0]===0&&opaqueCenter.after[1]===0,{opaqueCenter});
  let blackInvalid=0,navigationPositive=0,navPreviouslyPositive=0,remainingPositive=0;for(let i=0;i<black.length;i++)if(black[i]!==((i%4<2)?0:255))blackInvalid++;
  for(let y=0;y<128;y++)for(let x=0;x<96;x++)for(const c of [0,1]){const i=(y*96+x)*4+c;if(y>=120){if(finished[i])navigationPositive++;if(terrain[i])navPreviouslyPositive++;}else if(finished[i])remainingPositive++;}
  check('black-entire-valid-eligible-zero-photo',blackInvalid===0,{blackInvalid});check('nav-eight-rows-actual-positive-to-zero-and-survivors',navigationPositive===0&&navPreviouslyPositive>0&&remainingPositive>0,{navigationPositive,navPreviouslyPositive,remainingPositive});
  const ledger=new Map<string,{kind:string,bytes:number}>();let peak=0,afterCandidate:any=null;
  const counts=()=>{const count:any={texture:0,framebuffer:0,buffer:0,program:0,shader:0};let logicalTextureBytes=0;for(const value of ledger.values()){count[value.kind]++;logicalTextureBytes+=value.bytes;}return {counts:count,logicalTextureBytes};};
  for(const event of raw.events){
    if(afterCandidate===null&&event.phase==='renderer.dispose')afterCandidate=counts();
    if(event.event==='create'){check('resource-create-new.'+event.id,!ledger.has(event.id));ledger.set(event.id,{kind:event.kind,bytes:0});}
    if(event.event==='delete'){if(event.id){check('resource-delete-owned.'+event.id,ledger.has(event.id));ledger.delete(event.id);}}
    if(['texImage2D','copyTexImage2D'].includes(event.event)){const resource=ledger.get(event.texture);check('resource-image-owned.'+event.texture,!!resource);if(resource)resource.bytes=event.bytes;peak=Math.max(peak,counts().logicalTextureBytes);}
  }
  check('entire-ledger-before-renderer-dispose-exact',JSON.stringify(afterCandidate)===JSON.stringify(raw.final.afterCandidateDispose));check('entire-ledger-final-zero-exact',JSON.stringify(counts())===JSON.stringify(raw.final.afterRendererDispose)&&ledger.size===0);check('entire-ledger-peak-exact',peak===raw.final.peakLogicalTextureBytes,{peak});
  const bridges=raw.events.filter((e:any)=>e.event==='candidate-same-prepared-draw'),groups=raw.events.filter((e:any)=>e.event==='actual-renderer-draw'&&e.mode==='group');
  check('two-bridge-same-prepared-identities',bridges.length===2&&groups.length===2&&bridges.every((b:any,i:number)=>b.sourceProgram===groups[i].program&&JSON.stringify(b.samplers)===JSON.stringify(groups[i].samplers)));
  check('all-recorded-state-restorations-pass',raw.checks.every((c:any)=>c.pass));check('no-actual-GL-error-and-no-context-loss',raw.rows.filter((r:any)=>r.condition).every((r:any)=>r.glError===0)&&raw.final.glError===0&&!raw.final.contextLost&&raw.failure===null&&raw.pageErrors.length===0);
  const resultSummary={input,readCount:reads.length,reads,checks,center,opaqueCenter,actualStateChecks:raw.checks.length,bridgeGroups:groups.map((g:any)=>({samplers:g.samplers,uniforms:g.uniforms,positionLocation:g.positionLocation})),peakLogicalTextureBytes:peak,logicalCandidateSteadyTextureBytes:96*128*4,maxReductionChainAllocatedTextureBytes:16388,normalPngCount:result.captures.filter((c:any)=>c.pngFile).length,fullRgbaCount:result.captures.length,reductionSteps:raw.rows.flatMap((r:any)=>r.reductions??[r.maximum,r.average].filter(Boolean)).reduce((n:number,r:any)=>n+r.steps.length,0),allPassed:checks.every(c=>c.pass),scope:'author self-readback only, no new render. Stored original execution before/after is historical; root now owns next shared registration edits. Not independent acceptance or current-source replay.'};
  await fs.writeFile(output+'/result.json',JSON.stringify(resultSummary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,allPassed:resultSummary.allPassed,readCount:reads.length,normalPngCount:resultSummary.normalPngCount,fullRgbaCount:resultSummary.fullRgbaCount,reductionSteps:resultSummary.reductionSteps,peakLogicalTextureBytes:peak}));assert(resultSummary.allPassed);
}catch(error){await fs.writeFile(output+'/failed.json',JSON.stringify({error:String(error),reads,checks},null,2)+'\n',{flag:'wx'});throw error;}
