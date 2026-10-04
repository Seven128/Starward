"""Reuse the unchanged full page build for the remaining Prepared combinations."""
from pathlib import Path
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
source = TASK / 'scripts/experience-prepared-m82-page-2026-10-04.mts'
target = TASK / 'scripts/experience-prepared-m82-combination-2026-10-04.mts'
code = source.read_text(encoding='utf-8')
start = code.index("await zoom(.2,'m82-overview');")
end = code.index('\nawait page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage', start)
scenario = r'''
await zoom(.05,'prepared-combination-detail');const fine=await optical('DETAIL');phase.push({name:'prepared-fine-before-layers',...fine});await capturePixels('software-prepared-fine');
const binaries=()=>requests.filter(r=>r.binary&&r.route.startsWith('/v2/sky/prepared-optical/'+displayHash+'/')&&r.status===200).length;
const beforeTransfers=binaries();
await act('地平网格：关');await act('赤道网格：关');const grid=await frame('prepared-grids-on');assert.deepEqual(grid.frameResources.grids,{horizontal:true,equatorial:true});assert.equal(grid.completedSources.optical.publicationHash,displayHash);await capturePixels('software-prepared-grids');
await act('地平网格：开');await act('赤道网格：开');await act('星座：开');const artOff=await frame('prepared-grids-off-art-off');assert.equal(artOff.frameResources.constellationEnabled,false);assert.equal(artOff.completedSources.optical.publicationHash,displayHash);
await act('星座：关');const layersBack=await optical('DETAIL');phase.push({name:'prepared-layers-restored',...layersBack});await capturePixels('software-prepared-layer-return');assert.equal(binaries(),beforeTransfers);
const selected=async()=>page.evaluate(()=>{const a=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='button'&&n.classList?.contains('sky-selected-object'));if(!n)throw Error('original selected marker absent');return n.dispatchEvent(a.createEvent('tap'));});
await selected();await wait(v=>v.modal?.['data-object-reference']==='M:82'&&v.text.includes('跟踪天体')&&v.pendingNativeRequests===0);await act('跟踪天体');const tracked=await optical('DETAIL');phase.push({name:'prepared-tracked',...tracked});assert(tracked.text.includes('跟踪中'));
await act('时间轴');await wait(v=>v.text.includes('播放 1×'));await act('播放 1×');const startAt=Date.parse(tracked.scene.at);const moving=await wait(v=>Date.parse(v.scene?.at)>startAt+1200&&v.text.includes('暂停')&&v.text.includes('跟踪中'));phase.push({name:'prepared-time-playing-tracked',...moving});await act('暂停');const paused=await optical('DETAIL');phase.push({name:'prepared-time-paused',...paused});assert(Date.parse(paused.scene.at)>startAt+1000);await capturePixels('software-prepared-time-paused');
await act('取消');const cancel=await optical('DETAIL');phase.push({name:'prepared-time-cancelled',...cancel});assert.equal(Date.parse(cancel.scene.at),startAt);
await act('播放 1×');await wait(v=>Date.parse(v.scene?.at)>startAt+1200&&v.text.includes('暂停'));await act('暂停');const commitFrom=await optical('DETAIL');await act('设为观测时间');const commit=await optical('DETAIL');phase.push({name:'prepared-time-committed',...commit});assert.equal(Date.parse(commit.scene.at),Date.parse(commitFrom.scene.at));assert.equal(Date.parse(commit.observationContext.selectedAtUtc),Date.parse(commit.scene.at));
await selected();await wait(v=>v.modal?.['data-object-reference']==='M:82'&&v.text.includes('来源与许可')&&v.pendingNativeRequests===0);const beforeSource=await optical('DETAIL');phase.push({name:'prepared-committed-before-source',...beforeSource});await capturePixels('software-prepared-committed-before-source');await act('来源与许可');const sourcePage=await wait(v=>v.activeRoute==='sky/sources/index'&&v.activeText.includes(publication.source.credit)&&v.pendingNativeRequests===0&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0&&v.owners.every(o=>o.leased===0&&o.running===0));phase.push({name:'prepared-committed-source-retired',...sourcePage});
await navBack();const back=await optical('DETAIL');phase.push({name:'prepared-committed-source-back',...back});assert.deepEqual(JSON.parse(back.canvas['data-sky-presented-view']),JSON.parse(beforeSource.canvas['data-sky-presented-view']));assert.equal(Date.parse(back.observationContext.selectedAtUtc),Date.parse(commit.scene.at));assert.equal(binaries(),beforeTransfers);await capturePixels('software-prepared-committed-source-back');await closeModal();await wait(v=>v.modal===null);
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='prepared-committed-hide';w.lifecycle(w.skyPage,'onHide');});const hidden=await wait(v=>v.pendingNativeRequests===0&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0&&v.owners.every(o=>o.leased===0&&o.running===0));phase.push({name:'prepared-committed-hidden',...hidden});
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='prepared-committed-warm-show';w.lifecycle(w.skyPage,'onShow');});const shown=await optical('DETAIL');phase.push({name:'prepared-committed-warm-show',...shown});assert.equal(Date.parse(shown.scene.at),Date.parse(commit.scene.at));assert.equal(binaries(),beforeTransfers);await capturePixels('software-prepared-committed-warm-show');
if(shown.buttons.some(b=>b.text.trim()==='停止跟踪')){await act('停止跟踪');await frame('prepared-stop-tracking');}
await zoom(45,'prepared-leave-fine');const wide=await frame('prepared-wide-current');assert(!wide.frameResources.sourceImages.some(i=>i.family==='prepared-optical'));assert.equal(wide.completedSources.optical,null);assert(!wide.sdssHook.requested);
await act('模拟地景：关');await frame('prepared-wide-landscape-on');await zoom(267.875033,'prepared-full-sphere');
const landscapeFacts=async()=>page.evaluate(()=>{const s=globalThis.__pageCompletedPaints.at(-1),m=s.view?.landscape;return {frameAt:s.frameAt,basis:s.view.basis,fov:s.view.verticalFovDeg,center:s.view.center,landscape:m?{kind:m.kind,opacity:m.opacity??1,resource:m.resource?.id,alphaBytes:m.alpha?.byteLength??m.foreground?.alpha?.byteLength??0}:null,objects:s.objects.length};});
const full=await frame('prepared-full-sphere-landscape');const fullFacts=await landscapeFacts();assert(fullFacts.fov>180);assert(full.frameResources.landscapeReadiness===1);await capturePixels('software-prepared-full-sphere');await save('prepared-full-sphere-facts.json',fullFacts);
await act('红外：关');const w3=await stablePaint(v=>v.w3Hook?.loaded.length>0&&v.frameResources.sourceImages.some(i=>i.family==='WIDE_FIELD_W3'));phase.push({name:'prepared-full-sphere-w3',...w3});assert(!w3.frameResources.sourceImages.some(i=>i.family==='galactic'));await capturePixels('software-prepared-full-sphere-w3');await act('红外：开');await frame('prepared-full-sphere-galactic-return');
await touch('touchstart',[{x:195,y:650}]);const traversed:any[]=[];for(let y=625;y>=75;y-=25){await touch('touchmove',[{x:195,y}]);const v=await frame('prepared-pan-y-'+y),facts=await landscapeFacts();traversed.push({y,...facts});if(facts.landscape?.opacity===0)break;}
assert(traversed.some(v=>v.landscape?.opacity===0));await capturePixels('software-prepared-landscape-faded');await save('prepared-landscape-traversed.json',traversed);
const belowPick=await page.evaluate(()=>{const s=globalThis.__pageCompletedPaints.at(-1),api=globalThis.actualSkyPage;const objects=s.objects.filter(o=>o.x>20&&o.x<370&&o.y>68&&o.y<736);return {frameAt:s.frameAt,landscapeOpacity:s.view.landscape?.opacity,objects:objects.map(o=>({reference:o.reference,x:o.x,y:o.y,choices:api.pickPaintedSkyObjects(s,{x:o.x,y:o.y,frameAt:s.frameAt,catalogVersion:s.catalogVersion,catalogHash:s.catalogHash}).map(c=>c.reference)}))};});assert(belowPick.objects.length>0&&belowPick.objects.every(o=>o.choices.includes(o.reference)));await save('prepared-below-horizon-painted-pick.json',belowPick);
for(const y of [...traversed].reverse().slice(1).map(f=>f.y).concat([650])){await touch('touchmove',[{x:195,y}]);await frame('prepared-pan-return-y-'+y);}await touch('touchcancel',[],[{x:195,y:650}]);const reverse=await frame('prepared-pan-cancelled');const reverseFacts=await landscapeFacts();for(const axis of ['right','up','forward'])for(let j=0;j<3;j++)assert(Math.abs(reverseFacts.basis[axis][j]-fullFacts.basis[axis][j])<1e-9);await capturePixels('software-prepared-full-sphere-return');
await zoom(45,'prepared-return-local');await act('模拟地景：开');await frame('prepared-local-ground-off');await search('M82','M:82');await zoom(.05,'prepared-fine-warm-return');const fineReturn=await optical('DETAIL');phase.push({name:'prepared-after-full-sphere-fine',...fineReturn});assert.equal(Date.parse(fineReturn.scene.at),Date.parse(commit.scene.at));assert.equal(binaries(),beforeTransfers);await capturePixels('software-prepared-fine-warm-return');
await save('public-canvas-touch-actions.json',gestures);await save('public-search-actions.json',publicSearch);await navBack();returned=await wait(v=>v.activeRoute==='pages/map/index'&&v.pendingNativeRequests===0&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0);phase.push({name:'prepared-return-original-map',...returned});assert.equal(returned.selectedSpotId,entry.selectedSpotId);
await save('prepared-combination-scope.json',{publicationHash:displayHash,initialPreparedBinaries:beforeTransfers,finalPreparedBinaries:binaries(),gridLayerRestore:true,trackedTimeCancelCommit:true,committedSourceBack:true,committedHideWarm:true,fullSphereLandscapeFade:true,actualW3:true,actualPaintedPicking:belowPick.objects.length,warmFineAfterFullSphere:true,ordinaryRegistry:false,nativeAcceptance:'UNVERIFIED',quality:'FAILED_RECTANGLE_NOT_ADOPTED'});
'''
code = code[:start] + scenario + code[end:]
assert code.count('failOpticalDetail=true') == 1
code = code.replace('failOpticalDetail=true', 'failOpticalDetail=false')
code = code.replace('ACTUAL_TARO_M82_PREPARED_PAGE_DEVELOPMENT', 'ACTUAL_TARO_PREPARED_REMAINING_COMBINATIONS_DEVELOPMENT')
target.write_text(code, encoding='utf-8')

old = ROOT / 'output/playwright/cloud-sky-prepared-m82-page-1004-r2'
out = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'output/playwright/cloud-sky-prepared-m82-combination-1004-r2')
out.mkdir(exist_ok=False)
def bind(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
copied = []
for name in ['page-bundle.js', 'source-bindings-before.json', 'metafile.json', 'observed-boundaries.json', 'executed-build.mts']:
    before = bind(old / name)
    shutil.copyfile(old / name, out / name)
    after = bind(out / name)
    assert before['bytes'] == after['bytes'] and before['sha256'] == after['sha256']
    copied.append({'before': before, 'after': after})
(out / 'reused-current-build.json').write_text(json.dumps({'scope': 'Unchanged current full page build reused; the runtime verifies every original input before and after. No build/source processing replay.', 'files': copied}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'script': bind(target), 'out': out.relative_to(ROOT).as_posix(), 'reusedBuildFiles': len(copied)}))
