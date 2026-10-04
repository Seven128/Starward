"""M82 measured-stars metadata/allocation and r85-r86 continuity only."""
from pathlib import Path
import importlib.util,json,sys,csv,io
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-measured-stars-1004-r4';READER=ROOT/'output/sdss-m82-measured-stars-readback-1004-r3'
spec=importlib.util.spec_from_file_location('saved_binding',TASK/'scripts/readback-m82-measured-stars-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save

def allocation():
    assert not (READER/'field-processing-and-allocation.json').exists()
    result=json.loads((GEN/'result.json').read_bytes());root=json.loads((READER/'result.json').read_bytes())
    assert root['actualProfiles']==60 and root['originalNativeDataFlagsCalibSkyVarianceExact']
    cas=ROOT/'output/sdss-m82-quality-inputs-1004-r1/camera-field-response.csv'
    text=cas.read_text(encoding='utf-8-sig');rows=list(csv.DictReader(io.StringIO('\n'.join(s for s in text.splitlines() if not s.startswith('#')))))
    details=[{k:r[k] for k in r if k in ('fieldID','run','rerun','camcol','field','nStars','photoStatus','pspStatus','score','quality') or k.startswith('psfNStar_')} for r in rows]
    central=next(r for r in details if (r['run'],r['camcol'],r['field'])==('4264','5','261'))
    assert central['photoStatus']=='3' and result['fieldDetectionCounts']['301/4264/5/261']==0
    dirs=[ROOT/'output/sdss-m82-registration-stars-1004-r1']+[ROOT/'output'/('sdss-m82-measured-stars-1004-r'+str(i)) for i in range(1,5)]+[ROOT/'output'/('sdss-m82-measured-stars-readback-1004-r'+str(i)) for i in range(1,4)]
    helper=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';source=helper.read_text(encoding='utf-8')
    ns={'__file__':str(helper)};exec(compile(source[:source.index('index_file=SOURCE')],str(helper),'exec'),ns)
    files=[p for d in dirs for p in sorted(d.rglob('*')) if p.is_file()]
    before=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
    assert before==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
    unique={v['identity']:v for v in before}
    report={'scope':__doc__,'fieldCsv':bind(cas),'fields':details,'centralCatalogZero':True,
        'processingInterpretation':'PHOTO_STATUS3=TOO_LONG per retained official-source research; catalog reduction risk agrees with zero stellar-query rows but does not establish sole cause or intrinsically bad corrected frame. PSP_STATUS0/nStars and PSF fit-star metadata are separate facts, not actual central PSF validation.',
        'retainedResearch':bind(TASK/'evidence/experience-sdss-field-quality-independent-review-2026-10-02.md'),
        'actualDistributedImageViewed':True,'imageFindings':'Warm/colored noise persists; one distributed star patch includes nearby extended residual absent from stellar-only neighbor query. Conditional fits/moments are not galaxy PSF or quality acceptance.',
        'files':before,'paths':len(before),'logicalBytes':sum(v['bytes'] for v in before),'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),
        'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in before),'stableBeforeAfter':True,
        'limits':'New catalog/failed task archives/current diagnostic/readbacks before this measurement only; excludes measurement/docs/checkpoint, old sources/candidates/tools/filesystem internals/snapshots/Linux physical retention/headroom/mixed200DAU capacity.',
        'sourceProcessingOrDeletion':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    (READER/'executed-close.py').write_bytes(Path(__file__).read_bytes());save(READER/'field-processing-and-allocation.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('fields','files')}))

def continuity():
    output=READER/'checkpoint-continuity.json';assert not output.exists()
    old_path=TASK/'evidence/current-execution-state-2026-10-04-r85.json';new_path=TASK/'evidence/current-execution-state-2026-10-04-r86.json'
    assert bind(old_path)['sha256']=='5af91c26a9ef96e5bf64e66b4bb792bd235f041ce30f6967d5052a5452fcdcab'
    old,new=json.loads(old_path.read_bytes()),json.loads(new_path.read_bytes())
    for item in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/item['path'])==item
    previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys()
    allowed={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
        *(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
    changes={path for path,item in previous.items() if current[path]!=item};assert changes==allowed
    for item in old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    assert old['protected']==new['protected'] and old['processes']==new['processes']
    for key in ('workspace','branch','head'):assert old[key]==new[key]
    assert new['worktree']['stagedEntries']==0
    report={'scope':__doc__,'previousCheckpoint':bind(old_path),'currentCheckpoint':bind(new_path),'oldSourceChanges':sorted(changes),
        'newSources':sorted(current.keys()-previous.keys()),'productionChanges':[],'otherBusinessLogicEdited':False,
        'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),
        'processStartTimesExact':True,'staging':0,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(output,report);print(json.dumps(report))

if __name__=='__main__':
    if sys.argv[1:]==['continuity']:continuity()
    else:assert not sys.argv[1:];allocation()
