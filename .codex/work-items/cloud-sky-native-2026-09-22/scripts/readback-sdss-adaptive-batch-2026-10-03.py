"""Actual saved aperture batch variance versus dense native covariance.

Root arithmetic readback, not independent review or model certification.
"""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from sdss_noise_aperture import batch_field_aperture_variance
SOURCE=ROOT/'output/sdss-adaptive-batch-1003-r2';OUT=SOURCE/'readback';OUT.mkdir()
def bind(path):
    b=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
report=SOURCE/'result.json';assert bind(report)['sha256']=='4627aa06fd37bf047516a83efd122c189ef8e46ce2dfd84345d15917057d6966'
data=json.loads(report.read_bytes());row=next(r for r in data['rows'] if r['name']=='outer-mixed')
paths={report,Path(__file__),ROOT/'data-pipelines/deep-sky/sdss_noise_aperture.py'}
stencils=[]
for item in row['stencils']:
    path=ROOT/item['path'];assert bind(path)==item;paths.add(path);stencils.append(dict(np.load(path,allow_pickle=False)))
protected_path=SOURCE/'outer-mixed-protected.npy';eligible_path=SOURCE/'outer-mixed-eligible.npy'
paths.update([protected_path,eligible_path]);protected=np.load(protected_path,allow_pickle=False);eligible=np.load(eligible_path,allow_pickle=False)
before=[bind(p) for p in sorted(paths)];results=[]
for radius in (1,4,8):
    dy,dx=np.mgrid[-radius:radius+1,-radius:radius+1];circle=dy*dy+dx*dx<=radius*radius
    centers=np.array([[8,8],[24,24],[40,40]])
    ys=centers[:,0,None]+dy[circle];xs=centers[:,1,None]+dx[circle]
    assert eligible[ys,xs].all();selected=~protected[ys,xs]
    batches=[];dense_fields=[]
    for field in stencils:
        bands=[];dense_bands=[]
        for band in range(3):
            ids=field['ids'][band][:,ys,xs].transpose(1,0,2)
            weights=field['weights'][band][:,ys,xs].transpose(1,0,2)
            native=field['native_variance'][band][:,ys,xs].transpose(1,0,2)
            actual=batch_field_aperture_variance(ids,weights,native,selected);dense=[]
            for at in range(3):
                index=ids[at][:,selected[at]].T;coeff=weights[at][:,selected[at]].T;noise=native[at][:,selected[at]].T
                variances={}
                for sample in range(len(index)):
                    for neighbor in range(4):
                        if coeff[sample,neighbor]==0:continue
                        identity=int(index[sample,neighbor]);variance=float(noise[sample,neighbor])
                        assert identity>=0 and np.isfinite(variance) and variance>=0
                        if identity in variances:assert variances[identity]==variance
                        variances[identity]=variance
                columns={identity:i for i,identity in enumerate(variances)};H=np.zeros((len(index),len(columns)))
                for sample in range(len(index)):
                    for neighbor in range(4):
                        if coeff[sample,neighbor]>0:H[sample,columns[int(index[sample,neighbor])]]+=coeff[sample,neighbor]
                covariance=(H*np.array(list(variances.values()))[None])@H.T
                dense.append(float(covariance.sum()/len(index)**2))
            np.testing.assert_allclose(actual,dense,rtol=2e-13,atol=0)
            bands.append(actual);dense_bands.append(dense)
        batches.append(bands);dense_fields.append(dense_bands)
    upper=np.square(np.sqrt(np.array(batches)).sum(axis=0));dense_upper=np.square(np.sqrt(np.array(dense_fields)).sum(axis=0))
    np.testing.assert_allclose(upper,dense_upper,rtol=2e-13,atol=0)
    results.append({'radius':radius,'centersYX':centers.tolist(),'denseUpperGRI':dense_upper.tolist(),'batchUpperGRI':upper.tolist()})
assert before==[bind(p) for p in sorted(paths)]
value={'status':'PASSED_ACTUAL_BATCH_DENSE_COVARIANCE_READBACK','inputs':before,'rows':results,
 'sourceRequests':0,'sourceFrameReads':0,'adaptiveFilterRuns':0,'independentReview':'MISSING','scope':__doc__}
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
with (OUT/'result.json').open('x',encoding='utf-8') as f:json.dump(value,f,indent=2);f.write('\n')
print(json.dumps(bind(OUT/'result.json')))
