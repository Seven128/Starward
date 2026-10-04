"""Reuse current actual-page instrumentation; only a bounded sampling trial.

The raw publication provides unchanged nominal UV geometry and an old baseline.
1024 bytes are task pixels, never certified by that publication/source receipt.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS=TASK/'scripts'
OLD=ROOT/'output/playwright/cloud-sky-prepared-display-combination-1004-r1'
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def write(p,text):
 with p.open('x',encoding='utf-8') as f:f.write(text)
cp=json.loads((TASK/'tmp/prepared-sampling-before-2026-10-04/scope-before.json').read_bytes())
for row in cp['sources']+cp['protected']:assert bind(ROOT/row['path'])==row,row['path']
checkpoint='.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-sampling-current-inputs-2026-10-04.json'
write(ROOT/checkpoint,json.dumps({'currentSources':cp['sources'],'protected':cp['protected']},indent=2)+'\n')
pubpath='output/hubble-m82-prepared-publication-1004-r2/manifest.json'
pub=json.loads((ROOT/pubpath).read_bytes());oldhash='97bd0d5b1ebb48e47cb147d273838f79566ea9f72f2bbfa446c2e73fd3736b9c'
newhash=pub['publicationHash']
build=(OLD/'executed-build.mts').read_text(encoding='utf-8')
assert build.count("kind:'prepared-display-optical-v1'")==1
build=build.replace("kind:'prepared-display-optical-v1'","kind:'prepared-optical-v1'").replace(oldhash,newhash)
build=build.replace('.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-display-page-current-inputs-2026-10-04.json',checkpoint)
needle="export {pickPaintedSkyObjects} from './src/features/sky/sky-object-picking';"
assert build.count(needle)==1
build=build.replace(needle,needle+"\nexport {registerSkyNativeImageLifetime} from './src/features/sky/sky-artwork-loader';")
buildpath=SCRIPTS/'build-prepared-hubble-sampling-page-2026-10-04.mts';write(buildpath,build)
code=(SCRIPTS/'experience-prepared-display-combination-2026-10-04.mts').read_text(encoding='utf-8')
code=code.replace('.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-display-combination-current-inputs-2026-10-04.json',checkpoint)
code=code.replace('output/prepared-large-display-publication-1004-r1/manifest.json',pubpath).replace(oldhash,newhash)
code=code.replace('239f0f154f0b37bb69cf92628419563db776aec9da07a04e6968291e66567986',bind(ROOT/pubpath)['sha256'])
# Apply a task raster at the original Scene input boundary. Its old 512 asset
# descriptor is used only for normalized nominal footprint, never new identity.
needle="globalThis.__recordActualSkyScene=(args,draw)=>{"
assert code.count(needle)==1
code=code.replace(needle,needle+"if(w.samplingEnabled&&args[30]?.level==='DETAIL'){if(!w.samplingImage)throw Error('sampling bitmap absent');args[30]={...args[30],image:w.samplingImage};}")
needle="return (...values)=>{const result=Reflect.apply(fn,t,values);"
assert code.count(needle)==1
code=code.replace(needle,"return (...values)=>{if(w.samplingEnabled&&k==='artworkLevelsContribution')return {completed:false,qualification:{fine:'unknown',coarse:'unknown',any:'unknown'},finePhoto:'unknown',coarsePhoto:'unknown'};const result=Reflect.apply(fn,t,values);")
start=code.index("const binaries=()=>requests.filter(")
end=code.index("\nawait page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage",start)
scenario=r'''
const trialPath='output/prepared-hubble-fine-sampling-1004-r1/fine.png';
const trialPin=await bind(trialPath),trialResult=JSON.parse(await fs.readFile(path.join(root,'output/prepared-hubble-fine-sampling-1004-r1/result.json'),'utf8'));
assert.deepEqual(trialPin,trialResult.png);const bytes=await fs.readFile(path.join(root,trialPath));
const trialDecode=await page.evaluate(async({base64,pin})=>{
 const w=globalThis.__controlled,a=globalThis.actualSkyPage,image=new Image();
 image.src='data:image/png;base64,'+base64;await image.decode();if(image.naturalWidth!==1024||image.naturalHeight!==1024)throw Error('wrong actual sampling bitmap');
 w.samplingImage=image;w.samplingLifetime=true;
 w.images.push({id:'task-fine-1024',image,sourceSha256:pin.sha256,width:image.naturalWidth,height:image.naturalHeight,status:'decoded-task-sampling-prototype'});
 w.samplingRetire=a.registerSkyNativeImageLifetime(image,()=>w.samplingLifetime);
 w.sampleResources('sampling-extra-bitmap-decoded');return {actualWidth:image.naturalWidth,actualHeight:image.naturalHeight,pin,bitmapLogicalRgbaBytes:4*image.naturalWidth*image.naturalHeight};
},{base64:bytes.toString('base64'),pin:trialPin});
await save('sampling-trial-decode.json',trialDecode);
const redraw=async()=>{await act('赤道网格：关');await act('赤道网格：开');};
await page.evaluate(()=>{globalThis.__controlled.samplingEnabled=true;globalThis.__controlled.phase='prepared-task-fine-1024';});
await redraw();const prototype=await stablePaint(v=>v.sdssHook?.renderedLevel==='DETAIL'&&v.completedSources?.optical===null&&v.frameResources?.sourceImages.some(i=>i.sha256===trialPin.sha256&&i.width===1024));
phase.push({name:'prepared-task-fine-1024',...prototype});await capturePixels('software-prepared-fine-1024');
assert.deepEqual(JSON.parse(prototype.canvas['data-sky-presented-view']),JSON.parse(fine.canvas['data-sky-presented-view']));assert.equal(prototype.scene.at,fine.scene.at);
assert.equal(prototype.completedSources.optical,null,'task pixels cannot certify original published source');
await page.evaluate(()=>{globalThis.__controlled.samplingEnabled=false;globalThis.__controlled.phase='prepared-original-fine-restored';});
await redraw();const restored=await optical('DETAIL');phase.push({name:'prepared-original-fine-restored',...restored});await capturePixels('software-prepared-fine-restored');
assert.deepEqual(JSON.parse(restored.canvas['data-sky-presented-view']),JSON.parse(fine.canvas['data-sky-presented-view']));assert.equal(restored.scene.at,fine.scene.at);
const baselineRgba=await fs.readFile(path.join(out,'software-prepared-fine.rgba')),newRgba=await fs.readFile(path.join(out,'software-prepared-fine-1024.rgba')),restoredRgba=await fs.readFile(path.join(out,'software-prepared-fine-restored.rgba'));
assert.equal(hash(baselineRgba),hash(restoredRgba));let changedRgbChannels=0;for(let i=0;i<newRgba.length;i++)if(i%4!==3&&newRgba[i]!==baselineRgba[i])changedRgbChannels++;assert(changedRgbChannels>1000);
await page.evaluate(()=>{const w=globalThis.__controlled;w.samplingLifetime=false;w.samplingRetire();delete w.samplingRetire;delete w.samplingImage;w.sampleResources('sampling-extra-bitmap-retired');});
await save('sampling-comparison.json',{status:'NEW_FINE_SAMPLING_ACTUAL_PAGE_DEVELOPMENT',oldPublication:publicationPin,prototype:trialPin,
 oldShape:[512,512],newShape:[1024,1024],actualDpr:1,actualSameViewAndInstant:true,originalRestorationExact:true,changedRgbChannels,
 originalFine:fine.resources,newFine:prototype.resources,restoredFine:restored.resources,prototypePublishedSource:null,
 limits:['Old raw publication supplies nominal geometry and old baseline only; new bitmap is not admitted/published by old v1.',
 'One task image decode/registered lifetime/actual Scene input substitution; original actual page, Hook/coarse bitmap/renderer policy retained.',
 'Logical textures/native RGBA models exclude physical driver/native/GC peaks. Not quality, native runtime, ordinary adoption or capacity acceptance.']});
assert.deepEqual(await bind(trialPath),trialPin);
'''
code=code[:start]+scenario+code[end:]
code=code.replace('ACTUAL_TARO_PREPARED_DISPLAY_COMBINATIONS_DEVELOPMENT','ACTUAL_TARO_PREPARED_HUBBLE_SAMPLING_DEVELOPMENT')
code=code.replace("requests:requests.length,\n scope:","requests:requests.length,sampling:JSON.parse(await fs.readFile(path.join(out,'sampling-comparison.json'),'utf8')),\n scope:")
runpath=SCRIPTS/'experience-prepared-hubble-sampling-page-2026-10-04.mts';write(runpath,code)
print(json.dumps({'build':bind(buildpath),'runtime':bind(runpath),'productionSourceChanges':0,'checkpointSources':len(cp['sources'])}))
