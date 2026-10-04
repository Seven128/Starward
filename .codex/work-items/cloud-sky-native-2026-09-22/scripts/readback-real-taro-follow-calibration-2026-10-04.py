"""Read actual controller/raw/paint/public-control results with independent matrix arithmetic."""
from pathlib import Path
from PIL import Image
import hashlib,json,math,sys,numpy as np
root=Path(__file__).resolve().parents[4];first=root/sys.argv[1];middle=root/sys.argv[2];lane=root/sys.argv[3];last=root/sys.argv[4];out=root/sys.argv[5];out.mkdir(exist_ok=False)
task='.codex/work-items/cloud-sky-native-2026-09-22'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def matrix(b):return np.array([b[k] for k in ['right','up','forward']],dtype=np.float64).T
def view(p):return json.loads(p['canvas']['data-sky-presented-view'])
def independent_raw(angles):
 # Axis matrices independently implement the original Android boundary, not Quaternion.js.
 a,b,g=[math.radians(angles[k]) for k in ['alpha','beta','gamma']]
 def x(t):return np.array([[1,0,0],[0,math.cos(t),-math.sin(t)],[0,math.sin(t),math.cos(t)]])
 def y(t):return np.array([[math.cos(t),0,math.sin(t)],[0,1,0],[-math.sin(t),0,math.cos(t)]])
 def z(t):return np.array([[math.cos(t),-math.sin(t),0],[math.sin(t),math.cos(t),0],[0,0,1]])
 return np.array([[1,0,0],[0,0,-1],[0,1,0]])@y(-a)@x(-b)@z(g)@x(-math.pi/2)@np.diag([1,1,-1])
def error(a,b):return float(np.max(abs(a-b)))
def numeric(a,b):
 d=error(a,b);assert d<=128*np.finfo(np.float64).eps,d # Rotation arithmetic only, never pixels/native tolerance.
 return d
def pixels(folder,name):
 raw=(folder/(name+'.rgba')).read_bytes();post=(folder/(name+'-after.rgba')).read_bytes();png=Image.open(folder/(name+'.png')).convert('RGBA')
 info=read(folder/(name+'-pixels.json'));assert raw==post==png.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes(),name
 assert len(raw)==1316640==info['bytes'] and hashlib.sha256(raw).hexdigest()==info['sha256']
 bounds=read(folder/(name+'-capture-boundaries.json'));assert bounds['beforeHash']==bounds['afterHash']==info['sha256']
 return raw,info['sha256']
try:
 frontend=read(lane/'source-bindings-before.json');assert len(frontend)==401 and frontend==read(lane/'source-bindings-after.json')==read(first/'source-bindings-before.json')
 backend=read(lane/'backend-source-bindings-before.json');assert len(backend)==162 and backend==read(lane/'backend-source-bindings-after.json')==read(first/'backend-source-bindings-before.json')
 baseline=read(lane/'current-baseline-before.json');assert len(baseline['currentSources'])==306 and len(baseline['protected'])==6
 assert baseline==read(lane/'current-baseline-after.json')==read(first/'current-baseline-before.json')
 for row in frontend+backend+baseline['currentSources']+baseline['protected']:assert bind(root/row['path'])==row,row['path']
 assert frontend==read(middle/'source-bindings-before.json') and backend==read(middle/'backend-source-bindings-before.json') and baseline==read(middle/'current-baseline-before.json')
 assert (middle/'page-bundle.js').read_bytes()==(first/'page-bundle.js').read_bytes()!=(lane/'page-bundle.js').read_bytes()
 assert (middle/'executed-build.mts').read_bytes()==(first/'executed-build.mts').read_bytes()!=(lane/'executed-build.mts').read_bytes()
 assert (lane/'executed-build.mts').read_bytes()==(root/task/'scripts/build-real-taro-follow-calibration-2026-10-04.mts').read_bytes()
 assert (last/'executed-script.mts').read_bytes()==(root/task/'scripts/experience-real-taro-follow-calibration-2026-10-04.mts').read_bytes()
 assert frontend==read(last/'source-bindings-before.json')==read(last/'source-bindings-after.json') and backend==read(last/'backend-source-bindings-before.json')==read(last/'backend-source-bindings-after.json')
 assert baseline==read(last/'current-baseline-before.json')==read(last/'current-baseline-after.json')
 assert (last/'page-bundle.js').read_bytes()==(lane/'page-bundle.js').read_bytes() and (last/'executed-build.mts').read_bytes()==(lane/'executed-build.mts').read_bytes()
 assert (first/'executed-script.mts').read_bytes()!=(lane/'executed-script.mts').read_bytes()
 observed=read(lane/'observed-boundaries.json');assert all(any(r['path'].endswith('/'+n) for r in observed) for n in ['sky-orientation-controller.ts','device-orientation-view.ts','spot-sky-page.tsx'])
 assets=read(lane/'public-asset-read-bindings.json')
 for row in assets['unique']:assert bind(root/row['path'])==row
 failure=read(first/'failed.json');middleFailure=read(middle/'failed.json');a={p['name']:p for p in failure['phase']};m={p['name']:p for p in middleFailure['phase']};b={p['name']:p for p in read(lane/'phases.json')}
 assert len({read(folder/'bootstrap.json')['context']['contextId'] for folder in [first,middle,lane,last]})==4
 assert 'deep-equal' in failure['error'] and not (first/'current-baseline-after.json').exists() and not (first/'result.json').exists()
 wide=a['follow-public-wide-field'];frozen=a['calibration-wide-to-normal-frozen'];assert wide['scene']['fov']>90 and frozen['scene']['fov']==45
 assert view(wide)['basis']==view(frozen)['basis']
 for name in ['calibration-full-rotation-still-frozen','calibration-original-canvas-inputs-ignored']:
  p=a[name];assert view(p)['basis']==view(frozen)['basis'] and p['scene']['fov']==45 and p['orientation'][0]['alignment']['mode']=='editing'
 assert a['calibration-full-rotation-still-frozen']['rawPose']['frame']['basis']!=frozen['rawPose']['frame']['basis']
 assert any(r['text'].strip()=='时间轴' and r['props']['disabled'] for r in read(first/'calibration-disabled-controls.json'))
 assert not (middle/'current-baseline-after.json').exists() and not (middle/'result.json').exists()
 actualTarget=matrix(m['resume-calibration-normal-frozen']['orientation'][0]['alignment']['view'])
 arithmetic=[]
 for folder,phases in [(first,a),(middle,m)]:
  receipt=read(folder/'calibration-latest-unrendered-confirmed-atomic-confirm.json')
  assert receipt['dispatched'] and receipt['before']['alignment']['mode']=='editing' and receipt['after']['alignment']['mode']=='aligned'
  raw=receipt['raw'];assert raw['input']=={'alpha':180,'beta':-65,'gamma':60} and raw['frame'] is not None
  target=matrix(receipt['paintedView']['basis']);assert error(target,matrix(raw['frame']['basis']))>0.1
  rawError=numeric(matrix(raw['frame']['basis']),independent_raw(raw['input']))
  arithmetic.append({'epoch':folder.name,'operation':'atomic latest raw accepted before original confirm/public tap, original paint remains frozen','rawAxisArithmeticError':rawError,'confirmPoseToFrozenError':numeric(matrix(receipt['after']['alignment']['view']),target),'paintedConfirmToFrozenError':numeric(matrix(view(phases['calibration-latest-unrendered-confirmed'])['basis']),target)})
 reference=matrix(read(middle/'calibration-latest-unrendered-confirmed-atomic-confirm.json')['raw']['frame']['basis'])
 for name in ['aligned-all-axes-follow','second-calibration-cancel-current-old-relation']:
  p=m[name];raw=p['rawPose'];expected=actualTarget@reference.T@matrix(raw['frame']['basis'])
  arithmetic.append({'operation':name,'actualInput':raw['input'],'rawAxisArithmeticError':numeric(matrix(raw['frame']['basis']),independent_raw(raw['input'])),'originalAlignedOwnerError':numeric(matrix(p['orientation'][0]['alignment']['view']),expected),'actualPaintBasisError':numeric(matrix(view(p)['basis']),expected)})
 assert view(m['second-calibration-frozen'])['basis']==view(m['second-calibration-moved-before-cancel'])['basis']
 assert view(m['second-calibration-frozen'])['basis']!=view(m['second-calibration-cancel-current-old-relation'])['basis']
 stale=b['stream-outage-reference-invalidated'];assert stale['orientation'][0]['state']=='STALE' and not stale['orientation'][0]['alignment']['ready'] and stale['orientation'][0]['alignment']['mode']=='needs-alignment'
 assert not any(x['text'].strip()=='确定' for x in stale['buttons'])
 oldTap=read(lane/'late-original-confirm-after-outage.json');assert oldTap['invokedOriginalHandler'] and oldTap['before']==oldTap['after'] and not oldTap['before']['alignment']['ready']
 fresh=b['fresh-pose-after-outage-needs-alignment'];assert fresh['orientation'][0]['alignment']['ready'] and fresh['orientation'][0]['alignment']['mode']=='needs-alignment' and view(fresh)['basis']==view(b['resume-calibration-normal-frozen'])['basis']
 new=read(lane/'new-reference-confirmed-atomic-confirm.json');assert new['before']['alignment']['mode']=='editing' and new['after']['alignment']['mode']=='aligned' and new['raw']['input']=={'alpha':330,'beta':-55,'gamma':-55}
 target=matrix(new['paintedView']['basis']);ref=matrix(new['raw']['frame']['basis']);p=b['new-reference-full-rotation-follow'];expected=target@ref.T@matrix(p['rawPose']['frame']['basis'])
 arithmetic.append({'operation':'new-reference-full-rotation-follow','newEpoch':new['after']['alignment']['epoch'],'rawAxisArithmeticError':numeric(ref,independent_raw(new['raw']['input'])),'originalAlignedOwnerError':numeric(matrix(p['orientation'][0]['alignment']['view']),expected),'actualPaintBasisError':numeric(matrix(view(p)['basis']),expected),'incorrectPreConfirmRawReferenceError':error(matrix(p['orientation'][0]['alignment']['view']),target@matrix(b['new-reference-calibration-frozen']['rawPose']['frame']['basis']).T@matrix(p['rawPose']['frame']['basis']))})
 assert arithmetic[-1]['incorrectPreConfirmRawReferenceError']>0.1
 before=b['selected-before-original-source'];source=b['actual-source-sensors-and-images-retired'];returned=b['source-back-new-reference-held-view']
 assert source['activeRoute']=='sky/sources/index' and source['sensors']['motionListeners']==source['sensors']['compassListeners']==0 and not source['sensors']['motionRunning']
 assert source['resources']['activeDecodedImageHandles']==0 and source['gpu']=={} and all(o['leased']==0 for o in source['owners'])
 oldMotion=read(lane/'old-motion-callback-after-source-hidden.json');assert oldMotion['before']==oldMotion['after']
 assert returned['activeRoute']=='sky/detail/index' and returned['stack']==['sky/detail/index'] and returned['observationContext']==before['observationContext']
 assert returned['orientation'][0]['alignment']['mode']=='needs-alignment' and returned['orientation'][0]['alignment']['ready']
 assert view(returned)==view(before) and returned['sensors']['maxMotionListeners']==returned['sensors']['maxCompassListeners']==1
 assert read(lane/'actual-source-custom-nav-back.json')['dispatched']
 hashes={};raws={}
 for folder,names in [(first,['software-cold','software-frozen-normal','software-frozen-moved']),(middle,['software-cold','software-frozen-normal','software-confirmed-no-jump','software-aligned-follow','software-cancel-current-old-relation']),(lane,['software-cold','software-frozen-normal','software-new-reference-follow','software-source-before','software-source-back-held'])]:
  for name in names:
   data,h=pixels(folder,name);hashes[folder.name+'/'+name]=h;raws[(folder.name,name)]=data
 assert raws[(first.name,'software-frozen-normal')]==raws[(first.name,'software-frozen-moved')]
 assert raws[(middle.name,'software-frozen-normal')]==raws[(middle.name,'software-confirmed-no-jump')]
 difference=np.frombuffer(raws[(lane.name,'software-source-before')],dtype=np.uint8).astype(np.int16)-np.frombuffer(raws[(lane.name,'software-source-back-held')],dtype=np.uint8).astype(np.int16)
 final=b['unloaded-cleared'];assert final['gpu']=={} and final['resources']['activeDecodedImageHandles']==0 and sum(x['bytes'] for x in final['files'])==26
 assert final['sensors']['motionListeners']==final['sensors']['compassListeners']==0 and not final['sensors']['motionRunning'] and not final['sensors']['compassRunning']
 assert final['queries']==[] and final['pendingNativeRequests']==0 and all(x['retired'] for x in read(lane/'native-image-owner-events.json'))
 for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert final['owners'][0][k]==0
 requests=read(lane/'requests.json');assert not any(x.get('injected') for x in requests)
 c={p['name']:p for p in read(last/'phases.json')};held=c['source-back-new-reference-held-view'];confirmed=c['source-back-latest-reference-confirmed'];follow=c['source-back-full-rotation-follow-restored'];receipt=read(last/'source-back-latest-reference-confirmed-atomic-confirm.json')
 assert receipt['dispatched'] and receipt['raw']['input']=={'alpha':45,'beta':-70,'gamma':-60} and receipt['after']['alignment']['mode']=='aligned'
 target=matrix(receipt['paintedView']['basis']);ref=matrix(receipt['raw']['frame']['basis']);expected=target@ref.T@matrix(follow['rawPose']['frame']['basis'])
 arithmetic.append({'operation':'actual-source-back-new-confirm-full-follow','rawAxisArithmeticError':numeric(ref,independent_raw(receipt['raw']['input'])),'originalAlignedOwnerError':numeric(matrix(follow['orientation'][0]['alignment']['view']),expected),'actualPaintBasisError':numeric(matrix(view(follow)['basis']),expected)})
 assert held['orientation'][0]['alignment']['mode']=='needs-alignment' and confirmed['orientation'][0]['alignment']['mode']=='aligned' and held['observationContext']==confirmed['observationContext']==follow['observationContext']
 nav=read(last/'actual-navigation.json');assert nav['sameCurrentSkyInstance'] and nav['sourceRootRemoved']
 lastRaw={}
 for name in ['software-cold','software-frozen-normal','software-new-reference-follow','software-source-before','software-source-back-held','software-source-back-confirmed-no-jump','software-source-back-follow-restored']:
  data,h=pixels(last,name);hashes[last.name+'/'+name]=h;lastRaw[name]=data
 assert lastRaw['software-source-back-held']==lastRaw['software-source-back-confirmed-no-jump'] and lastRaw['software-source-back-follow-restored']!=lastRaw['software-source-back-held']
 finalLast=c['unloaded-cleared'];assert finalLast['gpu']=={} and finalLast['resources']['activeDecodedImageHandles']==0 and finalLast['queries']==[] and finalLast['pendingNativeRequests']==0 and sum(x['bytes'] for x in finalLast['files'])==26
 assert finalLast['sensors']['motionListeners']==finalLast['sensors']['compassListeners']==0 and not finalLast['sensors']['motionRunning'] and not finalLast['sensors']['compassRunning']
 for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert finalLast['owners'][0][k]==0
 assert all(x['retired'] for x in read(last/'native-image-owner-events.json'))
 assetsLast=read(last/'public-asset-read-bindings.json')
 for row in assetsLast['unique']:assert bind(root/row['path'])==row
 requestsLast=read(last/'requests.json');assert not any(x.get('injected') for x in requestsLast)
 lastDifference=np.frombuffer(lastRaw['software-source-before'],dtype=np.uint8).astype(np.int16)-np.frombuffer(lastRaw['software-source-back-held'],dtype=np.uint8).astype(np.int16)
 def differenceFacts(d):return {'status':'FAILED_EXACT_RETURN_PIXEL_EQUALITY_RETAINED' if np.any(d) else 'EXACT_SAVED_RETURN_PIXELS_THIS_VIEW','changedPixels':int(np.any(d.reshape(844,390,4)!=0,axis=2).sum()),'changedChannels':int(np.count_nonzero(d)),'maximumAbsoluteChannelDelta':int(abs(d).max()),'alphaChanged':bool(np.any(d.reshape(844,390,4)[:,:,3]!=0))}
 result={'status':'SAVED_FULL_ROTATION_CALIBRATION_CANCEL_OUTAGE_SOURCE_REANCHOR_DEVELOPMENT_FOUR_EPOCHS','frontendInputs':401,'backendProjectSources':162,'selectedSourcesExact':306,'protectedExact':6,'publicReadFiles':{'r3':len(assets['unique']),'r4':len(assetsLast['unique'])},'r1ExecutedScript':bind(first/'executed-script.mts'),'r2ExecutedScript':bind(middle/'executed-script.mts'),'r3ExecutedScript':bind(lane/'executed-script.mts'),'r4ExecutedScript':bind(last/'executed-script.mts'),'arithmetic':arithmetic,'matrixCheckScope':'128*float64 epsilon bounds small rigid-rotation arithmetic error only; no product policy or pixel tolerance. Original exact-float task failure remains. Every PNG/raw pair is still strict.','r1Failure':'Exact basis byte equality after original rotation arithmetic failed; r1 before-bound only/no final retirement. Early wide/freeze/full pose/input lock and latest atomic confirmation remain observed.','r2Failure':'Cached logical confirm node tap changed reference/state into reconnect rather than confirming; reused node identity is not an original queued confirm callback. Before-bound only/no final retirement. r3 retains/invokes exact original JSX closure, additional diagnostic bundle, unchanged product source.','successfulPixelHashes':hashes,'sourceReturnPixelDifferences':{'r3':differenceFacts(difference),'r4':differenceFacts(lastDifference)},'expiredOriginalConfirm':{'currentReusedNodeText':oldTap['currentReusedNodeText'],'invokedOriginalHandler':True,'unchangedNotReadyReference':True,'scope':'Exact retained original callback body under explicit queued-expiry simulation; actual visible confirm control absent. Not a normal visible-control action.'},'actualStaleCallbacksRejected':True,'sourceBackPublicReanchor':'Same actual Sky instance, original Source root removed; public recalibration/atomic latest confirm restores aligned all-axis following, exact no-jump saved pixels.','completedEpochs':{name:{'requests':len(req),'receivedBodyBytes':sum(x['receivedBytes'] for x in req),'separateObservedMaxima':read(folder/'resource-summary.json')['maxima'],'resourceObservations':read(folder/'resource-summary.json')['observations']} for name,folder,req in [('r3',lane,requests),('r4',last,requestsLast)]},'scope':'Four separate context epochs, not one whole experience journey. Actual original page/installed Provider/public touch-controls/original controller and tracker on synthetic Android degree port/softwareGL. Original sensor time Date.now and 500ms expiry, no fake clock/direct controller mutations. Not physical Android or iOS/WXML/SCSS/physical memory/full journey/quality/capacity/independent acceptance. Product source unchanged.'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in result.items() if k!='successfulPixelHashes'},ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':repr(e)},ensure_ascii=False)+'\n',encoding='utf8');raise
