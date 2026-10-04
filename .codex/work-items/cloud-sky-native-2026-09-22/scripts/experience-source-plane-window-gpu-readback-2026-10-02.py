"""Read actual A/B captures and reconstruct logical GL accounting; no render or production change."""
from pathlib import Path
import hashlib,json,sys
import numpy as np
from PIL import Image
import PIL
ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT/'output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r4'
out=ROOT/'output/source-plane-window-gpu-readback-1002-r1'
assert not out.exists()
out.mkdir(parents=True)
def bind(p):
 p=Path(p).resolve();b=p.read_bytes()
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert bind(SOURCE/'result.json')['sha256']=='a8bcd380aea334391ccc6a7c8b92e02e4efba8a22946a8833bb396d883432d7a'
r=json.loads((SOURCE/'result.json').read_text())
for b in r['originalSourceBindings']: assert bind(ROOT/b['path'])==b
for b in r['reusedInputs']: assert bind(ROOT/b['path'])==b
frames=[];arrays={};last={v:0 for v in ['baseline','noart','candidate','badcrop']}
for row in r['results']:
 name=row['condition']['name'];variant=row['variant'];raw=(SOURCE/(name+'.rgba')).read_bytes()
 assert hashlib.sha256(raw).hexdigest()==row['rgbaSha256']
 a=np.frombuffer(raw,np.uint8).reshape(844,390,4);arrays[(variant,row['inputConditionIndex'])]=a
 with Image.open(SOURCE/(name+'.png')) as im:
  assert im.size==(390,844);png=np.asarray(im.convert('RGBA'))
 assert np.array_equal(png[::-1],a)
 assert np.count_nonzero(png[:,:,:3])>390*844
 passes=[]
 for p in row['passes']:
  initial=last[variant];peak=initial
  for e in p['events']:
   last[variant]+=(-1 if e['operation']=='delete' else 1)*e['bytes']
   assert last[variant]==e['liveBytes'];peak=max(peak,last[variant])
  assert peak==p['peakBytes'] and last[variant]==p['liveBytes']
  assert sum(t['bytes'] for t in p['retained'])==p['liveBytes']
  passes.append({'pass':p['pass'],'initialBytes':initial,'peakBytes':peak,'endBytes':last[variant],
   'sourceUploadBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='source-upload'),
   'copyBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='gpu-copy'),
   'deletionBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='delete'),
   'uploadSourceIdentities':[e['source'] for e in p['events'] if e['operation']=='source-upload'],
   'retainedSourceIdentities':p['retained']})
 frames.append({'variant':variant,'index':row['inputConditionIndex'],'condition':row['condition'],'capture':bind(SOURCE/(name+'.png')),
  'rgba':bind(SOURCE/(name+'.rgba')),'decodedPngExact':True,'precision':row['precision'],'passes':passes})
comparisons=[]
for index in [0,1,2]:
 baseline=arrays[('baseline',index)]
 compared={}
 for variant in ['noart','candidate','badcrop']:
  a=arrays[(variant,index)];delta=np.abs(a.astype(np.int16)-baseline.astype(np.int16));ys,xs=np.nonzero(np.any(delta,axis=2))
  coords=[{'x':int(x),'glY':int(y),'pngY':843-int(y),'baseline':baseline[y,x].tolist(),'variant':a[y,x].tolist()} for y,x in zip(ys,xs)]
  compared[variant]={'changedPixels':len(xs),'maxByteDelta':int(delta.max()),'allChangedPixelCoordinates':coords if variant=='candidate' else None}
 comparisons.append({'index':index,'variants':compared})
assert comparisons[0]['variants']['candidate']['changedPixels']==3
assert comparisons[1]['variants']['candidate']['changedPixels']==1
assert comparisons[1]['variants']['noart']['changedPixels']==101155
assert comparisons[1]['variants']['badcrop']['changedPixels']==131287
assert all(c['changedPixels']==0 for c in comparisons[2]['variants'].values())
protected=json.loads((ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').read_text())
for b in protected: assert bind(ROOT/b['path'])['sha256']==b['sha256']
old=json.loads((ROOT/'output/sky-artwork-public-retirement-1002-r3/result.json').read_text())['oldAssetsUnchanged']
assert len(old)==201
for b in old: assert bind(ROOT/b['path'])==b
report={'status':'ACTUAL_WINDOW_CANDIDATE_PIXEL_DIFFERENCE_NOT_ADOPTED','input':bind(SOURCE/'result.json'),
 'versions':{'python':sys.version,'numpy':np.__version__,'Pillow':PIL.__version__},'frames':frames,'comparisons':comparisons,
 'preserved':{'six':protected,'old201':old},'limits':['Candidate parameters unchanged; 45/85 one-byte residuals fail exact-pixel adoption requirement. Cause not assigned to omitted source pixels or float interpolation without evidence.',
 '139 normal-opacity noart and grossbadcrop are also exact; this condition cannot certify pixel preservation even though actual resource changes are measured.',
 'Boo/Cet had no valid 139 lattice fragment in prior independent numerical probe; this is distinct from all-source sub-byte opacity contribution.',
 'GL trace is logical source upload/copy/delete/retention, not native/driver/physical memory or performance/capacity. No production change or expanded view matrix.']}
(out/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
(out/'result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':out.relative_to(ROOT).as_posix(),'result':bind(out/'result.json'),'comparisons':comparisons,
 'resourceTable':[{'variant':f['variant'],'index':f['index'],'maxPeak':max(p['peakBytes'] for p in f['passes']),
 'warmEnd':f['passes'][2]['endBytes'],'warmUpload':f['passes'][2]['sourceUploadBytes'],'warmCopy':f['passes'][2]['copyBytes']} for f in frames]},indent=2))
