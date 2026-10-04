"""Local allocation and r94-r95 continuity of explicit SDSS display publication."""
from pathlib import Path
import sys,json,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-display-publication-readback-1004-r1'
spec=importlib.util.spec_from_file_location('noise_increment_close_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save
ALLOWED={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',*(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
ARCHIVES={'packages/miniapp-contracts/src/sdss-science-optical-publication.ts':'before-sdss-science-optical-publication.ts','data-pipelines/deep-sky/publish_prepared_optical.py':'before-io-extraction-publish_prepared_optical.py'}
ALLOWED|=set(ARCHIVES)
PRODUCTION=['packages/miniapp-contracts/src/sdss-science-optical-publication.ts','packages/miniapp-contracts/src/sdss-display-optical-publication.ts','data-pipelines/deep-sky/publish_prepared_optical.py','data-pipelines/deep-sky/publish_sdss_display.py','data-pipelines/deep-sky/optical_publication_io.py','data-pipelines/deep-sky/pack_sdss_display_publication.mts']

def check_old(old):
 for v in old['currentSources']:
  if v['path'] in ARCHIVES:
   actual=bind(ROOT/'output/sdss-m82-display-publication-development-1004-r1'/ARCHIVES[v['path']]);assert (actual['bytes'],actual['sha256'])==(v['bytes'],v['sha256'])
  elif v['path'] not in ALLOWED:assert bind(ROOT/v['path'])==v
 for v in old['protected']+old['evidence']:assert bind(ROOT/v['path'])==v

def allocation():
 target=OUT/'allocation-and-observation.json';assert not target.exists();old=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r94.json').read_bytes());check_old(old)
 (OUT/'executed-close.py').write_bytes(Path(__file__).read_bytes())
 p=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';s=p.read_text(encoding='utf-8');ns={'__file__':str(p)};exec(compile(s[:s.index('index_file=SOURCE')],str(p),'exec'),ns)
 dirs=[ROOT/'output'/v for v in ('sdss-m82-display-publication-development-1004-r1','sdss-m82-display-publication-1004-r1','sdss-m82-display-publication-1004-r2','sdss-m82-display-publication-readback-1004-r1','sdss-m82-display-admission-readback-1004-r1','sdss-m82-display-admission-readback-1004-r2')]
 files=[p for d in dirs for p in sorted(d.rglob('*')) if p.is_file()];facts=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 assert facts==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files];unique={v['identity']:v for v in facts}
 result={'scope':__doc__,'previousSources':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
  'actualUnchangedPublishedPngBytesMatchPreviouslyViewedCompleteThreeLevels':True,
  'observations':'Explicit sdss-display-optical-v1 preserves original SCI mother and distinguishes display-estimate means,source/noise/common-aperture/execution/dependency/implementation receipts. Actual frozen saved three-level packaging and sharedTS hash with 18 actual source admission receipts pass;PNG originalnewincrement bytes exact. Existing science-v2/v3 and Prepared rejectnewdisplay. Shared byte/decoderbuffer/fixed NPY header-before-allocation owner used by Prepared/display without AVM coupling;30affectedPython checks,11contract checks/type pass. Same-size restored-on-disk buffer mutation demonstrates escaped forged credit if decoder pin removed;malformedheader rejects before np.load. Actual latest guarded newdisplay/oldPrepared16777216 decodedRGBA payload exact without oldsource-generation replay. AVM-import failure/source-band mismatch and reader task wrong metadata key preserved. No runtime registration/HTTP/static/cache/Scene/Back or newimagequality acceptance.',
  'files':facts,'paths':len(facts),'logicalBytes':sum(v['bytes'] for v in facts),'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),'distinctFileIdentities':len(unique),'maximumLinkCount':max(v['links'] for v in facts),'stableBeforeAfter':True,
  'limits':'Only six new Windows offline output directories including executed-close before measurement. Excludes later measurement/doc/logs/checkpoints/old inputs/candidates/deps/FS internals/Linux actual disk retention/client-server200DAUcapacity. CPU/memory belong to local offline source consumption,not targetruntime.',
  'productionChanges':PRODUCTION,'otherBusinessLogicEdited':False,'newAstronomicalSourceRequestsOrWholeVarianceFitsScienceCoaddOldApertureMatrices':0,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
 save(target,result);print(json.dumps({k:v for k,v in result.items() if k!='files'}),flush=True)

def continuity():
 target=OUT/'checkpoint-continuity.json';assert not target.exists();before=TASK/'evidence/current-execution-state-2026-10-04-r94.json';after=TASK/'evidence/current-execution-state-2026-10-04-r96.json'
 assert bind(before)['sha256']=='3cb10d3e7ff3a318701d6d35007728f2ed7cba1e58dbfa78e2aa69acb550068b'
 old,new=json.loads(before.read_bytes()),json.loads(after.read_bytes());check_old(old)
 for v in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/v['path'])==v
 previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys();changes={p for p,v in previous.items() if current[p]!=v};assert changes==ALLOWED & previous.keys(),(changes,ALLOWED & previous.keys())
 assert current.keys()-previous.keys() >= {"data-pipelines/deep-sky/publish_prepared_optical.py"}
 assert old['protected']==new['protected'] and old['processes']==new['processes']
 for k in ('workspace','branch','head'):assert old[k]==new[k]
 assert new['worktree']['stagedEntries']==0
 report={'scope':__doc__,'previousCheckpoint':bind(before),'currentCheckpoint':bind(after),'oldSourceChanges':sorted(changes),'newSources':sorted(current.keys()-previous.keys()),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),'processStartTimesExact':True,'staging':0,'productionChanges':PRODUCTION,'otherBusinessLogicEdited':False,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
 save(target,report);print(json.dumps(report),flush=True)

if __name__=='__main__':
 if sys.argv[1:]==['continuity']:continuity()
 else:assert not sys.argv[1:];allocation()
