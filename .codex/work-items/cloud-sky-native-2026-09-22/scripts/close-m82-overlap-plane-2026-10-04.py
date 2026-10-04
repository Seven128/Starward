"""r104-r105 Sky overlap-plane diagnostic continuity and bounded Windows allocation."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-overlap-plane-readback-1004-r1'
DEVELOPMENT=ROOT/'output/sdss-m82-overlap-plane-development-1004-r1'

def bind(p):
 p=Path(p);h=hashlib.sha256()
 with p.open('rb') as f:
  for part in iter(lambda:f.read(1048576),b''):h.update(part)
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,value):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(value,indent=2,ensure_ascii=False)+'\n')

BEFORE=TASK/'evidence/current-execution-state-2026-10-04-r104.json'
assert bind(BEFORE)['sha256']=='8d726627d57f09c31d34b1cf6a46b86e5c7b601d2ff8385d6ce914e7664ce8c5'
old=json.loads(BEFORE.read_bytes())
archives=json.loads((DEVELOPMENT/'before-bindings.json').read_bytes())
allowed={r['path'] for r in archives};assert len(allowed)==4
for row in archives:
 actual=bind(DEVELOPMENT/'before'/row['path']);assert (actual['bytes'],actual['sha256'])==(row['bytes'],row['sha256'])
for row in old['currentSources']:
 if row['path'] in allowed:assert next(r for r in archives if r['path']==row['path'])==row
 else:assert bind(ROOT/row['path'])==row,row['path']
for row in old['protected']+old['evidence']:assert bind(ROOT/row['path'])==row,row['path']
if sys.argv[1:]==['continuity']:
 after=TASK/'evidence/current-execution-state-2026-10-04-r105.json';new=json.loads(after.read_bytes())
 previous={r['path']:r for r in old['currentSources']};current={r['path']:r for r in new['currentSources']}
 assert previous.keys()<=current.keys()
 changed={p for p,v in previous.items() if current[p]!=v};assert changed==allowed & previous.keys(),changed
 for row in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/row['path'])==row,row['path']
 assert old['protected']==new['protected'] and old['processes']==new['processes']
 for key in ('workspace','branch','head'):assert old[key]==new[key]
 assert new['worktree']['stagedEntries']==0
 report={'previousCheckpoint':bind(BEFORE),'currentCheckpoint':bind(after),'changedOldBoundSources':sorted(changed),
  'newCurrentSourceBindings':sorted(current.keys()-previous.keys()),'currentSources':len(current),
  'currentEvidence':len(new['evidence']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),
  'processStartTimesExact':True,'staging':0,'otherBusinessLogicEdited':False}
 save(OUT/'checkpoint-continuity.json',report);print(json.dumps(report),flush=True)
else:
 assert not sys.argv[1:]
 (OUT/'executed-close.py').write_bytes(Path(__file__).read_bytes())
 owner=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';source=owner.read_text(encoding='utf-8');ns={'__file__':str(owner)}
 exec(compile(source[:source.index('index_file=SOURCE')],str(owner),'exec'),ns)
 directories=[DEVELOPMENT,OUT,ROOT/'output/sdss-m82-overlap-plane-1004-r1']
 files=[p for directory in directories for p in sorted(directory.rglob('*')) if p.is_file()]
 facts=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 assert facts==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 unique={r['identity']:r for r in facts}
 report={'scope':__doc__,'files':facts,'paths':len(facts),'logicalBytes':sum(r['bytes'] for r in facts),
  'reportedAllocationByUniqueIdentityBytes':sum(r['reportedAllocationBytes'] for r in unique.values()),
  'distinctFileIdentities':len(unique),'maximumLinkCount':max(r['links'] for r in facts),'stableBeforeAfter':True,
  'oldSources':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
  'otherBusinessLogicEdited':False,'productionCodeChanged':False,'ordinaryAdoption':False,'newAstronomicalSourceRequestsOrScienceReprocessing':0,
  'limits':'Only three new Windows development/diagnostic/readback directories and executed close. Excludes subsequent allocation document/log/checkpoint/continuity, old source/output/dependencies, FS internals, Linux retention, native/decode/GPU/process peaks and 200DAU capacity.'}
 save(OUT/'allocation-and-observation.json',report)
 print(json.dumps({k:v for k,v in report.items() if k!='files'}),flush=True)
