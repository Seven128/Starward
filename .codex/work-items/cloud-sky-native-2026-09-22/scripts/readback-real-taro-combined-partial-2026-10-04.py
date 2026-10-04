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
try:
 frontend=read(lane/'source-bindings-before.json');backend=read(lane/'backend-source-bindings-before.json');base=read(lane/'current-baseline-before.json')
 assert frontend==read(lane/'source-bindings-after.json') and backend==read(lane/'backend-source-bindings-after.json') and base==read(lane/'current-baseline-after.json')
 assert len(frontend)==506 and len(backend)==162 and len(base['currentSources'])==315 and len(base['protected'])==6
 for row in frontend+backend+base['currentSources']+base['protected']+read(lane/'public-asset-read-bindings.json')['unique']:assert bind(root/row['path'])==row,row['path']
 assert (root/task/'scripts/experience-real-taro-combined-follow-time-2026-10-04.mts').read_bytes()==(lane/'executed-script.mts').read_bytes()
 assert read(lane/'result.json')['mode']=='remaining-time' and not read(lane/'browser-errors.json')
 history=read(lane/'phases.json');p={r['name']:r for r in history};formal=p['original-entry-sky-cold-painted'];ctx=formal['observationContext']
 setup=read(lane/'controlled-settled-map-near-midnight-input.json');assert setup['after']['selectedAtUtc']==ctx['selectedAtUtc'] and setup['before']['selectedAtUtc'].endswith('T13:00:00.000Z')
 assert ctx['selectedAtUtc'].endswith('T15:59:58.700Z')
 original=p['combined-pre-midnight-time'];assert original['scene']['at']==ctx['selectedAtUtc'] and civil(original['scene']['at'])==ctx['localDate'] and '跟踪中' in original['text']
 for name in ['combined-playing-midnight-tracked','combined-midnight-paused','combined-ruler-midnight-preview']:
  row=p[name];assert civil(row['scene']['at'])!=ctx['localDate'] and row['observationContext']==ctx and '跟踪中' in row['text']
 for name in ['combined-play-cancelled','combined-ruler-cancel-late-ignored']:
  row=p[name];assert row['scene']['at']==original['scene']['at'] and row['observationContext']==ctx and view(row)==view(original)
 target=read(lane/'actual-cross-midnight-row-inputs.json');committed=p['combined-ruler-midnight-committed'];new_ctx=committed['observationContext']
 assert new_ctx['revision']==ctx['revision']+1 and new_ctx['contextId']==ctx['contextId'] and new_ctx['selectedAtUtc']==target['momentum']['at'] and new_ctx['localDate']==ctx['localDate'] and civil(committed['scene']['at'])!=ctx['localDate']
 assert target['rows'][target['momentum']['index']]['at']==new_ctx['selectedAtUtc']
 for name in ['combined-ruler-late-after-commit','combined-midnight-warm-show','combined-ruler-late-end-after-show','combined-committed-time-source-back','combined-return-original-map-latest-time']:assert p[name]['observationContext']==new_ctx
 time_before=p['combined-committed-moon-source-before'];time_back=p['combined-committed-time-source-back'];assert view(time_before)==view(time_back) and time_back['scene']['at']==committed['scene']['at'] and '跟踪中' in time_back['text']
 for name in ['combined-midnight-hidden-retired','combined-committed-source-retired','combined-return-original-map-latest-time','unloaded-cleared']:retired(p[name])
 nav=read(lane/'actual-combined-navigation.json');assert nav['sameMapInstance'] and nav['skyRootRemoved'] and len([n for n in nav['navigation'] if n.get('url','').startswith('/sky/detail/index?')])==1
 final=p['unloaded-cleared'];assert len(final['owners'])==1 and all(final['owners'][0][k]==0 for k in ['entries','leased','bytes','reserved','running','pending','retired']) and sum(r['bytes'] for r in final['files'])==26
 names=[r.name.removesuffix('-pixels.json') for r in sorted(lane.glob('*-pixels.json'))];raws={name:pixels(name) for name in names};assert set(names)=={'software-cold','software-pre-midnight-track','software-midnight-paused','software-midnight-cancelled','software-midnight-preview','software-midnight-committed','software-midnight-warm-show','software-moon-source-before','software-moon-source-back'}
 comparisons={label:delta(raws[a],raws[b]) for label,a,b in [('playCancel','software-pre-midnight-track','software-midnight-cancelled'),('warmCommittedMoon','software-midnight-committed','software-midnight-warm-show'),('committedMoonSourceBack','software-moon-source-before','software-moon-source-back')]}
 resource=read(lane/'resource-summary.json');assert resource['observations']>0
 for key,val in resource['maxima'].items():
  sample=resource['peakSamples'][key];assert sample.get(key,(sample.get('encoded') or {}).get(key))==val
 # Earlier same-instance follow/calibration observations end in a failed task.
 failed=read(first/'failed.json');assert failed['error']=='Error: bounded complete page wait expired' and not failed['errors'] and not (first/'current-baseline-after.json').exists()
 fp={r['name']:r for r in failed['phase']};fctx=fp['original-entry-sky-cold-painted']['observationContext'];assert fctx['selectedAtUtc'].endswith('T13:00:00.000Z')
 assert failed['current']['scene'][-1]['at'].startswith(fctx['selectedAtUtc'][:14]) and '暂停' in failed['current']['logicalText']
 arithmetic=[]
 for name,following_names in [('combined-latest-unpainted-confirm',['combined-aligned-full-rotation','combined-cancel-old-relation-current-pose']),('combined-new-reference-confirm',['combined-new-reference-all-axes']),('combined-source-return-latest-confirm',['combined-source-return-follow-all-axes'])]:
  r=read(first/(name+'-atomic-confirm.json'));assert r['dispatched'] and r['before']['alignment']['mode']=='editing' and r['after']['alignment']['mode']=='aligned'
  target_basis=matrix(r['paintedView']['basis']);ref=matrix(r['raw']['frame']['basis']);assert error(target_basis,ref)>.1
  arithmetic.append({'operation':name,'rawAxesError':numeric(ref,independent_raw(r['raw']['input'])),'acceptedViewToFrozenError':numeric(matrix(r['after']['alignment']['view']),target_basis),'paintedViewToFrozenError':numeric(matrix(view(fp[name])['basis']),target_basis)})
  for after_name in following_names:
   row=fp[after_name];raw=row['rawPose'];expected=target_basis@ref.T@matrix(raw['frame']['basis']);arithmetic.append({'operation':after_name,'rawAxesError':numeric(matrix(raw['frame']['basis']),independent_raw(raw['input'])),'alignedViewError':numeric(matrix(row['orientation'][0]['alignment']['view']),expected),'paintedBasisError':numeric(matrix(view(row)['basis']),expected)})
 frozen=fp['combined-dome-to-normal-frozen'];assert abs(fp['combined-follow-dome-ready']['scene']['fov']-267.8)<1e-9 and frozen['scene']['fov']==45
 for name in ['combined-frozen-full-rotation','combined-calibration-input-lock']:assert view(fp[name])['basis']==view(frozen)['basis'] and fp[name]['scene']['at']==frozen['scene']['at']
 assert view(fp['combined-second-freeze'])['basis']==view(fp['combined-cancel-new-raw'])['basis'] and view(fp['combined-second-freeze'])['basis']!=view(fp['combined-cancel-old-relation-current-pose'])['basis']
 stale=fp['combined-stream-expired'];assert stale['orientation'][0]['state']=='STALE' and stale['orientation'][0]['alignment']['mode']=='needs-alignment' and not stale['orientation'][0]['alignment']['ready']
 for filename in ['late-confirm-after-expiry.json','late-motion-after-source-hide.json']:
  r=read(first/filename);assert r['before']==r['after']
 for mode in ['OBSERVATION','NIGHT','DAY']:assert fp['combined-follow-mode-'+mode]['scene']['mode']==mode and fp['combined-follow-mode-'+mode]['observationContext']==fctx
 before=fp['combined-follow-source-before'];back=fp['combined-follow-source-back-held'];assert view(before)['basis']==view(back)['basis'] and back['orientation'][0]['alignment']['mode']=='needs-alignment' and back['sensors']['maxMotionListeners']==back['sensors']['maxCompassListeners']==1
 retired(fp['combined-follow-source-retired']);assert fp['combined-after-follow-manual']['sensors']['motionListeners']==0
 failed_names=[r.name.removesuffix('-pixels.json') for r in first.glob('*-pixels.json')]
 for name in failed_names:pixels(name,first)
 follow_comparisons={'calibrationConfirmation':delta(pixels('software-calibration-frozen',first),pixels('software-calibration-confirmed',first)),'followSourceBack':delta(pixels('software-follow-source-before',first),pixels('software-follow-source-back',first))}
 requests=read(lane/'requests.json');fail_resource=read(first/'failed-resource-summary.json');assert fail_resource['observations']>0
 result={'status':'SAVED_COMBINED_FOLLOW_PARTIAL_AND_REMAINING_TIME_DEVELOPMENT','frontend':506,'backendProject':162,'baselineSources':315,'protectedExact':6,'timeLane':lane.relative_to(root).as_posix(),'failedFollowLane':first.relative_to(root).as_posix(),'timeLaneContext':ctx['contextId'],'failedFollowContext':fctx['contextId'],'timeLaneOriginalMapAndSky':True,'failureEpochHasNoAfterOrFinal':True,'rotationArithmetic':arithmetic,'timeLaneCapturesGlPngGl':len(names),'failedFollowCapturesGlPngGl':len(failed_names),'timeLanePixelComparisons':comparisons,'failedFollowPixelComparisons':follow_comparisons,'separateObservedTimeMaxima':resource['maxima'],'separateObservedFailedFollowMaxima':fail_resource['maxima'],'timeResourceObservations':resource['observations'],'failedFollowResourceObservations':fail_resource['observations'],'requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),'unknownReceivedRequests':sum('receivedBytes' not in r for r in requests),'finalActivity':'remaining-time lane native/GPU/encoded/lease/queue/sensor zero; controlled filesystem26B','scope':'Self-review of saved actual original Taro consumers/software GL. Explicit post-readiness controlled context initialization; original marker/cloud entry retained. Two epochs are not one complete journey; earlier failed follow has no after/final. No native WXML/physical sensors/physical total/quality/capacity/independent review or Goal-completion claim.'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());print(json.dumps({k:v for k,v in result.items() if k!='rotationArithmetic'},ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':str(e),'type':type(e).__name__},ensure_ascii=False,indent=2)+'\n',encoding='utf8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());raise
