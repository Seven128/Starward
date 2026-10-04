"""Saved original-page solar consumer readback, no new HTTP or renderer calls."""
from pathlib import Path
from PIL import Image
import hashlib,json,math,sys,numpy as np
root=Path(__file__).resolve().parents[4];first=root/sys.argv[1];lane=root/sys.argv[2];out=root/sys.argv[3];out.mkdir(exist_ok=False)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def binding(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def direction(az,alt):
 a,e=math.radians(az),math.radians(alt);return np.array([math.cos(e)*math.sin(a),math.cos(e)*math.cos(a),math.sin(e)])
def numeric(a,b):
 # Expected screen values from independent vector arithmetic; not pixel tolerance.
 assert np.allclose(a,b,atol=2e-8,rtol=2e-12),(a,b)
def pixels(name,folder=None):
 folder=folder or lane
 raw=(folder/(name+'.rgba')).read_bytes();post=(folder/(name+'-after.rgba')).read_bytes()
 png=Image.open(folder/(name+'.png')).convert('RGBA');info=read(folder/(name+'-pixels.json'))
 assert raw==post==png.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes(),name
 assert len(raw)==1316640==info['bytes'] and hashlib.sha256(raw).hexdigest()==info['sha256']
 bounds=read(folder/(name+'-capture-boundaries.json'));assert bounds['beforeHash']==bounds['afterHash']==info['sha256']
 return info['sha256'],raw
def view(p):return json.loads(p['canvas']['data-sky-presented-view'])
try:
 frontend=read(lane/'source-bindings-before.json');backend=read(lane/'backend-source-bindings-before.json');base=read(lane/'current-baseline-before.json')
 assert frontend==read(lane/'source-bindings-after.json') and backend==read(lane/'backend-source-bindings-after.json') and base==read(lane/'current-baseline-after.json')
 assert len(frontend)==401 and len(backend)==162 and len(base['currentSources'])==309 and len(base['protected'])==6
 for row in frontend+backend+base['currentSources']+base['protected']+read(lane/'public-asset-read-bindings.json')['unique']:assert binding(root/row['path'])==row,row['path']
 runner=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-real-taro-solar-public-2026-10-04.mts'
 assert runner.read_bytes()==(lane/'executed-script.mts').read_bytes()
 result=read(lane/'result.json');assert result['status']=='ACTUAL_TARO_SOLAR_PUBLIC_SEARCH_PICK_IMAGE_TIME_RETIREMENT_DEVELOPMENT'
 failure=read(first/'failed.json');assert 'EEXIST' in failure['error'] and not (first/'source-bindings-after.json').exists();assert frontend==read(first/'source-bindings-before.json') and backend==read(first/'backend-source-bindings-before.json') and base==read(first/'current-baseline-before.json');assert (first/'page-bundle.js').read_bytes()==(lane/'page-bundle.js').read_bytes();assert read(first/'bootstrap.json')['context']['contextId']!=read(lane/'bootstrap.json')['context']['contextId'];phases={p['name']:p for p in failure['phase']};warmPhases={p['name']:p for p in read(lane/'phases.json')};bodies=read(first/'observed-bodies.json');assert len(bodies)==9
 assert {b['reference'] for b in bodies}=={'SOLAR:SUN','SOLAR:MOON'}|{'PLANET:'+b for b in ['MERCURY','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE']}
 receipts=[]
 for b in bodies:
  ref=b['reference'];p=b['phase'];facts=p['frameResources'];row=facts['geometry'];v=view(p);assert row['at']==p['scene']['at']==facts['at']
  assert facts['context']['contextId']==p['observationContext']['contextId'];assert facts['landscapeEnabled'] is False
  if ref.startswith('PLANET:'):
   g=next(q for q in row['planets'] if q['body']==ref.split(':')[1]);az,alt,diameter,fraction=g['azimuthDeg'],g['altitudeDeg'],g['angularDiameterDeg'],g['illuminatedFraction'];key='planet'
   disc=next(d for d in facts['calls'][key]['discs'] if d['body']==g['body'] and d['submitted'])
  else:
   key='sun' if ref=='SOLAR:SUN' else 'moon';az,alt,diameter=row[key+'AzimuthDeg'],row[key+'AltitudeDeg'],row[key+'AngularDiameterDeg'];fraction=None if key=='sun' else row['moonIllumination'];disc=next(d for d in facts['calls'][key]['discs'] if d['submitted'])
  n=direction(az,alt);basis=v['basis'];forward=np.array(basis['forward']);right=np.array(basis['right']);up=np.array(basis['up']);den=1+n@forward
  scale=844/(2*math.tan(math.radians(v['verticalFovDeg'])/4));center=v.get('center') or {'x':195,'y':422}
  expected=[center['x']+scale*(n@right)/den,center['y']-scale*(n@up)/den,scale/den*math.radians(diameter)/2]
  numeric([disc['x'],disc['y'],disc['radiusPx']],expected);numeric([disc['x'],disc['y']],[195,422]);assert disc['radiusPx']>1.2
  if fraction is not None:
   assert disc['illuminatedFraction']==fraction
   sun=direction(row['sunAzimuthDeg'],row['sunAltitudeDeg']);t=sun-(sun@n)*n
   derivative=np.array([(t@right)*den-(n@right)*(t@forward),-((t@up)*den-(n@up)*(t@forward))]);norm=np.linalg.norm(derivative)
   if norm>1e-12:numeric(disc['sunward'],derivative/norm)
  painted=next(o for o in p['paintedObjects'] if o['reference']==ref);numeric([painted['x'],painted['y']],[disc['x'],disc['y']]);assert painted['hitDisc']['majorRadiusPx']>0
  pick=read(first/('public-core-pick-'+ref.replace(':','-')+'.json'));assert pick['frameAt']==p['scene']['at'] and any(o['reference']==ref for o in pick['choices'])
  if b['family']:
   images=[i for i in facts['sourceImages'] if i['family']==b['family']];assert len(images)==1;assert any(r.get('status')==200 and r.get('sha256')==images[0]['sha256'] and r.get('receivedBytes',0)>0 for r in failure['requests']);assert p['resources']['gpuTextureUploadModelBytes']>0
   assert any(i['sha256']==images[0]['sha256'] for i in facts['calls'][key]['images'])
  if ref=='PLANET:SATURN':assert facts['calls']['saturnRings']['submitted']>0 and {r['band'] for r in disc['rings']}=={'A','B','C'}
  info,_=pixels('software-resolved-'+ref.replace(':','-'),first);receipts.append({'reference':ref,'altitudeDeg':alt,'diameterDeg':diameter,'radiusPx':disc['radiusPx'],'illumination':fraction,'actualImageFamily':b['family'],'pixelHash':info,'sameFrameCorePick':True})
 failed=phases['resolved-SOLAR-MOON'];restored=phases['resolved-SOLAR-MOON-retried'];assert '重试月面影像' in failed['text']
 assert not any(i['family']=='moon' for i in failed['frameResources']['sourceImages']) and any(i['family']=='moon' for i in restored['frameResources']['sourceImages'])
 assert failed['frameResources']['calls']['moon']['submitted']>0 and any(o['reference']=='SOLAR:MOON' for o in failed['paintedObjects'])
 hfail,_=pixels('software-moon-image-failed-phase-preserved',first);assert hfail!=receipts[0]['pixelHash']
 phases=warmPhases;tracked=phases['warm-moon-tracked'];preview=phases['moon-tracked-public-time-preview'];cancel=phases['moon-time-preview-cancelled'];returned=phases['all-body-warm-show-moon-restored'];target=read(lane/'public-time-inputs.json')['target']
 assert preview['scene']['at']==target['at'] and preview['observationContext']==tracked['observationContext'] and view(preview)['basis']!=view(tracked)['basis']
 assert view(cancel)==view(tracked) and cancel['scene']['at']==tracked['scene']['at'] and returned['scene']['at']==tracked['scene']['at']
 warmGeometry=[]
 for p in [tracked,preview,cancel,returned]:
  g=p['frameResources']['geometry'];assert g['at']==p['scene']['at'];d=p['frameResources']['calls']['moon']['discs'][0];assert d['submitted'] and d['illuminatedFraction']==g['moonIllumination'];n=direction(g['moonAzimuthDeg'],g['moonAltitudeDeg']);v=view(p);den=1+n@np.array(v['basis']['forward']);radius=844/(2*math.tan(math.radians(v['verticalFovDeg'])/4))/den*math.radians(g['moonAngularDiameterDeg'])/2;numeric(d['radiusPx'],radius);warmGeometry.append({'at':g['at'],'altitudeDeg':g['moonAltitudeDeg'],'azimuthDeg':g['moonAzimuthDeg'],'diameterDeg':g['moonAngularDiameterDeg'],'illuminatedFraction':d['illuminatedFraction'],'radiusPx':d['radiusPx']});assert '跟踪中' in p['text'];o=next(o for o in p['paintedObjects'] if o['reference']=='SOLAR:MOON');numeric([o['x'],o['y']],[195,422]);assert any(i['family']=='moon' for i in p['frameResources']['sourceImages'])
 warm=[]
 for name in ['software-warm-moon-tracked','software-moon-tracked-preview','software-moon-time-cancelled','software-warm-show-moon']:warm.append(pixels(name))
 assert warm[0][0]==warm[2][0];assert warm[0][0]!=warm[1][0]
 delta=np.abs(np.frombuffer(warm[0][1],dtype=np.uint8).astype(np.int16)-np.frombuffer(warm[3][1],dtype=np.uint8).astype(np.int16)).reshape(-1,4)
 hidden=phases['all-body-hidden-retired'];final=phases['unloaded-cleared']
 for p in [hidden,final]:
  assert p['resources']['activeDecodedImageHandles']==p['resources']['gpuTextureUploadModelBytes']==p['resources']['gpuBufferUploadModelBytes']==0
  assert all(o['leased']==o['running']==o['pending']==o['reserved']==0 for o in p['owners']);assert sum(p['gpu'].values())==0
 assert len(final['owners'])==1 and all(final['owners'][0][key]==0 for key in ['entries','bytes','leased','reserved','running','pending','retired']);assert sum(r['bytes'] for r in final['files'])==26
 requests=read(lane/'requests.json');firstRequests=failure['requests'];assert any(r.get('injected') for r in firstRequests)
 warmRequests=[r for r in requests if r.get('phase','').startswith(('warm-moon','moon-tracked-public-time','moon-time-preview','all-body-warm'))]
 # Warm return may update JSON/source data; prove exact image byte reuse separately.
 assert not any(r['binary'] and '/sky/moon/' in r['route'] for r in warmRequests)
 pixels('software-cold',first);pixels('software-cold');assert not read(lane/'browser-errors.json')
 resource=read(lane/'resource-summary.json');assert resource['observations']>0
 output={'status':'SAVED_REAL_TARO_SOLAR_PUBLIC_BODY_IMAGE_PICK_TIME_RETIREMENT_DEVELOPMENT','frontend':401,'backendProject':162,'baselineSources':309,'protectedExact':6,'distinctBodies':receipts,'singleGlPngGlCaptures':16,'epochs':2,'firstBodyLane':'FAILED_TASK_DUPLICATE_ARTIFACT_NO_FINAL_RETAINED','lunarFailure':'actual phase submitted/painted object retained, original public retry restored real lunar image; failed-phase public core tap not exercised','time':'original public ruler future preview tracks Moon at centre; touchcancel restores exact camera/time/pixels','warmMoonGeometry':warmGeometry,'warmImageHttp':0,'warmReturnExactPixelEquality':{'status':'PASS' if not np.any(delta) else 'FAILED_RETAINED','changedPixels':int(np.count_nonzero(np.any(delta,axis=1))),'changedChannels':int(np.count_nonzero(delta)),'maxChannelDelta':int(delta.max()),'alphaChanges':int(np.count_nonzero(delta[:,3]))},'requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),'firstFailedEpochRequests':len(firstRequests),'firstFailedEpochReceivedBodyBytes':sum(r.get('receivedBytes',0) for r in firstRequests),'firstFailedEpochUnknownRequests':sum('receivedBytes' not in r for r in firstRequests),'firstBodyEpochTransientPeak':'UNVERIFIED; failed runner saved bounded history but not accumulated full-run maxima/final activity','separateObservedMaxima':resource['maxima'],'resourceObservations':resource['observations'],'finalActivity':'all registrations/GL/encoded/lease/queue zero; inventory26B','scope':'Root self-review, two separate context epochs of actual logical Taro JSX/provider/page Scene epoch with controlled native ports/softwareGL; no WXML/physical native/device/full combined/all families/quality/independent review/capacity acceptance.'}
 (out/'result.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in output.items() if k not in ['distinctBodies','separateObservedMaxima']},ensure_ascii=False))
except Exception as error:
 (out/'failed.json').write_text(json.dumps({'error':str(error),'type':type(error).__name__},ensure_ascii=False,indent=2)+'\n',encoding='utf8');raise
