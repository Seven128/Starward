// Saved artifacts and a single exact decode-effect boundary; no cache/GL/browser replay.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {assertDeepSkyImageDiscovery} from '../../../../packages/miniapp-contracts/src/index.ts';
import {registerSkyNativeImageLifetime,skyNativeImageIsCurrent} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const OUT='output/selected-w3-offscreen-independent-1003-r3',CPU='output/selected-w3-offscreen-independent-1003-r2',AUTHOR='output/selected-w3-offscreen-cache-1003-r2';
const FEATURE='apps/wechat-miniapp/src/features/sky/',TASK='.codex/work-items/cloud-sky-native-2026-09-22';
const read=(p:string)=>fs.readFileSync(path.resolve(ROOT,p)),json=(p:string)=>JSON.parse(read(p).toString());
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=read(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const save=(name:string,value:any)=>fs.writeFileSync(path.resolve(ROOT,OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const require=createRequire(path.resolve(ROOT,'apps/wechat-miniapp/package.json')),ts=require('typescript');assert.equal(ts.version,'5.9.3');
const inputs=new Map<string,any>();
function admit(p:string,expected:any={}){const b=bind(p);if(expected.sha256)assert.equal(b.sha256,expected.sha256,p);if(expected.bytes!==undefined)assert.equal(b.bytes,expected.bytes,p);if(inputs.has(p))assert.deepEqual(inputs.get(p),b);inputs.set(p,b);return b;}
const evidence:any={};
try{
assert(!fs.existsSync(path.resolve(ROOT,OUT)));fs.mkdirSync(path.resolve(ROOT,OUT));admit(path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/'));admit(process.execPath);admit(require.resolve('typescript'));admit(require.resolve('typescript/package.json'));admit('tools/run-node.cjs');
fs.copyFileSync(fileURLToPath(import.meta.url),path.resolve(ROOT,OUT,'executed-readback.mts'),fs.constants.COPYFILE_EXCL);
const cpuPath=CPU+'/cpu-controls.json';admit(cpuPath,{sha256:'36fb56454affab231470f022a2665833eabcb6e04bdfcec263a1023657726d45'});
const cpu=json(cpuPath);assert.equal(cpu.status,'PASSED_BOUNDED_CPU_CONTROLS');
const cpuBefore=json(CPU+'/inputs-before.json'),cpuAfter=json(CPU+'/inputs-after.json');assert.deepEqual(cpuBefore,cpuAfter);
for(const b of cpuBefore)admit(b.path,b);
for(const name of fs.readdirSync(path.resolve(ROOT,CPU)))admit(CPU+'/'+name);
admit('workers/miniapp-api/src/deep-sky-imagery.ts');
for(const name of fs.readdirSync(path.resolve(ROOT,AUTHOR)))admit(AUTHOR+'/'+name);
admit(AUTHOR+'/result.json',{bytes:9659,sha256:'fcd0e94c9c70ed17cb1f42f2f826d60b957b1fa646efd3fbd6401854e867a43c'});
const actual=json(AUTHOR+'/result.json'),before=json(AUTHOR+'/inputs-before.json'),after=json(AUTHOR+'/inputs-after.json');assert.deepEqual(before,after);assert.equal(before.length,34);for(const b of before)admit(b.path,b);
const rootReadback=json(AUTHOR+'/root-current-readback.json');for(const b of [...rootReadback.sources,...rootReadback.artifacts])admit(b.path,b);
const note=TASK+'/evidence/experience-selected-w3-offscreen-development-2026-10-03.md';admit(note);
for(const name of fs.readdirSync(path.resolve(ROOT,'output/selected-w3-offscreen-cache-1003-r1')))admit('output/selected-w3-offscreen-cache-1003-r1/'+name);
for(const name of ['failure-controls.json','executed-controls.mts','inputs-before.json'])admit('output/selected-w3-offscreen-independent-1003-r1/'+name);
const preserve=TASK+'/tmp/resume-preserved-hashes-2026-10-01.json';admit(preserve);for(const b of json(preserve))admit(b.path,b);
save('readback-inputs-before.json',[...inputs.values()]);

assert.equal(actual.status,'PASSED_CONTROLLED_CURRENT_PAGE_CACHE_CONSUMER');
const publication=json(actual.publication.path);assertDeepSkyImageDiscovery(publication,'M:51');
const manifest=json('workers/miniapp-api/assets/deep-sky/manifest.json');assert.equal(sha(Buffer.from(JSON.stringify(manifest))),publication.publicationHash);
const stored=manifest.entries.find((e:any)=>e.objectRef===publication.objectRef);assert(stored);
for(const level of ['OVERVIEW','MEDIUM','DETAIL']){const a=publication.levels[level],raw=stored.levels[level];assert.deepEqual(a,{file:raw.file,downloadUrl:`/v2/sky/deep-sky/${publication.publicationHash}/${raw.file}`,sha256:raw.sha256,bytes:raw.bytes,format:raw.imageFormat==='png'?'png':'jpeg',pixels:raw.pixels,width:raw.pixels,height:raw.pixels,fieldDegrees:raw.fieldDegrees,validFraction:null,coverageState:'NOT_MEASURED',...(raw.sourceFiniteMask?{sourceFiniteMask:raw.sourceFiniteMask}:{}),...(raw.displaySupport?{displaySupport:raw.displaySupport}:{})});assert.equal(read('workers/miniapp-api/assets/deep-sky/'+a.file).length,a.bytes);assert.equal(sha(read('workers/miniapp-api/assets/deep-sky/'+a.file)),a.sha256);assert.deepEqual(actual.publication.levels[level],{bytes:a.bytes,sha256:a.sha256,pixels:a.pixels,fieldDegrees:a.fieldDegrees});}

// Independently reproduce the author's extraction from the bound actual page.
const page=ts.createSourceFile('page.tsx',read(FEATURE+'spot-sky-page.tsx').toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const vars=new Map<string,string>(),callbacks=new Map<string,string>(),effects=new Map<string,string>();let intent='',draw='';
const names=['targetOpticalView','currentDeepSkyDiscovery','deepSkyImageInView','desiredDeepSkyImageLevel'];
const markers=['return startDeepSkyImageRequest','const owned = [deepSkyImageAsset','const image = node.createImage()'];
function visit(n:any){
 if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)){const name=n.name.text;if(names.includes(name))vars.set(name,n.getText(page));if(['setDeepSkyImageAsset','setCanvasDeepSkyImage'].includes(name)){assert(ts.isCallExpression(n.initializer));callbacks.set(name,n.initializer.arguments[0].getText(page));}}
 if(ts.isExpressionStatement(n)&&n.getText(page).startsWith('deepSkyImageIntentRef.current ='))intent=n.getText(page);
 if(ts.isPropertyAssignment(n)&&n.name.getText(page)==='deepSkyImage'&&n.initializer.getText(page).includes('canvasDeepSkyImage'))draw=n.initializer.getText(page);
 if(ts.isCallExpression(n)&&n.expression.getText(page)==='useEffect')for(const marker of markers)if(n.arguments[0].getText(page).includes(marker))effects.set(marker,`({run:${n.arguments[0].getText(page)},deps:${n.arguments[1].getText(page)}})`);
 ts.forEachChild(n,visit);
}visit(page);assert.equal(vars.size,4);assert.equal(callbacks.size,2);assert.equal(effects.size,3);assert(intent&&draw);
const compile=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const render=compile('(()=>{'+names.map(n=>'const '+vars.get(n)+';').join('\n')+intent+`deepSkyImageViewRef.current=targetOpticalView;return {desiredDeepSkyImageLevel,painted:${draw}};})()`);
assert.equal(render,read(AUTHOR+'/executed-page-render.js').toString());
for(const [n,s]of callbacks)assert.equal(compile('('+s+')'),read(AUTHOR+'/'+n+'.js').toString());
for(const [i,s]of [...effects.values()].entries())assert.equal(compile(s),read(AUTHOR+'/effect-'+i+'.js').toString());
evidence.actualPageExtraction={declarations:4,callbacks:2,effects:3,exact:true};

// Verify current accepted footprint and live refinement remain different declarations.
const allDecls=new Map<string,string>();function find(n:any){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name))allDecls.set(n.name.text,n.initializer?.getText(page)??'');ts.forEachChild(n,find);}find(page);
assert.equal(allDecls.get('currentViewBasis'),'presentedCamera?.basis ?? manualBasis ?? sensorBasis');
assert.equal(allDecls.get('presentedFov'),'presentedCamera?.fov ?? verticalFovDeg');
assert(vars.get('targetOpticalView')!.includes('verticalFovDeg: presentedFov'));assert(vars.get('desiredDeepSkyImageLevel')!.includes('deepSkyImageLevelForFov(verticalFovDeg)'));
evidence.cameraBoundary={footprint:'accepted camera/presentedFov fallback',level:'live verticalFovDeg',extracted:true};

const byName=new Map(actual.snapshots.map((x:any)=>[x.name,x]));
const cold:any=byName.get('metadata-completed-after-view-moved-out'),coarse:any=byName.get('center-overview-ready'),pending:any=byName.get('detail-pending-with-original-coarse'),failed:any=byName.get('detail-error-keeps-original-coarse'),out:any=byName.get('whole-family-offscreen-after-effect'),back:any=byName.get('center-return-reuses-detail-file'),late:any=byName.get('cancelled-decode-late-callbacks-cannot-republish');
assert.equal(byName.size,7);
assert.deepEqual([cold.transfers,cold.createdImages,cold.cache.leased,cold.paintInput],[0,0,0,null]);
const ov=publication.levels.OVERVIEW.bytes,det=publication.levels.DETAIL.bytes;
assert.deepEqual([coarse.requested,coarse.recovery,coarse.cache.leased,coarse.cache.bytes,coarse.transfers],['OVERVIEW','OVERVIEW',1,ov,1]);
assert.deepEqual([pending.requested,pending.recovery,pending.cache.leased,pending.cache.bytes,pending.transfers],['DETAIL','OVERVIEW',2,ov+det,2]);
assert.equal(failed.state,'ERROR');assert.equal(failed.readyImage,coarse.readyImage);assert.equal(failed.paintInput,coarse.paintInput);assert.equal(failed.cache.leased,2);
assert.deepEqual([out.requested,out.recovery,out.readyImage,out.paintInput,out.cache.leased,out.cache.bytes],[null,null,null,null,0,ov+det]);
assert.equal(back.requested,'DETAIL');assert.equal(back.readyImage,3);assert.notEqual(back.readyImage,coarse.readyImage);assert.equal(back.cache.leased,1);assert.equal(back.transfers,out.transfers);assert.equal(back.metadataRequests,4);
assert.deepEqual([late.requested,late.recovery,late.readyImage,late.paintInput,late.cache.leased,late.transfers],[null,null,null,null,0,2]);
assert.deepEqual(actual.events.filter((e:any)=>e[0]==='metadata').map((e:any)=>e[1]),[1,2,3,4,5]);
const transferHashes=actual.events.filter((e:any)=>e[0]==='transfer').map((e:any)=>e[1]);assert.deepEqual(transferHashes,[publication.levels.OVERVIEW.sha256,publication.levels.DETAIL.sha256]);
assert.equal(actual.transfers.length,2);for(const t of actual.transfers){const a=Object.values(publication.levels).find((a:any)=>a.sha256===t.sha256) as any;assert(a);assert.equal(t.bytes,a.bytes);assert(t.url.endsWith(a.downloadUrl));assert(t.url.includes('/'+publication.publicationHash+'/'));}
assert.equal(actual.transfers.reduce((s:number,x:any)=>s+x.bytes,0),28503);assert.equal(actual.events.filter((e:any)=>e[0]==='created-image').length,4);
for(const n of ['entries','leased','bytes','reserved','running','pending','retired','failures'])assert.equal(actual.controls.finalCleared[n],0);assert.equal(actual.controls.finalCleared.epoch,1);
evidence.savedCacheFacts={snapshots:actual.snapshots,transferBytes:28503,transferCount:2,metadataCountByReturn:4,metadataCountFinal:5,finalClear:actual.controls.finalCleared};

// One independent actual decode effect: deliver onload after a render intent
// fence but before cleanup. Removing only the new guard must revive the image.
const effect=effects.get('const image = node.createImage()')!;
function decodeControl(source=effect,kind='offscreen'){
 const images:any[]=[],published:any[]=[],states:any[]=[];let current=true;
 const asset={reference:'M:51',level:'DETAIL',fieldDegrees:publication.levels.DETAIL.fieldDegrees,pixelSize:512,tempFilePath:'/controlled/detail',isCurrent:()=>current};
 const node={createImage(){const image:any={width:512,height:512,onload:null,onerror:null};images.push(image);return image;}};
 const env:any={pageVisible:true,selectedDeepSkyEntry:{objectRef:'M:51'},desiredDeepSkyImageLevel:'DETAIL',canvasNodeRef:{current:node},canvasGenerationRef:{current:7},canvasNodeRevision:7,deepSkyRecoveryFileRef:{current:null},canvasDeepSkyImageRef:{current:null},deepSkyImageAsset:asset,deepSkyImageIntentRef:{current:{reference:'M:51',level:'DETAIL'}},deepSkyImageFailureRef:{current:null},retireDeepSkyDecode(){},setCanvasDeepSkyImage(v:any){published.push(v);},setDeepSkyImageState(v:any){states.push(v);},registerSkyNativeImageLifetime};
 const port=vm.runInNewContext(compile(source),env),cleanup=port.run();assert.equal(images.length,1);const queued=images[0].onload;
 if(kind==='offscreen')env.deepSkyImageIntentRef.current=null;
 if(kind==='retired')current=false;
 if(kind==='canvas')env.canvasGenerationRef.current=8;
 if(kind==='same-ref-level-change')env.deepSkyImageIntentRef.current={reference:'M:51',level:'MEDIUM'};
 queued();const beforeCleanup=published.filter(Boolean).length;cleanup();queued();const afterCleanup=published.filter(Boolean).length;
 return{kind,published:beforeCleanup,afterCleanup,registered:beforeCleanup?skyNativeImageIsCurrent(images[0]):'not-inferred',states};
}
const mutant=effect.replace('deepSkyImageIntentRef.current?.reference === asset.reference &&','');assert.notEqual(mutant,effect);
const normal=decodeControl(),escaped=decodeControl(mutant),retired=decodeControl(effect,'retired'),canvas=decodeControl(effect,'canvas'),coarseSameRef=decodeControl(effect,'same-ref-level-change');
assert.equal(normal.published,0);assert.equal(escaped.published,1);assert.equal(escaped.afterCleanup,1);assert.equal(retired.published,0);assert.equal(canvas.published,0);assert.equal(coarseSameRef.published,1);
evidence.decodeBoundary={normal,guardRemoved:escaped,retired,canvas,coarseSameRef,detected:true,scope:'Exact page effect, controlled node/lease/dimensions; no image decode, framework render, cleanup effects or native GC replay.'};

const authorFailure=json('output/selected-w3-offscreen-cache-1003-r1/failure.json');assert.equal(authorFailure.status,'FAILED_TASK_CONFIG');assert.equal(authorFailure.error,'sky_public_image_config_invalid');
const oldAuthor=read('output/selected-w3-offscreen-cache-1003-r1/executed-driver.mjs').toString(),newAuthor=read(AUTHOR+'/executed-driver.mjs').toString();assert.equal(oldAuthor.replace("session:'selected-w3-task'","session:'selected_w3_task'"),newAuthor);
evidence.failures={authorR1:'Config rejects hyphenated session before consumer controls; exact one-literal fix',ownR1:'VM context reused lexical declarations; preserved failure and executed reader. R2 uses fresh sandbox, moves two late admissions before before-inventory.',ownR2Readback:'Incorrectly compared admitted transport descriptor against full publication level with source/stretch. R3 independently derives the actual descriptor fields, keeps original source metadata and failed reader/log; CPU R2 controls were already passed and not repeated.'};
const readAfter=[...inputs.values()].map((b:any)=>bind(b.path));assert.deepEqual(readAfter,[...inputs.values()]);save('readback-inputs-after.json',readAfter);
const result={status:'PASSED_BOUNDED_INDEPENDENT_REVIEW',time:new Date().toISOString(),node:process.version,typescript:ts.version,inputs:inputs.size,beforeAfterExact:true,protectedExact:true,blockingFindings:[],cpu:bind(cpuPath),authorResult:bind(AUTHOR+'/result.json'),evidence,
 limits:['Saved cache/selected page controls execute extracted actual declarations/callbacks/effects and real request/cache core; controlled React scheduling/MapFS/delivery/demand/native onload. No outer acquisition runtime/HTTP/Taro route/page accepted/GPU/bitmap pixels here.',
 'Returned file adds zero encoded transfers while metadata request count reaches four at return/five finally. This is not zero total network activity.',
 'Only registered ready image lifetime is qualified. Created/cancelled images are not inferred WeakMap members or physically freed native resources.',
 'Family exclusion uses all original levels and existing renderer certificate; opacity/alpha/finite science/displaySupport never certify absent data. Unknown/below-horizon/coarse edge retain demand.',
 'Current selected W3 source identity remains infrared; no changed optical registration/default/Prepared registry/aux policy/source quality/new GPU resource or capacity adoption.'],
 governing:'Documentation may change during parent closeout; no claim of immutable PLAN/Context or later author note.'};
save('result.json',result);console.log(JSON.stringify({status:result.status,result:bind(OUT+'/result.json'),inputs:inputs.size,decodeMutation:evidence.decodeBoundary}));
}catch(error:any){save('failure-readback.json',{error:String(error),stack:error.stack,evidence});console.error(error);process.exitCode=1;}
