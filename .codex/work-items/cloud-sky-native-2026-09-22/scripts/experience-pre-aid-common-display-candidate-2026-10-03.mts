/** Prepare only. Actual GPU execution is deliberately absent until review. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';import {createCandidates,createBrowserCandidate} from './pre-aid-common-display-candidate-sources-2026-10-03.mts';
const root=process.cwd(),task='.codex/work-items/cloud-sky-native-2026-09-22/';
const relative=process.argv.find(a=>a.startsWith('--output='))?.slice(9);assert(relative?.startsWith('output/pre-aid-common-display-')&&!relative.includes('..'));
const output=path.resolve(root,relative);assert(!fs.existsSync(output),'exclusive output');fs.mkdirSync(output,{recursive:true});
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const read=(p:string)=>fs.readFileSync(path.resolve(root,p)),json=(p:string)=>JSON.parse(read(p).toString());
const bind=(p:string)=>{const resolved=fs.realpathSync(path.resolve(root,p)),b=fs.readFileSync(resolved);return{path:p.replaceAll('\\','/'),resolved:resolved.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const save=(name:string,value:any)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const self=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(output,'executed-script.mts.txt'));
let before:any[]=[];
try {
 const required=createRequire(path.join(root,'package.json')),tsPath=path.join(root,'apps/wechat-miniapp/node_modules/typescript/lib/typescript.js'),ts=required(tsPath);assert.equal(ts.version,'5.9.3');
 const {originals,candidates,changes}=createCandidates(root),browser=createBrowserCandidate(root);
 const builder=task+'scripts/pre-aid-common-display-candidate-sources-2026-10-03.mts',priorBuilder=task+'scripts/pre-aid-local-candidate-sources-2026-10-03.mts';
 fs.copyFileSync(path.join(root,builder),path.join(output,'executed-candidate-builder.mts.txt'));
 save('source-replacements.json',{owners:[...candidates.keys()],changes,browserChanges:browser.changes,scope:'Task-only virtual replacements. Ordinary production/default and original r4 remain unchanged.'});
 for(const [p,content]of originals){const target=path.join(output,'originals',p+'.txt');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content,{flag:'wx'});}
 for(const [p,content]of candidates){const target=path.join(output,'candidate-owners',p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content,{flag:'wx'});}
 fs.writeFileSync(path.join(output,'actual-page.tsx.txt'),browser.page,{flag:'wx'});save('actual-page-expressions.json',browser.expressions);
 fs.writeFileSync(path.join(output,'candidate-browser.ts'),browser.text,{flag:'wx'});
 const files=new Set<string>([self,builder,priorBuilder,browser.originalPath,...browser.additionalFiles,'tools/run-node.cjs','apps/wechat-miniapp/tsconfig.json',...originals.keys()]);
 const config=ts.readConfigFile(path.join(root,'apps/wechat-miniapp/tsconfig.json'),ts.sys.readFile);assert(!config.error);
 const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.join(root,'apps/wechat-miniapp'));
 const host=ts.createCompilerHost(parsed.options),get=host.getSourceFile.bind(host);
 host.getSourceFile=(file:string,language:any,onError:any,newFile:any)=>{const p=path.relative(root,file).replaceAll('\\','/'),replacement=candidates.get(p);
   return replacement===undefined?get(file,language,onError,newFile):ts.createSourceFile(file,replacement,language,true);};
 const program=ts.createProgram({rootNames:[...candidates.keys()].map(p=>path.join(root,p)),options:{...parsed.options,noEmit:true},host});
 const diagnostics=ts.getPreEmitDiagnostics(program);for(const source of program.getSourceFiles())files.add(source.fileName);
 fs.writeFileSync(path.join(output,'candidate-owner-types.log'),ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:(x:string)=>x,getNewLine:()=> '\n'}),{flag:'wx'});
 save('candidate-owner-types.json',{typescript:ts.version,roots:[...candidates.keys()],diagnostics:diagnostics.map((d:any)=>({code:d.code,file:d.file?.fileName,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}))});
 const bundle=await build({stdin:{contents:browser.text,sourcefile:'pre-aid-common-display-browser.ts',loader:'ts',resolveDir:path.join(root,path.dirname(browser.originalPath))},absWorkingDir:root,
   bundle:true,write:false,metafile:true,format:'iife',globalName:'preAidCommonDisplayTrial',platform:'browser',target:'es2022',tsconfig:path.join(root,'apps/wechat-miniapp/tsconfig.json'),
   plugins:[{name:'exact-task-only-owners',setup(api){api.onLoad({filter:/\.ts$/},args=>{const p=path.relative(root,args.path).replaceAll('\\','/'),content=candidates.get(p);
     return content===undefined?undefined:{contents:content,loader:'ts',resolveDir:path.dirname(args.path)};});}}]});
 fs.writeFileSync(path.join(output,'executed-bundle.js'),bundle.outputFiles[0]!.text,{flag:'wx'});save('metafile.json',bundle.metafile);
 for(const p of Object.keys(bundle.metafile!.inputs))if(!p.endsWith('pre-aid-common-display-browser.ts'))files.add(path.resolve(root,p));
 const oldRuntime='output/pre-aid-local-candidate-1003-r4/runtime-input.json',input=json(oldRuntime);files.add(oldRuntime);
 const publication='output/sdss-science-optical-writer-1002-r1/publication/manifest.json',report=task+'tmp/current-native-report-2026-10-01.json',catalog='packages/astronomy-core/data/opengc-messier-deep-sky.v1.json';
 assert.deepEqual(input.publication,json(publication));assert.deepEqual(input.report,json(report).data);assert.deepEqual(input.originalCatalog,json(catalog));
 [publication,report,catalog,'workers/miniapp-api/assets/deep-sky/manifest.json'].forEach(p=>files.add(p));
 for(const image of input.images){const bytes=read(image.file);assert.equal(bytes.length,image.bytes);assert.equal(sha(bytes),image.sha256);assert.equal(sha(Buffer.from(image.data.split(',')[1],'base64')),image.sha256);files.add(image.file);}
 const preservePath=task+'tmp/resume-preserved-hashes-2026-10-01.json',preserved=json(preservePath);files.add(preservePath);for(const row of preserved){assert.equal(bind(row.path).sha256,row.sha256);files.add(row.path);}
 const playwrightPath='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',pwRequire=createRequire(path.join(playwrightPath,'package.json')),{chromium}=pwRequire(playwrightPath);
 const toolchain:any={node:{version:process.version,executable:process.execPath},typescript:{version:ts.version,entry:tsPath},browser:{executable:chromium.executablePath(),scope:'Frozen explicit executable for a future reviewed execution. No browser launch in preparation.'}};
 files.add(process.execPath);files.add(tsPath);files.add(path.resolve(tsPath,'../../package.json'));
 for(const name of ['esbuild','tsx']){const entry=required.resolve(name),packagePath=required.resolve(name+'/package.json');files.add(entry);files.add(packagePath);toolchain[name]={entry,packagePath,version:json(packagePath).version};}
 const binary=required.resolve('@esbuild/win32-x64/esbuild.exe');files.add(binary);toolchain.esbuild.binary=binary;
 files.add(pwRequire.resolve(playwrightPath));files.add(path.join(playwrightPath,'package.json'));files.add(pwRequire.resolve('playwright-core'));files.add(pwRequire.resolve('playwright-core/package.json'));files.add(chromium.executablePath());
 toolchain.playwright={entry:pwRequire.resolve(playwrightPath),coreEntry:pwRequire.resolve('playwright-core'),version:json(path.join(playwrightPath,'package.json')).version};
 const normalize=(p:string)=>path.isAbsolute(p)?path.relative(root,p).replaceAll('\\','/'):p.replaceAll('\\','/');
 before=[...new Set([...files].map(normalize))].sort().map(bind);save('inputs-before.json',before);save('toolchain.json',toolchain);save('runtime-input.json',input);
 const after=before.map(row=>bind(row.path));assert.deepEqual(after,before);save('inputs-after.json',after);
 const result={status:diagnostics.length?'PREPARED_WITH_TYPE_FAILURE':'PREPARED_FOR_STATIC_REVIEW',before,after,toolchain,
   replacements:[...candidates].map(([p,content])=>({original:bind(p),candidate:bind(relative+'/candidate-owners/'+p),normalizedOriginalSha256:sha(originals.get(p)!.replaceAll('\r\n','\n'))})),
   browser:bind(relative+'/candidate-browser.ts'),bundle:bind(relative+'/executed-bundle.js'),metafile:bind(relative+'/metafile.json'),runtimeInput:bind(relative+'/runtime-input.json'),
   scope:'Prepare only; no GPU or runtime. Five-pose software scale/return path plus same-zoom black, late-foreground, native-retirement/replacement and lifecycle controls. Model-domain guard; 24–96 curve candidate only. Physical registration/science UNKNOWN, ordinary default closed, WXML FAILED/native final experience unverified.'};
 save('result.json',result);console.log(JSON.stringify({status:result.status,bindings:before.length,diagnostics:diagnostics.length,result:bind(relative+'/result.json')}));assert.equal(diagnostics.length,0);
}catch(error){save('failed.json',{error:String(error),before});throw error;}
