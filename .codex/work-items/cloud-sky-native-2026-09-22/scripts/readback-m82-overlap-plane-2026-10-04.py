"""Saved overlap affine predictions, normal equations and heldout errors readback.

No refit, producer import or source/background correction. Self-review only.
"""
from pathlib import Path
import sys,json,hashlib,math,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
SOURCE=ROOT/'output/sdss-m82-current-source-colour-1004-r1'
PRODUCER=ROOT/'output/sdss-m82-overlap-plane-1004-r1'
OUT=ROOT/'output/sdss-m82-overlap-plane-readback-1004-r1'
def bind(p):
 p=Path(p);h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(1048576),b''):h.update(c)
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
 start=time.perf_counter();result=json.loads((PRODUCER/'result.json').read_bytes());source=json.loads((SOURCE/'result.json').read_bytes())
 for r in result['inputs']+result['images']:assert bind(ROOT/r['path'])==r
 facts=[];worse_null=worse_constant=0;finiteValues=0
 for row in result['records']:
  old=next(v for v in source['records'] if v['name']==row['name'])
  with np.load(ROOT/old['saved']['path'],allow_pickle=False) as actual:
   if row['fits']==0:
    assert not actual['both_runs_native_flags_clear'].any() and np.isnan(actual['run_difference_gri']).all()
    continue
   assert bind(ROOT/row['saved']['path'])==row['saved']
   with np.load(ROOT/row['saved']['path'],allow_pickle=False) as saved:
    delta=saved['delta_gri'];valid=saved['valid'];x=saved['x_normalized'];y=saved['y_normalized']
    assert np.array_equal(actual['run_difference_gri'],delta,equal_nan=True) and np.array_equal(actual['both_runs_native_flags_clear'],valid)
    sy,sx=np.indices(valid.shape);yn=(sy-(valid.shape[0]-1)/2)/((valid.shape[0]-1)/2);xn=(sx-(valid.shape[1]-1)/2)/((valid.shape[1]-1)/2)
    assert np.array_equal(x,xn) and np.array_equal(y,yn)
    split=float(np.median(sy[valid]));assert split==row['splitLocalRow']
    upper=valid&(sy<=split);lower=valid&(sy>split)
    assert np.array_equal(saved['train_upper'],upper) and np.array_equal(saved['train_lower'],lower)
    assert not (upper&lower).any() and np.array_equal(upper|lower,valid)
    for fold,training,testing,prefix in ((row['folds'][0],upper,lower,'upper'),(row['folds'][1],lower,upper,'lower')):
     assert fold['trainingPixels']==int(training.sum()) and fold['heldoutPixels']==int(testing.sum())
     for at,b in enumerate('gri'):
      band=fold['bands'][at];coeff=band['coefficientsOffsetXNormalizedYNormalized'];observed=delta[at]
      predicted=np.array([coeff[0]+coeff[1]*float(xx)+coeff[2]*float(yy) for xx,yy in zip(x.ravel(),y.ravel())]).reshape(valid.shape)
      bound=128*np.finfo('f8').eps*max(abs(v) for v in coeff)
      assert np.max(abs(predicted-saved[prefix+'_model_gri'][at]))<=bound
      assert np.array_equal(saved[prefix+'_residual_gri'][at],observed-saved[prefix+'_model_gri'][at],equal_nan=True)
      residual=observed-predicted;terms=(np.ones(valid.shape),x,y)
      for term in terms:
       gradient=math.fsum((residual[training]*term[training]).tolist())
       magnitude=math.fsum((abs(observed[training])+abs(predicted[training])).tolist())
       assert abs(gradient)<=4096*np.finfo('f8').eps*magnitude,(row['name'],b,gradient)
      mean=math.fsum(observed[training].tolist())/int(training.sum())
      target=observed[testing].tolist();rem=residual[testing].tolist()
      s0=math.fsum(v*v for v in target);sc=math.fsum((v-mean)**2 for v in target);sp=math.fsum(v*v for v in rem)
      n=len(target)
      values={'heldoutNullRmse':math.sqrt(s0/n),'heldoutConstantRmse':math.sqrt(sc/n),'heldoutPlaneResidualRmse':math.sqrt(sp/n),'trainingMean':mean}
      for key,v in values.items():assert math.isclose(v,band[key],rel_tol=4e-14,abs_tol=2e-17),(key,v,band[key])
      assert (sp>s0)==band['planeSquaredErrorGreaterThanNull'] and (sp>sc)==band['planeSquaredErrorGreaterThanConstant']
      worse_null+=int(sp>s0);worse_constant+=int(sp>sc);finiteValues+=n
      facts.append({'name':row['name'],'fold':fold['fold'],'band':b,**values,'normalEquationsChecked':True,'actualResidualValuesChecked':True})
 report={'scope':__doc__,'producerResult':bind(PRODUCER/'result.json'),'actualSameCoordinateErrors':facts,
  'heldoutBandCases':len(facts),'planeWorseThanNullCases':worse_null,'planeWorseThanConstantCases':worse_constant,
  'heldoutBandValuesScalarReadback':finiteValues,'predictionAndScoresWithinFloat64ArithmeticBounds':True,
  'observedImages':[r['path'] for r in result['images']],
  'observationLimits':'Root viewed both full actual signed sheets. Right residual panels include training and test support despite heldout in label; heldout scalar scores exclusively use separately saved disjoint test masks. Some titles clip at panel edge. Pink means excluded/no comparable source. Dark under source-extreme scale does not mean no residual. Diagnostic figure is not a publication, source-quality or significance verdict.',
  'conclusion':'Plain affine difference matching does not uniformly improve heldout error: no validated single background correction. This bounded failure does not reject all Montage/masking/robust methods or prove an astronomical/background cause.',
  'elapsedSeconds':time.perf_counter()-start,'refits':0,'sourceOrCandidateChanged':False,'productionChanges':False,'otherBusinessLogicEdited':False,
  'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
 save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k!='actualSameCoordinateErrors'},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
