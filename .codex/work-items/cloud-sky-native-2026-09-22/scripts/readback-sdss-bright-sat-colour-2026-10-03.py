"""Read actual saved SAT display estimates/levels, no original processing rerun."""
import json,sys,io
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image
from astropy.visualization import make_lupton_rgb
from image_quality import digest,write_report

def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}
o=ROOT/'output/sdss-bright-sat-colour-trial-1003-r1';out=o/'readback';out.mkdir(exist_ok=False);paths=[Path(__file__)]
t=json.loads((o/'result.json').read_bytes());paths.extend([o/'result.json',o/'inputs-after.json'])
for record in json.loads((o/'inputs-after.json').read_bytes()):assert bind(ROOT/record['path'])==record;paths.append(ROOT/record['path'])
base=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2';c=json.loads((base/'candidate.json').read_bytes());parent=ROOT/'output/shared-flag-display-recovery-1003-r2/candidate';r=json.loads((parent/'candidate.json').read_bytes());q=json.loads((ROOT/t['qualification']['path']).read_bytes())
bands=('g','r','i');values={b:np.load(o/(b+'-display-estimates.npy'),allow_pickle=False) for b in bands};old={b:np.load(parent/r['arrays'][b]['file'],allow_pickle=False) for b in bands};mask=np.load(o/'bright-sat-colour-supply.npy',allow_pickle=False)
expected_mask=np.zeros(mask.shape,dtype=bool)
for v in q['components']:
    if v['fullRingQualification']:
        for x,y in v['corePositionsXY']:expected_mask[y,x]=True
assert np.array_equal(mask,expected_mask) and int(mask.sum())==58
for b in bands:
    p=o/(b+'-display-estimates.npy');paths.append(p);assert values[b].dtype==np.float32
    assert np.array_equal(values[b][~mask],old[b][~mask],equal_nan=True)
joint=np.load(base/c['arrays']['joint-availability']['file'],allow_pickle=False);recipe=r['sourceResolvedRecipe'];levels={}
for level,m in r['levels'].items():
    x0,y0,x1,y1=m['crop']['boundsXYExclusive'];crop=(slice(y0,y1),slice(x0,x1));factor=m['crop']['boxFactor'];s=joint[crop];width=s.shape[0]//factor;shape=(width,factor,width,factor);counts=s.reshape(shape).sum(axis=(1,3));coarse={}
    for b in bands:
        samples=np.where(s,values[b][crop].astype(float),0);coarse[b]=np.divide(samples.reshape(shape).sum(axis=(1,3)),counts,out=np.zeros((width,width),dtype=float),where=counts>0).astype(np.float32)
    rgb=make_lupton_rgb(coarse['i'],coarse['r'],coarse['g'],minimum=0,stretch=recipe['stretch'],Q=recipe['Q'],output_dtype=np.uint8)
    alpha=np.rint(counts.astype(float)*255/(factor*factor)).astype(np.uint8);expected=np.dstack([rgb,alpha]);p=o/(level.lower()+'-trial.png');paths.append(p)
    original=parent/m['file'];assert np.array_equal(np.asarray(Image.open(p)),expected);assert np.array_equal(alpha,np.asarray(Image.open(original))[:,:,3])
    levels[level]={'saved':bind(p),'actualIndependentMeanAndRgbExact':True,'alphaExact':True}
before=[bind(p) for p in paths];write_report(out/'inputs-before.json',before)
core_i=sum(old[b][mask].astype(float) for b in bands)/3;new_i=sum(values[b][mask].astype(float) for b in bands)/3;assert np.allclose(new_i,core_i,rtol=2*np.finfo(np.float32).eps,atol=0)
# A bounded mutation of one saved-estimate copy actually changes a derived
# float RGB; the readback does not just certify empty/previous results.
v={b:values[b][mask].copy() for b in bands};baseline=make_lupton_rgb(v['i'],v['r'],v['g'],minimum=0,stretch=recipe['stretch'],Q=recipe['Q'],output_dtype=np.float64)
v['g'][0]*=2;mutated=make_lupton_rgb(v['i'],v['r'],v['g'],minimum=0,stretch=recipe['stretch'],Q=recipe['Q'],output_dtype=np.float64);assert not np.array_equal(baseline,mutated)
after=[bind(ROOT/m['path']) for m in before];write_report(out/'inputs-after.json',after);assert before==after
result={'trial':bind(o/'result.json'),'qualification':t['qualification'],'savedSupplyExact':True,'savedOutsideSelectedExact':True,'selectedPixels':58,
    'levels':levels,'rawDisplayIntensityMaximumDifference':float(np.abs(new_i-core_i).max()),'boundedSavedEstimateMutationChangesRgb':True,
    'sourcesAndProtectedCurrentExact':True,'logicalTrialFileBytes':sum(f.stat().st_size for f in o.iterdir() if f.is_file()),
    'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,'processingRuns':0,'fitRuns':0,'sourceRequests':0}
write_report(out/'result.json',result);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes());print(json.dumps(result))
