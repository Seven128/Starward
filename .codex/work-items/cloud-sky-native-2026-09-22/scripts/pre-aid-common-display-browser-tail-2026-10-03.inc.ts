  // This fragment is appended to the frozen r4 real-input/GL-instrumentation
  // prelude. The full generated browser source is saved before any execution.
  let failure:string|null=null,renderer:any=null,lifecycle:any=null;
  const cleanups:Array<()=>void>=[],jobs=new Map<number,{callback:()=>void;delay:number}>();
  const deferred:Array<()=>void>=[],sceneStages:any[]=[],loaderChanges:any[]=[],leases=new Map<string,any>();
  let sequence=0,clock=Date.parse(input.at),requestedFov=10,scenario='zoom-10-initial',ordinaryError=false,lateOpaque=false;
  let nativeGeneration=1,reactDirty=false,leaseReleased=0,acceptedRevision=0,lastFacts:any=null,lastStage:any=null,ringDiscs:any[]=[],sceneFinished=false,lastCamera:any=null,unexpectedTimers=0;
  const pageState:any={frame:null,camera:null,size:{width:0,height:0},error:null,published:[]};
  const ref=(current:any)=>({current});
  const env:any={Error,Date:{now:()=>clock},copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,
    liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput,resolvedSkyBodyReferences,resolveSkyCanvasView,skySdssOpticalFrame,
    setTimeout:()=>{unexpectedTimers++;throw Error('unexpected_timer_outside_manual_local_lane');},
    canvasGenerationRef:ref(nativeGeneration),pendingSkyPaintRef:ref(null),paintedSkyObjectsRef:ref(null),
    orientation:{latestPresentation:ref({presentationRevision:0,alignment:{mode:'ready',view:basis}}),presented:ref(null),snapshot:{presentationRevision:0}},
    orientationController:{snapshot:()=>env.orientation.latestPresentation.current},manualBasisRef:ref(basis),manualBasis:basis,
    objectTracking:{snapshot:()=>({target:null})},zoomRef:ref(requestedFov),viewportInsetsRef:ref({}),reducedMotionRef:ref(false),
    browsingCamera:createSkyBrowsingCamera(),browsingTimerRef:ref(null),browsingDrawRef:ref(()=>{throw Error('unexpected_manual_local_animation');}),
    canvasDrawRevisionRef:ref(0),setPresentedSkyFrame:(update:any)=>{
      if(typeof update==='function'){acceptedRevision++;pageState.frame=update(pageState.frame);pageState.published.push({acceptedRevision,frame:pageState.frame,stage:lastStage});}
      else pageState.frame=update;
    },setPresentedCamera:(update:any)=>{pageState.camera=typeof update==='function'?update(pageState.camera):update;},
    setCanvasSize:(update:any)=>{pageState.size=typeof update==='function'?update(pageState.size):update;},setCanvasError:(error:any)=>{pageState.error=error;},
    publishAcceptanceSkySceneInspection:()=>{},EMPTY_SKY_IMAGES:new Map(),deepSkyImageFailureRef:ref(null),setDeepSkyImageState:()=>{},
    artworkFailureRef:ref(()=>{}),sdssOpticalFailureRef:ref(()=>{}),wideFieldFailureRef:ref(()=>{}),opticalFailureRef:ref(()=>{}),
    dispatchSkyHipsImageFailure:()=>{},setSolarLightUnavailable:()=>{},setMoonDiscUnavailable:()=>{},setPlanetDiscUnavailable:()=>{},
    setSunDiscUnavailable:()=>{},setGalacticBandUnavailable:()=>{},setLandscapeUnavailable:()=>{},
    skySceneInspectionOwnerRef:ref('task-common-display'),canvasFrameInfo:{inspection:{spotId:'actual-cached-report'}},
    report:{data:input.report,isError:false},reportData:input.report,devicePose:null,sensorHeadingForScene:null,sensorBasis:null,
    skySceneHasContent,constellationFrame:null,canvasNodeRevision:nativeGeneration,row:{at:input.at},mode:'NIGHT',verticalFovDeg:requestedFov,
    canvasDeepSkyImage:null,sdssOptical:{image:null},artwork:{images:new Map()},constellationsEnabled:false,landscapeEnabled:false,
    coordinateGrids:{horizontal:false,equatorial:false},hipsTiles:[],moonTexture:{image:null},marsTexture:{image:null},mercuryTexture:{image:null},
    jupiterBands:{image:null},saturnBands:{image:null},neptuneBands:{image:null},uranusBands:{image:null},galacticImage:{image:null},
    landscapeImage:{panorama:null,mask:null,opacity:0,loading:false,failed:false},stellarSupplement:{frame:null},previousCanvasModeRef:ref('NIGHT'),
    contextComplete:true,activeContext:{},nativeCanvasMounted:true};
  const realCameraUpdate=env.browsingCamera.update;
  env.browsingCamera.update=(...args:any[])=>{lastCamera=realCameraUpdate(...args);return lastCamera;};
  const actual=(name:string)=>Function('env',`with(env){return ${actualPageExpressions[name]}}`)(env);
  const noImage={image:null,renderedLevel:null,renderedAsset:null,coarser:null,publication};
  const fixedReadyPair=(fine:any=images.get('DETAIL'))=>({image:fine,renderedLevel:'DETAIL',renderedAsset:publication.levels.DETAIL,
    coarser:{image:images.get('OVERVIEW'),level:'OVERVIEW',asset:publication.levels.OVERVIEW},publication});
  let nativeMap:any=new Map(),loader:any;
  // A controlled ready-lease adapter uses already decoded real images. These
  // actual loader/lifetime transitions do not execute HTTP/cache/React Hooks.
  loader=createSkyArtworkLoader({start(asset:any,ready:any){
    const image=images.get(asset.level),lease:any={live:true,handler:null};
    const retire=registerSkyNativeImageLifetime(image!,()=>lease.live);
    lease.signal=()=>{lease.live=false;retire();lease.handler?.();};leases.set(asset.level,lease);
    ready({image,isCurrent:()=>lease.live,release(){lease.live=false;retire();leaseReleased++;},
      onRetire(handler:any){lease.handler=handler;return()=>{lease.handler=null;};}});return()=>{};
  },changed(next:any){nativeMap=next.images;loaderChanges.push({size:nativeMap.size,ids:[...nativeMap.keys()],failed:next.failed,loading:next.loading});
    env.sdssOptical=nativeMap.has('DETAIL')&&nativeMap.has('OVERVIEW')?fixedReadyPair():noImage;reactDirty=true;}});
  loader.update(['DETAIL','OVERVIEW'].map(level=>({...publication.levels[level],id:level,level,width:512,height:512})));
  const blackRetire=registerSkyNativeImageLifetime(images.get('black')!,()=>true);cleanups.push(blackRetire);
  const scalar=()=>skyDeepAuxiliaryDecisionOpacity(pageState.frame?.deepSkyAuxiliaryDecisions,'M:51');
  const dom=()=>{
    const d:any={...env,resolveSkySceneFrame,resolveSkyDeepSkyScene,skyStarAppearance,skySolarLightAt,projectHorizontalPoint,paintedSkyPointVisible,
      skyDeepAuxiliaryDecisionOpacity,paintedData:pageState.frame?.data,paintedAt:pageState.frame?.frameAt,presentedSceneCurrent:!!pageState.frame,
      currentViewBasis:pageState.camera?.basis,canvasSize:pageState.size,presentedFov:pageState.camera?.fov,presentedCenter:pageState.camera?.center,
      presentedSkyFrame:pageState.frame,presentedSkyVisibility:env.paintedSkyObjectsRef.current};
    d.visibleNamedCatalogObjects=Function('env',`with(env){return ${actualPageExpressions.dom}}`)(d);
    d.skySceneReady=skySceneHasContent(pageState.frame?.data,input.at);d.selectionState={object:null};
    d.visibleNamedLabels=Function('env',`with(env){return ${actualPageExpressions.labels}}`)(d);
    // Controlled element adapter executes the actual component and map, exposes
    // its real Button style/opacity. This is not mounted React/Taro or WXML.
    d.React={createElement(type:any,props:any,...children:any[]){const {key,...attributes}=props??{};
      return typeof type==='function'?{...type({...attributes,children}),key}:{type,props:attributes,children,key};}};
    Object.assign(d,{Button:'Button',View:'View',Text:'Text',skyObjectKindLabel,skyObjectMagnitudeLabel,alignmentEditing:false,selectCatalogObject:()=>{}});
    d.SkyOrientationCatalogLabel=Function('env',`with(env){return ${actualPageExpressions.labelFunction}}`)(d);
    d.elements=Function('env',`with(env){return ${actualPageExpressions.labelMap}}`)(d);
    return d;
  };
  const step=()=>{const next=[...jobs].find(([,job])=>job.delay===0);if(!next)throw Error('actual_lifecycle_submission_not_queued');jobs.delete(next[0]);next[1].callback();};
  const accept=()=>{const finish=deferred.shift();if(!finish)throw Error('actual_page_completion_missing');finish();};
  const capture=(name:string)=>{phase=name+'.external-capture';const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    captures.push({name,width:canvas.width,height:canvas.height,rgba:base64(pixels),png:canvas.toDataURL('image/png')});};
  const record=(name:string,extra:any={})=>{
    const rendered=dom(),label=rendered.visibleNamedLabels.find((entry:any)=>entry.reference==='M:51'),element=rendered.elements.find((entry:any)=>entry.key==='M:51'),snapshot=env.paintedSkyObjectsRef.current,target=snapshot?.objects.find((entry:any)=>entry.reference==='M:51');
    const ring=target?ringDiscs.find(args=>args[0]===target.x&&args[1]===target.y&&args[2]===3.2):null;
    const row={name,fov:pageState.camera?.fov,opacity:scalar(),label:label?{reference:label.reference,opacity:label.auxiliaryOpacity}:null,
      element:element?{type:element.type,style:element.props.style}:null,ring:ring?{radius:ring[2],opacity:ring[4]}:null,
      snapshotExact:lastStage?.snapshot===snapshot,stageAfterFinish:lastStage?.finished===true,cameraAnimating:lastCamera?.animating===true,
      cameraViewExact:pageState.camera?.basis===lastCamera?.view,acceptedRevision,regionReference:lastFacts?.regionReference??null,facts:lastFacts,
      actualPickingRetained:!!target&&pickPaintedSkyObjects(snapshot,{x:target.x,y:target.y,frameAt:input.at,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash}).some((object:any)=>object.reference==='M:51'),error:pageState.error,logicalResources:totals(),...extra};rows.push(row);return row;
  };
  const changeFov=(fov:number)=>{clock+=16;requestedFov=fov;env.zoomRef.current=fov;env.verticalFovDeg=fov;};
  const commitReact=()=>{reactDirty=false;actual('effect')();};
  try {
    env.drawSkyScene=(...args:any[])=>{
      const stage=args[8],complete=args[9];lastFacts=null;ringDiscs=[];sceneFinished=false;
      args[8]=(snapshot:any,sources:any)=>{lastStage={snapshot,sources,scenario,finished:sceneFinished};sceneStages.push(lastStage);
        check(scenario+'.stage-after-real-finish-return',sceneFinished);stage(snapshot,sources);};
      args[9]=()=>deferred.push(complete);
      // Normal page has 36 arguments and no science/default port. This explicit
      // task opt-in adapter appends the exact matching capability, preserving
      // all real page callbacks, current frame/generation and Scene consumers.
      args[36]={surface:args[0],reference:publication.objectRef,publicationHash:publication.publicationHash};
      phase=scenario+'.actual-page-Scene';drawSkyScene(...args as any);
    };
    lifecycle=createSkyCanvasLifecycle({measure(done:any){done({width:390,height:844});},createContext(){
      phase=scenario+'.construct';renderer=createSkyGpuRenderer(gl,1,{nativeNavigationHeightPx:8,artworkContributions:{auxiliaryBytesLimit:15803512,maxGroups:1}});
      const disc=renderer.disc;renderer.disc=(...args:any[])=>{ringDiscs.push(args);return disc(...args);};
      const finish=renderer.finish;renderer.finish=()=>{if(lateOpaque)renderer.image(foreground,[390,0,0,844,195,422],1);
        if(ordinaryError){renderer.disc(195,422,3,'#ffffff',1);gl.enable(-1);}finish();sceneFinished=true;};
      renderer.__taskRecordPreAid=(_submission:any,_local:any,facts:any)=>{lastFacts=facts;};return renderer;
    },releaseContext(context:any){context.dispose();renderer=null;env.canvasGenerationRef.current++;env.canvasNodeRevision=env.canvasGenerationRef.current;},
      paint:actual('paint'),sameScene:actual('sameScene'),presented:actual('presented'),invalidated:actual('invalidated'),failed:actual('failed')},
      {schedule(callback:any,delay:number){jobs.set(++sequence,{callback,delay});return sequence;},cancel(id:any){jobs.delete(id);}});
    env.canvasLifecycle=lifecycle;env.draw=actual('draw');env.browsingDrawRef.current=env.draw;lifecycle.ready();
    const lane:any[]=[];
    for(const [index,fov] of [10,2.8,1.8,2.8,10].entries()){
      scenario='zoom-'+index+'-'+fov;changeFov(fov);commitReact();step();const before=acceptedRevision,previous=pageState.frame;accept();
      check(scenario+'.new-stage-actually-published',acceptedRevision===before+1&&lastStage.snapshot===env.paintedSkyObjectsRef.current);
      check(scenario+'.same-source-new-scalar-not-stale',index===0||pageState.frame!==previous);
      const row=record(scenario);lane.push(row);capture(scenario);
      const expected=deepSkyAuxiliaryOpacity(fov,844,cachedEntry.majorAxisArcmin,true);
      check(scenario+'.candidate-curve-common-Canvas-DOM',row.opacity===expected&&
        (expected>.08?row.label?.opacity===expected&&row.element?.style.opacity===expected:row.label===null&&row.element===null)&&
        (expected>.01?row.ring?.opacity===.9*expected:row.ring===null),{expected,row});
      check(scenario+'.both-model-components-positive',lastFacts?.local.fine.photo==='positive'&&lastFacts?.local.coarse.photo==='positive');
      check(scenario+'.independent-picking-retained',row.actualPickingRetained);
      check(scenario+'.actual-local-camera-no-animation',!row.cameraAnimating&&row.cameraViewExact&&unexpectedTimers===0);
    }
    check('same-Canvas-enlarge-shrink-composition',lane[0].opacity===1&&lane[1].opacity>0&&lane[1].opacity<1&&lane[2].opacity===0&&lane[3].opacity===lane[1].opacity&&lane[4].opacity===1);
    scenario='black-fine-coarse-positive';changeFov(1.8);env.sdssOptical=fixedReadyPair(images.get('black'));commitReact();step();accept();
    const black=record(scenario);capture(scenario);check('black-fine-cannot-be-ORed-with-coarse',black.opacity===1&&black.label?.opacity===1&&lastFacts?.local.fine.photo==='unknown'&&lastFacts?.local.coarse.photo==='positive');
    scenario='late-foreground-after-preaid';changeFov(2.8);env.sdssOptical=fixedReadyPair();lateOpaque=true;commitReact();step();accept();
    const late=record(scenario);capture(scenario);check('late-source-credit-cannot-recompute-common-opacity',late.opacity!>0&&late.opacity!<1&&late.element?.style.opacity===late.opacity&&pageState.frame.sdssOptical===null&&lastFacts?.local.fine.photo==='positive');lateOpaque=false;
    scenario='retirement-after-finish-before-accepted';changeFov(2.8);env.sdssOptical=fixedReadyPair();commitReact();step();
    const beforeRetireFacts=lastFacts,stagedOpacity=skyDeepAuxiliaryDecisionOpacity(lastStage.snapshot.deepSkyAuxiliaryDecisions,'M:51');
    // Real onRetire→loader changed maps is synchronous. Controlled React commit
    // deliberately waits until the old finished frame's acceptance, as in the
    // existing common-opacity lifecycle regression. Scalar is historical draw.
    leases.get('DETAIL').signal();leases.get('OVERVIEW').signal();const changedCount=loaderChanges.length;accept();
    const retired=record(scenario,{stagedOpacity,loaderChanged:true,lastSourcesLive:!!liveSkyOpticalCompletion(pageState.frame?.sdssOptical)});capture(scenario);
    check('retired-source-does-not-recompute-captured-scalar',retired.opacity===stagedOpacity&&stagedOpacity!>0&&stagedOpacity!<1&&retired.label?.opacity===stagedOpacity&&pageState.frame.sdssOptical===null&&lastFacts===beforeRetireFacts);
    scenario='retirement-replacement-accepted';check('real-loader-map-absence-needs-replacement',reactDirty&&nativeMap.size===0&&scalar()===stagedOpacity);
    commitReact();step();check('replacement-staging-keeps-old-DOM',scalar()===stagedOpacity);accept();const replacement=record(scenario,{loaderChangedCount:changedCount,leaseReleased});capture(scenario);
    check('actual-page-effect-replacement-restores-both-aids',replacement.opacity===1&&replacement.label?.opacity===1&&replacement.snapshotExact&&leaseReleased===2);
    // Required rejected completion behavior is reused at the same last zoom;
    // no extra image/view matrix and no fake default science admission.
    for(const action of ['hide','resize','remount']){
      scenario='fence-'+action;commitReact();step();const before=acceptedRevision;
      if(action==='hide')lifecycle.hide();else if(action==='resize')lifecycle.resize();else lifecycle.setMounted(false);
      accept();check(scenario+'.no-late-publish',acceptedRevision===before&&pageState.frame===null&&env.paintedSkyObjectsRef.current===null);
      rows.push({name:scenario,rejected:true,acceptedRevision,logicalResources:totals()});
      if(action==='hide')lifecycle.show();else if(action==='remount')lifecycle.setMounted(true);
      env.canvasNodeRevision=env.canvasGenerationRef.current;
    }
    scenario='ordinary-finish-error';ordinaryError=true;commitReact();step();
    check('ordinary-error-rejects-staged-publication',pageState.frame===null&&pageState.error?.includes('sky_gpu_draw_failed')&&deferred.length===0);
    rows.push({name:scenario,error:pageState.error,acceptedRevision,logicalResources:totals()});
  } catch(error){failure=String(error);} finally {lifecycle?.dispose();loader?.dispose();cleanups.forEach(fn=>fn());}
  return{scope:'Task-only model-domain common display candidate. Fixed actual admitted M51 DETAIL/OV ready pair on one Canvas; 10→2.8→1.8→2.8→10 degree manual zoom. Actual Scene/renderer/registration/region/local signal/shared display guard/picking, actual page AST draw/effect/paint/sameScene/presented/invalidated/failed/DOM and actual lifecycle/loader/lifetime execute. Controlled React setters/effect commits, native-ready lease adapter, logical clock/manual intent, explicit appended science capability and software WebGL; real Hooks/HTTP/Taro mounting/WXML/touch/physical device and final policy/default adoption are not executed or certified.',
    basis,at:input.at,publicationHash:publication.publicationHash,checks,rows,captures,events,failure,
    loaderChanges,leaseReleased,unexpectedTimers,final:{...totals(),glError:gl.getError(),contextLost:gl.isContextLost()}};
}
