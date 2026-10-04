"""Read saved bounded SKY-v2 raw/aperture means and actual frozen LOD RGB.

No source load, selection rerun or full image/candidate regeneration. Saved
science/current stays pinned. Diagnostic crops cannot qualify full publication.
"""
from pathlib import Path
import sys,json,importlib.util,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from sdss_gri_tan import coherent_box_means,make_rgb_display,ProjectedBand,FixedDisplayTransfer

def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
binding=module('endpoint_crop_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');bind,save=binding.bind,binding.save
OUT=ROOT/'output/sdss-m82-sky-endpoint-apertures-readback-1004-r1'

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes());pins={};started=time.perf_counter()
 def pin(p,expected=None):
  v=bind(p)
  if expected is not None:assert v==expected
  assert pins.setdefault(v['path'],v)==v;return v
 def doc(p):pin(p);return json.loads(p.read_bytes())
 pin(Path(__file__));pin(Path(binding.__file__));pin(ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py')
 producer=doc(ROOT/'output/sdss-m82-sky-endpoint-apertures-1004-r2/result.json')
 currentpath=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';current=doc(currentpath);recipe=current['sourceResolvedRecipe']
 saved={}
 for b in 'gri':
  meta=current['arrays'][b];p=currentpath.parent/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
  saved[b]=np.load(p,mmap_mode='r',allow_pickle=False)
 records=[]
 for row in producer['records']:
  p=ROOT/row['saved']['path'];pin(p,row['saved'])
  with np.load(p,allow_pickle=False) as z:a={k:z[k] for k in z.files}
  local=np.s_[8:-8,8:-8];selected=a['requested'][local];x0,y0,x1,y1=row['targetBoundsXYExclusive'];before=np.stack([saved[b][y0:y1,x0:x1] for b in 'gri']);after=before.copy()
  after[:,selected]=a['after_estimates'][:,8:-8,8:-8][:,selected]
  checked=0
  for y,x in np.argwhere(a['requested']&(a['after_radius']>0)):
   radius=int(a['after_radius'][y,x]);dy,dx=np.mgrid[-radius:radius+1,-radius:radius+1];ys=y+dy;xs=x+dx
   circle=dx**2+dy**2<=radius**2;assert a['after_qualified'][ys[circle],xs[circle]].all()
   chosen=circle&~a['after_protected'][ys,xs];assert chosen[radius,radius]
   mean=a['after_raw'][:,ys[chosen],xs[chosen]].astype('f8').mean(axis=1).astype('f4')
   np.testing.assert_array_equal(mean,a['after_estimates'][:,y,x]);checked+=1
  preserve=a['after_protected']|~a['after_qualified'];np.testing.assert_array_equal(a['after_raw'][:,preserve],a['after_estimates'][:,preserve])
  for lev,meta in current['levels'].items():
   bx0,by0,bx1,by1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor']
   if not (bx0<=x0<x1<=bx1 and by0<=y0<y1<=by1):continue
   colors=[]
   for data in (before,after):
    means,counts=coherent_box_means(dict(zip('gri',data)),np.ones(data.shape[1:],bool),factor);known=counts>0
    bands={b:ProjectedBand(means[b].astype('f4'),known,known,{}) for b in 'gri'}
    rgb,_=make_rgb_display(bands,known,transfer=FixedDisplayTransfer(stretch=recipe['stretch'],Q=recipe['Q']));colors.append(rgb)
   oldpath=currentpath.parent/meta['file'];v=pin(oldpath);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
   old=np.asarray(Image.open(oldpath).convert('RGBA'));np.testing.assert_array_equal(colors[0],old[(y0-by0)//factor:(y1-by0)//factor,(x0-bx0)//factor:(x1-bx0)//factor,:3])
   f=OUT/(row['name']+'-'+lev+'-comparison.png');sheet=Image.new('RGB',(768,416),(16,16,16));draw=ImageDraw.Draw(sheet)
   draw.text((8,8),row['name']+' '+lev+' current retained',fill='white');draw.text((392,8),'bounded SKY-v2 increment, not adopted',fill='white')
   for k,img in enumerate(colors):sheet.paste(Image.fromarray(img).resize((384,384),Image.Resampling.NEAREST),(k*384,32))
   sheet.save(f);record={'name':row['name'],'level':lev,'apertureMeansScalarExact':checked,'oldFrozenRgbExact':True,'changedRGBPixels':int(np.any(colors[0]!=colors[1],axis=2).sum()),'pixels':colors[0].shape[0]*colors[0].shape[1],'comparison':bind(f)}
   packet=OUT/(row['name']+'-'+lev+'-rgb.npz');np.savez_compressed(packet,before_rgb=colors[0],after_rgb=colors[1]);record['savedRgb']=bind(packet);records.append(record)
 assert [bind(ROOT/v['path']) for v in pins.values()]==list(pins.values())
 report={'scope':__doc__,'inputsBefore':list(pins.values()),'inputsAfterExact':True,'records':records,'elapsedSeconds':time.perf_counter()-started,'nativeSourceReads':0,'apertureSelectionRuns':0,'ordinaryAdoption':False,'quality':'UNVERIFIED_BOUNDED_DISPLAY_ONLY','independentReview':'MISSING','otherBusinessLogicEdited':False}
 save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k!='inputsBefore'}),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as e:
  if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
  raise
