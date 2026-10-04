"""Read live combined owners without treating intermediate readiness as settled quality."""
from pathlib import Path
import json,hashlib,collections
from PIL import Image
ROOT=Path(__file__).resolve().parents[4];SOURCE=ROOT/'output/playwright/cloud-sky-live-mixed-1003-r4'
OUT=ROOT/'output/playwright/cloud-sky-live-combination-readback-1003-r2';OUT.mkdir()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(b):return hashlib.sha256(b).hexdigest()
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=sha(b))
result=read(SOURCE/'result.json');assert result['status']=='LIVE_CURRENT_API_COMBINATION_DEVELOPMENT' and result['errors']==[]
assert read(SOURCE/'inputs-before.json')==read(SOURCE/'inputs-after.json')
for v in read(SOURCE/'inputs-before.json'):assert bind(ROOT/v['path'])==v
pins={}
for name in ['source-binding-before.json','api-inputs.json']:
 for v in read(SOURCE/name)['sourceBindings']:
  assert bind(ROOT/v['path'])=={k:v[k]for k in ('path','bytes','sha256')};pins[v['path']]=v
wire=result['wire'];assert read(SOURCE/'wire-requests.json')==wire
success=[v for v in wire if v['completed'] and not v['aborted']];access=[]
for line in (SOURCE/'caddy.log').read_text(encoding='utf-8').splitlines():
 try:v=json.loads(line)
 except json.JSONDecodeError:continue
 if v.get('logger','').startswith('http.log.access.'):
  assert 'request' not in v and 'resp_headers' not in v and v.get('user_id')in(None,'');access.append(v)
assert len(access)==len(wire)
assert collections.Counter((v['status'],v['size'])for v in access if v['status'])==collections.Counter((v['status'],v['encodedBodyBytes'])for v in success)
rows={};frames=[]
for row in result['sceneRows']:
 name=row['condition']['name'];assert row==read(SOURCE/(name+'.json')) and row['gpuFailures']==[];rows[name]=row
 for p in row['passes']:
  raw=SOURCE/(name+'-'+p['label']+'.rgba');png=SOURCE/(name+'-'+p['label']+'.png');pixels=raw.read_bytes()
  assert sha(pixels)==p['rgbaSha256'] and sha(png.read_bytes())==p['pngSha256']
  image=Image.open(png).convert('RGBA');assert image.size==(390,844)
  assert image.tobytes()==b''.join(pixels[y*1560:(y+1)*1560]for y in range(843,-1,-1))
  assert p['glError']==0 and p['publication']['stagedSnapshotId']==p['publication']['publishedSnapshotId']
  assert p['presented']['frameAt']==row['ready']['at'];frames.extend([bind(raw),bind(png)])
refinement=rows['live-refinement-failure-retry'];failed=next(p for p in refinement['passes']if p['label']=='detail-once-failed-coarse-live')
assert failed['state']['sdss']['renderedLevel']=='MEDIUM' and failed['state']['sdss']['updateFailed'] and not failed['state']['sdss']['failed']
recovered=next(p for p in refinement['passes']if p['label']=='detail-real-retry-recovered')
assert recovered['state']['sdss']['renderedLevel']=='DETAIL' and not recovered['state']['sdss']['updateFailed']
assert any(v.get('controlledCallbackFailure')for v in refinement['transfers'])
times=[];positions=[]
for name in ['live-tracking-current','live-tracking-one-second','live-tracking-one-minute','live-tracking-cancel-time']:
 v=rows[name]['actualFacts'];assert v['tracking']['position']['at']==v['acceptedAt'];times.append(v['acceptedAt']);positions.append(v['tracking']['position']['position'])
assert times[0]==times[-1] and times[0]!=times[1]!=times[2] and positions[0]==positions[-1] and positions[0]!=positions[1]!=positions[2]
assert rows['live-layers-off']['actualFacts']['landscape'] is None
full_sphere_actual_fov=rows['live-full-sphere']['passes'][-1]['actualPaintCamera']['fov'];assert full_sphere_actual_fov==45
warm=[v for v in success if v['phase']=='live-warm-entry'];assert len(warm)==3 and all(v['status']==200 for v in warm)
final=read(SOURCE/'final-owner.json');clear=final['afterClear'];assert not any(v['alive']for v in clear['gpu']['handles'])
assert clear['counters']['decodedPending']==clear['counters']['nativeRunning']==0
assert not any(v['membership']=='CURRENT'for v in final['afterHide']['nativeCurrent']) and final['afterHide']['presented']is None
for v in clear['cache']:
 for key in ['leased','running','pending','reserved','bytes','entries','retired']:assert not v.get(key)
output=dict(status='LIVE_COMBINATION_WITH_FAILED_DOME_INPUT_READINESS_AND_WARM_CAUSE_OPEN',sourcePinsCurrentExact=len(pins),
 conditions=len(rows),frames=frames,successfulHttpResponses=len(success),abortedHttpResponses=len(wire)-len(success),
 encodedSuccessfulBodyBytes=sum(v['encodedBodyBytes']for v in success),decodedSuccessfulBodyBytes=sum(v['decodedBodyBytes']for v in success),
 refinement=dict(failure='Explicit task native callback failure after actual HTTP dispatch, not server or network failure proof.',coarse='MEDIUM_PRESERVED',retry='DETAIL_RECOVERED'),
 tracking=dict(acceptedTimes=times,positionsChangedAndCancelRestored=True,stalePositionRejectedByExecutor=True,
  scope='Actual HTTP position consumers; source report base algorithmVersion test-astronomy remains fixture provenance. Current shared time model supplies 1/60sec consumers; native public time UI and physical astronomy calibration not certified.'),
 fullSphere=dict(status='FAILED_TASK_DOME_INPUT',actualFov=full_sphere_actual_fov,reason='DOME string was passed into numeric-only camera owner; current and oldR5 namedfullsphere resolve45. Historical names do not prove full sphere.'),
 readiness=dict(status='SETTLED_LANDSCAPE_EVIDENCE_INCOMPLETE',
  reason='Existing task wait checks loading but allows readiness opacity before transition settles. Top-level transition opacity fallback1 is not child opacity. Returning panorama recorded opacity0. Current actual source readiness owner uses requestFrame16ms separately from camera display fade. Keep intermediate frames; do not claim restored settled landscape or quality.'),
 warm=dict(statuses=[v['status']for v in warm],encodedBodyBytes=sum(v['encodedBodyBytes']for v in warm),
  reason='Larger actual journey still returns three200 despite corrected async storage port. Concrete memory/disk cache eviction/keys not observed; no production cache optimisation yet. Prior limitedr3 304 cannot substitute.'),
 resources=dict(peaks=final['resourcePeaks'],logicalOwnerRetirement=True,physicalTotal='UNKNOWN'),
 productionSourceChanged=False,otherBusinessLogicChanged=False,capacityAccepted=False,independentReview='MISSING',
 origins=[bind(SOURCE/name)for name in ['result.json','wire-requests.json','caddy.log','executed-script.mts','final-owner.json']],
 next='Fix only task readiness observation/settlement boundary and read actual current response-cache memory/disk pressure owners. Use new affected bounded cases, not nine-condition/full cold matrix replay. No production cache/queue restructuring without measured cause; native/quality/full resource/capacity remain open.')
(OUT/'result.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':bind(OUT/'result.json'),'frames':len(frames)//2,'successfulHttp':len(success),'encodedBytes':output['encodedSuccessfulBodyBytes'],'readiness':'INCOMPLETE','warmStatuses':[v['status']for v in warm]}))
