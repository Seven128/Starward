"""Saved actual page buffer resize and fixed-policy refusal; no browser/HTTP replay."""
from pathlib import Path
import json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
LANE=ROOT/'output/playwright/cloud-sky-m82-display-page-buffer-1004-r2'
OUT=ROOT/'output/sdss-m82-display-page-buffer-readback-1004-r1'
OUT.mkdir(exist_ok=False)
def read(p):return json.loads(Path(p).read_bytes())
def bind(p):
 p=Path(p);return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
def save(p,v):
 with p.open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def required(w,h):
 signal=w*h*4;chain=[]
 while w>1 or h>1:
  w=(w+3)//4;h=(h+3)//4;chain.append({'width':w,'height':h,'bytes':w*h*4})
 return {'signal':signal,'scratch':chain,'requiredBytes':signal+sum(r['bytes'] for r in chain)}
(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
try:
 for name in ['source-bindings','backend-source-bindings','current-baseline']:
  assert read(LANE/(name+'-before.json'))==read(LANE/(name+'-after.json'))
 for row in read(LANE/'source-bindings-before.json')+read(LANE/'backend-source-bindings-before.json')+read(LANE/'public-asset-read-bindings.json')['unique']:
  assert bind(ROOT/row['path'])==row,row['path']
 before=read(LANE/'drawing-buffer-before.json');large=read(LANE/'drawing-buffer-larger.json');ordinary=read(LANE/'drawing-buffer-refusal-after-ordinary-frames.json');after=read(LANE/'drawing-buffer-recovered.json')
 assert (before['width'],before['height'])==(after['width'],after['height'])==(390,844)
 assert (large['width'],large['height'])==(ordinary['width'],ordinary['height'])==(1560,3376)
 assert before['skyInstance']==large['skyInstance']==after['skyInstance']
 assert large['policy']=={'auxiliaryBytesLimit':15803512,'maxGroups':1,'basis':'Unchanged explicit caller in byte-bound build; current page freezes per instance'}
 small=required(390,844);big=required(1560,3376)
 assert small['requiredBytes']==1405080 and big['requiredBytes']==22471320
 assert small['requiredBytes']<large['policy']['auxiliaryBytesLimit']<big['requiredBytes']
 assert large['logicalRgbaEquivalentBytes']==big['signal']==21066240
 assert large['currentImage']['status']=='decoded' and large['currentSource'] is None
 assert large['drawCalls']['artworkLevels']['submitted']==1
 assert large['drawCalls']['artworkLevelsQualification']['lastResult']=={'fine':'unknown','coarse':'unknown','any':'unknown'}
 assert large['drawCalls']['artworkLevelsContribution']['lastResult']['completed'] is False
 assert all(r['width']!=1560 or r['height']!=3376 for r in ordinary['auxiliaryAllocations'])
 assert len(after['auxiliaryAllocations'])==2 and all((r['width'],r['height'])==(390,844) for r in after['auxiliaryAllocations'])
 assert all(p['error']==0 for p in large['sourceSamples'])
 phases={r['name']:r for r in read(LANE/'phases.json')}
 for name in ['buffer-fixed-policy-large-unknown','buffer-large-ordinary-grid-frame','buffer-large-ordinary-return-frame']:
  p=phases[name];assert p['completedSources']['optical'] is None and p['canvas']['data-sky-scene-state']=='READY'
  assert not p['gpu'].get('framebuffer',0), 'refused policy must retain no scratch/signal FBO'
  assert not any(n['text']=='影像来源暂不可确认 · 重试' for n in p['buttons'])
 recovered=phases['buffer-smaller-current-source-recovered'];base=phases['buffer-base-current-medium']
 assert recovered['observationContext']==base['observationContext'] and recovered['sdssHook']['image']['objectId']!=base['sdssHook']['image']['objectId']
 assert recovered['completedSources']['optical']['participatingFields'][0]['sha256']==large['currentImage']['sha256']
 requests=read(LANE/'requests.json');optical=[r for r in requests if r['binary'] and '/sky/sdss-optical/' in r['route'] and r['status']==200]
 assert len(optical)==2 and sum(r['receivedBytes'] for r in optical)==1122957
 captures=[]
 for name in ['software-buffer-before-medium','software-buffer-recovered-medium']:
  raw=(LANE/(name+'.rgba')).read_bytes();assert raw==(LANE/(name+'-after.rgba')).read_bytes()==Image.open(LANE/(name+'.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
  b=read(LANE/(name+'-capture-boundaries.json'));assert b['beforeHash']==b['afterHash']==hashlib.sha256(raw).hexdigest()
  captures.append(bind(LANE/(name+'.rgba')))
 assert (LANE/'software-buffer-before-medium.rgba').read_bytes()==(LANE/'software-buffer-recovered-medium.rgba').read_bytes()
 final=phases['unloaded-cleared'];assert not final['gpu'] and final['pendingNativeRequests']==0
 assert all(final['owners'][0][k]==0 for k in ['entries','bytes','leased','reserved','running','pending','retired'])
 assert all(final['resources'][k]==0 for k in ['gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes'])
 result={'status':'SAVED_ACTUAL_PAGE_FIXED_POLICY_BUFFER_REFUSAL_AND_RECOVERY','frontend':len(read(LANE/'source-bindings-before.json')),'backend':len(read(LANE/'backend-source-bindings-before.json')),'publicReadBindings':len(read(LANE/'public-asset-read-bindings.json')['unique']),'requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),'successfulDisplayBytes':1122957,'sameSkyInstance':True,'smallRequired':small,'largeRequired':big,'fixedAuxiliaryPolicy':large['policy'],'largeAuxiliaryAllocationCount':0,'ordinaryLargeFramesHaveNoAuxiliaryFbo':True,'largeDrawingBufferRgbaEquivalentBytes':21066240,'largeSource':'UNKNOWN_NOT_GL_FAULT_CURRENT_IMAGE_ACTUALLY_SUBMITTED','currentSourceRecoveredAtFittingSize':True,'captures':captures,'fittingBeforeAfterPixelsExact':True,'resourceSummary':read(LANE/'resource-summary.json'),'finalActiveAndEncoded':'all zero','productModified':False,'ordinaryAdoption':False,'priorFailures':'First parser variable after collided before program; first actual lane task queried page-only getter outside Scene proxy and failed; no after/final in that lane','scope':'Actual page native node setters and original onResize consume controlled DPR1-4-1 in softwareGL; all product input bytes unchanged. Larger buffer sampled at five core pixels, no full large capture or native-device claim. Backbuffer RGBA equivalent is independent of image texture/upload/copy and auxiliary policy, not driver/AA/depth/multiple-buffer allocation or physical total. SCSS/WXML/phones/quality/retention/200DAU/independent review and prior failures open.'}
 save(OUT/'result.json',result);print(json.dumps({k:v for k,v in result.items() if k not in ['resourceSummary','captures','smallRequired','largeRequired']},ensure_ascii=True),flush=True)
except Exception as e:
 save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
 raise
