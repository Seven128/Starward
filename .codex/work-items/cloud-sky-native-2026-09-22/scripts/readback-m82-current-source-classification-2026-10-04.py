"""Scalar native-flag/current-marginal/effective-supply classification readback.
No producer import, native read, model fit, filter or recovery run. Self review.
"""
from pathlib import Path
import sys,json,hashlib,math,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
OUT=ROOT/'output/sdss-m82-current-source-classification-readback-1004-r1'
PRODUCER=ROOT/'output/sdss-m82-current-source-classification-1004-r1'
NATIVE=ROOT/'output/sdss-m82-visible-native-display-1004-r2'
CURRENT=ROOT/'output/sdss-m82-current-source-colour-1004-r1'
ORIGINAL=ROOT/'output/sdss-m82-sky-endpoint-consumer-1004-r1'
RECOVERED=ROOT/'output/sdss-m82-sky-endpoint-apertures-1004-r2'
def bind(p):
 p=Path(p);h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(1048576),b''):h.update(c)
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter()
 result=json.loads((PRODUCER/'result.json').read_bytes());facts=[];totalUnknown=totalGreenUnknown=totalSupplied=0
 for r in result['inputs']+result['images']:assert bind(ROOT/r['path'])==r
 for row in result['records']:
  name=row['name'];assert bind(ROOT/row['saved']['path'])==row['saved'];meta=json.loads((NATIVE/(name+'-native-stage.json')).read_bytes())
  with np.load(NATIVE/(name+'-native-stage.npz'),allow_pickle=False) as raw,np.load(CURRENT/(name+'-comparison.npz'),allow_pickle=False) as c,np.load(ORIGINAL/(name+'-actual-qualified.npz'),allow_pickle=False) as o,np.load(ROOT/row['saved']['path'],allow_pickle=False) as saved:
   shape=c['current_qualified'].shape;size=c['current_qualified'].size
   flag_arrays=[]
   for f in meta['fields']:
    prefix=f['fieldKey'].replace('/','-');band=f['band'];flag_arrays.append((raw[prefix+'-weight'].ravel(),raw[prefix+'-'+band+'-sample-flags'].ravel(),raw[prefix+'-'+band+'-reject'].ravel()))
   planes={key:np.zeros(size,bool) for key in ('INTERP','SATUR','GHOST','CR')};flagged=np.zeros(size,bool)
   for index in range(size):
    for weight,flags,rejected in flag_arrays:
     on=float(weight[index])>0;bits=int(flags[index]);bad=on and bool(bits&771)
     assert bad==bool(rejected[index])
     flagged[index]|=bad
     for key,bit in (('INTERP',0),('SATUR',1),('GHOST',8),('CR',9)):planes[key][index]|=on and bool(bits&(1<<bit))
   flagged=flagged.reshape(shape);planes={k:v.reshape(shape) for k,v in planes.items()}
   assert np.array_equal(saved['original_flagged'],flagged)
   assert np.array_equal(o['after_qualified'],~flagged)
   for k,v in planes.items():assert np.array_equal(saved['plane_'+k],v)
   assert np.array_equal(saved['original_q'],o['after_qualified']) and np.array_equal(saved['original_protected'],o['after_strong'])
   for k in ('science_gri','current_gri'):
    assert np.array_equal(saved[k],c['science_gri' if k=='science_gri' else 'current_v2_gri'])
   for k,ck in (('current_q','current_qualified'),('current_protected','current_protected')):assert np.array_equal(saved[k],c[ck])
   assert np.array_equal(saved['original_marginal_gri'],o['after_marginal'])
   ratio=np.empty((3,*shape),'f8');strong=np.zeros(size,bool)
   sci=c['science_gri'].reshape(3,-1);var=o['after_marginal'].reshape(3,-1)
   for index in range(size):
    for at in range(3):
     variance=float(var[at,index]);assert math.isfinite(variance) and variance>0
     v=abs(float(sci[at,index]))/math.sqrt(variance);ratio.reshape(3,-1)[at,index]=v
     if not flagged.ravel()[index] and v>=3:strong[index]=True
   assert np.array_equal(saved['original_ratio_gri'],ratio)
   assert np.array_equal(o['after_strong'],strong.reshape(shape))
   recovery=RECOVERED/(name+'-actual-aperture-increment.npz')
   if recovery.exists():
    with np.load(recovery,allow_pickle=False) as r:
     assert np.array_equal(saved['supply'],r['after_supply'][8:-8,8:-8])
     assert np.array_equal(saved['current_q'],r['after_qualified'][8:-8,8:-8])
     assert np.array_equal(saved['current_protected'],r['after_protected'][8:-8,8:-8])
     assert np.array_equal(saved['recovered_raw_gri'],r['after_raw'][:,8:-8,8:-8])
   else:assert not saved['supply'].any() and np.array_equal(saved['recovered_raw_gri'],saved['science_gri'])
   supply=saved['supply'];q=saved['current_q'];p=saved['current_protected'];green=c['current_green_dominant'];unknown=flagged&~supply
   assert not (supply&~flagged).any() and np.array_equal(q,~flagged|supply)
   assert np.array_equal(~q,unknown)
   assert np.array_equal(saved['current_gri'][:,unknown],saved['science_gri'][:,unknown])
   assert np.array_equal(saved['current_gri'][:,p],saved['recovered_raw_gri'][:,p])
   assert np.array_equal(p&~supply,saved['original_protected'])
   masks={'known_bad_original':flagged,'qualified_alternative_supply':supply,'known_bad_without_qualified_alternative':unknown,
    'original_qualified_strong':saved['original_protected'],'effective_strong':p,'current_green_dominant':green,
    'qualified_weak_radius8_unreached':q&~p&(c['current_radius']==8)&~c['current_reached']}
   for key,v in masks.items():
    assert np.array_equal(saved['class_'+key],v)
    actual=row['categories'][key];assert actual['pixels']==int(v.sum()) and actual['greenDominant']==int((v&green).sum())
    assert actual['currentSourceEqualsScience']==int((v&np.all(saved['current_gri']==saved['science_gri'],axis=0)).sum())
    for label,a in planes.items():assert actual['sourceProcessingPlanes'][label]==int((a&v).sum())
   n=int(unknown.sum());ng=int((unknown&green).sum());ns=int(supply.sum());totalUnknown+=n;totalGreenUnknown+=ng;totalSupplied+=ns
   facts.append({'name':name,'originalProcessingRejected':int(flagged.sum()),'qualifiedAlternative':ns,'unrecoveredProcessingRejected':n,
    'greenUnrecoveredProcessingRejected':ng,'nativeFlagAndCurrentQualificationExact':True,'originalMarginalAppliesOnlyOutsideActualSupply':True,
    'scalarRatiosExact':3*size,'rawStrongAndUnknownExact':True})
 report={'scope':__doc__,'producerResult':bind(PRODUCER/'result.json'),'records':facts,'totalUnrecoveredProcessingRejected':totalUnknown,
  'totalGreenUnrecoveredProcessingRejected':totalGreenUnknown,'totalQualifiedAlternatives':totalSupplied,'allNativeFlagsOriginalMarginalAndCurrentEffectiveMapsExact':True,
  'elapsedSeconds':time.perf_counter()-started,'observedImages':[r['path'] for r in result['images']],
  'meaning':'Four full actual mask sheets viewed. Processing-rejected is existing noise-owner policy, not proof every flagged pixel is physically corrupted or every green feature is an artifact. Finite original marginals exclude sky uncertainty. Different RAW supply not mislabeled original variance; current effective maps checked against saved actual recovery. Four windows not full-image quality scope.',
  'nativeReadsModelFitsFilteringOrRecoveryRuns':0,'productionChanges':False,'otherBusinessLogicEdited':False,'sourceOrCandidateChanged':False,
  'quality':'UNVERIFIED_WITH_ACTUAL_UNRECOVERED_PROCESSING_FLAGS','ordinaryAdoption':False,'independentReview':'MISSING'}
 save(OUT/'result.json',report);print(json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
