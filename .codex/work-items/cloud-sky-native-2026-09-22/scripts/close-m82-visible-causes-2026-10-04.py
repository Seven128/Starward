"""Retained real M82 causal diagnostics/trial allocation and r90-r91 continuity."""
from pathlib import Path
import importlib.util,json,sys
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-visible-causes-readback-1004-r1'
spec=importlib.util.spec_from_file_location('visible_close_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save

def allocation():
    target=OUT/'allocation-and-observation.json';assert not target.exists()
    old=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r90.json').read_bytes())
    for v in old['currentSources']+old['protected']+old['evidence']:assert bind(ROOT/v['path'])==v
    reader=json.loads((OUT/'result.json').read_bytes())
    trial=json.loads((ROOT/'output/sdss-m82-smooth-range-trial-1004-r1/result.json').read_bytes())
    assert reader['nativeScalarPoints']==245564 and reader['localSkyNativeSamples']==4668
    assert len(trial['records'])==9 and all(trial['regressions'].values())
    (OUT/'executed-close.py').write_bytes(Path(__file__).read_bytes())
    helper=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';s=helper.read_text(encoding='utf-8');ns={'__file__':str(helper)}
    exec(compile(s[:s.index('index_file=SOURCE')],str(helper),'exec'),ns)
    roots=[ROOT/'output'/v for v in ('sdss-m82-visible-structure-1004-r1','sdss-m82-visible-native-display-1004-r1',
        'sdss-m82-visible-native-display-1004-r2','sdss-m82-visible-causes-readback-1004-r1','sdss-m82-smooth-range-trial-1004-r1')]
    files=[p for d in roots for p in sorted(d.rglob('*')) if p.is_file()]
    facts=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
    assert facts==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files];unique={v['identity']:v for v in facts}
    result={'scope':__doc__,'oldSourcesExact':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
        'actualMapsAndFourNativeScienceAndFourTrialPagesViewed':True,
        'observations':'Native column INTERP/SATUR/CR and retained SKY endpoint stencil gaps explain the four local qualification paths. Unknown noise is not absent science. Current equals science in both central regions; true positive i>r>g already carries warm colour. Frozen hard maxRGB normalization removes same-colour common intensity above threshold. One globally consistent max-channel smooth range trial restores 40/42/43 maximum-channel levels on the same warm core normalized subset but darkens the whole image; source grain and stripes remain. Bounded trial only, not a complete quality or colour/sky qualification.',
        'retainedDiagnosticFailure':'r1 incorrectly assumed protected means original SCI rather than recovered raw cohort. Original executed source and failed state retained; r2 diagnostic assertion fixed, no candidate or production change.',
        'files':facts,'paths':len(facts),'logicalBytes':sum(v['bytes'] for v in facts),
        'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),
        'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in facts),'stableBeforeAfter':True,
        'limits':'Only five new task output directories including executed-close before measurement. Excludes measurement/docs/checkpoint/logs/old candidates/native sources/deps/filesystem internals/snapshots/Linux physical retention/mixed200DAU capacity. Native trace and reader process peaks UNMEASURED.',
        'productionChanges':[],'otherBusinessLogicEdited':False,'deletionOrSourceRequestsOrWholeVarianceFitsCoaddFilterRuns':False,
        'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(target,result);print(json.dumps({k:v for k,v in result.items() if k!='files'}),flush=True)

def continuity():
    target=OUT/'checkpoint-continuity.json';assert not target.exists()
    before=TASK/'evidence/current-execution-state-2026-10-04-r90.json';after=TASK/'evidence/current-execution-state-2026-10-04-r91.json'
    assert bind(before)['sha256']=='102bb86ded481e2bc0fbb8f3296e3a2db4cf477a0056089ae05a09454433f4c8'
    old,new=json.loads(before.read_bytes()),json.loads(after.read_bytes())
    for v in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/v['path'])==v
    previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys()
    allowed={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
        *(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
    changes={p for p,v in previous.items() if current[p]!=v};assert changes==allowed,(changes,allowed)
    for v in old['protected']+old['evidence']:assert bind(ROOT/v['path'])==v
    assert old['protected']==new['protected'] and old['processes']==new['processes']
    for k in ('workspace','branch','head'):assert old[k]==new[k]
    assert new['worktree']['stagedEntries']==0
    result={'scope':__doc__,'previousCheckpoint':bind(before),'currentCheckpoint':bind(after),'oldSourceChanges':sorted(changes),
        'newSources':sorted(current.keys()-previous.keys()),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),
        'currentSources':len(current),'currentEvidence':len(new['evidence']),'processStartTimesExact':True,'staging':0,
        'productionChanges':[],'otherBusinessLogicEdited':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(target,result);print(json.dumps(result),flush=True)
if __name__=='__main__':
    if sys.argv[1:]==['continuity']:continuity()
    else:assert not sys.argv[1:];allocation()
