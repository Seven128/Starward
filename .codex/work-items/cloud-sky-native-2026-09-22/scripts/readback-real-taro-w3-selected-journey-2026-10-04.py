"""Saved actual page W3/selected optical receipts and pixels, not a runtime replay."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys
root=Path(__file__).resolve().parents[4]
lane=root/(sys.argv[1] if len(sys.argv)>1 else 'output/playwright/cloud-sky-real-taro-w3-selected-1004-r4')
out=root/(sys.argv[2] if len(sys.argv)>2 else 'output/sky-real-taro-w3-selected-readback-1004-r1');out.mkdir(exist_ok=False)
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
try:
 frontend=read(lane/'source-bindings-before.json');assert frontend==read(lane/'source-bindings-after.json') and len(frontend)==401
 backend=read(lane/'backend-source-bindings-before.json');assert backend==read(lane/'backend-source-bindings-after.json') and len(backend)==162
 base=read(lane/'current-baseline-before.json');assert base==read(lane/'current-baseline-after.json') and len(base['currentSources'])==294 and len(base['protected'])==6
 reader_path=Path(__file__).resolve().relative_to(root).as_posix()
 reader_old=next(r for r in base['currentSources'] if r['path']==reader_path)
 reader_archive=lane/'readback-before-w3-pair-scope.py'
 assert reader_archive.stat().st_size==reader_old['bytes'] and hashlib.sha256(reader_archive.read_bytes()).hexdigest()==reader_old['sha256']
 for row in frontend+backend+base['currentSources']+base['protected']:
  if row['path']!=reader_path:assert bind(root/row['path'])==row,row['path']
 assets=read(lane/'public-asset-read-bindings.json')
 for row in assets['unique']:assert bind(root/row['path'])==row,row['path']
 if (lane/'reused-bundle-origin.json').exists():
  for row in read(lane/'reused-bundle-origin.json'):
   normalized={**row,'path':row['path'].replace('\\','/')};assert bind(root/normalized['path'])==normalized
 assert (lane/'executed-script.mts').read_bytes()==(root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-real-taro-w3-selected-journey-2026-10-04.mts').read_bytes()
 assert (lane/'executed-build.mts').read_bytes()==(root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-real-taro-w3-selected-journey-2026-10-04.mts').read_bytes()
 by={p['name']:p for p in read(lane/'phases.json')}
 wide_lane=root/'output/playwright/cloud-sky-real-taro-w3-selected-1004-r2'
 wide_failed=read(wide_lane/'failed.json');assert 'hideKeyboard is not a function' in wide_failed['error']
 old_front=read(wide_lane/'source-bindings-before.json');new_front={r['path']:r for r in frontend}
 changed=[r for r in old_front if r!=new_front[r['path']]]
 assert len(changed)==1 and changed[0]['path']=='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'
 archived=root/'output/playwright/cloud-sky-real-taro-w3-selected-1004-r3/spot-sky-page-before-native-retirement.tsx'
 assert archived.stat().st_size==changed[0]['bytes'] and hashlib.sha256(archived.read_bytes()).hexdigest()==changed[0]['sha256']
 assert read(wide_lane/'backend-source-bindings-before.json')==backend
 old_base=read(wide_lane/'current-baseline-before.json');assert old_base['protected']==base['protected']
 now={r['path']:r for r in base['currentSources']}
 delta=[r['path'] for r in old_base['currentSources'] if r!=now[r['path']]]
 assert set(delta)=={'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx','.codex/work-items/cloud-sky-native-2026-09-22/scripts/capture-current-execution-2026-10-03.ps1'}
 for row in read(wide_lane/'reused-bundle-origin.json'):
  normalized={**row,'path':row['path'].replace('\\','/')};assert bind(root/normalized['path'])==normalized
 wide_by={p['name']:p for p in wide_failed['phase']}
 by.update({name:wide_by[name] for name in ['public-widefield-galactic','public-eligible-w3','public-galactic-before-search','public-local-before-search']})
 gal=by['public-widefield-galactic'];w3=by['public-eligible-w3']
 assert gal['scene']['fov']>=60 and w3['scene']['at']==gal['scene']['at']
 assert json.loads(gal['canvas']['data-sky-presented-view'])==json.loads(w3['canvas']['data-sky-presented-view'])
 assert any(i['family']=='galactic' for i in gal['frameResources']['sourceImages'])
 tiles=[i for i in w3['frameResources']['sourceImages'] if i['family']=='WIDE_FIELD_W3'];assert tiles
 assert not any(i['family']=='galactic' for i in w3['frameResources']['sourceImages'])
 manifest=read(root/'workers/miniapp-api/assets/deep-sky/wide-field-w3/manifest.json')
 for tile in tiles:assert tile['sha256'] in [t['sha256'] for t in manifest['tiles']]
 w3_ids={t['objectId'] for t in tiles}
 # In this partial W3 lane, withdrawal is observed in current active image rows,
 # not a final/unregister/GC claim. Selected-only final below owns its own lane.
 for name in ['public-galactic-before-search','public-local-before-search']:
  assert not any(i['family']=='WIDE_FIELD_W3' for i in by[name]['frameResources']['sourceImages'])
  assert not any(i['objectId'] in w3_ids for i in by[name]['resources']['decodedSourceIdentities'])
 phases=['public-optical-medium','public-optical-detail-failed-coarse','public-optical-detail-retry','public-m51-before-source','actual-source-back-m51-detail']
 for name in phases:assert by[name]['completedSources']['optical']['reference']=='M:51'
 medium=by[phases[0]]['completedSources']['optical'];failed=by[phases[1]]['completedSources']['optical'];fine=by[phases[2]]['completedSources']['optical']
 assert medium['field']['level']==failed['field']['level']=='MEDIUM' and fine['field']['level']=='DETAIL'
 assert medium['field']['image']['sha256']==failed['field']['image']['sha256']
 sm=read(root/'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json')
 for field in [medium['field'],failed['field'],fine['field']]:
  level=sm['levels'][field['level']];assert field['image']['sha256']==level['sha256'] and field['fieldDegrees']==level['fieldDegrees']
 assert by[phases[1]]['scene']['fov']==.05 and by[phases[2]]['scene']['fov']==.05
 assert '影像更新失败，保留已载图' in by[phases[1]]['text']
 source=by['actual-source-jsx-shown-sky-hidden'];returned=by['actual-source-back-m51-detail'];before=by['public-m51-before-source'];final=by['unloaded-cleared']
 assert source['resources']['activeDecodedImageHandles']==0 and source['resources']['sourceRgbaEquivalentBytes']==0 and source['owners'][0]['leased']==0 and source['gpu']=={}
 assert returned['scene']['at']==before['scene']['at'] and returned['scene']['hash']==before['scene']['hash']
 assert json.loads(returned['canvas']['data-sky-presented-view'])==json.loads(before['canvas']['data-sky-presented-view'])
 navigation=read(lane/'actual-navigation.json');assert navigation['sameCurrentSkyInstance'] and navigation['sourceRootRemoved']
 pixelhashes={};pixel_pair_failures=[]
 for f in list(lane.glob('software*-pixels.json'))+list(wide_lane.glob('software*-pixels.json')):
  pixel_lane=f.parent
  name=f.name.removesuffix('-pixels.json');info=read(f)
  raw=(pixel_lane/(name+'.rgba')).read_bytes();im=Image.open(pixel_lane/(name+'.png')).convert('RGBA')
  assert len(raw)==info['bytes']==1316640 and hashlib.sha256(raw).hexdigest()==info['sha256']
  assert im.size==(390,844)
  if im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()!=raw:
   assert f.parent==wide_lane and name=='software-wide-w3'
   pixel_pair_failures.append({'lane':f.parent.relative_to(root).as_posix(),'name':name,'status':'FAILED_PNG_RGBA_SAME_FRAME_BINDING','scope':'Partial W3 lane output changed between separate raw/screenshot captures; no same-frame or complete-W3 acceptance.'})
  pixelhashes[name]=info['sha256']
 assert pixelhashes['software-wide-w3']!=pixelhashes['software-wide-galactic']
 assert pixelhashes['software-m51-failed-fine-coarse']!=pixelhashes['software-m51-detail']
 assert pixelhashes['software-m51-before-source']==pixelhashes['software-m51-return']
 requests=read(lane/'requests.json');injected=[r for r in requests if r.get('injected')];assert len(injected)==1 and injected[0]['status']==503
 retries=[r for r in requests if r['route']==injected[0]['route'] and not r.get('injected')];assert retries and all(r['status']==200 for r in retries)
 assert final['gpu']=={} and final['pendingNativeRequests']==0 and final['queries']==[]
 assert sum(f['bytes'] for f in final['files'])==26
 for key in ['entries','leased','bytes','reserved','running','pending','retired']:assert final['owners'][0][key]==0
 for key in ['gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes']:assert final['resources'][key]==0
 events=read(lane/'native-image-owner-events.json');assert events and all(e['retired'] for e in events)
 samples=read(lane/'resource-samples.json');assert not any(s['reason']=='MIPMAP_BYTES_UNMEASURED' for s in samples)
 maxima={k:max(s[k] for s in samples) for k in ['fsLogicalBytes','gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes','pendingNativeRequests']}
 maxima.update({k:max((s['encoded'] or {}).get(k,0) for s in samples) for k in ['bytes','entries','reserved','running','retired']})
 result={'status':'SAVED_ACTUAL_W3_SELECTED_OPTICAL_READBACK','frontendInputs':401,'backendProjectSources':162,'publicReadFiles':len(assets['unique']),'selectedSourceEpochExact':294,'protectedExact':6,'wideFov':w3['scene']['fov'],'w3Tiles':len(tiles),'wideScope':'Separate r2 completed W3 frames/withdrawal from a later task-port-failed lane, archived pre-retirement page. No W3 final/unregister/GC acceptance. r4 is selected-only and owns its normal Source/final retirement.','mediumAndFailedCoarse':medium['field']['image']['sha256'],'detail':fine['field']['image']['sha256'],'injectedFailures':injected,'requests':len(requests),'actualReceivedBodyBytes':sum(r['receivedBytes'] for r in requests if not r.get('injected')),'resourceSamples':len(samples),'separateObservedMaxima':maxima,'pixelHashes':pixelhashes,'finalResources':final['resources'],'finalOwner':final['owners'][0],'scope':'Root saved self-review of actual public page controls and original completion receipts/software pixels. One controlled transport503 at local boundary, not actual weak-network or production server failure. Controlled native geometry/callbacks/MapFS, SCSS uncomposed, upload/sourceRGBA/encoded quantities separate, no GC/native/physical/all-family/frame-time/capacity/quality/independent acceptance.'}
 result['status']='SAVED_SELECTED_OPTICAL_RETIREMENT_READBACK_WITH_W3_PIXEL_PAIR_FAILED'
 result['selectedSourceEpochExact']=293
 result['readbackOnlyTransition']={'before':reader_old,'after':bind(Path(__file__).resolve()),'archive':bind(reader_archive),'reason':'Corrected saved reader scope: known partial W3 PNG/RGBA mismatch remains FAILED, selected-only r4 pixel pairs stay strict.'}
 result['widePixelPairs']=pixel_pair_failures
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(result,ensure_ascii=False))
except Exception as e:
 (out/'failed.json').write_text(json.dumps({'error':repr(e)},ensure_ascii=False)+'\n',encoding='utf8');raise
