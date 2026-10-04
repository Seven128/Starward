"""Local allocation and r92-r93 continuity for complete measured SKY-v2 demand."""
from pathlib import Path
import sys,json,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-sky-v2-dependency-readback-1004-r1'
spec=importlib.util.spec_from_file_location('sky_v2_close_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save
ALLOWED={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',*(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}

def check_old(old):
 for v in old['currentSources']:
  if v['path'] not in ALLOWED:assert bind(ROOT/v['path'])==v
 for v in old['protected']+old['evidence']:assert bind(ROOT/v['path'])==v

def allocation():
 target=OUT/'allocation-and-observation.json';assert not target.exists();old=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r92.json').read_bytes());check_old(old)
 (OUT/'executed-close.py').write_bytes(Path(__file__).read_bytes())
 p=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';s=p.read_text(encoding='utf-8');ns={'__file__':str(p)};exec(compile(s[:s.index('index_file=SOURCE')],str(p),'exec'),ns)
 dirs=[ROOT/'output'/v for v in ('sdss-m82-sky-v2-dependency-1004-r1','sdss-m82-sky-v2-exterior-1004-r1','sdss-m82-sky-v2-dependency-readback-1004-r1')]
 files=[p for d in dirs for p in sorted(d.rglob('*')) if p.is_file()];facts=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 assert facts==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files];unique={v['identity']:v for v in facts}
 result={'scope':__doc__,'previousSources':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
  'actualWholeCurrentAndDependencyMapViewed':True,'observations':'Geometry only finds18958 crop SKY-edge candidates,actual compact source noise/RUN-cohort restores16425 originalq/16467 recoveredq and42 supplies with no loss;1226886 oldfinite native variances/IDs/weights exact. Full131072 real perimeter+exterior source window cachedSCI/availability/weights overlap exact;65792 actual outside source available,168 potential/150 newq dependencies,0 new exterior supply. Complete inside demand90746=89921inner+825perimeter,35 from exterior,23 blocks. Independent direct scatter16617 changes over197 actual circle coordinates equals whole demand and two previous bounded q/strong results. Scheduling/derivedq only,not new full display/radius/quality acceptance. No changed production or other business.',
  'files':facts,'paths':len(facts),'logicalBytes':sum(v['bytes'] for v in facts),'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in facts),'stableBeforeAfter':True,
  'limits':'Only three new task output directories including executed-close before measurement. Excludes later measurement/doc/logs/checkpoints/old inputs/candidates/deps/FS internals/Linux actual disk retention/client-server200DAUcapacity. Native reads and CPU/memory are local offline real changed consumer evidence.',
  'productionChanges':[],'otherBusinessLogicEdited':False,'newAstronomicalSourceRequestsOrWholeVarianceFitsCoaddFilterApertureSelectionRuns':0,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
 save(target,result);print(json.dumps({k:v for k,v in result.items() if k!='files'}),flush=True)

def continuity():
 target=OUT/'checkpoint-continuity.json';assert not target.exists();before=TASK/'evidence/current-execution-state-2026-10-04-r92.json';after=TASK/'evidence/current-execution-state-2026-10-04-r93.json'
 assert bind(before)['sha256']=='587a4dd7615f18388056e9bd916d5af216b8e3af568bf2a4e92e9eca9b884084'
 old,new=json.loads(before.read_bytes()),json.loads(after.read_bytes());check_old(old)
 for v in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/v['path'])==v
 previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys();changes={p for p,v in previous.items() if current[p]!=v};assert changes==ALLOWED,(changes,ALLOWED)
 assert old['protected']==new['protected'] and old['processes']==new['processes']
 for k in ('workspace','branch','head'):assert old[k]==new[k]
 assert new['worktree']['stagedEntries']==0
 report={'scope':__doc__,'previousCheckpoint':bind(before),'currentCheckpoint':bind(after),'oldSourceChanges':sorted(changes),'newSources':sorted(current.keys()-previous.keys()),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),'processStartTimesExact':True,'staging':0,'productionChanges':[],'otherBusinessLogicEdited':False,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
 save(target,report);print(json.dumps(report),flush=True)
if __name__=='__main__':
 if sys.argv[1:]==['continuity']:continuity()
 else:assert not sys.argv[1:];allocation()
