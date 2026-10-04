"""Saved new source/model arithmetic without detector, fitter or producer."""
from pathlib import Path
import hashlib
import json
import sys
from collections import Counter

ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from scipy.interpolate import RectBivariateSpline
from scipy.ndimage import binary_erosion

OUT=ROOT/'output/detail-native-model-support-1003-r1'
DEST=OUT/'readback';DEST.mkdir(exist_ok=False)
def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def load(p,pin=None):
    if pin:assert bind(p)['sha256']==pin
    return json.loads(p.read_bytes())
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')
r=load(OUT/'result.json','9dcbd5be6eb8e893ad40ade2fbd710110ba08eaf61769177373af7ab24971a42')
d=load(ROOT/r['candidateMaterial']['path'],r['candidateMaterial']['sha256'])
before=load(OUT/'inputs-before.json');assert before==load(OUT/'inputs-after.json')
for v in before:assert bind(ROOT/v['path'])==v
bounds=r['actualDetailBoundsXYExclusive']
selected=[t for t in d['commonTriplets'] if bounds[0]<=t['bands']['r']['targetColumnRow'][0]<bounds[2] and
          bounds[1]<=t['bands']['r']['targetColumnRow'][1]<bounds[3]]
assert len(selected)==len(r['records'])==87
negative=0;maximum_model_delta=0.;maximum_wrong_axis_delta=0.;stats={};archive=[]
for t,record in zip(selected,r['records']):
    assert t['fieldKey']==record['fieldKey'] and t['bands']['r']['targetColumnRow']==record['targetColumnRow']
    for b,m in record['bands'].items():
        assert m['source']==t['bands'][b]['saved'];p=ROOT/m['source']['path'];assert bind(p)==m['source']
        with np.load(p,allow_pickle=False) as z:source={k:z[k] for k in z.files}
        p=ROOT/m['saved']['path'];assert bind(p)==m['saved']
        with np.load(p,allow_pickle=False) as z:model={k:z[k] for k in z.files}
        cut=t['bands'][b]['nativeCutBoundsXYExclusive'];x,y=t['bands'][b]['nativeColumnRow']
        gy,gx=np.mgrid[cut[1]:cut[3],cut[0]:cut[2]]
        np.testing.assert_allclose(source['dx'],gx-x,rtol=0,atol=1e-12)
        np.testing.assert_allclose(source['dy'],gy-y,rtol=0,atol=1e-12)
        np.testing.assert_allclose(source['radius'],np.hypot(gx-x,gy-y),rtol=0,atol=1e-12)
        use=source['admitted']&(source['radius']<=12)
        assert use[source['radius']<=12].all() and np.array_equal(use,model['fit_mask'])
        assert ((source['flags'][use]&771)==0).all() and np.isfinite(source['variance'][use]).all()
        assert (source['variance'][use]>0).all() and np.isfinite(source['data'][use]).all()
        negative+=int((source['data'][use]<0).sum())
        kernel=model['kernel'];spline=RectBivariateSpline(np.arange(51),np.arange(51),kernel/kernel.sum())
        dx,dy=source['dx'],source['dy'];template=spline.ev(dy+25,dx+25)
        np.testing.assert_allclose(template,model['template'],rtol=0,atol=5e-17)
        amp,ox,oy,sx,sy,intercept=model['parameters']
        predicted=amp*spline.ev(dy-oy+25,dx-ox+25)+sx*dx+sy*dy+intercept
        residual=source['data'].astype(float)-predicted
        delta=float(np.max(np.abs(predicted-model['model'])));maximum_model_delta=max(maximum_model_delta,delta)
        np.testing.assert_allclose(predicted,model['model'],rtol=0,atol=1e-10)
        np.testing.assert_allclose(residual,model['residual'],rtol=0,atol=1e-10)
        coeff=model['coefficients'];design=np.stack((template,np.ones(template.shape),dx,dy),axis=-1)[use]
        weight=1/source['variance'][use]
        independent=np.linalg.solve((design.T*weight)@design,(design.T*weight)@source['data'][use])
        np.testing.assert_allclose(independent,coeff,rtol=1e-8,atol=1e-9)
        chi=float(np.sum(residual[use]**2/source['variance'][use])/(int(use.sum())-6))
        np.testing.assert_allclose(chi,m['conditionalChiSquarePerDof'],rtol=1e-10,atol=1e-10)
        assert m['centerAtBounds']==any(abs(float(v))>=.499999 for v in (ox,oy))
        wrong=RectBivariateSpline(np.arange(51),np.arange(51),kernel.T/kernel.sum())
        wrong_model=amp*wrong.ev(dy-oy+25,dx-ox+25)+sx*dx+sy*dy+intercept
        maximum_wrong_axis_delta=max(maximum_wrong_axis_delta,float(np.max(np.abs(wrong_model-predicted))))
        stats.setdefault(b,[]).append(chi)
assert maximum_wrong_axis_delta>1e-5
candidate_pins=load(ROOT/'output/center-native-detections-1003-r2/inputs-before.json')
assert candidate_pins==load(ROOT/'output/center-native-detections-1003-r2/inputs-after.json')
for v in candidate_pins:assert bind(ROOT/v['path'])==v
# Unknown neighbor cannot participate simply because the centre is valid.
eligibility=np.ones((9,9),bool);eligibility[3,4]=False
assert eligibility[4,4] and not binary_erosion(eligibility,structure=np.ones((5,5),bool),border_value=0)[4,4]
summary={'sourceDetections':r['candidateMaterial'],'savedModelResult':bind(OUT/'result.json'),
    'newDetailCandidates':87,'sourceFieldCounts':dict(Counter(v['fieldKey'] for v in r['records'])),
    'conditionalNativeFitsReadBack':sum(len(v['bands']) for v in r['records']),
    'nativeCutCoordinatesSupportNoiseFlagsExact':True,'signedNegativeFitSamplesPreserved':negative,
    'maximumModelReadbackDelta':maximum_model_delta,'wrongKernelAxisMaximumModelDelta':maximum_wrong_axis_delta,
    'sourceSupportMaskMissingGuardControlRejects':True,'optimizerReruns':0,'detectorReruns':0,
    'sourceRequests':0,'frameReadsOrReprojections':0,'scienceOrCandidateCorrections':'NONE',
    'conditionalChiSquarePerDof':{b:{'min':float(np.min(v)),'median':float(np.median(v)),'max':float(np.max(v))} for b,v in stats.items()},
    'centerBoundFits':r['centerBoundFits'],'actualSourceAndProtectedPinsExact':True,
    'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,
    'scope':'Another root saved arithmetic path, no producer/ImagePSF/helper imports or detector/fitter rerun; no source classification, true PSF, full coadd/astrometry quality acceptance.'}
save(DEST/'result.json',summary)
(DEST/'executed-script.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps(summary))
