/** Two task-only retention policies through frozen full Hooks, source texels, original windows and real software GL. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const readJson=async(p:string)=>JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
const r4dir='output/playwright/cloud-sky-full-hook-resource-1002-r4',r5dir='output/playwright/cloud-sky-full-hook-resource-1002-r5';
assert.equal((await bind(r4dir+'/result.json')).sha256,'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
assert.equal((await bind(r5dir+'/result.json')).sha256,'d7aee05722e0f3472ca89b25d818c486f4c19d530bc7f39f138701568946c5e1');
const r4=await readJson(r4dir+'/result.json'),prior=await readJson(r5dir+'/result.json');
assert.equal(r4.sourceBindings.length,138);assert.equal(prior.rows.length,13);
const sourceBindings=r4.sourceBindings;
for(const r of [...sourceBindings,...prior.sourceBindings])assert.deepEqual(await bind(r.path),r);
const original=await fs.readFile(path.join(ROOT,r5dir,'bundle.js'),'utf8'),r4bundle=await fs.readFile(path.join(ROOT,r4dir,'bundle.js'),'utf8');
assert.equal(hash(original),prior.compiledSha256);assert.equal(hash(r4bundle),r4.compiledSha256);
const jsAst=(text:string)=>ts.createSourceFile('bundle.js',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const printer=ts.createPrinter({removeComments:true});
const normalizedR4=printer.printFile(jsAst(r4bundle)),normalizedR5=printer.printFile(jsAst(original));
assert.equal(normalizedR4,normalizedR5,'full AST normalized text equality supplements missing r5 run-time metafile bindings, without rewriting r5');
assert.equal(hash(normalizedR4),'c8fea7c94ee4136fce395a6ffb42171e6d08be2d1bfe168b7876c2ff88fbc97b');
for(const [index,row] of prior.rows.slice(0,5).entries())assert.equal(row.rgbaSha256,r4.rows[index].rgbaSha256);
const frozenSource=await fs.readFile(path.join(ROOT,r5dir,'executed-script.mts.txt'),'utf8');
assert.equal(hash(frozenSource),'b3fbc0747d6b463a265536642a589594a87f5bac0004660635e71aef840e902a');
assert.equal(await fs.readFile(path.join(ROOT,r4dir,'executed-script.mts.txt'),'utf8'),frozenSource);
assert.deepEqual(prior.instrumented,r4.instrumented);
const tapBindings=[];
for(const name of ['diagnostic-cache.ts.txt','diagnostic-hook.ts.txt','diagnostic-loader.ts.txt']){
 assert.equal(await fs.readFile(path.join(ROOT,r4dir,name),'utf8'),await fs.readFile(path.join(ROOT,r5dir,name),'utf8'));tapBindings.push(await bind(r5dir+'/'+name));
}
const sourceAst=ts.createSourceFile('executed.mts',frozenSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),executors:string[]=[];
function visit(n:ts.Node){
 if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.getText(sourceAst)==='page'&&n.expression.name.text==='evaluate'){
  assert(ts.isArrowFunction(n.arguments[0]!));
  const emitted=ts.transpileModule('const fn='+n.arguments[0]!.getText(sourceAst)+';',{
   compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const a=jsAst(emitted),d=a.statements.filter(ts.isVariableStatement).flatMap(s=>Array.from(s.declarationList.declarations)).find(d=>ts.isIdentifier(d.name)&&d.name.text==='fn');
  assert(d?.initializer&&ts.isArrowFunction(d.initializer));executors.push(d.initializer.getText(a));
 }ts.forEachChild(n,visit);
}visit(sourceAst);assert.equal(executors.length,4);
const metadata:Record<string,any>={},assets:any[]=[],inputBindings=[];
for(const r of prior.inputs){
 const b=await fs.readFile(path.join(ROOT,r.path));assert.equal(hash(b),r.sha256);assert.equal(b.length,r.bytes);inputBindings.push(await bind(r.path));
 if(r.transport==='FROZEN_LOCAL_BFF_JSON'||r.transport==='BOUND_LOCAL_ALPHA_JSON')metadata[r.route]={body:JSON.parse(b.toString()),bytes:b.length,sha256:r.sha256};
 if(r.transport==='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY')assets.push({...r,base64:b.toString('base64')});
}
assert.deepEqual(await bind(prior.report.path),prior.report);
const raw=projectAdoptedSkyCatalog(await readJson(prior.report.path)).data;
const stars=metadata[`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`].body.data;
const figures=metadata['/v2/sky/constellations'].body.data,at=new Date(raw.context.at).toISOString();
const current=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);
const candidatePath='output/active-texture-retention-candidate-1002-r2/candidate-owner.ts.txt';
const candidateSource=await fs.readFile(path.join(ROOT,candidatePath),'utf8');
assert.equal(hash(candidateSource),'0201b42d5cbe371f1a3b45d2baba36b06a5a8dedc3585d1fc4111d167fa45448');
const ownerPath='apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts',originalOwner=await fs.readFile(path.join(ROOT,ownerPath),'utf8');
assert.equal(hash(originalOwner),'cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e');
const guard='!previousFrame.has(key) && !pinned.has(key)';assert.equal(originalOwner.split(guard).length-1,2);
const finishStart=originalOwner.indexOf('      // Partial residents cost a whole source upload to recreate.',originalOwner.indexOf('    finish() {'));
const finishEnd=originalOwner.indexOf('      previousFrame.clear();',finishStart);assert(finishStart>0&&finishEnd>finishStart);
const expected=(originalOwner.slice(0,finishStart)+'      // Task candidate: retain every current-frame texture; retire inactive identities.\n      for (const key of entries.keys()) if (!used.has(key)) remove(key);\n'+originalOwner.slice(finishEnd)).replaceAll(guard,'!used.has(key) && !pinned.has(key)');
assert.equal(candidateSource,expected,'only two allocation guards and frame-end inactive retirement differ from original TS');
const findOwner=(a:ts.SourceFile)=>{const found:ts.FunctionDeclaration[]=[];const v=(n:ts.Node)=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='createSkyGpuTextures')found.push(n);ts.forEachChild(n,v);};v(a);assert.equal(found.length,1);assert(found[0]!.body);return found[0]!;};
const originalAst=jsAst(original),originalFunction=findOwner(originalAst);
const candidateJs=ts.transpileModule(candidateSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const candidateAst=jsAst(candidateJs),candidateFunction=findOwner(candidateAst);
assert.deepEqual(originalFunction.parameters.map(p=>p.name.getText(originalAst)),candidateFunction.parameters.map(p=>p.name.getText(candidateAst)));
const commonTap=(fn:ts.FunctionDeclaration,a:ts.SourceFile)=>{
 const returns=fn.body!.statements.filter(ts.isReturnStatement);assert.equal(returns.length,1);const ret=returns[0]!;assert(ret.expression&&ts.isObjectLiteralExpression(ret.expression));
 const pre=fn.body!.getText(a).slice(0,ret.getStart(a)-fn.body!.getStart(a));
 return pre+`const owner=${ret.expression.getText(a)};
 const world=globalThis.__controlled;world.textureFrames??=[];let frame=null;
 const record=(method,detail)=>{(frame?.calls??(world.textureOutside??=[])).push({method,...detail});};
 const begin=owner.begin;owner.begin=function(...args){frame={calls:[],finished:false};world.textureFrames.push(frame);record('begin',{});return begin.apply(this,args);};
 const taskOriginalGetWindow=owner.getWindow;owner.getWindow=function(source,requested){try{const value=taskOriginalGetWindow.apply(this,arguments);
  record('getWindow',{source:world.imageInfo(source),requested:requested??null,returnedWindow:value.window,returnedBytes:value.bytes,texturePresent:Boolean(value.texture)});return value;
 }catch(error){record('getWindow',{source:world.imageInfo(source),requested:requested??null,error:String(error)});throw error;}};
 const get=owner.get;owner.get=function(source){try{const value=get.apply(this,arguments);record('get',{source:world.imageInfo(source),requestedMeaning:'full source',texturePresent:Boolean(value),internalLexicalWindowUnobserved:true});return value;
 }catch(error){record('get',{source:world.imageInfo(source),error:String(error)});throw error;}};
 const withPinned=owner.withPinned;owner.withPinned=function(sources,submit){record('pin-enter',{sources:sources.map(s=>world.imageInfo(s))});try{return withPinned.apply(this,arguments);}finally{record('pin-exit',{});}};
 const finish=owner.finish;owner.finish=function(...args){try{return finish.apply(this,args);}finally{record('finish',{});if(frame)frame.finished=true;}};
 const dispose=owner.dispose;owner.dispose=function(...args){record('dispose',{});return dispose.apply(this,args);};
 return owner; }`;
};
const replaceBody=(body:string)=>original.slice(0,originalFunction.body!.getStart(originalAst))+body+original.slice(originalFunction.body!.end);
const baselineBody=commonTap(originalFunction,originalAst),activeBody=commonTap(candidateFunction,candidateAst);
const variants={baseline:replaceBody(baselineBody),active:replaceBody(activeBody)};
for(const body of Object.values(variants))new Function(body); // Syntax-only preflight; does not execute browser code.
// Outside the single owner body every original byte is retained; window/shader/lifetime and all other owners are untouched.
const stripped=(b:string)=>{const a=jsAst(b),f=findOwner(a);return b.slice(0,f.body!.getStart(a))+'{}'+b.slice(f.body!.end);};
assert.equal(stripped(variants.baseline),stripped(original));assert.equal(stripped(variants.active),stripped(original));
let output='output/playwright/cloud-sky-active-retention-gpu-ab-1002-r1';
for(let n=2;;n++){try{await fs.access(path.join(ROOT,output));output=`output/playwright/cloud-sky-active-retention-gpu-ab-1002-r${n}`;}catch{break;}}
const dir=path.join(ROOT,output);await fs.mkdir(dir,{recursive:true});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mts.txt'));
for(const [name,b] of Object.entries(variants))await fs.writeFile(path.join(dir,name+'.js'),b,{flag:'wx'});
for(const [name,b] of Object.entries({'original-owner-function.js.txt':originalFunction.getText(originalAst),'candidate-owner-function.js.txt':candidateFunction.getText(candidateAst),
 'baseline-tapped-body.js.txt':baselineBody,'active-tapped-body.js.txt':activeBody,'r4-normalized-full-ast.js.txt':normalizedR4,'r5-normalized-full-ast.js.txt':normalizedR5}))await fs.writeFile(path.join(dir,name),b,{flag:'wx'});
await fs.writeFile(path.join(dir,'reused-executors.json'),JSON.stringify(executors,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(dir,'inputs.json'),JSON.stringify({prior:await bind(r5dir+'/result.json'),original:await bind(r4dir+'/result.json'),sourceBindings,r5OwnBindings:prior.sourceBindings,inputBindings,
 r5MissingMetafileBindingsSupplementedAfterRun:true,normalizedFullAstHash:hash(normalizedR5),tapBindings,executedSource:await bind(r5dir+'/executed-script.mts.txt'),
 candidate:await bind(candidatePath),variantHashes:Object.fromEntries(Object.entries(variants).map(([k,v])=>[k,hash(v)]))},null,2)+'\n',{flag:'wx'});
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const execute=(page:any,source:string,input?:any)=>page.evaluate(new Function('return ('+source+')')(),input);
const rows:any[]=[],errors:any[]=[],finals:any[]=[];
const logicalCalls=(row:any)=>row.textureFrames.map((f:any)=>f.calls);
const reusedInputs:any[]=[];
const comparable=(value:any):any=>{
 if(typeof value==='string'){
  const match=/^\/controlled\/sky-public-images-v1\/([a-f0-9]{64})-([a-f0-9]{64})-([a-z0-9]+_[a-z0-9]+)-(\d+)\.(png|jpg)$/.exec(value);
  return match?`/controlled/sky-public-images-v1/${match[1]}-${match[2]}-<BOOT_NONCE>-${match[4]}.${match[5]}`:value;
 }
 if(Array.isArray(value))return value.map(comparable);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,comparable(v)]));
 return value;
};
try{
 for(const variant of ['baseline','active'] as const){
  if(variant==='baseline'){
   const reuse='output/playwright/cloud-sky-active-retention-gpu-ab-1002-r2';
   assert.equal((await bind(reuse+'/executed-script.mts.txt')).sha256,'08a2bfda035960ea7b058efc4a9938f2f12c72be2bbf7b71aae1d1e0e7ec52bc');
   assert.equal(hash(await fs.readFile(path.join(ROOT,reuse,'baseline.js'))),hash(variants.baseline));
   for(const [index,previous] of prior.rows.entries()){
    const name='baseline-'+previous.condition.name,record=await readJson(reuse+'/'+name+'.json');
    assert.equal(record.rgbaSha256,previous.rgbaSha256);assert.deepEqual(record.gpuFailures,[]);assert(record.passes.every((p:any)=>p.glError===0));
    assert.equal(hash(await fs.readFile(path.join(ROOT,reuse,name+'.rgba'))),record.rgbaSha256);
    assert.equal(hash(await fs.readFile(path.join(ROOT,reuse,name+'.png'))),record.pngSha256);
    rows.push(record);
    for(const extension of ['json','rgba','png']){reusedInputs.push(await bind(reuse+'/'+name+'.'+extension));await fs.copyFile(path.join(ROOT,reuse,name+'.'+extension),path.join(dir,name+'.'+extension),fs.constants.COPYFILE_EXCL);}
   }
   finals.push({variant,reusedFrom:reuse,rawFinalNotPersistedInR2:true,disposeAssertionsExecutedBeforeActiveWorld:true,
    explanation:'The frozen r2 executor completed baseline13 then actual disposal asserts liveBytes0/aliveTextures0 before beginning active. Raw final was held in memory and not persisted when r2 later failed nonce comparison; no invented final snapshot.'});
   continue;
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:Error)=>errors.push({variant,message:e.message}));
  await page.setContent('<canvas id="sky" width="390" height="844"></canvas>');await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});
  await execute(page,executors[0]!,{metadata,assets});await page.addScriptTag({content:variants[variant]});await execute(page,executors[1]!);
  const precision=await page.evaluate(()=>{const gl=(globalThis as any).__controlled.gl,p=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);return {rangeMin:p?.rangeMin,rangeMax:p?.rangeMax,precision:p?.precision,redBits:gl.getParameter(gl.RED_BITS),greenBits:gl.getParameter(gl.GREEN_BITS),blueBits:gl.getParameter(gl.BLUE_BITS),alphaBits:gl.getParameter(gl.ALPHA_BITS)};});
  for(const [index,previous] of prior.rows.entries()){
   const condition={...previous.condition,name:variant+'-'+previous.condition.name};
   await page.evaluate(()=>{(globalThis as any).__controlled.textureFrames=[];});
   const actual=await execute(page,executors[2]!,{condition,current,figures,at});
   const textureFrames=await page.evaluate(()=>(globalThis as any).__controlled.textureFrames);
   assert.equal(textureFrames.length,3);assert(textureFrames.every((f:any)=>f.finished));
   const {rgba:encoded,capture,...rest}=actual,body=Buffer.from(encoded,'base64'),png=Buffer.from(capture.split(',')[1],'base64');
   const record={variant,index,precision,rgbaSha256:hash(body),pngSha256:hash(png),textureFrames,...rest};rows.push(record);
   await fs.writeFile(path.join(dir,condition.name+'.rgba'),body,{flag:'wx'});await fs.writeFile(path.join(dir,condition.name+'.png'),png,{flag:'wx'});
   await fs.writeFile(path.join(dir,condition.name+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
   assert(record.passes.every((p:any)=>p.glError===0));assert.deepEqual(record.gpuFailures,[]);
   assert.equal(record.rgbaSha256,previous.rgbaSha256,'all actual full-scene pixels equal original frozen r5 at normal opacity');
   if(variant==='active'){
    const before=rows.find(r=>r.variant==='baseline'&&r.index===index)!;
    assert.deepEqual(record.gates,before.gates);assert.deepEqual(comparable(record.ready),comparable(before.ready),'all actual Hooks source identity and models equal after only strict ownpattern boot nonce equivalence');
    assert.deepEqual(comparable(record.transfers),comparable(before.transfers));assert.deepEqual(comparable(record.newDecodes),comparable(before.newDecodes));
    assert.deepEqual(comparable(logicalCalls(record)),comparable(logicalCalls(before)),'actual owner method calls and returned window/identity preserved');
    for(let pass=0;pass<3;pass++){
     assert.deepEqual(record.passes[pass].references,before.passes[pass].references);assert.deepEqual(record.passes[pass].paintedSources,before.passes[pass].paintedSources);
     assert.equal(record.passes[pass].frameAt,before.passes[pass].frameAt);assert.equal(record.passes[pass].landscape,before.passes[pass].landscape);
    }
   }
  }
  const final=await execute(page,executors[3]!);assert.equal(final.gpu.liveBytes,0);assert.equal(final.gpu.aliveTextures,0);finals.push({variant,...final});
  await fs.writeFile(path.join(dir,variant+'-final.json'),JSON.stringify(final,null,2)+'\n',{flag:'wx'});await page.close();
 }
 assert.deepEqual(errors,[]);for(const r of sourceBindings)assert.deepEqual(await bind(r.path),r);
 const result={status:'BOUNDED_ACTIVE_RETENTION_PIXEL_EXACT_NOT_ADOPTED',inputs:await bind(output+'/inputs.json'),rows,finals,errors,reusedInputs,
 limits:['Two task-only variants, 13 exact frozen r5 conditions, unchanged source texels/windows/shaders/opacity and common readonly method tap. All full pixels compare to original r5, not blank/synthetic expected frames.',
 'r5 originally bound only page/API client; current source138 is supplemented by original r4 inventory after run, full normalized bundle AST equality, exact three task taps and four executors. Old result untouched; not retroactive r5 before-run proof.',
 'Current-frame textures may stay above former16MiB frame-end retention cap; 16MiB is candidate allocation-pressure target, not hard peak/capacity budget. Retention cost must be weighed, not adopted automatically.',
 'Method get reports its observable returned texture/null and full-source request meaning; its internal lexical returned window is not captured by the method tap.',
 'r2 baseline13 completed and is reused byteexact; task comparator originally stopped at unique boot nonce difference. Equivalence removes only nonce inside strict owned namespace-SHA-attempt-extension filenames; complete original paths remain in all output. No other fields removed.',
 'No deliberate failure or pair pins added to actual scene; counts report whether real inputs exercised them. Existing independent mock controls remain separate evidence.',
 'Map FS, controlled native callbacks/query/React scheduling, actual desktop HTML decode/softwareGL. Logical GL and held-reference models exclude native/driver/OS/GC physical memory and WEAPP performance/capacity/quality acceptance.']};
 await fs.writeFile(path.join(dir,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,result:await bind(output+'/result.json'),status:result.status,rows:rows.map(r=>({variant:r.variant,index:r.index,name:r.condition.name,maxPeak:Math.max(...r.passes.map((p:any)=>p.peakBytes)),warmEnd:r.passes[2].liveBytes,warmUpload:r.passes[2].events.filter((e:any)=>e.operation==='source-upload').reduce((n:number,e:any)=>n+e.bytes,0)}))},null,2));
}catch(error){await fs.writeFile(path.join(dir,'failed.json'),JSON.stringify({status:'FAILED',message:String(error),completed:rows.map(r=>r.condition.name),errors},null,2)+'\n',{flag:'wx'});throw error;}
finally{await browser.close();}
