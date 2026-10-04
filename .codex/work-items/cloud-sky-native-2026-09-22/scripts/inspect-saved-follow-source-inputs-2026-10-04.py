"""Compare already saved Scene input/paint and raw pixel boundary, no runtime replay."""
from pathlib import Path
import hashlib,json,sys,numpy as np
root=Path(__file__).resolve().parents[4];lane=root/sys.argv[1];out=root/sys.argv[2];out.mkdir(exist_ok=False)
def read(n):return json.loads((lane/n).read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def difference(a,b,prefix=''):
 if type(a)!=type(b):return [{'path':prefix,'before':a,'after':b}]
 if isinstance(a,dict):
  rows=[]
  for k in sorted(a.keys()|b.keys()):
   if k not in a or k not in b:rows.append({'path':prefix+'.'+k,'before':a.get(k),'after':b.get(k)})
   else:rows.extend(difference(a[k],b[k],prefix+'.'+k))
  return rows
 if isinstance(a,list):
  if len(a)!=len(b):return [{'path':prefix+'.length','before':len(a),'after':len(b)}]
  return [r for i,(x,y) in enumerate(zip(a,b)) for r in difference(x,y,prefix+'.'+str(i))]
 return [] if a==b else [{'path':prefix,'before':a,'after':b}]
names=['software-follow-source-before','software-follow-source-back'];paints=[read(n+'-paint.json') for n in names];frames=[read(n+'-capture-boundaries.json')['before']['frameResources'] for n in names]
rgba=[np.frombuffer((lane/(n+'.rgba')).read_bytes(),dtype=np.uint8).reshape(844,390,4) for n in names];delta=np.abs(rgba[0].astype(np.int16)-rgba[1].astype(np.int16));points=[]
for row,col in np.argwhere(np.any(delta,axis=2))[:100]:points.append({'x':int(col),'yDisplay':843-int(row),'before':rgba[0][row,col].tolist(),'after':rgba[1][row,col].tolist()})
images=[sorted([{k:i[k] for k in ['family','sha256','width','height','id'] if k in i} for i in f['sourceImages']],key=lambda i:json.dumps(i,sort_keys=True)) for f in frames]
inputs=[lane/(n+suffix) for n in names for suffix in ['.rgba','-after.rgba','-pixels.json','-capture-boundaries.json','-paint.json']]
result={'status':'SAVED_FOLLOW_SOURCE_INPUT_COMPARISON','inputs':[bind(p) for p in inputs],'geometryExact':frames[0]['geometry']==frames[1]['geometry'],'geometryDifferences':difference(frames[0]['geometry'],frames[1]['geometry'])[:40],'viewDifferences':difference(paints[0]['view'],paints[1]['view'])[:40],'sourceImageDescriptorsBefore':images[0],'sourceImageDescriptorsAfter':images[1],'maskBefore':frames[0]['mask'],'maskAfter':frames[1]['mask'],'pixelEquality':'PASS' if not np.any(delta) else 'FAILED_RETAINED','changedPixels':int(np.count_nonzero(np.any(delta,axis=2))),'changedChannels':int(np.count_nonzero(delta)),'maxChannelDelta':int(delta.max()),'alphaChanges':int(np.count_nonzero(delta[:,:,3])),'firstChangedPixelValues':points,'scope':'Saved Scene input/compact landscape descriptors and bytes only. Missing mask samples/GPU uniforms/buffer or decoded-upload bytes are not presumed equal or causal; no product policy or tolerance change.'}
(out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());print(json.dumps({k:v for k,v in result.items() if k not in ['inputs','sourceImageDescriptorsBefore','sourceImageDescriptorsAfter']},ensure_ascii=False))
