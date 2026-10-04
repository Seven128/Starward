"""Saved public layers/time/tracking and resource facts; no runtime replay."""
from pathlib import Path
import json,hashlib,math
from PIL import Image
ROOT=Path(__file__).resolve().parents[4];LANE=ROOT/'output/playwright/cloud-sky-real-taro-layer-time-1004-r3';OUT=ROOT/'output/sky-real-taro-layer-time-readback-1004-r1';OUT.mkdir(exist_ok=False)
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
def stamp(s):
 from datetime import datetime
 return datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
try:
 rows=read(LANE/'source-bindings-before.json');assert rows==read(LANE/'source-bindings-after.json') and len(rows)==401
 for r in rows:assert bind(ROOT/r['path'])==r,r['path']
 backend=read(LANE/'backend-source-bindings-before.json');assert backend==read(LANE/'backend-source-bindings-after.json') and len(backend)==162
 for r in backend:assert bind(ROOT/r['path'])==r,r['path']
 assets=read(LANE/'public-asset-read-bindings.json')
 for r in assets['unique']:assert bind(ROOT/r['path'])==r,r['path']
 base=read(LANE/'current-baseline-before.json');assert base==read(LANE/'current-baseline-after.json') and len(base['currentSources'])==287 and len(base['protected'])==6
 for r in base['currentSources']+base['protected']:assert bind(ROOT/r['path'])==r,r['path']
 assert (LANE/'executed-script.mts').read_bytes()==(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-real-taro-layer-time-journey-2026-10-04.mts').read_bytes()
 reused=read(LANE/'reused-bundle-origin.json')
 for r in reused:assert bind(ROOT/r['path'])==r,r['path']
 old=ROOT/'output/playwright/cloud-sky-real-taro-layer-time-1004-r1'
 pre=read(old/'horizontal-grid-public-label.json');post=read(LANE/'horizontal-grid-public-label.json')
 assert pre['props']['aria-label']=='关闭地平坐标网格，保留地平线'
 assert post['props']['aria-label']=='关闭地平坐标网格与地平线'
 original=(old/'spot-sky-page-before.tsx').read_bytes();current=(ROOT/'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx').read_bytes()
 assert current==original.replace('关闭地平坐标网格，保留地平线'.encode(),'关闭地平坐标网格与地平线'.encode())
 old_page=next(r for r in read(old/'source-bindings-before.json') if r['path'].endswith('/spot-sky-page.tsx'))
 assert hashlib.sha256(original).hexdigest()==old_page['sha256']
 phases=read(LANE/'phases.json');by={p['name']:p for p in phases}
 on=by['public-grids-on'];off=by['public-grids-off'];cold=by['complete-jsx-cold-painted'];restored=by['public-layers-restored']
 assert on['frameResources']['grids']==dict(horizontal=True,equatorial=True) and off['frameResources']['grids']==dict(horizontal=False,equatorial=False)
 assert by['public-landscape-off']['frameResources']['mask'] is None and by['public-constellations-off']['frameResources']['constellationEnabled'] is False
 assert by['public-constellations-off']['resources']['activeDecodedImageHandles']<off['resources']['activeDecodedImageHandles']
 names=['software-cold','software-grids-on','software-grids-off','software-w3-on','software-layer-restore','software-time-paused','software-tracked-before-source','software-return'];pixels={}
 for name in names:
  f=read(LANE/(name+'-pixels.json'));raw=(LANE/(name+'.rgba')).read_bytes();im=Image.open(LANE/(name+'.png')).convert('RGBA')
  assert len(raw)==f['bytes']==1316640 and hashlib.sha256(raw).hexdigest()==f['sha256']
  assert im.size==(390,844) and im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()==raw;pixels[name]=f['sha256']
 assert pixels['software-grids-on']!=pixels['software-grids-off']
 assert pixels['software-cold']==pixels['software-layer-restore']
 assert pixels['software-tracked-before-source']==pixels['software-return']
 track=by['public-track-located'];playing=by['public-time-playing-tracked'];paused=by['public-time-paused'];cancel=by['public-time-cancelled'];commit=by['public-time-committed'];source=by['actual-source-jsx-shown-sky-hidden'];returned=by['actual-source-back-sky-painted-selection-restored'];final=by['unloaded-cleared']
 assert '跟踪中' in playing['text'] and '跟踪中' in returned['text'] and '停止跟踪' not in by['public-tracking-stopped']['text']
 assert stamp(playing['scene']['at'])-stamp(track['scene']['at'])>1.2 and stamp(paused['scene']['at'])>stamp(track['scene']['at'])
 assert stamp(cancel['scene']['at'])==stamp(track['scene']['at'])
 assert stamp(commit['scene']['at'])==stamp(by['public-time-second-paused']['scene']['at'])
 context=read(LANE/'committed-time-context.json');assert stamp(context['selectedAtUtc'])==stamp(commit['scene']['at'])
 views={name:json.loads(by[name]['canvas']['data-sky-presented-view']) for name in ['public-track-located','public-time-paused','public-time-cancelled','public-time-committed','public-tracked-committed-before-source','actual-source-back-sky-painted-selection-restored']}
 assert views['public-track-located']['basis']!=views['public-time-paused']['basis']
 assert views['public-track-located']==views['public-time-cancelled']
 assert views['public-tracked-committed-before-source']==views['actual-source-back-sky-painted-selection-restored']
 for name in ['software-time-paused','software-tracked-before-source','software-return']:
  paint=read(LANE/(name+'-paint.json'));obj=next(o for o in paint['objects'] if o['reference']=='HR:8162')
  assert abs(obj['x']-paint['view']['center']['x'])<1e-6 and abs(obj['y']-paint['view']['center']['y'])<1e-6
 assert source['resources']['activeDecodedImageHandles']==0 and source['resources']['sourceRgbaEquivalentBytes']==0 and source['owners'][0]['leased']==0 and source['gpu']=={}
 assert final['logicalNodes']==0 and final['queries']==[] and final['gpu']=={} and final['pendingNativeRequests']==0
 for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert final['owners'][0][k]==0
 for k in ['gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes']:assert final['resources'][k]==0
 assert len(final['files'])==1 and final['files'][0]['bytes']==26
 assert all(r['retired'] for r in read(LANE/'native-image-owner-events.json'))
 navigation=read(LANE/'actual-navigation.json');assert navigation['sourceRootRemoved'] and navigation['sameCurrentSkyInstance']
 samples=read(LANE/'resource-samples.json');assert samples and not any(r['reason']=='MIPMAP_BYTES_UNMEASURED' for r in samples)
 maxima={k:max(r[k] for r in samples) for k in ['fsLogicalBytes','gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes','pendingNativeRequests']}
 maxima.update({k:max((r['encoded'] or {}).get(k,0) for r in samples) for k in ['bytes','entries','reserved','running','retired']})
 requests=read(LANE/'requests.json');actions=read(LANE/'public-actions.json');assert all(r['dispatched'] for r in actions)
 required=['地平网格：关','地平网格：开','星座：开','红外：关','跟踪天体','播放 1×','暂停','取消','设为观测时间','停止跟踪'];assert all(t in [a['text'].strip() for a in actions] for t in required)
 assert read(LANE/'browser-errors.json')==[] and read(LANE/'result.json')['gridOnly'] is False
 full=dict(status='SAVED_PUBLIC_LAYER_TIME_TRACKING_SOURCE_AND_RESOURCE_READBACK',frontendInputs=401,backendProjectSources=162,publicReadFiles=len(assets['unique']),selectedSourceEpochExact=287,protectedExact=6,gridBeforeAfter=dict(before=pre['props']['aria-label'],after=post['props']['aria-label']),playedSeconds=stamp(paused['scene']['at'])-stamp(track['scene']['at']),committedAt=context['selectedAtUtc'],trackingReference='HR:8162',pixelHashes=pixels,requests=len(requests),receivedBodyBytes=sum(r['receivedBytes'] for r in requests),resourceSamples=len(samples),separateObservedMaxima=maxima,finalOwner=final['owners'][0],finalResources=final['resources'],w3Scope='At45deg public toggle tested only intent/ineligibility. No W3 tiles supplied; >=60deg eligible actual W3 replacement remains open.',scope='Saved root self-review. Controlled native ScrollView node geometry/commands, native image callback/MapFS and software WebGL, no native WXML/physical/independent acceptance. Registration/unregister diagnostics use WeakRef and no current callback retained, but do not prove GC. Texture/buffer uploads and sourceRGBA are separate logical models; instrumentation adds overhead so no frame-time/capacity claim. Saved last frame resources during hide/unload are historical, not current active masks. One 1x playback sample does not establish cross-midnight/full time/track matrices or selected image fine failure.')
 (OUT/'result.json').write_text(json.dumps(full,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({k:v for k,v in full.items() if k not in ['pixelHashes','finalResources']},ensure_ascii=False,indent=2))
except Exception as e:
 (OUT/'failed.json').write_text(json.dumps(dict(error=str(e)),ensure_ascii=False,indent=2)+'\n',encoding='utf-8');raise
