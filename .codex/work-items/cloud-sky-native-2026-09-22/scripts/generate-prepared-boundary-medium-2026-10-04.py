"""Only the new cached 1024 parent condition; failed pair matrix is retained."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS=TASK/'scripts'
OLD=ROOT/'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1'
OUT=ROOT/'output/playwright/cloud-sky-prepared-boundary-medium-1004-r1'
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
for r in json.loads((OLD/'source-bindings-before.json').read_bytes()):assert bind(ROOT/r['path'])==r,r['path']
code=(SCRIPTS/'experience-prepared-boundary-pairs-2026-10-04.mts').read_text(encoding='utf-8')
start=code.index('const pairs:Record<string,any>={};')
end=code.index("\nawait page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage",start)
scenario=r'''
const finePath='output/prepared-hubble-fine-sampling-1004-r1/fine.png',mediumPath='output/prepared-hubble-medium-sampling-1004-r1/medium.png';
const finePin=await bind(finePath),mediumPin=await bind(mediumPath),mediumMeta=JSON.parse(await fs.readFile(path.join(root,'output/prepared-hubble-medium-sampling-1004-r1/medium.json'),'utf8'));
assert.deepEqual(mediumMeta.center,publication.center);assert.equal(mediumMeta.fieldDegrees,publication.levels.MEDIUM.fieldDegrees);
const fineResult=JSON.parse(await fs.readFile(path.join(root,'output/prepared-hubble-fine-sampling-1004-r1/result.json'),'utf8')),mediumResult=JSON.parse(await fs.readFile(path.join(root,'output/prepared-hubble-medium-sampling-1004-r1/result.json'),'utf8'));
assert.deepEqual(finePin,fineResult.png);assert.deepEqual(mediumPin,mediumResult.png);
const decoded=await page.evaluate(async(inputs)=>{
 const w=globalThis.__controlled,a=globalThis.actualSkyPage;w.boundaryLifetimes=true;w.boundaryRetires=[];const rows=[];
 for(const input of inputs){const image=new Image();image.src='data:image/png;base64,'+input.base64;await image.decode();if(image.naturalWidth!==1024||image.naturalHeight!==1024)throw Error('wrong actual high-medium bitmap');
  w.images.push({id:'higher-parent-'+input.mode,image,sourceSha256:input.pin.sha256,width:1024,height:1024,status:'decoded-task-higher-parent'});
  w.boundaryRetires.push(a.registerSkyNativeImageLifetime(image,()=>w.boundaryLifetimes));if(input.mode==='fine')w.samplingImage=image;else w.boundaryRawImage=image;
  rows.push({mode:input.mode,pin:input.pin,size:1024,bitmapLogicalRgbaBytes:4194304});
 }w.sampleResources('higher-parent-extra-bitmaps-decoded');return rows;
},await Promise.all([[finePath,finePin,'fine'],[mediumPath,mediumPin,'medium']].map(async([p,pin,mode])=>({pin,mode,base64:(await fs.readFile(path.join(root,p))).toString('base64')}))));
await save('boundary-task-decodes.json',decoded);
await page.evaluate(()=>{const w=globalThis.__controlled;w.samplingEnabled=true;w.boundaryCoarseMode='raw';w.phase='boundary-higher-medium';});
await touch('touchstart',[{x:195,y:422}]);await touch('touchmove',[{x:195,y:82}]);await touch('touchend',[],[{x:195,y:82}]);
const current=await stablePaint(v=>v.sdssHook?.renderedLevel==='DETAIL'&&v.completedSources?.optical===null&&v.frameResources?.sourceImages.some(i=>i.sha256===mediumPin.sha256&&i.width===1024)&&v.frameResources.sourceImages.some(i=>i.sha256===finePin.sha256));
phase.push({name:'boundary-higher-medium',...current});await capturePixels('software-boundary-higher-medium');
const actualQualifications=await page.evaluate(()=>(globalThis.__controlled.samplingActualQualifications??[]).filter(q=>q.phase==='boundary-higher-medium'));
assert(actualQualifications.some(q=>q.completed&&q.finePhoto==='positive'&&q.coarsePhoto==='positive'));
const observation=await page.evaluate(()=>globalThis.__controlled.boundaryObservation);assert.equal(observation.at,current.scene.at);await save('boundary-observation.json',observation);
await save('boundary-comparisons.json',{status:'ACTUAL_PAGE_NEW_1024_PARENT_BOUNDARY_CONDITION',at:current.scene.at,view:JSON.parse(current.canvas['data-sky-presented-view']),fine:finePin,medium:mediumPin,resources:current.resources,frameResources:current.frameResources,actualQualifications,
 oldPairMatrix:'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1/failed.json',oldStrictRestoration:'FAILED_KEEP_ORIGINAL_TWO_RGB_CHANNELS_DELTA1',sourceCompletion:null,
 limits:['One new higher-parent condition at the same actual public pan, not a repetition/repair of the failed cross-source matrix.',
 'Two task 1024 images use original normalized nominal geometry only. Original512 publication does not publish these pixels. Final source UNKNOWN.',
 'No RGB source decode/reprojection/fit/feather/sharpen/colour transform, ordinary publication or native/full quality/capacity acceptance.']});
await save('public-boundary-pan-actions.json',gestures);
await page.evaluate(()=>{const w=globalThis.__controlled;w.lifecycle(w.nativePage,'onHide');w.boundaryLifetimes=false;w.boundaryRetires.forEach(f=>f());delete w.boundaryRetires;delete w.samplingImage;delete w.boundaryRawImage;w.samplingEnabled=false;w.sampleResources('higher-parent-extra-bitmaps-retired');});
for(const pin of [finePin,mediumPin])assert.deepEqual(await bind(pin.path),pin);
'''
code=code[:start]+scenario+code[end:]
code=code.replace('ACTUAL_TARO_PREPARED_BOUNDARY_PAIRS_DEVELOPMENT','ACTUAL_TARO_PREPARED_HIGHER_PARENT_BOUNDARY_DEVELOPMENT')
target=SCRIPTS/'experience-prepared-boundary-medium-2026-10-04.mts'
with target.open('x',encoding='utf-8') as f:f.write(code)
OUT.mkdir(exist_ok=False);copies=[]
for name in ['page-bundle.js','source-bindings-before.json','metafile.json','observed-boundaries.json','executed-build.mts']:
 b=bind(OLD/name);shutil.copyfile(OLD/name,OUT/name);a=bind(OUT/name);assert (b['bytes'],b['sha256'])==(a['bytes'],a['sha256']);copies.append({'before':b,'after':a})
with (OUT/'reused-current-build.json').open('x',encoding='utf-8') as f:json.dump({'files':copies,'newBuilds':0,'reason':'Only one new real cached-mother 1024 MED parent condition and explicit current resource retirement. Original cross-source/strict failure retained, not repaired or replayed.'},f,indent=2);f.write('\n')
print(json.dumps({'script':bind(target),'newBuilds':0,'newSourceRgbWork':0}))
