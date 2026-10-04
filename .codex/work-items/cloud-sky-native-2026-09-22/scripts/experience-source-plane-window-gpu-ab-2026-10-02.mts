/** Frozen r4 full-hook executor and renderer; task-only window/no-art/bad-crop substitutions, no production changes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),task='.codex/work-items/cloud-sky-native-2026-09-22';
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const priorDir='output/playwright/cloud-sky-full-hook-resource-1002-r4';
const prior=JSON.parse(await fs.readFile(path.join(ROOT,priorDir,'result.json'),'utf8'));
assert.equal((await bind(priorDir+'/result.json')).sha256,'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
for(const r of prior.sourceBindings)assert.deepEqual(await bind(r.path),r);
const source=await fs.readFile(path.join(ROOT,priorDir,'executed-script.mts.txt'),'utf8');
assert.equal(hash(source),'b3fbc0747d6b463a265536642a589594a87f5bac0004660635e71aef840e902a');
const ast=ts.createSourceFile('executed.mts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const executors:string[]=[];
function visit(n:ts.Node){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.getText(ast)==='page'&&n.expression.name.text==='evaluate'){
 const a=n.arguments[0]!;assert(ts.isArrowFunction(a));
 const emitted=ts.transpileModule('const fn='+a.getText(ast)+';',{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const emittedAst=ts.createSourceFile('executor.js',emitted,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const declaration=emittedAst.statements.filter(ts.isVariableStatement).flatMap(s=>Array.from(s.declarationList.declarations))
  .find(d=>ts.isIdentifier(d.name)&&d.name.text==='fn');
 assert(declaration?.initializer&&ts.isArrowFunction(declaration.initializer));
 executors.push(declaration.initializer.getText(emittedAst));}
 ts.forEachChild(n,visit);}
visit(ast);assert.equal(executors.length,4,'reuse exact controlled world/GPU/condition/dispose functions');
const metadata:Record<string,any>={},assets:any[]=[];
for(const r of prior.inputs){
 if(r.transport==='FROZEN_LOCAL_BFF_JSON'||r.transport==='BOUND_LOCAL_ALPHA_JSON'){
  const b=await fs.readFile(path.join(ROOT,r.path));assert.equal(hash(b),r.sha256);metadata[r.route]={body:JSON.parse(b.toString()),bytes:b.length,sha256:r.sha256};
 }
 if(r.transport==='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY'){
  const b=await fs.readFile(path.join(ROOT,r.path));assert.equal(hash(b),r.sha256);assert.equal(b.length,r.bytes);assets.push({...r,base64:b.toString('base64')});
 }
}
const raw=projectAdoptedSkyCatalog(JSON.parse(await fs.readFile(path.join(ROOT,prior.report.path),'utf8'))).data;
const stars=metadata[`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`].body.data;
const figures=metadata['/v2/sky/constellations'].body.data,at=new Date(raw.context.at).toISOString();
const current=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);
const compiled=await fs.readFile(path.join(ROOT,priorDir,'bundle.js'),'utf8');assert.equal(hash(compiled),prior.compiledSha256);
const candidatePath=task+'/scripts/experience-source-plane-window-candidate-2026-10-02.mts';
const candidateSource=await fs.readFile(path.join(ROOT,candidatePath),'utf8');
assert.equal(hash(candidateSource),'191db39c94f604fda03a2c1ab82f115bb5eb75c32a61c9b7a43b98e6ad95c78c');
const candidateAst=ts.createSourceFile(candidatePath,candidateSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const utilities=new Set(['dot','cross','norm','normalize','determinant','inverse','normInf','mul','corners']);
const pure=candidateAst.statements.filter(n=>ts.isTypeAliasDeclaration(n)||
 (ts.isFunctionDeclaration(n)&&['clip','sourcePlaneWindowCandidate'].includes(n.name?.text??''))||
 (ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&utilities.has(d.name.text)))).map(n=>n.getText(candidateAst)).join('\n');
const pureEntry=`import {skyArtworkViewRayHull} from './apps/wechat-miniapp/src/features/sky/sky-artwork-visibility';
import {skyArtworkUvAtDirection,type SkyArtworkRegistration,type SkyArtworkView} from './apps/wechat-miniapp/src/features/sky/sky-artwork-registration';
import type {SkyVector} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
const assert=(value:unknown)=>{if(!value)throw Error('task_candidate_uv_assertion');};${pure}`;
const helper=await build({stdin:{contents:pureEntry,resolveDir:ROOT,loader:'ts'},bundle:true,write:false,metafile:true,platform:'browser',
 format:'iife',globalName:'taskClipProbe',target:'es2022',tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json')});
const candidateBundle=helper.outputFiles[0]!.text;
const moduleAst=ts.createSourceFile('frozen.js',compiled,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let owner:ts.FunctionDeclaration|undefined;
const find=(n:ts.Node)=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='skyArtworkTextureWindow'){assert(!owner);owner=n;}ts.forEachChild(n,find);};find(moduleAst);assert(owner?.body);
const replaceOwner=(body:string)=>compiled.slice(0,owner!.body!.getStart(moduleAst))+body+compiled.slice(owner!.body!.end);
const candidateVariant=replaceOwner('{ return globalThis.taskClipProbe.sourcePlaneWindowCandidate(registration,view,width,height,imageWidth,imageHeight).window; }');
const badCropVariant=replaceOwner('{ return {x:0,y:0,width:32,height:32}; }');
let output='output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r1';
for(let n=2;;n++){try{await fs.access(path.join(ROOT,output));output=`output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r${n}`;}catch{break;}}
const dir=path.join(ROOT,output);await fs.mkdir(dir,{recursive:true});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mts.txt'));
await fs.writeFile(path.join(dir,'candidate-pure-source.ts.txt'),pureEntry,{flag:'wx'});
await fs.writeFile(path.join(dir,'candidate-helper.js'),candidateBundle,{flag:'wx'});
await fs.writeFile(path.join(dir,'reused-executors.json'),JSON.stringify(executors,null,2)+'\n',{flag:'wx'});
const variantBundles={baseline:compiled,noart:compiled,candidate:candidateVariant,badcrop:badCropVariant};
for(const [name,body] of Object.entries(variantBundles))await fs.writeFile(path.join(dir,name+'.js'),body,{flag:'wx'});
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const results:any[]=[],errors:any[]=[];
const rgba=new Map<string,Buffer>();
const reuseDir='output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r3';
const reusedInputs:any[]=[];
const execute=(page:any,source:string,input?:any)=>page.evaluate(new Function('return ('+source+')')(),input);
const difference=(a:Buffer,b:Buffer)=>{assert.equal(a.length,b.length);let pixels=0,maxDelta=0;
 for(let i=0;i<a.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(a[i+c]!-b[i+c]!);changed ||=d>0;maxDelta=Math.max(maxDelta,d);}if(changed)pixels++;}
 return {changedPixels:pixels,maxDelta};};
try{
 for(const variant of ['baseline','noart','candidate','badcrop'] as const){
  // r3 completed these unchanged variants before failing at the candidate-only missing task assertion.
  if(variant==='baseline'||variant==='noart'){
   assert.equal((await bind(reuseDir+'/executed-script.mts.txt')).sha256,'e5ef8fe25e3ed17983a2599d24d21126ad0f8b331f847307a2acb4b9888e66fd');
   assert.equal(hash(await fs.readFile(path.join(ROOT,reuseDir,variant+'.js'))),hash(compiled));
   for(const index of [0,1,2]){
    const name=variant+'-'+prior.rows[index].condition.name;
    const record=JSON.parse(await fs.readFile(path.join(ROOT,reuseDir,name+'.json'),'utf8'));
    const body=await fs.readFile(path.join(ROOT,reuseDir,name+'.rgba')),png=await fs.readFile(path.join(ROOT,reuseDir,name+'.png'));
    assert.equal(record.rgbaSha256,hash(body));assert.equal(record.pngSha256,hash(png));assert.deepEqual(record.gpuFailures,[]);
    assert(record.passes.every((p:any)=>p.glError===0));if(variant==='baseline')assert.equal(record.rgbaSha256,prior.rows[index].rgbaSha256);
    rgba.set(variant+':'+index,body);results.push(record);
    for(const extension of ['json','rgba','png']){
     reusedInputs.push(await bind(reuseDir+'/'+name+'.'+extension));
     await fs.copyFile(path.join(ROOT,reuseDir,name+'.'+extension),path.join(dir,name+'.'+extension),fs.constants.COPYFILE_EXCL);
    }
   }
   continue;
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:Error)=>errors.push({variant,message:e.message}));
  await page.setContent('<canvas id="sky" width="390" height="844"></canvas>');await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});
  await execute(page,executors[0]!,{metadata,assets});await page.addScriptTag({content:candidateBundle});await page.addScriptTag({content:variantBundles[variant]});
  await execute(page,executors[1]!);
  const precision=await page.evaluate(()=>{const gl=(globalThis as any).__controlled.gl;const p=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
   return {rangeMin:p?.rangeMin,rangeMax:p?.rangeMax,precision:p?.precision,redBits:gl.getParameter(gl.RED_BITS),greenBits:gl.getParameter(gl.GREEN_BITS),blueBits:gl.getParameter(gl.BLUE_BITS),alphaBits:gl.getParameter(gl.ALPHA_BITS)};});
  if(variant==='noart')await page.evaluate(()=>{const w=(globalThis as any).__controlled;w.renderer.artwork=()=>true;});
  // Preserve the actual r4 previous-frame preparation trajectory; no new views/input/source.
  for(const index of [0,1,2]){
   const condition={...prior.rows[index].condition,name:variant+'-'+prior.rows[index].condition.name};
   const actual=await execute(page,executors[2]!,{condition,current,figures,at});
   const {rgba:encoded,capture,...rest}=actual,body=Buffer.from(encoded,'base64'),png=Buffer.from(capture.split(',')[1],'base64');
   rgba.set(variant+':'+index,body);
   await fs.writeFile(path.join(dir,condition.name+'.rgba'),body,{flag:'wx'});await fs.writeFile(path.join(dir,condition.name+'.png'),png,{flag:'wx'});
   const record={variant,inputConditionIndex:index,precision,rgbaSha256:hash(body),pngSha256:hash(png),...rest};results.push(record);
   await fs.writeFile(path.join(dir,condition.name+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
   assert(record.passes.every((p:any)=>p.glError===0));assert.deepEqual(record.gpuFailures,[]);
   if(variant==='baseline')assert.equal(record.rgbaSha256,prior.rows[index].rgbaSha256,'unmodified actual baseline exactly repeats frozen r4 full pixels');
  }
  const final=await execute(page,executors[3]!);assert.equal(final.gpu.liveBytes,0);assert.equal(final.gpu.aliveTextures,0);await page.close();
 }
 const comparisons=[];
 for(const index of [1,2]){
  const baseline=rgba.get('baseline:'+index)!;
  comparisons.push({inputConditionIndex:index,normalProductOpacity:true,noart:difference(baseline,rgba.get('noart:'+index)!),
   candidate:difference(baseline,rgba.get('candidate:'+index)!),grossBadCrop:difference(baseline,rgba.get('badcrop:'+index)!)});
 }
 assert(comparisons[0]!.noart.changedPixels>0,'actual 85 normal image contribution must be visible for this pixel oracle');
 assert(comparisons[0]!.grossBadCrop.changedPixels>0,'gross bad crop must be detected by actual 85 rendered pixels');
 assert.deepEqual(errors,[]);for(const r of prior.sourceBindings)assert.deepEqual(await bind(r.path),r);
 const status=comparisons.every(c=>c.candidate.changedPixels===0)?'BOUNDED_AB_EXACT_NOT_ADOPTED':'CANDIDATE_PIXEL_DIFFERENCE_NOT_ADOPTED';
 await fs.writeFile(path.join(dir,'result.json'),JSON.stringify({status,input:await bind(priorDir+'/result.json'),originalSourceBindings:prior.sourceBindings,
  executedCandidate:await bind(candidatePath),candidateHelperSha256:hash(candidateBundle),variantBundleHashes:Object.fromEntries(Object.entries(variantBundles).map(([k,v])=>[k,hash(v)])),
  results,comparisons,errors,reusedInputs,limits:['Exact reused full-hook/GL executors and original138-module bundle with only task window function substitutions; no new production scene or source.',
   'Unchanged baseline/noart successful r3 captures and traces copied with exact hashes; r3 failed only when the candidate task helper first referenced an unbound assertion. Fresh candidate/badcrop execute with assertion bound; numerical candidate unchanged.',
   '139 normal-opacity candidate exact can be only resource-mechanism evidence if noart is exact. Actual85 normal-opacity/badcrop proves bounded detection power for that view, not universal139 float correctness.',
   'Recorded GL sizes are actual logical source-upload/copy/deletion; desktop native/image/driver/GC/OS memory, WEAPP precision/capacity and final acceptance unverified.',
   'Candidate includes diagnostic mathematical code, so softwareCPU times cannot establish a production hot-path implementation.',
   'Any pixel difference is retained as failed candidate boundary, without tuning margins or source/opacity/renderer.']},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,result:await bind(output+'/result.json'),status,comparisons},null,2));
}catch(e){await fs.writeFile(path.join(dir,'failed.json'),JSON.stringify({status:'FAILED',message:String(e),completed:results.map(r=>r.condition.name),errors},null,2)+'\n',{flag:'wx'});throw e;}
finally{await browser.close();}
