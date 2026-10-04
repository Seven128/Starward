import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const worker=path.join(ROOT,'workers/miniapp-api');
const require=createRequire(path.join(worker,'package.json'));
const ts=require('typescript');
const out='output/public-image-demand-type-boundary-probe-1003-r1';
await fs.mkdir(path.join(ROOT,out));
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const bind=async p=>{const b=await fs.readFile(p);return {path:rel(p),bytes:b.length,sha256:sha(b)};};
const jsonWrite=async(name,x)=>fs.writeFile(path.join(ROOT,out,name),JSON.stringify(x,null,2),{flag:'wx'});
const runtime=path.join(ROOT,'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts');
const core=path.join(ROOT,'apps/wechat-miniapp/src/services/sky-public-image-cache.ts');
const request=path.join(ROOT,'apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts');
const [runtimeText,coreText,requestText]=await Promise.all([runtime,core,request].map(p=>fs.readFile(p,'utf8')));
const source=ts.createSourceFile(runtime,runtimeText,ts.ScriptTarget.Latest,true);
const declaration=source.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='SkyPublicImageDemand');
assert(declaration,'actual interface absent');
const interfaceText=declaration.getText(source);
const demandImport='import type { SkyPublicImageDemand } from "../../services/sky-public-image-runtime";';
assert(requestText.includes(demandImport));
const variant=new Map([
 [path.resolve(core),coreText+'\n'+interfaceText+'\n'],
 [path.resolve(runtime),'import type { SkyPublicImageDemand } from "./sky-public-image-cache";\nexport type { SkyPublicImageDemand } from "./sky-public-image-cache";\n'+runtimeText.replace(interfaceText,'')],
 [path.resolve(request),requestText.replace(demandImport,'import type { SkyPublicImageDemand } from "../../services/sky-public-image-cache";')],
]);
for(const [p,text]of variant)await fs.writeFile(path.join(ROOT,out,path.basename(p)+'.candidate.txt'),text,{flag:'wx'});
process.chdir(worker);
const configPath=path.join(worker,'tsconfig.json');
const read=ts.readConfigFile(configPath,ts.sys.readFile);
assert(!read.error);
const parsed=ts.parseJsonConfigFileContent(read.config,ts.sys,worker,{},configPath);
assert.equal(parsed.errors.length,0);
const create=changed=>{
 const host=ts.createCompilerHost(parsed.options),get=host.getSourceFile.bind(host);
 host.getSourceFile=(file,language,onError,fresh)=>changed&&variant.has(path.resolve(file))?
  ts.createSourceFile(file,variant.get(path.resolve(file)),language,true):get(file,language,onError,fresh);
 return ts.createProgram({rootNames:parsed.fileNames,options:parsed.options,host});
};
const original=create(false),candidate=create(true);
const files=[...new Set([...original.getSourceFiles(),...candidate.getSourceFiles()].map(s=>path.resolve(s.fileName)))];
files.push(configPath,fileURLToPath(import.meta.url),require.resolve('typescript'),require.resolve('typescript/package.json'),path.join(ROOT,'tools/run-node.cjs'));
const unique=[...new Set(files)].sort();
const before=await Promise.all(unique.map(bind));
await jsonWrite('inputs-before.json',before);
const diagnostics=program=>ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?rel(path.resolve(d.file.fileName)):null,code:d.code,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
const prior=diagnostics(original),proposed=diagnostics(candidate);
await jsonWrite('original-worker-diagnostics.json',prior);
await jsonWrite('candidate-worker-diagnostics.json',proposed);
const emitted=[];
for(const [p,text]of variant){
 const actual=await fs.readFile(p,'utf8');
 const emit=s=>ts.transpileModule(s,{fileName:p,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,removeComments:true}}).outputText;
 const a=emit(actual),b=emit(text);
 emitted.push({path:rel(p),identicalJavaScript:a===b,originalJsSha256:sha(a),candidateJsSha256:sha(b)});
}
const after=await Promise.all(unique.map(bind));
await jsonWrite('inputs-after.json',after);
assert.deepEqual(before,after);
const result={scope:'Readonly in-memory compiler-host type-boundary experiment; no production source edit, no runtime/native/GPU test or production acceptance',status:'RECORDED_NOT_ADOPTED',typescript:{version:ts.version,entry:await bind(require.resolve('typescript'))},configuration:await bind(configPath),beforeAfterEqual:true,inputCount:before.length,originalDiagnostics:prior,candidateDiagnostics:proposed,emittedJavaScript:emitted,candidateOriginalSourceBindings:await Promise.all([runtime,core,request].map(bind)),limits:['Candidate source exists only in output text and an in-memory compiler host','Same emitted JS is a type-only mechanism check, not native/resource acceptance','Existing seven-diagnostic production failure remains until an actual reviewed source change and relevant checks','Runtime keeps a type re-export for prior consumers in the candidate']};
await jsonWrite('result.json',result);
console.log(JSON.stringify({out,typescript:ts.version,original:prior.length,candidate:proposed.length,identicalJavaScript:emitted.every(x=>x.identicalJavaScript),inputs:before.length,result:await bind(path.join(ROOT,out,'result.json'))}));
