"""Read actual saved r2 byte/frame/lifecycle evidence; reject inferred mixed concurrency."""
from pathlib import Path
import json,hashlib,collections
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT/'output/playwright/cloud-sky-live-mixed-1003-r2'
OUT=ROOT/'output/playwright/cloud-sky-live-mixed-readback-1003-r1';OUT.mkdir()
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(b): return hashlib.sha256(b).hexdigest()
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=sha(b))
failed=read(SOURCE/'live-failure.json');wire=failed['wire'];assert len(wire)==103
assert 'serialize unexpected value' in failed['error']
before=read(SOURCE/'inputs-before.json');after=read(SOURCE/'inputs-after.json');assert before==after
runner='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-live-mixed-api-scene-2026-10-03.mts'
executed=(SOURCE/'executed-script.mts').read_text(encoding='utf-8');current=(ROOT/runner).read_text(encoding='utf-8')
old="await page.exposeFunction('__liveAbort',(id:string)=>pending.get(id)?.destroy(new Error('browser_owner_abort')));"
new="await page.exposeFunction('__liveAbort',(id:string)=>{pending.get(id)?.destroy(new Error('browser_owner_abort'));});"
assert executed.count(old)==1 and executed.replace(old,new)==current
for r in before:
 b=(SOURCE/'executed-script.mts').read_bytes() if r['path']==runner else (ROOT/r['path']).read_bytes()
 assert len(b)==r['bytes'] and sha(b)==r['sha256'],r['path']
source_pins={}
for name in ['source-binding-before.json','api-inputs.json']:
 for r in read(SOURCE/name)['sourceBindings']:
  b=(ROOT/r['path']).read_bytes();assert len(b)==r['bytes'] and sha(b)==r['sha256'],r['path'];source_pins[r['path']]=r
for name in ['bundle.js','api-bundle.js','runtime-executor.js.txt','api-inputs.json','source-binding-before.json','metafile.json','api-metafile.json']:
 assert (SOURCE/name).read_bytes()==(ROOT/'output/playwright/cloud-sky-live-mixed-1003-r1'/name).read_bytes()
access=[]
for line in (SOURCE/'caddy.log').read_text(encoding='utf-8').splitlines():
 try: value=json.loads(line)
 except json.JSONDecodeError: continue
 if value.get('logger','').startswith('http.log.access.'):
  assert 'request' not in value and 'resp_headers' not in value and value.get('user_id') in (None,'');access.append(value)
success=[r for r in wire if r['completed'] and not r['aborted']]
aborted=[r for r in wire if r['aborted']];assert len(aborted)==2 and all(r['encodedBodyBytes']==0 for r in aborted)
assert len(access)==len(wire)
assert sum(r['size'] for r in access)==sum(r['encodedBodyBytes'] for r in success)
assert collections.Counter((r['status'],r['size'])for r in access if r['status'])==collections.Counter((r['status'],r['encodedBodyBytes'])for r in success)
sky=[r for r in success if r['client']==0 and r['phase']=='live-cold-north45']
ordinary=[r for r in success if r['client'] in (1,2)]
overlap=[]
for a in sky:
 for b in ordinary:
  duration=min(a['startedMs']+a['elapsedMs'],b['startedMs']+b['elapsedMs'])-max(a['startedMs'],b['startedMs'])
  if duration>0: overlap.append(dict(skyOrdinal=a['ordinal'],ordinaryOrdinal=b['ordinal'],client=b['client'],ms=duration))
assert overlap==[], 'saved evidence supplies no ordinary/cold-Scene HTTP overlap'
scene=[];frame_bindings=[]
names=['live-cold-north45','live-selected-overview','live-selected-detail','live-source-back','live-hide-return']
for name in names:
 row=read(SOURCE/(name+'.json'));assert row['gpuFailures']==[] and len(row['passes'])==4
 assert row['gates']['localOpticalFixtureEnabled'] is False
 for p in row['passes']:
  raw=SOURCE/(name+'-'+p['label']+'.rgba');png=SOURCE/(name+'-'+p['label']+'.png');pixels=raw.read_bytes()
  assert sha(pixels)==p['rgbaSha256'] and sha(png.read_bytes())==p['pngSha256']
  image=Image.open(png).convert('RGBA');assert image.size==(390,844)
  expected=b''.join(pixels[y*390*4:(y+1)*390*4]for y in range(843,-1,-1));assert image.tobytes()==expected
  assert p['glError']==0
  assert p['publication']['stagedSnapshotId']==p['publication']['publishedSnapshotId']
  assert p['presented']['frameAt']==row['ready']['at']
  frame_bindings.extend([bind(raw),bind(png)])
 scene.append(dict(condition=name,frames=len(row['passes']),readyAt=row['ready']['at'],
                   ownerRgbaModel=row['ready']['resources']['ownerRgbaModel'],encodedFilesBytes=row['ready']['resources']['filesBytes']))
for name in ['live-source-back','live-hide-return']:
 hidden=read(SOURCE/(name+'-hidden.json'));assert hidden['presented'] is None and not hidden['current'] and hidden['resources']['leases']==0
 if name=='live-source-back': assert hidden['navigation'][-1]['url']==hidden['credit']['sourceRoute']
final=read(SOURCE/'final-owner.json');cleared=final['afterClear'];assert not any(v['alive']for v in cleared['gpu']['handles'])
assert cleared['counters']['decodedPending']==cleared['counters']['nativeRunning']==0
assert not any(v['membership']=='CURRENT'for v in final['afterHide']['nativeCurrent'])
assert final['afterHide']['presented'] is None
for v in cleared['cache']:
 for name in ['leased','running','pending','reserved','bytes','entries','retired']: assert not v.get(name)
rpc=read(ROOT/'output/playwright/cloud-sky-live-abort-rpc-1003-r1/result.json');assert rpc['failingBefore']['failed'] and rpc['corrected']['returnedUndefined'] and rpc['closedRequests']==2
warm=[r for r in success if r['phase']=='live-warm-entry'];assert len(warm)==3 and all(r['status']==200 for r in warm)
assert 'w.Taro.setStorage=' not in executed and 'w.Taro.setStorage =' not in executed
result=dict(status='LIVE_API_SCENE_DEVELOPMENT_WITH_FAILED_MIXED_PROTOCOL',sourceRunStatus='FAILED_TASK_ABORT_RPC_SERIALIZATION',
 sourceFailurePreserved=True,currentOnlyCorrection='void abort RPC; verified in separate two-held-request regression, no full journey replay',
 sourcePinsCurrentExact=len(source_pins),phaseFrames=scene,frameBytes=frame_bindings,
 successfulHttpResponses=len(success),abortedResponses=len(aborted),encodedSuccessfulBodyBytes=sum(r['encodedBodyBytes']for r in success),
 decodedSuccessfulBodyBytes=sum(r['decodedBodyBytes']for r in success),caddyRawPayloadSumMatches=True,privacyFieldsRemoved=True,
 ordinaryColdIntervalOverlap=dict(status='FAILED_NO_OVERLAP',pairs=0,
  reason='Ordinary clients completed before cold Scene HTTP began; Promise kickoff is not actual interval overlap. This is not mixed capacity evidence.'),
 ordinary=dict(clients=2,actualHttpResponsesPerClient=[sum(r['client']==i for r in success)for i in (1,2)],
  meaning='Explicit fixture context/auth/map/overview/guides/site actual current API consumers, no production population or simultaneous load claim.'),
 warmEntry=dict(statuses=[r['status']for r in warm],encodedResponseBodyBytes=sum(r['encodedBodyBytes']for r in warm),
  meaning='Report/catalog/figures all returned200. No blanket warm304 claim; source 24entry/6MiB memory/3MiB persistence budgets known, specific evictions not observed.'),
 storageAdapter=dict(status='INCOMPLETE_ASYNC_NATIVE_STORAGE_METHOD',
  meaning='Task Taro storage supplied sync methods but omitted async setStorage. Actual response cache handles failed persistence; this run does not prove healthy persisted warm/restart. Fix task native port and observe actual owner before optimisation.'),
 resources=dict(peaks=final['resourcePeaks'],decodedPendingPeak=cleared['counters']['decodedPendingPeak'],nativeCallbackPeak=cleared['counters']['nativeCallbackPeak'],logicalHandlesAndActiveLeasesRetired=True,
  meaning='Owner RGBA, pending decode, encoded MapFS and GL models separate; do not sum as physical peak. Diagnostics hold real image offers; full API cache parsed JS, browser/driver/GC/native/RSS unknown.'),
 dataScope='Actual current full API request/cache/catalog/position/SAO and current extracted page effects/paint/lifecycle/Scene; real current source bytes with isolated test business/weather/AQ transport; controlled React/Taro/MapFS/clock/storage. Five software conditions only, not full component/WXML/touch/native or quality.',
 gaps=['true ordinary/cold Scene traffic overlap','healthy async storage/cache owner and causal warm eviction observations',
       'native pipeline/physical client total resources','actual WEAPP encoding/public12Mbps/10-20cold clients/isolated server CPU-RSS-DB-Redis-outbox-media',
       'complete time/tracking/layers/failure-recovery in live mixed path','quality/rights/batch publication/Source Back acceptance',
       'whole200DAU operating totals/180GB/remote mounts receipts full backup rollback','independent review'],
 capacityAccepted=False,independentReview='MISSING',
 origins=[bind(SOURCE/'live-failure.json'),bind(SOURCE/'executed-script.mts'),bind(SOURCE/'caddy.log'),bind(ROOT/'output/playwright/cloud-sky-live-abort-rpc-1003-r1/result.json')],
 next='Repair task async native storage, observe current response-cache owner; synchronize ordinary requests with actual cold Scene HTTP dispatch and verify interval intersection. Use only new affected cold/warm lane, do not replay five-condition matrix, R5, static cohorts or native startup without new cause.')
(OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':bind(OUT/'result.json'),'successfulHttp':len(success),'encodedBodyBytes':result['encodedSuccessfulBodyBytes'],'mixed':'FAILED_NO_OVERLAP','sourcePins':len(source_pins),'frames':len(frame_bindings)//2}))
