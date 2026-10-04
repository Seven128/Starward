"""Read saved owner decisions and painted pixels, preserving their source epoch."""
from pathlib import Path
import json,hashlib,collections,math
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'output/playwright/cloud-sky-cache-material-readback-1003-r2';OUT.mkdir()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(b):return hashlib.sha256(b).hexdigest()
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=sha(b))
checkpoint=read(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-03-r44.json')
prior={v['path']:v for v in checkpoint['currentSources']}
changed={'workers/miniapp-api/src/sao-publication.ts','workers/miniapp-api/src/sao-publication.controller.ts'}
def sources(s):
 before=read(s/'inputs-before.json');assert before==read(s/'inputs-after.json');epochs=[]
 for v in before:
  if v['path']in changed:
   assert v==prior[v['path']];assert bind(ROOT/v['path'])!=v;epochs.append(v)
  else:assert bind(ROOT/v['path'])==v
 pins={}
 for name in ['source-binding-before.json','api-inputs.json']:
  for v in read(s/name)['sourceBindings']:
   assert bind(ROOT/v['path'])=={k:v[k]for k in ('path','bytes','sha256')};pins[v['path']]=v
 return dict(currentBundlePinsExact=len(pins),executionBeforeAfterExact=True,
  subsequentlyChangedSourceEpoch=epochs,oldBytesArchived=False,
  scope='Historical backend execution pins match r44 and before/after. These two sources were subsequently changed for the raw SAO boundary; they are not claimed as current or independently archived.')
def wire(s,d):
 rows=read(s/'wire-requests.json');assert rows==d['wire'];success=[v for v in rows if v['completed']and not v['aborted']];access=[]
 for line in(s/'caddy.log').read_text(encoding='utf-8').splitlines():
  try:v=json.loads(line)
  except json.JSONDecodeError:continue
  if v.get('logger','').startswith('http.log.access.'):
   assert 'request'not in v and 'resp_headers'not in v and v.get('user_id')in(None,'');access.append(v)
 assert len(access)==len(rows)
 assert collections.Counter((v['status'],v['size'])for v in access if v['status'])==collections.Counter((v['status'],v['encodedBodyBytes'])for v in success)
 for kind in ['encoded','decoded']:assert sum(v[kind+'BodyBytes']for v in success)==d[kind+'SuccessfulBodyBytes']
 return rows
s=ROOT/'output/playwright/cloud-sky-live-mixed-1003-r7';d=read(s/'result.json');binding=sources(s);rows=wire(s,d)
assert d['status']=='LIVE_RESPONSE_CACHE_PRESSURE_OWNER_DEVELOPMENT'
o=read(s/'cache-owner-observation.json');assert o==d['measured']
patch=read(s/'cache-observation-patches.json');original=(s/'response-cache.original.ts').read_bytes();observed=original.decode('utf-8')
assert sha(original)==patch['originalSha256'] and original==(ROOT/patch['owner']).read_bytes()
for p in patch['patches']:
 assert observed.count(p['before'])==1;observed=observed.replace(p['before'],p['after'],1)
assert observed.encode()==(s/'response-cache.observed.ts').read_bytes() and sha(observed.encode())==patch['observedSha256']
origin=read(s/'pressure-origin.json');assert sha((ROOT/origin['source']).read_bytes())==origin['sha256']
families={'spot-sky','stellar-catalog','constellation-catalog'};evictions=[v for v in o['events']if 'EVICT'in v['kind']and v['family']in families]
assert len(evictions)==6 and o['consumed']==22
limits=o['beforeWarm']['limits'];assert limits['entries']==24
for v in evictions:
 q=v['detail'];cap=limits['memoryBytes'if v['kind']=='MEMORY_EVICT'else'persistedBytes']
 assert q['count']==25 and q['bytesBefore']+q['itemBytes']<cap
 if v['kind']=='MEMORY_EVICT':assert q['fresh']is True
for tier in ['memory','disk']:assert len(o['beforeWarm'][tier])==24 and not any(v['family']in families for v in o['beforeWarm'][tier])
baseline=[v for v in rows if v['phase']=='cache-baseline-warm'];after=[v for v in rows if v['phase']=='cache-after-pressure-warm']
assert [v['status']for v in baseline]==[304]*3 and all(v['encodedBodyBytes']==0 for v in baseline)
assert [v['status']for v in after]==[200]*3
assert {v['family']for v in o['events']if v['kind']=='MISS_BOTH'}>=families
failure=read(ROOT/'output/playwright/cloud-sky-live-mixed-1003-r6/live-failure.json')
cache=dict(status='COUNT_LIMIT_CAUSE_DEVELOPMENT_READBACK',sourceBinding=binding,tiles=22,limits=limits,
 baselineStatuses=[304]*3,afterPressureStatuses=[200]*3,evictions=evictions,
 beforeWarmMemoryBytes=sum(v['bytes']for v in o['beforeWarm']['memory']),beforeWarmStorageBytes=sum(v['storageBytes']for v in o['beforeWarm']['disk']),
 observationPatchesExact=True,failedTaskR6Retained=failure,
 scope='Bounded serial actual validated SAO and production response-cache decisions, flush makes persistence deterministic. Not reconstruction of historical concurrent r4 scheduling, no physical memory/capacity or completed cache fix.')
materials=[]
for run in ['r8','r9']:
 s=ROOT/f'output/playwright/cloud-sky-live-mixed-1003-{run}';d=read(s/'result.json');binding=sources(s);rows=wire(s,d);frames=[];cameras=[];alphas=[]
 assert d['errors']==[]
 for row in d['sceneRows']:
  name=row['condition']['name'];assert row==read(s/(name+'.json'))and row['gpuFailures']==[]
  last=row['passes'][-1];camera=last['actualPaintCamera'];cameras.append(camera)
  assert row['actualFacts']['readiness']==1
  alpha=row['actualFacts']['landscape']['opacity'];alphas.append(1 if alpha is None else alpha)
  if run=='r9':
   assert row['condition']['manualPan']and camera['fov']==85 and camera['basis']==row['condition']['basis']
   assert last['state']['qualification']['basis']==camera['basis']and last['state']['qualification']['usedAcceptedCamera']
  for p in row['passes']:
   raw=s/(name+'-'+p['label']+'.rgba');png=s/(name+'-'+p['label']+'.png');pixels=raw.read_bytes()
   assert sha(pixels)==p['rgbaSha256']and sha(png.read_bytes())==p['pngSha256']
   im=Image.open(png).convert('RGBA');assert im.size==(390,844)
   assert im.tobytes()==b''.join(pixels[y*1560:(y+1)*1560]for y in range(843,-1,-1))
   assert p['glError']==0 and p['publication']['stagedSnapshotId']==p['publication']['publishedSnapshotId']
   assert p['presented']['frameAt']==row['ready']['at'];frames.extend([bind(raw),bind(png)])
 final=read(s/'final-owner.json');clear=final['afterClear']
 assert not any(v['alive']for v in clear['gpu']['handles'])and clear['counters']['decodedPending']==clear['counters']['nativeRunning']==0
 assert final['afterHide']['presented']is None and not any(v['membership']=='CURRENT'for v in final['afterHide']['nativeCurrent'])
 for v in clear['cache']:
  for k in ['leased','running','pending','reserved','bytes','entries','retired']:assert not v.get(k)
 if run=='r8':
  assert all(c==cameras[0]for c in cameras);status='FAILED_TASK_MANUAL_DELIVERY';return_rows=[]
 else:
  assert all(math.isclose(a,b,abs_tol=1e-12)for a,b in zip(alphas,[1,.5,2/27,1]))
  hashes=[v['passes'][-1]['rgbaSha256']for v in d['sceneRows']];assert hashes[0]==hashes[3]and len(set(hashes))==3
  assert cameras[0]==cameras[3]and len({json.dumps(c,sort_keys=True)for c in cameras})==3
  returns=d['sceneRows'][-1]['transfers'];assert len(returns)==3 and all(v['type']=='metadata'and v['encodedBodyBytes']==0 for v in returns)
  return_rows=[v for v in rows if v['phase']==d['sceneRows'][-1]['condition']['name']];assert len(return_rows)==3 and all(v['status']==304 and v['encodedBodyBytes']==0 for v in return_rows)
  status='CONTROLLED_MANUAL_OWNER_FADE_RETURN_DEVELOPMENT_READBACK'
 materials.append(dict(run=run,status=status,sourceBinding=binding,alphas=alphas,cameras=cameras,frames=frames,
  returnConditionalResponses=return_rows,logicalOwnerRetirement=True,physicalTotal='UNKNOWN',
  scope='r8 changed follow samples were ignored by the captured overview owner, not an executed manual drag. r9 delivers controlled commands through actual camera.pan and page manual ref; same-frame rendering/readiness/return pixels are verified. Native gesture/follow/calibration UI and final quality are unverified.'))
receipt=dict(status='CACHE_PRESSURE_AND_MANUAL_MATERIAL_DEVELOPMENT_READBACK',cache=cache,materials=materials,
 independentlyReviewed=False,nativeAccepted=False,capacityAccepted=False,otherBusinessLogicChanged=False)
(OUT/'result.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':bind(OUT/'result.json'),'cacheCause':'24_entry_limit','materials':[v['status']for v in materials]}))
