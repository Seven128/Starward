"""Saved original page orbit/interruption evidence; no HTTP or runtime replay."""
from pathlib import Path
from PIL import Image
import hashlib,json,math,sys
root=Path(__file__).resolve().parents[4]
lane=root/sys.argv[1];out=root/sys.argv[2];out.mkdir(exist_ok=False)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def view(p):return json.loads(p['canvas']['data-sky-presented-view'])
def same(a,b):
 assert a['scene']['at']==b['scene']['at']
 va,vb=view(a),view(b);assert abs(va['verticalFovDeg']-vb['verticalFovDeg'])<1e-9
 assert va['center']==vb['center']
 for k in ['right','up','forward']:assert all(abs(x-y)<1e-9 for x,y in zip(va['basis'][k],vb['basis'][k])),k
try:
 frontend=read(lane/'source-bindings-before.json');assert frontend==read(lane/'source-bindings-after.json') and len(frontend)==401
 backend=read(lane/'backend-source-bindings-before.json');assert backend==read(lane/'backend-source-bindings-after.json') and len(backend)==162
 base=read(lane/'current-baseline-before.json');assert base==read(lane/'current-baseline-after.json') and len(base['currentSources'])==297 and len(base['protected'])==6
 for row in frontend+backend+base['currentSources']+base['protected']:assert bind(root/row['path'])==row,row['path']
 for kind in ['build','script']:
  source=root/f'.codex/work-items/cloud-sky-native-2026-09-22/scripts/{"build" if kind=="build" else "experience"}-real-taro-horizontal-interruption-2026-10-04.mts'
  assert source.read_bytes()==(lane/f'executed-{kind}.mts').read_bytes()
 assert frontend==read(root/'output/playwright/cloud-sky-real-taro-w3-ready-1004-r2/source-bindings-before.json'),'product input changed'
 assets=read(lane/'public-asset-read-bindings.json')
 for row in assets['unique']:assert bind(root/row['path'])==row,row['path']
 phases=read(lane/'phases.json');by={p['name']:p for p in phases}
 orbit=read(lane/'horizontal-orbit.json');axis=orbit['axis'];previous=orbit['orbitStart']['basis']['forward'];total=0;sign=None
 for row in orbit['orbit']:
  b=row['basis'];p=by[row['name']];assert b==view(p)['basis'] and row['frameAt']==p['scene']['at']==by['horizontal-orbit-start']['scene']['at']
  assert p['nativeCounters']['decodedPending']==0 and p['pendingNativeRequests']==0 and p['selection']==[] and p['modal'] is None
  for v in b.values():assert abs(dot(v,v)-1)<1e-9
  # Existing Sky camera uses right/up/forward (forward into the screen), so
  # right cross up is the negative forward, as in INITIAL_MANUAL_SKY_VIEW.
  assert abs(dot(b['right'],b['up']))<1e-9 and dot(cross(b['right'],b['up']),b['forward'])<-1+1e-9
  assert dot(axis,b['up'])>1-1e-9
  step=math.atan2(dot(axis,cross(previous,b['forward'])),dot(previous,b['forward']));assert abs(step-row['step'])<1e-12 and 1e-5<abs(step)<math.pi/2
  if sign is None:sign=math.copysign(1,step)
  assert math.copysign(1,step)==sign;total+=step;assert abs(total-row['cumulative'])<1e-12
  assert row['sourceIdentities']==p['frameResources']['sourceImages'];previous=b['forward']
 assert abs(total)>2*math.pi and abs(total-orbit['cumulative'])<1e-12
 committed=by['horizontal-orbit-committed'];pinched=by['added-second-finger-pinch'];released=by['complete-release-committed']
 assert view(pinched)['verticalFovDeg']<view(committed)['verticalFovDeg']
 same(pinched,by['remaining-finger-after-pinch']);same(committed,by['mixed-gesture-cancelled'])
 same(by['pinch-before-complete-release'],released)
 for name in ['late-events-after-release','third-finger-cancelled','third-finger-late-end','actual-show-restored-original-transaction']:same(released,by[name]);assert by[name]['selection']==[]
 hidden=by['actual-background-retired'];final=by['unloaded-cleared']
 for p in [hidden,final]:
  assert p['gpu']=={} and p['pendingNativeRequests']==0 and p['owners'][0]['leased']==0
  for k in ['activeDecodedImageHandles','sourceRgbaEquivalentBytes','gpuTextureUploadModelBytes','gpuBufferUploadModelBytes']:assert p['resources'][k]==0
 for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert final['owners'][0][k]==0
 assert final['queries']==[] and sum(r['bytes'] for r in final['files'])==26
 assert all(r['retired'] for r in read(lane/'native-image-owner-events.json'))
 lifecycle=read(lane/'actual-lifecycle-interruption.json');assert lifecycle['sameCurrentSkyInstance']
 assert any(e['name']=='onHide' and e['phase']=='actual-background-mid-gesture' for e in lifecycle['lifecycle'])
 pixels={};captures={}
 for f in lane.glob('software*-pixels.json'):
  name=f.name.removesuffix('-pixels.json');info=read(f);raw=(lane/(name+'.rgba')).read_bytes();post=(lane/(name+'-after.rgba')).read_bytes();image=Image.open(lane/(name+'.png')).convert('RGBA')
  assert raw==post and image.size==(390,844) and image.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()==raw and len(raw)==info['bytes']==1316640
  assert hashlib.sha256(raw).hexdigest()==info['sha256'];bounds=read(lane/(name+'-capture-boundaries.json'));assert bounds['beforeHash']==bounds['afterHash']==info['sha256']
  assert bounds['before']['frameResources']['sourceImages']==bounds['after']['frameResources']['sourceImages']
  pixels[name]=info['sha256'];captures[name]={'before':bounds['before']['sceneSequence'],'after':bounds['after']['sceneSequence']}
 assert pixels['software-horizontal-committed']==pixels['software-mixed-cancelled']
 # Preserve the prior exact-equality failure, rather than convert a small
 # observed difference into a pass by inventing a tolerance.
 delta=read(lane/'return-pixel-difference-inspection.json')
 assert pixels['software-before-background']!=pixels['software-after-background']
 assert delta['changedPixels']==delta['changedChannels']==delta['totalAbsoluteDelta']==9 and delta['maxAbsoluteChannelDelta']==1
 assert delta['paintDiffCount']==0 and not delta['truncated']
 assert read(lane/'software-before-background-paint.json')==read(lane/'software-after-background-paint.json')
 def source_facts(name):
  rows=read(lane/(name+'-capture-boundaries.json'))['before']['frameResources']['sourceImages']
  return [{k:v for k,v in row.items() if k!='objectId'} for row in rows]
 assert source_facts('software-before-background')==source_facts('software-after-background')
 assert len({v for k,v in pixels.items() if k.startswith('software-horizontal-quarter-')})>=4
 summary=read(lane/'resource-summary.json');samples=read(lane/'resource-samples.json');assert len(samples)<=2048
 for key,value in summary['maxima'].items():
  row=summary['peakSamples'][key];assert (row.get(key) if key in row else row['encoded'][key])==value
 requests=read(lane/'requests.json');assert not any(r.get('injected') for r in requests)
 gestures=read(lane/'public-gesture-actions.json');assert any(r['type']=='touchcancel' for r in gestures) and any(r['type']=='touchstart' and len(r['points'])==3 for r in gestures)
 result={'status':'SAVED_HORIZONTAL_ORBIT_INTERRUPTION_PARTIAL_WITH_BACKGROUND_PIXEL_DIFFERENCE','frontendInputs':401,'backendProjectSources':162,'selectedSourcesExact':297,'protectedExact':6,'publicReadFiles':len(assets['unique']),'orbit':{'sampledMoves':len(orbit['orbit']),'actualSignedDegrees':total*180/math.pi,'fixedScreenUp':axis,'meaning':'A continuous complete great-circle turn around original screen-up with public touches; not complete sky area/latitude or gesture/device acceptance.'},'pixelHashes':pixels,'captureBoundaries':captures,'backgroundReturn':{'cameraTimePaintSnapshotAndEncodedSources':'SAME','logicalResources':'RETIRED','exactPixelEquality':'FAILED_RETAINED','changedPixels':9,'changedChannels':9,'maxChannelDelta':1,'cause':'UNVERIFIED; new decoded objects, source-window/upload/interpolation not yet bound; no tolerance or quality pass'},'readerClassificationTransition':{'previousReader':bind(lane/'readback-before-background-difference-classification.py'),'currentReader':bind(Path(__file__)),'oldFailure':bind(root/'output/sky-real-taro-horizontal-interruption-readback-1004-r1/failed.json'),'meaning':'New partial classification of saved facts; exact background pixel failure is retained, no runtime replay.'},'publicTouchEvents':len(gestures),'requests':len(requests),'receivedBodyBytes':sum(r['receivedBytes'] for r in requests),'resourceObservationSummary':{'observations':summary['observations'],'boundedHistorySamples':len(samples),'droppedHistory':summary['droppedHistory']},'separateObservedMaxima':summary['maxima'],'finalOwner':final['owners'][0],'scope':'Complete current installed Taro page and public gestures plus actual lifecycle under controlled native geometry/storage/callbacks and softwareGL. Original product unchanged. Logical registration/lease/GL retirement is not physical GC, frame time, full-family resource peak or capacity. Exact background pixel equality FAILED; no SCSS/WXML/phone/quality/independent acceptance.'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(result,ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':repr(e)},ensure_ascii=False)+'\n',encoding='utf8');raise
