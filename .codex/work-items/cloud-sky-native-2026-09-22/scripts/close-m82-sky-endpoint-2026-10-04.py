"""Measure this SKY boundary/full display increment and preserve r91 continuity."""
from pathlib import Path
import importlib.util,json,sys
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-sky-endpoint-apertures-readback-1004-r1'
spec=importlib.util.spec_from_file_location('endpoint_close_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save
CHANGES={'data-pipelines/deep-sky/sdss_frame_noise.py','data-pipelines/deep-sky/test_sdss_frame_noise.py','data-pipelines/deep-sky/test_sdss_display_recovery.py','data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',*(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}

def old_exact(old):
 for v in old['currentSources']:
  if v['path'] not in CHANGES:assert bind(ROOT/v['path'])==v
  elif v['path'] in ('data-pipelines/deep-sky/sdss_frame_noise.py','data-pipelines/deep-sky/test_sdss_frame_noise.py','data-pipelines/deep-sky/test_sdss_display_recovery.py'):
   a=bind(ROOT/'output/sdss-frame-sky-endpoint-authority-1004-r1'/('before-'+Path(v['path']).name));assert (a['bytes'],a['sha256'])==(v['bytes'],v['sha256'])
 for v in old['protected']+old['evidence']:assert bind(ROOT/v['path'])==v

def allocation():
 target=OUT/'allocation-and-observation.json';assert not target.exists()
 old=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r91.json').read_bytes());old_exact(old)
 (OUT/'executed-close.py').write_bytes(Path(__file__).read_bytes())
 helper=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';s=helper.read_text(encoding='utf-8');ns={'__file__':str(helper)};exec(compile(s[:s.index('index_file=SOURCE')],str(helper),'exec'),ns)
 roots=[ROOT/'output'/v for v in ('sdss-m82-full-smooth-range-1004-r1','sdss-frame-sky-endpoint-authority-1004-r1','sdss-m82-sky-endpoint-consumer-1004-r1','sdss-m82-sky-endpoint-apertures-1004-r1','sdss-m82-sky-endpoint-apertures-1004-r2','sdss-m82-sky-endpoint-apertures-readback-1004-r1')]
 files=[p for d in roots for p in sorted(d.rglob('*')) if p.is_file()];facts=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 assert facts==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files];unique={v['identity']:v for v in facts}
 result={'scope':__doc__,'oldSources':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
  'fullThreeLodAndAll20CatalogStarPagesViewed':True,'threeApplicableChangedConsumerLodComparisonsViewed':True,
  'observations':'Full smooth range restores more intensity levels but darkens all image/star levels and retains grain/stripes, not default adoption. Official retained SKY bilinear constant-edge boundary fixes shared native-noise qualification, no scientific samples extended. Actual4668 endpoint native points match SciPy nearest/official conditional variance;old finite variance and native IDs/weights exact. Two changed regions plus real8px halo through RUN/epoch/known-bad recovery and existing native-ID common aperture:609/558 original q newly known,3/25 additional legitimate alternate supply;old supply/q/protected/requested radii-estimates exact. Scalar saved2601 new aperture means and frozen same-domain actual RGB read back;grain locally reduced but stripes/green structure remain, not full quality.',
  'retainedFailures':'Before-policy frame owner regression failed at legitimate boundary. One old recovery test conflated finite edge and true unknown; corrected finite-edge and nonfinite controls pass. Task aperture r1 g vs g-science metadata-key failure before source reads retained; r2 only corrects task metadata lookup, no previous image reprocessing.',
  'files':facts,'paths':len(facts),'logicalBytes':sum(v['bytes'] for v in facts),'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),
  'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in facts),'stableBeforeAfter':True,
  'limits':'Only six new task output directories incl executed-close before measurement. Excludes later measurement/doc/checkpoints/logs/old astronomical sources/deps/whole repository/FS internals/Linux retention/client-server mixed200DAU capacity. CPU/memory are local offline process measurements.',
  'productionChanges':['data-pipelines/deep-sky/sdss_frame_noise.py'],'otherBusinessLogicEdited':False,'astronomicalSourceRequestsOrWholeVarianceFitsCoaddFilterRuns':0,'boundedChangedConsumerApertureSelection':True,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
 save(target,result);print(json.dumps({k:v for k,v in result.items() if k!='files'}),flush=True)

def continuity():
 target=OUT/'checkpoint-continuity.json';assert not target.exists();before=TASK/'evidence/current-execution-state-2026-10-04-r91.json';after=TASK/'evidence/current-execution-state-2026-10-04-r92.json'
 assert bind(before)['sha256']=='383bfc7fd2203fd81f2f45d339174f56f13c0fa56019bb4c4730890ceb854f60'
 old,new=json.loads(before.read_bytes()),json.loads(after.read_bytes());old_exact(old)
 for v in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/v['path'])==v
 previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys()
 changes={p for p,v in previous.items() if current[p]!=v};assert changes==CHANGES,(changes,CHANGES)
 assert old['protected']==new['protected'] and old['processes']==new['processes']
 for k in ('workspace','branch','head'):assert old[k]==new[k]
 assert new['worktree']['stagedEntries']==0
 result={'scope':__doc__,'previousCheckpoint':bind(before),'currentCheckpoint':bind(after),'oldSourceChanges':sorted(changes),'newSources':sorted(current.keys()-previous.keys()),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),'processStartTimesExact':True,'staging':0,'productionChanges':['data-pipelines/deep-sky/sdss_frame_noise.py'],'otherBusinessLogicEdited':False,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
 save(target,result);print(json.dumps(result),flush=True)
if __name__=='__main__':
 if sys.argv[1:]==['continuity']:continuity()
 else:assert not sys.argv[1:];allocation()
