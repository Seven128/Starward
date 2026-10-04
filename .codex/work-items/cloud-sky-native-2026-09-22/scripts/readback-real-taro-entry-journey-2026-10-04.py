"""Read saved actual original-page journey. No HTTP, renderer or native replay."""
from pathlib import Path
from PIL import Image
import hashlib,json,math,sys,numpy as np
root=Path(__file__).resolve().parents[4]
lane=root/sys.argv[1];failed=root/sys.argv[2];scoped=root/sys.argv[3];out=root/sys.argv[4];out.mkdir(exist_ok=False)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def binding(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def pixels(name,folder=None):
 folder=folder or lane
 raw=(folder/(name+'.rgba')).read_bytes();post=(folder/(name+'-after.rgba')).read_bytes();info=read(folder/(name+'-pixels.json'));bounds=read(folder/(name+'-capture-boundaries.json'))
 assert raw==post==Image.open(folder/(name+'.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes(),name
 assert len(raw)==info['bytes']==390*844*4 and hashlib.sha256(raw).hexdigest()==info['sha256']
 assert bounds['beforeHash']==bounds['afterHash']==info['sha256']
 return raw
def view(p):return json.loads(p['canvas']['data-sky-presented-view'])
def direction(az,alt):
 a,e=math.radians(az),math.radians(alt);return np.array([math.cos(e)*math.sin(a),math.cos(e)*math.cos(a),math.sin(e)])
def retired(p):
 assert p['resources']['activeDecodedImageHandles']==p['resources']['gpuTextureUploadModelBytes']==p['resources']['gpuBufferUploadModelBytes']==0
 assert sum(p['gpu'].values())==0 and p['pendingNativeRequests']==0
 assert all(o['leased']==o['running']==o['pending']==o['reserved']==0 for o in p['owners'])
def delta(a,b):
 d=np.abs(np.frombuffer(a,dtype=np.uint8).astype(np.int16)-np.frombuffer(b,dtype=np.uint8).astype(np.int16)).reshape(-1,4)
 return {'status':'PASS' if not np.any(d) else 'FAILED_RETAINED','changedPixels':int(np.count_nonzero(np.any(d,axis=1))),'changedChannels':int(np.count_nonzero(d)),'maxChannelDelta':int(d.max()),'alphaChanges':int(np.count_nonzero(d[:,3]))}
try:
 frontend=read(lane/'source-bindings-before.json');backend=read(lane/'backend-source-bindings-before.json');base=read(lane/'current-baseline-before.json')
 assert frontend==read(scoped/'source-bindings-before.json')==read(scoped/'source-bindings-after.json') and backend==read(scoped/'backend-source-bindings-before.json')==read(scoped/'backend-source-bindings-after.json') and base==read(scoped/'current-baseline-before.json')==read(scoped/'current-baseline-after.json')
 assert len(frontend)==506 and len(backend)==162 and len(base['currentSources'])==312 and len(base['protected'])==6
 for row in frontend+backend+base['currentSources']+base['protected']+read(scoped/'public-asset-read-bindings.json')['unique']:assert binding(root/row['path'])==row,row['path']
 runner=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-real-taro-entry-journey-2026-10-04.mts'
 executed=(scoped/'executed-script.mts').read_text(encoding='utf-8-sig');assert runner.read_text(encoding='utf-8-sig')==executed.replace('sceneCalls:returned.sceneCalls','sceneCalls:returned?.sceneCalls??final.sceneCalls')
 late_failure=read(scoped/'failed.json');assert late_failure['error']=="TypeError: Cannot read properties of undefined (reading 'sceneCalls')" and read(scoped/'result.json')['mode']=='proposal-only' and not read(scoped/'browser-errors.json')
 complete_failure=read(lane/'failed.json');assert complete_failure['error']=='Error: bounded complete page wait expired' and complete_failure['phase'][-1]['name']=='original-proposal-sky-warm-entry' and not complete_failure['errors']
 assert not (lane/'source-bindings-after.json').exists() and (lane/'page-bundle.js').read_bytes()==(scoped/'page-bundle.js').read_bytes()
 history=complete_failure['phase'];phases={p['name']:p for p in history};requests=complete_failure['requests']
 original=phases['original-formal-entry-context-ready'];formal=phases['original-entry-sky-cold-painted'];returned=phases['original-sky-returned-map-ready']
 assert original['observationContext']==formal['observationContext']==returned['observationContext']
 assert original['selectedSpotId']==returned['selectedSpotId']=='spot:test-published';retired(returned)
 nav=read(lane/'actual-entry-navigation.json');assert nav['sameOriginalMapInstance'] and nav['skyRootRemoved']
 combined=[p for p in history if p['name'].startswith(('combined-','located-','disclosure-'))]
 assert all(p['observationContext']['contextId']==formal['observationContext']['contextId'] for p in combined)
 wide=phases['combined-w3-all-current-wanted-ready'];assert {(r['pixel'],r['sha256'],r['width'],r['height']) for r in wide['w3Hook']['loaded']}=={(r['pixel'],r['sha256'],r['width'],r['height']) for r in wide['w3Hook']['wanted']} and not wide['w3Hook']['loading'] and not wide['w3Hook']['failed']
 assert len([i for i in wide['frameResources']['sourceImages'] if i['family']=='WIDE_FIELD_W3'])==len(wide['w3Hook']['wanted'])>0
 noart=phases['combined-w3-no-constellations'];assert not any(i['family']=='constellation-artwork' for i in noart['frameResources']['sourceImages'])
 medium=phases['combined-m51-medium-ready'];coarse=phases['combined-m51-fine-failed-coarse-held'];fine=phases['combined-m51-fine-retry']
 assert medium['completedSources']['optical']['field']['level']=='MEDIUM' and fine['completedSources']['optical']['field']['level']=='DETAIL'
 assert coarse['completedSources']['optical']['field']['image']['sha256']==medium['completedSources']['optical']['field']['image']['sha256'] and '影像更新失败，保留已载图' in coarse['text']
 assert any(r.get('injected') and r['status']==503 for r in requests)
 source=phases['combined-original-source-retired'];assert source['stack']==['pages/map/index','sky/detail/index','sky/sources/index'];retired(source)
 source_before=phases['combined-m51-original-source-before'];source_back=phases['combined-original-source-back'];assert view(source_before)==view(source_back) and source_back['modal']['data-object-reference']=='M:51'
 assert read(lane/'public-source-modal-close.json')['dispatched']
 consumers=read(lane/'combined-family-consumers.json');assert {c['family'] for c in consumers}=={'moon','mercury','mars','jupiter','saturn','uranus','neptune'}
 geometry=[]
 for c in consumers:
  f=c['frame'];g=f['geometry'];ref=c['reference'];assert g['at']==c['scene']['at']==f['at'] and f['context']['contextId']==formal['observationContext']['contextId']
  p=phases['combined-family-ready-'+c['family']];v=view(p)
  if c['family']=='moon':az,alt,diameter,fraction=g['moonAzimuthDeg'],g['moonAltitudeDeg'],g['moonAngularDiameterDeg'],g['moonIllumination'];call=f['calls']['moon']
  else:
   b=next(b for b in g['planets'] if b['body']==ref.split(':')[1]);az,alt,diameter,fraction=b['azimuthDeg'],b['altitudeDeg'],b['angularDiameterDeg'],b['illuminatedFraction'];call=f['calls']['planet']
  disc=next(d for d in call['discs'] if d['submitted'] and (c['family']=='moon' or d['body']==ref.split(':')[1]));n=direction(az,alt);den=1+n@np.array(v['basis']['forward']);scale=844/(2*math.tan(math.radians(v['verticalFovDeg'])/4))
  expected=[195+scale*(n@np.array(v['basis']['right']))/den,422-scale*(n@np.array(v['basis']['up']))/den,scale/den*math.radians(diameter)/2]
  assert np.allclose([disc['x'],disc['y'],disc['radiusPx']],expected,atol=2e-8,rtol=2e-12)
  assert disc['illuminatedFraction']==fraction and any(o['reference']==ref for o in p['paintedObjects'])
  image=next(i for i in f['sourceImages'] if i['family']==c['family']);assert any(i['sha256']==image['sha256'] for i in call['images'])
  assert any(r.get('status')==200 and r.get('receivedBytes',0)>0 and r.get('sha256')==image['sha256'] for r in requests)
  if c['family']=='saturn':assert f['calls']['saturnRings']['submitted']>0 and {r['band'] for r in disc['rings']}=={'A','B','C'}
  geometry.append({'family':c['family'],'altitudeDeg':alt,'angularDiameterDeg':diameter,'radiusPx':disc['radiusPx'],'illumination':fraction,'imageSha256':image['sha256']})
 tracked=phases['combined-warm-moon-tracked'];preview=phases['combined-moon-time-preview'];cancel=phases['combined-moon-preview-cancelled'];shown=phases['combined-warm-show'];target=read(lane/'combined-original-time-inputs.json')['target']
 assert preview['scene']['at']==target['at'] and preview['observationContext']==tracked['observationContext'] and view(preview)['basis']!=view(tracked)['basis']
 assert view(cancel)==view(tracked) and shown['scene']['at']==cancel['scene']['at']==tracked['scene']['at'];retired(phases['combined-hidden-retired'])
 assert '跟踪中' in shown['text'] and any(i['family']=='moon' for i in shown['frameResources']['sourceImages'])
 scoped_phases={p['name']:p for p in read(scoped/'phases.json')};proposal=read(scoped/'isolated-proposal-fixture.json');private=scoped_phases['original-proposal-sky-warm-entry'];proposal_back=scoped_phases['original-proposal-return-map-ready'];ctx=private['observationContext']
 assert ctx['location']['kind']=='MAP_POINT' and ctx['location']['wgs84']==proposal['wgs84'] and private['scene']['reportContext']['spotId']==proposal['submissionId']
 assert proposal_back['observationContext']==ctx;retired(proposal_back)
 both=read(scoped/'actual-both-entry-navigation.json');assert both['sameMapInstance'] and len(both['skyInstances'])==1 and all(p['rootRemoved'] for p in both['skyInstances'])
 panel=read(scoped/'proposal-return-panel-result.json');assert panel['status']=='FAILED_RETAINED'
 stopped=read(lane/'failed-phases-inspect.json');assert stopped['activeRoute']=='pages/map/index' and stopped['stack']==['pages/map/index'] and stopped['context']==phases['original-proposal-sky-warm-entry']['observationContext']
 auth=read(lane/'private-proposal-access-boundaries.json');assert [(r['kind'],r['status'],r['code']) for r in auth]==[('anonymous',403,'PERMISSION_DENIED'),('other-owner',404,'NOT_FOUND')]
 final=scoped_phases['unloaded-cleared'];retired(final);assert len(final['owners'])==1 and all(final['owners'][0][k]==0 for k in ['entries','leased','bytes','reserved','running','pending','retired']) and sum(f['bytes'] for f in final['files'])==26
 captures=[p.name.removesuffix('-pixels.json') for p in sorted(lane.glob('*-pixels.json'))];raws={name:pixels(name) for name in captures}
 source_delta=delta(raws['software-combined-source-before'],raws['software-combined-source-back']);warm_delta=delta(raws['software-combined-warm-moon'],raws['software-combined-warm-show'])
 pixels('software-original-proposal-sky',scoped)
 frames=read(lane/'failed-frame-resources.json');families=sorted({i['family'] for f in frames for i in f['sourceImages']})
 assert set(families)=={'galactic','landscape','constellation-artwork','WIDE_FIELD_W3','deep-sky-image','sdss-optical','moon','mercury','mars','jupiter','saturn','uranus','neptune'}
 resource=read(lane/'failed-resource-summary.json');assert resource['observations']>0
 for key,val in resource['maxima'].items():
  sample=resource['peakSamples'][key];actual=sample.get(key,(sample.get('encoded') or {}).get(key));assert actual==val,key
 failure=read(failed/'failed.json');assert failure['error']=='Error: bounded complete page wait expired' and failure['phase'][-1]['name']=='combined-original-source-back' and failure['phase'][-1]['modal']['data-object-reference']=='M:51'
 assert read(failed/'failed-resource-summary.json')['observations']>0 and not (failed/'source-bindings-after.json').exists()
 warm_requests=[r for r in requests if r.get('phase','').startswith(('combined-warm','combined-moon-time','combined-moon-preview','combined-actual-hide'))]
 warm_moon_http=sum(r['binary'] and '/sky/moon/' in r['route'] for r in warm_requests);assert warm_moon_http==0
 result={'status':'SAVED_ORIGINAL_MAP_SKY_COMBINED_RESOURCE_PARTIAL_DEVELOPMENT','frontend':506,'backendProject':162,'baselineSources':312,'protectedExact':6,'formalContext':formal['observationContext']['contextId'],'originalMapSameInstance':True,'scopedSkyInstancesUnloaded':1,'proposalPanelRestore':'FAILED_RETAINED','sourceFamilies':families,'familyGeometry':geometry,'capturesGlPngGl':len(captures)+1,'sourceBackPixelEquality':source_delta,'warmMoonPixelEquality':warm_delta,'warmMoonImageHttp':warm_moon_http,'resourceObservations':resource['observations'],'separateObservedMaxima':resource['maxima'],'peakSamples':resource['peakSamples'],'requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),'unknownReceivedRequests':sum('receivedBytes' not in r for r in requests),'scopedPublicReads':len(read(scoped/'public-asset-read-bindings.json')['unique']),'auth':auth,'scopedFinalActivity':'all registrations/GL/encoded/lease/queue zero; inventory26B','priorFailure':'r3 task omitted disclosure close; r4 pending Map panel remains closed after hide/Back, no after binding/final; r5 same Map-panel failure reproduced, real final/bindings saved then logging-only TypeError. All terminal task failures retained.','scope':'Root self-review of original full logical Taro Map/Sky/Sources/provider/controller, same formal-context combination and private proposal entry; scoped return/final in another epoch. Native ports controlled, SCSS not composed, softwareGL. Failed r4 not complete full journey; scoped final not retroactive. Sensor-follow/midnight/play combination, panel continuity, figure quality, physical memory, WXML/device/production/static retention/cost/capacity and independent review open.'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
 print(json.dumps({k:v for k,v in result.items() if k not in ['peakSamples','familyGeometry','auth']},ensure_ascii=False))
except Exception as error:
 (out/'failed.json').write_text(json.dumps({'error':str(error),'type':type(error).__name__},ensure_ascii=False,indent=2)+'\n',encoding='utf8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());raise
