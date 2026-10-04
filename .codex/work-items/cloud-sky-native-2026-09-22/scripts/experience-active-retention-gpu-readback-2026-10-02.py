"""Actual normal-matrix PNG and source-aware GL ledger readback; not native memory/performance certification."""
from pathlib import Path
import hashlib,json,sys
import numpy as np
from PIL import Image
import PIL
ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT/'output/playwright/cloud-sky-active-retention-gpu-ab-1002-r3'
out=ROOT/'output/active-retention-gpu-readback-1002-r1'
n=2
while out.exists():
 out=ROOT/f'output/active-retention-gpu-readback-1002-r{n}';n+=1
out.mkdir(parents=True)
def bind(p):
 p=Path(p).resolve();b=p.read_bytes()
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
# The complete expected digest is independent of any abbreviated task message.
assert bind(SOURCE/'result.json')['sha256']=='72039d3c0d63d89339a91a7aa2afbf64c40d52974faff4159a900f84b7334e31'
r=json.loads((SOURCE/'result.json').read_text());assert bind(ROOT/r['inputs']['path'])==r['inputs']
inputs=json.loads((ROOT/r['inputs']['path']).read_text())
for key in ['sourceBindings','r5OwnBindings','inputBindings','tapBindings']:
 for b in inputs[key]: assert bind(ROOT/b['path'])==b
for b in r['reusedInputs']: assert bind(ROOT/b['path'])==b
assert (SOURCE/'r4-normalized-full-ast.js.txt').read_bytes()==(SOURCE/'r5-normalized-full-ast.js.txt').read_bytes()
assert bind(SOURCE/'r4-normalized-full-ast.js.txt')['sha256']==inputs['normalizedFullAstHash']
original=json.loads((ROOT/inputs['prior']['path']).read_text())
offers={(i['id'],i['sha256']):i for i in original['inputs'] if i.get('transport')=='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY'}
frames=[];raw_arrays={};last={v:0 for v in ['baseline','active']}
for row in r['rows']:
 name=row['condition']['name'];variant=row['variant'];raw=(SOURCE/(name+'.rgba')).read_bytes()
 assert hashlib.sha256(raw).hexdigest()==row['rgbaSha256']==original['rows'][row['index']]['rgbaSha256']
 a=np.frombuffer(raw,np.uint8).reshape(844,390,4);raw_arrays[(variant,row['index'])]=a
 with Image.open(SOURCE/(name+'.png')) as im:
  assert im.size==(390,844);png=np.asarray(im.convert('RGBA'))
 assert np.array_equal(png[::-1],a);assert np.count_nonzero(png[:,:,:3])>1000
 passes=[]
 for p,tap in zip(row['passes'],row['textureFrames']):
  initial=last[variant];peak=initial
  for e in p['events']:
   last[variant]+=(-1 if e['operation']=='delete' else 1)*e['bytes'];assert last[variant]==e['liveBytes'];peak=max(peak,last[variant])
   info=e['source']
   if info:
    expected=offers[(info['offeredId'],info['sha256'])]
    assert [info['width'],info['height']]==[expected['width'],expected['height']]
    assert info['sha256'] in info['path'] and info['status']=='decoded'
  assert peak==p['peakBytes'] and last[variant]==p['liveBytes']
  assert sum(t['bytes'] for t in p['retained'])==p['liveBytes'];assert p['glError']==0
  assert tap['finished'] and tap['calls'][0]['method']=='begin' and tap['calls'][-1]['method']=='finish'
  requests=[c for c in tap['calls'] if c['method'] in ['get','getWindow']]
  assert all(c['texturePresent'] and not c.get('error') for c in requests)
  pins=sum(c['method']=='pin-enter' for c in tap['calls'])
  passes.append({'pass':p['pass'],'initialBytes':initial,'peakBytes':peak,'endBytes':last[variant],
   'sourceUploadBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='source-upload'),
   'copyBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='gpu-copy'),
   'deletionBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='delete'),
   'getCalls':sum(c['method']=='get' for c in requests),'getWindowCalls':sum(c['method']=='getWindow' for c in requests),
   'pinScopes':pins,'decodedObjectSources':sorted({(c['source']['offeredId'],c['source']['sha256'],c['source']['objectId']) for c in requests}),
   'retainedSourceIdentities':p['retained']})
 frames.append({'variant':variant,'index':row['index'],'name':name,'rgba':bind(SOURCE/(name+'.rgba')),'png':bind(SOURCE/(name+'.png')),
  'actualDecodedPngEqualsBottomUpRgba':True,'precision':row['precision'],'passes':passes,
  'metadataRequests':sum(q['type']=='metadata' for q in row['transfers']),'encodedTransfers':sum(q['type']!='metadata' for q in row['transfers']),
  'transferBytes':sum(q['bytes'] for q in row['transfers']),'newDecodes':len(row['newDecodes']),
  'decodedSourceRgbaModel':row['ready']['decodedSourceRgbaModel'],'coldFileOwnerEntries':row['ready']['coldFileOwnerEntries']})
for i in range(13):assert np.array_equal(raw_arrays[('baseline',i)],raw_arrays[('active',i)])
final=next(f for f in r['finals'] if f['variant']=='active');initial=last['active']
for e in final['gpu']['events']:
 last['active']+=(-1 if e['operation']=='delete' else 1)*e['bytes'];assert last['active']==e['liveBytes']
assert last['active']==final['gpu']['liveBytes']==0 and final['gpu']['aliveTextures']==0
assert all(c['leased']==0 and c['running']==0 and c['reserved']==0 for c in final['cache'])
protected=json.loads((ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').read_text())
for b in protected: assert bind(ROOT/b['path'])['sha256']==b['sha256']
old=json.loads((ROOT/'output/sky-artwork-public-retirement-1002-r3/result.json').read_text())['oldAssetsUnchanged'];assert len(old)==201
for b in old:assert bind(ROOT/b['path'])==b
aggregate=[]
for variant in ['baseline','active']:
 current=[f for f in frames if f['variant']==variant]
 aggregate.append({'variant':variant,'maximumLogicalPeakBytes':max(p['peakBytes'] for f in current for p in f['passes']),
  'maximumLogicalFrameEndBytes':max(p['endBytes'] for f in current for p in f['passes']),
  'all39SourceUploadBytes':sum(p['sourceUploadBytes'] for f in current for p in f['passes']),
  'all39CopyBytes':sum(p['copyBytes'] for f in current for p in f['passes']),
  'actualPinScopes':sum(p['pinScopes'] for f in current for p in f['passes'])})
report={'status':'BOUNDED_ACTIVE_RETENTION_NORMAL_MATRIX_EXACT_NOT_ADOPTED','input':bind(SOURCE/'result.json'),
 'versions':{'python':sys.version,'numpy':np.__version__,'Pillow':PIL.__version__},'frames':frames,'aggregate':aggregate,
 'activeFinalLogicalCleanup':{'initialBytes':initial,'finalBytes':0,'aliveTextures':0,'allFileLeasesReleased':True},
 'baselineFinalGap':next(f for f in r['finals'] if f['variant']=='baseline'),'preserved':{'six':protected,'old201':old},
 'limits':['Actual normal13conditions only; zero new source/render/runtime in readback. Higher sustained current-frame residency and transition initial peak are measured costs, not a hard16MiB guarantee.',
 'No pins or injected failure in this normal matrix; independent failure/pair/lifetime controls are a separate dependency.',
 'Method get internal lexical returned window is unobserved; getWindow exact returned rectangles captured. Raw draw-bound textures are not shader source credit.',
 'Baseline r2 disposal zero assertions executed but raw final not saved; no invented snapshot. Active final actual recorded and reconstructed to zero.',
 'Current138 source bindings supplement original r5 only2 afterrun by exact normalized full AST and same taps/executors, not retroactive before-run capture.',
 'Logical GL/controlled cache/reference models and opaque RGB8 alphaBits0 software renderer do not certify native/driver/OS/GC memory, timing,200DAU or final product acceptance.']}
(out/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes());(out/'result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':out.relative_to(ROOT).as_posix(),'result':bind(out/'result.json'),'aggregate':aggregate,
 'table':[{'variant':f['variant'],'index':f['index'],'peak':max(p['peakBytes'] for p in f['passes']),'warmEnd':f['passes'][2]['endBytes'],'warmUpload':f['passes'][2]['sourceUploadBytes']} for f in frames]},indent=2))
