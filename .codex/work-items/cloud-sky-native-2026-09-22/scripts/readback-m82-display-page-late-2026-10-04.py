"""Read saved actual pending-decode retirement and before/after auxiliary retry; no replay."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
DEV=ROOT/'output/sdss-m82-display-page-late-development-1004-r1'
OUT=ROOT/'output/sdss-m82-display-page-late-readback-1004-r1'
OUT.mkdir(exist_ok=False)
def read(p):return json.loads(Path(p).read_bytes())
def bind(p):
 p=Path(p);return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
def save(p,v):
 with p.open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
try:
 prior={r['path']:r for r in read(DEV/'additional-before-bindings.json')}
 captures=[];lanes=[]
 for i in range(1,5):
  folder=ROOT/f'output/playwright/cloud-sky-m82-display-page-late-1004-r{i}'
  for row in read(folder/'source-bindings-before.json'):
   actual=bind(ROOT/row['path'])
   if actual!=row:
    assert row['path'] in prior and row==prior[row['path']]
    old=bind(DEV/'before'/row['path']);assert (old['bytes'],old['sha256'])==(row['bytes'],row['sha256'])
  if i>=3:
   for name in ['source-bindings','backend-source-bindings','current-baseline']:
    assert read(folder/(name+'-before.json'))==read(folder/(name+'-after.json'))
   for row in read(folder/'backend-source-bindings-before.json')+read(folder/'public-asset-read-bindings.json')['unique']:
    assert bind(ROOT/row['path'])==row
   phases=read(folder/'phases.json');final=phases[-1]
   assert final['name']=='unloaded-cleared' and not final['gpu'] and final['pendingNativeRequests']==0
   assert all(final['resources'][k]==0 for k in ['gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes'])
   assert all(final['owners'][0][k]==0 for k in ['entries','bytes','leased','reserved','running','pending','retired'])
   requests=read(folder/'requests.json');binary=[r for r in requests if r['binary'] and '/sky/sdss-optical/' in r['route'] and r['status']==200]
   assert len(binary)==2 and sum(r['receivedBytes'] for r in binary)==1122957
   lanes.append({'lane':i,'requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),'sourceBindings':len(read(folder/'source-bindings-before.json')),'backendBindings':len(read(folder/'backend-source-bindings-before.json')),'publicReads':len(read(folder/'public-asset-read-bindings.json')['unique']),'resources':read(folder/'resource-summary.json'),'finalAllZero':True})
  for file in sorted(folder.glob('software-*-capture-boundaries.json')):
   name=file.name.removesuffix('-capture-boundaries.json');raw=(folder/(name+'.rgba')).read_bytes()
   assert raw==(folder/(name+'-after.rgba')).read_bytes()==Image.open(folder/(name+'.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
   x=read(file);assert x['beforeHash']==x['afterHash']==hashlib.sha256(raw).hexdigest()
   captures.append({'lane':i,'name':name,'rgba':bind(folder/(name+'.rgba'))})
 p1=ROOT/'output/playwright/cloud-sky-m82-display-page-late-1004-r1'
 late=read(p1/'late-native-callback-retirement.json');assert late['before']['detached'] and late['actualDecoded']=='decoded'
 for key in ['sceneCalls','registrations','gpu','owners']:assert late['before'][key]==late['after'][key]
 assert late['after']['counter']['decodedPending']==0 and late['after']['hook']['image'] is None
 held=read(p1/'held-native-decode.json');stages=read(p1/'failed.json')['phase'];pending=next(r for r in stages if r['name']=='late-medium-decode-held-coarse');hidden=next(r for r in stages if r['name']=='late-hidden-native-decode-not-yet-terminal');shown=next(r for r in stages if r['name']=='late-show-current-medium-painted')
 assert pending['nativeCounters']['decodedPending']==hidden['nativeCounters']['decodedPending']==1
 assert pending['completedSources']['optical']['participatingFields'][0]['level']=='OVERVIEW'
 assert hidden['resources']['activeDecodedImageHandles']==hidden['resources']['gpuTextureUploadModelBytes']==0 and hidden['owners'][0]['leased']==0
 assert shown['sdssHook']['image']['objectId']!=held['id'] and shown['completedSources']['optical']['participatingFields'][0]['level']=='MEDIUM'
 p3=ROOT/'output/playwright/cloud-sky-m82-display-page-late-1004-r3';p4=ROOT/'output/playwright/cloud-sky-m82-display-page-late-1004-r4'
 before=read(p3/'auxiliary-page-recovery-observation.json');after=read(p4/'auxiliary-page-recovery-observation.json');result=read(p4/'auxiliary-explicit-retry-result.json')
 assert before['sceneState']==after['sceneState']=='READY' and before['explicitAuxiliaryRetry']=='MISSING_CURRENT_PAGE'
 assert after['availableRetryButtons'][0]['text']=='影像来源暂不可确认 · 重试'
 for p in [p3,p4]:
  fault=read(p/'auxiliary-current-source-inspect.json');assert fault['completedSources']['optical'] is None and fault['sdssHook']['renderedLevel']=='MEDIUM'
  injection=read(p/'auxiliary-fault-injection-facts.json')['faults'];assert len(injection)==1 and injection[0]['target']=='full-drawing-buffer-auxiliary'
 assert result['beforeImageId']==result['afterImageId'] and result['beforeCoarseId']==result['afterCoarseId'] and result['successfulBinaries']==2
 assert result['source']['participatingFields'][0]['image']['objectId']==result['afterImageId']
 assert (p4/'software-auxiliary-before-medium.rgba').read_bytes()==(p4/'software-auxiliary-public-retry-medium.rgba').read_bytes()
 saved={'status':'SAVED_ACTUAL_PENDING_NATIVE_RETIREMENT_AND_AUXILIARY_PUBLIC_RETRY_DEVELOPMENT','pendingDecode':'actual PNG browser decode start held, hidden owner/lease retired before native terminal; captured callback rejected; show uses current handle/no new binary','pendingLaneTerminal':'r1 later task auxiliary-null assumption timed out, no after/final; bounded callback evidence preserved, not retroactive complete epoch','escapedDefect':'before r3 actual optional full-buffer fault, current image/source UNKNOWN and no retry; after r4 actual public retry restores same images/source/current canvas; initial r2 hit ordinary-copy FBO and wrong canvas selector, task failed, not auxiliary evidence','retryPixelSha256':hashlib.sha256((p4/'software-auxiliary-public-retry-medium.rgba').read_bytes()).hexdigest(),'capturesGlPngGl':captures,'successfulAuxiliaryLanes':lanes,'ordinaryAdoption':False,'quality':'Viewed actual failed/recovered medium; existing warm/grain/green structure remains UNVERIFIED_NOT_ADOPTED','currentInventoryAdditions':read(DEV/'current-source-inventory-additions.json'),'scope':'Self readback; controlled native ports/real browser Image/software GL, actual page/controller. Disabled and policy-refusal UNKNOWN is not latched GL fault; no automatic reset or budget increase. Same-size original onResize and explicit retry only; larger-buffer fixed-budget boundary still open. Does not prove WXML/native/phones/native physical allocation/driver/CPU/RSS/all-app capacity, independent review or image quality. Prior strictBack and other failures unchanged.'}
 save(OUT/'result.json',saved);print(json.dumps({'status':saved['status'],'captures':len(captures),'finalAuxiliaryActivity':'all zero','actualPublicRetry':'same current images and source, no new binary','priorMissingRetry':'saved before fix','productScope':'Sky only'},ensure_ascii=True),flush=True)
except Exception as e:
 save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
 raise
