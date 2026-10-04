"""Read actual saved opt-in page results; no browser, HTTP or image processing replay."""
from pathlib import Path
import hashlib,json,difflib
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
LANE=ROOT/'output/playwright/cloud-sky-m82-display-page-1004-r2'
OUT=ROOT/'output/sdss-m82-display-page-readback-1004-r1'
OUT.mkdir(exist_ok=False)
def read(p):return json.loads(Path(p).read_bytes())
def bind(p):
 p=Path(p);return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
def save(p,v):
 with p.open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
try:
 manifest=ROOT/'output/sdss-m82-display-publication-1004-r2/publication/manifest.json'
 publication=read(manifest);pin=read(LANE/'explicit-publication-input.json')
 assert bind(manifest)==pin['manifest'] and publication['publicationHash']==pin['hash']
 assert pin['ordinaryRegistry'] is False
 for name in ['source-bindings','backend-source-bindings','current-baseline']:
  assert read(LANE/(name+'-before.json'))==read(LANE/(name+'-after.json')),name
 for name in ['backend-source-bindings-before.json','public-asset-read-bindings.json']:
  values=read(LANE/name);values=values['unique'] if isinstance(values,dict) else values
  for row in values:assert bind(ROOT/row['path'])==row,row['path']
 executed=(LANE/'executed-spot-sky-page.tsx').read_text(encoding='utf-8')
 current=(ROOT/'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx').read_text(encoding='utf-8')
 old='        artworkContributions: opticalContributionPolicy.current,'
 new='        ...(opticalContributionPolicy.current ? { artworkContributions: opticalContributionPolicy.current } : {}),'
 assert executed.count(old)==1 and executed.replace(old,new)==current
 final_delta=''.join(difflib.unified_diff(executed.splitlines(True),current.splitlines(True),fromfile='executed-r2',tofile='final-typechecked'))
 save(OUT/'executed-versus-final.json',{'executed':bind(LANE/'executed-spot-sky-page.tsx'),'final':bind(ROOT/'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'),'diff':final_delta,'meaning':'r2 explicit policy passes same values; final conditional spread only omits undefined optional property. Final byte version typechecked and affected tests, not rerun whole runtime.'})
 rows=read(LANE/'phases.json');phases={r['name']:r for r in rows}
 expected={'m82-overview-actual-painted':'OVERVIEW','m82-medium-actual-painted':'MEDIUM','m82-detail-outage-parent-painted':'MEDIUM','m82-detail-retry-actual-painted':'DETAIL','m82-source-back-actual-painted':'DETAIL','m82-warm-show-actual-painted':'DETAIL','m82-warm-overview-actual-painted':'OVERVIEW'}
 for phase,level in expected.items():
  r=phases[phase];packet=r['completedSources']['optical'];wanted=publication['levels'][level]
  assert packet['kind']=='display' and packet['publicationHash']==pin['hash']
  assert any(f['level']==level and f['sha256']==wanted['sha256'] and f['image']['sha256']==wanted['sha256'] and f['image']['status']=='decoded' for f in packet['participatingFields'])
  assert any(i['family']=='sdss-optical' and i['sha256']==wanted['sha256'] for i in r['frameResources']['sourceImages'])
  assert any(i['reference']=='M:82' for i in r['paintedObjects'])
 failed=phases['m82-detail-outage-parent-painted'];assert failed['sdssHook']['updateFailed'] and failed['sdssHook']['renderedLevel']=='MEDIUM'
 assert '影像更新失败，保留已载图' in failed['text']
 requests=read(LANE/'requests.json');optical=[r for r in requests if r['binary'] and pin['hash'] in r['route']]
 good=[r for r in optical if r['status']==200];bad=[r for r in optical if r['status']==503]
 assert len(good)==3 and len(bad)==1
 for level,v in publication['levels'].items():
  got=next(r for r in good if r['route'].endswith('/'+v['file']))
  assert got['receivedBytes']==v['bytes'] and got['sha256']==v['sha256']
  file=manifest.parent/v['file'];fact=bind(file);assert (fact['bytes'],fact['sha256'])==(v['bytes'],v['sha256'])
 captures=[]
 for file in sorted(LANE.glob('software-*-pixels.json')):
  name=file.name.removesuffix('-pixels.json');raw=(LANE/(name+'.rgba')).read_bytes();post=(LANE/(name+'-after.rgba')).read_bytes()
  assert raw==post==Image.open(LANE/(name+'.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes(),name
  boundary=read(LANE/(name+'-capture-boundaries.json'));assert boundary['beforeHash']==boundary['afterHash']==hashlib.sha256(raw).hexdigest()
  assert len(raw)==390*844*4
  captures.append({'name':name,'rgba':bind(LANE/(name+'.rgba'))})
 same=['software-m82-source-before','software-m82-source-back','software-m82-warm-show']
 assert len({(LANE/(n+'.rgba')).read_bytes() for n in same})==1
 source=read(LANE/'m82-actual-source-page.json');assert pin['hash'] in source['navigation']['url'] and '显示估计' in source['text']
 for name in ['m82-actual-source-page-retired','m82-hidden-all-active-retired','m82-return-original-map','unloaded-cleared']:
  r=phases[name];assert not r['gpu'] and all(r['resources'][k]==0 for k in ['gpuTextureUploadModelBytes','gpuBufferUploadModelBytes','activeDecodedImageHandles','sourceRgbaEquivalentBytes'])
  assert all(o['leased']==0 and o['running']==0 and o['pending']==0 for o in r['owners'])
 final=phases['unloaded-cleared'];assert all(final['owners'][0][k]==0 for k in ['entries','leased','bytes','reserved','running','pending','retired'])
 assert final['activeRoute']=='pages/map/index' and final['pendingNativeRequests']==0
 families=sorted({i['family'] for r in read(LANE/'frame-resources.json') for i in r['sourceImages']})
 assert families==['constellation-artwork','deep-sky-image','galactic','sdss-optical']
 result={'status':'SAVED_ACTUAL_OPT_IN_M82_PAGE_DEVELOPMENT_READBACK','frontendInputs':len(read(LANE/'source-bindings-before.json')),'backendInputs':len(read(LANE/'backend-source-bindings-before.json')),'publicReadBindings':len(read(LANE/'public-asset-read-bindings.json')['unique']),'requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),'successfulDisplayBytes':sum(r['receivedBytes'] for r in good),'actualPaintedPhases':expected,'capturesGlPngGl':captures,'sourceBackAndWarmShowExactSha256':hashlib.sha256((LANE/(same[0]+'.rgba')).read_bytes()).hexdigest(),'actualSourceFamilies':families,'resourceSummary':read(LANE/'resource-summary.json'),'finalActivity':'all active registrations, GL, leases, queue and encoded inventory zero','oldPixelFailures':'Old strictBack 1/2/9/4 channel failures unchanged; this saved M82 sequence only','quality':'Viewed full OVERVIEW/MEDIUM/DETAIL; warm core, grain and green structure persist. UNVERIFIED_NOT_ADOPTED','scope':'Self readback; actual page React/Query/Taro/controller and same formal context; controlled native ports, softwareGL, SCSS pinned not composed. No WXML/native/phones, physical total CPU/RSS/GPU, source quality, ordinary adoption, independent review or 200DAU capacity claim. Auxiliary allocation/retry and pending-decode hide cancellation page boundaries still open.'}
 save(OUT/'result.json',result)
 print(json.dumps({k:v for k,v in result.items() if k not in ['resourceSummary','capturesGlPngGl']},ensure_ascii=True),flush=True)
except Exception as e:
 save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
 raise
