/** Prepare freezes exact task-only replacements/tools; execute consumes that
 * reviewed bundle without rebuilding. Neither mode writes production. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createCandidates,createBrowserCandidate,createBaselineBrowser,sky} from './pre-aid-local-candidate-sources-2026-10-03.mts';
const root=process.cwd(),task='.codex/work-items/cloud-sky-native-2026-09-22/';
const argument=(key:string)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3);
const mode=argument('mode'),relative=argument('output');assert(mode==='prepare'||mode==='execute');assert(relative?.startsWith('output/')&&!relative.includes('..'));
const output=path.resolve(root,relative);assert(!fs.existsSync(output),'exclusive output');fs.mkdirSync(output,{recursive:true});
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const read=(p:string)=>fs.readFileSync(path.resolve(root,p));
const json=(p:string)=>JSON.parse(read(p).toString());
const bind=(p:string)=>{const abs=fs.realpathSync(path.resolve(root,p)),b=fs.readFileSync(abs);return{path:p.replaceAll('\\','/'),resolved:abs.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const save=(name:string,data:unknown)=>fs.writeFileSync(path.join(output,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const self=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');
const ownerScript=task+'scripts/pre-aid-local-candidate-sources-2026-10-03.mts';
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(output,'executed-script.mts.txt'));
const required=createRequire(path.join(root,'package.json'));
const playwrightPath='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const pwRequire=createRequire(path.join(playwrightPath,'package.json'));
const {chromium}=pwRequire(playwrightPath);
const tsPath=path.join(root,'apps/wechat-miniapp/node_modules/typescript/lib/typescript.js');
const ts=required(tsPath);
let before:any[]=[],browser:any=null,observed:any=null;
try {
 if(mode==='prepare') {
  const {originals,candidates,changes}=createCandidates(root),harness=createBrowserCandidate(root);
  fs.copyFileSync(path.join(root,ownerScript),path.join(output,'executed-candidate-builder.mts.txt'));
  save('source-replacements.json',{scope:'Task-only replacements plus declared observer/counterfactual taps; raw original source saved. Candidate text uses LF.',owners:[...candidates.keys()],changes,harnessChanges:harness.changes});
  for(const [p,source] of originals){const folder=path.join(output,'originals',p);fs.mkdirSync(path.dirname(folder),{recursive:true});fs.writeFileSync(folder+'.txt',source,{flag:'wx'});}
  for(const [p,source] of candidates){const folder=path.join(output,'candidate-owners',p);fs.mkdirSync(path.dirname(folder),{recursive:true});fs.writeFileSync(folder,source,{flag:'wx'});}
  fs.writeFileSync(path.join(output,'original-browser.ts.txt'),harness.original,{flag:'wx'});
  fs.writeFileSync(path.join(output,'candidate-browser.ts'),harness.text,{flag:'wx'});
  const files=new Set<string>([self,ownerScript,harness.originalPath,'tools/run-node.cjs','apps/wechat-miniapp/tsconfig.json',...originals.keys()]);
  const config=ts.readConfigFile(path.join(root,'apps/wechat-miniapp/tsconfig.json'),ts.sys.readFile);assert(!config.error);
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.join(root,'apps/wechat-miniapp'));
  const host=ts.createCompilerHost(parsed.options),oldGet=host.getSourceFile.bind(host);
  host.getSourceFile=(file:string,language:any,onError:any,createNew:any)=>{
    const p=path.relative(root,file).replaceAll('\\','/'),replacement=candidates.get(p);
    if(replacement!==undefined)return ts.createSourceFile(file,replacement,language,true);
    return oldGet(file,language,onError,createNew);
  };
  const program=ts.createProgram({rootNames:[...candidates.keys()].map(p=>path.join(root,p)),options:{...parsed.options,noEmit:true},host});
  const diagnostics=ts.getPreEmitDiagnostics(program),types=ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:(x:string)=>x,getNewLine:()=> '\n'});
  fs.writeFileSync(path.join(output,'candidate-owner-types.log'),types,{flag:'wx'});
  save('candidate-owner-types.json',{typescriptVersion:ts.version,roots:[...candidates.keys()],diagnostics:diagnostics.map((d:any)=>({code:d.code,file:d.file?.fileName,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')})),scope:'Five exact replaced owners and their actual compiler graph; not entire App/worker acceptance.'});
  for(const source of program.getSourceFiles())files.add(source.fileName);
  const bundle=await build({stdin:{contents:harness.text,sourcefile:'pre-aid-candidate-browser.ts',loader:'ts',resolveDir:path.join(root,path.dirname(harness.originalPath))},absWorkingDir:root,
    bundle:true,write:false,metafile:true,format:'iife',globalName:'preAidLocalTrial',platform:'browser',target:'es2022',tsconfig:path.join(root,'apps/wechat-miniapp/tsconfig.json'),
    plugins:[{name:'exact-task-only-owners',setup(api){api.onLoad({filter:/\.ts$/},args=>{
      const p=path.relative(root,args.path).replaceAll('\\','/'),content=candidates.get(p);
      return content===undefined?undefined:{contents:content,loader:'ts',resolveDir:path.dirname(args.path)};
    });}}]});
  const code=bundle.outputFiles[0]!.text;fs.writeFileSync(path.join(output,'executed-bundle.js'),code,{flag:'wx'});save('metafile.json',bundle.metafile);
  for(const p of Object.keys(bundle.metafile!.inputs))if(!p.endsWith('pre-aid-candidate-browser.ts'))files.add(path.resolve(root,p));
  const baselineSource=createBaselineBrowser(harness.text);fs.writeFileSync(path.join(output,'baseline-browser.ts'),baselineSource,{flag:'wx'});
  const baseline=await build({stdin:{contents:baselineSource,sourcefile:'pre-aid-baseline-browser.ts',loader:'ts',resolveDir:path.join(root,path.dirname(harness.originalPath))},absWorkingDir:root,
    bundle:true,write:false,metafile:true,format:'iife',globalName:'preAidBaselineTrial',platform:'browser',target:'es2022',tsconfig:path.join(root,'apps/wechat-miniapp/tsconfig.json')});
  fs.writeFileSync(path.join(output,'baseline-bundle.js'),baseline.outputFiles[0]!.text,{flag:'wx'});save('baseline-metafile.json',baseline.metafile);
  for(const p of Object.keys(baseline.metafile!.inputs))if(!p.endsWith('pre-aid-baseline-browser.ts'))files.add(path.resolve(root,p));
  const publicationPath='output/sdss-science-optical-writer-1002-r1/publication/manifest.json';
  const reportPath=task+'tmp/current-native-report-2026-10-01.json';
  const originalCatalogPath='packages/astronomy-core/data/opengc-messier-deep-sky.v1.json';
  const cameraPath='output/playwright/cloud-sky-science-scene-1002-r3/observations.json';
  const w3ManifestPath='workers/miniapp-api/assets/deep-sky/manifest.json';
  const preservePath=task+'tmp/resume-preserved-hashes-2026-10-01.json';
  const publication=json(publicationPath),report=json(reportPath).data,camera=json(cameraPath),originalCatalog=json(originalCatalogPath),w3Manifest=json(w3ManifestPath);
  assert.equal(publication.publicationHash,'34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0');
  const w3Asset=w3Manifest.entries.find((entry:any)=>entry.objectRef==='M:51').levels.DETAIL;
  const images:any[]=[];
  for(const [id,asset] of [...Object.entries(publication.levels),['W3',w3Asset]] as any[]){
    const p=path.join(id==='W3'?'workers/miniapp-api/assets/deep-sky':path.dirname(publicationPath),asset.file).replaceAll('\\','/');
    const b=read(p);assert.equal(sha(b),asset.sha256);assert.equal(b.length,asset.bytes);files.add(p);
    images.push({id,file:p,sha256:asset.sha256,bytes:asset.bytes,data:'data:image/'+(id==='W3'?'jpeg':'png')+';base64,'+b.toString('base64')});
  }
  [publicationPath,reportPath,originalCatalogPath,cameraPath,w3ManifestPath,preservePath].forEach(p=>files.add(p));
  const preserved=json(preservePath);preserved.forEach((r:any)=>files.add(r.path));
  const toolchain:any={node:{version:process.version,executable:process.execPath},typescript:{version:ts.version,entry:tsPath},browser:{executable:chromium.executablePath(),scope:'Pinned executable bytes before launch; actual version read at execution.'}};
  files.add(process.execPath);files.add(tsPath);files.add(path.resolve(tsPath,'../../package.json'));
  for(const name of ['esbuild','tsx']){const entry=required.resolve(name),packagePath=required.resolve(name+'/package.json');files.add(entry);files.add(packagePath);toolchain[name]={entry,packagePath,version:json(packagePath).version};}
  const binary=required.resolve('@esbuild/win32-x64/esbuild.exe');files.add(binary);toolchain.esbuild.binary=binary;
  files.add(pwRequire.resolve(playwrightPath));files.add(path.join(playwrightPath,'package.json'));
  files.add(pwRequire.resolve('playwright-core'));files.add(pwRequire.resolve('playwright-core/package.json'));files.add(chromium.executablePath());
  toolchain.playwright={entry:pwRequire.resolve(playwrightPath),coreEntry:pwRequire.resolve('playwright-core'),version:json(path.join(playwrightPath,'package.json')).version};
  const normalize=(p:string)=>path.isAbsolute(p)?path.relative(root,p).replaceAll('\\','/'):p.replaceAll('\\','/');
  before=[...new Set([...files].map(normalize))].sort().map(bind);
  for(const row of preserved)assert.equal(before.find(r=>r.path===row.path)?.sha256,row.sha256);
  save('inputs-before.json',before);save('toolchain.json',toolchain);
  save('runtime-input.json',{publication,report,at:camera.at,w3Asset,images,originalCatalog});
  const after=before.map(row=>bind(row.path));assert.deepEqual(after,before);save('inputs-after.json',after);
  save('result.json',{status:diagnostics.length===0?'PREPARED_FOR_STATIC_REVIEW':'PREPARED_WITH_TYPE_FAILURE',before,after,toolchain,
    replacements:[...candidates].map(([p,content])=>({original:bind(p),candidate:bind(relative+'/candidate-owners/'+p),normalizedOriginalSha256:sha(originals.get(p)!.replaceAll('\r\n','\n'))})),
    bundle:bind(relative+'/executed-bundle.js'),browser:bind(relative+'/candidate-browser.ts'),metafile:bind(relative+'/metafile.json'),types:bind(relative+'/candidate-owner-types.json'),runtimeInput:bind(relative+'/runtime-input.json'),
    baselineBundle:bind(relative+'/baseline-bundle.js'),baselineBrowser:bind(relative+'/baseline-browser.ts'),baselineMetafile:bind(relative+'/baseline-metafile.json'),
    scope:'Prepared only; no GL/browser launch. New facts are frozen-model pixel centers/precision unknown, science scalar1. Existing explicit auxiliary policy unchanged. Stage is actual Scene callback, not actual page acceptance.'});
  console.log(JSON.stringify({status:diagnostics.length===0?'PREPARED_FOR_STATIC_REVIEW':'PREPARED_WITH_TYPE_FAILURE',output:relative,bindings:before.length,diagnostics:diagnostics.length,result:bind(relative+'/result.json')}));
  assert.equal(diagnostics.length,0,'candidate actual-owner typecheck failed; preserved');
 } else {
  const prepared=argument('prepared');assert(prepared?.startsWith('output/pre-aid-local-candidate-')&&!prepared.includes('..'));
  const frozen=json(prepared+'/result.json');assert.equal(frozen.status,'PREPARED_FOR_STATIC_REVIEW');
  before=frozen.before.map((r:any)=>bind(r.path));assert.deepEqual(before,frozen.before);
  assert.deepEqual(bind(prepared+'/executed-bundle.js'),frozen.bundle);
  assert.deepEqual(bind(prepared+'/runtime-input.json'),frozen.runtimeInput);
  assert.deepEqual(bind(prepared+'/candidate-browser.ts'),frozen.browser);
  assert.deepEqual(bind(prepared+'/baseline-bundle.js'),frozen.baselineBundle);
  assert.deepEqual(bind(prepared+'/baseline-browser.ts'),frozen.baselineBrowser);
  for(const replacement of frozen.replacements)assert.deepEqual(bind(replacement.candidate.path),replacement.candidate);
  const input=json(prepared+'/runtime-input.json'),code=read(prepared+'/executed-bundle.js').toString();
  save('input-binding.json',{prepared:bind(prepared+'/result.json'),bundle:bind(prepared+'/executed-bundle.js'),runtimeInput:bind(prepared+'/runtime-input.json'),before});
  browser=await chromium.launch({headless:true,executablePath:frozen.toolchain.browser.executable,args:['--use-gl=angle','--use-angle=swiftshader']});
  save('browser-version.json',{actual:browser.version(),executable:bind(chromium.executablePath()),node:bind(process.execPath),model:'Software ANGLE SwiftShader; native precision/performance remains unknown.'});
  const baselinePage=await browser.newPage({viewport:{width:390,height:844}}),baselineErrors:string[]=[];
  baselinePage.on('pageerror',(e:any)=>baselineErrors.push(String(e)));await baselinePage.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
  await baselinePage.addScriptTag({content:read(prepared+'/baseline-bundle.js').toString()});
  const baselineObserved=await baselinePage.evaluate(input=>(globalThis as any).preAidBaselineTrial.run(input),input);
  const baselineCaptures:any[]=[];
  for(const c of baselineObserved.captures){fs.writeFileSync(path.join(output,'baseline.'+c.name+'.rgba'),Buffer.from(c.rgba,'base64'),{flag:'wx'});fs.writeFileSync(path.join(output,'baseline.'+c.name+'.png'),Buffer.from(c.png.split(',')[1],'base64'),{flag:'wx'});baselineCaptures.push({name:c.name,width:c.width,height:c.height,rgba:bind(relative+'/baseline.'+c.name+'.rgba'),png:bind(relative+'/baseline.'+c.name+'.png')});}
  save('baseline-observations.json',{...baselineObserved,captures:baselineCaptures,pageErrors:baselineErrors});await baselinePage.close();
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
  page.on('pageerror',(e:any)=>errors.push(String(e)));await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');await page.addScriptTag({content:code});
  observed=await page.evaluate(input=>(globalThis as any).preAidLocalTrial.run(input),input);
  const captures:any[]=[];
  for(const c of observed.captures){fs.writeFileSync(path.join(output,c.name+'.rgba'),Buffer.from(c.rgba,'base64'),{flag:'wx'});fs.writeFileSync(path.join(output,c.name+'.png'),Buffer.from(c.png.split(',')[1],'base64'),{flag:'wx'});captures.push({name:c.name,width:c.width,height:c.height,rgba:bind(relative+'/'+c.name+'.rgba'),png:bind(relative+'/'+c.name+'.png')});}
  save('observations.json',{...observed,captures,pageErrors:errors});await page.close();
  const x=read(relative+'/baseline.actual-pair.rgba'),y=read(relative+'/actual-pair.rgba');let unequal=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i])unequal++;
  const comparison={baseline:bind(relative+'/baseline.actual-pair.rgba'),candidate:bind(relative+'/actual-pair.rgba'),bytes:x.length,unequal,pass:x.length===y.length&&unequal===0,
    scope:'Actual full original-production/candidate actualpair pixels in same input/view/settings. No ordinary-default or all-control pixel-preservation claim.'};save('baseline-comparison.json',comparison);
  const after=before.map(r=>bind(r.path));assert.deepEqual(after,before);save('inputs-after.json',after);
  const allPassed=comparison.pass&&!baselineObserved.failure&&baselineErrors.length===0&&baselineObserved.checks.every((c:any)=>c.pass)&&baselineObserved.final.glError===0&&Object.values(baselineObserved.final.counts).every(v=>v===0)&&
    !observed.failure&&errors.length===0&&observed.checks.every((c:any)=>c.pass)&&!observed.final.contextLost&&observed.final.glError===0&&Object.values(observed.final.counts).every(v=>v===0);
  save('result.json',{status:allPassed?'BOUNDED_MODEL_PATH_PASS':'MEASURED_WITH_FAILURES',allPassed,scope:observed.scope,before,after,observations:bind(relative+'/observations.json'),baselineObservations:bind(relative+'/baseline-observations.json'),comparison,browser:bind(relative+'/browser-version.json'),limits:['New positive facts are frozen-shader-model only, not certified ICRS interior/native precision/area absence/readability/image quality.','Science opacity1/no final policy adoption. Actual Scene completion callback does not certify current page accepted/lifecycle gates.','Explicit prior task budget unchanged; logical resource counters are not driver/RSS/GC/native capacity.']});
  console.log(JSON.stringify({output:relative,allPassed,failure:observed.failure,failed:observed.checks.filter((c:any)=>!c.pass),rows:observed.rows.map((r:any)=>({name:r.name,error:r.error,local:r.sceneLocal})),result:bind(relative+'/result.json')}));
  assert(allPassed,'bounded actual model path failed; exact generation retained');
 }
} catch(error) {save('failed.json',{error:String(error),before,observedFailure:observed?.failure});throw error;} finally {await browser?.close();}
