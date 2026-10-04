"""Reuse the existing real-page build/native/resource owners for this new input.
Only task adapters/telemetry and the bounded M82 journey differ; product JSX and
Map business remain actual source. The generated scripts archive themselves.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts'
DEVELOPMENT=ROOT/'output/sdss-m82-display-page-development-1004-r1'
HASH='74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab'
names=['build-real-taro-entry-journey-2026-10-04.mts','experience-real-taro-entry-journey-2026-10-04.mts']
templates=[(TASK/n).read_text(encoding='utf-8') for n in names]
bindings=[{'path':(TASK/n).relative_to(ROOT).as_posix(),'bytes':len((TASK/n).read_bytes()),'sha256':hashlib.sha256((TASK/n).read_bytes()).hexdigest()} for n in names]
receipt=DEVELOPMENT/'template-bindings.json'
if receipt.exists():assert json.loads(receipt.read_bytes())==bindings
else:receipt.write_text(json.dumps(bindings,indent=2)+'\n',encoding='utf-8')
def replace(s,a,b):
 assert s.count(a)==1,(a,s.count(a));return s.replace(a,b,1)
build,run=templates
build=replace(build,'const allowed=new Set<string>();',"const allowed=new Set(['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx']);")
build=replace(build,"createPageConfig(SpotSkyPage,'sky-task-page-'+(++skySequence))",f"createPageConfig(()=>React.createElement(SpotSkyPage,{{sdssOpticalPublication:{{reference:'M:82',publicationHash:'{HASH}',artworkContributions:{{auxiliaryBytesLimit:15803512,maxGroups:1}}}}}}),'sky-task-page-'+(++skySequence))")
hook=r"""
  b.onLoad({filter:/[\\/]use-sky-sdss-optical\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function useSkySdssOptical('));
   const s=raw.replace('export function useSkySdssOptical(','function originalUseSkySdssOptical(')+
    '\nexport function useSkySdssOptical(...args:Parameters<typeof originalUseSkySdssOptical>){const value=originalUseSkySdssOptical(...args),w=globalThis.__controlled;w.sdssHook={reference:args[0],fov:args[1],active:args[4],pin:args[5],requested:value.requested,loading:value.loading,updateFailed:value.updateFailed,status:value.status,renderedLevel:value.renderedLevel,publicationHash:value.publication?.publicationHash,imageVersion:value.publication?.imageVersion,image:value.image?w.imageInfo(value.image):null,coarser:value.coarser?{level:value.coarser.level,image:w.imageInfo(value.coarser.image)}:null};return value;}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Read-only actual Hook result; original Hook body/return/React execution preserved.'});return {contents:s,loader:'ts'};
  });
"""
build=replace(build,"  b.onLoad({filter:/[\\\\/]use-sky-wide-field-w3\\.ts$/},async a=>{",hook+"  b.onLoad({filter:/[\\\\/]use-sky-wide-field-w3\\.ts$/},async a=>{")
run=replace(run,"const allowed=new Set<string>();","const allowed=new Set(['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx']);")
run=replace(run,"const service=createTestMiniappService({skyCatalog:createBsc5pSkyCatalogProvider('bsc5p-bright-stars.v3')});",f"""const {{SdssOpticalImageryService}}=await import('../../../../workers/miniapp-api/src/sdss-optical-imagery.ts');
const publicationPath='output/sdss-m82-display-publication-1004-r2/publication/manifest.json';
const publicationPin=await bind(publicationPath);assert.equal(publicationPin.sha256,'398827534fab1003b7fbe4cad29ab7ae6e0b8a1a9eb7222e12ba1e926aa47a6a');
const displayHash='{HASH}',publication=JSON.parse(await fs.readFile(path.join(root,publicationPath),'utf8'));
const sdss=new SdssOpticalImageryService({{calibratedPublications:[{{reference:'M:82',expectedHash:displayHash,manifestUrl:new URL('file:///'+path.join(root,publicationPath).replaceAll('\\\\','/'))}}]}});
assert.equal(new SdssOpticalImageryService().hasRegisteredPublicationHash(displayHash),false);
await save('explicit-publication-input.json',{{manifest:publicationPin,hash:displayHash,ordinaryRegistry:false,caller:'SpotSkyPageProps, not route or product feature switch'}});
const service=createTestMiniappService({{skyCatalog:createBsc5pSkyCatalogProvider('bsc5p-bright-stars.v3'),sdssOpticalImages:sdss}});""")
run=replace(run,"let failMoonImage=false,failOpticalDetail=process.argv[4]==='integrated';","let failMoonImage=false,failOpticalDetail=true;")
run=replace(run,'M-51-detail\\.jpg$','M-82-detail\\.png$')
run=replace(run,"p.startsWith(path.join(root,'workers/miniapp-api/assets')+path.sep)","(p.startsWith(path.join(root,'workers/miniapp-api/assets')+path.sep)||p.startsWith(path.dirname(path.join(root,'output/sdss-m82-display-publication-1004-r2/publication/manifest.json'))+path.sep))")
# Include all actual coarse/fine participating fields and retain the surface
# identity relation when the read-only task method proxy wraps the real owner.
run=replace(run,"if(args[30]?.image)refs.push(image('sdss-optical',args[30].image));","if(args[30]?.image)refs.push({...image('sdss-optical',args[30].image),level:args[30].level});if(args[30]?.coarser?.image)refs.push({...image('sdss-optical',args[30].coarser.image),level:args[30].coarser.level});")
run=replace(run," const result=draw(...args),snapshot=globalThis.__pageCompletedPaints.at(-1);"," for(const index of [36,37,38])if(args[index]?.surface===target)args[index]={...args[index],surface:args[0]};\n const result=draw(...args),snapshot=globalThis.__pageCompletedPaints.at(-1);")
run=replace(run,"const c=sources.sdssOptical;w.completedSources.push", "const c=sources.sdssOptical,field=c?.kind==='legacy'?c.field:c?.participatingFields?.find(f=>f.slot==='fine')??c?.participatingFields?.[0];w.completedSources.push")
run=replace(run,"field:c.field?{level:c.field.level,fieldDegrees:c.field.fieldDegrees,image:imageMetadata(c.field.image)}:null", "field:field?{level:field.level,fieldDegrees:field.fieldDegrees,image:imageMetadata(field.image)}:null")
run=replace(run,"kind:c.kind,reference:c.reference,publicationHash:c.publicationHash,field:","kind:c.kind,reference:c.reference,publicationHash:c.publicationHash,participatingFields:c.participatingFields?.map(f=>({level:f.level,fieldDegrees:f.fieldDegrees,sha256:f.asset.sha256,image:imageMetadata(f.image)})),field:")
run=replace(run,"nativeCounters:w.counters(),w3Hook:","nativeCounters:w.counters(),sdssHook:w.sdssHook??null,w3Hook:")
start=run.index("if(process.argv[4]==='integrated'){")
end=run.rfind("await page.evaluate(async()=>{const api=globalThis.actualSkyPage")
assert 0<start<end
journey=(TASK/'m82-display-page-journey-2026-10-04.txt').read_text(encoding='utf-8')
run=run[:start]+journey+'\n'+run[end:]
run=run.replace('ACTUAL_TARO_ORIGINAL_MAP_SKY_ENTRY_RETURN_DEVELOPMENT', 'ACTUAL_TARO_M82_DISPLAY_PAGE_DEVELOPMENT')
run=run.replace('No product source edit.','Only Sky page explicit publication input and calibrated Scene port changed; ordinary registration remains empty.')
run=replace(run,"await save('w3-hook-states.json',", "assert.deepEqual(await bind(publicationPath),publicationPin);\nawait save('w3-hook-states.json',")
for name,source in [('build-m82-display-page-2026-10-04.mts',build),('experience-m82-display-page-2026-10-04.mts',run)]:
 (TASK/name).write_text(source,encoding='utf-8',newline='\n')
print(json.dumps({'generated':2,'templates':bindings,'scope':__doc__}))
