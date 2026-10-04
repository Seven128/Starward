"""M82 descriptive target profiles: allocation and r89-r90 continuity, no processing."""
from pathlib import Path
import importlib.util,json,sys,statistics,collections
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-target-profile-1004-r1';READER=ROOT/'output/sdss-m82-target-profile-readback-1004-r1'
spec=importlib.util.spec_from_file_location('profile_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save

def allocation():
    output=READER/'allocation-and-observation.json';assert not output.exists()
    result=json.loads((GEN/'result.json').read_bytes());reader=json.loads((READER/'result.json').read_bytes())
    assert result['actualLocations']==reader['actualLocations']==146 and len(result['images'])==19
    old=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r89.json').read_bytes())
    for item in old['currentSources']+old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    groups={}
    for kind in sorted({v['material']['kind'] for v in result['records']}):
        rows=[v for v in result['records'] if v['material']['kind']==kind];group={'locations':len(rows)}
        for stage in ('science','current'):
            values=[b[stage] for row in rows for b in row['bands'].values()]
            ratios=[v['descriptiveResidualToPointNorm'] for v in values if v['descriptiveResidualToPointNorm'] is not None]
            group[stage]={'states':dict(collections.Counter(v['state'] for v in values)),
                'descriptiveResidualToPointNormMinMedianMax':[min(ratios),statistics.median(ratios),max(ratios)]}
        groups[kind]=group
    (READER/'executed-close.py').write_bytes(Path(__file__).read_bytes())
    helper=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';text=helper.read_text(encoding='utf-8');ns={'__file__':str(helper)}
    exec(compile(text[:text.index('index_file=SOURCE')],str(helper),'exec'),ns)
    files=[p for d in (GEN,READER) for p in sorted(d.rglob('*')) if p.is_file()]
    before=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
    assert before==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files];unique={v['identity']:v for v in before}
    report={'scope':__doc__,'actualAll19GriProfilePagesViewed':True,'allGroups':groups,
        'observations':'Isolated catalogue cores have relatively small descriptive residuals; weak/catalog neighbour cases retain grain/structure. Central compact candidates include extended/double/ridge galaxy structure with coherent large residuals, not a certified stellar PSF population. Recorded aperture reduces some grain but does not remove structure or validate a global matching kernel/shift/sky subtraction. All band residuals use the same actual-data scale per row; no published sky RGB or quality threshold. Native fit statuses/bounds and three missing nonpositive native residuals retained.',
        'generationSeconds':result['elapsedSeconds'],'generationCPUSeconds':result['cpuSeconds'],'generationMemory':result['memory'],
        'readerSeconds':reader['elapsedSeconds'],'readerProcessPeak':'UNMEASURED','files':before,'paths':len(before),
        'logicalBytes':sum(v['bytes'] for v in before),'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),
        'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in before),'stableBeforeAfter':True,
        'limits':'Only two new task output directories including executed-close before measurement. Excludes measurement/docs/logs/checkpoint/old source-candidates-nativefits/dependency trees/filesystem internals/snapshots/Linux physical retention/headroom/mixed200DAU capacity. Offline process peak not client/server or total chain.',
        'oldSourcesExact':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
        'sourceRequestsOrWholeProcessingOrDeletion':False,'productionChanges':[],'otherBusinessLogicEdited':False,
        'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(output,report);print(json.dumps({k:v for k,v in report.items() if k!='files'}),flush=True)

def continuity():
    output=READER/'checkpoint-continuity.json';assert not output.exists()
    old_path=TASK/'evidence/current-execution-state-2026-10-04-r89.json';new_path=TASK/'evidence/current-execution-state-2026-10-04-r90.json'
    assert bind(old_path)['sha256']=='27de50b6e904ace4127eff60cbd4795dc90c360e915b95385047eda976340765'
    old,new=json.loads(old_path.read_bytes()),json.loads(new_path.read_bytes())
    for item in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/item['path'])==item
    previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys()
    allowed={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
        *(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
    changes={path for path,item in previous.items() if current[path]!=item};assert changes==allowed,(changes,allowed)
    for item in old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    assert old['protected']==new['protected'] and old['processes']==new['processes']
    for key in ('workspace','branch','head'):assert old[key]==new[key]
    assert new['worktree']['stagedEntries']==0
    report={'scope':__doc__,'previousCheckpoint':bind(old_path),'currentCheckpoint':bind(new_path),'oldSourceChanges':sorted(changes),
        'newSources':sorted(current.keys()-previous.keys()),'productionChanges':[],'otherBusinessLogicEdited':False,
        'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),
        'processStartTimesExact':True,'staging':0,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(output,report);print(json.dumps(report),flush=True)

if __name__=='__main__':
    if sys.argv[1:]==['continuity']:continuity()
    else:assert not sys.argv[1:];allocation()
