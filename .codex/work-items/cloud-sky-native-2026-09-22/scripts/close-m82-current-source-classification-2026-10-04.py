"""r105-r106 Sky current-source classification/discovery continuity and bounded Windows allocation."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-current-source-classification-readback-1004-r1'
DEVELOPMENT=ROOT/'output/sdss-m82-current-source-classification-development-1004-r1'

def bind(p):
 p=Path(p);h=hashlib.sha256()
 with p.open('rb') as f:
  for part in iter(lambda:f.read(1048576),b''):h.update(part)
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,value):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(value,indent=2,ensure_ascii=False)+'\n')

BEFORE=TASK/'evidence/current-execution-state-2026-10-04-r105.json'
assert bind(BEFORE)['sha256']=='4dcf1a750f28ea0ddd6eeb38d9c29ddfaa293649fc7d68dc05af455314bfd540'
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
 after=TASK/'evidence/current-execution-state-2026-10-04-r106.json';new=json.loads(after.read_bytes())
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
 import csv,io,urllib.parse
 schema_dir=ROOT/'output/sdss-m82-secondary-field-schema-1004-r1'
 discovery_dir=ROOT/'output/sdss-m82-secondary-field-candidates-1004-r1'
 schema=json.loads((schema_dir/'receipt.json').read_bytes())
 assert schema['state']=='ACQUIRED_SCHEMA_ROWS_NOT_FIELD_SUPPLY' and schema['requestsAttempted']==1
 assert bind(ROOT/schema['raw']['path'])==schema['raw']
 raw=(ROOT/schema['raw']['path']).read_text(encoding='utf-8-sig')
 rows=list(csv.DictReader(io.StringIO('\n'.join(v for v in raw.splitlines() if not v.startswith('#')))))
 assert rows==schema['rows'] and len(rows)==431
 columns={r['name']:r for r in rows}
 for name in ('raMin','raMax','decMin','decMax'):assert columns[name]['unit']=='deg'
 assert columns['fieldID']['type']=='bigint'
 discovery=json.loads((discovery_dir/'receipt.json').read_bytes())
 assert discovery['state']=='UNAVAILABLE_OR_UNCHECKED_NOT_EMPTY' and discovery['errorType']=='TimeoutError'
 assert discovery['requestsAttempted']==1 and discovery['automaticRetries']==0 and discovery['framesAcquired']==0
 assert not discovery.get('rows') and not discovery.get('raw')
 assert bind(ROOT/discovery['schemaReceipt']['path'])==discovery['schemaReceipt']
 plan=json.loads((ROOT/discovery['oldPrimaryOnlyPlan']['path']).read_bytes())
 assert bind(ROOT/discovery['oldPrimaryOnlyPlan']['path'])==discovery['oldPrimaryOnlyPlan']
 assert 'primaryFieldID' in plan['query'] and 'primaryFieldID' not in discovery['sql']
 assert discovery['sql']==urllib.parse.parse_qs(urllib.parse.urlsplit(discovery['requestUrl']).query)['cmd'][0]
 save(OUT/'metadata-discovery-readback.json',{'schemaRaw':schema['raw'],'schemaRowsExact':431,'oldPrimaryOnlyPlan':discovery['oldPrimaryOnlyPlan'],
  'schemaReceipt':bind(schema_dir/'receipt.json'),'discoveryReceipt':bind(discovery_dir/'receipt.json'),'requests':2,
  'fieldBoundsQueryTimedOut':True,'additionalFieldsAndCoverage':'UNKNOWN_NOT_EMPTY_OR_COMPLETE','automaticRetries':0,'frameDownloads':0,
  'productionChanges':False,'otherBusinessLogicEdited':False})

 owner=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';source=owner.read_text(encoding='utf-8');ns={'__file__':str(owner)}
 exec(compile(source[:source.index('index_file=SOURCE')],str(owner),'exec'),ns)
 directories=[DEVELOPMENT,OUT,ROOT/'output/sdss-m82-current-source-classification-1004-r1',ROOT/'output/sdss-m82-secondary-field-schema-1004-r1',ROOT/'output/sdss-m82-secondary-field-candidates-1004-r1']
 files=[p for directory in directories for p in sorted(directory.rglob('*')) if p.is_file()]
 facts=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 assert facts==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
 unique={r['identity']:r for r in facts}
 report={'scope':__doc__,'files':facts,'paths':len(facts),'logicalBytes':sum(r['bytes'] for r in facts),
  'reportedAllocationByUniqueIdentityBytes':sum(r['reportedAllocationBytes'] for r in unique.values()),
  'distinctFileIdentities':len(unique),'maximumLinkCount':max(r['links'] for r in facts),'stableBeforeAfter':True,
  'oldSources':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
  'otherBusinessLogicEdited':False,'productionCodeChanged':False,'ordinaryAdoption':False,'newFrameDownloadsOrScienceReprocessing':0,'officialSchemaAndFieldMetadataRequests':2,
  'limits':'Only five new Windows development/diagnostic/readback/schema/metadata-candidate directories and executed close. Excludes subsequent allocation document/log/checkpoint/continuity, old source/output/dependencies, FS internals, Linux retention, native/decode/GPU/process peaks and 200DAU capacity.'}
 save(OUT/'allocation-and-observation.json',report)
 print(json.dumps({k:v for k,v in report.items() if k!='files'}),flush=True)
