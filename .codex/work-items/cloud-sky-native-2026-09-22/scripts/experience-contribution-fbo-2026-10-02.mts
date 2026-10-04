// Task-only bounded GPU contribution feasibility. No production adoption.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=process.cwd(),task='.codex/work-items/cloud-sky-native-2026-09-22';
const script=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');
const browserSource=task+'/scripts/experience-contribution-fbo-browser-2026-10-02.ts';
const outputArg=process.argv.find(v=>v.startsWith('--output='))?.slice(9);assert(outputArg,'exclusive --output required');
const output=path.resolve(outputArg),outputRelative=path.relative(root,output);assert(outputRelative&&!outputRelative.startsWith('..')&&!path.isAbsolute(outputRelative));
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const bind=async(file:string)=>{const raw=await fs.readFile(path.resolve(root,file));return {path:file.replaceAll('\\','/'),bytes:raw.length,sha256:sha(raw)};};
const write=(name:string,value:any)=>fs.writeFile(path.join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const reportPath=task+'/tmp/current-native-report-2026-10-01.json',priorPath='output/playwright/cloud-sky-sdss-level-composition-1002-r3/result.json',candidatePath='output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json';
const preservedPath=task+'/tmp/resume-preserved-hashes-2026-10-01.json';
const baseInputs=[script,browserSource,reportPath,priorPath,candidatePath,preservedPath];
let before:any[]=[],after:any[]=[],browser:any=null,actual:any=null;
try{
  const report=JSON.parse(await fs.readFile(reportPath,'utf8')).data,prior=JSON.parse(await fs.readFile(priorPath,'utf8')),candidateRaw=await fs.readFile(candidatePath);
  assert.equal(sha(candidateRaw),'73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52');
  const candidate=JSON.parse(candidateRaw.toString()),product=candidate.harnessInput,anchor=prior.rows.find((r:any)=>r.name==='night-real-pair');assert(anchor);
  const deep=report.skyScene.deepSky,index=deep.catalog.entries.findIndex((e:any)=>e.objectRef==='M:51'),frame=deep.frames.find((f:any)=>f.at===anchor.at),point=frame?.points.find((p:any)=>p[0]===index);assert(point);
  const images:any[]=[];
  for(const level of ['OVERVIEW','MEDIUM']){
    const asset=product.levels[level],file=path.join(path.dirname(candidatePath),asset.file).replaceAll('\\','/'),bytes=await fs.readFile(file);assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);baseInputs.push(file);
    images.push({id:level,sha256:asset.sha256,bytes:asset.bytes,data:'data:image/png;base64,'+bytes.toString('base64')});
  }
  const preserved=JSON.parse(await fs.readFile(preservedPath,'utf8'));baseInputs.push(...preserved.map((p:any)=>p.path));
  const owner='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts',original=await fs.readFile(owner,'utf8');
  const appended='\n// TASK ONLY readonly local shader exports; renderer execution unchanged.\nexport {artworkVertex as taskArtworkVertex, skyRay as taskSkyRay};\n';
  const augmented=original+appended;
  await fs.writeFile(path.join(output,'renderer-original.ts'),original,{flag:'wx'});await fs.writeFile(path.join(output,'renderer-task-augmented.ts'),augmented,{flag:'wx'});await fs.writeFile(path.join(output,'renderer-readonly-export-delta.txt'),appended,{flag:'wx'});
  const result=await build({entryPoints:[path.resolve(browserSource)],absWorkingDir:root,bundle:true,write:false,metafile:true,format:'iife',globalName:'contributionTrial',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json'),plugins:[{name:'readonly-task-shader-export',setup(b){b.onLoad({filter:/sky-gpu-renderer\.ts$/},()=>({contents:augmented,loader:'ts',resolveDir:path.dirname(path.resolve(owner))}));}}]});
  const bundle=result.outputFiles[0]!.text;
  const graphInputs=Object.keys(result.metafile!.inputs).filter(v=>!v.startsWith('<')).map(v=>{
    const absolute=path.resolve(root,v),relative=path.relative(root,absolute);assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'unbound/non-root graph input:'+v);return relative.replaceAll('\\','/');
  });
  before=await Promise.all([...new Set([...baseInputs,...graphInputs])].map(bind));
  for(const old of preserved)assert.equal(before.find(p=>p.path===old.path)?.sha256,old.sha256,'preserved input changed:'+old.path);
  await write('inputs-before.json',{before,graph:result.metafile,scope:'strict complete local browser metafile inputs; cached report/frame directly consumed, no Node report projection/producer or network path'});
  await fs.copyFile(script,path.join(output,'executed-script.mts'));await fs.copyFile(browserSource,path.join(output,'executed-browser.ts'));await fs.writeFile(path.join(output,'browser-executable.js'),bundle,{flag:'wx'});
  await write('prepared-input.json',{at:anchor.at,point,basis:anchor.basis,sunAltitudeDeg:anchor.sunAltitudeDeg,product,sourceAssets:images.map(({data,...rest})=>rest),hourly:report.hourly});
  if(process.argv.includes('--prepare-only')){await write('static-receipt.json',{script:await bind(script),browserSource:await bind(browserSource),bundleBytes:Buffer.byteLength(bundle),bundleSha256:sha(bundle),graphInputs:graphInputs.length,notExecuted:true});console.log(JSON.stringify({output:outputRelative,static:true}));process.exit(0);}
  const playwrightPath='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
  const {chromium}=createRequire(import.meta.url)(playwrightPath);
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:96,height:128}}),errors:string[]=[];page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="96" height="128"></canvas>');
  await page.addScriptTag({content:bundle});
  actual=await page.evaluate((input:any)=>(globalThis as any).contributionTrial.run(input),{at:anchor.at,point,basis:anchor.basis,sunAltitudeDeg:anchor.sunAltitudeDeg,product,hourly:report.hourly,images});
  // Durable full observations/final owner state BEFORE any postcondition.
  const captureInputs=actual.captures;await write('actual-raw.json',{...actual,captures:captureInputs.map(({rgba,png,...rest}:any)=>rest),pageErrors:errors});
  for(const item of captureInputs){await fs.writeFile(path.join(output,item.name+'.rgba'),Buffer.from(item.rgba,'base64'),{flag:'wx'});if(item.png)await fs.writeFile(path.join(output,item.name+'.png'),Buffer.from(item.png.split(',')[1],'base64'),{flag:'wx'});}
  for(const row of actual.rows)for(const reduction of row.reductions??[row.maximum,row.average].filter(Boolean))for(let i=0;i<reduction.steps.length;i++)await fs.writeFile(path.join(output,reduction.label+'.reduce-'+i+'.rgba'),Buffer.from(reduction.steps[i].rgba,'base64'),{flag:'wx'});
  after=await Promise.all(before.map(item=>bind(item.path)));await write('inputs-after.json',{after,unchanged:JSON.stringify(before)===JSON.stringify(after)});
  const comparisons:any[]=[],pixels=(name:string)=>Buffer.from(captureInputs.find((v:any)=>v.name===name).rgba,'base64');
  const compare=(name:string,a:Buffer,b:Buffer,predicate:(i:number)=>boolean)=>{let failed=0;for(let i=0;i<a.length;i++)if(!predicate(i))failed++;comparisons.push({name,pass:failed===0,failedBytes:failed});};
  const initial=pixels('real-pair.group.signal'),additive=pixels('real-pair.additive.signal');compare('additive-destination-ONE-keeps-photo-and-eligibility',initial,additive,i=>initial[i]===additive[i]);
  for(const [a,b] of [['group','partial-disc'],['partial-disc','opaque-disc'],['opaque-disc','terrain'],['terrain','finished']]){
    const first=pixels('real-pair.'+a+'.signal'),next=pixels('real-pair.'+b+'.signal');compare(a+'→'+b+'.nonincrease-and-eligibility-retained',first,next,i=>i%4<2?next[i]<=first[i]:next[i]===first[i]);
  }
  const finished=pixels('real-pair.finished.signal');let navigationNonzero=0,belowNonzero=0;
  for(let y=0;y<128;y++)for(let x=0;x<96;x++)for(const c of [0,1]){const v=finished[(y*96+x)*4+c];if(y>=120&&v)navigationNonzero++;if(y<120&&v)belowNonzero++;}
  comparisons.push({name:'finish-navigation-exact-top-eight-rows-photo-zero-with-other-contribution',pass:navigationNonzero===0&&belowNonzero>0,navigationNonzero,belowNonzero});
  const black=pixels('valid-black.group.signal');let blackInvalid=0;for(let i=0;i<black.length;i++)if(black[i]!==((i%4<2)?0:255))blackInvalid++;
  comparisons.push({name:'fine-valid-black-selects-fine-and-excludes-coarse-photo',pass:blackInvalid===0,failedBytes:blackInvalid,scope:'no W3 consumer/source callback in trial'});
  for(const row of actual.rows.filter((r:any)=>r.condition))for(const reduction of row.reductions){const full=pixels(reduction.label+'.signal'),maximum=[0,0,0,0];for(let i=0;i<full.length;i++)maximum[i%4]=Math.max(maximum[i%4],full[i]);comparisons.push({name:reduction.label+'.gpu-max-equals-full-raw-max',pass:JSON.stringify(maximum)===JSON.stringify(reduction.value),rawMax:maximum,gpuMax:reduction.value});}
  const control=actual.rows.find((r:any)=>r.control==='one-hot');comparisons.push({name:'one-hot-MAX-preserves-255-average-attenuates-to-64',pass:control.maximum.value[0]===255&&control.average.value[0]===64,max:control.maximum.value,average:control.average.value});
  comparisons.push({name:'actual-partial-alpha-positive-math-quantizes-to-zero',pass:actual.quantization?.after[0]===0&&actual.quantization?.analyticRemaining>0,quantization:actual.quantization});
  const captures=await Promise.all(captureInputs.map(async(item:any)=>({...item,rgba:undefined,png:undefined,raw:await bind(path.join(outputRelative,item.name+'.rgba')),pngFile:item.png?await bind(path.join(outputRelative,item.name+'.png')):undefined})));
  const allPassed=actual.failure===null&&errors.length===0&&actual.checks.every((v:any)=>v.pass)&&comparisons.every(v=>v.pass)&&actual.final.glError===0&&!actual.final.contextLost&&Object.values(actual.final.afterRendererDispose.counts).every(v=>v===0)&&actual.final.afterRendererDispose.logicalTextureBytes===0&&JSON.stringify(before)===JSON.stringify(after);
  const sealed={script:await bind(script),browserSource:await bind(browserSource),bundle:{bytes:Buffer.byteLength(bundle),sha256:sha(bundle)},before,after,captures,actualRaw:await bind(path.join(outputRelative,'actual-raw.json')),comparisons,allPassed,scope:actual.scope};await write('result.json',sealed);
  console.log(JSON.stringify({output:outputRelative,result:await bind(path.join(outputRelative,'result.json')),allPassed,rows:actual.rows.filter((r:any)=>r.condition).map((r:any)=>({condition:r.condition,group:r.groupSignal,final:r.finalSignal,glError:r.glError})),final:actual.final,failure:actual.failure}));
  assert(allPassed,'bounded feasibility checks failed; preserved raw/result');
}catch(error){await write('failed.json',{error:String(error),before,after,actualSaved:actual!==null});console.log(JSON.stringify({output:outputRelative,failed:String(error)}));throw error;}
finally{if(browser)await browser.close();}
