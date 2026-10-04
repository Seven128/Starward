"""Read actual saved dispatch, frame bytes, persisted port and privacy log evidence."""
from pathlib import Path
import json,hashlib,collections
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT/'output/playwright/cloud-sky-live-mixed-1003-r3'
OUT=ROOT/'output/playwright/cloud-sky-live-cold-dispatch-readback-1003-r2';OUT.mkdir()
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(b): return hashlib.sha256(b).hexdigest()
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=sha(b))
result=read(SOURCE/'result.json');assert result['status']=='LIVE_COLD_DISPATCH_STORAGE_PORT_DEVELOPMENT'
wire=result['wire'];assert wire==read(SOURCE/'wire-requests.json') and result['errors']==[]
before=read(SOURCE/'inputs-before.json');after=read(SOURCE/'inputs-after.json');assert before==after
for v in before: assert bind(ROOT/v['path'])==v
assert (SOURCE/'executed-script.mts').read_bytes()==(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-live-cold-dispatch-2026-10-03.mts').read_bytes()
pins={}
for name in ['source-binding-before.json','api-inputs.json']:
 for v in read(SOURCE/name)['sourceBindings']:
  assert bind(ROOT/v['path'])=={k:v[k]for k in ('path','bytes','sha256')};pins[v['path']]=v
for name in ['bundle.js','api-bundle.js','runtime-executor.js.txt','api-inputs.json','source-binding-before.json','metafile.json','api-metafile.json']:
 assert (SOURCE/name).read_bytes()==(ROOT/'output/playwright/cloud-sky-live-mixed-1003-r2'/name).read_bytes()
access=[]
for line in (SOURCE/'caddy.log').read_text(encoding='utf-8').splitlines():
 try: v=json.loads(line)
 except json.JSONDecodeError: continue
 if v.get('logger','').startswith('http.log.access.'):
  assert 'request' not in v and 'resp_headers' not in v and v.get('user_id') in (None,'');access.append(v)
success=[v for v in wire if v['completed'] and not v['aborted']]
assert len(success)==len(wire)==len(access)
assert collections.Counter((v['status'],v['size'])for v in access)==collections.Counter((v['status'],v['encodedBodyBytes'])for v in success)
ordinary=[v for v in success if v['client']>0 and v['phase']=='ordinary-coordinated']
scene=[v for v in success if v['client']==0 and v['phase']=='live-cold-dispatch']
assert len(ordinary)==8
overlaps=[]
for a in ordinary:
 for b in scene:
  d=min(a['startedMs']+a['elapsedMs'],b['startedMs']+b['elapsedMs'])-max(a['startedMs'],b['startedMs'])
  if d>0: overlaps.append(dict(ordinary=a['ordinal'],scene=b['ordinal'],overlapMs=d))
dispatch=read(SOURCE/'dispatch-overlap.json');assert overlaps==dispatch['overlaps'] and len(overlaps)==37
assert dispatch['queuedCount']==dispatch['releasedCount']==8
warm=read(SOURCE/'warm-owner-readback.json');assert result['warm']==warm
for lane in warm:
 assert len(lane['requests'])==3
 for v in lane['requests']:
  assert v['conditionalRequest'] and v['status']==304 and v['encodedBodyBytes']==0
  assert all(wire[v['ordinal']-1][key]==value for key,value in v.items())
 state=lane['state']['after'];assert state['pending']==0 and state['schemaVersion']==2
 assert sum(v['chunks']for v in state['entries'])==state['chunkCount']
 assert sum(v['storageBytes']for v in state['entries'])<=3*1024*1024 and len(state['entries'])<=24
 assert {'spot-sky','constellation-catalog','stellar-catalog'}<={v['family']for v in state['entries']}
assert warm[0]['state']['after']['asyncWrites']==12 and warm[-1]['state']['after']['asyncWrites']==32
assert warm[-1]['state']['before']==warm[-1]['state']['after']
row=read(SOURCE/'live-cold-dispatch.json');assert row==result['sceneRows'][0] and len(row['passes'])==4 and row['gpuFailures']==[]
frames=[]
for p in row['passes']:
 raw=SOURCE/('live-cold-dispatch-'+p['label']+'.rgba');png=SOURCE/('live-cold-dispatch-'+p['label']+'.png');pixels=raw.read_bytes()
 assert sha(pixels)==p['rgbaSha256'] and sha(png.read_bytes())==p['pngSha256']
 image=Image.open(png).convert('RGBA');assert image.size==(390,844)
 assert image.tobytes()==b''.join(pixels[y*390*4:(y+1)*390*4]for y in range(843,-1,-1))
 assert p['glError']==0 and p['publication']['stagedSnapshotId']==p['publication']['publishedSnapshotId']
 assert p['presented']['frameAt']==row['ready']['at'];frames.extend([bind(raw),bind(png)])
final=read(SOURCE/'final-owner.json');clear=final['afterClear']
assert not any(v['alive']for v in clear['gpu']['handles'])
assert clear['counters']['decodedPending']==clear['counters']['nativeRunning']==0
assert final['afterHide']['presented'] is None and not any(v['membership']=='CURRENT'for v in final['afterHide']['nativeCurrent'])
for v in clear['cache']:
 for key in ['leased','running','pending','reserved','bytes','entries','retired']: assert not v.get(key)
prior=read(ROOT/'output/playwright/cloud-sky-live-mixed-readback-1003-r1/result.json')
assert prior['ordinaryColdIntervalOverlap']['status']=='FAILED_NO_OVERLAP' and prior['sourceFailurePreserved']
summary=dict(status='LIVE_COLD_DISPATCH_STORAGE_PORT_DEVELOPMENT_READBACK',sourcePinsCurrentExact=len(pins),
 successfulHttpResponses=len(success),statusCounts=dict(collections.Counter(str(v['status'])for v in success)),
 encodedSuccessfulBodyBytes=sum(v['encodedBodyBytes']for v in success),decodedSuccessfulBodyBytes=sum(v['decodedBodyBytes']for v in success),
 ordinaryBodyBytes=sum(v['encodedBodyBytes']for v in ordinary),privacyLogMatchesEncodedStatusSizeMultiset=True,
 overlap=dict(pairs=len(overlaps),ordinaryRequests=len(ordinary),scope=dispatch['scope']),
 warm=dict(phases=[dict(label=v['label'],statuses=[r['status']for r in v['requests']],encodedBodyBytes=0,
  persistedEntries=len(v['state']['after']['entries']),persistedStorageBytes=sum(r['storageBytes']for r in v['state']['after']['entries']),asyncChunkWrites=v['state']['after']['asyncWrites'])for v in warm],
  scope='Actual cache singleton/client module reinitialised using saved task Map storage. No WeChat native persistence/device restart proof. Limited cold lane has less pressure than the prior five-condition run; its three200 responses remain observed, causal eviction remains unknown.'),
 frames=frames,resources=dict(peaks=final['resourcePeaks'],logicalOwnerHandlesRetired=True,
  scope='Owner/pending decode/encoded files/GL separate; not summed physical peak. Full metadata JS, task diagnostics, GC/native/GPU driver/RSS remain unknown.'),
 previousFailedMixedProtocolPreserved=True,productionSourceChanged=False,otherBusinessLogicChanged=False,
 origins=[bind(SOURCE/name)for name in ['result.json','wire-requests.json','caddy.log','warm-owner-readback.json','dispatch-overlap.json','executed-script.mts']],
 capacityAccepted=False,independentReview='MISSING',
 next='Current live integrated software path still needs time/tracking/layers/panorama fade and selected refinement failure/coarse fallback/cancellation/lifecycle combined. Reuse existing current owner and measured ports; no cold matrix repetition or guessed production queue/cache optimisation. Native composition/devices/quality/rights/publication/whole200DAU capacity remain open.')
(OUT/'result.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':bind(OUT/'result.json'),'responses':len(success),'encodedBodyBytes':summary['encodedSuccessfulBodyBytes'],'overlapPairs':len(overlaps),'warm304':9,'frames':len(frames)//2,'productionUnchanged':True}))
