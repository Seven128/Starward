from pathlib import Path
root=Path(__file__).resolve().parents[4];folder=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts'
builder=(folder/'build-real-taro-w3-ready-journey-2026-10-04.mts').read_text(encoding='utf8').replace('r58.json','r59.json')
(folder/'build-real-taro-horizontal-interruption-2026-10-04.mts').write_text(builder,encoding='utf8')
s=(folder/'experience-real-taro-w3-ready-journey-2026-10-04.mts').read_text(encoding='utf8').replace('r58.json','r59.json')
s=s.replace("v.pendingNativeRequests===0&&v.owners.every", "v.pendingNativeRequests===0&&v.nativeCounters.decodedPending===0&&v.owners.every",1)
start=s.index('const fullW3=');end=s.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide',start)
main=r'''
const view=(v:any)=>JSON.parse(v.canvas['data-sky-presented-view']);
const basisOf=(v:any)=>view(v).basis;
const dot=(a:number[],b:number[])=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sameCamera=(a:any,b:any)=>{assert.equal(a.scene.at,b.scene.at);const va=view(a),vb=view(b);assert(Math.abs(va.verticalFovDeg-vb.verticalFovDeg)<1e-9);for(const k of ['right','up','forward'])for(let j=0;j<3;j++)assert(Math.abs(va.basis[k][j]-vb.basis[k][j])<1e-9,k+j);};
const frame=async(name:string)=>{await page.evaluate(n=>globalThis.__controlled.phase=n,name);const v=await stablePaint(v=>v.canvas?.['data-sky-scene-state']==='READY');phase.push({name,...v});
 const facts=await page.evaluate(()=>{const s=globalThis.__pageCompletedPaints.at(-1),m=s.view.landscape;return {frameAt:s.frameAt,catalogVersion:s.catalogVersion,catalogHash:s.catalogHash,basis:s.view.basis,fov:s.view.verticalFovDeg,center:s.view.center,landscape:m?{kind:m.kind,opacity:m.opacity??1}:null,objects:s.objects.length};});
 await save(name+'-facts.json',facts);return v;};
await touch('touchstart',touches(280));await touch('touchmove',touches(120));await touch('touchend',[],touches(120));
const orbitStart=await frame('horizontal-orbit-start');assert(view(orbitStart).verticalFovDeg>=60);
const center=view(orbitStart).center;assert(center.x>160&&center.x<230&&center.y>120&&center.y<700);
const orbit:any[]=[];let cumulative=0,last=basisOf(orbitStart),quarter=1;
const axis=last.up;
for(let i=0;i<32&&Math.abs(cumulative)<Math.PI*2;i++){
 await touch('touchstart',[{x:center.x-145,y:center.y}]);
 for(const x of [center.x-45,center.x+55,center.x+145]){
  await touch('touchmove',[{x,y:center.y}]);const v=await frame('horizontal-'+i+'-'+Math.round(x));const b=basisOf(v);
  const step=Math.atan2(dot(axis,cross(last.forward,b.forward)),dot(last.forward,b.forward));
  assert(Math.abs(step)>1e-5&&Math.abs(step)<Math.PI/2,'noncontinuous horizontal step');
  if(orbit.length)assert(Math.sign(step)===Math.sign(orbit[0].step),'horizontal direction reversed');
  assert(dot(axis,b.up)>1-1e-9,'horizontal screen axis drift');cumulative+=step;
  assert(v.scene.at===orbitStart.scene.at&&v.selection.length===0&&!v.modal,'drag accidentally selected or changed time');
  orbit.push({name:phase.at(-1).name,step,cumulative,basis:b,frameAt:v.scene.at,frameResources:v.frameResources,sourceIdentities:v.frameResources.sourceImages});last=b;
  if(Math.abs(cumulative)>=quarter*Math.PI/2){await capturePixels('software-horizontal-quarter-'+quarter);quarter++;}
 }
 await touch('touchend',[],[{x:center.x+145,y:center.y}]);
}
assert(Math.abs(cumulative)>Math.PI*2,'did not complete a horizontal full revolution');await save('horizontal-orbit.json',{axis,orbitStart:view(orbitStart),cumulative,orbit});
const committed=await frame('horizontal-orbit-committed');await capturePixels('software-horizontal-committed');
// Start with one finger, add the second after a real pan, release just one,
// then cancel the whole original transaction. No direct camera state writes.
const start=[{x:center.x,y:center.y}],moved=[{x:center.x+45,y:center.y-30}],pair=[...moved,{x:center.x+95,y:center.y-30}];
await touch('touchstart',start);await touch('touchmove',moved);const single=await frame('single-pan-in-progress');assert.notDeepEqual(basisOf(single),basisOf(committed));
await touch('touchstart',pair);await touch('touchmove',[{x:center.x+20,y:center.y-30},{x:center.x+120,y:center.y-30}]);const pinched=await frame('added-second-finger-pinch');assert(view(pinched).verticalFovDeg<view(committed).verticalFovDeg);
await touch('touchend',[{x:center.x+20,y:center.y-30}],[{x:center.x+120,y:center.y-30}]);
await touch('touchmove',[{x:center.x+60,y:center.y+15}]);const remaining=await frame('remaining-finger-after-pinch');sameCamera(pinched,remaining);assert.equal(remaining.selection.length,0);
await touch('touchcancel',[],[{x:center.x+60,y:center.y+15}]);const cancelled=await frame('mixed-gesture-cancelled');sameCamera(committed,cancelled);await capturePixels('software-mixed-cancelled');
// A complete release commits zoom and ignores later stale move/end events.
await touch('touchstart',touches(140));await touch('touchmove',touches(180));const beforeRelease=await frame('pinch-before-complete-release');
await touch('touchend',[touches(180)[0]],[touches(180)[1]]);await touch('touchend',[],[touches(180)[0]]);const released=await frame('complete-release-committed');sameCamera(beforeRelease,released);
await touch('touchmove',[{x:center.x+60,y:center.y}]);await touch('touchend',[],[{x:center.x+60,y:center.y}]);const late=await frame('late-events-after-release');sameCamera(released,late);assert.equal(late.selection.length,0);
// Third finger cancels; the later completion cannot revive the transaction.
await touch('touchstart',start);await touch('touchmove',moved);await frame('third-finger-prior-pan');
await touch('touchstart',[...pair,{x:center.x+130,y:center.y-30}]);const third=await frame('third-finger-cancelled');sameCamera(released,third);
await touch('touchend',[],pair);const thirdEnd=await frame('third-finger-late-end');sameCamera(released,thirdEnd);assert.equal(thirdEnd.selection.length,0);
// Installed actual page lifecycle interrupts a live mixed gesture. It must
// retire active resources and restore the original camera upon show.
await capturePixels('software-before-background');await touch('touchstart',start);await touch('touchmove',moved);await touch('touchstart',pair);await touch('touchmove',[{x:center.x+15,y:center.y-30},{x:center.x+125,y:center.y-30}]);await frame('background-mixed-gesture-in-progress');
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='actual-background-mid-gesture';w.lifecycle(w.skyPage,'onHide');});
const hidden=await wait(v=>v.pendingNativeRequests===0&&v.owners.every(o=>o.leased===0&&o.running===0)&&v.resources.activeDecodedImageHandles===0&&v.resources.gpuTextureUploadModelBytes===0&&v.resources.gpuBufferUploadModelBytes===0);phase.push({name:'actual-background-retired',...hidden});
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='actual-show-after-interruption';w.lifecycle(w.skyPage,'onShow');});const returned=await frame('actual-show-restored-original-transaction');sameCamera(released,returned);assert.equal(returned.selection.length,0);await capturePixels('software-after-background');
await save('actual-lifecycle-interruption.json',await page.evaluate(()=>{const w=globalThis.__controlled;return {lifecycle:w.lifecycleEvents,sameCurrentSkyInstance:w.nativePage===w.skyPage};}));await save('public-gesture-actions.json',gestures);
'''
s=s[:start]+main+s[end:]
s=s.replace('ACTUAL_TARO_W3_FULL_READY_SOURCE_RETIREMENT_DEVELOPMENT','ACTUAL_TARO_HORIZONTAL_ORBIT_GESTURE_INTERRUPTION_DEVELOPMENT')
(folder/'experience-real-taro-horizontal-interruption-2026-10-04.mts').write_text(s,encoding='utf8')
print('created task-only horizontal/interruption builder and runner')
