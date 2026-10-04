"""Bounded falsification of a low-frequency overlap-plane explanation.

Only saved RUN source differences are fitted, never science/coadd/display or
sky-subtracted inputs themselves. Spatial holdouts test descriptive adequacy;
no noise probability, background classification or correction is produced.
"""
from pathlib import Path
import sys,json,hashlib,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image,ImageDraw
SOURCE=ROOT/'output/sdss-m82-current-source-colour-1004-r1'
OUT=ROOT/'output/sdss-m82-overlap-plane-1004-r1'

def bind(p):
 p=Path(p);h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')

def fit_and_score(delta,valid,train,test,x,y):
 assert train.shape==test.shape==valid.shape==x.shape==y.shape
 assert not (train&test).any() and not ((train|test)&~valid).any()
 design=np.stack((np.ones(x.shape),x,y),axis=-1)
 assert int(train.sum())>3 and test.any() and np.isfinite(delta[:,valid]).all()
 coefficient,residuals,rank,singular=np.linalg.lstsq(design[train],delta[:,train].T,rcond=None)
 assert rank==3
 model=np.einsum('hwk,kb->bhw',design,coefficient)
 constant=delta[:,train].mean(axis=1)
 result=[]
 for at,b in enumerate('gri'):
  observed=delta[at,test];remaining=observed-model[at,test]
  baseline=observed-constant[at]
  result.append({'band':b,'coefficientsOffsetXNormalizedYNormalized':coefficient[:,at].tolist(),
   'trainingMean':float(constant[at]),'heldoutPixels':int(test.sum()),
   'heldoutSourceDifferenceMean':float(observed.mean()),'heldoutNullRmse':float(np.sqrt(np.mean(observed**2))),
   'heldoutConstantRmse':float(np.sqrt(np.mean(baseline**2))),
   'heldoutPlaneResidualRmse':float(np.sqrt(np.mean(remaining**2))),
   'heldoutPlaneResidualMedian':float(np.median(remaining)),
   'heldoutPlaneResidualMin':float(remaining.min()),'heldoutPlaneResidualMax':float(remaining.max()),
   'planeSquaredErrorGreaterThanNull':bool(np.sum(remaining**2)>np.sum(observed**2)),
   'planeSquaredErrorGreaterThanConstant':bool(np.sum(remaining**2)>np.sum(baseline**2))})
 return model,{'trainingPixels':int(train.sum()),'heldoutPixels':int(test.sum()),'rank':int(rank),'singularValues':singular.tolist(),'bands':result}

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
 start,cpu=time.perf_counter(),time.process_time();cp=TASK/'evidence/current-execution-state-2026-10-04-r104.json'
 assert bind(cp)['sha256']=='8d726627d57f09c31d34b1cf6a46b86e5c7b601d2ff8385d6ce914e7664ce8c5'
 checkpoint=json.loads(cp.read_bytes())
 for r in checkpoint['currentSources']+checkpoint['evidence']+checkpoint['protected']:assert bind(ROOT/r['path'])==r
 result=json.loads((SOURCE/'result.json').read_bytes());inputs=[bind(cp),bind(SOURCE/'result.json'),bind(Path(__file__))]
 # Numerical mechanism control only: no generated celestial image or data.
 yy,xx=np.mgrid[:12,:12];xx=(xx-5.5)/5.5;yy=(yy-5.5)/5.5
 exact=np.stack((.2+.03*xx-.07*yy,-.1+.02*xx+.08*yy,.01-.04*xx+.005*yy))
 valid=np.ones(xx.shape,bool);train=yy<0;model,check=fit_and_score(exact,valid,train,~train,xx,yy)
 assert np.max(np.abs(model-exact))<2e-15
 records=[];images=[];totalFits=0
 for row in result['records']:
  path=ROOT/row['saved']['path'];assert bind(path)==row['saved'];inputs.append(bind(path))
  with np.load(path,allow_pickle=False) as z:
   delta=z['run_difference_gri'];valid=z['both_runs_native_flags_clear'];current=z['current_v2_gri']
   if not valid.any():
    assert np.isnan(delta).all();records.append({'name':row['name'],'status':'UNAVAILABLE_SECOND_RUN','fits':0,'missingIsZero':False});continue
   h,w=valid.shape;yy,xx=np.mgrid[:h,:w];xx=(xx-(w-1)/2)/((w-1)/2);yn=(yy-(h-1)/2)/((h-1)/2)
   # Split at the actual valid-supply median row; this uses geometry only,
   # never source colour, brightness, current strong mask or noise eligibility.
   split=float(np.median(yy[valid]));upper=valid&(yy<=split);lower=valid&(yy>split)
   models=[];folds=[]
   for label,train,test in (('upper_to_lower',upper,lower),('lower_to_upper',lower,upper)):
    model,fact=fit_and_score(delta,valid,train,test,xx,yn);fact['fold']=label
    models.append(model);folds.append(fact);totalFits+=1
   packet=OUT/(row['name']+'-plane-diagnostic.npz')
   np.savez_compressed(packet,delta_gri=delta,valid=valid,x_normalized=xx,y_normalized=yn,train_upper=upper,train_lower=lower,
    upper_model_gri=models[0],lower_model_gri=models[1],upper_residual_gri=delta-models[0],lower_residual_gri=delta-models[1])
   sheet=Image.new('RGB',(1024,890),(16,16,16));draw=ImageDraw.Draw(sheet)
   for at,b in enumerate('gri'):
    # Every panel shares the maximum of valid difference and both residuals.
    arrays=[delta[at],models[0][at],delta[at]-models[0][at],delta[at]-models[1][at]]
    scale=max(float(abs(a[valid]).max()) for a in arrays)
    assert scale>0
    for col,(label,a) in enumerate(zip(('actual4294-4264','upper-fit plane','heldout-lower residual','heldout-upper residual'),arrays)):
     value=np.clip(a/scale,-1,1);pos=np.maximum(value,0);neg=np.maximum(-value,0)
     rgb=np.rint(np.stack((255*pos,190*pos+120*neg,255*neg),axis=-1));rgb[~valid]=(255,0,255)
     sheet.paste(Image.fromarray(rgb.astype('u1')).resize((256,256),Image.Resampling.NEAREST),(col*256,at*286+30))
     draw.text((col*256+3,at*286+3),f'{b} {label}; +/-{scale:.5g}',fill='white')
   draw.text((3,862),f"{row['name']} native flags-clear overlap only; split row={split}; pink=not comparable. Models not corrections.",fill='white')
   image=OUT/(row['name']+'-actual-plane-residuals.png');sheet.save(image);images.append(bind(image))
   records.append({'name':row['name'],'bounds':row['boundsXYExclusive'],'status':'DESCRIPTIVE_HELDOUT_TEST_NOT_BACKGROUND',
    'validSameCoordinatePixels':int(valid.sum()),'splitLocalRow':split,'splitBasedOn':'native flags-clear geometric overlap row only',
    'fits':2,'folds':folds,'saved':bind(packet),'noSourceOrDisplayCorrection':True})
 spec=importlib.util.spec_from_file_location('plane_memory',TASK/'scripts/experience-shared-noise-display-2026-10-03.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 report={'scope':__doc__,'inputs':inputs,'inputsAfterExact':all(bind(ROOT/r['path'])==r for r in inputs),
  'algorithmAuthority':{'method':'numpy.linalg.lstsq affine overlap difference only; Montage low-spatial-frequency background hypothesis, not its implementation or adoption',
   'references':[{'url':'https://irsa.ipac.caltech.edu/Montage/docs/algorithms.html','meaning':'Common geometry/calibrated energy scale and low-frequency instrumental background assumptions; rapidly varying contamination needs data-specific evidence.'},
    {'url':'https://photutils.readthedocs.io/en/stable/user_guide/background.html','meaning':'Source masks and genuine source-free background support required; sigma-clipped image statistics do not identify sky.'}],
   'newDependency':False,'montageCodeCopied':False,'sourceUnits':'same saved nMgy/native pixel; no area or throughput correction claimed'},
  'exactAffineMechanismControl':True,'actualPairFits':totalFits,'records':records,'images':images,
  'elapsedSeconds':time.perf_counter()-start,'cpuSeconds':time.process_time()-cpu,'offlineProcessMemory':m.memory(),
  'nativeSourceReadsOrRequests':0,'oldProjectionCoaddVariancePsfNoiseRecoveryToneTrials':0,'sourceOrCandidateChanged':False,
  'productionChanges':False,'otherBusinessLogicEdited':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
 assert report['inputsAfterExact'];save(OUT/'result.json',report)
 print(json.dumps({k:v for k,v in report.items() if k not in ('inputs','images','records')},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
