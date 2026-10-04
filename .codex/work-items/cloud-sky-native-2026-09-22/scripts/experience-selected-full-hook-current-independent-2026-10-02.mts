/** Frozen-artifact independent review. Does not start a renderer or invoke authors' readback helpers. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import ts from 'typescript';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const source='output/playwright/cloud-sky-selected-full-hook-1002-r4',previous='output/playwright/cloud-sky-selected-full-hook-1002-r3';
const out=process.argv[2];assert.match(out??'',/^output\/selected-full-hook-current-independent-1002-r\d+$/u);
assert(!fs.existsSync(path.join(ROOT,out)));fs.mkdirSync(path.join(ROOT,out));
const buffer=(p:string)=>fs.readFileSync(path.resolve(ROOT,p));
const text=(p:string)=>buffer(p).toString('utf8');
const json=(p:string)=>JSON.parse(text(p));
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const binding=(p:string)=>{const b=buffer(p);return{path:p,bytes:b.length,sha256:hash(b)};};
const inputs=new Map<string,ReturnType<typeof binding>>();
const admit=(p:string,expected?:{bytes?:number;sha256?:string})=>{const b=binding(p);if(expected?.sha256)assert.equal(b.sha256,expected.sha256,p);if(expected?.bytes!==undefined)assert.equal(b.bytes,expected.bytes,p);inputs.set(p,b);return b;};
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(ROOT,out,'executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
try{
 const r=json(source+'/result.json');admit(source+'/result.json',{sha256:'97e8638410d407d4ede3b16b42a8890253d300641982bd504de3ee5ebdc983d0'});
 const historical=json(previous+'/result.json');admit(previous+'/result.json',{sha256:'10922aff9d1d6543f036709acc1705f9ce942472f301c9c282fe3ea4d78898cf'});
 const changedSource=r.sourceBindings.filter((b:any)=>historical.sourceBindings.find((a:any)=>a.path===b.path)?.sha256!==b.sha256);
 assert.equal(changedSource.length,1);assert.equal(changedSource[0].path,'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx');assert.equal(changedSource[0].sha256,'0a6c31e6ffe9a91c6aa5cc51959e27d70e9e754108d966ad27bfde0b50c1f24a');
 const inputPathRebase=(b:any)=>({...b,path:b.path.startsWith(previous+'/')?source+b.path.slice(previous.length):b.path});
 assert.deepEqual(r.inputs,historical.inputs.map(inputPathRebase));for(const b of historical.inputs)admit(b.path,b);assert.deepEqual(r.virtualInputs,historical.virtualInputs);
 const before=json(source+'/source-binding-before.json'),after=json(source+'/source-binding-after.json');
 admit(source+'/source-binding-before.json');admit(source+'/source-binding-after.json');admit(source+'/inputs.json');
 assert.equal(path.resolve(before.absWorkingDir),path.resolve(ROOT));assert.equal(r.sourceBindings.length,140);
 assert.deepEqual(r.sourceBindings,before.sourceBindings);assert.deepEqual(r.inputs,before.inputs);
 assert.deepEqual(r.sourceBindings.map((b:any)=>({path:b.path,bytes:b.bytes,sha256:b.sha256})),after.sourceBindings);
 assert.deepEqual(r.inputs.map((b:any)=>({path:b.path,bytes:b.bytes,sha256:b.sha256})),after.inputs);
 assert.deepEqual(before.preserved.map((b:any)=>({path:b.path,sha256:b.sha256})),after.preserved.map((b:any)=>({path:b.path,sha256:b.sha256})));assert.equal(before.preserved.length,6);
 for(const b of [...r.sourceBindings,...r.inputs,...before.preserved])admit(b.path,b);
 for(const b of r.sourceBindings)assert.deepEqual(buffer(source+'/source-inputs/'+b.path),buffer(b.path),'actual captured source '+b.path);
 for(const b of r.sourceBindings)admit(source+'/source-inputs/'+b.path,b);
 const whitelist=['controlled:react','controlled:@tarojs/taro','controlled:@/hooks/use-resource-query','controlled:@/services/api-client','task-page-images.ts'];
 assert.deepEqual(r.virtualInputs.map((v:any)=>v.inputKey).sort(),whitelist.slice().sort());
 assert.deepEqual(r.virtualInputs,before.virtualInputs);const meta=json(source+'/metafile.json');admit(source+'/metafile.json');
 const realMeta=Object.keys(meta.inputs).filter(p=>!whitelist.includes(p));assert.equal(realMeta.length,138);
 for(const key of realMeta){const expected=r.sourceBindings.find((b:any)=>b.metafileInput===key);assert(expected,key);const absolute=path.resolve(ROOT,key);
  assert.equal(expected.resolvedAbsolute,absolute);assert.equal(path.relative(ROOT,absolute).replaceAll('\\','/'),expected.path);}
 admit(source+'/bundle.js',{sha256:r.compiledSha256});admit(source+'/executed-script.mts.txt',{sha256:'d4f2ee1bf8c72979acc32682a0578f592d2aecd91116fb34c325362800cbeeed'});
 for(const n of ['runtime','gpu','journey','pixel-oracle','final'])admit(source+'/executor-'+n+'.js.txt');
 const inventory=json('output/shared-resource-reading-1002-r1/result.json');admit('output/shared-resource-reading-1002-r1/result.json',{sha256:'f654a0161b272ebb6330fafe1c59c307f519309b1b4336cb49fc4a8202fa97f4'});
 assert.equal(inventory.images.length,278);for(const a of inventory.images)admit(a.file,a);
 const priorPublished='output/active-retention-adoption-independent-1002-r2/binding.json';admit(priorPublished,{sha256:'f1ceadaa7ae6b29f2589caae855aa2fe52406397621f85942fd16d336e114c23'});
 const published=json(priorPublished).assets;assert.equal(published.length,281);for(const a of published)admit(a.path,a);
 admit(task+'/evidence/experience-selected-full-hook-independent-review-2026-10-02.md',{sha256:'90008e5a864f0b99acbc1f87c7c9845c19fddcbbb000656ceeb6621102483e9c'});
 admit(task+'/evidence/experience-selected-full-hook-repair-2026-10-02.md',{sha256:'55cc33f73e103135d08dd550406054233652b2328eba445edc6291e9841d1e2c'});
 admit('output/selected-entry-dependency-independent-1002-r3/result.json',{sha256:'3bf1028b48bf7e9be5113aa63c515fd53ec35c21999fb2494b6007d8a7bb6ba1'});

 // Parse current page and independently identify declarations/effects, preserving actual source text.
 const pagePath='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',pageText=text(pagePath);
 const ast=ts.createSourceFile(pagePath,pageText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const all:ts.Node[]=[];const walk=(n:ts.Node)=>{all.push(n);ts.forEachChild(n,walk);};walk(ast);
 const one=(predicate:(n:ts.Node)=>boolean,label:string)=>{const found=all.filter(predicate);assert.equal(found.length,1,label);return found[0]!;};
 const vars=['[deepSkyImageAsset, storeDeepSkyImageAsset]','[canvasDeepSkyImage, storeCanvasDeepSkyImage]',
  'deepSkyImageFileRef','canvasDeepSkyImageRef','deepSkyRecoveryFileRef','setDeepSkyImageAsset','setCanvasDeepSkyImage',
  'retireDeepSkyDecode','[deepSkyImageState, setDeepSkyImageState]','deepSkyImageFailureRef','[deepSkyImageRetry, setDeepSkyImageRetry]',
  'selectedDeepSkyEntry','deepSkyRegistrationReady','desiredDeepSkyImageLevel'];
 const variables=vars.map(name=>one(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name),name).getText(ast));
 const needles=['deepSkyImageFileRef.current?.release();','return startDeepSkyImageRequest({','const subscriptions = owned.map','const image = node.createImage()'];
 const effects=needles.map(needle=>one(n=>ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&Boolean(n.arguments[0]?.getText(ast).includes(needle)),needle).getText(ast)+';');
 const expectedSelected=variables.join('\n')+'\n'+effects.join('\n');
 assert.equal(text(source+'/actual-selected-page-statements.ts.txt'),expectedSelected);admit(source+'/actual-selected-page-statements.ts.txt');
 const entry=text(source+'/extracted-page-entry.ts.txt');admit(source+'/extracted-page-entry.ts.txt');assert(entry.includes(expectedSelected));
 const release=one(n=>ts.isPropertyAssignment(n)&&n.name.getText(ast)==='releaseContext'&&n.initializer.getText(ast).includes('canvasGenerationRef.current++'),'releaseContext') as ts.PropertyAssignment;
 assert.equal(text(source+'/actual-page-release-context.ts.txt'),release.initializer.getText(ast));admit(source+'/actual-page-release-context.ts.txt');assert(entry.includes('const releaseContext='+release.initializer.getText(ast)));
 const creditNames=['deepSkyImagePresented','sdssOpticalStatus','sdssOpticalCurrentImagePresented'];
 const credit=creditNames.map(name=>one(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name),name).getText(ast)).join('\n');
 const submitted=one(n=>ts.isPropertyAssignment(n)&&n.name.getText(ast)==='sdssOpticalImage'&&n.initializer.getText(ast).startsWith('canvasData &&'),'submitted') as ts.PropertyAssignment;
 assert.equal(text(source+'/actual-credit-and-frame-statements.ts.txt'),credit+'\n'+submitted.initializer.getText(ast));admit(source+'/actual-credit-and-frame-statements.ts.txt');
 assert(entry.includes(credit));assert(entry.includes('const frameSdssImage='+submitted.initializer.getText(ast)));
 const controlledCredit=entry.match(/const presentedSceneCurrent=.*?;/u)![0];assert.equal(controlledCredit,'const presentedSceneCurrent=input.pageVisible,nativeCanvasMounted=input.pageVisible,canvasSize=input.canvasSize,canvasError=null,sdssOptical=result.sdssOptical;');
 for(const name of ['optical','sdssOptical','wideField','moonTexture','marsTexture','mercuryTexture','jupiterBands','saturnBands','uranusBands','neptuneBands','galacticImage','artwork','landscapeImage']){
  const d=one(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name),name) as ts.VariableStatement;
  const init=d.declarationList.declarations[0]!.initializer!.getText(ast);assert(entry.includes(`const ${name}=globalThis.__controlled.tag(${JSON.stringify(name)},()=>(${init}));`),name);}
 const hookPath='apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts',loaderPath='apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',cachePath='apps/wechat-miniapp/src/services/sky-public-image-cache.ts';
 const taps=[{path:hookPath,file:'diagnostic-hook.ts.txt',strip:(s:string)=>s.replace('  globalThis.__controlled.hook({active,hash,wanted,byteBudget,retainedFallbackIds,owner:loader.current,value});\n','')},
  {path:cachePath,file:'diagnostic-cache.ts.txt',strip:(s:string)=>s.replace('function createActualSkyPublicImageCache(','export function createSkyPublicImageCache(').replace(/\nexport function createSkyPublicImageCache\(\.\.\.a:Parameters[\s\S]*$/u,'')},
  {path:loaderPath,file:'diagnostic-loader.ts.txt',strip:(s:string)=>s.replace(/    __measure\(\)\{[^\n]*\},\n/u,'')}];
 for(const t of taps){const original=text(t.path),diagnostic=text(source+'/'+t.file);admit(source+'/'+t.file);const info=r.instrumented.find((b:any)=>b.path===t.path);assert(info);assert.equal(hash(original),info.originalSha256);assert.equal(hash(diagnostic),info.taskDiagnosticSha256);assert.equal(t.strip(diagnostic),original,'diagnostic only added read tap '+t.path);}

 const runtime=json(source+'/runtime-metadata-and-offers.json');admit(source+'/runtime-metadata-and-offers.json');assert.equal(runtime.assets.length,116);
 const offers=new Map<string,any>();for(const a of runtime.assets){const b=buffer(a.path);assert.equal(hash(b),a.sha256);assert.equal(b.length,a.bytes);assert(!('base64' in a),'runtime receipt records offer identity, not duplicate encoded payload');admit(a.path,a);assert(!offers.has(a.id));offers.set(a.id,a);}
 for(const route of Object.keys(runtime.metadata)){const m=runtime.metadata[route];const bound=r.inputs.find((b:any)=>b.route===route);assert(bound,route);assert.equal(m.sha256,bound.sha256);assert.equal(m.bytes,bound.bytes);assert.deepEqual(m.body,json(bound.path));}
 const publication=json('workers/miniapp-api/assets/deep-sky/manifest.json'),publicationHash=hash(JSON.stringify(publication));
 const discoveries:any={};for(const ref of ['M:51','M:31']){const name=ref.replace(':','-'),d=json(source+'/discovery-'+name+'.json');admit(source+'/discovery-'+name+'.json');discoveries[ref]=d;
  const p=publication.entries.find((e:any)=>e.objectRef===ref);assert(p);assert.equal(d.publicationHash,publicationHash);assert.equal(d.sourceId,'imagery:'+publication.publicationId+':'+publicationHash);assert.deepEqual(d.center,p.center);assert.equal(d.orientation,p.orientation);
  for(const [level,a] of Object.entries(d.levels) as any[]){const original=p.levels[level],offer=offers.get('selected:'+ref+':'+level);assert(offer);assert.equal(a.downloadUrl,`/v2/sky/deep-sky/${publicationHash}/${original.file}`);for(const k of ['file','bytes','sha256','pixels','fieldDegrees'])assert.equal(a[k],original[k]);assert.equal(a.format,'jpeg');assert.equal(a.validFraction,null);assert.equal(a.coverageState,'NOT_MEASURED');assert(!a.sourceFiniteMask);assert(!a.displaySupport);assert.equal(offer.sha256,a.sha256);}
 }
 const sdss=json(source+'/sdss-M-51-manifest.json'),sdssRaw=json('workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json');admit(source+'/sdss-M-51-manifest.json');
 assert.equal(sdss.publicationHash,hash(JSON.stringify(sdssRaw)));assert.equal(sdss.objectRef,'M:51');
 for(const level of ['OVERVIEW','MEDIUM','DETAIL']){const a=sdss.levels[level],b=sdssRaw.levels[level];for(const k of ['file','pixels','bytes','sha256','fieldDegrees','scaleArcsecPerPixel'])assert.equal(a[k],b[k]);assert.equal(a.downloadUrl,`/v2/sky/sdss-optical/${sdss.publicationHash}/${a.file}`);assert.equal(offers.get('sdss:M:51:'+level).sha256,a.sha256);}

 // Independent PNG chunk integrity, inflate, and inverse filters; arbitrary byte RGBA, no imaging library.
 const crc32=(b:Uint8Array)=>{let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;};
 const decode=(b:Buffer)=>{assert.deepEqual(b.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));let at=8;const idat:Buffer[]=[];let width=0,height=0,done=false;
  while(at<b.length){assert(at+12<=b.length);const n=b.readUInt32BE(at),tag=b.toString('ascii',at+4,at+8),end=at+12+n;assert(end<=b.length);assert.equal(crc32(b.subarray(at+4,end-4)),b.readUInt32BE(end-4));const d=b.subarray(at+8,end-4);if(tag==='IHDR'){width=d.readUInt32BE(0);height=d.readUInt32BE(4);assert.deepEqual([...d.subarray(8)],[8,6,0,0,0]);}if(tag==='IDAT')idat.push(d);at=end;if(tag==='IEND'){assert.equal(n,0);done=true;break;}}
  assert(done);assert.equal(at,b.length);assert.equal(width,390);assert.equal(height,844);const stride=width*4,z=inflateSync(Buffer.concat(idat),{maxOutputLength:(stride+1)*height});assert.equal(z.length,(stride+1)*height);const rgba=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++){const f=z[y*(stride+1)]!;assert(f<=4);for(let x=0;x<stride;x++){const a=x>=4?rgba[y*stride+x-4]!:0,up=y?rgba[(y-1)*stride+x]!:0,ul=x>=4&&y?rgba[(y-1)*stride+x-4]!:0;let p=0;if(f===1)p=a;if(f===2)p=up;if(f===3)p=(a+up)>>1;if(f===4){const q=a+up-ul,da=Math.abs(q-a),db=Math.abs(q-up),dc=Math.abs(q-ul);p=da<=db&&da<=dc?a:db<=dc?up:ul;}rgba[y*stride+x]=(z[y*(stride+1)+1+x]!+p)&255;}}
  return rgba;};
 const pixels=(stem:string,expectedRaw:string,expectedPng:string)=>{const raw=buffer(stem+'.rgba'),png=buffer(stem+'.png');admit(stem+'.rgba',{sha256:expectedRaw});admit(stem+'.png',{sha256:expectedPng});assert.equal(raw.length,390*844*4);const rgba=decode(png);for(let y=0;y<844;y++)assert.deepEqual(rgba.subarray(y*1560,(y+1)*1560),raw.subarray((843-y)*1560,(844-y)*1560));return raw;};
 const difference=(a:Buffer,b:Buffer)=>{assert.equal(a.length,b.length);let changed=0,channels=0,max=0;for(let i=0;i<a.length;i+=4){let any=false;for(let k=0;k<4;k++){const d=Math.abs(a[i+k]!-b[i+k]!);if(d){channels++;any=true;max=Math.max(max,d);}}if(any)changed++;}return{changedPixels:changed,changedChannels:channels,maxChannelDifference:max};};
 const identities=new Map<number,any>();const sourceInfo=(s:any)=>{assert(s&&Number.isInteger(s.objectId));const offer=offers.get(s.offeredId);assert(offer,'actual offered identity '+s.offeredId);for(const k of ['sha256','width','height'])assert.equal(s[k],offer[k]);assert.equal(s.status,'decoded');assert(s.path.includes('-'+s.sha256+'-'));const old=identities.get(s.objectId);const facts={objectId:s.objectId,offeredId:s.offeredId,sha256:s.sha256,path:s.path,width:s.width,height:s.height,status:s.status};if(old)assert.deepEqual(facts,old,'HTMLImage identity stable');else identities.set(s.objectId,facts);return facts;};
 const ledger=new Map<number,number>();const ledgers:any[]=[],rows:any[]=[],normalMetrics:any[]=[],oracleMetrics:any[]=[];
 const inspectLedger=(g:any,label:string,events=g.events)=>{let live=[...ledger.values()].reduce((n,b)=>n+b,0),peak=live,uploads=0,copies=0;const identitiesUsed:any[]=[];
  for(const e of events){sourceInfo(e.source);const id=e.source.objectId,old=ledger.get(id)??0;
   if(e.operation==='source-upload'){assert.equal(old,0,'new full upload '+label);assert.equal(e.bytes,e.source.width*e.source.height*4);ledger.set(id,e.bytes);live+=e.bytes;uploads+=e.bytes;}
   else if(e.operation==='gpu-copy'){assert(old>0);ledger.set(id,old+e.bytes);live+=e.bytes;copies+=e.bytes;}
   else{assert.equal(e.operation,'delete');assert(old>=e.bytes);if(old===e.bytes)ledger.delete(id);else ledger.set(id,old-e.bytes);live-=e.bytes;}
   assert.equal(e.liveBytes,live,label);assert(live>=0);peak=Math.max(peak,live);}
  assert.equal(live,g.liveBytes,label);const retained=new Map<number,number>();for(const e of g.retained){sourceInfo(e.source);assert(!retained.has(e.source.objectId));retained.set(e.source.objectId,e.bytes);}
  assert.deepEqual([...ledger].sort((a,b)=>a[0]-b[0]),[...retained].sort((a,b)=>a[0]-b[0]),label);assert.equal(g.aliveTextures,retained.size);
  for(const d of g.draws??[])if(d.source)identitiesUsed.push(sourceInfo(d.source));const result={label,uploadBytes:uploads,copyBytes:copies,liveBytes:live,peakBytes:peak,drawBoundSources:identitiesUsed.map(s=>s.objectId)};ledgers.push(result);return result;};
 const minFov=text('apps/wechat-miniapp/src/features/sky/sky-zoom.ts').match(/export const SKY_MIN_VERTICAL_FOV_DEG = ([.\d]+);/u);assert(minFov);assert.equal(Number(minFov[1]),.05);
 assert.equal(r.rows.length,6);assert.equal(r.rows[1].condition.fov,.05);let previousControl:any=null;
 for(const row of r.rows){const stem=source+'/'+row.condition.name;admit(stem+'.json');assert.deepEqual(json(stem+'.json'),row);const raw=pixels(stem,row.rgbaSha256,row.pngSha256);
  const prior=historical.rows.find((p:any)=>p.condition.name===row.condition.name);assert(prior);assert.deepEqual(row.condition,prior.condition);
  const priorStem=previous+'/'+row.condition.name;admit(priorStem+'.rgba',{sha256:prior.rgbaSha256});admit(priorStem+'.png',{sha256:prior.pngSha256});assert.deepEqual(raw,buffer(priorStem+'.rgba'),'entire current normal RGBA exact previous source '+row.condition.name);assert.deepEqual(buffer(stem+'.png'),buffer(priorStem+'.png'),'entire PNG exact previous source '+row.condition.name);
  const normalizedPainted=(p:any)=>Object.fromEntries(Object.entries(p).map(([key,value]:[string,any])=>{if(!value)return[key,value];const n={...value};delete n.objectId;delete n.path;return[key,n];}));
  assert.equal(row.passes.length,prior.passes.length);for(let i=0;i<row.passes.length;i++){assert.deepEqual(normalizedPainted(row.passes[i].paintedSources),normalizedPainted(prior.passes[i].paintedSources),'actual painted source SHA/offeredId/size/status preserved');assert.deepEqual(row.passes[i].sourceCredit,prior.passes[i].sourceCredit,'actual page source-credit result preserved');}
  const actual=json(stem+'.actual-observations.json');admit(stem+'.actual-observations.json');assert.deepEqual(Buffer.from(actual.rgba,'base64'),raw);assert.deepEqual(Buffer.from(actual.capture.split(',')[1],'base64'),buffer(stem+'.png'));
  const summary={...row};for(const k of ['rgbaSha256','pngSha256','contribution'])delete summary[k];const original={...actual};delete original.rgba;delete original.capture;assert.deepEqual(summary,original);
  assert(row.condition.fov>=.05);assert.equal(row.gates.selectedReference,row.condition.reference);assert.equal(row.gates.deepSkyRegistrationReady,true);assert.equal(row.gates.localOpticalFixtureEnabled,false);assert.equal(row.gates.wideFieldEnabled,false);assert.equal(row.gates.mode,'DAY');assert.deepEqual(row.gpuFailures,[]);assert.equal(row.ready.hooks.length,13);
  for(const state of [...row.states,row.ready]){const refs=state.hooks.flatMap((h:any)=>h.entries.filter((e:any)=>e.current).map((e:any)=>e.image));for(const s of refs)sourceInfo(s);
   const unique=new Map(refs.map((s:any)=>[s.objectId,s]));if(state.selected.decoded?.current){sourceInfo(state.selected.decoded);unique.set(state.selected.decoded.objectId,state.selected.decoded);}assert.equal(state.decodedOwnerReferences,refs.length);assert.equal(state.decodedUniqueImages,unique.size);assert.equal(state.decodedSourceRgbaModel,[...unique.values()].reduce((n:number,s:any)=>n+s.width*s.height*4,0));assert.equal(state.coldFileOwnerEntries,state.hooks.reduce((n:number,h:any)=>n+h.entries.filter((e:any)=>e.state==='cold').length,0));}
  for(const t of row.transfers){assert(t.completed);if(t.type==='image'){const a=runtime.assets.find((a:any)=>a.url===t.route);assert(a);assert.equal(t.bytes,a.bytes);assert.equal(t.sha256,a.sha256);}else{assert.equal(t.type,'metadata');const m=runtime.metadata[t.route];assert(m);assert.equal(t.bytes,m.bytes);assert.equal(t.sha256,m.sha256);}}
  for(const s of [...row.newDecodes,...row.nativeCurrent])sourceInfo(s);
  const requested=row.condition.reference==='M:51'&&row.condition.pageVisible;
  assert.equal(row.gates.sdssRequested,requested);assert.equal(row.sdssState.requested,requested);
  if(requested){assert.equal(row.sdssState.publicationHash,sdss.publicationHash);const expectedLevel=row.condition.fov>.16?'OVERVIEW':row.condition.fov>.065?'MEDIUM':'DETAIL';assert.equal(row.sdssState.renderedLevel,expectedLevel);assert.equal(row.sdssState.fieldDegrees,sdss.levels[expectedLevel].fieldDegrees);const hook=row.ready.hooks.find((h:any)=>h.name==='sdssOptical');assert.deepEqual(hook.wanted.map((a:any)=>a.id),expectedLevel==='OVERVIEW'?['sdss:M:51:OVERVIEW']:['sdss:M:51:DETAIL','sdss:M:51:MEDIUM']);if(expectedLevel==='DETAIL')assert.equal(row.sdssState.coarser.level,'MEDIUM');}
  const passes=[];for(const p of row.passes){assert.equal(p.glError,0);const m=inspectLedger(p,row.condition.name+'/normal/'+p.pass);assert.equal(m.peakBytes,p.peakBytes);normalMetrics.push(m);passes.push(m);
   const s=p.paintedSources[requested?'sdss':'selected'];assert(s);sourceInfo(s);assert.equal(p.paintedSources[requested?'selected':'sdss'],null);
   assert.equal(s.objectId,requested?row.sdssState.image.objectId:row.ready.selected.decoded.objectId);assert(p.draws.some((d:any)=>d.source?.objectId===s.objectId));
   assert.equal(p.sourceCredit.deepSkyImagePresented,!requested);assert.equal(p.sourceCredit.sdssOpticalStatus,requested?'CREDIT':'NONE');assert.equal(p.sourceCredit.sdssOpticalCurrentImagePresented,requested);
   assert.equal(p.sourceCredit.labels[requested?'sdss':'selected'],r.sourceCreditLabels[requested?'sdss':'selected']);assert.equal(p.sourceCredit.labels[requested?'selected':'sdss'],null);
   if(requested)assert(!p.events.some((e:any)=>e.source.offeredId.startsWith('selected:')));if(p.pass===1)assert.equal(m.uploadBytes,0);}
  let control:any=null;if(row.contribution){assert.equal(row.passes.length,2);const o=json(stem+'.actual-oracle-observations.json');admit(stem+'.actual-oracle-observations.json');
   const absent=pixels(stem+'.source-absent',row.contribution.absentRgbaSha256,row.contribution.absentPngSha256),restored=buffer(stem+'.restored.rgba');admit(stem+'.restored.rgba',{sha256:row.contribution.restoredRgbaSha256});assert.deepEqual(Buffer.from(o.rgba,'base64'),absent);assert.deepEqual(Buffer.from(o.capture.split(',')[1],'base64'),buffer(stem+'.source-absent.png'));assert.deepEqual(Buffer.from(o.restoredRgba,'base64'),restored);assert.deepEqual(restored,raw);
   const diff=difference(raw,absent);assert.equal(diff.changedPixels,row.contribution.changedPixels);assert.equal(diff.maxChannelDifference,row.contribution.maxChannelDifference);assert(diff.changedPixels>0);assert.equal(row.contribution.restoreChangedBytes,0);
   assert.equal(row.contribution.absentError,0);assert.equal(row.contribution.restoredError,0);assert.deepEqual(row.contribution.absentSources,{sdss:null,selected:null});assert.equal(row.contribution.absentCredit.deepSkyImagePresented,false);assert.equal(row.contribution.absentCredit.sdssOpticalStatus,'NONE');assert.deepEqual(row.contribution.restoredSources,row.passes[1].paintedSources);assert.deepEqual(row.contribution.restoredCredit,row.passes[1].sourceCredit);
   for(const k of ['absentGpu','restoredGpu','absentSources','restoredSources','absentCredit','restoredCredit'])assert.deepEqual(o[k],row.contribution[k]);
   const absentM=inspectLedger(o.absentGpu,row.condition.name+'/oracle/absent'),restoredM=inspectLedger(o.restoredGpu,row.condition.name+'/oracle/restored');assert.equal(absentM.peakBytes,o.absentGpu.peakBytes);assert.equal(restoredM.peakBytes,o.restoredGpu.peakBytes);oracleMetrics.push(absentM,restoredM);previousControl=o.restoredGpu;
   control={...diff,restorationFullRgbaExact:true,oracleUploadBytes:absentM.uploadBytes+restoredM.uploadBytes,oracleCopyBytes:absentM.copyBytes+restoredM.copyBytes};
  }else{assert.equal(row.condition.name,'M31-hidden');assert.equal(row.passes.length,0);assert.equal(row.ready.selected.decoded,null);assert.equal(row.ready.decodedSourceRgbaModel,0);assert.equal(row.ready.cache[0].leased,1);assert(row.ready.selected.file.leaseCurrent);assert.equal(row.nativeCurrent.filter((s:any)=>s.current).length,0);
   assert(previousControl);assert.deepEqual(row.gpuAtBoundary.events.slice(0,previousControl.events.length),previousControl.events);const cleanup=inspectLedger(row.gpuAtBoundary,'hide/releaseContext',row.gpuAtBoundary.events.slice(previousControl.events.length));assert.equal(cleanup.liveBytes,0);assert.equal(row.gpuAtBoundary.aliveTextures,0);assert.equal(row.hiddenCredit.deepSkyImagePresented,false);assert.equal(row.hiddenCredit.sdssOpticalStatus,'NONE');}
  rows.push({name:row.condition.name,fov:row.condition.fov,centerAltitudeDeg:Math.asin(row.condition.basis.forward[2])*180/Math.PI,sceneCredit:row.passes.map((p:any)=>p.paintedSources),normalPasses:passes,control,encodedImageTransferBytes:row.transfers.filter((t:any)=>t.type==='image').reduce((n:number,t:any)=>n+t.bytes,0),metadataTransferBytes:row.transfers.filter((t:any)=>t.type==='metadata').reduce((n:number,t:any)=>n+t.bytes,0),readyDecodedModel:row.ready.decodedSourceRgbaModel,fileLeases:row.ready.cache[0].leased,newImageObjects:row.newDecodes.map((s:any)=>s.objectId),rgbaSha256:row.rgbaSha256});
 }
 const m51=r.rows[0],m51Zoom=r.rows[1];assert.equal(m51.ready.selected.requested,'DETAIL');assert.equal(m51Zoom.ready.selected.requested,'DETAIL');assert.deepEqual(m51Zoom.ready.selected.file,m51.ready.selected.file);assert.deepEqual(m51Zoom.ready.selected.decoded,m51.ready.selected.decoded);assert.equal(m51Zoom.newDecodes.filter((s:any)=>s.offeredId.startsWith('selected:')).length,0);assert.equal(m51Zoom.transfers.filter((t:any)=>t.route.startsWith('/v2/sky/deep-sky/')).length,0);
 assert.notEqual(historical.rows[0].ready.selected.decoded.objectId,historical.rows[1].ready.selected.decoded.objectId);
 const old=r.rows[3],fresh=r.rows[5];assert.equal(old.rgbaSha256,fresh.rgbaSha256);assert.notEqual(old.ready.selected.decoded.objectId,fresh.ready.selected.decoded.objectId);assert.equal(old.ready.selected.file.path,fresh.ready.selected.file.path);assert.equal(fresh.transfers.filter((t:any)=>t.type==='image').length,0);assert.equal(fresh.newDecodes.length,1);
 const final=json(source+'/actual-final-owner.json');admit(source+'/actual-final-owner.json');assert.deepEqual(final,r.final);assert(previousControl);assert.deepEqual(final.gpu.events.slice(0,previousControl.events.length),previousControl.events);const finalM=inspectLedger(final.gpu,'final/dispose',final.gpu.events.slice(previousControl.events.length));assert.equal(finalM.liveBytes,0);assert.equal(final.gpu.aliveTextures,0);assert.deepEqual(final.gpu.retained,[]);assert(final.cache.every((c:any)=>c.leased===0&&c.running===0&&c.pending===0&&c.reserved===0));assert.equal(final.nativeCurrent.filter((i:any)=>i.current).length,0);assert.equal(final.counters.decodedPending,0);assert.equal(final.counters.nativeRunning,0);
 for(const n of [1,2]){const p=`output/playwright/cloud-sky-selected-full-hook-1002-r${n}/failed.json`;admit(p);assert.equal(json(p).status,'FAILED');assert(!fs.existsSync(path.join(ROOT,path.posix.dirname(p),'result.json')));}
 const aggregate=(metrics:any[])=>({uploadBytes:metrics.reduce((n,m)=>n+m.uploadBytes,0),copyBytes:metrics.reduce((n,m)=>n+m.copyBytes,0),maximumPeak:Math.max(...metrics.map(m=>m.peakBytes)),maximumFrameEnd:Math.max(...metrics.map(m=>m.liveBytes))});
 const bindings=[...inputs.values()],current=bindings.map(b=>binding(b.path));assert.deepEqual(current,bindings);assert.deepEqual(r.errors,[]);
 const result={status:'INDEPENDENT_CURRENT_PAGE_FULL_PIXELS_LEDGER_AND_LIFECYCLE_READBACK_PASS',frozenAuthorResult:binding(source+'/result.json'),historicalAuthorResult:binding(previous+'/result.json'),changedSourceOnly:changedSource[0],allSixNormalRgbaAndPngExactlyHistorical:true,sameM51DetailOwnership:{currentBitmapObjectId:m51.ready.selected.decoded.objectId,zoomBitmapObjectId:m51Zoom.ready.selected.decoded.objectId,fileExact:true,selectedNewDecodes:0,selectedMetadataOrImageTransfers:0,historicalBitmapIds:[historical.rows[0].ready.selected.decoded.objectId,historical.rows[1].ready.selected.decoded.objectId]},sourceBindings:140,realMetafileInputs:138,explicitVirtualInputs:5,byteOffers:116,currentImageInventoryPreserved:278,previousPublishedInventoryFilesPreserved:281,preservedFiles:6,actualSelectedPageEffects:3,actualUnmountCleanup:1,actualReleaseContextExact:true,sourceDiagnosticsOnly:true,rawMetadataBound:true,jpegCoverage:'UNKNOWN_NOT_MEASURED',rows,normalMetrics:aggregate(normalMetrics),separateConsumerNullOracleMetrics:aggregate(oracleMetrics),finalRawPersistedAndReadBack:true,finalLogicalTextureBytes:0,finalFileLeases:0,finalNativeCurrentReferences:0,oldFailedGenerationsPreserved:[1,2],limits:[
  'Independent static/array/ledger readback only: no new browser, GPU, HTTP, source acquisition, production edit or test-matrix replay. All11 PNGs decode with independent chunk CRC/inflate/filter logic and match complete actual bottom-up RGBA; all5 restored arrays exactly match their normal condition.',
  'Current page selected declarations, three effects, unmount cleanup, releaseContext and full13 hook initializer arguments are exact source AST text. Credit initializers are actual source but presentedSceneCurrent/nativeCanvasMounted=pageVisible and canvasError=null are controlled states, not complete live page lifecycle or error UI acceptance.',
  'M51 source identity belongs actual successful SDSS DETAIL/OVERVIEW, MEDIUM coarser is actually submitted in DETAIL. Decoded M51 W3 is independent and not painted/credited. M31 is actual JPEG W3 12um, not natural-colour optical. Neither JPEG has a measured scientific missing-data mask or validity coverage.',
  'Consumer-null comparisons remove both selected inputs, restore all other actual arguments and do not tune opacity/shader. Full-pixel change includes the actual catalogue core cue suppression change; it proves selected-path effect, not per-source scientific pixel truth. GL draw-bound textures can linger on unrelated primitives and are not source credit.',
  'Oracle removals/restorations alter residency between conditions. Their own allocation/copy/delete costs are excluded from normal10 frame totals, yet subsequent actual journey starts after the exact restoration. No claim that the six states form an uninterrupted user-only timing/cost trace.',
  'Each page.evaluate reserializes the fixed report, changing browser report/catalog object identity. Current objectRef dependencies retain M51 selected bitmap0 across .2->.05 and avoid selected discovery/request/decode at that transition; old r3 bitmap0->4 remains old-generation evidence. This is not a complete live Tanstack timing/cost acceptance. Percondition warm frame identities remain stable.',
  'Hidden PNG is residual canvas readback after context disposal, not a draw of hidden content. Actual hidden credit/decoded current/logical GL are zero and one valid compressed recovery lease remains. New Canvas selected8->9 is a new HTMLImage with same owned file, encoded image requests0 but landscape alpha metadata2/74167B remains.',
  'Controlled React/query/MapFS and desktop HTML decode/software WebGL cannot certify WEAPP callbacks/FS/decode, native/driver/GC memory, frame rate, 200DAU capacity, exact astrometry, source quality or complete interaction acceptance. The frozen report places M51 centre about -6.56deg: valid360 display data, not currently observable above horizon.'
 ]};
 fs.writeFileSync(path.join(ROOT,out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});fs.writeFileSync(path.join(ROOT,out,'binding.json'),JSON.stringify({inputsBefore:bindings,inputsAfter:current,unchanged:true},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({result:binding(out+'/result.json'),binding:binding(out+'/binding.json'),rows:6,normalFrames:normalMetrics.length,normal:result.normalMetrics,oracle:result.separateConsumerNullOracleMetrics}));
}catch(cause){fs.writeFileSync(path.join(ROOT,out,'failed.json'),JSON.stringify({status:'FAILED_INDEPENDENT_SCRIPT',message:String(cause),bindings:[...inputs.values()]},null,2)+'\n',{flag:'wx'});throw cause;}
