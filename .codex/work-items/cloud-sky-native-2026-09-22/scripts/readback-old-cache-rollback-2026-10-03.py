"""Read actual filesystem rollback evidence and current scope; no replay."""
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
BEFORE=ROOT/'output/sky-old-cache-rollback-1003-r1'
LANE=ROOT/'output/sky-old-cache-rollback-1003-r3'
OUT=ROOT/'output/sky-old-cache-rollback-readback-1003-r1';OUT.mkdir()
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
try:
 cp=read(TASK/'evidence/current-execution-state-2026-10-03-r49.json')
 allowed={'apps/wechat-miniapp/src/services/sky-public-image-cache.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.test.ts'}
 checked=[]
 for v in cp['currentSources']+cp['protected']:
  if v['path'] not in allowed:assert bind(ROOT/v['path'])==v,v['path'];checked.append(v)
 assert read(LANE/'inputs-before.json')==read(LANE/'inputs-after.json')
 for v in read(LANE/'inputs-before.json'):assert bind(ROOT/v['path'])==v
 assert bind(LANE/'current-owner-executed.ts')['sha256']==bind(ROOT/'apps/wechat-miniapp/src/services/sky-public-image-cache.ts')['sha256']
 old=read(BEFORE/'result.json');now=read(LANE/'result.json')
 assert old['status']=='FAILED_OLD_CLEAR_LEAVES_UNMANAGED_JSON'
 assert old['oldClearedStatus']=='complete' and old['oldAccountedBytes']==0 and old['unmanagedJsonBytes']==19433
 assert now['status']=='OLD_BINARY_CLEAR_RETURNS_NO_UNMANAGED_JSON' and now['unmanagedJsonBytes']==0
 assert old['legacySource']==now['legacySource'] and old['sourceFiles']==now['sourceFiles']
 assert bind(ROOT/now['legacySource']['path'])==now['legacySource']
 assert bind(ROOT/now['previousV2Source']['path'])==now['previousV2Source']
 assert now['previousV2Source']['sha256']==next(v['sha256']for v in cp['currentSources']if v['path']=='apps/wechat-miniapp/src/services/sky-public-image-cache.ts')
 for v in now['sourceFiles']:assert bind(ROOT/v['path'])==v
 phases={v['phase']:v for v in now['phases']};source=now['sourceFiles'][0]
 baseline={v['phase']:v for v in old['phases']}
 assert any(v['sha256']==source['sha256']for v in baseline['old-clear']['files'])
 assert not any(v['sha256']==source['sha256']for v in phases['old-clear']['files'])
 mixed=phases['current-mixed'];assert mixed['cache']['entries']==2 and mixed['cache']['bytes']==8194+19433
 json_file=next(v for v in mixed['files']if v['sha256']==source['sha256'])
 disposable=re.compile(r'^stage-[a-z0-9_]+-[1-9]\d*$')
 assert disposable.fullmatch(json_file['file']) and json_file['file'].startswith('stage-catalog_')
 assert not json_file['file'].endswith(('.png','.jpg','.json'))
 previous=phases['previous-v2-json'];assert any(v['file'].endswith('.json') and v['sha256']==source['sha256']for v in previous['files'])
 migration=phases['current-migrates-actual-v2'];assert migration['downloads']==0
 assert migration['old'].endswith('.json') and disposable.fullmatch(migration['current'])
 assert not any(v['file']==migration['old']for v in migration['files'])
 assert next(v for v in migration['files']if v['file']==migration['current'])['sha256']==source['sha256']
 failure=phases['old-unlink-failure'];assert failure['result']['status']=='partial'
 assert failure['cache']['bytes']==source['bytes']==19433 and failure['cache']['failures']>0
 retry=phases['old-clear-retry'];assert retry['result']['status']=='complete' and retry['cache']['bytes']==0
 assert not any(v['sha256']==source['sha256']for v in retry['files'])
 assert phases['current-reupgrade-json']['downloads']==1,'old clear must not be undone by a stale index hit'
 operations=read(LANE/'operations.json')
 assert any(v['operation']=='rename' and v['from']==migration['old'] and v['to']==migration['current']for v in operations)
 final=phases['final-migrated-current-clear'];assert final['cache']['entries']==final['cache']['bytes']==final['cache']['leased']==0
 assert len(final['files'])==1 and final['files'][0]['file']=='index-v2.json' and final['files'][0]['bytes']==26
 disk=LANE/'owned-cache';assert [p.name for p in disk.iterdir()]==['index-v2.json']
 assert read(disk/'index-v2.json')==dict(version=2,entries=[])
 assert bind(disk/'index-v2.json')['sha256']==final['files'][0]['sha256']
 assert 'tests 2' in (BEFORE/'regression-before.log').read_text(encoding='utf-8-sig') and 'fail 2' in (BEFORE/'regression-before.log').read_text(encoding='utf-8-sig')
 assert 'pass 28' in (BEFORE/'affected-after-final.log').read_text(encoding='utf-8-sig')
 assert 'pass 1' in (BEFORE/'filename-binding-after.log').read_text(encoding='utf-8-sig')
 failed=read(ROOT/'output/sky-old-cache-rollback-1003-r2/failed.json');assert "'partial'" in failed['error']
 result=dict(status='OLD_BINARY_CATALOG_RETENTION_SAVED_DEVELOPMENT_READBACK',protectedExact=6,
  previousPinsExact=len(checked),allowedProductChanges=sorted(allowed),
  actualOldOwner=True,actualPreFixV2Owner=True,realNodeFilesystem=True,
  beforeOldClear=dict(status='complete',accountedBytes=0,unmanagedJsonBytes=19433),afterOldClear=dict(status='complete',accountedBytes=0,unmanagedJsonBytes=0),
  migratedWithoutTransfer=True,sourceSha256=source['sha256'],sourceBytes=source['bytes'],
  failedRemoval=dict(status='partial',retainedAccountedBytes=19433),explicitRetry=dict(status='complete',retainedAccountedBytes=0),
  reupgradeTransferAfterOldClear=1,finalInventoryBytes=26,physicalAllocation=None,
  imageOnlyRollback='Cache data can be discarded; old v1 metadata cannot warm-restore v2 images. Source PNG is reacquired from controlled existing file supply.',
  legacyMetadata='Old owner leaves the unrecognised v2 index pointer, bounded by its existing 256KiB limit; current reupgrade revalidates listed presence and removes the v1 pointer. No live whole-app 200MB claim.',
  taskR2Failure='Mixed-separator path did not match injected unlink fault; complete response was truthful. Fixed only fault-target normalisation for r3; no old-product failure reclassification.',
  origins=[bind(LANE/n)for n in ['result.json','phases.json','operations.json','inputs-before.json','inputs-after.json','current-owner-executed.ts','legacy-owner-executed.ts']]+[bind(BEFORE/'result.json')],
  independentReview='MISSING',otherBusinessLogicChanged=False,
  scope='Actual archived old/pre-fix v2 factories plus current source and isolated real Node filesystem/source files; native unlink failure injected. New runtime UTF8/JSON-file/query consumers exercised in affected tests with controlled native ports. Not actual old/new WEAPP binaries, full current page/React provider/physical filesystem allocation/all 200MB/quality/200DAU capacity. Root self-review, no HTTP/scene replay/source download/deploy.')
 (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(dict(result=bind(OUT/'result.json'),beforeUnmanaged=19433,afterUnmanaged=0,protected6Exact=True)))
except Exception as e:
 (OUT/'failed.json').write_text(json.dumps(dict(error=repr(e)),indent=2)+'\n',encoding='utf-8');raise
