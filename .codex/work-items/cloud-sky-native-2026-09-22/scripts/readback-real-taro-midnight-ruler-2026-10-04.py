"""Read saved actual-page midnight/ruler epochs without rerunning public HTTP."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from PIL import Image
import hashlib,json,re,sys,numpy as np
root=Path(__file__).resolve().parents[4]
first=root/sys.argv[1];lane=root/sys.argv[2];out=root/sys.argv[3];out.mkdir(exist_ok=False)
task='.codex/work-items/cloud-sky-native-2026-09-22'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def civil(at):return datetime.fromisoformat(at.replace('Z','+00:00')).astimezone(ZoneInfo('Asia/Shanghai'))
def view(p):return json.loads(p['canvas']['data-sky-presented-view'])
def pixels(folder,name):
 info=read(folder/(name+'-pixels.json'));raw=(folder/(name+'.rgba')).read_bytes();post=(folder/(name+'-after.rgba')).read_bytes()
 png=Image.open(folder/(name+'.png')).convert('RGBA')
 assert raw==post==png.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes(),name
 assert len(raw)==info['bytes']==1316640 and hashlib.sha256(raw).hexdigest()==info['sha256']
 bounds=read(folder/(name+'-capture-boundaries.json'));assert bounds['beforeHash']==bounds['afterHash']==info['sha256']
 return raw,info['sha256']
def tracked(p):
 painted=p['canvas']['data-sky-scene-frame-at'];assert painted==view(p)['frameAt']
 if p['name']=='playing-across-civil-midnight':
  assert civil(painted).date().isoformat()=='2026-10-05'
  assert datetime.fromisoformat(p['scene']['at'].replace('Z','+00:00'))>=datetime.fromisoformat(painted.replace('Z','+00:00'))
 else:assert painted==p['scene']['at']
 assert '跟踪中' in p['text'] and len(p['selection'])==1
 point=p['selection'][0];assert point['text']=='Schedar'
 xy=[float(x) for x in re.findall(r'(?:left|top): ([\d.e+-]+)px',point['style'])]
 assert len(xy)==2 and max(abs(xy[0]-195),abs(xy[1]-422))<1e-9
 return {'at':p['scene']['at'],'paintedAt':painted,'basis':view(p)['basis'],'selectedLabel':point['text'],'selectedCenter':xy}
try:
 frontend=read(lane/'source-bindings-before.json');assert len(frontend)==401 and frontend==read(lane/'source-bindings-after.json')==read(first/'source-bindings-before.json')
 backend=read(lane/'backend-source-bindings-before.json');assert len(backend)==162 and backend==read(lane/'backend-source-bindings-after.json')==read(first/'backend-source-bindings-before.json')
 base=read(lane/'current-baseline-before.json');assert len(base['currentSources'])==303 and len(base['protected'])==6
 assert base==read(lane/'current-baseline-after.json')==read(first/'current-baseline-before.json')
 for row in frontend+backend+base['currentSources']+base['protected']:assert bind(root/row['path'])==row,row['path']
 assert (lane/'executed-build.mts').read_bytes()==(first/'executed-build.mts').read_bytes()==(root/task/'scripts/build-real-taro-midnight-ruler-2026-10-04.mts').read_bytes()
 assert (lane/'executed-script.mts').read_bytes()==(root/task/'scripts/experience-real-taro-midnight-ruler-2026-10-04.mts').read_bytes()
 assert (lane/'executed-script.mts').read_bytes()!=(first/'executed-script.mts').read_bytes()
 assert (lane/'page-bundle.js').read_bytes()==(first/'page-bundle.js').read_bytes()
 assets={}
 for folder in [first,lane]:
  for row in read(folder/'public-asset-read-bindings.json')['unique'] if (folder/'public-asset-read-bindings.json').exists() else []:
   assert bind(root/row['path'])==row;assets[row['path']]=row
 # r1 terminated at its failed committed capture; no invented after-bind/final retirement.
 failure=read(first/'failed.json');a={p['name']:p for p in failure['phase']};b={p['name']:p for p in read(lane/'phases.json')}
 assert 'actual GL pixels changed during capture' in failure['error'] and not (first/'result.json').exists()
 assert not (first/'current-baseline-after.json').exists()
 initial=a['pre-midnight-time-panel'];assert civil(initial['scene']['at']).isoformat().startswith('2026-10-04T23:59:58.700')
 facts=[]
 for name in ['playing-across-civil-midnight','paused-after-civil-midnight','ruler-held-after-midnight-preview']:
  p=a[name];assert civil(p['scene']['at']).date().isoformat()=='2026-10-05' and p['observationContext']==initial['observationContext']
  assert '10月05日' in p['timeContext']['aria-label'] and 'UTC+8' in p['timeContext']['aria-label'];facts.append(tracked(p))
 for name in ['play-cancelled-pre-midnight','ruler-cancelled-ignore-late-scroll']:
  p=a[name];assert p['observationContext']==initial['observationContext'] and view(p)==view(initial)
  assert p['scene']['at']==initial['scene']['at'] and '10月04日' in p['timeContext']['aria-label'];facts.append(tracked(p))
 # Binding intent uses real hourly rows plus public ScrollView touch/scroll settlement.
 rows=read(lane/'actual-ruler-row-inputs.json');assert len(rows['rows'])==len(rows['ticks'])==49
 firstAt=rows['first']['at'];lastAt=rows['momentum']['at'];assert firstAt=='2026-10-04T16:30:00.000Z' and lastAt=='2026-10-04T17:00:00.000Z'
 assert rows['rows'][rows['first']['index']]['at']==firstAt and rows['rows'][rows['momentum']['index']]['at']==lastAt
 original=b['pre-midnight-time-panel'];committed=b['ruler-released-momentum-committed'];ctx=committed['observationContext']
 assert ctx['contextId']!=initial['observationContext']['contextId'] # Explicit separate epochs.
 assert ctx['contextId']==original['observationContext']['contextId'] and ctx['revision']==2 and ctx['selectedAtUtc']==lastAt and ctx['localDate']=='2026-10-04' and ctx['timezone']=='Asia/Shanghai'
 assert civil(lastAt).isoformat()=='2026-10-05T01:00:00+08:00'
 assert b['ruler-second-held-preview']['observationContext']==original['observationContext'] and b['ruler-second-held-preview']['scene']['at']==firstAt
 for name in ['ruler-released-momentum-committed','programmatic-scroll-after-commit-ignored','ruler-show-restored-committed-time','ruler-late-end-after-show-ignored']:
  p=b[name];assert p['observationContext']==ctx and p['scene']['at']==lastAt
  report=p['scene']['reportContext'];assert report['contextId']==ctx['contextId'] and report['contextRevision']==ctx['revision'] and report['contextFingerprint']==ctx['contextFingerprint'] and report['at']==lastAt and report['localDate']==ctx['localDate'] and report['timezone']==ctx['timezone']
  assert view(p)==view(committed) and '10月05日' in p['timeContext']['aria-label'] and '01:00' in p['ruler']['aria-valuetext'];facts.append(tracked(p))
 assert view(committed)['basis']!=view(original)['basis']
 preview=b['ruler-before-hide-prior-civil-preview'];assert preview['scene']['at']=='2026-10-04T15:30:00.000Z' and preview['observationContext']==ctx
 hidden=b['ruler-hidden-retired'];assert hidden['resources']['activeDecodedImageHandles']==0 and hidden['resources']['gpuTextureUploadModelBytes']==0 and hidden['gpu']=={} and all(o['leased']==0 for o in hidden['owners'])
 assert [x['name'] for x in read(lane/'actual-time-lifecycle.json')]==['onHide','onShow']
 actions=read(lane/'public-ruler-actions.json');assert all(x['dispatched'] for x in actions)
 assert [x['type'] for x in actions[:5]]==['touchstart','scroll','touchend','scroll','scrollend']
 assert actions[1]['detail']['scrollLeft']==rows['first']['index']*rows['step'] and actions[3]['detail']['scrollLeft']==rows['momentum']['index']*rows['step']
 hashes={};raw={}
 for folder,names in [(first,['software-cold','software-midnight-paused','software-ruler-preview']),(lane,['software-cold','software-ruler-committed','software-ruler-show-restored'])]:
  for name in names:
   data,h=pixels(folder,name);hashes[folder.name+'/'+name]=h
   if folder==lane:raw[name]=data
 for name in ['software-midnight-paused','software-ruler-preview']:
  paint=read(first/(name+'-paint.json'));star=next(o for o in paint['objects'] if o['reference']=='HR:168');assert abs(star['x']-195)<1e-9 and abs(star['y']-422)<1e-9
 for name in ['software-ruler-committed','software-ruler-show-restored']:
  paint=read(lane/(name+'-paint.json'));assert paint['frameAt']==lastAt
  star=next(o for o in paint['objects'] if o['reference']=='HR:168');assert abs(star['x']-195)<1e-9 and abs(star['y']-422)<1e-9
 failedBound=read(first/'software-ruler-committed-capture-boundaries.json');assert failedBound['beforeHash']!=failedBound['afterHash'] and failedBound['before']['sceneSequence']!=failedBound['after']['sceneSequence']
 assert failedBound['before']['frameResources']['sourceImages']!=failedBound['after']['frameResources']['sourceImages']
 # Saved actual Query has disabled anchor entries, not remote tracking callbacks.
 for p in [committed,b['ruler-show-restored-committed-time']]:
  assert all(x['fetchStatus']=='idle' and 'data' not in x for x in p['positions'])
 requests=read(lane/'requests.json');assert len(requests)==51 and not any(x.get('injected') for x in requests)
 assert not any('celestial-position' in x['route'] for x in requests)
 updates=[x for x in requests if x['method']=='PUT'];assert len(updates)==1 and updates[0]['status']==200
 final=b['unloaded-cleared'];assert final['gpu']=={} and final['resources']['activeDecodedImageHandles']==0 and sum(x['bytes'] for x in final['files'])==26 and final['queries']==[]
 assert final['pendingNativeRequests']==0
 for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert final['owners'][0][k]==0
 assert all(x['retired'] for x in read(lane/'native-image-owner-events.json'))
 diff=np.frombuffer(raw['software-ruler-committed'],dtype=np.uint8).astype(np.int16)-np.frombuffer(raw['software-ruler-show-restored'],dtype=np.uint8).astype(np.int16)
 result={'status':'SAVED_CIVIL_MIDNIGHT_RULER_DEVELOPMENT_TWO_CONTEXT_EPOCHS','frontendInputs':401,'backendProjectSources':162,'selectedSourcesExact':303,'protectedExact':6,'publicReadFilesBound':len(assets),'r1ScriptArchive':bind(first/'executed-script.mts'),'r2ScriptArchive':bind(lane/'executed-script.mts'),'midnightPlayPausedAt':a['paused-after-civil-midnight']['scene']['at'],'midnightPlayAndRulerCancellation':'camera/time/context restored; late cancel-scroll ignored in r1 before terminal failure','committedContext':ctx,'rulerRows':{'first':rows['first'],'momentum':rows['momentum'],'step':rows['step'],'actualRows':49},'trackingPaintFacts':facts,'trackingMechanism':'Original local same-presentation position owner; disabled anchor Query is not remote position evidence. Actual selected HR:168 remains centered as the presented basis changes with time.','successfulCaptureHashes':hashes,'r1CommittedCaptureFailure':{'status':'FAILED_RETAINED','beforeHash':failedBound['beforeHash'],'afterHash':failedBound['afterHash'],'sceneSequenceBefore':failedBound['before']['sceneSequence'],'sceneSequenceAfter':failedBound['after']['sceneSequence'],'sourceImageCollectionChanged':True,'scope':'Only saved collection/scene changes observed; no exact per-draw cause or production defect attribution. No r1 after-bind/final retirement.'},'r2ReturnPixelDifference':{'changedChannels':int(np.count_nonzero(diff)),'maxAbsoluteChannelDelta':int(np.max(abs(diff))),'meaning':'Observed for this view only; older nine-channel exact-equality failure stays historical.'},'requests':51,'receivedBodyBytes':sum(x['receivedBytes'] for x in requests),'contextUpdates':1,'separateObservedMaxima':read(lane/'resource-summary.json')['maxima'],'retirement':'hide registered/GL/lease zero; final registered/GL/encoded/Query zero, inventory26B','scope':'Two separate context epochs, not a single completed full journey. Actual original JSX/Provider/public native-control events/softwareGL on controlled ports; styles not composed. Self-review, not independent/native WXML/phone/physical/quality/capacity acceptance. No product source change.'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps({k:v for k,v in result.items() if k not in ['committedContext','trackingPaintFacts','successfulCaptureHashes']},ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':repr(e)},ensure_ascii=False)+'\n',encoding='utf8');raise
