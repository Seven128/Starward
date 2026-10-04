import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createSkyPublicImageCache} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts';
import {matchesSkyImageBytes} from '../../../../apps/wechat-miniapp/src/services/sky-image-bytes.ts';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=(p:string)=>path.join(root,p),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const sourceNames=['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx','apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts','apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts','apps/wechat-miniapp/src/services/sky-public-image-runtime.ts','apps/wechat-miniapp/src/services/sky-image-bytes.ts','apps/wechat-miniapp/src/services/bare-sky-resource.ts','apps/wechat-miniapp/src/services/api-client.ts'];
const sources=sourceNames.map(bind),baseline=JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of baseline)assert.equal(bind(b.path).sha256,b.sha256);
const protectedFiles=[...sources,...baseline.map((b:any)=>bind(b.path))];
for(const p of fs.readdirSync(file('workers/miniapp-api/assets/deep-sky'),{recursive:true,withFileTypes:true}) as any[])if(p.isFile())protectedFiles.push(bind(path.relative(root,path.join(p.parentPath,p.name)).replaceAll('\\','/')));
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert.ok(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
for(const p of sourceNames)fs.copyFileSync(file(p),file(out+'/'+path.basename(p)+'.txt'),fs.constants.COPYFILE_EXCL);
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const save=(p:string,v:unknown)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const page=ts.createSourceFile('page.tsx',fs.readFileSync(file(out+'/spot-sky-page.tsx.txt'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find<T extends ts.Node>(predicate:(n:ts.Node)=>boolean):T{let selected:T|undefined;function visit(n:ts.Node){if(predicate(n))selected=n as T;ts.forEachChild(n,visit)}visit(page);assert.ok(selected);return selected}
const compile=(source:string,bindings:object)=>vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
const callback=(name:string,bindings:object)=>{const n=find<ts.VariableDeclaration>(n=>ts.isVariableDeclaration(n)&&n.name.getText(page)===name);assert.ok(n.initializer&&ts.isCallExpression(n.initializer));return compile('('+n.initializer.arguments[0]!.getText(page)+')',bindings)};
const cases:any[]=[];
// Distinct consumer leases can intentionally share one encoded file path.
let releasesA=0,releasesB=0;
const a={reference:'M:31',level:'DETAIL',tempFilePath:'/same-public-path.jpg',release(){releasesA++}},b={...a,release(){releasesB++}};
const bindings:any={deepSkyImageFileRef:{current:null},deepSkyRecoveryFileRef:{current:null},canvasDeepSkyImageRef:{current:null},storeDeepSkyImageAsset(){},storeCanvasDeepSkyImage(){}};
const setFile=callback('setDeepSkyImageAsset',bindings),setDecoded=callback('setCanvasDeepSkyImage',bindings);
setFile(a);setFile(b);setFile(null);
cases.push({name:'same encoded path replacement must release the distinct superseded page lease',status:releasesA===0?'FAILED_CURRENT_SAME_PATH_LEASE_OWNERSHIP':'PASS',releasesA,releasesB});
// The already-ready recovery bitmap must not survive public retirement.
let retired=false,shown:any=null;const asset={reference:'M:31',level:'DETAIL',fieldDegrees:4,tempFilePath:'/same-public-path.jpg',release(){},isCurrent:()=>!retired,onRetire(_handler:()=>void){return()=>{}}};
const image:any={onload:null,onerror:null};const node={createImage(){return image}};
const decodeBindings:any={pageVisible:true,canvasNodeRevision:1,canvasGenerationRef:{current:1},canvasNodeRef:{current:node},selectedDeepSkyEntry:{objectRef:'M:31'},desiredDeepSkyImageLevel:'DETAIL',deepSkyImageAsset:asset,deepSkyImageFailureRef:{current:null},deepSkyRecoveryFileRef:{current:null},canvasDeepSkyImageRef:{current:null},retireDeepSkyDecode(){},setDeepSkyImageState(){},setCanvasDeepSkyImage(value:any){shown=value;decodeBindings.canvasDeepSkyImageRef.current=value}};
const effect=find<ts.CallExpression>(n=>ts.isCallExpression(n)&&n.expression.getText(page)==='useEffect'&&Boolean(n.arguments[0]?.getText(page).includes('const image = node.createImage()')));
const run=compile('('+effect.arguments[0]!.getText(page)+')',decodeBindings);run();const late=image.onload;retired=true;late();
cases.push({name:'public lease retirement before queued native onload must reject selected late pixels',status:shown?'FAILED_CURRENT_SELECTED_LATE_DECODE':'PASS',paintedRetiredLease:Boolean(shown),canvasGenerationStillCurrent:true});
const credit=find<ts.VariableDeclaration>(n=>ts.isVariableDeclaration(n)&&n.name.getText(page)==='deepSkyImagePresented');assert.ok(credit.initializer);
const credited=compile(credit.initializer.getText(page),{presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:390,height:844},presentedSkyFrame:{deepSkyImage:{...asset,image}}});
cases.push({name:'retired actually-painted selected handle must withdraw W3 presentation credit',status:credited?'FAILED_CURRENT_SELECTED_RETIRED_CREDIT':'PASS',creditAfterRetirement:credited});
// Actual shared request + actual core + actual task-only filesystem: ready clear.
const artworkSource=ts.createSourceFile('request.ts',fs.readFileSync(file(out+'/sky-artwork-request.ts.txt'),'utf8'),ts.ScriptTarget.Latest,true);
const declaration=artworkSource.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='startSkyArtworkRequest');assert.ok(declaration);
const start=compile(declaration.getText(artworkSource).replace(/^export /,'' )+'\nstartSkyArtworkRequest',{matchesSkyImageBytes});
const encodedPath='workers/miniapp-api/assets/constellations/triangulum-australe.png',encoded=fs.readFileSync(file(encodedPath));protectedFiles.push(bind(encodedPath));
const bytes=Uint8Array.from(encoded).buffer,cacheRoot=file(out+'/native-task-cache');let decoded:any,ready:any,failures=0;
const cache=createSkyPublicImageCache({root:cacheRoot.replaceAll('\\','/'),byteBudget:32*1024*1024,maxFileBytes:8*1024*1024,session:'independent_w3_before',
 fs:{mkdir:async p=>{await fsp.mkdir(p,{recursive:true})},list:p=>fsp.readdir(p),size:async p=>(await fsp.stat(p)).size,read:async p=>Uint8Array.from(await fsp.readFile(p)).buffer,
 write:async(p,b)=>{await fsp.writeFile(p,Buffer.from(b))},rename:(a,b)=>fsp.rename(a,b),remove:async p=>{try{await fsp.unlink(p)}catch(e:any){if(e.code!=='ENOENT')throw e}}},
 transfer(){return{promise:Promise.resolve(bytes),cancel(){}}}});
await cache.ready();
start({asset:{bytes:encoded.length,width:128,height:128,sha256:sha(encoded)},url:'https://controlled.invalid/image',canvas:{createImage(){decoded={width:128,height:128,onload:null,onerror:null};return decoded}},
 acquire:()=>cache.acquire({environment:'a'.repeat(64),url:'https://controlled.invalid/image',bytes:encoded.length,width:128,height:128,sha256:sha(encoded),format:'png'}),ready(v:any){ready=v},fail(){failures++}});
for(let i=0;i<100&&!decoded;i++)await new Promise(r=>setTimeout(r,10));assert.ok(decoded);decoded.onload();assert.ok(ready);
const beforeClear=cache.inspect(),clear=await cache.clear(),afterClear=cache.inspect();
cases.push({name:'actual shared ready image must be invalidated when actual public core retires its lease',status:ready&&failures===0&&afterClear.leased>0?'FAILED_CURRENT_SHARED_READY_CLEAR':'PASS',beforeClear,clear,afterClear,readyStillHeld:Boolean(ready),retireFailureCallbacks:failures,
 scope:'actual shared request/core and native Windows task file I/O, controlled transfer and Canvas; no WEAPP/GPU acceptance'});
ready.release();await cache.clear();
save('result.json',{scope:'Frozen actual source functions/expressions; native Windows task-only FS; same-path/public-lease/Canvas/transfer controlled; no production edit/HTTP/tool restart',status:'PRESERVED_CURRENT_CONSUMER_GAPS',sources,cases});
const after=protectedFiles.map(x=>bind(x.path));const equal=JSON.stringify(after)===JSON.stringify(protectedFiles);
save('binding.json',{script:bind(out+'/executed-script.mts.txt'),result:bind(out+'/result.json'),inputsBefore:protectedFiles,inputsAfter:after,unchanged:equal,
 note:equal?'source unchanged during executed proof':'Live owners changed concurrently; executed page/artwork snapshot bytes above remain the proof source; imported cache/bytes must still match'});
for(const p of ['apps/wechat-miniapp/src/services/sky-public-image-cache.ts','apps/wechat-miniapp/src/services/sky-image-bytes.ts'])assert.equal(bind(p).sha256,sources.find(s=>s.path===p)!.sha256);
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),cases:cases.map(c=>({name:c.name,status:c.status})),liveSourcesUnchanged:equal}));
