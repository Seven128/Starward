"""Central native generation allocation and r86-r87 continuity, no processing."""
from pathlib import Path
import importlib.util,json,sys
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-central-native-1004-r2';READER=ROOT/'output/sdss-m82-central-native-readback-1004-r2'
spec=importlib.util.spec_from_file_location('root_binding',TASK/'scripts/readback-m82-central-native-2026-10-04.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save

def allocation():
    output=READER/'allocation-and-observation.json';assert not output.exists()
    result=json.loads((GEN/'result.json').read_bytes());readback=json.loads((READER/'result.json').read_bytes())
    assert readback['nativeTargetCuts']==793 and readback['conditionalProfiles']==339 and readback['nonpositiveProfilesKept']==3
    helper=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';text=helper.read_text(encoding='utf-8');ns={'__file__':str(helper)}
    exec(compile(text[:text.index('index_file=SOURCE')],str(helper),'exec'),ns)
    dirs=[ROOT/'output'/f'sdss-m82-central-native-1004-r{i}' for i in (1,2)]+[ROOT/'output'/f'sdss-m82-central-native-readback-1004-r{i}' for i in (1,2)]
    files=[p for d in dirs for p in sorted(d.rglob('*')) if p.is_file()];before=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
    assert before==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files];unique={v['identity']:v for v in before}
    report={'scope':__doc__,'actualAllTenPagesViewed':True,'observations':'Some isolated compact profiles are represented reasonably; many candidate cuts contain extended galaxy structure/neighbors/nonpositive fits/bound centers and large coherent residuals. All114 remain provisional, not114 confirmed stars or PSF-quality acceptance. Local diagnostic plane was never subtracted from science.',
        'r1TaskFailure':'Detectors/793 cuts complete; exclusive progress filename reused at second triplet. Old six partial fit files lack parameters/status metadata; retained as unverified failed task artifacts. r2 reuses exact saved detections/variance and obtains a complete new fit stage, including necessary replay of two incomplete triplets, with exclusive per-triplet journal and stored parameters.',
        'readerR1Failure':'Row-first versus column-first spline traversal differs by5.551115123125783e-17 for an actual template; r2 derives a machine-roundoff bound from actual kernel/flux/plane operation scales, not scientific/pixel/quality tolerance. No fitting or output processing replay.',
        'detectorGenerationTimingAndPeak':'UNMEASURED_R1_TERMINAL_PROCESS_NOT_RECOVERABLE_FROM_FILE_TIMES','fitGenerationSeconds':result['elapsedSeconds'],'fitGenerationCPUSeconds':result['cpuSeconds'],'fitGenerationMemory':result['memory'],
        'readerProcessPeak':'UNMEASURED','files':before,'paths':len(before),'logicalBytes':sum(v['bytes'] for v in before),'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in before),'stableBeforeAfter':True,
        'limits':'New failed/current detector-fit/readback outputs before this measurement only; excludes measurement/docs/checkpoint, old sources/candidates/tools/filesystem internals/snapshots/Linux physical retention/headroom/mixed200DAU capacity.',
        'sourceProcessingOrDeletion':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    (READER/'executed-close.py').write_bytes(Path(__file__).read_bytes());save(output,report);print(json.dumps({k:v for k,v in report.items() if k!='files'}))

def continuity():
    output=READER/'checkpoint-continuity.json';assert not output.exists()
    old_path=TASK/'evidence/current-execution-state-2026-10-04-r86.json';new_path=TASK/'evidence/current-execution-state-2026-10-04-r87.json'
    assert bind(old_path)['sha256']=='698d2f78e55835404e10628855ce7d3b7857025c08b65f97c9826a9fe9a3111e'
    old,new=json.loads(old_path.read_bytes()),json.loads(new_path.read_bytes())
    for item in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/item['path'])==item
    previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys()
    allowed={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',*(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
    changes={path for path,item in previous.items() if current[path]!=item};assert changes==allowed
    for item in old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    assert old['protected']==new['protected'] and old['processes']==new['processes']
    for key in ('workspace','branch','head'):assert old[key]==new[key]
    assert new['worktree']['stagedEntries']==0
    report={'scope':__doc__,'previousCheckpoint':bind(old_path),'currentCheckpoint':bind(new_path),'oldSourceChanges':sorted(changes),'newSources':sorted(current.keys()-previous.keys()),'productionChanges':[],'otherBusinessLogicEdited':False,'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),'processStartTimesExact':True,'staging':0,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(output,report);print(json.dumps(report))

if __name__=='__main__':
    if sys.argv[1:]==['continuity']:continuity()
    else:assert not sys.argv[1:];allocation()
