"""Read complete SKY-v2 display arrays and three real numeric LOD consumers.

No native-source load, raw projection, coadd, noise/detection/PSF fit or common
aperture selection replay. Original estimates/science/coverage/recipe stay pinned.
"""
from pathlib import Path
import sys,json,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import make_lupton_rgb,ManualInterval,LuptonAsinhStretch

def module(name,p):
 s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
binding=module('noise_v2_reader_bind',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');bind,save=binding.bind,binding.save
OUT=ROOT/'output/sdss-m82-noise-v2-increment-readback-1004-r1'

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter();pins={}
 def pin(p,expected=None):
  v=bind(p)
  if expected is not None:assert v==expected
  assert pins.setdefault(v['path'],v)==v;return v
 def doc(p,expected=None):pin(p,expected);return json.loads(p.read_bytes())
 def packet(meta):
  p=ROOT/meta['path'];pin(p,meta)
  with np.load(p,allow_pickle=False) as z:return {k:z[k] for k in z.files}
 def array(meta,directory):
  p=directory/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
  a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
 pin(Path(__file__));pin(Path(binding.__file__));pin(ROOT/'output/allwise-w3-atlas-0929/python-deps/astropy/visualization/lupton_rgb.py')
 producer=doc(ROOT/'output/sdss-m82-noise-v2-increment-1004-r1/result.json');currentpath=ROOT/producer['candidate']['path'];current=doc(currentpath,producer['candidate'])
 oldpath=ROOT/producer['previousCompleteCandidate']['path'];old=doc(oldpath,producer['previousCompleteCandidate']);sciencepath=ROOT/producer['scienceCandidate']['path'];science=doc(sciencepath,producer['scienceCandidate'])
 samples={b:array(current['arrays'][b],currentpath.parent) for b in 'gri'};baseline={b:array(old['arrays'][b],oldpath.parent) for b in 'gri'}
 maps={k:array(current['arrays'][k],currentpath.parent) for k in ('qualified','radius','reached','protected','requested','changed')}
 oldmaps={k:array(old['arrays'][k],oldpath.parent) for k in ('qualified','radius','reached','protected')}
 joint=array(science['arrays']['joint-availability'],sciencepath.parent);newdiag=doc(ROOT/'output/sdss-m82-sky-v2-dependency-readback-1004-r1/result.json');expected=packet(newdiag['diagnosticQualification'])
 ext=doc(ROOT/'output/sdss-m82-sky-v2-exterior-1004-r1/result.json');demand=packet(ext['savedMaps'])['complete_inside_demand'];np.testing.assert_array_equal(maps['requested'],demand)
 np.testing.assert_array_equal(maps['qualified'],expected['qualified']);np.testing.assert_array_equal(maps['protected'],expected['protected'])
 changed=np.zeros(joint.shape,bool)
 for b in 'gri':
  np.testing.assert_array_equal(samples[b][~demand],baseline[b][~demand]);np.testing.assert_array_equal(samples[b][oldmaps['protected']],baseline[b][oldmaps['protected']])
  changed|=~((samples[b]==baseline[b])|(np.isnan(samples[b])&np.isnan(baseline[b])))
 np.testing.assert_array_equal(changed,maps['changed']);assert changed.sum()==35018
 for k in ('radius','reached','qualified','protected'):np.testing.assert_array_equal(maps[k][~demand],oldmaps[k][~demand])
 inside=doc(ROOT/'output/sdss-m82-sky-v2-dependency-1004-r1/result.json');c=packet(inside['savedCompact']);y,x=c['target_y'],c['target_x'];keep=c['after_recovered_strong']|~c['after_recovered_q']
 for at,b in enumerate('gri'):np.testing.assert_array_equal(samples[b][y[keep],x[keep]],c['after_raw'][at,keep])
 assert current['sourceResolvedRecipe']==old['sourceResolvedRecipe']==science['display']['transfer'];recipe=current['sourceResolvedRecipe'];assert recipe['stretch']==.2358548697680099 and recipe['Q']==8
 oldimages={};newimages={};levels=[]
 for level,meta in current['levels'].items():
  x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor'];region=np.s_[y0:y1,x0:x1];n=meta['pixels'];counts=joint[region].reshape(n,factor,n,factor).sum(axis=(1,3));means={}
  for b in 'gri':
   total=np.where(joint[region],samples[b][region],0).astype('f8').reshape(n,factor,n,factor).sum(axis=(1,3));means[b]=np.divide(total,counts,out=np.zeros_like(total),where=counts>0).astype('f4')
  expectedrgb=make_lupton_rgb(means['i'],means['r'],means['g'],interval=ManualInterval(vmin=0,vmax=None),stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
  alpha=np.rint(counts.astype('f8')*255/factor**2).astype('u1');p=currentpath.parent/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256']);actual=np.asarray(Image.open(p).convert('RGBA'));np.testing.assert_array_equal(actual,np.dstack((expectedrgb,alpha)))
  oldmeta=old['levels'][level];p=oldpath.parent/oldmeta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(oldmeta['bytes'],oldmeta['sha256']);previous=np.asarray(Image.open(p).convert('RGBA'));np.testing.assert_array_equal(actual[:,:,3],previous[:,:,3])
  for k in ('pixels','fieldDegrees','wcsHeader','crop'):assert meta[k]==oldmeta[k]
  oldimages[level]=previous[:,:,:3];newimages[level]=actual[:,:,:3]
  compare=OUT/(level.lower()+'-complete-comparison.png');sheet=Image.new('RGB',(1024,544),(16,16,16));draw=ImageDraw.Draw(sheet)
  draw.text((8,8),level+' previous complete, retained',fill='white');draw.text((520,8),level+' actual SKY-v2 necessary increment, not adopted',fill='white')
  sheet.paste(Image.fromarray(previous[:,:,:3]),(0,32));sheet.paste(Image.fromarray(actual[:,:,:3]),(512,32));sheet.save(compare)
  file=OUT/(level.lower()+'-actual-consumer.npz');np.savez_compressed(file,g=means['g'],r=means['r'],i=means['i'],counts=counts,rgb=actual[:,:,:3],alpha=actual[:,:,3])
  levels.append({'level':level,'fullNumericMeanF32FrozenRgbOriginalAlphaWcsExact':True,'changedRgbPixels':int(np.any(actual[:,:,:3]!=previous[:,:,:3],axis=2).sum()),'pngBytes':meta['bytes'],'actualMeanRgb':actual[:,:,:3].astype('f8').mean(axis=(0,1)).tolist(),'comparison':bind(compare),'savedConsumer':bind(file)})
 catalog=doc(ROOT/'output/sdss-m82-measured-stars-1004-r4/result.json');stars=[w for w in catalog['records'] if 'targetSaved' in w];assert len(stars)==20
 sheet=Image.new('RGB',(768,len(stars)*144),(16,16,16));draw=ImageDraw.Draw(sheet);starrows=[]
 for index,star in enumerate(stars):
  tx,ty=star['targetXY'];row={'objID':star['objID'],'targetXY':star['targetXY'],'levels':{}}
  for lev,meta in current['levels'].items():
   x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];f=meta['crop']['boxFactor'];cx,cy=(tx-x0-(f-1)/2)/f,(ty-y0-(f-1)/2)/f
   if not (0<=cx<512 and 0<=cy<512):continue
   xx,yy=int(round(cx)),int(round(cy));box=(max(0,xx-5),max(0,yy-5),min(512,xx+6),min(512,yy+6));a,b,cx1,dy1=box
   before=oldimages[lev][b:dy1,a:cx1];after=newimages[lev][b:dy1,a:cx1]
   row['levels'][lev]={'boundsXYExclusive':box,'changedRgbPixels':int(np.any(before!=after,axis=2).sum()),'previousMaxChannel':int(before.max()),'newMaxChannel':int(after.max())}
   pos=(0 if lev=='OVERVIEW' else 384)
   for col,image in enumerate((before,after)):sheet.paste(Image.fromarray(image).resize((132,132),Image.Resampling.NEAREST),(pos+col*160,index*144+12))
  draw.text((326,index*144+4),str(index+1)+' '+star['objID'],fill='white');starrows.append(row)
 starpath=OUT/'all20-catalog-star-comparison.png';sheet.save(starpath)
 before=list(pins.values());assert [bind(ROOT/v['path']) for v in before]==before
 report={'scope':__doc__,'producer':bind(ROOT/'output/sdss-m82-noise-v2-increment-1004-r1/result.json'),'inputsBefore':before,'inputsAfterExact':True,'allOutsideDemandAndOldStrongAndUnaffectedDiagnosticsExact':True,
  'newStrongAndUnknownCompactRawExact':True,'actualChangedEstimatePixels':int(changed.sum()),'allThreeNumericMeansFrozenRgbOriginalAlphaWcsExact':True,'levels':levels,'catalogStars':starrows,'catalogStarComparison':bind(starpath),
  'elapsedSeconds':time.perf_counter()-started,'nativeSourceReadsOrNoiseFitsCoaddFilterApertureSelectionRuns':0,'ordinaryAdoption':False,'quality':'UNVERIFIED_ACTUAL_NEW_COMPLETE_DISPLAY_READBACK','independentReview':'MISSING','otherBusinessLogicEdited':False}
 save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputsBefore','catalogStars')}),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as e:
  if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
  raise
