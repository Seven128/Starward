import fs from 'node:fs';
import assert from 'node:assert/strict';
const folder='.codex/work-items/cloud-sky-native-2026-09-22/scripts/';
let source=fs.readFileSync(folder+'experience-full-hook-resource-journey-2026-10-02.mts','utf8');
const change=(before,after)=>{assert.equal(source.split(before).length,2,'unique replacement '+before.slice(0,90));source=source.replace(before,after);};
change("import {attachSkyCatalog}","import {DeepSkyImageryService} from '../../../../workers/miniapp-api/src/deep-sky-imagery.ts';\nimport {SdssOpticalImageryService} from '../../../../workers/miniapp-api/src/sdss-optical-imagery.ts';\nimport {attachSkyCatalog,resolveSkyDeepSkyScene}");
source=source.replaceAll('cloud-sky-full-hook-resource-1002-r','cloud-sky-selected-full-hook-1002-r');
change("const inputs:any[]=[];",`const inputs:any[]=[];
const preserved=JSON.parse(await fs.readFile(path.join(ROOT,task,'tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const row of preserved)assert.equal((await bind(row.path)).sha256,row.sha256);
assert.equal((await bind(sky+'sky-gpu-textures.ts')).sha256,'a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3');
const originalHarness=await bind(task+'/scripts/experience-full-hook-resource-journey-2026-10-02.mts');
assert.equal(originalHarness.sha256,'b3fbc0747d6b463a265536642a589594a87f5bac0004660635e71aef840e902a');
inputs.push(originalHarness);`);
change("// These actual page consumers are present, but first journey selects no deep-sky target.\nconst selectedManifest=JSON.parse(await fs.readFile(path.join(ROOT,'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json'),'utf8'));\ninputs.push(await bind('workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json'));",`// Offline real publication services, no new HTTP or invented discovery/manifest fields.
const selectedProducer=new DeepSkyImageryService(),sdssProducer=new SdssOpticalImageryService();
for(const reference of ['M:51','M:31']){
 const discovery=selectedProducer.discovery(reference),route='/v2/sky/deep-sky/selected/'+encodeURIComponent(reference)+'?imageVersion=source-finite-v3';
 const body=JSON.stringify(discovery,null,2)+'\\n',p=relative+'/discovery-'+reference.replace(':','-')+'.json';
 await fs.writeFile(path.join(ROOT,p),body,{flag:'wx'});metadata[route]={body:discovery,bytes:Buffer.byteLength(body),sha256:hash(body)};
 inputs.push({...await bind(p),route,transport:'ACTUAL_OFFLINE_CURRENT_PUBLICATION_DISCOVERY'});
 for(const [level,a] of Object.entries(discovery.levels) as any[])await offer('selected:'+reference+':'+level,'deep-sky',{...a,width:a.pixels,height:a.pixels},a.downloadUrl);
}
const sdss=sdssProducer.currentManifest('M:51'),sdssRoute='/v2/sky/sdss-optical/manifest';
const sdssBody=JSON.stringify(sdss,null,2)+'\\n',sdssPath=relative+'/sdss-M-51-manifest.json';
await fs.writeFile(path.join(ROOT,sdssPath),sdssBody,{flag:'wx'});metadata[sdssRoute]={body:sdss,bytes:Buffer.byteLength(sdssBody),sha256:hash(sdssBody)};
inputs.push({...await bind(sdssPath),route:sdssRoute,transport:'ACTUAL_OFFLINE_CURRENT_PUBLICATION_MANIFEST'});
for(const [level,a] of Object.entries(sdss.levels) as any[])await offer('sdss:M:51:'+level,'deep-sky/sdss-m51',{...a,width:a.pixels,height:a.pixels},a.downloadUrl);
for(const p of ['workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/sdss-optical-imagery.ts','workers/miniapp-api/assets/deep-sky/manifest.json','workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json'])inputs.push(await bind(p));`);
change("const entry=`import {useMemo} from 'react';",`const getVariable=(name:string)=>{let found:ts.VariableStatement[]=[];const walk=(n:ts.Node)=>{if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,name);return found[0]!.getText(ast);};
const effectWith=(needle:string)=>{let found:ts.CallExpression[]=[];const walk=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes(needle))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,needle);return found[0]!.getText(ast)+';';};
const selectedStatements=[
 '[deepSkyImageAsset, storeDeepSkyImageAsset]','[canvasDeepSkyImage, storeCanvasDeepSkyImage]',
 'deepSkyImageFileRef','canvasDeepSkyImageRef','deepSkyRecoveryFileRef',
 'setDeepSkyImageAsset','setCanvasDeepSkyImage','retireDeepSkyDecode',
 '[deepSkyImageState, setDeepSkyImageState]','deepSkyImageFailureRef','[deepSkyImageRetry, setDeepSkyImageRetry]',
 'selectedDeepSkyEntry','deepSkyRegistrationReady','desiredDeepSkyImageLevel',
].map(getVariable).join('\\n')+'\\n'+[
 effectWith('deepSkyImageFileRef.current?.release();'),effectWith('return startDeepSkyImageRequest({'),
 effectWith('const subscriptions = owned.map'),effectWith('const image = node.createImage()'),
].join('\\n');
const creditStatements=['deepSkyImagePresented','sdssOpticalStatus','sdssOpticalCurrentImagePresented'].map(getVariable).join('\\n');
let frameSdss:ts.PropertyAssignment[]=[];const walkSdss=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='sdssOpticalImage'&&n.initializer.getText(ast).startsWith('canvasData &&'))frameSdss.push(n);ts.forEachChild(n,walkSdss);};walkSdss(ast);assert.equal(frameSdss.length,1);
const frameSdssExpression=frameSdss[0]!.initializer.getText(ast);
const creditText=(prefix:string)=>{let found:ts.JsxText[]=[];const walk=(n:ts.Node)=>{if(ts.isJsxText(n)&&n.getText(ast).trim().startsWith(prefix))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1);return found[0]!.getText(ast).trim();};
const sourceCreditLabels={selected:creditText('NASA/IPAC IRSA · AllWISE'),sdss:creditText('Sloan Digital Sky Survey · CC BY')};
await fs.writeFile(path.join(out,'actual-selected-page-statements.ts.txt'),selectedStatements,{flag:'wx'});
await fs.writeFile(path.join(out,'actual-credit-and-frame-statements.ts.txt'),creditStatements+'\\n'+frameSdssExpression,{flag:'wx'});
const entry=\`import {useMemo,useState,useRef,useCallback,useEffect} from 'react';
import {deepSkyImageLevelForFov} from './\${sky}sky-zoom';
import {startDeepSkyImageRequest} from './\${sky}deep-sky-image-request';
import {registerSkyNativeImageLifetime} from './\${sky}sky-artwork-loader';
import {beginDeepSkyImageDemand,getDeepSkyImageDiscovery,acquireDeepSkyImage} from './apps/wechat-miniapp/src/services/deep-sky-image-client';
import {sdssOpticalPresentation} from './\${sky}sky-sdss-optical-selection';`);
change(" report={data:{dataState:'FRESH'},isError:false},mode='DAY',deepSkyRegistrationReady=true,\n selectedDeepSkyEntry=null,canvasDeepSkyImage=null,verticalFovDeg=presentedFov,canvasNodeRevision=1,",` report={data:{dataState:'FRESH'},isError:false},mode='DAY',verticalFovDeg=presentedFov,canvasNodeRevision=input.canvasRevision,
 focusedDeepSkyReference=input.reference,canvasGenerationRef=input.canvasGenerationRef,`);
change(" ${pageStatements}\n return",` const recordAcceptanceDiagnostic=(...values:any[])=>globalThis.__controlled.diagnostics.push(values);
 \${selectedStatements}
 \${pageStatements}
 const canvasData=input.report;
 const frameSdssImage=\${frameSdssExpression};
 return`);
change("gates:{selectedReference:null,selectedW3Active:false,",`deepSkyImageAsset,canvasDeepSkyImage,deepSkyImageState,frameSdssImage,
 gates:{selectedReference:selectedDeepSkyEntry?.objectRef??null,deepSkyRegistrationReady,desiredDeepSkyImageLevel,selectedW3Active:Boolean(desiredDeepSkyImageLevel),`);
change("}`;\nawait fs.writeFile(path.join(out,'extracted-page-entry.ts.txt')",`}
export function presentedImageFacts(result:any,presentedSkyFrame:any,input:any){
 const presentedSceneCurrent=input.pageVisible,nativeCanvasMounted=input.pageVisible,canvasSize=input.canvasSize,canvasError=null,sdssOptical=result.sdssOptical;
 \${creditStatements}
 return {deepSkyImagePresented,sdssOpticalStatus,sdssOpticalCurrentImagePresented,
 labels:{selected:deepSkyImagePresented?\${JSON.stringify(sourceCreditLabels.selected)}:null,
 sdss:sdssOpticalStatus==='CREDIT'?\${JSON.stringify(sourceCreditLabels.sdss)}:null}};
}\`;
await fs.writeFile(path.join(out,'extracted-page-entry.ts.txt')`);
change("const pageVisible=true,rawReportData", "const pageVisible=input.pageVisible,rawReportData");
change("const bundle=await build({stdin:","const bundle=await build({absWorkingDir:ROOT,stdin:");
change("const sourceBindings=[];for(const file of Object.keys(bundle.metafile!.inputs))if(!file.startsWith('controlled:')&&!file.startsWith('task-page-')){\n try{sourceBindings.push(await bind(file));}catch{/* Only virtual esbuild input excluded. */}\n}\nsourceBindings.push(await bind(pagePath),await bind(clientPath));",`const sourceBindings:any[]=[],virtualInputs:any[]=[];
for(const inputKey of Object.keys(bundle.metafile!.inputs)){
 if(inputKey==='task-page-images.ts'||['controlled:react','controlled:@tarojs/taro','controlled:@/hooks/use-resource-query','controlled:@/services/api-client'].includes(inputKey)){
  virtualInputs.push({inputKey,reason:inputKey==='task-page-images.ts'?'frozen extracted entry':'explicit frozen target adapter'});continue;
 }
 const absolute=path.resolve(ROOT,inputKey),relativeInput=path.relative(ROOT,absolute).replaceAll('\\\\','/');
 assert.ok(relativeInput&&!relativeInput.startsWith('../')&&!path.isAbsolute(relativeInput),'metafile input must resolve inside approved root '+inputKey);
 sourceBindings.push({...await bind(relativeInput),metafileInput:inputKey,resolvedAbsolute:absolute});
}
for(const p of [pagePath,clientPath])if(!sourceBindings.some(r=>r.path===p))sourceBindings.push(await bind(p));
await fs.writeFile(path.join(out,'metafile.json'),JSON.stringify(bundle.metafile,null,2)+'\\n',{flag:'wx'});
await fs.writeFile(path.join(out,'source-binding-before.json'),JSON.stringify({absWorkingDir:ROOT,sourceBindings,virtualInputs,preserved,inputs},null,2)+'\\n',{flag:'wx'});
for(let i=0;i<sourceBindings.length;i++){
 const p=path.join(out,'source-inputs',sourceBindings[i].path);await fs.mkdir(path.dirname(p),{recursive:true});await fs.copyFile(path.join(ROOT,sourceBindings[i].path),p);
}
for(const p of ['workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/sdss-optical-imagery.ts']){
 const target=path.join(out,'source-inputs',p);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(ROOT,p),target);
}`);
// Freeze the exact evaluated browser executor sources by passing explicit functions.
change(" await page.evaluate(({metadata,assets}:any)=>{"," const runtimeExecutor=({metadata,assets}:any)=>{");
change(" },{metadata,assets});\n await page.addScriptTag({content:compiled});"," };\n await fs.writeFile(path.join(out,'executor-runtime.js.txt'),runtimeExecutor.toString(),{flag:'wx'});\n await page.evaluate(runtimeExecutor,{metadata,assets});\n await page.addScriptTag({content:compiled});");
change("  const canvasNode={createImage(){", "  const makeCanvasNode=()=>({createImage(){");
change("   }});return image;}};", "   }});return image;}});\n  const canvasNode=makeCanvasNode();");
change("w:any={react,Taro,caches,slots,effects,files,offers,requests,fsCalls,images,hooks,canvasNode,queries,", "w:any={react,Taro,caches,slots,effects,files,offers,requests,fsCalls,images,hooks,canvasNode,queries,makeCanvasNode,diagnostics:[],\n   canvasNodeRef:{current:canvasNode},canvasGenerationRef:{current:1},canvasRevision:1,");
change(" await page.evaluate(()=>{\n  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe,canvas=document.querySelector('canvas')!;", " const gpuExecutor=()=>{\n  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe,canvas=document.querySelector('canvas')!;");
change(" });\n const north=createSkyViewBasis", " };\n await fs.writeFile(path.join(out,'executor-gpu.js.txt'),gpuExecutor.toString(),{flag:'wx'});\n await page.evaluate(gpuExecutor);\n const north=createSkyViewBasis");
const conditionStart=source.indexOf(" const north=createSkyViewBasis"),conditionEnd=source.indexOf(" for(const condition of conditions){",conditionStart);
assert(conditionStart>0&&conditionEnd>conditionStart);
source=source.slice(0,conditionStart)+` const deep=resolveSkyDeepSkyScene(current.skyScene,at)!;assert.equal(deep.frame?.state,'AVAILABLE');
 const basisFor=(ref:string)=>{const index=deep.catalog.entries.findIndex(e=>e.objectRef===ref),point=deep.frame!.points!.find(p=>p[0]===index)!;assert.ok(point,ref);return createSkyViewBasis(point[1],90+point[2],0)!;};
 const conditions:any[]=[
  {name:'M51-optical-overview',reference:'M:51',fov:.2,pageVisible:true},
  {name:'M51-optical-detail',reference:'M:51',fov:.04,pageVisible:true},
  {name:'M31-selected-overview',reference:'M:31',fov:8,pageVisible:true},
  {name:'M31-selected-detail',reference:'M:31',fov:1,pageVisible:true},
  {name:'M31-hidden',reference:'M:31',fov:1,pageVisible:false},
  {name:'M31-newCanvas-detail',reference:'M:31',fov:1,pageVisible:true,newCanvas:true},
 ].map(c=>({...c,w3:false,basis:basisFor(c.reference)}));
 const journeyExecutor=async({condition,current,figures,at}:any)=>{
`+source.slice(conditionEnd);
change(" for(const condition of conditions){\n  const r=await page.evaluate(async({condition,current,figures,at}:any)=>{", "");
change("canvasNodeRef:{current:w.canvasNode},canvasSize", "canvasNodeRef:w.canvasNodeRef,canvasGenerationRef:w.canvasGenerationRef,canvasRevision:w.canvasRevision,\n    reference:condition.reference,pageVisible:condition.pageVisible,canvasSize");
change("const startRequest=w.requests.length,startDecode=w.images.length,startFs=w.fsCalls.length;", "const startRequest=w.requests.length,startDecode=w.images.length,startFs=w.fsCalls.length,startDiagnostics=w.diagnostics.length;");
change("return {hooks,decodedOwnerReferences:refs.length", "const selected=result?.canvasDeepSkyImage; if(selected&&api.skyNativeImageIsCurrent(selected.image)){const info=w.imageInfo(selected.image);if(!unique.some((i:any)=>i.objectId===info.objectId))unique.push(info);}\n    return {hooks,selected:{state:result?.deepSkyImageState,requested:result?.gates.desiredDeepSkyImageLevel,file:result?.deepSkyImageAsset?{reference:result.deepSkyImageAsset.reference,level:result.deepSkyImageAsset.level,path:result.deepSkyImageAsset.tempFilePath,publicationHash:result.deepSkyImageAsset.publicationHash,sourceId:result.deepSkyImageAsset.sourceId,leaseCurrent:result.deepSkyImageAsset.isCurrent()}:null,decoded:selected?{reference:selected.reference,level:selected.level,...w.imageInfo(selected.image),current:api.skyNativeImageIsCurrent(selected.image)}:null},decodedOwnerReferences:refs.length");
change("||w.counters().decodedPending||w.counters().nativeRunning;", "||result.deepSkyImageState==='LOADING'||w.counters().decodedPending||w.counters().nativeRunning;");
change("if(!loading&&(!result.landscapeImage.panorama||result.landscapeImage.opacity>=1))break;", "if((!condition.pageVisible||!loading)&&(!result.landscapeImage.panorama||result.landscapeImage.opacity>=1))break;");
change("for(let pass=0;pass<3;pass++){", "for(let pass=0;pass<(condition.pageVisible?2:0);pass++){");
change("12:condition.basis,13:input.presentedCenter", "11:result.canvasDeepSkyImage,12:condition.basis,13:input.presentedCenter");
change("28:result.jupiterBands.image,29:result.saturnBands.image,32", "28:result.jupiterBands.image,29:result.saturnBands.image,30:result.frameSdssImage,32");
change("const gpu=w.gpu.snapshot();passes.push", `const presentedSkyFrame={deepSkyImage:paintedSources?.deepSkyImage===result.canvasDeepSkyImage?.image?result.canvasDeepSkyImage:null,
     sdssOpticalImage:paintedSources?.sdssOpticalImage===result.frameSdssImage?.image?result.frameSdssImage:
      paintedSources?.sdssOpticalImage===result.frameSdssImage?.coarser?.image?{...result.frameSdssImage,...result.frameSdssImage.coarser,coarser:null}:null};
    const sourceCredit=api.presentedImageFacts(result,presentedSkyFrame,input);
    const gpu=w.gpu.snapshot();passes.push`);
change("pass,softwareGpuWallMs:elapsed,...gpu", "pass,softwareGpuWallMs:elapsed,...gpu,sourceCredit");
change("return {condition,gates:result.gates,states,ready,passes,transfers", "return {condition,gates:result.gates,states,ready,passes,hiddenCredit:!condition.pageVisible?api.presentedImageFacts(result,null,input):null,diagnostics:w.diagnostics.slice(startDiagnostics),nativeCurrent:w.images.map((i:any)=>({...w.imageInfo(i.image),current:api.skyNativeImageIsCurrent(i.image)})),transfers");
change("  },{condition,current,figures,at});\n  const {rgba", `  };
 await fs.writeFile(path.join(out,'executor-journey.js.txt'),journeyExecutor.toString(),{flag:'wx'});
 for(const condition of conditions){
  if(!condition.pageVisible)await page.evaluate(()=>{const w=(globalThis as any).__controlled;w.renderer.dispose();});
  if(condition.newCanvas){await page.evaluate(()=>{const w=(globalThis as any).__controlled;document.querySelector('canvas')!.remove();
   const canvas=document.createElement('canvas');canvas.id='sky';canvas.width=390;canvas.height=844;document.body.append(canvas);
   w.canvasNode=w.makeCanvasNode();w.canvasNodeRef.current=w.canvasNode;w.canvasRevision++;w.canvasGenerationRef.current=w.canvasRevision;});await page.evaluate(gpuExecutor);}
  const r=await page.evaluate(journeyExecutor,{condition,current,figures,at});
  const {rgba`);
const assertStart=source.indexOf("  assert.equal(row.gates.sdssRequested,false);"),assertEnd=source.indexOf("  console.log(JSON.stringify",assertStart);
assert(assertStart>0&&assertEnd>assertStart);
source=source.slice(0,assertStart)+`  assert.equal(row.gates.localOpticalFixtureEnabled,false);assert.equal(row.gates.deepSkyRegistrationReady,true);
  assert.equal(row.gates.selectedReference,condition.reference);
  if(condition.pageVisible){
   assert.equal(row.ready.selected.state,'READY');assert.equal(row.ready.selected.file.leaseCurrent,true);
   for(const pass of row.passes){
    if(condition.reference==='M:51'){
     assert.ok(pass.paintedSources.sdss);assert.equal(pass.paintedSources.selected,null);assert.equal(pass.sourceCredit.sdssOpticalStatus,'CREDIT');assert.equal(pass.sourceCredit.deepSkyImagePresented,false);
     assert(!pass.events.some((e:any)=>e.operation==='source-upload'&&e.source?.offeredId?.startsWith('selected:')));
    }else{
     assert.equal(pass.paintedSources.sdss,null);assert.ok(pass.paintedSources.selected);assert.equal(pass.sourceCredit.deepSkyImagePresented,true);assert.equal(pass.sourceCredit.sdssOpticalStatus,'NONE');
    }
    assert.ok(pass.draws.some((d:any)=>d.source?.objectId===(pass.paintedSources.sdss??pass.paintedSources.selected).objectId));
   }
   assert.equal(row.passes[1].events.filter((e:any)=>e.operation==='source-upload').length,0,'active used retains actual warmed scene');
  }else{
   assert.equal(row.ready.selected.decoded,null);assert.equal(row.hiddenCredit.deepSkyImagePresented,false);assert.equal(row.hiddenCredit.sdssOpticalStatus,'NONE');
   assert.equal(row.nativeCurrent.filter((i:any)=>i.current&&i.offeredId?.startsWith('selected:')).length,0);
  }
`+source.slice(assertEnd);
change("row.passes[0].peakBytes,", "row.passes[0]?.peakBytes??0,");
change("row.passes[2].events.filter", "(row.passes[1]?.events??[]).filter");
change(" const final=await page.evaluate(async()=>{", " const finalExecutor=async()=>{");
change("counters:w.counters()};});\n assert.equal", "counters:w.counters(),nativeCurrent:w.images.map((i:any)=>({...w.imageInfo(i.image),current:(globalThis as any).fullHookProbe.skyNativeImageIsCurrent(i.image)}))};};\n await fs.writeFile(path.join(out,'executor-final.js.txt'),finalExecutor.toString(),{flag:'wx'});\n const final=await page.evaluate(finalExecutor);\n assert.equal");
change("assert.equal(rows[0].rgbaSha256,rows[4].rgbaSha256,'same condition return full RGBA');", "assert.equal(rows[3].rgbaSha256,rows[5].rgbaSha256,'same selected/detail condition recovered onto new controlled Canvas owner');\n assert.equal(final.cache[0].leased,0);assert.equal(final.nativeCurrent.filter((i:any)=>i.current).length,0);");
change("assert.deepEqual(await bind(r.path),r,'production source frozen during harness');", "assert.deepEqual(await bind(r.path),{path:r.path,bytes:r.bytes,sha256:r.sha256},'production source frozen during harness');");
change(" await fs.writeFile(path.join(out,'result.json')", ` const afterSources=await Promise.all(sourceBindings.map(r=>bind(r.path))),afterInputs=await Promise.all(inputs.filter(r=>r.path).map(r=>bind(r.path))),afterPreserved=await Promise.all(preserved.map((r:any)=>bind(r.path)));
 assert.deepEqual(afterPreserved,preserved);
 await fs.writeFile(path.join(out,'source-binding-after.json'),JSON.stringify({sourceBindings:afterSources,inputs:afterInputs,preserved:afterPreserved},null,2)+'\\n',{flag:'wx'});
 await fs.writeFile(path.join(out,'result.json')`);
change("compiledSha256:hash(compiled),inputs,rows,final,errors,", "compiledSha256:hash(compiled),virtualInputs,sourceCreditLabels,inputs,rows,final,errors,");
change("SDSS/selected/LOCAL remain explicit inactive actual gates.", "Selected M51/M31 qualification, actual discovery/client/request/page effects and SDSS full hook active; real page initializer controls and scene priority. Hidden page owner + new controlled native-node/generation and fresh software WebGL canvas recovery; page lifecycle and real WEAPP hide/newCanvas integration remain unverified. LOCAL explicit inactive. Current active-used a353 retention policy.");
fs.writeFileSync(folder+'experience-selected-full-hook-resource-journey-2026-10-02.mts',source,{flag:'wx'});
