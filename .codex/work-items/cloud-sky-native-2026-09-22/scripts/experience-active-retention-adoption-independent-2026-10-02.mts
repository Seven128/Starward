/** Read-only semantic/consumer review and bounded in-memory regression mutations; no GL runtime or production writes. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const file=(p:string)=>path.join(ROOT,p),read=(p:string)=>fs.readFileSync(file(p),'utf8');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return {path:p,bytes:b.length,sha256:sha(b)};};
const owner='apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts',tests='apps/wechat-miniapp/src/features/sky/sky-gpu-textures.test.ts';
const landscape='apps/wechat-miniapp/src/features/sky/sky-landscape-resources.ts',renderer='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const loader='apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',window='apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts';
const chain='apps/wechat-miniapp/src/features/sky/sky-native-image-chain.test.ts';
const expected={[owner]:'a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3',
 [tests]:'d30d8b0d75f791d9e61ec0436447027ae2d57c6bdd33c4a3b713e12c952dc946',
 [landscape]:'26d35fa3c635fe6ef478224d9457970c22f31c7a7a8098e8393308526fd49ff5',
 [renderer]:'8c701c57378b5e0b3e6527da6b1cd0a40e622face04d5a9c0e8a53a92e710c6b',
 [chain]:'d0e7178d78909aa8a26230b15de88e7cc7820efb833e914a759e88e0063c2040'};
for(const [p,h] of Object.entries(expected))assert.equal(bind(p).sha256,h);
const candidatePath='output/active-texture-retention-candidate-1002-r2/candidate-owner.ts.txt',oldPath='output/active-texture-retention-candidate-1002-r2/original-owner.ts.txt';
assert.equal(bind(candidatePath).sha256,'0201b42d5cbe371f1a3b45d2baba36b06a5a8dedc3585d1fc4111d167fa45448');
assert.equal(bind(oldPath).sha256,'cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e');
const code=read(owner),candidate=read(candidatePath),testCode=read(tests);
const ast=(s:string)=>ts.createSourceFile('source.ts',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const containsPrevious=(n:ts.Node):boolean=>ts.isIdentifier(n)&&n.text==='previousFrame'||!!ts.forEachChild(n,containsPrevious);
function normalized(s:string){
 const result=ts.transform(ast(s),[ctx=>source=>{
  const visit:ts.Visitor=n=>{
   if((ts.isExpressionStatement(n)||ts.isForOfStatement(n))&&containsPrevious(n))return undefined;
   if(ts.isVariableDeclarationList(n))return ts.factory.updateVariableDeclarationList(n,n.declarations.filter(d=>!(ts.isIdentifier(d.name)&&d.name.text==='previousFrame')).map(d=>ts.visitNode(d,visit) as ts.VariableDeclaration));
   if(ts.isIdentifier(n)&&n.text==='pressureBytes')return ts.factory.createIdentifier('byteBudget');
   if(ts.isIdentifier(n)&&n.text==='SKY_GPU_TEXTURE_PRESSURE_BYTES')return ts.factory.createIdentifier('SKY_GPU_TEXTURE_BYTE_BUDGET');
   return ts.visitEachChild(n,visit,ctx);
  };return ts.visitNode(source,visit) as ts.SourceFile;
 }]);const text=ts.createPrinter({removeComments:true}).printFile(result.transformed[0] as ts.SourceFile);result.dispose();return text;
}
const normCandidate=normalized(candidate),normCurrent=normalized(code);assert.equal(normCurrent,normCandidate);
const r4=JSON.parse(read('output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json'));
const sourceBinding=(p:string)=>r4.sourceBindings.find((b:any)=>b.path===p);
assert.deepEqual(bind(loader),sourceBinding(loader));assert.deepEqual(bind(window),sourceBinding(window));
const reverseRenderer=read(renderer).replace(/^  \/\*\* Upload-time pressure target; current-frame textures can exceed it\. \*\/\r?\n/m,'');
assert.equal(sha(reverseRenderer),sourceBinding(renderer).sha256);
const reverseLandscape=read(landscape).replaceAll('SKY_GPU_TEXTURE_PRESSURE_BYTES','SKY_GPU_TEXTURE_BYTE_BUDGET').replace(
 / \* the remaining shared allocation target\. Pending\/unknown inputs keep overview;\r?\n \* the required overview and active celestial textures can exceed that target\.\r?\n/,
 match=>' * their remaining shared texture budget. Pending/unknown inputs keep overview.'+(match.includes('\r\n')?'\r\n':'\n'));
const landscapeReverseMatches=sha(reverseLandscape)===sourceBinding(landscape).sha256;
assert(landscapeReverseMatches,'reverse comment/constant changes strictly restore the actual original LF/CRLF source bytes');
// Same weak lifetime source, executed in the same VM realm as actual author fixtures; no competing current predicate.
const lifeSource=read(loader).slice(0,read(loader).indexOf('export interface SkyArtworkLoadState'));
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function modules(s:string){
 const context=vm.createContext({console}),lifetimes={exports:{} as any},gpu={exports:{} as any};
 const run=(source:string,m:any,require:(n:string)=>any)=>vm.runInContext('(function(exports,require,module){'+emit(source)+'\n})',context)(m.exports,require,m);
 run(lifeSource,lifetimes,n=>{throw Error('unexpected pure lifetime import '+n);});
 run(s,gpu,n=>{assert.equal(n,'./sky-artwork-loader');return lifetimes.exports;});
 return {context,lifetimes,gpu,run};
}
function regressions(s:string){
 const m=modules(s),cases:any[]=[];m.run(testCode,{exports:{}},n=>{
  if(n==='node:assert/strict')return assert;
  if(n==='node:test')return (name:string,fn:Function)=>cases.push({name,fn});
  if(n==='./sky-gpu-textures')return m.gpu.exports;
  if(n==='./sky-artwork-loader')return m.lifetimes.exports;
  throw Error('unexpected regression import '+n);
 });
 return cases.map(c=>{try{assert(!(c.fn() instanceof Promise));return {name:c.name,pass:true};}catch(e){return {name:c.name,pass:false,error:String(e)};}});
}
function independentNested(s:string){
 const m=modules(s),live=new Set<object>();let serial=0;
 const gl={NO_ERROR:0,TEXTURE_2D:3553,TEXTURE_MIN_FILTER:1,TEXTURE_MAG_FILTER:2,TEXTURE_WRAP_S:3,TEXTURE_WRAP_T:4,LINEAR:9729,CLAMP_TO_EDGE:33071,
  RGBA:6408,UNSIGNED_BYTE:5121,UNPACK_FLIP_Y_WEBGL:37440,UNPACK_PREMULTIPLY_ALPHA_WEBGL:37441,
  getError:()=>0,isContextLost:()=>false,createTexture(){const t={id:++serial};live.add(t);return t;},deleteTexture(t:object){assert(live.delete(t));},bindTexture(){},texParameteri(){},pixelStorei(){},texImage2D(){}};
 const o=m.gpu.exports.createSkyGpuTextures(gl,undefined,64),sources=Array.from({length:4},()=>({width:4,height:4}));
 o.begin();const a=o.get(sources[0]),b=o.get(sources[1]);o.finish();
 o.begin();let observed:any;
 try{
  o.withPinned([sources[0],sources[1]],()=>{
   o.withPinned([sources[0]],()=>assert(o.get(sources[2])));
   // This distinct allocation occurs after inner scope exit and before either outer future sampler is marked used.
   assert(o.get(sources[3]));observed={outerAStillResident:live.has(a),outerBStillResident:live.has(b),residentTextures:live.size};
   assert(live.has(a)&&live.has(b),'outer pins survive inner exit under a subsequent allocation');
  });o.finish();o.begin();o.finish();assert.equal(live.size,0);o.dispose();return {pass:true,observed};
 }catch(e){o.dispose();return {pass:false,observed,error:String(e)};}
}
const baseline=regressions(code);assert.equal(baseline.length,9);assert(baseline.every(t=>t.pass));
const guard='!used.has(key) && !pinned.has(key)';assert.equal(code.split(guard).length-1,2);
const noCurrent=code.replaceAll(guard,'!pinned.has(key)');
const retirement='for (const key of entries.keys()) if (!used.has(key)) remove(key);';assert.equal(code.split(retirement).length-1,1);
const noRetirement=code.replace(retirement,'/* task-only absent frame-end retirement */');
const pin='const added = [...new Set(sources)].filter(source => !pinned.has(source));';assert.equal(code.split(pin).length-1,1);
const prematureUnpin=code.replace(pin,'const added = [...new Set(sources)];');
const finallyRelease='finally { added.forEach(source => pinned.delete(source)); }';assert.equal(code.split(finallyRelease).length-1,1);
const leakedPins=code.replace(finallyRelease,'finally { /* task-only pin release omitted */ }');
const mutants=[{name:'remove_current_used_pressure_guard',source:noCurrent},{name:'remove_empty_next_frame_retirement',source:noRetirement},
 {name:'inner_scope_prematurely_unpins_outer_sampler',source:prematureUnpin},{name:'omit_exception_and_scope_pin_release',source:leakedPins}].map(m=>({name:m.name,shadowSha256:sha(m.source),cases:regressions(m.source),independentNested:independentNested(m.source)}));
assert(mutants[0]!.cases.some(t=>!t.pass));assert(mutants[1]!.cases.some(t=>!t.pass));
assert(mutants[2]!.cases.some(t=>!t.pass));assert(mutants[3]!.cases.some(t=>!t.pass));
const nested=independentNested(code);assert(nested.pass);assert(!mutants[2]!.independentNested.pass);
const oldBeforeTests=regressions(read(oldPath));assert(oldBeforeTests.some(t=>!t.pass));
const peer=JSON.parse(read('output/active-retention-normal-independent-1002-r1/binding.json'));
const protectedBytes=peer.inputsBefore.filter((b:any)=>b.path.startsWith('workers/miniapp-api/assets/'));
for(const b of protectedBytes)assert.deepEqual(bind(b.path),b);
const six=JSON.parse(read('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'));for(const b of six)assert.equal(bind(b.path).sha256,b.sha256);
const result={status:mutants[2]!.cases.every(t=>t.pass)?'OWNER_EQUIVALENT_NESTED_TEST_COVERAGE_GAP':'OWNER_EQUIVALENT_REGRESSIONS_DETECT_MUTATIONS',
 source:bind(owner),tests:bind(tests),candidate:bind(candidatePath),normalizedCurrentSha256:sha(normCurrent),normalizedCandidateSha256:sha(normCandidate),
 semanticNormalization:['Only obsolete previousFrame storage/control removal and local/constant identifier rename; readonly weak-current callback count reduces, no real source ownership side effect is introduced.',
 'Common exact token/AST comparison retains window/copy/failure/pins/weak-source and constant numeric amount; reverse edits prove landscape/render only intended comments/constant symbol changed.'],
 rendererReverseSha256:sha(reverseRenderer),landscapeReverseSha256:sha(reverseLandscape),landscapeReverseExpectedSha256:sourceBinding(landscape).sha256,
 landscapeReverseMatches,unchangedWindow:bind(window),unchangedLoader:bind(loader),
 baseline,oldBeforeTests,independentNested:nested,mutants,protectedAssetFiles:protectedBytes.length,six,
 limits:['VM bookkeeping and source/test review, no new GPU/runtime/native/performance trial. Normal actual26pixel/78GL and separate authored boundary sources remain independently reviewed evidence.',
 'Same weak lifetime helper definitions executed from actual source in one VM realm; core methods use controlled GL only.',
 'Current used residency may exceed16MiB; sourceBytes/scientific validity/rights and release/WEAPP/final acceptance not changed or established.',
 'A surviving nested-pin mutant identifies missing regression detection, not a known defect in current correct filter implementation.']};
let output='output/active-retention-adoption-independent-1002-r1';for(let n=2;fs.existsSync(file(output));n++)output=`output/active-retention-adoption-independent-1002-r${n}`;fs.mkdirSync(file(output));
fs.copyFileSync(fileURLToPath(import.meta.url),file(output+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(file(output+'/normalized-current.ts.txt'),normCurrent,{flag:'wx'});fs.writeFileSync(file(output+'/normalized-candidate.ts.txt'),normCandidate,{flag:'wx'});
fs.writeFileSync(file(output+'/result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
for(const [p,h] of Object.entries(expected))assert.equal(bind(p).sha256,h);
fs.writeFileSync(file(output+'/binding.json'),JSON.stringify({inputs:Object.keys(expected).concat([candidatePath,oldPath,loader,window]).map(bind),assets:protectedBytes,six,unchanged:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:bind(output+'/result.json'),status:result.status,baseline:baseline.length,mutants:mutants.map(m=>({name:m.name,failed:m.cases.filter(t=>!t.pass).map(t=>t.name),independentNested:m.independentNested})),nested},null,2));
