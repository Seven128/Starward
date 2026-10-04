from pathlib import Path
root=Path(__file__).resolve().parents[4];folder=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts'
builder=(folder/'build-real-taro-w3-selected-journey-2026-10-04.mts').read_text(encoding='utf8').replace('r56.json','r58.json')
needle='  b.onLoad({filter:/[\\\\/]sky-public-image-cache\\.ts$/},async a=>{'
assert needle in builder
plugin=r'''  b.onLoad({filter:/[\\/]use-sky-wide-field-w3\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');const needle='  return {tiles,publication,loading:';assert(raw.includes(needle));
   const s=raw.replace(needle,'  globalThis.__recordW3Hook?.({wantedWide,at,fov:view?.verticalFovDeg,sunAltitude:sun?.altitudeDeg,selection:selection?{state:selection.state,order:selection.order,pixels:selection.pixels}:null,wanted:wanted.map(a=>({...a})),loaded:tiles.map(t=>({pixel:t.pixel,...globalThis.__controlled.imageInfo(t.image)})),publicationHash:publication?.publicationHash,loading:wantedWide&&(manifest.isFetching||images.loading),failed:wantedWide&&(manifest.isError||Boolean(manifest.refreshError)||images.failed)});\n'+needle);
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s))});return {contents:s,loader:'ts'};
  });
'''
# Python raw literal above represents TypeScript regex/source strings; preserve
# only the escapes used by this existing builder's emitted source conventions.
plugin=plugin.replace(r'w3\\.ts',r'w3\.ts').replace(r'});\\n',r'});\n')
builder=builder.replace(needle,plugin+needle,1)
(folder/'build-real-taro-w3-ready-journey-2026-10-04.mts').write_text(builder,encoding='utf8')
s=(folder/'experience-real-taro-w3-selected-journey-2026-10-04.mts').read_text(encoding='utf8').replace('r56.json','r58.json')
s=s.replace(' w.resourceFacts=liveModels;', ''' w.resourceFacts=liveModels;
 w.w3HookStates=[];globalThis.__recordW3Hook=value=>{w.w3Hook=value;w.w3HookStates.push({phase:w.phase,...value});};''')
s=s.replace('  completedSources:w.completedSources.at(-1),', '  nativeCounters:w.counters(),w3Hook:w.w3Hook??null,completedSources:w.completedSources.at(-1),')
s=s.replace("v.canvas?.['data-sky-presented-view']]);", "v.canvas?.['data-sky-presented-view'],v.w3Hook?.wanted,v.w3Hook?.loaded,v.w3Hook?.loading,v.frameResources?.sourceImages]);")
s=s.replace('return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,data:Array.from(b),error:gl.getError()};', 'return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,data:Array.from(b),error:gl.getError(),sceneSequence:globalThis.__pageSceneInputs.length,w3Hook:globalThis.__controlled.w3Hook??null,frameResources:globalThis.__controlled.frameResources.at(-1)};')
old="await page.locator('#software-sky').screenshot({path:path.join(out,name+'.png')});"
new=old+"\n const post=await page.evaluate(()=>{const w=globalThis.__controlled,gl=w.gl,b=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);return {data:Array.from(b),error:gl.getError(),sceneSequence:globalThis.__pageSceneInputs.length,w3Hook:w.w3Hook??null,frameResources:w.frameResources.at(-1)};});const postBytes=Buffer.from(post.data);await fs.writeFile(path.join(out,name+'-after.rgba'),postBytes,{flag:'wx'});await save(name+'-capture-boundaries.json',{before:{...pixels,data:undefined},after:{...post,data:undefined},beforeHash:hash(bytes),afterHash:hash(postBytes)});assert.equal(post.error,0);assert.equal(hash(bytes),hash(postBytes),'actual GL pixels changed during capture');"
assert old in s;s=s.replace(old,new,1)
start=s.index('// Original Canvas pinch, followed by public layer and search actions.')
end=s.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide',start)
new=r'''
const gestures:any[]=[];const touches=(d:number)=>[{x:195-d/2,y:422},{x:195+d/2,y:422}];
const touch=async(type:string,points:any[],changed:any[]=points)=>{const r=await page.evaluate(({type,points,changed})=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='canvas');if(!n?.__handlers[type]?.length)throw Error('original touch listener absent');return {type,points,changed,phase:w.phase,dispatched:n.dispatchEvent(api.createEvent({type,touches:points,changedTouches:changed}))};},{type,points,changed});gestures.push(r);};
const fullW3=(v:any)=>v.canvas?.['data-sky-scene-state']==='READY'&&v.w3Hook?.wantedWide&&!v.w3Hook.loading&&!v.w3Hook.failed&&v.w3Hook.wanted.length>0&&v.w3Hook.loaded.length===v.w3Hook.wanted.length&&v.nativeCounters.decodedPending===0&&v.w3Hook.wanted.every(a=>v.w3Hook.loaded.some(i=>i.pixel===a.pixel&&i.sha256===a.sha256))&&v.frameResources.sourceImages.filter(i=>i.family==='WIDE_FIELD_W3').length===v.w3Hook.wanted.length;
await page.evaluate(()=>globalThis.__controlled.phase='public-widefield-pinch');await touch('touchstart',touches(280));await touch('touchmove',touches(120));await touch('touchend',[],touches(120));
const wide=await completed('public-widefield-galactic');assert(wide.scene.fov>=60);assert(wide.frameResources.sourceImages.some(i=>i.family==='galactic'));await capturePixels('software-wide-galactic');
await act('红外：关');await page.evaluate(()=>globalThis.__controlled.phase='public-w3-full-ready');
const full=await stablePaint(fullW3);phase.push({name:'public-w3-full-ready',...full});await save('w3-full-ready.json',full.w3Hook);await capturePixels('software-w3-full-ready');
// Show the actual W3 disclosure; it does not substitute for the separate object Source page.
await act('广角红外影像来源 · AllWISE W3 12 μm');const credit=await wait(v=>v.text.includes('原影像：')&&v.text.includes('ODbL'));phase.push({name:'public-w3-source-disclosure',...credit});
const picked=await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,snapshot=globalThis.__pageCompletedPaints.at(-1);const object=snapshot.objects.find(o=>o.kind==='STAR'&&o.reference.startsWith('HR:')&&o.x>24&&o.x<366&&o.y>68&&o.y<736);if(!object)throw Error('no usable painted BSC source choice');const choices=api.pickPaintedSkyObjects(snapshot,{x:object.x,y:object.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash});if(!choices.some(c=>c.reference===object.reference))throw Error('painted source choice not pickable');const n=w.logicalNodes().find(n=>n.nodeName==='canvas');for(const type of ['touchstart','touchend'])n.dispatchEvent(api.createEvent({type,touches:type==='touchstart'?[{x:object.x,y:object.y}]:[],changedTouches:[{x:object.x,y:object.y}]}));return {object,choices,frameAt:snapshot.frameAt};});await save('public-pick-action.json',picked);
if(picked.choices.length>1){await wait(v=>v.text.includes('选择天体'));await save('public-pick-choice.json',await page.evaluate(reference=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().filter(n=>n.classList?.contains('sky-object-choice__row')&&n.textContent.includes(reference.replace(':',' ')));if(n.length!==1)throw Error('public overlap choice not unique');return {text:n[0].textContent,dispatched:n[0].dispatchEvent(api.createEvent('tap'))};},picked.object.reference));}
await wait(v=>v.modal?.['data-object-reference']===picked.object.reference&&v.text.includes('来源与许可')&&v.queries.some(q=>q.key[0]==='celestial-object-information'&&q.hasData));
const journeyCold=await stablePaint(fullW3);phase.push({name:'public-w3-before-source',...journeyCold});await capturePixels('software-w3-before-source');
await page.evaluate(()=>globalThis.__controlled.phase='actual-wide-sources-page');await save('source-open-action.json',await clickText('来源与许可'));
const source=await wait(v=>v.activeRoute==='sky/sources/index'&&v.activeText.includes('来源与许可')&&v.pendingNativeRequests===0&&v.owners.every(o=>o.leased===0&&o.running===0));phase.push({name:'actual-source-jsx-shown-sky-hidden',...source});assert.equal(Object.values(source.gpu).reduce((a:any,b:any)=>a+b,0),0);assert.equal(source.resources.activeDecodedImageHandles,0);
await page.evaluate(()=>globalThis.__controlled.phase='actual-wide-source-back');await save('source-back-action.json',await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().filter(n=>n.nodeName==='button'&&n.props.ariaLabel==='返回');if(n.length!==1)throw Error('Source Back not unique');return {dispatched:n[0].dispatchEvent(api.createEvent('tap'))};}));
const returned=await stablePaint(v=>fullW3(v)&&v.activeRoute==='sky/detail/index'&&v.stack.length===1&&v.selection.length===1);phase.push({name:'actual-source-back-w3-full-ready',...returned});assert.equal(returned.scene.at,journeyCold.scene.at);assert.deepEqual(JSON.parse(returned.canvas['data-sky-presented-view']),JSON.parse(journeyCold.canvas['data-sky-presented-view']));await capturePixels('software-w3-return');
await save('actual-navigation.json',await page.evaluate(()=>{const w=globalThis.__controlled;return {navigation:w.navigationEvents,lifecycle:w.lifecycleEvents,sourceRootRemoved:!globalThis.actualSkyPage.document.getElementById(w.sourcesPage.$taroPath),sameCurrentSkyInstance:w.nativePage===w.skyPage};}));await save('public-gesture-actions.json',gestures);
'''
s=s[:start]+new+s[end:]
s=s.replace("await save('completed-source-receipts.json',", "await save('w3-hook-states.json',await page.evaluate(()=>globalThis.__controlled.w3HookStates));await save('completed-source-receipts.json',",1)
s=s.replace('ACTUAL_TARO_ELIGIBLE_W3_SELECTED_FINE_FAILURE_DEVELOPMENT','ACTUAL_TARO_W3_FULL_READY_SOURCE_RETIREMENT_DEVELOPMENT')
s=s.replace(" await save('failed.json',{error:String(error),phase,errors,requests,current});throw error;", " await save('failed.json',{error:String(error),phase,errors,requests,current});if(page){await save('failed-w3-hook-states.json',await page.evaluate(()=>globalThis.__controlled.w3HookStates));await save('failed-resources.json',await page.evaluate(()=>globalThis.__controlled.resourceSamples));}throw error;")
(folder/'experience-real-taro-w3-ready-journey-2026-10-04.mts').write_text(s,encoding='utf8')
print('Task-only full-ready hook and before/after pixel diagnostics prepared')
