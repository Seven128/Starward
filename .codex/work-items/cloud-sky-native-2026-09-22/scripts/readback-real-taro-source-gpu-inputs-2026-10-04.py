"""Saved actual GL input/readback and counterfactual verification; root self-review."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys,numpy as np
root=Path(__file__).resolve().parents[4];lane=root/sys.argv[1];replay=root/sys.argv[2];trial=root/sys.argv[3];out=root/sys.argv[4];out.mkdir(exist_ok=False)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return {'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def rgba(name,folder=lane):return (folder/(name+'.rgba')).read_bytes()
def delta(a,b):
 d=np.abs(np.frombuffer(a,dtype=np.uint8).astype(np.int16)-np.frombuffer(b,dtype=np.uint8).astype(np.int16)).reshape(-1,4)
 return {'changedPixels':int(np.count_nonzero(np.any(d,axis=1))),'changedChannels':int(np.count_nonzero(d)),'maxChannelDelta':int(d.max()),'alphaChanges':int(np.count_nonzero(d[:,3]))}
try:
 front=read(lane/'source-bindings-before.json');back=read(lane/'backend-source-bindings-before.json');base=read(lane/'current-baseline-before.json')
 assert front==read(lane/'source-bindings-after.json') and back==read(lane/'backend-source-bindings-after.json') and base==read(lane/'current-baseline-after.json')
 assert len(front)==506 and len(back)==162 and len(base['currentSources'])==319 and len(base['protected'])==6
 for row in front+back+base['currentSources']+base['protected']+read(lane/'public-asset-read-bindings.json')['unique']:assert bind(root/row['path'])==row
 assert not read(lane/'browser-errors.json') and read(lane/'result.json')['status']=='ACTUAL_TARO_SOURCE_RETURN_GPU_INPUT_DIAGNOSTIC'
 a=read(lane/'gpu-source-before.json');b=read(lane/'gpu-source-back.json');assert len(a['draws'])==len(b['draws'])==9 and a['error']==b['error']==0
 assert a['mask']==b['mask'] and a['clears']==b['clears']
 changed=[]
 for index,(x,y) in enumerate(zip(a['draws'],b['draws'])):
  for k in ['kind','args','shaderSources','blend','blendEquation','colorMask','dither','viewport']:assert x[k]==y[k],(index,k)
  assert len(x['attributes'])==len(y['attributes'])
  for xx,yy in zip(x['attributes'],y['attributes']):
   assert {k:v for k,v in xx.items() if k not in ['bufferId','file']}=={k:v for k,v in yy.items() if k not in ['bufferId','file']}
   for item in [xx,yy]:assert bind(lane/item['file'])['sha256']==item['sha256']
  differences={k:[x['uniforms'].get(k),y['uniforms'].get(k)] for k in x['uniforms'].keys()|y['uniforms'].keys() if x['uniforms'].get(k)!=y['uniforms'].get(k)}
  if differences:assert set(differences)=={'u_imageOrigin','u_imageScale'};changed.append({'draw':index,'differences':differences})
 assert [r['draw'] for r in changed]==[1,2]
 textures=[]
 for x in a['textures']:
  matches=[y for y in b['textures'] if y['source']['sha256']==x['source']['sha256']];assert len(matches)==1;y=matches[0]
  for t in [x,y]:assert bind(lane/t['file'])['sha256']==t['sha256'] and t['bytes']==t['width']*t['height']*4
  ax,ay=x['origin']['x'],x['origin']['y'];bx,by=y['origin']['x'],y['origin']['y'];left=max(ax,bx);top=max(ay,by);right=min(ax+x['width'],bx+y['width']);bottom=min(ay+x['height'],by+y['height']);assert right>left and bottom>top
  xx=np.frombuffer((lane/x['file']).read_bytes(),dtype=np.uint8).reshape(x['height'],x['width'],4);yy=np.frombuffer((lane/y['file']).read_bytes(),dtype=np.uint8).reshape(y['height'],y['width'],4)
  assert np.array_equal(xx[top-ay:bottom-ay,left-ax:right-ax],yy[top-by:bottom-by,left-bx:right-bx])
  textures.append({'sourceEncodedSha256':x['source']['sha256'],'beforeWindow':[ax,ay,x['width'],x['height']],'afterWindow':[bx,by,y['width'],y['height']],'actualUploadedOverlapExact':True})
 assert len(textures)==6
 captures=[p.name.removesuffix('-pixels.json') for p in lane.glob('*-pixels.json')]
 for name in captures:
  raw=rgba(name);assert raw==rgba(name+'-after')==Image.open(lane/(name+'.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes();info=read(lane/(name+'-pixels.json'));assert hashlib.sha256(raw).hexdigest()==info['sha256']
 observed=delta(rgba('software-follow-source-before'),rgba('software-follow-source-back'));assert observed=={'changedPixels':4,'changedChannels':4,'maxChannelDelta':1,'alphaChanges':0}
 rep=read(replay/'result.json');assert rep['status']=='SAVED_ACTUAL_GL_INPUT_REPLAY_AND_WINDOW_COUNTERFACTUAL'
 for row in rep['inputs']:assert bind(root/row['path'])==row
 assert rgba('saved-before',replay)==rgba('software-follow-source-before') and rgba('saved-after',replay)==rgba('software-follow-source-back')
 assert rgba('after-old-galactic',replay)==rgba('saved-before',replay)==rgba('after-old-both',replay)
 assert rgba('after-old-art',replay)==rgba('saved-after',replay)
 candidate=read(trial/'result.json');assert candidate['status']=='SAVED_ACTUAL_GL_SOURCE_PIXEL_COORDINATE_TRIAL'
 trial_delta=delta(rgba('pixelspace-before',trial),rgba('pixelspace-after',trial));assert trial_delta['changedChannels']==1 and trial_delta['maxChannelDelta']==1
 history={r['name']:r for r in read(lane/'phases.json')};before=history['combined-follow-source-before'];after=history['combined-follow-source-back-held'];assert before['frameResources']['geometry']==after['frameResources']['geometry'] and before['canvas']['data-sky-presented-view']==after['canvas']['data-sky-presented-view']
 assert before['resources']['gpuTextureUploadModelBytes']==sum(t['bytes'] for t in a['textures'])==6176768
 assert after['resources']['gpuTextureUploadModelBytes']==sum(t['bytes'] for t in b['textures'])==2150400
 for name in ['combined-follow-source-retired','combined-return-original-map-latest-time','unloaded-cleared']:
  r=history[name];assert sum(r['gpu'].values())==0 and r['resources']['activeDecodedImageHandles']==r['resources']['gpuTextureUploadModelBytes']==r['resources']['gpuBufferUploadModelBytes']==0 and r['pendingNativeRequests']==0
  assert all(o['leased']==o['running']==o['pending']==o['reserved']==0 for o in r['owners'])
 final=history['unloaded-cleared'];assert sum(r['bytes'] for r in final['files'])==26 and all(final['owners'][0][k]==0 for k in ['entries','leased','bytes','reserved','running','pending','retired'])
 resource=read(lane/'resource-summary.json');assert resource['maxima']['gpuTextureUploadModelBytes']==19398656
 first=root/'output/playwright/cloud-sky-real-taro-source-gpu-inputs-1004-r1';empty=[read(first/n) for n in ['gpu-source-before.json','gpu-source-back.json']];assert all(not x['draws'] for x in empty)
 requests=read(lane/'requests.json');result={'status':'SAVED_ACTUAL_SOURCE_RETURN_INPUT_CAUSE_AND_COPY_ALLOCATION_DEVELOPMENT','front':506,'backendProject':162,'baselineSources':319,'protectedExact':6,'uniformWindowDifferences':changed,'textures':textures,'actualMaskSamplesExact':True,'drawBufferBytesAndShadersExact':True,'rawSourceBack':'FAILED_RETAINED','rawDelta':observed,'exactSavedCommandReplay':True,'galacticWindowOnlyRemovesDifference':True,'artworkWindowOnlyDoesNotRemoveDifference':True,'pixelCoordinateTrial':'REJECTED_FOR_ADOPTION','pixelCoordinateTrialDelta':trial_delta,'sampledTextureAllocationBefore':6176768,'sampledTextureAllocationAfter':2150400,'correctedTexturePeak':19398656,'separateObservedMaxima':resource['maxima'],'resourceObservations':resource['observations'],'requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),'unknownReceived':sum('receivedBytes' not in r for r in requests),'diagnosticFirstEpoch':'normal task exit but incomplete recorder reset at navigation scissor clear; draws0 cannot prove inputs','oldTextureModelLimitation':'Earlier task GPU texImage2D counters omit copyTexImage2D allocations; archived maxima are incomplete for texture residency/transient total, cannot be corrected retroactively without recorded live-copy events. Pressure budgets unchanged.','finalActivity':'same diagnostic epoch final native/GL/encoded/lease/queue zero, controlledFS26B','scope':'Root saved self-review. This actual software GL epoch only: historical2/9 failures cannot be reattributed. Window substitution is diagnostic; no forced history policy, tolerance, scalar clamp or production sampling adoption. No native WXML/red-light/physical memory/full quality/capacity or overall Goal proof.'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());print(json.dumps({k:v for k,v in result.items() if k not in ['textures','uniformWindowDifferences']},ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':str(e),'type':type(e).__name__},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());raise
