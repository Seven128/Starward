"""Local allocation and r93-r94 continuity of the actual new model candidate."""
from pathlib import Path
import sys,json,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-noise-v2-increment-readback-1004-r1'
spec=importlib.util.spec_from_file_location('noise_increment_close_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save
ALLOWED={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',*(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
PRODUCTION=['data-pipelines/deep-sky/sdss_noise_model_increment.py','data-pipelines/deep-sky/test_sdss_noise_model_increment.py']

def check_old(old):
 for v in old['currentSources']:
  if v['path'] not in ALLOWED:assert bind(ROOT/v['path'])==v
 for v in old['protected']+old['evidence']:assert bind(ROOT/v['path'])==v

def allocation():
 target=OUT/'allocation-and-observation.json';assert not target.exists();old=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r93.json').read_bytes());check_old(old)
 (OUT/'executed-close.py').write_bytes(Path(__file__).read_bytes())
 p=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';s=p.read_text(encoding='utf-8');ns={'__file__':str(p)};exec(compile(s[:s.index('index_file=SOURCE')],str(p),'exec'),ns)
 dirs=[ROOT/'output'/v for v in ('sdss-m82-noise-v2-increment-development-1004-r1','sdss-m82-noise-v2-increment-1004-r1','sdss-m82-noise-v2-increment-readback-1004-r1')]
 files=[p for d in dirs for p in sorted(d.rglob('*')) if p.is_file()];facts=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 assert facts==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files];unique={v['identity']:v for v in facts}
 result={'scope':__doc__,'previousSources':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
  'actualAllThreeCompleteComparisonAndAll20CatalogStarPagesViewed':True,
  'observations':'Explicit new-model owner consumed all90746 necessary targets in23 real source regions with real8px halo;35018 estimates changed. Actual newq/strong/compact raw and both prior real bounded estimate-radius-reached consumers exact. All outside-demand estimates/diagnostics and oldstrong preserved;originalSCI/alpha/WCS/frozen recipe exact. Saved complete OV/MED/DETAIL numeric mean-to-Astropy RGB exact,changedRGB3300/1496/3. All20OV and1MED catalog stamps viewed;twoOV stamps change30/6pixels,all maximum channels stable,noDETAIL catalogstar coverage. Outer strip partly improved,warmcore/grain/green structures and other strips remain. No quality adoption.',
  'files':facts,'paths':len(facts),'logicalBytes':sum(v['bytes'] for v in facts),'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in facts),'stableBeforeAfter':True,
  'limits':'Only three new Windows offline output directories including executed-close before measurement. Excludes later measurement/doc/logs/checkpoints/old inputs/candidates/deps/FS internals/Linux actual disk retention/client-server200DAUcapacity. CPU/memory belong to local offline source consumption,not targetruntime.',
  'productionChanges':PRODUCTION,'otherBusinessLogicEdited':False,'newAstronomicalSourceRequestsOrWholeVarianceFitsScienceCoaddOldApertureMatrices':0,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
 save(target,result);print(json.dumps({k:v for k,v in result.items() if k!='files'}),flush=True)

def continuity():
 target=OUT/'checkpoint-continuity.json';assert not target.exists();before=TASK/'evidence/current-execution-state-2026-10-04-r93.json';after=TASK/'evidence/current-execution-state-2026-10-04-r94.json'
 assert bind(before)['sha256']=='6780f8f4eef8960a8dea907a3b40310c98b7a42dc2bf0b4bee296d3f8d252e63'
 old,new=json.loads(before.read_bytes()),json.loads(after.read_bytes());check_old(old)
 for v in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/v['path'])==v
 previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys();changes={p for p,v in previous.items() if current[p]!=v};assert changes==ALLOWED,(changes,ALLOWED)
 assert old['protected']==new['protected'] and old['processes']==new['processes']
 for k in ('workspace','branch','head'):assert old[k]==new[k]
 assert new['worktree']['stagedEntries']==0
 report={'scope':__doc__,'previousCheckpoint':bind(before),'currentCheckpoint':bind(after),'oldSourceChanges':sorted(changes),'newSources':sorted(current.keys()-previous.keys()),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),'processStartTimesExact':True,'staging':0,'productionChanges':PRODUCTION,'otherBusinessLogicEdited':False,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
 save(target,report);print(json.dumps(report),flush=True)

if __name__=='__main__':
 if sys.argv[1:]==['continuity']:continuity()
 else:assert not sys.argv[1:];allocation()
