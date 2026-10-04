"""A new boundary/pair condition in the current actual page, no source work."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS=TASK/'scripts'
OLD=ROOT/'output/playwright/cloud-sky-prepared-hubble-sampling-1004-r2'
OUT=ROOT/'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1'
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
for r in json.loads((OLD/'source-bindings-before.json').read_bytes()):assert bind(ROOT/r['path'])==r,r['path']
cp=json.loads((TASK/'tmp/prepared-boundary-before-2026-10-04/scope-before.json').read_bytes())
checkpoint='.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-boundary-current-inputs-2026-10-04.json'
with (ROOT/checkpoint).open('x',encoding='utf-8') as f:json.dump({'currentSources':cp['sources'],'protected':cp['protected']},f,indent=2);f.write('\n')
code=(SCRIPTS/'experience-prepared-hubble-sampling-qualified-2026-10-04.mts').read_text(encoding='utf-8')
code=code.replace('.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-sampling-current-inputs-2026-10-04.json',checkpoint)
old="if(w.samplingEnabled&&args[30]?.level==='DETAIL'){if(!w.samplingImage)throw Error('sampling bitmap absent');args[30]={...args[30],image:w.samplingImage};}"
new="w.boundaryObservation=args[1]?.observationFrames?.find(r=>r.at===args[2])??null;if(w.samplingEnabled&&args[30]?.level==='DETAIL'){if(!w.samplingImage)throw Error('sampling bitmap absent');const coarse=w.boundaryCoarseMode==='raw'?w.boundaryRawImage:w.boundaryCoarseMode==='display'?w.boundaryDisplayImage:null;if(coarse&&args[30].coarser?.level!=='MEDIUM')throw Error('real medium parent absent');args[30]={...args[30],image:w.samplingImage,...(coarse?{coarser:{...args[30].coarser,image:coarse}}:{})};}"
assert code.count(old)==1;code=code.replace(old,new)
for needle in ["await capturePixels('software-cold');","await capturePixels('software-prepared-fine');"]:
 assert code.count(needle)==1;code=code.replace(needle,'')
start=code.index("const trialPath='output/prepared-hubble-fine-sampling-1004-r1/fine.png';")
end=code.index("\nawait page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage",start)
scenario=r'''
const pairs:Record<string,any>={};
for(const [mode,p] of [['raw','output/prepared-large-raw-publication-1004-r1/manifest.json'],['display','output/prepared-large-display-publication-1004-r1/manifest.json']]){
 const ppin=await bind(p),pvalue=JSON.parse(await fs.readFile(path.join(root,p),'utf8'));assert.deepEqual(pvalue.center,publication.center);
 for(const level of ['OVERVIEW','MEDIUM','DETAIL'])assert(Math.abs(pvalue.levels[level].fieldDegrees-publication.levels[level].fieldDegrees)<Number.EPSILON);
 const asset=pvalue.levels.MEDIUM,assetPath=path.posix.join(path.posix.dirname(p),asset.file),pin=await bind(assetPath);assert.equal(pin.sha256,asset.sha256);assert.equal(pin.bytes,asset.bytes);
 pairs[mode]={manifest:ppin,publicationHash:pvalue.publicationHash,imageVersion:pvalue.imageVersion,asset,source:pvalue.source,pin,base64:(await fs.readFile(path.join(root,assetPath))).toString('base64')};
}
const trialPath='output/prepared-hubble-fine-sampling-1004-r1/fine.png',trialPin=await bind(trialPath),trialResult=JSON.parse(await fs.readFile(path.join(root,'output/prepared-hubble-fine-sampling-1004-r1/result.json'),'utf8'));assert.deepEqual(trialPin,trialResult.png);
const decoded=await page.evaluate(async({fine,pairs})=>{
 const w=globalThis.__controlled,a=globalThis.actualSkyPage;w.boundaryLifetimes=true;w.boundaryRetires=[];
 const rows=[];for(const [mode,input,size] of [['fine',fine,1024],['raw',pairs.raw,512],['display',pairs.display,512]]){
  const image=new Image();image.src='data:image/png;base64,'+input.base64;await image.decode();if(image.naturalWidth!==size||image.naturalHeight!==size)throw Error('wrong actual boundary bitmap '+mode);
  w.images.push({id:'boundary-'+mode,image,sourceSha256:input.pin.sha256,width:size,height:size,status:'decoded-task-boundary-prototype'});
  w.boundaryRetires.push(a.registerSkyNativeImageLifetime(image,()=>w.boundaryLifetimes));
  if(mode==='fine')w.samplingImage=image;else if(mode==='raw')w.boundaryRawImage=image;else w.boundaryDisplayImage=image;
  rows.push({mode,pin:input.pin,size,bitmapLogicalRgbaBytes:size*size*4});
 }w.sampleResources('boundary-extra-bitmaps-decoded');return rows;
},{fine:{pin:trialPin,base64:(await fs.readFile(path.join(root,trialPath))).toString('base64')},pairs});
await save('boundary-task-decodes.json',decoded);await save('boundary-coarse-pins.json',Object.fromEntries(Object.entries(pairs).map(([k,{base64,...v}])=>[k,v])));
await page.evaluate(()=>{const w=globalThis.__controlled;w.samplingEnabled=true;w.boundaryCoarseMode='hubble';w.phase='boundary-pan';});
await touch('touchstart',[{x:195,y:422}]);await touch('touchmove',[{x:195,y:82}]);await touch('touchend',[],[{x:195,y:82}]);
const redraw=async()=>{await act('赤道网格：关');await act('赤道网格：开');};
const comparisons:any[]=[];let matchingView:string|null=null,matchingAt:string|null=null;
for(const [mode,name] of [['hubble','hubble-coarse'],['raw','noirlab-raw-coarse'],['display','noirlab-display-coarse'],['hubble','hubble-coarse-restored']]){
 await page.evaluate(({mode,name})=>{const w=globalThis.__controlled;w.boundaryCoarseMode=mode;w.phase='boundary-'+name;},{mode,name});await redraw();
 const expected=mode==='hubble'?publication.levels.MEDIUM.sha256:pairs[mode].pin.sha256;
 const current=await stablePaint(v=>v.sdssHook?.renderedLevel==='DETAIL'&&v.completedSources?.optical===null&&v.frameResources?.sourceImages.some(i=>i.sha256===expected)&&v.frameResources.sourceImages.some(i=>i.sha256===trialPin.sha256));
 phase.push({name:'boundary-'+name,...current});
 if(matchingView===null){matchingView=current.canvas['data-sky-presented-view'];matchingAt=current.scene.at;}else{assert.equal(current.canvas['data-sky-presented-view'],matchingView);assert.equal(current.scene.at,matchingAt);}
 assert.notEqual(matchingView,fine.canvas['data-sky-presented-view'],'new actual public pan condition must differ from the closed centered case');
 await capturePixels('software-boundary-'+name);
 const qualified=await page.evaluate(name=>(globalThis.__controlled.samplingActualQualifications??[]).filter(q=>q.phase==='boundary-'+name),name);
 assert(qualified.some(q=>q.completed&&q.finePhoto==='positive'&&q.coarsePhoto==='positive'),'both real layers must actually contribute beyond the fine boundary');
 comparisons.push({mode,name,at:current.scene.at,view:JSON.parse(matchingView),resources:current.resources,frameResources:current.frameResources,qualification:qualified,sourceCompletion:current.completedSources.optical});
}
assert.equal(hash(await fs.readFile(path.join(out,'software-boundary-hubble-coarse.rgba'))),hash(await fs.readFile(path.join(out,'software-boundary-hubble-coarse-restored.rgba'))));
await save('boundary-comparisons.json',{status:'ACTUAL_PAGE_SAME_AND_CROSS_SOURCE_BOUNDARY_COMPARISON',comparisons,actualPanGesture:{start:{x:195,y:422},end:{x:195,y:82}},fine:trialPin,
 schema:'Explicit task pair, not admitted publication',coarseIdentityScope:'Hubble descriptor supplies only exactly matched normalized nominal TAN field; original NOIRLab image identities/real source descriptors are separately pinned. New final source completion UNKNOWN.',
 limits:['No geometric/colour fit, background estimate, feather mask, publication, ordinary registry or source processing.',
 'Both true fine and coarse colour contribution observed. This is one specific public pan at real time/location, not general registration/quality/native/physical capacity acceptance.']});
await save('boundary-observation.json',await page.evaluate(()=>globalThis.__controlled.boundaryObservation));await save('public-boundary-pan-actions.json',gestures);
await page.evaluate(()=>{const w=globalThis.__controlled;w.samplingEnabled=false;w.boundaryLifetimes=false;w.boundaryRetires.forEach(f=>f());delete w.boundaryRetires;delete w.samplingImage;delete w.boundaryRawImage;delete w.boundaryDisplayImage;w.sampleResources('boundary-extra-bitmaps-retired');});
for(const pair of Object.values(pairs)){assert.deepEqual(await bind(pair.manifest.path),pair.manifest);assert.deepEqual(await bind(pair.pin.path),pair.pin);}assert.deepEqual(await bind(trialPath),trialPin);
'''
code=code[:start]+scenario+code[end:]
code=code.replace("sampling:JSON.parse(await fs.readFile(path.join(out,'sampling-comparison.json'),'utf8'))","boundary:JSON.parse(await fs.readFile(path.join(out,'boundary-comparisons.json'),'utf8'))")
code=code.replace('ACTUAL_TARO_PREPARED_HUBBLE_SAMPLING_WITH_QUALIFICATION_DEVELOPMENT','ACTUAL_TARO_PREPARED_BOUNDARY_PAIRS_DEVELOPMENT')
target=SCRIPTS/'experience-prepared-boundary-pairs-2026-10-04.mts'
with target.open('x',encoding='utf-8') as f:f.write(code)
OUT.mkdir(exist_ok=False);copies=[]
for name in ['page-bundle.js','source-bindings-before.json','metafile.json','observed-boundaries.json','executed-build.mts']:
 b=bind(OLD/name);shutil.copyfile(OLD/name,OUT/name);a=bind(OUT/name);assert (b['bytes'],b['sha256'])==(a['bytes'],a['sha256']);copies.append({'before':b,'after':a})
with (OUT/'reused-current-build.json').open('x',encoding='utf-8') as f:json.dump({'files':copies,'newBuilds':0,'newSourceDownloadsDecodesProjectionsBackgroundFits':0,'reason':'One actual public pan exposes boundary, three cached pairs and exact return. Existing central/combination matrices not repeated.'},f,indent=2);f.write('\n')
print(json.dumps({'script':bind(target),'copiedBuilds':len(copies),'newBuilds':0,'unchangedFrontendSourcePins':len(json.loads((OLD/'source-bindings-before.json').read_bytes()))}))
