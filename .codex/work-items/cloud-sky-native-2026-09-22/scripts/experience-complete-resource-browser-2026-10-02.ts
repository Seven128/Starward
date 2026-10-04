/** Task-only browser executors. All functions are injected as their exact saved
 * source; no production owner, policy or budget is replaced by this module. */
export function completeGpuExecutor() {
  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
  const canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false})!;
  if(!gl)throw Error('software WebGL missing');
  const records=new Map<any,any>(),ids=new WeakMap<object,number>(),events:any[]=[],methods:any[]=[],draws:any[]=[];
  let nextId=1,frameStart=0,methodStart=0,drawStart=0,currentMethod:string|null=null;
  const peak={texture:0,buffer:0,renderbuffer:0},framePeak={...peak};
  const bindings=new Map<string,any>(),attachments=new Map<any,Map<number,any>>();
  const totals=()=>{const totals={texture:0,buffer:0,renderbuffer:0};for(const r of records.values())
    if(r.alive&&r.bytes!==null&&r.kind in totals)totals[r.kind as keyof typeof totals]+=r.bytes;return totals;};
  const id=(h:any)=>h?ids.get(h)??null:null;
  const snapshotPeak=()=>{const now=totals();for(const kind of Object.keys(peak) as Array<keyof typeof peak>){peak[kind]=Math.max(peak[kind],now[kind]);framePeak[kind]=Math.max(framePeak[kind],now[kind]);}return now;};
  const note=(row:any)=>events.push({...row,index:events.length,method:currentMethod,live:snapshotPeak()});
  const wrap=(name:string,after:(args:any[],result:any)=>void)=>{
    const original=(gl as any)[name];if(typeof original!=='function')throw Error('required GL API unavailable '+name);
    (gl as any)[name]=function(...args:any[]){try{const result=Reflect.apply(original,this,args);after(args,result);return result;}
      catch(error){note({operation:name,threw:String(error)});throw error;}};
  };
  for(const [kind,suffix] of [['texture','Texture'],['buffer','Buffer'],['framebuffer','Framebuffer'],['renderbuffer','Renderbuffer'],['program','Program'],['shader','Shader']]){
    wrap('create'+suffix,(a,result)=>{if(result){ids.set(result,nextId++);records.set(result,{id:id(result),kind,alive:true,bytes:['texture','buffer','renderbuffer'].includes(kind)?0:null,args:a});}note({operation:'create'+suffix,id:id(result),kind});});
    wrap('delete'+suffix,(a)=>{const row=records.get(a[0]);if(row)row.alive=false;note({operation:'delete'+suffix,id:id(a[0]),kind});});
  }
  wrap('bindTexture',a=>{bindings.set('texture:'+gl.getParameter(gl.ACTIVE_TEXTURE)+':'+a[0],a[1]);note({operation:'bindTexture',unit:gl.getParameter(gl.ACTIVE_TEXTURE),target:a[0],id:id(a[1])});});
  wrap('bindBuffer',a=>{bindings.set('buffer:'+a[0],a[1]);note({operation:'bindBuffer',target:a[0],id:id(a[1])});});
  wrap('bindFramebuffer',a=>{bindings.set('framebuffer:'+a[0],a[1]);note({operation:'bindFramebuffer',target:a[0],id:id(a[1])});});
  const formatBytes=(format:number,type:number)=>{
    const components=format===gl.RGBA?4:format===gl.RGB?3:format===gl.LUMINANCE_ALPHA?2:[gl.ALPHA,gl.LUMINANCE].includes(format)?1:null;
    return type===gl.UNSIGNED_BYTE?components:[gl.UNSIGNED_SHORT_4_4_4_4,gl.UNSIGNED_SHORT_5_5_5_1,gl.UNSIGNED_SHORT_5_6_5].includes(type)?2:type===gl.FLOAT&&components!==null?components*4:null;
  };
  wrap('texImage2D',a=>{const t=gl.getParameter(gl.TEXTURE_BINDING_2D),r=records.get(t),source=a.at(-1),info=w.imageInfo(source);
    const width=a.length===9?a[3]:source.width,height=a.length===9?a[4]:source.height;
    const format=a.length===9?a[6]:a[3],type=a.length===9?a[7]:a[4],bpp=formatBytes(format,type);
    if(r){r.bytes=bpp===null?null:width*height*bpp;r.width=width;r.height=height;r.format=format;r.type=type;r.source=info;}
    note({operation:'source-upload',textureId:id(t),width,height,format,type,bytes:r?.bytes??null,source:info});});
  wrap('copyTexImage2D',a=>{const t=gl.getParameter(gl.TEXTURE_BINDING_2D),r=records.get(t),f=gl.getParameter(gl.FRAMEBUFFER_BINDING),
    source=attachments.get(f)?.get(gl.COLOR_ATTACHMENT0),parent=records.get(source?.object),bpp=formatBytes(a[2],gl.UNSIGNED_BYTE);
    if(r){r.bytes=bpp===null?null:a[5]*a[6]*bpp;r.width=a[5];r.height=a[6];r.format=a[2];r.type=gl.UNSIGNED_BYTE;r.source=parent?.source??null;}
    note({operation:'gpu-copy',textureId:id(t),framebufferId:id(f),attachmentTextureId:id(source?.object),bytes:r?.bytes??null,source:r?.source??null});});
  wrap('bufferData',a=>{const object=gl.getParameter(a[0]===gl.ARRAY_BUFFER?gl.ARRAY_BUFFER_BINDING:gl.ELEMENT_ARRAY_BUFFER_BINDING),r=records.get(object),
    bytes=typeof a[1]==='number'?a[1]:a[1]?.byteLength??0;if(r){r.bytes=bytes;r.target=a[0];r.usage=a[2];}
    note({operation:'bufferData',bufferId:id(object),bytes,target:a[0],usage:a[2]});});
  wrap('bufferSubData',a=>{const object=gl.getParameter(a[0]===gl.ARRAY_BUFFER?gl.ARRAY_BUFFER_BINDING:gl.ELEMENT_ARRAY_BUFFER_BINDING),r=records.get(object),bytes=a[2]?.byteLength??0;
    note({operation:'bufferSubData',bufferId:id(object),offset:a[1],bytes,capacity:r?.bytes??null,outOfRange:r? a[1]+bytes>r.bytes:null});});
  wrap('framebufferTexture2D',a=>{const f=gl.getParameter(gl.FRAMEBUFFER_BINDING);let entries=attachments.get(f);if(!entries)attachments.set(f,entries=new Map());
    entries.set(a[1],{kind:'texture',object:a[3],level:a[4]});note({operation:'attachment',framebufferId:id(f),attachment:a[1],kind:'texture',objectId:id(a[3]),level:a[4]});});
  wrap('framebufferRenderbuffer',a=>{const f=gl.getParameter(gl.FRAMEBUFFER_BINDING);let entries=attachments.get(f);if(!entries)attachments.set(f,entries=new Map());
    entries.set(a[1],{kind:'renderbuffer',object:a[3]});note({operation:'attachment',framebufferId:id(f),attachment:a[1],kind:'renderbuffer',objectId:id(a[3])});});
  wrap('renderbufferStorage',a=>{const object=gl.getParameter(gl.RENDERBUFFER_BINDING),r=records.get(object),bits=a[1]===gl.RGBA4?16:a[1]===gl.RGB565?16:a[1]===gl.RGB5_A1?16:a[1]===gl.DEPTH_COMPONENT16?16:a[1]===gl.STENCIL_INDEX8?8:null;
    if(r){r.width=a[2];r.height=a[3];r.format=a[1];r.bytes=bits===null?null:a[2]*a[3]*bits/8;}
    note({operation:'renderbufferStorage',renderbufferId:id(object),format:a[1],width:a[2],height:a[3],bytes:r?.bytes??null});});
  wrap('shaderSource',a=>{const r=records.get(a[0]);if(r)r.sourceText=a[1];note({operation:'shaderSource',shaderId:id(a[0]),sourceCharacters:a[1].length});});
  wrap('attachShader',a=>{const r=records.get(a[0]);if(r)(r.shaders??=[]).push(id(a[1]));note({operation:'attachShader',programId:id(a[0]),shaderId:id(a[1])});});
  wrap('useProgram',a=>note({operation:'useProgram',programId:id(a[0])}));
  for(const name of ['drawArrays','drawElements'])wrap(name,a=>{const textures=[...bindings].filter(([key])=>key.startsWith('texture:')).map(([key,object])=>({key,textureId:id(object),source:records.get(object)?.source??null}));
    const row={kind:name,args:a,programId:id(gl.getParameter(gl.CURRENT_PROGRAM)),framebufferId:id(gl.getParameter(gl.FRAMEBUFFER_BINDING)),method:currentMethod,textures};draws.push(row);note({operation:name,...row});});
  const actual=api.createSkyGpuRenderer(gl,1,{imageFailed:(image:object)=>{w.gpuFailures??=[];w.gpuFailures.push(w.imageInfo(image));}});
  const summary=(v:any):any=>typeof v==='object'&&v!==null?Array.isArray(v)?{arrayLength:v.length}:ArrayBuffer.isView(v)?{type:v.constructor.name,bytes:v.byteLength}:w.imageInfo(v)??{keys:Object.keys(v)}:v;
  const renderer=new Proxy(actual,{get(target,key,receiver){const value=Reflect.get(target,key,receiver);if(typeof value!=='function')return value;
    return (...args:any[])=>{const previous=currentMethod;currentMethod=String(key);const row:any={method:String(key),arguments:args.map(summary)};methods.push(row);
      try{const result=Reflect.apply(value,target,args);row.result=summary(result);return result;}catch(error){row.error=String(error);throw error;}finally{currentMethod=previous;}};}});
  w.gl=gl;w.renderer=renderer;w.actualRenderer=actual;
  w.gpu={reset(){frameStart=events.length;methodStart=methods.length;drawStart=draws.length;Object.assign(framePeak,totals());},snapshot(){const totalsNow=totals(),all=[...records.values()].map(({sourceText,...r})=>({...r,sourceCharacters:sourceText?.length??null}));
    return {events:events.slice(frameStart),draws:draws.slice(drawStart),methods:methods.slice(methodStart),liveBytes:totalsNow.texture,peakBytes:framePeak.texture,
      aliveTextures:all.filter(r=>r.kind==='texture'&&r.alive).length,retained:all.filter(r=>r.kind==='texture'&&r.alive),
      handleScope:'create/delete request bookkeeping on actual GL handles; delete requests do not establish physical driver reclamation',
      attachmentScope:'references to existing texture/renderbuffer storage; no second allocation or double counting',
      live:totalsNow,framePeak:{...framePeak},totalPeak:{...peak},handles:all,
      attachments:[...attachments].map(([f,entries])=>({framebufferId:id(f),alive:records.get(f)?.alive??false,attachments:[...entries].map(([point,v])=>({point,kind:v.kind,objectId:id(v.object),objectAlive:records.get(v.object)?.alive??false,bytes:records.get(v.object)?.bytes??null}))})),
      ordinaryDrawingBuffer:{width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,rgba8ReadbackModel:gl.drawingBufferWidth*gl.drawingBufferHeight*4,
       redBits:gl.getParameter(gl.RED_BITS),greenBits:gl.getParameter(gl.GREEN_BITS),blueBits:gl.getParameter(gl.BLUE_BITS),alphaBits:gl.getParameter(gl.ALPHA_BITS),depthBits:gl.getParameter(gl.DEPTH_BITS),stencilBits:gl.getParameter(gl.STENCIL_BITS),attributes:gl.getContextAttributes(),DPR:1,
       scope:'single logical RGBA8 readback plane; not physical backing/swapchain/depth/driver allocation'},driverBytes:null,processRssBytes:null};},
    full(){return {events,methods,draws,shaderSources:[...records.values()].filter(r=>r.kind==='shader').map(r=>({id:r.id,source:r.sourceText??null})),snapshot:this.snapshot()};}};
}

export async function completeJourneyExecutor({condition:requested}:any) {
  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe,{current,figures,at}=w.stable;
  w.assertStableOwners();
  const queuedBasis=api.createSkyViewBasis(...requested.pose);if(!queuedBasis)throw Error('invalid proposal pose');
  const live={presentationRevision:1,alignment:{mode:'auto',view:queuedBasis}};
  const resolved=api.resolveSkyCanvasView({queuedOrientationRevision:1,queuedBasis,live,manualBasis:null,tracking:false,
    requestedFov:requested.fov,width:390,height:844,insets:api.NO_SKY_INSETS});
  w.cameraClock+=16;
  const condition={...requested,basis:queuedBasis,fov:resolved.verticalFovDeg,center:resolved.center,requestedCamera:{progress:resolved.progress,intent:resolved.intent}};
  const input={liveBasis:condition.basis,requestedFov:condition.fov,wideFieldEnabled:true,
    canvasNodeRef:w.canvasNodeRef,canvasGenerationRef:w.canvasGenerationRef,canvasRevision:w.canvasRevision,
    reference:condition.reference,pageVisible:true,canvasSize:{width:390,height:844},reducedMotion:false,report:current,figures,at};
  const startRequest=w.requests.length,startDecode=w.images.length,startFs=w.fsCalls.length;
  const states:any[]=[],passes:any[]=[];let result:any,previous='';w.partialPasses=passes;
  const inspect=()=>{
    const hooks=[...w.hooks].map(([name,h]:any)=>({name,active:h.active,hash:h.hash??null,byteBudget:h.byteBudget??16*1024*1024,
      wanted:h.wanted.map((a:any)=>({id:a.id,sha256:a.sha256,bytes:a.bytes,width:a.width,height:a.height})),loading:h.value.loading,failed:h.value.failed,
      ready:[...h.value.images].map(([id,image]:any)=>({id,...w.imageInfo(image)})),entries:h.owner?.__measure().map((e:any)=>({...e,image:e.image?w.imageInfo(e.image):null}))??[]}));
    const references=hooks.flatMap((h:any)=>h.entries.filter((e:any)=>e.current).map((e:any)=>e.image));
    const unique=[...new Map(references.map((i:any)=>[i.objectId,i])).values()] as any[];
    if(result?.canvasDeepSkyImage&&api.skyNativeImageIsCurrent(result.canvasDeepSkyImage.image)){const i=w.imageInfo(result.canvasDeepSkyImage.image);if(!unique.some(j=>j.objectId===i.objectId))unique.push(i);}
    const stellar=result?.stellarSupplement;
    return {qualification:result?.qualification,hooks,decodedSourceRgbaModel:unique.reduce((n,i)=>n+i.width*i.height*4,0),decodedUniqueImages:unique.length,decodedOwnerReferences:references.length,
      selected:{state:result?.deepSkyImageState,image:result?.canvasDeepSkyImage?w.imageInfo(result.canvasDeepSkyImage.image):null},
      sdss:{requested:result?.sdssOptical.requested,loading:result?.sdssOptical.loading,failed:result?.sdssOptical.failed,updateFailed:result?.sdssOptical.updateFailed,
       renderedLevel:result?.sdssOptical.renderedLevel,parent:result?.sdssOptical.coarser?.level??null},
      sao:{loading:stellar?.loading,failed:stellar?.failed,publicationHash:stellar?.publication?.publicationHash??null,points:stellar?.frame?.points.length??0,
       resolvedFrameJsonBytes:stellar?.frame?new TextEncoder().encode(JSON.stringify(stellar.frame)).byteLength:0,
       resolvedTupleNumericPayloadModel:(stellar?.frame?.points.length??0)*3*8,jsObjectBytes:null,
       loader:w.stellarLoaderSnapshot?.()??null,allLoaders:w.stellarLoaders.map((l:any)=>l.__measure()),client:w.saoClientEvents},cache:w.caches.map((c:any)=>c.inspect()),counters:w.counters(),held:w.heldTransfers.length,
      queries:[...w.queries]};
  };
  const commit=()=>{w.assertStableOwners();result=w.commit(()=>api.pageImages(input));api.requestActualPageFrame(result,input,condition,false);const value=inspect(),signature=JSON.stringify(value);if(signature!==previous){states.push(value);previous=signature;}return value;};
  const capture=()=>{const p=new Uint8Array(390*844*4);w.gl.readPixels(0,0,390,844,w.gl.RGBA,w.gl.UNSIGNED_BYTE,p);let raw='';for(let i=0;i<p.length;i+=32768)raw+=String.fromCharCode(...p.subarray(i,i+32768));
    return {rgba:btoa(raw),capture:document.querySelector('canvas')!.toDataURL('image/png')};};
  const submit=(label:string,fromBrowsingTimer=false)=>{
    w.assertStableOwners();const acceptedBefore=w.acceptedCount??0,publishBefore=w.publishCount??0;
    w.gpu.reset();const began=performance.now();if(fromBrowsingTimer){if(!w.runNextBrowsingTimer())throw Error('required actual browsing timer missing');}else api.requestActualPageFrame(result,input,condition);
    w.drainPaintClock();w.gl.finish();
    if(w.acceptedCount!==acceptedBefore+1)throw Error('actual lifecycle did not accept exactly one frame '+label);
    if(w.publishCount!==publishBefore+1||w.lastStageSnapshot!==w.paintedSkyObjectsRef.current)throw Error('new actual stage was not published '+label);
    if(w.presentedSkyFrame?.data!==current||w.presentedSkyFrame?.frameAt!==at)throw Error('accepted page has foreign frame');
    const snapshot=w.paintedSkyObjectsRef.current;
    const record={label,softwareGpuWallMs:performance.now()-began,gpu:w.gpu.snapshot(),glError:w.gl.getError(),
      stagedAccepted:w.acceptanceTrace.splice(0),publication:{lifecycleNotifications:w.acceptedCount,actualPublishCount:w.publishCount,stagedSnapshotId:w.identity(w.lastStageSnapshot),publishedSnapshotId:w.identity(snapshot)},
      actualPaintCamera:w.presentedCamera,browsingCameraState:w.browsingCamera.snapshot(),logicalCameraClock:w.cameraClock,saoSceneObservation:w.saoSceneObservation,
      presented:{frameAt:w.presentedSkyFrame.frameAt,nativeCanvasGeneration:w.presentedSkyFrame.nativeCanvasGeneration,
       sdss:w.presentedSkyFrame.sdssOptical?{kind:w.presentedSkyFrame.sdssOptical.kind,reference:w.presentedSkyFrame.sdssOptical.reference,publicationHash:w.presentedSkyFrame.sdssOptical.publicationHash,
       image:w.imageInfo(w.presentedSkyFrame.sdssOptical.field?.image)}:null,selected:w.presentedSkyFrame.deepSkyImage?w.imageInfo(w.presentedSkyFrame.deepSkyImage.image):null,
       saoPoints:w.presentedSkyFrame.stellarSupplement?.points.length??0,commonOpacity:w.presentedSkyFrame.deepSkyAuxiliaryDecisions},
      snapshot:{frameAt:snapshot?.frameAt,references:snapshot?.objects.map((o:any)=>o.reference)??[],landscape:snapshot?.view?.landscape?.kind??null},
      sourceCredit:api.presentedImageFacts(result,w.presentedSkyFrame,input),state:inspect(),...capture()};passes.push(record);
    if(record.glError)throw Error('actual GL error '+record.glError);return record;
  };
  let returnSubmits=0;
  const wait=async(predicate:(s:any)=>boolean)=>{const deadline=performance.now()+45000;for(;;){const s=commit();if(w.hasBrowsingTimer()){if(++returnSubmits>32)throw Error('actual return submission bound');submit('actual-browsing-return-'+returnSubmits,true);await new Promise(r=>setTimeout(r,8));continue;}if(predicate(s))return s;
    if(performance.now()>deadline)throw Error('bounded readiness '+condition.name+' '+JSON.stringify(s));await new Promise(r=>setTimeout(r,8));}};
  if(requested.refinement)w.holdDetail=true;
  commit();submit(requested.cold?'cold-before-ready':'transition-first-new-view');
  // The actual page declarations now consume the just accepted camera before
  // any asynchronous decode/transport settlement. Observe the new wanted set
  // and actual paint with that pending/partial owner state as well.
  commit();submit('accepted-feedback-pending');
  if(requested.refinement){
    await wait(s=>s.held===1&&s.sdss.renderedLevel==='MEDIUM'&&!s.sao.loading&&!result.landscapeImage.loading&&result.landscapeImage.opacity>=1);
    submit('detail-held-medium-ready');
    w.heldTransfers.shift().fail();
    await wait(s=>s.sdss.updateFailed&&!s.sdss.failed&&!s.sdss.loading&&!s.sao.loading);
    submit('detail-once-failed-coarse-live');
    if(result.sdssOptical.renderedLevel!=='MEDIUM')throw Error('real failure erased independent medium');
    api.retryActualPageSdss(result);commit();
    await wait(s=>!s.sdss.loading&&!s.sdss.failed&&!s.sdss.updateFailed&&s.sdss.renderedLevel==='DETAIL'&&!s.sao.loading&&w.counters().nativeRunning===0&&w.counters().decodedPending===0);
    submit('detail-real-retry-recovered');
  }else await wait(s=>!Object.values(result).some((h:any)=>h&&typeof h==='object'&&h.loading)&&result.deepSkyImageState!=='LOADING'&&w.counters().nativeRunning===0&&w.counters().decodedPending===0&&(!result.landscapeImage.panorama||result.landscapeImage.opacity>=1));
  submit('normal-settled');submit('normal-warm');
  if(result.stellarSupplement.failed||result.stellarSupplement.loading||!result.stellarSupplement.frame)throw Error('actual SAO layer missing');
  w.lastPageInput=input;w.lastPageResult=result;
  return {condition,states,ready:inspect(),passes,gates:result.gates,transfers:w.requests.slice(startRequest),newDecodes:w.images.slice(startDecode).map((r:any)=>({...w.imageInfo(r.image),current:api.skyNativeImageIsCurrent(r.image)})),
    fsOperations:w.fsCalls.slice(startFs),cacheInventory:[...w.files].map(([path,bytes]:any)=>({path,bytes:bytes.byteLength})),gpuFailures:w.gpuFailures??[],
    identity:{report:w.identity(current),figures:w.identity(figures),node:w.identity(w.canvasNodeRef.current),renderer:w.identity(w.renderer),gl:w.identity(w.gl),canvasGeneration:w.canvasGenerationRef.current},
    diagnosticStrongImages:w.images.length,diagnosticOfferedBytes:[...w.offers.values()].reduce((n,a)=>n+a.bytes.byteLength,0)};
}

export async function completeFinalExecutor() {
  const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
  w.assertStableOwners();
  const before={gpu:w.gpu.snapshot(),cache:w.caches.map((c:any)=>c.inspect()),sao:w.stellarLoaders.map((l:any)=>l.__measure())};
  w.lifecycle.hide();w.commit(()=>api.pageImages({...w.lastPageInput,pageVisible:false}));
  for(const s of w.slots)s?.cleanup?.();await Promise.resolve();await Promise.resolve();
  const afterHide={gpu:w.gpu.snapshot(),cache:w.caches.map((c:any)=>c.inspect()),sao:w.stellarLoaders.map((l:any)=>l.__measure()),
    nativeCurrent:w.images.map((r:any)=>({...w.imageInfo(r.image),current:api.skyNativeImageIsCurrent(r.image)})),presented:w.presentedSkyFrame,
    counters:w.counters(),files:[...w.files].map(([path,b]:any)=>({path,bytes:b.byteLength}))};
  const clear=await api.clearSkyPublicImageCache();w.lifecycle.dispose();
  const afterClear={gpu:w.gpu.snapshot(),cache:w.caches.map((c:any)=>c.inspect()),counters:w.counters(),files:[...w.files].map(([path,b]:any)=>({path,bytes:b.byteLength})),sao:w.stellarLoaders.map((l:any)=>l.__measure())};
  w.assertStableOwners({afterRelease:true});
  return {before,afterHide,clear,afterClear,fullGlLedger:w.gpu.full(),saoClientEvents:w.saoClientEvents,
    fsOperations:w.fsCalls,requests:w.requests,bridgeMetadataRetention:w.queryRetention(),scope:'actual page lifecycle release/Hook cleanup and shared public clear over controlled MapFS; logical owner/handle retirement, not physical GC/driver/RSS proof'};
}
