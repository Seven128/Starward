from pathlib import Path
root=Path(__file__).resolve().parents[4]
scripts=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts'
build=(scripts/'build-real-taro-follow-calibration-2026-10-04.mts').read_text(encoding='utf8')
build=build.replace('current-execution-state-2026-10-04-r62.json','current-execution-state-2026-10-04-r63.json')
(scripts/'build-real-taro-solar-public-2026-10-04.mts').write_text(build,encoding='utf8')
s=(scripts/'experience-real-taro-follow-calibration-2026-10-04.mts').read_text(encoding='utf8')
s=s.replace('current-execution-state-2026-10-04-r62.json','current-execution-state-2026-10-04-r63.json')
s=s.replace('let failOpticalDetail=true;', 'let failMoonImage=true;')
start=s.index(' if(failOpticalDetail&&');end=s.index('\n const response=',start)
s=s[:start]+" if(failMoonImage&&input.binary&&/\\/sky\\/moon\\/.+\\.png$/.test(input.route)){row.status=503;row.receivedBytes=0;row.sha256=hash(Buffer.alloc(0));row.injected='controlled-first-lunar-image-outage-until-public-retry';return {status:503,header:{},base64:'',image:null};}"+s[end:]
s=s.replace("feed:true,current:","feed:false,current:")
s=s.replace("const calls={};const target=args[0];", "const calls={};const target=args[0];")
s=s.replace("row.count++;if(result===true)row.submitted++;", "row.count++;if(result===true)row.submitted++;if(['sun','moon','planet','saturnRings'].includes(k)){const d=values[0];row.discs??=[];row.discs.push({...d,rings:d.rings?.map(r=>({band:r.band,opacity:r.opacity,front:r.front.length,back:r.back.length,shadowFront:r.shadowFront.length,shadowBack:r.shadowBack.length})),submitted:result===true,view:values[1]});}")
s=s.replace("constellationEnabled:args[15]?.enabled,sourceImages:refs", "context:args[1]?.context,geometry:args[1]?.hourly.find(r=>r.at===args[2])??null,constellationEnabled:args[15]?.enabled,sourceImages:refs")
s=s.replace("pendingNativeRequests:w.pendingNativeRequests,bridgeOutputs:w.bridgeOutputs.length,gpu:w.gpuInventory()", "paintedObjects:globalThis.__pageCompletedPaints.at(-1)?.objects??[],pendingNativeRequests:w.pendingNativeRequests,bridgeOutputs:w.bridgeOutputs.length,gpu:w.gpuInventory()")
start=s.index('const actions:any[]=[];');end=s.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide',start)
body=r'''const actions:any[]=[];const act=async(text:string)=>{const r=await clickText(text);actions.push({phase:await page.evaluate(()=>globalThis.__controlled.phase),...r});return r;};
const frame=async(name:string)=>{await page.evaluate(name=>globalThis.__controlled.phase=name,name);const v=await stablePaint(v=>v.canvas?.['data-sky-scene-state']==='READY');phase.push({name,...v});console.log(JSON.stringify({phase:name,fov:v.scene?.fov,images:v.frameResources?.sourceImages.map(i=>i.family)}));return v;};
const gestures:any[]=[];const touches=(d:number)=>[{x:195-d/2,y:422},{x:195+d/2,y:422}];
const touch=async(type:string,points:any[],changed:any[]=points)=>{const r=await page.evaluate(({type,points,changed})=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='canvas');if(!n?.__handlers[type]?.length)throw Error('original Canvas handler absent');return {type,points,changed,phase:w.phase,dispatched:n.dispatchEvent(api.createEvent({type,touches:points,changedTouches:changed}))};},{type,points,changed});gestures.push(r);};
const zoom=async(fov:number,name:string)=>{let current=await inspect(),start=current.scene.fov;while(start/fov>10){const next=start/8;await one(next,name+'-intermediate-'+next);current=await inspect();start=current.scene.fov;}return one(fov,name);};
const one=async(fov:number,name:string)=>{const current=await inspect(),start=current.scene.fov;const distance=20*Math.tan(start*Math.PI/720)/Math.tan(fov*Math.PI/720);assert(distance>1&&distance<360);await page.evaluate(n=>globalThis.__controlled.phase=n,name);await touch('touchstart',touches(20));await touch('touchmove',touches(distance));await touch('touchend',[],touches(distance));const v=await stablePaint(v=>v.canvas?.['data-sky-scene-state']==='READY'&&Math.abs(v.scene.fov-fov)<1e-7);phase.push({name,...v});return v;};
const publicSearch:any[]=[];
const search=async(name:string,reference:string,tracking=false)=>{
 await act('天体列表');await wait(v=>v.text.includes('搜索日月、行星、恒星与深空天体'));
 publicSearch.push(await page.evaluate(name=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='input'&&n.classList?.contains('sky-object-search__input'));if(!n)throw Error('search Input absent');return {name,input:n.dispatchEvent(api.createEvent({type:'input',detail:{value:name}})),confirm:n.dispatchEvent(api.createEvent({type:'confirm',detail:{value:name}}))};},name));
 await wait(v=>v.text.includes('找到')&&v.queries.some(q=>q.key[0]==='celestial-search'&&q.key.at(-1)===name&&q.hasData));
 publicSearch.push(await page.evaluate(reference=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().filter(n=>n.classList?.contains('sky-object-search__result')&&n.textContent.includes(reference.replace(':',' ')));if(n.length!==1)throw Error('search result not unique '+reference+':'+n.length);return {reference,text:n[0].textContent,props:n[0].props,selected:n[0].dispatchEvent(api.createEvent('tap'))};},reference));
 await wait(v=>v.modal?.['data-object-reference']===reference&&v.text.includes('定位到星空')&&v.pendingNativeRequests===0);
 const disclosure=await frame('disclosure-'+reference.replace(':','-'));await save('disclosure-'+reference.replace(':','-')+'.json',disclosure);
 await act(tracking?'跟踪天体':'定位到星空');const located=await frame('located-'+reference.replace(':','-'));assert.equal(located.selection.length,1);return located;
};
await act('图层');await wait(v=>v.text.includes('模拟地景：开'));await act('模拟地景：开');await act('图层');await frame('public-ground-hidden-for-complete-sphere-bodies');
const bodies=[['月球','SOLAR:MOON','moon',1],['太阳','SOLAR:SUN',null,1],['水星','PLANET:MERCURY','mercury',.05],['金星','PLANET:VENUS',null,.05],['火星','PLANET:MARS','mars',.05],['木星','PLANET:JUPITER','jupiter',.05],['土星','PLANET:SATURN','saturn',.05],['天王星','PLANET:URANUS','uranus',.05],['海王星','PLANET:NEPTUNE','neptune',.05]] as const;
const observed:any[]=[];
for(const [name,reference,family,fov] of bodies){
 await page.evaluate(n=>globalThis.__controlled.phase=n,'public-search-'+reference);await search(name,reference);
 await zoom(fov,'public-resolved-'+reference.replace(':','-'));let v=await frame('resolved-'+reference.replace(':','-'));
 const key=reference.startsWith('PLANET:')?'planet':reference==='SOLAR:MOON'?'moon':'sun';
 assert(v.paintedObjects.some(o=>o.reference===reference),'resolved object missing from actual paint '+reference);
 assert(v.frameResources.calls[key]?.discs.some(d=>d.submitted&&(key!=='planet'||d.body===reference.split(':')[1])),'resolved surface not submitted '+reference);
 if(reference==='SOLAR:MOON'){
  assert(v.text.includes('重试月面影像'),'failed lunar image is not publicly recoverable');assert(!v.frameResources.sourceImages.some(i=>i.family==='moon'));await capturePixels('software-moon-image-failed-phase-preserved');
  failMoonImage=false;await act('重试月面影像');v=await frame('resolved-SOLAR-MOON-retried');
 }
 if(family){assert(v.frameResources.sourceImages.some(i=>i.family===family),'eligible real image missing '+family);assert(v.frameResources.calls[key].images.some(i=>v.frameResources.sourceImages.some(s=>s.family===family&&s.sha256===i.sha256)),'image not consumed by actual surface '+family);}
 if(reference==='PLANET:VENUS')assert(v.frameResources.calls.planet.discs.some(d=>d.body==='VENUS'&&d.submitted));
 if(reference==='PLANET:SATURN')assert(v.frameResources.calls.saturnRings?.submitted>0,'continuous Saturn rings missing');
 await capturePixels('software-resolved-'+reference.replace(':','-'));observed.push({name,reference,family,phase:v});
 // Actual same-painted-frame core pick, including Sun/Moon under the geometric horizon.
 const picked=await page.evaluate(reference=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,s=globalThis.__pageCompletedPaints.at(-1),o=s.objects.find(o=>o.reference===reference);if(!o)throw Error('painted body missing');const choices=api.pickPaintedSkyObjects(s,{x:o.x,y:o.y,frameAt:s.frameAt,catalogVersion:s.catalogVersion,catalogHash:s.catalogHash});if(!choices.some(c=>c.reference===reference))throw Error('painted core unpickable');const n=w.logicalNodes().find(n=>n.nodeName==='canvas');for(const type of ['touchstart','touchend'])n.dispatchEvent(api.createEvent({type,touches:type==='touchstart'?[{x:o.x,y:o.y}]:[],changedTouches:[{x:o.x,y:o.y}]}));return {reference,object:o,choices,frameAt:s.frameAt};},reference);await save('public-core-pick-'+reference.replace(':','-')+'.json',picked);
 if(picked.choices.length>1)await page.evaluate(ref=>{const w=globalThis.__controlled,api=globalThis.actualSkyPage,n=w.logicalNodes().filter(n=>n.classList?.contains('sky-object-choice__row')&&n.textContent.includes(ref.replace(':',' ')));if(n.length!==1)throw Error('overlap row not unique');n[0].dispatchEvent(api.createEvent('tap'));},reference);
 await wait(v=>v.modal?.['data-object-reference']===reference&&v.text.includes('来源与许可')&&v.pendingNativeRequests===0);
 await act('定位到星空');await frame('body-core-disclosure-return-'+reference.replace(':','-'));
 // Return to an attainable broad field before the next public search; no direct camera mutation.
 for(const next of [Math.min(fov*8,45),Math.min(fov*64,45),45])if((await inspect()).scene.fov<next)await zoom(next,'public-body-zoom-out-'+reference.replace(':','-')+'-'+next);
}
await save('observed-bodies.json',observed);await save('public-search-actions.json',publicSearch);await save('public-canvas-touch-actions.json',gestures);
// Reopen the already warm lunar file through original public tracking and time preview.
await search('月球','SOLAR:MOON',true);await zoom(1,'warm-moon-tracking');const tracked=await frame('warm-moon-tracked');assert(tracked.text.includes('跟踪中'));await capturePixels('software-warm-moon-tracked');
await act('时间轴');await wait(v=>!!v.ruler&&v.text.includes('播放 1×'));
const target=await page.evaluate(()=>{const api=globalThis.actualSkyPage,c=api.useAppStore.getState().observationContext,d=api.miniappQueryClient.getQueryCache().getAll().map(q=>q.state.data?.data).find(d=>d.context?.contextId===c.contextId&&d.context?.contextRevision===c.revision&&Array.isArray(d.hourly));if(!d)throw Error('current report absent');const next=d.hourly.map((r,index)=>({at:r.at,index})).find(r=>Date.parse(r.at)>Date.parse(c.selectedAtUtc)+1800000);if(!next)throw Error('future row absent');return {...next,step:390*34/750,context:c};});
const timeEvents:any[]=[];const ruler=async(type:string,detail:any={})=>{timeEvents.push(await page.evaluate(({type,detail})=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.id==='sky-orientation-time-ruler-scroll');if(!n?.__handlers[type]?.length)throw Error('ruler listener absent');return {type,detail,dispatched:n.dispatchEvent(api.createEvent({type,detail,touches:type==='touchstart'?[{x:195,y:780}]:[],changedTouches:[{x:195,y:780}]}))};},{type,detail}));};
await ruler('touchstart');await ruler('scroll',{scrollLeft:target.index*target.step});const preview=await frame('moon-tracked-public-time-preview');assert.equal(preview.scene.at,target.at);assert.deepEqual(preview.observationContext,tracked.observationContext);assert(preview.text.includes('跟踪中'));assert.notDeepEqual(JSON.parse(preview.canvas['data-sky-presented-view']).basis,JSON.parse(tracked.canvas['data-sky-presented-view']).basis);await capturePixels('software-moon-tracked-preview');
await ruler('touchcancel');const cancelled=await frame('moon-time-preview-cancelled');assert.equal(cancelled.scene.at,tracked.scene.at);assert.deepEqual(JSON.parse(cancelled.canvas['data-sky-presented-view']),JSON.parse(tracked.canvas['data-sky-presented-view']));await capturePixels('software-moon-time-cancelled');await save('public-time-inputs.json',{target,timeEvents});
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='all-body-hide';w.lifecycle(w.skyPage,'onHide');});const hidden=await wait(v=>v.pendingNativeRequests===0&&v.owners.every(o=>o.leased===0&&o.running===0)&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0);phase.push({name:'all-body-hidden-retired',...hidden});
await page.evaluate(()=>globalThis.__controlled.lifecycle(globalThis.__controlled.skyPage,'onShow'));const returned=await frame('all-body-warm-show-moon-restored');assert.equal(returned.scene.at,tracked.scene.at);assert(returned.frameResources.sourceImages.some(i=>i.family==='moon'));await capturePixels('software-warm-show-moon');
await save('actual-solar-lifecycle.json',await page.evaluate(()=>globalThis.__controlled.lifecycleEvents));
'''
s=s[:start]+body+s[end:]
s=s.replace("await save('sensor-inputs.json',poseInputs);",'')
s=s.replace('ACTUAL_TARO_FULL_ROTATION_CALIBRATION_SOURCE_RECOVERY_DEVELOPMENT','ACTUAL_TARO_SOLAR_PUBLIC_SEARCH_PICK_IMAGE_TIME_RETIREMENT_DEVELOPMENT')
s=s.replace('Controlled synthetic Android degree wx sensor streams via original callbacks and public controls; original tracker/controller only diagnosed;', 'Original public search/locate/touch/core-pick/tracking/ruler; sensors are inactive controlled ports;')
(scripts/'experience-real-taro-solar-public-2026-10-04.mts').write_text(s,encoding='utf8')
print('created new solar public lane task scripts; no product edits')
