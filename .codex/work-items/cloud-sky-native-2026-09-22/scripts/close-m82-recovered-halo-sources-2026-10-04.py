"""Actual source-halo outputs allocation and r83-r84 boundary continuity."""
from pathlib import Path
import importlib.util
import json
import sys

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-recovered-halo-sources-1004-r1'
READER=ROOT/'output/sdss-m82-recovered-halo-sources-readback-1004-r1'
spec=importlib.util.spec_from_file_location('loader',TASK/'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
loader=importlib.util.module_from_spec(spec);spec.loader.exec_module(loader)
bind,save=loader.bind,loader.save


def allocation():
    output=READER/'allocation.json';assert not output.exists()
    assert (GEN/'result.json').is_file() and (READER/'result.json').is_file()
    helper=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';text=helper.read_text(encoding='utf-8')
    namespace={'__file__':str(helper)};exec(compile(text[:text.index('index_file=SOURCE')],str(helper),'exec'),namespace)
    files=[p for directory in (GEN,READER) for p in sorted(directory.rglob('*')) if p.is_file()]
    before=[{'path':p.relative_to(ROOT).as_posix(),**namespace['info'](p)} for p in files]
    assert before==[{'path':p.relative_to(ROOT).as_posix(),**namespace['info'](p)} for p in files]
    identities={v['identity']:v for v in before}
    report={'scope':__doc__,'helper':bind(helper),'files':before,'paths':len(before),'logicalBytes':sum(v['bytes'] for v in before),
        'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in identities.values()),
        'distinctFileIdentities':len(identities),'maximumLinkCount':max(v['links'] for v in before),'stableBeforeAfter':True,
        'limits':'Only these new offline source/readback outputs before measurement; excludes old source/candidates, measurement/docs/checkpoints, filesystem internals/snapshots, Linux physical retention, host headroom and mixed 200DAU capacity.',
        'sourceProcessingOrDeletion':False}
    (READER/'executed-close.py').write_bytes(Path(__file__).read_bytes());save(output,report)
    print(json.dumps({k:v for k,v in report.items() if k!='files'}))


def continuity():
    output=READER/'checkpoint-continuity.json';assert not output.exists()
    old_path=TASK/'evidence/current-execution-state-2026-10-04-r83.json';new_path=TASK/'evidence/current-execution-state-2026-10-04-r84.json'
    old,new=json.loads(old_path.read_bytes()),json.loads(new_path.read_bytes())
    assert bind(old_path)['sha256']=='768867adddd413ff2bfd3d57fbe04574252a399595c5e98cfead31568d8ba6f1'
    for item in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/item['path'])==item
    previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys()
    allowed={'data-pipelines/deep-sky/sdss_display_recovery.py','data-pipelines/deep-sky/sdss_noise_display.py',
        'data-pipelines/deep-sky/test_sdss_display_recovery.py','data-pipelines/deep-sky/README.md',
        'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
        *(str(TASK.relative_to(ROOT).as_posix())+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
    changes={path for path,item in previous.items() if current[path]!=item};assert changes==allowed
    for item in old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    assert old['protected']==new['protected'] and old['processes']==new['processes']
    for key in ('workspace','branch','head'):assert old[key]==new[key]
    assert new['worktree']['stagedEntries']==0
    save(output,{'scope':__doc__,'previousCheckpoint':bind(old_path),'currentCheckpoint':bind(new_path),
        'oldSourceChanges':sorted(changes),'newSources':sorted(current.keys()-previous.keys()),
        'productionChanges':['data-pipelines/deep-sky/sdss_display_recovery.py','data-pipelines/deep-sky/sdss_noise_display.py'],
        'productionMeaning':'Existing Sky offline real-source window and shared scan/effective raw coefficient responsibility only; no filtering or candidate change.',
        'otherBusinessLogicEdited':False,'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),
        'currentSources':len(current),'currentEvidence':len(new['evidence']),'processStartTimesExact':True,'staging':0,
        'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'})
    print(json.dumps({'result':bind(output),'oldEvidenceExact':len(old['evidence']),'currentSources':len(current),'currentEvidence':len(new['evidence']),
        'protectedExact':len(new['protected']),'oldSourceChanges':sorted(changes)}))


if __name__=='__main__':
    if sys.argv[1:]==['continuity']:continuity()
    else:assert not sys.argv[1:];allocation()
