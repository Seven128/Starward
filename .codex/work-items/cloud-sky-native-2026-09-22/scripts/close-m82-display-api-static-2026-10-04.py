"""r96-r97 Sky-only API/static continuity and bounded Windows output allocation."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-display-api-readback-1004-r2'
DEVELOPMENT=ROOT/'output/sdss-m82-display-api-development-1004-r1'
def bind(p):
 p=Path(p); h=hashlib.sha256()
 with p.open('rb') as f:
  for part in iter(lambda:f.read(1024*1024),b''):h.update(part)
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,value):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
BEFORE=TASK/'evidence/current-execution-state-2026-10-04-r96.json'
assert bind(BEFORE)['sha256']=='01c970657d750be40ef5325c2a32bc29263fedf813057ef437abedce6e134899'
old=json.loads(BEFORE.read_bytes())
archives=json.loads((DEVELOPMENT/'before-bindings.json').read_bytes()); allowed={r['path'] for r in archives}
def check_old():
 for row in archives:
  actual=bind(DEVELOPMENT/'before'/row['path']); assert (actual['bytes'],actual['sha256'])==(row['bytes'],row['sha256'])
 for row in old['currentSources']:
  if row['path'] in allowed:
   before=next(r for r in archives if r['path']==row['path']);assert before==row
  else:assert bind(ROOT/row['path'])==row
 for row in old['protected']+old['evidence']:assert bind(ROOT/row['path'])==row
check_old()
if sys.argv[1:]==['continuity']:
 after=TASK/'evidence/current-execution-state-2026-10-04-r97.json';new=json.loads(after.read_bytes())
 previous={r['path']:r for r in old['currentSources']};current={r['path']:r for r in new['currentSources']}
 assert previous.keys()<=current.keys()
 changed={p for p,v in previous.items() if current[p]!=v};assert changed==allowed & previous.keys(),changed
 for row in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/row['path'])==row
 assert old['protected']==new['protected'] and old['processes']==new['processes']
 for key in ('workspace','branch','head'):assert old[key]==new[key]
 assert new['worktree']['stagedEntries']==0
 report={'previousCheckpoint':bind(BEFORE),'currentCheckpoint':bind(after),'changedOldBoundSources':sorted(changed),
  'newCurrentSourceBindings':sorted(current.keys()-previous.keys()),'indexWasExistingButNotPreviouslyCheckpointBound':True,
  'currentSources':len(current),'currentEvidence':len(new['evidence']),'oldEvidenceExact':len(old['evidence']),
  'protectedExact':len(new['protected']),'processStartTimesExact':True,'staging':0,'otherBusinessLogicEdited':False}
 save(OUT/'checkpoint-continuity.json',report);print(json.dumps(report),flush=True)
else:
 assert not sys.argv[1:]
 (OUT/'executed-close.py').write_bytes(Path(__file__).read_bytes())
 owner=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';source=owner.read_text(encoding='utf-8');ns={'__file__':str(owner)}
 exec(compile(source[:source.index('index_file=SOURCE')],str(owner),'exec'),ns)
 directories=[DEVELOPMENT,ROOT/'output/sdss-m82-display-api-static-1004-r1',ROOT/'output/sdss-m82-display-api-readback-1004-r1',OUT]
 files=[p for directory in directories for p in sorted(directory.rglob('*')) if p.is_file()]
 facts=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 assert facts==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 unique={row['identity']:row for row in facts}
 report={'scope':__doc__,'files':facts,'paths':len(facts),'logicalBytes':sum(r['bytes'] for r in facts),
  'reportedAllocationByUniqueIdentityBytes':sum(r['reportedAllocationBytes'] for r in unique.values()),
  'distinctFileIdentities':len(unique),'maximumLinkCount':max(r['links'] for r in facts),'stableBeforeAfter':True,
  'oldSources':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
  'otherBusinessLogicEdited':False,'ordinaryAdoption':False,'newAstronomicalSourceRequestsOrScienceReprocessing':0,
  'limits':'Only four new Windows local API/static/readback/development output directories including executed close. Includes whole standard static bundle; excludes subsequent allocation document/log/checkpoint/continuity, prior sources/output/dependencies, FS internals, Linux retention, client resources, process memory and 200DAU capacity.'}
 save(OUT/'allocation-and-observation.json',report)
 print(json.dumps({k:v for k,v in report.items() if k!='files'}),flush=True)
