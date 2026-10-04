from pathlib import Path
root=Path(__file__).resolve().parents[4];folder=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts'
builder=(folder/'build-real-taro-horizontal-interruption-2026-10-04.mts').read_text(encoding='utf8').replace('r59.json','r60.json')
builder=builder.replace("export * from './src/services/api-client';", "export {skyImageContentHash} from '@starward/miniapp-contracts';\nexport * from './src/services/api-client';",1)
plugin=r'''  b.onLoad({filter:/[\\/]sky-gpu-textures\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');const needle='get(source: object) { return getWindow(source).texture; }, getWindow,';assert(raw.includes(needle));
   const wrapper=`get(source: object) { return getWindow(source).texture; }, getWindow(source: object,requested?: SkyGpuTextureWindow) {
     const effective=globalThis.__textureWindowRequest ? globalThis.__textureWindowRequest(source,requested) : requested;
     const entry=getWindow(source,effective);globalThis.__recordTextureWindow?.(source,requested,effective,entry.window,entry.bytes,!!entry.texture);return entry;
   },`;
   const modified=raw.replace(needle,wrapper);observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(modified)),scope:'Original getWindow request/result diagnostics; optional task-only frozen-window counterfactual explicitly recorded, no product source edit.'});return {contents:modified,loader:'ts'};
  });
'''
builder=builder.replace('  b.onLoad({filter:',plugin+'  b.onLoad({filter:',1)
(folder/'build-real-taro-texture-window-return-2026-10-04.mts').write_text(builder,encoding='utf8')
s=(folder/'experience-real-taro-horizontal-interruption-2026-10-04.mts').read_text(encoding='utf8').replace('r59.json','r60.json')
s=s.replace(' w.imageInfo=imageMetadata;',''' w.imageInfo=imageMetadata;w.textureWindows=new Map();w.textureWindowEvents=[];
 globalThis.__recordTextureWindow=(source,requested,effective,resident,bytes,available)=>{const info=imageMetadata(source);if(!info)return;const row={phase:w.phase,...info,requested:requested??null,effective:effective??null,resident:{...resident},bytes,available,counterfactual:!!globalThis.__textureWindowRequest};const previous=w.textureWindows.get(info.objectId);w.textureWindows.set(info.objectId,row);if(!previous||JSON.stringify({...previous,phase:undefined})!==JSON.stringify({...row,phase:undefined}))w.textureWindowEvents.push(row);};''',1)
start=s.index('const view=(v:any)=>');end=s.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide',start)
main=r'''
const view=(v:any)=>JSON.parse(v.canvas['data-sky-presented-view']);
const sameCamera=(a:any,b:any)=>{assert.equal(a.scene.at,b.scene.at);assert.deepEqual(view(a),view(b));};
const frame=async(name:string)=>{await page.evaluate(n=>globalThis.__controlled.phase=n,name);const v=await stablePaint(v=>v.canvas?.['data-sky-scene-state']==='READY');phase.push({name,...v});return v;};
const decodedAndWindows=async(name:string)=>{const rows=await page.evaluate(()=>{const w=globalThis.__controlled,api=globalThis.actualSkyPage,refs=w.frameResources.at(-1).sourceImages;return refs.map(ref=>{const owner=w.nativeImageOwners.find(r=>!r.retired&&r.objectId===ref.objectId);const image=owner?.weakImage.deref();if(!image)throw Error('active source no native image');const canvas=document.createElement('canvas');canvas.width=ref.width;canvas.height=ref.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);const rgba=context.getImageData(0,0,ref.width,ref.height).data;const result={...ref,decodedRgba:{bytes:rgba.byteLength,sha256:api.skyImageContentHash(new Uint8Array(rgba.buffer,rgba.byteOffset,rgba.byteLength))},window:w.textureWindows.get(ref.objectId)??null};canvas.width=canvas.height=0;return result;});});await save(name+'-decoded-windows.json',rows);return rows;};
await touch('touchstart',touches(280));await touch('touchmove',touches(120));await touch('touchend',[],touches(120));await frame('window-history-wide');
await touch('touchstart',touches(140));await touch('touchmove',touches(180));await touch('touchend',[],touches(180));
const before=await frame('natural-before-hide');const beforeRows=await decodedAndWindows('natural-before-hide');await capturePixels('software-natural-before');
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='natural-hide';w.lifecycle(w.skyPage,'onHide');});const hidden=await wait(v=>v.pendingNativeRequests===0&&v.owners.every(o=>o.leased===0&&o.running===0)&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0&&v.resources.gpuBufferUploadModelBytes===0);phase.push({name:'natural-hide-retired',...hidden});
await page.evaluate(()=>globalThis.__controlled.lifecycle(globalThis.__controlled.skyPage,'onShow'));const returned=await frame('natural-return-fresh');sameCamera(before,returned);const returnRows=await decodedAndWindows('natural-return-fresh');await capturePixels('software-natural-return');
// A task-only counterfactual asks the unchanged original getWindow for the
// exact old legal resident windows, keyed by original encoded source hash.
// This is not ordinary behavior, a fix, or source/native/acceptance evidence.
await page.evaluate(rows=>{const byHash=new Map(rows.filter(r=>r.window?.available).map(r=>[r.sha256,r.window.resident]));globalThis.__textureWindowRequest=(source,requested)=>byHash.get(globalThis.__controlled.imageInfo(source)?.sha256)??requested;},beforeRows);
await act('地平网格：关');await frame('counterfactual-trigger-grid-on');await act('地平网格：开');const frozen=await frame('counterfactual-old-windows');sameCamera(before,frozen);await decodedAndWindows('counterfactual-old-windows');await capturePixels('software-frozen-window-return');
await page.evaluate(()=>{delete globalThis.__textureWindowRequest;const w=globalThis.__controlled;w.phase='restore-natural-hide';w.lifecycle(w.skyPage,'onHide');});await wait(v=>v.pendingNativeRequests===0&&v.owners.every(o=>o.leased===0&&o.running===0)&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0);
await page.evaluate(()=>globalThis.__controlled.lifecycle(globalThis.__controlled.skyPage,'onShow'));const restored=await frame('natural-restored-fresh');sameCamera(before,restored);await decodedAndWindows('natural-restored-fresh');await capturePixels('software-natural-restored');
await save('texture-window-events.json',await page.evaluate(()=>globalThis.__controlled.textureWindowEvents));await save('public-gesture-actions.json',gestures);
'''
s=s[:start]+main+s[end:]
s=s.replace('ACTUAL_TARO_HORIZONTAL_ORBIT_GESTURE_INTERRUPTION_DEVELOPMENT','ACTUAL_TARO_TEXTURE_WINDOW_RETURN_DIAGNOSIS')
s=s.replace('sceneCalls:returned.sceneCalls','sceneCalls:restored.sceneCalls')
(folder/'experience-real-taro-texture-window-return-2026-10-04.mts').write_text(s,encoding='utf8')
print('created task-only window/result/decode diagnostic and explicit counterfactual')
