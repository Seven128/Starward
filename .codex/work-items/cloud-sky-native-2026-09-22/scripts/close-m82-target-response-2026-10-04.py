"""M82 response task allocation and r87-r88 continuity; no source processing."""
from pathlib import Path
import importlib.util,json,sys
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-target-response-1004-r1';READER=ROOT/'output/sdss-m82-target-response-readback-1004-r1'
spec=importlib.util.spec_from_file_location('response_root_binding',TASK/'scripts/readback-m82-target-response-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save

def allocation():
    output=READER/'allocation-and-observation.json';assert not output.exists()
    result=json.loads((GEN/'result.json').read_bytes());readback=json.loads((READER/'result.json').read_bytes())
    assert result['actualLocations']==readback['actualLocations']==146 and len(result['images'])==13
    old=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r87.json').read_bytes())
    archives={TASK.relative_to(ROOT).as_posix()+'/scripts/'+name:GEN/f'executed-previous-target-response-{i+1}.py'
        for i,name in enumerate(('experience-target-psf-response-r3-2026-10-03.py','experience-target-psf-same-run-control-2026-10-03.py'))}
    archive_bindings=[]
    for item in old['currentSources']:
        if item['path'] in archives:
            archived=bind(archives[item['path']]);assert (archived['bytes'],archived['sha256'])==(item['bytes'],item['sha256'])
            archive_bindings.append({'original':item,'verifiedArchive':archived})
        else:assert bind(ROOT/item['path'])==item
    for item in old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    helper=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';text=helper.read_text(encoding='utf-8');ns={'__file__':str(helper)}
    exec(compile(text[:text.index('index_file=SOURCE')],str(helper),'exec'),ns)
    files=[p for d in (GEN,READER) for p in sorted(d.rglob('*')) if p.is_file()]
    before=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
    assert before==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files];unique={v['identity']:v for v in before}
    report={'scope':__doc__,'actualAll13PagesViewed':True,'observations':'Actual science/current cuts retain coherent extended galaxy structure, neighbors and stripes/grain; unit models are mathematical point responses, not empirical source shapes or fit residuals. Individual panels are independently scaled; no flux comparison or quality acceptance. Cropped target-edge anchors stay at their actual asymmetric panel positions. Original science/current/maps unchanged.',
        'sharedResponsibility':'Native finite signed unit PSF model/integer sampling/science bilinear diagnostic extracted to a shared task helper; new M82 consumer and both historical M51 task runners now use it. Historical runner source archives exact; old matrices/output/source and review statuses retained, not replayed. No production or dependency-manifest change.',
        'historicalTaskSourceArchives':archive_bindings,'generationSeconds':result['elapsedSeconds'],'generationCPUSeconds':result['cpuSeconds'],'generationMemory':result['memory'],'readerProcessPeak':'UNMEASURED',
        'files':before,'paths':len(before),'logicalBytes':sum(v['bytes'] for v in before),'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),
        'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in before),'stableBeforeAfter':True,
        'limits':'New response/readback outputs and exact old task source snapshots before measurement only; excludes measurement/docs/checkpoint, old data/candidates/dependency trees/filesystem internals/snapshots/Linux physical retention/headroom/mixed200DAU capacity. Offline process peak not client/server or total chain.',
        'sourceRequestsOrWholeProcessingOrDeletion':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    (READER/'executed-close.py').write_bytes(Path(__file__).read_bytes());save(output,report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('files','historicalTaskSourceArchives')}),flush=True)

def continuity():
    output=READER/'checkpoint-continuity.json';assert not output.exists()
    old_path=TASK/'evidence/current-execution-state-2026-10-04-r87.json';new_path=TASK/'evidence/current-execution-state-2026-10-04-r88.json'
    assert bind(old_path)['sha256']=='bfde307e87ed70e773426fce492f6172b2cc55a42a7567ac6ede88956eca35d4'
    old,new=json.loads(old_path.read_bytes()),json.loads(new_path.read_bytes())
    for item in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/item['path'])==item
    previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys()
    allowed={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
        *(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1',
        'scripts/experience-target-psf-response-r3-2026-10-03.py','scripts/experience-target-psf-same-run-control-2026-10-03.py'))}
    changes={path for path,item in previous.items() if current[path]!=item};assert changes==allowed,(changes,allowed)
    for item in old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    assert old['protected']==new['protected'] and old['processes']==new['processes']
    for key in ('workspace','branch','head'):assert old[key]==new[key]
    assert new['worktree']['stagedEntries']==0
    report={'scope':__doc__,'previousCheckpoint':bind(old_path),'currentCheckpoint':bind(new_path),'oldSourceChanges':sorted(changes),'newSources':sorted(current.keys()-previous.keys()),
        'productionChanges':[],'otherBusinessLogicEdited':False,'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),
        'processStartTimesExact':True,'staging':0,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(output,report);print(json.dumps(report),flush=True)

if __name__=='__main__':
    if sys.argv[1:]==['continuity']:continuity()
    else:assert not sys.argv[1:];allocation()
