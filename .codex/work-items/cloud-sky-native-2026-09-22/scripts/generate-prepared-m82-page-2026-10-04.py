"""Reuse the current complete-page harness for the new explicit Prepared family.

Old scripts/results are preserved. Fresh source bindings are not an old Goal
checkpoint, and no historical matrix or source processing is repeated.
"""
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS=TASK/'scripts'
BASELINE='.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-page-current-inputs-2026-10-04.json'
old=json.loads((TASK/'tmp/imagery-research-reconciliation-2026-10-04/before.json').read_bytes())
def bind(p):
    b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths={r['path'] for r in old['nonMarkdownSources']}
paths.update(['packages/miniapp-contracts/src/prepared-optical-publication.ts',
              'packages/miniapp-contracts/src/prepared-optical-publication.test.ts'])
baseline={'currentSources':[bind(ROOT/p) for p in sorted(paths)],'protected':old['protected'],
    'scope':'Fresh current input bindings after page edit, not a completed historical checkpoint.'}
if (ROOT/BASELINE).exists():
    assert json.loads((ROOT/BASELINE).read_bytes())==baseline
else:
    with (ROOT/BASELINE).open('x',encoding='utf-8') as f:
        json.dump(baseline,f,ensure_ascii=False,indent=2);f.write('\n')

def replace_one(text,old,new):
    assert text.count(old)==1,old
    return text.replace(old,new)

build=(SCRIPTS/'build-m82-display-page-2026-10-04.mts').read_text(encoding='utf-8')
build=replace_one(build,"process.argv[3]??'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-04-r64.json'",repr(BASELINE))
regex="assert(/^\\.codex\\/work-items\\/cloud-sky-native-2026-09-22\\/evidence\\/current-execution-state-[\\d-]+-r\\d+\\.json$/.test(checkpoint));"
build=replace_one(build,regex,"assert.equal(checkpoint,"+repr(BASELINE)+");")
build=replace_one(build,"sdssOpticalPublication:{reference:'M:82',publicationHash:'74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab'",
    "targetOpticalPublication:{kind:'prepared-optical-v1',reference:'M:82',publicationHash:'c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c'")
a=build.index(r"  b.onLoad({filter:/[\\/]use-sky-sdss-optical\.ts$/}")
b=build.index(r"  b.onLoad({filter:/[\\/]use-sky-wide-field-w3\.ts$/}",a)
diagnostic=r"""  b.onLoad({filter:/[\\/]use-sky-target-optical\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function useSkyTargetOptical<'));
   const s=raw.replace('export function useSkyTargetOptical<','function originalUseSkyTargetOptical<')+
    '\nexport function useSkyTargetOptical(...args:Parameters<typeof originalUseSkyTargetOptical>){const value=originalUseSkyTargetOptical(...args),w=globalThis.__controlled;w.sdssHook={kind:args[0],reference:args[1],fov:args[2],active:args[5],pin:args[6],requested:value.requested,loading:value.loading,updateFailed:value.updateFailed,status:value.status,renderedLevel:value.renderedLevel,publicationHash:value.publication?.publicationHash,imageVersion:value.publication?.imageVersion,image:value.image?w.imageInfo(value.image):null,coarser:value.coarser?{level:value.coarser.level,image:w.imageInfo(value.coarser.image)}:null};return value;}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Read-only original common optical Hook result, body/return/React execution preserved.'});return {contents:s,loader:'ts'};
  });
"""
build=build[:a]+diagnostic+build[b:]
destination=SCRIPTS/'build-prepared-m82-page-2026-10-04.mts'
if destination.exists():
    assert destination.read_text(encoding='utf-8')==build
else:
    with destination.open('x',encoding='utf-8') as f:f.write(build)

run=(SCRIPTS/'experience-m82-display-page-2026-10-04.mts').read_text(encoding='utf-8')
run=replace_one(run,"process.argv[3]??'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-04-r64.json'",repr(BASELINE))
run=replace_one(run,regex,"assert.equal(checkpoint,"+repr(BASELINE)+");")
run=run.replace('output/sdss-m82-display-publication-1004-r2/publication/manifest.json','output/hubble-m82-prepared-publication-1004-r2/manifest.json')
run=run.replace('398827534fab1003b7fbe4cad29ab7ae6e0b8a1a9eb7222e12ba1e926aa47a6a','3823d73fbc836710141e4052c9950de148a7bebb608b943ffb601111e383a7ca')
run=run.replace('74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab','c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c')
run=replace_one(run,"const {SdssOpticalImageryService}=await import('../../../../workers/miniapp-api/src/sdss-optical-imagery.ts');",
    "const {PreparedOpticalImageryService}=await import('../../../../workers/miniapp-api/src/prepared-optical-imagery.ts');")
run=replace_one(run,r"new SdssOpticalImageryService({calibratedPublications:[{reference:'M:82',expectedHash:displayHash,manifestUrl:new URL('file:///'+path.join(root,publicationPath).replaceAll('\\','/'))}]})",
    r"new PreparedOpticalImageryService([{reference:'M:82',expectedHash:displayHash,manifestUrl:new URL('file:///'+path.join(root,publicationPath).replaceAll('\\','/'))}])")
run=run.replace('new SdssOpticalImageryService()','new PreparedOpticalImageryService()').replace('sdssOpticalImages:sdss','preparedOpticalImages:sdss')
run=run.replace('/v2/sky/sdss-optical/','/v2/sky/prepared-optical/').replace(r'\/sky\/sdss-optical\/',r'\/sky\/prepared-optical\/')
run=run.replace("image('sdss-optical',args[30]","image('prepared-optical',args[30]").replace("i.family==='sdss-optical'","i.family==='prepared-optical'")
run=run.replace("optical?.kind==='display'","optical?.kind==='prepared'")
run=run.replace("v.activeText.includes('显示估计')","v.activeText.includes(publication.source.credit)")
run=run.replace('successfulDisplayBinaryTransfers','successfulPreparedBinaryTransfers').replace('ACTUAL_TARO_M82_DISPLAY_PAGE_DEVELOPMENT','ACTUAL_TARO_M82_PREPARED_PAGE_DEVELOPMENT')
run=run.replace('Only Sky page explicit publication input and calibrated Scene port changed; ordinary registration remains empty.',
    'Sky page uses one explicit kind/ref/hash input and shared loader/frame owner with Prepared Scene port; ordinary registration remains empty. No quality or target-runtime acceptance.')
with (SCRIPTS/'experience-prepared-m82-page-2026-10-04.mts').open('x',encoding='utf-8') as f:f.write(run)
print(json.dumps({'currentBoundInputs':len(paths),'build':'build-prepared-m82-page-2026-10-04.mts','run':'experience-prepared-m82-page-2026-10-04.mts'}))
