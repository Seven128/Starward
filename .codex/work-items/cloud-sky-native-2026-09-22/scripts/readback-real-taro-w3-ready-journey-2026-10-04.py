"""Current saved W3 owner readiness, actual surface calls, pixel pairs and retirement."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys
root=Path(__file__).resolve().parents[4]
lane=root/(sys.argv[1] if len(sys.argv)>1 else 'output/playwright/cloud-sky-real-taro-w3-ready-1004-r2')
out=root/(sys.argv[2] if len(sys.argv)>2 else 'output/sky-real-taro-w3-ready-readback-1004-r1');out.mkdir(exist_ok=False)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
try:
 frontend=read(lane/'source-bindings-before.json');assert frontend==read(lane/'source-bindings-after.json') and len(frontend)==401
 backend=read(lane/'backend-source-bindings-before.json');assert backend==read(lane/'backend-source-bindings-after.json') and len(backend)==162
 base=read(lane/'current-baseline-before.json');assert base==read(lane/'current-baseline-after.json') and len(base['currentSources'])==294 and len(base['protected'])==6
 for row in frontend+backend+base['currentSources']+base['protected']:assert bind(root/row['path'])==row,row['path']
 assets=read(lane/'public-asset-read-bindings.json')
 for row in assets['unique']:assert bind(root/row['path'])==row,row['path']
 for n in ['build','script']:
  source=root/f'.codex/work-items/cloud-sky-native-2026-09-22/scripts/{"build" if n=="build" else "experience"}-real-taro-w3-ready-journey-2026-10-04.mts'
  assert (lane/f'executed-{n}.mts').read_bytes()==source.read_bytes()
 boundary=read(lane/'observed-boundaries.json');assert any(b['path'].endswith('/use-sky-wide-field-w3.ts') for b in boundary)
 by={p['name']:p for p in read(lane/'phases.json')}
 manifest=read(root/'workers/miniapp-api/assets/deep-sky/wide-field-w3/manifest.json')
 publications={t['pixel']:t for t in manifest['tiles']}
 facts={}
 for name in ['public-w3-full-ready','public-w3-before-source','actual-source-back-w3-full-ready']:
  p=by[name];h=p['w3Hook'];assert h['wantedWide'] and h['fov']>=60 and h['sunAltitude']<=-12 and not h['loading'] and not h['failed']
  assert p['nativeCounters']['decodedPending']==0
  wanted={a['pixel']:a for a in h['wanted']};loaded={a['pixel']:a for a in h['loaded']};assert wanted.keys()==loaded.keys() and len(wanted)==6
  for pixel,a in wanted.items():assert a['sha256']==loaded[pixel]['sha256']==publications[pixel]['sha256'] and loaded[pixel]['width']==loaded[pixel]['height']==512
  images=[i for i in p['frameResources']['sourceImages'] if i['family']=='WIDE_FIELD_W3']
  assert {i['sha256'] for i in images}=={a['sha256'] for a in wanted.values()}
  assert not any(i['family']=='galactic' for i in p['frameResources']['sourceImages'])
  mesh=p['frameResources']['calls']['skyImageMesh'];assert mesh['submitted']>0
  # Surface invocation/success and source identities are not per-pixel coverage.
  assert set(i['sha256'] for i in mesh['images']).issubset(a['sha256'] for a in wanted.values())
  facts[name]={'pixels':list(wanted),'nativeDecoded':len(loaded),'surfaceCalls':mesh['count'],'surfaceSuccesses':mesh['submitted'],'surfaceImages':[i['sha256'] for i in mesh['images']]}
 pre=by['public-w3-before-source'];ret=by['actual-source-back-w3-full-ready'];source=by['actual-source-jsx-shown-sky-hidden'];final=by['unloaded-cleared']
 assert pre['scene']['at']==ret['scene']['at'] and pre['scene']['hash']==ret['scene']['hash']
 assert json.loads(pre['canvas']['data-sky-presented-view'])==json.loads(ret['canvas']['data-sky-presented-view'])
 assert pre['selection'][0]['props']['ariaLabel']==ret['selection'][0]['props']['ariaLabel']
 assert source['gpu']=={} and source['owners'][0]['leased']==0
 for key in ['activeDecodedImageHandles','sourceRgbaEquivalentBytes','gpuTextureUploadModelBytes','gpuBufferUploadModelBytes']:assert source['resources'][key]==0 and final['resources'][key]==0
 assert final['gpu']=={} and final['pendingNativeRequests']==0 and final['queries']==[] and sum(f['bytes'] for f in final['files'])==26
 for key in ['entries','leased','bytes','reserved','running','pending','retired']:assert final['owners'][0][key]==0
 events=read(lane/'native-image-owner-events.json');assert all(e['retired'] for e in events)
 nav=read(lane/'actual-navigation.json');assert nav['sourceRootRemoved'] and nav['sameCurrentSkyInstance']
 pixels={};captures={}
 for f in lane.glob('software*-pixels.json'):
  name=f.name.removesuffix('-pixels.json');info=read(f);raw=(lane/(name+'.rgba')).read_bytes();post=(lane/(name+'-after.rgba')).read_bytes();im=Image.open(lane/(name+'.png')).convert('RGBA')
  assert len(raw)==info['bytes']==1316640 and hashlib.sha256(raw).hexdigest()==info['sha256']
  assert raw==post and im.size==(390,844) and im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()==raw
  c=read(lane/(name+'-capture-boundaries.json'));assert c['beforeHash']==c['afterHash']==info['sha256']
  assert c['before']['frameResources']['sourceImages']==c['after']['frameResources']['sourceImages']
  pixels[name]=info['sha256'];captures[name]={'beforeSceneSequence':c['before']['sceneSequence'],'afterSceneSequence':c['after']['sceneSequence'],'pixelAndSourceImagesStable':True}
 assert pixels['software-w3-full-ready']!=pixels['software-wide-galactic']
 assert pixels['software-w3-before-source']==pixels['software-w3-return']
 old_lane=root/'output/playwright/cloud-sky-real-taro-w3-selected-1004-r2';old={p['name']:p for p in read(old_lane/'failed.json')['phase']}
 old_w3=old['public-eligible-w3'];old_images=[i for i in old_w3['frameResources']['sourceImages'] if i['family']=='WIDE_FIELD_W3'];assert len(old_images)==2
 assert old_w3['scene']['fov']==by['public-w3-full-ready']['scene']['fov']
 # Same production frontend, with only task diagnostics added to this lane.
 assert read(old_lane/'source-bindings-before.json')!=frontend
 prior_front=read(root/'output/playwright/cloud-sky-real-taro-w3-selected-1004-r4/source-bindings-before.json');assert prior_front==frontend
 samples=read(lane/'resource-samples.json');assert not any(s['reason']=='MIPMAP_BYTES_UNMEASURED' for s in samples)
 summary=read(lane/'resource-summary.json');assert len(samples)<=2048 and summary['observations']>=len(samples)
 model_keys=['fsLogicalBytes','gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes','pendingNativeRequests']
 encoded_keys=['bytes','entries','reserved','running','retired'];maxima={k:summary['maxima'][k] for k in model_keys+encoded_keys}
 for k in model_keys:assert summary['peakSamples'][k][k]==maxima[k] and max(s[k] for s in samples)<=maxima[k]
 for k in encoded_keys:assert summary['peakSamples'][k]['encoded'][k]==maxima[k] and max((s['encoded'] or {}).get(k,0) for s in samples)<=maxima[k]
 reqs=read(lane/'requests.json');assert not any(r.get('injected') for r in reqs)
 warm=[r for r in reqs if r['phase']=='actual-wide-source-back']
 result={'status':'SAVED_W3_FULL_READY_SOURCE_RETIREMENT_SOFTWARE_READBACK','frontendInputs':401,'backendProjectSources':162,'publicReadFiles':len(assets['unique']),'selectedSourcesExact':294,'protectedExact':6,'oldPartialImages':2,'currentWantedDecodedAndSupplied':6,'originalW3OwnerFacts':facts,'pixelHashes':pixels,'captureBoundaries':captures,'requests':len(reqs),'receivedBodyBytes':sum(r['receivedBytes'] for r in reqs),'sourceWarmBodyBytes':sum(r['receivedBytes'] for r in warm),'resourceSamples':len(samples),'separateObservedMaxima':maxima,'finalResources':final['resources'],'finalOwner':final['owners'][0],'scope':'Actual complete Taro public page/Source actions under controlled native callbacks/geometry/MapFS and software WebGL. Original W3 Hook selected/wanted/decoded/loading states diagnosed without changing behavior. Six selected tiles are not whole-sky/all-family coverage. Original surface success/source identity does not prove each pixel contribution. Source and final explicit retirement is not physical GC. Model maxima do not sum to physical peak/frame time/200DAU capacity. SCSS/WXML/native/device/quality/independent acceptance remain open; old PNG/RGBA same-frame failure remains historical.'}
 result['resourceObservationSummary']={'observations':summary['observations'],'boundedHistorySamples':len(samples),'droppedHistory':summary['droppedHistory'],'meaning':'Every model/file callback observation updates a bound peak row per metric; buffer/texture full-history rows omitted, history bounded2048. No physical memory or renderer timing claim.'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(result,ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':repr(e)},ensure_ascii=False)+'\n',encoding='utf8');raise
