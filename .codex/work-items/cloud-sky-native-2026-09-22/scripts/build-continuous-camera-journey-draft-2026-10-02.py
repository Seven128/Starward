"""Task-only source assembly. Produces a guarded draft; never runs browser/GPU."""
from pathlib import Path
import hashlib, json

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
SOURCE=TASK/'scripts/experience-selected-full-hook-resource-journey-2026-10-02.mts'
DEST=TASK/'scripts/experience-continuous-camera-resource-journey-2026-10-02.draft.mts'
original=SOURCE.read_bytes()
assert hashlib.sha256(original).hexdigest()=='d4f2ee1bf8c72979acc32682a0578f592d2aecd91116fb34c325362800cbeeed'
s=original.decode('utf8').replace('\r\n','\n')
changes=[]
def one(old,new,reason):
    global s
    assert s.count(old)==1,(reason,s.count(old))
    s=s.replace(old,new)
    changes.append(reason)

one("const ROOT=fileURLToPath", "// DRAFT ONLY: parent has not authorized its one actual run. No output/browser/GPU can start.\nthrow new Error('DRAFT_ONLY_CONTINUOUS_JOURNEY_NOT_EXECUTION_AUTHORIZED');\nconst ROOT=fileURLToPath", 'Unconditional guard before all output/bootstrap side effects')
s=s.replace('cloud-sky-selected-full-hook-1002-r','cloud-sky-continuous-camera-resource-1002-r')
changes.append('New generation namespace, never overwrite selected/history outputs')
one('inputs.push(originalHarness);', "inputs.push(originalHarness);\nconst selectedBase=await bind(task+'/scripts/experience-selected-full-hook-resource-journey-2026-10-02.mts');\nassert.equal(selectedBase.sha256,'d4f2ee1bf8c72979acc32682a0578f592d2aecd91116fb34c325362800cbeeed');\ninputs.push(selectedBase);", 'Bind original d4 selected harness as reused input')
one('const current=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);', "const current=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);\nconst preparedContextText=JSON.stringify({current,figures,at});\nawait fs.writeFile(path.join(out,'prepared-browser-context.json'),preparedContextText+'\\n',{flag:'wx'});\ninputs.push({...await bind(relative+'/prepared-browser-context.json'),canonicalBodySha256:hash(preparedContextText),transport:'ACTUAL_PROJECT_ATTACH_PRESENT_OUTPUT_SEEDED_ONCE'});", 'Bind actual prepared project/attach/present output and canonical serialization before the one browser seed')
one('const ast=ts.createSourceFile(pagePath,pageSource,', "assert.equal(hash(pageSource),'0a6c31e6ffe9a91c6aa5cc51959e27d70e9e754108d966ad27bfde0b50c1f24a','reviewed current page remains frozen');\nconst ast=ts.createSourceFile(pagePath,pageSource,", 'Guard current reviewed page')
one("export {skyNativeImageIsCurrent} from './${sky}sky-artwork-loader';", "export {skyNativeImageIsCurrent} from './${sky}sky-artwork-loader';\nexport {createSkyBrowsingCamera} from './${sky}sky-browsing-camera';\nexport {resolveSkyCanvasView} from './${sky}sky-canvas-view';\nexport {createSkyViewBasis,unprojectSkyPoint} from './${sky}sky-view-projection';\nexport {clampSkyFieldOfView,skyDomeFieldOfView} from './${sky}sky-zoom';\nexport {NO_SKY_INSETS} from './${sky}sky-viewport';\nexport {skyLandscapeViewOpacity} from './${sky}sky-landscape-visibility';", 'Bundle existing shared camera/view/clamp/landscape owners without implementing substitutes')
one('deepSkyImageAsset,canvasDeepSkyImage,deepSkyImageState,frameSdssImage,', 'deepSkyImageAsset,canvasDeepSkyImage,deepSkyImageState,frameSdssImage,extractedSelectedEntry:selectedDeepSkyEntry,', 'Expose exact extracted selected-entry identity to read-only diagnostics')
one('let cursor=0,dirty=false,currentTag=', 'const objectIds=new WeakMap<object,number>();let nextObjectId=1;\n  let cursor=0,dirty=false,currentTag=', 'Read-only reference ID registry')
one('tag(name:string,fn:Function){', "identity(value:any){if((typeof value!=='object'||value===null)&&typeof value!=='function')return null;let id=objectIds.get(value);if(id===undefined){id=nextObjectId++;objectIds.set(value,id);}return id;},\n   tag(name:string,fn:Function){", 'Reference identities preserve actual objects and release functions')
one('mkdir(o:any){callback(o.success);}', "mkdir(o:any){fsCalls.push({operation:'mkdir',path:o.dirPath});callback(o.success);}", 'Record mkdir I/O without changing callbacks')
one('readdir(o:any){callback(', "readdir(o:any){fsCalls.push({operation:'readdir',path:o.dirPath});callback(", 'Record readdir I/O')
one('stat(o:any){callback(', "stat(o:any){fsCalls.push({operation:'stat',path:o.path});callback(", 'Record stat I/O')
one("nativeRunning--;r.completed=true;o.fail({errMsg:'actual controlled abort callback'});", "nativeRunning--;r.completed=true;(r as any).aborted=true;o.fail({errMsg:'actual controlled abort callback'});", 'Record real controlled request abort callback')
one('file:Boolean(e.file),image:e.loaded?.image??null,current:!!usable(e)', 'file:Boolean(e.file),fileOwnerId:globalThis.__controlled.identity(e.file),fileReleaseId:globalThis.__controlled.identity(e.file?.release),fileLeaseCurrent:e.file?.isCurrent?.()??null,loadedOwnerId:globalThis.__controlled.identity(e.loaded),loadedReleaseId:globalThis.__controlled.identity(e.loaded?.release),loadedLeaseCurrent:e.loaded?.isCurrent?.()??null,image:e.loaded?.image??null,current:!!usable(e)', 'Read-only native loader ownership/file IDs; IDs are owner wrappers, not public lease IDs')
one('const allocated=new Map<any,number>(),', 'const textureIds=new WeakMap<object,number>();let nextTextureId=1;\n  const allocated=new Map<any,number>(),', 'Read-only real GL texture identities')
one('alive.add(t);return t;', 'alive.add(t);if(t)textureIds.set(t,nextTextureId++);return t;', 'Assign identity only to actual created GL texture')
s=s.replace("{operation:'delete',bytes,source:", "{operation:'delete',textureId:textureIds.get(t)??null,bytes,source:")
s=s.replace("{operation:'source-upload',bytes,source:", "{operation:'source-upload',textureId:textureIds.get(t)??null,bytes,source:")
s=s.replace("{operation:'gpu-copy',bytes,source:", "{operation:'gpu-copy',textureId:textureIds.get(t)??null,bytes,source:")
one("draws.push({kind,source:", "draws.push({kind,textureId:t?textureIds.get(t)??null:null,source:", 'Bind actual draw calls to real texture identities')
one('({bytes,source:textureSources.get(t)??null})', '({textureId:textureIds.get(t)??null,bytes,source:textureSources.get(t)??null})', 'Persist actual retained texture identities')

begin=s.index(' const deep=resolveSkyDeepSkyScene(current.skyScene,at)!;')
end=s.index('   const startRequest=w.requests.length',begin)
s=s[:begin]+''' const conditions:any[]=[
  {name:'anchor-north-45',pose:[0,135,0],fov:45,delta:16},
  {name:'east-horizon-45',pose:[90,90,0],fov:45,delta:16},
  {name:'south-below-45',pose:[180,65,0],fov:45,delta:16},
  {name:'south-below-side-45',pose:[180,65,50],fov:45,delta:16},
  {name:'wide-139',pose:[180,65,50],fov:139,delta:16},
  {name:'dome',pose:[180,65,50],fov:'DOME',delta:16},
  {name:'return-start-45',pose:[0,135,0],fov:45,delta:16},
  {name:'return-80-45',pose:[0,135,0],fov:45,delta:80},
  {name:'return-160-45',pose:[0,135,0],fov:45,delta:80},
  {name:'return-240-45',pose:[0,135,0],fov:45,delta:80},
  {name:'anchor-settled-45',pose:[0,135,0],fov:45,delta:16},
  {name:'anchor-warm-45',pose:[0,135,0],fov:45,delta:16},
 ].map(c=>({...c,w3:true,reference:'M:31',pageVisible:true}));
 for(const c of conditions)if(c.fov!=='DOME')assert.equal(clampSkyFieldOfView(c.fov,390,844),c.fov,'camera requested FOV remains reachable');
 await fs.writeFile(path.join(out,'conditions.json'),JSON.stringify({at,conditions,controlledViewport:{width:390,height:844,insets:{top:0,bottom:0}},clock:'controlled monotonic increments only; astronomy instant remains fixed',intent:'follow with controlled auto alignment; no actual sensors/manual gestures'},null,2)+'\\n',{flag:'wx'});
 const stableExecutor=({current,figures,at}:any)=>{
  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
  if(w.stable)throw Error('browser report may be seeded only once');
  w.stable={current,figures,at};w.stableRefs={report:current,scene:current.skyScene,catalog:current.skyScene.catalog,entries:current.skyScene.catalog?.entries,
   deepCatalog:current.skyScene.deepSky?.catalog,deepEntries:current.skyScene.deepSky?.catalog?.entries,figures};
  w.browsingCamera=api.createSkyBrowsingCamera();w.cameraClock=0;w.firstSelectedEntry=undefined;
 };
 await fs.writeFile(path.join(out,'executor-stable-context.js.txt'),stableExecutor.toString(),{flag:'wx'});
 await page.evaluate(stableExecutor,JSON.parse(preparedContextText)); // Only this transport creates browser report/catalog objects.
 const journeyExecutor=async({condition:requestedCondition}:any)=>{
   const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe,{current,figures,at}=w.stable;
   const refs=w.stableRefs;
   if(current!==refs.report||current.skyScene!==refs.scene||current.skyScene.catalog!==refs.catalog||current.skyScene.catalog?.entries!==refs.entries||
     current.skyScene.deepSky?.catalog!==refs.deepCatalog||current.skyScene.deepSky?.catalog?.entries!==refs.deepEntries||figures!==refs.figures)throw Error('actual stable browser reference changed');
   const queuedBasis=api.createSkyViewBasis(...requestedCondition.pose);if(!queuedBasis)throw Error('invalid shared pose input');
   const requestedFov=requestedCondition.fov==='DOME'?api.skyDomeFieldOfView(390,844,api.NO_SKY_INSETS):requestedCondition.fov;
   const live={presentationRevision:1,alignment:{mode:'auto',view:queuedBasis}};
   const resolved=api.resolveSkyCanvasView({queuedOrientationRevision:1,queuedBasis,live,manualBasis:null,tracking:false,
    requestedFov,width:390,height:844,insets:api.NO_SKY_INSETS});
   w.cameraClock+=requestedCondition.delta;
   const camera=w.browsingCamera.update({localView:resolved.localView,intent:resolved.intent,progress:resolved.progress,at:w.cameraClock,reducedMotion:false});
   if(!camera.view)throw Error('shared camera produced unavailable direction');
   const condition={...requestedCondition,requestedFov,fov:resolved.verticalFovDeg,basis:camera.view,center:resolved.center,
    camera:{clock:w.cameraClock,phase:camera.phase,animating:camera.animating,intent:resolved.intent,progress:resolved.progress,
      queuedBasis,resolvedLocalView:resolved.localView,liveAlignment:live.alignment.mode,insets:api.NO_SKY_INSETS}};
   const input={currentViewBasis:condition.basis,presentedFov:condition.fov,presentedCenter:condition.center,wideFieldEnabled:condition.w3,
    canvasNodeRef:w.canvasNodeRef,canvasGenerationRef:w.canvasGenerationRef,canvasRevision:w.canvasRevision,
    reference:condition.reference,pageVisible:true,canvasSize:{width:390,height:844},reducedMotion:false,report:current,figures,at};
   const view={basis:condition.basis,verticalFovDeg:condition.fov,center:condition.center};
   const centreRay=api.unprojectSkyPoint(195,422,view.basis,390,844,view.verticalFovDeg,view.center);
   const groundView={viewOpacity:api.skyLandscapeViewOpacity(view,390,844),visualCenterRay:centreRay,
    visualCenterAltitudeDeg:centreRay?Math.asin(Math.max(-1,Math.min(1,centreRay[2])))*180/Math.PI:null};
''' +s[end:]
changes.append('Replace selected six cases with one 12-state camera journey; browser report/catalog seeded once; actual shared resolver/camera/clamp/centre')
one('const ready=inspect(),passes=[];', '''const referenceIdentity={report:w.identity(current),scene:w.identity(current.skyScene),catalog:w.identity(current.skyScene.catalog),entries:w.identity(current.skyScene.catalog?.entries),
    deepCatalog:w.identity(current.skyScene.deepSky?.catalog),deepEntries:w.identity(current.skyScene.deepSky?.catalog?.entries),selectedEntry:w.identity(result.extractedSelectedEntry),figures:w.identity(figures),
    nativeNode:w.identity(w.canvasNodeRef.current),canvasGeneration:w.canvasGenerationRef.current,canvasRevision:w.canvasRevision};
   if(w.firstSelectedEntry===undefined)w.firstSelectedEntry=result.extractedSelectedEntry;
   if(result.extractedSelectedEntry!==w.firstSelectedEntry)throw Error('actual extracted selected entry changed within stable M31 report');
   const landscapeSummary=(mask:any):any=>!mask?null:{kind:mask.kind,opacity:mask.opacity??1,resource:mask.resource?.id??null,publicationHash:mask.publication?.publicationHash??null,
    background:mask.background?landscapeSummary(mask.background):null,foreground:mask.foreground?landscapeSummary(mask.foreground):null};
   const ready=inspect(),passes=[];''', 'Persist exact browser report/entry/Canvas identities and real ground mask summaries')
one("landscape:snapshot?.view?.landscape?.kind??null,glError:w.gl.getError()", "landscape:snapshot?.view?.landscape?.kind??null,landscapeFacts:{...groundView,readiness:result.landscapeImage.opacity,paintedMask:landscapeSummary(snapshot?.view?.landscape)},glError:w.gl.getError()", 'Separate actual centre-ray view fade, actual readiness and actually painted foreground alpha')
one('w.controlFrame={lastArgs,result,input,pixels};', '// No consumer-null/control frame is installed; this state remains in the same actual rendering journey.', 'Retire diagnostic control-frame setup from the normal journey')
one('return {condition,gates:result.gates,states,ready,passes,sdssState,', 'return {condition,referenceIdentity,groundView,gates:result.gates,states,ready,passes,sdssState,', 'Persist camera/input/reference/fade provenance in each actual observation')

begin=s.index(' const contributionExecutor=()=>{')
end=s.index(' const finalExecutor=async()=>{',begin)
s=s[:begin]+''' for(const condition of conditions){
  const r=await page.evaluate(journeyExecutor,{condition}); // Never retransports report, figures, catalog or astronomy instant.
  await fs.writeFile(path.join(out,condition.name+'.actual-observations.json'),JSON.stringify(r)+'\\n',{flag:'wx'});
  const {rgba,capture,...record}=r,pixels=Buffer.from(rgba,'base64'),png=Buffer.from(capture.split(',')[1],'base64');
  await fs.writeFile(path.join(out,condition.name+'.rgba'),pixels,{flag:'wx'});await fs.writeFile(path.join(out,condition.name+'.png'),png,{flag:'wx'});
  const row={...record,rgbaSha256:hash(pixels),pngSha256:hash(png)};rows.push(row);
  await fs.writeFile(path.join(out,condition.name+'.json'),JSON.stringify(row,null,2)+'\\n',{flag:'wx'});
  assert.equal(row.ready.hooks.length,13);assert.equal(row.gates.localOpticalFixtureEnabled,false);
  assert.equal(row.gates.deepSkyRegistrationReady,true);assert.equal(row.gates.selectedReference,'M:31');
  assert.equal(row.gates.desiredDeepSkyImageLevel,null);assert.equal(row.sdssState.requested,false);
  assert.equal(row.referenceIdentity.canvasGeneration,1);assert.equal(row.referenceIdentity.canvasRevision,1);
  // Warm/return upload, cold decode and pixel equality are observations, never forced success or pressure cap assertions.
  console.log(JSON.stringify({output:relative,name:condition.name,camera:row.condition.camera,groundView:row.groundView,decodedModel:row.ready.decodedSourceRgbaModel,
   imageTransfers:row.transfers.filter((t:any)=>t.type==='image').length,newDecodes:row.newDecodes.length,
   warmUpload:(row.passes[1]?.events??[]).filter((e:any)=>e.operation==='source-upload').reduce((n:number,e:any)=>n+e.bytes,0)}));
 }
''' +s[end:]
changes.append('Delete consumer-null executor, all contribution controls, hide/newCanvas branch and forced selected/credit/warm-zero assertions; preserve actual raw before postconditions')
one('w.renderer.dispose();\n  for(const s of w.slots)', '(globalThis as any).fullHookProbe.releasePageContext(w.renderer,w);\n  for(const s of w.slots)', 'Only final exit uses the actual page release callback and full Hook cleanup')
one("assert.equal(rows[3].rgbaSha256,rows[5].rgbaSha256,'same selected/detail condition recovered onto new controlled Canvas owner');", '''const firstPixels=await fs.readFile(path.join(out,rows[0].condition.name+'.rgba'));
 const comparisons=[];
 for(const index of [10,11]){const p=await fs.readFile(path.join(out,rows[index].condition.name+'.rgba'));let changedBytes=0,changedPixels=0,max=0;
  for(let i=0;i<p.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(p[i+c]-firstPixels[i+c]);if(d){changed=true;changedBytes++;max=Math.max(max,d);}}if(changed)changedPixels++;}
  comparisons.push({name:rows[index].condition.name,changedBytes,changedPixels,maxChannelDifference:max,fullBytesExact:changedBytes===0});}
 await fs.writeFile(path.join(out,'actual-return-observations.json'),JSON.stringify({comparisons,initialReferences:rows[0].referenceIdentity,settledReferences:rows[10].referenceIdentity,warmReferences:rows[11].referenceIdentity,
  scope:'Full return residuals and identities measured after main journey/final raw. No control intervention or assumed bitexactness; encoded source identity does not imply same native bitmap.'},null,2)+'\\n',{flag:'wx'});''', 'Measure full return differences without imposing exactness')
one("status:'PASS',report:await bind(reportPath)", "status:'MEASURED_SOFTWARE_CAMERA_JOURNEY',contractFailures:rows.flatMap(r=>r.passes.filter((p:any)=>p.glError!==0).map((p:any)=>({state:r.condition.name,pass:p.pass,glError:p.glError}))).concat(rows.flatMap(r=>r.gpuFailures)),returnComparisons:comparisons,report:await bind(reportPath)", 'Preserve actual GL/image failures and return observations; measurement status does not certify product acceptance')
start=s.index("  scope:'Task-only current page declarations and actual full hooks/shared cache/runtime/request/loader.")
stop=s.index("'},null,2)+'\\n',{flag:'wx'});",start)
s=s[:start]+"  scope:'One controlled shared-camera sequence, actual page image initializers and complete 13 Hooks/request/file/loader, frozen real encoded bytes and same HTMLImage objects into software WebGL. Same browser report/catalog/figures references and same Canvas/generation until final exit; no consumer-null/control uploads interposed. Follow/auto alignment and NO_SKY_INSETS are controlled geometry inputs, not actual orientation acquisition, manual gesture/Taro paint queue or Tanstack timing. No forced shader/bitmap/readiness/source opacity/budget. Landscape view fade and actual readiness/painted masks recorded separately. M31 remains selected but FOV>=45 leaves selected W3/SDSS/LOCAL inactive; active coarser and landscape otherImages reservation gap not covered. Source RGBA reference, encoded Map FS/cache and logical GL bytes omit physical native/driver/OS/GC memory and overhead. Warm/return equality/costs are observations, not enforced 0/bitexactness or 16MiB cap. Not HTTP egress/200DAU capacity, target WEAPP/FPS/performance, source quality or complete experience/final acceptance. Current a353 active-used allocation-pressure policy remains unchanged."+s[stop:]
changes.append('Replace historical selected-scope/result claims with explicit measured continuous-software scope')

DEST.write_text(s,encoding='utf8',newline='\n') if not DEST.exists() else (_ for _ in ()).throw(FileExistsError(DEST))
receipt={'status':'DRAFT_SOURCE_ONLY_NOT_EXECUTED','base':{'path':str(SOURCE.relative_to(ROOT)).replace('\\','/'),'bytes':len(original),'sha256':hashlib.sha256(original).hexdigest()},
 'draft':{'path':str(DEST.relative_to(ROOT)).replace('\\','/'),'bytes':len(DEST.read_bytes()),'sha256':hashlib.sha256(DEST.read_bytes()).hexdigest()},'changes':changes,
 'noGPU':True,'noProductionChanges':True,'executionGuard':'Unconditional throw before any output/bootstrap; removing it requires the parent-authorized future script revision, new SHA and run receipt.'}
with (TASK/'evidence/experience-continuous-camera-journey-draft-2026-10-02.json').open('x',encoding='utf8') as f:json.dump(receipt,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(receipt,ensure_ascii=False))
