"""Saved real exterior support means and dense covariance, no adaptive rerun."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
SOURCE=ROOT/'output/sdss-real-halo-1003-r1';OUT=SOURCE/'readback';OUT.mkdir()
def bind(path):
    data=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
rp=SOURCE/'result.json';assert bind(rp)['sha256']=='ea6ab2bb96e70e2d781f066d1a11d86d869d650edcd8f5275382c5c5c563598d'
report=json.loads(rp.read_bytes());row=next(r for r in report['rows'] if r['name']=='observed-top');paths={rp,Path(__file__)}
for item in row['outputs']:
    path=ROOT/item['path'];assert bind(path)==item;paths.add(path)
values=np.load(SOURCE/'observed-top-source-window.npy',allow_pickle=False)
estimates=np.load(SOURCE/'observed-top-display-window.npy',allow_pickle=False)
radius=np.load(SOURCE/'observed-top-radius.npy',allow_pickle=False);protected=np.load(SOURCE/'observed-top-protected.npy',allow_pickle=False)
reached=np.load(SOURCE/'observed-top-reached.npy',allow_pickle=False)
stencils=[dict(np.load(ROOT/v['path'],allow_pickle=False)) for v in row['outputs'] if v['path'].endswith('.npz')]
before=[bind(p) for p in sorted(paths)];coordinates=np.argwhere((radius[8:16,8:136]>0));assert len(coordinates)>3
selected_coordinates=coordinates[[0,len(coordinates)//2,-1]]+np.array([8,8]);facts=[]
for y,x in selected_coordinates:
    r=int(radius[y,x]);dy,dx=np.mgrid[-r:r+1,-r:r+1];circle=dy*dy+dx*dx<=r*r
    region=(slice(y-r,y+r+1),slice(x-r,x+r+1));selected=circle&~protected[region];count=int(selected.sum())
    samples=values[:,region[0],region[1]][:,selected];mean=samples.astype(np.float64).sum(axis=1)/count
    np.testing.assert_array_equal(mean.astype(np.float32),estimates[:,y,x])
    fields=[]
    for stencil in stencils:
        bands=[]
        for band in range(3):
            ids=stencil['ids'][band][:,region[0],region[1]][:,selected].T
            weights=stencil['weights'][band][:,region[0],region[1]][:,selected].T
            native=stencil['native_variance'][band][:,region[0],region[1]][:,selected].T;variances={}
            for at in range(count):
                for neighbor in range(4):
                    if weights[at,neighbor]==0:continue
                    identity=int(ids[at,neighbor]);v=float(native[at,neighbor]);assert identity>=0 and np.isfinite(v) and v>=0
                    if identity in variances:assert variances[identity]==v
                    variances[identity]=v
            columns={identity:at for at,identity in enumerate(variances)};H=np.zeros((count,len(columns)))
            for at in range(count):
                for neighbor in range(4):
                    if weights[at,neighbor]>0:H[at,columns[int(ids[at,neighbor])]]+=weights[at,neighbor]
            covariance=(H*np.array(list(variances.values()))[None])@H.T
            bands.append(float(covariance.sum()/count**2))
        fields.append(bands)
    upper=np.square(np.sqrt(np.array(fields)).sum(axis=0));ratio=np.abs(mean)/np.sqrt(upper)
    assert bool((ratio>=3).all())==bool(reached[y,x])
    oy=y-8;outside_count=int(np.sum(selected[:max(0,r-oy)]))
    assert outside_count>0
    facts.append({'supportYX':[int(y),int(x)],'originalXY':[int(x+16),int(oy)],'radius':r,
      'selectedSamples':count,'actualOutsideCropSamples':outside_count,'meanGRI':mean.tolist(),'denseUpperGRI':upper.tolist(),
      'absoluteConditionalRatioGRI':ratio.tolist(),'savedReachedExact':True})
assert before==[bind(p) for p in sorted(paths)]
value={'status':'PASSED_SAVED_REAL_EXTERIOR_MEAN_AND_DENSE_COVARIANCE','rows':facts,'inputs':before,
 'productionHelperImports':0,'adaptiveFilterRuns':0,'sourceRequests':0,'scope':__doc__,'independentReview':'MISSING'}
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
with (OUT/'result.json').open('x',encoding='utf-8') as f:json.dump(value,f,indent=2);f.write('\n')
print(json.dumps(bind(OUT/'result.json')))
