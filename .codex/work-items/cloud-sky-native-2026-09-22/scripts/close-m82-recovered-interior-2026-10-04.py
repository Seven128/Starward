"""Actual new offline output allocation and r82-r83 boundary continuity."""
from pathlib import Path
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-recovered-aperture-interior-1004-r1'
READER = ROOT / 'output/sdss-m82-recovered-aperture-interior-readback-1004-r2'
spec = importlib.util.spec_from_file_location('loader',TASK/'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
loader = importlib.util.module_from_spec(spec); spec.loader.exec_module(loader)
bind, save = loader.bind, loader.save


def allocation():
    output = READER/'allocation.json'; assert not output.exists()
    assert (GEN/'result.json').is_file() and (READER/'result.json').is_file()
    helper = TASK/'scripts/inspect-static-file-allocation-2026-10-03.py'
    text = helper.read_text(encoding='utf-8'); namespace = {'__file__':str(helper)}
    exec(compile(text[:text.index('index_file=SOURCE')],str(helper),'exec'),namespace)
    directories = (GEN,ROOT/'output/sdss-m82-recovered-aperture-interior-readback-1004-r1',READER)
    files = [path for directory in directories for path in sorted(directory.rglob('*')) if path.is_file()]
    before = [{'path':path.relative_to(ROOT).as_posix(),**namespace['info'](path)} for path in files]
    assert before == [{'path':path.relative_to(ROOT).as_posix(),**namespace['info'](path)} for path in files]
    identities = {value['identity']:value for value in before}
    report = {'scope':__doc__,'helper':bind(helper),'producerResult':bind(GEN/'result.json'),
        'readerResult':bind(READER/'result.json'),'files':before,'paths':len(before),
        'logicalBytes':sum(v['bytes'] for v in before),
        'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in identities.values()),
        'distinctFileIdentities':len(identities),'maximumLinkCount':max(v['links'] for v in before),'stableBeforeAfter':True,
        'limits':'Only this offline generation and failed/current readback outputs before measurement. No old sources, filesystem metadata/snapshots, Linux physical retention, host headroom or mixed 200DAU capacity.',
        'sourceProcessingOrDeletion':False}
    (READER/'executed-close.py').write_bytes(Path(__file__).read_bytes()); save(output,report)
    print(json.dumps({key:value for key,value in report.items() if key!='files'}))


def continuity():
    output = READER/'checkpoint-continuity.json'; assert not output.exists()
    old_path = TASK/'evidence/current-execution-state-2026-10-04-r82.json'
    new_path = TASK/'evidence/current-execution-state-2026-10-04-r83.json'
    old,new = json.loads(old_path.read_bytes()),json.loads(new_path.read_bytes())
    assert bind(old_path)['sha256'] == '65a133e69439e9f466fa6831258a47f92572d066c0abef5a4092940a5f3bdbdc'
    for item in new['currentSources']+new['protected']+new['evidence']: assert bind(ROOT/item['path']) == item
    previous = {v['path']:v for v in old['currentSources']}; current = {v['path']:v for v in new['currentSources']}
    assert previous.keys() <= current.keys()
    allowed = {'data-pipelines/deep-sky/sdss_display_recovery.py','data-pipelines/deep-sky/README.md',
        'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
        *(str(TASK.relative_to(ROOT).as_posix())+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
    changes = {path for path,item in previous.items() if current[path] != item}; assert changes == allowed
    for item in old['protected']+old['evidence']: assert bind(ROOT/item['path']) == item
    assert old['protected'] == new['protected'] and old['processes'] == new['processes']
    for key in ('workspace','branch','head'): assert old[key] == new[key]
    assert new['worktree']['stagedEntries'] == 0
    report = {'scope':__doc__,'previousCheckpoint':bind(old_path),'currentCheckpoint':bind(new_path),
        'oldSourceChanges':sorted(changes),'newSources':sorted(current.keys()-previous.keys()),
        'productionChanges':['data-pipelines/deep-sky/sdss_display_recovery.py'],
        'productionMeaning':'Existing Sky offline recovered-source bounded interior scheduling and exclusive incomplete-candidate export only.',
        'otherBusinessLogicEdited':False,'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),
        'currentSources':len(current),'currentEvidence':len(new['evidence']),'processStartTimesExact':True,'staging':0,
        'independentReview':'MISSING','quality':'UNVERIFIED','ordinaryAdoption':False}
    save(output,report); print(json.dumps(report))


if __name__=='__main__':
    if sys.argv[1:] == ['continuity']: continuity()
    else: assert not sys.argv[1:]; allocation()
