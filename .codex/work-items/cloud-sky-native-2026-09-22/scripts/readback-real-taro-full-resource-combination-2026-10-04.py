"""Read saved actual combined consumers; no HTTP/renderer/native replay."""
from pathlib import Path
from PIL import Image
import hashlib,json,math,sys,numpy as np
root=Path(__file__).resolve().parents[4];lane=root/sys.argv[1];first=root/sys.argv[2];out=root/sys.argv[3];out.mkdir(exist_ok=False)
task='.codex/work-items/cloud-sky-native-2026-09-22'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def matrix(b):return np.array([b[k] for k in ['right','up','forward']],dtype=np.float64).T
def view(p):return json.loads(p['canvas']['data-sky-presented-view'])
def error(a,b):return float(np.max(abs(a-b)))
def numeric(a,b):
 d=error(a,b);assert d<=128*np.finfo(np.float64).eps,d
 return d
def independent_raw(angles):
 a,b,g=[math.radians(angles[k]) for k in ['alpha','beta','gamma']]
 def x(t):return np.array([[1,0,0],[0,math.cos(t),-math.sin(t)],[0,math.sin(t),math.cos(t)]])
 def y(t):return np.array([[math.cos(t),0,math.sin(t)],[0,1,0],[-math.sin(t),0,math.cos(t)]])
 def z(t):return np.array([[math.cos(t),-math.sin(t),0],[math.sin(t),math.cos(t),0],[0,0,1]])
 return np.array([[1,0,0],[0,0,-1],[0,1,0]])@y(-a)@x(-b)@z(g)@x(-math.pi/2)@np.diag([1,1,-1])
def pixels(name,folder=None):
 folder=folder or lane
 raw=(folder/(name+'.rgba')).read_bytes();post=(folder/(name+'-after.rgba')).read_bytes();info=read(folder/(name+'-pixels.json'));bounds=read(folder/(name+'-capture-boundaries.json'))
 assert raw==post==Image.open(folder/(name+'.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes(),name
 assert len(raw)==info['bytes']==390*844*4 and hashlib.sha256(raw).hexdigest()==info['sha256'] and bounds['beforeHash']==bounds['afterHash']==info['sha256']
 return raw
def delta(a,b):
 d=np.abs(np.frombuffer(a,dtype=np.uint8).astype(np.int16)-np.frombuffer(b,dtype=np.uint8).astype(np.int16)).reshape(-1,4)
 return {'status':'PASS' if not np.any(d) else 'FAILED_RETAINED','changedPixels':int(np.count_nonzero(np.any(d,axis=1))),'changedChannels':int(np.count_nonzero(d)),'maxChannelDelta':int(d.max()),'alphaChanges':int(np.count_nonzero(d[:,3]))}
def civil(at):
 from datetime import datetime,timedelta
 return (datetime.fromisoformat(at.replace('Z','+00:00'))+timedelta(hours=8)).date().isoformat()
def retired(p):
 assert p['resources']['activeDecodedImageHandles']==p['resources']['gpuTextureUploadModelBytes']==p['resources']['gpuBufferUploadModelBytes']==0
 assert sum(p['gpu'].values())==0 and p['pendingNativeRequests']==0
 assert all(o['leased']==o['running']==o['pending']==o['reserved']==0 for o in p['owners']) and p['sensors']['motionListeners']==p['sensors']['compassListeners']==0
def direction(az,alt):
 a,e=math.radians(az),math.radians(alt);return np.array([math.cos(e)*math.sin(a),math.cos(e)*math.cos(a),math.sin(e)])
try:
 frontend=read(lane/'source-bindings-before.json');backend=read(lane/'backend-source-bindings-before.json');base=read(lane/'current-baseline-before.json')
 assert frontend==read(lane/'source-bindings-after.json') and backend==read(lane/'backend-source-bindings-after.json') and base==read(lane/'current-baseline-after.json')
 assert len(frontend)==506 and len(backend)==162 and len(base['currentSources'])==325 and len(base['protected'])==6
 for row in frontend+backend+base['currentSources']+base['protected']+read(lane/'public-asset-read-bindings.json')['unique']:assert bind(root/row['path'])==row,row['path']
 assert (root/task/'scripts/experience-real-taro-full-resource-combination-2026-10-04.mts').read_bytes()==(lane/'executed-script.mts').read_bytes()
 assert read(lane/'result.json')['status']=='ACTUAL_TARO_SINGLE_EPOCH_FULL_RESOURCE_COMBINATION_DEVELOPMENT' and not read(lane/'browser-errors.json')
 history=read(lane/'phases.json');p={r['name']:r for r in history};formal=p['original-entry-sky-cold-painted'];ctx=formal['observationContext']
 assert all(r['observationContext']['contextId']==ctx['contextId'] for r in history if r.get('scene') and r['name']!='unloaded-cleared')
 follow=p['combined-follow-live'];assert follow['sensors']['motionListeners']==follow['sensors']['compassListeners']==1
 dome=p['combined-follow-dome-ready'];frozen=p['combined-dome-to-normal-frozen'];assert abs(dome['scene']['fov']-267.8)<1e-9 and frozen['scene']['fov']==45 and view(dome)['basis']==view(frozen)['basis']
 for name in ['combined-frozen-full-rotation','combined-calibration-input-lock']:assert view(p[name])['basis']==view(frozen)['basis'] and p[name]['scene']['at']==frozen['scene']['at']
 assert p['combined-frozen-full-rotation']['rawPose']['frame']['basis']!=frozen['rawPose']['frame']['basis']
 arithmetic=[]
 for name,following_names in [('combined-latest-unpainted-confirm',['combined-aligned-full-rotation','combined-cancel-old-relation-current-pose']),('combined-new-reference-confirm',['combined-new-reference-all-axes']),('combined-source-return-latest-confirm',['combined-source-return-follow-all-axes'])]:
  r=read(lane/(name+'-atomic-confirm.json'));assert r['dispatched'] and r['before']['alignment']['mode']=='editing' and r['after']['alignment']['mode']=='aligned'
  pre=r['inputPrecondition'];assert pre['acceptedFrame'] and pre['actualAcceptedAt']>pre['priorAcceptedAt'] and r['raw']['frame']['sampledAt']==pre['actualAcceptedAt']
  target=matrix(r['paintedView']['basis']);ref=matrix(r['raw']['frame']['basis']);assert error(target,ref)>.1
  arithmetic.append({'operation':name,'rawAxesError':numeric(ref,independent_raw(r['raw']['input'])),'acceptedViewToFrozenError':numeric(matrix(r['after']['alignment']['view']),target),'paintedViewToFrozenError':numeric(matrix(view(p[name])['basis']),target)})
  for after_name in following_names:
   row=p[after_name];raw=row['rawPose'];expected=target@ref.T@matrix(raw['frame']['basis']);arithmetic.append({'operation':after_name,'rawAxesError':numeric(matrix(raw['frame']['basis']),independent_raw(raw['input'])),'alignedViewError':numeric(matrix(row['orientation'][0]['alignment']['view']),expected),'paintedBasisError':numeric(matrix(view(row)['basis']),expected)})
 assert view(p['combined-second-freeze'])['basis']==view(p['combined-cancel-new-raw'])['basis'] and view(p['combined-second-freeze'])['basis']!=view(p['combined-cancel-old-relation-current-pose'])['basis']
 stale=p['combined-stream-expired'];assert stale['orientation'][0]['state']=='STALE' and stale['orientation'][0]['alignment']['mode']=='needs-alignment' and not stale['orientation'][0]['alignment']['ready']
 assert not any(b['text'].strip()=='确定' for b in stale['buttons'])
 for filename in ['late-confirm-after-expiry.json','late-motion-after-source-hide.json']:
  r=read(lane/filename);assert r['before']==r['after']
 assert view(p['combined-fresh-reference-held'])['basis']==view(p['combined-stream-before-outage'])['basis']
 mode_inputs=read(lane/'controlled-app-mode-inputs.json');assert [m['mode'] for m in mode_inputs]==['OBSERVATION','NIGHT','DAY']
 for mode in ['OBSERVATION','NIGHT','DAY']:assert p['combined-follow-mode-'+mode]['scene']['mode']==mode and p['combined-follow-mode-'+mode]['observationContext']==ctx
 source_before=p['combined-follow-source-before'];source_back=p['combined-follow-source-back-held'];assert view(source_before)['basis']==view(source_back)['basis'];assert source_back['orientation'][0]['alignment']['mode']=='needs-alignment' and source_back['sensors']['maxMotionListeners']==source_back['sensors']['maxCompassListeners']==1
 for name in ['combined-follow-source-retired','combined-midnight-hidden-retired','combined-committed-source-retired','combined-return-original-map-latest-time','unloaded-cleared']:retired(p[name])
 manual=p['combined-after-follow-manual'];assert manual['sensors']['motionListeners']==0 and manual['sensors']['compassListeners']==0
 original=p['combined-pre-midnight-time'];assert original['scene']['at'].endswith('T15:59:58.700Z') and civil(original['scene']['at'])==ctx['localDate'] and '跟踪中' in original['text']
 for name in ['combined-playing-midnight-tracked','combined-midnight-paused','combined-ruler-midnight-preview']:
  row=p[name];assert civil(row['scene']['at'])!=ctx['localDate'] and row['observationContext']==ctx and '跟踪中' in row['text']
 for name in ['combined-play-cancelled','combined-ruler-cancel-late-ignored']:
  row=p[name];assert row['scene']['at']==original['scene']['at'] and row['observationContext']==ctx and view(row)==view(original)
 target=read(lane/'actual-cross-midnight-row-inputs.json');committed=p['combined-ruler-midnight-committed'];new_ctx=committed['observationContext']
 assert new_ctx['revision']==ctx['revision']+1 and new_ctx['contextId']==ctx['contextId'] and new_ctx['selectedAtUtc']==target['momentum']['at'] and new_ctx['localDate']==ctx['localDate'] and civil(committed['scene']['at'])!=ctx['localDate']
 assert target['rows'][target['momentum']['index']]['at']==new_ctx['selectedAtUtc']
 for name in ['combined-ruler-late-after-commit','combined-midnight-warm-show','combined-ruler-late-end-after-show','combined-committed-time-source-back','combined-return-original-map-latest-time']:assert p[name]['observationContext']==new_ctx
 time_before=p['combined-committed-moon-source-before'];time_back=p['combined-committed-time-source-back'];assert view(time_before)==view(time_back) and time_back['scene']['at']==committed['scene']['at'] and '跟踪中' in time_back['text']
 nav=read(lane/'actual-combined-navigation.json');assert nav['sameMapInstance'] and nav['skyRootRemoved'] and len([n for n in nav['navigation'] if n.get('url','').startswith('/sky/detail/index?')])==1
 final=p['unloaded-cleared'];assert len(final['owners'])==1 and all(final['owners'][0][k]==0 for k in ['entries','leased','bytes','reserved','running','pending','retired']) and sum(r['bytes'] for r in final['files'])==26
 names=[r.name.removesuffix('-pixels.json') for r in sorted(lane.glob('*-pixels.json'))];raws={name:pixels(name) for name in names};assert {'software-cold','software-follow-dome','software-calibration-frozen','software-calibration-confirmed','software-follow-w3','software-mode-OBSERVATION','software-mode-NIGHT','software-mode-DAY','software-follow-source-before','software-follow-source-back','software-combined-w3-ready','software-combined-fade','software-combined-m51-failed-fine','software-combined-m51-fine','software-combined-source-before','software-combined-source-back','software-combined-last-planet','software-pre-midnight-track','software-midnight-paused','software-midnight-cancelled','software-midnight-preview','software-midnight-committed','software-midnight-warm-show','software-moon-source-before','software-moon-source-back'}==set(names)
 comparisons={label:delta(raws[a],raws[b]) for label,a,b in [('calibrationConfirmation','software-calibration-frozen','software-calibration-confirmed'),('followSourceBack','software-follow-source-before','software-follow-source-back'),('playCancel','software-pre-midnight-track','software-midnight-cancelled'),('warmCommittedMoon','software-midnight-committed','software-midnight-warm-show'),('committedMoonSourceBack','software-moon-source-before','software-moon-source-back')]}
 copy_before=read(lane/'copy-allocation-observer-before.json');assert copy_before==read(lane/'copy-allocation-observer-after.json')==bind(root/copy_before['path']);
 resource=read(lane/'resource-summary.json');assert resource['observations']>0
 copy_samples=[r for r in read(lane/'resource-samples.json') if r['reason']=='texture-copy-allocation'];assert copy_samples and all(r['gpuTextureUploadModelBytes']>0 for r in copy_samples)
 assert resource['observations']>=len(read(lane/'resource-samples.json'))
 for key,val in resource['maxima'].items():
  sample=resource['peakSamples'][key];assert sample.get(key,(sample.get('encoded') or {}).get(key))==val
 failure=read(first/'failed.json');assert 'actual logical button not unique 手动视角:0' in failure['error'] and failure['phase'][-1]['name']=='combined-source-return-follow-all-axes' and not (first/'current-baseline-after.json').exists()
 assert read(first/'failed-resource-summary.json')['observations']>0
 first_captures=[r.name.removesuffix('-pixels.json') for r in first.glob('*-pixels.json')]
 for name in first_captures:pixels(name,first)
 first_source_delta=delta(pixels('software-follow-source-before',first),pixels('software-follow-source-back',first))
 requests=read(lane/'requests.json');
 wide=p['combined-w3-all-current-wanted-ready'];assert {(r['pixel'],r['sha256'],r['width'],r['height']) for r in wide['w3Hook']['loaded']}=={(r['pixel'],r['sha256'],r['width'],r['height']) for r in wide['w3Hook']['wanted']} and not wide['w3Hook']['loading'] and not wide['w3Hook']['failed']
 assert len([i for i in wide['frameResources']['sourceImages'] if i['family']=='WIDE_FIELD_W3'])==len(wide['w3Hook']['wanted'])>0
 noart=p['combined-w3-no-constellations'];assert not any(i['family']=='constellation-artwork' for i in noart['frameResources']['sourceImages'])
 fade=read(lane/'combined-fade-actual.json');fade_phase=p['combined-full-sphere-current-fade'];assert json.loads(fade['paintedView'])==view(fade_phase) and view(fade_phase)['basis']['forward'][2]<0 and fade['mask']['kind']=='panorama' and fade['mask']['opacity']==0 and fade['landscapeReadiness']==1
 assert fade_phase['paintedObjects'] and any(i['family']=='WIDE_FIELD_W3' for i in fade_phase['frameResources']['sourceImages'])
 assert p['combined-public-ground-off']['frameResources']['landscapeEnabled'] is False and not any(i['family']=='landscape' for i in p['combined-public-ground-off']['frameResources']['sourceImages'])
 medium=p['combined-m51-medium-ready'];coarse=p['combined-m51-fine-failed-coarse-held'];fine=p['combined-m51-fine-retry']
 assert medium['completedSources']['optical']['field']['level']=='MEDIUM' and fine['completedSources']['optical']['field']['level']=='DETAIL'
 assert coarse['completedSources']['optical']['field']['image']['sha256']==medium['completedSources']['optical']['field']['image']['sha256'] and '影像更新失败，保留已载图' in coarse['text']
 assert any(r.get('injected') and r['status']==503 for r in requests)
 source=p['combined-original-source-retired'];assert source['stack']==['pages/map/index','sky/detail/index','sky/sources/index'];retired(source)
 source_before=p['combined-m51-original-source-before'];source_back=p['combined-original-source-back'];assert view(source_before)==view(source_back) and source_back['modal']['data-object-reference']=='M:51'
 assert read(lane/'public-source-modal-close.json')['dispatched']
 consumers=read(lane/'combined-family-consumers.json');assert {c['family'] for c in consumers}=={'moon','mercury','mars','jupiter','saturn','uranus','neptune'}
 geometry=[]
 for c in consumers:
  f=c['frame'];g=f['geometry'];ref=c['reference'];assert g['at']==c['scene']['at']==f['at'] and f['context']['contextId']==ctx['contextId']
  body_phase=p['combined-family-ready-'+c['family']];v=view(body_phase)
  if c['family']=='moon':az,alt,diameter,fraction=g['moonAzimuthDeg'],g['moonAltitudeDeg'],g['moonAngularDiameterDeg'],g['moonIllumination'];call=f['calls']['moon']
  else:
   b=next(b for b in g['planets'] if b['body']==ref.split(':')[1]);az,alt,diameter,fraction=b['azimuthDeg'],b['altitudeDeg'],b['angularDiameterDeg'],b['illuminatedFraction'];call=f['calls']['planet']
  disc=next(d for d in call['discs'] if d['submitted'] and (c['family']=='moon' or d['body']==ref.split(':')[1]));n=direction(az,alt);den=1+n@np.array(v['basis']['forward']);scale=844/(2*math.tan(math.radians(v['verticalFovDeg'])/4))
  expected=[195+scale*(n@np.array(v['basis']['right']))/den,422-scale*(n@np.array(v['basis']['up']))/den,scale/den*math.radians(diameter)/2]
  assert np.allclose([disc['x'],disc['y'],disc['radiusPx']],expected,atol=2e-8,rtol=2e-12)
  assert disc['illuminatedFraction']==fraction and any(o['reference']==ref for o in body_phase['paintedObjects'])
  image=next(i for i in f['sourceImages'] if i['family']==c['family']);assert any(i['sha256']==image['sha256'] for i in call['images'])
  assert any(r.get('status')==200 and r.get('receivedBytes',0)>0 and r.get('sha256')==image['sha256'] for r in requests)
  if c['family']=='saturn':assert f['calls']['saturnRings']['submitted']>0 and {r['band'] for r in disc['rings']}=={'A','B','C'}
  geometry.append({'family':c['family'],'altitudeDeg':alt,'angularDiameterDeg':diameter,'radiusPx':disc['radiusPx'],'illumination':fraction,'imageSha256':image['sha256']})
 assert len([n for n in nav['navigation'] if n.get('url','').startswith('/sky/sources/index?')])==3
 comparisons['m51SourceBack']=delta(raws['software-combined-source-before'],raws['software-combined-source-back'])
 requests=read(lane/'requests.json');families=sorted({i['family'] for f in read(lane/'frame-resources.json') for i in f['sourceImages']})
 assert set(families)=={'galactic','landscape','constellation-artwork','WIDE_FIELD_W3','deep-sky-image','sdss-optical','moon','mercury','mars','jupiter','saturn','uranus','neptune'}
 r={'status':'SAVED_REAL_TARO_SINGLE_EPOCH_FULL_RESOURCE_COMBINATION_DEVELOPMENT','frontend':506,'backendProject':162,'baselineSources':325,'protectedExact':6,'formalContext':ctx['contextId'],'oneOriginalSkyInstance':True,'sourceBackTrips':3,'controlledActiveSensorMax':{'motion':p['combined-follow-source-back-held']['sensors']['maxMotionListeners'],'compass':p['combined-follow-source-back-held']['sensors']['maxCompassListeners']},'rotationArithmetic':arithmetic,'capturesGlPngGl':len(names),'pixelComparisons':comparisons,'firstTaskFailureSourceBackPixels':first_source_delta,'firstTaskFailure':'prior epoch wrong button label; no after/final, not retroactively repaired by current epoch','fadeScope':{'belowHorizonForward':view(fade_phase)['basis']['forward'][2],'effectiveOpacity':fade['mask']['opacity'],'sourceReadiness':fade['landscapeReadiness'],'paintedObjects':len(fade_phase['paintedObjects']),'scope':'Same-frame effective mask and positive painted/W3 consumers; raw output separately viewed, not physical site visibility or native composite acceptance'},'actualImageFamilies':families,'familyGeometry':geometry,'copyObserver':copy_before,'boundedRetainedCopyObservations':len(copy_samples),'copySampleScope':'Real same-epoch gl.copy allocation observations; bounded history is not total event count or driver physical memory','totalBodyScope':'seven textured bodies; Sun/Venus analytic consumers retain prior dedicated scope, not all-nine new explicit selection proof','requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),'unknownReceivedRequests':sum('receivedBytes' not in r for r in requests),'resourceObservations':resource['observations'],'separateObservedMaxima':resource['maxima'],'publicReads':len(read(lane/'public-asset-read-bindings.json')['unique']),'finalActivity':'all native registrations/GL/encoded/leases/queue/sensor listeners zero; controlled inventory26B','modeScope':'public store input consumed by Sky, not actual Settings UI; no protected/Settings business edits','scope':'Root self-review of full logical Taro Map/Sky/Sources/provider/controller and same formal context/Sky journey. Controlled pose/native geometry/storage/stack/softwareGL; SCSS not composed. Exact pixel failures retained individually, no tolerance, no retroactive old failures upgrade. Not WXML/native sensors/physical resource/full quality/independent review/production capacity or overall Goal completion.'}
 (out/'result.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());print(json.dumps({k:v for k,v in r.items() if k not in ['rotationArithmetic']},ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':str(e),'type':type(e).__name__},ensure_ascii=False,indent=2)+'\n',encoding='utf8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());raise
