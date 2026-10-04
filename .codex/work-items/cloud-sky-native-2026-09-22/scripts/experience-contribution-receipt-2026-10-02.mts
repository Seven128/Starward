import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=process.cwd(),task='.codex/work-items/cloud-sky-native-2026-09-22',script=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');
const browserSource=task+'/scripts/experience-contribution-receipt-browser-2026-10-02.ts';
const arg=process.argv.find(v=>v.startsWith('--output='))?.slice(9);assert(arg,'exclusive --output required');
const out=path.resolve(arg),rel=path.relative(root,out).replaceAll('\\','/');assert(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel));await assert.rejects(fs.access(out),{code:'ENOENT'});await fs.mkdir(out,{recursive:true});
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.resolve(root,p));return {path:p.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const write=(n:string,v:any)=>fs.writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const owner='apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts',beforeOwner=task+'/tmp/contribution-receipt-before-attribute-repair-2026-10-02.ts';
const reportPath=task+'/tmp/current-native-report-2026-10-01.json',priorPath='output/playwright/cloud-sky-sdss-level-composition-1002-r3/result.json',candidatePath='output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json',preservedPath=task+'/tmp/resume-preserved-hashes-2026-10-01.json';
let browser:any=null,before:any[]=[],after:any[]=[],observations:any[]=[];
try{
  const report=JSON.parse(await fs.readFile(reportPath,'utf8')).data,prior=JSON.parse(await fs.readFile(priorPath,'utf8')),candidateRaw=await fs.readFile(candidatePath);assert.equal(sha(candidateRaw),'73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52');
  const product=JSON.parse(candidateRaw.toString()).harnessInput,anchor=prior.rows.find((r:any)=>r.name==='night-real-pair');assert(anchor);
  const deep=report.skyScene.deepSky,index=deep.catalog.entries.findIndex((e:any)=>e.objectRef==='M:51'),point=deep.frames.find((f:any)=>f.at===anchor.at)?.points.find((p:any)=>p[0]===index);assert(point);
  const files=[script,browserSource,owner,beforeOwner,reportPath,priorPath,candidatePath,preservedPath],images:any[]=[];
  for(const name of ['OVERVIEW','MEDIUM']){const asset=product.levels[name],file=path.join(path.dirname(candidatePath),asset.file).replaceAll('\\','/'),bytes=await fs.readFile(file);assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);files.push(file);images.push({id:name,sha256:asset.sha256,bytes:asset.bytes,data:'data:image/png;base64,'+bytes.toString('base64')});}
  const preserved=JSON.parse(await fs.readFile(preservedPath,'utf8'));files.push(...preserved.map((x:any)=>x.path));
  const beforeRaw=await fs.readFile(beforeOwner,'utf8');assert.equal(sha(beforeRaw),'87b33c8dd466488cbaf958c3c0eb5f93aa44c3708daf86a476af97bf24637caf');
  const bundles:any[]=[];
  for(const variant of ['before-attribute-repair','current']){
    const result=await build({entryPoints:[path.resolve(browserSource)],absWorkingDir:root,bundle:true,write:false,metafile:true,format:'iife',globalName:'contributionReceiptTrial',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json'),plugins:variant==='current'?[]:[{name:'actual-before-owner',setup(b){b.onLoad({filter:/sky-gpu-artwork-contributions\.ts$/},()=>({contents:beforeRaw,loader:'ts',resolveDir:path.dirname(path.resolve(owner))}));}}]});
    const inputs=Object.keys(result.metafile!.inputs).filter(v=>!v.startsWith('<')).map(v=>{const p=path.relative(root,path.resolve(root,v)).replaceAll('\\','/');assert(p&&!p.startsWith('..')&&!path.isAbsolute(p));return p;});files.push(...inputs);
    const bundle=result.outputFiles[0]!.text;await fs.writeFile(path.join(out,variant+'.js'),bundle,{flag:'wx'});bundles.push({variant,bundle,metafile:result.metafile,bundleBinding:{bytes:Buffer.byteLength(bundle),sha256:sha(bundle)}});
  }
  before=await Promise.all([...new Set(files)].map(bind));for(const p of preserved)assert.equal(before.find(x=>x.path===p.path)?.sha256,p.sha256);
  await write('inputs-before.json',{before,bundles:bundles.map(({bundle,...b})=>b),beforeReplacement:{canonical:owner,actualSnapshot:beforeOwner,claim:'Only this exact captured production owner is replaced in the bounded before witness. Current bundle has no plugin/replacement.'}});
  const input={at:anchor.at,point,basis:anchor.basis,sunAltitudeDeg:anchor.sunAltitudeDeg,product,hourly:report.hourly,images};await write('prepared-input.json',{...input,images:images.map(({data,...x})=>x)});
  if(process.argv.includes('--prepare-only')){await write('static.json',{before,bundles:bundles.map(({bundle,metafile,...b})=>b),notExecuted:true});console.log(JSON.stringify({output:rel,static:true}));process.exit(0);}
  const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  for(const b of bundles){
    const page=await browser.newPage({viewport:{width:96,height:128}}),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(String(e)));await page.setContent('<style>body{margin:0}</style><canvas width="96" height="128"></canvas>');await page.addScriptTag({content:b.bundle});
    const actual=await page.evaluate((i:any)=>(globalThis as any).contributionReceiptTrial.run(i),{...input,onlyNames:b.variant==='current'?undefined:['real-pair']});
    const captures=[];for(const c of actual.captures){const prefix=b.variant+'.'+c.name;await fs.writeFile(path.join(out,prefix+'.rgba'),Buffer.from(c.rgba,'base64'),{flag:'wx'});await fs.writeFile(path.join(out,prefix+'.png'),Buffer.from(c.png.split(',')[1],'base64'),{flag:'wx'});captures.push({name:c.name,width:c.width,height:c.height,raw:await bind(rel+'/'+prefix+'.rgba'),png:await bind(rel+'/'+prefix+'.png')});}
    const sealed={...actual,captures,pageErrors:errors,variant:b.variant,bundle:b.bundleBinding};await write(b.variant+'.json',sealed);observations.push(sealed);await page.close();
  }
  after=await Promise.all(before.map(p=>bind(p.path)));await write('inputs-after.json',{after,unchanged:JSON.stringify(before)===JSON.stringify(after)});
  const current=observations.find(x=>x.variant==='current'),old=observations.find(x=>x.variant==='before-attribute-repair'),comparisons:any[]=[];
  const equal=async(a:string,b:string)=>{const ac=current.captures.find((c:any)=>c.name===a),bc=current.captures.find((c:any)=>c.name===b);assert(ac&&bc);const x=await fs.readFile(path.resolve(ac.raw.path)),y=await fs.readFile(path.resolve(bc.raw.path));let unequal=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i])unequal++;comparisons.push({name:a+'→'+b,bytes:x.length,unequal,pass:x.length===y.length&&unequal===0});};
  for(const name of ['plain-pair','budget-rejected','signal-compile','fbo-initial','fbo-chain'])await equal('disabled',name);await equal('high-dpr-disabled','high-dpr');
  const beforeRepair=old.rows.find((r:any)=>r.name==='real-pair'),afterRepair=current.rows.find((r:any)=>r.name==='real-pair');
  const witness={before:beforeRepair,after:afterRepair,beforeFailed:beforeRepair?.result.finePhoto!=='positive',afterPositive:afterRepair?.result.finePhoto==='positive',scope:'Actual before snapshot pending single point / six-vertex reduction. A passing before remains an honest negative diagnostic, not a claimed escaped-defect regression.'};
  const allPassed=current.failure===null&&current.pageErrors.length===0&&current.checks.every((x:any)=>x.pass)&&comparisons.every(x=>x.pass)&&JSON.stringify(before)===JSON.stringify(after)&&current.final.glError===0&&!current.final.contextLost&&Object.values(current.final.counts).every(x=>x===0)&&current.final.logicalTextureBytes===0;
  const result={before,after,observations:await Promise.all(['before-attribute-repair','current'].map(v=>bind(rel+'/'+v+'.json'))),comparisons,witness,allPassed,scope:current.scope};await write('result.json',result);
  console.log(JSON.stringify({output:rel,result:await bind(rel+'/result.json'),allPassed,failedChecks:current.checks.filter((x:any)=>!x.pass).map((x:any)=>x.name),witness:{beforeFailed:witness.beforeFailed,afterPositive:witness.afterPositive},currentFailure:current.failure,final:current.final}));assert(allPassed,'actual receipt mechanism checks failed; complete observations retained');
}catch(error){await write('failed.json',{error:String(error),before,after,observationsSaved:observations.map(x=>x.variant)});throw error;}finally{await browser?.close();}
