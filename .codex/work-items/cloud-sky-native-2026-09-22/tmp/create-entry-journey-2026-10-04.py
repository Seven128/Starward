from pathlib import Path
root=Path(__file__).resolve().parents[4];scripts=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts'
s=(scripts/'build-real-taro-solar-public-2026-10-04.mts').read_text(encoding='utf8')
s=s.replace('current-execution-state-2026-10-04-r63.json','current-execution-state-2026-10-04-r64.json')
s=s.replace("import CelestialSourcesPage from './src/sky/sources';", "import CelestialSourcesPage from './src/sky/sources';\nimport MapPage from './src/pages/map/index';")
s=s.replace("return createPageConfig(SpotSkyPage,'sky-task-page');", "return createPageConfig(MapPage,'map-task-page');")
s=s.replace("export function createSourcesPage()", "let skySequence=0;export function createSkyPage(){return createPageConfig(SpotSkyPage,'sky-task-page-'+(++skySequence));}\nexport function createSourcesPage()")
(scripts/'build-real-taro-entry-journey-2026-10-04.mts').write_text(s,encoding='utf8')
s=(scripts/'experience-real-taro-solar-public-2026-10-04.mts').read_text(encoding='utf8')
s=s.replace('current-execution-state-2026-10-04-r63.json','current-execution-state-2026-10-04-r64.json')
s=s.replace('let failMoonImage=true;', 'let failMoonImage=false;')
start=s.index(' port.navigateTo=async');end=s.index(' port.switchTab=',start)
s=s[:start]+r''' port.navigateTo=async({url})=>{const sky=url.startsWith('/sky/detail/index?'),sources=url.startsWith('/sky/sources/index?');if(!sky&&!sources)throw Error('uncovered navigation route '+url);w.navigationEvents.push({url,action:'navigateTo',phase:w.phase});
  const api=globalThis.actualSkyPage,previous=w.pageStack.at(-1);w.lifecycle(previous,'onHide');const config=sky?api.createSkyPage():api.createSourcesPage(),native=w.makeNativePage(config,sky?'sky/detail/index':'sky/sources/index');
  if(sky){w.skyPage=native;w.pageConfig=config;w.skyInstances??=[];w.skyInstances.push(native);}else w.sourcesPage=native;
  w.pageStack.push(native);w.nativePage=native;const params=Object.fromEntries(new URL(url,'https://approved.fixture.invalid').searchParams);w.lifecycle(native,'onLoad',params);w.lifecycle(native,'onReady');w.lifecycle(native,'onShow');return {};};
 port.navigateBack=async()=>{if(w.pageStack.length<2)throw Error('Back has no original prior page');const leaving=w.pageStack.pop();w.navigationEvents.push({action:'navigateBack',route:leaving.route,phase:w.phase});w.lifecycle(leaving,'onHide');w.lifecycle(leaving,'onUnload');w.nativePage=w.pageStack.at(-1);w.lifecycle(w.nativePage,'onShow');return {};};
''' +s[end:]
# Narrow diagnostic roots never replace actual Map/entry callbacks.
s=s.replace("api.document.getElementById(w.skyPage.$taroPath),nodes=w.nodesFor(w.skyPage)", "api.document.getElementById((w.skyPage??w.mapPage).$taroPath),nodes=w.nodesFor(w.skyPage??w.mapPage)")
s=s.replace("return {orientation:globalThis.__pageOrientationOwners.map", "return {map: w.nodesFor(w.mapPage).find(n=>n.nodeName==='map')?.props??null,mapText:api.document.getElementById(w.mapPage?.$taroPath)?.textContent??'',mapButtons:w.nodesFor(w.mapPage).filter(n=>n.nodeName==='button').map(n=>({text:n.textContent,props:n.props})),selectedSpotId:api.useAppStore.getState().selectedSpotId,orientation:globalThis.__pageOrientationOwners.map")
start=s.index('const bootstrap=await page.evaluate');end=s.index("await save('bootstrap.json',bootstrap);",start)
s=s[:start]+r'''const bootstrap=await page.evaluate(async({spot})=>{
 const api=globalThis.actualSkyPage,w=globalThis.__controlled,localDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 // User starts with a previous real viewport Context. Sky itself is entered only by the actual Map public handler.
 const envelope=await api.resolveObservationContext({location:{kind:'MAP_POINT',displayName:'入口试验地图中心',wgs84:spot.wgs84,source:'MAP_VIEWPORT',timezoneHint:'Asia/Shanghai'},localDate,selectedAt:localDate+'T13:00:00.000Z'});
 const c=envelope.data;api.useAppStore.getState().setObservationContext(c);api.useAppStore.getState().setViewport({center:{latitude:spot.gcj02.latitude,longitude:spot.gcj02.longitude},zoom:12});
 const config=api.initialize(),nativePage=w.makeNativePage(config,'pages/map/index');w.mapPage=nativePage;w.pageStack.push(nativePage);w.nativePage=nativePage;w.mapConfig=config;w.context=c;w.phase='original-map-viewport-entry';
 w.lifecycle(nativePage,'onLoad',{});w.lifecycle(nativePage,'onReady');w.lifecycle(nativePage,'onShow');
 return {context:c,mapInstanceId:nativePage.$taroPath,spotId:spot.spotId,meaning:'Original complete MapPage at controlled viewport; actual seeded prior MAP_POINT context. No direct cloud handler/camera mutation.'};
},{spot:TEST_PUBLISHED_SPOT});
''' +s[end:]
start=s.index('const coldData=await wait');end=s.index('const actions:any[]=[];',start)
s=s[:start]+r'''const clickText=async(text:string)=>page.evaluate(text=>{const api=globalThis.actualSkyPage,nodes=globalThis.__controlled.logicalNodes().filter(n=>n.nodeName==='button');const matches=nodes.filter(n=>n.textContent.trim()===text);if(matches.length!==1)throw Error('actual logical button not unique '+text+':'+matches.length);const node=matches[0];if(!node.__handlers.tap?.length)throw Error('actual tap absent');return {text:node.textContent,props:node.props,dispatched:node.dispatchEvent(api.createEvent('tap'))};},text);
const originalMap=await wait(v=>v.activeRoute==='pages/map/index'&&Array.isArray(v.map?.markers)&&v.map.markers.length>0&&v.pendingNativeRequests===0&&v.queries.some(q=>q.key[0]==='map-scene'&&q.hasData));phase.push({name:'complete-map-before-marker',...originalMap});await save('original-map-ready.json',originalMap);
const marker=await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='map'),marker=n.props.markers.find(m=>m.id<100000);if(!marker)throw Error('formal marker absent');return {marker,dispatched:n.dispatchEvent(api.createEvent({type:'markertap',detail:{markerId:marker.id}}))};});await save('public-formal-marker-action.json',marker);
const entry=await wait(v=>v.mapButtons.some(n=>n.props['data-control']==='spot-cloud-stargazing-action'&&n.props.disabled===false)&&v.observationContext?.location.kind==='FORMAL_SPOT');phase.push({name:'original-formal-entry-context-ready',...entry});await save('original-formal-entry.json',entry);
const originalCloud=await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.props['data-control']==='spot-cloud-stargazing-action');if(!n||n.props.disabled)throw Error('original cloud entry unavailable');return {props:n.props,dispatched:n.dispatchEvent(api.createEvent('tap'))};});await save('public-formal-cloud-action.json',originalCloud);
await wait(v=>v.activeRoute==='sky/detail/index'&&v.text.includes('手动查看')&&v.queries.some(q=>q.key[0]==='spot-sky'&&q.hasData));await save('manual-action.json',await clickText('手动查看'));const coldScene=await stablePaint(v=>v.scene?.supplement>0&&v.canvas?.['data-sky-scene-state']==='READY');phase.push({name:'original-entry-sky-cold-painted',...coldScene});await capturePixels('software-cold');
''' +s[end:]
start=s.index("await wait(v=>v.text.includes('模拟地景：开'));");end=s.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide',start)
s=s[:start]+r'''// First validate the uncertain complete original Map -> Sky -> Map consumer path before expanding dependent combination.
await frame('original-entry-small-path-painted');
const back=await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().filter(n=>n.nodeName==='button'&&n.props.ariaLabel==='返回');if(n.length!==1)throw Error('original sky Back not unique');return {props:n[0].props,dispatched:n[0].dispatchEvent(api.createEvent('tap'))};});await save('public-sky-to-map-back.json',back);
const returned=await wait(v=>v.activeRoute==='pages/map/index'&&v.pendingNativeRequests===0&&v.mapButtons.some(n=>n.props['data-control']==='spot-cloud-stargazing-action'&&!n.props.disabled));phase.push({name:'original-sky-returned-map-ready',...returned});assert.deepEqual(returned.observationContext,entry.observationContext);assert.equal(returned.selectedSpotId,entry.selectedSpotId);assert.equal(returned.resources.activeDecodedImageHandles,0);assert.equal(Object.values(returned.gpu).reduce((a:any,b:any)=>a+b,0),0);await save('actual-entry-navigation.json',await page.evaluate(()=>{const w=globalThis.__controlled;return {sameOriginalMapInstance:w.nativePage===w.mapPage,skyRootRemoved:!globalThis.actualSkyPage.document.getElementById(w.skyPage.$taroPath),navigation:w.navigationEvents,lifecycle:w.lifecycleEvents};}));
''' +s[end:]
# Last active page is now Map; retire it rather than an already unloaded Sky instance.
s=s.replace('w.pageConfig.onHide.call(w.nativePage);w.pageConfig.onUnload.call(w.nativePage);', "w.lifecycle(w.nativePage,'onHide');w.lifecycle(w.nativePage,'onUnload');")
s=s.replace("if(page){await save('failed-orientation.json'", "if(page){await save('failed-resource-summary.json',await page.evaluate(()=>globalThis.__controlled.resourceSummary));await save('failed-frame-resources.json',await page.evaluate(()=>globalThis.__controlled.frameResources));await save('failed-phases-inspect.json',await inspect());await save('failed-orientation.json'")
s=s.replace('ACTUAL_TARO_SOLAR_PUBLIC_SEARCH_PICK_IMAGE_TIME_RETIREMENT_DEVELOPMENT', 'ACTUAL_TARO_ORIGINAL_MAP_SKY_ENTRY_RETURN_DEVELOPMENT')
s=s.replace('Original public search/locate/touch/core-pick/tracking/ruler;', 'Original complete MapPage marker/context/cloud handler, official navigate stack and Sky Back;')
(scripts/'experience-real-taro-entry-journey-2026-10-04.mts').write_text(s,encoding='utf8')
print('created complete original Map/Sky entry trial task scripts, no product edits')
