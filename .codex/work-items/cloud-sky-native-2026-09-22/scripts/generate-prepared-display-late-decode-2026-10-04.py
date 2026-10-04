"""One controlled native callback timing condition on the unchanged real page."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS = TASK / 'scripts'
OLD = ROOT / 'output/playwright/cloud-sky-prepared-display-combination-1004-r1'
OUT = ROOT / 'output/playwright/cloud-sky-prepared-display-late-decode-1004-r1'


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


code = (SCRIPTS / 'experience-prepared-display-combination-2026-10-04.mts').read_text(encoding='utf-8')
start = code.index("await zoom(.05,'prepared-combination-detail');")
end = code.index('\nawait page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage', start)
scenario = r'''
await zoom(.05,'prepared-late-cold-detail');const first=await optical('DETAIL');phase.push({name:'prepared-late-cold-detail-painted',...first});await capturePixels('software-prepared-late-cold-detail');
const binaries=()=>requests.filter(r=>r.binary&&r.route.startsWith('/v2/sky/prepared-optical/'+displayHash+'/')&&r.status===200).length;assert.equal(binaries(),3);const beforeTransfers=binaries();
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='prepared-late-first-hide';w.lifecycle(w.skyPage,'onHide');});const firstHidden=await wait(v=>v.pendingNativeRequests===0&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0&&v.owners.every(o=>o.leased===0&&o.running===0));phase.push({name:'prepared-late-first-hidden-retired',...firstHidden});
await page.evaluate(sha=>{const w=globalThis.__controlled;w.phase='prepared-late-held-show';w.lateDetailSha=sha;w.holdNextDetail=true;w.lifecycle(w.skyPage,'onShow');},publication.levels.DETAIL.sha256);
const held=await wait(v=>v.lateDecode.held.length===1&&v.nativeCounters.decodedPending===0&&v.pendingNativeRequests===0&&v.sdssHook.renderedLevel==='MEDIUM'&&v.completedSources?.optical?.field?.level==='MEDIUM');phase.push({name:'prepared-late-held-detail-coarse-painted',...held});assert(held.sdssHook.loading&&!held.sdssHook.updateFailed);assert.equal(held.completedSources.optical.publicationHash,displayHash);assert.equal(held.completedSources.optical.field.image.sha256,publication.levels.MEDIUM.sha256);assert.equal(held.lateDecode.held[0].sha256,publication.levels.DETAIL.sha256);assert.equal(held.lateDecode.held[0].rgbaEquivalentBytes,1048576);assert.equal(binaries(),beforeTransfers);await capturePixels('software-prepared-late-held-medium');
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='prepared-late-cancel-hide';w.lifecycle(w.skyPage,'onHide');});const canceled=await wait(v=>v.pendingNativeRequests===0&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0&&v.resources.gpuBufferUploadModelBytes===0&&v.owners.every(o=>o.leased===0&&o.running===0&&o.pending===0)&&v.lateDecode.held.length===1);phase.push({name:'prepared-late-cancel-hidden-retired',...canceled});assert(canceled.lateDecode.held.every(r=>r.callbackDetached));
const delivered=await page.evaluate(()=>{const w=globalThis.__controlled;const entries=w.heldImageCallbacks.splice(0);if(entries.length!==1)throw Error('one actual held callback required');const before={sceneCalls:globalThis.__pageSceneInputs.length,registered:w.nativeImageOwners.length};for(const r of entries){const detached=r.image.onload===null;r.fn.call(r.image,r.event);w.lateDecodeEvents.push({event:'late-delivered',phase:w.phase,id:r.id,sha256:r.sha256,callbackDetached:detached});}w.sampleResources('late-canceled-native-callback-delivered');return {delivered:entries.length,before,after:{sceneCalls:globalThis.__pageSceneInputs.length,registered:w.nativeImageOwners.length},events:w.lateDecodeEvents};});assert.deepEqual(delivered.before,delivered.after);
await page.waitForTimeout(150);const late=await inspect();phase.push({name:'prepared-late-delivered-stays-retired',...late});assert.equal(late.sceneCalls,canceled.sceneCalls);assert.equal(late.resources.activeDecodedImageHandles,0);assert.equal(late.resources.gpuTextureUploadModelBytes,0);assert(late.owners.every(o=>o.leased===0&&o.running===0&&o.pending===0));assert.equal(late.lateDecode.held.length,0);assert.equal(binaries(),beforeTransfers);await save('prepared-display-late-callback-delivery.json',delivered);
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='prepared-late-final-warm-show';w.lifecycle(w.skyPage,'onShow');});const warm=await optical('DETAIL');phase.push({name:'prepared-late-final-detail-painted',...warm});assert.equal(warm.scene.at,first.scene.at);assert.deepEqual(JSON.parse(warm.canvas['data-sky-presented-view']),JSON.parse(first.canvas['data-sky-presented-view']));assert.equal(binaries(),beforeTransfers);await capturePixels('software-prepared-late-final-detail');
await save('prepared-display-late-decode-scope.json',{publicationHash:displayHash,initialPreparedBinaries:beforeTransfers,finalPreparedBinaries:binaries(),actualFineCallbackHeld:held.lateDecode.held,coarseUntilReady:true,hiddenLeaseRetirement:true,callbackDetachedAndDelivered:true,lateNoNewSceneOrRegistration:true,finalWarmFine:true,ordinaryRegistry:false,nativeAcceptance:'UNVERIFIED',scope:'Only a controlled actual native Image load callback is delayed. Original byte acquisition/decode/React/page/request/lease/renderer code preserved. The one held 1MiB RGBA equivalent is port-retained transient ownership, separately reported; not a physical peak.'});
await save('public-canvas-touch-actions.json',gestures);await save('public-search-actions.json',publicSearch);await navBack();returned=await wait(v=>v.activeRoute==='pages/map/index'&&v.pendingNativeRequests===0&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0);phase.push({name:'prepared-late-return-original-map',...returned});assert.equal(returned.selectedSpotId,entry.selectedSpotId);
'''
code = code[:start] + scenario + code[end:]
needle="w.phase='bootstrap';w.bridgeOutputs=[];w.pendingNativeRequests=0;"
assert code.count(needle) == 1
wrapper = r'''
 // Delay a real decoded DETAIL Image callback once. No bytes, dimensions,
 // production callback body, cancellation token or file/GPU owner are changed.
 w.heldImageCallbacks=[];w.lateDecodeEvents=[];w.holdNextDetail=false;w.lateDetailSha=null;
 const originalMakeCanvas=w.makeCanvasNode;w.makeCanvasNode=(...args)=>{const node=originalMakeCanvas(...args),create=node.createImage;node.createImage=()=>{const image=create();let callback=null;Object.defineProperty(image,'onload',{configurable:true,get:()=>callback,set:value=>{callback=value;}});image.addEventListener('load',event=>{const fn=callback;if(typeof fn!=='function')return;const record=w.images.find(r=>r.image===image||r.weakImage?.deref()===image);if(w.holdNextDetail&&record?.sourceSha256===w.lateDetailSha){w.holdNextDetail=false;const held={fn,image,event,id:record.id,sha256:record.sourceSha256,width:record.width,height:record.height,rgbaEquivalentBytes:4*record.width*record.height};w.heldImageCallbacks.push(held);w.lateDecodeEvents.push({event:'held',phase:w.phase,id:held.id,sha256:held.sha256,rgbaEquivalentBytes:held.rgbaEquivalentBytes});w.sampleResources('actual-native-detail-callback-held');return;}fn.call(image,event);});return image;};return node;};
'''
code = code.replace(needle, needle + wrapper)
needle='nativeCounters:w.counters(),sdssHook:'
assert code.count(needle) == 1
code = code.replace(needle, 'lateDecode:{held:w.heldImageCallbacks.map(({fn,image,event,...r})=>({...r,callbackDetached:image.onload===null})),events:w.lateDecodeEvents},' + needle)
code = code.replace('ACTUAL_TARO_PREPARED_DISPLAY_COMBINATIONS_DEVELOPMENT', 'ACTUAL_TARO_PREPARED_DISPLAY_LATE_DECODE_DEVELOPMENT')
target = SCRIPTS / 'experience-prepared-display-late-decode-2026-10-04.mts'
with target.open('x', encoding='utf-8') as stream:
    stream.write(code)
for row in json.loads((OLD / 'source-bindings-before.json').read_bytes()):
    assert bind(ROOT / row['path']) == row, row['path']
OUT.mkdir(exist_ok=False)
copied = []
for name in ['page-bundle.js', 'source-bindings-before.json', 'metafile.json', 'observed-boundaries.json', 'executed-build.mts']:
    before = bind(OLD / name)
    shutil.copyfile(OLD / name, OUT / name)
    after = bind(OUT / name)
    assert (before['bytes'], before['sha256']) == (after['bytes'], after['sha256'])
    copied.append({'before': before, 'after': after})
with (OUT / 'reused-current-build.json').open('x', encoding='utf-8') as stream:
    stream.write(json.dumps({'files': copied, 'scope': 'Unchanged full page build; one controlled native callback timing condition, no rebuild/image processing or production change.'}, indent=2) + '\n')
print(json.dumps({'script': bind(target), 'reusedBuildFiles': len(copied)}))
