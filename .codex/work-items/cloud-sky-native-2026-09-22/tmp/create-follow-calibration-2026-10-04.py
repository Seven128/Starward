from pathlib import Path
root=Path(__file__).resolve().parents[4];task=root/'.codex/work-items/cloud-sky-native-2026-09-22'
def read(name):return (task/'scripts'/name).read_text(encoding='utf8')
def write(name,text):(task/'scripts'/name).write_text(text,encoding='utf8',newline='')
build=read('build-real-taro-midnight-ruler-2026-10-04.mts').replace('current-execution-state-2026-10-04-r61.json','current-execution-state-2026-10-04-r62.json')
needle='  b.onLoad({filter:/[\\\\/]sky-public-image-cache\\.ts$/}'
pos=build.index(needle)
diagnostic=r'''  b.onLoad({filter:/[\\/]spot-sky-page\.tsx$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');const needle='onClick={() => { if (orientationController.commit()) setSkyControlPanel(null); }}';assert(raw.split(needle).length===2);
   const s=raw.replace(needle,'onClick={(() => { const handler = () => { if (orientationController.commit()) setSkyControlPanel(null); }; globalThis.__recordOriginalSkyConfirm?.(handler); return handler; })()}');
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Original confirm closure body preserved/returned to actual JSX; read-only retention of that exact callback for queued-expiry simulation, not a reused logical node or direct controller call.'});return {contents:s,loader:'tsx'};
  });
  b.onLoad({filter:/[\\/]sky-orientation-controller\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function createSkyOrientationController('));
   const s=raw.replace('export function createSkyOrientationController(','function originalCreateSkyOrientationController(')+
    '\nexport function createSkyOrientationController(options:Parameters<typeof originalCreateSkyOrientationController>[0]){const changed=options.changed;const owner=originalCreateSkyOrientationController({...options,changed:next=>{globalThis.__recordOriginalOrientationSnapshot?.(next);changed(next);}});globalThis.__pageOrientationOwners.push(owner);return owner;}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Original controller body preserved; only read-only snapshot owner and actual changed payload diagnostic.'});return {contents:s,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]device-orientation-view\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function createDeviceOrientationViewTracker('));
   const s=raw.replace('export function createDeviceOrientationViewTracker(','function originalCreateDeviceOrientationViewTracker(')+
    '\nexport function createDeviceOrientationViewTracker(...args:Parameters<typeof originalCreateDeviceOrientationViewTracker>){const owner=originalCreateDeviceOrientationViewTracker(...args),update=owner.updateMotion;owner.updateMotion=(...v)=>{const frame=update(...v);globalThis.__recordOriginalRawPose?.({input:v[0],at:v[1],frame});return frame;};return owner;}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Original tracker body/update preserved; actual accepted raw pose diagnostic before presentation filtering.'});return {contents:s,loader:'ts'};
  });
'''
build=build[:pos]+diagnostic+build[pos:];write('build-real-taro-follow-calibration-2026-10-04.mts',build)
runner=read('experience-real-taro-midnight-ruler-2026-10-04.mts').replace('current-execution-state-2026-10-04-r61.json','current-execution-state-2026-10-04-r62.json')
runner=runner.replace("port.getDeviceInfo=()=>({platform:'devtools'});","port.getDeviceInfo=()=>({platform:'android'});")
needle=" w.pageStack=[];w.lifecycleEvents=[];"
sensor=r'''
 w.sensorPort={motion:new Set(),compass:new Set(),motionRunning:false,compassRunning:false,events:[],current:{alpha:15,beta:-75,gamma:10},feed:true,maxMotionListeners:0,maxCompassListeners:0};
 const sensors=w.sensorPort,log=(kind,extra={})=>{sensors.events.push({kind,phase:w.phase,at:Date.now(),...extra});if(sensors.events.length>2048)sensors.events.shift();};
 port.onDeviceMotionChange=fn=>{sensors.motion.add(fn);sensors.maxMotionListeners=Math.max(sensors.maxMotionListeners,sensors.motion.size);log('on-motion',{listeners:sensors.motion.size});};
 port.offDeviceMotionChange=fn=>{sensors.motion.delete(fn);log('off-motion',{listeners:sensors.motion.size});};
 port.startDeviceMotionListening=async options=>{sensors.motionRunning=true;log('start-motion',{interval:options.interval});options.success?.({});return {};};
 port.stopDeviceMotionListening=async()=>{sensors.motionRunning=false;log('stop-motion');return {};};
 port.onCompassChange=fn=>{sensors.compass.add(fn);sensors.maxCompassListeners=Math.max(sensors.maxCompassListeners,sensors.compass.size);log('on-compass',{listeners:sensors.compass.size});};
 port.offCompassChange=fn=>{sensors.compass.delete(fn);log('off-compass',{listeners:sensors.compass.size});};
 port.startCompass=async()=>{sensors.compassRunning=true;log('start-compass');return {};};
 port.stopCompass=async()=>{sensors.compassRunning=false;log('stop-compass');return {};};
 w.emitSensor=(sample=sensors.current)=>{if(sensors.compassRunning)for(const fn of sensors.compass)fn({direction:sample.alpha,accuracy:5});if(sensors.motionRunning)for(const fn of sensors.motion)fn({...sample});};
 sensors.timer=setInterval(()=>{if(sensors.feed)w.emitSensor();},80);
 globalThis.__pageOrientationOwners=[];w.orientationSnapshots=[];w.rawPoses=[];
 globalThis.__recordOriginalSkyConfirm=handler=>{w.currentOriginalConfirm=handler;};
 globalThis.__recordOriginalOrientationSnapshot=next=>{w.orientationSnapshots.push({phase:w.phase,at:Date.now(),snapshot:structuredClone(next)});if(w.orientationSnapshots.length>2048)w.orientationSnapshots.shift();};
 globalThis.__recordOriginalRawPose=row=>{w.rawPoses.push({phase:w.phase,...structuredClone(row)});if(w.rawPoses.length>2048)w.rawPoses.shift();};
'''
runner=runner.replace(needle,sensor+needle,1)
runner=runner.replace("return {observationContext:api.useAppStore", "return {orientation:globalThis.__pageOrientationOwners.map(o=>o.snapshot()),rawPose:w.rawPoses.at(-1)??null,sensors:{motionRunning:w.sensorPort.motionRunning,compassRunning:w.sensorPort.compassRunning,motionListeners:w.sensorPort.motion.size,compassListeners:w.sensorPort.compass.size,feed:w.sensorPort.feed,current:w.sensorPort.current,maxMotionListeners:w.sensorPort.maxMotionListeners,maxCompassListeners:w.sensorPort.maxCompassListeners},buttons:nodes.filter(n=>n.nodeName==='button').map(n=>({text:n.textContent,props:n.props})),sensorStatus:nodes.find(n=>n.props?.['data-control']==='sky-orientation-sensor')?.props??null,observationContext:api.useAppStore",1)
start=runner.index("await save('execution-mode.json'")
end=runner.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide',start)
journey=r'''
const view=(v:any)=>JSON.parse(v.canvas['data-sky-presented-view']);
const frame=async(name:string)=>{await page.evaluate(n=>globalThis.__controlled.phase=n,name);const v=await stablePaint(v=>v.canvas?.['data-sky-scene-state']==='READY');phase.push({name,...v});return v;};
const poseInputs:any[]=[];const setPose=async(name:string,angles:any)=>{await page.evaluate(({name,angles})=>{const w=globalThis.__controlled;w.phase=name;w.sensorPort.current=angles;w.sensorPort.feed=true;w.emitSensor();},{name,angles});poseInputs.push({name,angles});return frame(name);};
const fullBasis=(v:any)=>v.orientation[0].alignment.view;
const frozenSame=(a:any,b:any)=>assert.deepEqual(view(a).basis,view(b).basis);
const arithmeticDifference=(a:any,b:any)=>Math.max(...['right','up','forward'].flatMap(k=>view(a).basis[k].map((x:number,i:number)=>Math.abs(x-view(b).basis[k][i]))));
const assertRotationArithmetic=(a:any,b:any)=>assert(arithmeticDifference(a,b)<=128*Number.EPSILON,'rotation arithmetic exceeds bounded floating-point roundoff; no pixel tolerance');
const inPanel=async(text:string)=>{const r=await page.evaluate(text=>{const w=globalThis.__controlled,api=globalThis.actualSkyPage,nodes=w.logicalNodes(),panel=nodes.find(n=>n.classList?.contains('sky-calibration-panel'));if(!panel)throw Error('original calibration panel absent');const n=[panel,...panel.getElementsByTagName('*')].filter(n=>n.nodeName==='button'&&n.textContent.trim()===text);if(n.length!==1)throw Error('panel original button not unique '+text);if(n[0].props.disabled)throw Error('panel button disabled '+text);return {text,props:n[0].props,dispatched:n[0].dispatchEvent(api.createEvent('tap'))};},text);actions.push({phase:await page.evaluate(()=>globalThis.__controlled.phase),...r});return r;};
await act('跟随手机');const following=await frame('follow-initial-live');assert.equal(following.orientation[0].state,'READY');assert(!following.text.includes('手动视角，不代表手机朝向'));assert.equal(following.sensors.motionListeners,1);
let frozen:any;
if(['post-confirm-only','outage-source-only','source-reanchor-only'].includes(process.argv[4]??'')){
await act('重新校准');frozen=await frame('resume-calibration-normal-frozen');assert.equal(frozen.orientation[0].alignment.mode,'editing');await capturePixels('software-frozen-normal');
}else{
const rotated=await setPose('follow-full-yaw-pitch-roll',{alpha:80,beta:-45,gamma:35});assert.notDeepEqual(view(rotated).basis,view(following).basis);
// Public pinch changes FOV while following; calibration returns to normal 45 degrees.
await touch('touchstart',touches(120));await touch('touchmove',touches(48));await touch('touchend',[],touches(48));const wide=await frame('follow-public-wide-field');assert(wide.scene.fov>90);assert.equal(wide.sensors.motionListeners,1);
await act('重新校准');frozen=await frame('calibration-wide-to-normal-frozen');assert.equal(frozen.orientation[0].alignment.mode,'editing');assert.equal(frozen.scene.fov,45);frozenSame(frozen,wide);await capturePixels('software-frozen-normal');
const movedWhileFrozen=await setPose('calibration-full-rotation-still-frozen',{alpha:135,beta:-110,gamma:-45});frozenSame(frozen,movedWhileFrozen);assert.notDeepEqual(frozen.rawPose.frame.basis,movedWhileFrozen.rawPose.frame.basis);await capturePixels('software-frozen-moved');
const blockedButtons=movedWhileFrozen.buttons.filter(b=>['时间轴','天体列表','地景','星座插画'].includes(b.text.trim()));assert(blockedButtons.some(b=>b.text.trim()==='时间轴'&&b.props.disabled));await save('calibration-disabled-controls.json',blockedButtons);
await touch('touchstart',[{x:180,y:400}]);await touch('touchmove',[{x:230,y:460}]);await touch('touchend',[],[{x:230,y:460}]);await touch('touchstart',touches(100));await touch('touchmove',touches(25));await touch('touchend',[],touches(25));const blocked=await frame('calibration-original-canvas-inputs-ignored');frozenSame(frozen,blocked);assert.equal(blocked.scene.fov,45);assert.equal(blocked.scene.at,frozen.scene.at);
}
await save('execution-mode.json',{mode:process.argv[4]??'complete',meaning:'post-confirm-only establishes a fresh ordinary follow/freeze and finishes the unclosed confirm/cancel/outage/Source path; previous wide/frozen-move/input-lock stages are not replayed, separate context epoch.'});
// Latest event and actual original confirm tap in the same synchronous turn: no RAF can present it first.
const confirmAtomic=async(name:string,angles:any)=>{const receipt=await page.evaluate(({name,angles})=>{const w=globalThis.__controlled,api=globalThis.actualSkyPage;w.phase=name;w.sensorPort.current=angles;w.emitSensor();const before=globalThis.__pageOrientationOwners[0].snapshot(),raw=w.rawPoses.at(-1),paint=globalThis.__pageCompletedPaints.at(-1),n=w.logicalNodes().filter(n=>n.nodeName==='button'&&n.textContent.trim()==='确定');if(n.length!==1||n[0].props.disabled)throw Error('original confirm button absent/disabled');const dispatched=n[0].dispatchEvent(api.createEvent('tap'));return {before,raw,paintedView:{basis:paint.view.basis,verticalFovDeg:paint.view.verticalFovDeg,center:paint.view.center},dispatched,after:globalThis.__pageOrientationOwners[0].snapshot()};},{name,angles});poseInputs.push({name,angles,atomicConfirm:true});await save(name+'-atomic-confirm.json',receipt);assert(receipt.dispatched);return frame(name);};
let outageFrozen:any;
if(process.argv[4]==='source-reanchor-only'){
await confirmAtomic('source-navigation-initial-confirmed',{alpha:180,beta:-65,gamma:60});
}else{
if(process.argv[4]==='outage-source-only'){outageFrozen=frozen;}else{
const committed=await confirmAtomic('calibration-latest-unrendered-confirmed',{alpha:180,beta:-65,gamma:60});assert.equal(committed.orientation[0].alignment.mode,'aligned');assertRotationArithmetic(frozen,committed);await capturePixels('software-confirmed-no-jump');assert.equal(JSON.parse(await fs.readFile(path.join(out,'software-confirmed-no-jump-pixels.json'),'utf8')).sha256,JSON.parse(await fs.readFile(path.join(out,'software-frozen-normal-pixels.json'),'utf8')).sha256,'actual confirmation pixels differ from frozen capture');
const afterRotation=await setPose('aligned-all-axes-follow',{alpha:225,beta:-120,gamma:-30});assert.notDeepEqual(view(committed).basis,view(afterRotation).basis);await capturePixels('software-aligned-follow');
await act('重新校准');const cancelFrozen=await frame('second-calibration-frozen');const cancelMoved=await setPose('second-calibration-moved-before-cancel',{alpha:260,beta:-50,gamma:45});frozenSame(cancelFrozen,cancelMoved);await act('取消');const cancelled=await frame('second-calibration-cancel-current-old-relation');assert.equal(cancelled.orientation[0].alignment.mode,'aligned');assert.notDeepEqual(view(cancelFrozen).basis,view(cancelled).basis);await capturePixels('software-cancel-current-old-relation');
await act('重新校准');outageFrozen=await frame('third-calibration-before-stream-outage');}
await page.evaluate(()=>{const w=globalThis.__controlled;if(typeof w.currentOriginalConfirm!=='function')throw Error('original confirm callback identity absent');w.pendingOriginalConfirm=w.currentOriginalConfirm;w.pendingConfirmNode=w.logicalNodes().find(n=>n.nodeName==='button'&&n.textContent.trim()==='确定');w.sensorPort.feed=false;w.phase='actual-stream-outage';});
const stale=await wait(v=>v.orientation[0].state==='STALE'&&!v.orientation[0].alignment.ready);phase.push({name:'stream-outage-reference-invalidated',...stale});frozenSame(outageFrozen,stale);assert.equal(stale.orientation[0].alignment.mode,'needs-alignment');assert(!stale.buttons.some(b=>b.text.trim()==='确定'));
const lateConfirm=await page.evaluate(()=>{const w=globalThis.__controlled,before=globalThis.__pageOrientationOwners[0].snapshot(),handler=w.pendingOriginalConfirm,node=w.pendingConfirmNode;w.pendingOriginalConfirm=null;w.pendingConfirmNode=null;handler();return {meaning:'Exact original JSX confirm closure retained before actual 500ms expiry; simulate its queued callback after expiry. Original body executes, not a reused logical node tap or direct controller call.',invokedOriginalHandler:true,currentReusedNodeText:node.textContent,before,after:globalThis.__pageOrientationOwners[0].snapshot()};});assert.deepEqual(lateConfirm.before,lateConfirm.after);await save('late-original-confirm-after-outage.json',lateConfirm);
const fresh=await setPose('fresh-pose-after-outage-needs-alignment',{alpha:300,beta:-95,gamma:20});assert.equal(fresh.orientation[0].alignment.mode,'needs-alignment');assert.equal(fresh.orientation[0].alignment.ready,true);frozenSame(outageFrozen,fresh);
await inPanel('重新校准');await frame('new-reference-calibration-frozen');const reanchored=await confirmAtomic('new-reference-confirmed',{alpha:330,beta:-55,gamma:-55});assert.equal(reanchored.orientation[0].alignment.mode,'aligned');assertRotationArithmetic(outageFrozen,reanchored);
}
const lastFollow=await setPose('new-reference-full-rotation-follow',{alpha:355,beta:-115,gamma:35});await capturePixels('software-new-reference-follow');
// Actual painted pick / original Sources route / original CustomNav Back retain this instance.
const picked=await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,s=globalThis.__pageCompletedPaints.at(-1),o=s.objects.find(o=>o.kind==='STAR'&&o.reference.startsWith('HR:')&&o.x>24&&o.x<366&&o.y>68&&o.y<736);if(!o)throw Error('no current painted BSC choice');const choices=api.pickPaintedSkyObjects(s,{x:o.x,y:o.y,frameAt:s.frameAt,catalogVersion:s.catalogVersion,catalogHash:s.catalogHash});if(!choices.some(c=>c.reference===o.reference))throw Error('painted star not pickable');const n=w.logicalNodes().find(n=>n.nodeName==='canvas');for(const type of ['touchstart','touchend'])n.dispatchEvent(api.createEvent({type,touches:type==='touchstart'?[{x:o.x,y:o.y}]:[],changedTouches:[{x:o.x,y:o.y}]}));return {object:o,choices,frameAt:s.frameAt};});await save('public-pick-action.json',picked);
if(picked.choices.length>1)await page.evaluate(ref=>{const w=globalThis.__controlled,api=globalThis.actualSkyPage,n=w.logicalNodes().filter(n=>n.classList?.contains('sky-object-choice__row')).filter(n=>n.textContent.includes(ref.replace(':',' ')));if(n.length!==1)throw Error('overlap choice not unique');n[0].dispatchEvent(api.createEvent('tap'));},picked.object.reference);
await wait(v=>v.modal?.['data-object-reference']===picked.object.reference&&v.text.includes('来源与许可'));const sourceBefore=await frame('selected-before-original-source');await capturePixels('software-source-before');
await page.evaluate(()=>{globalThis.__controlled.oldMotionListeners=[...globalThis.__controlled.sensorPort.motion];});await act('来源与许可');
const source=await wait(v=>v.activeRoute==='sky/sources/index'&&v.activeText.includes('来源')&&v.sensors.motionListeners===0&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0&&v.owners.every(o=>o.leased===0));phase.push({name:'actual-source-sensors-and-images-retired',...source});
const lateSensor=await page.evaluate(()=>{const w=globalThis.__controlled,before=globalThis.__pageOrientationOwners[0].snapshot();for(const fn of w.oldMotionListeners)fn({alpha:10,beta:-80,gamma:75});return {before,after:globalThis.__pageOrientationOwners[0].snapshot()};});assert.deepEqual(lateSensor.before,lateSensor.after);await save('old-motion-callback-after-source-hidden.json',lateSensor);
const actualBack=await page.evaluate(()=>{const w=globalThis.__controlled,api=globalThis.actualSkyPage,n=w.logicalNodes().filter(n=>n.nodeName==='button'&&n.props.ariaLabel==='返回');if(n.length!==1)throw Error('source CustomNav Back not unique');return {props:n[0].props,dispatched:n[0].dispatchEvent(api.createEvent('tap'))};});await save('actual-source-custom-nav-back.json',actualBack);
const returned=await frame('source-back-new-reference-held-view');assert.equal(returned.activeRoute,'sky/detail/index');assert.equal(returned.orientation[0].alignment.mode,'needs-alignment');assert.equal(returned.orientation[0].alignment.ready,true);frozenSame(sourceBefore,returned);assert.deepEqual(returned.observationContext,sourceBefore.observationContext);assert.equal(returned.sensors.maxMotionListeners,1);assert.equal(returned.sensors.maxCompassListeners,1);await capturePixels('software-source-back-held');
if(process.argv[4]==='source-reanchor-only'){
await act('重新校准');const backFrozen=await frame('source-back-public-calibration-frozen');frozenSame(returned,backFrozen);
const backConfirmed=await confirmAtomic('source-back-latest-reference-confirmed',{alpha:45,beta:-70,gamma:-60});assert.equal(backConfirmed.orientation[0].alignment.mode,'aligned');assertRotationArithmetic(backFrozen,backConfirmed);await capturePixels('software-source-back-confirmed-no-jump');assert.equal(JSON.parse(await fs.readFile(path.join(out,'software-source-back-confirmed-no-jump-pixels.json'),'utf8')).sha256,JSON.parse(await fs.readFile(path.join(out,'software-source-back-held-pixels.json'),'utf8')).sha256,'Source Back new reference confirmation pixels differ from held capture');
await setPose('source-back-full-rotation-follow-restored',{alpha:95,beta:-125,gamma:40});await capturePixels('software-source-back-follow-restored');
await save('actual-navigation.json',await page.evaluate(()=>{const w=globalThis.__controlled;return {sameCurrentSkyInstance:w.nativePage===w.skyPage,sourceRootRemoved:!globalThis.actualSkyPage.document.getElementById(w.sourcesPage.$taroPath),navigation:w.navigationEvents,lifecycle:w.lifecycleEvents};}));
}
await save('sensor-inputs.json',poseInputs);await save('original-orientation-snapshots.json',await page.evaluate(()=>globalThis.__controlled.orientationSnapshots));await save('original-raw-pose-results.json',await page.evaluate(()=>globalThis.__controlled.rawPoses));await save('sensor-port-events.json',await page.evaluate(()=>globalThis.__controlled.sensorPort.events));await save('actual-follow-lifecycle.json',await page.evaluate(()=>globalThis.__controlled.lifecycleEvents));await save('public-canvas-touch-actions.json',gestures);
'''
runner=runner[:start]+journey+runner[end:]
runner=runner.replace("assert.equal(Object.values(final.gpu).reduce((a:any,b:any)=>a+b,0),0);","assert.equal(Object.values(final.gpu).reduce((a:any,b:any)=>a+b,0),0);assert.equal(final.sensors.motionListeners,0);assert.equal(final.sensors.compassListeners,0);assert.equal(final.sensors.motionRunning,false);assert.equal(final.sensors.compassRunning,false);")
runner=runner.replace('ACTUAL_TARO_CIVIL_MIDNIGHT_PUBLIC_RULER_DEVELOPMENT','ACTUAL_TARO_FULL_ROTATION_CALIBRATION_SOURCE_RECOVERY_DEVELOPMENT')
runner=runner.replace("Controlled native APIs/selector geometry/MapFS/image callbacks and browser software WebGL; styles pinned but not composed.","Controlled synthetic Android degree wx sensor streams via original callbacks and public controls; original tracker/controller only diagnosed; selector geometry/MapFS/image callbacks/browser software WebGL, styles pinned but not composed. Not an Android physical-device observation.")
runner=runner.replace("await browser?.close();await backend.close();","if(page)await page.evaluate(()=>clearInterval(globalThis.__controlled.sensorPort.timer)).catch(()=>{});await browser?.close();await backend.close();")
runner=runner.replace("if(page){await save('failed-w3-hook-states.json'","if(page){await save('failed-orientation.json',await page.evaluate(()=>({owners:globalThis.__pageOrientationOwners.map(o=>o.snapshot()),raw:globalThis.__controlled.rawPoses,snapshots:globalThis.__controlled.orientationSnapshots,sensorEvents:globalThis.__controlled.sensorPort.events})));await save('failed-w3-hook-states.json'")
write('experience-real-taro-follow-calibration-2026-10-04.mts',runner)
print('Created task-only original full page follow/calibration lane, no product edit.')
