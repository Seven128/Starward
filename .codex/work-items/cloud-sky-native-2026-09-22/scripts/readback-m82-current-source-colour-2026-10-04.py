"""Read saved current-v2 and actual RUN samples independently with scalar arithmetic.

No producer import/replay, native projection, science/recovery fit, or tone trial.
This is self-review of bounded diagnostics, not independent scientific review.
"""
from pathlib import Path
import hashlib,json,math,sys,time
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
NATIVE=ROOT/'output/sdss-m82-visible-native-display-1004-r2'
SOURCE=ROOT/'output/sdss-m82-current-source-colour-1004-r1'
CURRENT=ROOT/'output/sdss-m82-noise-v2-increment-1004-r1/candidate'
SCIENCE=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate'
OUT=ROOT/'output/sdss-m82-current-source-colour-readback-1004-r1'

def bind(p):
 p=Path(p);h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,value):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def main():
 assert not OUT.exists();OUT.mkdir()
 (OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
 start=time.perf_counter();receipt=json.loads((SOURCE/'result.json').read_bytes())
 for row in receipt['inputs']+receipt['images']:
  assert bind(ROOT/row['path'])==row,row['path']
 current=json.loads((CURRENT/'candidate.json').read_bytes())
 science=json.loads((SCIENCE/'candidate.json').read_bytes())
 maps={k:np.load(CURRENT/current['arrays'][k]['file'],mmap_mode='r',allow_pickle=False) for k in ('qualified','protected','radius','reached','requested','changed')}
 estimates={b:np.load(CURRENT/current['arrays'][b]['file'],mmap_mode='r',allow_pickle=False) for b in 'gri'}
 sci={b:np.load(SCIENCE/science['arrays'][b+'-science']['file'],mmap_mode='r',allow_pickle=False) for b in 'gri'}
 records=[];scalar_values=0;missing_values=0
 for row in receipt['records']:
  name=row['name'];x0,y0,x1,y1=row['boundsXYExclusive'];region=np.s_[y0:y1,x0:x1]
  assert bind(ROOT/row['saved']['path'])==row['saved']
  meta=json.loads((NATIVE/(name+'-native-stage.json')).read_bytes())
  assert meta['boundsXYExclusive']==row['boundsXYExclusive']
  with np.load(NATIVE/(name+'-native-stage.npz'),allow_pickle=False) as raw,np.load(ROOT/row['saved']['path'],allow_pickle=False) as packet:
   original=np.stack([sci[b][region] for b in 'gri']);v2=np.stack([estimates[b][region] for b in 'gri'])
   assert np.array_equal(packet['science_gri'],original) and np.array_equal(packet['current_v2_gri'],v2)
   for at,b in enumerate('gri'):assert np.array_equal(original[at],raw['science-'+b])
   for k,a in maps.items():assert np.array_equal(packet['current_'+k],a[region]),(name,k)
   q,p,r,reached=[packet['current_'+k] for k in ('qualified','protected','radius','reached')]
   assert not (p&~q).any() and not (reached&(r<=0)).any()
   run_outputs={};run_stats={}
   for run in (4264,4294):
    keys=sorted({f['fieldKey'] for f in meta['fields'] if f['nativeReceipt']['identity']['run']==run})
    assert keys==row['runs'][str(run)]['fields']
    fields=[]
    for key in keys:
     prefix=key.replace('/','-')
     fields.append((raw[prefix+'-weight'].ravel(),[raw[prefix+'-'+b+'-sample'].ravel() for b in 'gri'],[raw[prefix+'-'+b+'-reject'].ravel() for b in 'gri']))
    shape=q.shape;values=np.full((3,*shape),np.nan,'f8');weights=np.zeros(shape,'f8');available=np.zeros(shape,bool);reject=np.zeros(shape,bool)
    vflat=values.reshape(3,-1);wflat=weights.ravel();aflat=available.ravel();rflat=reject.ravel()
    for index in range(q.size):
     denominator=0.;numerator=[0.,0.,0.];bad=False
     for weight,samples,flags in fields:
      w=float(weight[index]);assert math.isfinite(w) and w>=0
      denominator+=w
      if w>0:
       for at in range(3):
        s=float(samples[at][index]);assert math.isfinite(s)
        numerator[at]+=w*s;bad=bad or bool(flags[at][index])
     wflat[index]=denominator;aflat[index]=denominator>0;rflat[index]=bad
     if denominator>0:
      for at in range(3):vflat[at,index]=numerator[at]/denominator;scalar_values+=1
     else:missing_values+=3
    for key,a in (('values',values),('weights',weights),('available',available),('nativeFlagReject',reject)):
     assert np.array_equal(packet['run'+str(run)+'_'+key],a,equal_nan=True),(name,run,key)
    assert int(available.sum())==row['runs'][str(run)]['availablePixels']
    assert int(reject.sum())==row['runs'][str(run)]['nativeFlagRejectedPixels']
    run_outputs[run]=(values,available,reject)
    run_stats[str(run)]={'fields':keys,'available':int(available.sum()),'missing':int((~available).sum()),'nativeRejected':int(reject.sum()),
     'scalarGriMean':[math.fsum(values[at][available].tolist())/int(available.sum()) if available.any() else None for at in range(3)]}
    for at in range(3):
     expected=row['runs'][str(run)]['griAllAvailable'][at]['mean'];actual=run_stats[str(run)]['scalarGriMean'][at]
     if expected is None:assert actual is None
     else:assert math.isclose(actual,expected,rel_tol=2e-15,abs_tol=2e-17),(name,run,at,actual,expected)
   a,b=run_outputs[4264],run_outputs[4294];both=a[1]&b[1];clear=both&~a[2]&~b[2]
   assert np.array_equal(packet['both_runs_available'],both) and np.array_equal(packet['both_runs_native_flags_clear'],clear)
   delta=b[0]-a[0]
   assert np.array_equal(packet['run_difference_gri'],delta,equal_nan=True)
   assert np.isnan(delta[:,~both]).all(),name
   assert np.array_equal(packet['current_minus_science_gri'],v2.astype('f8')-original)
   oldgreen=original[1]>np.maximum(original[0],original[2]);green=v2[1]>np.maximum(v2[0],v2[2])
   assert np.array_equal(packet['science_green_dominant'],oldgreen) and np.array_equal(packet['current_green_dominant'],green)
   masks={'ALL':np.ones(shape,bool),'CURRENT_UNQUALIFIED':~q,'CURRENT_PROTECTED':p,'CURRENT_NONPROTECTED':~p,
    'CURRENT_NONPROTECTED_RADIUS8':~p&(r==8),'CURRENT_NONPROTECTED_NOT_REACHED':q&~p&~reached,
    'CURRENT_NONPROTECTED_NOT_REACHED_RADIUS8':q&~p&~reached&(r==8),'CURRENT_GREEN_DOMINANT':green,'CURRENT_GREEN_DOMINANT_NONPROTECTED':green&~p}
   for key,mask in masks.items():
    assert int(mask.sum())==row['summaries'][key]['pixels']
    assert int((mask&clear).sum())==row['summaries'][key]['bothRunsNativeFlagClearPixels']
   assert int((raw['qualified']!=q).sum())==row['legacyQualificationPixelsChanged']
   assert int((raw['protected']!=p).sum())==row['legacyProtectedPixelsChanged']
   records.append({'name':name,'bounds':row['boundsXYExclusive'],'runs':run_stats,'scienceCurrentEqualPixels':int(np.all(original==v2,axis=0).sum()),
    'qualified':int(q.sum()),'protected':int(p.sum()),'greenDominant':int(green.sum()),'greenProtected':int((green&p).sum()),
    'qualifiedNonprotectedRadius8NotReached':int((q&~p&~reached&(r==8)).sum()),'bothRunsFlagClear':int(clear.sum()),
    'savedScalarRunValuesExact':True,'currentMapsAndScienceExact':True,'missingRunDeltaNaN':True})
 result={'scope':__doc__,'producerResult':bind(SOURCE/'result.json'),'reader':bind(Path(__file__)),
  'records':records,'scalarFiniteRunValuesExact':scalar_values,'missingRunValuesPreservedNaN':missing_values,
  'actualSignedScienceAndCurrentMapsExact':True,'inputsAfterExact':all(bind(ROOT/r['path'])==r for r in receipt['inputs']),
  'observedImages':[r['path'] for r in receipt['images']],
  'imageObservationLimits':'Four full diagnostic sheets were viewed by root; signed per-band max-absolute scales and pink missing RUNs, not natural-color composition or noise-significance maps. Dark on a star-dominated scale does not mean zero sky. No full-quality or background cause verdict.',
  'elapsedSeconds':time.perf_counter()-start,'producerReplay':False,'productionChanges':False,'otherBusinessLogicEdited':False,
  'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
 assert result['inputsAfterExact'];save(OUT/'result.json',result)
 print(json.dumps(result,ensure_ascii=False),flush=True)

if __name__=='__main__':main()
