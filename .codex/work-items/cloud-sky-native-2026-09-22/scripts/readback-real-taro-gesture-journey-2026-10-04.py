"""Saved actual public gesture/page/Scene outputs; no replay or native claim."""
from pathlib import Path
import json,hashlib,math
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
LANE=ROOT/'output/playwright/cloud-sky-real-taro-gesture-1004-r2'
OUT=ROOT/'output/sky-real-taro-gesture-readback-1004-r1'
OUT.mkdir(exist_ok=False)
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
def same_basis(a,b):
 return all(abs(a[k][i]-b[k][i])<1e-9 for k in ('right','up','forward') for i in range(3))
def ray_alt(f,x=195,y=422):
 scale=844/(2*math.tan(f['fov']*math.pi/720));u=(x-f['center']['x'])/scale;v=(f['center']['y']-y)/scale
 d=1+u*u+v*v
 z=(2*u*f['basis']['right'][2]+2*v*f['basis']['up'][2]+(1-u*u-v*v)*f['basis']['forward'][2])/d
 return math.degrees(math.asin(max(-1,min(1,z))))
try:
 sources=read(LANE/'source-bindings-before.json');assert sources==read(LANE/'source-bindings-after.json') and len(sources)==401
 for r in sources:assert bind(ROOT/r['path'])==r,r['path']
 backend=read(LANE/'backend-source-bindings-before.json');assert backend==read(LANE/'backend-source-bindings-after.json') and len(backend)==162
 for r in backend:assert bind(ROOT/r['path'])==r,r['path']
 assets=read(LANE/'public-asset-read-bindings.json')
 for r in assets['unique']:assert bind(ROOT/r['path'])==r,r['path']
 baseline=read(LANE/'current-baseline-before.json');assert baseline==read(LANE/'current-baseline-after.json')
 assert len(baseline['currentSources'])==284 and len(baseline['protected'])==6
 for r in baseline['currentSources']+baseline['protected']:assert bind(ROOT/r['path'])==r,r['path']
 assert (LANE/'executed-script.mts').read_bytes()==(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-real-taro-gesture-journey-2026-10-04.mts').read_bytes()
 assert (LANE/'executed-build.mts').read_bytes()==(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-real-taro-gesture-journey-2026-10-04.mts').read_bytes()
 phases=read(LANE/'phases.json');by={p['name']:p for p in phases}
 names=['software-cold','software-full-sphere','software-below-horizon','software-reversed-home','software-local-return','software-return']
 pixels={}
 for name in names:
  f=read(LANE/(name+'-pixels.json'));raw=(LANE/(name+'.rgba')).read_bytes()
  assert len(raw)==f['bytes']==1316640 and hashlib.sha256(raw).hexdigest()==f['sha256']
  image=Image.open(LANE/(name+'.png')).convert('RGBA')
  assert image.size==(390,844) and image.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()==raw
  pixels[name]=f['sha256']
 assert pixels['software-cold']==pixels['software-local-return']==pixels['software-return']
 assert pixels['software-full-sphere']==pixels['software-reversed-home']
 assert pixels['software-below-horizon']!=pixels['software-full-sphere']
 wide=read(LANE/'public-numerical-full-sphere-facts.json');assert wide['fov']>180 and abs(wide['basis']['forward'][2]-1)<1e-9
 traversal=read(LANE/'pan-forward-traversal.json');alphas=[]
 for f in traversal:
  alt=ray_alt(f);t=max(0,min(1,(alt+15)/30));expected=t*t*(3-2*t)
  assert abs(f['landscape']['opacity']-expected)<1e-9,(f['y'],alt,f['landscape']['opacity'],expected)
  alphas.append(dict(y=f['y'],visualCentreAltitudeDeg=alt,opacity=f['landscape']['opacity'],resource=f['landscape']['resource'],maskBytes=f['landscape']['alphaBytes'],objects=f['objects']))
 assert alphas[-1]['opacity']==0 and alphas[-1]['visualCentreAltitudeDeg']<=-15
 assert any(0<a['opacity']<1 for a in alphas)
 for f in traversal[:-1]:
  reverse=read(LANE/f"reverse-y-{f['y']}-facts.json")
  assert same_basis(f['basis'],reverse['basis']) and f['landscape']==reverse['landscape']
 for name in ('public-pan-reversed-home','public-pan-cancelled'):
  f=read(LANE/(name+'-facts.json'));assert same_basis(f['basis'],wide['basis']) and f['fov']==wide['fov']
 local=read(LANE/'public-local-return-restored-facts.json');assert local['fov']==45
 cold=read(LANE/'software-cold-paint.json');assert same_basis(local['basis'],cold['view']['basis'])
 below=read(LANE/'below-horizon-painted-pick.json');assert below['landscapeOpacity']==0 and below['objects']
 assert all(o['reference'] in o['choices'] for o in below['objects'])
 negative=[o for o in below['objects'] if ray_alt(traversal[-1],o['x'],o['y'])<0];assert negative
 actions=read(LANE/'public-gesture-actions.json');assert all(a['dispatched'] for a in actions)
 assert {a['type'] for a in actions}=={'touchstart','touchmove','touchend','touchcancel'}
 source=by['actual-source-jsx-shown-sky-hidden'];returned=by['actual-source-back-sky-painted-selection-restored'];final=by['unloaded-cleared']
 assert all(s in source['activeText'] for s in ['Alderamin','BSC5P Bright Star Catalog','HEASARC','IAU','CC0 1.0'])
 assert source['gpu']=={} and source['owners'][0]['leased']==0
 assert json.loads(by['public-local-return-restored']['canvas']['data-sky-presented-view'])==json.loads(returned['canvas']['data-sky-presented-view'])
 assert returned['selection'][0]['text']=='Alderamin' and returned['modal']['data-object-reference']=='HR:8162'
 nav=read(LANE/'actual-navigation.json');assert nav['sourceRootRemoved'] and nav['sameCurrentSkyInstance']
 assert [r['action'] for r in nav['navigation']]==['navigateTo','navigateBack']
 assert final['logicalNodes']==0 and final['gpu']=={} and final['queries']==[] and final['pendingNativeRequests']==0
 for k in ('entries','leased','bytes','reserved','running','pending','retired'):assert final['owners'][0][k]==0,k
 assert len(final['files'])==1 and final['files'][0]['bytes']==26
 assert read(LANE/'browser-errors.json')==[]
 requests=read(LANE/'requests.json');warm=[r for r in requests if r['phase']=='actual-source-public-back']
 ledger=[dict(name=p['name'],encoded=p['owners'][0] if p['owners'] else None,gpuHandles=p['gpu'],pendingNativeRequests=p['pendingNativeRequests']) for p in phases]
 result=dict(status='SAVED_PUBLIC_GESTURE_PAGE_SCENE_SOURCE_BACK_READBACK',frontendSources=len(sources),backendProjectSources=len(backend),publicReadEvents=len(assets['reads']),publicReadFiles=len(assets['unique']),selectedSourceEpochExact=284,protectedExact=6,
 fov=wide['fov'],panFade=alphas,belowHorizonUsablePaintedObjects=len(negative),allUsablePickObjects=len(below['objects']),pixelHashes=pixels,
 requests=len(requests),receivedBodyBytes=sum(r['receivedBytes'] for r in requests),warmBodyBytes=sum(r['receivedBytes'] for r in warm),
 completedPhaseEncodedMax=max(p['owners'][0]['bytes'] for p in phases if p['owners']),completedPhaseEncodedEntryMax=max(p['owners'][0]['entries'] for p in phases if p['owners']),
 beforeSourceLeaseCount=by['public-local-return-restored']['owners'][0]['leased'],sourceLeaseCount=source['owners'][0]['leased'],returnLeaseCount=returned['owners'][0]['leased'],
 gestureEvents=len(actions),sceneCalls=final['sceneCalls'],ledger=ledger,
 scope='Root saved-output self-review. Actual full JSX/official Taro lifecycle/Query/public Canvas gestures and Source/Back under controlled native APIs and software GPU. Styles not composed. Encoded settled sample max is not staging/temporary peak; encoded lease is not decoded residency. Snapshot diagnostic holds only the latest actual snapshot without cloning typed masks. Historical native Image diagnostics still retain references. Resource dimensions and mask bytes are models; native/GPU/OS physical total, all-family readiness, continuous time/tracking, quality, device and capacity remain unverified. No product edit or shared BFF/watch restart.')
 (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({k:v for k,v in result.items() if k not in ('ledger','pixelHashes')},ensure_ascii=False,indent=2))
except Exception as e:
 (OUT/'failed.json').write_text(json.dumps(dict(error=str(e)),ensure_ascii=False,indent=2)+'\n',encoding='utf-8');raise
