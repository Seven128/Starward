"""Bind saved native decode/window outputs and explicit diagnostic counterfactual."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys,numpy as np
root=Path(__file__).resolve().parents[4];lane=root/sys.argv[1];out=root/sys.argv[2];out.mkdir(exist_ok=False)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def delta(a,b):
 d=b.astype(np.int16)-a.astype(np.int16);where=np.argwhere(np.any(d!=0,axis=2))
 return {'changedPixels':len(where),'changedChannels':int(np.count_nonzero(d)),'maxAbsoluteChannelDelta':int(np.max(abs(d))),'totalAbsoluteDelta':int(abs(d).sum()),'pixelRows':[{'x':int(x),'yTop':843-int(y),'before':a[y,x].tolist(),'after':b[y,x].tolist()} for y,x in where[:100]],'truncated':len(where)>100}
try:
 frontend=read(lane/'source-bindings-before.json');assert frontend==read(lane/'source-bindings-after.json') and len(frontend)==401
 backend=read(lane/'backend-source-bindings-before.json');assert backend==read(lane/'backend-source-bindings-after.json') and len(backend)==162
 base=read(lane/'current-baseline-before.json');assert base==read(lane/'current-baseline-after.json') and len(base['currentSources'])==300 and len(base['protected'])==6
 for row in frontend+backend+base['currentSources']+base['protected']:assert bind(root/row['path'])==row,row['path']
 assert frontend==read(root/'output/playwright/cloud-sky-real-taro-horizontal-interruption-1004-r1/source-bindings-before.json')
 for kind in ['build','script']:
  p=root/f'.codex/work-items/cloud-sky-native-2026-09-22/scripts/{"build" if kind=="build" else "experience"}-real-taro-texture-window-return-2026-10-04.mts'
  assert p.read_bytes()==(lane/f'executed-{kind}.mts').read_bytes()
 boundary=read(lane/'observed-boundaries.json');assert any(r['path'].endswith('/sky-gpu-textures.ts') for r in boundary)
 assets=read(lane/'public-asset-read-bindings.json')
 for row in assets['unique']:assert bind(root/row['path'])==row,row['path']
 by={p['name']:p for p in read(lane/'phases.json')}
 names=['natural-before-hide','natural-return-fresh','counterfactual-old-windows','natural-restored-fresh']
 pictures=['software-natural-before','software-natural-return','software-frozen-window-return','software-natural-restored']
 raw={};hashes={}
 for n in ['software-cold']+pictures:
  info=read(lane/(n+'-pixels.json'));data=(lane/(n+'.rgba')).read_bytes();post=(lane/(n+'-after.rgba')).read_bytes();im=Image.open(lane/(n+'.png')).convert('RGBA');assert data==post==im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
  assert len(data)==info['bytes']==1316640 and hashlib.sha256(data).hexdigest()==info['sha256'];raw[n]=np.frombuffer(data,dtype=np.uint8).reshape(844,390,4);hashes[n]=info['sha256']
 for n in names[1:]:
  assert by[n]['scene']['at']==by[names[0]]['scene']['at']
  assert json.loads(by[n]['canvas']['data-sky-presented-view'])==json.loads(by[names[0]]['canvas']['data-sky-presented-view'])
  assert by[n]['frameResources']['grids']==by[names[0]]['frameResources']['grids']
  assert by[n]['nativeCounters']['decodedPending']==0 and by[n]['pendingNativeRequests']==0
 for n in pictures[1:]:assert read(lane/(n+'-paint.json'))==read(lane/(pictures[0]+'-paint.json'))
 decoded={n:read(lane/(n+'-decoded-windows.json')) for n in names}
 def identity(rows):return [{k:v for k,v in r.items() if k not in ['objectId','window']} for r in rows]
 for n in names[1:]:assert identity(decoded[n])==identity(decoded[names[0]])
 before={r['sha256']:r for r in decoded[names[0]]};returned={r['sha256']:r for r in decoded[names[1]]};frozen={r['sha256']:r for r in decoded[names[2]]};restored={r['sha256']:r for r in decoded[names[3]]}
 windows=[]
 for sha,a in before.items():
  if not a['window'] or not a['window']['available']:continue
  b=returned[sha];c=frozen[sha];d=restored[sha];assert all(v['window']['available'] for v in [b,c,d])
  assert not a['window']['counterfactual'] and not b['window']['counterfactual'] and c['window']['counterfactual'] and not d['window']['counterfactual']
  assert c['window']['effective']==c['window']['resident']==a['window']['resident']
  assert d['window']['resident']==b['window']['resident']
  windows.append({'family':a['family'],'sourceSha256':sha,'decodedRgbaSha256':a['decodedRgba']['sha256'],'before':a['window']['resident'],'return':b['window']['resident'],'frozen':c['window']['resident'],'restored':d['window']['resident'],'naturalWindowChanged':a['window']['resident']!=b['window']['resident']})
 differences={'beforeToNatural':delta(raw[pictures[0]],raw[pictures[1]]),'beforeToFrozen':delta(raw[pictures[0]],raw[pictures[2]]),'naturalToRestored':delta(raw[pictures[1]],raw[pictures[3]])}
 explained=differences['beforeToNatural']['changedPixels']>0 and differences['beforeToFrozen']['changedPixels']==0 and differences['naturalToRestored']['changedPixels']==0 and any(r['naturalWindowChanged'] for r in windows)
 final=by['unloaded-cleared'];assert final['gpu']=={} and final['resources']['activeDecodedImageHandles']==0 and sum(f['bytes'] for f in final['files'])==26
 for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert final['owners'][0][k]==0
 assert all(r['retired'] for r in read(lane/'native-image-owner-events.json'))
 req=read(lane/'requests.json');assert not any(r.get('injected') for r in req)
 summary=read(lane/'resource-summary.json');assert len(read(lane/'resource-samples.json'))<=2048
 result={'status':'SAVED_TEXTURE_WINDOW_HISTORY_DIFFERENTIAL_EXPLAINED' if explained else 'SAVED_TEXTURE_WINDOW_RETURN_DIAGNOSIS_INCONCLUSIVE','frontendInputs':401,'backendProjectSources':162,'selectedSourcesExact':300,'protectedExact':6,'publicReadFiles':len(assets['unique']),'decodedSourcesSame':True,'cameraTimePaintSnapshotSame':True,'windows':windows,'pixelHashes':hashes,'pixelDifferences':differences,'diagnosticCounterfactual':{'adopted':False,'meaning':'Task-only original getWindow legal requests replay old resident windows per original SHA; grid on/off triggers ordinary drawing. Return to ordinary policy re-hides/shows fresh native objects. No production cache or upload policy change.'},'olderHorizontalNinePixelFailure':'RETAINED; this short view is a new causal mechanism probe, not a binding of the old window state nor old exact-pixel pass','requests':len(req),'receivedBodyBytes':sum(r['receivedBytes'] for r in req),'separateObservedMaxima':summary['maxima'],'scope':'Native decode hashes via actual HTMLImage drawImage/readback and original contracts SHA; task 2D/hash work adds diagnostic transients not production memory. Original getWindow calls/results bound with explicit counterfactual. SoftwareGL not native/device/physical/quality/performance/independent acceptance; no product logic change.'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(result,ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':repr(e)},ensure_ascii=False)+'\n',encoding='utf8');raise
