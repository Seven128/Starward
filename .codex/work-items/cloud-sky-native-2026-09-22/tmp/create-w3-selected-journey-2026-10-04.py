from pathlib import Path
root=Path(__file__).resolve().parents[4]
folder=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts'
builder=(folder/'build-real-taro-layer-time-journey-2026-10-04.mts').read_text(encoding='utf8')
builder=builder.replace('r54.json','r56.json')
builder=builder.replace('return publish?.(snapshot,sources);','globalThis.__recordCompletedSkySources?.(sources);return publish?.(snapshot,sources);')
(folder/'build-real-taro-w3-selected-journey-2026-10-04.mts').write_text(builder,encoding='utf8')
s=(folder/'experience-real-taro-layer-time-journey-2026-10-04.mts').read_text(encoding='utf8').replace('r54.json','r56.json')
s=s.replace('const requests:any[]=[],errors:any[]=[],phase:any[]=[];let browser:any,page:any;', 'const requests:any[]=[],errors:any[]=[],phase:any[]=[];let failOpticalDetail=true;let browser:any,page:any;')
needle=' const response=await fetch(endpoint+input.route,'
assert needle in s
s=s.replace(needle,''' if(failOpticalDetail&&input.binary&&/\/sky\/sdss-optical\/[^/]+\/M-51-detail\.jpg$/.test(input.route)){failOpticalDetail=false;row.status=503;row.receivedBytes=0;row.sha256=hash(Buffer.alloc(0));row.injected='one-controlled-transport-503';return {status:503,header:{},base64:'',image:null};}
 const response=await fetch(endpoint+input.route,''',1)
s=s.replace(' w.resourceFacts=liveModels;', ''' w.resourceFacts=liveModels;
 w.completedSources=[];globalThis.__recordCompletedSkySources=sources=>{const c=sources.sdssOptical;w.completedSources.push({phase:w.phase,at:globalThis.__pageCompletedPaints.at(-1)?.frameAt,optical:c?{kind:c.kind,reference:c.reference,publicationHash:c.publicationHash,field:c.field?{level:c.field.level,fieldDegrees:c.field.fieldDegrees,image:imageMetadata(c.field.image)}:null}:null,deepImage:sources.deepSkyImage?imageMetadata(sources.deepSkyImage):null});};''')
s=s.replace("  resources:w.resourceFacts(),frameResources:","  completedSources:w.completedSources.at(-1),resources:w.resourceFacts(),frameResources:")
start=s.index("await act('模拟地景：开');")
end=s.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide',start)
new=r'''
// Original Canvas pinch, followed by public layer and search actions.
const gestures:any[]=[];const touches=(d:number)=>[{x:195-d/2,y:422},{x:195+d/2,y:422}];
const touch=async(type:string,points:any[],changed:any[]=points)=>{const r=await page.evaluate(({type,points,changed})=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='canvas');if(!n?.__handlers[type]?.length)throw Error('original touch listener absent');return {type,points,changed,phase:w.phase,dispatched:n.dispatchEvent(api.createEvent({type,touches:points,changedTouches:changed}))};},{type,points,changed});gestures.push(r);};
const zoom=async(fov:number,name:string)=>{const current=await inspect(),start=JSON.parse(current.canvas['data-sky-presented-view']).fov;const distance=20*Math.tan(start*Math.PI/720)/Math.tan(fov*Math.PI/720);assert(distance<360&&distance>1);await page.evaluate(name=>globalThis.__controlled.phase=name,name);await touch('touchstart',touches(20));await touch('touchmove',touches(distance));await touch('touchend',[],touches(distance));const v=await stablePaint(v=>v.canvas?.['data-sky-scene-state']==='READY'&&Math.abs(v.scene?.fov-fov)<1e-7);phase.push({name,...v});return v;};
// A 280-to120 pinch enters a supported wide field through the page owner.
await page.evaluate(()=>globalThis.__controlled.phase='public-widefield-pinch');await touch('touchstart',touches(280));await touch('touchmove',touches(120));await touch('touchend',[],touches(120));
const wide=await completed('public-widefield-galactic');assert(wide.scene.fov>=60);assert(wide.frameResources.sourceImages.some(i=>i.family==='galactic'));await capturePixels('software-wide-galactic');
await act('红外：关');const wideW3=await completed('public-eligible-w3');assert(wideW3.frameResources.sourceImages.some(i=>i.family==='WIDE_FIELD_W3'));assert(!wideW3.frameResources.sourceImages.some(i=>i.family==='galactic'));await capturePixels('software-wide-w3');
await act('红外：开');const wideRestored=await completed('public-galactic-restored');assert(wideRestored.frameResources.sourceImages.some(i=>i.family==='galactic'));assert(!wideRestored.frameResources.sourceImages.some(i=>i.family==='WIDE_FIELD_W3'));await capturePixels('software-wide-galactic-restored');
await act('红外：关');const warmW3=await completed('public-w3-warm-restored');assert(warmW3.frameResources.sourceImages.some(i=>i.family==='WIDE_FIELD_W3'));await capturePixels('software-wide-w3-warm');
await act('红外：开');await completed('public-galactic-before-search');await zoom(45,'public-local-before-search');
await act('天体列表');await wait(v=>v.text.includes('搜索日月、行星、恒星与深空天体'));
await save('public-search-input.json',await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='input'&&n.classList?.contains('sky-object-search__input'));if(!n)throw Error('public search input absent');return {value:'M51',props:n.props,input:n.dispatchEvent(api.createEvent({type:'input',detail:{value:'M51'}})),confirm:n.dispatchEvent(api.createEvent({type:'confirm',detail:{value:'M51'}}))};}));
await wait(v=>v.text.includes('找到')&&v.queries.some(q=>q.key[0]==='celestial-search'&&q.hasData));
await save('public-search-select.json',await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.classList?.contains('sky-object-search__result')&&n.textContent.includes('M 51'));if(!n)throw Error('actual M51 search result absent');return {text:n.textContent,props:n.props,dispatched:n.dispatchEvent(api.createEvent('tap'))};}));
await wait(v=>v.modal?.['data-object-reference']==='M:51'&&v.text.includes('定位到星空'));await act('定位到星空');const located=await completed('public-m51-located');assert(located.selection.length===1);
// Small staged pinches honor the native gesture's attainable distances.
for(const fov of [10,2,.4,.1])await zoom(fov,'public-target-zoom-'+fov);
const medium=await completed('public-optical-medium');assert.equal(medium.completedSources?.optical?.reference,'M:51');assert.equal(medium.completedSources.optical.field.level,'MEDIUM');await capturePixels('software-m51-medium');
await zoom(.05,'public-optical-detail-request');const failedFine=await completed('public-optical-detail-failed-coarse');assert(failedFine.text.includes('影像更新失败，保留已载图'));assert.equal(failedFine.completedSources.optical.field.level,'MEDIUM');assert.equal(failedFine.completedSources.optical.field.image.sha256,medium.completedSources.optical.field.image.sha256);await capturePixels('software-m51-failed-fine-coarse');
await act('影像更新失败，保留已载图 · 重试');const detail=await completed('public-optical-detail-retry');assert.equal(detail.completedSources.optical.field.level,'DETAIL');await capturePixels('software-m51-detail');
const picked={object:{reference:'M:51'}};
await save('public-selected-marker.json',await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='button'&&n.classList?.contains('sky-selected-object'));if(!n)throw Error('selected marker absent');return {text:n.textContent,dispatched:n.dispatchEvent(api.createEvent('tap'))};}));
await wait(v=>v.modal?.['data-object-reference']==='M:51'&&v.text.includes('来源与许可')&&v.queries.some(q=>q.key[0]==='celestial-object-information'&&q.hasData));
const journeyCold=await completed('public-m51-before-source');await capturePixels('software-m51-before-source');
await page.evaluate(()=>globalThis.__controlled.phase='actual-m51-sources-page');await save('source-open-action.json',await clickText('来源与许可'));
const source=await wait(v=>v.activeRoute==='sky/sources/index'&&v.activeText.includes('来源与许可')&&v.pendingNativeRequests===0&&v.owners.every(o=>o.leased===0&&o.running===0));phase.push({name:'actual-source-jsx-shown-sky-hidden',...source});assert.equal(Object.values(source.gpu).reduce((a:any,b:any)=>a+b,0),0);
await page.evaluate(()=>globalThis.__controlled.phase='actual-m51-source-back');await save('source-back-action.json',await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().filter(n=>n.nodeName==='button'&&n.props.ariaLabel==='返回');if(n.length!==1)throw Error('Source Back not unique');return {dispatched:n[0].dispatchEvent(api.createEvent('tap'))};}));
const returned=await stablePaint(v=>v.activeRoute==='sky/detail/index'&&v.stack.length===1&&v.canvas?.['data-sky-scene-state']==='READY'&&v.selection.length===1&&v.completedSources?.optical?.field?.level==='DETAIL');phase.push({name:'actual-source-back-m51-detail',...returned});assert.equal(returned.scene.at,journeyCold.scene.at);assert.deepEqual(JSON.parse(returned.canvas['data-sky-presented-view']),JSON.parse(journeyCold.canvas['data-sky-presented-view']));await capturePixels('software-m51-return');
await save('actual-navigation.json',await page.evaluate(()=>{const w=globalThis.__controlled;return {navigation:w.navigationEvents,lifecycle:w.lifecycleEvents,sourceRootRemoved:!globalThis.actualSkyPage.document.getElementById(w.sourcesPage.$taroPath),sameCurrentSkyInstance:w.nativePage===w.skyPage};}));
await save('public-gesture-actions.json',gestures);
'''
s=s[:start]+new+s[end:]
s=s.replace("await save('scene-inputs.json',", "await save('completed-source-receipts.json',await page.evaluate(()=>globalThis.__controlled.completedSources));await save('scene-inputs.json',",1)
s=s.replace("gridOnly?'ACTUAL_TARO_PUBLIC_GRID_LAYER_ONLY_DEVELOPMENT':'ACTUAL_TARO_PUBLIC_LAYERS_TIME_TRACKING_SOFTWARE_DEVELOPMENT'", "'ACTUAL_TARO_ELIGIBLE_W3_SELECTED_FINE_FAILURE_DEVELOPMENT'")
s=s.replace('gridOnly,inputs:', 'inputs:')
(folder/'experience-real-taro-w3-selected-journey-2026-10-04.mts').write_text(s,encoding='utf8')
print('Created task-only builder and runner; no production files edited')
