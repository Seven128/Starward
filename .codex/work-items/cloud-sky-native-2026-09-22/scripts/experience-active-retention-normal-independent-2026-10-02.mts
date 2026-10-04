/** Independent frozen normal-matrix readback: no author PNG/ledger oracle and no new GPU run. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),file=(p:string)=>path.join(ROOT,p);
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bytes=(p:string)=>fs.readFileSync(file(p)),json=(p:string)=>JSON.parse(bytes(p).toString());
const bind=(p:string)=>{const b=bytes(p);return {path:p,bytes:b.length,sha256:sha(b)};};
const out=process.argv[2];assert.match(out??'',/^output\/active-retention-normal-independent-1002-r\d+$/);assert(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const directory='output/playwright/cloud-sky-active-retention-gpu-ab-1002-r3',rPath=directory+'/result.json';
assert.equal(bind(rPath).sha256,'72039d3c0d63d89339a91a7aa2afbf64c40d52974faff4159a900f84b7334e31');
const r=json(rPath),input=json(r.inputs.path),prior=json(input.prior.path);assert.equal(r.rows.length,26);assert.equal(prior.rows.length,13);
const inputs=new Map<string,any>();
const admit=(p:string,expected?:any)=>{const a=bind(p);if(expected){assert.equal(a.sha256,expected.sha256,p);if(expected.bytes!==undefined)assert.equal(a.bytes,expected.bytes,p);}inputs.set(p,a);return a;};
admit(rPath);admit(r.inputs.path,r.inputs);admit(input.prior.path,input.prior);admit(input.original.path,input.original);admit(input.candidate.path,input.candidate);admit(input.executedSource.path,input.executedSource);
for(const b of [...input.sourceBindings,...input.r5OwnBindings,...input.inputBindings,...input.tapBindings,...r.reusedInputs])admit(b.path,b);
assert.equal(input.sourceBindings.length,138);assert.equal(input.r5OwnBindings.length,2);
const inventoryPath='output/shared-resource-reading-1002-r1/result.json';admit(inventoryPath,{sha256:'f654a0161b272ebb6330fafe1c59c307f519309b1b4336cb49fc4a8202fa97f4'});const inventory=json(inventoryPath);
for(const a of inventory.images)admit(a.file,a);assert.equal(inventory.images.length,278);
const preservedPath='.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json';admit(preservedPath);for(const a of json(preservedPath))admit(a.path,a);
const ownerPath='apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts';admit(ownerPath,{sha256:'cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e'});
const original=bytes(ownerPath).toString(),candidate=bytes(input.candidate.path).toString(),needle='!previousFrame.has(key) && !pinned.has(key)';assert.equal(original.split(needle).length-1,2);
const a=original.indexOf('      // Partial residents cost a whole source upload to recreate.',original.indexOf('    finish() {')),b=original.indexOf('      previousFrame.clear();',a);assert(a>0&&b>a);
assert.equal(candidate,(original.slice(0,a)+'      // Task candidate: retain every current-frame texture; retire inactive identities.\n      for (const key of entries.keys()) if (!used.has(key)) remove(key);\n'+original.slice(b)).replaceAll(needle,'!used.has(key) && !pinned.has(key)'));
const parse=(p:string,s:string)=>ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),printer=ts.createPrinter({removeComments:true});
const find=(a:ts.SourceFile)=>{const found:ts.FunctionDeclaration[]=[];const visit=(n:ts.Node)=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='createSkyGpuTextures')found.push(n);ts.forEachChild(n,visit);};visit(a);assert.equal(found.length,1);assert(found[0]!.body);return found[0]!;};
const print=(n:ts.Node,a:ts.SourceFile)=>printer.printNode(ts.EmitHint.Unspecified,n,a);
const originalBundlePath=path.posix.dirname(input.prior.path)+'/bundle.js',originalBundle=bytes(originalBundlePath).toString();admit(originalBundlePath,{sha256:prior.compiledSha256});
const originalAst=parse(originalBundlePath,originalBundle),originalFunction=find(originalAst);
const snapshots=['original-owner-function.js.txt','candidate-owner-function.js.txt','baseline-tapped-body.js.txt','active-tapped-body.js.txt','r4-normalized-full-ast.js.txt','r5-normalized-full-ast.js.txt','reused-executors.json','executed-script.mts.txt'];for(const n of snapshots)admit(directory+'/'+n);
assert.equal(bytes(directory+'/original-owner-function.js.txt').toString(),originalFunction.getText(originalAst));
assert.equal(bytes(directory+'/r4-normalized-full-ast.js.txt').toString(),bytes(directory+'/r5-normalized-full-ast.js.txt').toString());
assert.equal(sha(bytes(directory+'/r5-normalized-full-ast.js.txt')),input.normalizedFullAstHash);
assert.equal(printer.printFile(originalAst),bytes(directory+'/r5-normalized-full-ast.js.txt').toString());
const candidateEmitted=ts.transpileModule(candidate,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,candidateAst=parse('candidate',candidateEmitted),candidateFunction=find(candidateAst);
const savedCandidateAst=parse('savedCandidate',bytes(directory+'/candidate-owner-function.js.txt').toString());assert.equal(print(find(savedCandidateAst),savedCandidateAst),print(candidateFunction,candidateAst));
const tails:any[]=[];
for(const name of ['baseline','active']){
 const p=directory+'/'+name+'.js',bundle=bytes(p).toString();admit(p,{sha256:input.variantHashes[name]});const ast=parse(p,bundle),f=find(ast);
 assert.equal(bundle.slice(0,f.body!.getStart(ast)),originalBundle.slice(0,originalFunction.body!.getStart(originalAst)));
 assert.equal(bundle.slice(f.body!.end),originalBundle.slice(originalFunction.body!.end));
 const template=name==='baseline'?originalFunction:candidateFunction,templateAst=name==='baseline'?originalAst:candidateAst;
 assert.deepEqual(f.parameters.map(p=>p.getText(ast)),template.parameters.map(p=>p.getText(templateAst)));
 const oldStatements=template.body!.statements,statements=f.body!.statements,ret=oldStatements.at(-1)!;assert(ts.isReturnStatement(ret)&&ret.expression);
 const prefixCount=oldStatements.length-1;assert.deepEqual(statements.slice(0,prefixCount).map(n=>print(n,ast)),oldStatements.slice(0,prefixCount).map(n=>print(n,templateAst)));
 const owner=statements[prefixCount]!;assert(ts.isVariableStatement(owner));const d=owner.declarationList.declarations[0]!;assert.equal(d.name.getText(ast),'owner');assert(d.initializer);assert.equal(print(d.initializer,ast),print(ret.expression,templateAst));
 tails.push(statements.slice(prefixCount+1).map(n=>print(n,ast)));assert.equal(f.body!.getText(ast),bytes(directory+'/'+name+'-tapped-body.js.txt').toString().trim());
}assert.deepEqual(tails[0],tails[1],'all diagnostic wrapper statements exactly shared');
// Independent PNG decoder validates every chunk CRC and RGBA filter row; no Pillow/author decoder is consulted.
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=(b:Uint8Array)=>{let n=0xffffffff;for(const x of b)n=crcTable[(n^x)&255]!^(n>>>8);return(n^0xffffffff)>>>0;};
const decodePng=(b:Buffer)=>{assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');let at=8,header:any=null;const data:Buffer[]=[];let ended=false;
 while(at<b.length){const n=b.readUInt32BE(at),end=at+12+n;assert(end<=b.length);const type=b.toString('ascii',at+4,at+8),body=b.subarray(at+8,at+8+n);assert.equal(crc(b.subarray(at+4,at+8+n)),b.readUInt32BE(at+8+n));if(type==='IHDR'){assert(!header);header={width:body.readUInt32BE(0),height:body.readUInt32BE(4),depth:body[8],color:body[9],compression:body[10],filter:body[11],interlace:body[12]};}if(type==='IDAT')data.push(body);at=end;if(type==='IEND'){ended=true;break;}}
 assert(ended&&at===b.length);assert.deepEqual(header,{width:390,height:844,depth:8,color:6,compression:0,filter:0,interlace:0});const raw=inflateSync(Buffer.concat(data),{maxOutputLength:(1560+1)*844});assert.equal(raw.length,1561*844);const out=Buffer.alloc(1560*844);
 const paeth=(a:number,b:number,c:number)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
 for(let y=0;y<844;y++){const kind=raw[y*1561]!;assert(kind<=4);for(let x=0;x<1560;x++){const left=x>=4?out[y*1560+x-4]!:0,up=y?out[(y-1)*1560+x]!:0,ul=y&&x>=4?out[(y-1)*1560+x-4]!:0;out[y*1560+x]=(raw[y*1561+1+x]!+(kind===0?0:kind===1?left:kind===2?up:kind===3?Math.floor((left+up)/2):paeth(left,up,ul)))&255;}}
 return out;};
const nonce=(v:any):any=>{if(typeof v==='string'){const m=v.match(/^\/controlled\/sky-public-images-v1\/([a-f0-9]{64})-([a-f0-9]{64})-([a-z0-9]+_[a-z0-9]+)-(\d+)\.(png|jpg)$/);return m?`/controlled/sky-public-images-v1/${m[1]}-${m[2]}-<NONCE>-${m[4]}.${m[5]}`:v;}if(Array.isArray(v))return v.map(nonce);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,nonce(x)]));return v;};
const offers=new Map<string,any>();for(const a of prior.inputs.filter((a:any)=>a.transport==='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY'))offers.set(a.sha256,a);
const rawPixels=new Map<string,Buffer>(),rowSummaries:any[]=[],ledgers:Record<string,Map<number,number>>={baseline:new Map(),active:new Map()};let pinCount=0;
for(const row of r.rows){
 const stem=directory+'/'+row.condition.name,raw=bytes(stem+'.rgba'),png=bytes(stem+'.png');admit(stem+'.rgba',{sha256:row.rgbaSha256});admit(stem+'.png',{sha256:row.pngSha256});admit(stem+'.json');assert.deepEqual(json(stem+'.json'),row);assert.equal(raw.length,1316640);const decoded=decodePng(png);
 for(let y=0;y<844;y++)assert.deepEqual(decoded.subarray(y*1560,(y+1)*1560),raw.subarray((843-y)*1560,(844-y)*1560));
 const expected=prior.rows[row.index]!;assert.equal(row.rgbaSha256,expected.rgbaSha256);admit(path.posix.dirname(input.prior.path)+'/'+expected.condition.name+'.rgba',{sha256:expected.rgbaSha256});assert.deepEqual(raw,bytes(path.posix.dirname(input.prior.path)+'/'+expected.condition.name+'.rgba'));rawPixels.set(row.condition.name,raw);
 assert.deepEqual(row.gpuFailures,[]);assert.equal(row.textureFrames.length,3);const ledger=ledgers[row.variant]!;const passes=[];
 for(let i=0;i<3;i++){
  const p=row.passes[i]!,calls=row.textureFrames[i]!.calls;assert(row.textureFrames[i]!.finished);assert.equal(p.glError,0);pinCount+=calls.filter((c:any)=>c.method==='pin-enter').length;
  let live=[...ledger.values()].reduce((n,b)=>n+b,0),peak=live,upload=0,copy=0;
  for(const e of p.events){const s=e.source;assert(s&&Number.isInteger(s.objectId));const offer=offers.get(s.sha256);assert(offer,'source real-byte offer');assert.equal(s.width,offer.width);assert.equal(s.height,offer.height);assert(s.path.includes('-'+s.sha256+'-'));
   const old=ledger.get(s.objectId)??0;if(e.operation==='source-upload'){assert.equal(old,0,'a new full source texture has no prior resident at this identity');assert.equal(e.bytes,s.width*s.height*4);ledger.set(s.objectId,e.bytes);live+=e.bytes;upload+=e.bytes;}
   else if(e.operation==='gpu-copy'){// Full+cropped coexist until the owner's immediate deletion of the full source.
    assert(old>0);ledger.set(s.objectId,old+e.bytes);live+=e.bytes;copy+=e.bytes;
   }else{assert.equal(e.operation,'delete');assert(old>=e.bytes);const remaining=old-e.bytes;if(remaining)ledger.set(s.objectId,remaining);else ledger.delete(s.objectId);live-=e.bytes;}
   assert(live>=0);assert.equal(e.liveBytes,live);peak=Math.max(peak,live);
  }
  assert.equal(live,p.liveBytes);assert.equal(peak,p.peakBytes);const retained=new Map<number,number>(p.retained.map((e:any)=>[e.source.objectId,e.bytes]));assert.deepEqual([...ledger].sort((a,b)=>a[0]-b[0]),[...retained].sort((a,b)=>a[0]-b[0]));assert.equal(p.aliveTextures,retained.size);
  for(const c of calls.filter((c:any)=>c.method==='getWindow')){assert(c.texturePresent);const w=c.returnedWindow;assert([w.x,w.y,w.width,w.height].every(Number.isInteger));assert(w.x>=0&&w.y>=0&&w.width>0&&w.height>0&&w.x+w.width<=c.source.width&&w.y+w.height<=c.source.height);assert.equal(c.returnedBytes,w.width*w.height*4);}
  passes.push({pass:i,liveBytes:live,peakBytes:peak,uploadBytes:upload,copyBytes:copy});
 }
 if(row.variant==='active'){
  const before=r.rows.find((a:any)=>a.variant==='baseline'&&a.index===row.index)!;assert.deepEqual(raw,rawPixels.get(before.condition.name));for(const k of ['ready','transfers','newDecodes'])assert.deepEqual(nonce(row[k]),nonce(before[k]));assert.deepEqual(nonce(row.textureFrames),nonce(before.textureFrames));assert.deepEqual(row.gates,before.gates);
  for(let i=0;i<3;i++)for(const k of ['references','paintedSources','frameAt','landscape'])assert.deepEqual(row.passes[i][k],before.passes[i][k]);
 }
 rowSummaries.push({variant:row.variant,index:row.index,condition:row.condition.name,rgbaSha256:row.rgbaSha256,pngDecodedFullArrayExact:true,passes});
}
assert.equal(pinCount,0,'normal matrix does not exercise multisampler pins');
const activeFinalPath=directory+'/active-final.json';admit(activeFinalPath);const final=json(activeFinalPath);assert.deepEqual(final,r.finals.find((f:any)=>f.variant==='active').variant?(()=>{const f={...r.finals.find((f:any)=>f.variant==='active')};delete f.variant;return f;})():null);
assert.equal(final.gpu.liveBytes,0);assert.equal(final.gpu.aliveTextures,0);assert.deepEqual(final.gpu.retained,[]);assert(final.cache.every((c:any)=>c.leased===0));const finalLedger=ledgers.active!;let finalBytes=[...finalLedger.values()].reduce((n,b)=>n+b,0);
for(const e of final.gpu.events){assert.equal(e.operation,'delete');assert.equal(finalLedger.get(e.source.objectId),e.bytes);finalLedger.delete(e.source.objectId);finalBytes-=e.bytes;assert.equal(e.liveBytes,finalBytes);}assert.equal(finalBytes,0);assert.equal(finalLedger.size,0);
assert(r.finals.find((f:any)=>f.variant==='baseline').rawFinalNotPersistedInR2);
const totals=(variant:string)=>{const ps=rowSummaries.filter(r=>r.variant===variant).flatMap(r=>r.passes);return {uploadBytes:ps.reduce((n,p)=>n+p.uploadBytes,0),copyBytes:ps.reduce((n,p)=>n+p.copyBytes,0),maximumPeak:Math.max(...ps.map(p=>p.peakBytes)),maximumFrameEnd:Math.max(...ps.map(p=>p.liveBytes))};};
assert.deepEqual(r.errors,[]);const before=[...inputs.values()],after=before.map(b=>bind(b.path));assert.deepEqual(after,before);
const result={status:'INDEPENDENT_NORMAL_SOURCE_FULL_PIXELS_AND_LEDGER_READBACK_NOT_ADOPTED',resultInput:bind(rPath),mechanicalTsDeltaVerified:true,outsideFactoryAllBundleBytesEqual:true,baselineOriginalFactoryAndActiveCandidateFactoryPreserved:true,commonReadonlyTapStatementsEqual:true,fullNormalizedR4R5AstEqual:true,sourceBindingsVerified:138,r5OwnBindingsVerified:2,publishedImageBytesUnchanged:278,preservedSixUnchanged:true,normalPinScopes:pinCount,rows:rowSummaries,totals:{baseline:totals('baseline'),active:totals('active')},actualActiveFinalOwnerExitZero:true,baselineFinalRawArtifactGap:true,
 limits:['Independent of candidate and normal-matrix authors; no new browser/GPU replay. All 26 stored screenshot PNGs are independently chunk-CRC/inflate/filter decoded and full-array compared with bottom-up actual GL RGBA, original r5 arrays, and the peer policy. All78 recorded allocation/delete passes are independently reconstructed across scene changes by decoded source identity and real-byte offers.',
 'Original current138 bindings supplement historical r5 only after the original run; unchanged normalized whole-r4/r5 AST is strong artifact association, not a retroactive r5 before-run source receipt. Method get cannot expose its internal lexical window; getWindow is directly observed.',
 'Only exact owned namespace+SHA+nonce+attempt+extension filenames are nonce-normalized; complete paths remain in the source artifacts. No other fields are ignored.',
 'The normal13 scene matrix has no pin-enter, deliberate failure or retired between-frame source injection; authored boundary probe is a separate evidence owner, not independently verified by this script.',
 'Explicit active policy removes the former16MiB frame-end cap, retaining every current-frame texture. Lower repeated uploads coexist with greater sustained residency and some transition uploads/peaks; source-byte/copy counts are not native timing or total memory/capacity.',
 'Baseline final disposal asserts reportedly ran before r2 fixture comparison failed but its raw final was not persisted: independent baseline final readback remains GAP. Active raw final has actual0 texture/lease ledger. Desktop softwareGL, controlled Taro/React/MapFS and held HTML images are not WEAPP/device or image-quality acceptance.']};
fs.writeFileSync(file(out+'/result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});fs.writeFileSync(file(out+'/binding.json'),JSON.stringify({inputsBefore:before,inputsAfter:after,unchanged:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),totals:result.totals,rows:26,passes:78,normalPins:pinCount}));
